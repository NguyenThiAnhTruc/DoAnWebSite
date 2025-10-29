const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const database = require('./config/database');

// Import notification scheduler
const notificationScheduler = require('./services/notification-scheduler');

// Import routes
const authRoutes = require('./routes/auth');
const eventRoutes = require('./routes/events');
const attendanceRoutes = require('./routes/attendance');
const usersRoutes = require('./routes/users');
const messagesRoutes = require('./routes/messages');

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize database connection
database.connect()
    .then(() => console.log('✅ Connected to database'))
    .catch(err => {
        console.error('❌ Database connection failed:', err);
        process.exit(1);
    });

// Configure middleware
const corsOptions = {
    origin: process.env.NODE_ENV === 'production' 
        ? ['https://yourdomain.com'] 
        : ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:5173'],
    credentials: true
};

const helmetConfig = process.env.NODE_ENV === 'production' ? {
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.tailwindcss.com", "https://unpkg.com"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://cdn.tailwindcss.com"],
            imgSrc: ["'self'", "data:", "https://images.unsplash.com"],
            fontSrc: ["'self'", "data:"],
            connectSrc: ["'self'"]
        }
    }
} : {
    contentSecurityPolicy: false
};

const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 200, // Tăng từ 100 lên 200 requests
    message: { success: false, message: 'Too many requests, please try again later' },
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

// Apply middleware
app.use(cors(corsOptions));
app.use(helmet(helmetConfig));
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use('/api/', apiLimiter);

// Set up logging
if (process.env.NODE_ENV !== 'test') {
    app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
}

// Set up static file serving
const staticOptions = {
    setHeaders: (res, path, stat) => {
        if (process.env.NODE_ENV !== 'production') {
            res.set({
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0'
            });
        }
    }
};

app.use(express.static(path.join(__dirname, 'public'), staticOptions));
app.use('/uploads', express.static(path.join(__dirname, 'uploads'), staticOptions));

// Configure view engine and directory
app.set('views', path.join(__dirname, 'views'));

// Set up API routes
app.use('/api/auth', authRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/messages', messagesRoutes);

// HTML route handlers
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'HomePage.html'));
});

app.get('/HomePage.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'HomePage.html'));
});

app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'Login.html'));
});

app.get('/Login.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'Login.html'));
});

app.get('/register', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'Register.html'));
});

app.get('/Register.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'Register.html'));
});

app.get('/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'AdminDashboard.html'));
});

app.get('/Dashboard.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'AdminDashboard.html'));
});

app.get('/events', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'EventList.html'));
});

app.get('/EventList.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'EventList.html'));
});

app.get('/attendance', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'AttendanceManager.html'));
});

app.get('/AttendanceManager.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'AttendanceManager.html'));
});

app.get('/messages', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'MessagingSystem.html'));
});

app.get('/MessagingSystem.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'MessagingSystem.html'));
});

app.get('/support', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'ContactSupport.html'));
});

app.get('/contact', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'ContactSupport.html'));
});

app.get('/ContactSupport.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'ContactSupport.html'));
});

// Routes handled by routeMap below

// Duplicate middleware removed - already configured above

// Logging middleware
if (process.env.NODE_ENV !== 'test') {
    app.use(morgan('combined'));
}

// Serve static files - CSS, JS, images from public directory with no-cache in development
app.use(express.static(path.join(__dirname, 'public'), {
    setHeaders: (res, path, stat) => {
        if (process.env.NODE_ENV !== 'production') {
            res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
            res.set('Pragma', 'no-cache');
            res.set('Expires', '0');
        }
    }
}));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Set views directory for HTML files
app.set('views', path.join(__dirname, 'views'));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/notifications', require('./routes/notifications'));

// HTML routes
// Error handling middleware

