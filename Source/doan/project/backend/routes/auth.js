const express = require("express");
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const database = require('../config/database');
const { authenticateToken: authMiddleware } = require('../middleware/auth');

// Login route
router.post('/login', async (req, res) => {
    try {
        const { username, email, password } = req.body;
        
        // Accept either username or email
        const loginIdentifier = username || email;
        
        if (!loginIdentifier || !password) {
            return res.status(400).json({
                success: false,
                message: "Username/Email và mật khẩu không được để trống"
            });
        }

        // Check user in database (support both username and email)
        const result = await database.query(
            `SELECT * FROM Users 
             WHERE (username = @identifier OR email = @identifier) 
             AND status = 'active'`,
            { identifier: loginIdentifier }
        );
        const rows = (result && result.recordset) ? result.recordset : (Array.isArray(result) ? result : []);
        const user = rows && rows.length > 0 ? rows[0] : null;
        console.log(`Login attempt for identifier: ${loginIdentifier} -> queryRows=${rows.length}, foundUser=${!!user}`);
        if (user) {
            // log a small summary of user to help debugging (avoid printing password_hash)
            console.log('  user summary:', { user_id: user.user_id, username: user.username, email: user.email, status: user.status });
        }
        if (!user) {
            return res.status(401).json({
                success: false,
                message: "Tài khoản không tồn tại"
            });
        }

        // Verify password
        const validPassword = await bcrypt.compare(password, user.password_hash);
        console.log('Password valid for', loginIdentifier, ':', !!validPassword);
        if (!validPassword) {
            return res.status(401).json({
                success: false,
                message: "Sai mật khẩu"
            });
        }

        // Generate token
        if (!process.env.JWT_SECRET) console.warn('⚠️ JWT_SECRET is not set; tokens may be invalid across restarts');
        const token = jwt.sign(
            { userId: user.user_id },
            process.env.JWT_SECRET || 'dev-secret',
            { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
        );

        // Return success with user data and token
        res.json({
            success: true,
            message: "Đăng nhập thành công",
            user: {
                id: user.user_id,
                user_id: user.user_id,
                username: user.username,
                email: user.email,
                name: `${user.first_name} ${user.last_name}`,
                first_name: user.first_name,
                last_name: user.last_name,
                role: user.role,
                avatar: user.avatar_url || null,
                phone: user.phone || null,
                student_id: user.student_id || null,
                theme: user.theme || 'light',
                language: user.language || 'vi'
            },
            token
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            success: false,
            message: "Lỗi hệ thống, vui lòng thử lại sau"
        });
    }
});

// Register route
router.post('/register', async (req, res) => {
    try {
        const { name, email, password, role = 'user' } = req.body;
        
        if (!name || !email || !password) {
            return res.status(400).json({
                success: false,
                message: "Vui lòng điền đầy đủ thông tin"
            });
        }

        // Check if email exists
        const emailCheck = await database.query(
            'SELECT user_id FROM Users WHERE email = @email',
            { email }
        );

        if (emailCheck.recordset.length > 0) {
            return res.status(400).json({
                success: false,
                message: "Email đã được sử dụng"
            });
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);

        // Split name into first and last name
        const nameParts = name.trim().split(' ');
        const firstName = nameParts[0] || '';
        const lastName = nameParts.slice(1).join(' ') || '';

        // Generate username from email
        const username = email.split('@')[0];

        // Insert new user
        const result = await database.query(
            `INSERT INTO Users (username, email, password_hash, role, status, first_name, last_name, created_at) 
             OUTPUT INSERTED.user_id AS user_id
             VALUES (@username, @email, @passwordHash, @role, 'active', @firstName, @lastName, GETDATE());`,
            { username, email, passwordHash, role, firstName, lastName }
        );

        const userId = result && result.recordset && result.recordset[0] ? result.recordset[0].user_id : null;

        res.status(201).json({
            success: true,
            message: "Đăng ký thành công"
        });
    } catch (error) {
        console.error('Register error:', error);
        res.status(500).json({
            success: false,
            message: "Lỗi hệ thống, vui lòng thử lại sau"
        });
    }
});// Change password route
router.post('/change-password', authMiddleware, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        const userId = req.user.userId;
        
        if (!currentPassword || !newPassword) {
            return res.status(400).json({
                success: false,
                message: "Vui lòng nhập mật khẩu cũ và mới"
            });
        }

        // Get user from database
        const result = await database.query(
            'SELECT password_hash FROM Users WHERE user_id = @userId',
            { userId }
        );

        const user = result.recordset[0];
        if (!user) {
            return res.status(404).json({
                success: false,
                message: "Người dùng không tồn tại"
            });
        }

        // Verify current password
        const validPassword = await bcrypt.compare(currentPassword, user.password_hash);
        if (!validPassword) {
            return res.status(400).json({
                success: false,
                message: "Mật khẩu hiện tại không đúng"
            });
        }

        // Hash new password
        const salt = await bcrypt.genSalt(10);
        const newPasswordHash = await bcrypt.hash(newPassword, salt);

        // Update password
        await database.query(
            'UPDATE Users SET password_hash = @newPasswordHash, updated_at = GETDATE() WHERE user_id = @userId',
            { newPasswordHash, userId }
        );
        
        res.json({
            success: true,
            message: "Đổi mật khẩu thành công"
        });
    } catch (error) {
        console.error('Change password error:', error);
        res.status(500).json({
            success: false,
            message: "Lỗi hệ thống, vui lòng thử lại sau"
        });
    }
});

