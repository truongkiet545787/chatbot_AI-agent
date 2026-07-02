---
title: Kinal AI Backend
emoji: 🚀
colorFrom: blue
colorTo: indigo
sdk: docker
app_port: 7860
---

# 🚀 Kinal AI Backend

FastAPI Backend cho Trợ lý AI Đa năng (Kinal AI Assistant), tích hợp hệ thống Chatbot RAG, Prompt to Image, Sketch to Image và Phân đoạn đối tượng thông minh (SAM 2/MobileSAM). Dự án được cấu hình tối ưu để triển khai qua Docker lên Hugging Face Spaces hoặc các nền tảng Cloud khác.

---

## 📁 Cấu Trúc Thư Mục Backend

```text
backend/
├── app/
│   ├── routes/
│   │   ├── chat.py             # Router xử lý chat thường và chat RAG tài liệu
│   │   └── image.py            # Router xử lý tạo ảnh, sketch, inpaint và SAM
│   ├── services/
│   │   ├── openai_service.py   # Tích hợp LLM qua LangChain & OpenRouter
│   │   ├── rag_service.py      # Core RAG: Đọc file, Embeddings, Chroma DB, Map-Reduce
│   │   ├── sam_service.py      # Phân đoạn đối tượng SAM (ONNX Runtime / Ultralytics)
│   │   └── stability_service.py# Tích hợp API tạo ảnh & chỉnh sửa của Stability AI
│   └── templates/
│       └── index.html          # Trang UI demo cơ bản đi kèm backend
├── Dockerfile                  # Cấu hình container chạy production
├── requirements.txt            # Danh sách thư viện phụ thuộc
└── run.py                      # File khởi chạy ứng dụng dưới local
```

---

## 🛠️ Công Nghệ & Kỹ Thuật Chuyên Sâu Được Sử Dụng

### 1. Chatbot & Hệ thống RAG (Retrieval-Augmented Generation)
* **Orchestration**: Sử dụng **LangChain** (LangChain Expression Language - LCEL) giúp quản lý chuỗi hội thoại linh hoạt.
* **LLM Connection**: Sử dụng mô hình từ **OpenRouter** (mặc định `openrouter/free` trỏ đến Gemini/Mistral) thông qua lớp `ChatOpenAI`.
* **Bộ nhớ Session (Session-based Memory)**: Quản lý lịch sử hội thoại trên RAM thông qua `InMemoryChatMessageHistory` gắn với từng `session_id`.
* **Trích xuất tài liệu (Document Parsing)**:
  * **PDF**: Trích xuất text thô qua thư viện `pypdf`.
  * **DOCX (Word)**: Sử dụng `python-docx` với thuật toán tự động duyệt cấu trúc phần thân (Paragraphs & Tables) để chuyển đổi các bảng biểu trong file Word thành **Markdown Table**, giúp LLM dễ dàng hiểu cấu trúc dữ liệu bảng.
* **Cắt phân đoạn (Text Splitting)**: Sử dụng `RecursiveCharacterTextSplitter` phân mảnh với `chunk_size=800` ký tự và `chunk_overlap=150` ký tự để giữ nguyên tính toàn vẹn của thông tin.
* **Mô hình Vector & Cơ sở dữ liệu**:
  * Mã hóa vector sử dụng mô hình tiếng Việt chuyên sâu **`keepitreal/vietnamese-sbert`** trên Hugging Face thông qua `HuggingFaceEmbeddings` chạy trực tiếp trên CPU.
  * Vector Store: Sử dụng cơ sở dữ liệu **Chroma DB** (chế độ in-memory) lưu trữ phân vùng theo từng phiên làm việc của người dùng.
* **Phân tuyến ngữ nghĩa (Semantic Routing)**: Prompt hệ thống tự động kiểm tra câu hỏi đầu vào để phân loại: câu hỏi xã giao thông thường sẽ trả lời bằng tri thức chung; câu hỏi liên quan tài liệu sẽ ép mô hình trả lời dựa trên context.
* **Thuật toán tóm tắt văn bản lớn**:
  * *Tài liệu ngắn (< 12.000 ký tự)*: Sử dụng phương pháp **Stuffing** (nạp toàn bộ vào một prompt).
  * *Tài liệu dài (>= 12.000 ký tự)*: Triển khai thuật toán **Map-Reduce thủ công**:
    * **Map Phase**: Chia tài liệu thành các khối lớn ~8.000 ký tự và yêu cầu LLM tóm tắt song song/tuần tự từng khối.
    * **Reduce Phase**: Tổng hợp toàn bộ các bản tóm tắt phân đoạn và gọi LLM lần cuối để viết một bản tóm tắt hệ thống, mạch lạc nhất.

