const xss = require('xss');

const disposableDomains = new Set([
  '10minutemail.com',
  'dispostable.com',
  'guerrillamail.com',
  'mailinator.com',
  'maildrop.cc',
  'tempmail.com',
  'temp-mail.org',
  'yopmail.com',
  'getnada.com',
  'trashmail.com',
  'sharklasers.com',
  'throwawaymail.com',
  'fakeinbox.com',
  'moakt.com',
  'mintemail.com',
  'emailondeck.com',
  'spambog.com',
  'mailnesia.com'
]);

const disposableFragments = [
  'mailinator',
  'tempmail',
  'temp-mail',
  '10minutemail',
  'guerrillamail',
  'trashmail',
  'dispostable',
  'yopmail',
  'getnada',
  'fakeinbox',
  'throwawaymail',
  'maildrop'
];

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function extractDomain(email) {
  const normalized = normalizeEmail(email);
  const parts = normalized.split('@');
  return parts.length === 2 ? parts[1] : '';
}

function isDisposableEmail(email) {
  const domain = extractDomain(email);
  if (!domain) return false;

  if (disposableDomains.has(domain)) {
    return true;
  }

  return disposableFragments.some((fragment) => domain.includes(fragment));
}

function sanitizeContactText(value) {
  return xss(String(value || '').trim());
}

function buildContactPayload(body = {}, req = {}) {
  return {
    name: sanitizeContactText(body.name),
    email: normalizeEmail(body.email),
    message: sanitizeContactText(body.message),
    source: body.source || 'website-contact',
    ipAddress: req.ip || '',
    userAgent: req.get ? (req.get('user-agent') || '') : ''
  };
}

module.exports = {
  normalizeEmail,
  extractDomain,
  isDisposableEmail,
  sanitizeContactText,
  buildContactPayload,
  disposableDomains: Array.from(disposableDomains)
};
