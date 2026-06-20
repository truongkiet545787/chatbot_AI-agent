from flask import Flask, request, jsonify, render_template
from openai_client import OpenAIClient
from flask_cors import CORS
import os
from dotenv import load_dotenv

# Nạp các biến môi trường từ file .env
load_dotenv()

# Lấy API key đã cấu hình
api_key = os.getenv('OPENAI_API_KEY')
if not api_key:
    raise ValueError("Không tìm thấy OPENAI_API_KEY trong file .env. Vui lòng kiểm tra lại.")

# Khởi tạo đối tượng kết nối với API (OpenRouter)
openai_client = OpenAIClient(api_key)

# Khởi tạo Flask App
app = Flask(__name__)
CORS(app)

# Route trang chủ: Trả về giao diện Chat HTML
@app.route('/')
def home():
    return render_template('index.html')

# Route xử lý tin nhắn
@app.route('/chat', methods=['POST'])
def chat():
    data = request.get_json()
    messages = data.get('messages', [])
    
    if not messages:
        return jsonify({"error": "Không nhận được lịch sử tin nhắn."}), 400
        
    try:
        # Gọi sang file openai_client để lấy câu trả lời từ AI
        response = openai_client.chat(messages)
        return jsonify({
            "content": response,
            "role": "assistant"
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    # Chạy ứng dụng Flask ở cổng 5000 mặc định
    app.run(debug=True, port=5000)
