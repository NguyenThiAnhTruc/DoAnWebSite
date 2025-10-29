// Test registration logic
const database = require('./config/database');

async function testRegistration() {
    const eventId = 2; // "Cuộc thi Lập trình Spring 2025"
    const userId = 6; // Test user
    
    try {
        // Get event details
        const qEvent = `
            SELECT event_id, title, max_participants, current_participants, 
                   registration_deadline, start_date, start_time, end_date, end_time 
            FROM Events 
            WHERE event_id = @id
        `;
        const er = await database.query(qEvent, { id: eventId });
        const event = (er.recordset || er)[0];
        
        console.log('\n📋 EVENT DETAILS:');
        console.log('Event ID:', event.event_id);
        console.log('Title:', event.title);
        console.log('Participants:', `${event.current_participants}/${event.max_participants}`);
        console.log('Start Date:', event.start_date);
        console.log('Start Time:', event.start_time);
        console.log('End Date:', event.end_date);
        console.log('End Time:', event.end_time);
        console.log('Registration Deadline:', event.registration_deadline);
        
        console.log('\n🔍 REGISTRATION CHECKS:');
        
        // Check already registered
        const qCheck = `SELECT registration_id FROM EventRegistrations WHERE event_id = @id AND user_id = @userId`;
        const chk = await database.query(qCheck, { id: eventId, userId });
        const alreadyRegistered = (chk.recordset || chk).length > 0;
        console.log('1. Already Registered:', alreadyRegistered ? '❌ YES' : '✅ NO');
        
        // Check if event has started
        const now = new Date();
        let eventStartDateTime = new Date(event.start_date);
        if (event.start_time) {
            const timeObj = new Date(event.start_time);
            eventStartDateTime.setHours(timeObj.getHours(), timeObj.getMinutes(), timeObj.getSeconds());
        }
        console.log('2. Event Start DateTime:', eventStartDateTime.toLocaleString('vi-VN'));
        console.log('   Current Time:', now.toLocaleString('vi-VN'));
        console.log('   Has Started:', eventStartDateTime <= now ? '❌ YES - BLOCKED' : '✅ NO - ALLOWED');
        
        // Check if event has ended
        let eventEndDateTime = new Date(event.end_date);
        if (event.end_time) {
            const timeObj = new Date(event.end_time);
            eventEndDateTime.setHours(timeObj.getHours(), timeObj.getMinutes(), timeObj.getSeconds());
        }
        console.log('3. Event End DateTime:', eventEndDateTime.toLocaleString('vi-VN'));
        console.log('   Has Ended:', eventEndDateTime <= now ? '❌ YES - BLOCKED' : '✅ NO - ALLOWED');
        
        // Check capacity
        const isFull = event.max_participants && event.current_participants >= event.max_participants;
        console.log('4. Capacity:', `${event.current_participants}/${event.max_participants}`);
        console.log('   Is Full:', isFull ? '❌ YES - BLOCKED' : '✅ NO - ALLOWED');
        
        // Check registration deadline
        let deadlinePassed = false;
        if (event.registration_deadline) {
            deadlinePassed = new Date(event.registration_deadline) < now;
            console.log('5. Registration Deadline:', event.registration_deadline);
            console.log('   Deadline Passed:', deadlinePassed ? '❌ YES - BLOCKED' : '✅ NO - ALLOWED');
        } else {
            console.log('5. Registration Deadline: ✅ NO DEADLINE');
        }
        
        console.log('\n📊 FINAL RESULT:');
        if (alreadyRegistered) {
            console.log('❌ BLOCKED: Already registered');
        } else if (eventStartDateTime <= now) {
            console.log('❌ BLOCKED: Event has already started');
        } else if (eventEndDateTime <= now) {
            console.log('❌ BLOCKED: Event has already ended');
        } else if (isFull) {
            console.log('❌ BLOCKED: Event is full');
        } else if (deadlinePassed) {
            console.log('❌ BLOCKED: Registration deadline passed');
        } else {
            console.log('✅ ALLOWED: Registration is possible!');
        }
        
        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

testRegistration();
