const express = require('express');
const router = express.Router();
const path = require('path');

// Authentication middleware
const authMiddleware = (req, res, next) => {
  const user = req.session?.user;
  if (!user) {
    return res.redirect('/Login.html');
  }
  next();
};

// Admin and Teacher middleware
const adminMiddleware = (req, res, next) => {
  const user = req.session?.user;
  if (!user || (user.role !== 'admin' && user.role !== 'teacher')) {
    return res.redirect('/EventList.html');
  }
  next();
};

// Public routes
router.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../views/HomePage.html'));
});

router.get('/Login.html', (req, res) => {
  res.sendFile(path.join(__dirname, '../views/Login.html'));
});

router.get('/Register.html', (req, res) => {
  res.sendFile(path.join(__dirname, '../views/Register.html'));
});

router.get('/AttendanceSuccess.html', (req, res) => {
  res.sendFile(path.join(__dirname, '../views/AttendanceSuccess.html'));
});

router.get('/StudentQRLogin.html', (req, res) => {
  res.sendFile(path.join(__dirname, '../views/StudentQRLogin.html'));
});

// Protected routes
// Redirect old /Dashboard.html to appropriate page based on role
router.get('/Dashboard.html', authMiddleware, (req, res) => {
  const user = req.session?.user;
  if (user && (user.role === 'admin' || user.role === 'teacher')) {
    return res.redirect('/AdminDashboard.html');
  }
  return res.redirect('/EventList.html');
});

// Redirect /dashboard to /AdminDashboard.html
router.get('/dashboard', authMiddleware, (req, res) => {
  const user = req.session?.user;
  if (user && (user.role === 'admin' || user.role === 'teacher')) {
    return res.redirect('/AdminDashboard.html');
  }
  return res.redirect('/EventList.html');
});

router.get('/UserProfile.html', authMiddleware, (req, res) => {
  res.sendFile(path.join(__dirname, '../views/UserProfile.html'));
});

router.get('/EventList.html', authMiddleware, (req, res) => {
  res.sendFile(path.join(__dirname, '../views/EventList.html'));
});

router.get('/EventDetail.html', authMiddleware, (req, res) => {
  res.sendFile(path.join(__dirname, '../views/EventDetail.html'));
});

// Admin routes
router.get('/AdminDashboard.html', adminMiddleware, (req, res) => {
  res.sendFile(path.join(__dirname, '../views/AdminDashboard.html'));
});

router.get('/EventForm.html', adminMiddleware, (req, res) => {
  res.sendFile(path.join(__dirname, '../views/EventForm.html'));
});

router.get('/AttendanceManager.html', adminMiddleware, (req, res) => {
  res.sendFile(path.join(__dirname, '../views/AttendanceManager.html'));
});

// QR related routes
router.get('/QRCheckInPage.html', authMiddleware, (req, res) => {
  res.sendFile(path.join(__dirname, '../views/QRCheckInPage.html'));
});

router.get('/StudentQRScanner.html', authMiddleware, (req, res) => {
  res.sendFile(path.join(__dirname, '../views/StudentQRScanner.html'));
});

// 404 handler
router.use((req, res) => {
  res.status(404).sendFile(path.join(__dirname, '../views/404.html'));
});

module.exports = router;