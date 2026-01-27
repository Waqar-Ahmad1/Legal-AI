# app/database.py
from pymongo import MongoClient
import os
from dotenv import load_dotenv
import logging
from typing import Optional, Union
from pymongo.errors import ConnectionFailure, ServerSelectionTimeoutError, OperationFailure
import time

# Configure logging
logger = logging.getLogger(__name__)

load_dotenv()

class DatabaseManager:
    def __init__(self):
        self.MONGO_URI = os.getenv("MONGO_URI", "mongodb+srv://waqarahmadisbest_db_user:rhXf7vkxHpqrT0eR@waqarahmad.oydlhwg.mongodb.net/")
        self.DB_NAME = os.getenv("DB_NAME", "legal_ai")
        self.client = None
        self.db = None
        self.is_connected = False
        self._connect_with_retry()

    def _connect_with_retry(self, max_retries: int = 3, delay: int = 2):
        """Establish database connection with retry logic"""
        for attempt in range(max_retries):
            try:
                logger.info(f"Attempting MongoDB connection (attempt {attempt + 1}/{max_retries})...")
                
                # Updated connection string
                connection_string = self.MONGO_URI
                if "?" not in connection_string:
                    connection_string += "?retryWrites=true&w=majority&appName=LegalAI"
                
                self.client = MongoClient(
                    connection_string,
                    serverSelectionTimeoutMS=10000,
                    connectTimeoutMS=10000,
                    socketTimeoutMS=30000,
                    maxPoolSize=50,
                    minPoolSize=10,
                    retryWrites=True,
                    retryReads=True,
                )
                
                # Test connection
                self.client.admin.command('ping', socketTimeoutMS=5000)
                self.db = self.client[self.DB_NAME]
                self.is_connected = True
                
                logger.info("✅ MongoDB connection established successfully")
                self._create_indexes()
                return
                
            except Exception as e:
                logger.warning(f"❌ MongoDB connection attempt {attempt + 1} failed: {str(e)}")
                if attempt < max_retries - 1:
                    logger.info(f"Retrying in {delay} seconds...")
                    time.sleep(delay)
                else:
                    logger.error("❌ All MongoDB connection attempts failed")
                    self.is_connected = False
                    # Don't use fallback - fail properly

    def _create_indexes(self):
        """Create necessary database indexes"""
        try:
            if not self.is_connected:
                logger.warning("Cannot create indexes - no database connection")
                return
                
            self.db.users.create_index("email", unique=True)
            self.db.admins.create_index("email", unique=True)
            self.db.training_documents.create_index("uploadDate")
            self.db.training_documents.create_index("status")
            self.db.documents.create_index("document_id")
            self.db.users.create_index("created_at")
            self.db.admins.create_index("created_at")
            
            logger.info("✅ Database indexes created successfully")
        except Exception as e:
            logger.error(f"❌ Error creating indexes: {e}")

    def get_collection(self, collection_name: str):
        """Get database collection - ONLY returns real MongoDB collection"""
        if not self.is_connected:
            raise RuntimeError("Database not connected. Please check your MongoDB connection.")
        
        if self.db is None:
            raise RuntimeError("Database not initialized")
            
        return self.db[collection_name]

    def check_connection(self) -> bool:
        """Check if database connection is alive"""
        try:
            if self.client and self.is_connected:
                self.client.admin.command('ping', socketTimeoutMS=3000)
                return True
        except:
            self.is_connected = False
        return False

    def close_connection(self):
        """Close database connection"""
        if self.client:
            self.client.close()
            self.is_connected = False
            logger.info("Database connection closed")

# Global database instance
db_manager = DatabaseManager()

# Collection references - ONLY return real collections
def get_users_collection():
    """Get users collection - fails if database not connected"""
    if not db_manager.is_connected:
        raise RuntimeError("Database not connected. Cannot access users collection.")
    return db_manager.get_collection("users")

def get_admins_collection():
    """Get admins collection - fails if database not connected"""
    if not db_manager.is_connected:
        raise RuntimeError("Database not connected. Cannot access admins collection.")
    return db_manager.get_collection("admins")

def get_training_collection():
    """Get training documents collection - fails if database not connected"""
    if not db_manager.is_connected:
        raise RuntimeError("Database not connected. Cannot access training documents collection.")
    return db_manager.get_collection("training_documents")

def get_documents_collection():
    """Get documents collection - fails if database not connected"""
    if not db_manager.is_connected:
        raise RuntimeError("Database not connected. Cannot access documents collection.")
    return db_manager.get_collection("documents")

def is_database_connected() -> bool:
    """Check if database is connected"""
    return db_manager.is_connected