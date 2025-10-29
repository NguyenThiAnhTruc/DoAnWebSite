// ============================================
// TEST SQL CONNECTION
// ============================================
const sql = require('mssql');
require('dotenv').config();

const config = {
    server: process.env.DB_SERVER,
    database: process.env.DB_DATABASE,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    port: parseInt(process.env.DB_PORT),
    options: {
        encrypt: process.env.DB_ENCRYPT === 'true',
        trustServerCertificate: process.env.DB_TRUST_SERVER_CERTIFICATE === 'true',
        enableArithAbort: true
    }
};

async function testConnection() {
    try {
        console.log('🔌 Đang kết nối SQL Server...');
        console.log('📋 Config:', {
            server: config.server,
            database: config.database,
            user: config.user,
            port: config.port
        });
        
        // Kết nối database
        await sql.connect(config);
        console.log('✅ Kết nối SQL Server thành công!\n');
        
        // Test 1: Đếm số bảng
        console.log('📊 TEST 1: Đếm số bảng trong database');
        const tableResult = await sql.query`
            SELECT COUNT(*) as TableCount 
            FROM INFORMATION_SCHEMA.TABLES 
            WHERE TABLE_TYPE='BASE TABLE'
        `;
        console.log(`   ✅ Có ${tableResult.recordset[0].TableCount} bảng\n`);
        
        // Test 2: Đếm users
        console.log('👥 TEST 2: Đếm số users');
        const userResult = await sql.query`SELECT COUNT(*) as UserCount FROM Users`;
        console.log(`   ✅ Có ${userResult.recordset[0].UserCount} users\n`);
        
        // Test 3: Đếm events
        console.log('🎯 TEST 3: Đếm số events');
        const eventResult = await sql.query`SELECT COUNT(*) as EventCount FROM Events`;
        console.log(`   ✅ Có ${eventResult.recordset[0].EventCount} events\n`);
        
        // Test 4: Test stored procedure
        console.log('⚙️  TEST 4: Test stored procedure sp_GetEvents');
        const spResult = await sql.query`EXEC sp_GetEvents @PageNumber=1, @PageSize=3`;
        console.log(`   ✅ sp_GetEvents trả về ${spResult.recordset.length} events\n`);
        
        // Hiển thị 3 events đầu tiên
        console.log('📋 Danh sách 3 events đầu:');
        spResult.recordset.forEach((event, index) => {
            console.log(`   ${index + 1}. ${event.title}`);
            console.log(`      - Địa điểm: ${event.location}`);
            console.log(`      - Ngày: ${event.start_date.toLocaleDateString('vi-VN')}`);
            console.log(`      - Số người đăng ký: ${event.current_participants}/${event.max_participants}`);
            console.log('');
        });
        
        console.log('🎉 TẤT CẢ TESTS ĐỀU THÀNH CÔNG!');
        console.log('✅ Server Node.js có thể kết nối và truy vấn SQL Server bình thường!');
        
    } catch (err) {
        console.error('❌ LỖI KẾT NỐI SQL:', err.message);
        console.error('📋 Chi tiết lỗi:', err);
    } finally {
        await sql.close();
        console.log('\n🔌 Đã đóng kết nối SQL Server');
        process.exit(0);
    }
}

testConnection();
