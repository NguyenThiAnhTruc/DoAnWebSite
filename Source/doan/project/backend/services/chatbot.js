// Chatbot service for auto-responding to student messages
const database = require('../config/database');

// FAQ database - Các câu hỏi thường gặp
const FAQ_DATABASE = [
    {
        keywords: ['đăng ký', 'dang ky', 'tham gia', 'registration', 'register'],
        category: 'registration',
        question: 'Làm thế nào để đăng ký sự kiện?',
        answer: `Để đăng ký sự kiện, bạn làm theo các bước sau:
1. Vào trang "Sự kiện"
2. Chọn sự kiện muốn tham gia
3. Nhấn nút "Đăng ký tham gia"
4. Điền thông tin và xác nhận

Bạn sẽ nhận được thông báo xác nhận qua email.`
    },
    {
        keywords: ['hủy', 'huy', 'cancel', 'huỷ đăng ký', 'huy dang ky'],
        category: 'cancellation',
        question: 'Có thể hủy đăng ký sự kiện không?',
        answer: `Có, bạn có thể hủy đăng ký sự kiện bằng cách:
1. Vào "Sự kiện của tôi"
2. Chọn sự kiện đã đăng ký
3. Nhấn "Hủy đăng ký"

Lưu ý: Chỉ có thể hủy trước 24h so với thời gian sự kiện bắt đầu.`
    },
    {
        keywords: ['điểm danh', 'diem danh', '出勤', 'attendance', 'check-in', 'checkin'],
        category: 'attendance',
        question: 'Làm sao nhận thông báo sự kiện mới?',
        answer: `Để điểm danh sự kiện:
1. Quét mã QR tại địa điểm sự kiện
2. Hoặc vào "Sự kiện của tôi" và nhấn "Điểm danh"
3. Xác nhận vị trí và thời gian

Bạn cần điểm danh trong khung thời gian quy định của sự kiện.`
    },
    {
        keywords: ['thông báo', 'thong bao', 'notification', 'nhận tin', 'nhan tin'],
        category: 'notification',
        question: 'Làm sao nhận thông báo sự kiện mới?',
        answer: `Hệ thống tự động gửi thông báo khi:
- Có sự kiện mới phù hợp
- Sự kiện sắp diễn ra (trước 24h)
- Có thay đổi về sự kiện đã đăng ký
- Nhắc nhở điểm danh

Kiểm tra thông báo tại biểu tượng chuông ở góc trên bên phải.`
    },
    {
        keywords: ['quên mật khẩu', 'quen mat khau', 'forgot password', 'reset password', 'đổi mật khẩu'],
        category: 'password',
        question: 'Quên mật khẩu khôi phục thế nào?',
        answer: `Để khôi phục mật khẩu:
1. Tại trang đăng nhập, nhấn "Quên mật khẩu?"
2. Nhập email đã đăng ký
3. Kiểm tra email để nhận link đặt lại mật khẩu
4. Tạo mật khẩu mới

Hoặc liên hệ hỗ trợ: support@schoolevents.edu`
    },
    {
        keywords: ['giờ làm việc', 'gio lam viec', 'thời gian', 'thoi gian', 'working hours', 'office hours'],
        category: 'hours',
        question: 'Giờ làm việc của bộ phận hỗ trợ?',
        answer: `Bộ phận hỗ trợ làm việc:
- Thứ 2 - Thứ 6: 8:00 - 17:00
- Thứ 7: 8:00 - 12:00
- Chủ nhật: Nghỉ

Hotline: (024) 1234-5678
Email: support@schoolevents.edu`
    },
    {
        keywords: ['địa chỉ', 'dia chi', 'address', 'location', 'văn phòng', 'van phong'],
        category: 'location',
        question: 'Địa chỉ văn phòng hỗ trợ?',
        answer: `Văn phòng hỗ trợ sinh viên:
📍 123 Đường ABC, Hà Nội
🏢 Tầng 2, Tòa nhà chính

Giờ tiếp nhận: Thứ 2 - Thứ 6, 8:00 - 17:00`
    },
    {
        keywords: ['email', 'mail', 'liên hệ', 'lien he', 'contact'],
        category: 'contact',
        question: 'Liên hệ hỗ trợ qua email?',
        answer: `Bạn có thể liên hệ qua:
📧 Email: support@schoolevents.edu
📞 Hotline: (024) 1234-5678

Chúng tôi phản hồi trong vòng 24h làm việc.`
    }
];

