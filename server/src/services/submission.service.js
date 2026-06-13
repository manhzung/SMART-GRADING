const mongoose = require('mongoose');
const { Submission, Exam, ExamVersion, Question, User, StudentProgress } = require('../models');
const ApiError = require('../utils/ApiError');
const questionService = require('./question.service');
const { parsePagination } = require('../utils/parsePagination');

class SubmissionService {
  async scan(data) {
    const { examId, image, deviceInfo } = data;

    // Find exam and versions
    const exam = await Exam.findById(examId);
    if (!exam) {
      throw new ApiError(404, 'Exam not found');
    }

    // TODO: Implement actual OMR scanning here
    // For now, return a placeholder
    // In production, this would call an OMR processing service

    return {
      status: 'pending',
      message: 'OMR scanning service not yet implemented',
      examId,
    };
  }

  async createFromOMR(scanResult, userId) {
    const { examId, versionId, studentCode, answers, totalScore } = scanResult;

    const submission = new Submission({
      examId,
      versionId,
      studentId: userId,
      studentCode,
      answers,
      totalScore,
      maxScore: 10, // TODO: Get from exam
      finalScore: totalScore,
      status: 'scanned',
    });

    await submission.save();

    // Update student progress
    await this.updateStudentProgress(userId, scanResult);

    // Update question difficulty stats
    for (const answer of answers) {
      await questionService.updateDifficultyStats(answer.questionId, answer.isCorrect);
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

  async manualOverride(id, data) {
    const { position, correctedAnswer, reason } = data;
    const userId = 'current-user'; // TODO: Get from auth

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

  async delete(id) {
    const submission = await Submission.findByIdAndDelete(id);
    return submission;
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
        { $match: { status: { $in: ['graded', 'completed'] } } },
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
