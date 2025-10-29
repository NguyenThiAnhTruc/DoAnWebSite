/**
 * Header Component - Standardized header for all pages
 * Provides notification dropdown, badges, and consistent UI
 */

const HeaderComponent = {
  // Update notification badge
  updateNotificationBadge: async function() {
    try {
      if (!window.NotificationService) {
        console.warn('NotificationService not loaded yet');
        return;
      }
      const count = await window.NotificationService.getUnreadCount();
      const badge = document.getElementById('notificationBadge');
      if (badge) {
        if (count > 0) {
          badge.textContent = count > 99 ? '99+' : count;
          badge.classList.remove('hidden');
        } else {
          badge.classList.add('hidden');
        }
      }
    } catch (error) {
      console.error('Failed to update notification badge:', error);
    }
  },

  // Update message badge (mock for now, replace with real API)
  updateMessageBadge: async function() {
    try {
      // TODO: Replace with real message API
      const count = 3; // Mock data
      const badge = document.getElementById('messageBadge');
      if (badge) {
        if (count > 0) {
          badge.textContent = count > 99 ? '99+' : count;
          badge.classList.remove('hidden');
        } else {
          badge.classList.add('hidden');
        }
      }
    } catch (error) {
      console.error('Failed to update message badge:', error);
    }
  },

  // Render notifications in dropdown
  renderNotifications: async function() {
    try {
      if (!window.NotificationService) {
        console.warn('NotificationService not loaded yet');
        return;
      }

      const notifications = await window.NotificationService.fetchNotifications(5, false);
      const container = document.getElementById('notificationList');
      
      if (!container) return;

      if (!notifications || notifications.length === 0) {
        container.innerHTML = `
          <div class="px-4 py-8 text-center text-gray-500 dark:text-gray-400 text-sm" data-translate="notifications.noNotifications">
            Không có thông báo mới
          </div>
        `;
        if (window.LanguageService) window.LanguageService._updatePageContent();
        return;
      }

      container.innerHTML = notifications.map(notif => {
        const icon = this._getNotificationIcon(notif.type);
        const color = this._getNotificationColor(notif.type);
        const timeAgo = this._formatTimeAgo(notif.created_at);
        const isUnread = !notif.is_read;

        return `
          <div class="px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors ${isUnread ? 'bg-blue-50 dark:bg-blue-900/20' : ''}" 
               data-notification-id="${notif.notification_id}"
               onclick="HeaderComponent.handleNotificationClick(${notif.notification_id})">
            <div class="flex items-start space-x-3">
              <div class="flex-shrink-0 w-10 h-10 rounded-full ${color} flex items-center justify-center">
                <i data-lucide="${icon}" class="w-5 h-5 text-white"></i>
              </div>
              <div class="flex-1 min-w-0">
                <p class="text-sm font-medium text-gray-900 dark:text-white">${notif.title}</p>
                <p class="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">${notif.message}</p>
                <p class="text-xs text-gray-400 dark:text-gray-500 mt-1">${timeAgo}</p>
              </div>
              ${isUnread ? '<div class="flex-shrink-0 w-2 h-2 bg-blue-600 rounded-full"></div>' : ''}
            </div>
          </div>
        `;
      }).join('');

      if (window.lucide && window.lucide.createIcons) window.lucide.createIcons();
    } catch (error) {
      console.error('Failed to render notifications:', error);
    }
  },

  // Handle notification click
  handleNotificationClick: async function(notificationId) {
    try {
      if (!window.NotificationService) return;
      
      await window.NotificationService.markAsRead(notificationId);
      await this.updateNotificationBadge();
      await this.renderNotifications();
      this.closeNotificationDropdown();
    } catch (error) {
      console.error('Failed to handle notification click:', error);
    }
  },

  // Toggle notification dropdown
  toggleNotificationDropdown: function() {
    const dropdown = document.getElementById('notificationDropdown');
    if (!dropdown) return;
    
    const isHidden = dropdown.classList.contains('hidden');
    
    if (isHidden) {
      dropdown.classList.remove('hidden');
      this.renderNotifications();
    } else {
      dropdown.classList.add('hidden');
    }
  },

  closeNotificationDropdown: function() {
    const dropdown = document.getElementById('notificationDropdown');
    if (dropdown) {
      dropdown.classList.add('hidden');
    }
  },

  // Get icon for notification type
  _getNotificationIcon: function(type) {
    const icons = {
      event_created: 'calendar-plus',
      event_updated: 'calendar-clock',
      event_cancelled: 'calendar-x',
      registration_confirmed: 'check-circle',
      registration_cancelled: 'x-circle',
      event_reminder: 'bell',
      attendance_marked: 'check-square',
      message_received: 'message-circle',
      announcement: 'megaphone',
      system: 'info'
    };
    return icons[type] || 'bell';
  },

  // Get color for notification type
  _getNotificationColor: function(type) {
    const colors = {
      event_created: 'bg-green-500',
      event_updated: 'bg-blue-500',
      event_cancelled: 'bg-red-500',
      registration_confirmed: 'bg-green-500',
      registration_cancelled: 'bg-red-500',
      event_reminder: 'bg-yellow-500',
      attendance_marked: 'bg-green-500',
      message_received: 'bg-blue-500',
      announcement: 'bg-purple-500',
      system: 'bg-gray-500'
    };
    return colors[type] || 'bg-gray-500';
  },

  // Format time ago in Vietnamese
  _formatTimeAgo: function(timestamp) {
    const now = Date.now();
    const time = new Date(timestamp).getTime();
    const diff = Math.floor((now - time) / 1000); // seconds

    if (diff < 60) return 'Vừa xong';
    if (diff < 3600) return `${Math.floor(diff / 60)} phút trước`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} giờ trước`;
    if (diff < 604800) return `${Math.floor(diff / 86400)} ngày trước`;
    return new Date(timestamp).toLocaleDateString('vi-VN');
  },

  // Set page title and subtitle
  setPageInfo: function(title, subtitle) {
    const titleEl = document.getElementById('pageTitle');
    const subtitleEl = document.getElementById('pageSubtitleHeader');
    
    if (titleEl) titleEl.textContent = title;
    if (subtitleEl) subtitleEl.textContent = subtitle;
  },

  // Initialize header component
  init: function() {
    // Notification button click
    const btnNotifications = document.getElementById('btnNotifications');
    if (btnNotifications) {
      btnNotifications.addEventListener('click', () => this.toggleNotificationDropdown());
    }

    // Mark all as read button
    const btnMarkAllRead = document.getElementById('btnMarkAllRead');
    if (btnMarkAllRead) {
      btnMarkAllRead.addEventListener('click', async () => {
        try {
          if (!window.NotificationService) return;
          await window.NotificationService.markAllAsRead();
          await this.updateNotificationBadge();
          await this.renderNotifications();
        } catch (error) {
          console.error('Failed to mark all as read:', error);
        }
      });
    }

    // Clear all read button
    const btnClearAllRead = document.getElementById('btnClearAllRead');
    if (btnClearAllRead) {
      btnClearAllRead.addEventListener('click', async () => {
        try {
          if (!window.NotificationService) return;
          await window.NotificationService.clearAllRead();
          await this.updateNotificationBadge();
          await this.renderNotifications();
        } catch (error) {
          console.error('Failed to clear all read:', error);
        }
      });
    }

    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
      const dropdown = document.getElementById('notificationDropdown');
      const btn = document.getElementById('btnNotifications');
      if (dropdown && btn && !dropdown.contains(e.target) && !btn.contains(e.target)) {
        this.closeNotificationDropdown();
      }
    });

    // Update badges periodically
    this.updateNotificationBadge();
    this.updateMessageBadge();
    setInterval(() => this.updateNotificationBadge(), 30000); // Every 30s
    setInterval(() => this.updateMessageBadge(), 60000); // Every 60s

    // Listen for notification updates
    window.addEventListener('notifications-updated', () => {
      this.updateNotificationBadge();
    });
  }
};

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    // Wait a bit for other services to load
    setTimeout(() => HeaderComponent.init(), 100);
  });
} else {
  setTimeout(() => HeaderComponent.init(), 100);
}
