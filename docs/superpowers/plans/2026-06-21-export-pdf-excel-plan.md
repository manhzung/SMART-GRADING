# Backend Export PDF/Excel Report Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement real PDF and Excel export for exam reports so teachers can download formatted grade reports. PDF uses PDFKit (already in package.json), Excel uses `exceljs` package.

**Architecture:** A dedicated `ExportService` handles both PDF and Excel generation. It fetches report data from `ExamReport` model, generates files to disk in a temp directory, uploads to Cloudinary, and returns the download URL. The existing `exportReport` endpoint in `report.controller.js` is updated to use this service.

**Tech Stack:** Node.js/Express, `pdfkit` (already in deps), `exceljs` (new), `cloudinary` (already in deps), `ExamReport` model.

---

## File Structure

```
server/src/
├── services/
│   └── export.service.js         # PDF + Excel generation
└── tests/
    └── unit/services/export.service.test.js
```

**Prerequisites:** None (standalone).

---

## Task 1: Install exceljs and create ExportService

**Files:**
- Modify: `server/package.json` (add exceljs)
- Create: `server/src/services/export.service.js`
- Create: `server/tests/unit/services/export.service.test.js`

- [ ] **Step 1: Install exceljs dependency**

Run: `cd c:\TAILIEU\DATN\SMART GRADING\server && npm install exceljs --save`

- [ ] **Step 2: Write failing test**

Create `server/tests/unit/services/export.service.test.js`:

```javascript
const exportService = require('../../../src/services/export.service');

describe('ExportService', () => {
  describe('generatePdf', () => {
    it('should be a function', () => {
      expect(typeof exportService.generatePdf).toBe('function');
    });
  });

  describe('generateExcel', () => {
    it('should be a function', () => {
      expect(typeof exportService.generateExcel).toBe('function');
    });
  });

  describe('uploadToCloudinary', () => {
    it('should be a function', () => {
      expect(typeof exportService.uploadToCloudinary).toBe('function');
    });
  });

  describe('generateExamReportPdf', () => {
    it('should be a function', () => {
      expect(typeof exportService.generateExamReportPdf).toBe('function');
    });
  });

  describe('generateExamReportExcel', () => {
    it('should be a function', () => {
      expect(typeof exportService.generateExamReportExcel).toBe('function');
    });
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `cd c:\TAILIEU\DATN\SMART GRADING\server && npm test -- tests/unit/services/export.service.test.js --testPathIgnorePatterns=[]`
Expected: FAIL with "Cannot find module"

- [ ] **Step 4: Write ExportService**

Create `server/src/services/export.service.js`:

```javascript
const fs = require('fs');
const path = require('path');
const os = require('os');
const PDFDocument = require('pdfkit');
const ExcelJS = require('exceljs');
const cloudinary = require('cloudinary').v2;
const config = require('../config/config');
const { ExamReport, Submission, Exam } = require('../models');

cloudinary.config({
  cloud_name: config.cloudinary?.cloud_name,
  api_key: config.cloudinary?.api_key,
  api_secret: config.cloudinary?.api_secret,
});

