const ContactMessage = require('../models/ContactMessage');

class ContactRepository {
  async create(payload) {
    return await ContactMessage.create(payload);
  }

  async findAll(options = {}) {
    const { page = 1, limit = 20, status } = options;
    const query = {};
    if (status) query.status = status;

    const skip = (page - 1) * limit;
    const messages = await ContactMessage.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await ContactMessage.countDocuments(query);
    return { messages, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findById(id) {
    return await ContactMessage.findById(id);
  }

  async update(id, payload) {
    return await ContactMessage.findByIdAndUpdate(id, payload, { new: true, runValidators: true });
  }

  async delete(id) {
    return await ContactMessage.findByIdAndDelete(id);
  }

  async countByStatus(status) {
    return await ContactMessage.countDocuments(status ? { status } : {});
  }

  async getCounts() {
    const [total, unread, read, replied, archived] = await Promise.all([
      this.countByStatus(),
      this.countByStatus('unread'),
      this.countByStatus('read'),
      this.countByStatus('replied'),
      this.countByStatus('archived')
    ]);

    return { total, unread, read, replied, archived };
  }
}

module.exports = new ContactRepository();
