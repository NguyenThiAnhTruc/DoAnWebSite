// Xử lý navigation và authentication
async function initNavigation() {
  console.log('🔧 initNavigation() called');
  
  // Check authentication
  const user = JSON.parse(localStorage.getItem('user') || 'null');
  const isLoggedIn = !!user;

  console.log('Navigation Init - User:', user);
  console.log('Navigation Init - Is Logged In:', isLoggedIn);

  // Redirect logic
  const PUBLIC_PATHS = ['/', '/login', '/register', '/home', '/Login.html', '/Register.html'];
  const adminPages = ['/admin', '/event-form', '/attendance', '/attendance-manager', '/AdminDashboard.html', '/Dashboard.html', '/dashboard'];
  const currentPath = window.location.pathname;

  function roleHomeFor(user) {
    if (!user) return '/login';
    const r = (user.role || '').toLowerCase();
    if (r === 'student') return '/EventList.html';
    // admin and teacher share the same dashboard entrypoint
    if (r === 'admin' || r === 'teacher') return '/AdminDashboard.html';
    return '/login';
  }

  // If user not logged in and accessing a protected page -> redirect to login
  if (!isLoggedIn && !PUBLIC_PATHS.includes(currentPath)) {
    window.location.href = '/login';
    return;
  }

  // If user is logged in and on a public page -> send them to their role home
  if (isLoggedIn && PUBLIC_PATHS.includes(currentPath)) {
    window.location.href = roleHomeFor(user);
    return;
  }

  // If user is logged in but trying to access admin-only pages and not admin/teacher -> send to their role home
  const userRole = (user.role || '').toLowerCase();
  if (isLoggedIn && adminPages.includes(currentPath) && userRole !== 'admin' && userRole !== 'teacher') {
    window.location.href = roleHomeFor(user);
    return;
  }

  // Setup navigation menu
  setupMenu(user);
  await setupUserInfo(user);
  
  // Setup logout button
  setupLogout();
}

// Setup logout button handler
function setupLogout() {
  const logoutBtn = document.getElementById('btnLogout');
  if (logoutBtn) {
    // Remove any existing listeners by cloning the button
    const newLogoutBtn = logoutBtn.cloneNode(true);
    logoutBtn.parentNode.replaceChild(newLogoutBtn, logoutBtn);
    
    newLogoutBtn.addEventListener('click', (e) => {
      e.preventDefault();
      if (confirm('Bạn có chắc chắn muốn đăng xuất?')) {
        // Reset theme về mặc định
        if (window.ThemeService) {
          ThemeService.resetToDefault();
        }
        
        // Xóa dữ liệu user
        localStorage.removeItem('user');
        localStorage.removeItem('token');
        localStorage.removeItem('currentUser');
        localStorage.removeItem('auth_token_user');
        localStorage.removeItem('app_theme');
        
        console.log('✅ Logged out successfully');
        window.location.href = '/Login.html';
      }
    });
    console.log('✅ Logout button handler attached');
  } else {
    console.log('ℹ️ Logout button not found (may not exist on this page)');
  }
}

