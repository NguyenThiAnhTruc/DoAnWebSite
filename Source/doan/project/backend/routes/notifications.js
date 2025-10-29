const express = require('express');
const router = express.Router();
const database = require('../config/database');

// ========================================
// GET /api/notifications - Lấy danh sách thông báo của user
// ========================================
router.get('/', async (req, res) => {
    try {
        const userId = req.query.userId;
        const limit = parseInt(req.query.limit) || 50;
        const unreadOnly = req.query.unreadOnly === 'true';

        if (!userId) {
            return res.status(400).json({
                success: false,
                message: 'User ID is required'
            });
        }

        let query = `
            SELECT TOP (@limit)
                log_id as id,
                user_id as userId,
                event_id as eventId,
                notification_type as type,
                title,
                message,
                sent_at as createdAt,
                delivery_status as status,
                read_at as readAt,
                CASE WHEN read_at IS NULL THEN 0 ELSE 1 END as isRead
            FROM NotificationLogs
            WHERE user_id = @userId
        `;

        if (unreadOnly) {
            query += ' AND read_at IS NULL';
        }

        query += ' ORDER BY sent_at DESC';

        const result = await database.query(query, { 
            userId: parseInt(userId),
            limit: limit
        });

        const notifications = result.recordset || result || [];

        res.json({
            success: true,
            notifications: notifications,
            count: notifications.length
        });

    } catch (err) {
        console.error('GET /api/notifications error:', err);
        res.status(500).json({
            success: false,
            message: 'Failed to get notifications: ' + err.message
        });
    }
});

// ========================================
// GET /api/notifications/unread-count - Đếm số thông báo chưa đọc
// ========================================
router.get('/unread-count', async (req, res) => {
    try {
        const userId = req.query.userId;

        if (!userId) {
            return res.status(400).json({
                success: false,
                message: 'User ID is required'
            });
        }

        const query = `
            SELECT COUNT(*) as unreadCount
            FROM NotificationLogs
            WHERE user_id = @userId AND read_at IS NULL
        `;

        const result = await database.query(query, { 
            userId: parseInt(userId)
        });

        const count = result.recordset[0].unreadCount;

        res.json({
            success: true,
            unreadCount: count
        });

    } catch (err) {
        console.error('GET /api/notifications/unread-count error:', err);
        res.status(500).json({
            success: false,
            message: 'Failed to get unread count: ' + err.message
        });
    }
});

// ========================================
// POST /api/notifications - Tạo thông báo mới
// ========================================
router.post('/', async (req, res) => {
    try {
        const { 
            userId, 
            eventId, 
            type, 
            title, 
            message, 
            deliveryMethod = 'in_app' 
        } = req.body;

        if (!userId || !type || !title || !message) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields: userId, type, title, message'
            });
        }

        // Validate notification type
        const validTypes = [
            'event_created',
            'event_updated', 
            'event_cancelled',
            'registration_confirmed',
            'registration_cancelled',
            'event_reminder',
            'attendance_marked',
            'feedback_request',
            'system_announcement',
            'other'
        ];

        if (!validTypes.includes(type)) {
            return res.status(400).json({
                success: false,
                message: `Invalid notification type. Must be one of: ${validTypes.join(', ')}`
            });
        }

        const query = `
            INSERT INTO NotificationLogs (
                user_id, 
                event_id, 
                notification_type, 
                title, 
                message,
                delivery_method,
                delivery_status,
                sent_at
            )
            OUTPUT INSERTED.log_id
            VALUES (
                @userId, 
                @eventId, 
                @type, 
                @title, 
                @message,
                @deliveryMethod,
                'sent',
                GETDATE()
            )
        `;

        const result = await database.query(query, {
            userId: parseInt(userId),
            eventId: eventId ? parseInt(eventId) : null,
            type: type,
            title: title,
            message: message,
            deliveryMethod: deliveryMethod
        });

        const notificationId = result.recordset[0].log_id;

        console.log(`✅ Notification created: ID=${notificationId}, User=${userId}, Type=${type}`);

        res.status(201).json({
            success: true,
            message: 'Notification created successfully',
            notificationId: notificationId
        });

    } catch (err) {
        console.error('POST /api/notifications error:', err);
        res.status(500).json({
            success: false,
            message: 'Failed to create notification: ' + err.message
        });
    }
});

// ========================================
// POST /api/notifications/bulk - Tạo nhiều thông báo cùng lúc
// ========================================
router.post('/bulk', async (req, res) => {
    try {
        const { userIds, eventId, type, title, message, deliveryMethod = 'in_app' } = req.body;

        if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'userIds must be a non-empty array'
            });
        }

        if (!type || !title || !message) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields: type, title, message'
            });
        }

        // Tạo values cho bulk insert
        const values = userIds.map((userId, index) => 
            `(@userId${index}, @eventId, @type, @title, @message, @deliveryMethod, 'sent', GETDATE())`
        ).join(', ');

        const query = `
            INSERT INTO NotificationLogs (
                user_id, event_id, notification_type, title, message, 
                delivery_method, delivery_status, sent_at
            )
            VALUES ${values}
        `;

        // Tạo parameters object
        const params = {
            eventId: eventId ? parseInt(eventId) : null,
            type: type,
            title: title,
            message: message,
            deliveryMethod: deliveryMethod
        };

        userIds.forEach((userId, index) => {
            params[`userId${index}`] = parseInt(userId);
        });

        await database.query(query, params);

        console.log(`✅ Bulk notifications created: ${userIds.length} users, Type=${type}`);

        res.status(201).json({
            success: true,
            message: `${userIds.length} notifications created successfully`,
            count: userIds.length
        });

    } catch (err) {
        console.error('POST /api/notifications/bulk error:', err);
        res.status(500).json({
            success: false,
            message: 'Failed to create bulk notifications: ' + err.message
        });
    }
});

