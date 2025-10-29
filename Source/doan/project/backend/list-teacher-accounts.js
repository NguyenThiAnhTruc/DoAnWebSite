// List all teacher accounts
const database = require('./config/database');

async function listTeachers() {
    try {
        console.log('\n👨‍🏫 DANH SÁCH TÀI KHOẢN GIÁO VIÊN\n');
        
        const query = `
            SELECT 
                user_id,
                username,
                email,
                first_name,
                last_name,
                role,
                created_at
            FROM Users
            WHERE role = 'Giảng viên' OR role = 'teacher' OR role = 'Teacher'
            ORDER BY user_id
        `;
        
        const result = await database.query(query);
        const teachers = result.recordset || result;
        
        console.log('📊 Tổng số giáo viên:', teachers.length);
        console.log('─────────────────────────────────────────────────────────────');
        
        if (teachers.length > 0) {
            teachers.forEach((teacher, index) => {
                const fullName = `${teacher.first_name || ''} ${teacher.last_name || ''}`.trim() || 'Chưa có tên';
                console.log(`\n${index + 1}. ID: ${teacher.user_id}`);
                console.log(`   Username: ${teacher.username}`);
                console.log(`   Email: ${teacher.email}`);
                console.log(`   Họ tên: ${fullName}`);
                console.log(`   Vai trò: ${teacher.role}`);
                console.log(`   Ngày tạo: ${teacher.created_at}`);
            });
            
            console.log('\n─────────────────────────────────────────────────────────────');
            console.log('💡 Để đăng nhập bằng tài khoản giáo viên:');
            console.log('   1. Đăng xuất tài khoản hiện tại');
            console.log('   2. Đăng nhập bằng username và password của giáo viên');
            console.log('   3. Kiểm tra sự kiện với quyền giáo viên');
        } else {
            console.log('⚠️  Không tìm thấy tài khoản giáo viên nào!');
            console.log('\n💡 Bạn cần tạo tài khoản giáo viên trước.');
        }
        
        // Also show all roles in system
        console.log('\n\n📋 TẤT CẢ VAI TRÒ TRONG HỆ THỐNG:\n');
        const roleQuery = `
            SELECT DISTINCT role, COUNT(*) as count
            FROM Users
            GROUP BY role
            ORDER BY count DESC
        `;
        const roleResult = await database.query(roleQuery);
        const roles = roleResult.recordset || roleResult;
        
        roles.forEach(r => {
            console.log(`   ${r.role}: ${r.count} người dùng`);
        });
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Lỗi:', error.message);
        process.exit(1);
    }
}

listTeachers();
