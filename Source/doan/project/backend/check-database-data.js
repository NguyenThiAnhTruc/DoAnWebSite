const database = require('./config/database');

async function checkUsers() {
    try {
        await database.connect();
        console.log('✅ Database connected successfully');
        
        // Check if Users table exists and has data
        const result = await database.query(`
            SELECT TOP 5 user_id, username, email, first_name, last_name, role, status 
            FROM Users 
            WHERE status = 'active'
        `);
        
        console.log('📊 Found users:', result.recordset.length);
        result.recordset.forEach(user => {
            console.log(`  - ID: ${user.user_id}, Email: ${user.email}, Name: ${user.first_name} ${user.last_name}, Role: ${user.role}`);
        });
        
        // Check for student users specifically
        const students = await database.query(`
            SELECT user_id, username, email, first_name, last_name 
            FROM Users 
            WHERE role = 'student' AND status = 'active'
        `);
        
        console.log('\n👨‍🎓 Student accounts:', students.recordset.length);
        students.recordset.forEach(student => {
            console.log(`  - ${student.email} (${student.first_name} ${student.last_name})`);
        });
        
        // Check Events table
        const events = await database.query(`
            SELECT TOP 3 event_id, title, start_date, start_time 
            FROM Events 
            ORDER BY created_at DESC
        `);
        
        console.log('\n📅 Recent events:', events.recordset.length);
        events.recordset.forEach(event => {
            console.log(`  - ID: ${event.event_id}, Title: ${event.title}, Date: ${event.start_date}`);
        });
        
    } catch (error) {
        console.error('❌ Error checking database:', error);
    } finally {
        process.exit(0);
    }
}

checkUsers();