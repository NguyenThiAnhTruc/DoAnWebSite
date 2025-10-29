// Admin Dashboard - Load dữ liệu từ API và hiển thị thống kê

// Get token from localStorage
const getToken = () => localStorage.getItem('token');

// Fetch API with authentication
async function fetchAPI(url, options = {}) {
  const token = getToken();
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  
  const response = await fetch(url, { ...options, headers });
  if (!response.ok) {
    console.error(`API Error: ${response.status} - ${url}`);
    throw new Error(`API error: ${response.status}`);
  }
  return response.json();
}

// Global data
let events = [];
let registrations = [];

// Fetch all events from API
async function loadEvents() {
  try {
    console.log('Loading events from API...');
    const data = await fetchAPI('/api/events?PageSize=1000');
    console.log('API Response:', data);
    
    if (data.success && Array.isArray(data.events)) {
      events = data.events.map(e => {
        // Determine display status based on dates
        let displayStatus = e.status || 'draft';
        const now = new Date();
        const eventDate = e.start_date ? new Date(e.start_date) : null;
        
        if (eventDate) {
          if (eventDate > now) {
            displayStatus = 'upcoming';
          } else if (eventDate.toDateString() === now.toDateString()) {
            displayStatus = 'ongoing';
          } else {
            displayStatus = 'completed';
          }
        }
        
        return {
          id: e.event_id || e.id,
          title: e.title || 'Untitled Event',
          category: e.category || e.category_name || 'Khác',
          date: e.start_date ? new Date(e.start_date).toISOString().split('T')[0] : '',
          status: displayStatus,
          dbStatus: e.status,
          image: e.image_url || e.image || 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&h=400&fit=crop',
          currentParticipants: parseInt(e.current_participants) || 0,
          maxParticipants: parseInt(e.max_participants) || 100,
          location: e.location || '',
          description: e.description || e.short_description || '',
          createdAt: e.created_at ? new Date(e.created_at).getTime() : Date.now()
        };
      });
      console.log(`✅ Loaded ${events.length} events from API`);
    } else {
      console.warn('No events found in API response');
      events = [];
    }
  } catch (err) {
    console.error('❌ Error loading events:', err);
    events = [];
  }
}

// Fetch all registrations from API
async function loadRegistrations() {
  try {
    console.log('Loading registrations from API...');
    const allRegs = [];
    
    // Fetch registrations for each event
    for (const event of events) {
      try {
        const data = await fetchAPI(`/api/events/${event.id}/registrations`);
        console.log(`📋 Event ${event.id} registrations:`, data.registrations?.length || 0);
        if (data.success && Array.isArray(data.registrations)) {
          // Log first registration for debugging
          if (data.registrations.length > 0) {
            console.log('Sample registration data:', data.registrations[0]);
          }
          
          const eventRegs = data.registrations.map(r => {
            const fullName = `${r.first_name || ''} ${r.last_name || ''}`.trim();
            const userName = fullName || r.username || 'Unknown';
            console.log('Mapped user:', { first_name: r.first_name, last_name: r.last_name, username: r.username, result: userName });
            
            return {
              id: r.registration_id,
              eventId: r.event_id,
              userName: userName,
              registeredAt: r.registration_date ? new Date(r.registration_date).getTime() : Date.now()
            };
          });
          allRegs.push(...eventRegs);
        }
      } catch (e) {
        console.warn(`Could not fetch registrations for event ${event.id}:`, e.message);
      }
    }
    
    registrations = allRegs;
    console.log(`✅ Loaded ${registrations.length} registrations from API`);
  } catch (err) {
    console.error('❌ Error loading registrations:', err);
    registrations = [];
  }
}

// Update statistics cards
function updateStats() {
  const totalEvents = events.length;
  const upcomingEvents = events.filter(e => e.status === 'upcoming').length;
  const totalRegs = registrations.length;
  const avgParticipation = totalEvents > 0 
    ? Math.round(events.reduce((sum, e) => sum + e.currentParticipants, 0) / totalEvents) 
    : 0;
  
  document.getElementById('stTotal').textContent = totalEvents;
  document.getElementById('stUpcoming').textContent = upcomingEvents;
  document.getElementById('stRegs').textContent = totalRegs;
  document.getElementById('stAvg').textContent = avgParticipation;
  
  console.log('Stats updated:', { totalEvents, upcomingEvents, totalRegs, avgParticipation });
}

