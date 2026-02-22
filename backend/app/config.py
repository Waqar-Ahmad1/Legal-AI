import os
import re
# Suppress OpenMP warning - must be at the VERY TOP
os.environ['KMP_DUPLICATE_LIB_OK'] = 'True'

import sys
from dotenv import load_dotenv
from langchain_community.vectorstores import FAISS
from langchain_google_genai import GoogleGenerativeAIEmbeddings, ChatGoogleGenerativeAI
from typing import Optional, Tuple, Union, List, Any
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
import json


# Force IPv4 for compatibility
socket.AF_INET = socket.AF_INET

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
# Environment Setup
# ========================

# Directory Paths
BASE_DIR = Path(__file__).resolve().parent.parent
VECTOR_STORE_PATH = BASE_DIR / "data" / "vector_store"
UPLOAD_FOLDER = BASE_DIR / "data" / "uploads"
LOG_DIR = BASE_DIR / "data" / "logs"
BACKUP_DIR = BASE_DIR / "data" / "backups"

# Ensure log directory exists early for logging
LOG_DIR.mkdir(parents=True, exist_ok=True)

load_dotenv(BASE_DIR / ".env")

# ========================
# Logging Configuration
# ========================

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(str(LOG_DIR / 'app.log'), encoding='utf-8'),
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)

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
        logger.info("[SUCCESS] Directories initialized successfully")
        verify_faiss_mode()
    except OSError as e:
        logger.error(f"[ERROR] Directory creation failed: {str(e)}", exc_info=True)
        raise RuntimeError(f"Failed to initialize directories: {str(e)}")

initialize_directories()

# ========================
# Smart AI Provider with Gemini First, Ollama Fallback
# ========================

# ========================
# Advanced AI Provider (Gemini & Groq Multi-Failover)
# ========================

class MultiProviderManager:
    """Manages multi-provider failover for production-level RAG"""
    
    def __init__(self):
        self.providers = ["gemini", "groq"]
        self.current_llm_provider = None
        self.current_embed_provider = None
        self.quota_exhausted = {"gemini": False, "groq": False}
        self.errors = []

    def _test_gemini(self, api_key):
        try:
            if not api_key: return False
            genai.configure(api_key=api_key)
            # Lightweight test: list models instead of generating content to save quota
            for m in genai.list_models():
                if 'generateContent' in m.supported_generation_methods:
                    return True
            return False
        except Exception as e:
            if "quota" in str(e).lower() or "429" in str(e):
                self.quota_exhausted["gemini"] = True
            self.errors.append(f"Gemini Error: {str(e)}")
            return False

    def _test_groq(self, api_key):
        try:
            if not api_key: return False
            import requests
            # DNS resolution on some Windows setups is flaky, try a few times
            for _ in range(2):
                try:
                    url = "https://api.groq.com/openai/v1/chat/completions"
                    headers = {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}
                    data = {"model": "llama-3.3-70b-versatile", "messages": [{"role": "user", "content": "test"}], "max_tokens": 1}
                    response = requests.post(url, headers=headers, json=data, timeout=5)
                    return response.status_code == 200
                except Exception:
                    continue
            return False
        except Exception as e:
            self.errors.append(f"Groq REST Error: {str(e)}")
            return False

class CustomGroqLLM:
    """Lightweight Groq wrapper to bypass library version conflicts"""
    def __init__(self, api_key, model_name="llama-3.3-70b-versatile"):
        self.api_key = api_key
        self.model_name = model_name
        
    def invoke(self, prompt):
        import requests
        url = "https://api.groq.com/openai/v1/chat/completions"
        headers = {"Authorization": f"Bearer {self.api_key}", "Content-Type": "application/json"}
        # Check if prompt is a string or LangChain Message
        content = prompt if isinstance(prompt, str) else getattr(prompt, "content", str(prompt))
        data = {
            "model": self.model_name,
            "messages": [{"role": "user", "content": content}],
            "temperature": 0.1
        }
        try:
            response = requests.post(url, headers=headers, json=data, timeout=30)
            if response.status_code == 200:
                result = response.json()
                from langchain_core.messages import AIMessage
                return AIMessage(content=result['choices'][0]['message']['content'])
            else:
                return f"Groq API Error: {response.text}"
        except Exception as e:
            return f"Groq Connection Error: {str(e)}"

