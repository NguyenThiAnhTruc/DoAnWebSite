const express = require('express');
const router = express.Router();
const database = require('../config/database');

// Get attendance list for an event with user details
router.get('/event/:eventId', async (req, res) => {
    const { eventId } = req.params;
    
    try {
        const query = `
            SELECT 
                a.attendance_id,
                r.event_id,
                r.user_id,
                a.check_in_time,
                a.attendance_status AS status,
                a.check_in_method,
                a.notes,
                u.username,
                u.first_name,
                u.last_name,
                u.email,
                u.student_id,
                u.phone,
                r.registration_id,
                r.qr_code
            FROM EventRegistrations r
            LEFT JOIN EventAttendance a ON r.registration_id = a.registration_id
            INNER JOIN Users u ON r.user_id = u.user_id
            WHERE r.event_id = @eventId
            ORDER BY a.check_in_time DESC
        `;
        
        const result = await database.query(query, { eventId: parseInt(eventId) });
        const records = result.recordset || result;
        
        const attendance = records.map(r => ({
            attendanceId: r.attendance_id,
            eventId: r.event_id,
            userId: r.user_id,
            registrationId: r.registration_id,
            userName: `${r.first_name || ''} ${r.last_name || ''}`.trim() || r.username,
            studentId: r.student_id,
            email: r.email,
            phone: r.phone,
            status: r.status || null,
            checkInTime: r.check_in_time,
            checkInMethod: r.check_in_method,
            notes: r.notes,
            qrCode: r.qr_code
        }));
        
        res.json({
            success: true,
            message: 'Attendance list retrieved',
            attendance: attendance
        });
    } catch (error) {
        console.error('GET /event/:eventId error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve attendance list',
            error: error.message
        });
    }
});


// Record attendance via QR code (for students)
router.post('/qr-checkin', async (req, res) => {
    const { eventId, userId, qrCode } = req.body;

    if (!eventId || !userId) {
        return res.status(400).json({
            success: false,
            message: 'EventId and userId are required'
        });
    }

    try {
        // Check if user is registered for the event and get registration_id
        const regCheck = `SELECT registration_id, qr_code FROM EventRegistrations WHERE event_id = @eventId AND user_id = @userId`;
        const regResult = await database.query(regCheck, { eventId: parseInt(eventId), userId: parseInt(userId) });
        const regRecords = regResult.recordset || regResult;
        
        if (!regRecords || regRecords.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Bạn chưa đăng ký sự kiện này'
            });
        }

        const registrationId = regRecords[0].registration_id;

        // Check if already checked in
        const attCheck = `SELECT attendance_id FROM EventAttendance WHERE registration_id = @registrationId`;
        const attResult = await database.query(attCheck, { registrationId: registrationId });
        const attRecords = attResult.recordset || attResult;
        
        if (attRecords && attRecords.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Bạn đã điểm danh cho sự kiện này rồi'
            });
        }

        // Insert attendance record
        const insertQuery = `
            INSERT INTO EventAttendance (registration_id, check_in_time, attendance_status, check_in_method)
            VALUES (@registrationId, GETDATE(), 'present', 'qr_code');
            SELECT SCOPE_IDENTITY() AS attendance_id;
        `;
        
        const insertResult = await database.query(insertQuery, { 
            registrationId: registrationId
        });
        
        const attendanceId = (insertResult.recordset && insertResult.recordset[0] && insertResult.recordset[0].attendance_id) || null;

        res.json({
            success: true,
            message: 'Điểm danh thành công',
            attendance: {
                attendanceId: attendanceId,
                registrationId: registrationId,
                eventId: parseInt(eventId),
                userId: parseInt(userId),
                status: 'present',
                checkInTime: new Date().toISOString(),
                method: 'qr_code'
            }
        });
    } catch (error) {
        console.error('POST /qr-checkin error:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi điểm danh',
            error: error.message
        });
    }
});


