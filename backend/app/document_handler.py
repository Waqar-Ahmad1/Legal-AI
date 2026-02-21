import os
import sys
from datetime import datetime
from typing import List, Dict, Any, Optional, Tuple
import hashlib
import logging
from pathlib import Path
import re
import traceback

# Third-party imports
from langchain_community.document_loaders import PyPDFLoader, UnstructuredFileLoader, Docx2txtLoader, TextLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_core.documents import Document
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type
import faiss
from urllib3.exceptions import HTTPError
import requests
from requests.exceptions import RequestException

# Configure CPU settings for FAISS
os.environ.update({
    'OMP_NUM_THREADS': '4',
    'TOKENIZERS_PARALLELISM': 'false'
})
faiss.omp_set_num_threads(4)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('data/logs/document_processing.log', encoding='utf-8'),
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)

# ========================
# Enhanced Text Processing Utilities
# ========================

class TextPreprocessor:
    """Enhanced text preprocessing for legal documents"""
    
    @staticmethod
    def clean_text(text: str) -> str:
        """Clean and normalize text content"""
        if not text or not text.strip():
            return ""
        
        # Remove excessive whitespace
        text = re.sub(r'\s+', ' ', text)
        
        # Fix common encoding issues
        text = text.replace('\uf0b7', '•').replace('\u2013', '-').replace('\u2014', '--')
        text = text.replace('\u2018', "'").replace('\u2019', "'").replace('\u201c', '"').replace('\u201d', '"')
        
        # Remove unwanted characters but keep legal symbols
        text = re.sub(r'[^\w\s\-\.\,\;\:\?\!\(\)\[\]\{\}\§\@\#\$\%\&\*\•\—\–\']', '', text)
        
        return text.strip()
    
    @staticmethod
    def is_meaningful_text(text: str, min_words: int = 5) -> bool:
        """Check if text contains meaningful content"""
        if not text or len(text.strip()) < 20:
            return False
        
        words = text.split()
        if len(words) < min_words:
            return False
        
        # Check if it's mostly special characters or numbers
        alpha_count = sum(1 for char in text if char.isalpha())
        if alpha_count < len(text) * 0.3:  # Less than 30% alphabetic characters
            return False
            
        return True
    
    @staticmethod
    def extract_document_metadata(text: str) -> Dict[str, Any]:
        """Extract comprehensive metadata from document content"""
        metadata = {}
        
        # Try to identify document type
        text_lower = text.lower()
        if re.search(r'(constitution|article|section|chapter)', text_lower):
            metadata['document_category'] = 'legal_code'
            metadata['document_type'] = 'Constitution/Legal Code'
        elif re.search(r'(act|bill|law|statute)', text_lower):
            metadata['document_category'] = 'legislation'
            metadata['document_type'] = 'Legislation/Act'
        elif re.search(r'(contract|agreement|treaty)', text_lower):
            metadata['document_category'] = 'contract'
            metadata['document_type'] = 'Contract/Agreement'
        elif re.search(r'(judgment|ruling|verdict|court)', text_lower):
            metadata['document_category'] = 'judicial'
            metadata['document_type'] = 'Judicial Decision'
        elif re.search(r'(regulation|rule|guideline)', text_lower):
            metadata['document_category'] = 'regulation'
            metadata['document_type'] = 'Regulation/Guideline'
        else:
            metadata['document_category'] = 'general'
            metadata['document_type'] = 'Legal Document'
        
        # Estimate complexity
        words = text.split()
        avg_word_length = sum(len(word) for word in words) / len(words) if words else 0
        metadata['complexity'] = 'high' if avg_word_length > 6 else 'medium' if avg_word_length > 5 else 'low'
        
        # Extract legal references and citations
        metadata.update(TextPreprocessor._extract_legal_references(text))
        
        # Extract key topics
        metadata['topics'] = TextPreprocessor._extract_topics(text)
        
        return metadata
    
    @staticmethod
    def _extract_legal_references(text: str) -> Dict[str, Any]:
        """Extract legal references, citations, and section numbers"""
        references = {
            'has_versions': False,
            'has_sections': False,
            'has_articles': False,
            'has_clauses': False,
            'legal_citations': []
        }
        
        # Version numbers
        if re.search(r'\b\d+\.\d+\.\d+\b', text):
            references['has_versions'] = True
        
        # Section symbols
        section_matches = re.findall(r'§\s*(\d+[A-Z]*)', text)
        if section_matches:
            references['has_sections'] = True
            references['sections'] = list(set(section_matches))
        
        # Articles
        article_matches = re.findall(r'Article\s+([IVXLCDM]+|\d+)', text, re.IGNORECASE)
        if article_matches:
            references['has_articles'] = True
            references['articles'] = list(set(article_matches))
        
        # Clauses
        clause_matches = re.findall(r'clause\s+(\d+)', text, re.IGNORECASE)
        if clause_matches:
            references['has_clauses'] = True
            references['clauses'] = list(set(clause_matches))
        
        # Legal citations (basic pattern)
        citation_patterns = [
            r'\b\d+\s+U\.?S\.?C\.?\s+§?\s*\d+',
            r'\b\d+\s+S\.?Ct\.?\s+\d+',
            r'\b\d+\s+F\.?\d+d\s+\d+',
        ]
        
        for pattern in citation_patterns:
            citations = re.findall(pattern, text)
            if citations:
                references['legal_citations'].extend(citations)
        
        return references
    
    @staticmethod
    def _extract_topics(text: str, max_topics: int = 5) -> List[str]:
        """Extract key legal topics from text"""
        text_lower = text.lower()
        legal_topics = {
            'contract_law': ['contract', 'agreement', 'breach', 'obligation', 'consideration'],
            'constitutional_law': ['constitution', 'amendment', 'rights', 'freedom', 'liberty'],
            'criminal_law': ['crime', 'criminal', 'penalty', 'offense', 'sentencing'],
            'civil_law': ['civil', 'lawsuit', 'plaintiff', 'defendant', 'damages'],
            'property_law': ['property', 'ownership', 'title', 'estate', 'lease'],
            'corporate_law': ['corporation', 'company', 'shareholder', 'director', 'board'],
            'tax_law': ['tax', 'revenue', 'deduction', 'exemption', 'irs'],
            'family_law': ['marriage', 'divorce', 'custody', 'child', 'support'],
            'intellectual_property': ['patent', 'copyright', 'trademark', 'intellectual', 'property'],
            'employment_law': ['employment', 'employee', 'employer', 'wage', 'discrimination']
        }
        
        found_topics = []
        for topic, keywords in legal_topics.items():
            if any(keyword in text_lower for keyword in keywords):
                found_topics.append(topic.replace('_', ' ').title())
        
        return found_topics[:max_topics]

