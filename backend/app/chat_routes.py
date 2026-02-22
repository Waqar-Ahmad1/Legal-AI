# app/chat_routes.py - Chat and conversation endpoints
import os
import json
import logging
import hashlib
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, Request, UploadFile, File
from fastapi.responses import StreamingResponse
from bson import ObjectId

from .models import APIResponse
from .auth import get_current_user

logger = logging.getLogger(__name__)
router = APIRouter()


# ========================
# CONVERSATION / HISTORY ENDPOINTS
# ========================

@router.get("/conversations", response_model=APIResponse)
async def get_user_conversations(request: Request, user: dict = Depends(get_current_user)):
    """Retrieve all conversations for the current user"""
    try:
        from .database import get_conversations_collection
        conv_col = get_conversations_collection()
        conversations = list(conv_col.find({"user_id": user["email"]}).sort("updated_at", -1))
        for c in conversations: c["_id"] = str(c["_id"])
        return APIResponse(success=True, message="Success", data=conversations)
    except Exception as e:
        return APIResponse(success=False, message=str(e))

@router.post("/conversations", response_model=APIResponse)
async def save_conversation_segment(request: Request, user: dict = Depends(get_current_user)):
    """Save or update a conversation segment"""
    try:
        body = await request.json()
        from .database import get_conversations_collection
        conv_col = get_conversations_collection()
        
        conversation = {
            "user_id": user["email"],
            "title": body.get("title", "New Conversation"),
            "messages": body.get("messages", []),
            "updated_at": datetime.utcnow()
        }
        
        if body.get("id"):
            conv_col.update_one({"_id": ObjectId(body["id"])}, {"$set": conversation})
            conversation["_id"] = body["id"]
        else:
            result = conv_col.insert_one(conversation)
            conversation["_id"] = str(result.inserted_id)
            
        return APIResponse(success=True, message="Saved", data=conversation)
    except Exception as e:
        return APIResponse(success=False, message=str(e))


# ========================
# CHAT UPLOAD & RAG
# ========================

@router.post("/chat/upload", response_model=APIResponse)
async def chat_upload(
    file: UploadFile = File(...),
    user: dict = Depends(get_current_user)
):
    """Allow users to upload private documents for live chat session analysis"""
    try:
        logger.info(f"📤 Chat upload received from: {user['email']} - File: {file.filename}")
        
        # 1. Save file to personal folder
        session_upload_dir = os.path.join("data", "uploads", "users", user["id"])
        os.makedirs(session_upload_dir, exist_ok=True)
        file_path = os.path.join(session_upload_dir, file.filename)
        
        with open(file_path, "wb") as f:
            content = await file.read()
            f.write(content)
            
        # 2. Ingest into the Single Vector Store (Tagged with user source)
        from app.document_handler import ingest_document
        result = ingest_document(
            file_path, 
            doc_type="User Personal Document", 
            source_name=f"user_{user['id']}_{file.filename}"
        )
        
        if not result.get("success"):
            return APIResponse(success=False, message=result.get("error") or "Processing failed")
            
        return APIResponse(
            success=True, 
            message="Document uploaded and indexed successfully for this session.",
            data={
                "filename": file.filename,
                "chunks": result.get("meaningful_chunks_kept", 0),
                "source_tag": f"user_{user['id']}_{file.filename}"
            }
        )
    except Exception as e:
        logger.error(f"Chat upload failed: {e}")
        return APIResponse(success=False, message=str(e))


# ========================
# CHAT ENDPOINT
# ========================

