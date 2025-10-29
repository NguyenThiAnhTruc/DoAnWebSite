// Test event registration - check "event full" error
const database = require('./config/database');

async function testEventRegistration() {
    console.log('\n🧪 TESTING EVENT REGISTRATION\n');
    
    try {
        // Get all events with their capacity info
        const eventsQuery = `
            SELECT 
                event_id,
                title,
                max_participants,
                current_participants,
                status,
                CASE 
                    WHEN max_participants IS NULL THEN 'Unlimited'
                    WHEN current_participants >= max_participants THEN 'FULL'
                    ELSE 'Available'
                END as capacity_status
            FROM Events
            ORDER BY event_id
        `;
        
        const result = await database.query(eventsQuery);
        const events = result.recordset || result;
        
        console.log('📋 ALL EVENTS CAPACITY STATUS:\n');
        console.log('─'.repeat(100));
        console.log('ID | Title                           | Max  | Current | Status      | Can Register?');
        console.log('─'.repeat(100));
        
        events.forEach(event => {
            const maxPart = event.max_participants || '∞';
            const currPart = event.current_participants || 0;
            const canRegister = event.capacity_status !== 'FULL' && event.status === 'active';
            
            console.log(
                `${String(event.event_id).padEnd(2)} | ` +
                `${event.title.substring(0, 30).padEnd(30)} | ` +
                `${String(maxPart).padEnd(4)} | ` +
                `${String(currPart).padEnd(7)} | ` +
                `${event.capacity_status.padEnd(11)} | ` +
                `${canRegister ? '✅ YES' : '❌ NO'}`
            );
        });
        
        console.log('─'.repeat(100));
        
        // Check registrations for each event
        console.log('\n📊 DETAILED REGISTRATION INFO:\n');
        
        for (const event of events) {
            const regQuery = `
                SELECT COUNT(*) as total_registrations
                FROM EventRegistrations
                WHERE event_id = @id AND status IN ('registered', 'attended')
            `;
            const regResult = await database.query(regQuery, { id: event.event_id });
            const totalReg = (regResult.recordset || regResult)[0].total_registrations;
            
            console.log(`\n🎯 Event ${event.event_id}: ${event.title}`);
            console.log(`   Max participants: ${event.max_participants || 'Unlimited'}`);
            console.log(`   Current participants (DB field): ${event.current_participants || 0}`);
            console.log(`   Actual registrations (counted): ${totalReg}`);
            
            if (event.max_participants && event.current_participants !== totalReg) {
                console.log(`   ⚠️  MISMATCH DETECTED! current_participants should be ${totalReg} but is ${event.current_participants}`);
            }
            
            if (event.max_participants && totalReg >= event.max_participants) {
                console.log(`   🚫 Event is FULL (${totalReg}/${event.max_participants})`);
            } else if (event.max_participants) {
                console.log(`   ✅ Available slots: ${event.max_participants - totalReg}`);
            }
        }
        
        // Test registration with a student
        console.log('\n\n🧪 TEST REGISTRATION ATTEMPT:\n');
        
        const testEventId = 2; // "Cuộc thi Lập trình Spring 2025"
        const testUserId = 4; // A test student
        
        const eventCheckQuery = `SELECT event_id, title, max_participants, current_participants FROM Events WHERE event_id = @id`;
        const eventCheck = await database.query(eventCheckQuery, { id: testEventId });
        const testEvent = (eventCheck.recordset || eventCheck)[0];
        
        console.log(`📌 Attempting to register user ${testUserId} for event ${testEventId}`);
        console.log(`   Event: ${testEvent.title}`);
        console.log(`   Max: ${testEvent.max_participants}`);
        console.log(`   Current: ${testEvent.current_participants}`);
        
        // Check if already registered
        const alreadyRegQuery = `SELECT registration_id FROM EventRegistrations WHERE event_id = @id AND user_id = @userId`;
        const alreadyReg = await database.query(alreadyRegQuery, { id: testEventId, userId: testUserId });
        
        if ((alreadyReg.recordset || alreadyReg).length > 0) {
            console.log(`   ⚠️  User already registered!`);
        } else {
            // Check capacity
            if (testEvent.max_participants && testEvent.current_participants >= testEvent.max_participants) {
                console.log(`   ❌ WOULD FAIL: Event is full (${testEvent.current_participants}/${testEvent.max_participants})`);
            } else {
                console.log(`   ✅ WOULD SUCCESS: Event has available slots`);
            }
        }
        
    } catch (err) {
        console.error('❌ Error:', err);
    } finally {
        await database.close();
        console.log('\n✅ Test completed\n');
    }
}

testEventRegistration();
