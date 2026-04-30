const { buildSeo } = require('../services/SeoService');

const seoMiddleware = (req, res, next) => {
  res.locals.seo = buildSeo(req, {
    title: 'Aptitude Booster Club',
    description: 'Your go-to resource for aptitude tests, competitive exams, and skill development.',
    keywords: 'aptitude, tests, competitive exams, skills, learning'
  });
  next();
};

module.exports = seoMiddleware;
