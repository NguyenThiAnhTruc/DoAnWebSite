# 🗑️ KẾ HOẠCH XÓA TÍNH NĂNG ĐA NGÔN NGỮ

## 🎯 MỤC TIÊU

**Xóa hoàn toàn tính năng đổi ngôn ngữ, giữ lại CHỈ TIẾNG VIỆT**

---

## 📋 DANH SÁCH CÔNG VIỆC

### ✅ **BƯỚC 1: XÓA DATABASE COLUMNS**

#### File: `setup_database.sql`

**Xóa cột `language` trong Users table:**

```sql
-- ❌ XÓA DÒNG NÀY:
language NVARCHAR(10) DEFAULT 'vi' NOT NULL,
```

**Xóa trong stored procedure `sp_LoginUser`:**

```sql
-- ❌ XÓA DÒNG NÀY:
language,
```

---

### ✅ **BƯỚC 2: XÓA FILE LANGUAGE.JS**

```
❌ XÓA FILE: public/js/language.js (783 dòng)
```

---

### ✅ **BƯỚC 3: XÓA DROPDOWN TRONG HTML**

#### File: `views/UserProfile.html`

**Xóa section Language Selector (dòng 244-252):**

```html
<!-- ❌ XÓA TOÀN BỘ SECTION NÀY -->
<div class="flex items-center justify-between py-3 border-b border-gray-200 dark:border-gray-700">
  <div>
    <label for="langSel">Ngôn ngữ</label>
    <p>Thay đổi ngôn ngữ hiển thị</p>
  </div>
  <select id="langSel">
    <option value="vi">Tiếng Việt</option>
    <option value="en">English</option>
  </select>
</div>
```

**Xóa code JavaScript liên quan (dòng 813-930):**

```javascript
// ❌ XÓA TOÀN BỘ CODE NÀY
const langSel = document.getElementById('langSel');
langSel.onchange = async () => {
  // ... 100+ dòng code
};
```

---

#### File: `views/Settings.html`

**Xóa Language Selector section (dòng 113-132)**

---

#### File: `views/LanguageTest.html`

```
❌ XÓA TOÀN BỘ FILE (TEST PAGE)
```

---

#### File: `views/LanguageTestDemo.html`

```
❌ XÓA TOÀN BỘ FILE (DEMO PAGE)
```

---

#### File: `views/LanguageSyncDemo.html`

```
❌ XÓA TOÀN BỘ FILE (DEMO PAGE)
```

---

### ✅ **BƯỚC 4: XÓA REFERENCES TRONG JS FILES**

#### File: `public/js/navigation.js`

**Thay thế:**

```javascript
// ❌ XÓA:
if (window.LanguageService) {
  userRoleEl.textContent = window.LanguageService.translateRole(role);
} else {
  userRoleEl.textContent = roleMap[role] || role;
}

// ✅ THAY BẰNG:
const roleMap = {
  'admin': 'Quản trị viên',
  'teacher': 'Giáo viên',
  'student': 'Sinh viên',
  'organizer': 'Tổ chức'
};
userRoleEl.textContent = roleMap[role] || role;
```

**Xóa:**

```javascript
// ❌ XÓA:
const confirmMessage = window.LanguageService 
  ? (window.LanguageService.currentLanguage === 'vi' 
      ? 'Bạn có chắc chắn muốn đăng xuất?' 
      : 'Are you sure you want to logout?')
  : 'Bạn có chắc chắn muốn đăng xuất?';

// ✅ THAY BẰNG:
const confirmMessage = 'Bạn có chắc chắn muốn đăng xuất?';
```

---

#### File: `public/js/notifications.js`

**Xóa:**

```javascript
// ❌ XÓA (dòng 31-34):
document.addEventListener('language-changed', (e) => {
  this._updateNotificationTranslations(e.detail.language);
});

// ❌ XÓA (dòng 418):
LanguageService ? LanguageService.getCurrentLanguage() : 'vi',

// ✅ THAY BẰNG:
'vi',

// ❌ XÓA method (dòng 462-467):
_updateNotificationTranslations(newLang) {
  console.log(`🌐 Notifications language updated to: ${newLang}`);
}
```

---

#### File: `public/js/header-component.js`

**Xóa:**

```javascript
// ❌ XÓA (dòng 67):
if (window.LanguageService) window.LanguageService._updatePageContent();
```

---

#### File: `public/js/theme.js`

**Xóa:**

```javascript
// ❌ XÓA:
language: user.language || 'vi'

// ✅ KHÔNG CẦN FIELD NÀY
```

---

### ✅ **BƯỚC 5: XÓA LOAD SCRIPT TRONG HTML**

**Tất cả HTML files:**

```html
<!-- ❌ XÓA DÒNG NÀY: -->
<script src="/js/language.js"></script>
```

---

### ✅ **BƯỚC 6: XÓA BACKEND API**

#### File: `routes/users.js`

**Xóa trong GET /api/users/:id:**

```javascript
// ❌ XÓA:
language: user.language || 'vi',
```

**Xóa trong PUT /api/users/:id/preferences:**

```javascript
// ❌ XÓA:
if (language) {
  updates.push('language = @language');
  params.language = language;
}
```

---

#### File: `routes/auth.js`

**Xóa trong POST /api/auth/login response:**

```javascript
// ❌ XÓA:
language: user.language || 'vi',
```

---

### ✅ **BƯỚC 7: XÓA ATTRIBUTES HTML**

**Tất cả HTML files có:**

```html
<!-- ❌ XÓA: -->
data-translate="..."
data-translate-section="..."
```

**Ví dụ:**

```html
<!-- ❌ TRƯỚC: -->
<h1 data-translate="welcome" data-translate-section="common">Chào mừng</h1>

<!-- ✅ SAU: -->
<h1>Chào mừng</h1>
```

---

## 📊 TỔNG KẾT

### ❌ **XÓA:**

| Loại | Số lượng | Chi tiết |
|------|----------|----------|
| Files JS | 1 | language.js (783 dòng) |
| HTML Pages | 3 | LanguageTest, LanguageTestDemo, LanguageSyncDemo |
| Database Columns | 1 | Users.language |
| HTML Sections | 5+ | Language dropdowns |
| JS Code | 500+ dòng | LanguageService references |
| HTML Attributes | 100+ | data-translate |

---

### ✅ **KẾT QUẢ SAU KHI XÓA:**

- ✅ **CHỈ CÓ TIẾNG VIỆT**
- ✅ Không có dropdown chọn ngôn ngữ
- ✅ Không có logic đa ngôn ngữ
- ✅ Code đơn giản hơn
- ✅ Database nhẹ hơn
- ✅ Không còn LanguageService

---

## 🚀 THỰC HIỆN

Bạn muốn tôi thực hiện từng bước không?

1. ✅ Xóa file language.js
2. ✅ Xóa test pages
3. ✅ Xóa dropdowns trong UserProfile
4. ✅ Xóa references trong JS files
5. ✅ Cập nhật database SQL

**Tôi sẽ làm từng bước một để đảm bảo không bị lỗi!**
