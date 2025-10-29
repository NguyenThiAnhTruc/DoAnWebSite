// events.js - Quản lý sự kiện
const EventService = {
    events: [],

    // Khởi tạo service
    init() {
        const savedEvents = localStorage.getItem('events');
        if (savedEvents) {
            try {
                this.events = JSON.parse(savedEvents);
            } catch (error) {
                console.error('Lỗi khi đọc danh sách sự kiện:', error);
                localStorage.removeItem('events');
            }
        }
    },

    // Lấy tất cả sự kiện
    getAllEvents() {
        return this.events;
    },

    // Lấy sự kiện theo id
    getEventById(id) {
        return this.events.find(event => event.id === id);
    },

    // Thêm sự kiện mới
    async createEvent(eventData) {
        try {
            // Giả lập độ trễ API
            await new Promise(resolve => setTimeout(resolve, 1000));

            const newEvent = {
                id: Date.now().toString(),
                ...eventData,
                createdAt: new Date().toISOString(),
                attendees: []
            };

            this.events.push(newEvent);
            this._saveEvents();

            return {
                success: true,
                event: newEvent
            };
        } catch (error) {
            console.error('Lỗi tạo sự kiện:', error);
            return {
                success: false,
                message: 'Có lỗi xảy ra khi tạo sự kiện'
            };
        }
    },

    // Cập nhật sự kiện
    async updateEvent(id, eventData) {
        try {
            await new Promise(resolve => setTimeout(resolve, 1000));

            const index = this.events.findIndex(e => e.id === id);
            if (index === -1) {
                return {
                    success: false,
                    message: 'Không tìm thấy sự kiện'
                };
            }

            const updatedEvent = {
                ...this.events[index],
                ...eventData,
                updatedAt: new Date().toISOString()
            };

            this.events[index] = updatedEvent;
            this._saveEvents();

            return {
                success: true,
                event: updatedEvent
            };
        } catch (error) {
            console.error('Lỗi cập nhật sự kiện:', error);
            return {
                success: false,
                message: 'Có lỗi xảy ra khi cập nhật sự kiện'
            };
        }
    },

    // Xóa sự kiện
    async deleteEvent(id) {
        try {
            await new Promise(resolve => setTimeout(resolve, 1000));

            const index = this.events.findIndex(e => e.id === id);
            if (index === -1) {
                return {
                    success: false,
                    message: 'Không tìm thấy sự kiện'
                };
            }

            this.events.splice(index, 1);
            this._saveEvents();

            return {
                success: true
            };
        } catch (error) {
            console.error('Lỗi xóa sự kiện:', error);
            return {
                success: false,
                message: 'Có lỗi xảy ra khi xóa sự kiện'
            };
        }
    },

    // Đăng ký tham gia sự kiện
    async registerForEvent(eventId, userId) {
        try {
            await new Promise(resolve => setTimeout(resolve, 1000));

            const event = this.getEventById(eventId);
            if (!event) {
                return {
                    success: false,
                    message: 'Không tìm thấy sự kiện'
                };
            }

            if (!event.attendees) {
                event.attendees = [];
            }

            if (event.attendees.includes(userId)) {
                return {
                    success: false,
                    message: 'Bạn đã đăng ký sự kiện này rồi'
                };
            }

            event.attendees.push(userId);
            this._saveEvents();

            return {
                success: true,
                event
            };
        } catch (error) {
            console.error('Lỗi đăng ký sự kiện:', error);
            return {
                success: false,
                message: 'Có lỗi xảy ra khi đăng ký sự kiện'
            };
        }
    },

    // Hủy đăng ký tham gia sự kiện
    async unregisterFromEvent(eventId, userId) {
        try {
            await new Promise(resolve => setTimeout(resolve, 1000));

            const event = this.getEventById(eventId);
            if (!event) {
                return {
                    success: false,
                    message: 'Không tìm thấy sự kiện'
                };
            }

            if (!event.attendees || !event.attendees.includes(userId)) {
                return {
                    success: false,
                    message: 'Bạn chưa đăng ký sự kiện này'
                };
            }

            event.attendees = event.attendees.filter(id => id !== userId);
            this._saveEvents();

            return {
                success: true,
                event
            };
        } catch (error) {
            console.error('Lỗi hủy đăng ký sự kiện:', error);
            return {
                success: false,
                message: 'Có lỗi xảy ra khi hủy đăng ký sự kiện'
            };
        }
    },

    // Lưu danh sách sự kiện vào localStorage
    _saveEvents() {
        localStorage.setItem('events', JSON.stringify(this.events));
    }
};

// Khởi tạo EventService khi tải trang
document.addEventListener('DOMContentLoaded', () => {
    EventService.init();
});