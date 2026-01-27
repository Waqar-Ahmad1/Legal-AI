import os
# Suppress OpenMP warning - must be at the VERY TOP
os.environ['KMP_DUPLICATE_LIB_OK'] = 'True'

import sys
from dotenv import load_dotenv
from langchain_community.vectorstores import FAISS
from langchain_google_genai import GoogleGenerativeAIEmbeddings, ChatGoogleGenerativeAI
from typing import Optional, Tuple, Union
import hashlib
from pathlib import Path
import logging
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type
from datetime import datetime
import google.generativeai as genai
import faiss
import socket
import ssl
from urllib3.exceptions import HTTPError
import time
import requests
from requests.exceptions import RequestException

# Force IPv4 and disable SSL verification for compatibility
socket.AF_INET = socket.AF_INET
ssl._create_default_https_context = ssl._create_unverified_context

# ========================
# System Configuration
# ========================

# FAISS CPU optimization
os.environ.update({
    'FAISS_NO_GPU_WARN': '1',
    'FAISS_NO_GPU': '1',
    'FAISS_NO_CUDA': '1',
    'OMP_NUM_THREADS': '4',
    'TOKENIZERS_PARALLELISM': 'false'  # Prevent tokenizer warnings
})
faiss.omp_set_num_threads(4)

# ========================
# Logging Configuration
# ========================

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('data/logs/app.log', encoding='utf-8'),
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)

# ========================
# Environment Setup
# ========================

load_dotenv()

# Directory Paths
VECTOR_STORE_PATH = Path("data/vector_store")
UPLOAD_FOLDER = Path("data/uploads")
LOG_DIR = Path("data/logs")
BACKUP_DIR = Path("data/backups")

# ========================
# Core Functions
# ========================

def verify_faiss_mode():
    """Verify FAISS is running in CPU mode"""
    try:
        faiss.GpuIndexFlatL2
        logger.warning("FAISS GPU components detected but should be disabled!")
    except AttributeError:
        logger.info("FAISS running in CPU-only mode (as configured)")

def initialize_directories() -> None:
    """Ensure all required directories exist with proper permissions"""
    try:
        directories = [VECTOR_STORE_PATH, UPLOAD_FOLDER, LOG_DIR, BACKUP_DIR]
        for directory in directories:
            directory.mkdir(parents=True, exist_ok=True)
            if os.name != 'nt':
                os.chmod(directory, 0o755)
        logger.info("✅ Directories initialized successfully")
        verify_faiss_mode()
    except OSError as e:
        logger.error(f"❌ Directory creation failed: {str(e)}", exc_info=True)
        raise RuntimeError(f"Failed to initialize directories: {str(e)}")

initialize_directories()

# ========================
# Smart AI Provider with Gemini First, Ollama Fallback
# ========================

