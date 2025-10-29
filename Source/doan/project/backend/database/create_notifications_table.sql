-- ============================================
-- CREATE NOTIFICATIONS TABLE
-- ============================================

USE SchoolEventDB;
GO

-- Drop table if exists (for clean setup)
IF OBJECT_ID('Notifications', 'U') IS NOT NULL
    DROP TABLE Notifications;
GO

-- Create Notifications table
CREATE TABLE Notifications (
    notification_id INT IDENTITY(1,1) PRIMARY KEY,
    user_id INT NOT NULL,
    title NVARCHAR(255) NOT NULL,
    message NVARCHAR(MAX) NOT NULL,
    type NVARCHAR(50) NOT NULL, -- 'registration_confirmed', 'event_reminder', 'event_completed', 'event_cancelled'
    related_event_id INT NULL,
    is_read BIT NOT NULL DEFAULT 0,
    read_at DATETIME NULL,
    created_at DATETIME NOT NULL DEFAULT GETDATE(),
    
    CONSTRAINT FK_Notifications_Users FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE CASCADE,
    CONSTRAINT FK_Notifications_Events FOREIGN KEY (related_event_id) REFERENCES Events(event_id) ON DELETE CASCADE
);
GO

-- Create indexes for performance
CREATE INDEX IX_Notifications_UserId ON Notifications(user_id);
CREATE INDEX IX_Notifications_IsRead ON Notifications(is_read);
CREATE INDEX IX_Notifications_CreatedAt ON Notifications(created_at DESC);
CREATE INDEX IX_Notifications_Type ON Notifications(type);
GO

-- Insert sample notifications for testing
INSERT INTO Notifications (user_id, title, message, type, related_event_id, is_read, created_at)
VALUES 
    (1, 'Đăng ký thành công', 'Bạn đã đăng ký thành công sự kiện "Hội thảo Công nghệ AI 2025"', 'registration_confirmed', 1, 0, GETDATE()),
    (1, 'Nhắc nhở sự kiện', 'Sự kiện "Hội thảo Công nghệ AI 2025" sẽ bắt đầu sau 24 giờ nữa', 'event_reminder', 1, 0, GETDATE()),
    (2, 'Đăng ký thành công', 'Bạn đã đăng ký thành công sự kiện "Workshop React & Node.js"', 'registration_confirmed', 3, 0, DATEADD(MINUTE, -30, GETDATE())),
    (2, 'Sự kiện hoàn tất', 'Sự kiện "Workshop React & Node.js" đã kết thúc. Cảm ơn bạn đã tham gia!', 'event_completed', 3, 1, DATEADD(HOUR, -2, GETDATE()));
GO

-- Verify table creation
SELECT 
    'Notifications table created successfully' AS Status,
    COUNT(*) AS SampleNotificationCount
FROM Notifications;
GO

-- Show table structure
EXEC sp_help 'Notifications';
GO

PRINT '✅ Notifications table created successfully!';
PRINT '📊 Sample notifications inserted for testing';
PRINT '🔍 You can now run: SELECT * FROM Notifications';
