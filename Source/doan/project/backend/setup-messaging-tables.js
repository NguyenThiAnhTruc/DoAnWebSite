// Setup messaging tables in database
const database = require('./config/database');
const fs = require('fs');
const path = require('path');

async function setupMessagingTables() {
    try {
        console.log('\n🔧 SETTING UP MESSAGING TABLES\n');
        
        // Read SQL file
        const sqlFile = path.join(__dirname, 'database', 'create_messaging_tables.sql');
        let sql = fs.readFileSync(sqlFile, 'utf8');
        
        // Remove GO statements - mssql npm package doesn't support GO
        sql = sql.replace(/\bGO\b/gi, '');
        
        console.log('📄 Executing SQL script...\n');
        
        // Execute the script
        try {
            const result = await database.query(sql);
            console.log('✅ SQL script executed successfully');
            
            // SQL Server returns messages in recordset
            if (result.recordset && result.recordset.length > 0) {
                result.recordset.forEach(row => {
                    const msg = row[''] || Object.values(row)[0];
                    if (msg) console.log(msg);
                });
            }
        } catch (err) {
            // Check if it's just info message
            if (err.message && err.message.includes('already exists')) {
                console.log('ℹ️', err.message);
            } else {
                console.error(`❌ Error executing SQL:`, err.message);
                throw err;
            }
        }
        
        console.log('\n✅ MESSAGING TABLES SETUP COMPLETED!\n');
        
        // Verify tables exist
        console.log('🔍 Verifying tables...\n');
        
        const verifyQuery = `
            SELECT TABLE_NAME 
            FROM INFORMATION_SCHEMA.TABLES 
            WHERE TABLE_NAME IN ('Conversations', 'ConversationParticipants', 'Messages')
            ORDER BY TABLE_NAME
        `;
        
        const tables = await database.query(verifyQuery);
        
        if (tables.recordset && tables.recordset.length > 0) {
            console.log('📊 Tables found:');
            tables.recordset.forEach(row => {
                console.log(`  ✓ ${row.TABLE_NAME}`);
            });
        }
        
        console.log('\n💡 NEXT STEPS:');
        console.log('  1. Create backend API routes (routes/messages.js)');
        console.log('  2. Update frontend to use API instead of localStorage');
        console.log('  3. Test messaging between student and teacher');
        console.log('');
        
        process.exit(0);
    } catch (error) {
        console.error('\n❌ ERROR:', error.message);
        console.error(error.stack);
        process.exit(1);
    }
}

setupMessagingTables();
