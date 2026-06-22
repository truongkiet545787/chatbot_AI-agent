# 🤖 AI Chatbot Demo (Flask + OpenRouter)

Dự án chatbot AI đơn giản sử dụng **Flask (Python)** làm Backend và giao diện **HTML/JS (AI tự tạo)** làm Frontend. Hệ thống kết nối với **OpenRouter** để truy cập các mô hình ngôn ngữ lớn miễn phí (như Qwen, Llama) và có khả năng ghi nhớ ngữ cảnh cuộc trò chuyện.

---

## ✨ Tính năng nổi bật
* **Giao diện Chat:** Giao diện tối giản, trực quan được sinh tự động bởi AI hỗ trợ tương tác dễ dàng.
* **Quản lý ngữ cảnh (Context):** Tự động lưu trữ và gửi kèm lịch sử trò chuyện lên API để AI hiểu ngữ cảnh hội thoại.
* **Bảo mật:** Cấu hình API Key qua file `.env`, tự động bỏ qua khi đẩy code lên GitHub bằng file `.gitignore`.
* **Sử dụng API miễn phí:** Kết nối tới cổng OpenRouter qua dòng model tự động chọn nguồn miễn phí tốt nhất (`openrouter/free`).

---

## 📁 Cấu trúc thư mục dự án

```text
chatbot_AI-agent/
│
├── templates/
│   └── index.html      # Giao diện chính (Frontend được AI sinh tự động)
│
├── .env.example        # File cấu hình mẫu
├── .gitignore          # Cấu hình bỏ qua các file nhạy cảm khi đẩy lên GitHub
├── openai_client.py    # Class kết nối với OpenRouter API
├── requirements.txt    # Các thư viện Python cần cài đặt
├── run.py              # File khởi chạy server Flask
└── README.md           # Hướng dẫn sử dụng
```

---

## 🛠️ Hướng dẫn cài đặt và chạy thử

### Bước 1: Tải mã nguồn về máy
Mở Terminal/CMD tại thư mục bạn muốn lưu dự án và chạy lệnh:
```bash
git clone https://github.com/truongkiet545787/chatbot_AI-agent.git
cd chatbot_AI-agent
```

### Bước 2: Cài đặt thư viện
Chạy lệnh cài đặt các thư viện cần thiết:
```bash
pip install -r requirements.txt
```

### Bước 3: Cấu hình API Key
1. Copy file `.env.example` và đổi tên thành `.env`:
   * **Windows:** `copy .env.example .env`
   * **macOS/Linux:** `cp .env.example .env`
2. Mở file `.env` và điền API Key OpenRouter của bạn:
   ```env
   OPENAI_API_KEY=sk-or-v1-xxxxxxxxxxxxxxxxx
   ```

### Bước 4: Chạy dự án
Chạy lệnh khởi động:
```bash
python run.py
```
Sau đó mở trình duyệt và truy cập:
👉 **[http://localhost:5000](http://localhost:5000)**

---

## 📖 Giải thích cách hoạt động của Code

* **`openai_client.py`**: Chứa class `OpenAIClient` để cấu hình kết nối API của OpenRouter và gọi mô hình miễn phí.
* **`run.py`**: Chạy server Flask điều phối, định tuyến trang chủ để hiển thị giao diện HTML và cổng API `/chat` để nhận/gửi dữ liệu.
* **`templates/index.html` (AI tự tạo)**: Quản lý một mảng dữ liệu tin nhắn bằng JavaScript. Khi người dùng gửi câu hỏi, nó sẽ thêm vào mảng này và truyền toàn bộ lên backend để gửi cho AI nhằm giữ ngữ cảnh trò chuyện.
