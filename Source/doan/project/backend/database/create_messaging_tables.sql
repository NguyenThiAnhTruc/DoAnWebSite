-- Create Messages and Conversations tables for messaging system

-- Table: Conversations (Cuộc trò chuyện)
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[Conversations]') AND type in (N'U'))
BEGIN
    CREATE TABLE Conversations (
        conversation_id INT IDENTITY(1,1) PRIMARY KEY,
        title NVARCHAR(255) NULL,
        created_by INT NOT NULL,
        created_at DATETIME DEFAULT GETDATE(),
        updated_at DATETIME DEFAULT GETDATE(),
        is_archived BIT DEFAULT 0,
        FOREIGN KEY (created_by) REFERENCES Users(user_id) ON DELETE CASCADE
    );
    PRINT '✅ Table Conversations created';
END
ELSE
BEGIN
    PRINT 'ℹ️ Table Conversations already exists';
END
GO

-- Table: ConversationParticipants (Người tham gia cuộc trò chuyện)
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[ConversationParticipants]') AND type in (N'U'))
BEGIN
    CREATE TABLE ConversationParticipants (
        participant_id INT IDENTITY(1,1) PRIMARY KEY,
        conversation_id INT NOT NULL,
        user_id INT NOT NULL,
        joined_at DATETIME DEFAULT GETDATE(),
        last_read_at DATETIME NULL,
        FOREIGN KEY (conversation_id) REFERENCES Conversations(conversation_id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE NO ACTION,
        UNIQUE(conversation_id, user_id)
    );
    PRINT '✅ Table ConversationParticipants created';
END
ELSE
BEGIN
    PRINT 'ℹ️ Table ConversationParticipants already exists';
END
GO

-- Table: Messages (Tin nhắn)
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[Messages]') AND type in (N'U'))
BEGIN
    CREATE TABLE Messages (
        message_id INT IDENTITY(1,1) PRIMARY KEY,
        conversation_id INT NOT NULL,
        sender_id INT NOT NULL,
        content NVARCHAR(MAX) NOT NULL,
        sent_at DATETIME DEFAULT GETDATE(),
        is_deleted BIT DEFAULT 0,
        deleted_at DATETIME NULL,
        FOREIGN KEY (conversation_id) REFERENCES Conversations(conversation_id) ON DELETE CASCADE,
        FOREIGN KEY (sender_id) REFERENCES Users(user_id) ON DELETE NO ACTION
    );
    PRINT '✅ Table Messages created';
END
ELSE
BEGIN
    PRINT 'ℹ️ Table Messages already exists';
END
GO

-- Create indexes for performance
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_Messages_ConversationId' AND object_id = OBJECT_ID('Messages'))
BEGIN
    CREATE INDEX IX_Messages_ConversationId ON Messages(conversation_id);
    PRINT '✅ Index IX_Messages_ConversationId created';
END

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_Messages_SentAt' AND object_id = OBJECT_ID('Messages'))
BEGIN
    CREATE INDEX IX_Messages_SentAt ON Messages(sent_at DESC);
    PRINT '✅ Index IX_Messages_SentAt created';
END

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_ConversationParticipants_UserId' AND object_id = OBJECT_ID('ConversationParticipants'))
BEGIN
    CREATE INDEX IX_ConversationParticipants_UserId ON ConversationParticipants(user_id);
    PRINT '✅ Index IX_ConversationParticipants_UserId created';
END
GO

PRINT '';
PRINT '✨ Messaging tables setup completed!';
PRINT '';
PRINT '📋 Tables created:';
PRINT '  1. Conversations - Lưu thông tin cuộc trò chuyện';
PRINT '  2. ConversationParticipants - Người tham gia';
PRINT '  3. Messages - Tin nhắn';
PRINT '';
PRINT '🔑 Features:';
PRINT '  - Student ↔ Teacher messaging';
PRINT '  - Group conversations';
PRINT '  - Message history';
PRINT '  - Read/unread tracking';
PRINT '  - Soft delete messages';
GO
