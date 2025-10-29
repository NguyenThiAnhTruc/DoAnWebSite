const db = require('./config/database');

async function checkSpecificEvent() {
    try {
        const eventTitle = 'eqweqweqweqweqwe';
        
        console.log(`🔍 Kiểm tra sự kiện: ${eventTitle}\n`);
        
        // Lấy thông tin chi tiết
        const result = await db.query(`
            SELECT 
                e.event_id,
                e.title,
                e.current_participants,
                e.max_participants,
                e.status,
                COUNT(DISTINCT er.registration_id) as actual_registrations,
                COUNT(DISTINCT CASE WHEN er.status = 'registered' THEN er.registration_id END) as registered_count
            FROM Events e
            LEFT JOIN EventRegistrations er ON e.event_id = er.event_id
            WHERE e.title LIKE @title
            GROUP BY e.event_id, e.title, e.current_participants, e.max_participants, e.status
        `, { title: `%${eventTitle}%` });
        
        const events = result.recordset || result;
        
        if (events.length === 0) {
            console.log('❌ Không tìm thấy sự kiện!');
            await db.close();
            return;
        }
        
        const event = events[0];
        
        console.log('📊 Thông tin sự kiện:');
        console.log(`   Event ID: ${event.event_id}`);
        console.log(`   Title: ${event.title}`);
        console.log(`   Status: ${event.status}`);
        console.log(`   Current Participants: ${event.current_participants}`);
        console.log(`   Max Participants: ${event.max_participants}`);
        console.log(`   Actual Registrations: ${event.actual_registrations}`);
        console.log(`   Available Slots: ${event.max_participants - event.current_participants}`);
        
        console.log('\n🔍 Phân tích:');
        
        const isFull = event.current_participants >= event.max_participants;
        const hasSlots = event.current_participants < event.max_participants;
        
        if (isFull && event.actual_registrations === 0) {
            console.log('   ❌ BUG NGHIÊM TRỌNG: Sự kiện hiển thị đầy nhưng không có đăng ký!');
            console.log(`   ❌ current_participants (${event.current_participants}) >= max_participants (${event.max_participants})`);
            console.log(`   ❌ Nhưng actual_registrations = ${event.actual_registrations}`);
            console.log('\n🔧 Cần chạy: UPDATE Events SET current_participants = 0 WHERE event_id = ' + event.event_id);
        } else if (event.current_participants !== event.actual_registrations) {
            console.log('   ⚠️  Không đồng bộ:');
            console.log(`   ⚠️  current_participants (${event.current_participants}) ≠ actual_registrations (${event.actual_registrations})`);
            console.log('\n🔧 Cần chạy fix script để đồng bộ');
        } else if (hasSlots) {
            console.log(`   ✅ Sự kiện còn ${event.max_participants - event.current_participants} chỗ trống`);
            console.log('   ✅ Sinh viên có thể đăng ký');
        } else {
            console.log('   ⚠️  Sự kiện thực sự đã đầy');
        }
        
        // Kiểm tra danh sách đăng ký
        console.log('\n📋 Danh sách đăng ký:');
        const registrations = await db.query(`
            SELECT 
                er.registration_id,
                er.user_id,
                u.username,
                er.status,
                er.registered_at
            FROM EventRegistrations er
            LEFT JOIN Users u ON er.user_id = u.user_id
            WHERE er.event_id = @eventId
            ORDER BY er.registered_at DESC
        `, { eventId: event.event_id });
        
        const regs = registrations.recordset || registrations;
        
        if (regs.length === 0) {
            console.log('   📭 Chưa có ai đăng ký');
        } else {
            regs.forEach((r, idx) => {
                console.log(`   ${idx + 1}. User ${r.user_id} (${r.username}) - Status: ${r.status} - Registered: ${r.registered_at}`);
            });
        }
        
        await db.close();
    } catch (error) {
        console.error('❌ Lỗi:', error.message);
        process.exit(1);
    }
}

checkSpecificEvent();
