// attendance.js - Quản lý điểm danh
const AttendanceService = {
    attendanceRecords: [],

    // Khởi tạo service
    init() {
        const savedRecords = localStorage.getItem('attendanceRecords');
        if (savedRecords) {
            try {
                this.attendanceRecords = JSON.parse(savedRecords);
            } catch (error) {
                console.error('Lỗi khi đọc dữ liệu điểm danh:', error);
                localStorage.removeItem('attendanceRecords');
            }
        }
    },

    // Điểm danh cho người dùng
    async markAttendance(eventId, userId, status, notes = '') {
        try {
            // Giả lập độ trễ API
            await new Promise(resolve => setTimeout(resolve, 1000));

            // Lấy thông tin user
            const user = AuthService.findUserByEmail(userId) || { name: 'Unknown User' };

            const newRecord = {
                id: Date.now().toString(),
                eventId,
                userId,
                userName: user.name,
                studentId: user.studentId,
                status,
                timestamp: new Date().toISOString(),
                notes
            };

            this.attendanceRecords.push(newRecord);
            this._saveRecords();

            return {
                success: true,
                record: newRecord
            };
        } catch (error) {
            console.error('Lỗi điểm danh:', error);
            return {
                success: false,
                message: 'Có lỗi xảy ra khi điểm danh'
            };
        }
    },

    // Lấy danh sách điểm danh theo sự kiện
    getEventAttendance(eventId) {
        return this.attendanceRecords.filter(record => record.eventId === eventId);
    },

    // Lấy danh sách điểm danh theo người dùng
    getUserAttendance(userId) {
        return this.attendanceRecords.filter(record => record.userId === userId);
    },

    // Cập nhật trạng thái điểm danh
    async updateAttendance(recordId, status, notes = '') {
        try {
            await new Promise(resolve => setTimeout(resolve, 1000));

            const record = this.attendanceRecords.find(r => r.id === recordId);
            if (!record) {
                return {
                    success: false,
                    message: 'Không tìm thấy bản ghi điểm danh'
                };
            }

            record.status = status;
            record.notes = notes;
            record.updatedAt = new Date().toISOString();

            this._saveRecords();

            return {
                success: true,
                record
            };
        } catch (error) {
            console.error('Lỗi cập nhật điểm danh:', error);
            return {
                success: false,
                message: 'Có lỗi xảy ra khi cập nhật điểm danh'
            };
        }
    },

    // Xóa bản ghi điểm danh
    async deleteAttendance(recordId) {
        try {
            await new Promise(resolve => setTimeout(resolve, 1000));

            const index = this.attendanceRecords.findIndex(r => r.id === recordId);
            if (index === -1) {
                return {
                    success: false,
                    message: 'Không tìm thấy bản ghi điểm danh'
                };
            }

            this.attendanceRecords.splice(index, 1);
            this._saveRecords();

            return {
                success: true
            };
        } catch (error) {
            console.error('Lỗi xóa điểm danh:', error);
            return {
                success: false,
                message: 'Có lỗi xảy ra khi xóa điểm danh'
            };
        }
    },

    // Lưu dữ liệu vào localStorage
    _saveRecords() {
        localStorage.setItem('attendanceRecords', JSON.stringify(this.attendanceRecords));
    }
};

// Khởi tạo AttendanceService khi tải trang
document.addEventListener('DOMContentLoaded', () => {
    AttendanceService.init();
});