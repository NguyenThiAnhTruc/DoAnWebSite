/**
 * Notification Scheduler Service
 * Tự động gửi thông báo cho:
 * - Sự kiện sắp diễn ra (24h trước)
 * - Sự kiện đã kết thúc
 */

const database = require('../config/database');

class NotificationScheduler {
  constructor() {
    this.reminderInterval = null;
    this.completionInterval = null;
  }

  /**
   * Khởi động scheduler
   */
  start() {
    console.log('🔔 Starting Notification Scheduler...');
    
    // Chạy ngay lần đầu
    this.sendEventReminders();
    this.checkCompletedEvents();
    
    // Chạy mỗi 1 giờ để kiểm tra event reminders (24h trước)
    this.reminderInterval = setInterval(() => {
      this.sendEventReminders();
    }, 60 * 60 * 1000); // 1 hour
    
    // Chạy mỗi 30 phút để kiểm tra completed events
    this.completionInterval = setInterval(() => {
      this.checkCompletedEvents();
    }, 30 * 60 * 1000); // 30 minutes
    
    console.log('✅ Notification Scheduler started');
  }

  /**
   * Dừng scheduler
   */
  stop() {
    if (this.reminderInterval) {
      clearInterval(this.reminderInterval);
      this.reminderInterval = null;
    }
    if (this.completionInterval) {
      clearInterval(this.completionInterval);
      this.completionInterval = null;
    }
    console.log('🛑 Notification Scheduler stopped');
  }

  /**
   * Gửi thông báo nhắc nhở sự kiện sắp diễn ra (24h trước)
   */
  async sendEventReminders() {
    try {
      console.log('📅 Checking for upcoming events to send reminders...');
      
      // Tìm các sự kiện sẽ diễn ra trong 24-25 giờ tới (để tránh gửi nhiều lần)
      const query = `
        SELECT 
          e.event_id,
          e.title,
          e.start_date,
          e.start_time,
          e.location,
          r.user_id
        FROM Events e
        INNER JOIN EventRegistrations r ON e.event_id = r.event_id
        WHERE 
          e.status IN ('published', 'upcoming')
          AND r.status = 'registered'
          AND e.start_date IS NOT NULL
          -- Sự kiện diễn ra trong 24-25 giờ tới
          AND DATEDIFF(HOUR, GETDATE(), e.start_date) BETWEEN 23 AND 25
          -- Chưa gửi reminder cho user này
          AND NOT EXISTS (
            SELECT 1 FROM Notifications n 
            WHERE n.user_id = r.user_id 
            AND n.related_event_id = e.event_id 
            AND n.type = 'event_reminder'
            AND DATEDIFF(DAY, n.created_at, GETDATE()) = 0
          )
      `;
      
      const result = await database.query(query);
      const rows = result.recordset || result || [];
      
      console.log(`Found ${rows.length} users to send event reminders`);
      
      for (const row of rows) {
        try {
          const eventDate = new Date(row.start_date);
          const dateStr = eventDate.toLocaleDateString('vi-VN');
          const timeStr = row.start_time || '';
          
          const title = `Nhắc nhở: Sự kiện sắp diễn ra`;
          const message = `Sự kiện "${row.title}" sẽ diễn ra vào ${dateStr} ${timeStr} tại ${row.location || 'địa điểm sẽ thông báo'}. Đừng quên tham gia nhé!`;
          
          const insertQuery = `
            INSERT INTO Notifications (user_id, title, message, type, related_event_id, is_read, created_at)
            VALUES (@userId, @title, @message, 'event_reminder', @eventId, 0, GETDATE())
          `;
          
          await database.query(insertQuery, {
            userId: row.user_id,
            title: title,
            message: message,
            eventId: row.event_id
          });
          
          console.log(`✅ Sent reminder for event ${row.event_id} to user ${row.user_id}`);
        } catch (err) {
          console.error(`❌ Failed to send reminder for event ${row.event_id} to user ${row.user_id}:`, err.message);
        }
      }
      
      if (rows.length > 0) {
        console.log(`✅ Sent ${rows.length} event reminders`);
      }
    } catch (err) {
      console.error('❌ Error in sendEventReminders:', err);
    }
  }

