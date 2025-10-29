const express = require("express");
const router = express.Router();
const database = require('../config/database');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

// Middleware to check authentication
const requireAuth = async (req, res, next) => {
    try {
        // Check JWT token first
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.substring(7);
            const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
            
            // Get user from database
            const result = await database.query(
                'SELECT user_id, username, email, first_name, last_name, role FROM Users WHERE user_id = @userId AND status = \'active\'',
                { userId: decoded.userId }
            );
            
            if (result.recordset.length === 0) {
                return res.status(401).json({ error: 'User not found' });
            }
            
            req.user = result.recordset[0];
            return next();
        }
        
        // Fall back to session-based auth
        if (req.session && req.session.user) {
            req.user = req.session.user;
            return next();
        }
        
        return res.status(401).json({ error: 'Unauthorized' });
    } catch (error) {
        console.error('Auth error:', error);
        return res.status(401).json({ error: 'Invalid token' });
    }
};

// GET /api/users - List all users (for messaging)
router.get("/", requireAuth, async (req, res) => {
    try {
        const { role, search } = req.query;
        
        let query = `
            SELECT user_id, username, email, first_name, last_name, role, avatar_url
            FROM Users 
            WHERE status = 'active'
        `;
        
        const params = {};
        
        if (role) {
            query += ' AND role = @role';
            params.role = role;
        }
        
        if (search) {
            query += ' AND (first_name LIKE @search OR last_name LIKE @search OR username LIKE @search OR email LIKE @search)';
            params.search = `%${search}%`;
        }
        
        query += ' ORDER BY role, first_name, last_name';
        
        const result = await database.query(query, params);
        const users = result.recordset || result;
        
        res.json(users);
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ error: 'Failed to fetch users' });
    }
});