// Update sidebar stats
function updateSidebarStats() {
  const upcoming = events.filter(e => e.status === 'upcoming').length;
  const joined = registrations.length;
  
  const upcomingEl = document.getElementById('upcomingCount');
  const joinedEl = document.getElementById('joinedCount');
  
  if (upcomingEl) upcomingEl.textContent = upcoming;
  if (joinedEl) joinedEl.textContent = joined;
}

// Render recent registrations
function renderRecentRegistrations() {
  const wrap = document.getElementById('recentRegs');
  if (!wrap) return;
  
  wrap.innerHTML = '';
  
  if (registrations.length === 0) {
    wrap.innerHTML = '<p class="text-gray-500 text-center py-4">Chưa có đăng ký nào</p>';
    return;
  }
  
  // Get last 5 registrations
  const recent = registrations.slice(-5).reverse();
  
  recent.forEach(r => {
    const event = events.find(e => e.id === r.eventId);
    const row = document.createElement('div');
    row.className = 'flex items-center p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition';
    row.innerHTML = `
      <div class="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center mr-4 flex-shrink-0">
        <i data-lucide="check-circle" class="w-5 h-5 text-green-600"></i>
      </div>
      <div class="flex-1 min-w-0">
        <p class="font-medium text-gray-900 truncate">${r.userName}</p>
        <p class="text-sm text-gray-500 truncate">
          ${event ? event.title : 'Unknown Event'} • ${new Date(r.registeredAt).toLocaleDateString('vi-VN')}
        </p>
      </div>
    `;
    wrap.appendChild(row);
  });
  
  if (window.lucide) lucide.createIcons();
}

// Render quick stats (this week, today, participation rate)
function renderQuickStats() {
  const now = new Date();
  const weekLater = new Date(now.getTime() + 7 * 24 * 3600 * 1000);
  
  // Events this week
  const thisWeekCount = events.filter(e => {
    if (!e.date) return false;
    const d = new Date(e.date);
    return d >= now && d <= weekLater;
  }).length;
  
  // Registrations today
  const todayRegsCount = registrations.filter(r => {
    const d = new Date(r.registeredAt);
    return d.toDateString() === now.toDateString();
  }).length;
  
  // Participation rate
  const totalCapacity = events.reduce((sum, e) => sum + e.maxParticipants, 0);
  const totalParticipants = events.reduce((sum, e) => sum + e.currentParticipants, 0);
  const rate = totalCapacity > 0 ? Math.round((totalParticipants / totalCapacity) * 100) : 0;
  
  document.getElementById('thisWeek').textContent = thisWeekCount;
  document.getElementById('todayRegs').textContent = todayRegsCount;
  document.getElementById('rate').textContent = rate + '%';
}

// Get status badge HTML
function getStatusBadge(status) {
  const badges = {
    'draft': { class: 'bg-gray-100 text-gray-800', text: 'Nháp' },
    'published': { class: 'bg-blue-100 text-blue-800', text: 'Đã xuất bản' },
    'upcoming': { class: 'bg-blue-100 text-blue-800', text: 'Sắp diễn ra' },
    'ongoing': { class: 'bg-green-100 text-green-800', text: 'Đang diễn ra' },
    'completed': { class: 'bg-purple-100 text-purple-800', text: 'Đã kết thúc' },
    'cancelled': { class: 'bg-red-100 text-red-800', text: 'Đã hủy' }
  };
  return badges[status] || badges['draft'];
}

