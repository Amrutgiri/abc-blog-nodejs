const Tag = require('../models/Tag');

class TagRepository {
  async create(tagData) {
    return await Tag.create(tagData);
  }

  async findById(id) {
    return await Tag.findById(id);
  }

  async findBySlug(slug) {
    return await Tag.findOne({ slug });
  }

  async findAll() {
    return await Tag.find().sort('name');
  }

  async findAllWithCounts() {
    const tags = await Tag.aggregate([
      {
        $lookup: {
          from: 'posts',
          localField: '_id',
          foreignField: 'tags',
          pipeline: [{ $match: { status: 'published' } }],
          as: 'posts'
        }
      },
      {
        $addFields: {
          postCount: { $size: '$posts' }
        }
      },
      { $sort: { name: 1 } }
    ]);
    return tags;
  }

  async update(id, tagData) {
    return await Tag.findByIdAndUpdate(id, tagData, { new: true, runValidators: true });
  }

  async delete(id) {
    return await Tag.findByIdAndDelete(id);
  }

  async findOrCreate(name, slug) {
    let tag = await Tag.findOne({ slug });
    if (!tag) {
      tag = await Tag.create({ name, slug });
    }
    return tag;
  }
}

module.exports = new TagRepository();