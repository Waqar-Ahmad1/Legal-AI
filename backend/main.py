# main.py - UPDATED ENDPOINTS VERSION
import os
import logging
import uvicorn
from datetime import datetime
from pathlib import Path
from typing import List, Dict, Any, Optional
from dotenv import load_dotenv
import json

# Fix OpenMP DLL conflict - MUST BE AT THE VERY TOP
os.environ['KMP_DUPLICATE_LIB_OK'] = 'True'

# FastAPI imports
from fastapi import FastAPI, UploadFile, File, Form, Depends, Request, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import APIKeyHeader
from fastapi.responses import JSONResponse
from slowapi import Limiter
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

# Import models from our modules
from app.models import APIResponse
from app.database import is_database_connected, get_training_collection
from app.routes import router as api_router, get_current_admin
from app.document_handler import ingest_pdf

# ========================
# Configuration
# ========================

load_dotenv()

# Directory Paths
VECTOR_STORE_PATH = Path("data/vector_store")
UPLOAD_FOLDER = Path("data/uploads")
LOG_DIR = Path("data/logs")

# API Constants
API_KEY_NAME = "X-API-Key"
ADMIN_API_KEY = os.getenv("ADMIN_API_KEY", "PLERkcJ-bJNQDJFGVxpBiNTGb0puWQRgq0USeoWLciQ")

# ========================
# FastAPI Application
# ========================

app = FastAPI(
    title="LegalAI API",
    description="Backend API for LegalAI application",
    version="1.0.0"
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Rate limiting
limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter

# Include API router WITHOUT prefix to match frontend routes
app.include_router(api_router)  # No prefix  # Removed prefix="/api/v1"

# ========================
# API Key Authentication (ONLY for legacy endpoints)
# ========================

api_key_scheme = APIKeyHeader(name=API_KEY_NAME, auto_error=False)

async def validate_api_key(api_key: str = Depends(api_key_scheme)):
    """Validate admin API key - ONLY for specific endpoints that need it"""
    if not api_key:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="API Key is missing. Please include X-API-Key header."
        )
    
    if api_key != ADMIN_API_KEY:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid API Key. Please check your API key."
        )
    
    return api_key

# ========================
# Error Handlers
# ========================

@app.exception_handler(RateLimitExceeded)
async def rate_limit_handler(request: Request, exc: RateLimitExceeded):
    return JSONResponse(
        status_code=429,
        content={"success": False, "message": "Too many requests. Limit: 5/minute", "data": None}
    )

@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    return JSONResponse(
        status_code=exc.status_code,
        content={"success": False, "message": exc.detail, "data": None}
    )

@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    logging.error(f"Unexpected error: {str(exc)}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"success": False, "message": "Internal server error", "data": None}
    )

# ========================
# Core API Endpoints
# ========================

@app.get("/")
async def root():
    """Root endpoint"""
    try:
        from app.config import load_vector_store, ai_provider
        store = load_vector_store()
        doc_count = len(store.index_to_docstore_id)
        provider_info = ai_provider.get_provider_info()
        embedding_backend = provider_info["embeddings"]["type"]
    except Exception as e:
        doc_count = 0
        embedding_backend = "unknown"
    
    return {
        "success": True,
        "message": "LegalAI API Server is running",
        "data": {
            "version": "1.0.0",
            "timestamp": datetime.utcnow().isoformat(),
            "embedding_backend": embedding_backend,
            "vector_store_documents": doc_count,
            "database_status": "connected" if is_database_connected() else "disconnected",
            "available_endpoints": {
                "user_registration": "POST /register",
                "user_login": "POST /login",
                "admin_signup": "POST /admin/signup",
                "admin_signin": "POST /admin/signin",
                "chat": "POST /chat",
                "admin_upload": "POST /admin/upload",
                "system_status": "GET /system/status"
            }
        }
    }

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "success": True,
        "message": "Service is healthy",
        "data": {
            "status": "healthy",
            "timestamp": datetime.utcnow().isoformat(),
            "database_status": "connected" if is_database_connected() else "disconnected",
        }
    }

# ========================
# Document Processing Endpoints
# ========================

@app.post("/admin/upload")
async def admin_upload(
    file: UploadFile,
    doc_type: str = Form(...),
    source_name: Optional[str] = Form(None),
    api_key: str = Depends(validate_api_key)
):
    """Upload endpoint using API key auth"""
    try:
        # Ensure uploads directory exists
        os.makedirs("data/uploads", exist_ok=True)
        
        file_path = os.path.join("data/uploads", file.filename)
        with open(file_path, "wb") as f:
            content = await file.read()
            f.write(content)

        # Use document_handler.py for processing
        result = ingest_pdf(file_path, doc_type=doc_type, source_name=source_name)
        
        if result["status"] != "success":
            return JSONResponse(
                status_code=422,
                content={
                    "success": False,
                    "message": result.get("message", "Document processing failed"),
                    "data": None
                }
            )
            
        return JSONResponse(
            content={
                "success": True,
                "message": "Document uploaded successfully",
                "data": {
                    "filename": file.filename,
                    "chunk_count": result.get("count", 0),
                    "document_type": doc_type,
                    "source": source_name or "Unknown",
                    "processing_time": result.get("processing_time", "N/A"),
                }
            }
        )
    
    except Exception as e:
        logging.error(f"Upload failed: {str(e)}")
        return JSONResponse(
            status_code=500,
            content={
                "success": False,
                "message": f"Document processing failed: {str(e)}",
                "data": None
            }
        )

# All other endpoints are handled by app.routes.api_router included on line 67


# ========================
# Startup Event
# ========================

@app.on_event("startup")
async def startup_event():
    """Initialize using all modules"""
    try:
        print("🔧 Initializing LegalAI System...")
        
        db_status = "connected" if is_database_connected() else "disconnected"
        print(f"✅ Database status: {db_status}")
        
        # Check AI provider status
        try:
            from app.config import ai_provider
            provider_info = ai_provider.get_provider_info()
            print(f"✅ Embeddings: {provider_info['embeddings']['type']}")
            print(f"✅ LLM: {provider_info['llm']['type']}")
            print(f"✅ Fallback mode: {provider_info['fallback_mode']}")
            print(f"💡 Recommendation: {provider_info['recommendation']}")
        except Exception as e:
            print(f"⚠️  AI Providers: {e}")
        
        try:
            from app.config import load_vector_store
            store = load_vector_store()
            doc_count = len(store.index_to_docstore_id)
            print(f"✅ Vector store: {doc_count} documents")
        except Exception as e:
            print(f"⚠️  Vector store: {e}")
        
        print("✅ LegalAI System started successfully")
        print("📋 Available endpoints:")
        print("   POST /register - User registration")
        print("   POST /login - User login")
        print("   POST /admin/signup - Admin registration")
        print("   POST /admin/signin - Admin login")
        print("   POST /chat - Chat with documents")
        print("   POST /admin/upload - Upload documents")
        print("   GET /system/status - System status")
        
    except Exception as e:
        print(f"❌ Startup error: {e}")

# ========================
# Server Startup
# ========================

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )