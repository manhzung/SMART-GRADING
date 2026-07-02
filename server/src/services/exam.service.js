const mongoose = require('mongoose');
const PDFDocument = require('pdfkit');
const { Exam, ExamVersion, OMRTemplate, Question, Submission, Class, School } = require('../models');
const ApiError = require('../utils/ApiError');
const omrTemplateService = require('./omrTemplate.service');
const { parsePagination } = require('../utils/parsePagination');

class ExamService {
  async create(data) {
    // OMR Template is optional when creating exam - can be assigned later
    if (data.omrTemplateId) {
      const template = await OMRTemplate.findById(data.omrTemplateId);
      if (!template) {
        throw new ApiError(400, 'OMR Template not found');
      }
    }

    // Set primaryClassId if not provided
    if (!data.primaryClassId && data.classIds?.length > 0) {
      data.primaryClassId = data.classIds[0];
    }

    // Ensure paperEngine is 'amc' for AMC-based grading
    data.paperEngine = 'amc';

    const exam = new Exam(data);
    await exam.save();
    return exam;
  }

  async getById(id, requestingUser = null) {
    const examForAuth = await Exam.findById(id).lean();

    if (!examForAuth) return null;

    if (requestingUser) {
      if (requestingUser.role === 'admin') {
        // Admin can access any exam
      } else if (requestingUser.role === 'school-admin') {
        const examClassIds = examForAuth.classIds || [];
        const isCreator = examForAuth.createdBy && examForAuth.createdBy.toString() === requestingUser.id.toString();
        const schoolClasses = await Class.find({
          schoolId: requestingUser.schoolId,
          _id: { $in: examClassIds },
        }).countDocuments();
        if (schoolClasses === 0 && !isCreator) {
          throw new ApiError(403, 'You can only view exams in your own school');
        }
      } else if (requestingUser.role === 'teacher') {
        const teacherId = requestingUser.id;
        const isCreator = examForAuth.createdBy && examForAuth.createdBy.toString() === teacherId.toString();
        if (!isCreator) {
          const examClassIds = examForAuth.classIds || [];
          const teacherClasses = await Class.find({
            $or: [
              { homeroomTeacherId: teacherId },
              { 'subjectTeachers.teacherId': teacherId },
            ],
            _id: { $in: examClassIds },
          }).countDocuments();
          if (teacherClasses === 0) {
            throw new ApiError(403, 'You can only view exams for your classes');
          }
        }
      } else if (requestingUser.role === 'student') {
        const examClassIds = examForAuth.classIds || [];
        const overlap = examClassIds.some((cid) =>
          (requestingUser.classIds || []).some((ucid) => ucid.toString() === cid.toString())
        );
        if (!overlap) {
          throw new ApiError(403, 'You can only view exams for your enrolled classes');
        }
      }
    }

    const [exam, submissionStats] = await Promise.all([
      Exam.findById(id)
        .populate('classIds', 'name code schoolId')
        .populate('primaryClassId', 'name code')
        .populate('createdBy', 'name email')
        .populate('omrTemplateId', 'name code zones')
        .populate('subjectId', 'name color')
        .populate('questionIds', 'content options imageUrl difficulty score type correctAnswer topic'),
      Submission.aggregate([
        { $match: { examId: new mongoose.Types.ObjectId(id) } },
        {
          $group: {
            _id: null,
            totalSubmissions: { $sum: 1 },
            totalStudents: { $addToSet: '$studentId' },
          },
        },
      ]),
    ]);

    const stats = submissionStats[0] || { totalSubmissions: 0, totalStudents: [] };
    exam.totalSubmissions = stats.totalSubmissions;
    exam.totalStudents = stats.totalStudents.length;

    return exam;
  }

