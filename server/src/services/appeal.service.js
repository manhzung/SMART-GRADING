const mongoose = require('mongoose');
const { Appeal, Submission, Exam } = require('../models');
const ApiError = require('../utils/ApiError');
const submissionService = require('./submission.service');
const { parsePagination } = require('../utils/parsePagination');

class AppealService {
  async create(data) {
    // Check if submission exists
    const submission = await Submission.findById(data.submissionId);
    if (!submission) {
      throw new ApiError(404, 'Submission not found');
    }

    // Check if appeal already exists for this question
    const existingAppeal = await Appeal.findOne({
      submissionId: data.submissionId,
      questionId: data.questionId,
    });
    if (existingAppeal) {
      throw new ApiError(400, 'Appeal already exists for this question');
    }

    const appeal = new Appeal({
      ...data,
      status: 'pending',
    });

    await appeal.save();

    // Update submission status
    submission.status = 'appealed';
    await submission.save();

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
    const { decision, note, newScore, oldScore } = data;

    const appeal = await Appeal.findById(id);
    if (!appeal) {
      throw new ApiError(404, 'Appeal not found');
    }

    if (appeal.status !== 'pending') {
      throw new ApiError(400, 'Appeal already reviewed');
    }

    let finalOldScore = oldScore;
    let finalNewScore = newScore;

    if (decision === 'approved') {
      const submission = await Submission.findById(appeal.submissionId);
      if (submission) {
        const answer = submission.answers.find(
          a => a.position === appeal.questionPosition
        );
        if (answer) {
          finalOldScore = finalOldScore ?? answer.score;
          finalNewScore = finalNewScore ?? answer.score;
          answer.selectedAnswer = finalNewScore.toString();
          answer.score = finalNewScore;
          submission.totalScore = submission.answers.reduce((sum, a) => sum + a.score, 0);
          submission.finalScore = submission.totalScore;
          await submission.save();
        }
      }

      if (finalOldScore === undefined || finalNewScore === undefined) {
        throw new ApiError(400, 'Score values could not be determined from submission');
      }
    }

    appeal.status = decision === 'approved' ? 'approved' : 'rejected';
    appeal.teacherResponse = {
      reviewedBy: reviewerId,
      reviewedAt: new Date(),
      decision,
      note,
      scoreAdjustment: (decision === 'approved' && finalOldScore !== undefined)
        ? { oldScore: finalOldScore, newScore: finalNewScore }
        : undefined,
    };

    await appeal.save();
    return appeal;
  }

  async getPendingCount(examId) {
    return Appeal.countDocuments({ examId, status: 'pending' });
  }
}

module.exports = new AppealService();
