require('dotenv').config();
const express = require('express');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const expressLayouts = require('express-ejs-layouts');
const helmet = require('helmet');
const path = require('path');
const methodOverride = require('method-override');
const connectDB = require('./src/config/database');

const { errorHandler, notFoundHandler } = require('./src/middleware/errorHandler');
const seoMiddleware = require('./src/middleware/seo');
const flash = require('connect-flash');
const {
  createRateLimiter,
  csrfProtection,
  compressionMiddleware,
  requestLogger,
  cacheControl,
  attachViewLocals
} = require('./src/middleware/production');
const siteSettingsMiddleware = require('./src/middleware/siteSettings');
const SitemapService = require('./src/services/SitemapService');
const ScheduledPostService = require('./src/services/ScheduledPostService');
const AdminController = require('./src/controllers/AdminController');
const { isAuthenticated, requireAdmin } = require('./src/middleware/auth');

const routes = require('./src/routes');
const adminRoutes = require('./src/routes/admin');
const apiRoutes = require('./src/routes/api');

const app = express();

connectDB();

app.disable('x-powered-by');

const sessionSecret = process.env.SESSION_SECRET;
if (!sessionSecret) {
  throw new Error('SESSION_SECRET is required for secure sessions.');
}

app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: {
    useDefaults: true,
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: [
        "'self'",
        'https://code.jquery.com',
        'https://cdn.jsdelivr.net',
        'https://cdn.datatables.net',
        'https://www.googletagmanager.com'
      ],
      styleSrc: [
        "'self'",
        "'unsafe-inline'",
        'https://cdn.jsdelivr.net',
        'https://cdn.datatables.net',
        'https://fonts.googleapis.com'
      ],
      fontSrc: [
        "'self'",
        'https://fonts.gstatic.com',
        'https://cdn.jsdelivr.net'
      ],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'", 'https://cdn.jsdelivr.net', 'https://www.google-analytics.com'],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: []
    }
  }
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.use(cacheControl);
app.use(express.static(path.join(__dirname, 'public'), {
  maxAge: '7d',
  etag: true
}));
app.use(methodOverride('_method'));
app.use(requestLogger);
app.use(compressionMiddleware);

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'src/views'));
app.use(expressLayouts);

app.set('layout', 'layouts/main.ejs');
app.set('layout extractScripts', true);
app.set('layout extractStyles', true);

app.use(session({
  secret: sessionSecret,
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: process.env.MONGODB_URI || 'mongodb://localhost:27017/aptitude_booster_club'
  }),
  cookie: {
    maxAge: 1000 * 60 * 60 * 24 * 7,
    httpOnly: true
  }
}));

app.use(flash());
app.use(attachViewLocals);
app.use(siteSettingsMiddleware);
app.use(seoMiddleware);
app.use(csrfProtection);
app.use(createRateLimiter({ windowMs: 15 * 60 * 1000, max: 1000 }));

app.use((req, res, next) => {
  res.locals.currentPage = '';
  if (req.session && req.session.user) {
    res.locals.user = req.session.user;
  }
  res.locals.success = req.flash ? req.flash('success')[0] : null;
  res.locals.error = req.flash ? req.flash('error')[0] : null;
  next();
});

app.get('/images/:asset', (req, res, next) => {
  const asset = req.params.asset;
  const placeholders = {
    'default-avatar.png': {
      bg: '#e2e8f0',
      fg: '#475569',
      label: 'A'
    },
    'placeholder.jpg': {
      bg: '#f1f5f9',
      fg: '#334155',
      label: 'IMG'
    },
    'hero-default.jpg': {
      bg: '#0f172a',
      fg: '#e2e8f0',
      label: 'Hero'
    },
    'og-default.jpg': {
      bg: '#1e293b',
      fg: '#f8fafc',
      label: 'OG'
    },
    'about-hero.jpg': {
      bg: '#dbeafe',
      fg: '#1d4ed8',
      label: 'About'
    }
  };

  const image = placeholders[asset];
  if (!image) {
    return next();
  }

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512" role="img" aria-label="${image.label}">
      <rect width="512" height="512" rx="96" fill="${image.bg}"/>
      <circle cx="256" cy="194" r="86" fill="${image.fg}" opacity="0.18"/>
      <path d="M160 392c0-53 43-96 96-96s96 43 96 96" fill="${image.fg}" opacity="0.18"/>
      <text x="256" y="292" text-anchor="middle" font-family="Arial, sans-serif" font-size="72" font-weight="700" fill="${image.fg}">${image.label}</text>
    </svg>
  `.trim();

  res.type('image/svg+xml');
  return res.send(svg);
});

app.use('/api', apiRoutes);
app.use('/', routes);
app.get('/admin/contacts', isAuthenticated, requireAdmin, (req, res, next) => {
  res.locals.currentPage = 'contacts';
  return AdminController.contacts(req, res, next);
});
app.get('/admin/contacts/:id', isAuthenticated, requireAdmin, (req, res, next) => {
  res.locals.currentPage = 'contacts';
  return AdminController.showContact(req, res, next);
});
app.delete('/admin/contacts/:id', isAuthenticated, requireAdmin, (req, res, next) => {
  res.locals.currentPage = 'contacts';
  return AdminController.deleteContact(req, res, next);
});
app.use('/admin', adminRoutes);

app.get('/sitemap.xml', async (req, res, next) => {
  try {
    const xml = await SitemapService.generateXml();
    res.setHeader('Content-Type', 'application/xml');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    return res.send(xml);
  } catch (error) {
    next(error);
  }
});

app.get('/robots.txt', (req, res) => {
  res.type('text/plain');
  res.send(`User-agent: *
Allow: /
Disallow: /admin/
Disallow: /search
Sitemap: ${(process.env.SITE_URL || 'http://localhost:3000').replace(/\/+$/, '')}/sitemap.xml`);
});

if (process.env.VERCEL !== '1') {
  ScheduledPostService.start();
}

app.use(notFoundHandler);
app.use(errorHandler);

if (require.main === module && process.env.VERCEL !== '1') {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

module.exports = app;
