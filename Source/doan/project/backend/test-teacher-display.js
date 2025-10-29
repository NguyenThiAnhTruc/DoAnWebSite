// Test teacher login display
const database = require('./config/database');

async function testTeacherDisplay() {
    try {
        console.log('\n🧪 KIỂM TRA HIỂN THỊ TÀI KHOẢN GIÁO VIÊN\n');
        
        // Get teacher info
        const query = `
            SELECT user_id, username, email, first_name, last_name, role
            FROM Users
            WHERE username = 'teacher1'
        `;
        
        const result = await database.query(query);
        const teacher = (result.recordset || result)[0];
        
        if (!teacher) {
            console.log('❌ Không tìm thấy tài khoản teacher1');
            process.exit(1);
        }
        
        console.log('📋 THÔNG TIN GIÁO VIÊN:');
        console.log('─────────────────────────────────────────');
        console.log('User ID:', teacher.user_id);
        console.log('Username:', teacher.username);
        console.log('Email:', teacher.email);
        console.log('Họ tên:', `${teacher.first_name} ${teacher.last_name}`);
        console.log('Role (từ DB):', teacher.role);
        
        console.log('\n📺 HIỂN THỊ KHI ĐĂNG NHẬP:');
        console.log('─────────────────────────────────────────');
        
        // Simulate role display mapping
        const roleMap = {
            'admin': 'Quản trị viên',
            'teacher': 'Giáo viên',
            'student': 'Sinh viên'
        };
        
        const displayRole = roleMap[teacher.role.toLowerCase()] || teacher.role;
        const displayName = `${teacher.first_name} ${teacher.last_name}`;
        
        console.log('Dòng 1 (Tên):', displayName);
        console.log('Dòng 2 (Vai trò):', displayRole);
        
        console.log('\n✅ KIỂM TRA NHẤT QUÁN:');
        console.log('─────────────────────────────────────────');
        console.log('Role từ DB:', teacher.role);
        console.log('Role hiển thị:', displayRole);
        console.log('Đúng chuẩn:', displayRole === 'Giáo viên' ? '✅ ĐÚng' : '❌ SAI');
        
        console.log('\n💡 LƯU Ý:');
        console.log('- Khi đăng nhập với teacher1/password123');
        console.log('- Phải hiển thị: "Nguyễn Văn Nam"');
        console.log('- Và vai trò: "Giáo viên" (KHÔNG phải "teacher", "Giảng viên", hay "Admin")');
        
        // Check menu access
        const userRole = teacher.role.toLowerCase();
        const hasAdminMenu = (userRole === 'admin' || userRole === 'teacher');
        
        console.log('\n🔐 QUYỀN TRUY CẬP:');
        console.log('─────────────────────────────────────────');
        console.log('Có quyền admin menu:', hasAdminMenu ? '✅ CÓ' : '❌ KHÔNG');
        console.log('Menu hiển thị:', hasAdminMenu ? 'Admin/Teacher Menu' : 'Student Menu');
        
        if (hasAdminMenu) {
            console.log('\n📋 MENU GIÁO VIÊN BAO GỒM:');
            console.log('  ✅ Danh sách sự kiện');
            console.log('  ✅ Tạo sự kiện mới');
            console.log('  ✅ Quản lý điểm danh');
            console.log('  ✅ Xem báo cáo');
            console.log('  ⚠️  Dashboard (giống admin nhưng giới hạn hơn)');
        }
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Lỗi:', error.message);
        process.exit(1);
    }
}

testTeacherDisplay();
