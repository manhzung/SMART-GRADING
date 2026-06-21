const httpStatus = require('http-status');
const catchAsync = require('../utils/catchAsync');
const cloudinaryService = require('../services/cloudinary.service');
const { UploadAuditLog } = require('../models');

const getUploadSignature = catchAsync(async (req, res) => {
  const { examId, submissionId, type } = req.query;

  const sig = cloudinaryService.generateUploadSignature({
    userId: req.user.id,
    examId,
    submissionId,
    type,
  });

  // Best-effort audit log; do not fail the request if it errors
  try {
    await UploadAuditLog.create({
      userId: req.user.id,
      action: 'signature_request',
      imageType: type,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
  } catch (e) {
    // swallow
  }

  res.send({
    signature: sig.signature,
    apiKey: sig.apiKey,
    cloudName: sig.cloudName,
    timestamp: sig.timestamp,
    folder: sig.folder,
    publicId: sig.publicId,
    uploadUrl: sig.uploadUrl,
    expiresIn: sig.expiresIn,
  });
});

module.exports = { getUploadSignature };
