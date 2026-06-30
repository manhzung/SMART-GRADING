const mongoose = require('mongoose');

const classSchema = mongoose.Schema(
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
    },
    gradeLevel: {
      type: Number,
      required: false,
      min: 0,
      max: 20,
      default: null,
    },
    academicYear: {
      type: String,
      required: true,
    },
    homeroomTeacherId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    studentIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    subjectTeachers: [
      {
        subjectId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Subject',
        },
        teacherId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        addedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    schoolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'School',
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    enrollmentCode: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

classSchema.index(
  { schoolId: 1, code: 1, academicYear: 1 },
  { unique: true }
);
classSchema.index({ studentIds: 1 });
classSchema.index({ homeroomTeacherId: 1 });
classSchema.index({ schoolId: 1, gradeLevel: 1 });
classSchema.index({ 'subjectTeachers.teacherId': 1 });

const Class = mongoose.model('Class', classSchema);

module.exports = Class;
