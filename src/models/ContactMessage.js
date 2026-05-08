const mongoose = require('mongoose');

const contactMessageSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    maxlength: 100
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    trim: true,
    lowercase: true,
    maxlength: 254
  },
  message: {
    type: String,
    required: [true, 'Message is required'],
    trim: true,
    maxlength: 2000
  },
  status: {
    type: String,
    enum: ['unread', 'read', 'replied', 'archived'],
    default: 'unread',
    index: true
  },
  source: {
    type: String,
    default: 'website-contact'
  },
  ipAddress: {
    type: String,
    default: ''
  },
  userAgent: {
    type: String,
    default: ''
  },
  adminNotes: {
    type: String,
    default: '',
    maxlength: 1000
  },
  repliedAt: {
    type: Date
  }
}, {
  timestamps: true
});

contactMessageSchema.index({ email: 1 });
contactMessageSchema.index({ createdAt: -1 });
contactMessageSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('ContactMessage', contactMessageSchema);
