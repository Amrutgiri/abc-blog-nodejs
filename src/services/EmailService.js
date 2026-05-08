const nodemailer = require('nodemailer');
const xss = require('xss');
const SiteSettingsService = require('./SiteSettingsService');

function safe(value) {
  return xss(String(value || ''));
}

function siteUrl() {
  return (process.env.SITE_URL || 'http://localhost:3000').replace(/\/+$/, '');
}

function formatBullets(items = []) {
  return items
    .filter(Boolean)
    .map((item) => `<li style="margin-bottom:10px;">${safe(item)}</li>`)
    .join('');
}

function buildNewsletterTemplate({
  banner,
  title,
  description,
  highlights = [],
  ctaLabel,
  ctaUrl,
  secondaryLabel,
  secondaryUrl,
  unsubscribeUrl,
  footnote
}) {
  const highlightMarkup = highlights.length
    ? `
      <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:16px;padding:18px 20px;margin:24px 0;">
        <p style="margin:0 0 12px;color:#64748b;font-size:12px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;">Highlights</p>
        <ul style="margin:0;padding-left:20px;color:#334155;line-height:1.7;">
          ${formatBullets(highlights)}
        </ul>
      </div>
    `
    : '';

  const secondaryMarkup = secondaryUrl && secondaryLabel
    ? `<a href="${secondaryUrl}" style="display:inline-block;margin-top:12px;color:#0f766e;text-decoration:none;font-weight:700;">${safe(secondaryLabel)}</a>`
    : '';

  return `
    <div style="background:#eef2ff;padding:32px 16px;font-family:Arial,Helvetica,sans-serif;color:#0f172a;">
      <div style="max-width:640px;margin:0 auto;background:#ffffff;border-radius:24px;overflow:hidden;box-shadow:0 20px 60px rgba(15,23,42,.12);">
        <div style="background:linear-gradient(135deg,#0f766e 0%,#1d4ed8 100%);padding:36px 32px;color:#fff;">
          <p style="margin:0 0 10px;font-size:12px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;opacity:.9;">${safe(banner)}</p>
          <h1 style="margin:0;font-size:30px;line-height:1.2;font-weight:800;">${safe(title)}</h1>
          <p style="margin:16px 0 0;font-size:16px;line-height:1.7;opacity:.95;">${safe(description)}</p>
        </div>
        <div style="padding:32px;">
          ${highlightMarkup}
          <a href="${ctaUrl}" style="display:inline-block;background:#111827;color:#fff;text-decoration:none;font-weight:700;padding:14px 22px;border-radius:12px;margin-top:4px;">${safe(ctaLabel)}</a>
          ${secondaryMarkup}
          <p style="margin:26px 0 0;color:#64748b;font-size:14px;line-height:1.7;">${safe(footnote || 'Thanks for being part of our community.')}</p>
        </div>
        <div style="padding:20px 32px 32px;border-top:1px solid #e2e8f0;background:#f8fafc;color:#64748b;font-size:13px;line-height:1.7;">
          <p style="margin:0 0 8px;">You received this email because you subscribed to ${safe(SiteSettingsService.getCachedSettings().siteName)} updates.</p>
          <p style="margin:0;">
            <a href="${unsubscribeUrl}" style="color:#0f766e;text-decoration:none;font-weight:700;">Unsubscribe</a>
            &nbsp;|&nbsp;
            <a href="${siteUrl()}" style="color:#0f766e;text-decoration:none;font-weight:700;">Visit website</a>
          </p>
        </div>
      </div>
    </div>
  `;
}

