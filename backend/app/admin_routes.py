# app/admin_routes.py - Admin management endpoints
import os
import logging
from datetime import datetime, timedelta

from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Form
from fastapi.responses import JSONResponse, FileResponse
from bson import ObjectId

from .models import UserLogin, AdminRegister, APIResponse
from .auth import (
    hash_password, verify_password, create_access_token,
    get_current_admin, ACCESS_TOKEN_EXPIRE_MINUTES, ADMIN_SECRET_KEY
)
from .database import (
    get_users_collection, get_admins_collection,
    get_training_collection, is_database_connected
)

logger = logging.getLogger(__name__)
router = APIRouter()


# ========================
# ADMIN AUTH
# ========================

@router.post("/admin/signup", response_model=APIResponse)
async def admin_signup(admin: AdminRegister):
    """Admin registration - matches frontend /admin/signup"""
    try:
        logger.info(f"👑 ADMIN SIGNUP attempt for: {admin.email}")
        
        # Verify admin secret key
        if admin.secret_key != ADMIN_SECRET_KEY:
            logger.warning(f"❌ Invalid admin secret key attempt: {admin.secret_key}")
            return APIResponse(success=False, message="Invalid admin secret key")
        
        admins_collection = get_admins_collection()
        
        # Check if admin already exists
        existing_admin = admins_collection.find_one({"email": admin.email})
        if existing_admin:
            logger.warning(f"❌ Email already registered as admin: {admin.email}")
            return APIResponse(success=False, message="Email already registered as admin")
        
        # Create admin user
        new_admin = {
            "name": admin.name,
            "email": admin.email,
            "password": hash_password(admin.password),
            "is_active": True,
            "role": "admin",
            "created_at": datetime.utcnow(),
            "last_login": None
        }
        
        result = admins_collection.insert_one(new_admin)
        admin_id = str(result.inserted_id)
        
        logger.info(f"✅ Admin registered successfully: {admin.email}")
        return APIResponse(
            success=True,
            message="Admin account created successfully",
            data={
                "admin": {
                    "id": admin_id,
                    "name": admin.name,
                    "email": admin.email,
                    "role": "admin"
                }
            }
        )
        
    except Exception as e:
        logger.error(f"💥 ADMIN SIGNUP error: {str(e)}", exc_info=True)
        return APIResponse(success=False, message=f"Admin registration failed: {str(e)}")

@router.post("/admin/signin", response_model=APIResponse)
async def admin_signin(admin: UserLogin):
    """Admin login - matches frontend /admin/signin"""
    try:
        logger.info(f"👑 ADMIN SIGNIN attempt for: {admin.email}")
        
        admins_collection = get_admins_collection()
        db_admin = admins_collection.find_one({"email": admin.email})
        
        if not db_admin:
            logger.warning(f"❌ Admin login failed - admin not found: {admin.email}")
            return APIResponse(success=False, message="Invalid email or password")

        # Verify password
        if not verify_password(admin.password, db_admin["password"]):
            logger.warning(f"❌ Admin login failed - incorrect password for: {admin.email}")
            return APIResponse(success=False, message="Invalid email or password")

        # Check if admin is active
        if not db_admin.get("is_active", True):
            logger.warning(f"❌ Admin login failed - inactive account: {admin.email}")
            return APIResponse(success=False, message="Admin account is deactivated")

        # Update last login
        admins_collection.update_one(
            {"_id": db_admin["_id"]},
            {"$set": {"last_login": datetime.utcnow()}}
        )

        # Create access token
        access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = create_access_token(
            data={"sub": db_admin["email"], "type": "admin"},
            expires_delta=access_token_expires
        )
        
        logger.info(f"✅ Admin logged in successfully: {admin.email}")
        
        # Build JSON response
        response_data = APIResponse(
            success=True,
            message="Admin login successful",
            data={
                "access_token": access_token,
                "token_type": "bearer",
                "expires_in": ACCESS_TOKEN_EXPIRE_MINUTES * 60,
                "user_type": "admin",
                "admin": {
                    "id": str(db_admin["_id"]),
                    "name": db_admin["name"],
                    "email": db_admin["email"],
                    "role": db_admin.get("role", "admin")
                }
            }
        )
        
        # Set HttpOnly Cookie for enhanced security
        response = JSONResponse(content=response_data.dict())
        response.set_cookie(
            key="access_token",
            value=access_token,
            httponly=True,
            secure=os.getenv('ENVIRONMENT', 'development') == 'production',
            samesite="lax",
            max_age=ACCESS_TOKEN_EXPIRE_MINUTES * 60,
            path="/"
        )
        return response
        
    except Exception as e:
        logger.error(f"💥 ADMIN SIGNIN error: {str(e)}", exc_info=True)
        return APIResponse(success=False, message=f"Admin login failed: {str(e)}")


# ========================
# TRAINING & DOCUMENTS
# ========================

