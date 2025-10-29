/**
 * FIX MESSAGING TIMEZONE ISSUE
 * 
 * Script này sẽ:
 * 1. Backup dữ liệu hiện tại
 * 2. Update database constraints (GETDATE → GETUTCDATE)
 * 3. Migrate dữ liệu cũ (subtract 7 hours)
 * 4. Verify kết quả
 * 
 * ⚠️ QUAN TRỌNG: BACKUP DATABASE TRƯỚC KHI CHẠY!
 */

const database = require('./config/database');
const readline = require('readline');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function question(query) {
    return new Promise(resolve => rl.question(query, resolve));
}

console.log('⏰ FIX MESSAGING TIMEZONE ISSUE\n');
console.log('='.repeat(80));

async function step1_verifyCurrentState() {
    console.log('\n1️⃣ KIỂM TRA TRẠNG THÁI HIỆN TẠI...\n');
    
    try {
        // Check current database time
        const timeCheck = await database.query(`
            SELECT 
                GETDATE() AS local_time,
                GETUTCDATE() AS utc_time,
                DATEDIFF(HOUR, GETUTCDATE(), GETDATE()) AS offset_hours
        `);
        
        console.log('⏰ Database time:');
        console.log(`   Local time (GETDATE):  ${timeCheck.recordset[0].local_time.toLocaleString('vi-VN')}`);
        console.log(`   UTC time (GETUTCDATE): ${timeCheck.recordset[0].utc_time.toLocaleString('vi-VN')}`);
        console.log(`   Offset: ${timeCheck.recordset[0].offset_hours} hours`);
        console.log();
        
        // Check data counts
        const counts = await database.query(`
            SELECT 
                (SELECT COUNT(*) FROM Messages) AS message_count,
                (SELECT COUNT(*) FROM Conversations) AS conv_count,
                (SELECT COUNT(*) FROM ConversationParticipants) AS part_count
        `);
        
        console.log('📊 Dữ liệu hiện tại:');
        console.log(`   Messages: ${counts.recordset[0].message_count}`);
        console.log(`   Conversations: ${counts.recordset[0].conv_count}`);
        console.log(`   Participants: ${counts.recordset[0].part_count}`);
        console.log();
        
        // Check sample messages
        const samples = await database.query(`
            SELECT TOP 3
                message_id,
                LEFT(content, 30) AS content,
                sent_at,
                DATEADD(HOUR, -7, sent_at) AS sent_at_utc
            FROM Messages
            ORDER BY sent_at DESC
        `);
        
        console.log('📝 Sample messages (before fix):');
        samples.recordset.forEach((msg, idx) => {
            console.log(`   ${idx + 1}. Message #${msg.message_id}`);
            console.log(`      Current: ${msg.sent_at.toLocaleString('vi-VN')}`);
            console.log(`      Will be: ${msg.sent_at_utc.toLocaleString('vi-VN')}`);
        });
        console.log();
        
        return true;
    } catch (error) {
        console.error('❌ Lỗi:', error.message);
        return false;
    }
}

async function step2_createBackup() {
    console.log('\n2️⃣ TẠO BACKUP...\n');
    
    try {
        // Export data to temp tables
        await database.query(`
            -- Backup Messages
            IF OBJECT_ID('Messages_Backup_' + FORMAT(GETDATE(), 'yyyyMMddHHmmss'), 'U') IS NOT NULL
                DROP TABLE Messages_Backup;
            
            SELECT * 
            INTO Messages_Backup
            FROM Messages;
            
            -- Backup Conversations
            IF OBJECT_ID('Conversations_Backup', 'U') IS NOT NULL
                DROP TABLE Conversations_Backup;
            
            SELECT * 
            INTO Conversations_Backup
            FROM Conversations;
            
            -- Backup ConversationParticipants
            IF OBJECT_ID('ConversationParticipants_Backup', 'U') IS NOT NULL
                DROP TABLE ConversationParticipants_Backup;
            
            SELECT * 
            INTO ConversationParticipants_Backup
            FROM ConversationParticipants;
        `);
        
        console.log('✅ Backup tables created:');
        console.log('   - Messages_Backup');
        console.log('   - Conversations_Backup');
        console.log('   - ConversationParticipants_Backup');
        console.log();
        
        return true;
    } catch (error) {
        console.error('❌ Lỗi tạo backup:', error.message);
        return false;
    }
}

