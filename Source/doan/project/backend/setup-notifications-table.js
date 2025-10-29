// Create Notifications table
const database = require('./config/database');

async function createNotificationsTable() {
    try {
        console.log('\n🔧 Creating Notifications table...\n');
        
        // Drop table if exists
        console.log('⚡ Step 1: Dropping table if exists...');
        try {
            await database.query(`
                IF OBJECT_ID('Notifications', 'U') IS NOT NULL
                    DROP TABLE Notifications
            `);
            console.log('✅ Old table dropped (if existed)');
        } catch (err) {
            console.log('⚠️ No existing table to drop');
        }
        
        // Create table
        console.log('\n⚡ Step 2: Creating Notifications table...');
        await database.query(`
            CREATE TABLE Notifications (
                notification_id INT IDENTITY(1,1) PRIMARY KEY,
                user_id INT NOT NULL,
                title NVARCHAR(255) NOT NULL,
                message NVARCHAR(MAX) NOT NULL,
                type NVARCHAR(50) NOT NULL,
                related_event_id INT NULL,
                is_read BIT NOT NULL DEFAULT 0,
                read_at DATETIME NULL,
                created_at DATETIME NOT NULL DEFAULT GETDATE(),
                
                CONSTRAINT FK_Notifications_Users FOREIGN KEY (user_id) 
                    REFERENCES Users(user_id) ON DELETE CASCADE,
                CONSTRAINT FK_Notifications_Events FOREIGN KEY (related_event_id) 
                    REFERENCES Events(event_id) ON DELETE CASCADE
            )
        `);
        console.log('✅ Table created successfully');
        
        // Create indexes
        console.log('\n⚡ Step 3: Creating indexes...');
        await database.query(`CREATE INDEX IX_Notifications_UserId ON Notifications(user_id)`);
        await database.query(`CREATE INDEX IX_Notifications_IsRead ON Notifications(is_read)`);
        await database.query(`CREATE INDEX IX_Notifications_CreatedAt ON Notifications(created_at DESC)`);
        await database.query(`CREATE INDEX IX_Notifications_Type ON Notifications(type)`);
        console.log('✅ Indexes created successfully');
        
        // Insert sample data
        console.log('\n⚡ Step 4: Inserting sample notifications...');
        await database.query(`
            INSERT INTO Notifications (user_id, title, message, type, related_event_id, is_read, created_at)
            VALUES 
                (1, N'Đăng ký thành công', N'Bạn đã đăng ký thành công sự kiện "Hội thảo Công nghệ AI 2025"', 'registration_confirmed', 1, 0, GETDATE()),
                (1, N'Nhắc nhở sự kiện', N'Sự kiện "Hội thảo Công nghệ AI 2025" sẽ bắt đầu sau 24 giờ nữa', 'event_reminder', 1, 0, GETDATE()),
                (2, N'Đăng ký thành công', N'Bạn đã đăng ký thành công sự kiện "Workshop React & Node.js"', 'registration_confirmed', 3, 0, DATEADD(MINUTE, -30, GETDATE())),
                (2, N'Sự kiện hoàn tất', N'Sự kiện "Workshop React & Node.js" đã kết thúc. Cảm ơn bạn đã tham gia!', 'event_completed', 3, 1, DATEADD(HOUR, -2, GETDATE()))
        `);
        console.log('✅ Sample data inserted');
        console.log('✅ Sample data inserted');
        
        // Verify table
        console.log('\n⚡ Step 5: Verifying table...');
        const checkQuery = `
            SELECT COUNT(*) as count 
            FROM INFORMATION_SCHEMA.TABLES 
            WHERE TABLE_NAME = 'Notifications'
        `;
        const result = await database.query(checkQuery);
        const tableExists = (result.recordset || result)[0].count > 0;
        
        if (tableExists) {
            console.log('✅ Table verified successfully!');
            
            // Show sample data
            const sampleQuery = 'SELECT TOP 5 * FROM Notifications ORDER BY created_at DESC';
            const samples = await database.query(sampleQuery);
            const rows = samples.recordset || samples;
            
            console.log(`\n📊 Sample notifications (${rows.length} rows):`);
            rows.forEach(row => {
                console.log(`   ID: ${row.notification_id} | User: ${row.user_id} | Type: ${row.type}`);
                console.log(`   Title: ${row.title}`);
                console.log(`   Read: ${row.is_read ? 'Yes' : 'No'} | Created: ${row.created_at.toLocaleString('vi-VN')}`);
                console.log('   ---');
            });
            
            console.log('\n✅ SUCCESS! Notifications table is ready to use!');
            console.log('🚀 You can now restart the server with: npm run dev');
        } else {
            console.log('\n❌ Table verification failed');
        }
        
        process.exit(0);
    } catch (error) {
        console.error('\n❌ Error:', error.message);
        process.exit(1);
    }
}

createNotificationsTable();
