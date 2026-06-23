const fs = require('fs');
const path = require('path');
const os = require('os');
const PDFDocument = require('pdfkit');
const ExcelJS = require('exceljs');
const cloudinary = require('cloudinary').v2;
const config = require('../config/config');
const ApiError = require('../utils/ApiError');
const { ExamReport, Submission, Exam } = require('../models');

cloudinary.config({
  cloud_name: config.cloudinary?.cloud_name,
  api_key: config.cloudinary?.api_key,
  api_secret: config.cloudinary?.api_secret,
});

// Font paths for Vietnamese support
const FONT_DIR = 'C:\\Windows\\Fonts';
const VIETNAMESE_FONTS = {
  arial: path.join(FONT_DIR, 'arial.ttf'),
  arialBold: path.join(FONT_DIR, 'arialbd.ttf'),
};

function getVietnameseFont(fontPath) {
  if (fs.existsSync(fontPath)) {
    return fontPath;
  }
  return undefined;
}

class ExportService {
  async generatePdf(data) {
    const { title, headers, rows } = data;
    return new Promise((resolve, reject) => {
      const tempDir = os.tmpdir();
      const fileName = `export_${Date.now()}.pdf`;
      const filePath = path.join(tempDir, fileName);

      const doc = new PDFDocument({ margin: 50 });
      const stream = fs.createWriteStream(filePath);
      doc.pipe(stream);

      doc.fontSize(16).font('Helvetica-Bold').text(title || 'Report', { align: 'center' });
      doc.moveDown(1);

      if (headers && rows) {
        this.drawTable(doc, headers, rows, [[50, 200], [200, 350], [350, 500]]);
      }

      doc.end();
      stream.on('finish', () => resolve(filePath));
      stream.on('error', reject);
    });
  }

  async generateExcel(data) {
    const { title, headers, rows, sheetName } = data;
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Smart Grading';
    workbook.created = new Date();

    const sheet = workbook.addWorksheet(sheetName || 'Sheet1');
    sheet.columns = headers.map((h, i) => ({ header: h, key: `col${i}`, width: 15 }));

    if (rows) {
      rows.forEach((row) => sheet.addRow(row));
    }

    if (sheet.getRow(1).cells.length > 0) {
      sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
      sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF6366F1' } };
    }

    const tempDir = os.tmpdir();
    const fileName = `export_${Date.now()}.xlsx`;
    const filePath = path.join(tempDir, fileName);

    await workbook.xlsx.writeFile(filePath);
    return filePath;
  }

