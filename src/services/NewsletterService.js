const crypto = require('crypto');
const Subscriber = require('../models/Subscriber');
const EmailService = require('./EmailService');
const { isDisposableEmail, normalizeEmail, sanitizeContactText } = require('./ContactService');

function siteUrl() {
  return (process.env.SITE_URL || 'http://localhost:3000').replace(/\/+$/, '');
}

function isValidPlainText(value) {
  const raw = String(value || '');
  return !(/[<>]/.test(raw) || /<\/?\s*script\b/i.test(raw));
}

function hashToken(token) {
  return crypto.createHash('sha256').update(String(token || '')).digest('hex');
}

function escapeRegex(value) {
  return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}

class NewsletterService {
  async issueUnsubscribeToken(subscriber) {
    if (!subscriber) return { subscriber, token: null };

    const token = generateToken();
    subscriber.unsubscribeTokenHash = hashToken(token);
    subscriber.unsubscribeTokenIssuedAt = new Date();
    await subscriber.save();
    return { subscriber, token };
  }

  async subscribe({ email, name, source = 'website' }) {
    const normalizedEmail = normalizeEmail(email);
    const normalizedName = sanitizeContactText(name);

    if (!normalizedEmail) {
      throw new Error('Email is required.');
    }
    if (!isValidPlainText(normalizedEmail) || !isValidPlainText(normalizedName)) {
      throw new Error('Invalid newsletter subscriber data.');
    }
    if (isDisposableEmail(normalizedEmail)) {
      throw new Error('Disposable email addresses are not allowed.');
    }

    let subscriber = await Subscriber.findOne({ email: normalizedEmail });
    if (subscriber) {
      subscriber.status = 'active';
      subscriber.name = normalizedName || subscriber.name;
      subscriber.source = source;
      subscriber.unsubscribedAt = undefined;
      subscriber.confirmedAt = subscriber.confirmedAt || new Date();
      const { subscriber: refreshed, token } = await this.issueUnsubscribeToken(subscriber);
      const unsubscribeUrl = `${siteUrl()}/newsletter/unsubscribe/${token}`;
      await EmailService.sendWelcomeEmail(refreshed, unsubscribeUrl).catch(() => null);
      return { subscriber: refreshed, created: false, unsubscribeToken: token };
    }

    subscriber = await Subscriber.create({
      email: normalizedEmail,
      name: normalizedName,
      source,
      status: 'active',
      confirmedAt: new Date()
    });

    const { token } = await this.issueUnsubscribeToken(subscriber);
    const unsubscribeUrl = `${siteUrl()}/newsletter/unsubscribe/${token}`;
    await EmailService.sendWelcomeEmail(subscriber, unsubscribeUrl).catch(() => null);

    return { subscriber, created: true, unsubscribeToken: token };
  }

  async findByUnsubscribeToken(token) {
    if (!token) return null;
    const tokenHash = hashToken(token);
    return Subscriber.findOne({ unsubscribeTokenHash: tokenHash });
  }

  async unsubscribeByToken(token) {
    const subscriber = await this.findByUnsubscribeToken(token);
    if (!subscriber) return null;

    subscriber.status = 'unsubscribed';
    subscriber.unsubscribedAt = new Date();
    await subscriber.save();
    return subscriber;
  }

  async listSubscribers(options = {}) {
    const {
      page = 1,
      limit = 20,
      status,
      query
    } = options;

    const filter = {};
    if (status && ['active', 'unsubscribed'].includes(status)) {
      filter.status = status;
    }
    if (query) {
      const safeQuery = String(query).trim();
      if (safeQuery) {
        const pattern = escapeRegex(safeQuery);
        filter.$or = [
          { email: { $regex: pattern, $options: 'i' } },
          { name: { $regex: pattern, $options: 'i' } },
          { source: { $regex: pattern, $options: 'i' } }
        ];
      }
    }

    const skip = (page - 1) * limit;
    const subscribers = await Subscriber.find(filter)
      .sort('-createdAt')
      .skip(skip)
      .limit(limit);

    const total = await Subscriber.countDocuments(filter);
    return {
      subscribers,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    };
  }

  async findSubscriberById(id) {
    return Subscriber.findById(id);
  }

  async toggleSubscriberStatus(id) {
    const subscriber = await Subscriber.findById(id);
    if (!subscriber) return null;

    const isActive = subscriber.status !== 'active';
    subscriber.status = isActive ? 'active' : 'unsubscribed';
    subscriber.confirmedAt = subscriber.confirmedAt || new Date();
    subscriber.unsubscribedAt = isActive ? undefined : new Date();
    await subscriber.save();
    return subscriber;
  }

  async getStats() {
    const [total, active, unsubscribed] = await Promise.all([
      Subscriber.countDocuments(),
      Subscriber.countDocuments({ status: 'active' }),
      Subscriber.countDocuments({ status: 'unsubscribed' })
    ]);

    return { total, active, unsubscribed };
  }

  async countActive() {
    return Subscriber.countDocuments({ status: 'active' });
  }

  async sendAnnouncementToSubscribers({ kind, title, description, ctaUrl, ctaLabel, highlights = [], footnote }) {
    const subscribers = await Subscriber.find({ status: 'active' }).sort('createdAt');
    if (!subscribers.length) {
      return { sent: 0, failed: 0 };
    }

    let sent = 0;
    let failed = 0;

    for (const subscriber of subscribers) {
      try {
        const { token } = await this.issueUnsubscribeToken(subscriber);
        const unsubscribeUrl = `${siteUrl()}/newsletter/unsubscribe/${token}`;

        await EmailService.sendNewsletterAnnouncementEmail(subscriber, {
          kind,
          title,
          description,
          ctaUrl,
          ctaLabel,
          highlights,
          footnote,
          unsubscribeUrl
        });
        sent += 1;
      } catch (error) {
        failed += 1;
        console.error('Newsletter send error:', error);
      }
    }

    return { sent, failed };
  }
}

module.exports = new NewsletterService();
