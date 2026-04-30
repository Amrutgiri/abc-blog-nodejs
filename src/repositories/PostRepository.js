const Post = require('../models/Post');

function escapeRegex(value) {
  return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

class PostRepository {
  async create(postData) {
    return await Post.create(postData);
  }

  async findById(id) {
    return await Post.findById(id).populate('author', 'username avatar').populate('category').populate('tags');
  }

  async findBySlug(slug) {
    return await Post.findOne({ slug }).populate('author', 'username avatar bio').populate('category').populate('tags');
  }

  async findAll(options = {}) {
    const { page = 1, limit = 10, status = 'published', sort = '-publishedAt', category, tag, search } = options;
    const query = { status };

    if (category) query.category = category;
    if (tag) query.tags = tag;
    if (search) {
      const safeSearch = escapeRegex(search);
      query.$or = [
        { title: { $regex: safeSearch, $options: 'i' } },
        { excerpt: { $regex: safeSearch, $options: 'i' } },
        { slug: { $regex: safeSearch, $options: 'i' } }
      ];
    }

    const skip = (page - 1) * limit;
    const posts = await Post.find(query)
      .populate('author', 'username avatar')
      .populate('category')
      .populate('tags')
      .sort(sort)
      .skip(skip)
      .limit(limit);

    const total = await Post.countDocuments(query);
    return { posts, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findRecent(limit = 5) {
    return await Post.find({ status: 'published' })
      .populate('author', 'username avatar')
      .populate('category')
      .sort('-publishedAt')
      .limit(limit);
  }

  async findFeatured() {
    return await Post.findOne({ status: 'published', featured: true })
      .populate('author', 'username avatar')
      .populate('category')
      .sort('-publishedAt')
      .limit(1);
  }

  async findRelated(postId, categoryId, limit = 3) {
    return await Post.find({
      _id: { $ne: postId },
      category: categoryId,
      status: 'published'
    })
      .populate('author', 'username avatar')
      .populate('category')
      .sort('-publishedAt')
      .limit(limit);
  }

  async findByCategory(categoryId, options = {}) {
    const { page = 1, limit = 10 } = options;
    const skip = (page - 1) * limit;
    const query = { category: categoryId, status: 'published' };

    const posts = await Post.find(query)
      .populate('author', 'username avatar')
      .populate('category')
      .populate('tags')
      .sort('-publishedAt')
      .skip(skip)
      .limit(limit);

    const total = await Post.countDocuments(query);
    return { posts, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findByTag(tagId, options = {}) {
    const { page = 1, limit = 10 } = options;
    const skip = (page - 1) * limit;
    const query = { tags: tagId, status: 'published' };

    const posts = await Post.find(query)
      .populate('author', 'username avatar')
      .populate('category')
      .populate('tags')
      .sort('-publishedAt')
      .skip(skip)
      .limit(limit);

    const total = await Post.countDocuments(query);
    return { posts, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async search(query, options = {}) {
    const { page = 1, limit = 10 } = options;
    const skip = (page - 1) * limit;

    const searchQuery = String(query || '').trim();
    const textQuery = searchQuery
      ? {
          status: 'published',
          $text: { $search: searchQuery }
        }
      : { status: 'published' };

    const posts = await Post.find(textQuery)
      .populate('author', 'username avatar')
      .populate('category')
      .populate('tags')
      .sort(searchQuery ? { score: { $meta: 'textScore' }, publishedAt: -1 } : '-publishedAt')
      .skip(skip)
      .limit(limit);

    const total = await Post.countDocuments(textQuery);
    return { posts, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async suggest(query, limit = 8) {
    const q = String(query || '').trim();
    if (!q) return [];

    return await Post.find({
      status: 'published',
      $or: [
        { title: { $regex: escapeRegex(q), $options: 'i' } },
        { excerpt: { $regex: escapeRegex(q), $options: 'i' } }
      ]
    })
      .select('title slug')
      .sort('-publishedAt')
      .limit(limit);
  }

  async findAllForSitemap() {
    return await Post.find({ status: 'published' })
      .select('slug updatedAt publishedAt createdAt')
      .sort('-publishedAt');
  }

  async getTopViewed(limit = 10) {
    return await Post.find({ status: 'published' })
      .select('title slug views featuredImage publishedAt')
      .sort('-views')
      .limit(limit);
  }

  async getCounts() {
    const [totalPosts, publishedPosts, draftPosts, scheduledPosts] = await Promise.all([
      Post.countDocuments(),
      Post.countDocuments({ status: 'published' }),
      Post.countDocuments({ status: 'draft' }),
      Post.countDocuments({ status: 'scheduled' })
    ]);
    return { totalPosts, publishedPosts, draftPosts, scheduledPosts };
  }

  async update(id, postData) {
    return await Post.findByIdAndUpdate(id, postData, { new: true, runValidators: true });
  }

  async delete(id) {
    return await Post.findByIdAndDelete(id);
  }

  async incrementViews(id) {
    return await Post.findByIdAndUpdate(id, { $inc: { views: 1 } });
  }

  async getTotalViews() {
    const result = await Post.aggregate([
      { $match: { status: 'published' } },
      { $group: { _id: null, totalViews: { $sum: '$views' } } }
    ]);
    return result[0]?.totalViews || 0;
  }

  async getStats() {
    const [totalPosts, publishedPosts, draftPosts] = await Promise.all([
      Post.countDocuments(),
      Post.countDocuments({ status: 'published' }),
      Post.countDocuments({ status: 'draft' })
    ]);
    return { totalPosts, publishedPosts, draftPosts };
  }
}

module.exports = new PostRepository();
