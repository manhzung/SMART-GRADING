/**
 * Answer Sheet Generator
 * Tao PDF answer sheet (phieu to dap an) rieng biet voi de thi
 *
 * Answer sheet la 1 file PDF chung cho tat ca cac version
 * Hoc sinh se to cac bubble tren phieu nay (khong phai tren de)
 * Truoc khi to, hoc sinh phai to/ghi versionCode cua minh (A, B, C, hoac D)
 *
 * Toa do cac bubble duoc xuat ra template JSON de OMR scanner doc
 */

const PDFDocument = require('pdfkit');

/**
 * Compute bubble centers for a given question count
 * Returns { [qId]: { A: {x, y}, B: {x, y}, C: {x, y}, D: {x, y} } }
 *
 * Layout: questions are arranged in N columns (each column = 1 page worth of questions)
 * Each question has 4 bubbles (A, B, C, D) arranged vertically
 *
 * @param {number} numQuestions
 * @param {Object} opts - { pageW, pageH, margin, bubbleRadius, colSpacing, rowSpacing }
 * @returns {Object}
 */
function computeBubbleCoordinates(numQuestions, opts = {}) {
  const {
    pageW = 595,
    pageH = 842,
    margin = 36,
    bubbleRadius = 8,
    colSpacing = 24,
    rowSpacing = 22,
  } = opts;

  const usableW = pageW - 2 * margin;
  const usableH = pageH - 2 * margin - 120; // Reserve top for header

  // Determine how many questions per column
  const questionsPerColumn = Math.floor((usableH - 40) / rowSpacing);
  const numColumns = Math.ceil(numQuestions / questionsPerColumn);

  // Adjust column width to fit
  const columnWidth = usableW / numColumns;
  const bubbleXOffset = bubbleRadius * 4; // Distance from question number to first bubble

  const coords = {};

  for (let i = 0; i < numQuestions; i++) {
    const qId = `q${i + 1}`;
    const colIndex = Math.floor(i / questionsPerColumn);
    const rowIndex = i % questionsPerColumn;

    const colX = margin + colIndex * columnWidth;
    const baseY = margin + 100 + rowIndex * rowSpacing;

    // Question number column on the left
    const questionLabelX = colX;
    const firstBubbleX = colX + bubbleXOffset + 20;

    coords[qId] = {
      A: { x: firstBubbleX, y: baseY },
      B: { x: firstBubbleX + colSpacing, y: baseY },
      C: { x: firstBubbleX + colSpacing * 2, y: baseY },
      D: { x: firstBubbleX + colSpacing * 3, y: baseY },
      // Reference for OMR
      page: 1,
      bubbleRadius,
      questionNumber: i + 1,
      column: colIndex,
      row: rowIndex,
    };
  }

  return coords;
}

/**
 * Generate answer sheet PDF
 * @param {Object} options
 * @param {Object} options.exam - { title, subjectName, className, duration, totalScore, examDate, schoolHeader }
 * @param {number} options.numQuestions - So luong cau hoi
 * @param {string[]} options.versionCodes - ['101', '102', '103', '104']
 * @param {Object} [options.template] - OMR template info (for header)
 * @returns {Promise<{pdfBuffer: Buffer, coordinates: Object, templateJson: Object}>}
 */
