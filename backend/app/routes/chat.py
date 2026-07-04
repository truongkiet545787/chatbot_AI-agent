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
                response_text = rag_service.summarize_document(session_id, openai_service.model)
                content_payload = {"text": response_text, "quiz": None, "flashcards": None}
            else:
                # Trích xuất chủ đề (Topic) thực sự để truy vấn RAG (nếu có dạng câu lệnh hệ thống)
                import re
                search_query = latest_query
                rag_prompt_match = re.search(r'ôn tập(?:\s+độ khó\s+\w+)?\s+về\s+(.*)', latest_query, re.IGNORECASE)
                if rag_prompt_match:
                    search_query = rag_prompt_match.group(1).strip()

                # Chạy Stuff (Q&A chi tiết): Lấy ngữ cảnh liên quan nhất dựa trên chủ đề thực tế
                context = rag_service.query_context(session_id, search_query, k=4)
                
                # Để LLM trả về đúng cấu trúc JSON khi người dùng có nhu cầu tạo Quiz hoặc Flashcard
                system_msg = (
                    "Bạn là trợ lý AI thông minh tích hợp RAG. Hãy trả lời câu hỏi của người dùng bằng tiếng Việt dựa trên phần "
                    "Ngữ cảnh (Context) tài liệu dưới đây cùng Lịch sử hội thoại.\n\n"
                    "Định dạng phản hồi BẮT BUỘC phải là một đối tượng JSON thô (raw JSON) với cấu trúc sau:\n"
                    "{\n"
                    "  \"text\": \"Nội dung câu trả lời hoặc giải thích bằng tiếng Việt...\",\n"
                    "  \"quiz\": null hoặc [\n"
                    "    {\n"
                    "      \"question\": \"Câu hỏi...?\",\n"
                    "      \"options\": [\"A\", \"B\", \"C\", \"D\"],\n"
                    "      \"correctAnswer\": \"A\",\n"
                    "      \"explanation\": \"Giải thích...\"\n"
                    "    }\n"
                    "  ],\n"
                    "  \"flashcards\": null hoặc [\n"
                    "    {\n"
                    "      \"front\": \"Mặt trước...\",\n"
                    "      \"back\": \"Mặt sau...\"\n"
                    "    }\n"
                    "  ]\n"
                    "}\n\n"
                    "QUY TẮC BẮT BUỘC:\n"
                    "- CẤM TUYỆT ĐỐI viết nội dung câu hỏi trắc nghiệm hoặc nội dung thẻ ghi nhớ dưới dạng văn bản markdown trong trường \"text\". Trường \"text\" chỉ dùng để chứa lời nhắn giới thiệu ngắn gọn (ví dụ: 'Dưới đây là bộ câu hỏi trắc nghiệm tôi tạo cho bạn:'). Tất cả các câu hỏi trắc nghiệm BẮT BUỘC phải đặt trong mảng \"quiz\". Tất cả thẻ ghi nhớ BẮT BUỘC phải đặt trong mảng \"flashcards\".\n\n"
                    "HƯỚNG DẪN TẠO QUIZ & FLASHCARD:\n"
                    "1. Chỉ tạo mảng \"quiz\" nếu người dùng yêu cầu (ví dụ: 'tạo quiz', 'làm trắc nghiệm', 'kiểm tra kiến thức'...). Hãy tạo đúng số lượng câu hỏi và mức độ khó (Dễ/Trung bình/Khó) theo yêu cầu trong câu hỏi của người dùng (hỗ trợ tạo tới 30 câu).\n"
                    "LƯU Ý QUAN TRỌNG ĐỂ TRÁNH LỖI TOKEN: Khi người dùng yêu cầu số câu hỏi lớn (ví dụ: 15, 20, 25, 30 câu), hãy viết phần nội dung câu hỏi, các phương án và đặc biệt là phần giải thích (explanation) thật ngắn gọn, súc tích (phần giải thích tối đa 1 câu ngắn dưới 15 từ). Điều này giúp đảm bảo không bị vượt giới hạn token đầu ra và không làm lỗi cấu trúc JSON. Nếu không chỉ định rõ số lượng, hãy tạo mặc định 5 câu. Ngược lại, hãy để \"quiz\": null.\n"
                    "2. Chỉ tạo mảng \"flashcards\" nếu người dùng yêu cầu. Hãy tạo đúng số lượng thẻ ghi nhớ và mức độ khó theo yêu cầu của người dùng (hỗ trợ tới 30 thẻ). Hãy viết nội dung ngắn gọn để tránh lỗi Token. Nếu không chỉ định, hãy tạo mặc định 6 thẻ. Ngược lại, hãy để \"flashcards\": null.\n"
                    "3. Dùng chính xác context tài liệu tương ứng với phần người dùng yêu cầu để tạo.\n\n"
                    f"Ngữ cảnh tài liệu:\n{context}"
                )
                
                # Gọi LLM
                from langchain_core.messages import SystemMessage, HumanMessage
                history = openai_service.get_session_history(session_id)
                lc_messages = [SystemMessage(content=system_msg)]
                for msg in history.messages:
                    lc_messages.append(msg)
                lc_messages.append(HumanMessage(content=latest_query))
                
                llm_response = openai_service.model.invoke(lc_messages)
                raw_content = llm_response.content.strip()
                
                import json
                import re
                
                # Trích xuất đoạn JSON nằm giữa cặp ngoặc nhọn { } ngoài cùng để tăng tính bền bỉ (bỏ qua các văn bản dẫn dắt của LLM)
                json_match = re.search(r'\{.*\}', raw_content, re.DOTALL)
                if json_match:
                    try:
                        content_payload = json.loads(json_match.group(0))
                    except Exception:
                        content_payload = {"text": llm_response.content, "quiz": None, "flashcards": None}
                else:
                    content_payload = {"text": llm_response.content, "quiz": None, "flashcards": None}
        else:
            # Nếu session không có tài liệu RAG, chạy chat bình thường
            response_text = openai_service.chat_rag(latest_query, session_id, context=None)
            content_payload = {"text": response_text, "quiz": None, "flashcards": None}
            
        return {
            "content": content_payload.get("text", ""),
            "role": "assistant",
            "quiz": content_payload.get("quiz"),
            "flashcards": content_payload.get("flashcards")
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

class GenerateQuizRequest(BaseModel):
    sessionId: str

@router.post("/api/rag/generate-quiz")
async def generate_quiz(request: GenerateQuizRequest):
    api_key = os.getenv('OPENAI_API_KEY')
    if not api_key:
        raise HTTPException(status_code=500, detail="Không tìm thấy OPENAI_API_KEY trong file .env.")
        
    session_id = request.sessionId
    if not rag_service.is_session_active(session_id):
        raise HTTPException(status_code=400, detail="Vui lòng tải lên tài liệu trước khi tạo Quiz.")
        
    try:
        openai_service = OpenAIService(api_key)
        
        # Lấy văn bản tài liệu gốc
        store_data = rag_service.stores[session_id].get()
        documents = store_data.get('documents', [])
        if not documents:
            raise HTTPException(status_code=400, detail="Tài liệu rỗng.")
            
        total_text = "\n\n".join(documents)[:15000] # Lấy tối đa 15k kí tự đầu để sinh quiz
        
        system_prompt = (
            "Bạn là trợ lý giáo dục chuyên nghiệp.\n"
            "Hãy đọc tài liệu dưới đây và tạo ra 5 câu hỏi trắc nghiệm (Quiz) chất lượng cao bằng tiếng Việt dựa vào tài liệu.\n"
            "Mỗi câu hỏi phải có đúng 4 phương án lựa chọn (A, B, C, D) và giải thích chi tiết đáp án đúng.\n\n"
            "Định dạng đầu ra BẮT BUỘC phải là một mảng JSON thô, không có ký tự markdown, không có lời giải thích phụ. Định dạng cấu trúc mỗi phần tử:\n"
            "[\n"
            "  {\n"
            "    \"question\": \"Câu hỏi thứ nhất...?\",\n"
            "    \"options\": [\"Đáp án A\", \"Đáp án B\", \"Đáp án C\", \"Đáp án D\"],\n"
            "    \"correctAnswer\": \"A\",\n"
            "    \"explanation\": \"Lời giải thích tại sao A đúng...\"\n"
            "  }\n"
            "]"
        )
        
        response = openai_service.chat([
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": f"Tài liệu:\n{total_text}"}
        ])
        
        # Khử markdown block nếu có
        content = response.strip()
        if content.startswith("```"):
            lines = content.splitlines()
            if lines[0].startswith("```"):
                lines = lines[1:]
            if lines[-1].startswith("```"):
                lines = lines[:-1]
            content = "\n".join(lines).strip()
            
        import json
        quiz_data = json.loads(content)
        return {
            "status": "success",
            "quiz": quiz_data
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi tạo Quiz: {str(e)}")

class GenerateFlashcardsRequest(BaseModel):
    sessionId: str

@router.post("/api/rag/generate-flashcards")
async def generate_flashcards(request: GenerateFlashcardsRequest):
    api_key = os.getenv('OPENAI_API_KEY')
    if not api_key:
        raise HTTPException(status_code=500, detail="Không tìm thấy OPENAI_API_KEY trong file .env.")
        
    session_id = request.sessionId
    if not rag_service.is_session_active(session_id):
        raise HTTPException(status_code=400, detail="Vui lòng tải lên tài liệu trước khi tạo Flashcards.")
        
    try:
        openai_service = OpenAIService(api_key)
        
        # Lấy văn bản tài liệu gốc
        store_data = rag_service.stores[session_id].get()
        documents = store_data.get('documents', [])
        if not documents:
            raise HTTPException(status_code=400, detail="Tài liệu rỗng.")
            
        total_text = "\n\n".join(documents)[:15000] # Lấy tối đa 15k kí tự đầu để sinh flashcards
        
        system_prompt = (
            "Bạn là trợ lý giáo dục chuyên nghiệp.\n"
            "Hãy đọc tài liệu dưới đây và tạo ra 6 thẻ học nhanh (Flashcard) bằng tiếng Việt dựa vào tài liệu.\n"
            "Mỗi flashcard gồm mặt trước (front - khái niệm/câu hỏi/thuật ngữ) và mặt sau (back - định nghĩa/câu trả lời/giải thích ngắn gọn).\n\n"
            "Định dạng đầu ra BẮT BUỘC phải là một mảng JSON thô, không có ký tự markdown, không có lời giải thích phụ. Định dạng cấu trúc mỗi phần tử:\n"
            "[\n"
            "  {\n"
            "    \"front\": \"Mặt trước (Khái niệm)...\",\n"
            "    \"back\": \"Mặt sau (Định nghĩa/Giải thích)...\"\n"
            "  }\n"
            "]"
        )
        
        response = openai_service.chat([
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": f"Tài liệu:\n{total_text}"}
        ])
        
        # Khử markdown block nếu có
        content = response.strip()
        if content.startswith("```"):
            lines = content.splitlines()
            if lines[0].startswith("```"):
                lines = lines[1:]
            if lines[-1].startswith("```"):
                lines = lines[:-1]
            content = "\n".join(lines).strip()
            
        import json
        flashcards_data = json.loads(content)
        return {
            "status": "success",
            "flashcards": flashcards_data
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi tạo Flashcards: {str(e)}")


