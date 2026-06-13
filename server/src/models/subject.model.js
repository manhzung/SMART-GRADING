const mongoose = require('mongoose');

const subjectSchema = mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    code: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
    },
    color: {
      type: String,
      default: '#3b82f6',
    },
    schoolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'School',
      default: null,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

subjectSchema.index({ schoolId: 1, code: 1 }, { unique: true });
subjectSchema.index({ name: 1 });

const Subject = mongoose.model('Subject', subjectSchema);

module.exports = Subject;
