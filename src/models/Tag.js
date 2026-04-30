const mongoose = require('mongoose');

const tagSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Tag name is required'],
    unique: true,
    trim: true,
    maxlength: 50
  },
  slug: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  }
}, {
  timestamps: true
});

tagSchema.index({ slug: 1 });
tagSchema.index({ name: 'text' });

module.exports = mongoose.model('Tag', tagSchema);
