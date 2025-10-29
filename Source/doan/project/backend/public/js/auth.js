// AuthService.js
class AuthService {
    constructor() {
        this.user = null;
        this.rolePages = this.getRolePages(); // ánh xạ quyền truy cập
        this.init();
    }

    // --------------------------
    // 🧩 Khởi tạo và kiểm tra session
    // --------------------------
    init() {
        const token = localStorage.getItem("token");
        const user = localStorage.getItem("currentUser");
        if (token && user) {
            try {
                this.user = JSON.parse(user);
                this.checkSession();
            } catch (error) {
                this.logout();
            }
        }
    }

    // --------------------------
    // 🧩 Đăng nhập
    // --------------------------
    async login(email, password) {
        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });

            const data = await response.json();

            if (data.success) {
                this.user = data.user;
                // Save unified keys for compatibility with other scripts
                localStorage.setItem('token', data.token);
                localStorage.setItem('user', JSON.stringify(data.user));
                localStorage.setItem('currentUser', JSON.stringify(data.user));
                localStorage.setItem('auth_token_user', JSON.stringify({ token: data.token, user: data.user }));

                // ✅ Điều hướng theo role (student -> EventList, admin/teacher -> dashboard)
                this.redirectByRole(data.user.role);
                return { success: true };
            } else {
                return { success: false, message: data.message };
            }
        } catch (error) {
            console.error('Login error:', error);
            return { success: false, message: 'Đăng nhập thất bại. Vui lòng thử lại.' };
        }
    }

    // --------------------------
    // 🧩 Đăng ký
    // --------------------------
    async register(userData) {
        try {
            const response = await fetch('/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(userData)
            });

            const data = await response.json();
            return data.success 
                ? { success: true } 
                : { success: false, message: data.message };
        } catch (error) {
            console.error('Register error:', error);
            return { success: false, message: 'Đăng ký thất bại. Vui lòng thử lại.' };
        }
    }

    // --------------------------
    // 🧩 Cập nhật hồ sơ người dùng
    // --------------------------
    async updateProfile(userData) {
        try {
            if (!this.user) return { success: false, message: 'Bạn chưa đăng nhập' };

            const response = await fetch('/api/auth/profile', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify(userData)
            });

            const data = await response.json();

            if (data.success) {
                this.user = { ...this.user, ...data.user };
                localStorage.setItem('currentUser', JSON.stringify(this.user));
                return { success: true };
            } else {
                return { success: false, message: data.message };
            }
        } catch (error) {
            console.error('Update profile error:', error);
            return { success: false, message: 'Cập nhật thông tin thất bại.' };
        }
    }

    // --------------------------
    // 🧩 Kiểm tra phiên
    // --------------------------
    async checkSession() {
        try {
            const response = await fetch('/api/auth/check-session', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (!response.ok) {
                this.logout();
                return false;
            }

            // ✅ Kiểm tra quyền truy cập trang hiện tại
            this.enforceAccess();
            return true;
        } catch (error) {
            console.error('Session check error:', error);
            this.logout();
            return false;
        }
    }

    // --------------------------
    // 🧩 Đăng xuất
    // --------------------------
    logout() {
        this.user = null;
        localStorage.removeItem('token');
        localStorage.removeItem('currentUser');
        window.location.href = '/views/Login.html';
    }

    // --------------------------
    // 🧩 Các tiện ích
    // --------------------------
    isAuthenticated() {
        return !!this.user && !!localStorage.getItem('token');
    }

    getUser() {
        return this.user;
    }

    getToken() {
        return localStorage.getItem('token');
    }

    // --------------------------
    // 🧩 Ánh xạ quyền truy cập trang
    // --------------------------
    getRolePages() {
        return {
            admin: [
                "AdminDashboard.html",
                "AttendanceManager.html",
                "EventForm.html",
                "QRAttendance.html",
                "QRAttendance_new.html",
                "UserProfile.html",
                "MessagingSystem.html",
                "EventList.html",
                "EventDetail.html",
                "ContactSupport.html"
            ],
            teacher: [
                "AttendanceManager.html",
                "EventForm.html",
                "QRAttendance.html",
                "QRAttendance_new.html",
                "UserProfile.html",
                "MessagingSystem.html",
                "EventList.html",
                "EventDetail.html",
                "ContactSupport.html"
            ],
            student: [
                "HomePage.html",
                "StudentQRLogin.html",
                "QRCheckInPage.html",
                "UserProfile.html",
                "MessagingSystem.html",
                "EventList.html",
                "EventDetail.html",
                "ContactSupport.html"
            ]
        };
    }

    // --------------------------
    // 🧩 Hàm kiểm tra và chặn truy cập trái phép
    // --------------------------
    enforceAccess() {
        if (!this.user) return;

        const currentPage = window.location.pathname.split("/").pop();
        const role = this.user.role ? this.user.role.toLowerCase() : "";

        const allowedPages = this.rolePages[role] || [];

        if (!allowedPages.includes(currentPage)) {
            console.warn(`⚠️ Truy cập trái phép: ${role} → ${currentPage}`);
            this.redirectByRole(role);
        }
    }

    // --------------------------
    // 🧩 Điều hướng theo vai trò
    // --------------------------
    redirectByRole(role) {
        switch ((role || '').toLowerCase()) {
            case "admin":
            case "teacher":
                // Use server route /dashboard which serves AdminDashboard.html
                window.location.href = "/dashboard";
                break;
            case "student":
                window.location.href = "/EventList.html";
                break;
            default:
                this.logout();
                break;
        }
    }
}

// Tạo một instance duy nhất
const authService = new AuthService();
export default authService;
