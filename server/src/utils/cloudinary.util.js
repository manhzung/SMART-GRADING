const ApiError = require('./ApiError');

/**
 * Build the canonical Cloudinary folder for a submission image.
 * Pattern: submissions/{examId}/{submissionId|pending}/{type}
 */
const buildFolder = (examId, submissionId, type) => {
  const safeExam = String(examId).replace(/[^a-zA-Z0-9_-]/g, '');
  const safeSub = submissionId
    ? String(submissionId).replace(/[^a-zA-Z0-9_-]/g, '')
    : 'pending';
  const safeType = String(type).replace(/[^a-zA-Z0-9_-]/g, '');
  return `submissions/${safeExam}/${safeSub}/${safeType}`;
};

/**
 * Extract the publicId from a Cloudinary delivery URL.
 * Supports both versioned (v1234/) and unversioned URLs.
 * Returns null if the URL is not a Cloudinary URL.
 */
const extractPublicIdFromUrl = (url) => {
  if (!url || typeof url !== 'string') return null;
  const match = url.match(
    /^https?:\/\/res\.cloudinary\.com\/[^/]+\/[^/]+\/upload\/(?:v\d+\/)?(.+?)(?:\.[a-zA-Z0-9]+)?$/
  );
  return match ? match[1] : null;
};

/**
 * Asserts that the given URL is a Cloudinary delivery URL for the
 * expected cloud_name. Throws ApiError(400) otherwise.
 */
const assertIsCloudinaryUrl = (url, cloudName) => {
  if (!url || typeof url !== 'string') {
    throw new ApiError(400, 'url must be a non-empty string');
  }
  const expected = `https://res.cloudinary.com/${cloudName}/`;
  if (!url.startsWith(expected)) {
    throw new ApiError(400, 'url is not the expected cloud');
  }
  if (extractPublicIdFromUrl(url) === null) {
    throw new ApiError(400, 'url is not a parseable Cloudinary URL');
  }
};

module.exports = {
  buildFolder,
  extractPublicIdFromUrl,
  assertIsCloudinaryUrl,
};
