// Modern Event Management App with Enhanced UI/UX
class EventApp {
    constructor() {
        this.currentUser = null;
        this.events = [];
        this.filteredEvents = [];
        this.currentPage = 1;
        this.eventsPerPage = 6;
        this.loading = false;
        this.animations = {
            enabled: !window.matchMedia('(prefers-reduced-motion: reduce)').matches
        };
        
        // Initialize app with modern features
        this.init();
    }

    // Initialize application with enhanced setup
    async init() {
        console.log('🚀 Modern Event Management App initialized');
        
        // Show loading state
        this.showGlobalLoading();
        
        // Set up global error handling
        this.setupErrorHandling();
        
        // Check authentication status
        this.checkAuthStatus();
        
        // Set up global event listeners
        this.setupGlobalListeners();
        
        // Initialize modern UI features
        await this.initializeModernFeatures();
        
        // Hide loading state
        this.hideGlobalLoading();
        
        // Animate page entry
        if (this.animations.enabled) {
            this.animatePageEntry();
        }
    }

    // Initialize modern UI features
    async initializeModernFeatures() {
        // Setup smooth scrolling
        this.setupSmoothScrolling();
        
        // Setup intersection observer for animations
        this.setupScrollAnimations();
        
        // Setup enhanced form interactions
        this.setupEnhancedForms();
        
        // Setup keyboard navigation
        this.setupKeyboardNavigation();
        
        // Setup theme detection
        this.setupThemeDetection();
        
        console.log('✨ Modern UI features initialized');
    }

    // Setup global error handling with modern UX
    setupErrorHandling() {
        window.addEventListener('error', (event) => {
            console.error('❌ Global error:', event.error);
            this.showModernAlert('Đã xảy ra lỗi không mong muốn', 'error');
        });

        window.addEventListener('unhandledrejection', (event) => {
            console.error('❌ Unhandled promise rejection:', event.reason);
            this.showModernAlert('Đã xảy ra lỗi trong quá trình xử lý', 'error');
        });
    }

    // Show global loading state
    showGlobalLoading() {
        const loadingHtml = `
            <div id="globalLoading" class="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center" 
                 style="background: rgba(255,255,255,0.95); z-index: 9999; backdrop-filter: blur(5px);">
                <div class="text-center">
                    <div class="spinner mb-3"></div>
                    <p class="text-muted">Đang tải...</p>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', loadingHtml);
    }

    // Hide global loading state
    hideGlobalLoading() {
        const loading = document.getElementById('globalLoading');
        if (loading) {
            if (this.animations.enabled) {
                loading.style.opacity = '0';
                setTimeout(() => loading.remove(), 300);
            } else {
                loading.remove();
            }
        }
    }

    // Setup smooth scrolling
    setupSmoothScrolling() {
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', (e) => {
                e.preventDefault();
                const target = document.querySelector(anchor.getAttribute('href'));
                if (target) {
                    target.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start'
                    });
                }
            });
        });
    }

    // Setup scroll animations with Intersection Observer
    setupScrollAnimations() {
        if (!this.animations.enabled) return;

        const observerOptions = {
            threshold: 0.1,
            rootMargin: '0px 0px -50px 0px'
        };

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('animate-in');
                    observer.unobserve(entry.target);
                }
            });
        }, observerOptions);

        // Observe elements for animation
        document.querySelectorAll('.card, .feature-icon, .btn').forEach(el => {
            el.classList.add('animate-on-scroll');
            observer.observe(el);
        });
    }

    // Setup enhanced form interactions
    setupEnhancedForms() {
        document.querySelectorAll('input, textarea, select').forEach(input => {
            // Add focus effects
            input.addEventListener('focus', () => {
                input.parentElement.classList.add('form-group-focused');
            });

            input.addEventListener('blur', () => {
                input.parentElement.classList.remove('form-group-focused');
            });

            // Add input validation feedback
            input.addEventListener('input', () => {
                this.validateField(input);
            });
        });
    }

    // Setup keyboard navigation
    setupKeyboardNavigation() {
        document.addEventListener('keydown', (e) => {
            // ESC key handling
            if (e.key === 'Escape') {
                this.closeAllModals();
            }

            // Alt + key shortcuts
            if (e.altKey) {
                switch(e.key) {
                    case 'h':
                        e.preventDefault();
                        window.location.href = '/';
                        break;
                    case 'e':
                        e.preventDefault();
                        window.location.href = '/events';
                        break;
                    case 'l':
                        e.preventDefault();
                        if (!this.currentUser) {
                            window.location.href = '/login';
                        }
                        break;
                }
            }
        });
    }

    // Setup theme detection
    setupThemeDetection() {
        const darkModeQuery = window.matchMedia('(prefers-color-scheme: dark)');
        
        const handleThemeChange = (e) => {
            document.body.classList.toggle('dark-mode', e.matches);
            console.log('🎨 Theme changed to:', e.matches ? 'dark' : 'light');
        };

        darkModeQuery.addListener(handleThemeChange);
        handleThemeChange(darkModeQuery);
    }

    // Animate page entry
    animatePageEntry() {
        document.body.style.opacity = '0';
        document.body.style.transform = 'translateY(20px)';
        
        setTimeout(() => {
            document.body.style.transition = 'all 0.5s ease-out';
            document.body.style.opacity = '1';
            document.body.style.transform = 'translateY(0)';
        }, 100);
    }

    // Modern alert system
    showModernAlert(message, type = 'info', duration = 5000) {
        const alertId = 'alert-' + Date.now();
        const iconMap = {
            success: 'bi-check-circle-fill',
            error: 'bi-exclamation-triangle-fill',
            warning: 'bi-exclamation-circle-fill',
            info: 'bi-info-circle-fill'
        };

        const alertHtml = `
            <div id="${alertId}" class="alert alert-${type} alert-dismissible fade show position-fixed" 
                 style="top: 20px; right: 20px; z-index: 9999; min-width: 300px; box-shadow: var(--box-shadow-lg);">
                <i class="bi ${iconMap[type]} me-2"></i>
                ${message}
                <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', alertHtml);

        // Auto-dismiss after duration
        setTimeout(() => {
            const alert = document.getElementById(alertId);
            if (alert) {
                alert.classList.remove('show');
                setTimeout(() => alert.remove(), 150);
            }
        }, duration);
    }

