// AuthService.js
// Single-file client-side auth and role-based redirect service.
// Usage: include this script in your HTML (before other page scripts) and call
// AuthService.init(); or AuthService.requireRole(['admin','teacher']); on page load.

(function (global) {
    'use strict';

    const STORAGE_KEY = 'auth_token_user';

    // Role -> default landing page after login
    const ROLE_HOME = {
        admin: '/Dashboard.html',
        teacher: '/Dashboard.html',
        student: '/EventList.html'
    };

    // When access denied, where to redirect per role or anonymous
    const ACCESS_DENIED_REDIRECT = {
        admin: '/Dashboard.html',
        teacher: '/Dashboard.html',
        student: '/Login.html',
        anonymous: '/Login.html'
    };

    // Helper: save token + user object to localStorage
    function saveAuth(token, user) {
        if (!token || !user) return;
        const payload = { token, user };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
        
        // ✅ Đồng bộ ngôn ngữ từ database vào LanguageService
        if (user.language) {
            localStorage.setItem('language', user.language);
            console.log(`🌍 AuthService: Set language to '${user.language}' from user profile`);
            
            // Nếu LanguageService đã load, cập nhật ngay
            if (window.LanguageService && window.LanguageService.initialized) {
                window.LanguageService.changeLanguage(user.language);
            }
        }
        
        // ✅ Đồng bộ theme từ database
        if (user.theme) {
            localStorage.setItem('theme', user.theme);
            console.log(`🎨 AuthService: Set theme to '${user.theme}' from user profile`);
        }
    }

    // Helper: load auth from storage
    function loadAuth() {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return null;
        try {
            return JSON.parse(raw);
        } catch (e) {
            console.warn('AuthService: failed to parse stored auth', e);
            localStorage.removeItem(STORAGE_KEY);
            return null;
        }
    }

    function clearAuth() {
        localStorage.removeItem(STORAGE_KEY);
    }

    // Public login function: calls backend /api/auth/login and saves token+user
    async function login(email, password) {
        const res = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        const data = await res.json();
        if (!data.success) {
            throw new Error(data.message || 'Login failed');
        }

        const { token, user } = data;
        saveAuth(token, user);
        return { token, user };
    }

    // Logout helper
    function logout(redirectTo) {
        clearAuth();
        if (redirectTo) {
            window.location.href = redirectTo;
        } else {
            window.location.href = '/Login.html';
        }
    }

    // Get current user or null
    function currentUser() {
        const auth = loadAuth();
        return auth?.user || null;
    }

    function currentToken() {
        const auth = loadAuth();
        return auth?.token || null;
    }

    // Redirect helper based on role
    function redirectToRoleHome(role) {
        const page = ROLE_HOME[role] || '/Login.html';
        window.location.href = page;
    }

    // Main guard: call on page load to enforce allowedRoles for this page.
    // allowedRoles: array of strings (e.g., ['admin','teacher']) OR null to allow authenticated users only.
    // If allowedRoles is omitted, function simply returns the current user.
    function requireRole(allowedRoles) {
        const user = currentUser();

        if (!user) {
            // Not authenticated -> anonymous behavior
            const target = ACCESS_DENIED_REDIRECT.anonymous || '/Login.html';
            window.location.replace(target);
            return null;
        }

        // If no specific allowedRoles provided, allow any authenticated user
        if (!allowedRoles) return user;

        if (!Array.isArray(allowedRoles)) {
            console.warn('AuthService.requireRole expects an array or null');
            return user;
        }

        // Normalize role
        const role = (user.role || '').toLowerCase();
        const allowed = allowedRoles.map(r => String(r).toLowerCase());

        if (allowed.includes(role)) {
            return user;
        }

        // Access denied: redirect per table
        const redirect = ACCESS_DENIED_REDIRECT[role] || ACCESS_DENIED_REDIRECT.anonymous || '/Login.html';
        // Use replace so user cannot go back to restricted page
        window.location.replace(redirect);
        return null;
    }

    // Init routine: if on login page and already authenticated, redirect to role home.
    function init() {
        try {
            const user = currentUser();
            const path = window.location.pathname || '/';

            // Normalize a few known paths to match server's HTML file mapping
            const filename = path.split('/').pop();

            if (filename === '' || filename === 'HomePage.html' || filename === 'index.html') {
                // leave home alone
                return;
            }

            // If on login page and already logged in -> go to role home
            if ((filename === 'Login.html' || filename.toLowerCase() === 'login') && user) {
                redirectToRoleHome(user.role?.toLowerCase());
            }
        } catch (e) {
            console.error('AuthService.init error', e);
        }
    }

    // Helper to attach Authorization header when calling protected APIs
    async function authFetch(input, init = {}) {
        const token = currentToken();
        const headers = new Headers(init.headers || {});
        if (token) headers.set('Authorization', 'Bearer ' + token);
        return fetch(input, Object.assign({}, init, { headers }));
    }

    // Export API
    const AuthService = {
        init,
        login,
        logout,
        currentUser,
        currentToken,
        requireRole,
        authFetch
    };

    global.AuthService = AuthService;

})(window);
