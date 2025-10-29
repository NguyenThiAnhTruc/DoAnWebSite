/**
 * KIỂM TRA THỜI GIAN NHẮN TIN
 * 
 * Kiểm tra:
 * 1. Timestamp của messages trong database
 * 2. Thứ tự sắp xếp conversations
 * 3. Timezone issues
 * 4. Hiển thị thời gian trên frontend
 */

const database = require('./config/database');

console.log('⏰ KIỂM TRA THỜI GIAN NHẮN TIN\n');
console.log('='.repeat(80));

async function checkMessageTimestamps() {
    console.log('\n1️⃣ KIỂM TRA TIMESTAMPS CỦA MESSAGES...\n');
    
    try {
        const query = `
            SELECT TOP 20
                m.message_id,
                m.conversation_id,
                m.sender_id,
                ISNULL(u.first_name + ' ' + u.last_name, 'Chatbot') AS sender_name,
                LEFT(m.content, 50) AS content_preview,
                m.sent_at,
                DATEPART(HOUR, m.sent_at) AS hour,
                DATEPART(MINUTE, m.sent_at) AS minute,
                DATEPART(SECOND, m.sent_at) AS second,
                DATEDIFF(SECOND, m.sent_at, GETDATE()) AS seconds_ago
            FROM Messages m
            LEFT JOIN Users u ON m.sender_id = u.user_id
            WHERE m.is_deleted = 0
            ORDER BY m.sent_at DESC
        `;
        
        const result = await database.query(query);
        
        console.log(`Tìm thấy ${result.recordset.length} messages gần đây nhất:\n`);
        
        result.recordset.forEach((msg, idx) => {
            const sentAt = new Date(msg.sent_at);
            const timeStr = sentAt.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
            const dateStr = sentAt.toLocaleDateString('vi-VN');
            
            console.log(`${idx + 1}. Message #${msg.message_id} (Conv #${msg.conversation_id})`);
            console.log(`   From: ${msg.sender_name}`);
            console.log(`   Content: "${msg.content_preview}${msg.content_preview.length >= 50 ? '...' : ''}"`);
            console.log(`   ⏰ Sent at: ${dateStr} ${timeStr}`);
            console.log(`   📊 Raw: ${msg.sent_at.toISOString()}`);
            console.log(`   ⏱️  ${msg.seconds_ago} seconds ago`);
            console.log();
        });
        
    } catch (error) {
        console.error('❌ Lỗi kiểm tra timestamps:', error.message);
    }
}

async function checkConversationOrder() {
    console.log('\n2️⃣ KIỂM TRA THỨ TỰ SẮP XẾP CONVERSATIONS...\n');
    
    try {
        const query = `
            SELECT 
                c.conversation_id,
                c.title,
                c.created_at,
                c.updated_at,
                (
                    SELECT TOP 1 content
                    FROM Messages m
                    WHERE m.conversation_id = c.conversation_id
                    AND m.is_deleted = 0
                    ORDER BY m.sent_at DESC
                ) AS last_message,
                (
                    SELECT TOP 1 sent_at
                    FROM Messages m
                    WHERE m.conversation_id = c.conversation_id
                    AND m.is_deleted = 0
                    ORDER BY m.sent_at DESC
                ) AS last_message_time,
                (
                    SELECT COUNT(*)
                    FROM Messages m
                    WHERE m.conversation_id = c.conversation_id
                    AND m.is_deleted = 0
                ) AS message_count
            FROM Conversations c
            WHERE c.is_archived = 0
            ORDER BY last_message_time DESC
        `;
        
        const result = await database.query(query);
        
        console.log(`Thứ tự conversations (sắp xếp theo last_message_time DESC):\n`);
        
        result.recordset.forEach((conv, idx) => {
            if (conv.last_message_time) {
                const lastMsgTime = new Date(conv.last_message_time);
                const timeStr = lastMsgTime.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
                const dateStr = lastMsgTime.toLocaleDateString('vi-VN');
                
                console.log(`${idx + 1}. Conv #${conv.conversation_id}: ${conv.title || '(No title)'}`);
                console.log(`   📧 Last message: "${(conv.last_message || '').substring(0, 40)}..."`);
                console.log(`   ⏰ Time: ${dateStr} ${timeStr}`);
                console.log(`   📊 Raw: ${conv.last_message_time.toISOString()}`);
                console.log(`   💬 Total messages: ${conv.message_count}`);
                console.log();
            } else {
                console.log(`${idx + 1}. Conv #${conv.conversation_id}: ${conv.title || '(No title)'}`);
                console.log(`   ⚠️  No messages yet`);
                console.log();
            }
        });
        
    } catch (error) {
        console.error('❌ Lỗi kiểm tra conversation order:', error.message);
    }
}

