// Check why event shows as full
const database = require('./config/database');

async function checkEventStatus() {
    const eventId = 2; // "Cuộc thi Lập trình Spring 2025"
    
    try {
        console.log('\n🔍 CHECKING EVENT STATUS\n');
        
        // Get event details
        const eventQuery = `
            SELECT 
                event_id,
                title,
                max_participants,
                current_participants,
                registration_deadline,
                start_date,
                start_time,
                end_date,
                end_time,
                status
            FROM Events 
            WHERE event_id = @id
        `;
        const eventResult = await database.query(eventQuery, { id: eventId });
        const event = (eventResult.recordset || eventResult)[0];
        
        console.log('📋 EVENT DETAILS:');
        console.log('─────────────────────────────────────────');
        console.log('Event ID:', event.event_id);
        console.log('Title:', event.title);
        console.log('Status:', event.status);
        console.log('Max Participants:', event.max_participants);
        console.log('Current Participants:', event.current_participants);
        console.log('Available Slots:', event.max_participants - event.current_participants);
        console.log('Start Date:', event.start_date);
        console.log('Start Time:', event.start_time);
        console.log('End Date:', event.end_date);
        console.log('End Time:', event.end_time);
        console.log('Registration Deadline:', event.registration_deadline || 'No deadline');
        
        // Count actual registrations
        const countQuery = `
            SELECT COUNT(*) as actual_count
            FROM EventRegistrations
            WHERE event_id = @id
        `;
        const countResult = await database.query(countQuery, { id: eventId });
        const actualCount = (countResult.recordset || countResult)[0].actual_count;
        
        console.log('\n📊 REGISTRATION COUNT:');
        console.log('─────────────────────────────────────────');
        console.log('current_participants (in Events table):', event.current_participants);
        console.log('Actual registrations (in EventRegistrations):', actualCount);
        console.log('Difference:', Math.abs(event.current_participants - actualCount));
        
        if (event.current_participants !== actualCount) {
            console.log('\n⚠️  WARNING: Count mismatch detected!');
            console.log('The current_participants field needs to be synced.');
        }
        
        // Check if full
        const isFull = event.current_participants >= event.max_participants;
        console.log('\n🚦 CAPACITY CHECK:');
        console.log('─────────────────────────────────────────');
        console.log('Is Full?', isFull ? '❌ YES' : '✅ NO');
        console.log('Formula: current_participants >= max_participants');
        console.log(`Formula: ${event.current_participants} >= ${event.max_participants}`);
        console.log(`Result: ${isFull}`);
        
        // List all registrations
        const listQuery = `
            SELECT TOP 10
                er.registration_id,
                er.user_id,
                u.username,
                u.first_name,
                u.last_name,
                er.status,
                er.registration_date
            FROM EventRegistrations er
            JOIN Users u ON er.user_id = u.user_id
            WHERE er.event_id = @id
            ORDER BY er.registration_date DESC
        `;
        const listResult = await database.query(listQuery, { id: eventId });
        const registrations = listResult.recordset || listResult;
        
        console.log('\n👥 RECENT REGISTRATIONS (Last 10):');
        console.log('─────────────────────────────────────────');
        if (registrations.length > 0) {
            registrations.forEach((reg, index) => {
                const fullName = `${reg.first_name || ''} ${reg.last_name || ''}`.trim() || reg.username;
                console.log(`${index + 1}. ID: ${reg.registration_id} | User: ${fullName} | Status: ${reg.status}`);
            });
        } else {
            console.log('No registrations found');
        }
        
        // Provide solution if mismatch
        if (event.current_participants !== actualCount) {
            console.log('\n💡 SOLUTION:');
            console.log('─────────────────────────────────────────');
            console.log('Run this SQL to fix the count:');
            console.log(`UPDATE Events SET current_participants = ${actualCount} WHERE event_id = ${eventId}`);
        }
        
        process.exit(0);
    } catch (error) {
        console.error('\n❌ Error:', error.message);
        process.exit(1);
    }
}

checkEventStatus();
