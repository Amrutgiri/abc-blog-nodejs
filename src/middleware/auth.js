const isAuthenticated = (req, res, next) => {
  if (req.session && req.session.user) {
    return next();
  }
  res.redirect('/admin/login');
};

const isGuest = (req, res, next) => {
  if (req.session && req.session.user) {
    return res.redirect('/admin');
  }
  next();
};

const requireUser = (req, res, next) => {
  if (req.session && req.session.user) {
    return next();
  }
  res.redirect(`/auth/login?redirect=${encodeURIComponent(req.originalUrl || '/dashboard')}`);
};

const requireGuest = (req, res, next) => {
  if (req.session && req.session.user) {
    return res.redirect('/dashboard');
  }
  next();
};

const requireAdmin = (req, res, next) => {
  if (req.session && req.session.user && req.session.user.role === 'admin') {
    return next();
  }
  return res.status(403).render('admin/error', {
    layout: false,
    error: 'Access denied',
    statusCode: 403
  });
};

module.exports = { isAuthenticated, isGuest, requireUser, requireGuest, requireAdmin };