async function checkTimezoneIssues() {
    console.log('\n3️⃣ KIỂM TRA TIMEZONE ISSUES...\n');
    
    try {
        // Check current database time
        const dbTimeQuery = `SELECT GETDATE() AS db_time, SYSDATETIMEOFFSET() AS db_time_offset`;
        const dbTimeResult = await database.query(dbTimeQuery);
        
        const dbTime = new Date(dbTimeResult.recordset[0].db_time);
        const jsTime = new Date();
        
        console.log('⏰ Thời gian hiện tại:');
        console.log(`   Database (GETDATE): ${dbTime.toISOString()}`);
        console.log(`   Database (local):   ${dbTime.toLocaleString('vi-VN')}`);
        console.log(`   JavaScript (UTC):   ${jsTime.toISOString()}`);
        console.log(`   JavaScript (local): ${jsTime.toLocaleString('vi-VN')}`);
        console.log();
        
        const timeDiff = Math.abs(dbTime.getTime() - jsTime.getTime()) / 1000;
        console.log(`⏱️  Time difference: ${timeDiff.toFixed(2)} seconds`);
        
        if (timeDiff > 5) {
            console.log('⚠️  WARNING: Database time và JS time chênh lệch > 5 giây!');
            console.log('   Có thể có vấn đề về timezone hoặc clock sync');
        } else {
            console.log('✅ Database time và JS time đồng bộ tốt');
        }
        console.log();
        
        // Check for future messages
        const futureQuery = `
            SELECT COUNT(*) AS count
            FROM Messages
            WHERE sent_at > DATEADD(MINUTE, 5, GETDATE())
        `;
        const futureResult = await database.query(futureQuery);
        
        if (futureResult.recordset[0].count > 0) {
            console.log(`⚠️  Tìm thấy ${futureResult.recordset[0].count} messages có timestamp trong tương lai!`);
        } else {
            console.log('✅ Không có messages với timestamp trong tương lai');
        }
        
    } catch (error) {
        console.error('❌ Lỗi kiểm tra timezone:', error.message);
    }
}

async function checkFrontendTimeFormatting() {
    console.log('\n4️⃣ KIỂM TRA FORMAT THỜI GIAN TRÊN FRONTEND...\n');
    
    try {
        const fs = require('fs');
        const htmlContent = fs.readFileSync('./views/MessagingSystem.html', 'utf8');
        
        // Extract formatTime function
        const formatTimeRegex = /function formatTime\(([^)]*)\)\s*{\s*([^}]+)\s*}/;
        const match = htmlContent.match(formatTimeRegex);
        
        if (match) {
            console.log('✅ Tìm thấy function formatTime():');
            console.log(`   Parameter: ${match[1]}`);
            console.log(`   Code: ${match[2].trim()}`);
            console.log();
            
            // Test formatTime với timestamps khác nhau
            console.log('🧪 Test formatTime với các timestamps mẫu:');
            
            const testTimestamps = [
                Date.now(),
                Date.now() - (60 * 1000), // 1 phút trước
                Date.now() - (60 * 60 * 1000), // 1 giờ trước
                new Date('2025-10-27T04:56:00').getTime(),
                new Date('2025-10-27T05:08:00').getTime()
            ];
            
            testTimestamps.forEach((ts, idx) => {
                const d = new Date(ts);
                const formatted = d.toLocaleTimeString('vi-VN', {hour: '2-digit', minute: '2-digit'});
                console.log(`   ${idx + 1}. ${d.toISOString()} → ${formatted}`);
            });
            
        } else {
            console.log('⚠️  Không tìm thấy function formatTime()');
        }
        
        // Check if there's any timezone conversion
        const hasTimezoneConversion = htmlContent.includes('toLocaleTimeString') || 
                                       htmlContent.includes('getTimezoneOffset');
        console.log();
        console.log(`Timezone conversion: ${hasTimezoneConversion ? '✅ Có' : '❌ Không có'}`);
        
    } catch (error) {
        console.error('❌ Lỗi kiểm tra frontend formatting:', error.message);
    }
}

