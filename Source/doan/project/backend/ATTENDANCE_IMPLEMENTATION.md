# Hệ thống Điểm danh - Triển khai hoàn chỉnh

## 📋 Tổng quan
Hệ thống điểm danh cho phép:
- **Student**: Điểm danh qua QR code tại `QRAttendance_new.html`
- **Admin/Teacher**: Quản lý điểm danh tại `AttendanceManager.html`

## 🔄 Luồng hoạt động

### 1. Student điểm danh QR
```
QRAttendance_new.html
  ↓ Click "Quét QR"
  ↓ Kiểm tra đăng nhập (localStorage)
  ↓ POST /api/attendance/qr-checkin
  ↓ Lưu vào EventAttendance table
  ↓ Thông báo thành công
  ↓ Reload trang sau 2 giây
```

### 2. Admin quản lý điểm danh
```
AttendanceManager.html
  ↓ Chọn sự kiện từ dropdown
  ↓ GET /api/events/{eventId}/registrations
  ↓ GET /api/attendance/event/{eventId}
  ↓ Hiển thị danh sách sinh viên
  ↓ Click nút điểm danh (Present/Late/Absent)
  ↓ POST /api/attendance/manual
  ↓ Cập nhật EventAttendance table
  ↓ Reload danh sách tự động
```

## 🛠 API Endpoints

### 1. GET `/api/attendance/event/:eventId`
**Mục đích**: Lấy danh sách đã điểm danh cho một sự kiện

**Response**:
```json
{
  "success": true,
  "message": "Attendance list retrieved",
  "attendance": [
    {
      "attendanceId": 1,
      "eventId": 1,
      "userId": 5,
      "registrationId": 10,
      "userName": "Nguyễn Văn A",
      "studentId": "SV001",
      "email": "a@example.edu",
      "phone": "0901234567",
      "status": "present",
      "checkInTime": "2025-10-14T10:30:00Z",
      "checkInMethod": "qr_code"
    }
  ]
}
```

### 2. POST `/api/attendance/qr-checkin`
**Mục đích**: Student điểm danh qua QR code

**Request**:
```json
{
  "eventId": 1,
  "userId": 5,
  "qrCode": "QR_1_5_1697280000000"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Điểm danh thành công",
  "attendance": {
    "attendanceId": 15,
    "registrationId": 10,
    "eventId": 1,
    "userId": 5,
    "status": "present",
    "checkInTime": "2025-10-14T10:30:00Z",
    "method": "qr_code"
  }
}
```

**Errors**:
- 400: "Bạn chưa đăng ký sự kiện này"
- 400: "Bạn đã điểm danh cho sự kiện này rồi"

### 3. POST `/api/attendance/manual`
**Mục đích**: Admin/Teacher điểm danh thủ công

**Request**:
```json
{
  "eventId": 1,
  "userId": 5,
  "status": "present"  // hoặc "absent", "late"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Attendance marked successfully",
  "attendance": {
    "attendanceId": 16,
    "registrationId": 11,
    "eventId": 1,
    "userId": 6,
    "status": "late",
    "checkInTime": "2025-10-14T10:35:00Z",
    "method": "manual"
  }
}
```

### 4. GET `/api/attendance/stats/event/:eventId`
**Mục đích**: Lấy thống kê điểm danh

**Response**:
```json
{
  "success": true,
  "message": "Attendance statistics retrieved",
  "statistics": {
    "eventId": 1,
    "totalRegistered": 50,
    "present": 40,
    "absent": 3,
    "late": 2,
    "notMarked": 5,
    "percentage": 80
  }
}
```

## 💾 Database Schema

### EventAttendance Table
```sql
CREATE TABLE EventAttendance (
    attendance_id INT PRIMARY KEY IDENTITY(1,1),
    registration_id INT NOT NULL,              -- FK to EventRegistrations
    check_in_time DATETIME2,
    check_out_time DATETIME2,
    attendance_status NVARCHAR(20) DEFAULT 'absent' 
        CHECK (attendance_status IN ('present', 'absent', 'late', 'partial')),
    check_in_method NVARCHAR(20) DEFAULT 'manual' 
        CHECK (check_in_method IN ('manual', 'qr_code', 'nfc', 'facial_recognition')),
    check_in_location NVARCHAR(200),
    notes NTEXT,
    verified_by_id INT,
    created_at DATETIME2 DEFAULT GETDATE(),
    
    FOREIGN KEY (registration_id) REFERENCES EventRegistrations(registration_id),
    FOREIGN KEY (verified_by_id) REFERENCES Users(user_id)
);
```

**Lưu ý**: Bảng sử dụng `registration_id` thay vì `event_id` + `user_id` riêng biệt.

## 📄 Frontend Files

### 1. AttendanceManager.html
**Đường dẫn**: `/AttendanceManager.html` hoặc `/attendance`

**Chức năng**:
- Dropdown chọn sự kiện (load từ `/api/events`)
- Hiển thị danh sách sinh viên đã đăng ký
- Hiển thị trạng thái điểm danh (Present/Absent/Late/Chưa điểm danh)
- Thống kê: Tổng số, Có mặt, Vắng, Đi muộn, Chưa điểm danh
- Tìm kiếm theo tên/MSSV
- Lọc theo trạng thái
- Điểm danh từng sinh viên (3 nút: Present/Late/Absent)
- Điểm danh tất cả (nút "Điểm danh tất cả")
- Xuất Excel (đang phát triển)
- QR Code modal (demo)

