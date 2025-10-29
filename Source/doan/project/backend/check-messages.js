// Test script to check messages in database
const database = require('./config/database');

async function checkMessages() {
    try {
        console.log('🔍 Checking Messages table...\n');
        
        // Get latest 10 messages
        const result = await database.query(`
            SELECT TOP 10 
                m.message_id,
                m.conversation_id,
                m.sender_id,
                ISNULL(u.username, 'chatbot') as username,
                ISNULL(u.first_name + ' ' + u.last_name, 'Chatbot Hỗ trợ') as sender_name,
                m.content,
                m.sent_at,
                m.is_deleted
            FROM Messages m
            LEFT JOIN Users u ON m.sender_id = u.user_id
            ORDER BY m.sent_at DESC
        `);
        
        console.log(`📊 Total messages found: ${result.recordset.length}\n`);
        
        result.recordset.forEach((msg, index) => {
            console.log(`[${index + 1}] Message ID: ${msg.message_id}`);
            console.log(`   Conversation: ${msg.conversation_id}`);
            console.log(`   From: ${msg.sender_name} (${msg.username}, ID: ${msg.sender_id})`);
            console.log(`   Content: ${msg.content.substring(0, 100)}${msg.content.length > 100 ? '...' : ''}`);
            console.log(`   Time: ${msg.sent_at}`);
            console.log(`   Deleted: ${msg.is_deleted ? 'Yes' : 'No'}`);
            console.log('');
        });
        
        // Get conversation summary
        const convResult = await database.query(`
            SELECT 
                c.conversation_id,
                c.title,
                COUNT(m.message_id) as message_count,
                MAX(m.sent_at) as last_message_at
            FROM Conversations c
            LEFT JOIN Messages m ON c.conversation_id = m.conversation_id AND m.is_deleted = 0
            GROUP BY c.conversation_id, c.title
            ORDER BY last_message_at DESC
        `);
        
        console.log('\n📋 Conversation Summary:\n');
        convResult.recordset.forEach((conv, index) => {
            console.log(`[${index + 1}] Conversation ID: ${conv.conversation_id}`);
            console.log(`   Title: ${conv.title || 'Untitled'}`);
            console.log(`   Messages: ${conv.message_count}`);
            console.log(`   Last activity: ${conv.last_message_at || 'N/A'}`);
            console.log('');
        });
        
        // Get participants info
        const participantsResult = await database.query(`
            SELECT 
                cp.conversation_id,
                cp.user_id,
                ISNULL(u.username, 'chatbot') as username,
                ISNULL(u.first_name + ' ' + u.last_name, 'Chatbot') as full_name,
                u.role
            FROM ConversationParticipants cp
            LEFT JOIN Users u ON cp.user_id = u.user_id
            ORDER BY cp.conversation_id, cp.user_id
        `);
        
        console.log('\n👥 Participants by Conversation:\n');
        let currentConvId = null;
        participantsResult.recordset.forEach((part) => {
            if (currentConvId !== part.conversation_id) {
                if (currentConvId !== null) console.log('');
                console.log(`Conversation ${part.conversation_id}:`);
                currentConvId = part.conversation_id;
            }
            console.log(`  - ${part.full_name} (${part.username}, ${part.role || 'system'})`);
        });
        
        console.log('\n✅ Check completed!');
        process.exit(0);
        
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

checkMessages();