### 2. Prompt to Image & Variating
* **Tối ưu hóa Prompt**: Tích hợp một luồng hội thoại phụ hướng dẫn LLM dịch và mở rộng ý tưởng thô của người dùng thành các đoạn prompt tiếng Anh chất lượng cao, chi tiết (cho Midjourney, DALL-E, Stability).
* **Text-to-Image**: Gọi API **Stable Image Core** của Stability AI để tạo hình ảnh chất lượng từ prompt.
* **Image Variation**: Decode ảnh gốc dạng Base64 được gửi từ Frontend, chuyển đổi sang dữ liệu nhị phân gửi đến Stability API ở chế độ `mode="image-to-image"` để tạo các biến thể ảnh với mức độ biến đổi được cấu hình qua tham số `strength`.

### 3. Sketch to Image (Vẽ phác thảo thành ảnh)
* **Kỹ thuật**: Sử dụng API **Stable Image Control Sketch** của Stability AI.
* **Nguyên lý**: Frontend truyền lên nét vẽ phác thảo (sketch) dưới dạng Base64. Backend decode sang nhị phân và chuyển tiếp qua API kèm theo tham số `control_strength` để ép buộc mô hình bám sát cấu trúc của nét vẽ.

### 4. SAM (Segment Anything Model) & Inpainting
* **Segment bằng Point Prompt**:
  * Tích hợp mô hình **SAM 2** / **MobileSAM** thông qua thư viện `ultralytics`.
  * Hỗ trợ tự động chuyển đổi mô hình PyTorch (`.pt`) sang định dạng **ONNX** để tăng tốc độ suy luận bằng CPU/GPU thông qua `onnxruntime`.
  * **Thuật toán ánh xạ tọa độ (Coordinate Scaling)**: Ánh xạ tọa độ click chuột `(x, y)` từ giao diện hiển thị của người dùng (vốn bị resize trên trình duyệt) về đúng kích thước thực tế của ảnh gốc (`img_width`, `img_height`) trước khi đưa vào mô hình SAM dự đoán.
  * Trả về mặt nạ phân đoạn dưới dạng ảnh RGBA nền trong suốt (`[0,0,0,0]`) và vùng đối tượng màu trắng (`[255,255,255,255]`) mã hóa bằng Base64 PNG.
* **Inpainting (Thay thế đối tượng qua Mask)**:
  * Tích hợp API **Stable Image Edit Inpaint** của Stability AI.
  * **Ràng buộc kích thước API**: Tự động kiểm tra và resize ảnh/mask xuống dưới ngưỡng `2048px` nếu ảnh đầu vào quá lớn (tránh lỗi giới hạn 9 megapixel của API Stability). Sau khi nhận ảnh đã inpaint thành công, thực hiện **upscale ngược trở lại** kích thước gốc ban đầu để giữ độ phân giải ảnh của người dùng.

---

## ⚙️ Hướng Dẫn Cấu Hình Môi Trường (`.env`)

Tạo tệp tin `.env` bên trong thư mục `backend/` với các thông số sau:

```env
# Port chạy ứng dụng (mặc định 5000)
PORT=5000

# API Key cho LLM Chatbot (lấy từ OpenRouter hoặc OpenAI trực tiếp)
OPENAI_API_KEY=your_openai_or_openrouter_api_key

# API Key cho Stability AI (dành cho tạo ảnh, sketch, inpaint)
STABILITY_API_KEY=your_stability_api_key

# Tên mô hình SAM được sử dụng (ví dụ: sam2_l.pt, mobile_sam.pt)
SAM_MODEL_NAME=sam2_l.pt

# Tên mô hình Embedding tiếng Việt dùng cho RAG
RAG_EMBEDDING_MODEL=keepitreal/vietnamese-sbert
```

---

## 🚀 Hướng Dẫn Khởi Chạy Dưới Local

### 1. Cài đặt môi trường ảo và dependencies
Khuyến nghị sử dụng Python 3.10:

```bash
# Di chuyển vào thư mục backend
cd backend

# Tạo môi trường ảo
python -m venv .venv
source .venv/bin/activate  # Trên Windows dùng: .venv\Scripts\activate

# Cài đặt PyTorch CPU trước để cài đặt nhanh hơn
pip install torch torchvision --index-url https://download.pytorch.org/whl/cpu

# Cài đặt các thư viện cần thiết khác
pip install -r requirements.txt
```

### 2. Chạy ứng dụng dưới dạng Local Dev
```bash
python run.py
```
Ứng dụng sẽ chạy tại địa chỉ: `http://localhost:5000`. Bạn có thể truy cập thẳng vào đường dẫn này để sử dụng trang giao diện demo đi kèm.

---

## 🐳 Triển Khai Với Docker (Hugging Face Spaces / Cloud)

Bạn có thể build image Docker từ thư mục gốc của dự án:

```bash
# Build Docker image
docker build -t kinal-ai-backend -f Dockerfile .

# Chạy Docker container cục bộ
docker run -p 7860:7860 --env-file backend/.env kinal-ai-backend
```