@router.post("/chat", response_model=APIResponse)
async def chat(request: Request, user: Optional[dict] = Depends(get_current_user)):
    """Chat endpoint using config.py vector store with session awareness"""
    try:
        try:
            body = await request.json()
            query = body.get('query') or body.get('message')
        except (ValueError, UnicodeDecodeError):
            form_data = await request.form()
            query = form_data.get('query') or form_data.get('message')
        
        if not query or len(query.strip()) < 3:
            return APIResponse(success=False, message="Query too short")

        query = query.strip()
        from app.config import load_vector_store, ai_provider, llm
        from .database import get_semantic_cache_collection
        
        # 1. Semantic Cache Lookup
        cache_col = get_semantic_cache_collection()
        user_prefix = f"user_{user['id']}" if user else "global"
        query_hash = hashlib.sha256(f"{user_prefix}:{query}".encode()).hexdigest()
        cached_entry = cache_col.find_one({"query_hash": query_hash})
        
        if cached_entry:
            logger.info(f"🚀 Semantic Cache Hit for: {query[:50]}...")
            return APIResponse(
                success=True,
                message="Cached Success",
                data={
                    "query": query,
                    "answer": cached_entry["answer"],
                    "sources": cached_entry.get("sources", []),
                    "cached": True,
                    "provider_info": ai_provider.get_provider_info()
                }
            )

        store = load_vector_store()
        doc_count = len(store.index_to_docstore_id)
        
        if doc_count <= 1:
            return APIResponse(
                success=True,
                message="No docs",
                data={"answer": "No legal documents loaded yet.", "provider_info": ai_provider.get_provider_info()}
            )
        
        # 2. Retrieval with Semantic Reranking
        retriever = store.as_retriever(search_kwargs={"k": 10}) 
        raw_docs = retriever.get_relevant_documents(query)
        
        # Professional Stage 2: Semantic Reranking
        relevant_docs = ai_provider.rerank(query, raw_docs, top_n=5)
        
        # 3. Prompt Construction (Pakistani Law & Session Context)
        context_blocks = []
        sources_metadata = []
        
        for i, doc in enumerate(relevant_docs):
            meta = doc.metadata
            source_label = meta.get('court_name', 'General Document')
            if user and meta.get("source", "").startswith(f"user_{user['id']}"):
                source_label = f"Your Uploaded Document ({meta.get('title', 'Doc')})"
            
            ref = f"[Ref {i+1}: {source_label}]"
            context_blocks.append(f"{ref}\n{doc.page_content}")
            sources_metadata.append({
                "id": i + 1,
                "title": meta.get("title", f"Document {i+1}"),
                "source": source_label,
                "date": meta.get("decision_date", "N/A"),
                "is_personal": user and meta.get("source", "").startswith(f"user_{user['id']}")
            })

        context = "\n\n".join(context_blocks)
        
        prompt = f"""
        SYSTEM: You are a professional Pakistani Legal Consultant.
        Answer the user's query using the provided context. 
        Maintain legal accuracy and cite sources as [Ref X].
        
        CONTEXT:
        {context}
        
        USER QUERY: {query}
        
        PROFESSIONAL LEGAL RESPONSE:"""

        # 4. Handle Streaming vs Standard Response
        stream_requested = body.get("stream", False)
        
        if stream_requested and ai_provider.llm_type == "gemini":
            async def event_generator():
                # Yield metadata first
                metadata_block = {
                    "type": "metadata",
                    "sources": sources_metadata,
                    "provider_info": ai_provider.get_provider_info()
                }
                yield f"data: {json.dumps(metadata_block)}\n\n"
                
                # Stream the answer
                full_answer = ""
                async for chunk in ai_provider.stream_chat(prompt, context):
                    full_answer += chunk
                    yield f"data: {json.dumps({'type': 'content', 'delta': chunk})}\n\n"
                
                # Signal end and save to cache
                yield "data: [DONE]\n\n"
                
                # Background save to cache
                try:
                    cache_col.insert_one({
                        "query_hash": query_hash,
                        "query": query,
                        "answer": full_answer,
                        "sources": sources_metadata,
                        "created_at": datetime.utcnow()
                    })
                except Exception as cache_err:
                    logger.warning(f"Cache write failed (streaming): {cache_err}")

            return StreamingResponse(event_generator(), media_type="text/event-stream")

        # Standard non-streaming path
        try:
            response = llm.invoke(prompt)
            answer = response.content if hasattr(response, 'content') else str(response)
            
            # Save to Semantic Cache
            try:
                cache_col.insert_one({
                    "query_hash": query_hash,
                    "query": query,
                    "answer": answer,
                    "sources": sources_metadata,
                    "created_at": datetime.utcnow()
                })
            except Exception as cache_err:
                logger.warning(f"Cache write failed: {cache_err}")
                
        except Exception as llm_error:
            logger.error(f"LLM Invoke failed: {llm_error}")
            answer = "The legal AI is currently experiencing high load. Based on short document scans: " + context_blocks[0][:200]
            
        return APIResponse(
            success=True,
            message="Success",
            data={
                "query": query,
                "answer": answer,
                "sources": sources_metadata,
                "provider_info": ai_provider.get_provider_info()
            }
        )
    except Exception as e:
        logger.error(f"Chat failed: {e}")
        return APIResponse(success=False, message=str(e))
