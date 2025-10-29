# 🎯 TÓM TẮT ĐỒNG BỘ HÓA HEADER

## ✅ ĐÃ HOÀN THÀNH

### 📦 3 File Mới Được Tạo:

1. **`/js/header-component.js`** (260+ dòng)
   - Component JavaScript xử lý toàn bộ logic header
   - Tự động cập nhật badge (số thông báo chưa đọc)
   - Xử lý dropdown thông báo
   - Tự động khởi tạo khi load trang

2. **`/views/_header-snippet.html`** (110+ dòng)
   - Template HTML để copy vào các trang
   - Chứa header chuẩn + dropdown + CSS + script

3. **`/views/sync_headers.py`** (180+ dòng)
   - Script Python tự động sync header (chưa chạy được)
   - Có thể dùng sau để update nhiều trang cùng lúc

### 📄 3 Trang Đã Update Hoàn Chỉnh:

1. ✅ **ContactSupport.html**
   - Header mới với 3 icons (tin nhắn, tài khoản, thông báo)
   - Dropdown thông báo hoạt động đầy đủ
   - Badge đỏ hiển thị số lượng

2. ✅ **EventList.html**  
   - Header chuẩn với 4 icons (có thêm search)
   - Nút search click vào sẽ scroll xuống ô tìm kiếm
   - Dropdown thông báo đầy đủ

3. ✅ **AdminDashboard.html**
   - Header chuẩn giống ContactSupport
   - Tất cả chức năng hoạt động

---

## 🎨 THIẾT KẾ HEADER CHUẨN

### Cấu trúc:

```
┌─────────────────────────────────────────────────────┐
│ ☰ [Tiêu đề trang]         💬(3)  👤  🔔(5)      │
│    [Mô tả trang]                                    │
└─────────────────────────────────────────────────────┘
```

- **Bên trái**: 
  - Nút menu (☰) - chỉ hiện trên mobile
  - Tiêu đề trang (id="pageTitle")
  - Mô tả trang (id="pageSubtitleHeader")

- **Bên phải** (3 icons nhất quán):
  - 💬 **Tin nhắn** (message-circle) + badge đỏ số 3
  - 👤 **Tài khoản** (user) + không có badge
  - 🔔 **Thông báo** (bell) + badge đỏ với số thông báo chưa đọc

### Dropdown Thông báo:

Click vào icon 🔔 sẽ mở dropdown với:
- **Header**: "Thông báo" + nút "Đánh dấu đã đọc"
- **Danh sách**: 5 thông báo mới nhất với:
  - Icon màu sắc theo loại
  - Tiêu đề + nội dung
  - Thời gian (Vừa xong, 5 phút trước, ...)
  - Dấu chấm xanh cho chưa đọc
- **Footer**: "Xóa đã đọc" + "Xem tất cả"

---

## 🔧 CÁCH UPDATE CÁC TRANG CÒN LẠI

### Bước 1: Thay thế Header

Tìm phần `<header>` cũ và thay bằng:

```html
<header class="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700 px-6 py-4">
  <div class="flex items-center justify-between">
    <div class="flex items-center space-x-4">
      <button id="btnOpenSidebar" class="lg:hidden p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
        <i data-lucide="menu" class="w-5 h-5 text-gray-600 dark:text-gray-300"></i>
      </button>
      <div>
        <h1 id="pageTitle" class="text-xl font-semibold text-gray-900 dark:text-white">TÊN TRANG</h1>
        <p id="pageSubtitleHeader" class="text-sm text-gray-500 dark:text-gray-400">MÔ TẢ TRANG</p>
      </div>
    </div>
    <div class="flex items-center space-x-3">
      <a href="/MessagingSystem.html" class="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors relative">
        <i data-lucide="message-circle" class="w-5 h-5 text-gray-600 dark:text-gray-300"></i>
        <span id="messageBadge" class="hidden absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center font-bold">3</span>
      </a>
      <a href="/UserProfile.html" class="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors relative">
        <i data-lucide="user" class="w-5 h-5 text-gray-600 dark:text-gray-300"></i>
      </a>
      <button id="btnNotifications" class="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors relative">
        <i data-lucide="bell" class="w-5 h-5 text-gray-600 dark:text-gray-300"></i>
        <span id="notificationBadge" class="hidden absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center font-bold">5</span>
      </button>
    </div>
  </div>
</header>
```

**Lưu ý**: Thay `TÊN TRANG` và `MÔ TẢ TRANG` bằng text phù hợp

### Bước 2: Thêm Dropdown + CSS

Trước tag `</body>`, thêm:

