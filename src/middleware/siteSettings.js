const SiteSettingsService = require('../services/SiteSettingsService');

const siteSettingsMiddleware = async (req, res, next) => {
  try {
    const settings = await SiteSettingsService.getSettings();
    res.locals.siteSettings = settings;
    next();
  } catch (error) {
    next(error);
  }
};

module.exports = siteSettingsMiddleware;
