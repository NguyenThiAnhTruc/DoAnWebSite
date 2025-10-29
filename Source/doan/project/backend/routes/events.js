const express = require("express");
const router = express.Router();
const database = require('../config/database');

// GET /api/events - list events (supports UserId query param for "mine")
router.get("/", async (req, res) => {
    try {
        // Map common query params to stored procedure params
        const params = {
            PageNumber: parseInt(req.query.PageNumber) || 1,
            PageSize: parseInt(req.query.PageSize) || 50,
            CategoryId: req.query.CategoryId ? parseInt(req.query.CategoryId) : null,
            Department: req.query.Department || req.query.department || null,
            Status: req.query.Status || req.query.status || null,
            SearchTerm: req.query.SearchTerm || req.query.search || null,
            UserId: req.query.UserId || req.query.userId || null
        };

        // Prefer calling stored procedure sp_GetEvents if available
        let result;
        try {
            console.log('🔍 Calling sp_GetEvents with params:', params);
            const proc = await database.executeProcedure('sp_GetEvents', params);
            // procedure returns recordsets: first is rows, second may be count
            const rows = proc.recordset || (proc.recordsets && proc.recordsets[0]) || [];
            // total count may be in second recordset or returned as output; try to detect
            const total = (proc.recordsets && proc.recordsets[1] && proc.recordsets[1][0] && proc.recordsets[1][0].TotalCount) || rows.length;
            console.log('✅ sp_GetEvents returned:', rows.length, 'events');
            // Ensure returned rows include start_time when possible. Some stored procedures
            // may omit the time column while Events table stores start_time separately.
            // If start_time is missing, fetch it from Events and merge.
            try {
                if (rows.length > 0 && !rows[0].hasOwnProperty('start_time')) {
                    const ids = rows.map(r => r.event_id || r.id).filter(Boolean);
                    if (ids.length > 0) {
                        // Build parameterized IN clause
                        const idList = ids.join(',');
                        const timeQuery = `SELECT event_id, start_time, end_time FROM Events WHERE event_id IN (${idList})`;
                        const timeRes = await database.query(timeQuery);
                        const times = (timeRes.recordset || []);
                        const timeMap = new Map(times.map(t => [t.event_id, t]));
                        rows.forEach(r => {
                            const id = r.event_id || r.id;
                            if (timeMap.has(id)) {
                                const t = timeMap.get(id);
                                r.start_time = r.start_time || t.start_time;
                                r.end_time = r.end_time || t.end_time;
                            }
                        });
                        console.log('🔧 Merged start_time from Events table for rows missing time');
                    }
                }
            } catch (mergeErr) {
                console.warn('⚠️ Failed to merge start_time for events:', mergeErr.message);
            }
            result = { success: true, events: rows, total };
        } catch (procErr) {
            console.log('❌ sp_GetEvents FAILED:', procErr.message);
            console.log('⚠️ Using fallback database.getEvents()');
            // Fallback to helper getEvents which builds a query
            const rows = await database.getEvents({ category: params.CategoryId, status: params.Status, department: params.Department });
            console.log('📊 Fallback returned:', rows.length, 'events');
            result = { success: true, events: rows, total: rows.length };
        }

        res.json(result);
    } catch (err) {
        console.error('GET /api/events error', err);
        res.status(500).json({ success: false, message: 'Failed to retrieve events' });
    }
});