// Setup menu items dựa trên role
function setupMenu(user) {
  // ✅ Định nghĩa menu với translation keys thay vì hard-code text
  const adminMenu = [
    { id: 'dashboard', translationKey: 'dashboard', icon: 'bar-chart-2', url: '/AdminDashboard.html' },
    { id: 'events', translationKey: 'events', icon: 'calendar', url: '/EventList.html' },
    { id: 'attendance', translationKey: 'attendance', icon: 'user-check', url: '/AttendanceManager.html' },
    { id: 'messages', translationKey: 'messages', icon: 'message-circle', url: '/MessagingSystem.html' },
    { id: 'support', translationKey: 'contact', icon: 'headphones', url: '/ContactSupport.html' },
    { id: 'settings', translationKey: 'settings', icon: 'settings', url: '/UserProfile.html' }
  ];

  const userMenu = [
    { id: 'events', translationKey: 'events', icon: 'calendar', url: '/EventList.html' },
    { id: 'my-events', translationKey: 'myEvents', icon: 'clock', url: '/EventList.html?mine=1' },
    { id: 'qr-checkin', translationKey: 'qrCheckin', icon: 'user-check', url: '/QRAttendance_new.html' },
    { id: 'messages', translationKey: 'messages', icon: 'message-circle', url: '/MessagingSystem.html' },
    { id: 'support', translationKey: 'contact', icon: 'headphones', url: '/ContactSupport.html' },
    { id: 'profile', translationKey: 'settings', icon: 'settings', url: '/UserProfile.html' }
  ];

  const menu = document.getElementById('menu');
  if (!menu) return;
  
  // Đồng bộ: admin và teacher dùng chung menu admin
  const userRole = (user?.role || '').toLowerCase();
  const items = (userRole === 'admin' || userRole === 'teacher') ? adminMenu : userMenu;
  console.log('Navigation - User role:', userRole, 'Menu type:', (userRole === 'admin' || userRole === 'teacher') ? 'Admin/Teacher' : 'Student');
  
  // Helper function to check if menu item is active
  function isMenuItemActive(item) {
    const currentPath = window.location.pathname;
    const currentSearch = window.location.search;
    const currentFullUrl = currentPath + currentSearch;
    
    // Chỉ active khi URL trùng hoàn toàn (bao gồm cả query string)
    return item.url === currentFullUrl;
  }
  
  // ✅ Render menu với labels tiếng Việt
  const menuLabels = {
    'dashboard': 'Quản lý',
    'events': 'Sự kiện',
    'attendance': 'Quản lý điểm danh',
    'messages': 'Tin nhắn',
    'myEvents': 'Sự kiện của tôi',
    'qrCheckin': 'Điểm danh QR',
    'contact': 'Hỗ trợ',
    'settings': 'Cài đặt',
    'profile': 'Hồ sơ',
    'admin': 'Quản trị'
  };
  
  menu.innerHTML = items.map(item => {
    const isActive = isMenuItemActive(item);
    const label = menuLabels[item.translationKey] || item.translationKey;
    
    return `
      <a href="${item.url}" 
         data-menu-id="${item.id}"
         data-menu-url="${item.url}"
         class="menu-item flex items-center space-x-3 px-4 py-3 rounded-xl transition-all ${
           isActive
             ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white' 
             : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
         }">
        <i data-lucide="${item.icon}" class="w-5 h-5"></i>
        <span class="font-medium">${label}</span>
      </a>
    `;
  }).join('');

  // Ngăn reload nếu click vào trang hiện tại
  document.querySelectorAll('.menu-item').forEach(link => {
    link.addEventListener('click', (e) => {
      const targetUrl = link.getAttribute('data-menu-url');
      const currentPath = window.location.pathname;
      const currentSearch = window.location.search;
      const currentFullUrl = currentPath + currentSearch;
      
      // Nếu đang ở trang này rồi, không reload
      if (targetUrl === currentFullUrl) {
        e.preventDefault();
        console.log('Already on this page, no reload needed');
        return false;
      }
    });
  });

  lucide.createIcons();
}

// Setup user info
async function setupUserInfo(user) {
  if (!user) return;

  // Update user name and role in sidebar - support multiple ID formats
  const userNameEl = document.getElementById('sidebarUserName') || 
                     document.getElementById('userName') || 
                     document.querySelector('#sidebar h3.font-semibold');
  
  const userRoleEl = document.getElementById('sidebarUserRole') || 
                     document.getElementById('userRole') || 
                     document.querySelector('#sidebar p.text-sm.text-gray-500') ||
                     document.querySelector('#sidebar p.text-sm');

  if (userNameEl) {
    userNameEl.textContent = user.name || user.username || 'Khách';
  }
  
  if (userRoleEl) {
    // Vietnamese role labels - ALWAYS use Vietnamese
    const roleMap = {
      'admin': 'Quản trị viên',
      'teacher': 'Giáo viên',
      'student': 'Sinh viên',
      'organizer': 'Tổ chức'
    };
    const role = (user.role || '').toLowerCase();
    const translatedRole = roleMap[role] || 'Người dùng';
    userRoleEl.textContent = translatedRole;
    
    console.log('✅ Role updated:', { role, translatedRole, element: userRoleEl });
  } else {
    console.log('ℹ️ userRole element not found (may not exist on this page)');
  }

  // Load stats from database
  await loadUserStats(user);
}

