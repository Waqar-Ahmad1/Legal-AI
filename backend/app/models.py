from pydantic import BaseModel, EmailStr, Field, validator
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum

class UserRole(str, Enum):
    USER = "user"
    ADMIN = "admin"
    SUPER_ADMIN = "super_admin"

class UserRegister(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    email: EmailStr
    password: str = Field(..., min_length=6, max_length=100)

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class AdminRegister(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    email: EmailStr
    password: str = Field(..., min_length=8, max_length=100)
    secret_key: str

class Token(BaseModel):
    access_token: str
    token_type: str
    expires_in: int
    user_type: str

class UserOut(BaseModel):
    id: str
    name: str
    email: EmailStr
    created_at: datetime
    is_active: bool
    role: UserRole

    class Config:
        from_attributes = True
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }

class AdminOut(BaseModel):
    id: str
    name: str
    email: EmailStr
    role: UserRole
    created_at: datetime
    is_active: bool

# Make sure this class exists in models.py
class APIResponse(BaseModel):
    success: bool
    message: str
    data: Optional[Any] = None

class TrainingDocument(BaseModel):
    documentName: str
    uploadDate: datetime
    status: str
    fileSize: int
    adminEmail: str
    adminName: str
    documentType: str
    source: str
    processingTime: str
    chunkCount: int
    adminId: str

class DashboardStats(BaseModel):
    total_users: int
    total_admins: int
    total_training_documents: int
    active_users: int
    system_status: str
    last_updated: datetime
    storage_size: str
    vector_store_documents: int