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
import secrets
from .models import (
    UserRegister, UserLogin, Token, AdminRegister, 
    UserOut, AdminOut, APIResponse, VerificationRequest, ResendVerificationRequest,
    ForgotPasswordRequest, ResetPasswordRequest, SupportTicket, SupportTicketReply, SupportStatus,
    SystemSettings
)
from .email_utils import send_verification_email, send_password_reset_email
from .database import (
    get_users_collection, get_admins_collection, 
    get_training_collection, is_database_connected, get_support_collection,
    get_settings_collection
)

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
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login")

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
# USER ENDPOINTS
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
        
        # Enforce Gmail-only registration
        if not user.email.lower().endswith("@gmail.com"):
            logger.warning(f"❌ Registration rejected - non-gmail email: {user.email}")
            return APIResponse(
                success=False,
                message="Only valid @gmail.com accounts are allowed for registration"
            )
        
        # Check if user already exists
        existing_user = users_collection.find_one({"email": user.email})
        if existing_user:
            logger.warning(f"❌ Email already registered: {user.email}")
            return APIResponse(success=False, message="Email already registered")

        # Create new user
        verification_token = secrets.token_urlsafe(32)
        new_user = {
            "name": user.name,
            "email": user.email,
            "password": hash_password(user.password),
            "created_at": datetime.utcnow(),
            "is_active": True,
            "is_verified": False,
            "verification_token": verification_token,
            "role": "user",
            "last_login": None
        }

        # Save to database
        result = users_collection.insert_one(new_user)
        
        # Send verification email
        await send_verification_email(user.email, verification_token)
        
        logger.info(f"✅ User registered (pending verification): {user.email}")
        return APIResponse(
            success=True,
            message="Registration successful! Please check your email to verify your account.",
            data={"email": user.email}
        )
        
    except Exception as e:
        logger.error(f"💥 REGISTER error: {str(e)}", exc_info=True)
        return APIResponse(success=False, message=f"Registration failed: {str(e)}")

