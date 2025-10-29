const database = require('./config/database');

async function createTestNotifications() {
    try {
        await database.connect();
        console.log('✅ Database connected successfully');
        
        // Tìm user có ID
        const users = await database.query('SELECT TOP 3 user_id, email FROM Users WHERE status = \'active\'');
        console.log('👥 Found users:', users.recordset.length);
        
        if (users.recordset.length === 0) {
            console.log('❌ No users found');
            return;
        }
        
        const testUser = users.recordset[0];
        console.log('🧪 Creating notifications for user:', testUser.email);
        
        // Tạo 5 thông báo test
        const notifications = [
            {
                title: 'Sự kiện mới được tạo',
                message: 'Hội thảo "Công nghệ thông tin 2024" đã được tạo. Đăng ký ngay!',
                type: 'event_created'
            },
            {
                title: 'Đăng ký thành công', 
                message: 'Bạn đã đăng ký thành công sự kiện Workshop Thiết kế đồ họa',
                type: 'registration_confirmed'
            },
            {
                title: 'Nhắc nhở sự kiện',
                message: 'Cuộc thi Lập trình Olympic sẽ diễn ra vào ngày mai',
                type: 'event_reminder'
            },
            {
                title: 'Sự kiện đã hoàn thành',
                message: 'Sự kiện "Hội thảo AI" đã kết thúc. Cảm ơn bạn đã tham gia!',
                type: 'event_completed'
            },
            {
                title: 'Thông báo quan trọng',
                message: 'Vui lòng cập nhật thông tin cá nhân trong hồ sơ của bạn',
                type: 'system_notification'
            }
        ];
        
        for (const notif of notifications) {
            await database.query(`
                INSERT INTO Notifications (user_id, title, message, type, created_at, is_read)
                VALUES (@userId, @title, @message, @type, GETDATE(), 0)
            `, {
                userId: testUser.user_id,
                title: notif.title,
                message: notif.message,
                type: notif.type
            });
        }
        
        console.log('✅ Created 5 test notifications');
        
        // Kiểm tra notifications đã tạo
        const result = await database.query(`
            SELECT notification_id, title, message, type, is_read, created_at 
            FROM Notifications 
            WHERE user_id = @userId 
            ORDER BY created_at DESC
        `, { userId: testUser.user_id });
        
        console.log(`📊 Total notifications for user ${testUser.email}:`, result.recordset.length);
        result.recordset.forEach(n => {
            console.log(`  - ${n.title} (${n.type}) - Read: ${n.is_read}`);
        });
        
    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        process.exit(0);
    }
}

createTestNotifications();