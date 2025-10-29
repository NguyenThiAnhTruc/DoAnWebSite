// Fix current_participants mismatch
const database = require('./config/database');

async function fixCurrentParticipants() {
    console.log('\n🔧 FIXING current_participants FIELD\n');
    
    try {
        // Get all events
        const eventsQuery = `SELECT event_id, title, current_participants FROM Events`;
        const eventsResult = await database.query(eventsQuery);
        const events = eventsResult.recordset || eventsResult;
        
        console.log('📋 Processing', events.length, 'events...\n');
        
        for (const event of events) {
            // Count actual registrations
            const countQuery = `
                SELECT COUNT(*) as total
                FROM EventRegistrations
                WHERE event_id = @id AND status IN ('registered', 'attended')
            `;
            const countResult = await database.query(countQuery, { id: event.event_id });
            const actualCount = (countResult.recordset || countResult)[0].total;
            
            // Update if mismatch
            if (event.current_participants !== actualCount) {
                console.log(`🔄 Event ${event.event_id}: ${event.title}`);
                console.log(`   Before: ${event.current_participants} → After: ${actualCount}`);
                
                const updateQuery = `
                    UPDATE Events 
                    SET current_participants = @count
                    WHERE event_id = @id
                `;
                await database.query(updateQuery, { id: event.event_id, count: actualCount });
                
                console.log(`   ✅ Updated!\n`);
            } else {
                console.log(`✓ Event ${event.event_id}: ${event.title} - Already correct (${actualCount})`);
            }
        }
        
        console.log('\n🎉 ALL EVENTS FIXED!\n');
        
        // Verify
        console.log('📊 VERIFICATION:\n');
        for (const event of events) {
            const verifyQuery = `
                SELECT e.event_id, e.title, e.current_participants, e.max_participants,
                       COUNT(er.registration_id) as actual_count
                FROM Events e
                LEFT JOIN EventRegistrations er ON e.event_id = er.event_id 
                    AND er.status IN ('registered', 'attended')
                WHERE e.event_id = @id
                GROUP BY e.event_id, e.title, e.current_participants, e.max_participants
            `;
            const verifyResult = await database.query(verifyQuery, { id: event.event_id });
            const verified = (verifyResult.recordset || verifyResult)[0];
            
            const status = verified.current_participants === verified.actual_count ? '✅' : '❌';
            const availability = verified.max_participants 
                ? `${verified.current_participants}/${verified.max_participants}` 
                : `${verified.current_participants}/∞`;
                
            console.log(`${status} Event ${verified.event_id}: ${verified.title.substring(0, 35).padEnd(35)} - ${availability}`);
        }
        
    } catch (err) {
        console.error('❌ Error:', err);
    } finally {
        await database.close();
        console.log('\n✅ Done!\n');
    }
}

fixCurrentParticipants();
