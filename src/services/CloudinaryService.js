const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

function getCloudinaryConfig() {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME || '';
  const apiKey = process.env.CLOUDINARY_API_KEY || '';
  const apiSecret = process.env.CLOUDINARY_API_SECRET || '';
  const folder = process.env.CLOUDINARY_FOLDER || 'abc-blog';

  if (!cloudName || !apiKey || !apiSecret) {
    return null;
  }

  return {
    cloudName,
    apiKey,
    apiSecret,
    folder
  };
}

function buildSignature(params, apiSecret) {
  const serialized = Object.keys(params)
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join('&');

  return crypto
    .createHash('sha1')
    .update(`${serialized}${apiSecret}`)
    .digest('hex');
}

async function uploadBuffer(buffer, options = {}) {
  const config = getCloudinaryConfig();
  const filename = options.filename || `upload-${Date.now()}`;
  const mimetype = options.mimetype || 'application/octet-stream';

  if (config) {
    const timestamp = Math.floor(Date.now() / 1000);
    const payload = {
      timestamp,
      folder: config.folder
    };
    const signature = buildSignature(payload, config.apiSecret);
    const formData = new FormData();
    const blob = new Blob([buffer], { type: mimetype });

    formData.append('file', blob, filename);
    formData.append('api_key', config.apiKey);
    formData.append('timestamp', String(timestamp));
    formData.append('folder', config.folder);
    formData.append('signature', signature);

    const response = await fetch(`https://api.cloudinary.com/v1_1/${config.cloudName}/image/upload`, {
      method: 'POST',
      body: formData
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const errorMessage = data?.error?.message || 'Cloudinary upload failed';
      throw new Error(errorMessage);
    }

    return {
      url: data.secure_url,
      publicId: data.public_id,
      provider: 'cloudinary'
    };
  }

  const uploadDir = path.join(__dirname, '..', '..', 'public', 'uploads');
  await fs.promises.mkdir(uploadDir, { recursive: true });

  const safeExt = path.extname(filename).toLowerCase();
  const safeName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${safeExt}`;
  const filePath = path.join(uploadDir, safeName);
  await fs.promises.writeFile(filePath, buffer);

  return {
    url: `/uploads/${safeName}`,
    publicId: safeName,
    provider: 'local'
  };
}

module.exports = {
  getCloudinaryConfig,
  uploadBuffer
};
