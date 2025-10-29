/**
 * Unified Header Component với 3 icon: Messages, Profile, Notifications
 * Chỉ cập nhật badge cho các icon có sẵn, không tạo header mới
 */

const UnifiedHeader = {
  // Render header (chỉ khi chưa có header sẵn)
  render: function() {
    // Kiểm tra xem đã có header với icons chưa
    const existingNotificationBtn = document.getElementById('btnNotifications');
    const existingMessageBadge = document.getElementById('messageBadge');
    
    // Nếu đã có icon trong page, chỉ init logic, không tạo header mới
    if (existingNotificationBtn || existingMessageBadge) {
      console.log('[UnifiedHeader] Icons already exist in page, updating badges only');
      this.init();
      return;
    }
    
    // Chỉ tạo header mới nếu page không có icon
    const header = document.createElement('nav');
    header.id = 'unifiedHeader';
    header.className = 'bg-white dark:bg-gray-800 shadow-lg sticky top-0 z-50';
    
    header.innerHTML = `
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex justify-between items-center h-16">
          <!-- Left: Logo -->
          <div class="flex items-center space-x-2">
            <div class="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
              <svg class="w-6 h-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3M3 11h18M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2h-2M7 5H5a2 2 0 00-2 2v12a2 2 0 002 2"/>
              </svg>
            </div>
            <span class="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              SchoolEvents
            </span>
          </div>

          <!-- Right: Icons (Messages, Profile, Notifications) -->
          <div class="flex items-center space-x-6">
            <!-- Messages Icon -->
            <a href="/MessagingSystem.html" class="relative text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors" title="Tin nhắn">
              <svg class="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"/>
              </svg>
              <span id="messageBadge" class="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full min-w-[20px] h-5 flex items-center justify-center font-bold px-1" style="display: none;">3</span>
            </a>

            <!-- Profile Icon -->
            <a href="/UserProfile.html" class="relative text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors" title="Hồ sơ">
              <svg class="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
              </svg>
            </a>

            <!-- Notifications Icon -->
            <button id="btnNotifications" class="relative text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors" title="Thông báo">
              <svg class="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 10-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/>
              </svg>
              <span id="notificationBadge" class="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full min-w-[20px] h-5 flex items-center justify-center font-bold px-1" style="display: none;">0</span>
            </button>

            <!-- Notification Dropdown -->
            <div id="notificationDropdown" class="hidden absolute right-4 top-16 w-96 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden z-50">
              <div class="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                <h3 class="font-semibold text-gray-900 dark:text-white">Thông báo</h3>
                <button id="markAllReadBtn" class="text-sm text-blue-600 hover:text-blue-700">Đánh dấu đã đọc</button>
              </div>
              <div id="notificationList" class="max-h-96 overflow-y-auto">
                <div class="p-8 text-center text-gray-500 dark:text-gray-400">Đang tải...</div>
              </div>
              <div class="p-3 border-t border-gray-200 dark:border-gray-700 text-center">
                <a href="#" class="text-sm text-blue-600 hover:text-blue-700">Xem tất cả</a>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
    
    // Insert at beginning of body
    if (document.body.firstChild) {
      document.body.insertBefore(header, document.body.firstChild);
    } else {
      document.body.appendChild(header);
    }
    
    // Initialize
    this.init();
  },

  // Initialize header functionality
  init: function() {
    this.updateMessageBadge();
    this.updateNotificationBadge();
    this.setupNotificationDropdown();
    
    // Refresh badges every 30 seconds
    setInterval(() => {
      this.updateMessageBadge();
      this.updateNotificationBadge();
    }, 30000);
  },

  // Update message badge
  updateMessageBadge: function() {
    const badge = document.getElementById('messageBadge');
    if (badge) {
      // TODO: Replace with real API call
      const count = 3; // Mock data
      if (count > 0) {
        badge.textContent = count > 99 ? '99+' : count;
        badge.style.display = 'flex';
      } else {
        badge.style.display = 'none';
      }
    }
  },

  // Update notification badge
  updateNotificationBadge: async function() {
    try {
      const badge = document.getElementById('notificationBadge');
      if (!badge) return;

      if (typeof NotificationService !== 'undefined' && NotificationService.getUnreadCount) {
        const count = await NotificationService.getUnreadCount();
        if (count > 0) {
          badge.textContent = count > 99 ? '99+' : count;
          badge.style.display = 'flex';
        } else {
          badge.style.display = 'none';
        }
      }
    } catch (error) {
      console.error('Failed to update notification badge:', error);
    }
  },

  // Setup notification dropdown
  setupNotificationDropdown: function() {
    // Support both btnNotifications (existing pages) and notificationBtn (new header)
    const notificationBtn = document.getElementById('btnNotifications') || document.getElementById('notificationBtn');
    const notificationDropdown = document.getElementById('notificationDropdown');
    
    if (notificationBtn && notificationDropdown) {
      notificationBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        notificationDropdown.classList.toggle('hidden');
        
        // Load notifications when opened
        if (!notificationDropdown.classList.contains('hidden')) {
          this.loadNotifications();
        }
      });

      // Close dropdown when clicking outside
      document.addEventListener('click', (e) => {
        if (!notificationDropdown.contains(e.target) && e.target !== notificationBtn) {
          notificationDropdown.classList.add('hidden');
        }
      });
    }

    // Mark all as read button
    const markAllReadBtn = document.getElementById('markAllReadBtn');
    if (markAllReadBtn) {
      markAllReadBtn.addEventListener('click', async () => {
        try {
          if (typeof NotificationService !== 'undefined' && NotificationService.markAllAsRead) {
            await NotificationService.markAllAsRead();
            this.updateNotificationBadge();
            this.loadNotifications();
          }
        } catch (error) {
          console.error('Failed to mark all as read:', error);
        }
      });
    }
  },

  // Load notifications
  loadNotifications: async function() {
    const list = document.getElementById('notificationList');
    if (!list) return;

    try {
      if (typeof NotificationService !== 'undefined' && NotificationService.getRecent) {
        const notifications = await NotificationService.getRecent(10);
        
        if (notifications && notifications.length > 0) {
          list.innerHTML = notifications.map(notif => `
            <div class="p-4 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer border-b border-gray-100 dark:border-gray-700 ${notif.is_read ? 'opacity-60' : ''}">
              <div class="flex items-start space-x-3">
                <div class="flex-shrink-0">
                  <div class="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                    <svg class="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                    </svg>
                  </div>
                </div>
                <div class="flex-1 min-w-0">
                  <p class="text-sm font-medium text-gray-900 dark:text-white">${notif.title || 'Thông báo'}</p>
                  <p class="text-sm text-gray-500 dark:text-gray-400">${notif.message || ''}</p>
                  <p class="text-xs text-gray-400 dark:text-gray-500 mt-1">${this.formatTime(notif.created_at)}</p>
                </div>
              </div>
            </div>
          `).join('');
        } else {
          list.innerHTML = '<div class="p-8 text-center text-gray-500 dark:text-gray-400">Không có thông báo mới</div>';
        }
      } else {
        list.innerHTML = '<div class="p-8 text-center text-gray-500 dark:text-gray-400">Đang tải...</div>';
      }
    } catch (error) {
      console.error('Failed to load notifications:', error);
      list.innerHTML = '<div class="p-8 text-center text-red-500">Lỗi khi tải thông báo</div>';
    }
  },

  // Format time helper
  formatTime: function(dateStr) {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const diff = Math.floor((now - date) / 1000); // seconds
    
    if (diff < 60) return 'Vừa xong';
    if (diff < 3600) return `${Math.floor(diff / 60)} phút trước`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} giờ trước`;
    if (diff < 604800) return `${Math.floor(diff / 86400)} ngày trước`;
    
    return date.toLocaleDateString('vi-VN');
  }
};

// Auto-render when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => UnifiedHeader.render());
} else {
  UnifiedHeader.render();
}

// Export for use in other scripts
if (typeof window !== 'undefined') {
  window.UnifiedHeader = UnifiedHeader;
}
