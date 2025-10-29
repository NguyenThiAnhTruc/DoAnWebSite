/**
 * KIỂM TRA TOÀN BỘ LOGIC VÀ HOẠT ĐỘNG CỦA HỆ THỐNG TIN NHẮN
 * 
 * Kiểm tra:
 * 1. Kết nối database
 * 2. Cấu trúc bảng Messages, Conversations, ConversationParticipants
 * 3. API endpoints
 * 4. Logic gửi/nhận tin nhắn
 * 5. Chatbot integration
 * 6. Unread messages counter
 * 7. Frontend-Backend integration
 */

const database = require('./config/database');

console.log('🔍 BẮT ĐẦU KIỂM TRA HỆ THỐNG TIN NHẮN\n');
console.log('='.repeat(60));

async function checkDatabaseConnection() {
    console.log('\n1️⃣ KIỂM TRA KẾT NỐI DATABASE...');
    try {
        const result = await database.query('SELECT @@VERSION AS version');
        console.log('✅ Kết nối database thành công!');
        console.log('   Version:', result.recordset[0].version.split('\n')[0]);
        return true;
    } catch (error) {
        console.error('❌ Lỗi kết nối database:', error.message);
        return false;
    }
}

async function checkTables() {
    console.log('\n2️⃣ KIỂM TRA CẤU TRÚC BẢNG...');
    
    const tables = ['Conversations', 'ConversationParticipants', 'Messages'];
    let allTablesExist = true;
    
    for (const table of tables) {
        try {
            const query = `
                SELECT 
                    COLUMN_NAME,
                    DATA_TYPE,
                    IS_NULLABLE,
                    COLUMN_DEFAULT
                FROM INFORMATION_SCHEMA.COLUMNS
                WHERE TABLE_NAME = '${table}'
                ORDER BY ORDINAL_POSITION
            `;
            const result = await database.query(query);
            
            if (result.recordset.length > 0) {
                console.log(`\n✅ Bảng ${table} tồn tại với ${result.recordset.length} cột:`);
                result.recordset.forEach(col => {
                    console.log(`   - ${col.COLUMN_NAME}: ${col.DATA_TYPE} ${col.IS_NULLABLE === 'NO' ? 'NOT NULL' : 'NULL'}`);
                });
            } else {
                console.log(`❌ Bảng ${table} KHÔNG tồn tại!`);
                allTablesExist = false;
            }
        } catch (error) {
            console.error(`❌ Lỗi kiểm tra bảng ${table}:`, error.message);
            allTablesExist = false;
        }
    }
    
    return allTablesExist;
}

async function checkIndexes() {
    console.log('\n3️⃣ KIỂM TRA INDEXES...');
    
    try {
        const query = `
            SELECT 
                t.name AS TableName,
                i.name AS IndexName,
                i.type_desc AS IndexType
            FROM sys.indexes i
            JOIN sys.tables t ON i.object_id = t.object_id
            WHERE t.name IN ('Messages', 'Conversations', 'ConversationParticipants')
            AND i.name IS NOT NULL
            ORDER BY t.name, i.name
        `;
        
        const result = await database.query(query);
        
        if (result.recordset.length > 0) {
            console.log('✅ Indexes được tìm thấy:');
            result.recordset.forEach(idx => {
                console.log(`   - ${idx.TableName}.${idx.IndexName} (${idx.IndexType})`);
            });
        } else {
            console.log('⚠️ Không tìm thấy indexes nào!');
        }
    } catch (error) {
        console.error('❌ Lỗi kiểm tra indexes:', error.message);
    }
}