  /**
   * Kiểm tra và gửi thông báo cho sự kiện đã kết thúc
   */
  async checkCompletedEvents() {
    try {
      console.log('🏁 Checking for completed events...');
      
      // Tìm các sự kiện vừa kết thúc (trong vòng 1 giờ qua)
      const query = `
        SELECT 
          e.event_id,
          e.title,
          e.end_date,
          r.user_id
        FROM Events e
        INNER JOIN EventRegistrations r ON e.event_id = r.event_id
        WHERE 
          e.status IN ('published', 'upcoming', 'ongoing')
          AND r.status = 'registered'
          AND e.end_date IS NOT NULL
          -- Sự kiện đã kết thúc trong 1 giờ qua
          AND e.end_date < GETDATE()
          AND DATEDIFF(HOUR, e.end_date, GETDATE()) <= 1
          -- Chưa gửi thông báo completion
          AND NOT EXISTS (
            SELECT 1 FROM Notifications n 
            WHERE n.user_id = r.user_id 
            AND n.related_event_id = e.event_id 
            AND n.type = 'event_completed'
          )
      `;
      
      const result = await database.query(query);
      const rows = result.recordset || result || [];
      
      console.log(`Found ${rows.length} users to notify about completed events`);
      
      for (const row of rows) {
        try {
          const title = `Sự kiện đã kết thúc`;
          const message = `Sự kiện "${row.title}" đã kết thúc. Cảm ơn bạn đã tham gia! Đừng quên đánh giá và chia sẻ trải nghiệm của bạn.`;
          
          const insertQuery = `
            INSERT INTO Notifications (user_id, title, message, type, related_event_id, is_read, created_at)
            VALUES (@userId, @title, @message, 'event_completed', @eventId, 0, GETDATE())
          `;
          
          await database.query(insertQuery, {
            userId: row.user_id,
            title: title,
            message: message,
            eventId: row.event_id
          });
          
          console.log(`✅ Sent completion notification for event ${row.event_id} to user ${row.user_id}`);
        } catch (err) {
          console.error(`❌ Failed to send completion notification for event ${row.event_id} to user ${row.user_id}:`, err.message);
        }
      }
      
      // Cập nhật trạng thái sự kiện sang 'completed'
      if (rows.length > 0) {
        try {
          const updateQuery = `
            UPDATE Events 
            SET status = 'completed' 
            WHERE event_id IN (
              SELECT DISTINCT event_id FROM (
                SELECT e.event_id
                FROM Events e
                WHERE e.status IN ('published', 'upcoming', 'ongoing')
                AND e.end_date < GETDATE()
              ) AS CompletedEvents
            )
          `;
          await database.query(updateQuery);
          console.log(`✅ Updated event status to 'completed'`);
        } catch (err) {
          console.error('❌ Failed to update event status:', err.message);
        }
        
        console.log(`✅ Sent ${rows.length} completion notifications`);
      }
    } catch (err) {
      console.error('❌ Error in checkCompletedEvents:', err);
    }
  }

  /**
   * Gửi thông báo khi sự kiện bị hủy
   */
  async notifyEventCancellation(eventId, reason = '') {
    try {
      console.log(`📢 Notifying users about event ${eventId} cancellation...`);
      
      // Lấy thông tin sự kiện và danh sách users đã đăng ký
      const query = `
        SELECT 
          e.title,
          r.user_id
        FROM Events e
        INNER JOIN EventRegistrations r ON e.event_id = r.event_id
        WHERE e.event_id = @eventId AND r.status = 'registered'
      `;
      
      const result = await database.query(query, { eventId: parseInt(eventId) });
      const rows = result.recordset || result || [];
      
      const reasonText = reason ? ` Lý do: ${reason}` : '';
      
      for (const row of rows) {
        try {
          const title = `Sự kiện bị hủy`;
          const message = `Sự kiện "${row.title}" đã bị hủy.${reasonText} Chúng tôi rất xin lỗi vì sự bất tiện này.`;
          
          const insertQuery = `
            INSERT INTO Notifications (user_id, title, message, type, related_event_id, is_read, created_at)
            VALUES (@userId, @title, @message, 'event_cancelled', @eventId, 0, GETDATE())
          `;
          
          await database.query(insertQuery, {
            userId: row.user_id,
            title: title,
            message: message,
            eventId: parseInt(eventId)
          });
          
          console.log(`✅ Sent cancellation notification to user ${row.user_id}`);
        } catch (err) {
          console.error(`❌ Failed to send cancellation notification to user ${row.user_id}:`, err.message);
        }
      }
      
      console.log(`✅ Sent ${rows.length} cancellation notifications`);
    } catch (err) {
      console.error('❌ Error in notifyEventCancellation:', err);
    }
  }
}

// Export singleton instance
const scheduler = new NotificationScheduler();
module.exports = scheduler;