// Manual attendance marking (for admin/teacher)
router.post('/manual', async (req, res) => {
    const { eventId, userId, status } = req.body;

    if (!eventId || !userId || !status) {
        return res.status(400).json({
            success: false,
            message: 'EventId, userId and status are required'
        });
    }

    // Validate status
    const validStatuses = ['present', 'absent', 'late'];
    if (!validStatuses.includes(status)) {
        return res.status(400).json({
            success: false,
            message: 'Invalid status. Must be: present, absent, or late'
        });
    }

    try {
        // Check if user is registered and get registration_id
        const regCheck = `SELECT registration_id FROM EventRegistrations WHERE event_id = @eventId AND user_id = @userId`;
        const regResult = await database.query(regCheck, { eventId: parseInt(eventId), userId: parseInt(userId) });
        const regRecords = regResult.recordset || regResult;
        
        if (!regRecords || regRecords.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'User is not registered for this event'
            });
        }

        const registrationId = regRecords[0].registration_id;

        // Check if attendance already exists
        const attCheck = `SELECT attendance_id FROM EventAttendance WHERE registration_id = @registrationId`;
        const attResult = await database.query(attCheck, { registrationId: registrationId });
        const attRecords = attResult.recordset || attResult;
        
        let attendanceId;
        
        if (attRecords && attRecords.length > 0) {
            // Update existing record
            const updateQuery = `
                UPDATE EventAttendance 
                SET attendance_status = @status, check_in_time = GETDATE(), check_in_method = 'manual'
                WHERE registration_id = @registrationId;
                SELECT attendance_id FROM EventAttendance WHERE registration_id = @registrationId;
            `;
            
            const updateResult = await database.query(updateQuery, { 
                registrationId: registrationId,
                status: status
            });
            
            attendanceId = (updateResult.recordset && updateResult.recordset[0] && updateResult.recordset[0].attendance_id) || attRecords[0].attendance_id;
        } else {
            // Insert new record
            const insertQuery = `
                INSERT INTO EventAttendance (registration_id, check_in_time, attendance_status, check_in_method)
                VALUES (@registrationId, GETDATE(), @status, 'manual');
                SELECT SCOPE_IDENTITY() AS attendance_id;
            `;
            
            const insertResult = await database.query(insertQuery, { 
                registrationId: registrationId,
                status: status
            });
            
            attendanceId = (insertResult.recordset && insertResult.recordset[0] && insertResult.recordset[0].attendance_id) || null;
        }

        res.json({
            success: true,
            message: 'Attendance marked successfully',
            attendance: {
                attendanceId: attendanceId,
                registrationId: registrationId,
                eventId: parseInt(eventId),
                userId: parseInt(userId),
                status: status,
                checkInTime: new Date().toISOString(),
                method: 'manual'
            }
        });
    } catch (error) {
        console.error('POST /manual error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to mark attendance',
            error: error.message
        });
    }
});

// Update attendance record
router.put('/:id', (req, res) => {
    const { id } = req.params;
    const { status, notes } = req.body;

    res.json({
        success: true,
        message: 'Attendance updated successfully',
        attendance: {
            id: parseInt(id),
            status,
            notes,
            updatedAt: new Date().toISOString()
        }
    });
});


// Get attendance statistics
router.get('/stats/event/:eventId', async (req, res) => {
    const { eventId } = req.params;
    
    try {
        const query = `
            SELECT 
                COUNT(DISTINCT r.user_id) AS total_registered,
                COUNT(DISTINCT CASE WHEN a.attendance_status = 'present' THEN r.user_id END) AS present,
                COUNT(DISTINCT CASE WHEN a.attendance_status = 'absent' THEN r.user_id END) AS absent,
                COUNT(DISTINCT CASE WHEN a.attendance_status = 'late' THEN r.user_id END) AS late,
                COUNT(DISTINCT CASE WHEN a.attendance_id IS NOT NULL THEN r.user_id END) AS total_marked
            FROM EventRegistrations r
            LEFT JOIN EventAttendance a ON r.registration_id = a.registration_id
            WHERE r.event_id = @eventId
        `;
        
        const result = await database.query(query, { eventId: parseInt(eventId) });
        const stats = (result.recordset && result.recordset[0]) || result[0];
        
        const totalRegistered = stats.total_registered || 0;
        const present = stats.present || 0;
        const absent = stats.absent || 0;
        const late = stats.late || 0;
        const totalMarked = stats.total_marked || 0;
        const notMarked = totalRegistered - totalMarked;
        const percentage = totalRegistered > 0 ? Math.round((present / totalRegistered) * 100) : 0;
        
        res.json({
            success: true,
            message: 'Attendance statistics retrieved',
            statistics: {
                eventId: parseInt(eventId),
                totalRegistered: totalRegistered,
                present: present,
                absent: absent,
                late: late,
                notMarked: notMarked,
                percentage: percentage
            }
        });
    } catch (error) {
        console.error('GET /stats/event/:eventId error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve statistics',
            error: error.message
        });
    }
});

// Check if user already attended an event
router.get('/check', async (req, res) => {
    const { eventId, userId } = req.query;
    
    if (!eventId || !userId) {
        return res.status(400).json({
            success: false,
            message: 'EventId and userId are required'
        });
    }
    
    try {
        const query = `
            SELECT a.attendance_id, a.check_in_time, a.attendance_status
            FROM EventRegistrations r
            INNER JOIN EventAttendance a ON r.registration_id = a.registration_id
            WHERE r.event_id = @eventId AND r.user_id = @userId
        `;
        
        const result = await database.query(query, { 
            eventId: parseInt(eventId), 
            userId: parseInt(userId) 
        });
        
        const attended = result.recordset && result.recordset.length > 0;
        
        res.json({
            success: true,
            attended: attended,
            attendance: attended ? result.recordset[0] : null
        });
    } catch (error) {
        console.error('GET /check error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to check attendance',
            error: error.message
        });
    }
});

