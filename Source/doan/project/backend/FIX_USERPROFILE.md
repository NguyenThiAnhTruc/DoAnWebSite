# Fix UserProfile.html - Load thông tin từ SQL

## Vấn đề đã sửa:

### UserProfile.html không hiển thị thông tin từ database

**Nguyên nhân**: Code hardcoded user data thay vì load từ localStorage

## Các thay đổi:

### 1. Load user từ localStorage (Dòng ~295)
```javascript
// TRƯỚC (hardcoded):
const user = { 
  name:'Sinh viên A', 
  email:'sv.a@example.edu', 
  phone:'0123456789', 
  studentId:'SV001234', 
  role:'student' 
};

// SAU (load từ localStorage):
let user = { name: 'Khách', email: 'guest@example.edu', phone: '', studentId: '', role: 'student' };

try {
  const storedUser = JSON.parse(localStorage.getItem('user') || localStorage.getItem('currentUser') || 'null');
  if (storedUser) {
    user = {
      name: storedUser.name || `${storedUser.first_name || ''} ${storedUser.last_name || ''}`.trim() || storedUser.username || 'Khách',
      email: storedUser.email || 'guest@example.edu',
      phone: storedUser.phone || '',
      studentId: storedUser.student_id || storedUser.username || '',
      role: storedUser.role || 'student',
      username: storedUser.username || '',
      user_id: storedUser.user_id || storedUser.id
    };
  }
} catch (e) {
  console.error('UserProfile - Error loading user:', e);
}
```

### 2. Hiển thị role đúng tiếng Việt
```javascript
const roleDisplay = {
  'admin': 'Admin',
  'teacher': 'Giảng viên', 
  'student': 'Student'
};
uRole.textContent = roleDisplay[user.role.toLowerCase()] || user.role;
```

### 3. Cập nhật sidebar user info
- Thêm ID: `sidebarUserName`, `sidebarUserRole`
- Update khi load trang

### 4. Save changes vào localStorage
```javascript
document.getElementById('btnSave').onclick = async () => { 
  // ... validation ...
  
  // Save to localStorage
  const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
  const updatedUser = {
    ...storedUser,
    name: user.name,
    email: user.email,
    phone: user.phone,
    student_id: user.studentId
  };
  localStorage.setItem('user', JSON.stringify(updatedUser));
  localStorage.setItem('currentUser', JSON.stringify(updatedUser));
};
```

## Dữ liệu được hiển thị:

### Từ database (sau login):
```json
{
  "user_id": 1,
  "username": "admin",
  "email": "admin@school.edu",
  "name": "Admin User",
  "first_name": "Admin",
  "last_name": "User",
  "role": "admin",
  "phone": "0123456789",
  "student_id": "SV001234"
}
```

### Hiển thị trong UserProfile:
- **Header card**: 
  - Name: "Admin User" (từ `name` hoặc `first_name + last_name`)
  - Role: "Admin" (từ `role`, có map tiếng Việt)
  - Email: "admin@school.edu"

- **Form fields**:
  - Họ và tên: "Admin User"
  - Email: "admin@school.edu"
  - Số điện thoại: "0123456789"
  - Mã sinh viên: "admin" (từ `student_id` hoặc `username`)

- **Sidebar**:
  - Name: "Admin User"
  - Role: "Admin"

## Console logs để debug:

```javascript
console.log('UserProfile - Loaded user:', user);
console.log('UserProfile - Saved updated user:', updatedUser);
```

## Cách test:

### Test 1: Login và xem profile
```
1. Login với tài khoản SQL (admin hoặc student)
2. Vào trang "Cài đặt" (UserProfile.html)
3. Kiểm tra:
   - Header card hiển thị đúng tên, email, role
   - Form fields có đúng thông tin
   - Sidebar hiển thị đúng tên và role
```

### Test 2: Edit và Save
```
1. Click "Chỉnh sửa"
2. Thay đổi tên, email, số điện thoại
3. Click "Lưu"
4. Refresh trang → Thông tin vẫn được giữ (từ localStorage)
5. F12 Console → Check: localStorage.getItem('user')
```

### Test 3: Role display
```
Admin login:
- Header: "Admin"
- Sidebar: "Admin"

Student login:
- Header: "Student"
- Sidebar: "Student"

Teacher login:
- Header: "Giảng viên"
- Sidebar: "Giảng viên"
```

## Files đã sửa:

✅ `views/UserProfile.html`
  - Load user từ localStorage
  - Hiển thị role đúng tiếng Việt
  - Save changes vào localStorage
  - Update sidebar user info

## Mapping data từ SQL → UserProfile:

| Database Field | UserProfile Display | Fallback |
|---------------|-------------------|----------|
| `first_name + last_name` | Name | `username` |
| `email` | Email | - |
| `phone` | Số điện thoại | Empty |
| `student_id` | Mã sinh viên | `username` |
| `role` | Role (Admin/Student/Giảng viên) | 'student' |

## Known Issues & Future:

- ⚠️ Chỉ lưu vào localStorage, chưa gọi API update database
- 💡 Nên thêm API PUT `/api/users/:id` để sync với database
- 💡 Có thể thêm upload avatar

## Test ngay:

```powershell
cd e:\DoAnCN\123\project\backend
npm start
```

1. Login: http://localhost:3000/Login.html
2. Sau khi login, click "Cài đặt" trong menu
3. Kiểm tra thông tin hiển thị đúng
4. F12 Console → Xem logs