// Load user stats từ database
async function loadUserStats(user) {
  const upcomingCountEl = document.getElementById('upcomingCount');
  const joinedCountEl = document.getElementById('joinedCount');
  
  if (!upcomingCountEl && !joinedCountEl) return;
  
  try {
    // Lấy token để gọi API
    const token = localStorage.getItem('token');
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    
    // Gọi API lấy events với user_id để biết events đã đăng ký
    const userId = user?.user_id || user?.id || user?.userId || '';
    const url = userId ? `/api/events?UserId=${userId}` : '/api/events';
    
    const response = await fetch(url, { headers });
    const data = await response.json();
    
    // Normalize data
    let events = [];
    if (Array.isArray(data)) events = data;
    else if (data.events) events = data.events;
    else if (data.data && Array.isArray(data.data)) events = data.data;
    
    // Đếm upcoming events (sự kiện sắp tới)
    const now = new Date();
    const upcomingCount = events.filter(e => {
      const startDate = new Date(e.start_date || e.date);
      return startDate > now && (e.status === 'published' || e.status === 'upcoming');
    }).length;
    
    // Đếm joined events (sự kiện đã tham gia)
    const joinedCount = events.filter(e => e.is_registered || e.isRegistered).length;
    
    // Cập nhật UI
    if (upcomingCountEl) upcomingCountEl.textContent = upcomingCount;
    if (joinedCountEl) joinedCountEl.textContent = joinedCount;
    
    console.log('✅ Stats loaded:', { upcomingCount, joinedCount });
  } catch (error) {
    console.error('❌ Error loading user stats:', error);
    // Fallback to 0 on error
    if (upcomingCountEl) upcomingCountEl.textContent = '0';
    if (joinedCountEl) joinedCountEl.textContent = '0';
  }
}

// Handle logout
function handleLogout() {
  // ✅ Sử dụng translation cho confirm message
  const confirmMessage = 'Bạn có chắc chắn muốn đăng xuất?';
    
  if (confirm(confirmMessage)) {
    localStorage.removeItem('user');
    window.location.href = '/login';
  }
}

// Force update role display to Vietnamese
function forceUpdateRoleDisplay() {
  try {
    const user = JSON.parse(localStorage.getItem('user') || 'null');
    if (!user) return;
    
    const roleMap = {
      'admin': 'Quản trị viên',
      'teacher': 'Giáo viên',
      'student': 'Sinh viên',
      'organizer': 'Tổ chức'
    };
    
    // Find all possible role elements
    const roleElements = [
      document.getElementById('sidebarUserRole'),
      document.getElementById('userRole'),
      ...document.querySelectorAll('#sidebar p.text-sm')
    ].filter(el => el && (el.textContent.includes('Admin') || el.textContent.includes('Student') || el.textContent.includes('Teacher')));
    
    const role = (user.role || '').toLowerCase();
    const translatedRole = roleMap[role] || 'Người dùng';
    
    roleElements.forEach(el => {
      el.textContent = translatedRole;
      console.log('🔄 Force updated role to:', translatedRole);
    });
  } catch (e) {
    console.error('Error force updating role:', e);
  }
}

// Export functions to global scope
window.initNavigation = initNavigation;
window.forceUpdateRoleDisplay = forceUpdateRoleDisplay;

// Initialize
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    initNavigation();
    // Force update role after a short delay
    setTimeout(forceUpdateRoleDisplay, 100);
  });
} else {
  // DOM already loaded, run immediately
  initNavigation();
  setTimeout(forceUpdateRoleDisplay, 100);
}