  async getAll(query = {}, user) {
    const {
      classId,
      subjectId,
      status,
      fromDate,
      toDate,
      search,
      sortBy = 'examDate',
      order = 'desc',
      page,
      limit: queryLimit,
      ...rest
    } = query;
    const { page: parsedPage, limit, skip } = parsePagination(query);

    const filter = {};
    if (classId) filter.classIds = classId;
    if (subjectId) filter.subjectId = subjectId;
    if (status) filter.status = status;
    if (fromDate || toDate) {
      filter.examDate = {};
      if (fromDate) filter.examDate.$gte = new Date(fromDate);
      if (toDate) filter.examDate.$lte = new Date(toDate);
    }
    if (search) {
      filter.title = { $regex: search, $options: 'i' };
    }
    Object.assign(filter, rest);

    const sortOrder = order === 'asc' ? 1 : -1;

    // User-based filtering: admins see all exams, school-admins see their school exams,
    // teachers see their own exams, students see their class's exams
    if (user) {
      if (user.role === 'admin') {
        // No filter - admin sees all exams
      } else if (user.role === 'school-admin' && user.schoolId) {
        const schoolClassIds = await Class.find({ schoolId: user.schoolId }).distinct('_id');
        if (schoolClassIds.length > 0) {
          filter.$or = [
            { classIds: { $in: schoolClassIds } },
            { createdBy: user.id },
          ];
        } else {
          filter.createdBy = user.id;
        }
      } else if (user.role === 'teacher') {
        filter.createdBy = user.id;
      } else if (user.role === 'student' && user.classIds?.length) {
        filter.classIds = { $in: user.classIds };
      }
    }

    const [results, total] = await Promise.all([
      Exam.find(filter)
        .populate('classIds', 'name code')
        .populate('primaryClassId', 'name code')
        .populate('subjectId', 'name color')
        .sort({ [sortBy]: sortOrder })
        .skip(skip)
        .limit(limit),
      Exam.countDocuments(filter),
    ]);

    return {
      results,
      page: parsedPage,
      limit,
      total,
      pages: Math.ceil(total / limit),
    };
  }

  async getUpcomingExams(user, limit) {
    const now = new Date();
    const baseFilter = {
      $or: [
        { examDate: { $ne: null, $gte: now } },
        { examDate: null, createdAt: { $gte: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) } },
        { status: { $in: ['draft', 'published', 'in_progress', 'completed'] }, examDate: { $ne: null, $lt: now } },
      ],
    };

    if (user) {
      if (user.role === 'admin') {
        // No extra filter - admin sees all exams
      } else if (user.role === 'school-admin' && user.schoolId) {
        const schoolClassIds = await Class.find({ schoolId: user.schoolId }).distinct('_id');
        if (schoolClassIds.length > 0) {
          baseFilter.$or = [
            ...(baseFilter.$or || []),
            { classIds: { $in: schoolClassIds } },
            { createdBy: user.id },
          ];
        } else {
          baseFilter.createdBy = user.id;
        }
      } else if (user.role === 'teacher') {
        baseFilter.createdBy = user.id;
      } else if (user.role === 'student' && user.classIds?.length) {
        baseFilter.classIds = { $in: user.classIds };
      } else {
        baseFilter.createdBy = user.id;
      }
    }