// GET /api/users/:id - Get user profile
router.get("/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const query = `
            SELECT user_id, username, email, first_name, last_name, phone, 
                   student_id, role, avatar_url, created_at,
                   language, theme, notify_event_updates, notify_new_events, 
                   notify_reminders, two_factor_enabled
            FROM Users 
            WHERE user_id = @id AND status = 'active'
        `;
        
        const result = await database.query(query, { id: parseInt(id) });
        const rows = result.recordset || result;
        
        if (!rows || rows.length === 0) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        
        const user = rows[0];
        // Don't send password hash
        delete user.password_hash;
        
        // ✅ Set default values if columns don't exist or are NULL
        user.language = user.language || 'vi';
        user.theme = user.theme || 'light';
        user.notify_event_updates = user.notify_event_updates !== undefined ? user.notify_event_updates : true;
        user.notify_new_events = user.notify_new_events !== undefined ? user.notify_new_events : true;
        user.notify_reminders = user.notify_reminders !== undefined ? user.notify_reminders : true;
        user.two_factor_enabled = user.two_factor_enabled || false;
        
        res.json({ success: true, user });
    } catch (err) {
        console.error('GET /api/users/:id error', err);
        res.status(500).json({ success: false, message: 'Failed to get user profile' });
    }
});

// PUT /api/users/:id - Update user profile
router.put("/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const { first_name, last_name, phone, email } = req.body;
        
        // Validate inputs
        if (!first_name || !last_name || !email) {
            return res.status(400).json({ 
                success: false, 
                message: 'Họ, tên và email là bắt buộc' 
            });
        }
        
        const query = `
            UPDATE Users 
            SET first_name = @first_name,
                last_name = @last_name,
                phone = @phone,
                email = @email,
                updated_at = GETDATE()
            WHERE user_id = @id AND status = 'active'
        `;
        
        await database.query(query, {
            id: parseInt(id),
            first_name,
            last_name,
            phone: phone || null,
            email
        });
        
        res.json({ 
            success: true, 
            message: 'Cập nhật hồ sơ thành công' 
        });
    } catch (err) {
        console.error('PUT /api/users/:id error', err);
        res.status(500).json({ 
            success: false, 
            message: 'Không thể cập nhật hồ sơ' 
        });
    }
});

// PUT /api/users/:id/password - Change password
router.put("/:id/password", async (req, res) => {
    try {
        const { id } = req.params;
        const { old_password, new_password } = req.body;
        
        if (!old_password || !new_password) {
            return res.status(400).json({ 
                success: false, 
                message: 'Vui lòng nhập đầy đủ thông tin' 
            });
        }
        
        if (new_password.length < 6) {
            return res.status(400).json({ 
                success: false, 
                message: 'Mật khẩu mới phải có ít nhất 6 ký tự' 
            });
        }
        
        // Get current password hash
        const getQuery = `SELECT password_hash FROM Users WHERE user_id = @id AND status = 'active'`;
        const result = await database.query(getQuery, { id: parseInt(id) });
        const rows = result.recordset || result;
        
        if (!rows || rows.length === 0) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        
        const user = rows[0];
        
        // Verify old password
        const isValid = await bcrypt.compare(old_password, user.password_hash);
        if (!isValid) {
            return res.status(400).json({ 
                success: false, 
                message: 'Mật khẩu hiện tại không đúng' 
            });
        }
        
        // Hash new password
        const saltRounds = 10;
        const newHash = await bcrypt.hash(new_password, saltRounds);
        
        // Update password
        const updateQuery = `
            UPDATE Users 
            SET password_hash = @password_hash, 
                updated_at = GETDATE()
            WHERE user_id = @id
        `;
        
        await database.query(updateQuery, {
            id: parseInt(id),
            password_hash: newHash
        });
        
        res.json({ 
            success: true, 
            message: 'Đổi mật khẩu thành công' 
        });
    } catch (err) {
        console.error('PUT /api/users/:id/password error', err);
        res.status(500).json({ 
            success: false, 
            message: 'Không thể đổi mật khẩu' 
        });
    }
});

// PUT /api/users/:id/notifications - Update notification settings
router.put("/:id/notifications", async (req, res) => {
    try {
        const { id } = req.params;
        const { 
            notify_event_updates, 
            notify_new_events, 
            notify_reminders 
        } = req.body;
        
        const query = `
            UPDATE Users 
            SET notify_event_updates = @notify_event_updates,
                notify_new_events = @notify_new_events,
                notify_reminders = @notify_reminders,
                updated_at = GETDATE()
            WHERE user_id = @id AND status = 'active'
        `;
        
        await database.query(query, {
            id: parseInt(id),
            notify_event_updates: !!notify_event_updates,
            notify_new_events: !!notify_new_events,
            notify_reminders: !!notify_reminders
        });
        
        res.json({ 
            success: true, 
            message: 'Cập nhật thiết lập thông báo thành công' 
        });
    } catch (err) {
        console.error('PUT /api/users/:id/notifications error', err);
        res.status(500).json({ 
            success: false, 
            message: 'Không thể cập nhật thiết lập thông báo' 
        });
    }
});

// PUT /api/users/:id/preferences - Update language and theme
router.put("/:id/preferences", async (req, res) => {
    try {
        const { id } = req.params;
        const { language, theme } = req.body;
        
        // ✅ Update database with new columns
        const query = `
            UPDATE Users 
            SET 
                language = @language,
                theme = @theme,
                updated_at = GETDATE()
            WHERE user_id = @id
        `;
        
        await database.query(query, {
            id: parseInt(id),
            language: language || 'vi',
            theme: theme || 'light'
        });
        
        res.json({ 
            success: true, 
            message: 'Preferences saved successfully',
            preferences: {
                language: language || 'vi',
                theme: theme || 'light'
            }
        });
    } catch (err) {
        console.error('PUT /api/users/:id/preferences error', err);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to update preferences' 
        });
    }
});

// PUT /api/users/:id/2fa - Enable/disable 2FA
router.put("/:id/2fa", async (req, res) => {
    try {
        const { id } = req.params;
        const { enabled } = req.body;
        
        const query = `
            UPDATE Users 
            SET two_factor_enabled = @enabled,
                updated_at = GETDATE()
            WHERE user_id = @id AND status = 'active'
        `;
        
        await database.query(query, {
            id: parseInt(id),
            enabled: !!enabled
        });
        
        res.json({ 
            success: true, 
            message: enabled ? 'Đã bật xác thực 2 bước' : 'Đã tắt xác thực 2 bước'
        });
    } catch (err) {
        console.error('PUT /api/users/:id/2fa error', err);
        res.status(500).json({ 
            success: false, 
            message: 'Không thể cập nhật xác thực 2 bước' 
        });
    }
});

module.exports = router;
