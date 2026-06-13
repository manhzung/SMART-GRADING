const mongoose = require('mongoose');

const omrTemplateSchema = mongoose.Schema(
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
    description: {
      type: String,
      default: '',
    },
    pageConfig: {
      paperSize: {
        type: String,
        enum: ['A4', 'A5', 'A3', 'custom'],
        default: 'A4',
      },
      customSize: {
        width: { type: Number, default: 210 },
        height: { type: Number, default: 297 },
      },
      defaultDPI: {
        type: Number,
        default: 300,
      },
      margins: {
        top: { type: Number, default: 15 },
        bottom: { type: Number, default: 15 },
        left: { type: Number, default: 15 },
        right: { type: Number, default: 15 },
      },
    },
    zones: {
      header: {
        enabled: { type: Boolean, default: true },
        height: { type: Number, default: 40 },
        elements: [
          {
            type: {
              type: String,
              enum: [
                'school_logo',
                'school_name',
                'exam_title',
                'student_name',
                'class_name',
                'date',
                'custom_text',
                'image',
              ],
            },
            position: { x: Number, y: Number },
            width: Number,
            height: Number,
            fontSize: { type: Number, default: 12 },
            fontFamily: { type: String, default: 'Arial' },
            alignment: {
              type: String,
              enum: ['left', 'center', 'right'],
              default: 'center',
            },
            content: String,
          },
        ],
      },
      versionCode: {
        enabled: { type: Boolean, default: true },
        position: {
          x: { type: Number, default: 150 },
          y: { type: Number, default: 50 },
        },
        digits: {
          type: Number,
          enum: [2, 3],
          default: 3,
        },
        digitConfig: {
          optionsPerDigit: { type: Number, default: 10 },
          bubbleSize: {
            width: { type: Number, default: 6 },
            height: { type: Number, default: 6 },
          },
          bubbleSpacing: {
            horizontal: { type: Number, default: 2 },
            vertical: { type: Number, default: 2 },
          },
        },
        label: {
          text: { type: String, default: 'Mã đề' },
          fontSize: { type: Number, default: 10 },
          position: { type: String, default: 'above' },
        },
      },
      studentCode: {
        enabled: { type: Boolean, default: true },
        position: {
          x: { type: Number, default: 20 },
          y: { type: Number, default: 50 },
        },
        digits: {
          type: Number,
          default: 3,
        },
        digitConfig: {
          optionsPerDigit: { type: Number, default: 10 },
          bubbleSize: {
            width: { type: Number, default: 6 },
            height: { type: Number, default: 6 },
          },
          bubbleSpacing: {
            horizontal: { type: Number, default: 2 },
            vertical: { type: Number, default: 2 },
          },
        },
        label: {
          text: { type: String, default: 'Số báo danh' },
          fontSize: { type: Number, default: 10 },
          position: { type: String, default: 'above' },
        },
      },
      answerArea: {
        enabled: { type: Boolean, default: true },
        startPosition: {
          x: { type: Number, default: 20 },
          y: { type: Number, default: 90 },
        },
        dimensions: {
          width: { type: Number, default: 170 },
          height: { type: Number, default: 200 },
        },
        gridConfig: {
          questionsPerRow: { type: Number, default: 5 },
          rowsPerPage: { type: Number, default: 10 },
          totalQuestions: { type: Number, default: 50 },
          bubbleConfig: {
            width: { type: Number, default: 6 },
            height: { type: Number, default: 6 },
            shape: {
              type: String,
              enum: ['circle', 'oval', 'square', 'rectangle'],
              default: 'circle',
            },
            borderColor: { type: String, default: '#000000' },
            borderWidth: { type: Number, default: 0.5 },
            fillColor: { type: String, default: '#000000' },
            minFillIntensity: { type: Number, default: 180 },
            spacing: {
              betweenOptions: { type: Number, default: 2 },
              betweenQuestions: { type: Number, default: 4 },
              betweenRows: { type: Number, default: 8 },
            },
          },
          questionNumberConfig: {
            enabled: { type: Boolean, default: true },
            position: {
              type: String,
              enum: ['left', 'above'],
              default: 'left',
            },
            fontSize: { type: Number, default: 9 },
            fontWeight: { type: String, default: 'normal' },
            alignment: {
              type: String,
              enum: ['left', 'center', 'right'],
              default: 'right',
            },
            width: { type: Number, default: 8 },
          },
        },
        pagination: {
          enabled: { type: Boolean, default: false },
          questionsPerPage: { type: Number, default: 50 },
          totalPages: { type: Number, default: 1 },
          pageNumberPosition: { x: Number, y: Number },
        },
      },
      footer: {
        enabled: { type: Boolean, default: true },
        height: { type: Number, default: 15 },
        elements: [
          {
            type: {
              type: String,
              enum: ['page_number', 'copyright', 'custom_text', 'qr_code'],
            },
            position: { x: Number, y: Number },
            content: String,
            fontSize: { type: Number, default: 8 },
          },
        ],
      },
    },
    scannerConfig: {
      orientation: {
        type: String,
        enum: ['portrait', 'landscape'],
        default: 'portrait',
      },
      binarizationThreshold: { type: Number, default: 128 },
      rotation: { type: Number, default: 0 },
      preprocessing: {
        deskew: { type: Boolean, default: true },
        crop: { type: Boolean, default: true },
        denoise: { type: Boolean, default: true },
        contrastEnhance: { type: Boolean, default: true },
      },
      detection: {
        autoDetectAnswerArea: { type: Boolean, default: true },
        debugMode: { type: Boolean, default: false },
        tolerance: {
          position: { type: Number, default: 5 },
          size: { type: Number, default: 10 },
          intensity: { type: Number, default: 15 },
        },
      },
    },
    validationRules: {
      allowMultipleAnswers: { type: Boolean, default: false },
      allowEmpty: { type: Boolean, default: true },
      warnDoubleFill: { type: Boolean, default: true },
      minIntensityWarning: { type: Number, default: 150 },
      scoreAnomalyThreshold: { type: Number, default: 0.3 },
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    level: {
      type: String,
      enum: ['system', 'school', 'custom'],
      default: 'system',
    },
    schoolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'School',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isDefault: {
      type: Boolean,
      default: false,
    },
    usageCount: {
      type: Number,
      default: 0,
    },
    tags: [String],
    previewImageUrl: String,
  },
  {
    timestamps: true,
  }
);

omrTemplateSchema.index({ code: 1 }, { unique: true });
omrTemplateSchema.index({ level: 1, isActive: 1 });
omrTemplateSchema.index({ tags: 1 });
omrTemplateSchema.index({ schoolId: 1, isDefault: 1 });

omrTemplateSchema.statics.getDefaultTemplate = async function () {
  return this.findOne({ isDefault: true, isActive: true });
};

omrTemplateSchema.statics.getTemplatesByLevel = async function (level, schoolId = null) {
  const query = { level, isActive: true };
  if (level === 'school') {
    query.schoolId = schoolId;
  }
  return this.find(query);
};

const OMRTemplate = mongoose.model('OMRTemplate', omrTemplateSchema);

module.exports = OMRTemplate;
