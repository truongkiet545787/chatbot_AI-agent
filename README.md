# 🤖 Trợ Lý Chatbot AI Đa Năng (Next.js + Flask + OpenRouter)

Dự án ứng dụng Trợ lý Chatbot AI toàn diện kết hợp giữa **Next.js** làm Frontend giao diện cao cấp (Premium UI/UX) và **Flask (Python)** làm Backend xử lý logic & kết nối với API **OpenRouter** để gọi các mô hình ngôn ngữ lớn miễn phí chất lượng cao (như Qwen, Llama).

---

## ✨ Các Tính Năng Nổi Bật

* 💬 **Trợ lý Chatbot AI (AI Assistant):** Giao diện chat mượt mà phong cách kính mờ (glassmorphism), hỗ trợ tự động ngắt/khóa ô nhập khi AI đang phản hồi, nút gửi tự động chuyển đổi thành nút **Dừng phản hồi (Stop)** màu đỏ nhấp nháy.
* 📂 **Chatbot RAG (RAG Document Chat):** Trò chuyện hỏi đáp thông minh dựa trên tài liệu tải lên.
* 🎙️ **Nhận dạng giọng nói (Speech Recognition):** Chuyển giọng nói trực tiếp thành văn bản.
* 🔊 **Văn bản thành giọng nói (Text-to-Speech):** Chuyển đổi văn bản viết thành giọng đọc.
* 🎨 **Chỉnh sửa ảnh (Photo Editing):** Các tính năng nâng cao liên quan đến xử lý hình ảnh.
* 🌓 **Chế độ tối (Dark Mode):** Giao diện tương thích hoàn hảo cả chế độ Sáng và Tối.
* 🇻🇳 **Việt hóa 100%:** Giao diện điều hướng, nhãn, nút nhấn và nội dung hỗ trợ đã được chuyển ngữ hoàn toàn sang tiếng Việt.

---

## 📁 Cấu Trúc Dự Án

```text
chatbot_AI-agent/
│
├── backend/              # Mã nguồn Backend (Flask API)
│   ├── templates/        # Giao diện đơn trang Flask (tối giản)
│   ├── .env.example      # Tệp cấu hình môi trường mẫu
│   ├── openai_client.py  # Module kết nối OpenRouter API
│   ├── requirements.txt  # Danh sách thư viện Python cần thiết
│   └── run.py            # Khởi chạy Flask server (Cổng 5000)
│
├── frontend/             # Mã nguồn Frontend (Next.js App)
│   ├── src/              # Các component React, Pages và Routing
│   ├── package.json      # Danh sách thư viện Node.js cần thiết
│   └── tailwind.config.ts# Cấu hình giao diện và giao thoa CSS
│
├── .gitignore            # Cấu hình bỏ qua các tệp nhạy cảm (như .env, node_modules, notebooks/)
└── README.md             # Hướng dẫn sử dụng dự án (Tệp tin này)
```

---

## 🛠️ Hướng Dẫn Cài Đặt & Chạy Thử

Yêu cầu môi trường: **Python 3.10+** và **Node.js 18+** đã cài đặt trên máy.

### 1. Cài đặt & Khởi chạy Backend (Flask)

Mở một cửa sổ dòng lệnh (Terminal/CMD) mới tại thư mục gốc của dự án:

```bash
# Di chuyển vào thư mục backend
cd backend

# Tạo môi trường ảo Python
python -m venv .venv

# Kích hoạt môi trường ảo:
# - Trên Windows (PowerShell):
.\.venv\Scripts\Activate.ps1
# - Trên macOS/Linux:
source .venv/bin/activate

# Cài đặt các thư viện cần thiết
pip install -r requirements.txt

# Tạo tệp cấu hình môi trường (.env) từ tệp mẫu
cp .env.example .env

# Mở tệp .env vừa tạo và nhập OpenRouter API Key của bạn:
# OPENAI_API_KEY=sk-or-v1-xxxxxxxxxxxxxxxxxxxxxxxxx

# Khởi chạy server Flask
python run.py
```
*Backend Flask sẽ chạy mặc định tại địa chỉ:* 👉 **`http://127.0.0.1:5000`**

---

### 2. Cài đặt & Khởi chạy Frontend (Next.js)

Mở một cửa sổ dòng lệnh (Terminal/CMD) thứ hai tại thư mục gốc của dự án:

```bash
# Di chuyển vào thư mục frontend
cd frontend

# Cài đặt các gói phụ thuộc (Dependencies)
npm install

# Khởi chạy server dev Next.js
npm run dev
```
*Frontend Next.js sẽ chạy mặc định tại địa chỉ:* 👉 **`http://localhost:3000`**

Mở trình duyệt, truy cập vào `http://localhost:3000` để bắt đầu trải nghiệm toàn bộ hệ thống chatbot AI đa năng với giao diện tiếng Việt cao cấp mới.
