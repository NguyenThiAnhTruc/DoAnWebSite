const db = require('./config/database');

async function checkEventCapacity() {
    try {
        console.log('🔍 Kiểm tra tình trạng đăng ký sự kiện\n');
        
        // Lấy thông tin chi tiết về events và registrations
        const result = await db.query(`
            SELECT 
                e.event_id,
                e.title,
                e.current_participants,
                e.max_participants,
                COUNT(DISTINCT er.registration_id) as actual_registrations,
                COUNT(DISTINCT CASE WHEN er.status = 'registered' THEN er.registration_id END) as registered_count,
                COUNT(DISTINCT CASE WHEN er.status = 'attended' THEN er.registration_id END) as attended_count,
                CASE 
                    WHEN e.max_participants IS NULL THEN 999999
                    ELSE e.max_participants - e.current_participants 
                END as available_slots
            FROM Events e
            LEFT JOIN EventRegistrations er ON e.event_id = er.event_id
            GROUP BY e.event_id, e.title, e.current_participants, e.max_participants
            ORDER BY e.event_id
        `);
        
        const events = result.recordset || result;
        
        console.log('Event ID | Title                          | Current | Max  | Actual | Registered | Attended | Available');
        console.log('---------|--------------------------------|---------|------|--------|------------|----------|----------');
        
        let issuesFound = false;
        
        events.forEach(e => {
            const isMismatch = e.current_participants !== e.actual_registrations;
            const isFull = e.max_participants && e.current_participants >= e.max_participants;
            const hasNoRegistrations = e.actual_registrations === 0;
            
            const marker = (isFull && hasNoRegistrations) ? '❌' : (isMismatch ? '⚠️ ' : '  ');
            
            console.log(
                marker,
                String(e.event_id).padEnd(7), '|',
                (e.title || '').substring(0,30).padEnd(30), '|',
                String(e.current_participants).padEnd(7), '|',
                String(e.max_participants || 'N/A').padEnd(4), '|',
                String(e.actual_registrations).padEnd(6), '|',
                String(e.registered_count).padEnd(10), '|',
                String(e.attended_count).padEnd(8), '|',
                String(e.available_slots === 999999 ? 'Unlimited' : e.available_slots)
            );
            
            if (isFull && hasNoRegistrations) {
                issuesFound = true;
                console.log(`   ❌ BUG: Event ${e.event_id} hiển thị đầy nhưng không có đăng ký nào!`);
            }
            
            if (isMismatch && !isFull) {
                issuesFound = true;
                console.log(`   ⚠️  Event ${e.event_id}: current_participants (${e.current_participants}) ≠ actual registrations (${e.actual_registrations})`);
            }
        });
        
        console.log('\n📊 Tóm tắt:');
        console.log(`   - Tổng số events: ${events.length}`);
        console.log(`   - Events có vấn đề: ${events.filter(e => 
            (e.current_participants !== e.actual_registrations) || 
            (e.max_participants && e.current_participants >= e.max_participants && e.actual_registrations === 0)
        ).length}`);
        
        if (issuesFound) {
            console.log('\n🔧 Cần chạy fix script để đồng bộ current_participants');
        } else {
            console.log('\n✅ Tất cả events đều đồng bộ chính xác!');
        }
        
        await db.close();
    } catch (error) {
        console.error('❌ Lỗi:', error.message);
        process.exit(1);
    }
}

checkEventCapacity();
