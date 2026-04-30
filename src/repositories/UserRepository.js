const User = require('../models/User');
const crypto = require('crypto');

class UserRepository {
  async create(userData) {
    return await User.create(userData);
  }

  async findById(id) {
    return await User.findById(id).select('-password');
  }

  async findByEmail(email) {
    return await User.findOne({ email });
  }

  async findByUsername(username) {
    return await User.findOne({ username });
  }

  async findAll(options = {}) {
    const { page = 1, limit = 10, role } = options;
    const query = role ? { role } : {};
    const skip = (page - 1) * limit;

    const users = await User.find(query)
      .select('-password')
      .sort('-createdAt')
      .skip(skip)
      .limit(limit);

    const total = await User.countDocuments(query);
    return { users, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async update(id, userData) {
    return await User.findByIdAndUpdate(id, userData, { new: true, runValidators: true });
  }

  async delete(id) {
    return await User.findByIdAndDelete(id);
  }

  async comparePassword(email, password) {
    const user = await User.findOne({ email }).select('+password');
    if (!user || !user.isActive) return null;
    const isMatch = await user.comparePassword(password);
    if (!isMatch) return null;
    return user;
  }

  async findByResetToken(token) {
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
    return await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: Date.now() },
      isActive: true
    }).select('+password');
  }
}

module.exports = new UserRepository();
