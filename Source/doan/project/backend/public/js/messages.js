// messages.js - Hệ thống tin nhắn
const MessageService = {
    messages: [],
    conversations: [],

    // Khởi tạo service
    init() {
        const savedMessages = localStorage.getItem('messages');
        const savedConversations = localStorage.getItem('conversations');

        if (savedMessages) {
            try {
                this.messages = JSON.parse(savedMessages);
            } catch (error) {
                console.error('Lỗi khi đọc tin nhắn:', error);
                localStorage.removeItem('messages');
            }
        }

        if (savedConversations) {
            try {
                this.conversations = JSON.parse(savedConversations);
            } catch (error) {
                console.error('Lỗi khi đọc cuộc trò chuyện:', error);
                localStorage.removeItem('conversations');
            }
        }
    },

    // Tạo cuộc trò chuyện mới
    async createConversation(participants, title = '') {
        try {
            const conversation = {
                id: Date.now().toString(),
                title: title || `Cuộc trò chuyện ${this.conversations.length + 1}`,
                participants,
                createdAt: new Date().toISOString(),
                lastMessage: null
            };

            this.conversations.push(conversation);
            this._saveConversations();

            return {
                success: true,
                conversation
            };
        } catch (error) {
            console.error('Lỗi tạo cuộc trò chuyện:', error);
            return {
                success: false,
                message: 'Có lỗi xảy ra khi tạo cuộc trò chuyện'
            };
        }
    },

    // Gửi tin nhắn
    async sendMessage(conversationId, senderId, content) {
        try {
            const message = {
                id: Date.now().toString(),
                conversationId,
                senderId,
                content,
                timestamp: new Date().toISOString(),
                isRead: false
            };

            this.messages.push(message);
            this._saveMessages();

            // Cập nhật tin nhắn cuối cùng của cuộc trò chuyện
            const conversation = this.conversations.find(c => c.id === conversationId);
            if (conversation) {
                conversation.lastMessage = message;
                this._saveConversations();
            }

            return {
                success: true,
                message
            };
        } catch (error) {
            console.error('Lỗi gửi tin nhắn:', error);
            return {
                success: false,
                message: 'Có lỗi xảy ra khi gửi tin nhắn'
            };
        }
    },

    // Lấy tin nhắn của cuộc trò chuyện
    getConversationMessages(conversationId) {
        return this.messages
            .filter(m => m.conversationId === conversationId)
            .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    },

    // Lấy danh sách cuộc trò chuyện của người dùng
    getUserConversations(userId) {
        return this.conversations
            .filter(c => c.participants.includes(userId))
            .sort((a, b) => {
                const aTime = a.lastMessage?.timestamp || a.createdAt;
                const bTime = b.lastMessage?.timestamp || b.createdAt;
                return new Date(bTime) - new Date(aTime);
            });
    },

    // Đánh dấu tin nhắn đã đọc
    async markMessagesAsRead(conversationId, userId) {
        try {
            const messages = this.messages.filter(
                m => m.conversationId === conversationId && !m.isRead
            );

            messages.forEach(message => {
                message.isRead = true;
                message.readAt = new Date().toISOString();
            });

            this._saveMessages();

            return {
                success: true
            };
        } catch (error) {
            console.error('Lỗi cập nhật tin nhắn:', error);
            return {
                success: false,
                message: 'Có lỗi xảy ra khi cập nhật tin nhắn'
            };
        }
    },

    // Lấy số tin nhắn chưa đọc
    getUnreadCount(userId) {
        return this.messages.filter(
            m => !m.isRead && m.senderId !== userId
        ).length;
    },

    // Xóa tin nhắn
    async deleteMessage(messageId) {
        try {
            const index = this.messages.findIndex(m => m.id === messageId);
            if (index !== -1) {
                this.messages.splice(index, 1);
                this._saveMessages();
            }

            return {
                success: true
            };
        } catch (error) {
            console.error('Lỗi xóa tin nhắn:', error);
            return {
                success: false,
                message: 'Có lỗi xảy ra khi xóa tin nhắn'
            };
        }
    },

    // Xóa cuộc trò chuyện
    async deleteConversation(conversationId) {
        try {
            // Xóa tất cả tin nhắn trong cuộc trò chuyện
            this.messages = this.messages.filter(m => m.conversationId !== conversationId);
            this._saveMessages();

            // Xóa cuộc trò chuyện
            const index = this.conversations.findIndex(c => c.id === conversationId);
            if (index !== -1) {
                this.conversations.splice(index, 1);
                this._saveConversations();
            }

            return {
                success: true
            };
        } catch (error) {
            console.error('Lỗi xóa cuộc trò chuyện:', error);
            return {
                success: false,
                message: 'Có lỗi xảy ra khi xóa cuộc trò chuyện'
            };
        }
    },

    // Lưu tin nhắn vào localStorage
    _saveMessages() {
        localStorage.setItem('messages', JSON.stringify(this.messages));
    },

    // Lưu cuộc trò chuyện vào localStorage
    _saveConversations() {
        localStorage.setItem('conversations', JSON.stringify(this.conversations));
    }
};

// Khởi tạo MessageService khi tải trang
document.addEventListener('DOMContentLoaded', () => {
    MessageService.init();
});