class LegalAwareTextSplitter(RecursiveCharacterTextSplitter):
    """Enhanced text splitter optimized for legal documents"""
    
    def __init__(self, **kwargs):
        # Legal document specific separators
        legal_separators = [
            r"\nCHAPTER\s+[IVXLCDM]+\b",
            r"\nPART\s+[IVXLCDM]+\b", 
            r"\nARTICLE\s+\d+\b",
            r"\nSECTION\s+\d+",
            r"\nSUBSECTION\s+\d+",
            r"\nCLAUSE\s+\d+\b",
            r"\n§\s*\d+",  # Section symbol
            r"\n\d+\.\s",  # Numbered points
            r"\n\([a-z]\)",  # Lettered subpoints
            "\n\n",
            "\n",
            " ",
            "",
        ]
        
        super().__init__(
            separators=legal_separators,
            keep_separator=True,
            is_separator_regex=True,
            chunk_size=kwargs.get('chunk_size', 1000),
            chunk_overlap=kwargs.get('chunk_overlap', 200),
            length_function=len,
            **kwargs
        )
        self.preprocessor = TextPreprocessor()

    def split_text(self, text: str) -> List[str]:
        """Split text with preprocessing"""
        cleaned_text = self.preprocessor.clean_text(text)
        if not self.preprocessor.is_meaningful_text(cleaned_text):
            return []
        return super().split_text(cleaned_text)

# ========================
# Enhanced Document Processing
# ========================

