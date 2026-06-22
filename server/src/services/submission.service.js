const mongoose = require('mongoose');
const { Submission, Exam, ExamVersion, Question, User, StudentProgress } = require('../models');
const ApiError = require('../utils/ApiError');
const questionService = require('./question.service');
const notificationService = require('./notification.service');
const { parsePagination } = require('../utils/parsePagination');

class SubmissionService {
  async scan(data) {
    const { examId, classId, originalUrl, originalPublicId, imageMeta, image, deviceInfo } = data;
    const config = require('../config/config');
    const { assertIsCloudinaryUrl } = require('../utils/cloudinary.util');

    // Find exam
    const exam = await Exam.findById(examId);
    if (!exam) {
      throw new ApiError(404, 'Exam not found');
    }

    let pythonResult = null;

    // If we have a Cloudinary URL, forward to python bridge for actual scanning
    if (config.upload.mode === 'cloudinary' && originalUrl) {
      assertIsCloudinaryUrl(originalUrl, config.cloudinary.cloud_name);
      const pythonBridge = require('./pythonBridge.service');
      try {
        const template = exam.omrTemplateId
          ? await (require('./omrTemplate.service')).getById(exam.omrTemplateId)
          : {};
        pythonResult = await pythonBridge.processImage({
          imageUrl: originalUrl,
          template: template?.zones || {},
        });
      } catch (err) {
        throw new ApiError(500, `OMR processing failed: ${err.message}`);
      }
    } else if (image) {
      // base64 mode
      const pythonBridge = require('./pythonBridge.service');
      try {
        const template = exam.omrTemplateId
          ? await (require('./omrTemplate.service')).getById(exam.omrTemplateId)
          : {};
        pythonResult = await pythonBridge.processImage({
          image,
          template: template?.zones || {},
        });
      } catch (err) {
        throw new ApiError(500, `OMR processing failed: ${err.message}`);
      }
    } else {
      throw new ApiError(400, 'originalUrl or image is required');
    }

    if (!pythonResult || !pythonResult.success) {
      throw new ApiError(500, pythonResult?.error || 'OMR scanning returned no result');
    }

    // Parse python result
    const {
      answers: rawAnswers = [],
      versionCode,
      studentCode,
      metadata: scanMeta = {},
    } = pythonResult;

    // Match to the correct exam version
    let versionId = null;
    if (versionCode) {
      const version = await ExamVersion.findOne({ examId, versionCode: versionCode.toString() });
      if (version) {
        versionId = version._id;
      }
    }

    // If no version matched, use the first version
    if (!versionId) {
      const firstVersion = await ExamVersion.findOne({ examId }).sort({ versionCode: 1 });
      if (firstVersion) versionId = firstVersion._id;
    }

    // Resolve student by studentCode or classId
    let studentId = null;
    const classDoc = classId
      ? await (require('../models')).Class.findById(classId).select('studentIds').lean()
      : null;
    if (studentCode && classDoc?.studentIds) {
      const students = await User.find({
        _id: { $in: classDoc.studentIds },
        studentCode: studentCode.toString(),
      }).select('_id');
      if (students.length > 0) {
        studentId = students[0]._id;
      }
    }

    // Build graded answers
    const answerKey = versionId
      ? await this._getAnswerKey(versionId)
      : {};

    const gradedAnswers = rawAnswers.map((raw, idx) => {
      const pos = idx + 1;
      const selected = raw.optionId || null;
      const correct = answerKey[pos] || null;
      const isCorrect = selected !== null && selected === correct;
      const scorePerQuestion = exam.totalScore / exam.numberOfQuestions;
      return {
        position: pos,
        questionId: raw.questionId || null,
        selectedAnswer: selected,
        correctAnswer: correct,
        isCorrect,
        score: isCorrect ? scorePerQuestion : 0,
        omrData: raw.omrData || null,
      };
    });

    const totalScore = gradedAnswers.reduce((sum, a) => sum + a.score, 0);

    // Check if submission already exists (upsert logic)
    const existingFilter = studentId
      ? { examId: new mongoose.Types.ObjectId(examId), studentId }
      : { examId: new mongoose.Types.ObjectId(examId), studentCode: studentCode?.toString() };

    const existing = await Submission.findOne(existingFilter);

    let submission;
    if (existing) {
      // Update existing submission
      existing.answers = gradedAnswers;
      existing.totalScore = totalScore;
      existing.maxScore = exam.totalScore;
      existing.finalScore = totalScore;
      existing.status = 'scanned';
      existing.versionId = versionId || existing.versionId;
      existing.images = {
        ...existing.images,
        original: originalUrl ? { publicId: originalPublicId, url: originalUrl } : undefined,
      };
      existing.scanMetadata = {
        ...existing.scanMetadata,
        deviceInfo: deviceInfo || null,
        scannedAt: new Date(),
        processingTimeMs: scanMeta.processingTimeMs || 0,
        ocr: scanMeta.ocr || {},
      };
      await existing.save();
      submission = existing;
    } else {
      // Create new submission
      submission = new Submission({
        examId,
        versionId: versionId || undefined,
        omrTemplateId: exam.omrTemplateId,
        studentId: studentId || undefined,
        studentCode: studentCode?.toString() || `anon-${Date.now()}`,
        classId: classId || undefined,
        answers: gradedAnswers,
        totalScore,
        maxScore: exam.totalScore,
        finalScore: totalScore,
        status: 'scanned',
        images: {
          original: originalUrl ? { publicId: originalPublicId, url: originalUrl } : undefined,
        },
        scanMetadata: {
          deviceInfo: deviceInfo || null,
          scannedAt: new Date(),
          processingTimeMs: scanMeta.processingTimeMs || 0,
          ocr: scanMeta.ocr || {},
        },
      });
      await submission.save();
    }

    // Update question difficulty stats
    for (const answer of gradedAnswers) {
      if (answer.questionId) {
        await questionService.updateDifficultyStats(answer.questionId, answer.isCorrect);
      }
    }

    // Notify student of score
    if (submission.studentId) {
      await notificationService.notifyScoreAvailable(
        submission.studentId.toString(),
        submission._id.toString(),
        examId,
        exam.title,
        Math.round(totalScore * 10) / 10,
        exam.totalScore
      );
    }

    return {
      status: 'scanned',
      submissionId: submission._id,
      examId,
      totalScore: Math.round(totalScore * 10) / 10,
      maxScore: exam.totalScore,
      answerCount: gradedAnswers.length,
      pythonResult,
    };
  }