  async generateExamReportPdf(examId) {
    const report = await ExamReport.findOne({ examId })
      .populate('examId', 'title examDate')
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

      // Try to register Vietnamese-capable font, fallback gracefully
      const fontBold = getVietnameseFont(VIETNAMESE_FONTS.arialBold);
      const fontRegular = getVietnameseFont(VIETNAMESE_FONTS.arial);
      if (fontBold) doc.registerFont('Vietnamese-Bold', fontBold);
      if (fontRegular) doc.registerFont('Vietnamese', fontRegular);

      const useVietnamese = fontBold && fontRegular;
      const fontName = useVietnamese ? 'Vietnamese' : 'Helvetica';
      const fontBoldName = useVietnamese ? 'Vietnamese-Bold' : 'Helvetica-Bold';

      // ─── Header ───────────────────────────────────────────────────────────────
      doc.fontSize(18).font(fontBoldName).text('BÁO CÁO KẾT QUẢ BÀI THI', { align: 'center' });
      doc.moveDown(0.5);
      doc.fontSize(14).font(fontBoldName).text(exam?.title || 'Báo cáo kết quả thi', { align: 'center' });
      doc.moveDown(0.3);
      const examDateStr = exam?.examDate
        ? new Date(exam.examDate).toLocaleDateString('vi-VN')
        : 'N/A';
      doc.fontSize(10).font(fontName).text(`Ngày thi: ${examDateStr}`, { align: 'center' });
      doc.moveDown(1);

      // ─── Statistics Summary ───────────────────────────────────────────────────
      doc.fontSize(12).font(fontBoldName).text('THỐNG KÊ TỔNG QUÁT', { underline: true });
      doc.moveDown(0.5);
      const stats = report.statistics || {};
      doc.fontSize(10).font(fontName);
      doc.text(`Tổng học sinh: ${stats.totalStudents || 0}`);
      doc.text(`Số bài nộp: ${stats.submittedCount || 0}`);
      doc.text(`Điểm trung bình: ${(stats.averagePercentage || 0).toFixed(1)}% (${(stats.averageScore || 0).toFixed(2)}/${exam?.totalScore || 10})`);
      doc.text(`Điểm cao nhất: ${(stats.highestScore || 0).toFixed(2)}`);
      doc.text(`Điểm thấp nhất: ${(stats.lowestScore || 0).toFixed(2)}`);
      doc.text(`Độ lệch chuẩn: ${(stats.standardDeviation || 0).toFixed(2)}`);
      doc.moveDown(1);

      // ─── Grade Distribution ───────────────────────────────────────────────────
      const gradeDist = report.gradeDistribution || {};
      doc.fontSize(12).font(fontBoldName).text('PHÂN BỔ ĐIỂM', { underline: true });
      doc.moveDown(0.5);

      const gradeRows = [
        ['Xuất sắc (8.5+)', gradeDist.excellent?.count || 0, `${(gradeDist.excellent?.percentage || 0).toFixed(1)}%`],
        ['Giỏi (7.0-8.4)', gradeDist.good?.count || 0, `${(gradeDist.good?.percentage || 0).toFixed(1)}%`],
        ['Khá (5.0-6.9)', gradeDist.average?.count || 0, `${(gradeDist.average?.percentage || 0).toFixed(1)}%`],
        ['Yếu (<5.0)', gradeDist.poor?.count || 0, `${(gradeDist.poor?.percentage || 0).toFixed(1)}%`],
      ];

      this.drawTable(doc, ['Xếp loại', 'Số lượng', 'Tỷ lệ'], gradeRows, [[50, 220], [220, 300], [300, 400]], fontName, fontBoldName);
      doc.moveDown(1);

      // ─── Score Distribution ───────────────────────────────────────────────────
      if (report.scoreDistribution && report.scoreDistribution.length > 0) {
        doc.fontSize(12).font(fontBoldName).text('BIỂU ĐỒ PHÂN BỔ ĐIỂM', { underline: true });
        doc.moveDown(0.5);
        const maxBarWidth = 350;
        report.scoreDistribution.forEach((bucket) => {
          const barWidth = ((bucket.count || 0) / (stats.totalStudents || 1)) * maxBarWidth;
          doc.fontSize(9).font(fontName);
          doc.text(`${bucket.range}: ${bucket.count || 0} HS`, 50, doc.y, { continued: true });
          doc.rect(doc.x + 5, doc.y - 3, Math.max(barWidth, 2), 8).fill('#6366F1');
          doc.moveDown(0.8);
        });
        doc.moveDown(0.5);
      }

      // ─── Top 10 Students ─────────────────────────────────────────────────────
      if (report.topStudents && report.topStudents.length > 0) {
        doc.addPage();
        doc.fontSize(12).font(fontBoldName).text('TOP 10 HỌC SINH', { underline: true });
        doc.moveDown(0.5);
        const topRows = report.topStudents.slice(0, 10).map((s, i) => [
          String(s.rank || i + 1),
          s.studentName || 'N/A',
          s.studentCode || 'N/A',
          `${(s.score || 0).toFixed(2)}`,
          `${(s.percentage || 0).toFixed(1)}%`,
        ]);
        this.drawTable(doc, ['Hạng', 'Họ tên', 'MSSV', 'Điểm', 'Phần trăm'], topRows, [[30, 60], [60, 200], [200, 260], [260, 310], [310, 370]], fontName, fontBoldName);
        doc.moveDown(1);
      }

      // ─── Bottom 10 Students ───────────────────────────────────────────────────
      if (report.bottomStudents && report.bottomStudents.length > 0) {
        doc.fontSize(12).font(fontBoldName).text('BOTTOM 10 HỌC SINH', { underline: true });
        doc.moveDown(0.5);
        const bottomRows = report.bottomStudents.slice(0, 10).map((s, i) => [
          String(s.rank || i + 1),
          s.studentName || 'N/A',
          s.studentCode || 'N/A',
          `${(s.score || 0).toFixed(2)}`,
          `${(s.percentage || 0).toFixed(1)}%`,
        ]);
        this.drawTable(doc, ['Hạng', 'Họ tên', 'MSSV', 'Điểm', 'Phần trăm'], bottomRows, [[30, 60], [60, 200], [200, 260], [260, 310], [310, 370]], fontName, fontBoldName);
      }

      // ─── AI Insights ──────────────────────────────────────────────────────────
      if (report.insights && (report.insights.overallAnalysis || (report.insights.recommendations && report.insights.recommendations.length > 0))) {
        doc.addPage();
        doc.fontSize(12).font(fontBoldName).text('PHÂN TÍCH TỪ AI', { underline: true });
        doc.moveDown(0.5);

        if (report.insights.overallAnalysis) {
          doc.fontSize(10).font(fontBoldName).text('Đánh giá tổng quan:');
          doc.fontSize(10).font(fontName).text(report.insights.overallAnalysis);
          doc.moveDown(0.5);
        }

        if (report.insights.recommendations && report.insights.recommendations.length > 0) {
          doc.fontSize(10).font(fontBoldName).text('Khuyến nghị:');
          report.insights.recommendations.forEach((rec, i) => {
            doc.fontSize(10).font(fontName).text(`${i + 1}. ${rec}`);
          });
        }
      }

      // ─── Footer ───────────────────────────────────────────────────────────────
      doc.moveDown(2);
      doc.fontSize(8).font(fontName).text(
        `Generated on ${new Date().toLocaleString('vi-VN')} | Smart Grading System`,
        { align: 'center' }
      );

      doc.end();
      stream.on('finish', () => resolve(filePath));
      stream.on('error', reject);
    });
  }

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
    const summarySheet = workbook.addWorksheet('Tổng Quát');
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
      { label: 'Độ lệch chuẩn', value: (stats.standardDeviation || 0).toFixed(2) },
      { label: 'Xuất sắc', value: `${gradeDist.excellent?.count || 0} (${(gradeDist.excellent?.percentage || 0).toFixed(1)}%)` },
      { label: 'Giỏi', value: `${gradeDist.good?.count || 0} (${(gradeDist.good?.percentage || 0).toFixed(1)}%)` },
      { label: 'Khá', value: `${gradeDist.average?.count || 0} (${(gradeDist.average?.percentage || 0).toFixed(1)}%)` },
      { label: 'Yếu', value: `${gradeDist.poor?.count || 0} (${(gradeDist.poor?.percentage || 0).toFixed(1)}%)` },
    ]);

    // Style header
    summarySheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    summarySheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF6366F1' } };

    // ─── Sheet 2: Score Distribution ─────────────────────────────────────────
    if (report.scoreDistribution && report.scoreDistribution.length > 0) {
      const distSheet = workbook.addWorksheet('Phân Bổ Điểm');
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
    const scoresSheet = workbook.addWorksheet('Điểm Học Sinh');
    scoresSheet.columns = [
      { header: 'Hạng', key: 'rank', width: 8 },
      { header: 'Họ tên', key: 'name', width: 25 },
      { header: 'MSSV', key: 'code', width: 15 },
      { header: 'Điểm', key: 'score', width: 10 },
      { header: 'Phần trăm', key: 'percentage', width: 12 },
      { header: 'Xếp loại', key: 'grade', width: 12 },
    ];

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
      const insightsSheet = workbook.addWorksheet('AI Insights');
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
   * Export exam results to Excel buffer
   * Returns a buffer directly for streaming response
   */
  async exportExamResultsExcel(examId, user) {
    const { Exam, Submission } = require('../models');

    const exam = await Exam.findById(examId)
      .populate('classIds', 'name')
      .lean();
    if (!exam) {
      throw new ApiError(404, 'Exam not found');
    }

    const submissions = await Submission.find({
      examId,
      status: 'completed',
    }).populate('studentId', 'name studentCode').lean();

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Smart Grading System';

    // Sheet 1: Summary
    const summarySheet = workbook.addWorksheet('Tong Quan');
    summarySheet.columns = [
      { header: 'Chỉ tiêu', key: 'label', width: 25 },
      { header: 'Giá trị', key: 'value', width: 20 },
    ];
    const avgScore = submissions.length > 0
      ? submissions.reduce((sum, sub) => sum + sub.totalScore, 0) / submissions.length
      : 0;
    summarySheet.addRows([
      { label: 'Tên bài thi', value: exam.title },
      { label: 'Tổng bài nộp', value: submissions.length },
      { label: 'Điểm trung bình', value: avgScore.toFixed(2) },
      { label: 'Ngày thi', value: exam.examDate ? new Date(exam.examDate).toLocaleDateString('vi-VN') : 'N/A' },
    ]);
    summarySheet.getRow(1).font = { bold: true };

    // Sheet 2: Scores
    const scoresSheet = workbook.addWorksheet('Diem');
    scoresSheet.columns = [
      { header: 'STT', key: 'stt', width: 6 },
      { header: 'Họ tên', key: 'name', width: 25 },
      { header: 'MSSV', key: 'code', width: 12 },
      { header: 'Điểm', key: 'score', width: 8 },
      { header: 'Điểm TB', key: 'maxScore', width: 8 },
      { header: 'Tỷ lệ %', key: 'pct', width: 10 },
      { header: 'Trạng thái', key: 'status', width: 15 },
    ];
    // Header row style
    scoresSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    scoresSheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E40AF' } };

    submissions.forEach((sub, idx) => {
      const pct = sub.maxScore > 0 ? ((sub.totalScore / sub.maxScore) * 100) : 0;
      const statusLabel = sub.status === 'completed' ? 'Hoàn thành'
        : sub.status === 'scanned' ? 'Đã quét'
        : sub.status === 'appealed' ? 'Phúc tra'
        : sub.status;
      scoresSheet.addRow({
        stt: idx + 1,
        name: sub.studentId?.name || 'Unknown',
        code: sub.studentId?.studentCode || '',
        score: sub.totalScore,
        maxScore: sub.maxScore,
        pct: `${pct.toFixed(1)}%`,
        status: statusLabel,
      });
    });

    // Write buffer
    return workbook.xlsx.writeBuffer();
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

  /**
   * Draw a simple table in PDF
   */
  drawTable(doc, headers, rows, columnWidths, fontName = 'Helvetica', fontBoldName = 'Helvetica-Bold') {
    const startX = 50;
    const startY = doc.y;
    const rowHeight = 18;

    // Draw header
    doc.font(fontBoldName).fontSize(10);
    headers.forEach((h, i) => {
      const [x1, x2] = columnWidths[i] || [0, 100];
      doc.rect(startX + x1, startY, x2 - x1, rowHeight).stroke();
      doc.text(h, startX + x1 + 2, startY + 4, { width: x2 - x1 - 4 });
    });

    // Draw rows
    doc.font(fontName).fontSize(9);
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
