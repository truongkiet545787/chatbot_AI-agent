# 🤰 MedPregnancy - Nền Tảng Chăm Sóc Thai Kỳ Toàn Diện

MedPregnancy là một nguyên mẫu ứng dụng công nghệ y tế (HealthTech 4.0) toàn diện, tích hợp trí tuệ nhân tạo (AI), hệ thống hồ sơ sức khỏe điện tử (EHR) thông minh và đặt lịch khám từ xa (Telehealth). Dự án được thiết kế dưới dạng **Trang web tĩnh (Static Web Page)** kết hợp **Netlify Functions (Serverless Backend)**, tối ưu hóa để triển khai lên Netlify bảo mật 100%.

Dự án này sử dụng mô hình ngôn ngữ lớn **Gemini 1.5 Flash** (thông qua OpenRouter API) làm bộ não của chatbot sản khoa tư vấn ân cần cho mẹ bầu.

---

## 📁 Cấu Trúc Dự Án

```text
phamacy/
│
├── .env                  # Lưu API Key OpenRouter (chạy thử nghiệm local)
├── netlify.toml          # Tệp cấu hình deployment và định tuyến functions của Netlify
├── index.html            # Trang giao diện chính MedPregnancy (Đầy đủ 4 Module)
├── README.md             # Hướng dẫn chi tiết sử dụng & deploy này (Tệp tin này)
└── netlify/
    └── functions/
        └── chat.js       # Node.js Serverless Function chuyển tiếp API chat bảo mật
```

---

## ✨ 4 Module Tương Tác Cốt Lõi

### 1. Hành Trình Bé Lớn Khôn (Module 1 - Trợ lý thai kỳ AI)
* **Cách sử dụng:** Kéo thanh trượt **Tuần Thai Kỳ** (từ tuần 4 đến tuần 40, bước nhảy mỗi 4 tuần).
* **Đặc điểm nổi bật:**
  - Cập nhật hình ảnh đại diện của thai nhi dưới dạng **đồ họa SVG vẽ bằng mã nguồn** tương đương kích cỡ các loại quả (Hạt anh túc 🪹, Mâm xôi 🍓, Chanh tây 🍋, Quả bơ 🥑, Quả chuối 🍌, Dưa lưới 🍈, Cà tím 🍆, Bí đỏ 🎃, Cải romaine 🥬, Dưa hấu 🍉).
  - Tự động thay đổi Trimester (Tam cá nguyệt), Chiều dài, Cân nặng, Bộ phận phát triển nổi bật của bé.
  - Đưa ra lời khuyên dinh dưỡng và xét nghiệm lâm sàng tương ứng theo chuẩn hướng dẫn của WHO.

### 2. Chatbot Sàng Lọc Triệu Chứng & Cảnh Báo (Module 2)
* **Cách sử dụng:** Bạn có thể nhập triệu chứng bất kỳ vào ô chat (ví dụ: *"tôi bị đau lưng"*, *"mẹ bầu chảy máu nhẹ"*,...) hoặc click nhanh các triệu chứng gợi ý ở thanh công cụ.
* **Cơ chế hoạt động:**
  - **Chế độ Trực tuyến (Gemini AI):** Chatbot tự động kết nối với API của Gemini để phản hồi một cách ân cần, giải đáp khoa học mọi thắc mắc của bạn.
  - **Chế độ Ngoại tuyến (Fallback):** Nếu chạy offline, chatbot sẽ tự động dùng bộ lọc từ khóa cục bộ để phản hồi lời khuyên y tế chuẩn soạn sẵn.
  - **Hệ thống Cảnh báo Y khoa (Clinical Warning):** Tự động phân cấp rủi ro dựa trên triệu chứng:
    - 🔴 **Nguy cấp (Đỏ):** Các triệu chứng như *chảy máu, đau đầu dữ dội, mờ mắt, rỉ ối, đau bụng quặn*. Hệ thống hiện cảnh báo khẩn cấp và cung cấp liên kết đặt hẹn trực tiếp với bác sĩ.
    - 🟡 **Cần chú ý (Vàng):** Các biểu hiện như *nghén nặng, nôn mửa, phù nề chân tay, chuột rút*.
    - 🟢 **An toàn (Xanh):** Các thay đổi sinh lý bình thường như *đau lưng nhẹ, thèm ăn, đầy hơi, mệt mỏi nhẹ*.

