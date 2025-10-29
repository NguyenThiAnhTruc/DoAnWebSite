# Hướng dẫn thêm Unified Header (3 Icons) vào tất cả các trang

## 📋 Mục đích
Thêm header đồng nhất với 3 icon (Messages, Profile, Notifications) vào tất cả các trang đã được authenticated.

## 🎯 Icon bao gồm:
1. **Messages** (💬) - Link đến `/MessagingSystem.html` - Badge hiển thị số tin nhắn chưa đọc
2. **Profile** (👤) - Link đến `/UserProfile.html` - Xem/chỉnh sửa hồ sơ
3. **Notifications** (🔔) - Dropdown thông báo - Badge hiển thị số thông báo chưa đọc

## ✅ Cách thêm vào từng file

### Bước 1: Mở file HTML cần thêm header

### Bước 2: Thêm script SAU thẻ `<script src="/js/theme.js"></script>` 

```html
<!-- Thêm dòng này -->
<script src="/js/unified-header.js"></script>
```

### Bước 3: Đảm bảo có NotificationService (nếu trang dùng notifications)

Nếu trang cần hiển thị thông báo, thêm trước unified-header.js:

```html
<script src="/js/notifications.js"></script>
<script src="/js/unified-header.js"></script>
```

## 📝 Danh sách file cần cập nhật

### ✅ Các trang chính (Priority cao):

1. **EventList.html** - Danh sách sự kiện
   ```html
   <script src="/js/notifications.js"></script>
   <script src="/js/unified-header.js"></script>
   <script src="/js/theme.js"></script>
   ```

2. **AdminDashboard.html** - Trang quản trị
   ```html
   <script src="/js/notifications.js"></script>
   <script src="/js/unified-header.js"></script>
   <script src="/js/theme.js"></script>
   ```

3. **EventForm.html** - Form tạo/sửa sự kiện
   ```html
   <script src="/js/unified-header.js"></script>
   <script src="/js/theme.js"></script>
   ```

4. **UserProfile.html** - Trang profile
   ```html
   <script src="/js/notifications.js"></script>
   <script src="/js/unified-header.js"></script>
   <script src="/js/theme.js"></script>
   ```

5. **MessagingSystem.html** - Hệ thống tin nhắn
   ```html
   <script src="/js/notifications.js"></script>
   <script src="/js/unified-header.js"></script>
   <script src="/js/theme.js"></script>
   ```

6. **EventDetail.html** - Chi tiết sự kiện
   ```html
   <script src="/js/notifications.js"></script>
   <script src="/js/unified-header.js"></script>
   <script src="/js/theme.js"></script>
   ```

### 📌 Các trang phụ (Priority trung bình):

7. **AttendanceManager.html**
8. **AttendanceSuccess.html**
9. **QRAttendance.html**
10. **ContactSupport.html**

### ⚠️ Các trang KHÔNG cần header (đã có header riêng):

- **HomePage.html** - Có header riêng cho landing page
- **Login.html** - Trang đăng nhập
- **Register.html** - Trang đăng ký
- **404.html** - Trang lỗi

## 🎨 Tùy chỉnh

### Ẩn logo (nếu trang đã có logo riêng):

Thêm CSS sau vào file:

```css
<style>
  #unifiedHeader .flex.items-center.space-x-2 {
    display: none; /* Ẩn logo */
  }
</style>
```

### Chỉ hiển thị icons:

```css
<style>
  #unifiedHeader {
    background: transparent !important;
    box-shadow: none !important;
  }
  #unifiedHeader .max-w-7xl {
    justify-content: flex-end !important;
  }
</style>
```

## 🔧 Kiểm tra

Sau khi thêm, refresh trang và kiểm tra:

1. ✅ 3 icon hiển thị ở góc trên bên phải
2. ✅ Badge tin nhắn hiển thị số 3 (mock data)
3. ✅ Click vào icon 🔔 hiển thị dropdown thông báo
4. ✅ Click vào icon 👤 redirect đến UserProfile.html
5. ✅ Click vào icon 💬 redirect đến MessagingSystem.html

## 📱 Responsive

Header tự động responsive:
- Desktop: Hiển thị đầy đủ 3 icon
- Mobile: Icon size tự động điều chỉnh

## 🐛 Troubleshooting

### Badge không hiển thị số:
- Kiểm tra NotificationService đã load chưa
- Mở Console xem error message

### Icon không clickable:
- Kiểm tra z-index của các element khác
- Đảm bảo không có overlay che phủ

### Dropdown thông báo không mở:
- Kiểm tra NotificationService.getRecent() có hoạt động không
- Xem console log để debug

## 📞 Support

Nếu gặp vấn đề, kiểm tra:
1. Console log (F12)
2. Network tab xem API calls
3. File unified-header.js đã load chưa

---

**Tác giả:** GitHub Copilot  
**Ngày tạo:** 21/10/2025  
**Version:** 1.0