@router.post("/login", response_model=APIResponse)
async def login(user: UserLogin, request: Request):
    """User login - matches frontend /login"""
    try:
        logger.info(f"🔐 LOGIN attempt for: {user.email}")
        
        users_collection = get_users_collection()
        db_user = users_collection.find_one({"email": user.email})
        
        if not db_user:
            logger.warning(f"❌ Login failed - user not found: {user.email}")
            return APIResponse(success=False, message="Invalid email or password")

        # Verify password
        if not verify_password(user.password, db_user["password"]):
            logger.warning(f"❌ Login failed - incorrect password for: {user.email}")
            return APIResponse(success=False, message="Invalid email or password")

        # Check if user is active
        if not db_user.get("is_active", True):
            logger.warning(f"❌ Login failed - inactive account: {user.email}")
            return APIResponse(success=False, message="Account is deactivated")

        # Check if user is verified
        if not db_user.get("is_verified", False):
            logger.warning(f"❌ Login blocked - email not verified: {user.email}")
            return APIResponse(
                success=False,
                message="Please verify your email address before logging in.",
                data={"unverified": True, "email": user.email}
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
        return APIResponse(success=False, message=f"Login failed: {str(e)}")

@router.get("/auth/validate", response_model=APIResponse)
async def validate_token(current_user: dict = Depends(get_current_user)):
    """Validate JWT token and return user details"""
    try:
        return APIResponse(
            success=True,
            message="Token is valid",
            data={
                "user": {
                    "id": current_user["id"],
                    "name": current_user["name"],
                    "email": current_user["email"],
                    "role": current_user.get("role", "user")
                }
            }
        )
    except Exception as e:
        logger.error(f"💥 Auth validation error: {str(e)}")
        return APIResponse(success=False, message="Authentication failed")

# ========================
# ADMIN ENDPOINTS
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
        
        # Delete from database
        training_collection.delete_one({"_id": obj_id})
        
        # Delete Associated file
        try:
            if filename and filename != 'Unknown':
                file_path = os.path.join("data", "uploads", filename)
                if os.path.exists(file_path):
                    os.remove(file_path)
        except Exception as e:
            logger.warning(f"Could not delete physical file {filename}: {e}")
        
        return {"success": True, "message": "Document deleted successfully"}
        
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
                "trainingSessions": total_docs,  # Using doc count as session proxy for now
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
        except:
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
# CHAT ENDPOINT
# ========================

@router.post("/chat", response_model=APIResponse)
async def chat(request: Request):
    """Chat endpoint using config.py vector store"""
    try:
        try:
            body = await request.json()
            query = body.get('query') or body.get('message')
        except:
            form_data = await request.form()
            query = form_data.get('query') or form_data.get('message')
        
        if not query or len(query.strip()) < 3:
            return APIResponse(success=False, message="Query too short")

        query = query.strip()
        from app.config import load_vector_store, ai_provider, llm
        
        store = load_vector_store()
        doc_count = len(store.index_to_docstore_id)
        
        if doc_count <= 1:
            return APIResponse(
                success=True,
                message="No docs",
                data={"answer": "No legal documents loaded yet.", "provider_info": ai_provider.get_provider_info()}
            )
        
        retriever = store.as_retriever(search_kwargs={"k": 4})
        relevant_docs = retriever.get_relevant_documents(query)
        
        if llm:
            context = "\n\n".join([doc.page_content for doc in relevant_docs[:3]])
            prompt = f"Context: {context}\n\nQuery: {query}\n\nAnswer:"
            try:
                response = llm.invoke(prompt)
                answer = response.content if hasattr(response, 'content') else str(response)
            except Exception as llm_error:
                answer = "LLM unavailable. Based on docs: " + context[:200]
        else:
            answer = "LLM not configured."
        
        return APIResponse(
            success=True,
            message="Success",
            data={
                "query": query,
                "answer": answer,
                "sources": [{"title": d.metadata.get("title", "Doc"), "content": d.page_content[:100]} for d in relevant_docs],
                "provider_info": ai_provider.get_provider_info()
            }
        )
    except Exception as e:
        logger.error(f"Chat failed: {e}")
        return APIResponse(success=False, message=str(e))

# ========================
# DEBUG & VERIFICATION
# ========================

@router.get("/debug/users")
async def debug_users():
    """Debug users"""
    try:
        users_collection = get_users_collection()
        users = list(users_collection.find({}, {"password": 0}).limit(10))
        for u in users: u["_id"] = str(u["_id"])
        return APIResponse(success=True, message="Success", data=users)
    except Exception as e:
        return APIResponse(success=False, message=str(e))

@router.get("/debug/admins")
async def debug_admins():
    """Debug admins"""
    try:
        admins_collection = get_admins_collection()
        admins = list(admins_collection.find({}, {"password": 0}).limit(10))
        for a in admins: a["_id"] = str(a["_id"])
        return APIResponse(success=True, message="Success", data=admins)
    except Exception as e:
        return APIResponse(success=False, message=str(e))

@router.post("/verify-email", response_model=APIResponse)
async def verify_email(req: VerificationRequest):
    """Verify user email using token"""
    try:
        users_collection = get_users_collection()
        user = users_collection.find_one({"verification_token": req.token})
        
        if not user:
            return APIResponse(success=False, message="Invalid or expired verification token")
            
        users_collection.update_one(
            {"_id": user["_id"]},
            {
                "$set": {"is_verified": True},
                "$unset": {"verification_token": ""}
            }
        )
        
        return APIResponse(success=True, message="Email verified successfully! You can now login.")
    except Exception as e:
        return APIResponse(success=False, message=str(e))

@router.post("/resend-verification", response_model=APIResponse)
async def resend_verification(req: ResendVerificationRequest):
    """Resend verification email"""
    try:
        users_collection = get_users_collection()
        user = users_collection.find_one({"email": req.email})
        
        if not user:
            return APIResponse(success=False, message="User not found")
            
        if user.get("is_verified", False):
            return APIResponse(success=False, message="Email is already verified")
            
        new_token = secrets.token_urlsafe(32)
        users_collection.update_one(
            {"_id": user["_id"]},
            {"$set": {"verification_token": new_token}}
        )
        await send_verification_email(user["email"], new_token)
        
        return APIResponse(success=True, message="Verification email resent. Please check your inbox.")
    except Exception as e:
        return APIResponse(success=False, message=str(e))

@router.post("/forgot-password", response_model=APIResponse)
async def forgot_password(req: ForgotPasswordRequest):
    """Initial request for password reset"""
    try:
        users_collection = get_users_collection()
        user = users_collection.find_one({"email": req.email})
        
        # Don't reveal if user exists for security, 
        # but for this specific request we can be friendly
        if not user:
            return APIResponse(
                success=True, 
                message="If this email is registered, you will receive a reset link shortly."
            )
            
        # Generate reset token and expiry (1 hour)
        reset_token = secrets.token_urlsafe(32)
        expiry = datetime.utcnow() + timedelta(hours=1)
        
        users_collection.update_one(
            {"_id": user["_id"]},
            {
                "$set": {
                    "reset_token": reset_token,
                    "reset_token_expiry": expiry
                }
            }
        )
        
        await send_password_reset_email(user["email"], reset_token)
        
        return APIResponse(
            success=True, 
            message="If this email is registered, you will receive a reset link shortly."
        )
    except Exception as e:
        logger.error(f"Forgot password error: {str(e)}")
        return APIResponse(success=False, message="An error occurred while processing your request.")

@router.post("/reset-password", response_model=APIResponse)
async def reset_password(req: ResetPasswordRequest):
    """Complete password reset using token"""
    try:
        users_collection = get_users_collection()
        
        # Find user with matching token and unexpired
        user = users_collection.find_one({
            "reset_token": req.token,
            "reset_token_expiry": {"$gt": datetime.utcnow()}
        })
        
        if not user:
            return APIResponse(
                success=False, 
                message="Invalid or expired reset token. Please request a new one."
            )
            
        # Update password and clear token
        users_collection.update_one(
            {"_id": user["_id"]},
            {
                "$set": {"password": hash_password(req.password)},
                "$unset": {"reset_token": "", "reset_token_expiry": ""}
            }
        )
        
        logger.info(f"✅ Password reset success for user: {user['email']}")
        return APIResponse(success=True, message="Password reset successfully! You can now login.")
        
    except Exception as e:
        logger.error(f"Reset password error: {str(e)}")
        return APIResponse(success=False, message=f"Failed to reset password: {str(e)}")

# ========================
# CUSTOMER SUPPORT SYSTEM
# ========================

@router.post("/support/ticket", response_model=APIResponse)
async def submit_support_ticket(ticket: SupportTicket):
    """Public endpoint to submit a support ticket"""
    try:
        support_collection = get_support_collection()
        ticket_data = ticket.dict()
        ticket_data["created_at"] = datetime.utcnow()
        ticket_data["status"] = SupportStatus.PENDING
        
        result = support_collection.insert_one(ticket_data)
        
        logger.info(f"🎫 New support ticket created: {ticket.ticket_ref}")
        return APIResponse(
            success=True, 
            message="Ticket submitted successfully", 
            data={"ticket_ref": ticket.ticket_ref}
        )
    except Exception as e:
        logger.error(f"Support ticket submission error: {str(e)}")
        return APIResponse(success=False, message="Failed to submit ticket")

@router.get("/admin/support/tickets", response_model=APIResponse)
async def get_admin_support_tickets(
    status_filter: Optional[str] = None,
    page: int = 1,
    limit: int = 50,
    admin: dict = Depends(get_current_admin)
):
    """Admin endpoint to list all support tickets"""
    try:
        support_collection = get_support_collection()
        query = {}
        if status_filter:
            query["status"] = status_filter
            
        tickets = list(support_collection.find(query)
                      .sort("created_at", -1)
                      .skip((page - 1) * limit)
                      .limit(limit))
        
        for t in tickets:
            t["id"] = str(t["_id"])
            del t["_id"]
            
        total = support_collection.count_documents(query)
        
        return APIResponse(
            success=True, 
            message="Tickets fetched successfully", 
            data={"tickets": tickets, "total": total}
        )
    except Exception as e:
        logger.error(f"Error fetching support tickets: {str(e)}")
        return APIResponse(success=False, message="Failed to fetch tickets")

@router.patch("/admin/support/tickets/{ticket_id}/read", response_model=APIResponse)
async def mark_ticket_as_read(ticket_id: str, admin: dict = Depends(get_current_admin)):
    """Admin endpoint to mark a ticket as read"""
    try:
        support_collection = get_support_collection()
        result = support_collection.update_one(
            {"_id": ObjectId(ticket_id)},
            {"$set": {"status": SupportStatus.READ}}
        )
        
        if result.modified_count == 0:
            return APIResponse(success=False, message="Ticket not found or already read")
            
        return APIResponse(success=True, message="Ticket marked as read")
    except Exception as e:
        logger.error(f"Error updating ticket status: {str(e)}")
        return APIResponse(success=False, message="Failed to update ticket")

@router.post("/admin/support/tickets/{ticket_id}/reply", response_model=APIResponse)
async def reply_to_ticket(ticket_id: str, reply: SupportTicketReply, admin: dict = Depends(get_current_admin)):
    """Admin endpoint to reply to a support ticket"""
    try:
        support_collection = get_support_collection()
        reply_data = reply.dict()
        reply_data["timestamp"] = datetime.utcnow()
        
        result = support_collection.update_one(
            {"_id": ObjectId(ticket_id)},
            {
                "$push": {"replies": reply_data},
                "$set": {"status": SupportStatus.REPLIED}
            }
        )
        
        if result.modified_count == 0:
            return APIResponse(success=False, message="Ticket not found")
            
        logger.info(f"✉️ Admin replied to ticket: {ticket_id}")
        return APIResponse(success=True, message="Reply sent successfully")
    except Exception as e:
        logger.error(f"Error replying to ticket: {str(e)}")
        return APIResponse(success=False, message="Failed to send reply")

@router.delete("/admin/support/tickets/{ticket_id}", response_model=APIResponse)
async def delete_support_ticket(ticket_id: str, admin: dict = Depends(get_current_admin)):
    """Admin endpoint to delete a support ticket"""
    try:
        support_collection = get_support_collection()
        result = support_collection.delete_one({"_id": ObjectId(ticket_id)})
        
        if result.deleted_count == 0:
            return APIResponse(success=False, message="Ticket not found")
            
        return APIResponse(success=True, message="Ticket deleted successfully")
    except Exception as e:
        logger.error(f"Error deleting ticket: {str(e)}")
        return APIResponse(success=False, message="Failed to delete ticket")

# ========================
# SYSTEM SETTINGS SYSTEM
# ========================

@router.get("/admin/settings", response_model=APIResponse)
async def get_system_settings(admin: dict = Depends(get_current_admin)):
    """Admin endpoint to fetch global system settings"""
    try:
        settings_collection = get_settings_collection()
        settings = settings_collection.find_one({})
        
        if not settings:
            # Initialize with defaults if empty
            default_settings = SystemSettings().dict()
            settings_collection.insert_one(default_settings)
            settings = default_settings
            
        if "_id" in settings:
            settings["id"] = str(settings["_id"])
            del settings["_id"]
            
        return APIResponse(success=True, message="Settings fetched", data=settings)
    except Exception as e:
        logger.error(f"Error fetching settings: {str(e)}")
        return APIResponse(success=False, message="Failed to fetch settings")

@router.patch("/admin/settings", response_model=APIResponse)
async def update_system_settings(settings_update: dict, admin: dict = Depends(get_current_admin)):
    """Admin endpoint to update global system settings"""
    try:
        settings_collection = get_settings_collection()
        settings_update["updated_at"] = datetime.utcnow()
        
        result = settings_collection.update_one(
            {}, 
            {"$set": settings_update},
            upsert=True
        )
        
        logger.info(f"⚙️ System settings updated by admin: {admin['email']}")
        return APIResponse(success=True, message="Settings updated successfully")
    except Exception as e:
        logger.error(f"Error updating settings: {str(e)}")
        return APIResponse(success=False, message="Failed to update settings")

