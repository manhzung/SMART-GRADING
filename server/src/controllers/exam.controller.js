const httpStatus = require('http-status');
const archiver = require('archiver');
const examService = require('../services/exam.service');
const examPaperService = require('../services/examPaper.service');
const exportService = require('../services/export.service');
const PDFGenerator = require('../utils/pdfGenerator');
const catchAsync = require('../utils/catchAsync');
const amcService = require('../amc/amc.service');
const ApiError = require('../utils/ApiError');

const create = catchAsync(async (req, res) => {
  const exam = await examService.create({
    ...req.body,
    createdBy: req.user.id,
  });
  res.status(httpStatus.CREATED).send(exam);
});

/**
 * Create exam from selected questions in question bank
 * POST /exams/from-selection
 */
const createFromSelection = catchAsync(async (req, res) => {
  const {
    questionIds,
    title,
    description,
    subjectId,
    subjectName,
    classIds,
    primaryClassId,
    omrTemplateId,
    examDate,
    startTime,
    duration,
    totalScore,
    passingScore,
    numberOfVersions,
    printConfig,
    shuffleConfig,
  } = req.body;

  const { Question } = require('../models');

  // Verify all questions exist
  const questions = await Question.find({ _id: { $in: questionIds } }).lean();
  if (questions.length !== questionIds.length) {
    throw new ApiError(400, 'Một số câu hỏi không tồn tại');
  }

  // Create exam with selected questions
  const exam = await examService.create({
    title,
    description: description || '',
    subjectId,
    subjectName,
    classIds,
    primaryClassId: primaryClassId || classIds[0],
    omrTemplateId,
    examDate: new Date(examDate),
    startTime,
    duration,
    totalScore,
    passingScore,
    numberOfQuestions: questionIds.length,
    numberOfVersions,
    questionIds,
    printConfig,
    shuffleConfig,
    createdBy: req.user.id,
  });

  // Increment usage count for selected questions
  await Question.updateMany(
    { _id: { $in: questionIds } },
    { $inc: { usageCount: 1 } }
  );

  res.status(httpStatus.CREATED).send({
    success: true,
    data: {
      _id: exam._id,
      title: exam.title,
      numberOfQuestions: exam.numberOfQuestions,
      totalScore: exam.totalScore,
      questionIds: exam.questionIds,
      status: exam.status,
    },
  });
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

const getVersionAnswerKey = catchAsync(async (req, res) => {
  const { id, versionCode } = req.params;
  console.log(`[getVersionAnswerKey] INPUT: examId=${id}, versionCode=${versionCode}`);

  // Lấy 2 số cuối của versionCode để so sánh
  const versionSuffix = versionCode.slice(-2);
  console.log(`[getVersionAnswerKey] Looking for suffix: ${versionSuffix}`);

  // Tìm tất cả versions và so khớp 2 số cuối
  const versions = await examService.getVersionsWithQuestions(id);
  console.log(`[getVersionAnswerKey] Found ${versions.length} versions in database`);
  console.log(`[getVersionAnswerKey] Available versionCodes: ${versions.map(v => v.versionCode).join(', ')}`);

  let matchedVersion = null;
  for (const v of versions) {
    const vSuffix = v.versionCode.slice(-2);
    console.log(`[getVersionAnswerKey] Checking version ${v.versionCode} (suffix: ${vSuffix})`);
    if (vSuffix === versionSuffix) {
      matchedVersion = v;
      console.log(`[getVersionAnswerKey] ✓ MATCHED! versionCode=${v.versionCode}`);
      break;
    }
  }

  if (!matchedVersion) {
    console.log(`[getVersionAnswerKey] ✗ No matching version found for suffix: ${versionSuffix}`);
    return res.status(404).send({ message: 'Version not found' });
  }

  // Trả về answerKey dưới dạng object { "1": "A", "2": "B", ... }
  const answerKey = {};
  if (matchedVersion.answerKey) {
    for (const [key, value] of matchedVersion.answerKey.entries()) {
      answerKey[key] = value;
    }
  }

  console.log(`[getVersionAnswerKey] Returning:`);
  console.log(`  - versionCode: ${matchedVersion.versionCode}`);
  console.log(`  - numberOfQuestions: ${matchedVersion.numberOfQuestions}`);
  console.log(`  - answerKey (${Object.keys(answerKey).length} entries):`, answerKey);
  res.send({
    versionCode: matchedVersion.versionCode,
    answerKey,
    numberOfQuestions: matchedVersion.numberOfQuestions,
  });
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
  pdfGen.end();
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

  const { ExamVersion } = require('../models');
  const version = await ExamVersion.findOne({ examId: req.params.id, versionCode });
  if (!version) {
    return res.status(404).send({ message: 'Phiên bản đề thi không tồn tại' });
  }

    // Serve pre-generated AMC PDF if available
  if (version.pdfUrl) {
    const fs = require('fs');
    const path = require('path');
    // Resolve: server/src/controllers → server → server/uploads/amc/<examId>/v1.pdf
    const filePath = path.join(__dirname, '../../../uploads/amc', req.params.id, path.basename(version.pdfUrl));
    if (fs.existsSync(filePath)) {
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="De_${versionCode}.pdf"`);
      return fs.createReadStream(filePath).pipe(res);
    }
  }

  let data;
  try {
    data = await examService.exportVersionPDF(req.params.id, versionCode);
  } catch (err) {
    return res.status(400).send({ message: err.message || 'Không thể xuất phiên bản đề thi' });
  }

  const versionData = data.version;
  if (!versionData || !versionData.questions) {
    return res.status(400).send({ message: 'Phiên bản đề thi không có câu hỏi' });
  }

  const pdfGen = new PDFGenerator({
    title: `${versionData.title} - Mã đề ${versionData.versionCode}`,
  });
  pdfGen.addHeader({ ...versionData, schoolName: versionData.schoolName, title: versionData.title });
  pdfGen.addMetadata(versionData);
  pdfGen.addHorizontalLine();
  pdfGen.addStudentInfoBlock();
  pdfGen.addInstructions();
  pdfGen.addHorizontalLine();
  pdfGen.currentY += 10;

  versionData.questions.forEach((q, idx) => {
    pdfGen.addQuestion(q, idx);
  });

  const printConfig = data.printConfig || {};
  if (printConfig.includeAnswerSheet !== false) {
    pdfGen.addOMRSheet({
      questions: versionData.questions,
      versionCode: versionData.versionCode,
      totalScore: versionData.totalScore,
      examTitle: versionData.title,
    });
  }

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="${(versionData.title || 'exam').replace(/[^a-zA-Z0-9\u00C0-\u024F]/g, '_')}_${versionData.versionCode}.pdf"`
  );

  const docStream = pdfGen.generate();
  pdfGen.end();
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
    const forceRegenerate = req.body?.forceRegenerate === true;

    const exam = await examService.getById(id);
    if (!exam) {
      throw new ApiError(404, 'Exam not found');
    }
    if (!exam.questionIds || exam.questionIds.length === 0) {
      throw new ApiError(400, 'Exam must have at least one question');
    }

    const result = await examPaperService.generateAllPapers(id, { forceRegenerate });
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
      pdfGen.end();
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

/**
 * GET /exams/:id/template
 *
 * Returns the OMR template JSON needed for mobile scanning.
 *
 * For AMC exams:
 *   - template: OMRTemplate.templateJson (per-bubble coords + answerKey + scores)
 *     Generated by AMC → buildTemplate() during generatePapers()
 *   - answerKey: ExamVersion.answerKey (for verification if needed)
 *
 * For legacy exams:
 *   - template: null (no templateJson generated)
 *   - answerKey: ExamVersion.answerKey
 *
 * Mobile flow:
 *   1. GET /exams/:id/template → get templateJson + answerKey
 *   2. engine_v2 uses templateJson.answers{} + templateJson.answerKey{}
 *   3. Scans → grades → POST /submissions { answers, totalScore }
 */
const getExamTemplate = catchAsync(async (req, res, next) => {
  try {
    const { id } = req.params;
    const { versionCode } = req.query;

    const { Exam, ExamVersion, OMRTemplate } = require('../models');

    const exam = await Exam.findById(id);
    if (!exam) throw new ApiError(404, 'Exam not found');

    // ── Load OMRTemplate for templateJson ─────────────────────────────
    let templateJson = null;
    let omrTemplate = null;
    if (exam.omrTemplateId) {
      omrTemplate = await OMRTemplate.findById(exam.omrTemplateId).lean();
      templateJson = omrTemplate?.templateJson || null;
    }

    // ── Load answerKey from ExamVersion ────────────────────────────────
    let answerKeyObj = {};
    let foundVersionCode = null;
    if (versionCode) {
      const version = await ExamVersion.findOne({ examId: id, versionCode }).lean();
      if (version) {
        foundVersionCode = version.versionCode;
        const map = version.answerKey instanceof Map
          ? version.answerKey
          : new Map(Object.entries(version.answerKey || {}));
        for (const [pos, optId] of map.entries()) {
          answerKeyObj[parseInt(pos, 10)] = optId;
        }
      }
    } else {
      const firstVersion = await ExamVersion.findOne({ examId: id }).lean();
      if (firstVersion) {
        foundVersionCode = firstVersion.versionCode;
        const map = firstVersion.answerKey instanceof Map
          ? firstVersion.answerKey
          : new Map(Object.entries(firstVersion.answerKey || {}));
        for (const [pos, optId] of map.entries()) {
          answerKeyObj[parseInt(pos, 10)] = optId;
        }
      }
    }

    res.json({
      template: templateJson,
      examId: exam._id.toString(),
      versionCode: foundVersionCode,
      answerKey: answerKeyObj,
      totalScore: exam.totalScore,
      numberOfQuestions: exam.numberOfQuestions,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * Get answer sheet URL for an exam
 * The answer sheet is shared by all versions
 */
const getAnswerSheet = catchAsync(async (req, res) => {
  const { id } = req.params;

  const { Exam, ExamVersion } = require('../models');

  const exam = await Exam.findById(id);
  if (!exam) throw new ApiError(404, 'Exam not found');

  // Get answer sheet from first version (all versions share the same answer sheet)
  const firstVersion = await ExamVersion.findOne({ examId: id })
    .select('answerSheetPdfUrl')
    .sort({ versionCode: 1 });

  res.json({
    answerSheetPdfUrl: firstVersion?.answerSheetPdfUrl || null,
    examId: id,
  });
});

const deleteVersion = catchAsync(async (req, res) => {
  const { versionCode } = req.params;
  const examId = req.params.id;

  const { ExamVersion } = require('../models');

  const version = await ExamVersion.findOneAndDelete({ examId, versionCode });
  if (!version) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Exam version not found');
  }

  res.status(httpStatus.NO_CONTENT).send();
});

module.exports = {
  create,
  createFromSelection,
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
  getExamTemplate,
  getAnswerSheet,
  deleteVersion,
  getVersionAnswerKey,
};
