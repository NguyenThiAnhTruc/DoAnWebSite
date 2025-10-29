// theme.js - Quản lý giao diện toàn cục
const ThemeService = {
    // Lấy theme hiện tại từ localStorage hoặc database
    getCurrentTheme() {
        // Ưu tiên lấy từ localStorage
        const saved = localStorage.getItem('app_theme');
        if (saved) return saved; // 'light' or 'dark'
        
        // Hoặc lấy từ user settings nếu đã đăng nhập
        try {
            const user = JSON.parse(localStorage.getItem('user') || '{}');
            if (user.theme) return user.theme;
        } catch (e) {
            console.error('Error reading user theme:', e);
        }
        
        // Mặc định là light
        return 'light';
    },

    // Áp dụng theme
    applyTheme(theme) {
        const htmlEl = document.documentElement;
        
        if (theme === 'dark') {
            htmlEl.classList.add('dark');
        } else {
            htmlEl.classList.remove('dark');
        }
        
        // Lưu vào localStorage
        localStorage.setItem('app_theme', theme);
        
        // Nếu user đã đăng nhập, cập nhật vào user object
        try {
            const user = JSON.parse(localStorage.getItem('user') || '{}');
            if (user.user_id) {
                user.theme = theme;
                localStorage.setItem('user', JSON.stringify(user));
                localStorage.setItem('currentUser', JSON.stringify(user));
            }
        } catch (e) {
            console.error('Error updating user theme:', e);
        }
        
        console.log('Theme applied:', theme);
    },

    // Toggle giữa light và dark
    toggleTheme() {
        const current = this.getCurrentTheme();
        const newTheme = current === 'light' ? 'dark' : 'light';
        this.applyTheme(newTheme);
        return newTheme;
    },

    // Đồng bộ theme với server (nếu user đã đăng nhập)
    async syncWithServer(theme) {
        try {
            const user = JSON.parse(localStorage.getItem('user') || '{}');
            if (!user.user_id) {
                console.log('No user logged in, skip server sync');
                return;
            }

            const response = await fetch(`/api/users/${user.user_id}/preferences`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    theme: theme,
                    language: user.language || 'vi'
                })
            });

            const data = await response.json();
            if (data.success) {
                console.log('Theme synced with server');
            } else {
                console.warn('Failed to sync theme with server');
            }
        } catch (err) {
            console.error('Error syncing theme with server:', err);
        }
    },

    // Khởi tạo khi load trang
    init() {
        const theme = this.getCurrentTheme();
        this.applyTheme(theme);
        console.log('ThemeService initialized with theme:', theme);
    },

    // Reset về default khi logout
    resetToDefault() {
        localStorage.removeItem('app_theme');
        this.applyTheme('light');
        console.log('Theme reset to default (light)');
    }
};

// Tự động khởi tạo khi load trang
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => ThemeService.init());
} else {
    ThemeService.init();
}

// Export để dùng trong các file khác
if (typeof window !== 'undefined') {
    window.ThemeService = ThemeService;
}
