/**
 * @deprecated since 2026-06-23
 * This module is kept for backward compatibility and fallback.
 * Use server/src/amc/ modules for new exam paper generation.
 */

const PDFDocument = require('pdfkit');

class PDFGenerator {
  constructor(options = {}) {
    this.doc = new PDFDocument({
      size: options.size || 'A4',
      margins: { top: 60, bottom: 60, left: 60, right: 60 },
      layout: 'portrait',
      info: { Title: options.title || 'Exam Paper', Author: 'Smart Grading System' },
    });
    this.pageWidth = options.pageWidth || this.doc.page.width - 120;
    this.pageHeight = options.pageHeight || this.doc.page.height - 120;
    this.currentY = 60;
    this.footerHeight = 30;
  }

  get width() {
    return this.doc.page.width - 120;
  }

  addHeader(exam) {
    const centerX = this.doc.page.width / 2;

    if (exam.schoolHeader !== false) {
      this.doc
        .fontSize(10)
        .fillColor('#666')
        .text('TRƯỜNG ' + (exam.schoolName || '________________'), centerX, this.currentY, { align: 'center', width: this.pageWidth })
        .moveDown(0.3);
    }

    this.doc
      .fontSize(16)
      .fillColor('#000')
      .font('Helvetica-Bold')
      .text(exam.title || 'ĐỀ KIỂM TRA', centerX, this.currentY + 10, { align: 'center', width: this.pageWidth })
      .moveDown(0.5);

    this.currentY = this.doc.y;
    return this;
  }

  addMetadata(exam) {
    const col1 = 60;
    const col2 = 250;
    const lineHeight = 18;

    const metadata = [
      ['Môn:', exam.subjectName || '—'],
      ['Lớp:', exam.className || '—'],
      ['Thời gian:', exam.duration ? `${exam.duration} phút` : '—'],
      ['Ngày thi:', exam.examDate || '—'],
      ['Điểm:', exam.totalScore ? `${exam.totalScore} điểm` : '—'],
    ];

    this.doc.font('Helvetica').fontSize(11).fillColor('#000');

    for (const [label, value] of metadata) {
      this.doc
        .text(label, col1, this.currentY, { width: 80 })
        .text(value, col2, this.currentY, { width: 250 });
      this.currentY += lineHeight;
    }

    this.doc.moveDown(0.5);
    this.currentY = this.doc.y;
    return this;
  }

  addStudentInfoBlock() {
    this.doc
      .fontSize(11)
      .font('Helvetica')
      .fillColor('#000');

    const leftCol = 60;
    const rightCol = 340;

    this.doc
      .text('Họ và tên: _________________________', leftCol, this.currentY, { width: 260 })
      .text('Số báo danh: _________', rightCol, this.currentY, { width: 180 });

    this.currentY += 20;
    this.doc
      .text('Lớp: _______________________________', leftCol, this.currentY, { width: 260 })
      .text('Phòng: ___________', rightCol, this.currentY, { width: 180 });

    this.currentY += 20;
    this.doc.moveDown(0.3);
    return this;
  }

  addHorizontalLine() {
    this.doc
      .strokeColor('#000')
      .lineWidth(0.5)
      .moveTo(60, this.currentY)
      .lineTo(this.doc.page.width - 60, this.currentY)
      .stroke();
    this.currentY += 15;
    return this;
  }

  addInstructions() {
    this.doc
      .fontSize(11)
      .font('Helvetica-Oblique')
      .fillColor('#333')
      .text(
        'Đề thi gồm có tổng cộng ________ câu trắc nghiệm. Thí sinh đánh dấu đáp án đúng vào phiếu trả lời trắc nghiệm.',
        60,
        this.currentY,
        { width: this.pageWidth, lineGap: 2 }
      )
      .moveDown(0.5);
    this.currentY = this.doc.y;
    return this;
  }

  checkNewPage() {
    if (this.currentY > this.doc.page.height - 100) {
      this.addFooter('(Tiếp trang sau)');
      this.doc.addPage();
      this.currentY = 60;
    }
  }