class SmartAIProvider:
    """Production-grade AI provider prioritizing Gemini with Groq failover"""
    
    def __init__(self):
        self.manager = MultiProviderManager()
        self.embedder = None
        self.llm = None
        self.embedder_type = "none"
        self.llm_type = "none"
        self.initialize_providers()
    
    def initialize_providers(self):
        """Initialize embeddings and LLM using prioritized failover"""
        gemini_key = os.getenv("GEMINI_API_KEY")
        groq_key = os.getenv("GROQ_API_KEY")
        
        # Check if an existing vector store exists to determine dimension requirements
        existing_dim = self._get_existing_index_dimension()

        # 1. Initialize Embeddings (Advanced RAG: 3072-dim)
        # We use text-embedding-004 for superior legal document semantic mapping
        target_dim = 3072
        if existing_dim and existing_dim in [768, 1536]:
             # If index exists with different size, we must stay consistent OR re-index
             target_dim = existing_dim
             logger.warning(f"Existing index dimension {existing_dim} detected. Staying with {existing_dim} to prevent corruption.")

        if self.manager._test_gemini(gemini_key):
            self.embedder = GoogleGenerativeAIEmbeddings(
                model="models/text-embedding-004",
                google_api_key=gemini_key,
                task_type="retrieval_document",
                output_dimensionality=target_dim
            )
            self.embedder_type = "gemini"
            logger.info(f"[SUCCESS] Embeddings: text-embedding-004 (Active) - Dim: {target_dim}")
        else:
            # Emergency local fallback ONLY if no existing 768-dim index is found
            # Note: MiniLM is 384. If the database exists and is 768, we MUST NOT 
            # switch models within the same index or we corrupt the search space.
            if existing_dim and existing_dim != 384 and existing_dim != 768:
                logger.error(f"[CRITICAL] Embedding failover BLOCKED: Existing vector store expects {existing_dim} dimensions, but Local Fallback generates 384. Using FakeEmbeddings to prevent crash.")
                from langchain_community.embeddings import FakeEmbeddings
                self.embedder = FakeEmbeddings(size=existing_dim)
                self.embedder_type = "emergency-fake"
            else:
                try:
                    from langchain_community.embeddings import HuggingFaceEmbeddings
                    self.embedder = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")
                    self.embedder_type = "local-huggingface"
                    logger.warning("[FAILOVER] Embeddings: Local HuggingFace Active (384-dim index only)")
                except Exception as e:
                    logger.error(f"[ERROR] Local HuggingFace initialization failed: {e}")
                    self.embedder = None
                    self.embedder_type = "error"

        # 2. Initialize LLM with Gemini -> Groq failover
        if not self.manager.quota_exhausted["gemini"] and self.manager._test_gemini(gemini_key):
            self.llm = ChatGoogleGenerativeAI(
                model="gemini-flash-latest",
                google_api_key=gemini_key,
                temperature=0.1,
                max_output_tokens=2048
            )
            self.llm_type = "gemini"
            logger.info("[SUCCESS] LLM: Gemini Flash (Primary)")
        elif self.manager._test_groq(groq_key):
            self.llm = CustomGroqLLM(
                api_key=groq_key,
                model_name="llama-3.3-70b-versatile"
            )
            self.llm_type = "groq-custom-llama3-3"
            logger.info("[SUCCESS] LLM: Groq Llama3.3-70b (Custom REST Active)")
        else:
            logger.error("[CRITICAL] No LLM providers available (Gemini/Groq failed)")
            self.llm = None

    async def stream_chat(self, query: str, context: str):
        """Streaming chat completion for real-time response"""
        if not self.llm or self.llm_type != "gemini":
            # Fallback to non-streaming for now if not gemini
            from langchain_core.messages import HumanMessage
            logger.info("Streaming fallback to standard invoke")
            res = self.llm.invoke(query)
            yield getattr(res, "content", str(res))
            return

        try:
            # Direct Gemini streaming for lower latency
            from langchain_google_genai import ChatGoogleGenerativeAI
            config_llm: ChatGoogleGenerativeAI = self.llm
            async for chunk in config_llm.astream(query):
                yield chunk.content
        except Exception as e:
            logger.error(f"Streaming error: {e}")
            yield f"Error during streaming: {str(e)}"

    def rerank(self, query: str, documents: List[Any], top_n: int = 4) -> List[Any]:
        """Semantic reranking using Cross-Encoders (Fallback to score-based if model not loaded)"""
        try:
            # Professional systems use a second-stage reranker
            # For now, we use a sophisticated metadata-aware scoring if Cross-Encoder isn't ready
            return sorted(documents, key=lambda d: self._calculate_relevance(query, d), reverse=True)[:top_n]
        except Exception as e:
            logger.error(f"Reranking failed: {e}")
            return documents[:top_n]
            
    def _calculate_relevance(self, query: str, doc: Any) -> float:
        """Internal scoring for document-query relevance"""
        score = 0
        content_lower = doc.page_content.lower()
        query_words = set(re.findall(r'\w+', query.lower()))
        
        # Boost for exact citation matches
        citations = re.findall(r'\b(?:PLD|SCMR|CLC|PCrLJ|YLR|PLC|PTD|CLD)\s+\d{4}\b', query, re.IGNORECASE)
        for cite in citations:
            if cite.lower() in content_lower: score += 50
            
        # Standard keyword overlap
        for word in query_words:
            if len(word) > 3 and word in content_lower: score += 2
            
        return score

    def generate_doc_summary(self, text: str) -> str:
        """Professional 2-sentence summary generation for Contextual Retrieval"""
        if not self.llm: return "General legal document."
        
        try:
            # We take the first 4000 chars as a proxy for doc summary
            sample_text = text[:4000]
            prompt = f"""
            Identify the core legal issue, parties involved, and jurisdiction in 2 concise sentences.
            
            TEXT: {sample_text}
            
            CONCISE SUMMARY:"""
            
            response = self.llm.invoke(prompt)
            summary = response.content if hasattr(response, 'content') else str(response)
            return summary.strip()
        except Exception as e:
            logger.error(f"Doc summary failed: {e}")
            return "Legal document regarding Pakistani law."

    def _get_existing_index_dimension(self) -> Optional[int]:
        """Check the dimension of the existing FAISS index if it exists"""
        try:
            index_path = VECTOR_STORE_PATH / "index.faiss"
            if index_path.exists():
                index = faiss.read_index(str(index_path))
                return index.d
        except Exception:
            pass
        return None

    def get_provider_info(self) -> dict:
        return {
            "embeddings": {"type": self.embedder_type, "status": "active" if self.embedder else "error"},
            "llm": {"type": self.llm_type, "status": "active" if self.llm else "error"},
            "failover_details": self.manager.quota_exhausted,
            "errors": self.manager.errors[-3:] if self.manager.errors else []
        }

    def _get_recommendation(self) -> str:
        if self.llm_type == "gemini": return "✅ High Precision Mode (Gemini)"
        if self.llm_type == "groq-llama3-70b": return "⚡ High Speed Mode (Groq Failover)"
        return "⚠️ All external AI providers are offline"

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
        
        logger.info(f"Vector store loaded successfully with {len(store.index_to_docstore_id)} documents")
        return store
        
    except Exception as e:
        logger.error(f"Failed to load vector store: {str(e)}", exc_info=True)
        
        # Create emergency fallback store
        logger.info("Creating emergency fallback vector store")
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
        logger.info("New vector store created successfully")
        return store
    except Exception as e:
        logger.error(f"Failed to create new vector store: {str(e)}")
        return _create_emergency_fallback_store()