```html
<!-- Notification Dropdown -->
<div id="notificationDropdown" class="hidden fixed top-16 right-6 w-96 max-w-[calc(100vw-3rem)] bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 z-50 animate-slideDown">
  <div class="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
    <h3 class="font-semibold text-gray-900 dark:text-white" data-translate="notifications.title">Thông báo</h3>
    <button id="btnMarkAllRead" class="text-xs text-blue-600 dark:text-blue-400 hover:underline" data-translate="notifications.markAllRead">Đánh dấu đã đọc</button>
  </div>
  <div id="notificationList" class="overflow-y-auto max-h-96 divide-y divide-gray-100 dark:divide-gray-700"></div>
  <div class="flex items-center justify-between px-4 py-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
    <button id="btnClearAllRead" class="text-xs text-red-600 dark:text-red-400 hover:underline" data-translate="notifications.clearAll">Xóa đã đọc</button>
    <a href="/NotificationList.html" class="text-xs text-blue-600 dark:text-blue-400 hover:underline" data-translate="notifications.viewAll">Xem tất cả</a>
  </div>
</div>

<style>
  @keyframes slideDown { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
  .animate-slideDown { animation: slideDown 0.2s ease-out; }
  #notificationBadge.hidden, #messageBadge.hidden { display: none; }
  #notificationBadge:not(.hidden), #messageBadge:not(.hidden) { animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite; }
</style>

<script src="/js/header-component.js"></script>
```

### Bước 3: Kiểm tra

- Mở trang trong browser
- Xem 3 icons có hiển thị không
- Click vào icon 🔔 → dropdown mở ra
- Badge hiển thị đúng số
- Dark mode hoạt động
- Đổi ngôn ngữ → text update

---

## 📋 CÁC TRANG CẦN UPDATE

### ⏳ Chưa update (15+ trang):

- MessagingSystem.html (header OK, thiếu dropdown)
- AttendanceManager.html (header OK, thiếu dropdown)  
- UserProfile.html (header OK, thiếu dropdown)
- HomePage.html
- QRAttendance.html
- QRAttendance_new.html
- EventDetail.html
- EventForm.html
- TestQR.html
- TestQRSystem.html
- QRCheckInPage.html
- AttendanceSuccess.html
- StudentQRLogin.html
- Register.html
- 404.html

### ℹ️ Không cần header:

- Login.html (trang login không có header)
- Register.html (trang đăng ký không cần header phức tạp)

---

## 🎯 TÍNH NĂNG

### ✅ Đã hoàn thành:

- ✅ Header chuẩn với 3-4 icons nhất quán
- ✅ Badge đỏ hiển thị số lượng (có animation pulse)
- ✅ Dropdown thông báo đầy đủ chức năng
- ✅ Hỗ trợ dark mode toàn bộ
- ✅ Đa ngôn ngữ (Việt/Anh)
- ✅ Tự động refresh badge (30s cho thông báo, 60s cho tin nhắn)
- ✅ Click bên ngoài để đóng dropdown
- ✅ Nút "Đánh dấu tất cả đã đọc"
- ✅ Nút "Xóa tất cả đã đọc"
- ✅ Responsive (mobile có nút menu)

### ⚠️ Đang làm:

- ⏳ Update 15+ trang còn lại
- ⏳ Tích hợp API tin nhắn thật (hiện tại mock số 3)
- ⏳ Chức năng search cho trang EventList

---

## 🧪 CHECKLIST KIỂM TRA

Với mỗi trang đã update, kiểm tra:

- [ ] Header hiển thị đúng tiêu đề/mô tả
- [ ] 3 icons hiển thị (tin nhắn, tài khoản, thông báo)
- [ ] Badge tin nhắn hiển thị "3"
- [ ] Badge thông báo hiển thị đúng số
- [ ] Click icon bell → dropdown mở ra
- [ ] Dropdown hiển thị tối đa 5 thông báo
- [ ] Click thông báo → đánh dấu đã đọc → badge giảm
- [ ] Nút "Đánh dấu tất cả" hoạt động
- [ ] Nút "Xóa đã đọc" hoạt động
- [ ] Link "Xem tất cả" hoạt động
- [ ] Click bên ngoài → dropdown đóng
- [ ] Dark mode → tất cả cập nhật
- [ ] Đổi ngôn ngữ → text cập nhật
- [ ] Mobile → nút menu hiển thị
- [ ] Desktop → tất cả icons hiển thị

---

## 💡 MẸO

### Copy từ trang reference:

Bạn có thể mở **ContactSupport.html** hoặc **EventList.html** và copy:
1. Toàn bộ phần `<header>` (từ dòng ~98-135)
2. Toàn bộ phần dropdown + style + script (trước `</body>`)
3. Dán vào trang mới
4. Chỉ cần đổi text tiêu đề/mô tả

### Sử dụng template file:

Mở file `_header-snippet.html` và copy toàn bộ nội dung, rất dễ dàng!

---

## 📞 HỖ TRỢ

Nếu gặp vấn đề:

1. **Dropdown không mở**: Kiểm tra `header-component.js` đã load chưa
2. **Badge không hiển thị**: Kiểm tra NotificationService đã init chưa
3. **Dark mode lỗi**: Kiểm tra các class `dark:*` đã đầy đủ
4. **Ngôn ngữ không đổi**: Kiểm tra `data-translate` attributes

---

**Cập nhật lần cuối:** 19/10/2025  
**Trạng thái:** 🟡 Đang thực hiện (3/20 trang hoàn thành)  
**Tiếp theo:** Tiếp tục update các trang còn lại
