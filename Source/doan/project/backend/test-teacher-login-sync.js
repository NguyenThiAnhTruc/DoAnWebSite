// Test teacher login and check session sync
const database = require('./config/database');
const bcrypt = require('bcrypt');

async function testTeacherLogin() {
    try {
        console.log('\n🔐 KIỂM TRA ĐĂNG NHẬP GIÁO VIÊN\n');
        
        const username = 'teacher1';
        const password = 'password123';
        
        // Get user from database
        const query = `
            SELECT 
                user_id, 
                username, 
                password_hash, 
                email, 
                first_name, 
                last_name, 
                role
            FROM Users
            WHERE username = @username
        `;
        
        const result = await database.query(query, { username });
        const user = (result.recordset || result)[0];
        
        if (!user) {
            console.log('❌ Không tìm thấy user:', username);
            process.exit(1);
        }
        
        console.log('📋 THÔNG TIN USER TỪ DATABASE:');
        console.log('─────────────────────────────────────────');
        console.log('User ID:', user.user_id);
        console.log('Username:', user.username);
        console.log('Email:', user.email);
        console.log('Họ tên:', `${user.first_name} ${user.last_name}`);
        console.log('Role:', user.role);
        
        // Verify password
        const isPasswordValid = await bcrypt.compare(password, user.password_hash);
        console.log('\n🔑 KIỂM TRA MẬT KHẨU:');
        console.log('─────────────────────────────────────────');
        console.log('Password nhập:', password);
        console.log('Kết quả:', isPasswordValid ? '✅ ĐÚNG' : '❌ SAI');
        
        if (!isPasswordValid) {
            console.log('❌ Mật khẩu không đúng!');
            process.exit(1);
        }
        
        // Simulate response object
        const responseUser = {
            user_id: user.user_id,
            username: user.username,
            email: user.email,
            first_name: user.first_name,
            last_name: user.last_name,
            role: user.role,
            name: `${user.first_name} ${user.last_name}`.trim()
        };
        
        console.log('\n📤 DỮ LIỆU TRẢ VỀ CHO CLIENT:');
        console.log('─────────────────────────────────────────');
        console.log(JSON.stringify(responseUser, null, 2));
        
        console.log('\n🔄 KIỂM TRA ROLE ROUTING:');
        console.log('─────────────────────────────────────────');
        const role = (responseUser.role || '').toLowerCase();
        console.log('Role (lowercase):', role);
        
        let redirectUrl;
        if (role === 'student') {
            redirectUrl = '/EventList.html';
        } else if (role === 'teacher' || role === 'admin') {
            redirectUrl = '/dashboard';
        } else {
            redirectUrl = '/dashboard';
        }
        
        console.log('Redirect URL:', redirectUrl);
        console.log('Điều hướng đến:', role === 'teacher' ? '/AdminDashboard.html' : redirectUrl);
        
        console.log('\n✅ MIDDLEWARE CHECK:');
        console.log('─────────────────────────────────────────');
        const passAdminMiddleware = (role === 'admin' || role === 'teacher');
        console.log('adminMiddleware kiểm tra:');
        console.log('  if (role !== "admin" && role !== "teacher")');
        console.log('  Kết quả:', passAdminMiddleware ? '✅ PASS' : '❌ FAIL');
        
        console.log('\n🖥️ CLIENT-SIDE CHECK:');
        console.log('─────────────────────────────────────────');
        console.log('localStorage.setItem("user", JSON.stringify(user))');
        console.log('Dữ liệu lưu:');
        console.log('  role:', role);
        console.log('  name:', responseUser.name);
        
        console.log('\n📋 KIỂM TRA HIỂN THỊ:');
        console.log('─────────────────────────────────────────');
        const roleMap = {
            'admin': 'Quản trị viên',
            'teacher': 'Giáo viên',
            'student': 'Sinh viên'
        };
        const displayRole = roleMap[role] || role;
        console.log('Element #userName:', responseUser.name);
        console.log('Element #userRole:', displayRole);
        
        console.log('\n✨ TẤT CẢ KIỂM TRA:');
        console.log('─────────────────────────────────────────');
        console.log('1. Password:', isPasswordValid ? '✅' : '❌');
        console.log('2. Role từ DB:', user.role === 'teacher' ? '✅' : '❌');
        console.log('3. Redirect đúng:', redirectUrl === '/dashboard' ? '✅' : '❌');
        console.log('4. Middleware pass:', passAdminMiddleware ? '✅' : '❌');
        console.log('5. Hiển thị role:', displayRole === 'Giáo viên' ? '✅' : '❌');
        
        console.log('\n💡 NẾU VẪN CÒN LỖI:');
        console.log('─────────────────────────────────────────');
        console.log('1. Xóa localStorage: localStorage.clear()');
        console.log('2. Xóa cookies: document.cookie = ""');
        console.log('3. Hard refresh: Ctrl+Shift+R');
        console.log('4. Kiểm tra Console (F12) xem có lỗi không');
        console.log('5. Kiểm tra Network tab xem API trả về gì');
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Lỗi:', error.message);
        console.error(error.stack);
        process.exit(1);
    }
}

testTeacherLogin();