    // Validate form field with modern feedback
    validateField(field) {
        const value = field.value.trim();
        const type = field.type;
        let isValid = true;
        let message = '';

        // Basic validation
        if (field.required && !value) {
            isValid = false;
            message = 'Trường này là bắt buộc';
        } else if (type === 'email' && value && !this.isValidEmail(value)) {
            isValid = false;
            message = 'Email không hợp lệ';
        } else if (type === 'password' && value && value.length < 6) {
            isValid = false;
            message = 'Mật khẩu phải có ít nhất 6 ký tự';
        }

        // Update field appearance
        field.classList.toggle('is-invalid', !isValid);
        field.classList.toggle('is-valid', isValid && value);

        // Show/hide feedback
        let feedback = field.parentElement.querySelector('.invalid-feedback');
        if (!isValid && message) {
            if (!feedback) {
                feedback = document.createElement('div');
                feedback.className = 'invalid-feedback';
                field.parentElement.appendChild(feedback);
            }
            feedback.textContent = message;
        } else if (feedback) {
            feedback.remove();
        }

        return isValid;
    }

    // Close all modals
    closeAllModals() {
        document.querySelectorAll('.modal.show').forEach(modal => {
            const bsModal = bootstrap.Modal.getInstance(modal);
            if (bsModal) {
                bsModal.hide();
            }
        });
    }

