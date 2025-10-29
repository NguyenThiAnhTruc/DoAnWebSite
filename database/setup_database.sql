-- =============================================
-- School Event Management System Complete Database Setup
-- Created: October 3, 2025
-- Description: Complete database setup including schema, procedures, and sample data
-- =============================================

-- Create Database
IF NOT EXISTS (SELECT * FROM sys.databases WHERE name = 'SchoolEventManagement')
BEGIN
    CREATE DATABASE SchoolEventManagement;
    PRINT 'Database SchoolEventManagement created successfully';
END
ELSE
BEGIN
    PRINT 'Database SchoolEventManagement already exists';
END
GO

USE SchoolEventManagement;
GO

-- =============================================
-- PART 1: DATABASE SCHEMA
-- =============================================

-- Drop existing tables (in correct order due to foreign keys)
IF OBJECT_ID('EventAttendance', 'U') IS NOT NULL DROP TABLE EventAttendance;
IF OBJECT_ID('EventRegistrations', 'U') IS NOT NULL DROP TABLE EventRegistrations;
IF OBJECT_ID('EventFeedback', 'U') IS NOT NULL DROP TABLE EventFeedback;
IF OBJECT_ID('NotificationLogs', 'U') IS NOT NULL DROP TABLE NotificationLogs;
IF OBJECT_ID('EventImages', 'U') IS NOT NULL DROP TABLE EventImages;
IF OBJECT_ID('Events', 'U') IS NOT NULL DROP TABLE Events;
IF OBJECT_ID('Categories', 'U') IS NOT NULL DROP TABLE Categories;
IF OBJECT_ID('Departments', 'U') IS NOT NULL DROP TABLE Departments;
IF OBJECT_ID('UserProfiles', 'U') IS NOT NULL DROP TABLE UserProfiles;
IF OBJECT_ID('Users', 'U') IS NOT NULL DROP TABLE Users;
GO

-- Users Table
CREATE TABLE Users (
    user_id INT PRIMARY KEY IDENTITY(1,1),
    username NVARCHAR(50) UNIQUE NOT NULL,
    email NVARCHAR(100) UNIQUE NOT NULL,
    password_hash NVARCHAR(255) NOT NULL,
    role NVARCHAR(20) NOT NULL DEFAULT 'student' CHECK (role IN ('student', 'teacher', 'admin', 'organizer')),
    status NVARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
    created_at DATETIME2 DEFAULT GETDATE(),
    updated_at DATETIME2 DEFAULT GETDATE(),
    last_login DATETIME2,
    email_verified BIT DEFAULT 0,
    reset_token NVARCHAR(255),
    reset_token_expiry DATETIME2,
    avatar_url NVARCHAR(500),
    
    -- Additional user fields
    first_name NVARCHAR(50) NOT NULL,
    last_name NVARCHAR(50) NOT NULL,
    phone NVARCHAR(20),
    student_id NVARCHAR(20),
    department_id INT,
    date_of_birth DATE,
    gender NVARCHAR(10) CHECK (gender IN ('Male', 'Female', 'Other')),
    address NVARCHAR(500),
    emergency_contact_name NVARCHAR(100),
    emergency_contact_phone NVARCHAR(20),
    graduation_year INT,
    is_international_student BIT DEFAULT 0,
    
    -- User Settings
    notify_event_updates BIT DEFAULT 1,
    notify_new_events BIT DEFAULT 1,
    notify_reminders BIT DEFAULT 1,
    two_factor_enabled BIT DEFAULT 0,
    two_factor_secret NVARCHAR(255),
    language NVARCHAR(10) DEFAULT 'vi',
    theme NVARCHAR(10) DEFAULT 'light'
);
GO

-- Departments Table
CREATE TABLE Departments (
    department_id INT PRIMARY KEY IDENTITY(1,1),
    department_code NVARCHAR(10) UNIQUE NOT NULL,
    department_name NVARCHAR(100) NOT NULL,
    description NVARCHAR(500),
    head_of_department NVARCHAR(100),
    contact_email NVARCHAR(100),
    contact_phone NVARCHAR(20),
    established_year INT,
    is_active BIT DEFAULT 1,
    created_at DATETIME2 DEFAULT GETDATE()
);
GO

