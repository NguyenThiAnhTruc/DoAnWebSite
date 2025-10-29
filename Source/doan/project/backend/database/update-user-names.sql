-- Cập nhật first_name, last_name cho Users nếu NULL
-- Script này sẽ tạo dữ liệu mẫu từ username

-- Cập nhật admin user
UPDATE Users
SET 
    first_name = CASE 
        WHEN first_name IS NULL OR first_name = '' THEN 'Admin'
        ELSE first_name
    END,
    last_name = CASE 
        WHEN last_name IS NULL OR last_name = '' THEN 'System'
        ELSE last_name
    END
WHERE role = 'admin';

-- Cập nhật các user khác nếu chưa có tên
UPDATE Users
SET 
    first_name = CASE 
        WHEN first_name IS NULL OR first_name = '' THEN LEFT(username, CHARINDEX(' ', username + ' ') - 1)
        ELSE first_name
    END,
    last_name = CASE 
        WHEN last_name IS NULL OR last_name = '' THEN SUBSTRING(username, CHARINDEX(' ', username + ' ') + 1, LEN(username))
        ELSE last_name
    END
WHERE (first_name IS NULL OR first_name = '' OR last_name IS NULL OR last_name = '');

-- Kiểm tra kết quả
SELECT 
    user_id, 
    username, 
    first_name, 
    last_name, 
    email, 
    role
FROM Users
ORDER BY user_id;
