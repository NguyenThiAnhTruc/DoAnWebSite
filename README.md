# 🎓 CỔNG THÔNG TIN SỰ KIỆN TRƯỜNG HỌC

> 📚 *Dự án học phần: Phát triển Ứng dụng Web Nâng Cao – Trường Đại học Đà Lạt*  
> 👨‍🏫 *Giảng viên hướng dẫn:* Thầy **Nguyễn Trọng Hiếu**

---

## 🚀 1. Giới thiệu

Dự án **“Cổng Thông Tin Sự Kiện Trường Học”** được phát triển nhằm hỗ trợ sinh viên, giảng viên và quản trị viên trong việc **tổ chức, đăng ký, điểm danh và thống kê các sự kiện học thuật** tại **Trường Đại học Đà Lạt**.

Hệ thống hoạt động trên nền web, có **giao diện thân thiện**, dễ sử dụng, hỗ trợ **truy cập trên cả máy tính và thiết bị di động**.

---

## 🧩 2. Công nghệ sử dụng

- **Frontend:** HTML, CSS, JavaScript  
- **Backend:** Node.js + Express.js (theo mô hình MVC)  
- **Database:** Microsoft SQL Server  
- **Thư viện và dịch vụ hỗ trợ:**
  - 📧 **Nodemailer / SendGrid:** gửi email xác nhận & thông báo sự kiện.  
  - 📊 **Chart.js:** trực quan hóa dữ liệu thống kê.  
  - 🔐 **Bcrypt:** mã hóa mật khẩu người dùng.  
  - 🪪 **JWT:** xác thực đăng nhập bằng token an toàn.  
  - ⚙️ **PM2:** giám sát & tự động khởi động lại tiến trình Node.js khi có lỗi.

---

## 🧰 3. Cài đặt và chạy thử

### ⚙️ Yêu cầu môi trường
- Node.js **(v18 hoặc mới hơn)**  
- SQL Server **(đã cài đặt và cấu hình sẵn)**  

### 💻 Các bước cài đặt
```bash
# 1️⃣ Cài đặt các thư viện cần thiết
npm install

# 2️⃣ Chạy server
node server.js
 ```
---
## 🎯 4. Mục tiêu và chức năng chính

Hệ thống được phát triển nhằm **số hóa quy trình quản lý sự kiện học đường**, giúp giảm tải công việc thủ công, tăng tính minh bạch và chính xác.

### 👩‍🎓 Sinh viên
- Xem, tìm kiếm và lọc sự kiện.  
- Đăng ký tham gia, nhận email xác nhận.  
- Điểm danh bằng **mã QR code**.  
- Xem lịch sử tham gia và thông báo.

### 👨‍🏫 Giảng viên
- Gửi yêu cầu tạo sự kiện cho quản trị viên.  
- Theo dõi và quản lý sự kiện của mình.  
- Xem danh sách sinh viên đăng ký.

### 🧑‍💼 Quản trị viên
- Quản lý người dùng và sự kiện.  
- Duyệt, chỉnh sửa hoặc xóa sự kiện.  
- Xuất **báo cáo Excel**, xem biểu đồ thống kê.  
- Gửi thông báo hàng loạt qua email.  

---

## 🔒 5. API và bảo mật

- Giao tiếp giữa **frontend** và **backend** thông qua **API RESTful**.  
- Sử dụng **JWT (JSON Web Token)** để xác thực người dùng và bảo vệ phiên đăng nhập.  
- Mật khẩu được **mã hóa bằng Bcrypt** trước khi lưu vào cơ sở dữ liệu.  
- Phân quyền người dùng theo vai trò (**Role-Based Access Control**) giúp tránh truy cập trái phép.  
- Gửi **email xác nhận và nhắc nhở sự kiện tự động** thông qua **Nodemailer**.  
- Dữ liệu có thể được truyền tải qua **HTTPS** trong phiên bản triển khai thực tế.

---

## 🧭 6. Hướng phát triển

- 🗺️ **Tích hợp định vị GPS:** Xác minh vị trí người điểm danh trong khu vực sự kiện.  
- 🔐 **Cải thiện bảo mật:** Hỗ trợ đăng nhập bằng OAuth2 hoặc SSO, xác thực hai lớp (2FA).  
- ⚡ **Tối ưu hiệu năng:** Nâng cao tốc độ xử lý và giảm tải truy vấn SQL.  
- 🎨 **Nâng cấp giao diện:** Bổ sung chế độ sáng/tối (Dark/Light Mode), tương thích thiết bị di động.  
- 🔗 **Mở rộng hệ thống:** Kết nối với phần mềm quản lý đào tạo hoặc ứng dụng di động của nhà trường.  

---

## 👨‍💻 7. Tác giả
| **Ngô Văn Phong** 
| **Nguyễn Thị Ánh Trúc** 
| **Đặng Thị Xuân Lộc** 
---

🏫 **Trường Đại học Đà Lạt – Khoa Công nghệ Thông tin**  
📅 *Năm học 2025*  
👨‍🏫 *Giảng viên hướng dẫn:* Thầy **Nguyễn Trọng Hiếu**

---