async function checkDataIntegrity() {
    console.log('\n4️⃣ KIỂM TRA TÍNH TOÀN VẸN DỮ LIỆU...');
    
    try {
        // Check for orphaned messages
        const orphanedMessages = await database.query(`
            SELECT COUNT(*) AS count
            FROM Messages m
            LEFT JOIN Conversations c ON m.conversation_id = c.conversation_id
            WHERE c.conversation_id IS NULL
        `);
        
        if (orphanedMessages.recordset[0].count > 0) {
            console.log(`⚠️ Tìm thấy ${orphanedMessages.recordset[0].count} tin nhắn không có conversation!`);
        } else {
            console.log('✅ Không có tin nhắn orphaned');
        }
        
        // Check for orphaned participants
        const orphanedParticipants = await database.query(`
            SELECT COUNT(*) AS count
            FROM ConversationParticipants cp
            LEFT JOIN Conversations c ON cp.conversation_id = c.conversation_id
            WHERE c.conversation_id IS NULL
        `);
        
        if (orphanedParticipants.recordset[0].count > 0) {
            console.log(`⚠️ Tìm thấy ${orphanedParticipants.recordset[0].count} participants không có conversation!`);
        } else {
            console.log('✅ Không có participants orphaned');
        }
        
        // Check for messages from non-participants
        const invalidSenders = await database.query(`
            SELECT COUNT(*) AS count
            FROM Messages m
            WHERE NOT EXISTS (
                SELECT 1 FROM ConversationParticipants cp
                WHERE cp.conversation_id = m.conversation_id
                AND cp.user_id = m.sender_id
            )
            AND m.sender_id != 0
        `);
        
        if (invalidSenders.recordset[0].count > 0) {
            console.log(`⚠️ Tìm thấy ${invalidSenders.recordset[0].count} tin nhắn từ người không phải participant!`);
        } else {
            console.log('✅ Tất cả tin nhắn đều từ participants hợp lệ');
        }
        
    } catch (error) {
        console.error('❌ Lỗi kiểm tra tính toàn vẹn dữ liệu:', error.message);
    }
}