class ExportService {
  /**
   * Generate a PDF report for an exam
   */
  async generateExamReportPdf(examId) {
    const report = await ExamReport.findOne({ examId })
      .populate('examId', 'title examDate subjectId')
      .lean();

    if (!report) {
      throw new Error('Report not found');
    }

    const exam = await Exam.findById(examId).lean();
    const submissions = await Submission.find({ examId, status: 'completed' })
      .populate('studentId', 'name studentCode')
      .lean();

    return new Promise((resolve, reject) => {
      const tempDir = os.tmpdir();
      const fileName = `report_${examId}_${Date.now()}.pdf`;
      const filePath = path.join(tempDir, fileName);

      const doc = new PDFDocument({ margin: 50 });
      const stream = fs.createWriteStream(filePath);

      doc.pipe(stream);

      // ─── Header ───────────────────────────────────────────────────────────────
      doc.fontSize(18).font('Helvetica-Bold').text('BÁO CÁO KẾT QUẢ BÀI THI', { align: 'center' });
      doc.moveDown(0.5);
      doc.fontSize(14).font('Helvetica-Bold').text(exam?.title || 'Exam Report', { align: 'center' });
      doc.moveDown(0.3);
      doc.fontSize(10).font('Helvetica').text(`Ngày thi: ${exam?.examDate ? new Date(exam.examDate).toLocaleDateString('vi-VN') : 'N/A'}`, { align: 'center' });
      doc.moveDown(1);

      // ─── Statistics Summary ───────────────────────────────────────────────────
      doc.fontSize(12).font('Helvetica-Bold').text('THỐNG KÊ TỔNG QUÁT', { underline: true });
      doc.moveDown(0.5);
      const stats = report.statistics || {};
      doc.fontSize(10).font('Helvetica');
      doc.text(`Tổng học sinh: ${stats.totalStudents || 0}`);
      doc.text(`Số bài nộp: ${stats.submittedCount || 0}`);
      doc.text(`Điểm trung bình: ${(stats.averagePercentage || 0).toFixed(1)}% (${(stats.averageScore || 0).toFixed(2)}/${exam?.totalScore || 10})`);
      doc.text(`Điểm cao nhất: ${(stats.highestScore || 0).toFixed(2)}`);
      doc.text(`Điểm thấp nhất: ${(stats.lowestScore || 0).toFixed(2)}`);
      doc.text(`Độ lệch chuẩn: ${(stats.standardDeviation || 0).toFixed(2)}`);
      doc.moveDown(1);

      // ─── Grade Distribution ───────────────────────────────────────────────────
      const gradeDist = report.gradeDistribution || {};
      doc.fontSize(12).font('Helvetica-Bold').text('PHÂN BỔ ĐIỂM', { underline: true });
      doc.moveDown(0.5);
      doc.fontSize(10).font('Helvetica');

      const gradeRows = [
        ['Xuất sắc (8.5+)', gradeDist.excellent?.count || 0, `${(gradeDist.excellent?.percentage || 0).toFixed(1)}%`],
        ['Giỏi (7.0-8.4)', gradeDist.good?.count || 0, `${(gradeDist.good?.percentage || 0).toFixed(1)}%`],
        ['Khá (5.0-6.9)', gradeDist.average?.count || 0, `${(gradeDist.average?.percentage || 0).toFixed(1)}%`],
        ['Yếu (<5.0)', gradeDist.poor?.count || 0, `${(gradeDist.poor?.percentage || 0).toFixed(1)}%`],
        ['Đạt', gradeDist.passed?.count || 0, `${(gradeDist.passed?.percentage || 0).toFixed(1)}%`],
        ['Không đạt', gradeDist.failed?.count || 0, `${(gradeDist.failed?.percentage || 0).toFixed(1)}%`],
      ];

      this.drawTable(doc, ['Xếp loại', 'Số lượng', 'Tỷ lệ'], gradeRows, [[50, 280], [180, 220], [250, 300]]);

      doc.moveDown(1);

      // ─── Score Distribution ───────────────────────────────────────────────────
      if (report.scoreDistribution && report.scoreDistribution.length > 0) {
        doc.fontSize(12).font('Helvetica-Bold').text('BIỂU ĐỒ PHÂN BỔ ĐIỂM', { underline: true });
        doc.moveDown(0.5);

        const maxBarWidth = 400;
        report.scoreDistribution.forEach((bucket) => {
          const barWidth = ((bucket.count || 0) / (stats.totalStudents || 1)) * maxBarWidth;
          doc.fontSize(9).font('Helvetica');
          doc.text(`${bucket.range}: ${bucket.count || 0} HS`, 50, doc.y, { continued: true });
          // Draw simple bar
          doc.rect(doc.x + 5, doc.y - 3, Math.max(barWidth, 2), 8).fill('#6366F1');
          doc.moveDown(0.8);
        });
        doc.moveDown(0.5);
      }

      // ─── Top/Bottom Students ──────────────────────────────────────────────────
      if (report.topStudents && report.topStudents.length > 0) {
        doc.addPage();
        doc.fontSize(12).font('Helvetica-Bold').text('TOP 10 HỌC SINH', { underline: true });
        doc.moveDown(0.5);

        const topRows = report.topStudents.map((s, i) => [
          String(s.rank),
          s.studentName || 'N/A',
          s.studentCode || 'N/A',
          `${(s.score || 0).toFixed(2)}`,
          `${(s.percentage || 0).toFixed(1)}%`,
        ]);

        this.drawTable(doc, ['Hạng', 'Họ tên', 'MSSV', 'Điểm', 'Phần trăm'], topRows, [[30, 60], [60, 200], [200, 260], [260, 310], [310, 370]]);

        doc.moveDown(1);
      }

      if (report.bottomStudents && report.bottomStudents.length > 0) {
        doc.fontSize(12).font('Helvetica-Bold').text('BOTTOM 10 HỌC SINH', { underline: true });
        doc.moveDown(0.5);

        const bottomRows = report.bottomStudents.map((s, i) => [
          String(s.rank),
          s.studentName || 'N/A',
          s.studentCode || 'N/A',
          `${(s.score || 0).toFixed(2)}`,
          `${(s.percentage || 0).toFixed(1)}%`,
        ]);

        this.drawTable(doc, ['Hạng', 'Họ tên', 'MSSV', 'Điểm', 'Phần trăm'], bottomRows, [[30, 60], [60, 200], [200, 260], [260, 310], [310, 370]]);
      }

      // ─── AI Insights ──────────────────────────────────────────────────────────
      if (report.insights && (report.insights.overallAnalysis || (report.insights.recommendations && report.insights.recommendations.length > 0))) {
        doc.addPage();
        doc.fontSize(12).font('Helvetica-Bold').text('PHÂN TÍCH TỪ AI', { underline: true });
        doc.moveDown(0.5);

        if (report.insights.overallAnalysis) {
          doc.fontSize(10).font('Helvetica-Bold').text('Đánh giá tổng quan:');
          doc.fontSize(10).font('Helvetica').text(report.insights.overallAnalysis, { align: 'left' });
          doc.moveDown(0.5);
        }

        if (report.insights.recommendations && report.insights.recommendations.length > 0) {
          doc.fontSize(10).font('Helvetica-Bold').text('Khuyến nghị:');
          report.insights.recommendations.forEach((rec, i) => {
            doc.fontSize(10).font('Helvetica').text(`${i + 1}. ${rec}`);
          });
        }
      }

      // ─── Footer ───────────────────────────────────────────────────────────────
      doc.moveDown(2);
      doc.fontSize(8).font('Helvetica').text(
        `Generated on ${new Date().toLocaleString('vi-VN')} | Smart Grading System`,
        { align: 'center' }
      );

      doc.end();

      stream.on('finish', () => resolve(filePath));
      stream.on('error', reject);
    });
  }