  async _getAnswerKey(versionId) {
    const version = await ExamVersion.findById(versionId).lean();
    if (!version || !version.answerKey) return {};
    const map = version.answerKey instanceof Map
      ? version.answerKey
      : new Map(Object.entries(version.answerKey || {}));
    const result = {};
    for (const [pos, optId] of map.entries()) {
      result[parseInt(pos, 10)] = optId;
    }
    return result;
  }

  async createFromOMR(scanResult, userId) {
    const { examId, versionId, studentCode, answers, totalScore } = scanResult;

    const exam = await Exam.findById(examId).select('totalScore numberOfQuestions').lean();
    const maxScore = exam?.totalScore || 10;
    const scorePerQuestion = maxScore / (exam?.numberOfQuestions || answers.length || 1);

    const submission = new Submission({
      examId,
      versionId,
      studentId: userId,
      studentCode,
      answers,
      totalScore,
      maxScore,
      finalScore: totalScore,
      status: 'scanned',
    });

    await submission.save();

    // Update student progress
    await this.updateStudentProgress(userId, scanResult);

    // Update question difficulty stats
    for (const answer of answers) {
      if (answer.questionId) {
        await questionService.updateDifficultyStats(answer.questionId, answer.isCorrect);
      }
    }

    return submission;
  }

  async getById(id) {
    return Submission.findById(id)
      .populate('examId', 'title examDate duration')
      .populate('versionId', 'versionCode')
      .populate('studentId', 'name email studentCode')
      .populate('answers.questionId', 'content type options');
  }

