# 🤖 AI Chatbot Demo (Flask + OpenRouter)

Dự án chatbot AI đơn giản nhưng mạnh mẽ sử dụng **Flask (Python)** làm Backend và giao diện **HTML/JS (Glassmorphism Dark Mode)** làm Frontend. Hệ thống kết nối với **OpenRouter** để truy cập các mô hình ngôn ngữ lớn (như Qwen, Llama, Gemma) hoàn toàn **MIỄN PHÍ** và có khả năng ghi nhớ ngữ cảnh cuộc trò chuyện.

---

## ✨ Tính năng nổi bật
* **Giao diện hiện đại (UI/UX):** Phong cách tối giản, nền tối (Dark mode), hiệu ứng làm mờ kính (Glassmorphism), bong bóng chat sinh động và hiệu ứng gõ chữ (loading dots).
* **Quản lý ngữ cảnh thông minh (Context Retention):** Phía giao diện (Client) tự động lưu trữ và tích lũy lịch sử trò chuyện để gửi kèm lên API, giúp AI hiểu được ngữ cảnh của cuộc hội thoại trước đó.
* **Bảo mật tối đa:** Cấu hình thông tin nhạy cảm qua file `.env`, tự động bỏ qua khi đẩy code lên GitHub bằng cấu hình `.gitignore` chuẩn.
* **Sử dụng API miễn phí:** Tích hợp với cổng OpenRouter thông qua mô hình tự động chọn nguồn miễn phí tốt nhất (`openrouter/free`).

---

## 📁 Cấu trúc thư mục dự án

```text
chatbot_AI-agent/
│
├── templates/
│   └── index.html      # Giao diện chính (Frontend HTML/CSS/JS)
│
├── .env.example        # File cấu hình mẫu chứa tên biến môi trường
├── .gitignore          # Cấu hình các file Git cần bỏ qua (Tránh lộ API Key)
├── openai_client.py    # Class xử lý kết nối, gửi nhận dữ liệu với OpenRouter API
├── requirements.txt    # Danh sách thư viện Python cần cài đặt
├── run.py              # File chạy chính của server Flask
└── README.md           # Hướng dẫn sử dụng dự án
```

---

## 🛠️ Hướng dẫn cài đặt và chạy thử

### Bước 1: Clone dự án hoặc tải mã nguồn về máy
Mở Terminal/CMD tại thư mục bạn muốn lưu dự án và chạy lệnh:
```bash
git clone https://github.com/truongkiet545787/chatbot_AI-agent.git
cd chatbot_AI-agent
```

### Bước 2: Cài đặt các thư viện cần thiết
Đảm bảo bạn đã cài đặt Python (phiên bản 3.8 trở lên). Chạy lệnh cài đặt các thư viện phụ thuộc:
```bash
pip install -r requirements.txt
```

### Bước 3: Cấu hình API Key
1. Copy file `.env.example` và đổi tên thành `.env`:
   * **Trên Windows (cmd):** `copy .env.example .env`
   * **Trên macOS/Linux:** `cp .env.example .env`
2. Mở file `.env` vừa tạo và thay thế `your_openrouter_api_key_here` bằng API Key thật của bạn (lấy miễn phí từ [OpenRouter](https://openrouter.ai/)):
   ```env
   OPENAI_API_KEY=sk-or-v1-xxxxxxxxxxxxxxxxx
   ```

### Bước 4: Khởi chạy dự án
Chạy file khởi động server Flask:
```bash
python run.py
```
Sau khi màn hình terminal hiển thị server đang hoạt động, bạn mở trình duyệt web và truy cập địa chỉ sau:
👉 **[http://localhost:5000](http://localhost:5000)**

---

## 📖 Giải thích cách hoạt động của Code

### 1. File cấu hình API: `openai_client.py`
Tạo lớp `OpenAIClient` đóng gói cấu hình kết nối. 
* Lớp này nạp thư viện `openai` nhưng chuyển hướng địa chỉ kết nối `base_url` sang máy chủ của **OpenRouter** (`https://openrouter.ai/api/v1`).
* Hàm `chat(messages)` nhận vào một danh sách các tin nhắn cũ và gửi đi với tham số `model="openrouter/free"`.

### 2. File chạy server: `run.py`
* Sử dụng Flask để lắng nghe các kết nối từ trình duyệt.
* Route trang chủ `@app.route('/')` sẽ tải file giao diện `templates/index.html` lên màn hình người dùng.
* Route API `@app.route('/chat', methods=['POST'])` nhận lịch sử chat dạng JSON từ trình duyệt gửi lên, gọi hàm `chat()` từ `openai_client.py` để lấy câu trả lời rồi trả ngược về cho giao diện.

### 3. File giao diện: `templates/index.html`
* Sử dụng ngôn ngữ JavaScript thuần (Vanilla JS) để duy trì mảng dữ liệu hội thoại:
  ```javascript
  let messages = [{"role": "system", "content": "You are a helpful assistant. Please reply in Vietnamese."}];
  ```
* Mỗi lần bạn nhấn "Gửi", Javascript sẽ tự động thêm tin nhắn của bạn vào mảng `messages` này, gửi toàn bộ mảng lên cổng `/chat` của Flask và hiển thị kết quả trả về của AI lên màn hình. Điều này giúp cuộc hội thoại liên kết liền mạch với nhau.