  /**
   * Generate an Excel report for an exam
   */
  async generateExamReportExcel(examId) {
    const report = await ExamReport.findOne({ examId })
      .populate('examId', 'title examDate')
      .lean();

    if (!report) {
      throw new Error('Report not found');
    }

    const submissions = await Submission.find({ examId, status: 'completed' })
      .populate('studentId', 'name studentCode')
      .lean();

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Smart Grading';
    workbook.created = new Date();

    // ─── Sheet 1: Summary ────────────────────────────────────────────────────
    const summarySheet = workbook.addWorksheet('TongQuan');
    summarySheet.columns = [
      { header: 'Chỉ tiêu', key: 'label', width: 25 },
      { header: 'Giá trị', key: 'value', width: 20 },
    ];

    const stats = report.statistics || {};
    const gradeDist = report.gradeDistribution || {};

    summarySheet.addRows([
      { label: 'Tổng học sinh', value: stats.totalStudents || 0 },
      { label: 'Số bài nộp', value: stats.submittedCount || 0 },
      { label: 'Điểm trung bình', value: `${(stats.averagePercentage || 0).toFixed(1)}%` },
      { label: 'Điểm cao nhất', value: (stats.highestScore || 0).toFixed(2) },
      { label: 'Điểm thấp nhất', value: (stats.lowestScore || 0).toFixed(2) },
      { label: 'Median', value: (stats.medianScore || 0).toFixed(2) },
      { label: 'Độ lệch chuẩn', value: (stats.standardDeviation || 0).toFixed(2) },
      { label: 'Xuất sắc', value: `${gradeDist.excellent?.count || 0} (${(gradeDist.excellent?.percentage || 0).toFixed(1)}%)` },
      { label: 'Giỏi', value: `${gradeDist.good?.count || 0} (${(gradeDist.good?.percentage || 0).toFixed(1)}%)` },
      { label: 'Khá', value: `${gradeDist.average?.count || 0} (${(gradeDist.average?.percentage || 0).toFixed(1)}%)` },
      { label: 'Yếu', value: `${gradeDist.poor?.count || 0} (${(gradeDist.poor?.percentage || 0).toFixed(1)}%)` },
    ]);

    // Style header
    summarySheet.getRow(1).font = { bold: true };
    summarySheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF6366F1' } };
    summarySheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };

    // ─── Sheet 2: Score Distribution ─────────────────────────────────────────
    if (report.scoreDistribution && report.scoreDistribution.length > 0) {
      const distSheet = workbook.addWorksheet('PhanBoDiem');
      distSheet.columns = [
        { header: 'Khoảng điểm', key: 'range', width: 15 },
        { header: 'Số lượng', key: 'count', width: 12 },
        { header: 'Tỷ lệ %', key: 'percentage', width: 12 },
      ];
      report.scoreDistribution.forEach((bucket) => {
        distSheet.addRow({
          range: bucket.range,
          count: bucket.count || 0,
          percentage: `${(bucket.percentage || 0).toFixed(1)}%`,
        });
      });
      distSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
      distSheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF6366F1' } };
    }

    // ─── Sheet 3: Student Scores ──────────────────────────────────────────────
    const scoresSheet = workbook.addWorksheet('DiemHocSinh');
    scoresSheet.columns = [
      { header: 'Hạng', key: 'rank', width: 8 },
      { header: 'Họ tên', key: 'name', width: 25 },
      { header: 'MSSV', key: 'code', width: 15 },
      { header: 'Điểm', key: 'score', width: 10 },
      { header: 'Phần trăm', key: 'percentage', width: 12 },
      { header: 'Xếp loại', key: 'grade', width: 12 },
    ];

    // Combine and sort all submissions
    const allScores = submissions.map((s) => ({
      studentName: s.studentId?.name || 'N/A',
      studentCode: s.studentId?.studentCode || 'N/A',
      score: s.totalScore || 0,
      maxScore: s.maxScore || 10,
      percentage: s.maxScore ? ((s.totalScore || 0) / s.maxScore) * 100 : 0,
    }));

    allScores.sort((a, b) => b.percentage - a.percentage);

    allScores.forEach((s, i) => {
      const pct = s.percentage;
      const grade = pct >= 85 ? 'Xuất sắc' : pct >= 70 ? 'Giỏi' : pct >= 50 ? 'Khá' : 'Yếu';
      scoresSheet.addRow({
        rank: i + 1,
        name: s.studentName,
        code: s.studentCode,
        score: s.score.toFixed(2),
        percentage: `${pct.toFixed(1)}%`,
        grade,
      });
    });

    scoresSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    scoresSheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF6366F1' } };

    // ─── Sheet 4: AI Insights ────────────────────────────────────────────────
    if (report.insights) {
      const insightsSheet = workbook.addWorksheet('AIInsights');
      insightsSheet.columns = [
        { header: 'Loại', key: 'type', width: 20 },
        { header: 'Nội dung', key: 'content', width: 60 },
      ];

      if (report.insights.overallAnalysis) {
        insightsSheet.addRow({ type: 'Đánh giá tổng quan', content: report.insights.overallAnalysis });
      }
      if (report.insights.recommendations) {
        report.insights.recommendations.forEach((rec, i) => {
          insightsSheet.addRow({ type: `Khuyến nghị ${i + 1}`, content: rec });
        });
      }
      if (report.insights.weakTopics) {
        report.insights.weakTopics.forEach((t) => {
          insightsSheet.addRow({ type: 'Chủ đề yếu', content: `${t.topicName || 'N/A'} (${t.affectedStudents || 0} HS)` });
        });
      }
      if (report.insights.strongTopics) {
        report.insights.strongTopics.forEach((t) => {
          insightsSheet.addRow({ type: 'Chủ đề mạnh', content: `${t.topicName || 'N/A'} (${t.studentCount || 0} HS)` });
        });
      }

      insightsSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
      insightsSheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF6366F1' } };
    }

    // Write to temp file
    const tempDir = os.tmpdir();
    const fileName = `report_${examId}_${Date.now()}.xlsx`;
    const filePath = path.join(tempDir, fileName);

