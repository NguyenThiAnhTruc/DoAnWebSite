const express = require("express");
const router = express.Router();
const database = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🔧 HELPER: Extract user from JWT token
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
async function getUserFromToken(req) {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
        return { error: { status: 401, message: 'Unauthorized: No token provided' } };
    }

    try {
        const jwt = require('jsonwebtoken');
        const secret = process.env.JWT_SECRET || 'your_super_secret_jwt_key_here';
        const decoded = jwt.verify(token, secret);
        
        const userId = decoded.userId || decoded.user_id || decoded.id;
        if (!userId) {
            return { error: { status: 401, message: 'Unauthorized: Invalid token format' } };
        }

        // ✅ FIX: Lấy role từ database thay vì tin token
        const userQuery = `SELECT user_id, role, username, email FROM Users WHERE user_id = @userId AND status = 'active'`;
        const userResult = await database.query(userQuery, { userId });
        const users = userResult.recordset || userResult;
        
        if (!users || users.length === 0) {
            return { error: { status: 401, message: 'Unauthorized: User not found or inactive' } };
        }

        const user = users[0];
        return { 
            user: {
                userId: user.user_id,
                role: user.role,
                username: user.username,
                email: user.email
            }
        };
    } catch (err) {
        console.error('❌ Token verification error:', err);
        return { error: { status: 401, message: 'Unauthorized: Invalid token' } };
    }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// GET /api/events - List events
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
router.get("/", async (req, res) => {
    try {
        const params = {
            PageNumber: parseInt(req.query.PageNumber) || 1,
            PageSize: parseInt(req.query.PageSize) || 50,
            CategoryId: req.query.CategoryId ? parseInt(req.query.CategoryId) : null,
            Department: req.query.Department || req.query.department || null,
            Status: req.query.Status || req.query.status || null,
            SearchTerm: req.query.SearchTerm || req.query.search || null,
            UserId: req.query.UserId || req.query.userId || null
        };

        let result;
        try {
            console.log('🔍 Calling sp_GetEvents with params:', params);
            const proc = await database.executeProcedure('sp_GetEvents', params);
            const rows = proc.recordset || (proc.recordsets && proc.recordsets[0]) || [];
            const total = (proc.recordsets && proc.recordsets[1] && proc.recordsets[1][0] && proc.recordsets[1][0].TotalCount) || rows.length;
            console.log('✅ sp_GetEvents returned:', rows.length, 'events');
            result = { success: true, events: rows, total };
        } catch (procErr) {
            console.log('❌ sp_GetEvents FAILED:', procErr.message);
            console.log('⚠️ Using fallback query');
            
            // Fallback query with proper JOIN
            const fallbackQuery = `
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
                    e.status,
                    u.first_name + ' ' + u.last_name AS organizer,
                    e.image_url,
                    -- ✅ Thêm thông tin về capacity
                    CASE 
                        WHEN e.max_participants IS NULL THEN 0
                        WHEN e.current_participants >= e.max_participants THEN 1
                        ELSE 0
                    END AS is_full
                FROM Events e
                LEFT JOIN Users u ON e.organizer_id = u.user_id
                WHERE 1=1
                    ${params.Status ? 'AND e.status = @status' : ''}
                    ${params.SearchTerm ? 'AND (e.title LIKE @searchTerm OR e.description LIKE @searchTerm)' : ''}
                ORDER BY e.start_date DESC
                OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY
            `;
            
            const offset = (params.PageNumber - 1) * params.PageSize;
            const fallbackParams = {
                status: params.Status,
                searchTerm: params.SearchTerm ? `%${params.SearchTerm}%` : null,
                offset,
                pageSize: params.PageSize
            };
            
            const fallbackResult = await database.query(fallbackQuery, fallbackParams);
            const rows = fallbackResult.recordset || fallbackResult;
            
            console.log('📊 Fallback returned:', rows.length, 'events');
            result = { success: true, events: rows, total: rows.length };
        }

        res.json(result);
    } catch (err) {
        console.error('GET /api/events error', err);
        res.status(500).json({ success: false, message: 'Failed to retrieve events' });
    }
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// POST /api/events - Create new event
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
router.post("/", async (req, res) => {
    try {
        const {
            title,
            description,
            short_description,
            category,
            start_date,
            start_time,
            end_date,
            end_time,
            location,
            max_participants,
            status,
            image_url
        } = req.body;

        // ✅ Validate required fields
        if (!title || !description || !start_date || !location) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields: title, description, start_date, location'
            });
        }

        // ✅ Validate max_participants
        if (max_participants && (isNaN(max_participants) || parseInt(max_participants) < 1)) {
            return res.status(400).json({
                success: false,
                message: 'max_participants must be a positive number'
            });
        }

        // Get user from token
        const { user, error } = await getUserFromToken(req);
        if (error) {
            return res.status(error.status).json({ success: false, message: error.message });
        }

        // ✅ Check permission: Only admin and teacher can create events
        if (user.role !== 'admin' && user.role !== 'teacher') {
            return res.status(403).json({
                success: false,
                message: 'Forbidden: Only admin and teacher can create events'
            });
        }

        console.log('📝 Creating event with organizer_id:', user.userId, 'role:', user.role);

        // Insert event
        const query = `
            INSERT INTO Events (
                title, 
                description, 
                short_description, 
                category_id, 
                start_date, 
                start_time, 
                end_date, 
                end_time, 
                location, 
                max_participants, 
                current_participants,
                status, 
                organizer_id,
                image_url,
                created_at
            )
            VALUES (
                @title,
                @description,
                @short_description,
                ISNULL((SELECT category_id FROM Categories WHERE category_name = @category), 1),
                @start_date,
                @start_time,
                @end_date,
                @end_time,
                @location,
                @max_participants,
                0,
                @status,
                @organizer_id,
                @image_url,
                GETDATE()
            );
            SELECT SCOPE_IDENTITY() AS event_id;
        `;

        const result = await database.query(query, {
            title,
            description,
            short_description: short_description || description.substring(0, 150),
            category: category || 'Khác',
            start_date,
            start_time: start_time || '00:00',
            end_date: end_date || start_date,
            end_time: end_time || '23:59',
            location,
            max_participants: parseInt(max_participants) || 100,
            status: status || 'published',
            organizer_id: user.userId,
            image_url: image_url || null
        });

        const eventId = result.recordset[0].event_id;

        // Insert image if provided
        if (image_url) {
            const imgQuery = `
                INSERT INTO EventImages (event_id, image_url, is_primary)
                VALUES (@event_id, @image_url, 1)
            `;
            await database.query(imgQuery, { event_id: eventId, image_url });
        }

        console.log('✅ Created new event:', eventId, 'by user:', user.userId);

        // 🔔 Create notifications for users with notify_new_events enabled
        try {
            const usersQuery = `
                SELECT user_id 
                FROM Users 
                WHERE notify_new_events = 1 
                AND status = 'active' 
                AND user_id != @organizer_id
            `;
            const usersResult = await database.query(usersQuery, { organizer_id: user.userId });
            const users = usersResult.recordset || [];

            if (users.length > 0) {
                const values = users.map((u, index) => 
                    `(@userId${index}, @eventId, 'event_created', @title, @message, 'in_app', 'sent', GETDATE())`
                ).join(', ');

                const notifQuery = `
                    INSERT INTO NotificationLogs (
                        user_id, event_id, notification_type, title, message,
                        delivery_method, delivery_status, sent_at
                    )
                    VALUES ${values}
                `;

                const notifParams = {
                    eventId: eventId,
                    title: 'Sự kiện mới được tạo',
                    message: `Hội thảo "${title}" đã được tạo. Đăng ký ngay!`
                };

                users.forEach((u, index) => {
                    notifParams[`userId${index}`] = u.user_id;
                });

                await database.query(notifQuery, notifParams);
                console.log(`✅ Created ${users.length} notifications for new event ${eventId}`);
            }
        } catch (notifErr) {
            console.error('⚠️ Failed to create notifications:', notifErr);
        }

        res.status(201).json({
            success: true,
            message: 'Event created successfully',
            event: { event_id: eventId, title }
        });
    } catch (err) {
        console.error('POST /api/events error:', err);
        res.status(500).json({
            success: false,
            message: 'Failed to create event: ' + err.message
        });
    }
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// GET /api/events/:id - Get single event with full details
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
router.get('/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const query = `
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
                e.registration_deadline,
                e.price, 
                e.status, 
                e.contact_email, 
                e.contact_phone, 
                c.category_name AS category, 
                d.department_name AS department, 
                u.first_name + ' ' + u.last_name AS organizer,
                u.user_id AS organizer_id,
                ei.image_url AS image_url,
                -- ✅ Thêm thông tin về availability
                CASE 
                    WHEN e.max_participants IS NULL THEN 0
                    WHEN e.current_participants >= e.max_participants THEN 1
                    ELSE 0
                END AS is_full,
                CASE
                    WHEN e.registration_deadline IS NOT NULL AND e.registration_deadline < GETDATE() THEN 1
                    ELSE 0
                END AS is_registration_closed,
                e.max_participants - e.current_participants AS available_slots
            FROM Events e 
            LEFT JOIN Categories c ON e.category_id = c.category_id 
            LEFT JOIN Departments d ON e.department_id = d.department_id 
            LEFT JOIN Users u ON e.organizer_id = u.user_id 
            LEFT JOIN EventImages ei ON e.event_id = ei.event_id AND ei.is_primary = 1 
            WHERE e.event_id = @id
        `;
        
        const resp = await database.query(query, { id: parseInt(id) });
        const recs = resp.recordset || resp;
        
        if (!recs || recs.length === 0) {
            return res.status(404).json({ success: false, message: 'Event not found' });
        }
        
        const event = recs[0];
        res.json({ success: true, event });
    } catch (err) {
        console.error('GET /api/events/:id error', err);
        res.status(500).json({ success: false, message: 'Failed to retrieve event' });
    }
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// POST /api/events/:id/register - Register user for event
// ✅ FIX: Race condition với SQL transaction + row locking
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
router.post('/:id/register', async (req, res) => {
    const { id } = req.params;
    const { userId } = req.body;

    if (!userId) {
        return res.status(400).json({ success: false, message: 'userId is required' });
    }

    let transaction;
    
    try {
        // ✅ START TRANSACTION
        const sql = require('mssql');
        transaction = new sql.Transaction(database.pool);
        await transaction.begin();

        // ✅ LOCK EVENT ROW để tránh race condition
        const lockQuery = `
            SELECT 
                event_id, 
                title, 
                max_participants, 
                current_participants, 
                registration_deadline,
                status
            FROM Events WITH (UPDLOCK, HOLDLOCK)
            WHERE event_id = @id
        `;
        
        const lockRequest = transaction.request();
        lockRequest.input('id', sql.Int, parseInt(id));
        const eventResult = await lockRequest.query(lockQuery);
        const rows = eventResult.recordset;
        
        if (!rows || rows.length === 0) {
            await transaction.rollback();
            return res.status(404).json({ success: false, message: 'Event not found' });
        }
        
        const event = rows[0];

        // ✅ Check event status
        if (event.status === 'cancelled') {
            await transaction.rollback();
            return res.status(400).json({ 
                success: false, 
                message: 'Cannot register for cancelled event' 
            });
        }

        if (event.status === 'completed') {
            await transaction.rollback();
            return res.status(400).json({ 
                success: false, 
                message: 'Cannot register for completed event' 
            });
        }

        // ✅ Check already registered
        const checkRequest = transaction.request();
        checkRequest.input('id', sql.Int, parseInt(id));
        checkRequest.input('userId', sql.Int, parseInt(userId));
        const checkResult = await checkRequest.query(`
            SELECT registration_id 
            FROM EventRegistrations 
            WHERE event_id = @id AND user_id = @userId
        `);
        
        const chkRows = checkResult.recordset;
        if (chkRows && chkRows.length > 0) {
            await transaction.rollback();
            return res.status(400).json({ 
                success: false, 
                message: 'User already registered for this event' 
            });
        }

        // ✅ Check capacity (CRITICAL CHECK)
        if (event.max_participants && event.current_participants >= event.max_participants) {
            await transaction.rollback();
            return res.status(400).json({ 
                success: false, 
                message: `Event is full (${event.current_participants}/${event.max_participants} participants)` 
            });
        }

        // ✅ Check registration deadline
        if (event.registration_deadline && new Date(event.registration_deadline) < new Date()) {
            await transaction.rollback();
            return res.status(400).json({ 
                success: false, 
                message: 'Registration deadline has passed' 
            });
        }

        // ✅ Insert registration
        const qrCode = `QR_${id}_${userId}_${Date.now()}`;
        const insertRequest = transaction.request();
        insertRequest.input('id', sql.Int, parseInt(id));
        insertRequest.input('userId', sql.Int, parseInt(userId));
        insertRequest.input('qr', sql.NVarChar, qrCode);
        
        const insertResult = await insertRequest.query(`
            INSERT INTO EventRegistrations (event_id, user_id, status, payment_status, qr_code, registration_date)
            VALUES (@id, @userId, 'registered', 'pending', @qr, GETDATE());
            SELECT SCOPE_IDENTITY() AS registration_id;
        `);
        
        const regId = insertResult.recordset[0].registration_id;

        // ✅ Update current participants count (ATOMIC)
        const updateRequest = transaction.request();
        updateRequest.input('id', sql.Int, parseInt(id));
        await updateRequest.query(`
            UPDATE Events 
            SET current_participants = ISNULL(current_participants, 0) + 1 
            WHERE event_id = @id
        `);

        // ✅ COMMIT TRANSACTION
        await transaction.commit();

        console.log(`✅ User ${userId} registered for event ${id}. Registration ID: ${regId}`);

        res.status(201).json({ 
            success: true, 
            message: 'Registered successfully', 
            registration: { 
                registrationId: regId, 
                eventId: parseInt(id), 
                userId: parseInt(userId), 
                qrCode,
                eventTitle: event.title,
                currentParticipants: event.current_participants + 1,
                maxParticipants: event.max_participants
            } 
        });
        
    } catch (err) {
        // ✅ ROLLBACK on error
        if (transaction) {
            try {
                await transaction.rollback();
                console.log('⚠️ Transaction rolled back due to error');
            } catch (rollbackErr) {
                console.error('❌ Rollback error:', rollbackErr);
            }
        }
        
        console.error('POST /api/events/:id/register error', err);
        res.status(500).json({ 
            success: false, 
            message: 'Registration failed: ' + err.message 
        });
    }
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// POST /api/events/:id/unregister - Unregister from event
// ✅ NEW: Cho phép hủy đăng ký
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
router.post('/:id/unregister', async (req, res) => {
    const { id } = req.params;
    const { userId } = req.body;

    if (!userId) {
        return res.status(400).json({ success: false, message: 'userId is required' });
    }

    try {
        // Check if registered
        const checkQuery = `
            SELECT registration_id 
            FROM EventRegistrations 
            WHERE event_id = @id AND user_id = @userId
        `;
        const checkResult = await database.query(checkQuery, { 
            id: parseInt(id), 
            userId: parseInt(userId) 
        });
        const rows = checkResult.recordset || checkResult;
        
        if (!rows || rows.length === 0) {
            return res.status(400).json({ 
                success: false, 
                message: 'User is not registered for this event' 
            });
        }

        // Delete registration
        await database.query(`
            DELETE FROM EventRegistrations 
            WHERE event_id = @id AND user_id = @userId
        `, { id: parseInt(id), userId: parseInt(userId) });

        // Update current participants count
        await database.query(`
            UPDATE Events 
            SET current_participants = CASE 
                WHEN current_participants > 0 THEN current_participants - 1 
                ELSE 0 
            END
            WHERE event_id = @id
        `, { id: parseInt(id) });

        console.log(`✅ User ${userId} unregistered from event ${id}`);

        res.json({ 
            success: true, 
            message: 'Unregistered successfully' 
        });
        
    } catch (err) {
        console.error('POST /api/events/:id/unregister error', err);
        res.status(500).json({ 
            success: false, 
            message: 'Unregistration failed: ' + err.message 
        });
    }
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// GET /api/events/:id/registrations - Get registrations for an event
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
router.get('/:id/registrations', async (req, res) => {
    const { id } = req.params;
    try {
        const q = `
            SELECT 
                r.registration_id AS id, 
                r.event_id AS eventId, 
                r.user_id AS userId, 
                u.username AS userName,
                u.first_name + ' ' + u.last_name AS fullName,
                u.email,
                u.student_id,
                r.registration_date AS registrationDate, 
                r.status,
                r.qr_code AS qrCode
            FROM EventRegistrations r 
            LEFT JOIN Users u ON r.user_id = u.user_id 
            WHERE r.event_id = @id
            ORDER BY r.registration_date DESC
        `;
        const out = await database.query(q, { id: parseInt(id) });
        const recs = out.recordset || out;
        res.json({ success: true, registrations: recs });
    } catch (err) {
        console.error('GET /api/events/:id/registrations error', err);
        res.status(500).json({ success: false, message: 'Failed to get registrations' });
    }
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// PUT /api/events/:id - Update event (admin/teacher only)
// ✅ FIX: Lấy role từ database
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const {
            title,
            description,
            short_description,
            category,
            start_date,
            start_time,
            end_date,
            end_time,
            location,
            max_participants,
            status,
            image_url
        } = req.body;

        // ✅ Get user with role from database
        const { user, error } = await getUserFromToken(req);
        if (error) {
            return res.status(error.status).json({ success: false, message: error.message });
        }

        console.log('🔐 User:', user.userId, 'Role:', user.role, 'updating event:', id);

        // ✅ Check permission: admin or teacher only
        if (user.role !== 'admin' && user.role !== 'teacher') {
            return res.status(403).json({ 
                success: false, 
                message: 'Forbidden: Only admin and teacher can update events' 
            });
        }

        // Check if event exists
        const checkQuery = `SELECT event_id, organizer_id, title FROM Events WHERE event_id = @id`;
        const checkResult = await database.query(checkQuery, { id: parseInt(id) });
        const rows = checkResult.recordset || checkResult;
        
        if (!rows || rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Event not found' });
        }

        // ✅ Teachers can only update their own events, admins can update any
        const event = rows[0];
        if (user.role === 'teacher' && event.organizer_id !== user.userId) {
            return res.status(403).json({ 
                success: false, 
                message: 'Forbidden: Teachers can only update their own events' 
            });
        }

        // Build dynamic update query
        const updates = [];
        const params = { id: parseInt(id) };

        if (title) {
            updates.push('title = @title');
            params.title = title;
        }
        if (description) {
            updates.push('description = @description');
            params.description = description;
        }
        if (short_description !== undefined) {
            updates.push('short_description = @short_description');
            params.short_description = short_description;
        }
        if (category) {
            updates.push('category_id = ISNULL((SELECT category_id FROM Categories WHERE category_name = @category), category_id)');
            params.category = category;
        }
        if (start_date) {
            updates.push('start_date = @start_date');
            params.start_date = start_date;
        }
        if (start_time) {
            updates.push('start_time = @start_time');
            params.start_time = start_time;
        }
        if (end_date) {
            updates.push('end_date = @end_date');
            params.end_date = end_date;
        }
        if (end_time) {
            updates.push('end_time = @end_time');
            params.end_time = end_time;
        }
        if (location) {
            updates.push('location = @location');
            params.location = location;
        }
        if (max_participants) {
            // ✅ Validate không giảm max_participants xuống dưới current_participants
            const currentCount = await database.query(
                `SELECT current_participants FROM Events WHERE event_id = @id`,
                { id: parseInt(id) }
            );
            const current = currentCount.recordset[0].current_participants || 0;
            
            if (parseInt(max_participants) < current) {
                return res.status(400).json({
                    success: false,
                    message: `Cannot reduce max_participants to ${max_participants}. Already have ${current} registrations.`
                });
            }
            
            updates.push('max_participants = @max_participants');
            params.max_participants = parseInt(max_participants);
        }
        if (status) {
            updates.push('status = @status');
            params.status = status;
        }
        if (image_url !== undefined) {
            updates.push('image_url = @image_url');
            params.image_url = image_url;
        }

        if (updates.length === 0) {
            return res.status(400).json({ success: false, message: 'No fields to update' });
        }

        const updateQuery = `UPDATE Events SET ${updates.join(', ')} WHERE event_id = @id`;
        await database.query(updateQuery, params);

        // Update primary image if provided
        if (image_url) {
            await database.query(
                `DELETE FROM EventImages WHERE event_id = @id AND is_primary = 1`,
                { id: parseInt(id) }
            );
            await database.query(
                `INSERT INTO EventImages (event_id, image_url, is_primary) VALUES (@id, @image_url, 1)`,
                { id: parseInt(id), image_url }
            );
        }

        console.log('✅ Event updated:', id, 'by user:', user.userId, '(' + user.role + ')');

        res.json({
            success: true,
            message: 'Event updated successfully',
            event: { event_id: parseInt(id), title: event.title }
        });
    } catch (err) {
        console.error('PUT /api/events/:id error:', err);
        res.status(500).json({
            success: false,
            message: 'Failed to update event: ' + err.message
        });
    }
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// DELETE /api/events/:id - Delete event (admin/teacher only)
// ✅ FIX: Lấy role từ database + xóa an toàn với transaction
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
router.delete('/:id', async (req, res) => {
    let transaction;
    
    try {
        const { id } = req.params;

        // ✅ Get user with role from database
        const { user, error } = await getUserFromToken(req);
        if (error) {
            return res.status(error.status).json({ success: false, message: error.message });
        }

        console.log('🔐 User:', user.userId, 'Role:', user.role, 'deleting event:', id);

        // ✅ Check permission: admin or teacher only
        if (user.role !== 'admin' && user.role !== 'teacher') {
            return res.status(403).json({ 
                success: false, 
                message: 'Forbidden: Only admin and teacher can delete events' 
            });
        }

        // Check if event exists
        const checkQuery = `SELECT event_id, organizer_id, title, current_participants FROM Events WHERE event_id = @id`;
        const checkResult = await database.query(checkQuery, { id: parseInt(id) });
        const rows = checkResult.recordset || checkResult;
        
        if (!rows || rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Event not found' });
        }

        // ✅ Teachers can only delete their own events, admins can delete any
        const event = rows[0];
        if (user.role === 'teacher' && event.organizer_id !== user.userId) {
            return res.status(403).json({ 
                success: false, 
                message: 'Forbidden: Teachers can only delete their own events' 
            });
        }

        // ✅ Warn if event has registrations
        if (event.current_participants > 0) {
            console.log(`⚠️ Deleting event with ${event.current_participants} registrations`);
        }

        // ✅ START TRANSACTION for safe deletion
        const sql = require('mssql');
        transaction = new sql.Transaction(database.pool);
        await transaction.begin();

        const request = transaction.request();
        request.input('id', sql.Int, parseInt(id));

        // Delete related records (foreign key constraints)
        await request.query(`DELETE FROM EventAttendance WHERE registration_id IN (SELECT registration_id FROM EventRegistrations WHERE event_id = @id)`);
        await request.query(`DELETE FROM EventRegistrations WHERE event_id = @id`);
        await request.query(`DELETE FROM EventImages WHERE event_id = @id`);
        await request.query(`DELETE FROM NotificationLogs WHERE event_id = @id`);
        
        // Delete the event
        await request.query(`DELETE FROM Events WHERE event_id = @id`);

        // ✅ COMMIT TRANSACTION
        await transaction.commit();

        console.log('✅ Event deleted:', id, '(' + event.title + ') by user:', user.userId, '(' + user.role + ')');

        res.json({
            success: true,
            message: 'Event deleted successfully',
            event: { 
                event_id: parseInt(id), 
                title: event.title,
                deletedRegistrations: event.current_participants
            }
        });
        
    } catch (err) {
        // ✅ ROLLBACK on error
        if (transaction) {
            try {
                await transaction.rollback();
                console.log('⚠️ Transaction rolled back due to error');
            } catch (rollbackErr) {
                console.error('❌ Rollback error:', rollbackErr);
            }
        }
        
        console.error('DELETE /api/events/:id error:', err);
        res.status(500).json({
            success: false,
            message: 'Failed to delete event: ' + err.message
        });
    }
});

module.exports = router;