async function step3_migrateData() {
    console.log('\n3️⃣ MIGRATE DỮ LIỆU (subtract 7 hours)...\n');
    
    try {
        // Update Messages
        const msgsResult = await database.query(`
            UPDATE Messages
            SET sent_at = DATEADD(HOUR, -7, sent_at);
            
            SELECT @@ROWCOUNT AS updated_count;
        `);
        console.log(`✅ Updated ${msgsResult.recordset[0].updated_count} messages`);
        
        // Update Conversations
        const convsResult = await database.query(`
            UPDATE Conversations
            SET created_at = DATEADD(HOUR, -7, created_at),
                updated_at = DATEADD(HOUR, -7, updated_at);
            
            SELECT @@ROWCOUNT AS updated_count;
        `);
        console.log(`✅ Updated ${convsResult.recordset[0].updated_count} conversations`);
        
        // Update ConversationParticipants
        const partsResult = await database.query(`
            UPDATE ConversationParticipants
            SET joined_at = DATEADD(HOUR, -7, joined_at);
            
            UPDATE ConversationParticipants
            SET last_read_at = DATEADD(HOUR, -7, last_read_at)
            WHERE last_read_at IS NOT NULL;
            
            SELECT @@ROWCOUNT AS updated_count;
        `);
        console.log(`✅ Updated ConversationParticipants`);
        console.log();
        
        return true;
    } catch (error) {
        console.error('❌ Lỗi migrate data:', error.message);
        console.error('   Rolling back...');
        
        // Rollback
        await database.query(`
            TRUNCATE TABLE Messages;
            INSERT INTO Messages SELECT * FROM Messages_Backup;
            
            TRUNCATE TABLE Conversations;
            INSERT INTO Conversations SELECT * FROM Conversations_Backup;
            
            TRUNCATE TABLE ConversationParticipants;
            INSERT INTO ConversationParticipants SELECT * FROM ConversationParticipants_Backup;
        `);
        
        console.error('   ✅ Rolled back to backup');
        return false;
    }
}

async function step4_updateConstraints() {
    console.log('\n4️⃣ UPDATE DATABASE CONSTRAINTS...\n');
    
    try {
        // Update Conversations defaults
        await database.query(`
            -- Drop old constraints
            DECLARE @ConstraintName NVARCHAR(200);
            
            -- created_at constraint
            SELECT @ConstraintName = name 
            FROM sys.default_constraints 
            WHERE parent_object_id = OBJECT_ID('Conversations') 
            AND COL_NAME(parent_object_id, parent_column_id) = 'created_at';
            
            IF @ConstraintName IS NOT NULL
                EXEC('ALTER TABLE Conversations DROP CONSTRAINT ' + @ConstraintName);
            
            -- updated_at constraint
            SELECT @ConstraintName = name 
            FROM sys.default_constraints 
            WHERE parent_object_id = OBJECT_ID('Conversations') 
            AND COL_NAME(parent_object_id, parent_column_id) = 'updated_at';
            
            IF @ConstraintName IS NOT NULL
                EXEC('ALTER TABLE Conversations DROP CONSTRAINT ' + @ConstraintName);
            
            -- Add new constraints with GETUTCDATE
            ALTER TABLE Conversations 
            ADD CONSTRAINT DF_Conversations_created_at_UTC DEFAULT GETUTCDATE() FOR created_at;
            
            ALTER TABLE Conversations 
            ADD CONSTRAINT DF_Conversations_updated_at_UTC DEFAULT GETUTCDATE() FOR updated_at;
        `);
        console.log('✅ Updated Conversations constraints');
        
        // Update Messages defaults
        await database.query(`
            DECLARE @ConstraintName NVARCHAR(200);
            
            SELECT @ConstraintName = name 
            FROM sys.default_constraints 
            WHERE parent_object_id = OBJECT_ID('Messages') 
            AND COL_NAME(parent_object_id, parent_column_id) = 'sent_at';
            
            IF @ConstraintName IS NOT NULL
                EXEC('ALTER TABLE Messages DROP CONSTRAINT ' + @ConstraintName);
            
            ALTER TABLE Messages 
            ADD CONSTRAINT DF_Messages_sent_at_UTC DEFAULT GETUTCDATE() FOR sent_at;
        `);
        console.log('✅ Updated Messages constraints');
        
        // Update ConversationParticipants defaults
        await database.query(`
            DECLARE @ConstraintName NVARCHAR(200);
            
            SELECT @ConstraintName = name 
            FROM sys.default_constraints 
            WHERE parent_object_id = OBJECT_ID('ConversationParticipants') 
            AND COL_NAME(parent_object_id, parent_column_id) = 'joined_at';
            
            IF @ConstraintName IS NOT NULL
                EXEC('ALTER TABLE ConversationParticipants DROP CONSTRAINT ' + @ConstraintName);
            
            ALTER TABLE ConversationParticipants 
            ADD CONSTRAINT DF_ConversationParticipants_joined_at_UTC DEFAULT GETUTCDATE() FOR joined_at;
        `);
        console.log('✅ Updated ConversationParticipants constraints');
        console.log();
        
        return true;
    } catch (error) {
        console.error('❌ Lỗi update constraints:', error.message);
        return false;
    }
}

