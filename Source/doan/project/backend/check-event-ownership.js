const db = require('./config/database');

async function checkEventOwnership() {
    try {
        console.log('🔍 Kiểm tra quyền sở hữu sự kiện\n');
        
        // Lấy tất cả events với organizer info
        const result = await db.query(`
            SELECT 
                e.event_id,
                e.title,
                e.organizer_id,
                u.username as organizer_username,
                u.role as organizer_role
            FROM Events e
            LEFT JOIN Users u ON e.organizer_id = u.user_id
            ORDER BY e.event_id
        `);
        
        const events = result.recordset || result;
        
        console.log('Event ID | Title                          | Organizer ID | Username        | Role');
        console.log('---------|--------------------------------|--------------|-----------------|----------');
        
        events.forEach(e => {
            console.log(
                String(e.event_id).padEnd(8), '|',
                (e.title || '').substring(0,30).padEnd(30), '|',
                String(e.organizer_id || 'NULL').padEnd(12), '|',
                (e.organizer_username || 'N/A').padEnd(15), '|',
                e.organizer_role || 'N/A'
            );
        });
        
        console.log('\n📊 Tóm tắt:');
        console.log('   - Tổng events:', events.length);
        console.log('   - Events không có organizer:', events.filter(e => !e.organizer_id).length);
        console.log('   - Events của teacher:', events.filter(e => e.organizer_role === 'teacher').length);
        
        // Kiểm tra user 3
        console.log('\n🔍 Events của User ID 3:');
        const user3Events = events.filter(e => e.organizer_id === 3);
        if (user3Events.length === 0) {
            console.log('   ❌ User 3 không có event nào!');
        } else {
            user3Events.forEach(e => {
                console.log(`   - Event ${e.event_id}: ${e.title}`);
            });
        }
        
        await db.close();
    } catch (error) {
        console.error('❌ Lỗi:', error.message);
        process.exit(1);
    }
}

checkEventOwnership();