@router.post("/admin/train", response_model=APIResponse)
async def train_chatbot_api(
    file: UploadFile = File(...),
    adminId: str = Form(...),
    adminName: str = Form(...),
    admin: dict = Depends(get_current_admin)
):
    """Training endpoint using JWT authentication"""
    try:
        logger.info(f"📚 Training request from admin: {adminName}")
        
        # Save file temporarily
        upload_dir = "data/uploads"
        os.makedirs(upload_dir, exist_ok=True)
        file_path = os.path.join(upload_dir, file.filename)
        
        with open(file_path, "wb") as f:
            content = await file.read()
            f.write(content)
        
        file_size = len(content)
        
        # Use document_handler.py for processing
        from app.document_handler import ingest_pdf
        result = ingest_pdf(file_path, doc_type="Legal Document", source_name=adminName)
        
        # Create training document record
        training_document = {
            "documentName": file.filename,
            "uploadDate": datetime.utcnow(),
            "status": "completed" if result["status"] == "success" else "failed",
            "fileSize": file_size,
            "adminEmail": admin.get("email", "admin@legalai.com"),
            "adminName": adminName,
            "documentType": "Legal Document",
            "source": "Admin Upload",
            "processingTime": "N/A",
            "chunkCount": result.get("count", 0),
            "adminId": adminId
        }
        
        # Save to database if connected
        document_id = None
        if is_database_connected():
            try:
                training_collection = get_training_collection()
                result_db = training_collection.insert_one(training_document)
                document_id = str(result_db.inserted_id)
            except Exception as e:
                logging.error(f"Failed to save training document: {e}")
        
        if result["status"] != "success":
            return APIResponse(
                success=False,
                message=result.get('message', 'Processing failed'),
                data={"filename": file.filename, "status": "failed", "documentId": document_id}
            )
        
        return APIResponse(
            success=True,
            message="Training completed successfully",
            data={
                "filename": file.filename,
                "status": "completed",
                "adminName": adminName,
                "documentId": document_id,
                "chunkCount": result.get("count", 0)
            }
        )
        
    except Exception as e:
        logger.error(f"💥 Training error: {str(e)}")
        return APIResponse(success=False, message=f"Training failed: {str(e)}")

@router.delete("/admin/training/document/{document_id}")
async def delete_training_document(
    document_id: str,
    current_admin: dict = Depends(get_current_admin)
):
    """Delete a training document by ID"""
    try:
        logger.info(f"🗑️ DELETE request for document: {document_id}")
        
        if not document_id or len(document_id) != 24:
            raise HTTPException(status_code=400, detail="Invalid document ID format")
        
        obj_id = ObjectId(document_id)
        training_collection = get_training_collection()
        
        document = training_collection.find_one({"_id": obj_id})
        if not document:
            raise HTTPException(status_code=404, detail="Document not found")
        
        filename = document.get('documentName', document.get('filename', 'Unknown'))
        
        # 1. Delete Associated Vectors
        try:
            from app.document_handler import vector_store_manager
            vector_res = vector_store_manager.delete_vectors_by_source(filename)
            logger.info(f"🗑️ Vector cleanup for {filename}: {vector_res.get('message')}")
        except Exception as e:
            logger.error(f"⚠️ Vector cleanup failed for {filename}: {e}")

        # 2. Delete from database
        training_collection.delete_one({"_id": obj_id})
        
        # 3. Delete Associated physical file
        try:
            if filename and filename != 'Unknown':
                file_path = os.path.join("data", "uploads", filename)
                if os.path.exists(file_path):
                    os.remove(file_path)
        except Exception as e:
            logger.warning(f"Could not delete physical file {filename}: {e}")
        
        return {"success": True, "message": "Document and its vectors deleted successfully"}
        
    except Exception as e:
        logger.error(f"❌ Error deleting document {document_id}: {str(e)}")
        if isinstance(e, HTTPException): raise e
        raise HTTPException(status_code=500, detail="Internal server error")

@router.get("/admin/training-history", response_model=APIResponse)
async def get_training_history(
    admin: dict = Depends(get_current_admin),
    page: int = 1,
    limit: int = 50
):
    """Get training document history"""
    try:
        if not is_database_connected():
            return APIResponse(success=True, message="Disconnected", data={"history": []})
        
        training_collection = get_training_collection()
        training_docs = list(training_collection.find()
            .sort("uploadDate", -1)
            .limit(limit))
        
        for doc in training_docs:
            doc["_id"] = str(doc["_id"])
            if isinstance(doc.get("uploadDate"), datetime):
                doc["uploadDate"] = doc["uploadDate"].isoformat()
        
        return APIResponse(success=True, message="Success", data={"history": training_docs})
    except Exception as e:
        return APIResponse(success=False, message=str(e))


# ========================
# DASHBOARD & SYSTEM
# ========================

