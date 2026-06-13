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
    this.checkNewPage();

    this.doc
      .fontSize(14)
      .font('Helvetica-Bold')
      .fillColor('#000')
      .text('PHIẾU TRẢ LỜI TRẮC NGHIỆM', this.doc.page.width / 2, this.currentY, {
        align: 'center',
        width: this.pageWidth,
      })
      .moveDown(0.5);

    this.currentY = this.doc.y + 10;

    const colWidth = 70;
    const startX = 60;
    const boxSize = 14;

    const cols = 4;
    const rowsPerCol = Math.ceil(questions.length / cols);

    for (let row = 0; row < rowsPerCol; row++) {
      let x = startX;
      for (let col = 0; col < cols; col++) {
        const qNum = col * rowsPerCol + row + 1;
        if (qNum > questions.length) break;

        this.doc
          .rect(x, this.currentY, boxSize, boxSize)
          .stroke('#000');

        this.doc
          .fontSize(9)
          .font('Helvetica')
          .fillColor('#000')
          .text(String(qNum), x + 3, this.currentY + 2, { width: boxSize });

        const optStartX = x + boxSize + 2;
        const optLabels = ['A', 'B', 'C', 'D'];
        for (let j = 0; j < optLabels.length; j++) {
          this.doc
            .fontSize(9)
            .text(optLabels[j], optStartX + j * 11, this.currentY + 2, { width: 12 });
        }

        x += colWidth;
      }
      this.currentY += boxSize + 10;

      if (this.currentY > this.doc.page.height - 80) {
        this.doc.addPage();
        this.currentY = 60;
      }
    }

    return this;
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