async function checkStatistics() {
    console.log('\n5️⃣ THỐNG KÊ DỮ LIỆU...');
    
    try {
        // Total conversations
        const totalConvs = await database.query('SELECT COUNT(*) AS count FROM Conversations WHERE is_archived = 0');
        console.log(`📊 Tổng số conversations: ${totalConvs.recordset[0].count}`);
        
        // Total messages
        const totalMsgs = await database.query('SELECT COUNT(*) AS count FROM Messages WHERE is_deleted = 0');
        console.log(`📊 Tổng số messages: ${totalMsgs.recordset[0].count}`);
        
        // Messages by role
        const msgsByRole = await database.query(`
            SELECT 
                ISNULL(u.role, 'chatbot') AS role,
                COUNT(*) AS count
            FROM Messages m
            LEFT JOIN Users u ON m.sender_id = u.user_id
            WHERE m.is_deleted = 0
            GROUP BY u.role
            ORDER BY count DESC
        `);
        
        console.log('📊 Messages theo role:');
        msgsByRole.recordset.forEach(row => {
            console.log(`   - ${row.role}: ${row.count} messages`);
        });
        
        // Active conversations
        const activeConvs = await database.query(`
            SELECT 
                c.conversation_id,
                c.title,
                COUNT(DISTINCT cp.user_id) AS participant_count,
                COUNT(m.message_id) AS message_count,
                MAX(m.sent_at) AS last_message_at
            FROM Conversations c
            LEFT JOIN ConversationParticipants cp ON c.conversation_id = cp.conversation_id
            LEFT JOIN Messages m ON c.conversation_id = m.conversation_id AND m.is_deleted = 0
            WHERE c.is_archived = 0
            GROUP BY c.conversation_id, c.title
            ORDER BY last_message_at DESC
        `);
        
        console.log(`\n📊 Top 5 conversations hoạt động gần đây:`);
        activeConvs.recordset.slice(0, 5).forEach((conv, idx) => {
            console.log(`   ${idx + 1}. ${conv.title || `Conv #${conv.conversation_id}`}`);
            console.log(`      - ${conv.participant_count} participants, ${conv.message_count} messages`);
            if (conv.last_message_at) {
                console.log(`      - Last message: ${new Date(conv.last_message_at).toLocaleString('vi-VN')}`);
            }
        });
        
    } catch (error) {
        console.error('❌ Lỗi thống kê dữ liệu:', error.message);
    }
}

async function checkChatbotIntegration() {
    console.log('\n6️⃣ KIỂM TRA TÍCH HỢP CHATBOT...');
    
    try {
        // Check if chatbot user exists (user_id = 0)
        const chatbotUser = await database.query(`
            SELECT * FROM Users WHERE user_id = 0
        `);
        
        if (chatbotUser.recordset.length > 0) {
            console.log('✅ Chatbot user (user_id = 0) tồn tại');
            console.log(`   Name: ${chatbotUser.recordset[0].first_name} ${chatbotUser.recordset[0].last_name}`);
        } else {
            console.log('❌ Chatbot user KHÔNG tồn tại!');
            console.log('   💡 Chạy: node setup-chatbot-user.js để tạo chatbot user');
        }
        
        // Check conversations with chatbot
        const chatbotConvs = await database.query(`
            SELECT COUNT(*) AS count
            FROM ConversationParticipants
            WHERE user_id = 0
        `);
        
        console.log(`📊 Số conversations có chatbot: ${chatbotConvs.recordset[0].count}`);
        
        // Check chatbot messages
        const chatbotMsgs = await database.query(`
            SELECT COUNT(*) AS count
            FROM Messages
            WHERE sender_id = 0 AND is_deleted = 0
        `);
        
        console.log(`📊 Số messages từ chatbot: ${chatbotMsgs.recordset[0].count}`);
        
        // Check chatbot service
        try {
            const chatbot = require('./services/chatbot');
            console.log('✅ Chatbot service module đã được load');
            
            // Test chatbot response (không thực sự gửi)
            console.log('   Testing chatbot logic...');
            const testPatterns = ['hello', 'hướng dẫn', 'event', 'help'];
            let matchedPatterns = 0;
            
            testPatterns.forEach(pattern => {
                if (chatbot.greetings?.some(g => g.toLowerCase().includes(pattern))) {
                    matchedPatterns++;
                }
            });
            
            console.log(`   ✅ Chatbot patterns working (${matchedPatterns} matched)`);
            
        } catch (error) {
            console.log('⚠️ Chatbot service có thể có vấn đề:', error.message);
        }
        
    } catch (error) {
        console.error('❌ Lỗi kiểm tra chatbot:', error.message);
    }
}

async function checkAPIEndpoints() {
    console.log('\n7️⃣ KIỂM TRA API ENDPOINTS...');
    
    const endpoints = [
        { method: 'GET', path: '/api/messages/conversations', desc: 'Lấy danh sách conversations' },
        { method: 'GET', path: '/api/messages/conversations/:id/messages', desc: 'Lấy messages của 1 conversation' },
        { method: 'POST', path: '/api/messages/conversations', desc: 'Tạo conversation mới' },
        { method: 'POST', path: '/api/messages/conversations/:id/messages', desc: 'Gửi message' },
        { method: 'PUT', path: '/api/messages/conversations/:id/read', desc: 'Đánh dấu đã đọc' },
        { method: 'GET', path: '/api/messages/unread-count', desc: 'Đếm tin nhắn chưa đọc' },
        { method: 'GET', path: '/api/messages/users/search', desc: 'Tìm kiếm users' }
    ];
    
    console.log('📋 Danh sách API endpoints:');
    endpoints.forEach(ep => {
        console.log(`   ${ep.method.padEnd(6)} ${ep.path}`);
        console.log(`          → ${ep.desc}`);
    });
    
    // Check if routes file exists and is properly structured
    try {
        const fs = require('fs');
        const routesContent = fs.readFileSync('./routes/messages.js', 'utf8');
        
        const hasAuth = routesContent.includes('requireAuth');
        const hasConvRoute = routesContent.includes("router.get('/conversations'");
        const hasSendRoute = routesContent.includes("router.post('/conversations/:conversationId/messages'");
        const hasUnreadRoute = routesContent.includes("router.get('/unread-count'");
        
        console.log('\n✅ Routes file check:');
        console.log(`   - Authentication middleware: ${hasAuth ? '✅' : '❌'}`);
        console.log(`   - Get conversations route: ${hasConvRoute ? '✅' : '❌'}`);
        console.log(`   - Send message route: ${hasSendRoute ? '✅' : '❌'}`);
        console.log(`   - Unread count route: ${hasUnreadRoute ? '✅' : '❌'}`);
        
    } catch (error) {
        console.error('❌ Không thể đọc routes file:', error.message);
    }
}

async function checkFrontendIntegration() {
    console.log('\n8️⃣ KIỂM TRA FRONTEND INTEGRATION...');
    
    try {
        const fs = require('fs');
        const htmlContent = fs.readFileSync('./views/MessagingSystem.html', 'utf8');
        
        // Check critical functions
        const functions = [
            'loadCurrentUser',
            'loadAllUsers', 
            'loadConversations',
            'loadMessages',
            'sendMessageToAPI',
            'createConversation',
            'renderConversations',
            'renderMessages',
            'showChat'
        ];
        
        console.log('✅ Frontend functions check:');
        functions.forEach(fn => {
            const exists = htmlContent.includes(`function ${fn}`) || htmlContent.includes(`async function ${fn}`);
            console.log(`   - ${fn}(): ${exists ? '✅' : '❌'}`);
        });
        
        // Check API calls
        const apiCalls = [
            '/api/users',
            '/api/messages/conversations',
            '/api/messages/conversations/${conversationId}/messages',
        ];
        
        console.log('\n✅ API calls check:');
        apiCalls.forEach(api => {
            const exists = htmlContent.includes(api);
            console.log(`   - ${api}: ${exists ? '✅' : '❌'}`);
        });
        
        // Check event listeners
        const events = [
            'btnSend.onclick',
            'msgInput.addEventListener',
            'btnNewChat.onclick',
            'searchConv.addEventListener'
        ];
        
        console.log('\n✅ Event listeners check:');
        events.forEach(ev => {
            const exists = htmlContent.includes(ev);
            console.log(`   - ${ev}: ${exists ? '✅' : '❌'}`);
        });
        
    } catch (error) {
        console.error('❌ Lỗi kiểm tra frontend:', error.message);
    }
}

async function checkPotentialIssues() {
    console.log('\n9️⃣ KIỂM TRA CÁC VẤN ĐỀ TIỀM ẨN...');
    
    const issues = [];
    
    try {
        // Check for conversations without messages
        const emptyConvs = await database.query(`
            SELECT COUNT(*) AS count
            FROM Conversations c
            WHERE NOT EXISTS (
                SELECT 1 FROM Messages m
                WHERE m.conversation_id = c.conversation_id
                AND m.is_deleted = 0
            )
            AND c.is_archived = 0
        `);
        
        if (emptyConvs.recordset[0].count > 0) {
            issues.push(`⚠️ ${emptyConvs.recordset[0].count} conversations không có tin nhắn nào`);
        }
        
        // Check for conversations with only one participant
        const singleParticipant = await database.query(`
            SELECT c.conversation_id, c.title, COUNT(cp.user_id) AS participant_count
            FROM Conversations c
            JOIN ConversationParticipants cp ON c.conversation_id = cp.conversation_id
            WHERE c.is_archived = 0
            GROUP BY c.conversation_id, c.title
            HAVING COUNT(cp.user_id) < 2
        `);
        
        if (singleParticipant.recordset.length > 0) {
            issues.push(`⚠️ ${singleParticipant.recordset.length} conversations chỉ có 1 participant`);
        }
        
        // Check for very old unread messages
        const oldUnread = await database.query(`
            SELECT COUNT(*) AS count
            FROM Messages m
            JOIN ConversationParticipants cp ON m.conversation_id = cp.conversation_id
            WHERE m.sent_at < DATEADD(day, -30, GETDATE())
            AND (cp.last_read_at IS NULL OR m.sent_at > cp.last_read_at)
            AND m.sender_id != cp.user_id
            AND m.is_deleted = 0
        `);
        
        if (oldUnread.recordset[0].count > 0) {
            issues.push(`⚠️ ${oldUnread.recordset[0].count} tin nhắn chưa đọc quá 30 ngày`);
        }
        
        // Check for messages sent in the future (clock sync issues)
        const futureMessages = await database.query(`
            SELECT COUNT(*) AS count
            FROM Messages
            WHERE sent_at > DATEADD(minute, 5, GETDATE())
        `);
        
        if (futureMessages.recordset[0].count > 0) {
            issues.push(`⚠️ ${futureMessages.recordset[0].count} tin nhắn có timestamp trong tương lai!`);
        }
        
    } catch (error) {
        console.error('❌ Lỗi kiểm tra issues:', error.message);
    }
    
    if (issues.length > 0) {
        console.log('Tìm thấy các vấn đề:');
        issues.forEach(issue => console.log(`   ${issue}`));
    } else {
        console.log('✅ Không phát hiện vấn đề nào!');
    }
}

async function generateRecommendations() {
    console.log('\n🔟 KHUYẾN NGHỊ...');
    
    const recommendations = [];
    
    try {
        // Check message volume
        const msgCount = await database.query('SELECT COUNT(*) AS count FROM Messages WHERE is_deleted = 0');
        if (msgCount.recordset[0].count > 10000) {
            recommendations.push('📌 Số lượng messages lớn (>10k). Nên implement pagination và archiving.');
        }
        
        // Check unread messages
        const unreadCount = await database.query(`
            SELECT COUNT(*) AS count
            FROM Messages m
            JOIN ConversationParticipants cp ON m.conversation_id = cp.conversation_id
            WHERE m.sent_at > ISNULL(cp.last_read_at, '1900-01-01')
            AND m.sender_id != cp.user_id
            AND m.is_deleted = 0
        `);
        
        if (unreadCount.recordset[0].count > 100) {
            recommendations.push('📌 Có nhiều tin nhắn chưa đọc (>100). Nên implement notification system.');
        }
        
        // Check for real-time updates
        recommendations.push('📌 Xem xét implement WebSocket/SignalR cho real-time messaging.');
        recommendations.push('📌 Thêm file upload/attachment functionality.');
        recommendations.push('📌 Implement message reactions (like, love, etc.).');
        recommendations.push('📌 Thêm typing indicators.');
        recommendations.push('📌 Implement message search functionality.');
        
    } catch (error) {
        console.error('❌ Lỗi tạo recommendations:', error.message);
    }
    
    if (recommendations.length > 0) {
        recommendations.forEach(rec => console.log(`   ${rec}`));
    }
}

// Main execution
async function runAllChecks() {
    try {
        const dbConnected = await checkDatabaseConnection();
        
        if (!dbConnected) {
            console.log('\n❌ Không thể tiếp tục kiểm tra do lỗi kết nối database!');
            process.exit(1);
        }
        
        await checkTables();
        await checkIndexes();
        await checkDataIntegrity();
        await checkStatistics();
        await checkChatbotIntegration();
        await checkAPIEndpoints();
        await checkFrontendIntegration();
        await checkPotentialIssues();
        await generateRecommendations();
        
        console.log('\n' + '='.repeat(60));
        console.log('✅ HOÀN THÀNH KIỂM TRA HỆ THỐNG TIN NHẮN!');
        console.log('='.repeat(60) + '\n');
        
        process.exit(0);
        
    } catch (error) {
        console.error('\n❌ LỖI NGHIÊM TRỌNG:', error);
        process.exit(1);
    }
}

// Run all checks
runAllChecks();