  addQuestion(question, index) {
    this.checkNewPage();

    const questionNum = question.position || index + 1;
    const difficultyLabel = question.difficulty ? `(${this.getDifficultyLabel(question.difficulty)})` : '';

    this.doc
      .fontSize(12)
      .font('Helvetica-Bold')
      .fillColor('#000');

    const questionText = `${questionNum}. ${question.content || '(Không có nội dung)'} ${difficultyLabel}`;
    const questionLines = this.doc
      .font('Helvetica-Bold')
      .fontSize(12)
      .heightOfString(questionText, { width: this.pageWidth });

    this.doc.text(questionText, 60, this.currentY, { width: this.pageWidth, lineGap: 2 });
    this.currentY += questionLines + 8;

    this.doc.font('Helvetica').fontSize(11).fillColor('#000');

    if (question.options && question.options.length > 0) {
      const optionLabels = ['A', 'B', 'C', 'D'];
      for (let i = 0; i < question.options.length; i++) {
        this.checkNewPage();
        const opt = question.options[i];
        const label = optionLabels[i] || String.fromCharCode(65 + i);
        const optText = `    ${label}. ${opt.content || ''}`;

        this.doc
          .font('Helvetica')
          .fontSize(11)
          .text(optText, 60, this.currentY, { width: this.pageWidth, lineGap: 2 });

        const optHeight = this.doc.heightOfString(optText, { width: this.pageWidth });
        this.currentY += optHeight + 4;
      }
    }

    this.currentY += 12;
    return this;
  }

  getDifficultyLabel(diff) {
    const map = { easy: 'Dễ', medium: 'Trung bình', hard: 'Khó' };
    return map[diff] || '';
  }

  addAnswerSheet(questions) {
    this.addOMRSheet({ questions });
    return this;
  }

  addOMRSheet({ questions = [], versionCode = '', totalScore = 0, examTitle = '' }) {
    this.doc.addPage();
    this.currentY = 50;

    const pageW = this.doc.page.width;
    const marginL = 40;
    const marginR = pageW - 40;
    const availW = marginR - marginL;

    this.doc
      .fontSize(13)
      .font('Helvetica-Bold')
      .fillColor('#000')
      .text('PHIẾU TRẢ LỜI TRẮC NGHIỆM', marginL, this.currentY, { align: 'center', width: availW });
    this.currentY += 22;

    if (versionCode) {
      this.doc
        .fontSize(10)
        .font('Helvetica')
        .fillColor('#000')
        .text(`Mã đề: ${versionCode}`, marginL, this.currentY, { width: availW });
      this.currentY += 16;
    }

    this.currentY += 4;
    this._drawOmrHorizontalLine(marginL, marginR);
    this.currentY += 8;

    this._drawStudentCodeSection(marginL, availW);
    this.currentY += 8;
    this._drawOmrHorizontalLine(marginL, marginR);
    this.currentY += 10;

    this._drawAnswerGrid(marginL, availW, questions);
    this.currentY += 10;
    this._drawOmrHorizontalLine(marginL, marginR);

    this.doc
      .fontSize(8)
      .font('Helvetica-Oblique')
      .fillColor('#666')
      .text(
        'Hướng dẫn: Tô đậm bong A, B, C hoặc D tương ứng với đáp án em chọn. Mỗi câu chỉ tô một đáp án.',
        marginL,
        this.currentY + 4,
        { width: availW, align: 'center' }
      );
    return this;
  }

  _drawOmrHorizontalLine(x1, x2) {
    this.doc
      .strokeColor('#000')
      .lineWidth(0.75)
      .moveTo(x1, this.currentY)
      .lineTo(x2, this.currentY)
      .stroke();
  }