async function step5_verify() {
    console.log('\n5️⃣ VERIFY KẾT QUẢ...\n');
    
    try {
        // Check sample messages after fix
        const samples = await database.query(`
            SELECT TOP 3
                message_id,
                LEFT(content, 30) AS content,
                sent_at,
                DATEADD(HOUR, 7, sent_at) AS vietnam_time
            FROM Messages
            ORDER BY sent_at DESC
        `);
        
        console.log('📝 Sample messages (after fix):');
        samples.recordset.forEach((msg, idx) => {
            console.log(`   ${idx + 1}. Message #${msg.message_id}`);
            console.log(`      UTC time: ${msg.sent_at.toISOString()}`);
            console.log(`      VN time:  ${msg.vietnam_time.toLocaleString('vi-VN')}`);
        });
        console.log();
        
        // Check if new messages use UTC
        console.log('🧪 Testing new message insertion...');
        const testResult = await database.query(`
            BEGIN TRANSACTION;
            
            -- Insert test message
            INSERT INTO Messages (conversation_id, sender_id, content, is_deleted)
            VALUES (1, 1, 'TEST MESSAGE - will be deleted', 0);
            
            DECLARE @testId INT = SCOPE_IDENTITY();
            
            -- Check timestamp
            SELECT 
                sent_at,
                DATEDIFF(HOUR, sent_at, GETDATE()) AS hours_diff
            FROM Messages
            WHERE message_id = @testId;
            
            -- Delete test message
            DELETE FROM Messages WHERE message_id = @testId;
            
            ROLLBACK TRANSACTION;
        `);
        
        const hoursDiff = testResult.recordset[0].hours_diff;
        if (Math.abs(hoursDiff - 7) < 1) {
            console.log('✅ New messages are now using UTC correctly!');
            console.log(`   Difference from local time: ~${hoursDiff} hours`);
        } else {
            console.log('⚠️  Warning: Unexpected time difference');
            console.log(`   Expected: ~7 hours, Got: ${hoursDiff} hours`);
        }
        console.log();
        
        return true;
    } catch (error) {
        console.error('❌ Lỗi verify:', error.message);
        return false;
    }
}

async function step6_cleanup() {
    console.log('\n6️⃣ CLEANUP...\n');
    
    const answer = await question('Xóa backup tables? (y/n): ');
    
    if (answer.toLowerCase() === 'y') {
        try {
            await database.query(`
                DROP TABLE IF EXISTS Messages_Backup;
                DROP TABLE IF EXISTS Conversations_Backup;
                DROP TABLE IF EXISTS ConversationParticipants_Backup;
            `);
            console.log('✅ Backup tables deleted');
        } catch (error) {
            console.error('❌ Lỗi xóa backup:', error.message);
        }
    } else {
        console.log('ℹ️  Backup tables được giữ lại');
    }
    
    console.log();
}

async function runFix() {
    try {
        console.log('\n⚠️  CẢNH BÁO:');
        console.log('   Script này sẽ thay đổi TẤT CẢ timestamps trong database!');
        console.log('   Đảm bảo bạn đã BACKUP database trước khi tiếp tục.\n');
        
        const confirm = await question('Bạn đã backup database chưa? (yes/no): ');
        
        if (confirm.toLowerCase() !== 'yes') {
            console.log('\n❌ Script bị hủy. Vui lòng backup database trước!');
            rl.close();
            process.exit(0);
        }
        
        // Run steps
        const step1 = await step1_verifyCurrentState();
        if (!step1) throw new Error('Step 1 failed');
        
        const step2 = await step2_createBackup();
        if (!step2) throw new Error('Step 2 failed');
        
        const confirmMigrate = await question('\nTiếp tục migrate dữ liệu? (yes/no): ');
        if (confirmMigrate.toLowerCase() !== 'yes') {
            console.log('\n❌ Migration bị hủy.');
            rl.close();
            process.exit(0);
        }
        
        const step3 = await step3_migrateData();
        if (!step3) throw new Error('Step 3 failed');
        
        const step4 = await step4_updateConstraints();
        if (!step4) throw new Error('Step 4 failed');
        
        const step5 = await step5_verify();
        if (!step5) throw new Error('Step 5 failed');
        
        await step6_cleanup();
        
        console.log('\n' + '='.repeat(80));
        console.log('✅ HOÀN THÀNH FIX TIMEZONE ISSUE!');
        console.log('='.repeat(80));
        console.log('\n📝 Next steps:');
        console.log('   1. Restart server: npm run dev');
        console.log('   2. Test messaging system');
        console.log('   3. Verify time display on frontend');
        console.log('   4. Update routes/messages.js to use GETUTCDATE()');
        console.log();
        
        rl.close();
        process.exit(0);
        
    } catch (error) {
        console.error('\n❌ LỖI NGHIÊM TRỌNG:', error.message);
        console.error('\n   Kiểm tra backup tables nếu cần rollback:');
        console.error('   - Messages_Backup');
        console.error('   - Conversations_Backup');
        console.error('   - ConversationParticipants_Backup');
        rl.close();
        process.exit(1);
    }
}

runFix();