// Check if message matches any FAQ keywords
function findFAQMatch(message) {
    const normalizedMessage = message.toLowerCase().trim();
    
    // Find all matching FAQs
    const matches = FAQ_DATABASE.filter(faq => 
        faq.keywords.some(keyword => normalizedMessage.includes(keyword.toLowerCase()))
    );
    
    // Return the best match (first one for now)
    return matches.length > 0 ? matches[0] : null;
}

// Check if current time is outside working hours
function isOutsideWorkingHours() {
    const now = new Date();
    const day = now.getDay(); // 0 = Sunday, 6 = Saturday
    const hour = now.getHours();
    
    // Sunday
    if (day === 0) return true;
    
    // Saturday - only work until 12:00
    if (day === 6 && hour >= 12) return true;
    
    // Weekdays - work 8:00-17:00
    if (day >= 1 && day <= 5) {
        if (hour < 8 || hour >= 17) return true;
    }
    
    return false;
}

// Generate auto-response message
function generateAutoResponse(message, senderRole) {
    const faqMatch = findFAQMatch(message);
    
    if (faqMatch) {
        return {
            type: 'faq',
            content: `🤖 **Câu trả lời tự động:**\n\n${faqMatch.answer}\n\n_Nếu cần thêm hỗ trợ, giáo viên sẽ phản hồi sớm nhất có thể._`,
            category: faqMatch.category
        };
    }
    
    // If outside working hours
    if (isOutsideWorkingHours()) {
        return {
            type: 'out_of_hours',
            content: `🤖 **Hỗ trợ tự động:**\n\nCảm ơn bạn đã liên hệ! Hiện tại là ngoài giờ làm việc.\n\n⏰ **Giờ làm việc:**\n- Thứ 2-6: 8:00 - 17:00\n- Thứ 7: 8:00 - 12:00\n\nGiáo viên sẽ phản hồi tin nhắn của bạn trong giờ làm việc tiếp theo.\n\n📧 Email khẩn cấp: support@schoolevents.edu\n📞 Hotline: (024) 1234-5678`,
            category: 'out_of_hours'
        };
    }
    
    // Generic auto-response for students during working hours
    if (senderRole === 'student') {
        return {
            type: 'generic',
            content: `🤖 **Hỗ trợ tự động:**\n\nXin chào! Chúng tôi đã nhận được tin nhắn của bạn.\nGiáo viên sẽ phản hồi trong thời gian sớm nhất.\n\n💡 **Câu hỏi thường gặp:**\n- Đăng ký sự kiện\n- Hủy đăng ký\n- Điểm danh\n- Quên mật khẩu\n\nBạn có thể hỏi chatbot về các chủ đề trên!`,
            category: 'generic'
        };
    }
    
    return null;
}

