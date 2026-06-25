from flask import Blueprint, request, jsonify
from app.services.openai_service import OpenAIService
import os

chat_bp = Blueprint('chat', __name__)

@chat_bp.route('/chat', methods=['POST'])
def chat():
    data = request.get_json()
    if not data:
        return jsonify({"error": "Không nhận được dữ liệu yêu cầu."}), 400
        
    messages = data.get('messages', [])
    
    if not messages:
        return jsonify({"error": "Không nhận được lịch sử tin nhắn."}), 400
        
    try:
        api_key = os.getenv('OPENAI_API_KEY')
        if not api_key:
            return jsonify({"error": "Không tìm thấy OPENAI_API_KEY trong file .env."}), 500
            
        openai_service = OpenAIService(api_key)
        response = openai_service.chat(messages)
        return jsonify({
            "content": response,
            "role": "assistant"
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500
