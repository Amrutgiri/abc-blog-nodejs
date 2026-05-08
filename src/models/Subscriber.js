const mongoose = require('mongoose');

const subscriberSchema = new mongoose.Schema({
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true
  },
  name: {
    type: String,
    trim: true,
    maxlength: 120
  },
  status: {
    type: String,
    enum: ['active', 'unsubscribed'],
    default: 'active'
  },
  source: {
    type: String,
    default: 'website'
  },
  confirmedAt: {
    type: Date,
    default: Date.now
  },
  unsubscribedAt: {
    type: Date
  },
  unsubscribeTokenHash: {
    type: String,
    index: true
  },
  unsubscribeTokenIssuedAt: {
    type: Date
  }
}, {
  timestamps: true
});

subscriberSchema.index({ email: 1 });
subscriberSchema.index({ status: 1 });

module.exports = mongoose.model('Subscriber', subscriberSchema);
