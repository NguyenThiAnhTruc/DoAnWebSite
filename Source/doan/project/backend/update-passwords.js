const database = require('./config/database');
const bcrypt = require('bcrypt');

async function updatePasswords() {
    try {
        console.log('🔄 Connecting to database...');
        await database.connect();
        
        // Hash for password123
        const correctHash = await bcrypt.hash('password123', 12);
        console.log('✅ Generated hash for password123:', correctHash);
        
        // Update all sample users with correct hash
        const users = [
            'admin@school.edu.vn',
            'teacher1@school.edu.vn', 
            'teacher2@school.edu.vn',
            'student1@school.edu.vn',
            'student2@school.edu.vn', 
            'student3@school.edu.vn',
            'student4@school.edu.vn'
        ];
        
        for (const email of users) {
            try {
                const result = await database.query(
                    'UPDATE Users SET password_hash = @correctHash WHERE email = @email',
                    { correctHash, email }
                );
                
                if (result.rowsAffected[0] > 0) {
                    console.log(`✅ Updated password for ${email}`);
                } else {
                    console.log(`⚠️  User ${email} not found in database`);
                }
            } catch (error) {
                console.error(`❌ Error updating ${email}:`, error.message);
            }
        }
        
        console.log('🎉 Password update completed!');
        console.log('📝 All sample accounts now use password: password123');
        
    } catch (error) {
        console.error('❌ Error:', error);
    }
}

updatePasswords();