// Check-in via QR with auto-registration
router.post('/checkin', async (req, res) => {
    // Accept multiple possible param names from different clients (event_id / eventId)
    const body = req.body || {};
    const event_id = body.event_id ?? body.eventId ?? body.eventIdRaw ?? body.event;
    const user_id = body.user_id ?? body.userId ?? body.user;
    const check_in_method = body.check_in_method ?? body.checkInMethod ?? body.method;

    console.log('POST /checkin body:', JSON.stringify(body));

    if (!event_id || !user_id) {
        return res.status(400).json({
            success: false,
            message: 'event_id and user_id are required'
        });
    }

    const parsedEventId = parseInt(event_id);
    const parsedUserId = parseInt(user_id);
    console.log('Parsed checkin ids -> event:', parsedEventId, 'user:', parsedUserId);
    if (isNaN(parsedEventId) || isNaN(parsedUserId)) {
        return res.status(400).json({
            success: false,
            message: 'event_id and user_id must be numeric IDs'
        });
    }
    
    try {
        // Check if user is registered, if not auto-register
        let regCheck = await database.query(
            `SELECT registration_id FROM EventRegistrations WHERE event_id = @eventId AND user_id = @userId`,
            { eventId: parseInt(event_id), userId: parseInt(user_id) }
        );
        
        let registrationId;
        let regInsert = null;

        if (!regCheck.recordset || regCheck.recordset.length === 0) {
            // Auto-register user
            regInsert = await database.query(
                `INSERT INTO EventRegistrations (event_id, user_id, registration_date, status)
                 OUTPUT INSERTED.registration_id AS registration_id
                 VALUES (@eventId, @userId, GETDATE(), 'confirmed');`,
                { eventId: parseInt(event_id), userId: parseInt(user_id) }
            );
            // Defensive: ensure we have a recordset and value
            console.log('DEBUG regInsert result:', regInsert && typeof regInsert === 'object' ? (regInsert.recordset || regInsert) : regInsert);
            if (regInsert && regInsert.recordset && regInsert.recordset[0] && regInsert.recordset[0].registration_id) {
                registrationId = regInsert.recordset[0].registration_id;
            } else if (regInsert && regInsert.recordset && regInsert.recordset.length > 0 && regInsert.recordset[0]) {
                // Fallback: try first field
                const first = Object.values(regInsert.recordset[0])[0];
                registrationId = first || null;
            } else {
                console.warn('Warning: regInsert did not return registration_id as expected', regInsert);
                registrationId = null;
            }

            // Update event participant count
            await database.query(
                `UPDATE Events SET current_participants = current_participants + 1 WHERE event_id = @eventId`,
                { eventId: parseInt(event_id) }
            );
        } else {
            registrationId = regCheck.recordset[0].registration_id;
        }
        
        // Check if already attended
        const attCheck = await database.query(
            `SELECT attendance_id FROM EventAttendance WHERE registration_id = @registrationId`,
            { registrationId }
        );
        
        if (attCheck.recordset && attCheck.recordset.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Bạn đã điểm danh cho sự kiện này rồi'
            });
        }

        // If registrationId is null at this point, we cannot proceed safely.
        if (!registrationId) {
            console.error('POST /checkin error: registrationId is null or undefined after auto-register attempt', { regInsertResult: regInsert });
            return res.status(500).json({
                success: false,
                message: 'Lỗi nội bộ: không thể tạo đăng ký tham dự cho người dùng. Vui lòng liên hệ quản trị viên.'
            });
        }
        
        // Insert attendance
        const attInsert = await database.query(
            `INSERT INTO EventAttendance (registration_id, check_in_time, attendance_status, check_in_method)
             OUTPUT INSERTED.attendance_id AS attendance_id
             VALUES (@registrationId, GETDATE(), 'present', @method);`,
            { 
                registrationId, 
                method: check_in_method || 'qr_code' 
            }
        );
        console.log('DEBUG attInsert result:', attInsert && typeof attInsert === 'object' ? (attInsert.recordset || attInsert) : attInsert);

        const attendanceId = (attInsert && attInsert.recordset && attInsert.recordset[0] && attInsert.recordset[0].attendance_id) ? attInsert.recordset[0].attendance_id : null;

        res.json({
            success: true,
            message: 'Điểm danh thành công',
            attendance_id: attendanceId
        });
        
    } catch (error) {
        // Log full stack for debugging
        console.error('POST /checkin error:', error && error.stack ? error.stack : error);

        const resp = {
            success: false,
            message: 'Lỗi khi điểm danh',
            error: error && error.message ? error.message : String(error)
        };

        // In development include stack for easier debugging
        if (process.env.NODE_ENV !== 'production' && error && error.stack) {
            resp.stack = error.stack;
        }

        res.status(500).json(resp);
    }
});

module.exports = router;