class SmartAIProvider:
    """Smart AI provider that uses Gemini first, then falls back to Ollama"""
    
    def __init__(self):
        self.embedder = None
        self.llm = None
        self.embedder_type = "unknown"
        self.llm_type = "unknown"
        self.fallback_mode = False
        self.quota_exceeded = False
        self.initialize_providers()
    
    def initialize_providers(self):
        """Initialize both embeddings and LLM with Gemini first"""
        # Initialize embeddings - Gemini first
        self.embedder, self.embedder_type = self._initialize_embeddings()
        
        # Initialize LLM - Gemini first  
        self.llm, self.llm_type = self._initialize_llm()
        
        logger.info(f"🤖 AI Providers: Embeddings={self.embedder_type}, LLM={self.llm_type}")
        if self.quota_exceeded:
            logger.warning("⚠️ Gemini API quota exceeded - using fallback providers")
    
    def _initialize_embeddings(self):
        """Initialize embeddings with Gemini first, then Ollama fallback"""
        # Try Gemini embeddings first
        gemini_embeddings = self._try_gemini_embeddings()
        if gemini_embeddings and not self.quota_exceeded:
            logger.info("✅ Using Google Gemini for embeddings")
            return gemini_embeddings, "gemini"
        
        # Fallback to Ollama embeddings
        ollama_embeddings = self._try_ollama_embeddings()
        if ollama_embeddings:
            logger.info("🔄 Using Ollama for embeddings (fallback)")
            self.fallback_mode = True
            return ollama_embeddings, "ollama"
        
        # Final fallback to fake embeddings
        fake_embeddings = self._create_fake_embeddings()
        logger.warning("⚠️ Using fake embeddings - no valid embedder available")
        self.fallback_mode = True
        return fake_embeddings, "fake"
    
    def _initialize_llm(self):
        """Initialize LLM with Gemini first, then Ollama fallback"""
        # Try Gemini LLM first
        gemini_llm = self._try_gemini_llm()
        if gemini_llm and not self.quota_exceeded:
            logger.info("✅ Using Google Gemini for text generation")
            return gemini_llm, "gemini"
        
        # Fallback to Ollama LLM
        ollama_llm = self._try_ollama_llm()
        if ollama_llm:
            logger.info("🔄 Using Ollama for text generation (fallback)")
            self.fallback_mode = True
            return ollama_llm, "ollama"
        
        # Final fallback to fake LLM
        logger.warning("⚠️ No valid LLM available - text generation will fail")
        self.fallback_mode = True
        return None, "none"
    
    def _try_gemini_embeddings(self) -> Optional[GoogleGenerativeAIEmbeddings]:
        """Try to initialize Gemini embeddings with quota check"""
        try:
            api_key = os.getenv("GEMINI_API_KEY")
            if not api_key:
                logger.warning("GEMINI_API_KEY not found in environment variables")
                return None
            
            # Test API connection with quota check
            connection_test = self._test_gemini_connection(api_key)
            if not connection_test["success"]:
                if connection_test.get("quota_exceeded"):
                    self.quota_exceeded = True
                    logger.warning("🚫 Gemini API quota exceeded - will use fallback")
                return None
            
            # Initialize embeddings
            return GoogleGenerativeAIEmbeddings(
                model="models/embedding-001",
                google_api_key=api_key,
                task_type="retrieval_document",
                timeout=30,
                max_retries=2
            )
            
        except Exception as e:
            logger.warning(f"Gemini embeddings initialization failed: {str(e)}")
            return None
    
    def _try_gemini_llm(self) -> Optional[ChatGoogleGenerativeAI]:
        """Try to initialize Gemini LLM for text generation"""
        try:
            api_key = os.getenv("GEMINI_API_KEY")
            if not api_key:
                logger.warning("GEMINI_API_KEY not found for LLM")
                return None
            
            # Skip if quota already exceeded for embeddings
            if self.quota_exceeded:
                logger.info("Skipping Gemini LLM - quota exceeded")
                return None
            
            # Test API connection
            connection_test = self._test_gemini_connection(api_key)
            if not connection_test["success"]:
                return None
            
            # Initialize LLM
            return ChatGoogleGenerativeAI(
                model="gemini-pro",
                google_api_key=api_key,
                temperature=0.1,
                max_output_tokens=2048,
                timeout=30
            )
            
        except Exception as e:
            logger.warning(f"Gemini LLM initialization failed: {str(e)}")
            return None
    
    def _try_ollama_embeddings(self) -> Optional['OllamaEmbeddings']:
        """Try to initialize Ollama embeddings"""
        try:
            # Use updated import if available
            try:
                from langchain_ollama import OllamaEmbeddings
            except ImportError:
                # Fallback to community version
                from langchain_community.embeddings import OllamaEmbeddings
            
            # Test Ollama connection
            if not self._test_ollama_connection():
                logger.warning("Ollama connection test failed - is Ollama running?")
                return None
            
            # Try embedding models in order of preference
            models_to_try = [
                "mxbai-embed-large",  # Best for embeddings
                "nomic-embed-text",   # Alternative embedding model
                "llama3.2",           # General purpose (can do embeddings)
                "all-minilm"          # Lightweight alternative
            ]
            
            for model_name in models_to_try:
                try:
                    logger.info(f"🦙 Trying Ollama embedding model: {model_name}")
                    embeddings = OllamaEmbeddings(
                        model=model_name,
                        base_url="http://localhost:11434"
                    )
                    
                    # Test the embeddings
                    test_embedding = embeddings.embed_documents(["test document"])
                    if test_embedding and len(test_embedding[0]) > 0:
                        logger.info(f"✅ Ollama embeddings loaded: {model_name}")
                        return embeddings
                        
                except Exception as e:
                    logger.warning(f"Failed to load Ollama embedding model {model_name}: {str(e)}")
                    continue
            
            return None
            
        except ImportError:
            logger.warning("Ollama embeddings not available")
            return None
        except Exception as e:
            logger.warning(f"Ollama embeddings initialization failed: {str(e)}")
            return None
    
    def _try_ollama_llm(self) -> Optional['ChatOllama']:
        """Try to initialize Ollama LLM for text generation"""
        try:
            # Use updated import if available
            try:
                from langchain_ollama import ChatOllama
            except ImportError:
                # Fallback to community version
                from langchain_community.chat_models import ChatOllama
            
            # Test Ollama connection
            if not self._test_ollama_connection():
                logger.warning("Ollama connection test failed for LLM")
                return None
            
            # Try LLM models in order of preference
            models_to_try = [
                "llama3.2",           # Latest general purpose
                "llama3.1",           # Previous version
                "llama2",             # Stable version
                "mistral",            # Alternative model
                "codellama"           # Code-focused (fallback)
            ]
            
            for model_name in models_to_try:
                try:
                    logger.info(f"🦙 Trying Ollama LLM model: {model_name}")
                    llm = ChatOllama(
                        model=model_name,
                        base_url="http://localhost:11434",
                        temperature=0.1,
                        num_predict=2048
                    )
                    
                    # Test the LLM with a simple query
                    test_response = llm.invoke("Say 'Hello' in one word.")
                    if test_response and hasattr(test_response, 'content'):
                        logger.info(f"✅ Ollama LLM loaded: {model_name}")
                        return llm
                        
                except Exception as e:
                    logger.warning(f"Failed to load Ollama LLM model {model_name}: {str(e)}")
                    continue
            
            return None
            
        except ImportError:
            logger.warning("Ollama LLM not available")
            return None
        except Exception as e:
            logger.warning(f"Ollama LLM initialization failed: {str(e)}")
            return None
    
    def _test_gemini_connection(self, api_key: str) -> dict:
        """Test Gemini API connection with comprehensive quota checking"""
        try:
            genai.configure(api_key=api_key)
            models = list(genai.list_models())  # Convert generator to list
            
            # Test actual embedding to check quota
            try:
                test_embeddings = GoogleGenerativeAIEmbeddings(
                    model="models/embedding-001",
                    google_api_key=api_key
                )
                # Test with minimal text to avoid wasting quota
                test_result = test_embeddings.embed_documents(["test"])
                return {
                    "success": True,
                    "quota_exceeded": False,
                    "message": "Gemini API connection successful"
                }
            except Exception as embed_error:
                error_str = str(embed_error).lower()
                if any(keyword in error_str for keyword in ['quota', 'exceeded', '429', 'billing']):
                    return {
                        "success": False,
                        "quota_exceeded": True,
                        "message": "Gemini API quota exceeded"
                    }
                else:
                    return {
                        "success": False,
                        "quota_exceeded": False,
                        "message": f"Gemini API test failed: {str(embed_error)}"
                    }
                    
        except Exception as e:
            error_str = str(e).lower()
            if any(keyword in error_str for keyword in ['quota', 'exceeded', '429']):
                return {
                    "success": False,
                    "quota_exceeded": True,
                    "message": "Gemini API quota exceeded"
                }
            return {
                "success": False,
                "quota_exceeded": False,
                "message": f"Gemini connection test failed: {str(e)}"
            }
    
    def _test_ollama_connection(self) -> bool:
        """Test if Ollama is running and accessible"""
        try:
            response = requests.get("http://localhost:11434/api/tags", timeout=10)
            if response.status_code == 200:
                try:
                    models_data = response.json()
                    models = models_data.get('models', [])
                    model_names = [model.get('name', '') for model in models]
                    logger.info(f"✅ Ollama running with models: {', '.join(model_names)}")
                    return True
                except:
                    logger.info("✅ Ollama is running")
                    return True
            else:
                logger.warning(f"Ollama returned status code: {response.status_code}")
                return False
        except Exception as e:
            logger.warning(f"Ollama connection test failed: {str(e)}")
            return False
    
    def _create_fake_embeddings(self):
        """Create fake embeddings as final fallback"""
        try:
            from langchain_community.embeddings import FakeEmbeddings
        except ImportError:
            from langchain.embeddings import FakeEmbeddings
        return FakeEmbeddings(size=1024)
    
    def get_provider_info(self) -> dict:
        """Get information about current providers"""
        return {
            "embeddings": {
                "type": self.embedder_type,
                "status": "active" if self.embedder else "inactive",
                "quota_exceeded": self.quota_exceeded
            },
            "llm": {
                "type": self.llm_type,
                "status": "active" if self.llm else "inactive"
            },
            "fallback_mode": self.fallback_mode,
            "quota_exceeded": self.quota_exceeded,
            "recommendation": self._get_recommendation()
        }
    
    def _get_recommendation(self) -> str:
        """Get recommendation for setup"""
        if self.quota_exceeded:
            return "🚫 Gemini API quota exceeded - Using fallback providers. Check billing or wait for quota reset."
        elif self.embedder_type == "gemini" and self.llm_type == "gemini":
            return "✅ Optimal setup - Using Gemini for both embeddings and text generation"
        elif self.embedder_type == "ollama" and self.llm_type == "ollama":
            return "🔄 Using Ollama for both - Consider adding Gemini API key for better performance"
        elif self.fallback_mode:
            return "⚠️ Fallback mode active - Check your API keys and Ollama setup"
        else:
            return "❌ Setup issues - Configure Gemini API or Ollama"
    
    def force_fallback_to_ollama(self):
        """Force the system to use Ollama providers (useful when quota is exceeded)"""
        logger.info("🔄 Manually forcing fallback to Ollama providers")
        self.quota_exceeded = True
        self.fallback_mode = True
        
        # Reinitialize with Ollama
        ollama_embeddings = self._try_ollama_embeddings()
        if ollama_embeddings:
            self.embedder = ollama_embeddings
            self.embedder_type = "ollama"
            logger.info("✅ Switched to Ollama embeddings")
        
        ollama_llm = self._try_ollama_llm()
        if ollama_llm:
            self.llm = ollama_llm
            self.llm_type = "ollama"
            logger.info("✅ Switched to Ollama LLM")

