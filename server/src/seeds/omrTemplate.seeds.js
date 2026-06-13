const mongoose = require('mongoose');

const OMRTemplate = require('../models/omrTemplate.model');

const defaultTemplates = [
  {
    name: 'Phiếu trả lời 30 câu - Tiêu chuẩn',
    code: 'OMR_30_STD',
    description: 'Phiếu trả lời chuẩn với 30 câu hỏi, phù hợp cho bài thi giữa kỳ',
    pageConfig: {
      paperSize: 'A4',
      defaultDPI: 300,
      margins: { top: 15, bottom: 15, left: 15, right: 15 },
    },
    zones: {
      header: {
        enabled: true,
        height: 40,
        elements: [
          { type: 'school_logo', position: { x: 10, y: 10 }, width: 20, height: 20 },
          { type: 'school_name', position: { x: 35, y: 10 }, width: 100, fontSize: 14 },
          { type: 'exam_title', position: { x: 35, y: 25 }, width: 100, fontSize: 12 },
        ],
      },
      versionCode: {
        enabled: true,
        position: { x: 120, y: 50 },
        digits: 3,
        digitConfig: {
          optionsPerDigit: 10,
          bubbleSize: { width: 2, height: 2 },
          bubbleSpacing: { horizontal: 0.5, vertical: 0.5 },
        },
        label: { text: 'Mã đề', fontSize: 9, position: 'above' },
      },
      studentCode: {
        enabled: true,
        position: { x: 15, y: 50 },
        digits: 3,
        digitConfig: {
          optionsPerDigit: 10,
          bubbleSize: { width: 2.5, height: 2.5 },
          bubbleSpacing: { horizontal: 1, vertical: 1 },
        },
        label: { text: 'Số báo danh', fontSize: 9, position: 'above' },
      },
      answerArea: {
        enabled: true,
        startPosition: { x: 15, y: 115 },
        dimensions: { width: 180, height: 72 },
        gridConfig: {
          questionsPerRow: 5,
          rowsPerPage: 6,
          totalQuestions: 30,
          bubbleConfig: {
            width: 4,
            height: 4,
            shape: 'circle',
            borderColor: '#000000',
            borderWidth: 0.5,
            fillColor: '#000000',
            minFillIntensity: 180,
            spacing: {
              betweenOptions: 1,
              betweenQuestions: 3,
              betweenRows: 8,
            },
          },
          questionNumberConfig: {
            enabled: true,
            position: 'left',
            fontSize: 8,
            fontWeight: 'normal',
            alignment: 'right',
            width: 8,
          },
        },
        pagination: { enabled: false },
      },
      footer: { enabled: true, height: 12 },
    },
    scannerConfig: {
      orientation: 'portrait',
      binarizationThreshold: 128,
      rotation: 0,
      preprocessing: {
        deskew: true,
        crop: true,
        denoise: true,
        contrastEnhance: true,
      },
      detection: {
        autoDetectAnswerArea: true,
        debugMode: false,
        tolerance: { position: 5, size: 10, intensity: 15 },
      },
    },
    validationRules: {
      allowMultipleAnswers: false,
      allowEmpty: true,
      warnDoubleFill: true,
      minIntensityWarning: 150,
      scoreAnomalyThreshold: 0.3,
    },
    level: 'system',
    isDefault: true,
    isActive: true,
    tags: ['30-cau', 'tieu-chuan', 'a4'],
  },
  {
    name: 'Phiếu trả lời 50 câu - Dài',
    code: 'OMR_50_LONG',
    description: 'Phiếu trả lời dài với 50 câu hỏi, phù hợp cho bài thi cuối kỳ',
    pageConfig: {
      paperSize: 'A4',
      defaultDPI: 300,
      margins: { top: 15, bottom: 15, left: 15, right: 15 },
    },
    zones: {
      header: { enabled: true, height: 40 },
      versionCode: {
        enabled: true,
        position: { x: 120, y: 50 },
        digits: 3,
        digitConfig: {
          optionsPerDigit: 10,
          bubbleSize: { width: 2, height: 2 },
          bubbleSpacing: { horizontal: 0.5, vertical: 0.5 },
        },
        label: { text: 'Mã đề', fontSize: 9, position: 'above' },
      },
      studentCode: {
        enabled: true,
        position: { x: 15, y: 50 },
        digits: 3,
        digitConfig: {
          optionsPerDigit: 10,
          bubbleSize: { width: 2.5, height: 2.5 },
          bubbleSpacing: { horizontal: 1, vertical: 1 },
        },
        label: { text: 'Số báo danh', fontSize: 9, position: 'above' },
      },
      answerArea: {
        enabled: true,
        startPosition: { x: 15, y: 115 },
        dimensions: { width: 180, height: 120 },
        gridConfig: {
          questionsPerRow: 5,
          rowsPerPage: 10,
          totalQuestions: 50,
          bubbleConfig: {
            width: 4,
            height: 4,
            shape: 'circle',
            borderColor: '#000000',
            borderWidth: 0.5,
            minFillIntensity: 180,
            spacing: {
              betweenOptions: 1,
              betweenQuestions: 3,
              betweenRows: 8,
            },
          },
          questionNumberConfig: {
            enabled: true,
            position: 'left',
            fontSize: 8,
            width: 8,
          },
        },
        pagination: { enabled: false },
      },
      footer: { enabled: true, height: 12 },
    },
    scannerConfig: {
      orientation: 'portrait',
      binarizationThreshold: 128,
      preprocessing: { deskew: true, crop: true, denoise: true, contrastEnhance: true },
      detection: { autoDetectAnswerArea: true, debugMode: false },
    },
    validationRules: {
      allowMultipleAnswers: false,
      allowEmpty: true,
      warnDoubleFill: true,
    },
    level: 'system',
    isDefault: false,
    isActive: true,
    tags: ['50-cau', 'dai', 'cuoi-ky'],
  },
  {
    name: 'Phiếu trả lời 15 câu - Ngắn',
    code: 'OMR_15_SHORT',
    description: 'Phiếu trả lời ngắn với 15 câu hỏi, phù hợp cho bài kiểm tra 15 phút',
    pageConfig: {
      paperSize: 'A5',
      defaultDPI: 300,
      margins: { top: 10, bottom: 10, left: 10, right: 10 },
    },
    zones: {
      header: { enabled: true, height: 30 },
      versionCode: {
        enabled: true,
        position: { x: 100, y: 35 },
        digits: 2,
        digitConfig: {
          optionsPerDigit: 10,
          bubbleSize: { width: 2.5, height: 2.5 },
          bubbleSpacing: { horizontal: 1, vertical: 1 },
        },
        label: { text: 'MĐ', fontSize: 9, position: 'above' },
      },
      studentCode: {
        enabled: true,
        position: { x: 15, y: 35 },
        digits: 2,
        digitConfig: {
          optionsPerDigit: 10,
          bubbleSize: { width: 2.5, height: 2.5 },
          bubbleSpacing: { horizontal: 1, vertical: 1 },
        },
        label: { text: 'SBD', fontSize: 9, position: 'above' },
      },
      answerArea: {
        enabled: true,
        startPosition: { x: 15, y: 65 },
        dimensions: { width: 120, height: 40 },
        gridConfig: {
          questionsPerRow: 5,
          rowsPerPage: 3,
          totalQuestions: 15,
          bubbleConfig: {
            width: 3,
            height: 3,
            shape: 'circle',
            minFillIntensity: 180,
            spacing: {
              betweenOptions: 0.5,
              betweenQuestions: 2,
              betweenRows: 8,
            },
          },
          questionNumberConfig: {
            enabled: true,
            position: 'left',
            fontSize: 8,
            width: 6,
          },
        },
        pagination: { enabled: false },
      },
      footer: { enabled: false },
    },
    scannerConfig: {
      orientation: 'portrait',
      binarizationThreshold: 128,
      preprocessing: { deskew: true, crop: true },
      detection: { autoDetectAnswerArea: true },
    },
    validationRules: {
      allowMultipleAnswers: false,
      allowEmpty: true,
      warnDoubleFill: true,
    },
    level: 'system',
    isDefault: false,
    isActive: true,
    tags: ['15-cau', 'ngan', 'kt15p'],
  },
  {
    name: 'Phiếu trả lời 40 câu - Tiêu chuẩn',
    code: 'OMR_40_STD',
    description: 'Phiếu trả lời 40 câu, cân bằng giữa độ dài và số câu',
    pageConfig: {
      paperSize: 'A4',
      defaultDPI: 300,
      margins: { top: 15, bottom: 15, left: 15, right: 15 },
    },
    zones: {
      header: { enabled: true, height: 38 },
      versionCode: {
        enabled: true,
        position: { x: 120, y: 50 },
        digits: 3,
        digitConfig: {
          optionsPerDigit: 10,
          bubbleSize: { width: 2, height: 2 },
          bubbleSpacing: { horizontal: 0.5, vertical: 0.5 },
        },
        label: { text: 'Mã đề', fontSize: 9, position: 'above' },
      },
      studentCode: {
        enabled: true,
        position: { x: 15, y: 50 },
        digits: 3,
        digitConfig: {
          optionsPerDigit: 10,
          bubbleSize: { width: 2.5, height: 2.5 },
          bubbleSpacing: { horizontal: 1, vertical: 1 },
        },
        label: { text: 'Số báo danh', fontSize: 9, position: 'above' },
      },
      answerArea: {
        enabled: true,
        startPosition: { x: 15, y: 115 },
        dimensions: { width: 180, height: 96 },
        gridConfig: {
          questionsPerRow: 5,
          rowsPerPage: 8,
          totalQuestions: 40,
          bubbleConfig: {
            width: 4,
            height: 4,
            shape: 'circle',
            minFillIntensity: 180,
            spacing: {
              betweenOptions: 1,
              betweenQuestions: 3,
              betweenRows: 8,
            },
          },
          questionNumberConfig: {
            enabled: true,
            position: 'left',
            fontSize: 8,
            width: 8,
          },
        },
        pagination: { enabled: false },
      },
      footer: { enabled: true, height: 12 },
    },
    scannerConfig: {
      orientation: 'portrait',
      binarizationThreshold: 128,
      preprocessing: { deskew: true, crop: true, denoise: true, contrastEnhance: true },
      detection: { autoDetectAnswerArea: true },
    },
    validationRules: {
      allowMultipleAnswers: false,
      allowEmpty: true,
      warnDoubleFill: true,
    },
    level: 'system',
    isDefault: false,
    isActive: true,
    tags: ['40-cau', 'can-bang', 'a4'],
  },
];

async function seedOMRTemplates() {
  console.log('Seeding OMR Templates...');

  for (const templateData of defaultTemplates) {
    try {
      const existing = await OMRTemplate.findOne({ code: templateData.code });

      if (existing) {
        await OMRTemplate.findOneAndUpdate({ code: templateData.code }, templateData, { runValidators: true });
        console.log(`Updated template: ${templateData.code} - ${templateData.name}`);
        continue;
      }

      const template = new OMRTemplate(templateData);
      await template.save();
      console.log(`Created template: ${templateData.code} - ${templateData.name}`);
    } catch (error) {
      console.error(`Error creating template ${templateData.code}:`, error.message);
    }
  }

  console.log('OMR Templates seeding completed!');
}

module.exports = seedOMRTemplates;