    await workbook.xlsx.writeFile(filePath);
    return filePath;
  }

  /**
   * Upload a file to Cloudinary
   */
  async uploadToCloudinary(filePath, folder = 'reports') {
    return new Promise((resolve, reject) => {
      cloudinary.uploader.upload(
        filePath,
        {
          folder,
          resource_type: 'raw',
          use_filename: true,
          unique_filename: true,
        },
        (error, result) => {
          if (error) {
            reject(error);
          } else {
            resolve(result.secure_url);
          }
        }
      );
    });
  }

  // ─── Private helpers ────────────────────────────────────────────────────────────

  /**
   * Draw a simple table in PDF
   */
  drawTable(doc, headers, rows, columnWidths) {
    const startX = 50;
    const startY = doc.y;
    const rowHeight = 18;

    // Draw header
    doc.font('Helvetica-Bold').fontSize(10);
    headers.forEach((h, i) => {
      const [x1, x2] = columnWidths[i] || [0, 100];
      doc.rect(startX + x1, startY, x2 - x1, rowHeight).stroke();
      doc.text(h, startX + x1 + 2, startY + 4, { width: x2 - x1 - 4 });
    });

    // Draw rows
    doc.font('Helvetica').fontSize(9);
    rows.forEach((row, rowIdx) => {
      const y = startY + (rowIdx + 1) * rowHeight;
      row.forEach((cell, colIdx) => {
        const [x1, x2] = columnWidths[colIdx] || [0, 100];
        doc.rect(startX + x1, y, x2 - x1, rowHeight).stroke();
        doc.text(String(cell), startX + x1 + 2, y + 4, { width: x2 - x1 - 4 });
      });
    });

    doc.y = startY + (rows.length + 1) * rowHeight;
  }
}

module.exports = new ExportService();
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd c:\TAILIEU\DATN\SMART GRADING\server && npm test -- tests/unit/services/export.service.test.js --testPathIgnorePatterns=[]`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add server/src/services/export.service.js server/tests/unit/services/export.service.test.js server/package.json
git commit -m "feat(export): add PDF and Excel export service"
```

---

## Task 2: Update report service to use ExportService

**Files:**
- Modify: `server/src/services/report.service.js` (update `exportReport` method)

- [ ] **Step 1: Update exportReport in report.service.js**

In `server/src/services/report.service.js`, replace the existing `exportReport` method:

```javascript
async exportReport(examId, format) {
  const report = await ExamReport.findOne({ examId });
  if (!report) {
    throw new ApiError(404, 'Report not found');
  }

  const exportService = require('./export.service');

  try {
    let filePath;
    if (format === 'pdf') {
      filePath = await exportService.generateExamReportPdf(examId);
    } else if (format === 'excel') {
      filePath = await exportService.generateExamReportExcel(examId);
    } else {
      throw new ApiError(400, 'Invalid format. Supported: pdf, excel');
    }

    // Upload to Cloudinary
    const downloadUrl = await exportService.uploadToCloudinary(filePath, 'exam-reports');

    // Clean up temp file
    try { require('fs').unlinkSync(filePath); } catch (e) { /* ignore */ }

    return {
      report,
      format,
      downloadUrl,
    };
  } catch (error) {
    throw new ApiError(500, `Export failed: ${error.message}`);
  }
}
```

Also add `require('../models')` at the top if not already there. The file already has `const { ExamReport, Submission, Exam } = require('../models');` so no import change needed.

- [ ] **Step 2: Run all server tests**

Run: `cd c:\TAILIEU\DATN\SMART GRADING\server && npm test -- --testPathIgnorePatterns=[]`
Expected: All tests pass

- [ ] **Step 3: Commit**

```bash
git add server/src/services/report.service.js
git commit -m "feat(export): wire ExportService into report export endpoint"
```

---

## Self-Review Checklist

1. **Spec coverage:**
   - ✅ PDF export with statistics, grade distribution, charts, top/bottom students, AI insights
   - ✅ Excel export with 4 sheets: Summary, Score Distribution, Student Scores, AI Insights
   - ✅ Cloudinary upload for file hosting
   - ✅ Updates existing `exportReport` endpoint

2. **Placeholder scan:** No "TBD" or "TODO" in the plan.

3. **Type consistency:** Methods match across tasks (generateExamReportPdf, generateExamReportExcel, uploadToCloudinary).

4. **Dependencies:** None (standalone).