// POST /api/events - create new event
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

        // Debug log
        console.log('📝 POST /api/events - Received data:');
        console.log('   start_date:', start_date, 'type:', typeof start_date);
        console.log('   start_time:', start_time, 'type:', typeof start_time);
        console.log('   end_date:', end_date, 'type:', typeof end_date);
        console.log('   end_time:', end_time, 'type:', typeof end_time);

        // Validate required fields
        if (!title || !description || !start_date || !location) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields: title, description, start_date, location'
            });
        }

        // Get organizer_id from token/session or default to 1 (admin)
        const token = req.headers.authorization?.replace('Bearer ', '');
        let userId = 1; // Default to admin user
        
        if (token) {
            try {
                const jwt = require('jsonwebtoken');
                const secret = process.env.JWT_SECRET || 'your_super_secret_jwt_key_here';
                const decoded = jwt.verify(token, secret);
                userId = decoded.userId || decoded.user_id || decoded.id || 1;
                console.log('✅ Token decoded successfully, user ID:', userId);
            } catch (err) {
                console.log('⚠️ Token verification failed:', err.message);
                console.log('Using default user ID: 1');
            }
        } else {
            console.log('⚠️ No authorization token found');
            console.log('Using default user ID: 1');
        }

        console.log('📝 Creating event with organizer_id:', userId);

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

        // Convert dates and times to proper SQL format
        const formatDate = (dateStr) => {
            if (!dateStr) return null;
            const date = new Date(dateStr);
            return date.toISOString().split('T')[0]; // YYYY-MM-DD
        };
        
        const formatTime = (timeStr) => {
            if (!timeStr || timeStr.trim() === '') {
                // Return Date object for 00:00:00
                const d = new Date();
                d.setHours(0, 0, 0, 0);
                return d;
            }
            
            const trimmed = timeStr.trim();
            let hours = 0, minutes = 0, seconds = 0;
            
            // Parse Vietnamese 12-hour format: "06:06 CH" (chiều/PM) or "06:06 SA" (sáng/AM)
            const vietnameseTimeMatch = trimmed.match(/^(\d{1,2}):(\d{2})\s*(CH|SA)$/i);
            if (vietnameseTimeMatch) {
                hours = parseInt(vietnameseTimeMatch[1], 10);
                minutes = parseInt(vietnameseTimeMatch[2], 10);
                const period = vietnameseTimeMatch[3].toUpperCase();
                
                // Convert to 24-hour format
                if (period === 'CH' && hours !== 12) {
                    hours += 12; // CH (chiều/PM): add 12 except for 12 PM
                } else if (period === 'SA' && hours === 12) {
                    hours = 0; // SA (sáng/AM): 12 AM = 00:00
                }
            }
            // Parse HH:MM or HH:MM:SS format
            else {
                const parts = trimmed.split(':');
                if (parts.length >= 2) {
                    hours = parseInt(parts[0], 10) || 0;
                    minutes = parseInt(parts[1], 10) || 0;
                    seconds = parseInt(parts[2], 10) || 0;
                }
            }
            
            // Create Date object with the time
            const date = new Date();
            date.setHours(hours, minutes, seconds, 0);
            return date;
        };

        // Debug: Log received time value
        console.log('🕐 Received start_time:', start_time, 'type:', typeof start_time);
        const formattedStartTime = formatTime(start_time);
        console.log('🕐 Formatted start_time to:', formattedStartTime);
        
        const formattedEndTime = formatTime(end_time || '23:59:59');
        console.log('🕐 Formatted end_time to:', formattedEndTime);

        // Use sql.Request with explicit types
        const sql = require('mssql');
        const request = new sql.Request();
        request.input('title', sql.NVarChar, title);
        request.input('description', sql.NText, description);
        request.input('short_description', sql.NVarChar, short_description || description.substring(0, 150));
        request.input('category', sql.NVarChar, category || 'Khác');
        request.input('start_date', sql.Date, formatDate(start_date));
        request.input('start_time', sql.Time, formattedStartTime);
        request.input('end_date', sql.Date, formatDate(end_date || start_date));
        request.input('end_time', sql.Time, formattedEndTime);
        request.input('location', sql.NVarChar, location);
        request.input('max_participants', sql.Int, parseInt(max_participants) || 100);
        request.input('status', sql.NVarChar, status || 'published');
        request.input('organizer_id', sql.Int, userId);
        request.input('image_url', sql.NVarChar, image_url || null);
        
        const result = await request.query(query);

        const eventId = result.recordset[0].event_id;

        // Insert image if provided
        if (image_url) {
            const imgQuery = `
                INSERT INTO EventImages (event_id, image_url, is_primary)
                VALUES (@event_id, @image_url, 1)
            `;
            await database.query(imgQuery, { event_id: eventId, image_url });
        }

        console.log('✅ Created new event:', eventId, 'by user:', userId);

        // 🔔 TẠO THÔNG BÁO TỰ ĐỘNG CHO TẤT CẢ USERS CÓ BẬT notify_new_events
        try {
            // Lấy danh sách user có bật thông báo sự kiện mới
            const usersQuery = `
                SELECT user_id 
                FROM Users 
                WHERE notify_new_events = 1 
                AND status = 'active' 
                AND user_id != @organizer_id
            `;
            const usersResult = await database.query(usersQuery, { organizer_id: userId });
            const users = usersResult.recordset || [];

            if (users.length > 0) {
                // Tạo bulk notification
                const values = users.map((user, index) => 
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

                users.forEach((user, index) => {
                    notifParams[`userId${index}`] = user.user_id;
                });

                await database.query(notifQuery, notifParams);
                console.log(`✅ Created ${users.length} notifications for new event ${eventId}`);
            }
        } catch (notifErr) {
            console.error('⚠️ Failed to create notifications:', notifErr);
            // Don't fail the whole request if notifications fail
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

// GET /api/events/:id - get a single event
router.get('/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const query = `SELECT e.event_id AS id, e.title, e.description, e.short_description, e.location, e.start_date, e.end_date, e.start_time, e.end_time, e.max_participants, e.current_participants, e.price, e.status, e.contact_email, e.contact_phone, c.category_name AS category, d.department_name AS department, u.first_name + ' ' + u.last_name AS organizer, ei.image_url AS image_url FROM Events e LEFT JOIN Categories c ON e.category_id = c.category_id LEFT JOIN Departments d ON e.department_id = d.department_id LEFT JOIN Users u ON e.organizer_id = u.user_id LEFT JOIN EventImages ei ON e.event_id = ei.event_id AND ei.is_primary = 1 WHERE e.event_id = @id`;
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

// POST /api/events/:id/register - register user for event
router.post('/:id/register', async (req, res) => {
    const { id } = req.params;
    const { userId } = req.body;

    if (!userId) return res.status(400).json({ success: false, message: 'userId is required' });

    try {
        // Check event exists and capacity
        const qEvent = `SELECT event_id, title, max_participants, current_participants, registration_deadline, start_date, start_time, end_date, end_time FROM Events WHERE event_id = @id`;
        const er = await database.query(qEvent, { id: parseInt(id) });
        const rows = er.recordset || er;
        if (!rows || rows.length === 0) return res.status(404).json({ success: false, message: 'Event not found' });
        const event = rows[0];

        // Check already registered
        const qCheck = `SELECT registration_id FROM EventRegistrations WHERE event_id = @id AND user_id = @userId`;
        const chk = await database.query(qCheck, { id: parseInt(id), userId: parseInt(userId) });
        const chkRows = chk.recordset || chk;
        if (chkRows && chkRows.length > 0) return res.status(400).json({ success: false, message: 'Bạn đã đăng ký sự kiện này rồi' });

        // Check if event has already started or ended
        const now = new Date();
        if (event.start_date) {
            const eventStartDateTime = new Date(event.start_date);
            // If start_time is provided, extract hours and minutes
            if (event.start_time) {
                // start_time might be a Date object with year 1970, extract time only
                const timeObj = new Date(event.start_time);
                const hours = timeObj.getHours();
                const minutes = timeObj.getMinutes();
                const seconds = timeObj.getSeconds();
                
                // Set the time on the start_date
                eventStartDateTime.setHours(hours, minutes, seconds);
            }
            
            if (eventStartDateTime <= now) {
                return res.status(400).json({ success: false, message: 'Sự kiện đã bắt đầu, không thể đăng ký' });
            }
        }
        
        if (event.end_date) {
            const eventEndDateTime = new Date(event.end_date);
            if (event.end_time) {
                // end_time might be a Date object with year 1970, extract time only
                const timeObj = new Date(event.end_time);
                const hours = timeObj.getHours();
                const minutes = timeObj.getMinutes();
                const seconds = timeObj.getSeconds();
                
                // Set the time on the end_date
                eventEndDateTime.setHours(hours, minutes, seconds);
            }
            
            if (eventEndDateTime <= now) {
                return res.status(400).json({ success: false, message: 'Sự kiện đã kết thúc, không thể đăng ký' });
            }
        }

        // Check capacity
        if (event.max_participants && event.current_participants >= event.max_participants) {
            return res.status(400).json({ success: false, message: 'Sự kiện đã đầy' });
        }

        // Check registration deadline
        if (event.registration_deadline && new Date(event.registration_deadline) < new Date()) {
            return res.status(400).json({ success: false, message: 'Đã hết hạn đăng ký' });
        }

        // Insert registration
        const qr = `QR_${id}_${userId}_${Date.now()}`;
        const ins = `INSERT INTO EventRegistrations (event_id, user_id, status, payment_status, qr_code) VALUES (@id, @userId, 'registered', 'pending', @qr); SELECT SCOPE_IDENTITY() AS registration_id;`;
        const insRes = await database.query(ins, { id: parseInt(id), userId: parseInt(userId), qr });
        const regId = (insRes.recordset && insRes.recordset[0] && insRes.recordset[0].registration_id) || null;

        // Update current participants count
        const upd = `UPDATE Events SET current_participants = ISNULL(current_participants,0) + 1 WHERE event_id = @id`;
        await database.query(upd, { id: parseInt(id) });

        // 🔔 Tạo thông báo cho user
        try {
            const notifTitle = `Đăng ký thành công: ${event.title}`;
            const notifMessage = `Bạn đã đăng ký thành công sự kiện "${event.title}". Mã QR của bạn: ${qr}`;
            const notifQuery = `
                INSERT INTO Notifications (user_id, title, message, type, related_event_id, is_read, created_at)
                VALUES (@userId, @title, @message, 'registration_confirmed', @eventId, 0, GETDATE())
            `;
            await database.query(notifQuery, {
                userId: parseInt(userId),
                title: notifTitle,
                message: notifMessage,
                eventId: parseInt(id)
            });
            console.log('✅ Notification created for user', userId);
        } catch (notifErr) {
            console.error('⚠️ Failed to create notification:', notifErr.message);
            // Don't fail the registration if notification fails
        }

        res.status(201).json({ success: true, message: 'Registered successfully', registration: { registrationId: regId, eventId: parseInt(id), userId: parseInt(userId), qr } });
    } catch (err) {
        console.error('POST /api/events/:id/register error', err);
        res.status(500).json({ success: false, message: 'Registration failed' });
    }
});

// GET registrations for an event
router.get('/:id/registrations', async (req, res) => {
    const { id } = req.params;
    try {
        const q = `
            SELECT 
                r.registration_id, 
                r.event_id, 
                r.user_id, 
                r.registration_date, 
                r.status,
                u.username,
                u.first_name,
                u.last_name,
                u.email
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

// PUT /api/events/:id - update event (admin/teacher only)
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

        // Get user from token
        const token = req.headers.authorization?.replace('Bearer ', '');
        if (!token) {
            return res.status(401).json({ success: false, message: 'Unauthorized: No token provided' });
        }

        let userId, userRole;
        try {
            const jwt = require('jsonwebtoken');
            const secret = process.env.JWT_SECRET || 'your_super_secret_jwt_key_here';
            const decoded = jwt.verify(token, secret);
            userId = decoded.userId || decoded.user_id || decoded.id;
            
            // ✅ FIX: Lấy role từ database thay vì tin token
            const userQuery = `SELECT role FROM Users WHERE user_id = @userId AND status = 'active'`;
            const userResult = await database.query(userQuery, { userId });
            const userRows = userResult.recordset || userResult;
            
            if (!userRows || userRows.length === 0) {
                return res.status(401).json({ success: false, message: 'Unauthorized: User not found' });
            }
            
            userRole = userRows[0].role;
            console.log('🔐 User:', userId, 'Role:', userRole, 'updating event:', id);
        } catch (err) {
            console.error('❌ Token error:', err);
            return res.status(401).json({ success: false, message: 'Unauthorized: Invalid token' });
        }

        // Check if user has permission (admin or teacher)
        if (userRole !== 'admin' && userRole !== 'teacher') {
            return res.status(403).json({ 
                success: false, 
                message: 'Forbidden: Only admin and teacher can update events' 
            });
        }

        // Check if event exists
        const checkQuery = `SELECT event_id, organizer_id FROM Events WHERE event_id = @id`;
        const checkResult = await database.query(checkQuery, { id: parseInt(id) });
        const rows = checkResult.recordset || checkResult;
        
        if (!rows || rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Event not found' });
        }

        // Teachers can only update their own events, admins can update any
        const event = rows[0];
        
        // 🔍 DEBUG: Log incoming data
        console.log('📝 UPDATE Event Request Data:');
        console.log('   start_time:', start_time, '(type:', typeof start_time, ')');
        console.log('   end_time:', end_time, '(type:', typeof end_time, ')');
        console.log('   start_date:', start_date);
        console.log('   end_date:', end_date);
        
        // 🔍 DEBUG: Check authorization values
        console.log('🔍 UPDATE Event Authorization Check:');
        console.log('   userRole:', userRole);
        console.log('   userId:', userId, '(type:', typeof userId + ')');
        console.log('   event.organizer_id:', event.organizer_id, '(type:', typeof event.organizer_id + ')');
        console.log('   Match (===):', event.organizer_id === userId);
        console.log('   Match (==):', event.organizer_id == userId);
        
        if (userRole === 'teacher' && event.organizer_id != userId) {
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
            const date = new Date(start_date);
            params.start_date = date.toISOString().split('T')[0]; // YYYY-MM-DD
        }
        if (start_time) {
            updates.push('start_time = @start_time');
            // Ensure HH:MM:SS format and validate
            let formattedTime = start_time;
            
            console.log('🕐 Processing start_time:', {
                original: start_time,
                type: typeof start_time,
                length: start_time?.length
            });
            
            if (typeof start_time === 'string' && start_time.length === 5) {
                formattedTime = start_time + ':00';
            } else if (typeof start_time === 'string' && start_time.length > 0) {
                formattedTime = start_time;
            } else {
                return res.status(400).json({ 
                    success: false, 
                    message: `Invalid start_time value: ${start_time} (type: ${typeof start_time})` 
                });
            }
            
            // Validate time format (HH:MM:SS)
            if (!/^\d{2}:\d{2}(:\d{2})?$/.test(formattedTime)) {
                return res.status(400).json({ 
                    success: false, 
                    message: `Invalid start_time format: ${formattedTime}. Expected HH:MM or HH:MM:SS` 
                });
            }
            
            // Ensure HH:MM:SS
            if (formattedTime.length === 5) {
                formattedTime += ':00';
            }
            
            console.log('🕐 Formatted start_time:', formattedTime);
            params.start_time = formattedTime;
        }
        if (end_date) {
            updates.push('end_date = @end_date');
            const date = new Date(end_date);
            params.end_date = date.toISOString().split('T')[0]; // YYYY-MM-DD
        }
        if (end_time) {
            updates.push('end_time = @end_time');
            // Ensure HH:MM:SS format and validate
            let formattedTime = end_time;
            
            console.log('🕐 Processing end_time:', {
                original: end_time,
                type: typeof end_time,
                length: end_time?.length
            });
            
            if (typeof end_time === 'string' && end_time.length === 5) {
                formattedTime = end_time + ':00';
            } else if (typeof end_time === 'string' && end_time.length > 0) {
                formattedTime = end_time;
            } else {
                return res.status(400).json({ 
                    success: false, 
                    message: `Invalid end_time value: ${end_time} (type: ${typeof end_time})` 
                });
            }
            
            // Validate time format (HH:MM:SS)
            if (!/^\d{2}:\d{2}(:\d{2})?$/.test(formattedTime)) {
                return res.status(400).json({ 
                    success: false, 
                    message: `Invalid end_time format: ${formattedTime}. Expected HH:MM or HH:MM:SS` 
                });
            }
            
            // Ensure HH:MM:SS
            if (formattedTime.length === 5) {
                formattedTime += ':00';
            }
            
            console.log('🕐 Formatted end_time:', formattedTime);
            params.end_time = formattedTime;
        }
        if (location) {
            updates.push('location = @location');
            params.location = location;
        }
        if (max_participants) {
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

        // Use sql.Request with explicit types for UPDATE
        const sql = require('mssql');
        const updateRequest = new sql.Request();
        
        // Add parameters with explicit types
        for (const [key, value] of Object.entries(params)) {
            if (key === 'id') {
                updateRequest.input(key, sql.Int, value);
            } else if (key === 'start_date' || key === 'end_date') {
                updateRequest.input(key, sql.Date, value);
            } else if (key === 'start_time' || key === 'end_time') {
                // Use VarChar instead of Time for better compatibility
                updateRequest.input(key, sql.VarChar(8), value);
            } else if (key === 'max_participants') {
                updateRequest.input(key, sql.Int, value);
            } else if (key === 'image_url' || key === 'status' || key === 'category' || key === 'location' || key === 'title' || key === 'short_description') {
                updateRequest.input(key, sql.NVarChar, value);
            } else if (key === 'description') {
                updateRequest.input(key, sql.NText, value);
            } else {
                updateRequest.input(key, value);
            }
        }
        
        const updateQuery = `UPDATE Events SET ${updates.join(', ')} WHERE event_id = @id`;
        await updateRequest.query(updateQuery);

        // Update primary image if provided
        if (image_url) {
            // Remove old primary image
            await database.query(
                `DELETE FROM EventImages WHERE event_id = @id AND is_primary = 1`,
                { id: parseInt(id) }
            );
            // Insert new primary image
            await database.query(
                `INSERT INTO EventImages (event_id, image_url, is_primary) VALUES (@id, @image_url, 1)`,
                { id: parseInt(id), image_url }
            );
        }

        console.log('✅ Event updated:', id, 'by user:', userId);

        res.json({
            success: true,
            message: 'Event updated successfully',
            event: { event_id: parseInt(id) }
        });
    } catch (err) {
        console.error('PUT /api/events/:id error:', err);
        res.status(500).json({
            success: false,
            message: 'Failed to update event: ' + err.message
        });
    }
});

// DELETE /api/events/:id - delete event (admin/teacher only)
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        // Get user from token
        const token = req.headers.authorization?.replace('Bearer ', '');
        if (!token) {
            return res.status(401).json({ success: false, message: 'Unauthorized: No token provided' });
        }

        let userId, userRole;
        try {
            const jwt = require('jsonwebtoken');
            const secret = process.env.JWT_SECRET || 'your_super_secret_jwt_key_here';
            const decoded = jwt.verify(token, secret);
            userId = decoded.userId || decoded.user_id || decoded.id;
            
            // ✅ FIX: Lấy role từ database thay vì tin token
            const userQuery = `SELECT role FROM Users WHERE user_id = @userId AND status = 'active'`;
            const userResult = await database.query(userQuery, { userId });
            const userRows = userResult.recordset || userResult;
            
            if (!userRows || userRows.length === 0) {
                return res.status(401).json({ success: false, message: 'Unauthorized: User not found' });
            }
            
            userRole = userRows[0].role;
            console.log('🔐 User:', userId, 'Role:', userRole, 'deleting event:', id);
        } catch (err) {
            console.error('❌ Token error:', err);
            return res.status(401).json({ success: false, message: 'Unauthorized: Invalid token' });
        }

        // Check if user has permission (admin or teacher)
        if (userRole !== 'admin' && userRole !== 'teacher') {
            return res.status(403).json({ 
                success: false, 
                message: 'Forbidden: Only admin and teacher can delete events' 
            });
        }

        // Check if event exists
        const checkQuery = `SELECT event_id, organizer_id, title FROM Events WHERE event_id = @id`;
        const checkResult = await database.query(checkQuery, { id: parseInt(id) });
        const rows = checkResult.recordset || checkResult;
        
        if (!rows || rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Event not found' });
        }

        // Teachers can only delete their own events, admins can delete any
        const event = rows[0];
        if (userRole === 'teacher' && event.organizer_id !== userId) {
            return res.status(403).json({ 
                success: false, 
                message: 'Forbidden: Teachers can only delete their own events' 
            });
        }

        // Delete related records first (foreign key constraints)
        await database.query(`DELETE FROM EventAttendance WHERE registration_id IN (SELECT registration_id FROM EventRegistrations WHERE event_id = @id)`, { id: parseInt(id) });
        await database.query(`DELETE FROM EventRegistrations WHERE event_id = @id`, { id: parseInt(id) });
        await database.query(`DELETE FROM EventImages WHERE event_id = @id`, { id: parseInt(id) });
        await database.query(`DELETE FROM NotificationLogs WHERE event_id = @id`, { id: parseInt(id) });
        
        // Delete the event
        await database.query(`DELETE FROM Events WHERE event_id = @id`, { id: parseInt(id) });

        console.log('✅ Event deleted:', id, '(' + event.title + ') by user:', userId);

        res.json({
            success: true,
            message: 'Event deleted successfully',
            event: { event_id: parseInt(id), title: event.title }
        });
    } catch (err) {
        console.error('DELETE /api/events/:id error:', err);
        res.status(500).json({
            success: false,
            message: 'Failed to delete event: ' + err.message
        });
    }
});

// DEBUG: Check event capacity status
router.get("/debug/check-capacity/:id", async (req, res) => {
    const eventId = parseInt(req.params.id);
    
    try {
        // Get event details
        const eventQuery = `
            SELECT 
                event_id,
                title,
                max_participants,
                current_participants,
                status
            FROM Events 
            WHERE event_id = @id
        `;
        const eventResult = await database.query(eventQuery, { id: eventId });
        const event = (eventResult.recordset || eventResult)[0];
        
        if (!event) {
            return res.status(404).json({ success: false, message: 'Event not found' });
        }
        
        // Count actual registrations
        const countQuery = `
            SELECT COUNT(*) as actual_count
            FROM EventRegistrations
            WHERE event_id = @id
        `;
        const countResult = await database.query(countQuery, { id: eventId });
        const actualCount = (countResult.recordset || countResult)[0].actual_count;
        
        // Compare
        const mismatch = event.current_participants !== actualCount;
        const isFull = event.current_participants >= event.max_participants;
        
        res.json({
            success: true,
            event: {
                event_id: event.event_id,
                title: event.title,
                max_participants: event.max_participants,
                current_participants: event.current_participants,
                actual_registrations: actualCount,
                available_slots: event.max_participants - event.current_participants,
                is_full: isFull,
                has_mismatch: mismatch,
                difference: Math.abs(event.current_participants - actualCount)
            },
            fix_sql: mismatch ? `UPDATE Events SET current_participants = ${actualCount} WHERE event_id = ${eventId}` : null
        });
    } catch (err) {
        console.error('Debug capacity check error:', err);
        res.status(500).json({ success: false, message: err.message });
    }
});

module.exports = router;