    // Email validation helper
    isValidEmail(email) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    }

    // Check authentication status
    checkAuthStatus() {
        const token = localStorage.getItem('authToken');
        const userData = localStorage.getItem('user');
        
        if (token && userData) {
            this.currentUser = JSON.parse(userData);
            this.updateNavbar(true);
            console.log('✅ User authenticated:', this.currentUser.name);
        } else {
            this.currentUser = null;
            this.updateNavbar(false);
            console.log('ℹ️ User not authenticated');
        }
    }

    // Update navigation bar based on auth status
    updateNavbar(isAuthenticated) {
        const userDropdown = document.getElementById('userDropdown');
        const loginButton = document.getElementById('loginButton');
        const registerButton = document.getElementById('registerButton');
        const userNameDisplay = document.getElementById('userNameDisplay');

        if (isAuthenticated && this.currentUser) {
            if (userDropdown) userDropdown.style.display = 'block';
            if (loginButton) loginButton.style.display = 'none';
            if (registerButton) registerButton.style.display = 'none';
            if (userNameDisplay) userNameDisplay.textContent = this.currentUser.name;
        } else {
            if (userDropdown) userDropdown.style.display = 'none';
            if (loginButton) loginButton.style.display = 'block';
            if (registerButton) registerButton.style.display = 'block';
        }
    }

    // Setup global event listeners
    setupGlobalListeners() {
        // Handle form submissions
        document.addEventListener('submit', (e) => {
            if (e.target.matches('.prevent-default')) {
                e.preventDefault();
            }
        });
    }

    // Navigation handler
    navigate(path) {
        history.pushState(null, '', path);
        this.handleRouteChange();
    }

    // Handle route changes
    handleRouteChange() {
        const path = window.location.pathname;
        console.log('🗺️ Navigating to:', path);

        switch (path) {
            case '/':
                this.loadHomePage();
                break;
            case '/events':
                this.loadEventsPage();
                break;
            case '/login':
                this.loadLoginPage();
                break;
            case '/register':
                this.loadRegisterPage();
                break;
            default:
                if (path.startsWith('/events/')) {
                    const eventId = path.split('/')[2];
                    this.loadEventDetailPage(eventId);
                }
                break;
        }
    }

    // Load homepage
    async loadHomePage() {
        try {
            console.log('🏠 Loading homepage');
            
            // Load latest events for homepage
            await this.loadLatestEvents();
            
            // Load statistics
            await this.loadStatistics();
            
        } catch (error) {
            console.error('❌ Error loading homepage:', error);
        }
    }

    // Load events page
    async loadEventsPage() {
        try {
            console.log('📅 Loading events page');
            
            // Load all events
            this.events = await apiService.getEvents();
            this.filteredEvents = [...this.events];
            
            // Display events if we're on events page
            if (document.getElementById('eventsContainer')) {
                this.displayEvents();
                this.setupPagination();
            }
            
        } catch (error) {
            console.error('❌ Error loading events page:', error);
            this.showAlert('Không thể tải danh sách sự kiện', 'error');
        }
    }

    // Load latest events for homepage
    async loadLatestEvents() {
        try {
            const events = await apiService.getEvents();
            const latestEvents = events.slice(0, 3);
            
            const container = document.getElementById('latestEvents');
            if (!container) return;
            
            if (latestEvents.length === 0) {
                container.innerHTML = `
                    <div class="col-12 text-center">
                        <div class="alert alert-info">
                            <i class="bi bi-info-circle me-2"></i>
                            Chưa có sự kiện nào được tổ chức
                        </div>
                    </div>
                `;
                return;
            }
            
            container.innerHTML = latestEvents.map(event => this.createEventCard(event, true)).join('');
            
        } catch (error) {
            console.error('❌ Error loading latest events:', error);
            const container = document.getElementById('latestEvents');
            if (container) {
                container.innerHTML = `
                    <div class="col-12">
                        <div class="alert alert-danger">
                            <i class="bi bi-exclamation-triangle me-2"></i>
                            Không thể tải danh sách sự kiện
                        </div>
                    </div>
                `;
            }
        }
    }

    // Load statistics
    async loadStatistics() {
        try {
            const stats = await apiService.getStatistics();
            
            // Animate counters
            this.animateCounter('totalEvents', stats.totalEvents || 0);
            this.animateCounter('upcomingEvents', stats.upcomingEvents || 0);
            this.animateCounter('completedEvents', stats.completedEvents || 0);
            this.animateCounter('totalParticipants', stats.totalParticipants || 0);
            
        } catch (error) {
            console.error('❌ Error loading statistics:', error);
        }
    }

    // Create event card HTML
    createEventCard(event, isHomepage = false) {
        const cardClass = isHomepage ? 'col-md-4' : 'col-lg-4 col-md-6';
        
        return `
            <div class="${cardClass} mb-4">
                <div class="card h-100 shadow-sm event-card">
                    <img src="${event.image_url || '/images/default-event.jpg'}" 
                         class="card-img-top" alt="${event.title}" style="height: 200px; object-fit: cover;">
                    
                    <div class="card-body d-flex flex-column">
                        <div class="mb-2">
                            <span class="badge bg-${this.getCategoryColor(event.category)} me-2">${event.category}</span>
                            <span class="badge bg-${this.getStatusColor(event.status)}">${this.getStatusText(event.status)}</span>
                        </div>
                        
                        <h5 class="card-title">${event.title || 'Untitled Event'}</h5>
                        <p class="card-text flex-grow-1">${this.safeSubstring(event.description, isHomepage ? 100 : 120)}</p>
                        
                        <div class="mb-3">
                            <div class="mb-2">
                                <small class="text-muted">
                                    <i class="bi bi-calendar me-1"></i>${this.formatDate(event.start_date)}
                                    <i class="bi bi-clock ms-2 me-1"></i>${event.start_time}
                                </small>
                            </div>
                            <div class="mb-2">
                                <small class="text-muted">
                                    <i class="bi bi-geo-alt me-1"></i>${event.location}
                                </small>
                            </div>
                            ${!isHomepage ? `
                                <div class="mb-2">
                                    <small class="text-muted">
                                        <i class="bi bi-building me-1"></i>${event.organizer}
                                    </small>
                                </div>
                            ` : ''}
                        </div>
                        
                        <div class="mt-auto">
                            ${!isHomepage ? `
                                <div class="progress mb-2" style="height: 6px;">
                                    <div class="progress-bar" role="progressbar" 
                                         style="width: ${(event.current_participants / event.max_participants) * 100}%">
                                    </div>
                                </div>
                            ` : ''}
                            <div class="d-flex justify-content-between align-items-center mb-3">
                                <small class="text-muted">${event.current_participants}/${event.max_participants} người${!isHomepage ? ' tham gia' : ''}</small>
                                ${!isHomepage ? `<small class="text-muted">${Math.round((event.current_participants / event.max_participants) * 100)}%</small>` : ''}
                            </div>
                            
                            <div class="${isHomepage ? '' : 'd-grid gap-2'}">
                                <${isHomepage ? 'a' : 'button'} 
                                    ${isHomepage ? `href="/events/${event.id}"` : `onclick="showEventDetail(${event.id})"`}
                                    class="btn btn-${isHomepage ? 'primary' : 'outline-primary'} btn-sm">
                                    <i class="bi bi-eye me-1"></i>Xem chi tiết
                                </${isHomepage ? 'a' : 'button'}>
                                
                                ${!isHomepage && event.status === 'upcoming' && event.current_participants < event.max_participants ? 
                                    `<button class="btn btn-primary btn-sm" onclick="showRegistrationModal(${event.id})">
                                        <i class="bi bi-plus-circle me-1"></i>Đăng ký tham gia
                                    </button>` : 
                                    !isHomepage ? `<button class="btn btn-secondary btn-sm" disabled>
                                        ${event.current_participants >= event.max_parameters ? 'Đã đầy' : 'Không thể đăng ký'}
                                    </button>` : ''
                                }
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    // Display events with current filters and pagination
    displayEvents() {
        const container = document.getElementById('eventsContainer');
        if (!container) return;
        
        if (this.filteredEvents.length === 0) {
            container.innerHTML = `
                <div class="col-12 text-center">
                    <div class="alert alert-info">
                        <i class="bi bi-info-circle me-2"></i>
                        Không tìm thấy sự kiện nào phù hợp
                    </div>
                </div>
            `;
            return;
        }

        const startIndex = (this.currentPage - 1) * this.eventsPerPage;
        const endIndex = startIndex + this.eventsPerPage;
        const eventsToShow = this.filteredEvents.slice(startIndex, endIndex);

        container.innerHTML = eventsToShow.map(event => this.createEventCard(event, false)).join('');
    }

    // Setup pagination
    setupPagination() {
        const totalPages = Math.ceil(this.filteredEvents.length / this.eventsPerPage);
        const pagination = document.getElementById('pagination');
        
        if (!pagination || totalPages <= 1) {
            if (pagination) pagination.innerHTML = '';
            return;
        }

        let paginationHTML = '';
        
        // Previous button
        paginationHTML += `
            <li class="page-item ${this.currentPage === 1 ? 'disabled' : ''}">
                <a class="page-link" href="#" onclick="eventApp.changePage(${this.currentPage - 1})">
                    <i class="bi bi-chevron-left"></i>
                </a>
            </li>
        `;
        
        // Page numbers
        for (let i = 1; i <= totalPages; i++) {
            if (i === 1 || i === totalPages || (i >= this.currentPage - 2 && i <= this.currentPage + 2)) {
                paginationHTML += `
                    <li class="page-item ${i === this.currentPage ? 'active' : ''}">
                        <a class="page-link" href="#" onclick="eventApp.changePage(${i})">${i}</a>
                    </li>
                `;
            } else if (i === this.currentPage - 3 || i === this.currentPage + 3) {
                paginationHTML += `<li class="page-item disabled"><span class="page-link">...</span></li>`;
            }
        }
        
        // Next button
        paginationHTML += `
            <li class="page-item ${this.currentPage === totalPages ? 'disabled' : ''}">
                <a class="page-link" href="#" onclick="eventApp.changePage(${this.currentPage + 1})">
                    <i class="bi bi-chevron-right"></i>
                </a>
            </li>
        `;
        
        pagination.innerHTML = paginationHTML;
    }

    // Change page
    changePage(page) {
        const totalPages = Math.ceil(this.filteredEvents.length / this.eventsPerPage);
        if (page < 1 || page > totalPages) return;
        
        this.currentPage = page;
        this.displayEvents();
        this.setupPagination();
        
        // Scroll to top
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    // Animate counter
    animateCounter(elementId, targetValue) {
        const element = document.getElementById(elementId);
        if (!element) return;
        
        let currentValue = 0;
        const increment = targetValue / 20;
        
        const timer = setInterval(() => {
            currentValue += increment;
            if (currentValue >= targetValue) {
                currentValue = targetValue;
                clearInterval(timer);
            }
            element.textContent = Math.floor(currentValue);
        }, 50);
    }

    // Utility methods
    // Safe substring helper function
    safeSubstring(text, maxLength) {
        if (!text) return 'Không có mô tả';
        const str = text.toString();
        if (str.length <= maxLength) return str;
        return str.substring(0, maxLength) + '...';
    }

    formatDate(dateString) {
        if (!dateString) return 'TBD';
        const date = new Date(dateString);
        return date.toLocaleDateString('vi-VN');
    }

    getCategoryColor(category) {
        switch (category) {
            case 'Hội thảo': return 'info';
            case 'Cuộc thi': return 'warning';
            case 'Workshop': return 'success';
            case 'Khóa học': return 'primary';
            default: return 'secondary';
        }
    }

    getStatusColor(status) {
        switch (status) {
            case 'upcoming': return 'primary';
            case 'ongoing': return 'success';
            case 'completed': return 'secondary';
            case 'cancelled': return 'danger';
            default: return 'secondary';
        }
    }

    getStatusText(status) {
        switch (status) {
            case 'upcoming': return 'Sắp diễn ra';
            case 'ongoing': return 'Đang diễn ra';
            case 'completed': return 'Đã hoàn thành';
            case 'cancelled': return 'Đã hủy';
            default: return 'Không xác định';
        }
    }

    // Show alert message
    showAlert(message, type = 'info') {
        const alertDiv = document.createElement('div');
        alertDiv.className = `alert alert-${type === 'error' ? 'danger' : type} alert-dismissible fade show position-fixed`;
        alertDiv.style.cssText = 'top: 20px; right: 20px; z-index: 9999; min-width: 300px;';
        alertDiv.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
        
        document.body.appendChild(alertDiv);
        
        setTimeout(() => {
            if (alertDiv.parentNode) {
                alertDiv.parentNode.removeChild(alertDiv);
            }
        }, 5000);
    }

    // Logout user
    async logout() {
        try {
            await apiService.logout();
            this.currentUser = null;
            this.updateNavbar(false);
            this.showAlert('Đã đăng xuất thành công', 'success');
            this.navigate('/');
        } catch (error) {
            console.error('❌ Logout error:', error);
            this.showAlert('Có lỗi xảy ra khi đăng xuất', 'error');
        }
    }

    async loadLoginPage() {
        console.log('🔐 Loading login page');
        try {
            const container = document.getElementById('content');
            if (!container) return;

            container.innerHTML = `
                <div class="row justify-content-center">
                    <div class="col-md-6 col-lg-4">
                        <div class="card shadow">
                            <div class="card-body p-5">
                                <div class="text-center mb-4">
                                    <i class="bi bi-box-arrow-in-right display-4 text-primary mb-3"></i>
                                    <h2 class="h3 mb-3">Đăng nhập</h2>
                                    <p class="text-muted">Đăng nhập để tham gia các sự kiện</p>
                                </div>
                                <form id="loginForm">
                                    <div class="mb-3">
                                        <label for="loginEmail" class="form-label">Email</label>
                                        <input type="email" class="form-control" id="loginEmail" required>
                                    </div>
                                    <div class="mb-3">
                                        <label for="loginPassword" class="form-label">Mật khẩu</label>
                                        <input type="password" class="form-control" id="loginPassword" required>
                                    </div>
                                    <div class="d-grid">
                                        <button type="submit" class="btn btn-primary">Đăng nhập</button>
                                    </div>
                                </form>
                                <div class="text-center mt-3">
                                    <p class="mb-0">Chưa có tài khoản? <a href="/register" data-route="/register" class="text-decoration-none">Đăng ký ngay</a></p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;

        } catch (error) {
            console.error('❌ Error loading login page:', error);
        }
    }

    async loadRegisterPage() {
        console.log('📝 Loading register page');
        try {
            const container = document.getElementById('content');
            if (!container) return;

            container.innerHTML = `
                <div class="row justify-content-center">
                    <div class="col-md-8 col-lg-6">
                        <div class="card shadow">
                            <div class="card-body p-5">
                                <div class="text-center mb-4">
                                    <i class="bi bi-person-plus display-4 text-primary mb-3"></i>
                                    <h2 class="h3 mb-3">Đăng ký tài khoản</h2>
                                    <p class="text-muted">Tạo tài khoản để tham gia các sự kiện</p>
                                </div>
                                <form id="registerForm">
                                    <div class="row">
                                        <div class="col-md-6 mb-3">
                                            <label for="regFullName" class="form-label">Họ và tên</label>
                                            <input type="text" class="form-control" id="regFullName" required>
                                        </div>
                                        <div class="col-md-6 mb-3">
                                            <label for="regStudentId" class="form-label">Mã sinh viên</label>
                                            <input type="text" class="form-control" id="regStudentId" required>
                                        </div>
                                    </div>
                                    <div class="mb-3">
                                        <label for="regEmail" class="form-label">Email</label>
                                        <input type="email" class="form-control" id="regEmail" required>
                                    </div>
                                    <div class="mb-3">
                                        <label for="regPhone" class="form-label">Số điện thoại</label>
                                        <input type="tel" class="form-control" id="regPhone" required>
                                    </div>
                                    <div class="mb-3">
                                        <label for="regDepartment" class="form-label">Khoa</label>
                                        <select class="form-select" id="regDepartment" required>
                                            <option value="">Chọn khoa</option>
                                            <option value="CNTT">Công nghệ thông tin</option>
                                            <option value="KT">Kế toán</option>
                                            <option value="QT">Quản trị kinh doanh</option>
                                            <option value="MT">Mỹ thuật ứng dụng</option>
                                        </select>
                                    </div>
                                    <div class="row">
                                        <div class="col-md-6 mb-3">
                                            <label for="regPassword" class="form-label">Mật khẩu</label>
                                            <input type="password" class="form-control" id="regPassword" required>
                                        </div>
                                        <div class="col-md-6 mb-3">
                                            <label for="regConfirmPassword" class="form-label">Xác nhận mật khẩu</label>
                                            <input type="password" class="form-control" id="regConfirmPassword" required>
                                        </div>
                                    </div>
                                    <div class="mb-3 form-check">
                                        <input type="checkbox" class="form-check-input" id="regAgreeTerms" required>
                                        <label class="form-check-label" for="regAgreeTerms">
                                            Tôi đồng ý với điều khoản sử dụng
                                        </label>
                                    </div>
                                    <div class="d-grid">
                                        <button type="submit" class="btn btn-primary">Đăng ký</button>
                                    </div>
                                </form>
                                <div class="text-center mt-3">
                                    <p class="mb-0">Đã có tài khoản? <a href="/login" data-route="/login" class="text-decoration-none">Đăng nhập ngay</a></p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;

        } catch (error) {
            console.error('❌ Error loading register page:', error);
        }
    }
}

// Global functions for inline event handlers
function logout() {
    if (window.eventApp) {
        window.eventApp.logout();
    }
}

function showEventDetail(eventId) {
    if (typeof window.showEventDetail === 'function') {
        window.showEventDetail(eventId);
    }
}

function showRegistrationModal(eventId) {
    if (typeof window.showRegistrationModal === 'function') {
        window.showRegistrationModal(eventId);
    }
}

function submitRegistration() {
    if (typeof window.submitRegistration === 'function') {
        window.submitRegistration();
    }
}

function applyFilters() {
    if (typeof window.applyFilters === 'function') {
        window.applyFilters();
    }
}

function clearFilters() {
    if (typeof window.clearFilters === 'function') {
        window.clearFilters();
    }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    window.eventApp = new EventApp();
    console.log('✅ Event Management App ready');
});