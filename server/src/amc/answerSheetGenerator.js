/**
 * Answer Sheet Generator
 * Tao PDF answer sheet (phieu to dap an) rieng biet voi de thi
 *
 * Answer sheet la 1 file PDF chung cho tat ca cac version
 * Hoc sinh se to cac bubble tren phieu nay (khong phai tren de)
 * Hoc sinh to ma de (101/102/103/104) de xac dinh version
 *
 * Toa do cac bubble duoc xuat ra template JSON de OMR scanner doc
 */

const PDFDocument = require('pdfkit');

/**
 * Compute bubble centers for a given question count
 * Returns { [qId]: { A: {x, y}, B: {x, y}, C: {x, y}, D: {x, y} } }
 *
 * @param {number} numQuestions
 * @param {Object} opts
 * @param {number} opts.gridStartY    - Y where bubble grid actually starts (pixels from top)
 * @param {number} opts.pageW        - page width in points (default A4=595)
 * @param {number} opts.pageH        - page height in points (default A4=842)
 * @param {number} opts.margin        - page margin
 * @param {number} opts.bubbleRadius  - bubble radius
 * @param {number} opts.colSpacing    - horizontal gap between A-B-C-D columns
 * @param {number} opts.rowSpacing    - vertical gap between question rows
 * @returns {Object}
 */
