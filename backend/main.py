# main.py - UPDATED ENDPOINTS VERSION
import os
import logging
import uvicorn
from datetime import datetime
from pathlib import Path
from typing import List, Dict, Any, Optional
from dotenv import load_dotenv

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

@app.post("/admin/train")
async def train_chatbot_api(
    request: Request,
    file: UploadFile = File(...),
    adminId: str = Form(...),
    adminName: str = Form(...),
    admin: dict = Depends(get_current_admin)
):
    """Training endpoint using JWT authentication"""
    try:
        # Save file temporarily
        upload_dir = "data/uploads"
        os.makedirs(upload_dir, exist_ok=True)
        file_path = os.path.join(upload_dir, file.filename)
        
        with open(file_path, "wb") as f:
            content = await file.read()
            f.write(content)
        
        file_size = len(content)
        
        # Use document_handler.py for processing
        result = ingest_pdf(file_path, doc_type="Legal Document", source_name=adminName)
        
        # Create training document record
        training_document = {
            "documentName": file.filename,
            "uploadDate": datetime.utcnow().isoformat(),
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
            return {
                "success": False,
                "message": result.get('message', 'Processing failed'),
                "data": {
                    "filename": file.filename,
                    "status": "failed",
                    "adminName": adminName,
                    "documentId": document_id
                }
            }
        
        return {
            "success": True,
            "message": "Training completed successfully",
            "data": {
                "filename": file.filename,
                "status": "completed",
                "adminName": adminName,
                "documentId": document_id,
                "chunkCount": result.get("count", 0)
            }
        }
        
    except Exception as e:
        logging.error(f"Training error: {str(e)}")
        return {
            "success": False,
            "message": f"Training failed: {str(e)}",
            "data": None
        }

@app.post("/chat")
@limiter.limit("5/minute")
async def chat(request: Request):
    """Chat endpoint using config.py vector store and SmartAIProvider"""
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
            return JSONResponse(
                status_code=422,
                content={
                    "success": False,
                    "message": "Query must be at least 3 characters long",
                    "data": None
                }
            )

        query = query.strip()
        print(f"🔍 Processing chat query: {query}")

        # Use config.py vector store and AI provider
        from app.config import load_vector_store, ai_provider, llm
        
        store = load_vector_store()
        doc_count = len(store.index_to_docstore_id)
        
        if doc_count <= 1:
            return JSONResponse(
                content={
                    "success": True,
                    "message": "No documents loaded yet",
                    "data": {
                        "query": query,
                        "answer": "I don't have any legal documents loaded yet. Please upload documents first using the admin upload endpoint.",
                        "sources": [],
                        "provider_info": ai_provider.get_provider_info()
                    }
                }
            )
        
        # Retrieve relevant documents
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
                # Generate response using the configured LLM
                response = llm.invoke(prompt)
                answer = response.content if hasattr(response, 'content') else str(response)
            except Exception as llm_error:
                print(f"LLM error: {llm_error}")
                answer = "I found relevant legal documents:\n\n"
                for i, doc in enumerate(relevant_docs[:3]):
                    answer += f"{i+1}. {doc.page_content[:200]}...\n\n"
                answer += f"\nNote: LLM is currently unavailable. Error: {str(llm_error)}"
        else:
            # Fallback response if no LLM is available
            answer = "I found relevant legal documents:\n\n"
            for i, doc in enumerate(relevant_docs[:3]):
                answer += f"{i+1}. {doc.page_content[:200]}...\n\n"
            answer += "\nNote: LLM is not available for generating detailed responses."
        
        return JSONResponse(
            content={
                "success": True,
                "message": "Query processed successfully",
                "data": {
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
            }
        )
    
    except Exception as e:
        logging.error(f"Query failed: {str(e)}")
        return JSONResponse(
            status_code=500,
            content={
                "success": False,
                "message": f"Query processing failed: {str(e)}",
                "data": None
            }
        )

# ========================
# System Management Endpoints
# ========================

@app.get("/system/status")
async def system_status():
    """System status using all integrated modules"""
    db_connected = is_database_connected()
    
    # Get AI provider status
    try:
        from app.config import ai_provider
        provider_info = ai_provider.get_provider_info()
        embedding_backend = provider_info["embeddings"]["type"]
        llm_backend = provider_info["llm"]["type"]
        fallback_mode = provider_info["fallback_mode"]
    except:
        embedding_backend = "unknown"
        llm_backend = "unknown"
        fallback_mode = True
    
    try:
        from app.config import load_vector_store
        store = load_vector_store()
        vector_doc_count = len(store.index_to_docstore_id)
    except:
        vector_doc_count = 0
    
    status_info = {
        "database": {
            "status": "connected" if db_connected else "disconnected",
            "mode": "mongodb" if db_connected else "fallback"
        },
        "ai_providers": {
            "embeddings": embedding_backend,
            "llm": llm_backend,
            "fallback_mode": fallback_mode,
            "status": "optimal" if not fallback_mode else "degraded"
        },
        "vector_store": {
            "document_count": vector_doc_count,
            "status": "healthy" if vector_doc_count > 1 else "empty"
        },
        "system": {
            "status": "operational",
            "timestamp": datetime.utcnow().isoformat()
        }
    }
    
    return JSONResponse(content={
        "success": True,
        "message": "System status retrieved",
        "data": status_info
    })

# ========================
# Debug Endpoints
# ========================

@app.get("/debug/users")
async def debug_users():
    """Debug endpoint to see all users in database"""
    try:
        from app.database import get_users_collection
        users_collection = get_users_collection()
        users = list(users_collection.find({}, {"password": 0}).limit(10))
        
        for user in users:
            user["_id"] = str(user["_id"])
            
        return JSONResponse(content={
            "success": True,
            "message": f"Found {len(users)} users in database",
            "data": users
        })
    except Exception as e:
        return JSONResponse(content={
            "success": False,
            "message": f"Failed to get users: {str(e)}",
            "data": None
        })

@app.get("/debug/admins")
async def debug_admins():
    """Debug endpoint to see all admins in database"""
    try:
        from app.database import get_admins_collection
        admins_collection = get_admins_collection()
        admins = list(admins_collection.find({}, {"password": 0}).limit(10))
        
        for admin in admins:
            admin["_id"] = str(admin["_id"])
            
        return JSONResponse(content={
            "success": True,
            "message": f"Found {len(admins)} admins in database",
            "data": admins
        })
    except Exception as e:
        return JSONResponse(content={
            "success": False,
            "message": f"Failed to get admins: {str(e)}",
            "data": None
        })

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