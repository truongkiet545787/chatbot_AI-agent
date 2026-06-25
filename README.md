# 🤖 Trợ Lý Chatbot AI Đa Năng (Next.js + Flask + OpenRouter + Stability AI)

Dự án ứng dụng Trợ lý Chatbot AI toàn diện kết hợp giữa **Next.js** làm Frontend và **Flask (Python)** làm Backend để gọi các mô hình ngôn ngữ lớn từ **OpenRouter** và tạo hình ảnh nghệ thuật từ **Stability AI (Stable Image API)**.

---

## ✨ Các Chức Năng Cốt Lõi

* 💬 **Trợ lý Chatbot AI (AI Assistant):** Trò chuyện hỏi đáp trực tiếp với AI có ghi nhớ ngữ cảnh cuộc trò chuyện (sử dụng các mô hình miễn phí từ OpenRouter).
* 🎨 **Tạo ảnh nghệ thuật (Text-to-Image):** Tạo ảnh chất lượng cao trực tiếp từ mô tả văn bản (sử dụng Stability AI Stable Image Core/Ultra API), tích hợp hoàn chỉnh và hiển thị kết quả Base64 ngay trên giao diện Web.
* 📂 **Chatbot RAG (RAG Document Chat):** Trò chuyện hỏi đáp thông minh dựa trên tài liệu tải lên (Đang phát triển - Update sau).
* 🎙️ **Nhận dạng giọng nói (Speech Recognition):** Chuyển giọng nói trực tiếp thành văn bản (Đang phát triển - Update sau).
* 🔊 **Văn bản thành giọng nói (Text-to-Speech):** Chuyển đổi văn bản viết thành giọng đọc (Đang phát triển - Update sau).
* 🛠️ **Các công cụ ảnh khác:** Chỉnh sửa vật thể (`replace-object`) và chuyển nét vẽ thành ảnh (`sketch-to-image`) (Đang phát triển - Update sau).

---

## 📁 Cấu Trúc Dự Án

Dự án hiện tại được chia làm 2 phần chính: **Frontend (Next.js)** và **Backend (Flask)** đã được tái cấu trúc theo mô hình Module hóa chuyên nghiệp.

```text
chatbot_AI-agent/
│
├── backend/                  # Mã nguồn Backend (Flask API)
│   ├── app/                  # Thư mục ứng dụng chính
│   │   ├── __init__.py      # Application Factory, cấu hình Flask, CORS và Blueprints
│   │   ├── routes/          # Các định tuyến API (Controllers)
│   │   │   ├── __init__.py  # Đăng ký Blueprints
│   │   │   ├── chat.py      # Route xử lý chat văn bản (/chat)
│   │   │   └── image.py     # Route xử lý sinh ảnh (/ai-demos/generate-image)
│   │   ├── services/        # Các tích hợp API bên thứ ba (Services)
│   │   │   ├── __init__.py  # Khởi tạo gói dịch vụ
│   │   │   ├── openai_service.py    # Dịch vụ kết nối OpenRouter LLM
│   │   │   └── stability_service.py  # Dịch vụ sinh ảnh bất đồng bộ qua Stability AI
│   │   └── templates/       # Giao diện HTML kiểm thử tối giản
│   │       └── index.html   # Giao diện chat đơn trang phục vụ debug backend
│   │
│   ├── .env                 # Cấu hình môi trường chứa các khóa API (Không đẩy lên Git)
│   ├── .env.example         # Tệp cấu hình môi trường mẫu
│   ├── requirements.txt     # Các thư viện Python cần thiết (Thêm requests, httpx)
│   └── run.py               # Tệp tin chạy chính của Backend (Cổng 5000)
│
├── frontend/                 # Mã nguồn Frontend (Next.js App Router)
│   ├── src/
│   │   ├── app/[locale]/ai/chat/
│   │   │   ├── chat-bot/    # Trang giao diện Chatbot văn bản
│   │   │   └── photo/       # Trang giao diện sinh ảnh nghệ thuật (Photo)
│   │   │
│   │   ├── apiCalls/        # Các hàm gọi API tới Backend
│   │   │   └── ai-demos/
│   │   │       ├── postQuestionsApiCall.ts       # API Chat
│   │   │       └── generateImageApiCall.ts       # API Sinh ảnh
│   │   └── constant.ts      # Khai báo cấu hình PORT kết nối (Đã đồng bộ cổng 5000)
│   │
│   ├── package.json         # Danh sách thư viện Node.js cần thiết
│   └── tailwind.config.ts   # Cấu hình giao diện và CSS Tailwind
│
├── notebooks/                # Các notebook hướng dẫn thử nghiệm API
└── README.md                 # Hướng dẫn sử dụng dự án (Tệp tin này)
```

---

## 🛠️ Hướng Dẫn Cài Đặt & Khởi Chạy

Yêu cầu hệ thống: Máy tính đã cài đặt **Python 3.10+** và **Node.js 18+**.

### 1. Cài đặt & Khởi chạy Backend (Flask)

Di chuyển vào thư mục `backend/`:

```bash
# Tạo môi trường ảo Python
python -m venv .venv

# Kích hoạt môi trường ảo:
# - Trên Windows (PowerShell):
.\.venv\Scripts\Activate.ps1
# - Trên Windows (CMD):
.\.venv\Scripts\activate.bat
# - Trên macOS/Linux:
source .venv/bin/activate

# Cài đặt các thư viện cần thiết
pip install -r requirements.txt

# Tạo tệp cấu hình .env từ tệp mẫu
cp .env.example .env
```

Mở tệp `.env` vừa tạo và điền các API Key của bạn:
```env
OPENAI_API_KEY=sk-or-v1-xxxxxxxxxxxxxxxxxxxxxxxxx  # Key OpenRouter của bạn
STABILITY_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxx # Key Stability AI của bạn
# Tùy chọn: Thêm dòng dưới nếu muốn dùng mô hình cao cấp Ultra (mặc định sẽ dùng Core)
STABILITY_API_URL=https://api.stability.ai/v2beta/stable-image/generate/ultra
PORT=5000
```

Khởi chạy server Flask:
```bash
python run.py
```
*Backend Flask chạy tại địa chỉ:* 👉 **`http://127.0.0.1:5000`**

---

### 2. Cài đặt & Khởi chạy Frontend (Next.js)

Mở một cửa sổ dòng lệnh (Terminal/CMD) khác tại thư mục `frontend/`:

```bash
# Cài đặt các gói phụ thuộc (Dependencies)
npm install

# Khởi chạy server dev Next.js
npm run dev
```
*Frontend Next.js chạy tại địa chỉ:* 👉 **`http://localhost:3000`**

Bây giờ bạn có thể mở trình duyệt truy cập:
*   Trang Chatbot: **`http://localhost:3000/vi/ai/chat/chat-bot`**
*   Trang Sinh ảnh: **`http://localhost:3000/vi/ai/chat/photo`**
