const Category = require('../models/Category');

class CategoryRepository {
  async create(categoryData) {
    return await Category.create(categoryData);
  }

  async findById(id) {
    return await Category.findById(id);
  }

  async findBySlug(slug) {
    return await Category.findOne({ slug, isActive: true });
  }

  async findAll(options = {}) {
    const { activeOnly = true } = options;
    const query = activeOnly ? { isActive: true } : {};
    return await Category.find(query).sort('name');
  }

  async findAllWithCounts() {
    const categories = await Category.aggregate([
      { $match: { isActive: true } },
      {
        $lookup: {
          from: 'posts',
          localField: '_id',
          foreignField: 'category',
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
    return categories;
  }

  async update(id, categoryData) {
    return await Category.findByIdAndUpdate(id, categoryData, { new: true, runValidators: true });
  }

  async delete(id) {
    return await Category.findByIdAndDelete(id);
  }
}

module.exports = new CategoryRepository();