const Subscriber = require('../models/Subscriber');
const EmailService = require('./EmailService');

class NewsletterService {
  async subscribe({ email, name, source = 'website' }) {
    const normalizedEmail = String(email || '').trim().toLowerCase();
    const normalizedName = String(name || '').trim();

    let subscriber = await Subscriber.findOne({ email: normalizedEmail });
    if (subscriber) {
      subscriber.status = 'active';
      subscriber.name = normalizedName || subscriber.name;
      subscriber.source = source;
      subscriber.unsubscribedAt = undefined;
      await subscriber.save();
      return { subscriber, created: false };
    }

    subscriber = await Subscriber.create({
      email: normalizedEmail,
      name: normalizedName,
      source
    });

    await EmailService.sendEmail(
      normalizedEmail,
      'Welcome to Aptitude Booster Club',
      `<div style="font-family:Arial,sans-serif">
        <h2 style="color:#1D6655">Thanks for subscribing</h2>
        <p>You are now subscribed to Aptitude Booster Club updates.</p>
      </div>`
    );

    return { subscriber, created: true };
  }

  async unsubscribe(email) {
    const subscriber = await Subscriber.findOneAndUpdate(
      { email: String(email || '').trim().toLowerCase() },
      { status: 'unsubscribed', unsubscribedAt: new Date() },
      { new: true }
    );
    return subscriber;
  }

  async countActive() {
    return Subscriber.countDocuments({ status: 'active' });
  }
}

module.exports = new NewsletterService();
