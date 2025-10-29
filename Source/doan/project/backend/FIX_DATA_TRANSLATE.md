# 🔧 XÓA DATA-TRANSLATE ATTRIBUTES

## ⚠️ VẤN ĐỀ

Sau khi xóa `language.js`, các `data-translate` attributes vẫn còn trong HTML.
Khi LanguageService không tồn tại, các attributes này không làm gì cả, và text tiếng Anh sẽ hiển thị.

**Ví dụ lỗi:**
```html
<!-- ❌ SAI - Hiển thị "messages" -->
<span data-translate="messages">messages</span>

<!-- ✅ ĐÚNG - Hiển thị "Tin nhắn" -->
<span>Tin nhắn</span>
```

---

## 📋 DANH SÁCH FILE CẦN XÓA DATA-TRANSLATE

### Files có data-translate attributes:
1. ❌ `views/EventList.html` - 6 chỗ
2. ❌ `views/AdminDashboard.html` - 4 chỗ
3. ❌ `views/AttendanceManager.html` - 11 chỗ
4. ❌ `views/UserProfile.html` - 17 chỗ
5. ❌ `views/ContactSupport.html` - 5 chỗ
6. ❌ `views/Settings.html` - 19 chỗ
7. ❌ `views/_header-component.html` - 6 chỗ
8. ❌ `views/_header-snippet.html` - 4 chỗ
9. ❌ **`views/LanguageTest.html`** - ĐÃ XÓA FILE RỒI (không cần)

**TỔNG: ~72 chỗ cần xóa**

---

## 🛠️ GIẢI PHÁP

### Option 1: Xóa từng file thủ công
- Mở từng file
- Tìm `data-translate=`
- Xóa attributes `data-translate` và `data-translate-section`
- Giữ lại text tiếng Việt

### Option 2: Dùng PowerShell (Nhanh hơn)

```powershell
# Script xóa data-translate attributes
$files = @(
  "d:\doan\project\backend\views\EventList.html",
  "d:\doan\project\backend\views\AdminDashboard.html",
  "d:\doan\project\backend\views\AttendanceManager.html",
  "d:\doan\project\backend\views\UserProfile.html",
  "d:\doan\project\backend\views\ContactSupport.html",
  "d:\doan\project\backend\views\Settings.html",
  "d:\doan\project\backend\views\_header-component.html",
  "d:\doan\project\backend\views\_header-snippet.html"
)

foreach ($file in $files) {
  $content = Get-Content $file -Raw -Encoding UTF8
  
  # Xóa data-translate="..." và data-translate-section="..."
  $content = $content -replace '\s*data-translate="[^"]*"', ''
  $content = $content -replace '\s*data-translate-section="[^"]*"', ''
  
  Set-Content $file -Value $content -Encoding UTF8 -NoNewline
  Write-Host "✅ Cleaned: $file"
}
```

---

## 🎯 KẾT QUẢ MONG ĐỢI

**TRƯỚC:**
```html
<span data-translate="messages" data-translate-section="navigation">messages</span>
```

**SAU:**
```html
<span>Tin nhắn</span>
```

---

## ✅ CHECKLIST SAU KHI XÓA

- [ ] Sidebar menu hiển thị tiếng Việt
- [ ] Tất cả buttons hiển thị tiếng Việt  
- [ ] Không còn text tiếng Anh nào
- [ ] Không còn attributes `data-translate`
- [ ] Kiểm tra console không có lỗi LanguageService

---

## 🚀 THỰC HIỆN

Bạn có muốn tôi chạy PowerShell script để xóa tất cả `data-translate` attributes không?