### 3. Sổ Sức Khỏe EHR (Module 3)
* **Cách sử dụng:** Di chuyển 2 thanh kéo **Huyết áp Tâm thu** và **Mức Tăng Cân Nặng** của mẹ.
* **Đặc điểm nổi bật:**
  - **Biểu đồ động Chart.js:** Tự động vẽ đường xu hướng tăng trưởng và cập nhật điểm dữ liệu mới nhất tương ứng với giá trị thanh kéo của bạn.
  - **Nút chuyển đổi linh hoạt:** Chọn xem biểu đồ "Huyết Áp" hoặc "Cân Nặng" với các thiết kế màu sắc chuyên biệt.
  - **Đánh giá Huyết áp:** Tự động hiện cảnh báo đỏ nếu Huyết áp tâm thu đạt ngưỡng nguy hiểm (>= 140 mmHg - nguy cơ tiền sản giật) hoặc thấp (<= 90 mmHg).

### 4. Đặt Lịch Khám Telehealth 24/7 (Module 4)
* **Cách sử dụng:** Điền Họ tên mẹ, Số điện thoại, chọn Bác sĩ (Bệnh viện Phụ sản TW, Từ Dũ, Hùng Vương) và khung giờ hẹn.
* **Đặc điểm nổi bật:** Bấm nút đăng ký sẽ kích hoạt màn hình thông báo Đăng ký thành công sinh động, hiển thị chi tiết phòng khám ảo mà không reload lại trang.

---

## 💻 Hướng Dẫn Chạy & Thử Nghiệm Dưới Local

### Cách 1: Chạy nhanh (Offline / Giả lập)
- Bạn chỉ cần kích đúp chuột vào file **`index.html`** hoặc dùng extension **Live Server** trong VS Code để xem giao diện tĩnh. Tất cả tính năng trượt chỉ số, biểu đồ, đặt lịch và chatbot giả lập đều hoạt động bình thường.

### Cách 2: Chạy đầy đủ tính năng AI (Online trực tiếp qua CLI)
Nếu muốn chatbot gọi đến Gemini AI thật ngay dưới local:
1. Mở cửa sổ dòng lệnh tại thư mục `phamacy/`.
2. Khởi chạy server giả lập Netlify:
   ```bash
   netlify dev
   ```
3. Công cụ sẽ tự động mở trang web tại địa chỉ: **`http://localhost:8888`**
4. Giờ đây chatbot sẽ có trạng thái **Gemini AI** (màu xanh lá) và trả lời động thông qua API Key lưu trong file `.env`.

---

## 🚀 Hướng Dẫn Deploy Lên GitHub & Netlify (Online 24/7)

### Bước 1: Đẩy toàn bộ mã nguồn lên GitHub
Mở cửa sổ dòng lệnh tại thư mục `phamacy/` và thực hiện các lệnh sau để đẩy code lên kho lưu trữ GitHub của bạn:
```bash
# Khởi tạo Git (nếu chưa có)
git init

# Liên kết với kho lưu trữ GitHub của bạn
git remote add origin https://github.com/truongkiet545787/phamacy.git

# Đưa các file vào hàng chờ commit
git add .

# Tạo commit đầu tiên
git commit -m "Initialize MedPregnancy prototype on Netlify"

# Đẩy code lên nhánh main
git branch -M main
git push -u origin main
```

---

### Bước 2: Deploy lên Netlify hoàn toàn miễn phí
1. Truy cập trang chủ [Netlify](https://app.netlify.com/) và đăng nhập tài khoản của bạn.
2. Nhấp vào nút **Add new site** -> Chọn **Import from Git**.
3. Chọn nhà cung cấp **GitHub**, tìm và bấm vào repository **`phamacy`**.
4. Netlify sẽ tự động đọc cấu hình build trong file `netlify.toml` có sẵn trong repo.
5. Nhấp vào nút **Deploy phamacy**. Trang web tĩnh của bạn sẽ được kích hoạt trực tuyến sau vài giây.

---

### Bước 3: Thiết lập API Key bảo mật cho Chatbot
Để chatbot hoạt động với AI thật trên trang web Netlify mà không làm lộ key:
1. Tại trang quản trị dự án trên Netlify, đi tới **Site Configuration** -> **Environment variables** (Biến môi trường).
2. Nhấp chọn **Add a variable** -> Chọn **Import a .env file** hoặc nhập thủ công:
   - **Key:** `OPENAI_API_KEY`
   - **Value:** `<Nhập API Key OpenRouter của bạn tại đây>`
3. Lưu lại biến môi trường.
4. Đi tới mục **Deploys** trên thanh điều hướng -> Bấm nút **Trigger deploy** -> Chọn **Clear cache and deploy site** để cập nhật khóa môi trường mới.

*Bây giờ, trang web MedPregnancy của bạn đã chính thức chạy online 24/7 với chatbot AI thật thông minh bảo mật tuyệt đối!*