@router.get("/admin/stats", response_model=APIResponse)
async def get_admin_dashboard_stats(admin: dict = Depends(get_current_admin)):
    """Get admin dashboard statistics"""
    try:
        if not is_database_connected():
            return APIResponse(success=False, message="Offline", data={"totalDocuments": 0, "totalUsers": 0})
        
        users_collection = get_users_collection()
        training_collection = get_training_collection()
        
        total_users = users_collection.count_documents({})
        total_docs = training_collection.count_documents({})
        
        last_doc = training_collection.find_one(sort=[("uploadDate", -1)])
        last_training = last_doc["uploadDate"].isoformat() if last_doc else None
        
        return APIResponse(
            success=True,
            message="Success",
            data={
                "totalDocuments": total_docs,
                "totalUsers": total_users,
                "trainingSessions": total_docs,
                "systemHealth": 100 if is_database_connected() else 0,
                "activeModels": 1,
                "lastTraining": last_training
            }
        )
    except Exception as e:
        return APIResponse(success=False, message=str(e))

@router.get("/admin/system-status", response_model=APIResponse)
async def get_system_status(admin: dict = Depends(get_current_admin)):
    """Integrated system health monitoring"""
    try:
        db_connected = is_database_connected()
        from app.config import ai_provider, load_vector_store
        provider_info = ai_provider.get_provider_info()
        
        try:
            store = load_vector_store()
            vector_doc_count = len(store.index_to_docstore_id)
        except Exception:
            vector_doc_count = 0

        status_info = {
            "backend": "online",
            "database": "online" if db_connected else "offline",
            "vector": "online" if vector_doc_count > 0 else "empty",
            "ai": "online" if not provider_info.get("fallback_mode", False) else "degraded"
        }

        return APIResponse(success=True, message="System pulse retrieved", data=status_info)
    except Exception as e:
        return APIResponse(success=False, message=str(e))

@router.get("/system/status", response_model=APIResponse)
async def system_status_public():
    """Public system status endpoint"""
    try:
        db_connected = is_database_connected()
        return APIResponse(
            success=True,
            message="LegalAI System is online",
            data={"status": "online", "database": "online" if db_connected else "offline"}
        )
    except Exception as e:
        return APIResponse(success=False, message=str(e))

@router.get("/admin/users", response_model=APIResponse)
async def get_users_list(
    admin: dict = Depends(get_current_admin),
    page: int = 1,
    limit: int = 10
):
    """Get users list with pagination"""
    try:
        if not is_database_connected():
            return APIResponse(success=False, message="Offline")
        
        users_collection = get_users_collection()
        skip = (page - 1) * limit
        users = list(users_collection.find({}, {"password": 0}).sort("created_at", -1).skip(skip).limit(limit))
        
        for user in users:
            user["_id"] = str(user["_id"])
            if isinstance(user.get("created_at"), datetime):
                user["created_at"] = user["created_at"].isoformat()
        
        total_users = users_collection.count_documents({})
        total_pages = (total_users + limit - 1) // limit
        
        return APIResponse(
            success=True,
            message="Success",
            data={
                "users": users,
                "pagination": {
                    "current_page": page,
                    "total_pages": total_pages,
                    "total_users": total_users
                }
            }
        )
    except Exception as e:
        return APIResponse(success=False, message=str(e))


# ========================
# SUMMARIZATION & EXPORT
# ========================

@router.post("/admin/summarize", response_model=APIResponse)
async def summarize_document(
    document_id: str = Form(...),
    summary_type: str = Form("executive"),
    admin: dict = Depends(get_current_admin)
):
    """Summarize a specific legal document from training collection"""
    try:
        from app.summarizer import summarizer
        from app.config import load_vector_store
        
        # Load the document chunks from vector store using document_id
        store = load_vector_store()
        
        # Filter docs by document_id in metadata
        doc_chunks = []
        for doc_id in store.index_to_docstore_id.values():
            doc = store.docstore.search(doc_id)
            if doc.metadata.get("checksum") == document_id or document_id in doc.metadata.get("title", ""):
                doc_chunks.append(doc)
        
        if not doc_chunks:
            return APIResponse(success=False, message="No document sections found for summarization")
        
        logger.info(f"📑 Summarizing {len(doc_chunks)} chunks for: {document_id}")
        summary = summarizer.summarize_long_document(doc_chunks, summary_type=summary_type)
        
        return APIResponse(success=True, message="Summary generated", data={"summary": summary})
    except Exception as e:
        logger.error(f"Summarization endpoint failed: {e}")
        return APIResponse(success=False, message=str(e))

@router.post("/admin/export-summary")
async def export_summary(
    content: str = Form(...),
    title: str = Form("Legal_Summary"),
    format: str = Form("pdf"),
    admin: dict = Depends(get_current_admin)
):
    """Export summary text to PDF or Word"""
    try:
        from app.summarizer import summarizer
        output_dir = "data/exports"
        os.makedirs(output_dir, exist_ok=True)
        file_ext = "pdf" if format.lower() == "pdf" else "docx"
        safe_title = "".join([c if c.isalnum() else "_" for c in title])
        file_path = os.path.join(output_dir, f"{safe_title}.{file_ext}")
        
        if format.lower() == "pdf":
            summarizer.export_to_pdf(content, title, file_path)
        else:
            summarizer.export_to_docx(content, title, file_path)
            
        return FileResponse(
            path=file_path,
            filename=f"{safe_title}.{file_ext}",
            media_type="application/octet-stream"
        )
    except Exception as e:
        logger.error(f"Export failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))