// Get suggested replies for teachers
function getSuggestedReplies(message) {
    const normalizedMessage = message.toLowerCase().trim();
    const suggestions = [];
    
    // Registration related
    if (normalizedMessage.includes('đăng ký') || normalizedMessage.includes('dang ky')) {
        suggestions.push({
            text: 'Hướng dẫn đăng ký',
            content: 'Để đăng ký sự kiện, bạn vào mục "Sự kiện", chọn sự kiện muốn tham gia và nhấn "Đăng ký tham gia". Sau đó điền thông tin và xác nhận là hoàn tất!'
        });
        suggestions.push({
            text: 'Xác nhận đã nhận',
            content: 'Cảm ơn em đã liên hệ! Thầy/Cô đã xem yêu cầu đăng ký của em và sẽ hỗ trợ ngay.'
        });
    }
    
    // Cancellation related
    if (normalizedMessage.includes('hủy') || normalizedMessage.includes('huy')) {
        suggestions.push({
            text: 'Xác nhận hủy',
            content: 'Được em, thầy/cô đã hủy đăng ký sự kiện cho em. Em nhớ đăng ký lại nếu có thể tham gia nhé!'
        });
        suggestions.push({
            text: 'Điều kiện hủy',
            content: 'Em chỉ có thể hủy đăng ký trước 24h so với thời gian sự kiện bắt đầu. Nếu quá thời gian này, em cần liên hệ trực tiếp với ban tổ chức nhé.'
        });
    }
    
    // Attendance related
    if (normalizedMessage.includes('điểm danh') || normalizedMessage.includes('diem danh')) {
        suggestions.push({
            text: 'Hướng dẫn điểm danh',
            content: 'Để điểm danh, em quét mã QR tại địa điểm sự kiện hoặc vào "Sự kiện của tôi" và chọn "Điểm danh". Nhớ điểm danh đúng giờ quy định nhé!'
        });
        suggestions.push({
            text: 'Giải quyết vấn đề',
            content: 'Nếu em gặp vấn đề với điểm danh, em gửi thông tin sự kiện và thời gian em tham gia cho thầy/cô. Thầy/Cô sẽ kiểm tra và hỗ trợ em.'
        });
    }
    
    // Generic helpful responses
    suggestions.push({
        text: 'Cảm ơn',
        content: 'Cảm ơn em đã liên hệ! Nếu còn thắc mắc gì khác, em cứ nhắn tin cho thầy/cô nhé.'
    });
    
    suggestions.push({
        text: 'Đang xử lý',
        content: 'Thầy/Cô đang kiểm tra thông tin và sẽ phản hồi em sớm nhất có thể. Em vui lòng đợi trong giây lát!'
    });
    
    return suggestions;
}

// Main chatbot function - process incoming message and generate response
async function processMessage(conversationId, senderId, message, senderRole) {
    try {
        // Check if auto-response should be sent
        const autoResponse = generateAutoResponse(message, senderRole);
        
        if (autoResponse) {
            // Save chatbot response to database
            const query = `
                INSERT INTO Messages (conversation_id, sender_id, content, sent_at, is_deleted)
                VALUES (@conversationId, @senderId, @content, GETDATE(), 0);
                
                -- Update conversation
                UPDATE Conversations
                SET updated_at = GETDATE()
                WHERE conversation_id = @conversationId;
            `;
            
            // Use a system user ID (0) for chatbot
            await database.query(query, {
                conversationId,
                senderId: 0, // Chatbot ID
                content: autoResponse.content
            });
            
            return {
                sent: true,
                type: autoResponse.type,
                category: autoResponse.category
            };
        }
        
        return {
            sent: false
        };
    } catch (error) {
        console.error('Chatbot error:', error);
        return {
            sent: false,
            error: error.message
        };
    }
}

// Get FAQ suggestions for a message
function getFAQSuggestions(message) {
    const normalizedMessage = message.toLowerCase().trim();
    
    // Find relevant FAQs
    const suggestions = FAQ_DATABASE.filter(faq => 
        faq.keywords.some(keyword => normalizedMessage.includes(keyword.toLowerCase()))
    ).slice(0, 3); // Return top 3 matches
    
    return suggestions.map(faq => ({
        question: faq.question,
        answer: faq.answer,
        category: faq.category
    }));
}

module.exports = {
    processMessage,
    generateAutoResponse,
    getSuggestedReplies,
    getFAQSuggestions,
    isOutsideWorkingHours,
    FAQ_DATABASE
};