-- Categories Table
CREATE TABLE Categories (
    category_id INT PRIMARY KEY IDENTITY(1,1),
    category_name NVARCHAR(50) UNIQUE NOT NULL,
    description NVARCHAR(255),
    color_code NVARCHAR(7) DEFAULT '#007bff',
    icon_class NVARCHAR(50),
    is_active BIT DEFAULT 1,
    created_at DATETIME2 DEFAULT GETDATE()
);
GO

-- Events Table
CREATE TABLE Events (
    event_id INT PRIMARY KEY IDENTITY(1,1),
    title NVARCHAR(200) NOT NULL,
    description NTEXT,
    short_description NVARCHAR(500),
    location NVARCHAR(200),
    start_date DATE NOT NULL,
    end_date DATE,
    start_time TIME,
    end_time TIME,
    max_participants INT,
    current_participants INT DEFAULT 0,
    price DECIMAL(10,2) DEFAULT 0,
    status NVARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'ongoing', 'completed', 'cancelled')),
    organizer_id INT NOT NULL,
    category_id INT,
    department_id INT FOREIGN KEY REFERENCES Departments(department_id),
    is_public BIT DEFAULT 1,
    registration_deadline DATETIME2,
    contact_email NVARCHAR(100),
    contact_phone NVARCHAR(20),
    requirements NTEXT,
    benefits NTEXT,
    image_url NVARCHAR(500),
    qr_code_data NVARCHAR(500),
    feedback_enabled BIT DEFAULT 1,
    attendance_tracking BIT DEFAULT 1,
    certificate_template NVARCHAR(500),
    tags NVARCHAR(500),
    created_at DATETIME2 DEFAULT GETDATE(),
    updated_at DATETIME2 DEFAULT GETDATE(),
    
    FOREIGN KEY (organizer_id) REFERENCES Users(user_id),
    FOREIGN KEY (category_id) REFERENCES Categories(category_id)
);
GO

-- Event Images Table
CREATE TABLE EventImages (
    image_id INT PRIMARY KEY IDENTITY(1,1),
    event_id INT NOT NULL,
    image_url NVARCHAR(500) NOT NULL,
    alt_text NVARCHAR(255),
    is_primary BIT DEFAULT 0,
    display_order INT DEFAULT 0,
    uploaded_at DATETIME2 DEFAULT GETDATE(),
    
    FOREIGN KEY (event_id) REFERENCES Events(event_id) ON DELETE CASCADE
);
GO

-- Event Registrations Table
CREATE TABLE EventRegistrations (
    registration_id INT PRIMARY KEY IDENTITY(1,1),
    event_id INT NOT NULL,
    user_id INT NOT NULL,
    registration_date DATETIME2 DEFAULT GETDATE(),
    status NVARCHAR(20) DEFAULT 'registered' CHECK (status IN ('registered', 'cancelled', 'waitlisted', 'confirmed')),
    payment_status NVARCHAR(20) DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'refunded', 'waived')),
    qr_code NVARCHAR(255) UNIQUE,
    special_requirements NTEXT,
    emergency_contact_name NVARCHAR(100),
    emergency_contact_phone NVARCHAR(20),
    dietary_restrictions NVARCHAR(500),
    t_shirt_size NVARCHAR(10),
    transportation_needed BIT DEFAULT 0,
    accommodation_needed BIT DEFAULT 0,
    notes NTEXT,
    cancelled_at DATETIME2,
    cancellation_reason NTEXT,
    
    FOREIGN KEY (event_id) REFERENCES Events(event_id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES Users(user_id),
    UNIQUE(event_id, user_id)
);
GO

-- Event Attendance Table
CREATE TABLE EventAttendance (
    attendance_id INT PRIMARY KEY IDENTITY(1,1),
    registration_id INT NOT NULL,
    check_in_time DATETIME2,
    check_out_time DATETIME2,
    attendance_status NVARCHAR(20) DEFAULT 'absent' CHECK (attendance_status IN ('present', 'absent', 'late', 'partial')),
    check_in_method NVARCHAR(20) DEFAULT 'manual' CHECK (check_in_method IN ('manual', 'qr_code', 'nfc', 'facial_recognition')),
    check_in_location NVARCHAR(200),
    notes NTEXT,
    verified_by_id INT,
    created_at DATETIME2 DEFAULT GETDATE(),
    
    FOREIGN KEY (registration_id) REFERENCES EventRegistrations(registration_id) ON DELETE CASCADE,
    FOREIGN KEY (verified_by_id) REFERENCES Users(user_id)
);
GO

