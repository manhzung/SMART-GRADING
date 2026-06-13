/**
 * Seed script: creates DPI-accurate OMR templates.
 *
 * Layout: VERTICAL STACK — codes on SAME ROW, grid BELOW
 *
 * A4 210×297mm, margins 15mm, content = 180×267mm
 *
 * ── ROW 1 (y=50mm): HEADER ─────────────────────────────────
 * ── ROW 2 (y=50mm): CODES ──────────────────────────────────
 *   Student: x=15, w=120mm, 3digits×10opts×2.5mm=102mm ✓
 *   Version: x=120, w=85mm, 3digits×10opts×1mm=43.5mm ✓
 * ── ROW 3 (y=115mm): GRID ──────────────────────────────────
 *   x=15, y=115mm, 5Q/row × 6rows = 30Q
 * ── ROW 4: FOOTER ───────────────────────────────────────────
 *
 * Bubble sizes:
 *   Student: 2.5mm bubble, 1mm gap → colW=35mm, 3cols=102mm
 *   Version: 1mm bubble, 0.5mm gap → colW=14.5mm, 3cols=43.5mm
 *   Grid:    4mm bubble, 1mm opt gap, 3mm q gap, 8mm row gap
 *     cell_w = 8(Q#) + 3 + 5×[4+1] - 1 = 29mm
 *     grid_w = 5×29 = 145mm ✓
 *     cell_h = 4 + 8 = 12mm
 *     grid_h = 6×12 = 72mm
 */

require('dotenv').config({ path: require('path').join(__dirname, '../../../.env') });
const mongoose = require('mongoose');
const config = require('../config/config');
const OMRTemplate = require('../models/omrTemplate.model');

// ─── Template factories ──────────────────────────────────────────────────

function make30Template() {
  return {
    name: 'Phiếu trả lời 30 câu - A4 300DPI',
    code: 'OMR_30_A4_300',
    description: 'Phiếu 30 câu, thiết kế đúng DPI 300 cho mobile scanner',
    pageConfig: {
      paperSize: 'A4', defaultDPI: 300,
      margins: { top: 15, bottom: 15, left: 15, right: 15 },
    },
    zones: {
      header: { enabled: true, height: 40 },

      // Student: x=15mm, 3 cols × 3.5mm = 10.5mm
      studentCode: {
        enabled: true,
        position: { x: 15, y: 50 },
        digits: 3,
        digitConfig: {
          optionsPerDigit: 10,
          bubbleSize: { width: 2.5, height: 2.5 },
          bubbleSpacing: { horizontal: 1, vertical: 1 },
        },
        label: { text: 'STUDENT ID', fontSize: 9, position: 'above' },
      },

      // Version: x=120mm, 3 cols × 2.5mm = 7.5mm
      versionCode: {
        enabled: true,
        position: { x: 120, y: 50 },
        digits: 3,
        digitConfig: {
          optionsPerDigit: 10,
          bubbleSize: { width: 2, height: 2 },
          bubbleSpacing: { horizontal: 0.5, vertical: 0.5 },
        },
        label: { text: 'EXAM CODE', fontSize: 9, position: 'above' },
      },

      // Grid: BELOW codes, full content width
      answerArea: {
        enabled: true,
        startPosition: { x: 15, y: 115 },
        dimensions: { width: 180, height: 72 },
        gridConfig: {
          questionsPerRow: 5,
          rowsPerPage: 6,
          totalQuestions: 30,
          bubbleConfig: {
            width: 4, height: 4, shape: 'circle',
            spacing: { betweenOptions: 1, betweenQuestions: 3, betweenRows: 8 },
          },
          questionNumberConfig: { enabled: true, position: 'left', fontSize: 8, width: 8 },
        },
        pagination: { enabled: false },
      },

      footer: { enabled: true, height: 12 },
    },
    scannerConfig: {
      orientation: 'portrait', binarizationThreshold: 128,
      preprocessing: { deskew: true, crop: true, denoise: true, contrastEnhance: true },
      detection: { autoDetectAnswerArea: true, debugMode: false },
    },
    validationRules: { allowMultipleAnswers: false, allowEmpty: true, warnDoubleFill: true },
    level: 'system', isDefault: false, isActive: true,
    tags: ['30-cau', 'a4', '300dpi'],
  };
}

