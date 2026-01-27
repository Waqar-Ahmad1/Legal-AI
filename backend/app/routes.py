# app/routes.py - COMPLETE ENDPOINTS
from fastapi import APIRouter, HTTPException, status, Depends, Request, UploadFile, File, Form
from fastapi.responses import JSONResponse
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError
from datetime import datetime, timedelta
import os
from dotenv import load_dotenv
import logging
import bcrypt
from typing import Optional
import traceback
from bson import ObjectId

from .models import (
    UserRegister, UserLogin, Token, AdminRegister, 
    UserOut, AdminOut, APIResponse
)
from .database import get_users_collection, get_admins_collection, is_database_connected, get_training_collection

logger = logging.getLogger(__name__)
load_dotenv()

router = APIRouter()

# Security configurations
SECRET_KEY = os.getenv("SECRET_KEY", "legal-ai-secret-key-2024-change-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 24 hours

# Admin configurations
ADMIN_SECRET_KEY = os.getenv("ADMIN_SECRET_KEY", "legal-ai-admin-secret-2024")

# OAuth2 scheme
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login")  # Changed to match frontend

# Password hashing utilities
def hash_password(password: str) -> str:
    """Hash password using bcrypt"""
    try:
        salt = bcrypt.gensalt(rounds=12)
        hashed = bcrypt.hashpw(password.encode('utf-8'), salt)
        return hashed.decode('utf-8')
    except Exception as e:
        logger.error(f"Password hashing failed: {str(e)}")
        raise

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify password against hash"""
    try:
        return bcrypt.checkpw(
            plain_password.encode('utf-8'), 
            hashed_password.encode('utf-8')
        )
    except Exception as e:
        logger.error(f"Password verification failed: {str(e)}")
        return False

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    """Create JWT access token"""
    try:
        to_encode = data.copy()
        if expires_delta:
            expire = datetime.utcnow() + expires_delta
        else:
            expire = datetime.utcnow() + timedelta(minutes=15)
        to_encode.update({"exp": expire})
        encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
        return encoded_jwt
    except Exception as e:
        logger.error(f"Error creating access token: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create access token"
        )

async def get_current_user(token: str = Depends(oauth2_scheme)):
    """Get current user from JWT token"""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        user_type: str = payload.get("type", "user")
        
        if email is None or user_type != "user":
            raise credentials_exception
        
        users_collection = get_users_collection()
        user = users_collection.find_one({"email": email})
        
        if user is None or not user.get("is_active", True):
            raise credentials_exception
        
        user["id"] = str(user["_id"])
        return user
        
    except JWTError as e:
        logger.error(f"JWT error: {str(e)}")
        raise credentials_exception
    except Exception as e:
        logger.error(f"Unexpected error in get_current_user: {str(e)}")
        raise credentials_exception

async def get_current_admin(token: str = Depends(oauth2_scheme)):
    """Get current admin from JWT token"""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate admin credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        user_type: str = payload.get("type", "user")
        
        if email is None or user_type != "admin":
            raise credentials_exception
        
        admins_collection = get_admins_collection()
        admin = admins_collection.find_one({"email": email})
        
        if admin is None or not admin.get("is_active", True):
            raise credentials_exception
        
        admin["id"] = str(admin["_id"])
        return admin
        
    except JWTError as e:
        logger.error(f"Admin JWT error: {str(e)}")
        raise credentials_exception
    except Exception as e:
        logger.error(f"Unexpected error in get_current_admin: {str(e)}")
        raise credentials_exception

# ========================
# UPDATED ENDPOINTS - MATCH FRONTEND EXPECTATIONS
# ========================

@router.post("/register", response_model=APIResponse)
async def register(user: UserRegister, request: Request):
    """User registration - matches frontend /register"""
    try:
        logger.info(f"🔐 REGISTER endpoint called for: {user.email}")
        
        if not is_database_connected():
            return APIResponse(
                success=False,
                message="Database temporarily unavailable. Please try again later."
            )
        
        users_collection = get_users_collection()
        
        # Check if user already exists
        existing_user = users_collection.find_one({"email": user.email})
            
        if existing_user:
            logger.warning(f"❌ Email already registered: {user.email}")
            return APIResponse(
                success=False,
                message="Email already registered"
            )

        # Create new user
        new_user = {
            "name": user.name,
            "email": user.email,
            "password": hash_password(user.password),
            "created_at": datetime.utcnow(),
            "is_active": True,
            "role": "user",
            "last_login": None
        }

        # Save to database
        result = users_collection.insert_one(new_user)
        user_id = str(result.inserted_id)
        
        logger.info(f"✅ User registered successfully: {user.email} (ID: {user_id})")
        return APIResponse(
            success=True,
            message="User registered successfully",
            data={
                "user": {
                    "id": user_id,
                    "name": user.name,
                    "email": user.email,
                    "role": "user"
                }
            }
        )
        
    except Exception as e:
        logger.error(f"💥 REGISTER error: {str(e)}", exc_info=True)
        return APIResponse(
            success=False,
            message=f"Registration failed: {str(e)}"
        )

@router.post("/login", response_model=APIResponse)
async def login(user: UserLogin, request: Request):
    """User login - matches frontend /login"""
    try:
        logger.info(f"🔐 LOGIN attempt for: {user.email}")
        
        users_collection = get_users_collection()
        db_user = users_collection.find_one({"email": user.email})
        
        if not db_user:
            logger.warning(f"❌ Login failed - user not found: {user.email}")
            return APIResponse(
                success=False,
                message="Invalid email or password"
            )

        # Verify password
        if not verify_password(user.password, db_user["password"]):
            logger.warning(f"❌ Login failed - incorrect password for: {user.email}")
            return APIResponse(
                success=False,
                message="Invalid email or password"
            )

        # Check if user is active
        if not db_user.get("is_active", True):
            logger.warning(f"❌ Login failed - inactive account: {user.email}")
            return APIResponse(
                success=False,
                message="Account is deactivated"
            )

        # Update last login
        users_collection.update_one(
            {"_id": db_user["_id"]},
            {"$set": {"last_login": datetime.utcnow()}}
        )

        # Create access token
        access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = create_access_token(
            data={"sub": db_user["email"], "type": "user"},
            expires_delta=access_token_expires
        )
        
        logger.info(f"✅ User logged in successfully: {user.email}")
        return APIResponse(
            success=True,
            message="Login successful",
            data={
                "access_token": access_token,
                "token_type": "bearer",
                "expires_in": ACCESS_TOKEN_EXPIRE_MINUTES * 60,
                "user_type": "user",
                "user": {
                    "id": str(db_user["_id"]),
                    "name": db_user["name"],
                    "email": db_user["email"],
                    "role": db_user.get("role", "user")
                }
            }
        )
        
    except Exception as e:
        logger.error(f"💥 LOGIN error: {str(e)}", exc_info=True)
        return APIResponse(
            success=False,
            message=f"Login failed: {str(e)}"
        )

@router.post("/admin/signup", response_model=APIResponse)
async def admin_signup(admin: AdminRegister):
    """Admin registration - matches frontend /admin/signup"""
    try:
        logger.info(f"👑 ADMIN SIGNUP attempt for: {admin.email}")
        
        # Verify admin secret key
        if admin.secret_key != ADMIN_SECRET_KEY:
            logger.warning(f"❌ Invalid admin secret key attempt: {admin.secret_key}")
            return APIResponse(
                success=False,
                message="Invalid admin secret key"
            )
        
        admins_collection = get_admins_collection()
        
        # Check if admin already exists
        existing_admin = admins_collection.find_one({"email": admin.email})
        if existing_admin:
            logger.warning(f"❌ Email already registered as admin: {admin.email}")
            return APIResponse(
                success=False,
                message="Email already registered as admin"
            )
        
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
        return APIResponse(
            success=False,
            message=f"Admin registration failed: {str(e)}"
        )

@router.post("/admin/signin", response_model=APIResponse)
async def admin_signin(admin: UserLogin):
    """Admin login - matches frontend /admin/signin"""
    try:
        logger.info(f"👑 ADMIN SIGNIN attempt for: {admin.email}")
        
        admins_collection = get_admins_collection()
        db_admin = admins_collection.find_one({"email": admin.email})
        
        if not db_admin:
            logger.warning(f"❌ Admin login failed - admin not found: {admin.email}")
            return APIResponse(
                success=False,
                message="Invalid email or password"
            )

        # Verify password
        if not verify_password(admin.password, db_admin["password"]):
            logger.warning(f"❌ Admin login failed - incorrect password for: {admin.email}")
            return APIResponse(
                success=False,
                message="Invalid email or password"
            )

        # Check if admin is active
        if not db_admin.get("is_active", True):
            logger.warning(f"❌ Admin login failed - inactive account: {admin.email}")
            return APIResponse(
                success=False,
                message="Admin account is deactivated"
            )

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
        return APIResponse(
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
        
    except Exception as e:
        logger.error(f"💥 ADMIN SIGNIN error: {str(e)}", exc_info=True)
        return APIResponse(
            success=False,
            message=f"Admin login failed: {str(e)}"
        )


@router.delete("/admin/training/document/{document_id}")
async def delete_training_document(
    document_id: str,
    current_admin: dict = Depends(get_current_admin)
):
    """
    Delete a training document by ID
    """
    try:
        logger.info(f"🗑️ DELETE request for document: {document_id}")
        
        # Validate document_id format
        if not document_id or len(document_id) != 24:
            logger.error(f"Invalid document ID format: {document_id}")
            raise HTTPException(status_code=400, detail="Invalid document ID format")
        
        # Convert to ObjectId
        try:
            obj_id = ObjectId(document_id)
        except Exception as e:
            logger.error(f"Invalid ObjectId: {document_id} - {e}")
            raise HTTPException(status_code=400, detail="Invalid document ID format")
        
        # Get training collection
        training_collection = get_training_collection()
        
        # First, get the document to know what we're deleting
        document = training_collection.find_one({"_id": obj_id})
        if not document:
            logger.warning(f"Document not found in database: {document_id}")
            raise HTTPException(status_code=404, detail="Document not found")
        
        filename = document.get('documentName', document.get('filename', 'Unknown'))
        logger.info(f"Found document to delete - ID: {document_id}, Name: {filename}")
        
        # Delete from database
        result = training_collection.delete_one({"_id": obj_id})
        
        if result.deleted_count == 0:
            logger.error(f"Database deletion failed for: {document_id}")
            raise HTTPException(status_code=404, detail="Document not found")
        
        logger.info(f"Successfully deleted from database: {document_id}")
        
        # Delete associated file from uploads directory
        file_deleted = False
        try:
            if filename and filename != 'Unknown':
                file_path = os.path.join("data", "uploads", filename)
                if os.path.exists(file_path):
                    os.remove(file_path)
                    file_deleted = True
                    logger.info(f"Deleted physical file: {filename}")
                else:
                    logger.warning(f"Physical file not found: {filename}")
        except Exception as e:
            logger.warning(f"Could not delete physical file {filename}: {e}")
        
        logger.info(f"✅ Document deleted successfully: {filename} (ID: {document_id})")
        
        return {
            "success": True,
            "message": "Document deleted successfully",
            "deleted_id": document_id,
            "filename": filename,
            "file_deleted": file_deleted
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error deleting document {document_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


# ========================
# ADMIN TRAINING ENDPOINT
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
                if hasattr(training_collection, 'insert_one'):
                    result_db = training_collection.insert_one(training_document)
                    document_id = str(result_db.inserted_id)
            except Exception as e:
                logging.error(f"Failed to save training document: {e}")
        
        if result["status"] != "success":
            return APIResponse(
                success=False,
                message=result.get('message', 'Processing failed'),
                data={
                    "filename": file.filename,
                    "status": "failed",
                    "adminName": adminName,
                    "documentId": document_id
                }
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
        return APIResponse(
            success=False,
            message=f"Training failed: {str(e)}",
            data=None
        )

# ========================
# ADMIN DASHBOARD ENDPOINTS
# ========================

@router.get("/admin/dashboard/stats", response_model=APIResponse)
async def get_admin_dashboard_stats(admin: dict = Depends(get_current_admin)):
    """Get admin dashboard statistics"""
    try:
        logger.info("📊 Admin dashboard stats requested")
        
        if not is_database_connected():
            return APIResponse(
                success=False,
                message="Database temporarily unavailable"
            )
        
        # Get collections
        users_collection = get_users_collection()
        admins_collection = get_admins_collection()
        training_collection = get_training_collection()
        
        # Calculate statistics
        total_users = users_collection.count_documents({})
        total_admins = admins_collection.count_documents({})
        total_training_documents = training_collection.count_documents({})
        
        # Active users (logged in last 30 days)
        thirty_days_ago = datetime.utcnow() - timedelta(days=30)
        active_users = users_collection.count_documents({
            "last_login": {"$gte": thirty_days_ago}
        })
        
        # Recent training documents (last 7 days)
        seven_days_ago = datetime.utcnow() - timedelta(days=7)
        recent_training = training_collection.count_documents({
            "uploadDate": {"$gte": seven_days_ago}
        })
        
        # Get vector store document count
        try:
            from app.config import load_vector_store
            store = load_vector_store()
            vector_doc_count = len(store.index_to_docstore_id)
        except:
            vector_doc_count = 0
        
        stats = {
            "total_users": total_users,
            "total_admins": total_admins,
            "total_training_documents": total_training_documents,
            "active_users": active_users,
            "recent_training_documents": recent_training,
            "vector_store_documents": vector_doc_count,
            "system_status": "operational",
            "last_updated": datetime.utcnow().isoformat()
        }
        
        logger.info(f"✅ Dashboard stats: {total_users} users, {total_training_documents} training docs")
        return APIResponse(
            success=True,
            message="Dashboard statistics retrieved successfully",
            data=stats
        )
        
    except Exception as e:
        logger.error(f"💥 Dashboard stats error: {str(e)}")
        return APIResponse(
            success=False,
            message=f"Failed to retrieve dashboard statistics: {str(e)}"
        )

@router.get("/admin/training/history", response_model=APIResponse)
async def get_training_history(
    admin: dict = Depends(get_current_admin),
    page: int = 1,
    limit: int = 10
):
    """Get training document history with pagination"""
    try:
        logger.info(f"📚 Training history requested - page {page}, limit {limit}")
        
        if not is_database_connected():
            return APIResponse(
                success=False,
                message="Database temporarily unavailable"
            )
        
        training_collection = get_training_collection()
        
        # Calculate skip for pagination
        skip = (page - 1) * limit
        
        # Get training documents with pagination
        training_docs = list(training_collection.find()
            .sort("uploadDate", -1)
            .skip(skip)
            .limit(limit))
        
        # Convert ObjectId to string and format dates
        for doc in training_docs:
            doc["_id"] = str(doc["_id"])
            if isinstance(doc.get("uploadDate"), datetime):
                doc["uploadDate"] = doc["uploadDate"].isoformat()
        
        # Get total count for pagination
        total_documents = training_collection.count_documents({})
        total_pages = (total_documents + limit - 1) // limit
        
        pagination_info = {
            "current_page": page,
            "total_pages": total_pages,
            "total_documents": total_documents,
            "has_next": page < total_pages,
            "has_prev": page > 1
        }
        
        logger.info(f"✅ Training history: {len(training_docs)} documents retrieved")
        return APIResponse(
            success=True,
            message="Training history retrieved successfully",
            data={
                "documents": training_docs,
                "pagination": pagination_info
            }
        )
        
    except Exception as e:
        logger.error(f"💥 Training history error: {str(e)}")
        return APIResponse(
            success=False,
            message=f"Failed to retrieve training history: {str(e)}"
        )

@router.get("/admin/users", response_model=APIResponse)
async def get_users_list(
    admin: dict = Depends(get_current_admin),
    page: int = 1,
    limit: int = 10
):
    """Get users list with pagination"""
    try:
        logger.info(f"👥 Users list requested - page {page}, limit {limit}")
        
        if not is_database_connected():
            return APIResponse(
                success=False,
                message="Database temporarily unavailable"
            )
        
        users_collection = get_users_collection()
        
        # Calculate skip for pagination
        skip = (page - 1) * limit
        
        # Get users with pagination (exclude passwords)
        users = list(users_collection.find(
            {}, 
            {"password": 0}
        ).sort("created_at", -1)
         .skip(skip)
         .limit(limit))
        
        # Convert ObjectId to string and format dates
        for user in users:
            user["_id"] = str(user["_id"])
            if isinstance(user.get("created_at"), datetime):
                user["created_at"] = user["created_at"].isoformat()
            if isinstance(user.get("last_login"), datetime):
                user["last_login"] = user["last_login"].isoformat()
        
        # Get total count for pagination
        total_users = users_collection.count_documents({})
        total_pages = (total_users + limit - 1) // limit
        
        pagination_info = {
            "current_page": page,
            "total_pages": total_pages,
            "total_users": total_users,
            "has_next": page < total_pages,
            "has_prev": page > 1
        }
        
        logger.info(f"✅ Users list: {len(users)} users retrieved")
        return APIResponse(
            success=True,
            message="Users list retrieved successfully",
            data={
                "users": users,
                "pagination": pagination_info
            }
        )
        
    except Exception as e:
        logger.error(f"💥 Users list error: {str(e)}")
        return APIResponse(
            success=False,
            message=f"Failed to retrieve users list: {str(e)}"
        )

# ========================
# CHAT ENDPOINT - UPDATED TO FIX 422 ERRORS
# ========================

@router.post("/chat", response_model=APIResponse)
async def chat(request: Request):
    """Chat endpoint using config.py vector store"""
    try:
        # Parse request body to get the query
        try:
            body = await request.json()
            query = body.get('query') or body.get('message')
        except:
            # If JSON parsing fails, try form data
            form_data = await request.form()
            query = form_data.get('query') or form_data.get('message')
        
        # If still no query, return error
        if not query or len(query.strip()) < 3:
            return APIResponse(
                success=False,
                message="Query must be at least 3 characters long",
                data=None
            )

        query = query.strip()
        logger.info(f"🔍 Processing chat query: {query}")

        # Use config.py vector store
        from app.config import load_vector_store, ai_provider, llm
        
        store = load_vector_store()
        doc_count = len(store.index_to_docstore_id)
        
        if doc_count <= 1:
            return APIResponse(
                success=True,
                message="No documents loaded yet",
                data={
                    "query": query,
                    "answer": "I don't have any legal documents loaded yet. Please upload documents first using the admin upload endpoint.",
                    "sources": [],
                    "provider_info": ai_provider.get_provider_info()
                }
            )
        
        retriever = store.as_retriever(search_kwargs={"k": 4})
        relevant_docs = retriever.get_relevant_documents(query)
        
        # Generate response using the configured LLM
        if llm:
            # Create context from retrieved documents
            context = "\n\n".join([doc.page_content for doc in relevant_docs[:3]])
            
            # Create prompt for the LLM
            prompt = f"""Based on the following legal documents, please provide a helpful response to the user's query.

User Query: {query}

Relevant Legal Documents:
{context}

Please provide a clear, concise answer based on the documents above. If the documents don't contain relevant information, please state that clearly."""
            
            try:
                response = llm.invoke(prompt)
                answer = response.content if hasattr(response, 'content') else str(response)
            except Exception as llm_error:
                logger.error(f"LLM error: {llm_error}")
                answer = "I found relevant legal documents:\n\n"
                for i, doc in enumerate(relevant_docs[:3]):
                    answer += f"{i+1}. {doc.page_content[:200]}...\n\n"
                answer += f"\nNote: LLM is currently unavailable."
        else:
            answer = "I found relevant legal documents:\n\n"
            for i, doc in enumerate(relevant_docs[:3]):
                answer += f"{i+1}. {doc.page_content[:200]}...\n\n"
            answer += "\nNote: LLM is not available for generating detailed responses."
        
        return APIResponse(
            success=True,
            message="Query processed successfully",
            data={
                "query": query,
                "answer": answer,
                "sources": [
                    {
                        "source": doc.metadata.get("source", "Unknown"),
                        "title": doc.metadata.get("title", "Untitled"),
                        "content_preview": doc.page_content[:100] + "..."
                    }
                    for doc in relevant_docs
                ],
                "provider_info": ai_provider.get_provider_info()
            }
        )
    
    except Exception as e:
        logger.error(f"Query failed: {str(e)}")
        return APIResponse(
            success=False,
            message=f"Query processing failed: {str(e)}",
            data=None
        )

# ========================
# DEBUG ENDPOINTS
# ========================

@router.get("/debug/users")
async def debug_users():
    """Debug endpoint to see all users in database"""
    try:
        users_collection = get_users_collection()
        users = list(users_collection.find({}, {"password": 0}).limit(10))
        
        for user in users:
            user["_id"] = str(user["_id"])
            
        return APIResponse(
            success=True,
            message=f"Found {len(users)} users in database",
            data=users
        )
    except Exception as e:
        return APIResponse(
            success=False,
            message=f"Failed to get users: {str(e)}",
            data=None
        )

@router.get("/debug/admins")
async def debug_admins():
    """Debug endpoint to see all admins in database"""
    try:
        admins_collection = get_admins_collection()
        admins = list(admins_collection.find({}, {"password": 0}).limit(10))
        
        for admin in admins:
            admin["_id"] = str(admin["_id"])
            
        return APIResponse(
            success=True,
            message=f"Found {len(admins)} admins in database",
            data=admins
        )
    except Exception as e:
        return APIResponse(
            success=False,
            message=f"Failed to get admins: {str(e)}",
            data=None
        )