# 🤖 Trợ Lý Chatbot AI Đa Năng (Next.js + FastAPI + SAM + OpenRouter + Stability AI)

Dự án ứng dụng Trợ lý Chatbot AI toàn diện kết hợp giữa **Next.js** làm Frontend và **FastAPI (Python)** làm Backend để gọi các mô hình ngôn ngữ lớn từ **OpenRouter**, tạo/chỉnh sửa hình ảnh nghệ thuật từ **Stability AI**, và phân vùng hình ảnh tự động siêu nhanh với **SAM (Segment Anything Model)** trên GPU.

---

## ✨ Các Chức Năng Cốt Lõi

* 💬 **Trợ lý Chatbot AI (AI Assistant):** Trò chuyện hỏi đáp trực tiếp với AI có ghi nhớ ngữ cảnh cuộc trò chuyện (sử dụng mô hình miễn phí từ OpenRouter).
* 🎨 **Tạo ảnh nghệ thuật (Text-to-Image):** Tạo ảnh chất lượng cao trực tiếp từ mô tả văn bản (sử dụng Stability AI Stable Image API), tích hợp hoàn chỉnh và hiển thị kết quả Base64 ngay trên giao diện Web.
* 🎯 **Phân vùng ảnh thông minh (SAM Segment Anything):** Chọn và tách vật thể tự động theo điểm click trên ảnh với tốc độ cực nhanh nhờ tích hợp mô hình SAM trên GPU.
* 🛠️ **Thay thế vật thể (`replace-object`):** Thay thế vùng ảnh chọn bởi SAM bằng các vật thể mới theo prompt tả văn bản.
* 🚀 **Tích hợp Google Colab GPU + Ngrok:** Hỗ trợ chạy toàn bộ phần AI nặng (SAM, PyTorch) trên GPU miễn phí của Colab và mở tunnel công khai qua Ngrok kết nối mượt mà với máy cục bộ.

---

## 📁 Cấu Trúc Dự Án

```text
chatbot_AI-agent/
│
├── backend/                  # Mã nguồn Backend (FastAPI API)
│   ├── app/                  # Thư mục ứng dụng chính
│   │   ├── __init__.py      # Application Factory, cấu hình FastAPI, CORS và Routes
│   │   ├── routes/          # Các định tuyến API (Controllers)
│   │   │   ├── chat.py      # Route xử lý chat văn bản (/chat)
│   │   │   └── image.py     # Route xử lý sinh ảnh & SAM (/ai-demos/...)
│   │   └── services/        # Các tích hợp API bên thứ ba & Model (Services)
│   │       ├── openai_service.py    # Dịch vụ kết nối OpenRouter LLM
│   │       ├── stability_service.py # Dịch vụ sinh ảnh bất đồng bộ qua Stability AI
│   │       └── sam_service.py       # Dịch vụ phân vùng ảnh Segment Anything Model
│   │
│   ├── .env                 # Cấu hình môi trường chứa các khóa API (Không đẩy lên Git)
│   ├── .env.example         # Tệp cấu hình môi trường mẫu
│   ├── requirements.txt     # Các thư viện Python cần thiết (FastAPI, uvicorn, ultralytics...)
│   └── run.py               # Tệp tin chạy chính của Backend (Cổng 5000)
│
├── frontend/                 # Mã nguồn Frontend (Next.js App Router)
│   ├── src/
│   │   ├── app/[locale]/ai/ # Các trang giao diện ứng dụng AI (Chat, Photo, Replace Object...)
│   │   ├── apiCalls/        # Các hàm gọi API tới Backend
│   │   └── constant.ts      # Khai báo cấu hình PORT kết nối
│   │
│   ├── .env.development     # Cấu hình URL kết nối Backend ở môi trường dev
│   ├── package.json         # Danh sách thư viện Node.js cần thiết
│   └── tailwind.config.ts   # Cấu hình giao diện và CSS Tailwind
│
├── notebooks/                # Notebooks hướng dẫn thử nghiệm API & Chạy Colab GPU
│   └── run_backend_colab.ipynb # Hướng dẫn chạy Backend FastAPI + SAM trên Google Colab qua Ngrok
└── README.md                 # Hướng dẫn sử dụng dự án (Tệp tin này)
```

---

## 🛠️ Hướng Dẫn Cài Đặt & Khởi Chạy

Yêu cầu hệ thống: Máy tính đã cài đặt **Python 3.10+** và **Node.js 18+**.

### 1. Cài đặt & Khởi chạy Backend (FastAPI) trên Máy cục bộ (Local)

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
PORT=5000
SAM_MODEL_NAME=mobile_sam.pt
```

Khởi chạy server FastAPI với Uvicorn:
```bash
python run.py
```
*Backend FastAPI chạy tại địa chỉ:* 👉 **`http://127.0.0.1:5000`** (Tài liệu Swagger UI tại `http://127.0.0.1:5000/docs`).

---

### 2. Hướng dẫn Chạy Backend trên Google Colab (Tận dụng GPU + Ngrok)

Nếu máy cá nhân không có GPU NVIDIA để chạy mô hình SAM, bạn có thể chạy Backend trên Google Colab:

1. Mở file `notebooks/run_backend_colab.ipynb` và tải lên Google Colab (hoặc tạo notebook mới trên Colab).
2. Đảm bảo đã bật GPU trên Colab: **Runtime** -> **Change runtime type** -> Chọn **T4 GPU**.
3. Điền `NGROK_AUTHTOKEN` lấy từ [dashboard.ngrok.com](https://dashboard.ngrok.com/get-started/your-authtoken) vào ô cấu hình môi trường.
4. Chạy ô lệnh khởi động Server & Ngrok. Nhận URL công khai có dạng: `https://xxxx.ngrok-free.dev`.
5. Dán URL này vào file `frontend/.env.development` để Frontend cục bộ kết nối thẳng tới GPU của Colab!

---

### 3. Cài đặt & Khởi chạy Frontend (Next.js)

Mở một cửa sổ dòng lệnh (Terminal/CMD) khác tại thư mục `frontend/`:

```bash
# Cài đặt các gói phụ thuộc (Dependencies)
npm install

# Khởi chạy server dev Next.js
npm run dev
```
*Frontend Next.js chạy tại địa chỉ:* 👉 **`http://localhost:3000`**

Bây giờ bạn có thể mở trình duyệt truy cập các trang trải nghiệm AI!

---

## 🌐 Hướng dẫn Triển khai (Deployment)

### Triển khai Frontend lên Netlify
Dự án đã được cấu hình tệp `netlify.toml` ở thư mục gốc để Netlify tự động nhận diện và build Next.js:

1. Đẩy dự án lên kho GitHub của bạn.
2. Truy cập [Netlify](https://www.netlify.com/) và liên kết với tài khoản GitHub của bạn.
3. Chọn repo `chatbot_AI-agent`. Netlify sẽ tự động nhận diện cấu hình trong `netlify.toml`.
4. **Cấu hình biến môi trường (Environment Variables):**
   Trong phần cấu hình Site settings -> Environment variables trên Netlify, thêm biến sau:
   - `NEXT_PUBLIC_API_URL`: Nhập địa chỉ URL của backend (hoặc URL Ngrok / Render / Koyeb).