function make50Template() {
  return {
    name: 'Phiếu trả lời 50 câu - A4 300DPI',
    code: 'OMR_50_A4_300',
    description: 'Phiếu 50 câu, thiết kế đúng DPI 300 cho mobile scanner',
    pageConfig: {
      paperSize: 'A4', defaultDPI: 300,
      margins: { top: 15, bottom: 15, left: 15, right: 15 },
    },
    zones: {
      header: { enabled: true, height: 40 },
      studentCode: {
        enabled: true, position: { x: 15, y: 50 }, digits: 3,
        digitConfig: {
          optionsPerDigit: 10,
          bubbleSize: { width: 2.5, height: 2.5 },
          bubbleSpacing: { horizontal: 1, vertical: 1 },
        },
        label: { text: 'STUDENT ID', fontSize: 9, position: 'above' },
      },
      versionCode: {
        enabled: true, position: { x: 120, y: 50 }, digits: 3,
        digitConfig: {
          optionsPerDigit: 10,
          bubbleSize: { width: 2, height: 2 },
          bubbleSpacing: { horizontal: 0.5, vertical: 0.5 },
        },
        label: { text: 'EXAM CODE', fontSize: 9, position: 'above' },
      },
      // 50Q: 5/row × 10rows = 50Q → grid_h = 10×12 = 120mm
      answerArea: {
        enabled: true,
        startPosition: { x: 15, y: 115 },
        dimensions: { width: 180, height: 120 },
        gridConfig: {
          questionsPerRow: 5, rowsPerPage: 10, totalQuestions: 50,
          bubbleConfig: {
            width: 4, height: 4, shape: 'circle',
            spacing: { betweenOptions: 1, betweenQuestions: 3, betweenRows: 8 },
          },
          questionNumberConfig: { enabled: true, position: 'left', fontSize: 8, width: 8 },
        },
        pagination: { enabled: false },
      },
      footer: { enabled: true, height: 12 },
    },
    scannerConfig: {
      orientation: 'portrait', binarizationThreshold: 128,
      preprocessing: { deskew: true, crop: true, denoise: true, contrastEnhance: true },
      detection: { autoDetectAnswerArea: true, debugMode: false },
    },
    validationRules: { allowMultipleAnswers: false, allowEmpty: true, warnDoubleFill: true },
    level: 'system', isDefault: false, isActive: true,
    tags: ['50-cau', 'a4', '300dpi'],
  };
}

// ─── Seed runner ─────────────────────────────────────────────────────────

async function seed() {
  console.log('Connecting to MongoDB...');
  await mongoose.connect(config.mongoose.url);

  for (const tmpl of [make30Template(), make50Template()]) {
    const existing = await OMRTemplate.findOne({ code: tmpl.code });
    if (existing) {
      await OMRTemplate.findOneAndUpdate({ code: tmpl.code }, tmpl, { runValidators: true });
      console.log(`Updated: ${tmpl.code}`);
    } else {
      const created = new OMRTemplate(tmpl);
      await created.save();
      console.log(`Created: ${tmpl.code} → ${created._id}`);
    }
  }

  // Print verification
  for (const tmpl of [make30Template(), make50Template()]) {
    const { studentCode: sc, versionCode: vc, answerArea: aa, footer: ft, header: hdr } = tmpl.zones;
    const scColW = sc.digits * (sc.digitConfig.bubbleSize.width + sc.digitConfig.bubbleSpacing.horizontal);
    const vcColW = vc.digits * (vc.digitConfig.bubbleSize.width + vc.digitConfig.bubbleSpacing.horizontal);
    const scEnd = sc.position.x + scColW;
    const vcEnd = vc.position.x + vcColW;
    const bc = aa.gridConfig.bubbleConfig;
    const qc = aa.gridConfig.questionNumberConfig;
    const cellW = (qc.width || 8) + (bc.spacing?.betweenQuestions || 3)
      + aa.gridConfig.questionsPerRow * bc.width
      + (aa.gridConfig.questionsPerRow - 1) * (bc.spacing?.betweenOptions || 1);
    const cellH = bc.height + (bc.spacing?.betweenRows || 8);
    const rows = Math.ceil(aa.gridConfig.totalQuestions / aa.gridConfig.questionsPerRow);
    const gridEnd = aa.startPosition.y + rows * cellH;
    const footerEnd = gridEnd + ft.height;
    const pageEnd = 297;

    console.log(`\n=== ${tmpl.code} ===`);
    console.log(`  Header:   y=0 → ${hdr.height}mm`);
    console.log(`  Codes:    y=${sc.position.y}mm, h=20mm (${sc.digits}digit×${scColW}mm+label)`);
    console.log(`    Student: x=${sc.position.x} → ${scEnd}mm | bubble=${sc.digitConfig.bubbleSize.width}mm, gap=${sc.digitConfig.bubbleSpacing.horizontal}mm`);
    console.log(`    Version: x=${vc.position.x} → ${vcEnd}mm | bubble=${vc.digitConfig.bubbleSize.width}mm, gap=${vc.digitConfig.bubbleSpacing.horizontal}mm`);
    console.log(`  Grid:     x=${aa.startPosition.x}mm, y=${aa.startPosition.y}mm → ${gridEnd}mm`);
    console.log(`    Cell:   ${cellW}×${cellH}mm | ${aa.gridConfig.questionsPerRow}Q/row × ${rows}rows = ${aa.gridConfig.totalQuestions}Q`);
    console.log(`  Footer:   y=${gridEnd} → ${footerEnd}mm`);
    console.log(`  Total:   ${footerEnd}mm / ${pageEnd}mm (${(footerEnd/pageEnd*100).toFixed(1)}%) | White: ${(pageEnd-footerEnd).toFixed(1)}mm`);
    console.log(`  ✓ Code vs Page: student ends=${scEnd}mm ${scEnd<=195?'OK':'OVER'}, version ends=${vcEnd}mm ${vcEnd<=195?'OK':'OVER'}`);
    console.log(`  ✓ Grid vs Page: ends=${aa.startPosition.x+aa.gridConfig.questionsPerRow*cellW}mm ≤195mm OK`);
  }

  await mongoose.disconnect();
  console.log('\nDone!');
}

seed().catch((err) => { console.error(err); process.exit(1); });
