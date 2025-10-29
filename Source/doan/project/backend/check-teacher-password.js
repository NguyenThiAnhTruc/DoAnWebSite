// Check teacher password
const database = require('./config/database');
const bcrypt = require('bcrypt');

async function checkPassword() {
    try {
        console.log('\n🔐 KIỂM TRA MẬT KHẨU GIÁO VIÊN\n');
        
        const query = `
            SELECT user_id, username, password_hash, email, first_name, last_name
            FROM Users
            WHERE role = 'teacher'
            ORDER BY user_id
        `;
        
        const result = await database.query(query);
        const teachers = result.recordset || result;
        
        // Common passwords to test
        const commonPasswords = ['password123', 'teacher123', '123456', 'password', 'teacher'];
        
        for (const teacher of teachers) {
            const fullName = `${teacher.first_name || ''} ${teacher.last_name || ''}`.trim();
            console.log(`\n📋 ${teacher.username} (${fullName})`);
            console.log(`   Email: ${teacher.email}`);
            console.log(`   Password hash: ${teacher.password_hash.substring(0, 30)}...`);
            
            // Try common passwords
            let foundPassword = null;
            for (const pwd of commonPasswords) {
                const match = await bcrypt.compare(pwd, teacher.password_hash);
                if (match) {
                    foundPassword = pwd;
                    break;
                }
            }
            
            if (foundPassword) {
                console.log(`   ✅ Password: "${foundPassword}"`);
            } else {
                console.log(`   ⚠️  Password không phải trong danh sách phổ biến`);
                console.log(`   💡 Thử các mật khẩu: ${commonPasswords.join(', ')}`);
            }
        }
        
        console.log('\n─────────────────────────────────────────────────────────────');
        console.log('\n💡 HƯỚNG DẪN ĐĂNG NHẬP:');
        console.log('   1. Mở trang Login: http://localhost:3001/Login.html');
        console.log('   2. Nhập username: teacher1');
        console.log('   3. Nhập password (xem phía trên)');
        console.log('   4. Click "Đăng nhập"');
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Lỗi:', error.message);
        process.exit(1);
    }
}

checkPassword();