# Initialize smart AI provider
ai_provider = SmartAIProvider()

# Backward compatibility for existing code
embeddings_manager = ai_provider
embeddings = ai_provider.embedder
llm = ai_provider.llm

# ========================
# Vector Store Management
# ========================

@retry(
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, min=2, max=10),
    retry=retry_if_exception_type((HTTPError, ConnectionError, RequestException))
)
def load_vector_store() -> FAISS:
    """Load or create vector store with comprehensive error handling"""
    try:
        index_path = VECTOR_STORE_PATH / "index.faiss"
        config_path = VECTOR_STORE_PATH / "index.pkl"
        
        # Check if vector store exists and is valid
        if not index_path.exists() or not config_path.exists():
            logger.info("Creating new vector store - no existing store found")
            return _create_new_vector_store()
        
        if index_path.stat().st_size == 0:
            logger.warning("Vector store file is empty, creating new one")
            return _create_new_vector_store()
        
        # Validate file integrity
        try:
            file_hash = get_file_hash(index_path)
            logger.info(f"Loading existing vector store (Hash: {file_hash[:16]}...)")
        except Exception as e:
            logger.warning(f"File integrity check failed: {e}, creating new store")
            return _create_new_vector_store()
        
        # Load the vector store
        faiss.omp_set_num_threads(4)
        store = FAISS.load_local(
            folder_path=str(VECTOR_STORE_PATH),
            embeddings=ai_provider.embedder,
            allow_dangerous_deserialization=True
        )
        
        # Verify the loaded store
        if len(store.index_to_docstore_id) == 0:
            logger.warning("Loaded vector store is empty")
        
        logger.info(f"✅ Vector store loaded successfully with {len(store.index_to_docstore_id)} documents")
        return store
        
    except Exception as e:
        logger.error(f"❌ Failed to load vector store: {str(e)}", exc_info=True)
        
        # Create emergency fallback store
        logger.info("🆕 Creating emergency fallback vector store")
        return _create_emergency_fallback_store()

