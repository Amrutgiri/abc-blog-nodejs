const nodemailer = require('nodemailer');
const xss = require('xss');

function safe(value) {
  return xss(String(value || ''));
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
      const info = await this.transporter.sendMail({
        from: `"Aptitude Booster Club" <${process.env.SMTP_USER || 'your-email@gmail.com'}>`,
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
    const subject = `New Post Published: ${post.title}`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1D6655;">New Post Published!</h2>
        <p>Hello,</p>
        <p>A new post has been published on <strong>Aptitude Booster Club</strong>.</p>
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

  async sendWelcomeEmail(user) {
    const subject = 'Welcome to Aptitude Booster Club';
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1D6655;">Welcome, ${safe(user.name || user.username)}!</h2>
        <p>Thanks for joining Aptitude Booster Club. You can now track your quiz progress, earn points, and climb the leaderboard.</p>
        <a href="${process.env.SITE_URL || 'http://localhost:3000'}/dashboard" style="background: #1D6655; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">Go to Dashboard</a>
      </div>
    `;
    return this.sendEmail(user.email, subject, html);
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