    return Exam.find(baseFilter)
      .sort({ examDate: -1, createdAt: -1 })
      .limit(limit)
      .populate('classIds', 'name code')
      .populate('primaryClassId', 'name code')
      .populate('subjectId', 'name color')
      .lean();
  }

  async update(id, data) {
    const exam = await Exam.findByIdAndUpdate(id, data, { new: true, runValidators: true });
    return exam;
  }

  async publish(id) {
    const exam = await Exam.findById(id);
    if (!exam) {
      throw new ApiError(404, 'Exam not found');
    }
    if (exam.status !== 'draft') {
      throw new ApiError(400, 'Only draft exams can be published');
    }
    if (!exam.questionIds || exam.questionIds.length === 0) {
      throw new ApiError(400, 'Exam must have at least one question before publishing');
    }

    exam.status = 'published';
    exam.publishedAt = new Date();
    await exam.save();

    // Notify all students in assigned classes
    const { Class, User } = require('../models');
    const { User: UserModel } = require('../models');
    const notificationService = require('./notification.service');

    const classDocs = await Class.find({ _id: { $in: exam.classIds } }).select('studentIds');
    const studentIds = [];
    for (const cls of classDocs) {
      for (const sid of cls.studentIds || []) {
        if (!studentIds.includes(sid.toString())) {
          studentIds.push(sid.toString());
        }
      }
    }

    if (studentIds.length > 0) {
      await notificationService.notifyExamPublished(
        exam._id,
        studentIds,
        exam.title,
        exam.examDate
      );
      // Schedule reminder for 1 day before exam
      await notificationService.scheduleExamReminder(
        studentIds,
        exam._id,
        exam.title,
        exam.examDate
      );
    }

    return exam;
  }

  async complete(id) {
    const exam = await Exam.findById(id);
    if (!exam) {
      throw new ApiError(404, 'Exam not found');
    }

    exam.status = 'completed';
    exam.completedAt = new Date();
    await exam.save();

    // Auto-generate exam report
    const reportService = require('./report.service');
    try {
      await reportService.generateExamReport(id, exam.createdBy);
    } catch (err) {
      const logger = require('../config/logger');
      logger.error('Auto-report generation failed on exam complete', { examId: id, error: err.message });
    }

    return exam;
  }

  async addClasses(id, classIds) {
    const exam = await Exam.findById(id);
    if (!exam) {
      throw new ApiError(404, 'Exam not found');
    }
    if (exam.status === 'in_progress') {
      throw new ApiError(409, 'Cannot add classes to an exam that is in progress');
    }

    for (const classId of classIds) {
      if (!exam.classIds.includes(classId)) {
        exam.classIds.push(classId);
      }
    }
    await exam.save();
    return exam;
  }

  async removeClasses(id, classIds) {
    const exam = await Exam.findById(id);
    if (!exam) {
      throw new ApiError(404, 'Exam not found');
    }
    if (exam.status === 'in_progress') {
      throw new ApiError(409, 'Cannot remove classes from an exam that is in progress');
    }

    exam.classIds = exam.classIds.filter(cid => !classIds.includes(cid.toString()));
    await exam.save();
    return exam;
  }

  async generateVersions(examId, count = 4) {
    const exam = await Exam.findById(examId).populate('questionIds');
    if (!exam) {
      throw new ApiError(404, 'Exam not found');
    }

    const questions = exam.questionIds;
    const versionCodes = [];
    
    for (let i = 0; i < count; i++) {
      const versionCode = (101 + i).toString();
      
      // Check if version already exists
      let examVersion = await ExamVersion.findOne({
        examId: exam._id,
        versionCode,
      });
      
      // Shuffle questions
      const shuffledQuestions = this.shuffleArray([...questions]);
      
      // Create shuffled options for each question
      const questionsWithShuffledOptions = shuffledQuestions.map((q, idx) => ({
        position: idx + 1,
        questionId: q._id,
        originalPosition: questions.findIndex(qq => qq._id.toString() === q._id.toString()) + 1,
        shuffledOptions: exam.shuffleConfig?.shuffleOptions !== false 
          ? this.shuffleOptions(q.options)
          : q.options,
      }));

      // Build answer key
      const answerKey = new Map();
      questionsWithShuffledOptions.forEach((q, idx) => {
        const correctOption = q.shuffledOptions.find(opt => opt.isCorrect);
        answerKey.set((idx + 1).toString(), correctOption?.id || null);
      });

      if (examVersion) {
        // Update existing
        examVersion.questions = questionsWithShuffledOptions;
        examVersion.answerKey = answerKey;
        examVersion.numberOfQuestions = questions.length;
        await examVersion.save();
      } else {
        // Create new
        examVersion = new ExamVersion({
          examId: exam._id,
          versionCode,
          numberOfQuestions: questions.length,
          questions: questionsWithShuffledOptions,
          answerKey,
        });
        await examVersion.save();
        exam.versions.push(examVersion._id);
      }
      versionCodes.push(versionCode);
    }

    await exam.save();

    // Increment template usage
    if (exam.omrTemplateId) {
      await omrTemplateService.incrementUsageCount(exam.omrTemplateId);
    }

    return { examId: exam._id, versions: versionCodes, examVersions: exam.versions };
  }

  async getVersions(examId) {
    return ExamVersion.find({ examId })
      .select('versionCode numberOfQuestions submissionCount createdAt paperEngine pdfUrl answerSheetPdfUrl corrigePdfUrl generatedAt generationErrors');
  }

  async getVersionByCode(examId, versionCode) {
    return ExamVersion.findOne({ examId, versionCode });
  }

  async getVersionsWithQuestions(examId) {
    return ExamVersion.find({ examId })
      .populate('questions.questionId', 'content options imageUrl');
  }

  async exportExamPdf(examId, user) {
    const { Exam, ExamVersion } = require('../models');
    const exam = await Exam.findById(examId)
      .populate('classIds', 'name code')
      .populate('createdBy', 'name')
      .populate('omrTemplateId', 'name code zones')
      .populate('questionIds', 'content options difficulty score type');

    if (!exam) {
      throw new ApiError(404, 'Exam not found');
    }

    const versions = await ExamVersion.find({ examId })
      .select('versionCode numberOfQuestions createdAt');

    return {
      exam: {
        _id: exam._id,
        title: exam.title,
        description: exam.description,
        examDate: exam.examDate,
        duration: exam.duration,
        totalScore: exam.totalScore,
        passingScore: exam.passingScore,
        omrTemplate: exam.omrTemplateId,
        creator: exam.createdBy?.name,
        classes: exam.classIds,
      },
      questions: exam.questionIds,
      versions,
      printConfig: exam.printConfig,
      shuffleConfig: exam.shuffleConfig,
      generatedAt: new Date().toISOString(),
      generatedBy: user?.name || 'System',
    };
  }

  async delete(id) {
    // Hard delete: remove the exam and all associated child records.
    // Returns null if the exam does not exist; otherwise returns the deleted document.
    const exam = await Exam.findByIdAndDelete(id);
    if (!exam) return null;

    // Cascade-delete dependent records so they don't reference a non-existent exam.
    await Promise.all([
      ExamVersion.deleteMany({ examId: id }),
      Submission.deleteMany({ examId: id }),
    ]);

    return exam;
  }

  async exportExamPDF(examId, format = 'pdf') {
    if (format !== 'pdf') {
      throw new ApiError(400, 'Only PDF format is currently supported');
    }

    const { Class, School } = require('../models');

    const exam = await Exam.findById(examId)
      .populate('classIds', 'name')
      .populate('primaryClassId', 'name')
      .populate('createdBy', 'name schoolId')
      .populate('subjectId', 'name')
      .populate('questionIds', 'content options difficulty score type');

    if (!exam) {
      throw new ApiError(404, 'Exam not found');
    }

    let schoolName = 'TRƯỜNG';
    if (exam.createdBy?.schoolId) {
      const school = await School.findById(exam.createdBy.schoolId).select('name').lean();
      if (school) schoolName = school.name.toUpperCase();
    }

    const primaryClass = exam.primaryClassId || exam.classIds?.[0];
    const className = primaryClass?.name || '';

    const questions = (exam.questionIds || []).map((q, i) => ({
      position: i + 1,
      content: q.content || '',
      options: (q.options || []).map(opt => ({
        id: opt.id,
        content: opt.content || '',
        isCorrect: opt.isCorrect,
      })),
      difficulty: q.difficulty,
      score: q.score,
    }));

    const printConfig = exam.printConfig || {};

    return {
      exam: {
        title: exam.title,
        subjectName: exam.subjectId?.name || '',
        className,
        duration: exam.duration,
        examDate: exam.examDate
          ? new Date(exam.examDate).toLocaleDateString('vi-VN')
          : '',
        totalScore: exam.totalScore,
        schoolName,
        schoolHeader: printConfig.schoolHeader !== false,
        questions,
        printConfig,
      },
    };
  }

  async exportVersionPDF(examId, versionCode) {

    const version = await ExamVersion.findOne({ examId, versionCode })
      .populate('questions.questionId', 'content options difficulty score type');

    if (!version) {
      throw new ApiError(404, 'Exam version not found');
    }

    const exam = await Exam.findById(examId)
      .populate('createdBy', 'schoolId')
      .populate('subjectId', 'name')
      .select('title subjectId duration totalScore examDate createdBy classIds primaryClassId printConfig')
      .lean();

    if (!exam) {
      throw new ApiError(404, 'Exam not found');
    }

    let schoolName = 'TRƯỜNG';
    if (exam.createdBy?.schoolId) {
      const school = await School.findById(exam.createdBy.schoolId).select('name').lean();
      if (school) schoolName = school.name.toUpperCase();
    }

    const { Class } = require('../models');
    const classDoc = await Class.findById(exam.primaryClassId || exam.classIds?.[0])
      .select('name')
      .lean();

    const questions = (version.questions || []).map((vq, i) => ({
      position: i + 1,
      content: vq.questionId?.content || '',
      options: (vq.shuffledOptions || []).map(opt => ({
        id: opt.id,
        content: opt.content || '',
        isCorrect: opt.isCorrect,
      })),
      difficulty: vq.questionId?.difficulty,
    }));

    return {
      version: {
        versionCode: version.versionCode,
        schoolName,
        title: exam.title,
        subjectName: exam.subjectId?.name || '',
        className: classDoc?.name || '',
        duration: exam.duration,
        examDate: exam.examDate
          ? new Date(exam.examDate).toLocaleDateString('vi-VN')
          : '',
        totalScore: exam.totalScore,
        schoolHeader: exam.printConfig?.schoolHeader !== false,
        questions,
      },
      printConfig: exam.printConfig,
    };
  }

  async exportResults(examId, format = 'pdf') {
    const exam = await Exam.findById(examId)
      .populate('classIds', 'name')
      .populate('createdBy', 'name')
      .populate('subjectId', 'name')
      .lean();

    if (!exam) {
      throw new ApiError(404, 'Exam not found');
    }

    const submissions = await Submission.find({ examId, status: 'completed' }).populate('studentId', 'name studentCode').lean();

    const scores = submissions.map((sub) => ({
      studentName: sub.studentId?.name || 'Unknown',
      studentCode: sub.studentId?.studentCode || '',
      percentage: sub.maxScore > 0 ? (sub.totalScore / sub.maxScore) * 100 : 0,
      submittedAt: sub.submittedAt,
      status: sub.status,
    }));

    const averageScore = scores.length > 0
      ? scores.reduce((sum, s) => sum + s.percentage, 0) / scores.length
      : 0;

    const gradeDist = {
      excellent: scores.filter((s) => s.percentage >= 85).length,
      good: scores.filter((s) => s.percentage >= 70 && s.percentage < 85).length,
      average: scores.filter((s) => s.percentage >= 50 && s.percentage < 70).length,
      poor: scores.filter((s) => s.percentage < 50).length,
    };

    if (format !== 'pdf') {
      return {
        exam: {
          _id: exam._id,
          title: exam.title,
          examDate: exam.examDate,
          totalScore: exam.totalScore,
          classes: exam.classIds,
          creator: exam.createdBy?.name,
        },
        statistics: {
          totalStudents: scores.length,
          averageScore: Math.round(averageScore * 100) / 100,
          highestScore: scores.length > 0 ? Math.max(...scores.map(s => s.percentage)) : 0,
          lowestScore: scores.length > 0 ? Math.min(...scores.map(s => s.percentage)) : 0,
          gradeDistribution: gradeDist,
        },
        submissions: scores,
        format,
        generatedAt: new Date().toISOString(),
        generatedBy: 'System',
      };
    }

    // Generate real PDF buffer
    const doc = new PDFDocument({ size: 'A4', margins: { top: 50, bottom: 50, left: 50, right: 50 } });
    const chunks = [];
    doc.on('data', chunk => chunks.push(chunk));

    const pageW = doc.page.width;
    const pageH = doc.page.height;
    const usableW = pageW - 100;

    // Header
    doc.rect(0, 0, pageW, 60).fill('#f0f4f8');
    doc.font('Helvetica-Bold').fontSize(18).fillColor('#1e40af')
      .text('BÁO CÁO KẾT QUẢ BÀI THI', pageW / 2, 10, { align: 'center', width: usableW });
    doc.font('Helvetica-Bold').fontSize(13).fillColor('#0f172a')
      .text(exam.title || 'Kết quả thi', pageW / 2, 32, { align: 'center', width: usableW });
    doc.font('Helvetica').fontSize(9).fillColor('#64748b')
      .text(`Ngày tạo: ${new Date().toLocaleDateString('vi-VN')}`, pageW / 2, 48, { align: 'center', width: usableW });

    let y = 75;

    // Summary stats
    const totalStudents = submissions.length;
    const gradedCount = submissions.length;
    const avgScore = gradedCount > 0 ? averageScore.toFixed(2) : 'N/A';

    doc.font('Helvetica-Bold').fontSize(11).fillColor('#1e40af').text('THONG TIN TONG QUAN', 50, y);
    y += 15;

    const stats = [
      ['Tong bai nop', String(totalStudents)],
      ['Da cham', String(gradedCount)],
      ['Diem trung binh', avgScore],
    ];
    stats.forEach(([label, value]) => {
      doc.rect(50, y, 200, 20).fill('#f8fafc').stroke('#e2e8f0');
      doc.font('Helvetica').fontSize(9).fillColor('#64748b').text(label, 55, y + 4);
      doc.font('Helvetica-Bold').fontSize(11).fillColor('#0f172a').text(value, 55, y + 10);
      y += 22;
    });

    y += 10;
    doc.font('Helvetica-Bold').fontSize(11).fillColor('#1e40af').text('BANG DIEM', 50, y);
    y += 12;

    // Table header
    doc.rect(50, y, usableW, 18).fill('#1e40af');
    doc.font('Helvetica-Bold').fontSize(9).fillColor('#ffffff');
    doc.text('STT', 55, y + 5, { width: 30 });
    doc.text('Ho ten', 85, y + 5, { width: 150 });
    doc.text('So bao danh', 235, y + 5, { width: 80 });
    doc.text('Diem', 315, y + 5, { width: 50 });
    doc.text('Ty le', 365, y + 5, { width: 50 });
    y += 20;

    // Table rows
    scores.forEach((r, i) => {
      if (y > pageH - 60) {
        doc.addPage();
        y = 50;
      }
      const fillColor = i % 2 === 0 ? '#ffffff' : '#f8fafc';
      doc.rect(50, y, usableW, 16).fill(fillColor).stroke('#e2e8f0');
      doc.font('Helvetica').fontSize(8).fillColor('#334155');
      doc.text(String(i + 1), 55, y + 4, { width: 30 });
      doc.text(r.studentName, 85, y + 4, { width: 150 });
      doc.text(r.studentCode, 235, y + 4, { width: 80 });
      doc.text(r.percentage.toFixed(1) + '%', 315, y + 4, { width: 50 });
      doc.text(r.status === 'completed' ? 'Hoan thanh' : 'Chua cham', 365, y + 4, { width: 80 });
      y += 18;
    });

    // Footer
    doc.font('Helvetica').fontSize(8).fillColor('#94a3b8')
      .text('Smart Grading System', 50, pageH - 40);

    doc.end();
    return Buffer.concat(chunks);
  }

  // Helper: Shuffle array
  shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }

  // Helper: Shuffle options (keeping track of correct answer)
  shuffleOptions(options) {
    const shuffled = [...options];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }
}

module.exports = new ExamService();
