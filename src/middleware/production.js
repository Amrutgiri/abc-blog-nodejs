const crypto = require('crypto');
const zlib = require('zlib');

function createRateLimiter({ windowMs = 15 * 60 * 1000, max = 100, message = 'Too many requests, please try again later.' } = {}) {
  const buckets = new Map();

  return (req, res, next) => {
    const key = req.ip || req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'global';
    const now = Date.now();
    const bucket = buckets.get(key) || [];
    const fresh = bucket.filter(ts => ts > now - windowMs);
    fresh.push(now);
    buckets.set(key, fresh);

    if (fresh.length > max) {
      return res.status(429).send(message);
    }

    next();
  };
}

function ensureCsrfToken(req) {
  if (!req.session) return null;
  if (!req.session.csrfToken) {
    req.session.csrfToken = crypto.randomBytes(32).toString('hex');
  }
  return req.session.csrfToken;
}

function csrfProtection(req, res, next) {
  const safeMethod = ['GET', 'HEAD', 'OPTIONS'].includes(req.method);
  const token = ensureCsrfToken(req);

  res.locals.csrfToken = token;

  if (safeMethod) {
    return next();
  }

  if (req.path && req.path.startsWith('/api/upload')) {
    const requestToken = req.headers['x-csrf-token'] || req.body?._csrf || req.query?._csrf;
    if (requestToken !== token) {
      return res.status(403).send('Invalid CSRF token');
    }
    return next();
  }

  const requestToken = req.body?._csrf || req.headers['x-csrf-token'] || req.query?._csrf;
  if (!token || requestToken !== token) {
    return res.status(403).send('Invalid CSRF token');
  }

  next();
}

function compressionMiddleware(req, res, next) {
  const originalSend = res.send.bind(res);

  res.send = function sendOverride(body) {
    const acceptEncoding = String(req.headers['accept-encoding'] || '');
    const contentType = String(res.getHeader('Content-Type') || '');
    const compressible = /text\/|json|javascript|xml|svg/i.test(contentType);
    const shouldCompress = req.method === 'GET' && acceptEncoding.includes('gzip') && compressible;

    if (!shouldCompress || body == null) {
      return originalSend(body);
    }

    const input = Buffer.isBuffer(body) ? body : Buffer.from(typeof body === 'string' ? body : String(body));
    if (input.length < 1024) {
      return originalSend(body);
    }

    const gzipped = zlib.gzipSync(input);
    res.setHeader('Content-Encoding', 'gzip');
    res.setHeader('Vary', 'Accept-Encoding');
    res.setHeader('Content-Length', gzipped.length);
    return originalSend(gzipped);
  };

  next();
}

function requestLogger(req, res, next) {
  const startedAt = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - startedAt;
    console.log(`${req.method} ${req.originalUrl} ${res.statusCode} ${duration}ms`);
  });
  next();
}

function cacheControl(req, res, next) {
  if (req.method === 'GET' && /\.(?:css|js|png|jpg|jpeg|gif|webp|svg|ico)$/i.test(req.path)) {
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
  } else if (req.method === 'GET') {
    res.setHeader('Cache-Control', 'no-store');
  }
  next();
}

function attachViewLocals(req, res, next) {
  res.locals.siteUrl = (process.env.SITE_URL || 'http://localhost:3000').replace(/\/+$/, '');
  res.locals.gaId = process.env.GA_MEASUREMENT_ID || '';
  ensureCsrfToken(req);
  next();
}

module.exports = {
  createRateLimiter,
  csrfProtection,
  compressionMiddleware,
  requestLogger,
  cacheControl,
  attachViewLocals,
  ensureCsrfToken
};
