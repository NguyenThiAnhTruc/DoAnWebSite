// ============================================
// TEST DATE/TIME FORMAT FIX
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

// Helper functions (same as in events.js)
const formatDate = (dateStr) => {
    if (!dateStr) return null;
    const date = new Date(dateStr);
    return date.toISOString().split('T')[0]; // YYYY-MM-DD
};

const formatTime = (timeStr) => {
    if (!timeStr) return null;
    // Ensure HH:MM:SS format
    if (timeStr.length === 5) return timeStr + ':00'; // Add seconds
    return timeStr;
};

async function testDateTimeFormat() {
    try {
        await sql.connect(config);
        console.log('✅ Kết nối SQL Server thành công!\n');
        
        // Test data from HTML form
        const testData = {
            title: 'TEST Event - Date Time Format',
            description: 'Testing date/time conversion',
            short_description: 'Test date/time',
            start_date: '2025-11-15', // From HTML date input
            start_time: '14:30', // From HTML time input (HH:MM)
            end_date: '2025-11-15',
            end_time: '17:00',
            location: 'Test Room',
            max_participants: 50
        };
        
        console.log('📋 Dữ liệu đầu vào (từ HTML form):');
        console.log('   start_date:', testData.start_date, '(type:', typeof testData.start_date + ')');
        console.log('   start_time:', testData.start_time, '(type:', typeof testData.start_time + ')');
        console.log('');
        
        console.log('🔧 Sau khi format:');
        console.log('   start_date:', formatDate(testData.start_date));
        console.log('   start_time:', formatTime(testData.start_time));
        console.log('');
        
        // Test INSERT
        console.log('📝 TEST 1: INSERT event với date/time đã format');
        const insertQuery = `
            INSERT INTO Events (
                title, 
                description, 
                short_description, 
                category_id,
                start_date, 
                start_time, 
                end_date, 
                end_time, 
                location, 
                max_participants, 
                current_participants,
                status, 
                organizer_id,
                created_at
            )
            VALUES (
                @title,
                @description,
                @short_description,
                1,
                @start_date,
                @start_time,
                @end_date,
                @end_time,
                @location,
                @max_participants,
                0,
                'draft',
                1,
                GETDATE()
            );
            SELECT SCOPE_IDENTITY() AS event_id;
        `;
        
        const request = new sql.Request();
        request.input('title', sql.NVarChar, testData.title);
        request.input('description', sql.NText, testData.description);
        request.input('short_description', sql.NVarChar, testData.short_description);
        request.input('start_date', sql.Date, formatDate(testData.start_date));
        request.input('start_time', sql.Time, formatTime(testData.start_time));
        request.input('end_date', sql.Date, formatDate(testData.end_date));
        request.input('end_time', sql.Time, formatTime(testData.end_time));
        request.input('location', sql.NVarChar, testData.location);
        request.input('max_participants', sql.Int, testData.max_participants);
        
        const result = await request.query(insertQuery);
        const eventId = result.recordset[0].event_id;
        
        console.log(`   ✅ INSERT thành công! Event ID: ${eventId}\n`);
        
        // Verify
        console.log('🔍 TEST 2: Đọc lại event vừa tạo');
        const verifyQuery = `SELECT * FROM Events WHERE event_id = @id`;
        const verifyRequest = new sql.Request();
        verifyRequest.input('id', sql.Int, eventId);
        const verifyResult = await verifyRequest.query(verifyQuery);
        const event = verifyResult.recordset[0];
        
        console.log('   ✅ Dữ liệu trong database:');
        console.log('      - Title:', event.title);
        console.log('      - Start Date:', event.start_date);
        console.log('      - Start Time:', event.start_time);
        console.log('      - End Date:', event.end_date);
        console.log('      - End Time:', event.end_time);
        console.log('');
        
        // Cleanup
        console.log('🗑️  TEST 3: Xóa test event');
        await sql.query`DELETE FROM Events WHERE event_id = ${eventId}`;
        console.log('   ✅ Đã xóa test event\n');
        
        console.log('🎉 TẤT CẢ TESTS THÀNH CÔNG!');
        console.log('✅ Date/Time format đã được sửa đúng!');
        console.log('✅ Có thể tạo event từ HTML form mà không bị lỗi conversion!');
        
    } catch (err) {
        console.error('❌ LỖI:', err.message);
        console.error('📋 Chi tiết:', err);
    } finally {
        await sql.close();
        process.exit(0);
    }
}

testDateTimeFormat();