  async getByExam(examId, query = {}) {
    const [results, total] = await Promise.all([
      Submission.find({ examId: new mongoose.Types.ObjectId(examId), ...query })
        .populate('examId', 'title examDate duration')
        .populate('versionId', 'versionCode')
        .populate('studentId', 'name email studentCode')
        .sort({ createdAt: -1 }),
      Submission.countDocuments({ examId: new mongoose.Types.ObjectId(examId) }),
    ]);

    return { results, total };
  }

  async getAll(query = {}) {
    const {
      examId,
      studentId,
      versionId,
      status,
      fromDate,
      toDate,
      ...rest
    } = query;
    const { page, limit, skip } = parsePagination(query);

    const filter = { ...rest };
    if (examId) filter.examId = examId;
    if (studentId) filter.studentId = studentId;
    if (versionId) filter.versionId = versionId;
    if (status) filter.status = status;
    if (fromDate || toDate) {
      filter.createdAt = {};
      if (fromDate) filter.createdAt.$gte = new Date(fromDate);
      if (toDate) filter.createdAt.$lte = new Date(toDate);
    }

    const [results, total] = await Promise.all([
      Submission.find(filter)
        .populate('examId', 'title examDate')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Submission.countDocuments(filter),
    ]);

    return {
      results,
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    };
  }

  async updateAnswers(id, answers) {
    const submission = await Submission.findById(id);
    if (!submission) {
      throw new ApiError(404, 'Submission not found');
    }

    const { Exam, ExamVersion } = require('../models');
    const exam = await Exam.findById(submission.examId).select('totalScore numberOfQuestions').lean();

    for (const [posStr, selectedAnswer] of Object.entries(answers)) {
      const position = parseInt(posStr, 10);
      const answer = submission.answers.find(a => a.position === position);
      if (!answer) continue;

      answer.selectedAnswer = selectedAnswer;

      // Re-grade
      if (answer.correctAnswer) {
        answer.isCorrect = selectedAnswer === answer.correctAnswer;
        const scorePerQuestion = (exam?.totalScore || 10) / (exam?.numberOfQuestions || 1);
        answer.score = answer.isCorrect ? scorePerQuestion : 0;
      }
    }

    submission.totalScore = submission.answers.reduce((sum, a) => sum + a.score, 0);
    submission.finalScore = submission.totalScore;
    submission.status = 'scanned';
    await submission.save();

    return {
      success: true,
      totalScore: Math.round(submission.totalScore * 10) / 10,
      maxScore: submission.maxScore,
    };
  }

  async manualOverride(id, data, userId) {
    const { position, correctedAnswer, reason } = data;

    const submission = await Submission.findById(id);
    if (!submission) {
      throw new ApiError(404, 'Submission not found');
    }

    // Find and update the answer
    const answer = submission.answers.find(a => a.position === position);
    if (!answer) {
      throw new ApiError(404, 'Answer at this position not found');
    }

    // Record override
    submission.manualOverrides.push({
      position,
      originalAnswer: answer.selectedAnswer,
      correctedAnswer,
      reason,
      overriddenBy: userId,
      overriddenAt: new Date(),
    });

    // Update answer
    answer.selectedAnswer = correctedAnswer;
    answer.isCorrect = correctedAnswer === answer.correctAnswer;
    answer.score = answer.isCorrect ? answer.score : 0;

    // Recalculate total
    submission.totalScore = submission.answers.reduce((sum, a) => sum + a.score, 0);
    submission.finalScore = submission.totalScore;

    await submission.save();
    return submission;
  }

  async getByStudent(studentId, query = {}) {
    const { page, limit, skip } = parsePagination(query);
    const [results, total] = await Promise.all([
      Submission.find({ studentId: new mongoose.Types.ObjectId(studentId) })
        .populate('examId', 'title examDate duration')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Submission.countDocuments({ studentId: new mongoose.Types.ObjectId(studentId) }),
    ]);
    return { results, page, limit, total, pages: Math.ceil(total / limit) };
  }

