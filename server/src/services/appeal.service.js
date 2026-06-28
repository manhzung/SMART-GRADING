const mongoose = require('mongoose');
const { Appeal, Submission, Exam, User } = require('../models');
const ApiError = require('../utils/ApiError');
const notificationService = require('./notification.service');
const { parsePagination } = require('../utils/parsePagination');

class AppealService {
  async create(data) {
    // Check if submission exists
    const submission = await Submission.findById(data.submissionId);
    if (!submission) {
      throw new ApiError(404, 'Submission not found');
    }

    // Check if appeal already exists for this question (only when questionId provided)
    if (data.questionId) {
      const existingAppeal = await Appeal.findOne({
        submissionId: data.submissionId,
        questionId: data.questionId,
      });
      if (existingAppeal) {
        throw new ApiError(400, 'Appeal already exists for this question');
      }
    }

    // Find the specific answer from the submission (if questionId provided)
    let currentAnswer;
    let expectedAnswer;
    if (data.questionId) {
      const answer = submission.answers?.find(
        (a) => a.questionId?.toString() === data.questionId.toString()
      );
      // selectedAnswer is already 'A'/'B'/'C'/'D' or null in the model
      currentAnswer = answer?.selectedAnswer != null ? String(answer.selectedAnswer) : undefined;
      // correctAnswer is 'A'/'B'/'C'/'D' or null
      expectedAnswer = answer?.correctAnswer != null ? String(answer.correctAnswer) : undefined;
    }

    // Drop fields not in schema when missing
    const appealData = { ...data, status: 'pending' };
    if (!data.questionId) delete appealData.questionId;
    if (data.questionPosition === undefined || data.questionPosition === null) delete appealData.questionPosition;

    const appeal = new Appeal({
      ...appealData,
      currentAnswer,
      expectedAnswer,
    });

    await appeal.save();

    // Update submission status
    submission.status = 'appealed';
    await submission.save();

    // Notify the teacher of this exam
    const [exam, student] = await Promise.all([
      Exam.findById(data.examId).select('createdBy title').lean(),
      User.findById(data.studentId).select('name').lean(),
    ]);
    if (exam?.createdBy && student) {
      await notificationService.notifyAppealSubmitted(
        exam._id,
        exam.createdBy,
        student.name || 'Một học sinh',
        exam.title || 'Bài thi',
        data.questionPosition || 1
      );
    }

    return appeal;
  }

  async getById(id) {
    return Appeal.findById(id)
      .populate('submissionId', 'studentCode totalScore')
      .populate('studentId', 'name email studentCode')
      .populate('questionId', 'content type')
      .populate('examId', 'title');
  }

  async getAll(query = {}) {
    const { examId, submissionId, studentId, status, page, limit, ...rest } = query;
    const { skip } = parsePagination({ page, limit });
    const filter = { ...rest };
    if (examId) filter.examId = examId;
    if (submissionId) filter.submissionId = submissionId;
    if (studentId) filter.studentId = studentId;
    if (status) filter.status = status;

    const [results, total] = await Promise.all([
      Appeal.find(filter)
        .populate('studentId', 'name studentCode')
        .populate('examId', 'title')
        .populate('questionId', 'content')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit || 20),
      Appeal.countDocuments(filter),
    ]);

    return {
      results,
      page: page || 1,
      limit: limit || 20,
      total,
      pages: Math.ceil(total / (limit || 20)),
    };
  }

  async getByStudent(studentId, query = {}) {
    const { examId, status, ...rest } = query;
    const { page, limit, skip } = parsePagination(query);
    const filter = { studentId, ...rest };
    if (examId) filter.examId = examId;
    if (status) filter.status = status;

    const [results, total] = await Promise.all([
      Appeal.find(filter)
        .populate('examId', 'title')
        .populate('questionId', 'content')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Appeal.countDocuments(filter),
    ]);

    return {
      results,
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    };
  }

  async getMy(studentId, query = {}) {
    const { submissionId, examId, status, ...rest } = query;
    const { page, limit, skip } = parsePagination(query);
    const filter = { studentId: new mongoose.Types.ObjectId(studentId), ...rest };
    if (submissionId) filter.submissionId = submissionId;
    if (examId) filter.examId = examId;
    if (status) filter.status = status;

    const [results, total] = await Promise.all([
      Appeal.find(filter)
        .populate('examId', 'title')
        .populate('questionId', 'content')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Appeal.countDocuments(filter),
    ]);

    return { results, page, limit, total, pages: Math.ceil(total / limit) };
  }

  async getByExam(examId, query = {}) {
    const { status, ...rest } = query;
    const { page, limit, skip } = parsePagination(query);
    const filter = { examId, ...rest };
    if (status) filter.status = status;

    const [results, total] = await Promise.all([
      Appeal.find(filter)
        .populate('studentId', 'name studentCode')
        .populate('questionId', 'content')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Appeal.countDocuments(filter),
    ]);

    return {
      results,
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    };
  }

  async review(id, data, reviewerId) {
    const { decision, note } = data;

    const appeal = await Appeal.findById(id);
    if (!appeal) {
      throw new ApiError(404, 'Appeal not found');
    }

    if (appeal.status !== 'pending') {
      throw new ApiError(400, 'Appeal already reviewed');
    }

    appeal.status = decision;
    appeal.teacherResponse = {
      reviewedBy: reviewerId,
      reviewedAt: new Date(),
      decision,
      note,
    };

    await appeal.save();

    // Notify the student of the decision
    if (appeal.studentId) {
      const [exam, student] = await Promise.all([
        Exam.findById(appeal.examId).select('title').lean(),
        User.findById(appeal.studentId).select('name').lean(),
      ]);
      await notificationService.notifyAppealResolved(
        appeal.studentId.toString(),
        appeal.examId?.toString(),
        exam?.title || 'Bài thi',
        decision,
        appeal.questionPosition || 1
      );
    }

    return appeal;
  }

  async getPendingCount(examId) {
    return Appeal.countDocuments({ examId, status: 'pending' });
  }
}

module.exports = new AppealService();