**API Calls**:
- `loadEvents()`: GET `/api/events`
- `loadRegistrations(eventId)`: GET `/api/events/${eventId}/registrations`
- `loadAttendance(eventId)`: GET `/api/attendance/event/${eventId}`
- `markAttendance(eventId, userId, status)`: POST `/api/attendance/manual`
- `markAllPresent()`: Loop POST `/api/attendance/manual` cho tất cả

### 2. QRAttendance_new.html
**Đường dẫn**: `/QRAttendance_new.html`

**Chức năng**:
- Giao diện quét QR code (demo với nút Camera)
- Kiểm tra đăng nhập trước khi điểm danh
- Redirect đến `/QRCheckInPage.html` nếu chưa đăng nhập
- Gọi API điểm danh khi quét thành công
- Hiển thị thông báo kết quả
- Reload trang sau khi điểm danh thành công

**API Calls**:
- `processQRAttendance(eventId)`: POST `/api/attendance/qr-checkin`

## 🔐 Authentication
Cả hai trang đều sử dụng localStorage để lấy thông tin user:
```javascript
const user = JSON.parse(localStorage.getItem('user') || localStorage.getItem('currentUser'));
const token = localStorage.getItem('token') || localStorage.getItem('auth_token_user');
```

## 🧪 Testing

### Test Student điểm danh QR
1. Đăng nhập với tài khoản student
2. Truy cập `/QRAttendance_new.html`
3. Click nút Camera
4. Sau 2 giây sẽ mô phỏng quét QR với eventId=1
5. Kiểm tra:
   - Thông báo "Điểm danh thành công"
   - Màu nền chuyển sang xanh
   - Trang reload sau 2 giây
6. Kiểm tra database:
```sql
SELECT * FROM EventAttendance 
WHERE registration_id IN (
    SELECT registration_id FROM EventRegistrations WHERE user_id = <student_user_id>
)
ORDER BY check_in_time DESC
```

### Test Admin quản lý điểm danh
1. Đăng nhập với tài khoản admin
2. Truy cập `/AttendanceManager.html`
3. Chọn sự kiện từ dropdown
4. Kiểm tra danh sách sinh viên hiển thị
5. Click nút "Có mặt" cho một sinh viên
6. Kiểm tra:
   - Thông báo "Đã cập nhật điểm danh"
   - Badge trạng thái chuyển sang "Có mặt" màu xanh
   - Số liệu thống kê cập nhật
7. Test tìm kiếm và lọc
8. Test "Điểm danh tất cả"

## 🐛 Known Issues & Solutions

### Issue 1: Sinh viên chưa đăng ký sự kiện
**Triệu chứng**: API trả về "Bạn chưa đăng ký sự kiện này"
**Giải pháp**: Đảm bảo student đã đăng ký sự kiện qua `/api/events/:id/register`

### Issue 2: Điểm danh 2 lần
**Triệu chứng**: API trả về "Bạn đã điểm danh cho sự kiện này rồi"
**Giải pháp**: Đây là hành vi mong muốn. Nếu cần cập nhật, dùng endpoint `/manual` (chỉ admin)

### Issue 3: Không load được danh sách
**Triệu chứng**: Bảng hiển thị "Đang tải dữ liệu..." mãi
**Kiểm tra**:
- Network tab: Check API có trả về 200 không
- Console: Check có lỗi JavaScript không
- Database: Check có dữ liệu trong EventRegistrations không

## 📊 Data Flow Diagram

```
┌─────────────┐
│  Student    │
│ QRAttendance│
└──────┬──────┘
       │ POST /api/attendance/qr-checkin
       │ {eventId, userId, qrCode}
       ↓
┌─────────────────┐
│ attendance.js   │
│ - Check registered
│ - Check not duplicate
│ - Insert attendance
└──────┬──────────┘
       │
       ↓
┌─────────────────┐
│ EventAttendance │
│ Table (SQL)     │
└──────┬──────────┘
       │
       ↓ (Admin loads)
┌─────────────────┐
│ GET /event/:id  │
│ Returns all     │
│ attendance      │
└──────┬──────────┘
       │
       ↓
┌─────────────────┐
│ Admin Dashboard │
│ AttendanceManager
└─────────────────┘
```

## 🚀 Deployment Checklist

- [x] Backend routes configured in server.js
- [x] Database schema EventAttendance exists
- [x] API endpoints implemented
- [x] AttendanceManager.html updated with API integration
- [x] QRAttendance_new.html updated with API integration
- [x] Authentication middleware in place
- [ ] Test với dữ liệu thật
- [ ] Export Excel functionality
- [ ] Real QR scanner integration (html5-qrcode)

## 📝 Next Steps

1. **Test với database thật**: Tạo events và registrations mẫu
2. **Implement Export Excel**: Dùng thư viện xlsx hoặc exceljs
3. **Real QR Scanner**: Tích hợp html5-qrcode library
4. **Notifications**: WebSocket hoặc polling cho real-time updates
5. **Analytics**: Biểu đồ thống kê điểm danh theo thời gian

## 💡 Tips

- Luôn check authentication trước khi gọi API
- Sử dụng `authFetch()` helper thay vì `fetch()` thô
- Handle errors gracefully với notification
- Reload data sau khi cập nhật để đảm bảo đồng bộ
- Log errors ra console để debug dễ dàng