function computeBubbleCoordinates(numQuestions, opts = {}) {
  const {
    gridStartY = 230,
    pageW = 595,
    pageH = 842,
    margin = 36,
    bubbleRadius = 8,
    colSpacing = 22,
    rowSpacing = 20,
  } = opts;

  const usableW = pageW - 2 * margin;
  const usableH = pageH - margin - gridStartY - 40; // 40pt footer reserve

  // Determine how many questions per column
  const questionsPerColumn = Math.floor(usableH / rowSpacing);
  const numColumns = Math.ceil(numQuestions / questionsPerColumn);

  // Each column: question number (30pt) + 4 bubbles (bubble+gap) = colWidth
  const colWidth = usableW / numColumns;
  const questionNumWidth = 30;
  const bubbleBlockWidth = bubbleRadius * 2 * 4 + colSpacing * 3;

  // Center the bubble block within each column
  const bubbleBlockStartX = margin + questionNumWidth + (colWidth - questionNumWidth - bubbleBlockWidth) / 2;

  const coords = {};

  for (let i = 0; i < numQuestions; i++) {
    const qId = `q${i + 1}`;
    const colIndex = Math.floor(i / questionsPerColumn);
    const rowIndex = i % questionsPerColumn;

    // All columns share the same relative X within their column
    const colX = margin + colIndex * colWidth;

    const baseX = colX + bubbleBlockStartX;
    const baseY = gridStartY + rowIndex * rowSpacing;

    coords[qId] = {
      A: { x: baseX, y: baseY },
      B: { x: baseX + bubbleRadius * 2 + colSpacing, y: baseY },
      C: { x: baseX + (bubbleRadius * 2 + colSpacing) * 2, y: baseY },
      D: { x: baseX + (bubbleRadius * 2 + colSpacing) * 3, y: baseY },
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

      // ===== HEADER =====
      let y = margin;

      if (exam.schoolHeader) {
        doc
          .font('Helvetica-Bold')
          .fontSize(10)
          .fillColor('#000')
          .text(exam.schoolHeader, margin, y, { align: 'center', width: pageW - 2 * margin });
        y += 14;
        y += 4; // moveDown(0.2) ~4pt
      }

      doc
        .font('Helvetica-Bold')
        .fontSize(14)
        .fillColor('#000')
        .text('PHIEU TRA LOI', margin, y, { align: 'center', width: pageW - 2 * margin });
      y += 18;
      y += 3; // moveDown(0.15)

      doc
        .font('Helvetica-Bold')
        .fontSize(11)
        .text(exam.title || 'Bai kiem tra', margin, y, { align: 'center', width: pageW - 2 * margin });
      y += 15;
      y += 6; // moveDown(0.3)

      doc.font('Helvetica').fontSize(9).fillColor('#333');
      const colW = (pageW - 2 * margin) / 2;
      const leftCol = margin;
      const rightCol = margin + colW;

      if (exam.subjectName) {
        doc.text(`Mon: ${exam.subjectName}`, leftCol, y, { width: colW });
      }
      if (exam.className) {
        doc.text(`Lop: ${exam.className}`, rightCol, y, { width: colW });
      }
      y += 11;
      y += 5; // moveDown(0.25)

      if (exam.examDate) {
        const date = new Date(exam.examDate);
        const dateStr = `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1)
          .toString()
          .padStart(2, '0')}/${date.getFullYear()}`;
        doc.text(`Ngay thi: ${dateStr}`, leftCol, y, { width: colW });
      }
      if (exam.duration) {
        doc.text(`Thoi gian: ${exam.duration} phut`, rightCol, y, { width: colW });
      }
      y += 11;
      y += 10; // moveDown(0.5)

      // ===== STUDENT INFO (2 columns, 2 rows) =====
      const lineEndX = pageW - margin;
      doc.font('Helvetica').fontSize(9).fillColor('#000');

      const rowH = 18; // vertical step per row
      const lineY = y + 8; // baseline + underline offset

      // Row 1: Ho va ten (left) | MSSV (right)
      doc.text('Ho va ten:', margin, y);
      doc
        .moveTo(margin + 62, lineY)
        .lineTo(margin + 265, lineY)
        .stroke();
      doc.text('MSSV:', margin + 285, y);
      doc
        .moveTo(margin + 325, lineY)
        .lineTo(lineEndX, lineY)
        .stroke();
      y += rowH;

      // Row 2: Lop (left) | So bao danh (right)
      doc.text('Lop:', margin, y);
      doc
        .moveTo(margin + 24, y + 8)
        .lineTo(margin + 265, y + 8)
        .stroke();
      doc.text('So bao danh:', margin + 285, y);
      doc
        .moveTo(margin + 355, y + 8)
        .lineTo(lineEndX, y + 8)
        .stroke();
      y += rowH + 6;

      // ===== VERSION CODE BOX =====
      doc.font('Helvetica-Bold').fontSize(9).fillColor('#000').text('MA DE (to vao mot o duy nhat):', margin, y);
      y += 13;

      const versionBoxSize = 20;
      const versionBoxGap = 8;
      const versionLabelGap = 4;
      const versionBoxY = y;
      const versionLabelY = versionBoxY + versionBoxSize + versionLabelGap;

      versionCodes.forEach((vCode, idx) => {
        const boxX = margin + idx * (versionBoxSize + versionBoxGap + 30);
        doc.rect(boxX, versionBoxY, versionBoxSize, versionBoxSize).stroke('#000');
        doc
          .font('Helvetica-Bold')
          .fontSize(10)
          .fillColor('#000')
          .text(vCode, boxX, versionLabelY, { width: versionBoxSize, align: 'center' });
      });
      y = versionLabelY + 12;

      // ===== INSTRUCTIONS =====
      doc
        .font('Helvetica-Oblique')
        .fontSize(8)
        .fillColor('#555')
        .text('Huong dan: To den vao mot o duy nhat moi cau. Dung but chi (HB). Khong to hai o cung mot cau.', margin, y, {
          width: pageW - 2 * margin,
        });
      y += 14;

      // ===== COLUMN HEADERS (A B C D) =====
      const colW2 = (pageW - 2 * margin) / 1; // single column for now
      const questionsPerColumn = Math.ceil(1000 / 20); // placeholder, will recalculate
      const usableH2 = pageH - margin - y - 40;
      const actualQPerCol = Math.floor(usableH2 / 20);
      const numCols2 = Math.ceil(numQuestions / actualQPerCol);
      const colWidth2 = (pageW - 2 * margin) / numCols2;

      const questionNumWidth2 = 30;
      const colSpacing2 = 22;
      const bubbleRadius2 = 8;
      const bubbleBlockWidth2 = bubbleRadius2 * 2 * 4 + colSpacing2 * 3;
      const bubbleBlockStartX2 = margin + questionNumWidth2 + (colWidth2 - questionNumWidth2 - bubbleBlockWidth2) / 2;

      // Draw A B C D column labels
      const headerY = y + 2;
      doc.font('Helvetica-Bold').fontSize(9).fillColor('#000');
      ['A', 'B', 'C', 'D'].forEach((label, idx) => {
        const lx = margin + bubbleBlockStartX2 + idx * (bubbleRadius2 * 2 + colSpacing2);
        doc.text(label, lx - 4, headerY, { width: 12, align: 'center' });
      });
      // Separator line under headers
      doc
        .moveTo(margin, headerY + 12)
        .lineTo(pageW - margin, headerY + 12)
        .stroke();
      y = headerY + 16;

      // ===== BUBBLE GRID =====
      const gridOpts = {
        gridStartY: y,
        pageW,
        pageH,
        margin,
        bubbleRadius: bubbleRadius2,
        colSpacing: colSpacing2,
        rowSpacing: 20,
      };
      const coords = computeBubbleCoordinates(numQuestions, gridOpts);
      const coordsArr = Object.values(coords);

      coordsArr.forEach((qCoord, idx) => {
        const { A, B, C, D, bubbleRadius } = qCoord;
        const labelX = A.x - bubbleRadius * 4 - 10;

        // Question number
        doc
          .font('Helvetica')
          .fontSize(9)
          .fillColor('#000')
          .text(`${idx + 1}.`, labelX - 18, A.y - 4, { width: 18, align: 'right' });

        // Bubbles
        doc.circle(A.x, A.y, bubbleRadius).stroke('#000');
        doc.circle(B.x, B.y, bubbleRadius).stroke('#000');
        doc.circle(C.x, C.y, bubbleRadius).stroke('#000');
        doc.circle(D.x, D.y, bubbleRadius).stroke('#000');
      });

      // ===== FOOTER =====
      doc
        .font('Helvetica-Oblique')
        .fontSize(7)
        .fillColor('#888')
        .text('Smart Grading System', margin, pageH - margin / 2, {
          align: 'center',
          width: pageW - 2 * margin,
        });

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
      const correctOption = (q.shuffledOptions || []).find((o) => o.isCorrect);
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