// Get user profile
router.get('/profile', authMiddleware, async (req, res) => {
    try {
        const userId = req.user.userId;

        const result = await database.query(
            'SELECT user_id, first_name, last_name, email, role, department_id, created_at FROM Users WHERE user_id = @userId',
            { userId }
        );

        const user = result.recordset[0];
        if (!user) {
            return res.status(404).json({
                success: false,
                message: "Người dùng không tồn tại"
            });
        }

        res.json({
            success: true,
            user: {
                id: user.user_id,
                name: `${user.first_name} ${user.last_name}`,
                email: user.email,
                role: user.role,
                department: user.department_id,
                joinedDate: user.created_at
            }
        });
    } catch (error) {
        console.error('Get profile error:', error);
        res.status(500).json({
            success: false,
            message: "Lỗi hệ thống, vui lòng thử lại sau"
        });
    }
});

// Update user profile
router.put('/profile', authMiddleware, async (req, res) => {
    try {
        const userId = req.user.userId;
        const { name, department } = req.body;

        if (!name && !department) {
            return res.status(400).json({
                success: false,
                message: "Không có thông tin cần cập nhật"
            });
        }

        let updateFields = [];
        const params = { userId };

        if (name) {
            const nameParts = name.trim().split(' ');
            const firstName = nameParts[0] || '';
            const lastName = nameParts.slice(1).join(' ') || '';
            updateFields.push('first_name = @firstName', 'last_name = @lastName');
            params.firstName = firstName;
            params.lastName = lastName;
        }
        if (department) {
            updateFields.push('department_id = @department');
            params.department = department;
        }

        const updateQuery = `
            UPDATE Users 
            SET ${updateFields.join(', ')}, updated_at = GETDATE()
            WHERE user_id = @userId;
            SELECT user_id, first_name, last_name, email, role, department_id, updated_at 
            FROM Users 
            WHERE user_id = @userId;
        `;

        const result = await database.query(updateQuery, params);
        const updatedUser = result.recordset[0];

        res.json({
            success: true,
            message: "Cập nhật thông tin thành công",
            user: {
                id: updatedUser.user_id,
                name: `${updatedUser.first_name} ${updatedUser.last_name}`,
                email: updatedUser.email,
                role: updatedUser.role,
                department: updatedUser.department_id,
                updatedAt: updatedUser.updated_at
            }
        });
    } catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({
            success: false,
            message: "Lỗi hệ thống, vui lòng thử lại sau"
        });
    }
});

// Check session route
router.get('/check-session', authMiddleware, (req, res) => {
    res.json({
        success: true,
        message: "Session valid"
    });
});

// Get current user info
router.get('/me', authMiddleware, async (req, res) => {
    try {
        const userId = req.user.userId || req.user.user_id || req.user.id;
        
        const result = await database.query(
            `SELECT user_id, username, email, first_name, last_name, role, 
                    avatar_url, phone, student_id, department_id, theme, language, status 
             FROM Users WHERE user_id = @userId`,
            { userId }
        );

        const user = result.recordset[0];
        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        res.json({
            success: true,
            user: {
                id: user.user_id,
                user_id: user.user_id,
                username: user.username,
                email: user.email,
                name: `${user.first_name} ${user.last_name}`,
                first_name: user.first_name,
                last_name: user.last_name,
                role: user.role,
                avatar: user.avatar_url || null,
                phone: user.phone || null,
                student_id: user.student_id || null,
                department_id: user.department_id || null,
                theme: user.theme || 'light',
                language: user.language || 'vi',
                status: user.status
            }
        });
    } catch (error) {
        console.error('Get current user error:', error);
        res.status(500).json({
            success: false,
            message: "Failed to get user info"
        });
    }
});

module.exports = router;

// Development helper: seed a test user for local testing only
if (process.env.NODE_ENV === 'development') {
    router.post('/dev/seed-test-user', async (req, res) => {
        try {
            const email = req.body.email || 'student_test@example.com';
            const password = req.body.password || 'Password123!';
            const firstName = req.body.firstName || 'Test';
            const lastName = req.body.lastName || 'Student';

            // Check existing
            const exist = await database.query('SELECT user_id FROM Users WHERE email = @email', { email });
            if (exist && exist.recordset && exist.recordset.length > 0) {
                const userId = exist.recordset[0].user_id;
                return res.json({ success: true, message: 'Test user already exists', userId, email });
            }

            const salt = await bcrypt.genSalt(10);
            const passwordHash = await bcrypt.hash(password, salt);
            const username = email.split('@')[0];

            const insert = await database.query(
                `INSERT INTO Users (username, email, password_hash, role, status, first_name, last_name, created_at)
                 OUTPUT INSERTED.user_id AS user_id
                 VALUES (@username, @email, @passwordHash, 'student', 'active', @firstName, @lastName, GETDATE());`,
                { username, email, passwordHash, firstName, lastName }
            );

            const userId = insert && insert.recordset && insert.recordset[0] ? insert.recordset[0].user_id : null;

            res.json({ success: true, message: 'Seeded test user', user: { user_id: userId, email }, password });
        } catch (err) {
            console.error('Seed test user error:', err);
            res.status(500).json({ success: false, message: 'Failed to seed test user', error: err.message });
        }
    });
}