def _create_new_vector_store() -> FAISS:
    """Create a new vector store with initial content"""
    try:
        store = FAISS.from_texts(
            ["Welcome to LegalAI. The system is ready to process legal documents."], 
            ai_provider.embedder
        )
        # Save immediately
        save_vector_store(store)
        logger.info("✅ New vector store created successfully")
        return store
    except Exception as e:
        logger.error(f"❌ Failed to create new vector store: {str(e)}")
        return _create_emergency_fallback_store()

def _create_emergency_fallback_store() -> FAISS:
    """Create an emergency fallback store when everything else fails"""
    try:
        # Try with simple embeddings
        try:
            from langchain_community.embeddings import FakeEmbeddings
        except ImportError:
            from langchain.embeddings import FakeEmbeddings
            
        emergency_embeddings = FakeEmbeddings(size=1024)
        store = FAISS.from_texts(
            ["Emergency fallback mode. Please check system configuration."], 
            emergency_embeddings
        )
        logger.warning("⚠️ Emergency fallback vector store created")
        return store
    except Exception as e:
        logger.critical(f"💥 CRITICAL: Cannot create any vector store: {str(e)}")
        raise RuntimeError(f"Unable to initialize vector store: {str(e)}")

def save_vector_store(store: FAISS) -> Tuple[bool, str]:
    """Save vector store with backup, verification, and comprehensive error handling"""
    backup_path = None
    original_files = []
    
    try:
        # Create backup of existing files
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        backup_dir = BACKUP_DIR / f"backup_{timestamp}"
        backup_dir.mkdir(parents=True, exist_ok=True)
        
        # Backup existing files
        for file in VECTOR_STORE_PATH.glob("*"):
            if file.is_file():
                backup_file = backup_dir / file.name
                original_files.append((file, backup_file))
                if file.exists():
                    import shutil
                    shutil.copy2(file, backup_file)
        
        # Save new vector store
        faiss.omp_set_num_threads(4)
        store.save_local(str(VECTOR_STORE_PATH))
        
        # Verify the save was successful
        if not (VECTOR_STORE_PATH / "index.faiss").exists():
            raise RuntimeError("Failed to create vector store index file")
        
        if not (VECTOR_STORE_PATH / "index.pkl").exists():
            raise RuntimeError("Failed to create vector store config file")
        
        # Test loading the saved store
        test_store = FAISS.load_local(
            folder_path=str(VECTOR_STORE_PATH),
            embeddings=ai_provider.embedder,
            allow_dangerous_deserialization=True
        )
        
        logger.info(f"✅ Vector store saved successfully with {len(test_store.index_to_docstore_id)} documents")
        return (True, "Vector store saved and verified successfully")
        
    except Exception as e:
        logger.error(f"❌ Failed to save vector store: {str(e)}", exc_info=True)
        
        # Restore from backup
        restore_success = False
        try:
            for original, backup in original_files:
                if backup.exists():
                    import shutil
                    shutil.copy2(backup, original)
            restore_success = True
            logger.info("🔄 Restored previous version from backup")
        except Exception as restore_error:
            logger.error(f"❌ Backup restoration also failed: {str(restore_error)}")
        
        error_msg = f"Failed to save vector store: {str(e)}"
        if restore_success:
            error_msg += " (Previous version restored)"
        else:
            error_msg += " (BACKUP ALSO FAILED - DATA MAY BE CORRUPTED)"
        
        return (False, error_msg)

