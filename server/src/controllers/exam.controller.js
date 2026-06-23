const httpStatus = require('http-status');
const archiver = require('archiver');
const examService = require('../services/exam.service');
const exportService = require('../services/export.service');
const PDFGenerator = require('../utils/pdfGenerator');
const catchAsync = require('../utils/catchAsync');
const amcService = require('../amc/amc.service');

const create = catchAsync(async (req, res) => {
  const exam = await examService.create({
    ...req.body,
    createdBy: req.user.id,
  });
  res.status(httpStatus.CREATED).send(exam);
});

const getAll = catchAsync(async (req, res) => {
  const result = await examService.getAll(req.query, req.user);
  res.send(result);
});

const getUpcoming = catchAsync(async (req, res) => {
  const limit = parseInt(req.query.limit, 10) || 5;
  const exams = await examService.getUpcomingExams(req.user, limit);
  res.send({
    results: exams,
    limit,
    count: exams.length,
  });
});

const getById = catchAsync(async (req, res) => {
  const exam = await examService.getById(req.params.id);
  if (!exam) {
    return res.status(httpStatus.NOT_FOUND).send({ message: 'Exam not found' });
  }
  res.send(exam);
});

const update = catchAsync(async (req, res) => {
  const exam = await examService.update(req.params.id, req.body);
  if (!exam) {
    return res.status(httpStatus.NOT_FOUND).send({ message: 'Exam not found' });
  }
  res.send(exam);
});

const publish = catchAsync(async (req, res) => {
  const exam = await examService.publish(req.params.id);
  res.send(exam);
});

const complete = catchAsync(async (req, res) => {
  const exam = await examService.complete(req.params.id);
  res.send(exam);
});

const addClasses = catchAsync(async (req, res) => {
  const exam = await examService.addClasses(req.params.id, req.body.classIds);
  res.send(exam);
});

const removeClasses = catchAsync(async (req, res) => {
  const exam = await examService.removeClasses(req.params.id, req.body.classIds);
  res.send(exam);
});

const generateVersions = catchAsync(async (req, res) => {
  const { count } = req.body;
  const result = await examService.generateVersions(req.params.id, count);
  res.status(httpStatus.CREATED).send(result);
});

const getVersions = catchAsync(async (req, res) => {
  const versions = await examService.getVersions(req.params.id);
  res.send(versions);
});

const getVersionsWithQuestions = catchAsync(async (req, res) => {
  const versions = await examService.getVersionsWithQuestions(req.params.id);
  res.send(versions);
});

const exportExamPDF = catchAsync(async (req, res) => {
  const format = req.query.format || 'pdf';

  let exam;
  if (format === 'excel') {
    return res.status(400).send({ message: 'Xuất đề thi sang Excel chưa được hỗ trợ' });
  }

  try {
    const data = await examService.exportExamPDF(req.params.id, format);
    exam = data.exam;
  } catch (err) {
    return res.status(400).send({ message: err.message || 'Không thể xuất đề thi' });
  }

  if (!exam || !exam.questions) {
    return res.status(400).send({ message: 'Đề thi không có câu hỏi hoặc không tồn tại' });
  }

  const pdfGen = new PDFGenerator({ title: exam.title });
  pdfGen.addHeader(exam);
  pdfGen.addMetadata(exam);
  pdfGen.addHorizontalLine();
  pdfGen.addStudentInfoBlock();
  pdfGen.addInstructions();
  pdfGen.addHorizontalLine();
  pdfGen.currentY += 10;

  exam.questions.forEach((q, idx) => {
    pdfGen.addQuestion(q, idx);
  });

  if (exam.printConfig?.includeAnswerSheet !== false) {
    pdfGen.addOMRSheet({
      questions: exam.questions,
      totalScore: exam.totalScore,
      examTitle: exam.title,
    });
  }

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="${(exam.title || 'exam').replace(/[^a-zA-Z0-9\u00C0-\u024F]/g, '_')}.pdf"`
  );

  const docStream = pdfGen.generate();
  docStream.on('error', (err) => {
    console.error('PDF stream error (exportExamPDF):', err.message);
    if (!res.headersSent) {
      res.status(500).send({ message: 'Lỗi khi tạo PDF' });
    }
  });
  docStream.pipe(res);
});

const exportVersionPDF = catchAsync(async (req, res) => {
  const { versionCode } = req.params;

  let version;
  try {
    const data = await examService.exportVersionPDF(req.params.id, versionCode);
    version = data.version;
  } catch (err) {
    return res.status(400).send({ message: err.message || 'Không thể xuất phiên bản đề thi' });
  }

  if (!version || !version.questions) {
    return res.status(400).send({ message: 'Phiên bản đề thi không có câu hỏi hoặc không tồn tại' });
  }

  const pdfGen = new PDFGenerator({
    title: `${version.title} - Mã đề ${version.versionCode}`,
  });
  pdfGen.addHeader({ ...version, schoolName: version.schoolName, title: version.title });
  pdfGen.addMetadata(version);
  pdfGen.addHorizontalLine();
  pdfGen.addStudentInfoBlock();
  pdfGen.addInstructions();
  pdfGen.addHorizontalLine();
  pdfGen.currentY += 10;

  version.questions.forEach((q, idx) => {
    pdfGen.addQuestion(q, idx);
  });

  const printConfig = data.printConfig || {};
  if (printConfig.includeAnswerSheet !== false) {
    pdfGen.addOMRSheet({
      questions: version.questions,
      versionCode: version.versionCode,
      totalScore: version.totalScore,
      examTitle: version.title,
    });
  }

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="${(version.title || 'exam').replace(/[^a-zA-Z0-9\u00C0-\u024F]/g, '_')}_${version.versionCode}.pdf"`
  );

  const docStream = pdfGen.generate();
  docStream.on('error', (err) => {
    console.error('PDF stream error (exportVersionPDF):', err.message);
    if (!res.headersSent) {
      res.status(500).send({ message: 'Lỗi khi tạo PDF' });
    }
  });
  docStream.pipe(res);
});

