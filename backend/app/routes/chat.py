from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import os
from app.services.openai_service import OpenAIService

router = APIRouter()

class ChatMessage(BaseModel):
    role: str
    content: str
    base64: Optional[str] = ""

class ChatRequest(BaseModel):
    messages: List[ChatMessage]

@router.post("/chat")
async def chat(request: ChatRequest):
    if not request.messages:
        raise HTTPException(status_code=400, detail="Không nhận được lịch sử tin nhắn.")
        
    api_key = os.getenv('OPENAI_API_KEY')
    if not api_key:
        raise HTTPException(status_code=500, detail="Không tìm thấy OPENAI_API_KEY trong file .env.")
        
    try:
        # Convert Pydantic objects to dictionary format expected by OpenAIService
        msg_list = [{"role": msg.role, "content": msg.content} for msg in request.messages]
        
        openai_service = OpenAIService(api_key)
        response = openai_service.chat(msg_list)
        
        return {
            "content": response,
            "role": "assistant"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