// Render events table
function renderEventsTable() {
  const tbody = document.getElementById('tblEvents');
  if (!tbody) return;
  
  tbody.innerHTML = '';
  
  if (events.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="5" class="py-8 text-center text-gray-500">
          Chưa có sự kiện nào. <a href="/EventForm.html" class="text-blue-600 hover:underline">Tạo sự kiện mới</a>
        </td>
      </tr>
    `;
    return;
  }
  
  events.forEach((ev, index) => {
    const tr = document.createElement('tr');
    tr.className = 'border-b hover:bg-gray-50 transition fade';
    
    const participationPercent = ev.maxParticipants > 0 
      ? Math.min((ev.currentParticipants / ev.maxParticipants) * 100, 100) 
      : 0;
    
    const statusBadge = getStatusBadge(ev.status);
    
    tr.innerHTML = `
      <td class="py-4 px-4">
        <div class="flex items-center">
          <img src="${ev.image}" alt="${ev.title}" class="w-12 h-12 rounded-lg object-cover mr-3 flex-shrink-0">
          <div class="min-w-0">
            <div class="font-medium text-gray-900 truncate">${ev.title}</div>
            <div class="text-sm text-gray-500 truncate">${ev.category}</div>
          </div>
        </div>
      </td>
      <td class="py-4 px-4 text-gray-600 whitespace-nowrap">${ev.date || 'N/A'}</td>
      <td class="py-4 px-4">
        <div class="text-gray-900">${ev.currentParticipants}/${ev.maxParticipants}</div>
        <div class="w-16 bg-gray-200 rounded-full h-2 mt-1">
          <div class="bg-blue-500 h-2 rounded-full transition-all" style="width:${participationPercent}%"></div>
        </div>
      </td>
      <td class="py-4 px-4">
        <span class="px-3 py-1 rounded-full text-xs font-medium ${statusBadge.class}">
          ${statusBadge.text}
        </span>
      </td>
      <td class="py-4 px-4">
        <div class="flex items-center space-x-2">
          <button class="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition" 
                  title="Chỉnh sửa" data-edit-id="${ev.id}">
            <i data-lucide="edit" class="w-4 h-4"></i>
          </button>
          <button class="p-2 text-red-600 hover:bg-red-50 rounded-lg transition" 
                  title="Xóa" data-delete-id="${ev.id}">
            <i data-lucide="trash-2" class="w-4 h-4"></i>
          </button>
        </div>
      </td>
    `;
    
    tbody.appendChild(tr);
    
    // Add fade-in animation
    setTimeout(() => tr.classList.add('show'), 40 * index);
  });
  
  // Attach event handlers
  tbody.querySelectorAll('[data-edit-id]').forEach(btn => {
    btn.onclick = () => {
      const id = btn.getAttribute('data-edit-id');
      window.location.href = `/EventForm.html?id=${id}`;
    };
  });
  
  tbody.querySelectorAll('[data-delete-id]').forEach(btn => {
    btn.onclick = async () => {
      const id = btn.getAttribute('data-delete-id');
      const event = events.find(e => e.id == id);
      
      if (!confirm(`Bạn có chắc chắn muốn xóa sự kiện "${event.title}"?\n\nHành động này không thể hoàn tác!`)) {
        return;
      }
      
      try {
        const response = await fetchAPI(`/api/events/${id}`, { method: 'DELETE' });
        
        if (response.success) {
          alert('✅ Đã xóa sự kiện thành công');
          // Reload data
          await loadAllData();
        } else {
          alert('❌ Lỗi: ' + (response.message || 'Không thể xóa sự kiện'));
        }
      } catch (err) {
        console.error('Error deleting event:', err);
        alert('❌ Lỗi khi xóa sự kiện: ' + err.message);
      }
    };
  });
  
  if (window.lucide) lucide.createIcons();
}

// Render reports
function renderReports() {
  // Monthly stats (placeholder)
  const monthStats = document.getElementById('monthStats');
  if (monthStats) {
    const months = ['Tháng 10', 'Tháng 9', 'Tháng 8'];
    const counts = [
      events.filter(e => e.date && e.date.startsWith('2025-10')).length,
      events.filter(e => e.date && e.date.startsWith('2025-09')).length,
      events.filter(e => e.date && e.date.startsWith('2025-08')).length
    ];
    
    monthStats.innerHTML = months.map((m, i) => `
      <div class="flex justify-between items-center">
        <span class="text-gray-600">${m}</span>
        <span class="font-medium">${counts[i]} sự kiện</span>
      </div>
    `).join('');
  }
  
  // Top events
  const topEvents = document.getElementById('topEvents');
  if (topEvents) {
    const sorted = [...events].sort((a, b) => b.currentParticipants - a.currentParticipants).slice(0, 3);
    
    if (sorted.length > 0) {
      topEvents.innerHTML = sorted.map(ev => `
        <div class="flex justify-between items-center">
          <span class="text-gray-600 truncate flex-1 mr-2">${ev.title}</span>
          <span class="font-medium whitespace-nowrap">${ev.currentParticipants} tham gia</span>
        </div>
      `).join('');
    } else {
      topEvents.innerHTML = '<p class="text-gray-500 text-center">Chưa có dữ liệu</p>';
    }
  }
}

// Load all data and render
async function loadAllData() {
  console.log('🔄 Loading all data...');
  
  await loadEvents();
  await loadRegistrations();
  
  updateStats();
  updateSidebarStats();
  renderRecentRegistrations();
  renderQuickStats();
  renderEventsTable();
  renderReports();
  
  if (window.lucide) lucide.createIcons();
  
  console.log('✅ All data loaded and rendered');
}

// Export functions for use in HTML
window.AdminDashboard = {
  loadAllData,
  events: () => events,
  registrations: () => registrations
};

console.log('✅ Admin Dashboard script loaded');
