-- Create chatbot system user
-- Check if chatbot user exists
IF NOT EXISTS (SELECT 1 FROM Users WHERE user_id = 0)
BEGIN
    -- Enable IDENTITY_INSERT to use user_id = 0
    SET IDENTITY_INSERT Users ON;
    
    INSERT INTO Users (
        user_id,
        username,
        password_hash,
        email,
        first_name,
        last_name,
        role,
        phone,
        student_id,
        department_id,
        created_at
    )
    VALUES (
        0,
        'chatbot',
        'N/A', -- Chatbot doesn't need password
        'chatbot@schoolevents.edu',
        'Chatbot',
        'Hỗ trợ tự động',
        'admin', -- Use admin role for system user
        'N/A',
        NULL,
        NULL,
        GETDATE()
    );
    
    SET IDENTITY_INSERT Users OFF;
    
    PRINT 'Chatbot user created successfully with user_id = 0';
END
ELSE
BEGIN
    PRINT 'Chatbot user already exists';
END
GO

-- Verify
SELECT user_id, username, first_name, last_name, role, email
FROM Users
WHERE user_id = 0;
GO