  async getMy(studentId, query = {}) {
    const { page, limit, skip } = parsePagination(query);
    const { startDate, endDate, status, ...rest } = query;
    const filter = { studentId: new mongoose.Types.ObjectId(studentId), ...rest };
    if (status) filter.status = status;
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate + 'T23:59:59.999Z');
    }
    const [results, total] = await Promise.all([
      Submission.find(filter)
        .populate('examId', 'title examDate duration subjectName subjectColor')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Submission.countDocuments(filter),
    ]);
    return { results, page, limit, total, pages: Math.ceil(total / limit) };
  }

  async delete(id) {
    const cloudinaryService = require('./cloudinary.service');
    const submission = await Submission.findById(id);
    if (!submission) return null;

    for (const type of ['original', 'preprocessed', 'annotated']) {
      const img = submission.images?.[type];
      if (img?.publicId) {
        try {
          await cloudinaryService.destroy(img.publicId);
        } catch (err) {
          // best-effort; do not fail the deletion
        }
      }
    }
    await Submission.findByIdAndDelete(id);
    return submission;
  }

  async attachImage(submissionId, userId, payload, auditContext) {
    const { UploadAuditLog } = require('../models');
    const config = require('../config/config');
    const { assertIsCloudinaryUrl } = require('../utils/cloudinary.util');

    const submission = await Submission.findById(submissionId);
    if (!submission) {
      throw new ApiError(404, 'Submission not found');
    }

    const { type, url, publicId, width, height, bytes, format } = payload;

    if (!['original', 'preprocessed', 'annotated'].includes(type)) {
      throw new ApiError(400, 'Invalid image type');
    }
    if (bytes != null && bytes > config.upload.maxBytes) {
      throw new ApiError(400, `Image exceeds max size of ${config.upload.maxBytes} bytes`);
    }

    assertIsCloudinaryUrl(url, config.cloudinary.cloud_name);

    submission.images = submission.images || {};
    submission.images[type] = {
      publicId,
      url,
      width,
      height,
      bytes,
      format,
      uploadedAt: new Date(),
    };
    await submission.save();

    if (UploadAuditLog) {
      await UploadAuditLog.create({
        userId,
        action: 'attach_image',
        submissionId: submission._id,
        imageType: type,
        publicId,
        cloudinaryUrl: url,
        bytes,
        ipAddress: auditContext?.ip,
        userAgent: auditContext?.userAgent,
      });
    }

    return submission;
  }

  async deleteImage(submissionId, userId, type, auditContext) {
    const { UploadAuditLog } = require('../models');
    const cloudinaryService = require('./cloudinary.service');

    const submission = await Submission.findById(submissionId);
    if (!submission) {
      throw new ApiError(404, 'Submission not found');
    }
    if (!['original', 'preprocessed', 'annotated'].includes(type)) {
      throw new ApiError(400, 'Invalid image type');
    }

    const img = submission.images?.[type];
    if (!img || !img.publicId) {
      throw new ApiError(404, `No image of type "${type}" on this submission`);
    }

    let destroyResult;
    try {
      destroyResult = await cloudinaryService.destroy(img.publicId);
    } catch (err) {
      if (UploadAuditLog) {
        await UploadAuditLog.create({
          userId,
          action: 'delete_image',
          submissionId: submission._id,
          imageType: type,
          publicId: img.publicId,
          error: err.message,
          ipAddress: auditContext?.ip,
          userAgent: auditContext?.userAgent,
        });
      }
      // Continue to clear DB record even if Cloudinary fails
    }

    submission.images[type] = undefined;
    await submission.save();

    if (UploadAuditLog) {
      await UploadAuditLog.create({
        userId,
        action: 'delete_image',
        submissionId: submission._id,
        imageType: type,
        publicId: img.publicId,
        cloudinaryUrl: img.url,
        ipAddress: auditContext?.ip,
        userAgent: auditContext?.userAgent,
      });
    }

    return { submission, destroyResult };
  }

  async getStatistics(examId) {
    const matchStage = { $match: { examId: new mongoose.Types.ObjectId(examId) } };

    const [stats, gradedSubmissions, exam] = await Promise.all([
      Submission.aggregate([
        matchStage,
        {
          $group: {
            _id: null,
            totalSubmissions: { $sum: 1 },
            totalStudents: { $addToSet: '$studentId' },
            averageScore: { $avg: '$totalScore' },
            highestScore: { $max: '$totalScore' },
            lowestScore: { $min: '$totalScore' },
          },
        },
      ]),
      Submission.aggregate([
        matchStage,
        { $match: { status: { $in: ['scanned', 'completed', 'graded', 'manual_review'] } } },
        {
          $bucket: {
            groupBy: '$totalScore',
            boundaries: [0, 2, 4, 6, 8, 10.01],
            default: 'Other',
            output: {
              count: { $sum: 1 },
            },
          },
        },
      ]),
      Exam.findById(examId).select('totalStudents totalSubmissions').lean(),
    ]);

    const base = stats[0] || { totalSubmissions: 0, averageScore: 0, highestScore: 0, lowestScore: 0, totalStudents: [] };
    const examTotalStudents = exam?.totalStudents || 0;

    const gradeDistribution = [
      { grade: 'Kém (0-2)', count: 0, percentage: 0 },
      { grade: 'Yếu (2-4)', count: 0, percentage: 0 },
      { grade: 'Trung bình (4-6)', count: 0, percentage: 0 },
      { grade: 'Khá (6-8)', count: 0, percentage: 0 },
      { grade: 'Giỏi (8-10)', count: 0, percentage: 0 },
    ];

    const bucketMap = {};
    for (const b of gradedSubmissions) {
      if (b._id !== undefined) bucketMap[b._id] = b.count;
    }
    gradeDistribution[0].count = bucketMap[0] || 0;
    gradeDistribution[1].count = bucketMap[2] || 0;
    gradeDistribution[2].count = bucketMap[4] || 0;
    gradeDistribution[3].count = bucketMap[6] || 0;
    gradeDistribution[4].count = bucketMap[10] || 0;

    const totalGraded = gradeDistribution.reduce((s, d) => s + d.count, 0);
    for (const d of gradeDistribution) {
      d.percentage = totalGraded > 0 ? Math.round((d.count / totalGraded) * 100) : 0;
    }

    const passGrade = gradeDistribution.slice(2).reduce((s, d) => s + d.count, 0);
    const passRate = totalGraded > 0 ? Math.round((passGrade / totalGraded) * 100) : 0;

    const submissionRate = examTotalStudents > 0
      ? Math.round((base.totalSubmissions / examTotalStudents) * 100)
      : 0;

    const scoreHistogram = [
      { range: '0-2', count: gradeDistribution[0].count },
      { range: '2-4', count: gradeDistribution[1].count },
      { range: '4-6', count: gradeDistribution[2].count },
      { range: '6-8', count: gradeDistribution[3].count },
      { range: '8-10', count: gradeDistribution[4].count },
    ];

    return {
      totalSubmissions: base.totalSubmissions,
      totalStudents: examTotalStudents,
      submissionRate,
      averageScore: Math.round((base.averageScore || 0) * 10) / 10,
      highestScore: base.highestScore || 0,
      lowestScore: base.lowestScore || 0,
      gradeDistribution,
      scoreHistogram,
      passRate,
    };
  }

  async updateStudentProgress(studentId, scanResult) {
    const student = await User.findById(studentId);
    if (!student) return;

    let progress = await StudentProgress.findOne({ studentId });

    if (!progress) {
      progress = new StudentProgress({
        studentId,
        schoolId: student.schoolId,
      });
    }

    const exam = await Exam.findById(scanResult.examId);
    if (!exam) return;

    const scoreHistory = {
      examId: exam._id,
      submissionId: scanResult._id,
      score: scanResult.totalScore,
      maxScore: scanResult.maxScore,
      percentage: (scanResult.totalScore / scanResult.maxScore) * 100,
      correctCount: scanResult.answers.filter(a => a.isCorrect).length,
      incorrectCount: scanResult.answers.filter(a => !a.isCorrect).length,
      totalQuestions: scanResult.answers.length,
      examDate: exam.examDate,
    };

    await progress.addExamResult(scoreHistory);
  }
}

module.exports = new SubmissionService();
