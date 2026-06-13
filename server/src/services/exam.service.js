const mongoose = require('mongoose');
const PDFDocument = require('pdfkit');
const { Exam, ExamVersion, OMRTemplate, Question, Submission, Class, School } = require('../models');
const ApiError = require('../utils/ApiError');
const omrTemplateService = require('./omrTemplate.service');
const { parsePagination } = require('../utils/parsePagination');

class ExamService {
  async create(data) {
    // Validate OMR template exists
    const template = await OMRTemplate.findById(data.omrTemplateId);
    if (!template) {
      throw new ApiError(400, 'OMR Template not found');
    }

    // Set primaryClassId if not provided
    if (!data.primaryClassId && data.classIds?.length > 0) {
      data.primaryClassId = data.classIds[0];
    }

    const exam = new Exam(data);
    await exam.save();
    return exam;
  }

  async getById(id) {
    const [exam, submissionStats] = await Promise.all([
      Exam.findById(id)
        .populate('classIds', 'name code studentCount')
        .populate('primaryClassId', 'name code')
        .populate('createdBy', 'name email')
        .populate('omrTemplateId', 'name code zones')
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

    if (!exam) return null;

    // Attach aggregated totals to exam object for response
    const stats = submissionStats[0] || { totalSubmissions: 0, totalStudents: [] };
    exam.totalSubmissions = stats.totalSubmissions;
    exam.totalStudents = stats.totalStudents.length;

    return exam;
  }

  async getAll(query = {}, user) {
    const {
      classId,
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

    // User-based filtering: teachers see their own exams, students see their class's exams
    if (user) {
      if (user.role === 'teacher') {
        filter.createdBy = user.id;
      } else if (user.role === 'student' && user.classIds?.length) {
        filter.classIds = { $in: user.classIds };
      }
    }

    const [results, total] = await Promise.all([
      Exam.find(filter)
        .populate('classIds', 'name code')
        .populate('primaryClassId', 'name code')
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
    return Exam.find({
      createdBy: user.id,
      examDate: { $ne: null, $gte: now },
    })
      .sort({ examDate: 1 })
      .limit(limit)
      .populate('classIds', 'name code')
      .populate('primaryClassId', 'name code')
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

    exam.status = 'published';
    exam.publishedAt = new Date();
    await exam.save();
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

      const examVersion = new ExamVersion({
        examId: exam._id,
        versionCode,
        numberOfQuestions: questions.length,
        questions: questionsWithShuffledOptions,
        answerKey,
      });

      await examVersion.save();
      exam.versions.push(examVersion._id);
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
      .select('versionCode numberOfQuestions submissionCount createdAt');
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

  async exportVersionPdf(examId, versionId, user) {
    const { Exam, ExamVersion } = require('../models');

    const [exam, version] = await Promise.all([
      Exam.findById(examId)
        .populate('createdBy', 'name')
        .populate('omrTemplateId', 'name code zones'),
      ExamVersion.findById(versionId)
        .populate('questions.questionId', 'content options difficulty score type'),
    ]);

    if (!exam) {
      throw new ApiError(404, 'Exam not found');
    }
    if (!version) {
      throw new ApiError(404, 'Exam version not found');
    }
    if (version.examId.toString() !== examId) {
      throw new ApiError(400, 'Version does not belong to this exam');
    }

    return {
      exam: {
        _id: exam._id,
        title: exam.title,
        examDate: exam.examDate,
        duration: exam.duration,
        totalScore: exam.totalScore,
        omrTemplate: exam.omrTemplateId,
        creator: exam.createdBy?.name,
      },
      version: {
        _id: version._id,
        versionCode: version.versionCode,
        questions: version.questions,
        answerKey: Object.fromEntries(version.answerKey || new Map()),
      },
      printConfig: exam.printConfig,
      generatedAt: new Date().toISOString(),
      generatedBy: user?.name || 'System',
    };
  }

  async exportResults(examId, format = 'pdf', user) {
    const { Exam, Submission } = require('../models');

    const exam = await Exam.findById(examId)
      .populate('classIds', 'name code')
      .populate('createdBy', 'name');

    if (!exam) {
      throw new ApiError(404, 'Exam not found');
    }

    const submissions = await Submission.find({ examId, status: 'completed' })
      .populate('studentId', 'name studentCode');

    const scores = submissions.map(s => ({
      studentId: s.studentId?._id,
      studentName: s.studentId?.name || 'Unknown',
      studentCode: s.studentId?.studentCode || '',
      totalScore: s.totalScore,
      maxScore: s.maxScore,
      percentage: s.percentage || 0,
      submittedAt: s.submittedAt,
    }));

    const averageScore = scores.length > 0
      ? scores.reduce((sum, s) => sum + s.percentage, 0) / scores.length
      : 0;

    const gradeDist = {
      excellent: scores.filter(s => s.percentage >= 85).length,
      good: scores.filter(s => s.percentage >= 70 && s.percentage < 85).length,
      average: scores.filter(s => s.percentage >= 50 && s.percentage < 70).length,
      poor: scores.filter(s => s.percentage < 50).length,
    };

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
      generatedBy: user?.name || 'System',
    };
  }

  async delete(id) {
    const exam = await Exam.findByIdAndUpdate(id, { status: 'archived' }, { new: true });
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
    };
  }

  async exportResults(examId, format = 'pdf') {
    const exam = await Exam.findById(examId)
      .populate('classIds', 'name')
      .populate('createdBy', 'name')
      .lean();

    if (!exam) {
      throw new ApiError(404, 'Exam not found');
    }

    const submissions = await Submission.find({ examId }).populate('studentId', 'name studentCode').lean();

    const results = submissions.map((sub) => ({
      studentName: sub.studentId?.name || 'Unknown',
      studentCode: sub.studentId?.studentCode || '',
      score: sub.score ?? 0,
      submittedAt: sub.submittedAt,
      status: sub.status,
    }));

    if (format !== 'pdf') {
      return { exam: { title: exam.title }, results };
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
    const gradedCount = submissions.filter(s => s.status === 'graded' || s.status === 'reviewed').length;
    const avgScore = gradedCount > 0
      ? (submissions.filter(s => s.status === 'graded' || s.status === 'reviewed')
          .reduce((sum, s) => sum + (s.score || 0), 0) / gradedCount).toFixed(2)
      : 'N/A';

    doc.font('Helvetica-Bold').fontSize(11).fillColor('#1e40af').text('THÔNG TIN TỔNG QUAN', 50, y);
    y += 15;

    const stats = [
      ['Tổng bài nộp', String(totalStudents)],
      ['Đã chấm', String(gradedCount)],
      ['Điểm trung bình', avgScore],
    ];
    stats.forEach(([label, value]) => {
      doc.rect(50, y, 200, 20).fill('#f8fafc').stroke('#e2e8f0');
      doc.font('Helvetica').fontSize(9).fillColor('#64748b').text(label, 55, y + 4);
      doc.font('Helvetica-Bold').fontSize(11).fillColor('#0f172a').text(value, 55, y + 10);
      y += 22;
    });

    y += 10;
    doc.font('Helvetica-Bold').fontSize(11).fillColor('#1e40af').text('BẢNG ĐIỂM', 50, y);
    y += 12;

    // Table header
    doc.rect(50, y, usableW, 18).fill('#1e40af');
    doc.font('Helvetica-Bold').fontSize(9).fillColor('#ffffff');
    doc.text('STT', 55, y + 5, { width: 30 });
    doc.text('Họ tên', 85, y + 5, { width: 150 });
    doc.text('Số báo danh', 235, y + 5, { width: 80 });
    doc.text('Điểm', 315, y + 5, { width: 50 });
    doc.text('Trạng thái', 365, y + 5, { width: 80 });
    y += 20;

    // Table rows
    results.forEach((r, i) => {
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
      doc.text(String(r.score), 315, y + 4, { width: 50 });
      doc.text(r.status === 'graded' ? 'Đạt' : r.status === 'reviewed' ? 'Đã duyệt' : 'Chưa chấm', 365, y + 4, { width: 80 });
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