const exportResults = catchAsync(async (req, res) => {
  const format = req.query.format || 'pdf';
  try {
    if (format === 'excel') {
      const result = await exportService.exportExamResultsExcel(req.params.id, req.user);
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="KetQua_${req.params.id}.xlsx"`);
      return res.send(result);
    }

    const result = await examService.exportResults(req.params.id, format);
    if (!result || !Buffer.isBuffer(result)) {
      return res.status(400).send({ message: 'Kết quả không hợp lệ' });
    }
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="results_${req.params.id}.pdf"`);
    res.setHeader('Content-Length', result.length);
    res.send(result);
  } catch (err) {
    res.status(400).send({ message: err.message || 'Lỗi khi xuất kết quả' });
  }
});

const remove = catchAsync(async (req, res) => {
  const exam = await examService.delete(req.params.id);
  if (!exam) {
    return res.status(httpStatus.NOT_FOUND).send({ message: 'Exam not found' });
  }
  res.status(httpStatus.NO_CONTENT).send();
});

const generatePapers = catchAsync(async (req, res, next) => {
  try {
    const { id } = req.params;
    const { paperEngine, forceRegenerate } = req.body;

    const { ExamVersion } = require('../models');
    const ApiError = require('../utils/ApiError');

    const versions = await ExamVersion.find({ examId: id }).select('versionCode pdfUrl');
    const versionCodes = versions.map((v) => v.versionCode);

    if (versionCodes.length === 0) {
      throw new ApiError(400, 'No exam versions found. Generate versions first.');
    }

    if (forceRegenerate) {
      await ExamVersion.updateMany({ examId: id }, { $set: { pdfUrl: null, answerSheetPdfUrl: null } });
    }

    let engine = paperEngine || 'auto';
    if (engine === 'auto') {
      const amcAvailable = await amcService.isAvailable();
      engine = amcAvailable ? 'amc' : 'pdfkit';
    }

    let result;
    if (engine === 'amc') {
      result = await amcService.generateExamPapers(id, versionCodes);
    } else {
      result = {
        success: false,
        engine: 'pdfkit',
        fallback: false,
        message: 'PDFKit generation not implemented in this route — use AMC',
      };
    }

    res.json(result);
  } catch (err) {
    next(err);
  }
});

const exportVersionsZip = catchAsync(async (req, res) => {
  const examId = req.params.id;

  const versions = await examService.getVersions(examId);
  if (!versions || versions.length === 0) {
    return res.status(404).send({ message: 'No versions found for this exam' });
  }

  const exam = await examService.getById(examId);
  if (!exam) {
    return res.status(404).send({ message: 'Exam not found' });
  }

  res.setHeader('Content-Type', 'application/zip');
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="${(exam.title || 'exam').replace(/[^a-zA-Z0-9\u00C0-\u024F]/g, '_')}_all_versions.zip"`
  );

  const archive = archiver('zip', { zlib: { level: 5 } });
  archive.on('error', (err) => {
    if (!res.headersSent) {
      res.status(500).send({ message: 'Lỗi khi tạo file ZIP' });
    }
  });
  archive.pipe(res);

  for (const version of versions) {
    try {
      const data = await examService.exportVersionPDF(examId, version.versionCode);
      const versionObj = data.version;
      const printConfig = data.printConfig || {};

      const pdfGen = new PDFGenerator({
        title: `${versionObj.title} - Mã đề ${versionObj.versionCode}`,
      });
      pdfGen.addHeader({ ...versionObj, schoolName: versionObj.schoolName, title: versionObj.title });
      pdfGen.addMetadata(versionObj);
      pdfGen.addHorizontalLine();
      pdfGen.addStudentInfoBlock();
      pdfGen.addInstructions();
      pdfGen.addHorizontalLine();
      pdfGen.currentY += 10;

      versionObj.questions.forEach((q, idx) => {
        pdfGen.addQuestion(q, idx);
      });

      if (printConfig.includeAnswerSheet !== false) {
        pdfGen.addOMRSheet({
          questions: versionObj.questions,
          versionCode: versionObj.versionCode,
          totalScore: versionObj.totalScore,
          examTitle: versionObj.title,
        });
      }

      const doc = pdfGen.generate();
      const chunks = [];
      for await (const chunk of doc) {
        chunks.push(chunk);
      }
      const pdfBuffer = Buffer.concat(chunks);
      archive.append(pdfBuffer, {
        name: `${(exam.title || 'exam').replace(/[^a-zA-Z0-9\u00C0-\u024F]/g, '_')}_made_${versionObj.versionCode}.pdf`,
      });
    } catch (err) {
      console.error(`Failed to generate PDF for version ${version.versionCode}:`, err.message);
    }
  }

  archive.finalize();
});

module.exports = {
  create,
  getAll,
  getUpcoming,
  getById,
  update,
  publish,
  complete,
  addClasses,
  removeClasses,
  generateVersions,
  getVersions,
  getVersionsWithQuestions,
  exportExamPDF,
  exportVersionPDF,
  exportVersionsZip,
  exportResults,
  remove,
  generatePapers,
};