async function generateAnswerSheet({ exam, numQuestions, versionCodes = ['101', '102', '103', '104'], template = null }) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margins: { top: 36, bottom: 36, left: 36, right: 36 },
        autoFirstPage: true,
      });

      const chunks = [];
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('error', reject);
      doc.on('end', () => {
        const pdfBuffer = Buffer.concat(chunks);
        const coordinates = computeBubbleCoordinates(numQuestions);
        const templateJson = {
          version: '1.0',
          examId: exam._id || exam.id,
          examTitle: exam.title,
          numQuestions,
          bubbleCount: 4,
          pageSize: 'A4',
          pageCount: 1,
          versionCodes,
          coordinates,
          generatedAt: new Date().toISOString(),
        };
        resolve({ pdfBuffer, coordinates, templateJson });
      });

      const pageW = doc.page.width;
      const pageH = doc.page.height;
      const margin = 36;

      // ==== HEADER ====
      if (exam.schoolHeader) {
        doc.font('Helvetica-Bold').fontSize(11).fillColor('#000')
          .text(exam.schoolHeader, margin, margin, { align: 'center', width: pageW - 2 * margin });
        doc.moveDown(0.3);
      }

      doc.font('Helvetica-Bold').fontSize(16).fillColor('#000')
        .text('PHIEU TRA LOI', margin, doc.y, { align: 'center', width: pageW - 2 * margin });

      doc.moveDown(0.2);
      doc.font('Helvetica-Bold').fontSize(13)
        .text(exam.title || 'Bai kiem tra', { align: 'center', width: pageW - 2 * margin });

      doc.moveDown(0.4);
      doc.font('Helvetica').fontSize(9).fillColor('#333');

      // Subject, class, date, duration info
      const infoY = doc.y;
      const colW = (pageW - 2 * margin) / 2;
      const leftCol = margin;
      const rightCol = margin + colW;

      if (exam.subjectName) {
        doc.text(`Mon: ${exam.subjectName}`, leftCol, infoY, { width: colW });
      }
      if (exam.className) {
        doc.text(`Lop: ${exam.className}`, rightCol, infoY, { width: colW });
      }
      doc.moveDown(0.5);
      const infoY2 = doc.y;
      if (exam.examDate) {
        const date = new Date(exam.examDate);
        const dateStr = `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()}`;
        doc.text(`Ngay thi: ${dateStr}`, leftCol, infoY2, { width: colW });
      }
      if (exam.duration) {
        doc.text(`Thoi gian: ${exam.duration} phut`, rightCol, infoY2, { width: colW });
      }

      // ==== STUDENT INFO ====
      doc.moveDown(0.8);
      const studentY = doc.y;
      doc.font('Helvetica').fontSize(10);

      // Ho va ten
      doc.text('Ho va ten:', margin, studentY);
      doc.moveTo(margin + 60, studentY + 10).lineTo(margin + 280, studentY + 10).stroke();

      // So bao danh
      doc.text('So bao danh:', margin + 300, studentY);
      doc.moveTo(margin + 365, studentY + 10).lineTo(margin + 490, studentY + 10).stroke();

      doc.moveDown(0.8);
      const versionY = doc.y;

      // ==== VERSION CODE BOX ====
      // Hoc sinh to versionCode (101, 102, 103, 104) tuong ung voi ma de cua minh
      doc.font('Helvetica-Bold').fontSize(11)
        .text('MA DE (to vao mot o duy nhat):', margin, versionY);

      const versionBoxSize = 22;
      const versionBoxGap = 8;
      const versionBoxY = versionY + 22;
      const versionBoxStartX = margin + 0;

      versionCodes.forEach((vCode, idx) => {
        const boxX = versionBoxStartX + idx * (versionBoxSize + versionBoxGap + 30);
        // Draw checkbox
        doc.rect(boxX, versionBoxY, versionBoxSize, versionBoxSize).stroke('#000');
        // Label below
        doc.font('Helvetica-Bold').fontSize(10)
          .text(vCode, boxX, versionBoxY + versionBoxSize + 2, {
            width: versionBoxSize,
            align: 'center',
          });
      });

      // ==== INSTRUCTIONS ====
      doc.font('Helvetica-Oblique').fontSize(8).fillColor('#555')
        .text(
          'Huong dan: To den (khong qua vien) vao mot o duy nhat trong moi cau. '
          + 'Dung but chi den (HB). Khong to hai o cho cung mot cau.',
          margin,
          versionBoxY + versionBoxSize + 25,
          { width: pageW - 2 * margin, align: 'left' }
        );

      // ==== BUBBLE GRID ====
      const coords = computeBubbleCoordinates(numQuestions);
      const coordsArr = Object.values(coords);

      // Draw each question row
      let prevColumn = -1;
      coordsArr.forEach((qCoord, idx) => {
        const qId = Object.keys(coords)[idx];
        const { A, B, C, D, bubbleRadius } = qCoord;

        // Column separator
        if (qCoord.column !== prevColumn) {
          prevColumn = qCoord.column;
        }

        // Question number
        const qLabelX = A.x - bubbleRadius * 3 - 10;
        doc.font('Helvetica').fontSize(10).fillColor('#000')
          .text(`${idx + 1}.`, qLabelX - 20, A.y - 4, { width: 20, align: 'right' });

        // Bubble A
        doc.circle(A.x, A.y, bubbleRadius).stroke('#000');
        doc.font('Helvetica-Bold').fontSize(9).fillColor('#000')
          .text('A', A.x - 3, A.y + bubbleRadius + 1);

        // Bubble B
        doc.circle(B.x, B.y, bubbleRadius).stroke('#000');
        doc.text('B', B.x - 3, B.y + bubbleRadius + 1);

        // Bubble C
        doc.circle(C.x, C.y, bubbleRadius).stroke('#000');
        doc.text('C', C.x - 3, C.y + bubbleRadius + 1);

        // Bubble D
        doc.circle(D.x, D.y, bubbleRadius).stroke('#000');
        doc.text('D', D.x - 3, D.y + bubbleRadius + 1);
      });

      // Footer
      doc.font('Helvetica-Oblique').fontSize(7).fillColor('#888')
        .text('Smart Grading System', margin, pageH - margin / 2, { align: 'center', width: pageW - 2 * margin });

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * Generate answer key mapping for a specific version
 * Used by teacher to grade manually if OMR not available
 * @param {string} versionCode
 * @param {Object} versionData - { questions: [{ position, shuffledOptions }], answerKey: Map }
 * @returns {Object} JSON object
 */
function generateAnswerKey(versionCode, versionData) {
  const { questions, answerKey } = versionData;
  return {
    versionCode,
    generatedAt: new Date().toISOString(),
    questions: questions.map((q) => {
      const correctOption = (q.shuffledOptions || []).find(o => o.isCorrect);
      return {
        position: q.position,
        questionId: q.questionId,
        correctOptionId: correctOption?.id || null,
        correctOptionContent: correctOption?.content || null,
        originalPosition: q.originalPosition,
      };
    }),
    answerKey: Object.fromEntries(answerKey || new Map()),
  };
}

module.exports = {
  generateAnswerSheet,
  generateAnswerKey,
  computeBubbleCoordinates,
};
