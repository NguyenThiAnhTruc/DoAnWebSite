function checkAuth(req, res, next) {
  // Add user to response locals for views
  res.locals.user = req.session?.user || null;
  res.locals.isAuthenticated = !!req.session?.user;
  res.locals.isAdmin = req.session?.user?.role === 'admin';
  next();
}

module.exports = checkAuth;