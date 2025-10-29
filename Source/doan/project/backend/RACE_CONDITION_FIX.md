# 🐛 Race Condition Fix - Language Switching

## 📋 Vấn đề (Problem)

### Triệu chứng
Khi user đổi từ **English → Tiếng Việt**:
- Có lúc hiển thị **English** ❌
- Có lúc hiển thị **Tiếng Việt** ✅
- **Không ổn định**, không dự đoán được

### Nguyên nhân (Root Cause)

```
Timeline của Race Condition:

T0: User clicks "Tiếng Việt"
    │
T1: langSel.onchange fires
    ├─► localStorage.setItem('language', 'vi')  ✅
    ├─► LanguageService.setLanguage('vi')       ✅ UI shows Vietnamese
    └─► fetch POST /api/users/1/preferences { language: 'vi' }
        (API request IN FLIGHT... ⏳)
    │
T2: loadUserSettings() chạy background (từ page init)
    └─► fetch GET /api/users/1
        Database vẫn còn: language = 'en' ❌
        Response: { user: { language: 'en' } }
    │
T3: loadUserSettings() applies fetched data
    └─► LanguageService.setLanguage('en')  ❌❌❌
        