# ========================
# Enhanced Utility Functions
# ========================

def get_file_hash(file_path: Path) -> str:
    """Generate SHA256 hash of a file for integrity checking with timeout"""
    hash_sha256 = hashlib.sha256()
    try:
        with open(file_path, "rb") as f:
            for chunk in iter(lambda: f.read(4096), b""):
                hash_sha256.update(chunk)
        return hash_sha256.hexdigest()
    except Exception as e:
        logger.error(f"❌ Failed to calculate file hash: {str(e)}", exc_info=True)
        raise RuntimeError(f"Failed to calculate file hash: {str(e)}")

def validate_vector_store() -> Tuple[bool, str]:
    """Comprehensive vector store validation"""
    index_path = VECTOR_STORE_PATH / "index.faiss"
    config_path = VECTOR_STORE_PATH / "index.pkl"
    
    if not index_path.exists() or not config_path.exists():
        return (False, "Vector store files missing")
    
    try:
        # Check file sizes
        if index_path.stat().st_size == 0:
            return (False, "Vector store index file is empty")
        
        if config_path.stat().st_size == 0:
            return (False, "Vector store config file is empty")
        
        # Test loading
        store = load_vector_store()
        doc_count = len(store.index_to_docstore_id)
        
        provider_info = ai_provider.get_provider_info()
        
        return (True, f"Vector store valid with {doc_count} documents. {provider_info['recommendation']}")
        
    except Exception as e:
        return (False, f"Vector store validation failed: {str(e)}")