// Statistics endpoint
app.get('/api/statistics', async (req, res) => {
    try {
        // Mock statistics data for development
        const stats = {
            totalEvents: 25,
            upcomingEvents: 8,
            completedEvents: 15,
            totalParticipants: 1248,
            activeUsers: 156,
            thisMonthEvents: 12,
            recentActivity: [
                {
                    type: 'event_created',
                    title: 'Workshop AI & Machine Learning',
                    time: '2 hours ago'
                },
                {
                    type: 'registration',
                    title: 'Hội thảo CNTT 2024',
                    time: '4 hours ago'
                },
                {
                    type: 'event_completed',
                    title: 'Cuộc thi Lập trình',
                    time: '1 day ago'
                }
            ]
        };
        
        res.json({
            success: true,
            data: stats
        });
    } catch (error) {
        console.error('Statistics error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// API info endpoint
app.get('/api', (req, res) => {
    res.json({
        success: true,
        message: 'School Event Management API',
        version: '1.0.0',
        endpoints: {
            auth: '/api/auth',
            events: '/api/events',
            attendance: '/api/attendance',
            health: '/api/health'
        }
    });
});

// Favicon handler (prevent 404)
app.get('/favicon.ico', (req, res) => {
    res.status(204).send();
});

// Health check endpoint
app.get('/api/health', async (req, res) => {
    try {
        // Test database connection
        const db = await database.getConnection();
        const result = await db.request().execute('SELECT 1 as test');
        
        res.json({
            success: true,
            message: 'Server is healthy',
            timestamp: new Date().toISOString(),
            database: 'connected'
        });
    } catch (error) {
        console.error('Health check failed:', error);
        res.status(500).json({
            success: false,
            message: 'Database connection failed',
            timestamp: new Date().toISOString(),
            database: 'disconnected',
            error: error.message
        });
    }
});

// Define routes and their corresponding HTML files
const routeMap = {
    '/': 'HomePage.html',
    '/login': 'Login.html',
    '/register': 'Register.html',
    '/dashboard': 'HomePage.html',
    '/admin': 'AdminDashboard.html',
    '/events': 'EventList.html',
    '/events/new': 'EventForm.html',
    '/events/:id': 'EventDetail.html',
    '/events/:id/edit': 'EventForm.html',
    '/attendance': 'AttendanceManager.html',
    '/qr-checkin': 'QRCheckInPage.html',
    '/qr-attendance': 'QRAttendance_new.html',
    '/student-qr-login': 'StudentQRLogin.html',
    '/student-qr-scanner': 'StudentQRScanner.html',
    '/change-password': 'ChangePasswordModal.html',
    '/messages': 'MessagingSystem.html',
    '/notifications': 'NotificationDropdown.html',
    '/support': 'ContactSupport.html',
    '/contact': 'ContactSupport.html',
    '/profile': 'UserProfile.html'
};

// Set up route handlers
Object.entries(routeMap).forEach(([route, htmlFile]) => {
    app.get(route, (req, res) => {
        res.sendFile(path.join(__dirname, 'views', htmlFile));
    });
});

// Duplicate API endpoints removed - already defined above

// Handle direct .html file requests
app.get('/*.html', (req, res, next) => {
    const fileName = path.basename(req.path);
    const filePath = path.join(__dirname, 'views', fileName);
    
    // Check if file exists
    const fs = require('fs');
    if (fs.existsSync(filePath)) {
        res.sendFile(filePath);
    } else {
        next();
    }
});

// API 404 handler
app.use('/api/*', (req, res) => {
    res.status(404).json({
        success: false,
        message: 'API endpoint not found'
    });
});

// Error handlers
app.use((err, req, res, next) => {
    console.error('Error:', err);

    if (req.path.startsWith('/api/')) {
        // API error response
        return res.status(err.status || 500).json({
            success: false,
            message: process.env.NODE_ENV === 'production' 
                ? 'Internal server error' 
                : err.message,
            ...(process.env.NODE_ENV !== 'production' && { 
                stack: err.stack,
                details: err.details 
            })
        });
    }

    // Frontend error response
    res.status(err.status || 500).sendFile(path.join(__dirname, 'views', '404.html'));
});

// Catch-all 404 handler
app.use((req, res) => {
    if (req.accepts('html')) {
        res.status(404).sendFile(path.join(__dirname, 'views', '404.html'));
    } else {
        res.status(404).json({ 
            success: false, 
            message: 'Not Found' 
        });
    }
});

// Graceful shutdown handler
const gracefulShutdown = async (signal) => {
    console.log(`\n� ${signal} received, starting graceful shutdown...`);
    try {
        // Stop notification scheduler
        notificationScheduler.stop();
        
        await database.close();
        console.log('✅ Database connection closed');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error during shutdown:', error);
        process.exit(1);
    }
};

// Handle shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught errors
process.on('uncaughtException', (error) => {
    console.error('❌ Uncaught exception:', error);
    gracefulShutdown('UNCAUGHT EXCEPTION');
});

process.on('unhandledRejection', (error) => {
    console.error('❌ Unhandled rejection:', error);
    gracefulShutdown('UNHANDLED REJECTION');
});

// Start server
if (require.main === module) {
    app.listen(PORT, () => {
        console.log('🚀 Server started successfully');
        console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
        console.log(`🔗 API URL: http://localhost:${PORT}/api`);
        console.log(`🌐 Frontend URL: http://localhost:${PORT}`);
        console.log(`⚡ Server is ready to accept connections`);
        
        // Start notification scheduler
        notificationScheduler.start();
    });
}

module.exports = app;