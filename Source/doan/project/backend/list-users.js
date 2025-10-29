const database = require('./config/database');

async function listUsers() {
    try {
        console.log('\n📋 DANH SÁCH TÀI KHOẢN TRONG HỆ THỐNG\n');
        console.log('='.repeat(80));
        
        const result = await database.query(`
            SELECT 
                user_id,
                username,
                email,
                role,
                first_name,
                last_name,
                student_id,
                status,
                created_at
            FROM Users
            ORDER BY role, user_id
        `);
        
        const users = result.recordset;
        
        console.log(`\nTổng số người dùng: ${users.length}\n`);
        
        // Group by role
        const roles = ['admin', 'teacher', 'student', 'organizer'];
        
        roles.forEach(role => {
            const roleUsers = users.filter(u => u.role === role);
            if (roleUsers.length > 0) {
                console.log(`\n${'='.repeat(80)}`);
                console.log(`🔷 ${role.toUpperCase()} (${roleUsers.length} người)`);
                console.log(`${'='.repeat(80)}\n`);
                
                roleUsers.forEach(user => {
                    console.log(`👤 ID: ${user.user_id}`);
                    console.log(`   Username: ${user.username}`);
                    console.log(`   Email: ${user.email}`);
                    console.log(`   Họ tên: ${user.first_name} ${user.last_name}`);
                    if (user.student_id) {
                        console.log(`   MSSV: ${user.student_id}`);
                    }
                    console.log(`   Trạng thái: ${user.status}`);
                    console.log(`   Ngày tạo: ${user.created_at}`);
                    console.log('');
                });
            }
        });
        
        console.log('\n' + '='.repeat(80));
        console.log('\n📌 LƯU Ý QUAN TRỌNG:');
        console.log('='.repeat(80));
        console.log('\n1. ĐĂNG NHẬP TRANG CHÍNH (Login.html):');
        console.log('   - Sử dụng Email + Mật khẩu từ database');
        console.log('   - Ví dụ: admin@school.edu / (mật khẩu đã mã hóa trong DB)');
        console.log('\n2. ĐIỂM DANH QR (StudentQRLogin.html):');
        console.log('   - DÙNG CHUNG tài khoản với trang đăng nhập chính');
        console.log('   - Email: GIỐNG email đăng nhập');
        console.log('   - Mật khẩu: GIỐNG mật khẩu đăng nhập');
        console.log('\n3. ĐỂ ĐẶT LẠI MẬT KHẨU:');
        console.log('   - Chạy: node update-passwords.js');
        console.log('   - Mật khẩu mặc định sẽ được set là: password123');
        console.log('\n' + '='.repeat(80) + '\n');
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Lỗi khi lấy danh sách user:', error);
        process.exit(1);
    }
}

listUsers();