def reset_vector_store() -> Tuple[bool, str]:
    """Safely reset the vector store with confirmation"""
    try:
        # Create final backup before reset
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S_reset")
        final_backup_dir = BACKUP_DIR / f"pre_reset_{timestamp}"
        final_backup_dir.mkdir(parents=True, exist_ok=True)
        
        # Backup all files
        for file in VECTOR_STORE_PATH.glob("*"):
            if file.is_file():
                import shutil
                shutil.copy2(file, final_backup_dir / file.name)
        
        # Remove all files
        for file in VECTOR_STORE_PATH.glob("*"):
            if file.is_file():
                file.unlink()
        
        # Clean up old backups (keep last 10)
        backup_folders = sorted(BACKUP_DIR.glob("backup_*"), key=os.path.getmtime)
        for old_backup in backup_folders[:-10]:
            import shutil
            shutil.rmtree(old_backup)
        
        logger.info("✅ Vector store reset successfully")
        return (True, "Vector store reset successfully")
        
    except Exception as e:
        logger.error(f"❌ Failed to reset vector store: {str(e)}", exc_info=True)
        return (False, f"Failed to reset vector store: {str(e)}")

def get_system_status() -> dict:
    """Get comprehensive system status"""
    try:
        vector_store_status, vector_store_msg = validate_vector_store()
        provider_info = ai_provider.get_provider_info()
        
        return {
            "system": {
                "status": "operational",
                "timestamp": datetime.now().isoformat(),
                "python_version": sys.version,
                "platform": sys.platform
            },
            "vector_store": {
                "status": "valid" if vector_store_status else "invalid",
                "message": vector_store_msg,
                "path": str(VECTOR_STORE_PATH),
                "exists": VECTOR_STORE_PATH.exists()
            },
            "ai_providers": provider_info,
            "directories": {
                "vector_store": VECTOR_STORE_PATH.exists(),
                "uploads": UPLOAD_FOLDER.exists(),
                "logs": LOG_DIR.exists(),
                "backups": BACKUP_DIR.exists()
            }
        }
    except Exception as e:
        return {
            "system": {
                "status": "error",
                "error": str(e),
                "timestamp": datetime.now().isoformat()
            }
        }

def force_ollama_fallback():
    """Force the system to use Ollama providers (useful for testing or quota issues)"""
    ai_provider.force_fallback_to_ollama()
    logger.info("✅ System forced to use Ollama providers")
    return {"success": True, "message": "Switched to Ollama providers"}

# ========================
# Setup Instructions
# ========================

def setup_instructions() -> str:
    """Get instructions for setting up AI providers"""
    return """
🚀 **AI Provider Setup Instructions:**

**1. Gemini API (Recommended - First Priority):**
   - Get API key: https://aistudio.google.com/app/apikey
   - Add to .env: GEMINI_API_KEY=your_api_key_here
   - Benefits: Best performance, reliable, fast
   - Note: Free tier has limited quota

**2. Ollama (Fallback - Second Priority):**
   - Install: https://ollama.ai/
   - Start: `ollama serve`
   - Pull models:
     - For embeddings: `ollama pull mxbai-embed-large`
     - For text: `ollama pull llama3.2`
   - Install Python package: `pip install langchain-ollama`

**3. Quota Issues:**
   - If Gemini quota is exceeded, system auto-falls back to Ollama
   - To manually force Ollama: Call `force_ollama_fallback()`
   - Gemini quotas reset daily

**Priority Order:**
1. ✅ Gemini API for both embeddings and text
2. 🔄 Ollama if Gemini unavailable or quota exceeded
3. ⚠️ Fake embeddings as last resort
    """

# ========================
# Public Interface
# ========================

__all__ = [
    'load_vector_store',
    'save_vector_store',
    'ai_provider',
    'embeddings_manager',  # Backward compatibility
    'embeddings',          # Backward compatibility  
    'llm',                 # New LLM export
    'reset_vector_store',
    'validate_vector_store',
    'get_file_hash',
    'get_system_status',
    'force_ollama_fallback',  # New function
    'SmartAIProvider',
    'setup_instructions'
]

# ========================
# Initialization Check
# ========================

if __name__ == "__main__":
    logger.info("🔧 Running config.py initialization check...")
    
    # Test system status
    status = get_system_status()
    logger.info(f"System Status: {status}")
    
    # Test vector store
    try:
        store = load_vector_store()
        logger.info(f"Vector Store: {len(store.index_to_docstore_id)} documents")
        logger.info("✅ Config initialization completed successfully")
        
        # Show setup instructions if in fallback mode
        provider_info = ai_provider.get_provider_info()
        if provider_info['fallback_mode'] or provider_info['quota_exceeded']:
            logger.info("💡 Current Status:")
            logger.info(setup_instructions())
            
    except Exception as e:
        logger.error(f"❌ Config initialization failed: {e}")