class DocumentProcessor:
    """Main document processor with comprehensive error handling"""
    
    def __init__(self):
        self.supported_formats = {
            '.pdf': self._load_pdf,
            '.docx': self._load_docx,
            '.doc': self._load_docx,
            '.txt': self._load_text,
            '.md': self._load_text
        }
        self.preprocessor = TextPreprocessor()
    
    def _load_pdf(self, file_path: str) -> List[Document]:
        """Load PDF documents with enhanced error handling"""
        try:
            loader = PyPDFLoader(file_path)
            documents = loader.load()
            logger.info(f"Loaded {len(documents)} pages from PDF")
            return documents
        except Exception as e:
            logger.error(f"PDF loading failed: {e}")
            # Fallback to unstructured loader
            try:
                loader = UnstructuredFileLoader(file_path)
                documents = loader.load()
                logger.info(f"Fallback loader loaded {len(documents)} pages from PDF")
                return documents
            except Exception as fallback_error:
                logger.error(f"PDF fallback loading also failed: {fallback_error}")
                raise RuntimeError(f"Failed to load PDF: {str(e)}")
    
    def _load_docx(self, file_path: str) -> List[Document]:
        """Load DOCX documents"""
        try:
            loader = Docx2txtLoader(file_path)
            documents = loader.load()
            logger.info(f"Loaded DOCX document with {len(documents)} sections")
            return documents
        except Exception as e:
            logger.error(f"DOCX loading failed: {e}")
            # Fallback to unstructured loader
            try:
                loader = UnstructuredFileLoader(file_path)
                documents = loader.load()
                logger.info(f"Fallback loader loaded DOCX document")
                return documents
            except Exception as fallback_error:
                logger.error(f"DOCX fallback loading also failed: {fallback_error}")
                raise RuntimeError(f"Failed to load DOCX: {str(e)}")
    
    def _load_text(self, file_path: str) -> List[Document]:
        """Load text documents"""
        try:
            loader = TextLoader(file_path, encoding='utf-8')
            documents = loader.load()
            logger.info(f"Loaded text document")
            return documents
        except UnicodeDecodeError:
            # Try different encodings
            for encoding in ['latin-1', 'cp1252', 'iso-8859-1']:
                try:
                    loader = TextLoader(file_path, encoding=encoding)
                    documents = loader.load()
                    logger.info(f"Loaded text document with {encoding} encoding")
                    return documents
                except UnicodeDecodeError:
                    continue
            raise RuntimeError("Failed to decode text file with any encoding")
        except Exception as e:
            logger.error(f"Text loading failed: {e}")
            raise RuntimeError(f"Failed to load text file: {str(e)}")
    
    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=2, max=10),
        retry=retry_if_exception_type((HTTPError, ConnectionError, TimeoutError))
    )
    def validate_file(self, file_path: str, max_size_mb: int = 100) -> Dict[str, Any]:
        """Comprehensive file validation with detailed diagnostics"""
        try:
            if not os.path.exists(file_path):
                raise FileNotFoundError(f"File not found: {file_path}")
            
            file_size = os.path.getsize(file_path)
            max_size = max_size_mb * 1024 * 1024
            
            if file_size == 0:
                raise ValueError("File is empty")
                
            if file_size > max_size:
                raise ValueError(f"File size {file_size/1024/1024:.2f}MB exceeds {max_size_mb}MB limit")
            
            # Check file extension
            file_ext = Path(file_path).suffix.lower()
            if file_ext not in self.supported_formats:
                raise ValueError(f"Unsupported file format: {file_ext}. Supported: {list(self.supported_formats.keys())}")
            
            # Calculate checksum
            hash_sha256 = hashlib.sha256()
            with open(file_path, "rb") as f:
                for chunk in iter(lambda: f.read(4096), b""):
                    hash_sha256.update(chunk)
            checksum = hash_sha256.hexdigest()
            
            validation_result = {
                "valid": True,
                "file_size": file_size,
                "file_size_mb": file_size / 1024 / 1024,
                "checksum": checksum,
                "extension": file_ext,
                "filename": Path(file_path).name
            }
            
            logger.info(f"✅ File validated: {file_path} (Size: {validation_result['file_size_mb']:.2f}MB, Checksum: {checksum[:16]}...)")
            return validation_result
            
        except Exception as e:
            logger.error(f"❌ File validation failed for {file_path}: {str(e)}")
            raise
    
    def load_document(self, file_path: str) -> List[Document]:
        """Load document with format-specific loader"""
        file_ext = Path(file_path).suffix.lower()
        
        if file_ext not in self.supported_formats:
            raise ValueError(f"Unsupported file format: {file_ext}")
        
        loader_func = self.supported_formats[file_ext]
        return loader_func(file_path)
    
    def process_document(self, file_path: str, doc_type: str = "General Legal Document", 
                        source_name: str = "Unknown Source") -> Tuple[List[Document], Dict[str, Any]]:
        """Process document with comprehensive preprocessing and splitting"""
        start_time = datetime.utcnow()
        
        try:
            # Validate file first
            validation_info = self.validate_file(file_path)
            
            logger.info(f"🔄 Starting document processing: {file_path}")
            
            # Load document
            raw_documents = self.load_document(file_path)
            logger.info(f"📄 Loaded {len(raw_documents)} raw document sections")
            
            # Extract document-level metadata from first few pages
            document_level_metadata = self._extract_document_level_metadata(raw_documents, doc_type, source_name)
            
            # Choose appropriate splitter
            if any(keyword in doc_type.lower() for keyword in ['constitution', 'code', 'law', 'act']):
                splitter = LegalAwareTextSplitter(
                    chunk_size=1200,
                    chunk_overlap=250,
                    add_start_index=True
                )
                logger.debug("Using LegalAwareTextSplitter for legal document")
            else:
                splitter = RecursiveCharacterTextSplitter(
                    chunk_size=1000,
                    chunk_overlap=200,
                    separators=["\n\n", "\n", " ", ""],
                    keep_separator=True,
                    add_start_index=True
                )
                logger.debug("Using RecursiveCharacterTextSplitter for general document")
            
            # Split documents
            chunks = splitter.split_documents(raw_documents)
            
            # Filter out meaningless chunks
            meaningful_chunks = []
            for chunk in chunks:
                if self.preprocessor.is_meaningful_text(chunk.page_content):
                    meaningful_chunks.append(chunk)
            
            logger.info(f"📊 Split into {len(meaningful_chunks)} meaningful chunks (from {len(chunks)} total)")
            
            # Enhanced metadata for each chunk
            for i, chunk in enumerate(meaningful_chunks):
                self._enhance_chunk_metadata(chunk, i, validation_info, document_level_metadata, file_path)
            
            processing_time = (datetime.utcnow() - start_time).total_seconds()
            logger.info(f"✅ Document processing completed in {processing_time:.2f}s: {len(meaningful_chunks)} chunks")
            
            processing_info = {
                "processing_time_seconds": processing_time,
                "original_sections": len(raw_documents),
                "total_chunks_generated": len(chunks),
                "meaningful_chunks_kept": len(meaningful_chunks),
                "filtered_out_chunks": len(chunks) - len(meaningful_chunks),
                "average_words_per_chunk": sum(len(chunk.page_content.split()) for chunk in meaningful_chunks) / len(meaningful_chunks) if meaningful_chunks else 0,
                "document_metadata": document_level_metadata,
                "status": "success"
            }
            
            return meaningful_chunks, processing_info
            
        except Exception as e:
            processing_time = (datetime.utcnow() - start_time).total_seconds()
            logger.error(f"❌ Document processing failed after {processing_time:.2f}s: {str(e)}", exc_info=True)
            raise RuntimeError(f"Document processing failed: {str(e)}")
    
    def _extract_document_level_metadata(self, raw_documents: List[Document], doc_type: str, source_name: str) -> Dict[str, Any]:
        """Extract comprehensive metadata at the document level"""
        if not raw_documents:
            return {}
        
        # Sample content from first few documents for analysis
        sample_content = " ".join([doc.page_content for doc in raw_documents[:3]])
        
        metadata = {
            "document_type": doc_type,
            "source": source_name,
            "total_pages": len(raw_documents),
            "extraction_time": datetime.utcnow().isoformat(),
        }
        
        # Add content-based metadata
        content_metadata = self.preprocessor.extract_document_metadata(sample_content)
        metadata.update(content_metadata)
        
        return metadata
    
    def _enhance_chunk_metadata(self, chunk: Document, chunk_index: int, validation_info: Dict[str, Any], 
                               document_metadata: Dict[str, Any], file_path: str) -> None:
        """Enhance chunk metadata with comprehensive information"""
        # Base metadata
        chunk_metadata = {
            "document_type": document_metadata.get("document_type", "Legal Document"),
            "title": Path(file_path).stem,
            "source": document_metadata.get("source", "Unknown Source"),
            "upload_time": datetime.utcnow().isoformat(),
            "checksum": validation_info["checksum"],
            "file_size": validation_info["file_size"],
            "file_extension": validation_info["extension"],
            "processing_time": datetime.utcnow().isoformat(),
            "processing_mode": "CPU",
            
            # Chunk identification
            "chunk_id": f"{Path(file_path).stem}-{chunk_index:04d}",
            "chunk_index": chunk_index,
            "page": chunk.metadata.get("page", 1),
            
            # Content metrics
            "word_count": len(chunk.page_content.split()),
            "character_count": len(chunk.page_content),
            "content_preview": chunk.page_content[:150] + "..." if len(chunk.page_content) > 150 else chunk.page_content,
            
            # Document-level metadata
            "document_category": document_metadata.get("document_category", "general"),
            "complexity": document_metadata.get("complexity", "medium"),
            "topics": document_metadata.get("topics", []),
        }
        
        # Add content-specific metadata
        content_specific_metadata = self.preprocessor.extract_document_metadata(chunk.page_content)
        chunk_metadata.update(content_specific_metadata)
        
        # Update chunk metadata
        chunk.metadata.update(chunk_metadata)

