const mongoose = require('mongoose');

const gradeLevelSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  minScore: {
    type: Number,
    required: true,
  },
  maxScore: {
    type: Number,
    required: true,
  },
  color: {
    type: String,
    default: '#6366F1',
  },
});

const gradingScaleSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  minScore: {
    type: Number,
    required: true,
  },
  maxScore: {
    type: Number,
    required: true,
  },
  letterGrade: {
    type: String,
    default: null,
  },
  color: {
    type: String,
    default: '#6366F1',
  },
});

const schoolSchema = mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },
    address: {
      street: { type: String, default: '' },
      ward: { type: String, default: '' },
      district: { type: String, default: '' },
      city: { type: String, default: '' },
    },
    logoUrl: {
      type: String,
      default: null,
    },
    phone: {
      type: String,
      default: null,
    },
    email: {
      type: String,
      default: null,
      lowercase: true,
      trim: true,
    },
    website: {
      type: String,
      default: null,
    },
    principalName: {
      type: String,
      default: null,
    },
    settings: {
      // ══════════════════════════════════════════════════════════════════
      // THANG ĐIỂM CHI TIẾT (theo yêu cầu tài liệu)
      // "Tỷ lệ học sinh đạt điểm Giỏi/Khá/Trung bình/Yếu"
      // ══════════════════════════════════════════════════════════════════
      gradingScale: {
        type: Map,
        of: Number,
        default: {
          excellent: 8.5,  // Giỏi: >= 8.5
          good: 7.0,       // Khá: >= 7.0
          average: 5.0,    // Trung bình: >= 5.0
          poor: 0,         // Yếu: < 5.0
        },
      },
      // Thang điểm chi tiết hơn
      gradingLevels: [gradingScaleSchema],
      // Điểm tối đa của bài thi
      maxScore: {
        type: Number,
        default: 10,
      },
      // Điểm đạt (để qua môn)
      passingScore: {
        type: Number,
        default: 5,
      },
      academicYears: [
        {
          year: String,
          startDate: Date,
          endDate: Date,
          isActive: { type: Boolean, default: false },
        },
      ],
      omrConfig: {
        bubbleSize: { 
          width: { type: Number, default: 6 }, 
          height: { type: Number, default: 6 } 
        },
        rowHeight: { type: Number, default: 14 },
        colWidth: { type: Number, default: 8 },
        marginTop: { type: Number, default: 15 },
        marginBottom: { type: Number, default: 15 },
        marginLeft: { type: Number, default: 15 },
        marginRight: { type: Number, default: 15 },
      },
    },
    // Phân loại trường
    schoolType: {
      type: String,
      enum: ['primary', 'secondary', 'high', 'university', 'other'],
      default: 'secondary',
    },
    // Cấp học
    gradeLevels: [
      {
        type: Number,
        min: 1,
        max: 12,
      },
    ],
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

schoolSchema.index({ code: 1 }, { unique: true });
schoolSchema.index({ name: 'text' });

schoolSchema.methods.getGradeByScore = function (score) {
  const scale = this.settings.gradingScale;
  if (score >= scale.get('excellent')) return { grade: 'Giỏi', letter: 'A', color: '#22C55E' };
  if (score >= scale.get('good')) return { grade: 'Khá', letter: 'B', color: '#3B82F6' };
  if (score >= scale.get('average')) return { grade: 'Trung bình', letter: 'C', color: '#F59E0B' };
  return { grade: 'Yếu', letter: 'D', color: '#EF4444' };
};

schoolSchema.methods.calculateGradeDistribution = function (scores) {
  const distribution = {
    excellent: 0,
    good: 0,
    average: 0,
    poor: 0,
    total: scores.length,
  };

  const scale = this.settings.gradingScale;

  scores.forEach((score) => {
    if (score >= scale.get('excellent')) distribution.excellent++;
    else if (score >= scale.get('good')) distribution.good++;
    else if (score >= scale.get('average')) distribution.average++;
    else distribution.poor++;
  });

  if (distribution.total > 0) {
    distribution.excellentPercent = ((distribution.excellent / distribution.total) * 100).toFixed(1);
    distribution.goodPercent = ((distribution.good / distribution.total) * 100).toFixed(1);
    distribution.averagePercent = ((distribution.average / distribution.total) * 100).toFixed(1);
    distribution.poorPercent = ((distribution.poor / distribution.total) * 100).toFixed(1);
  }

  return distribution;
};

const School = mongoose.model('School', schoolSchema);

module.exports = School;
