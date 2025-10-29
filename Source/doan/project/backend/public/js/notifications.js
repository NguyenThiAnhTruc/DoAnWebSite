// notifications.js - Hệ thống quản lý thông báo với đa ngôn ngữ
const NotificationService = {
    notifications: [],
    currentUserId: null,
    pollingInterval: null,
    lastFetchTime: null,

    // Khởi tạo service
    async init(userId = null) {
        this.currentUserId = userId;
        
        if (userId) {
            // Load từ server
            await this.fetchNotifications();
            
            // Bắt đầu polling mỗi 30 giây
            this.startPolling();
        } else {
            // Load từ localStorage (offline mode)
            const savedNotifications = localStorage.getItem('notifications');
            if (savedNotifications) {
                try {
                    this.notifications = JSON.parse(savedNotifications);
                } catch (error) {
                    console.error('Lỗi khi đọc thông báo:', error);
                    localStorage.removeItem('notifications');
                }
            }
        }
        
        // Listen to language changes
        document.addEventListener('language-changed', (e) => {
            this._updateNotificationTranslations(e.detail.language);
        });
    },

    // Fetch notifications từ server
    async fetchNotifications(limit = 50, unreadOnly = false) {
        if (!this.currentUserId) {
            console.warn('No user ID set for NotificationService');
            return;
        }

        try {
            const params = new URLSearchParams({
                userId: this.currentUserId,
                limit: limit,
                unreadOnly: unreadOnly
            });

            const response = await fetch(`/api/notifications?${params}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const data = await response.json();
            
            if (data.success) {
                this.notifications = data.notifications;
                this.lastFetchTime = new Date();
                this._saveNotificationsToCache();
                
                // Dispatch event để update UI
                this._dispatchUpdateEvent();
            }

        } catch (error) {
            console.error('Lỗi fetch notifications:', error);
            // Fallback to cache
            this._loadNotificationsFromCache();
        }
    },

    // Lấy số lượng thông báo chưa đọc
    async getUnreadCount() {
        if (!this.currentUserId) return 0;

        try {
            const response = await fetch(`/api/notifications/unread-count?userId=${this.currentUserId}`);
            const data = await response.json();
            
            if (data.success) {
                // API trả về 'count' không phải 'unreadCount'
                return data.count || data.unreadCount || 0;
            }
            
            return this.notifications.filter(n => !n.isRead && !n.read_at).length;
        } catch (error) {
            console.error('Lỗi get unread count:', error);
            return this.notifications.filter(n => !n.isRead && !n.read_at).length;
        }
    },

    // Tạo thông báo mới
    async createNotification(title, message, type = 'info', eventId = null) {
        try {
            if (!this.currentUserId) {
                // Offline mode - save to localStorage
                const notification = {
                    id: Date.now().toString(),
                    title,
                    message,
                    type,
                    eventId,
                    userId: null,
                    isRead: false,
                    createdAt: new Date().toISOString()
                };

                this.notifications.unshift(notification);
                this._saveNotificationsToCache();
                this._showToast(notification);
                this._dispatchUpdateEvent();

                return { success: true, notification };
            }

            // Online mode - save to server
            const response = await fetch('/api/notifications', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    userId: this.currentUserId,
                    eventId: eventId,
                    type: this._mapTypeToNotificationType(type),
                    title: title,
                    message: message,
                    deliveryMethod: 'in_app'
                })
            });

            const data = await response.json();

            if (data.success) {
                // Refresh notifications
                await this.fetchNotifications();
                
                // Show toast for the new notification
                const newNotif = this.notifications[0];
                if (newNotif) {
                    this._showToast(newNotif);
                }
            }

            return data;

        } catch (error) {
            console.error('Lỗi tạo thông báo:', error);
            return {
                success: false,
                message: 'Có lỗi xảy ra khi tạo thông báo'
            };
        }
    },

    // Lấy thông báo của người dùng
    getUserNotifications() {
        return this.notifications;
    },

    // Lấy thông báo từ server cho dropdown
    async getNotifications(userId, limit = 10) {
        if (!userId) return [];

        try {
            const response = await fetch(`/api/notifications?userId=${userId}&limit=${limit}&unreadOnly=false`);
            const data = await response.json();
            
            if (data.success) {
                return data.notifications || [];
            }
            
            return [];
        } catch (error) {
            console.error('Lỗi lấy notifications:', error);
            return [];
        }
    },

    // Đánh dấu thông báo đã đọc
    async markAsRead(notificationId) {
        try {
            if (!this.currentUserId) {
                // Offline mode
                const notification = this.notifications.find(n => n.id === notificationId);
                if (notification) {
                    notification.isRead = true;
                    notification.readAt = new Date().toISOString();
                    this._saveNotificationsToCache();
                    this._dispatchUpdateEvent();
                }
                return { success: true };
            }

            // Online mode
            const response = await fetch(`/api/notifications/${notificationId}/read`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            const data = await response.json();

            if (data.success) {
                // Update local cache
                const notification = this.notifications.find(n => n.id == notificationId);
                if (notification) {
                    notification.isRead = true;
                    notification.readAt = new Date().toISOString();
                    this._dispatchUpdateEvent();
                }
            }

            return data;

        } catch (error) {
            console.error('Lỗi cập nhật thông báo:', error);
            return {
                success: false,
                message: 'Có lỗi xảy ra khi cập nhật thông báo'
            };
        }
    },

    // Đánh dấu tất cả thông báo đã đọc
    async markAllAsRead() {
        try {
            if (!this.currentUserId) {
                // Offline mode
                this.notifications.forEach(notification => {
                    notification.isRead = true;
                    notification.readAt = new Date().toISOString();
                });
                this._saveNotificationsToCache();
                this._dispatchUpdateEvent();
                return { success: true };
            }

            // Online mode
            const response = await fetch('/api/notifications/mark-all-read', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    userId: this.currentUserId
                })
            });

            const data = await response.json();

            if (data.success) {
                // Update local cache
                this.notifications.forEach(notification => {
                    notification.isRead = true;
                    notification.readAt = new Date().toISOString();
                });
                this._dispatchUpdateEvent();
            }

            return data;

        } catch (error) {
            console.error('Lỗi cập nhật thông báo:', error);
            return {
                success: false,
                message: 'Có lỗi xảy ra khi cập nhật thông báo'
            };
        }
    },

    // Xóa thông báo
    async deleteNotification(notificationId) {
        try {
            if (!this.currentUserId) {
                // Offline mode
                const index = this.notifications.findIndex(n => n.id === notificationId);
                if (index !== -1) {
                    this.notifications.splice(index, 1);
                    this._saveNotificationsToCache();
                    this._dispatchUpdateEvent();
                }
                return { success: true };
            }

            // Online mode
            const response = await fetch(`/api/notifications/${notificationId}`, {
                method: 'DELETE'
            });

            const data = await response.json();

            if (data.success) {
                // Remove from local cache
                const index = this.notifications.findIndex(n => n.id == notificationId);
                if (index !== -1) {
                    this.notifications.splice(index, 1);
                    this._dispatchUpdateEvent();
                }
            }

            return data;

        } catch (error) {
            console.error('Lỗi xóa thông báo:', error);
            return {
                success: false,
                message: 'Có lỗi xảy ra khi xóa thông báo'
            };
        }
    },

    // Xóa tất cả thông báo đã đọc
    async clearAllRead() {
        try {
            if (!this.currentUserId) {
                // Offline mode
                this.notifications = this.notifications.filter(n => !n.isRead);
                this._saveNotificationsToCache();
                this._dispatchUpdateEvent();
                return { success: true };
            }

            // Online mode
            const response = await fetch(`/api/notifications/clear-all?userId=${this.currentUserId}`, {
                method: 'DELETE'
            });

            const data = await response.json();

            if (data.success) {
                // Remove read notifications from cache
                this.notifications = this.notifications.filter(n => !n.isRead);
                this._dispatchUpdateEvent();
            }

            return data;

        } catch (error) {
            console.error('Lỗi xóa thông báo:', error);
            return {
                success: false,
                message: 'Có lỗi xảy ra khi xóa thông báo'
            };
        }
    },

    // Start polling for new notifications
    startPolling(intervalMs = 30000) {
        if (this.pollingInterval) {
            clearInterval(this.pollingInterval);
        }

        this.pollingInterval = setInterval(async () => {
            await this.fetchNotifications();
        }, intervalMs);
    },

    // Stop polling
    stopPolling() {
        if (this.pollingInterval) {
            clearInterval(this.pollingInterval);
            this.pollingInterval = null;
        }
    },

    // Map UI type to database notification_type
    _mapTypeToNotificationType(type) {
        const typeMap = {
            'success': 'registration_confirmed',
            'warning': 'event_reminder',
            'error': 'system_announcement',
            'info': 'other'
        };
        return typeMap[type] || 'other';
    },

    // Get icon for notification type
    _getNotificationIcon(type) {
        const iconMap = {
            'event_created': '📅',
            'event_updated': '✏️',
            'event_cancelled': '❌',
            'registration_confirmed': '✅',
            'registration_cancelled': '🚫',
            'event_reminder': '⏰',
            'attendance_marked': '✓',
            'feedback_request': '💬',
            'system_announcement': 'ℹ️',
            'other': '🔔'
        };
        return iconMap[type] || '🔔';
    },

    // Get color class for notification type
    _getNotificationColor(type) {
        const colorMap = {
            'event_created': 'blue',
            'event_updated': 'yellow',
            'event_cancelled': 'red',
            'registration_confirmed': 'green',
            'registration_cancelled': 'red',
            'event_reminder': 'yellow',
            'attendance_marked': 'green',
            'feedback_request': 'purple',
            'system_announcement': 'blue',
            'other': 'gray'
        };
        return colorMap[type] || 'gray';
    },

    // Hiển thị toast notification
    _showToast(notification) {
        let toastContainer = document.getElementById('toastContainer');
        if (!toastContainer) {
            toastContainer = document.createElement('div');
            toastContainer.id = 'toastContainer';
            toastContainer.className = 'fixed top-4 right-4 z-50 space-y-2';
            document.body.appendChild(toastContainer);
        }

        const icon = this._getNotificationIcon(notification.type);
        const color = this._getNotificationColor(notification.type);
        
        const toast = document.createElement('div');
        toast.className = `transform transition-all duration-300 translate-x-0 opacity-100 max-w-sm w-full bg-white dark:bg-gray-800 shadow-lg rounded-lg pointer-events-auto ring-1 ring-black ring-opacity-5 overflow-hidden`;
        
        const timestamp = new Date(notification.createdAt).toLocaleTimeString(
            LanguageService ? LanguageService.getCurrentLanguage() : 'vi',
            { hour: '2-digit', minute: '2-digit' }
        );
        
        toast.innerHTML = `
            <div class="p-4">
                <div class="flex items-start">
                    <div class="flex-shrink-0 text-2xl">${icon}</div>
                    <div class="ml-3 w-0 flex-1">
                        <p class="text-sm font-medium text-gray-900 dark:text-white">
                            ${notification.title}
                        </p>
                        <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
                            ${notification.message}
                        </p>
                        <p class="mt-1 text-xs text-gray-400 dark:text-gray-500">
                            ${timestamp}
                        </p>
                    </div>
                    <div class="ml-4 flex-shrink-0 flex">
                        <button onclick="this.closest('.max-w-sm').remove()" 
                                class="rounded-md inline-flex text-gray-400 hover:text-gray-500 focus:outline-none">
                            <span class="sr-only">Close</span>
                            <svg class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"/>
                            </svg>
                        </button>
                    </div>
                </div>
            </div>
        `;

        toastContainer.appendChild(toast);

        // Auto remove after 5 seconds
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(100%)';
            setTimeout(() => {
                toast.remove();
            }, 300);
        }, 5000);
    },

    // Update notification translations when language changes
    _updateNotificationTranslations(newLang) {
        // Re-render any visible notifications with new language
        // This is handled by individual components that display notifications
        console.log(`🌐 Notifications language updated to: ${newLang}`);
    },

    // Dispatch update event
    _dispatchUpdateEvent() {
        const event = new CustomEvent('notifications-updated', {
            detail: {
                count: this.notifications.length,
                unreadCount: this.notifications.filter(n => !n.isRead).length
            }
        });
        document.dispatchEvent(event);
    },

    // Lưu thông báo vào localStorage (cache)
    _saveNotificationsToCache() {
        localStorage.setItem('notifications', JSON.stringify(this.notifications));
    },

    // Load notifications from cache
    _loadNotificationsFromCache() {
        const cached = localStorage.getItem('notifications');
        if (cached) {
            try {
                this.notifications = JSON.parse(cached);
                this._dispatchUpdateEvent();
            } catch (error) {
                console.error('Error loading notifications from cache:', error);
            }
        }
    }
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = NotificationService;
}
// Make available globally for browser use
if (typeof window !== 'undefined') {
    window.NotificationService = NotificationService;
}