# ========================
# Vector Store Integration
# ========================

class VectorStoreManager:
    """Enhanced vector store management with robust error handling"""
    
    def __init__(self):
        self.batch_size = 10  # Smaller batches for Ollama stability
    
    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=5, max=20),
        retry=retry_if_exception_type((HTTPError, RuntimeError, ConnectionError))
    )
    def add_documents_to_store(self, documents: List[Document]) -> Dict[str, Any]:
        """Add documents to vector store with comprehensive error handling"""
        start_time = datetime.utcnow()
        
        try:
            logger.info(f"🔄 Preparing to add {len(documents)} documents to vector store")
            
            # Import here to avoid circular imports
            from app.config import load_vector_store, save_vector_store, embeddings_manager
            
            # Load vector store
            faiss.omp_set_num_threads(4)
            store = load_vector_store()
            
            # Get provider info for logging
            provider_info = embeddings_manager.get_provider_info()
            logger.info(f"Using embedder: {provider_info['embeddings']['type']} (fallback: {provider_info['fallback_mode']})")
            
            # Adjust batch size based on embedder type
            if provider_info['embeddings']['type'] == 'ollama':
                self.batch_size = 5  # Even smaller batches for Ollama
                logger.info(f"🦙 Using smaller batch size {self.batch_size} for Ollama embeddings")
            
            # Process in batches with progress tracking
            total_batches = (len(documents) + self.batch_size - 1) // self.batch_size
            successful_batches = 0
            failed_batches = 0
            failed_batch_details = []
            
            for batch_idx in range(0, len(documents), self.batch_size):
                batch = documents[batch_idx:batch_idx + self.batch_size]
                batch_num = (batch_idx // self.batch_size) + 1
                
                try:
                    logger.info(f"🔄 Processing batch {batch_num}/{total_batches} ({len(batch)} documents)")
                    store.add_documents(batch)
                    successful_batches += 1
                    logger.info(f"✅ Added batch {batch_num}/{total_batches} ({len(batch)} documents)")
                    
                except Exception as batch_error:
                    failed_batches += 1
                    error_details = {
                        'batch_number': batch_num,
                        'error': str(batch_error),
                        'error_type': type(batch_error).__name__,
                        'batch_size': len(batch)
                    }
                    failed_batch_details.append(error_details)
                    
                    logger.error(f"❌ Failed to add batch {batch_num}: {str(batch_error)}")
                    logger.error(f"📋 Batch error details: {error_details}")
                    
                    # Log full traceback for debugging
                    logger.error(f"🔍 Full error traceback for batch {batch_num}:")
                    logger.error(traceback.format_exc())
                    
                    # Continue with next batch instead of failing completely
            
            # Calculate statistics
            total_words = sum(len(doc.page_content.split()) for doc in documents)
            total_chars = sum(len(doc.page_content) for doc in documents)
            
            # Extract document types and sources for reporting
            document_types = list(set(doc.metadata.get('document_type', 'Unknown') for doc in documents))
            sources = list(set(doc.metadata.get('source', 'Unknown') for doc in documents))
            
            # Save vector store only if we have successful batches
            save_success = False
            save_message = "No successful batches to save"
            
            if successful_batches > 0:
                logger.info("💾 Saving vector store...")
                save_success, save_message = save_vector_store(store)
                if not save_success:
                    logger.error(f"❌ Vector store save failed: {save_message}")
            else:
                logger.warning("⚠️ No successful batches - skipping vector store save")
            
            processing_time = (datetime.utcnow() - start_time).total_seconds()
            
            # Determine overall status
            if successful_batches == total_batches:
                status = "success"
            elif successful_batches > 0:
                status = "partial"
            else:
                status = "failed"
            
            result = {
                "status": status,
                "documents_processed": len(documents),
                "successful_batches": successful_batches,
                "failed_batches": failed_batches,
                "total_batches": total_batches,
                "failed_batch_details": failed_batch_details,
                "embedder_type": provider_info['embeddings']['type'],
                "llm_type": provider_info['llm']['type'],
                "fallback_mode": provider_info['fallback_mode'],
                "total_words": total_words,
                "total_characters": total_chars,
                "average_words_per_doc": total_words / len(documents) if documents else 0,
                "document_types": document_types,
                "sources": sources,
                "processing_time_seconds": processing_time,
                "vector_store_save_status": "success" if save_success else "failed",
                "vector_store_save_message": save_message,
                "timestamp": datetime.utcnow().isoformat()
            }
            
            logger.info(f"✅ Vector store update completed: {result}")
            return result
            
        except Exception as e:
            processing_time = (datetime.utcnow() - start_time).total_seconds()
            logger.error(f"❌ Vector store operation failed after {processing_time:.2f}s: {str(e)}", exc_info=True)
            logger.error(f"🔍 Full error traceback: {traceback.format_exc()}")
            
            return {
                "status": "error",
                "message": str(e),
                "error_type": type(e).__name__,
                "documents_processed": 0,
                "processing_time_seconds": processing_time,
                "timestamp": datetime.utcnow().isoformat()
            }

# ========================
# Main Ingestion Pipeline
# ========================

document_processor = DocumentProcessor()
vector_store_manager = VectorStoreManager()

@retry(
    stop=stop_after_attempt(2),
    wait=wait_exponential(multiplier=1, min=10, max=30)
)
def ingest_document(
    file_path: str, 
    doc_type: str = "General Legal Document", 
    source_name: str = "Unknown Source"
) -> Dict[str, Any]:
    """
    Main document ingestion pipeline with comprehensive error handling and monitoring
    """
    pipeline_start = datetime.utcnow()
    pipeline_info = {
        "pipeline_start_time": pipeline_start.isoformat(),
        "filename": Path(file_path).name,
        "document_type": doc_type,
        "source": source_name,
        "status": "started"
    }
    
    try:
        logger.info(f"🚀 Starting ingestion pipeline for: {file_path}")
        
        # Step 1: Process document
        chunks, processing_info = document_processor.process_document(file_path, doc_type, source_name)
        pipeline_info.update(processing_info)
        
        if not chunks:
            pipeline_info.update({
                "status": "failed",
                "error": "No meaningful content extracted from document",
                "pipeline_end_time": datetime.utcnow().isoformat(),
                "total_processing_time": (datetime.utcnow() - pipeline_start).total_seconds()
            })
            logger.warning(f"⚠️ No meaningful content in {file_path}")
            return pipeline_info
        
        # Step 2: Add to vector store
        vector_store_result = vector_store_manager.add_documents_to_store(chunks)
        pipeline_info.update(vector_store_result)
        
        # Calculate total processing time
        total_time = (datetime.utcnow() - pipeline_start).total_seconds()
        pipeline_info.update({
            "pipeline_end_time": datetime.utcnow().isoformat(),
            "total_processing_time": total_time,
            "status": pipeline_info.get("status", "success"),
            "success": pipeline_info.get("status") in ["success", "partial"]
        })
        
        # Final logging
        if pipeline_info["status"] == "success":
            logger.info(f"🎉 Ingestion completed successfully in {total_time:.2f}s: {len(chunks)} chunks added")
            logger.info(f"📊 Document Metadata: {pipeline_info.get('document_metadata', {})}")
        elif pipeline_info["status"] == "partial":
            logger.warning(f"⚠️ Ingestion partially completed in {total_time:.2f}s: {pipeline_info['successful_batches']}/{pipeline_info['total_batches']} batches succeeded")
            logger.warning(f"📋 Failed batches: {pipeline_info.get('failed_batch_details', [])}")
        else:
            logger.error(f"❌ Ingestion failed after {total_time:.2f}s")
            logger.error(f"📋 Error details: {pipeline_info.get('failed_batch_details', [])}")
        
        return pipeline_info
        
    except Exception as e:
        total_time = (datetime.utcnow() - pipeline_start).total_seconds()
        error_info = {
            "status": "failed",
            "error": str(e),
            "error_type": type(e).__name__,
            "pipeline_end_time": datetime.utcnow().isoformat(),
            "total_processing_time": total_time,
            "success": False
        }
        pipeline_info.update(error_info)
        
        logger.error(f"💥 Ingestion pipeline failed after {total_time:.2f}s: {str(e)}", exc_info=True)
        return pipeline_info

# ========================
# Utility Functions
# ========================

def get_supported_formats() -> List[str]:
    """Get list of supported file formats"""
    return list(document_processor.supported_formats.keys())

def get_processing_stats() -> Dict[str, Any]:
    """Get current processing statistics and system info"""
    from app.config import get_system_status
    
    system_status = get_system_status()
    
    return {
        "system_status": system_status,
        "supported_formats": get_supported_formats(),
        "max_file_size_mb": 100,
        "timestamp": datetime.utcnow().isoformat()
    }

def get_document_metadata_summary() -> Dict[str, Any]:
    """Get summary of all documents in vector store with their metadata"""
    try:
        from app.config import load_vector_store
        store = load_vector_store()
        
        # Extract metadata from all documents
        all_metadata = []
        document_types = set()
        sources = set()
        categories = set()
        
        for doc_id in store.index_to_docstore_id.values():
            try:
                doc = store.docstore.search(doc_id)
                if hasattr(doc, 'metadata'):
                    all_metadata.append(doc.metadata)
                    document_types.add(doc.metadata.get('document_type', 'Unknown'))
                    sources.add(doc.metadata.get('source', 'Unknown'))
                    categories.add(doc.metadata.get('document_category', 'general'))
            except Exception as e:
                continue
        
        return {
            "total_documents": len(all_metadata),
            "document_types": list(document_types),
            "sources": list(sources),
            "categories": list(categories),
            "sample_metadata": all_metadata[:5] if all_metadata else []  # Return first 5 as sample
        }
    except Exception as e:
        logger.error(f"Failed to get document metadata summary: {e}")
        return {"error": str(e)}

# Backward compatibility
def ingest_pdf(file_path: str, doc_type: str = "General Legal Document", source_name: str = "Unknown Source") -> Dict[str, Any]:
    """Backward compatibility function"""
    return ingest_document(file_path, doc_type, source_name)

def process_large_document(file_path: str, doc_type: str = "General Legal Document", source_name: str = "Unknown Source") -> List[Document]:
    """Backward compatibility function"""
    chunks, _ = document_processor.process_document(file_path, doc_type, source_name)
    return chunks

def add_to_vectorstore(docs: List[Document]) -> Dict[str, Any]:
    """Backward compatibility function"""
    return vector_store_manager.add_documents_to_store(docs)

# ========================
# Module Initialization
# ========================

if __name__ == "__main__":
    logger.info("🔧 Document Handler initialized successfully")
    logger.info(f"📁 Supported formats: {get_supported_formats()}")