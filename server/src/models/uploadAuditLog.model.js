const mongoose = require('mongoose');

const uploadAuditLogSchema = mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    action: {
      type: String,
      enum: [
        'signature_request',
        'upload_success',
        'upload_failed',
        'attach_image',
        'delete_image',
        'auto_cleanup',
      ],
      required: true,
    },
    submissionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Submission',
      index: true,
    },
    imageType: {
      type: String,
      enum: ['original', 'preprocessed', 'annotated', null],
    },
    publicId: { type: String },
    cloudinaryUrl: { type: String },
    bytes: { type: Number },
    ipAddress: { type: String },
    userAgent: { type: String },
    error: { type: String },
    durationMs: { type: Number },
  },
  { timestamps: true }
);

uploadAuditLogSchema.index({ submissionId: 1, action: 1 });
uploadAuditLogSchema.index({ createdAt: -1 });

const UploadAuditLog = mongoose.model('UploadAuditLog', uploadAuditLogSchema);

module.exports = UploadAuditLog;