-- Event Feedback Table
CREATE TABLE EventFeedback (
    feedback_id INT PRIMARY KEY IDENTITY(1,1),
    event_id INT NOT NULL,
    user_id INT NOT NULL,
    overall_rating INT CHECK (overall_rating BETWEEN 1 AND 5),
    content_rating INT CHECK (content_rating BETWEEN 1 AND 5),
    organization_rating INT CHECK (organization_rating BETWEEN 1 AND 5),
    venue_rating INT CHECK (venue_rating BETWEEN 1 AND 5),
    comments NTEXT,
    suggestions NTEXT,
    would_recommend BIT,
    would_attend_again BIT,
    submitted_at DATETIME2 DEFAULT GETDATE(),
    is_anonymous BIT DEFAULT 0,
    is_approved BIT DEFAULT 1,
    
    FOREIGN KEY (event_id) REFERENCES Events(event_id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES Users(user_id),
    UNIQUE(event_id, user_id)
);
GO

-- Notification Logs Table
CREATE TABLE NotificationLogs (
    log_id INT PRIMARY KEY IDENTITY(1,1),
    user_id INT,
    event_id INT,
    notification_type NVARCHAR(50) NOT NULL,
    title NVARCHAR(200) NOT NULL,
    message NTEXT NOT NULL,
    sent_at DATETIME2 DEFAULT GETDATE(),
    delivery_status NVARCHAR(20) DEFAULT 'sent' CHECK (delivery_status IN ('sent', 'delivered', 'failed', 'bounced')),
    delivery_method NVARCHAR(20) DEFAULT 'email' CHECK (delivery_method IN ('email', 'sms', 'push', 'in_app')),
    read_at DATETIME2,
    clicked_at DATETIME2,
    
    FOREIGN KEY (user_id) REFERENCES Users(user_id),
    FOREIGN KEY (event_id) REFERENCES Events(event_id)
);
GO

-- Add foreign key constraint after Users table is created
ALTER TABLE Users ADD CONSTRAINT FK_Users_Department 
    FOREIGN KEY (department_id) REFERENCES Departments(department_id);
GO

-- Create Indexes for performance
CREATE INDEX IX_Users_Email ON Users(email);
CREATE INDEX IX_Users_Username ON Users(username);
CREATE INDEX IX_Users_Status ON Users(status);
CREATE INDEX IX_Users_Role ON Users(role);
CREATE INDEX IX_Events_Status ON Events(status);
CREATE INDEX IX_Events_StartDate ON Events(start_date);
CREATE INDEX IX_Events_Category ON Events(category_id);
CREATE INDEX IX_Events_Department ON Events(department_id);
CREATE INDEX IX_Events_Organizer ON Events(organizer_id);
CREATE INDEX IX_Registrations_Event ON EventRegistrations(event_id);
CREATE INDEX IX_Registrations_User ON EventRegistrations(user_id);
CREATE INDEX IX_Registrations_Status ON EventRegistrations(status);
CREATE INDEX IX_Attendance_Registration ON EventAttendance(registration_id);
CREATE INDEX IX_Feedback_Event ON EventFeedback(event_id);
CREATE INDEX IX_Notifications_User ON NotificationLogs(user_id);

PRINT '✅ Database schema created successfully!';
GO

-- =============================================
-- PART 2: SAMPLE DATA
-- =============================================

-- Insert Departments
INSERT INTO Departments (department_code, department_name, description, head_of_department, contact_email, contact_phone, established_year) VALUES
('CNTT', N'Công nghệ thông tin', N'Khoa đào tạo các chuyên ngành về công nghệ thông tin và khoa học máy tính', N'TS. Nguyễn Văn A', 'cntt@school.edu.vn', '0123456789', 2000),
('KT', N'Kinh tế', N'Khoa đào tạo các chuyên ngành về kinh tế, tài chính và quản trị kinh doanh', N'TS. Trần Thị B', 'kt@school.edu.vn', '0123456790', 1995),
('NN', N'Ngoại ngữ', N'Khoa đào tạo các chuyên ngành về ngôn ngữ và văn hóa quốc tế', N'TS. Lê Văn C', 'nn@school.edu.vn', '0123456791', 1998),
('MT', N'Mỹ thuật ứng dụng', N'Khoa đào tạo các chuyên ngành về thiết kế, mỹ thuật và truyền thông', N'TS. Phạm Thị D', 'mt@school.edu.vn', '0123456792', 2005),
('DL', N'Du lịch', N'Khoa đào tạo các chuyên ngành về du lịch và dịch vụ khách sạn', N'TS. Hoàng Văn E', 'dl@school.edu.vn', '0123456793', 2010);
GO

-- Insert Categories
INSERT INTO Categories (category_name, description, color_code, icon_class) VALUES
(N'Hội thảo', N'Các buổi hội thảo học thuật và chuyên môn', '#007bff', 'bi-chat-dots'),
(N'Cuộc thi', N'Các cuộc thi học thuật và kỹ năng', '#28a745', 'bi-trophy'),
(N'Workshop', N'Các buổi thực hành và đào tạo kỹ năng', '#ffc107', 'bi-tools'),
(N'Sinh hoạt', N'Các hoạt động sinh hoạt và giải trí', '#dc3545', 'bi-people'),
(N'Thể thao', N'Các hoạt động thể thao và rèn luyện sức khỏe', '#fd7e14', 'bi-dribbble'),
(N'Văn hóa', N'Các hoạt động văn hóa và nghệ thuật', '#6f42c1', 'bi-palette'),
(N'Khoa học', N'Các hoạt động nghiên cứu khoa học', '#20c997', 'bi-lightbulb'),
(N'Tình nguyện', N'Các hoạt động tình nguyện và cộng đồng', '#e83e8c', 'bi-heart');
GO

-- Insert Sample Users (including admin and demo accounts)
INSERT INTO Users (username, email, password_hash, first_name, last_name, role, student_id, department_id, phone, status, email_verified) VALUES
-- Admin account (password: password123)
('admin', 'admin@school.edu.vn', '$2b$12$8mc4RGTzdUQFlHHJhTdBX.1ft06ccLBD1S9y0ggJF7hrGg4joY21G', N'Quản trị', N'Hệ thống', 'admin', NULL, NULL, '0123456789', 'active', 1),

-- Teacher accounts (password: password123)
('teacher1', 'teacher1@school.edu.vn', '$2b$12$8mc4RGTzdUQFlHHJhTdBX.1ft06ccLBD1S9y0ggJF7hrGg4joY21G', N'Nguyễn Văn', N'Nam', 'teacher', 'GV001', 1, '0987654321', 'active', 1),
('teacher2', 'teacher2@school.edu.vn', '$2b$12$8mc4RGTzdUQFlHHJhTdBX.1ft06ccLBD1S9y0ggJF7hrGg4joY21G', N'Trần Thị', N'Lan', 'teacher', 'GV002', 2, '0987654322', 'active', 1),

-- Student accounts (password: password123)
('student1', 'student1@school.edu.vn', '$2b$12$8mc4RGTzdUQFlHHJhTdBX.1ft06ccLBD1S9y0ggJF7hrGg4joY21G', N'Lê Văn', N'An', 'student', 'SV001', 1, '0123456790', 'active', 1),
('student2', 'student2@school.edu.vn', '$2b$12$8mc4RGTzdUQFlHHJhTdBX.1ft06ccLBD1S9y0ggJF7hrGg4joY21G', N'Phạm Thị', N'Bình', 'student', 'SV002', 1, '0123456791', 'active', 1),
('student3', 'student3@school.edu.vn', '$2b$12$8mc4RGTzdUQFlHHJhTdBX.1ft06ccLBD1S9y0ggJF7hrGg4joY21G', N'Hoàng Văn', N'Cường', 'student', 'SV003', 2, '0123456792', 'active', 1),
('student4', 'student4@school.edu.vn', '$2b$12$8mc4RGTzdUQFlHHJhTdBX.1ft06ccLBD1S9y0ggJF7hrGg4joY21G', N'Nguyễn Thị', N'Dung', 'student', 'SV004', 2, '0123456793', 'active', 1);
GO

-- Insert Sample Events
INSERT INTO Events (title, description, short_description, location, start_date, end_date, start_time, end_time, max_participants, price, status, organizer_id, category_id, department_id, contact_email, contact_phone, image_url, is_public) VALUES
(N'Hội thảo Công nghệ AI 2025', 
 N'Hội thảo về những xu hướng mới nhất trong lĩnh vực Trí tuệ nhân tạo, bao gồm Machine Learning, Deep Learning và các ứng dụng thực tế trong doanh nghiệp. Sự kiện sẽ có sự tham gia của các chuyên gia hàng đầu trong lĩnh vực AI từ các công ty công nghệ lớn.',
 N'Khám phá xu hướng AI mới nhất cùng các chuyên gia hàng đầu',
 N'Hội trường A - Tòa nhà chính', 
 DATEADD(day, 7, GETDATE()), DATEADD(day, 7, GETDATE()), '14:00:00', '17:00:00', 
 150, 0, 'published', 2, 1, 1, 'ai2025@school.edu.vn', '0123456789', 
 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&h=400&fit=crop', 1),

(N'Cuộc thi Lập trình Spring 2025',
 N'Cuộc thi lập trình dành cho sinh viên với chủ đề phát triển ứng dụng web sử dụng Spring Framework. Thí sinh sẽ có 4 tiếng để hoàn thành một dự án hoàn chỉnh. Giải thưởng hấp dẫn cho các đội chiến thắng.',
 N'Thử thách kỹ năng lập trình Spring Framework trong 4 tiếng',
 N'Phòng Lab 501-502', 
 DATEADD(day, 14, GETDATE()), DATEADD(day, 14, GETDATE()), '08:00:00', '12:00:00', 
 50, 50000, 'published', 2, 2, 1, 'contest@school.edu.vn', '0123456790',
 'https://images.unsplash.com/photo-1517457373958-b7bdd4587205?w=800&h=400&fit=crop', 1),

(N'Workshop React & Node.js',
 N'Workshop thực hành phát triển ứng dụng full-stack với React Frontend và Node.js Backend. Tham gia để học cách xây dựng một ứng dụng web hoàn chỉnh từ A đến Z với các công nghệ hiện đại.',
 N'Học cách xây dựng ứng dụng full-stack với React & Node.js',
 N'Phòng thực hành 301', 
 DATEADD(day, 21, GETDATE()), DATEADD(day, 21, GETDATE()), '09:00:00', '17:00:00', 
 30, 100000, 'published', 2, 3, 1, 'workshop@school.edu.vn', '0123456791',
 'https://images.unsplash.com/photo-1475721027785-f74eccf877e2?w=800&h=400&fit=crop', 1),

(N'Hội thảo Khởi nghiệp Sinh viên',
 N'Hội thảo chia sẻ kinh nghiệm khởi nghiệp từ các doanh nhân trẻ thành công. Cung cấp kiến thức và định hướng cho sinh viên có ý định khởi nghiệp. Bao gồm các phiên thảo luận và networking.',
 N'Định hướng và chia sẻ kinh nghiệm khởi nghiệp từ chuyên gia',
 N'Hội trường chính', 
 DATEADD(day, 10, GETDATE()), DATEADD(day, 10, GETDATE()), '08:00:00', '11:00:00', 
 200, 0, 'published', 3, 1, 2, 'startup@school.edu.vn', '0123456792',
 'https://images.unsplash.com/photo-1523580494863-6f3031224c94?w=800&h=400&fit=crop', 1),

(N'Cuộc thi Thiết kế Logo 2025',
 N'Cuộc thi thiết kế logo cho năm học mới. Sinh viên sẽ thể hiện tài năng sáng tạo và kỹ năng thiết kế đồ họa. Các tác phẩm sẽ được đánh giá bởi hội đồng giám khảo chuyên nghiệp.',
 N'Thể hiện tài năng thiết kế với giải thưởng hấp dẫn',
 N'Phòng thiết kế 401', 
 DATEADD(day, 18, GETDATE()), DATEADD(day, 18, GETDATE()), '13:00:00', '16:00:00', 
 40, 0, 'published', 3, 2, 4, 'design@school.edu.vn', '0123456793',
 'https://images.unsplash.com/photo-1505373877841-8d25f7d46678?w=800&h=400&fit=crop', 1);
GO

-- Insert some sample registrations
INSERT INTO EventRegistrations (event_id, user_id, status, payment_status, qr_code) VALUES
-- Event 1 (Hội thảo AI): 85 người đăng ký (HOT!)
(1, 4, 'registered', 'paid', 'QR_1_4_' + CAST(DATEDIFF(second, '1970-01-01', GETDATE()) as NVARCHAR(20))),
(1, 5, 'registered', 'paid', 'QR_1_5_' + CAST(DATEDIFF(second, '1970-01-01', GETDATE()) as NVARCHAR(20))),
(1, 6, 'registered', 'paid', 'QR_1_6_' + CAST(DATEDIFF(second, '1970-01-01', GETDATE()) as NVARCHAR(20))),
-- Event 2 (Lập trình Spring): 42 người đăng ký
(2, 4, 'registered', 'paid', 'QR_2_4_' + CAST(DATEDIFF(second, '1970-01-01', GETDATE()) as NVARCHAR(20))),
(2, 5, 'registered', 'pending', 'QR_2_5_' + CAST(DATEDIFF(second, '1970-01-01', GETDATE()) as NVARCHAR(20))),
-- Event 3 (Workshop React): 18 người đăng ký
(3, 6, 'registered', 'paid', 'QR_3_6_' + CAST(DATEDIFF(second, '1970-01-01', GETDATE()) as NVARCHAR(20))),
-- Event 4 (Khởi nghiệp): 120 người đăng ký (VERY HOT!)
(4, 4, 'registered', 'paid', 'QR_4_4_' + CAST(DATEDIFF(second, '1970-01-01', GETDATE()) as NVARCHAR(20))),
(4, 5, 'registered', 'paid', 'QR_4_5_' + CAST(DATEDIFF(second, '1970-01-01', GETDATE()) as NVARCHAR(20))),
(4, 6, 'registered', 'paid', 'QR_4_6_' + CAST(DATEDIFF(second, '1970-01-01', GETDATE()) as NVARCHAR(20))),
-- Event 5 (Thiết kế Logo): 25 người đăng ký
(5, 4, 'registered', 'paid', 'QR_5_4_' + CAST(DATEDIFF(second, '1970-01-01', GETDATE()) as NVARCHAR(20))),
(5, 6, 'registered', 'pending', 'QR_5_6_' + CAST(DATEDIFF(second, '1970-01-01', GETDATE()) as NVARCHAR(20)));
GO

-- Simulate more registrations by updating current_participants directly
-- (In real system, this would be done through actual EventRegistrations)
UPDATE Events SET current_participants = 85 WHERE title LIKE N'%Hội thảo Công nghệ AI%';
UPDATE Events SET current_participants = 42 WHERE title LIKE N'%Cuộc thi Lập trình Spring%';
UPDATE Events SET current_participants = 18 WHERE title LIKE N'%Workshop React%';
UPDATE Events SET current_participants = 120 WHERE title LIKE N'%Hội thảo Khởi nghiệp%';
UPDATE Events SET current_participants = 25 WHERE title LIKE N'%Cuộc thi Thiết kế Logo%';
GO

PRINT '✅ Sample data inserted successfully!';
GO

-- =============================================
-- PART 3: STORED PROCEDURES
-- =============================================

-- Drop existing procedures if they exist
IF EXISTS (SELECT * FROM sys.objects WHERE type = 'P' AND name = 'sp_LoginUser')
    DROP PROCEDURE sp_LoginUser;
GO

IF EXISTS (SELECT * FROM sys.objects WHERE type = 'P' AND name = 'sp_UpdateLastLogin')
    DROP PROCEDURE sp_UpdateLastLogin;
GO

IF EXISTS (SELECT * FROM sys.objects WHERE type = 'P' AND name = 'sp_RegisterUser')
    DROP PROCEDURE sp_RegisterUser;
GO

-- Stored procedure for user login
CREATE PROCEDURE sp_LoginUser
    @username NVARCHAR(255)
AS
BEGIN
    SET NOCOUNT ON;
    
    SELECT 
        user_id,
        username,
        email,
        password_hash,
        first_name,
        last_name,
        role,
        student_id,
        department_id,
        phone,
        status,
        last_login,
        created_at,
        email_verified
    FROM Users 
    WHERE (username = @username OR email = @username) 
    AND status = 'active';
END;
GO

-- Stored procedure to update last login time
CREATE PROCEDURE sp_UpdateLastLogin
    @userId INT
AS
BEGIN
    SET NOCOUNT ON;
    
    UPDATE Users 
    SET last_login = GETDATE(),
        updated_at = GETDATE()
    WHERE user_id = @userId;
END;
GO

-- Stored procedure for user registration
CREATE PROCEDURE sp_RegisterUser
    @username NVARCHAR(255),
    @email NVARCHAR(255),
    @passwordHash NVARCHAR(255),
    @firstName NVARCHAR(255),
    @lastName NVARCHAR(255),
    @role NVARCHAR(50) = 'student',
    @studentId NVARCHAR(50) = NULL,
    @department NVARCHAR(255) = NULL,
    @phone NVARCHAR(20) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    
    DECLARE @newUserId INT;
    DECLARE @errorMessage NVARCHAR(500);
    DECLARE @departmentId INT = NULL;
    
    -- Check if username or email already exists
    IF EXISTS (SELECT 1 FROM Users WHERE username = @username OR email = @email)
    BEGIN
        SELECT 
            0 as Success,
            'Email hoặc tên đăng nhập đã tồn tại' as Message,
            NULL as user_id;
        RETURN;
    END
    
    -- Convert department name to department_id if provided
    IF @department IS NOT NULL
    BEGIN
        SELECT @departmentId = department_id 
        FROM Departments 
        WHERE department_code = @department OR department_name = @department;
    END
    
    BEGIN TRY
        INSERT INTO Users (
            username,
            email,
            password_hash,
            first_name,
            last_name,
            role,
            student_id,
            department_id,
            phone,
            status,
            created_at,
            email_verified
        ) VALUES (
            @username,
            @email,
            @passwordHash,
            @firstName,
            @lastName,
            @role,
            @studentId,
            @departmentId,
            @phone,
            'active',
            GETDATE(),
            1
        );
        
        SET @newUserId = SCOPE_IDENTITY();
        
        SELECT 
            1 as Success,
            'Đăng ký thành công' as Message,
            @newUserId as user_id;
            
    END TRY
    BEGIN CATCH
        SET @errorMessage = ERROR_MESSAGE();
        SELECT 
            0 as Success,
            @errorMessage as Message,
            NULL as user_id;
    END CATCH
END;
GO

-- Stored procedure to get events
CREATE PROCEDURE sp_GetEvents
    @PageNumber INT = 1,
    @PageSize INT = 10,
    @CategoryId INT = NULL,
    @Department NVARCHAR(50) = NULL,
    @Status NVARCHAR(20) = NULL,
    @SearchTerm NVARCHAR(255) = NULL,
    @UserId INT = NULL
AS
BEGIN
    SET NOCOUNT ON;
    
    DECLARE @Offset INT = (@PageNumber - 1) * @PageSize;
    DECLARE @Now DATETIME = GETDATE();
    
    SELECT 
        e.event_id AS id,
        e.title,
        e.description,
        e.short_description,
        e.location,
        e.start_date,
        e.end_date,
        e.start_time,
        e.end_time,
        e.max_participants,
        e.current_participants,
        e.price,
        -- Calculate dynamic status based on dates
        CASE 
            WHEN e.status = 'cancelled' THEN 'cancelled'
            WHEN e.status = 'draft' THEN 'draft'
            WHEN CAST(e.end_date AS DATETIME) + CAST(ISNULL(e.end_time, '23:59:59') AS DATETIME) < @Now THEN 'completed'
            WHEN CAST(e.start_date AS DATETIME) + CAST(ISNULL(e.start_time, '00:00:00') AS DATETIME) <= @Now 
                 AND CAST(e.end_date AS DATETIME) + CAST(ISNULL(e.end_time, '23:59:59') AS DATETIME) >= @Now THEN 'ongoing'
            ELSE 'upcoming'
        END AS status,
        e.contact_email,
        e.contact_phone,
        c.category_name AS category,
        d.department_name AS department,
        d.department_name AS organizer,
        d.department_code,
        u.first_name + ' ' + u.last_name AS organizer_name,
        e.image_url,
        e.created_at,
        e.updated_at,
        CASE WHEN er.registration_id IS NOT NULL THEN 1 ELSE 0 END AS is_registered
    FROM Events e
    LEFT JOIN Categories c ON e.category_id = c.category_id
    LEFT JOIN Departments d ON e.department_id = d.department_id
    LEFT JOIN Users u ON e.organizer_id = u.user_id
    LEFT JOIN EventRegistrations er ON e.event_id = er.event_id AND er.user_id = @UserId
    WHERE e.is_public = 1
        AND (@CategoryId IS NULL OR e.category_id = @CategoryId)
        AND (@Department IS NULL OR d.department_name = @Department OR d.department_code = @Department)
        AND (
            @Status IS NULL OR
            (@Status = 'upcoming' AND CAST(e.start_date AS DATETIME) > @Now AND e.status NOT IN ('cancelled', 'draft')) OR
            (@Status = 'ongoing' AND CAST(e.start_date AS DATETIME) <= @Now AND CAST(e.end_date AS DATETIME) >= @Now AND e.status NOT IN ('cancelled', 'draft')) OR
            (@Status = 'completed' AND (CAST(e.end_date AS DATETIME) < @Now OR e.status = 'completed') AND e.status != 'cancelled') OR
            (@Status = 'cancelled' AND e.status = 'cancelled') OR
            (@Status = 'draft' AND e.status = 'draft')
        )
        AND (@SearchTerm IS NULL OR 
             e.title LIKE '%' + @SearchTerm + '%' OR 
             e.description LIKE '%' + @SearchTerm + '%' OR
             e.short_description LIKE '%' + @SearchTerm + '%')
    ORDER BY e.start_date ASC
    OFFSET @Offset ROWS
    FETCH NEXT @PageSize ROWS ONLY;
    
    -- Return total count
    SELECT COUNT(*) AS TotalCount
    FROM Events e
    LEFT JOIN Departments d ON e.department_id = d.department_id
    WHERE e.is_public = 1
        AND (@CategoryId IS NULL OR e.category_id = @CategoryId)
        AND (@Department IS NULL OR d.department_name = @Department OR d.department_code = @Department)
        AND (
            @Status IS NULL OR
            (@Status = 'upcoming' AND CAST(e.start_date AS DATETIME) > @Now AND e.status NOT IN ('cancelled', 'draft')) OR
            (@Status = 'ongoing' AND CAST(e.start_date AS DATETIME) <= @Now AND CAST(e.end_date AS DATETIME) >= @Now AND e.status NOT IN ('cancelled', 'draft')) OR
            (@Status = 'completed' AND (CAST(e.end_date AS DATETIME) < @Now OR e.status = 'completed') AND e.status != 'cancelled') OR
            (@Status = 'cancelled' AND e.status = 'cancelled') OR
            (@Status = 'draft' AND e.status = 'draft')
        )
        AND (@SearchTerm IS NULL OR 
             e.title LIKE '%' + @SearchTerm + '%' OR 
             e.description LIKE '%' + @SearchTerm + '%' OR
             e.short_description LIKE '%' + @SearchTerm + '%');
END;
GO

PRINT '✅ Authentication stored procedures created successfully!';
GO

-- =============================================
-- FINAL MESSAGE
-- =============================================
PRINT '🎉 Complete database setup finished successfully!';
PRINT '📊 Database: SchoolEventManagement';
PRINT '👥 Sample users created (password for all: password123)';
PRINT '   - admin@school.edu.vn (Admin)';
PRINT '   - teacher1@school.edu.vn (Teacher)';  
PRINT '   - student1@school.edu.vn (Student)';
PRINT '🎯 Sample events and data inserted';
PRINT '⚙️ Stored procedures ready for authentication';
PRINT '';
PRINT '✅ Ready to use!';
GO