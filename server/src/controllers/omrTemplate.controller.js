const httpStatus = require('http-status');
const omrTemplateService = require('../services/omrTemplate.service');
const omrTemplatePdfService = require('../services/omrTemplatePdf.service');
const { convertTemplate } = require('../services/omrTemplateJson.service');
const examService = require('../services/exam.service');
const catchAsync = require('../utils/catchAsync');

const create = catchAsync(async (req, res) => {
  const template = await omrTemplateService.create(req.body);
  res.status(httpStatus.CREATED).send(template);
});

const getAll = catchAsync(async (req, res) => {
  const result = await omrTemplateService.getAll(req.query);
  res.send(result);
});

const getById = catchAsync(async (req, res) => {
  const template = await omrTemplateService.getById(req.params.id);
  if (!template) {
    return res.status(httpStatus.NOT_FOUND).send({ message: 'Template not found' });
  }
  res.send(template);
});

const getFullById = catchAsync(async (req, res) => {
  const template = await omrTemplateService.getFullById(req.params.id);
  if (!template) {
    return res.status(httpStatus.NOT_FOUND).send({ message: 'Template not found' });
  }
  res.send(template);
});

const getJsonById = catchAsync(async (req, res) => {
  const template = await omrTemplateService.getFullById(req.params.id);
  if (!template) {
    return res.status(httpStatus.NOT_FOUND).send({ message: 'Template not found' });
  }
  const flutterJson = convertTemplate(template);
  res.setHeader('Content-Type', 'application/json');
  res.send(flutterJson);
});

const update = catchAsync(async (req, res) => {
  const template = await omrTemplateService.update(req.params.id, req.body);
  if (!template) {
    return res.status(httpStatus.NOT_FOUND).send({ message: 'Template not found' });
  }
  res.send(template);
});

const remove = catchAsync(async (req, res) => {
  const template = await omrTemplateService.delete(req.params.id);
  if (!template) {
    return res.status(httpStatus.NOT_FOUND).send({ message: 'Template not found' });
  }
  res.status(httpStatus.NO_CONTENT).send();
});

const getDefault = catchAsync(async (req, res) => {
  const template = await omrTemplateService.getDefault();
  if (!template) {
    return res.status(httpStatus.NOT_FOUND).send({ message: 'No default template found' });
  }
  res.send(template);
});

const duplicate = catchAsync(async (req, res) => {
  const { newCode, newName } = req.body;
  const template = await omrTemplateService.duplicate(req.params.id, newCode, newName);
  res.status(httpStatus.CREATED).send(template);
});

const generatePdf = catchAsync(async (req, res) => {
  const { examTitle, schoolName } = req.query;
  const pdfBuffer = await omrTemplatePdfService.generateSheetPdf(req.params.id, {
    examTitle: examTitle || 'Bài thi',
    schoolName: schoolName || 'Trường THPT',
  });

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="omr-sheet-${req.params.id}.pdf"`);
  res.setHeader('Content-Length', pdfBuffer.length);
  res.send(pdfBuffer);
});

const generateVersionSheetsPdf = catchAsync(async (req, res) => {
  const { versions, examTitle, schoolName } = req.body;

  if (!versions || !Array.isArray(versions) || versions.length === 0) {
    return res.status(httpStatus.BAD_REQUEST).send({ message: 'versions array is required' });
  }

  if (versions.length === 1) {
    // Single version — return as plain PDF
    const pdfBuffer = await omrTemplatePdfService.generateSheetPdf(req.params.id, {
      versionCode: versions[0],
      examTitle: examTitle || 'Bài thi',
      schoolName: schoolName || 'Trường THPT',
    });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="omr-v${versions[0]}.pdf"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    return res.send(pdfBuffer);
  }

  // Multiple versions — bundle into zip
  const archiver = require('archiver');
  const { PassThrough } = require('stream');

  res.setHeader('Content-Type', 'application/zip');
  res.setHeader('Content-Disposition', `attachment; filename="omr-sheets-${req.params.id}.zip"`);

  const archive = archiver('zip', { zlib: { level: 9 } });
  archive.on('error', err => { throw err; });

  const passthrough = new PassThrough();
  archive.pipe(passthrough);
  passthrough.pipe(res);

  for (const versionCode of versions) {
    const pdfBuffer = await omrTemplatePdfService.generateSheetPdf(req.params.id, {
      versionCode,
      examTitle: examTitle || 'Bài thi',
      schoolName: schoolName || 'Trường THPT',
    });
    archive.append(pdfBuffer, { name: `omr-v${versionCode}.pdf` });
  }

  await archive.finalize();
});

const getByExamId = catchAsync(async (req, res) => {
  const exam = await examService.getById(req.params.examId);
  if (!exam || !exam.omrTemplateId) {
    return res.status(httpStatus.NOT_FOUND).send({ message: 'Exam template not found' });
  }
  const template = await omrTemplateService.getFullById(exam.omrTemplateId._id || exam.omrTemplateId);
  if (!template) {
    return res.status(httpStatus.NOT_FOUND).send({ message: 'Template not found' });
  }
  const flutterJson = convertTemplate(template);
  res.send({ data: flutterJson });
});

module.exports = {
  create,
  getAll,
  getById,
  getFullById,
  getJsonById,
  update,
  remove,
  getDefault,
  duplicate,
  generatePdf,
  generateVersionSheetsPdf,
  getByExamId,
};
