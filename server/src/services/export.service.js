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

      doc.fontSize(18).font('Helvetica-Bold').text('BAO CAO KET QUA BAI THI', { align: 'center' });
      doc.moveDown(0.5);
      doc.fontSize(14).font('Helvetica-Bold').text(exam?.title || 'Exam Report', { align: 'center' });
      doc.moveDown(0.3);
      const examDateStr = exam?.examDate
        ? new Date(exam.examDate).toLocaleDateString('vi-VN')
        : 'N/A';
      doc.fontSize(10).font('Helvetica').text(`Ngay thi: ${examDateStr}`, { align: 'center' });
      doc.moveDown(1);

      doc.fontSize(12).font('Helvetica-Bold').text('THONG KE TONG QUAT', { underline: true });
      doc.moveDown(0.5);
      const stats = report.statistics || {};
      doc.fontSize(10).font('Helvetica');
      doc.text(`Tong hoc sinh: ${stats.totalStudents || 0}`);
      doc.text(`So bai nop: ${stats.submittedCount || 0}`);
      doc.text(`Diem trung binh: ${(stats.averagePercentage || 0).toFixed(1)}% (${(stats.averageScore || 0).toFixed(2)}/${exam?.totalScore || 10})`);
      doc.text(`Diem cao nhat: ${(stats.highestScore || 0).toFixed(2)}`);
      doc.text(`Diem thap nhat: ${(stats.lowestScore || 0).toFixed(2)}`);
      doc.text(`Do lech chuan: ${(stats.standardDeviation || 0).toFixed(2)}`);
      doc.moveDown(1);

      const gradeDist = report.gradeDistribution || {};
      doc.fontSize(12).font('Helvetica-Bold').text('PHAN BO DIEM', { underline: true });
      doc.moveDown(0.5);

      const gradeRows = [
        ['Xuat sac (8.5+)', gradeDist.excellent?.count || 0, `${(gradeDist.excellent?.percentage || 0).toFixed(1)}%`],
        ['Gioi (7.0-8.4)', gradeDist.good?.count || 0, `${(gradeDist.good?.percentage || 0).toFixed(1)}%`],
        ['Kha (5.0-6.9)', gradeDist.average?.count || 0, `${(gradeDist.average?.percentage || 0).toFixed(1)}%`],
        ['Yeu (<5.0)', gradeDist.poor?.count || 0, `${(gradeDist.poor?.percentage || 0).toFixed(1)}%`],
      ];

      this.drawTable(doc, ['Xep loai', 'So luong', 'Ty le'], gradeRows, [[50, 200], [200, 300], [300, 400]]);
      doc.moveDown(1);

      if (report.scoreDistribution && report.scoreDistribution.length > 0) {
        doc.fontSize(12).font('Helvetica-Bold').text('BIEU DO PHAN BO DIEM', { underline: true });
        doc.moveDown(0.5);
        const maxBarWidth = 400;
        report.scoreDistribution.forEach((bucket) => {
          const barWidth = ((bucket.count || 0) / (stats.totalStudents || 1)) * maxBarWidth;
          doc.fontSize(9).font('Helvetica');
          doc.text(`${bucket.range}: ${bucket.count || 0} HS`, 50, doc.y, { continued: true });
          doc.rect(doc.x + 5, doc.y - 3, Math.max(barWidth, 2), 8).fill('#6366F1');
          doc.moveDown(0.8);
        });
        doc.moveDown(0.5);
      }

      if (report.topStudents && report.topStudents.length > 0) {
        doc.addPage();
        doc.fontSize(12).font('Helvetica-Bold').text('TOP 10 HOC SINH', { underline: true });
        doc.moveDown(0.5);
        const topRows = report.topStudents.slice(0, 10).map((s, i) => [
          String(s.rank || i + 1),
          s.studentName || 'N/A',
          s.studentCode || 'N/A',
          `${(s.score || 0).toFixed(2)}`,
          `${(s.percentage || 0).toFixed(1)}%`,
        ]);
        this.drawTable(doc, ['Hang', 'Ho ten', 'MSSV', 'Diem', 'Phan tram'], topRows, [[30, 60], [60, 200], [200, 260], [260, 310], [310, 370]]);
      }

      if (report.insights && report.insights.overallAnalysis) {
        doc.addPage();
        doc.fontSize(12).font('Helvetica-Bold').text('PHAN TICH TU AI', { underline: true });
        doc.moveDown(0.5);
        doc.fontSize(10).font('Helvetica-Bold').text('Danh gia tong quan:');
        doc.fontSize(10).font('Helvetica').text(report.insights.overallAnalysis);
        doc.moveDown(0.5);
        if (report.insights.recommendations && report.insights.recommendations.length > 0) {
          doc.fontSize(10).font('Helvetica-Bold').text('Khuyen nghi:');
          report.insights.recommendations.forEach((rec, i) => {
            doc.fontSize(10).font('Helvetica').text(`${i + 1}. ${rec}`);
          });
        }
      }

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

    const summarySheet = workbook.addWorksheet('TongQuan');
    summarySheet.columns = [
      { header: 'Chi tieu', key: 'label', width: 25 },
      { header: 'Gia tri', key: 'value', width: 20 },
    ];

    const stats = report.statistics || {};
    const gradeDist = report.gradeDistribution || {};

    summarySheet.addRows([
      { label: 'Tong hoc sinh', value: stats.totalStudents || 0 },
      { label: 'So bai nop', value: stats.submittedCount || 0 },
      { label: 'Diem trung binh', value: `${(stats.averagePercentage || 0).toFixed(1)}%` },
      { label: 'Diem cao nhat', value: (stats.highestScore || 0).toFixed(2) },
      { label: 'Diem thap nhat', value: (stats.lowestScore || 0).toFixed(2) },
      { label: 'Do lech chuan', value: (stats.standardDeviation || 0).toFixed(2) },
      { label: 'Xuat sac', value: `${gradeDist.excellent?.count || 0} (${(gradeDist.excellent?.percentage || 0).toFixed(1)}%)` },
      { label: 'Gioi', value: `${gradeDist.good?.count || 0} (${(gradeDist.good?.percentage || 0).toFixed(1)}%)` },
      { label: 'Kha', value: `${gradeDist.average?.count || 0} (${(gradeDist.average?.percentage || 0).toFixed(1)}%)` },
      { label: 'Yeu', value: `${gradeDist.poor?.count || 0} (${(gradeDist.poor?.percentage || 0).toFixed(1)}%)` },
    ]);

    summarySheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    summarySheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF6366F1' } };

    if (report.scoreDistribution && report.scoreDistribution.length > 0) {
      const distSheet = workbook.addWorksheet('PhanBoDiem');
      distSheet.columns = [
        { header: 'Khoang diem', key: 'range', width: 15 },
        { header: 'So luong', key: 'count', width: 12 },
        { header: 'Ty le %', key: 'percentage', width: 12 },
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

    const scoresSheet = workbook.addWorksheet('DiemHocSinh');
    scoresSheet.columns = [
      { header: 'Hang', key: 'rank', width: 8 },
      { header: 'Ho ten', key: 'name', width: 25 },
      { header: 'MSSV', key: 'code', width: 15 },
      { header: 'Diem', key: 'score', width: 10 },
      { header: 'Phan tram', key: 'percentage', width: 12 },
      { header: 'Xep loai', key: 'grade', width: 12 },
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
      const grade = pct >= 85 ? 'Xuat sac' : pct >= 70 ? 'Gioi' : pct >= 50 ? 'Kha' : 'Yeu';
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

    if (report.insights) {
      const insightsSheet = workbook.addWorksheet('AIInsights');
      insightsSheet.columns = [
        { header: 'Loai', key: 'type', width: 20 },
        { header: 'Noi dung', key: 'content', width: 60 },
      ];

      if (report.insights.overallAnalysis) {
        insightsSheet.addRow({ type: 'Danh gia tong quan', content: report.insights.overallAnalysis });
      }
      if (report.insights.recommendations) {
        report.insights.recommendations.forEach((rec, i) => {
          insightsSheet.addRow({ type: `Khuyen nghi ${i + 1}`, content: rec });
        });
      }
      if (report.insights.weakTopics) {
        report.insights.weakTopics.forEach((t) => {
          insightsSheet.addRow({ type: 'Chu de yeu', content: `${t.topicName || 'N/A'} (${t.affectedStudents || 0} HS)` });
        });
      }
      if (report.insights.strongTopics) {
        report.insights.strongTopics.forEach((t) => {
          insightsSheet.addRow({ type: 'Chu de manh', content: `${t.topicName || 'N/A'} (${t.studentCount || 0} HS)` });
        });
      }

      insightsSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
      insightsSheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF6366F1' } };
    }

    const tempDir = os.tmpdir();
    const fileName = `report_${examId}_${Date.now()}.xlsx`;
    const filePath = path.join(tempDir, fileName);

    await workbook.xlsx.writeFile(filePath);
    return filePath;
  }

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

  drawTable(doc, headers, rows, columnWidths) {
    const startX = 50;
    const startY = doc.y;
    const rowHeight = 18;

    doc.font('Helvetica-Bold').fontSize(10);
    headers.forEach((h, i) => {
      const [x1, x2] = columnWidths[i] || [0, 100];
      doc.rect(startX + x1, startY, x2 - x1, rowHeight).stroke();
      doc.text(h, startX + x1 + 2, startY + 4, { width: x2 - x1 - 4 });
    });

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
