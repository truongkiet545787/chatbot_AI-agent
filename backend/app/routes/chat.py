from fastapi import APIRouter, HTTPException, status, UploadFile, File, Form
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import os
import tempfile
import shutil
from app.services.openai_service import OpenAIService
from app.services.rag_service import RAGService

router = APIRouter()
rag_service = RAGService()

class ChatMessage(BaseModel):
    role: str
    content: str
    base64: Optional[str] = ""

class ChatRequest(BaseModel):
    messages: Optional[List[ChatMessage]] = None
    message: Optional[ChatMessage] = None
    sessionId: Optional[str] = None
    session_id: Optional[str] = None

@router.post("/chat")
async def chat(request: ChatRequest):
    api_key = os.getenv('OPENAI_API_KEY')
    if not api_key:
        raise HTTPException(status_code=500, detail="Không tìm thấy OPENAI_API_KEY trong file .env.")
        
    try:
        openai_service = OpenAIService(api_key)
        
        session_id = request.sessionId or request.session_id
        
        msg_list = []
        if request.messages:
            msg_list = [{"role": msg.role, "content": msg.content} for msg in request.messages]
        elif request.message:
            msg_list = [{"role": request.message.role, "content": request.message.content}]
        else:
            raise HTTPException(status_code=400, detail="Thiếu tin nhắn đầu vào.")
            
        response = openai_service.chat(msg_list, session_id=session_id)
        
        return {
            "content": response,
            "role": "assistant"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/api/rag/upload")
async def upload_rag_document(
    sessionId: str = Form(...),
    file: UploadFile = File(...)
):
    if not sessionId:
        raise HTTPException(status_code=400, detail="Thiếu sessionId.")
        
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in [".pdf", ".docx", ".doc"]:
        raise HTTPException(status_code=400, detail="Chỉ hỗ trợ tải lên file PDF hoặc Word (.docx).")
        
    temp_path = None
    try:
        # Tạo file tạm thời để lưu document
        with tempfile.NamedTemporaryFile(delete=False, suffix=ext) as temp_file:
            shutil.copyfileobj(file.file, temp_file)
            temp_path = temp_file.name
            
        # Nạp dữ liệu vào Chroma DB
        num_chunks = rag_service.add_document(sessionId, temp_path, file.filename)
        
        # Xóa file tạm thời
        os.remove(temp_path)
        
        return {
            "status": "success",
            "filename": file.filename,
            "chunks": num_chunks,
            "message": f"Đã tải lên và học xong tài liệu '{file.filename}' ({num_chunks} phân đoạn)."
        }
    except Exception as e:
        if temp_path and os.path.exists(temp_path):
            os.remove(temp_path)
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/api/rag/chat")
async def chat_rag(request: ChatRequest):
    api_key = os.getenv('OPENAI_API_KEY')
    if not api_key:
        raise HTTPException(status_code=500, detail="Không tìm thấy OPENAI_API_KEY trong file .env.")
        
    session_id = request.sessionId or request.session_id
    if not session_id:
        raise HTTPException(status_code=400, detail="Thiếu sessionId.")
        
    latest_query = ""
    if request.message:
        latest_query = request.message.content
    elif request.messages:
        latest_query = request.messages[-1].content
    else:
        raise HTTPException(status_code=400, detail="Thiếu nội dung câu hỏi.")
        
    try:
        openai_service = OpenAIService(api_key)
        
        # 1. Kiểm tra xem câu hỏi có phải yêu cầu tóm tắt tài liệu hay không
        is_summary_request = any(keyword in latest_query.lower() for keyword in ["tóm tắt", "tổng quan", "khái quát", "summarize", "summary"])
        
        # 2. Xử lý trường hợp có tài liệu RAG trong bộ nhớ tạm
        if rag_service.is_session_active(session_id):
            if is_summary_request:
                # Chạy Map Reduce tóm tắt toàn bộ file
                response = rag_service.summarize_document(session_id, openai_service.model)
            else:
                # Chạy Stuff (Q&A chi tiết): Lấy ngữ cảnh liên quan nhất
                context = rag_service.query_context(session_id, latest_query, k=4)
                response = openai_service.chat_rag(latest_query, session_id, context)
        else:
            # Nếu session không có tài liệu RAG, chạy chat bình thường
            response = openai_service.chat_rag(latest_query, session_id, context=None)
            
        return {
            "content": response,
            "role": "assistant"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/api/rag/clear")
async def clear_rag(request: ChatRequest):
    session_id = request.sessionId or request.session_id
    if not session_id:
        raise HTTPException(status_code=400, detail="Thiếu sessionId.")
    rag_service.clear_session(session_id)
    return {
        "status": "success",
        "message": f"Đã xóa toàn bộ tài liệu RAG của session {session_id} khỏi RAM."
    }