  _drawStudentCodeSection(marginL, availW) {
    this.doc
      .fontSize(10)
      .font('Helvetica-Bold')
      .fillColor('#000')
      .text('Mã sinh viên:', marginL, this.currentY, { width: 110 });
    this.doc
      .font('Helvetica')
      .fontSize(9)
      .fillColor('#444')
      .text('(Tô bong từ trái sang)', marginL + 110, this.currentY, { width: 160 });

    const digits = 5;
    const bubbleSize = 18;
    const spacing = 26;
    const startX = marginL + 110 + 165;
    this.currentY += 4;

    for (let pos = 0; pos < digits; pos++) {
      const x = startX + pos * spacing;
      this.doc
        .fontSize(7)
        .font('Helvetica')
        .fillColor('#000')
        .text(String(pos + 1), x, this.currentY, { width: bubbleSize, align: 'center' });
      this.doc
        .fontSize(9)
        .font('Helvetica')
        .fillColor('#444')
        .text('0-9', x, this.currentY + 8, { width: bubbleSize, align: 'center' });
    }
    this.currentY += 22;

    for (let digit = 0; digit < 10; digit++) {
      const rowY = this.currentY + digit * 18;
      const label = digit < 10 ? String(digit) : '';
      this.doc
        .fontSize(9)
        .font('Helvetica-Bold')
        .fillColor('#000')
        .text(label, startX - 18, rowY + 2, { width: 14, align: 'right' });

      for (let pos = 0; pos < digits; pos++) {
        const x = startX + pos * spacing;
        this.doc
          .rect(x, rowY, bubbleSize, bubbleSize)
          .stroke('#555');
      }
    }
    this.currentY += 10 * 18 + 4;

    this.doc
      .fontSize(10)
      .font('Helvetica-Bold')
      .fillColor('#000')
      .text('Mã đề:', marginL, this.currentY, { width: 110 });
    this.doc
      .fontSize(9)
      .font('Helvetica')
      .fillColor('#444')
      .text('(Tô bong 2 chữ số)', marginL + 110, this.currentY, { width: 160 });
    this.currentY += 4;

    const versionDigits = 2;
    for (let pos = 0; pos < versionDigits; pos++) {
      const x = startX + pos * spacing;
      this.doc
        .fontSize(7)
        .font('Helvetica')
        .fillColor('#000')
        .text(String(pos + 1), x, this.currentY, { width: bubbleSize, align: 'center' });
      this.doc
        .fontSize(9)
        .font('Helvetica')
        .fillColor('#444')
        .text('0-9', x, this.currentY + 8, { width: bubbleSize, align: 'center' });
    }
    this.currentY += 22;

    for (let digit = 0; digit < 10; digit++) {
      const rowY = this.currentY + digit * 18;
      const label = digit < 10 ? String(digit) : '';
      this.doc
        .fontSize(9)
        .font('Helvetica-Bold')
        .fillColor('#000')
        .text(label, startX - 18, rowY + 2, { width: 14, align: 'right' });

      for (let pos = 0; pos < versionDigits; pos++) {
        const x = startX + pos * spacing;
        this.doc
          .rect(x, rowY, bubbleSize, bubbleSize)
          .stroke('#555');
      }
    }
    this.currentY += 10 * 18 + 4;
  }

  _drawAnswerGrid(marginL, availW, questions) {
    const Q_PER_ROW = 5;
    const NUM_ROWS = 4;
    const bubbleSize = 13;
    const qColW = availW / Q_PER_ROW;
    const rowH = 80;

    this.doc
      .fontSize(10)
      .font('Helvetica-Bold')
      .fillColor('#000')
      .text('PHẦN TRẢ LỜI', marginL, this.currentY, { width: availW, align: 'center' });
    this.currentY += 14;

    const labelColW = 22;
    const gridStartX = marginL + labelColW;
    const colW = (availW - labelColW) / Q_PER_ROW;
    const optLabels = ['A', 'B', 'C', 'D'];

    for (let row = 0; row < NUM_ROWS; row++) {
      const rowY = this.currentY;

      for (let col = 0; col < Q_PER_ROW; col++) {
        const qNum = row * Q_PER_ROW + col + 1;
        const colX = gridStartX + col * colW;

        if (qNum > questions.length) {
          this.doc
            .rect(colX + 2, rowY, colW - 4, rowH)
            .fillAndStroke('#f5f5f5', '#ccc');
          continue;
        }

        this.doc
          .rect(colX + 2, rowY, colW - 4, rowH)
          .stroke('#999');

        this.doc
          .fontSize(9)
          .font('Helvetica-Bold')
          .fillColor('#000')
          .text(String(qNum), colX + 2, rowY + 2, { width: colW - 4, align: 'center' });

        const optH = (rowH - 16) / optLabels.length;
        for (let o = 0; o < optLabels.length; o++) {
          const optY = rowY + 16 + o * optH;
          const bubbleX = colX + (colW - 4) / 2 - bubbleSize / 2;
          this.doc
            .rect(bubbleX, optY + (optH - bubbleSize) / 2, bubbleSize, bubbleSize)
            .stroke('#888');

          this.doc
            .fontSize(8)
            .font('Helvetica-Bold')
            .fillColor('#333')
            .text(optLabels[o], colX + 4, optY + (optH - 10) / 2, { width: 12 });
        }
      }

      this.currentY += rowH;

      if (this.currentY > this.doc.page.height - 60) {
        this.doc.addPage();
        this.currentY = 50;
      }
    }
  }

  addFooter(pageLabel = '') {
    const pageNum = this.doc.bufferedPageRange().count + 1;
    this.doc
      .fontSize(9)
      .font('Helvetica')
      .fillColor('#999')
      .text(
        `${pageLabel} | Trang ${pageNum} | Smart Grading System`,
        60,
        this.doc.page.height - 40,
        { align: 'center', width: this.pageWidth }
      );
  }

  generate() {
    return this.doc;
  }

  end() {
    this.addFooter();
    this.doc.end();
  }
}

module.exports = PDFGenerator;