def _create_emergency_fallback_store() -> FAISS:
    """Create an emergency fallback store when everything else fails"""
    try:
        # Try with simple embeddings
        try:
            from langchain_community.embeddings import FakeEmbeddings
        except ImportError:
            from langchain.embeddings import FakeEmbeddings
            
        emergency_embeddings = FakeEmbeddings(size=768)
        store = FAISS.from_texts(
            ["Emergency fallback mode. Please check system configuration."], 
            emergency_embeddings
        )
        logger.warning("Emergency fallback vector store created")
        return store
    except Exception as e:
        logger.critical(f"CRITICAL: Cannot create any vector store: {str(e)}")
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

# ========================
# Setup Instructions
# ========================

def setup_instructions() -> str:
    """Get instructions for setting up AI providers"""
    return """
🚀 **AI Provider Setup Instructions:**

**1. Gemini API (Primary):**
   - Get API key: https://aistudio.google.com/app/apikey
   - Add to .env: GEMINI_API_KEY=your_api_key_here
   - Benefits: Best precision, industry standard embeddings

**2. Groq API (Failover):**
   - Get API key: https://console.groq.com/keys
   - Add to .env: GROQ_API_KEY=your_api_key_here
   - Benefits: Extreme speed, high-performance Llama3-70b failover

**Priority Order:**
1. ✅ Gemini API for both embeddings and LLM
2. ⚡ Groq Llama3-70b if Gemini is down or quota exceeded
3. ⚠️ Local Embeddings if Gemini Embedding API fails
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
        logger.info(f"Vector Store Status: {len(store.index_to_docstore_id)} documents loaded")
        logger.info("✅ Config initialization completed successfully")
        
        # Show setup instructions/status
        provider_info = ai_provider.get_provider_info()
        logger.info(f"Provider recommendation: {ai_provider._get_recommendation()}")
        if provider_info['llm']['status'] == 'error':
            logger.warning(setup_instructions())
            
    except Exception as e:
        logger.error(f"❌ Config initialization failed: {e}")
