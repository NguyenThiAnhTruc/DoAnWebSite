// Debug script to check event dates in database
const database = require('./config/database');

async function checkEventDates() {
    try {
        const query = `
            SELECT TOP 5
                event_id,
                title,
                start_date,
                start_time,
                end_date,
                end_time,
                registration_deadline,
                current_participants,
                max_participants,
                status
            FROM Events
            ORDER BY event_id DESC
        `;
        
        const result = await database.query(query);
        const events = result.recordset || result;
        
        console.log('\n📅 EVENT DATES DEBUG:');
        console.log('Current Server Time:', new Date());
        console.log('\n');
        
        events.forEach(event => {
            console.log('─────────────────────────────────────────');
            console.log(`Event ID: ${event.event_id}`);
            console.log(`Title: ${event.title}`);
            console.log(`Start Date: ${event.start_date}`);
            console.log(`Start Time: ${event.start_time}`);
            console.log(`End Date: ${event.end_date}`);
            console.log(`End Time: ${event.end_time}`);
            console.log(`Registration Deadline: ${event.registration_deadline}`);
            console.log(`Participants: ${event.current_participants}/${event.max_participants}`);
            console.log(`Status: ${event.status}`);
            
            // Check if dates are valid
            const startDate = new Date(event.start_date);
            const endDate = new Date(event.end_date);
            const now = new Date();
            
            console.log(`\n🔍 Analysis:`);
            console.log(`  Start Date Valid: ${!isNaN(startDate.getTime())}`);
            console.log(`  End Date Valid: ${!isNaN(endDate.getTime())}`);
            console.log(`  Start Date Year: ${startDate.getFullYear()}`);
            console.log(`  Has Started: ${startDate <= now}`);
            console.log(`  Has Ended: ${endDate <= now}`);
            console.log(`  Is Full: ${event.current_participants >= event.max_participants}`);
            console.log('\n');
        });
        
        process.exit(0);
    } catch (error) {
        console.error('Error checking event dates:', error);
        process.exit(1);
    }
}

checkEventDates();
