const cloudinary = require('cloudinary').v2;
const config = require('../config/config');
const { buildFolder } = require('../utils/cloudinary.util');

const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 500;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const isTransient = (err) => {
  if (!err) return false;
  if (err.http_code >= 500) return true;
  if (err.http_code === 408 || err.http_code === 429) return true;
  if (err.code === 'ETIMEDOUT' || err.code === 'ECONNRESET') return true;
  return false;
};

class CloudinaryError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.name = 'CloudinaryError';
    this.statusCode = statusCode;
  }
}

class CloudinaryService {
  constructor() {
    this._configured = false;
  }

  _ensureConfigured() {
    const { cloud_name, api_key, api_secret } = config.cloudinary;
    if (!cloud_name || !api_key || !api_secret) {
      throw new Error('Cloudinary env vars are not configured');
    }
    cloudinary.config({ cloud_name, api_key, api_secret, secure: true });
    this._configured = true;
  }

  generateUploadSignature({ userId, examId, submissionId, type }) {
    this._ensureConfigured();
    const folder = buildFolder(examId, submissionId, type);
    const publicId = folder;
    const timestamp = Math.round(Date.now() / 1000);

    const signature = cloudinary.utils.api_sign_request(
      { folder, public_id: publicId, timestamp },
      config.cloudinary.api_secret
    );

    return {
      signature,
      apiKey: config.cloudinary.api_key,
      cloudName: config.cloudinary.cloud_name,
      timestamp,
      folder,
      publicId,
      uploadUrl: `https://api.cloudinary.com/v1_1/${config.cloudinary.cloud_name}/image/upload`,
      expiresIn: config.upload.signatureTtlSeconds,
    };
  }

  _mapUploadResult(raw) {
    return {
      publicId: raw.public_id,
      url: raw.url,
      secureUrl: raw.secure_url,
      width: raw.width,
      height: raw.height,
      bytes: raw.bytes,
      format: raw.format,
    };
  }

  async _uploadOnce(input, options) {
    const result = await cloudinary.uploader.upload(input, {
      folder: options.folder,
      public_id: options.publicId,
      overwrite: false,
      resource_type: 'image',
    });
    return this._mapUploadResult(result);
  }

  async uploadBuffer(buffer, options) {
    this._ensureConfigured();
    let attempt = 0;
    let lastErr;
    while (attempt <= MAX_RETRIES) {
      try {
        return await this._uploadOnce(buffer, options);
      } catch (err) {
        lastErr = err;
        if (!isTransient(err) || attempt === MAX_RETRIES) break;
        await sleep(RETRY_DELAY_MS * (attempt + 1));
        attempt += 1;
      }
    }
    throw new CloudinaryError(
      `Cloudinary upload failed: ${lastErr?.message || 'unknown'}`,
      lastErr?.http_code
    );
  }

  async uploadBase64(dataUri, options) {
    this._ensureConfigured();
    const stripped = dataUri.replace(/^data:[^;]+;base64,/, '');
    return this.uploadBuffer(stripped, options);
  }

  async destroy(publicId) {
    this._ensureConfigured();
    const result = await cloudinary.uploader.destroy(publicId);
    return { result: result.result === 'ok' ? 'ok' : 'not_found' };
  }
}

module.exports = new CloudinaryService();
module.exports.CloudinaryError = CloudinaryError;
