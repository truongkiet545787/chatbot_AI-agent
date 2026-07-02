from typing import Optional
from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core.chat_history import BaseChatMessageHistory, InMemoryChatMessageHistory
from langchain_core.runnables.history import RunnableWithMessageHistory
from langchain_core.messages import HumanMessage, AIMessage, SystemMessage

class OpenAIService:
    def __init__(self, api_key):
        # Khởi tạo mô hình ChatOpenAI trỏ tới OpenRouter
        self.model = ChatOpenAI(
            model="openrouter/free",
            openai_api_key=api_key,
            openai_api_base="https://openrouter.ai/api/v1"
        )
        
        # Cấu hình Prompt Template cho Trợ lý tạo Prompt ảnh
        self.prompt = ChatPromptTemplate.from_messages([
            ("system", "Bạn là chuyên gia hỗ trợ tạo prompt ảnh nghệ thuật (cho Midjourney, DALL-E, Stability). Hãy giúp người dùng dịch, tối ưu hóa và mở rộng ý tưởng của họ thành các câu prompt vẽ ảnh chi tiết, chất lượng cao bằng tiếng Anh dựa trên lịch sử hội thoại. Luôn cung cấp prompt tiếng Anh hoàn chỉnh trong khối mã (code block) để họ dễ copy."),
            MessagesPlaceholder(variable_name="history"),
            ("human", "{input}"),
        ])
        
        # Tạo chuỗi xử lý (LCEL)
        self.chain = self.prompt | self.model
        
        # Bộ lưu trữ lịch sử chat của từng phiên (Session) trên RAM
        self.store = {}
            
        # Chuỗi hội thoại tự quản lý bộ nhớ
        self.conversational_chain = RunnableWithMessageHistory(
            self.chain,
            self.get_session_history,
            input_messages_key="input",
            history_messages_key="history"
        )
        
    def get_session_history(self, session_id: str) -> BaseChatMessageHistory:
        if session_id not in self.store:
            self.store[session_id] = InMemoryChatMessageHistory()
        return self.store[session_id]
        
    def chat(self, messages, session_id=None):
        # 1. Nếu có session_id truyền lên (Sử dụng lịch sử tự động lưu trên RAM)
        if session_id:
            # Lấy tin nhắn mới nhất của người dùng
            latest_content = messages[-1].get("content", "") if isinstance(messages, list) and len(messages) > 0 else messages
            response = self.conversational_chain.invoke(
                {"input": latest_content},
                config={"configurable": {"session_id": session_id}}
            )
            return response.content
            
        # 2. Nếu không có session_id (Sử dụng mảng lịch sử gửi trực tiếp từ Frontend)
        lc_messages = []
        for msg in messages:
            role = msg.get("role")
            content = msg.get("content")
            if role == "user":
                lc_messages.append(HumanMessage(content=content))
            elif role == "system":
                lc_messages.append(SystemMessage(content=content))
            else:
                lc_messages.append(AIMessage(content=content))
                
        response = self.model.invoke(lc_messages)
        return response.content

    def chat_rag(self, latest_query: str, session_id: str, context: Optional[str]) -> str:
        """Hỏi đáp RAG có kết hợp ngữ cảnh tài liệu và lịch sử hội thoại."""
        history = self.get_session_history(session_id)
        
        # Thiết lập Prompt chỉ dẫn phân tuyến ngữ nghĩa (Semantic Routing qua Prompt)
        if context:
            system_msg = (
                "Bạn là trợ lý AI thông minh và thân thiện. Hãy trả lời câu hỏi của người dùng bằng tiếng Việt dựa trên phần "
                "Ngữ cảnh (Context) tài liệu dưới đây cùng Lịch sử hội thoại.\n"
                "QUY TẮC:\n"
                "1. Nếu người dùng chỉ chào hỏi (Hi, Hello), tán gẫu xã giao hoặc hỏi những câu không liên quan đến tài liệu, "
                "hãy sử dụng kiến thức chung của bạn để trò chuyện một cách tự nhiên. Không cần nhắc đến tài liệu.\n"
                "2. Nếu người dùng hỏi các câu liên quan trực tiếp đến thông tin trong tài liệu, hãy sử dụng phần Ngữ cảnh dưới đây để trả lời chính xác, "
                "trung thực. Nếu tài liệu không chứa câu trả lời, hãy lịch sự báo rằng tài liệu không đề cập đến thông tin này.\n\n"
                f"Ngữ cảnh tài liệu:\n{context}"
            )
        else:
            system_msg = (
                "Bạn là trợ lý AI thông minh và thân thiện. Hãy trò chuyện và giải đáp các câu hỏi của người dùng bằng tiếng Việt. "
                "Nếu người dùng yêu cầu tạo hoặc tối ưu hóa câu prompt vẽ ảnh (cho Midjourney, DALL-E, Stability), "
                "hãy giúp họ dịch, tối ưu hóa và mở rộng ý tưởng thành các câu prompt vẽ ảnh bằng tiếng Anh chi tiết, chất lượng cao nằm trong khối mã (code block) để họ dễ sao chép."
            )
            
        # Tạo danh sách các tin nhắn gửi lên LLM
        lc_messages = [SystemMessage(content=system_msg)]
        
        # Thêm lịch sử chat
        for msg in history.messages:
            lc_messages.append(msg)
            
        # Thêm câu hỏi mới của người dùng
        lc_messages.append(HumanMessage(content=latest_query))
        
        # Gọi mô hình AI
        response = self.model.invoke(lc_messages)
        
        # Lưu lượt chat này vào bộ nhớ của session
        history.add_user_message(latest_query)
        history.add_ai_message(response.content)
        
        return response.content


