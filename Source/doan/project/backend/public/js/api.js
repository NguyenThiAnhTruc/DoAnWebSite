// API Service Class - Handles all server communications
class APIService {
    constructor() {
        const port = window.location.port || '3000';
        this.baseURL = `http://localhost:${port}/api`;
        this.timeout = 10000; // 10 seconds timeout
    }

    // Generic request method
    async request(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;
        const config = {
            timeout: this.timeout,
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        };

        try {
            console.log(`🌐 API Request: ${config.method || 'GET'} ${url}`);
            
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), this.timeout);
            
            const response = await fetch(url, {
                ...config,
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            console.log(`✅ API Response:`, data);
            return data;

        } catch (error) {
            if (error.name === 'AbortError') {
                console.error('❌ API Request timeout');
                throw new Error('Yêu cầu quá thời gian chờ');
            }
            
            console.error('❌ API Request failed:', error);
            
            // Handle specific error cases
            if (error.message.includes('Failed to fetch')) {
                throw new Error('Không thể kết nối đến server. Vui lòng kiểm tra kết nối mạng.');
            }
            
            throw error;
        }
    }

    // Authentication methods
    async login(credentials) {
        try {
            const response = await this.request('/auth/login', {
                method: 'POST',
                body: JSON.stringify(credentials)
            });
            
            if (response.token) {
                localStorage.setItem('authToken', response.token);
                localStorage.setItem('user', JSON.stringify(response.user));
            }
            
            return response;
        } catch (error) {
            console.error('❌ Login failed:', error);
            throw error;
        }
    }

    async register(userData) {
        try {
            const response = await this.request('/auth/register', {
                method: 'POST',
                body: JSON.stringify(userData)
            });
            
            return response;
        } catch (error) {
            console.error('❌ Registration failed:', error);
            throw error;
        }
    }

    async logout() {
        try {
            await this.request('/auth/logout', {
                method: 'POST',
                headers: this.getAuthHeaders()
            });
        } catch (error) {
            console.error('❌ Logout failed:', error);
        } finally {
            localStorage.removeItem('authToken');
            localStorage.removeItem('user');
        }
    }

    // Event management methods
    async getEvents() {
        try {
            const response = await this.request('/events');
            return response.data || response;
        } catch (error) {
            console.error('❌ Error fetching events:', error);
            
            // Return mock data as fallback
            console.log('⚠️ Using mock events data');
            return this.getMockEvents();
        }
    }

    async getEventById(eventId) {
        try {
            const response = await this.request(`/events/${eventId}`);
            return response.data || response;
        } catch (error) {
            console.error(`❌ Error fetching event ${eventId}:`, error);
            
            // Return mock data as fallback
            const mockEvents = this.getMockEvents();
            return mockEvents.find(e => e.id === parseInt(eventId)) || null;
        }
    }

    async registerForEvent(registrationData) {
        try {
            const response = await this.request(`/events/${registrationData.eventId}/register`, {
                method: 'POST',
                body: JSON.stringify(registrationData)
            });
            
            return {
                success: response.success || true,
                message: response.message || 'Đăng ký thành công'
            };
        } catch (error) {
            console.error('❌ Event registration failed:', error);
            
            // Mock registration success for demo
            console.log('⚠️ Using mock registration response');
            return {
                success: true,
                message: 'Đăng ký thành công (Demo mode)'
            };
        }
    }

    async checkinEvent(eventId, userId) {
        try {
            const response = await this.request(`/events/${eventId}/checkin`, {
                method: 'POST',
                body: JSON.stringify({ userId }),
                headers: this.getAuthHeaders()
            });
            
            return {
                success: response.success || true,
                message: response.message || 'Điểm danh thành công'
            };
        } catch (error) {
            console.error('❌ Event checkin failed:', error);
            
            // Mock checkin success for demo
            console.log('⚠️ Using mock checkin response');
            return {
                success: true,
                message: 'Điểm danh thành công (Demo mode)'
            };
        }
    }

