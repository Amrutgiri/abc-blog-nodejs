const Setting = require('../models/Setting');

const SETTINGS_KEY = 'site-config';

function getBaseSiteUrl() {
  const explicit = String(process.env.SITE_URL || '').trim().replace(/\/+$/, '');
  if (explicit) return explicit;

  const vercelUrl = String(process.env.VERCEL_URL || '').trim().replace(/\/+$/, '');
  if (vercelUrl) return vercelUrl.startsWith('http') ? vercelUrl : `https://${vercelUrl}`;

  return 'http://localhost:3000';
}

const DEFAULT_SETTINGS = {
  siteName: 'Aptitude Booster Club',
  siteDescription: 'Your go-to resource for aptitude tests, competitive exams, and skill development.',
  siteLogoUrl: '/images/headerlogo.png',
  faviconUrl: '/images/favicon%20(2).png',
  footerAbout: 'Your go-to resource for aptitude tests, competitive exams, and skill development. Learn, practice, and succeed.',
  whatsappChannelUrl: '',
  facebookUrl: '',
  instagramUrl: '',
  xUrl: '',
  youtubeUrl: '',
  linkedinUrl: '',
  contactEmail: '',
  supportPhone: '',
  copyrightText: ''
};

let cachedSettings = { ...DEFAULT_SETTINGS };

function cleanText(value) {
  return String(value || '').trim();
}

function cleanUrl(value) {
  const raw = cleanText(value);
  if (!raw) return '';
  if (raw.startsWith('/')) return raw;
  if (/^https?:\/\//i.test(raw)) return raw;
  return '';
}

function absoluteUrl(url = '/') {
  const siteUrl = getBaseSiteUrl();
  if (!url) return siteUrl;
  if (/^https?:\/\//i.test(url)) return url;
  return `${siteUrl}${url.startsWith('/') ? url : `/${url}`}`;
}

function normalizeSettings(value = {}) {
  return {
    siteName: cleanText(value.siteName) || DEFAULT_SETTINGS.siteName,
    siteDescription: cleanText(value.siteDescription) || DEFAULT_SETTINGS.siteDescription,
    siteLogoUrl: cleanUrl(value.siteLogoUrl) || DEFAULT_SETTINGS.siteLogoUrl,
    faviconUrl: cleanUrl(value.faviconUrl) || DEFAULT_SETTINGS.faviconUrl,
    footerAbout: cleanText(value.footerAbout) || DEFAULT_SETTINGS.footerAbout,
    whatsappChannelUrl: cleanUrl(value.whatsappChannelUrl),
    facebookUrl: cleanUrl(value.facebookUrl),
    instagramUrl: cleanUrl(value.instagramUrl),
    xUrl: cleanUrl(value.xUrl),
    youtubeUrl: cleanUrl(value.youtubeUrl),
    linkedinUrl: cleanUrl(value.linkedinUrl),
    contactEmail: cleanText(value.contactEmail),
    supportPhone: cleanText(value.supportPhone),
    copyrightText: cleanText(value.copyrightText)
  };
}

function withAbsoluteAssets(settings) {
  return {
    ...settings,
    siteLogoUrl: absoluteUrl(settings.siteLogoUrl || DEFAULT_SETTINGS.siteLogoUrl),
    faviconUrl: absoluteUrl(settings.faviconUrl || DEFAULT_SETTINGS.faviconUrl)
  };
}

class SiteSettingsService {
  getCachedSettings() {
    return withAbsoluteAssets(cachedSettings);
  }

  async loadSettings() {
    const setting = await Setting.findOne({ key: SETTINGS_KEY });
    cachedSettings = normalizeSettings(setting?.value || {});
    return this.getCachedSettings();
  }

  async getSettings() {
    return this.loadSettings();
  }

  async saveSettings(data = {}) {
    const normalized = normalizeSettings(data);
    const setting = await Setting.findOneAndUpdate(
      { key: SETTINGS_KEY },
      { key: SETTINGS_KEY, value: normalized },
      { new: true, upsert: true, runValidators: true }
    );

    cachedSettings = normalized;
    return {
      setting,
      settings: this.getCachedSettings()
    };
  }
}

module.exports = new SiteSettingsService();