class EmailService {
  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: process.env.SMTP_PORT || 587,
      secure: false,
      auth: {
        user: process.env.SMTP_USER || 'your-email@gmail.com',
        pass: process.env.SMTP_PASS || 'your-app-password'
      }
    });
  }

  async sendEmail(to, subject, html) {
    try {
      const siteName = SiteSettingsService.getCachedSettings().siteName;
      const info = await this.transporter.sendMail({
        from: `"${safe(siteName)}" <${process.env.SMTP_USER || 'your-email@gmail.com'}>`,
        to,
        subject,
        html
      });
      console.log('Email sent:', info.messageId);
      return true;
    } catch (error) {
      console.error('Email error:', error);
      return false;
    }
  }

  async sendPostPublishedNotification(post, author) {
    const siteName = SiteSettingsService.getCachedSettings().siteName;
    const subject = `New Post Published: ${post.title}`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1D6655;">New Post Published!</h2>
        <p>Hello,</p>
        <p>A new post has been published on <strong>${safe(siteName)}</strong>.</p>
        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0;">${safe(post.title)}</h3>
          <p>${safe(post.excerpt || 'No excerpt available')}</p>
          <p><strong>Author:</strong> ${safe(author.username)}</p>
          <p><strong>Category:</strong> ${safe(post.category?.name || 'Uncategorized')}</p>
        </div>
        <a href="${process.env.SITE_URL || 'http://localhost:3000'}/blog/${post.slug}" style="background: #1D6655; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">View Post</a>
      </div>
    `;
    return this.sendEmail(process.env.ADMIN_EMAIL || 'admin@example.com', subject, html);
  }

  async sendContactNotification(name, email, message) {
    const subject = `New Contact Form Submission from ${name}`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1D6655;">New Contact Form Submission</h2>
        <p><strong>Name:</strong> ${safe(name)}</p>
        <p><strong>Email:</strong> ${safe(email)}</p>
        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p>${safe(message)}</p>
        </div>
      </div>
    `;
    return this.sendEmail(process.env.ADMIN_EMAIL || 'admin@example.com', subject, html);
  }

  async sendWelcomeEmail(user, unsubscribeUrl = '') {
    const siteName = SiteSettingsService.getCachedSettings().siteName;
    if (unsubscribeUrl) {
      return this.sendNewsletterAnnouncementEmail(user, {
        subject: `Welcome to ${siteName}`,
        kind: 'newsletter',
        title: `Welcome, ${safe(user.name || user.username)}!`,
        description: `You are now subscribed to receive helpful blog posts, quizzes, and updates from ${siteName}.`,
        ctaUrl: `${siteUrl()}/blog`,
        ctaLabel: 'Browse Articles',
        highlights: [
          'Fresh blog posts and practice content',
          'New quizzes when they go live',
          'You can unsubscribe anytime from the link below'
        ],
        footnote: 'Thanks for joining our learning community.',
        unsubscribeUrl
      });
    }

    const subject = `Welcome to ${siteName}`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1D6655;">Welcome, ${safe(user.name || user.username)}!</h2>
        <p>Thanks for joining ${safe(siteName)}. You can now track your quiz progress, earn points, and climb the leaderboard.</p>
        <a href="${process.env.SITE_URL || 'http://localhost:3000'}/dashboard" style="background: #1D6655; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">Go to Dashboard</a>
      </div>
    `;
    return this.sendEmail(user.email, subject, html);
  }

  async sendNewsletterAnnouncementEmail(subscriber, payload) {
    const title = payload.kind === 'quiz'
      ? `New Quiz: ${payload.title}`
      : `New Article: ${payload.title}`;
    const subject = payload.subject || title;

    const html = buildNewsletterTemplate({
      banner: payload.kind === 'quiz' ? 'Quiz update' : 'Blog update',
      title: payload.title,
      description: payload.description,
      highlights: payload.highlights || [],
      ctaLabel: payload.ctaLabel || (payload.kind === 'quiz' ? 'Take Quiz' : 'Read Article'),
      ctaUrl: payload.ctaUrl,
      secondaryLabel: payload.secondaryLabel || 'Open link in browser',
      secondaryUrl: payload.ctaUrl,
      unsubscribeUrl: payload.unsubscribeUrl,
      footnote: payload.footnote
    });

    return this.sendEmail(subscriber.email, subject, html);
  }

  async sendPasswordResetEmail(user, resetUrl) {
    const subject = 'Password Reset Request';
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1D6655;">Reset Your Password</h2>
        <p>We received a request to reset your password for your Aptitude Booster Club account.</p>
        <p><a href="${resetUrl}" style="background: #1D6655; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">Reset Password</a></p>
        <p>This link expires in 30 minutes.</p>
      </div>
    `;
    return this.sendEmail(user.email, subject, html);
  }
}

module.exports = new EmailService();