async function checkSpecificConversations() {
    console.log('\n5️⃣ KIỂM TRA CÁC CONVERSATIONS CỤ THỂ (TỪ ẢNH)...\n');
    
    try {
        // Check conversations with "Nguyễn Văn Nam" và "Hoàng Văn Cường"
        const query = `
            SELECT 
                c.conversation_id,
                c.title,
                STRING_AGG(u.first_name + ' ' + u.last_name, ', ') AS participants,
                (
                    SELECT TOP 1 m.content
                    FROM Messages m
                    WHERE m.conversation_id = c.conversation_id
                    AND m.is_deleted = 0
                    ORDER BY m.sent_at DESC
                ) AS last_message,
                (
                    SELECT TOP 1 m.sent_at
                    FROM Messages m
                    WHERE m.conversation_id = c.conversation_id
                    AND m.is_deleted = 0
                    ORDER BY m.sent_at DESC
                ) AS last_message_time
            FROM Conversations c
            JOIN ConversationParticipants cp ON c.conversation_id = cp.conversation_id
            JOIN Users u ON cp.user_id = u.user_id
            WHERE c.is_archived = 0
            AND (
                c.title LIKE N'%Nguyễn Văn Nam%' OR
                c.title LIKE N'%Hoàng Văn Cường%' OR
                u.first_name + ' ' + u.last_name LIKE N'%Nguyễn Văn Nam%' OR
                u.first_name + ' ' + u.last_name LIKE N'%Hoàng Văn Cường%'
            )
            GROUP BY c.conversation_id, c.title
            ORDER BY last_message_time DESC
        `;
        
        const result = await database.query(query);
        
        if (result.recordset.length > 0) {
            console.log('Tìm thấy conversations liên quan:\n');
            
            result.recordset.forEach((conv, idx) => {
                if (conv.last_message_time) {
                    const time = new Date(conv.last_message_time);
                    const timeStr = time.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
                    
                    console.log(`${idx + 1}. ${conv.title || 'No title'}`);
                    console.log(`   Participants: ${conv.participants}`);
                    console.log(`   Last message: "${conv.last_message}"`);
                    console.log(`   ⏰ Time: ${timeStr} (${time.toISOString()})`);
                    console.log();
                }
            });
        } else {
            console.log('⚠️  Không tìm thấy conversations phù hợp');
            console.log('   Thử tìm tất cả conversations có messages gần đây...\n');
            
            const allQuery = `
                SELECT TOP 5
                    c.conversation_id,
                    c.title,
                    (SELECT TOP 1 m.sent_at FROM Messages m WHERE m.conversation_id = c.conversation_id ORDER BY m.sent_at DESC) AS last_time
                FROM Conversations c
                WHERE c.is_archived = 0
                ORDER BY last_time DESC
            `;
            
            const allResult = await database.query(allQuery);
            allResult.recordset.forEach((conv, idx) => {
                if (conv.last_time) {
                    const time = new Date(conv.last_time);
                    const timeStr = time.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
                    console.log(`   ${idx + 1}. Conv #${conv.conversation_id}: ${conv.title || 'No title'} - ${timeStr}`);
                }
            });
        }
        
    } catch (error) {
        console.error('❌ Lỗi kiểm tra specific conversations:', error.message);
    }
}

async function generateRecommendations() {
    console.log('\n6️⃣ KHUYẾN NGHỊ VỀ THỜI GIAN...\n');
    
    console.log('📌 Các vấn đề có thể gây nhầm lẫn về thời gian:');
    console.log('   1. Server timezone khác với client timezone');
    console.log('   2. Database GETDATE() trả về giờ UTC, nhưng browser hiển thị local time');
    console.log('   3. Format time không consistent (24h vs 12h format)');
    console.log('   4. Không hiển thị ngày, chỉ hiển thị giờ');
    console.log();
    
    console.log('💡 Giải pháp:');
    console.log('   ✅ Sử dụng UTC cho tất cả timestamps trong database');
    console.log('   ✅ Convert sang local timezone khi hiển thị trên frontend');
    console.log('   ✅ Hiển thị ngày nếu message > 24h');
    console.log('   ✅ Format consistent: HH:mm (24-hour format)');
    console.log('   ✅ Hiển thị "Hôm qua", "Hôm nay" cho dễ đọc');
}

async function runAllChecks() {
    try {
        await checkMessageTimestamps();
        await checkConversationOrder();
        await checkTimezoneIssues();
        await checkFrontendTimeFormatting();
        await checkSpecificConversations();
        await generateRecommendations();
        
        console.log('\n' + '='.repeat(80));
        console.log('✅ HOÀN THÀNH KIỂM TRA THỜI GIAN NHẮN TIN!');
        console.log('='.repeat(80) + '\n');
        
        process.exit(0);
        
    } catch (error) {
        console.error('\n❌ LỖI:', error);
        process.exit(1);
    }
}

runAllChecks();
