# 🤖 Trợ Lý Chatbot AI Đa Năng (Next.js + Flask + OpenRouter)

Dự án ứng dụng Trợ lý Chatbot AI toàn diện kết hợp giữa **Next.js** làm Frontend và **Flask (Python)** làm Backend để gọi các mô hình ngôn ngữ lớn từ **OpenRouter**.

---

## ✨ Các Chức Năng Cốt Lõi

* 💬 **Trợ lý Chatbot AI (AI Assistant):** Trò chuyện hỏi đáp trực tiếp với AI có ghi nhớ ngữ cảnh cuộc trò chuyện.
* 📂 **Chatbot RAG (RAG Document Chat):** Trò chuyện hỏi đáp thông minh dựa trên tài liệu tải lên (Đang phát triển - Update sau).
* 🎙️ **Nhận dạng giọng nói (Speech Recognition):** Chuyển giọng nói trực tiếp thành văn bản (Đang phát triển - Update sau).
* 🔊 **Văn bản thành giọng nói (Text-to-Speech):** Chuyển đổi văn bản viết thành giọng đọc (Đang phát triển - Update sau).
* 🎨 **Chỉnh sửa ảnh (Photo Editing):** Các chức năng xử lý hình ảnh (Đang phát triển - Update sau).

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
│   └── tailwind.config.ts# Cấu hình giao diện và CSS
│
├── .gitignore            # Cấu hình bỏ qua các tệp nhạy cảm (như .env, node_modules, notebooks/)
└── README.md             # Hướng dẫn sử dụng dự án (Tệp tin này)
```

---

## 🛠️ Hướng Dẫn Cài Đặt & Khởi Chạy

Yêu cầu hệ thống: Máy tính đã cài đặt **Python 3.10+** và **Node.js 18+**.

### 1. Cài đặt & Khởi chạy Backend (Flask)

Mở cửa sổ dòng lệnh (Terminal/CMD) tại thư mục `backend/`:

```bash
# Tạo môi trường ảo Python
python -m venv .venv

# Kích hoạt môi trường ảo:
# - Trên Windows (PowerShell):
.\.venv\Scripts\Activate.ps1
# - Trên macOS/Linux:
source .venv/bin/activate

# Cài đặt các thư viện cần thiết
pip install -r requirements.txt

# Tạo tệp cấu hình .env từ tệp mẫu
cp .env.example .env

# Mở tệp .env và điền OpenRouter API Key của bạn:
# OPENAI_API_KEY=sk-or-v1-xxxxxxxxxxxxxxxxxxxxxxxxx

# Khởi chạy server Flask
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
