const db = require('./config/database');

async function transferEventOwnership() {
    try {
        const eventId = 7;
        const newOwnerId = 3; // teacher2
        
        console.log(`🔄 Chuyển quyền sở hữu Event ${eventId} cho User ${newOwnerId}\n`);
        
        // Check current owner
        const beforeResult = await db.query(`
            SELECT 
                e.event_id,
                e.title,
                e.organizer_id,
                u.username as organizer_username,
                u.role as organizer_role
            FROM Events e
            LEFT JOIN Users u ON e.organizer_id = u.user_id
            WHERE e.event_id = @eventId
        `, { eventId });
        
        const before = beforeResult.recordset[0];
        console.log('📋 Trước khi chuyển:');
        console.log(`   Event ID: ${before.event_id}`);
        console.log(`   Title: ${before.title}`);
        console.log(`   Organizer ID: ${before.organizer_id}`);
        console.log(`   Organizer: ${before.organizer_username} (${before.organizer_role})\n`);
        
        // Transfer ownership
        await db.query(`
            UPDATE Events 
            SET organizer_id = @newOwnerId 
            WHERE event_id = @eventId
        `, { eventId, newOwnerId });
        
        // Check after transfer
        const afterResult = await db.query(`
            SELECT 
                e.event_id,
                e.title,
                e.organizer_id,
                u.username as organizer_username,
                u.role as organizer_role
            FROM Events e
            LEFT JOIN Users u ON e.organizer_id = u.user_id
            WHERE e.event_id = @eventId
        `, { eventId });
        
        const after = afterResult.recordset[0];
        console.log('✅ Sau khi chuyển:');
        console.log(`   Event ID: ${after.event_id}`);
        console.log(`   Title: ${after.title}`);
        console.log(`   Organizer ID: ${after.organizer_id}`);
        console.log(`   Organizer: ${after.organizer_username} (${after.organizer_role})\n`);
        
        console.log('🎉 Chuyển quyền sở hữu thành công!');
        console.log(`   User ${newOwnerId} (${after.organizer_username}) giờ có thể chỉnh sửa Event ${eventId}`);
        
        await db.close();
    } catch (error) {
        console.error('❌ Lỗi:', error.message);
        process.exit(1);
    }
}

transferEventOwnership();
