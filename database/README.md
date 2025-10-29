# 🗄️ DATABASE SETUP - 1 FILE DUY NHẤT

## 📁 FILE DUY NHẤT: `setup_database.sql`

**File này bao gồm TẤT CẢ:**
- ✅ Tạo database `SchoolEventManagement`
- ✅ Tạo 10 tables (với đầy đủ columns: language, theme, notify_*, two_factor_enabled)
- ✅ Tạo 15 indexes cho performance
- ✅ Insert sample data (users, events, registrations)
- ✅ Tạo 4 stored procedures

---

## 🚀 CÁCH CHẠY

### **Option 1: SQL Server Management Studio (SSMS)** ⭐ RECOMMENDED

```
1. Mở SQL Server Management Studio
2. Connect vào server (localhost)
3. File → Open → File... → Chọn setup_database.sql
4. Nhấn F5 hoặc nút Execute (▶️)
5. Đợi ~5 giây
6. ✅ XONG!
```

### **Option 2: Command Line**

```powershell
cd d:\doan\project\backend\database
sqlcmd -S localhost -U sa -P 123 -i setup_database.sql
```

---

## ⚠️ LƯU Ý QUAN TRỌNG

### 🔴 **FILE NÀY SẼ XÓA DATABASE CŨ!**

Script sẽ:
1. ❌ DROP tất cả tables cũ
2. ✅ CREATE lại từ đầu
3. ✅ INSERT sample data mới

**CHỈ CHẠY KHI:**
- ✅ Lần đầu setup project
- ✅ Muốn reset database
- ❌ KHÔNG chạy khi có data quan trọng!

---

## 🐛 LỖI HIỆN TẠI

### ❌ **Database thiếu columns!**

```
Error: Invalid column name 'notify_event_updates'
Error: Invalid column name 'notify_new_events'  
Error: Invalid column name 'notify_reminders'
Error: Invalid column name 'two_factor_enabled'
```

**NGUYÊN NHÂN:** Database cũ chưa có các cột mới

**GIẢI PHÁP:** ✅ **CHẠY `setup_database.sql` NGAY!**

---

## 👥 TÀI KHOẢN MẶC ĐỊNH

**Sau khi setup, login với:**

| Email | Password | Role |
|-------|----------|------|
| admin@school.edu.vn | password123 | Admin |
| teacher1@school.edu.vn | password123 | Teacher |
| teacher2@school.edu.vn | password123 | Teacher |
| student1@school.edu.vn | password123 | Student |

---

## ✅ SAU KHI CHẠY XONG

### **1. Restart Node.js server:**

```powershell
# Ctrl+C để stop server đang chạy
cd d:\doan\project\backend
npm start
```

### **2. Test website:**

```
http://localhost:3000
```

### **3. Kiểm tra database:**

```sql
USE SchoolEventManagement;

-- Xem tables
SELECT name FROM sys.tables;

-- Check columns của Users table
SELECT COLUMN_NAME 
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_NAME = 'Users'
ORDER BY ORDINAL_POSITION;
```

**Phải thấy các cột:**
- ✅ language (mới)
- ✅ theme (mới)
- ✅ notify_event_updates (mới)
- ✅ notify_new_events (mới)
- ✅ notify_reminders (mới)
- ✅ two_factor_enabled (mới)

---

## 🔧 TROUBLESHOOTING

### ❌ Lỗi: "Invalid column name 'notify_event_updates'"

**Nguyên nhân:** Chưa chạy setup_database.sql

**Giải pháp:**
```powershell
# 1. Chạy SQL script
cd d:\doan\project\backend\database
sqlcmd -S localhost -U sa -P 123 -i setup_database.sql

# 2. Restart server
cd ..
npm start
```

---

### ❌ Lỗi: "Database already exists"

**Giải pháp:** Bình thường! Script sẽ DROP tables cũ và tạo lại.

---

### ❌ Lỗi: "Login failed for user 'sa'"

**Giải pháp:**
```powershell
# Dùng Windows Authentication
sqlcmd -S localhost -E -i setup_database.sql
```

---

### ❌ Server vẫn lỗi sau khi chạy SQL

**Giải pháp:**
```powershell
# 1. Stop server (Ctrl+C)
# 2. Verify database
sqlcmd -S localhost -U sa -P 123 -Q "USE SchoolEventManagement; SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'Users' AND COLUMN_NAME IN ('language', 'theme', 'notify_event_updates')"

# 3. Restart server
npm start
```

---

## 📊 SAMPLE DATA

### **Departments (5):**
- CNTT - Công nghệ thông tin
- KT - Kinh tế  
- NN - Ngoại ngữ
- MT - Mỹ thuật
- DL - Du lịch

### **Categories (8):**
- Hội thảo, Cuộc thi, Workshop, Sinh hoạt
- Thể thao, Văn hóa, Khoa học, Tình nguyện

### **Users (7):**
- 1 Admin, 2 Teachers, 4 Students

### **Events (5):**
- Hội thảo Công nghệ AI 2025
- Cuộc thi Lập trình Spring 2025
- Workshop React & Node.js
- Hội thảo Khởi nghiệp Sinh viên
- Cuộc thi Thiết kế Logo 2025

---

## 📄 TÀI LIỆU

- **SETUP_GUIDE.md** - Hướng dẫn chi tiết
- **setup_database.sql** - File SQL duy nhất cần chạy

---

## 🎯 HÀNH ĐỘNG NGAY

### **BẠN CẦN LÀM:**

```powershell
# 1. Mở SSMS và chạy setup_database.sql
# HOẶC command line:
cd d:\doan\project\backend\database
sqlcmd -S localhost -U sa -P 123 -i setup_database.sql

# 2. Restart server
cd ..
npm start

# 3. Test website
# http://localhost:3000
```

**SAU KHI CHẠY → LỖI SẼ BIẾN MẤT!** ✅

---

**Ngày cập nhật:** 20/10/2025  
**Status:** ⚠️ CẦN CHẠY SETUP NGAY  
**Chỉ cần 1 file!** 🚀
