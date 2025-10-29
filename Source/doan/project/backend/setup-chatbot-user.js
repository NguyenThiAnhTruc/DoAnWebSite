// Create chatbot system user in database
const database = require('./config/database');
const fs = require('fs');
const path = require('path');

async function createChatbotUser() {
    try {
        console.log('\n🤖 CREATING CHATBOT SYSTEM USER\n');
        
        // Read SQL file
        const sqlFile = path.join(__dirname, 'database', 'create_chatbot_user.sql');
        let sql = fs.readFileSync(sqlFile, 'utf8');
        
        // Remove GO statements
        sql = sql.replace(/\bGO\b/gi, '');
        
        console.log('📄 Executing SQL script...\n');
        
        // Execute the script
        const result = await database.query(sql);
        console.log('✅ SQL script executed successfully\n');
        
        // Verify chatbot user
        console.log('🔍 Verifying chatbot user...\n');
        
        const verifyQuery = `
            SELECT user_id, username, first_name, last_name, role, email
            FROM Users
            WHERE user_id = 0
        `;
        
        const verifyResult = await database.query(verifyQuery);
        
        if (verifyResult.recordset && verifyResult.recordset.length > 0) {
            const user = verifyResult.recordset[0];
            console.log('📊 Chatbot user found:');
            console.log(`  ✓ User ID: ${user.user_id}`);
            console.log(`  ✓ Username: ${user.username}`);
            console.log(`  ✓ Name: ${user.first_name} ${user.last_name}`);
            console.log(`  ✓ Role: ${user.role}`);
            console.log(`  ✓ Email: ${user.email}\n`);
        } else {
            console.log('❌ Chatbot user not found\n');
        }
        
        console.log('✅ CHATBOT USER SETUP COMPLETED!\n');
        
        console.log('💡 CHATBOT FEATURES:');
        console.log('  ✓ Auto-response to student FAQs');
        console.log('  ✓ Out-of-hours automatic replies');
        console.log('  ✓ Suggested replies for teachers');
        console.log('  ✓ FAQ keyword matching');
        console.log('');
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        throw error;
    } finally {
        process.exit(0);
    }
}

createChatbotUser();