// ========================================
// PUT /api/notifications/:id/read - Đánh dấu thông báo đã đọc
// ========================================
router.put('/:id/read', async (req, res) => {
    try {
        const { id } = req.params;

        const query = `
            UPDATE NotificationLogs
            SET read_at = GETDATE(),
                delivery_status = 'delivered'
            WHERE log_id = @id AND read_at IS NULL
        `;

        await database.query(query, { id: parseInt(id) });

        res.json({
            success: true,
            message: 'Notification marked as read'
        });

    } catch (err) {
        console.error('PUT /api/notifications/:id/read error:', err);
        res.status(500).json({
            success: false,
            message: 'Failed to mark notification as read: ' + err.message
        });
    }
});

// ========================================
// PUT /api/notifications/mark-all-read - Đánh dấu tất cả thông báo đã đọc
// ========================================
router.put('/mark-all-read', async (req, res) => {
    try {
        const { userId } = req.body;

        if (!userId) {
            return res.status(400).json({
                success: false,
                message: 'User ID is required'
            });
        }

        const query = `
            UPDATE NotificationLogs
            SET read_at = GETDATE(),
                delivery_status = 'delivered'
            WHERE user_id = @userId AND read_at IS NULL
        `;

        const result = await database.query(query, { 
            userId: parseInt(userId) 
        });

        console.log(`✅ All notifications marked as read for user ${userId}`);

        res.json({
            success: true,
            message: 'All notifications marked as read'
        });

    } catch (err) {
        console.error('PUT /api/notifications/mark-all-read error:', err);
        res.status(500).json({
            success: false,
            message: 'Failed to mark all as read: ' + err.message
        });
    }
});

// ========================================
// DELETE /api/notifications/:id - Xóa thông báo
// ========================================
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const query = `
            DELETE FROM NotificationLogs
            WHERE log_id = @id
        `;

        await database.query(query, { id: parseInt(id) });

        res.json({
            success: true,
            message: 'Notification deleted successfully'
        });

    } catch (err) {
        console.error('DELETE /api/notifications/:id error:', err);
        res.status(500).json({
            success: false,
            message: 'Failed to delete notification: ' + err.message
        });
    }
});

// ========================================
// DELETE /api/notifications/clear-all - Xóa tất cả thông báo đã đọc
// ========================================
router.delete('/clear-all', async (req, res) => {
    try {
        const userId = req.query.userId;

        if (!userId) {
            return res.status(400).json({
                success: false,
                message: 'User ID is required'
            });
        }

        const query = `
            DELETE FROM NotificationLogs
            WHERE user_id = @userId AND read_at IS NOT NULL
        `;

        await database.query(query, { 
            userId: parseInt(userId) 
        });

        console.log(`✅ All read notifications cleared for user ${userId}`);

        res.json({
            success: true,
            message: 'All read notifications cleared'
        });

    } catch (err) {
        console.error('DELETE /api/notifications/clear-all error:', err);
        res.status(500).json({
            success: false,
            message: 'Failed to clear notifications: ' + err.message
        });
    }
});

// ========================================
// POST /api/notifications/test-reminder - Test gửi event reminders (dev only)
// ========================================
router.post('/test-reminder', async (req, res) => {
    try {
        if (process.env.NODE_ENV === 'production') {
            return res.status(403).json({ 
                success: false, 
                message: 'Not available in production' 
            });
        }

        const notificationScheduler = require('../services/notification-scheduler');
        await notificationScheduler.sendEventReminders();
        
        res.json({ 
            success: true, 
            message: 'Event reminders sent successfully' 
        });
    } catch (err) {
        console.error('POST /api/notifications/test-reminder error:', err);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to send reminders: ' + err.message 
        });
    }
});

// ========================================
// POST /api/notifications/test-completion - Test gửi completion notifications (dev only)
// ========================================
router.post('/test-completion', async (req, res) => {
    try {
        if (process.env.NODE_ENV === 'production') {
            return res.status(403).json({ 
                success: false, 
                message: 'Not available in production' 
            });
        }

        const notificationScheduler = require('../services/notification-scheduler');
        await notificationScheduler.checkCompletedEvents();
        
        res.json({ 
            success: true, 
            message: 'Completion notifications sent successfully' 
        });
    } catch (err) {
        console.error('POST /api/notifications/test-completion error:', err);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to send completion notifications: ' + err.message 
        });
    }
});

module.exports = router;