    async getEventRegistrations(eventId) {
        try {
            const response = await this.request(`/events/${eventId}/registrations`, {
                headers: this.getAuthHeaders()
            });
            return response.data || response;
        } catch (error) {
            console.error(`❌ Error fetching registrations for event ${eventId}:`, error);
            return [];
        }
    }

    // User management methods
    async getUserProfile() {
        try {
            const response = await this.request('/user/profile', {
                headers: this.getAuthHeaders()
            });
            return response.data || response;
        } catch (error) {
            console.error('❌ Error fetching user profile:', error);
            throw error;
        }
    }

    async updateUserProfile(profileData) {
        try {
            const response = await this.request('/user/profile', {
                method: 'PUT',
                body: JSON.stringify(profileData),
                headers: this.getAuthHeaders()
            });
            return response;
        } catch (error) {
            console.error('❌ Error updating user profile:', error);
            throw error;
        }
    }

    async getUserEvents(userId) {
        try {
            const response = await this.request(`/user/${userId}/events`, {
                headers: this.getAuthHeaders()
            });
            return response.data || response;
        } catch (error) {
            console.error('❌ Error fetching user events:', error);
            return [];
        }
    }

    // Admin methods
    async createEvent(eventData) {
        try {
            const response = await this.request('/events', {
                method: 'POST',
                body: JSON.stringify(eventData),
                headers: this.getAuthHeaders()
            });
            return response;
        } catch (error) {
            console.error('❌ Error creating event:', error);
            throw error;
        }
    }

    async updateEvent(eventId, eventData) {
        try {
            const response = await this.request(`/events/${eventId}`, {
                method: 'PUT',
                body: JSON.stringify(eventData),
                headers: this.getAuthHeaders()
            });
            return response;
        } catch (error) {
            console.error('❌ Error updating event:', error);
            throw error;
        }
    }

    async deleteEvent(eventId) {
        try {
            const response = await this.request(`/events/${eventId}`, {
                method: 'DELETE',
                headers: this.getAuthHeaders()
            });
            return response;
        } catch (error) {
            console.error('❌ Error deleting event:', error);
            throw error;
        }
    }

    // Statistics methods
    async getStatistics() {
        try {
            const response = await this.request('/statistics', {
                headers: this.getAuthHeaders()
            });
            return response.data || response;
        } catch (error) {
            console.error('❌ Error fetching statistics:', error);
            
            // Return mock statistics
            const events = this.getMockEvents();
            return {
                totalEvents: events.length,
                upcomingEvents: events.filter(e => e.status === 'upcoming').length,
                completedEvents: events.filter(e => e.status === 'completed').length,
                totalParticipants: events.reduce((sum, e) => sum + e.current_participants, 0)
            };
        }
    }

    // Utility methods
    getAuthHeaders() {
        const token = localStorage.getItem('authToken');
        return token ? { 'Authorization': `Bearer ${token}` } : {};
    }

    isAuthenticated() {
        const token = localStorage.getItem('authToken');
        const user = localStorage.getItem('user');
        return !!(token && user);
    }

    getCurrentUser() {
        const user = localStorage.getItem('user');
        return user ? JSON.parse(user) : null;
    }

    // Mock data for development/demo
    getMockEvents() {
        return [
            {
                id: 1,
                title: 'Hội thảo Công nghệ thông tin 2024',
                description: 'Hội thảo về những xu hướng mới nhất trong công nghệ thông tin, AI và Machine Learning. Sự kiện sẽ có sự tham gia của các chuyên gia hàng đầu trong ngành.',
                start_date: '2024-12-15',
                start_time: '14:00:00',
                end_date: '2024-12-15',
                end_time: '17:00:00',
                location: 'Hội trường A - Tòa nhà chính',
                organizer: 'Khoa Công nghệ thông tin',
                category: 'Hội thảo',
                department: 'CNTT',
                max_participants: 200,
                current_participants: 45,
                status: 'upcoming',
                image_url: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&h=400&fit=crop',
                is_active: true,
                created_at: new Date('2024-10-01'),
                updated_at: new Date('2024-10-01')
            },
            {
                id: 2,
                title: 'Cuộc thi Lập trình Olympic',
                description: 'Cuộc thi lập trình dành cho sinh viên toàn trường với nhiều giải thưởng hấp dẫn. Thời gian thi 8 tiếng với các bài toán thuật toán phức tạp.',
                start_date: '2024-12-20',
                start_time: '08:00:00',
                end_date: '2024-12-20',
                end_time: '17:00:00',
                location: 'Phòng Lab 301-302',
                organizer: 'CLB Lập trình',
                category: 'Cuộc thi',
                department: 'CNTT',
                max_participants: 100,
                current_participants: 67,
                status: 'upcoming',
                image_url: 'https://images.unsplash.com/photo-1517457373958-b7bdd4587205?w=800&h=400&fit=crop',
                is_active: true,
                created_at: new Date('2024-10-01'),
                updated_at: new Date('2024-10-01')
            },
            {
                id: 3,
                title: 'Workshop Thiết kế đồ họa',
                description: 'Học cách sử dụng các công cụ thiết kế hiện đại như Figma, Adobe Creative Suite. Workshop thực hành với các dự án thực tế.',
                start_date: '2024-12-25',
                start_time: '09:00:00',
                end_date: '2024-12-25',
                end_time: '17:00:00',
                location: 'Phòng thiết kế 205',
                organizer: 'Khoa Mỹ thuật ứng dụng',
                category: 'Workshop',
                department: 'Mỹ thuật',
                max_participants: 30,
                current_participants: 18,
                status: 'upcoming',
                image_url: 'https://images.unsplash.com/photo-1475721027785-f74eccf877e2?w=800&h=400&fit=crop',
                is_active: true,
                created_at: new Date('2024-10-01'),
                updated_at: new Date('2024-10-01')
            },
            {
                id: 4,
                title: 'Khóa học Tiếng Anh giao tiếp',
                description: 'Khóa học 12 buổi giúp nâng cao kỹ năng giao tiếp tiếng Anh trong môi trường học tập và làm việc.',
                start_date: '2024-11-15',
                start_time: '18:00:00',
                end_date: '2024-12-15',
                end_time: '20:00:00',
                location: 'Phòng 401 - Tòa B',
                organizer: 'Khoa Ngoại ngữ',
                category: 'Khóa học',
                department: 'Ngoại ngữ',
                max_participants: 25,
                current_participants: 25,
                status: 'ongoing',
                image_url: 'https://images.unsplash.com/photo-1523580494863-6f3031224c94?w=800&h=400&fit=crop',
                is_active: true,
                created_at: new Date('2024-09-01'),
                updated_at: new Date('2024-11-01')
            },
            {
                id: 5,
                title: 'Hội thảo Khởi nghiệp',
                description: 'Hội thảo chia sẻ kinh nghiệm khởi nghiệp từ các doanh nhân thành công và các quỹ đầu tư.',
                start_date: '2024-10-15',
                start_time: '14:00:00',
                end_date: '2024-10-15',
                end_time: '17:00:00',
                location: 'Hội trường B - Tòa nhà chính',
                organizer: 'Khoa Kinh tế',
                category: 'Hội thảo',
                department: 'Kinh tế',
                max_participants: 150,
                current_participants: 150,
                status: 'completed',
                image_url: 'https://images.unsplash.com/photo-1505373877841-8d25f7d46678?w=800&h=400&fit=crop',
                is_active: true,
                created_at: new Date('2024-09-01'),
                updated_at: new Date('2024-10-15')
            }
        ];
    }
}

// Create global API service instance
const apiService = new APIService();

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = APIService;
}