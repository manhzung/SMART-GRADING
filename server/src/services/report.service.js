const mongoose = require('mongoose');
const fs = require('fs');
const { ExamReport, Submission, Exam } = require('../models');
const ApiError = require('../utils/ApiError');
const schoolService = require('./school.service');

class ReportService {
  async generateExamReport(examId, createdBy) {
    // Check if report already exists
    let report = await ExamReport.findOne({ examId });
    if (report && report.status === 'completed') {
      return report;
    }

    // Create or update report
    report = report || new ExamReport({ examId, createdBy });
    report.status = 'generating';
    await report.save();

    try {
      const exam = await Exam.findById(examId);
      if (!exam) {
        throw new ApiError(404, 'Exam not found');
      }

      const submissions = await Submission.find({ examId, status: 'completed' });

      if (submissions.length === 0) {
        report.status = 'failed';
        await report.save();
        return report;
      }

      // Calculate statistics
      const scores = submissions.map((s) => ({
        score: s.totalScore,
        maxScore: s.maxScore,
        percentage: (s.totalScore / s.maxScore) * 100,
      }));

      const totalStudents = submissions.length;
      const avgPercentage = scores.reduce((sum, s) => sum + s.percentage, 0) / totalStudents;
      const avgScore = (avgPercentage / 100) * scores[0].maxScore;

      // Calculate median
      const sortedScores = [...scores].sort((a, b) => b.percentage - a.percentage);
      const medianPercentage = sortedScores[Math.floor(totalStudents / 2)]?.percentage || 0;

      report.statistics = {
        totalStudents,
        submittedCount: totalStudents,
        averageScore: avgScore,
        averagePercentage: avgPercentage,
        medianScore: medianPercentage,
        highestScore: Math.max(...scores.map((s) => s.score)),
        lowestScore: Math.min(...scores.map((s) => s.score)),
        standardDeviation: this.calculateStdDev(scores.map((s) => s.percentage)),
      };

      // Calculate grade distribution
      const school = await schoolService.getById(exam.classIds?.[0]);
      const gradingScale = school?.settings?.gradingScale || {
        excellent: 8.5,
        good: 7.0,
        average: 5.0,
      };

      const gradeDist = {
        excellent: 0,
        good: 0,
        average: 0,
        poor: 0,
        passed: 0,
        failed: 0,
      };

      scores.forEach((s) => {
        const scoreOn10 = (s.percentage / 100) * 10;
        if (scoreOn10 >= gradingScale.excellent) gradeDist.excellent++;
        else if (scoreOn10 >= gradingScale.good) gradeDist.good++;
        else if (scoreOn10 >= gradingScale.average) gradeDist.average++;
        else gradeDist.poor++;

        if (scoreOn10 >= gradingScale.average) gradeDist.passed++;
        else gradeDist.failed++;
      });

      report.gradeDistribution = {
        excellent: { count: gradeDist.excellent, percentage: (gradeDist.excellent / totalStudents) * 100 },
        good: { count: gradeDist.good, percentage: (gradeDist.good / totalStudents) * 100 },
        average: { count: gradeDist.average, percentage: (gradeDist.average / totalStudents) * 100 },
        poor: { count: gradeDist.poor, percentage: (gradeDist.poor / totalStudents) * 100 },
        passed: { count: gradeDist.passed, percentage: (gradeDist.passed / totalStudents) * 100 },
        failed: { count: gradeDist.failed, percentage: (gradeDist.failed / totalStudents) * 100 },
      };

      // Calculate score distribution (histogram)
      report.scoreDistribution = this.calculateScoreDistribution(scores);

      // ─── Populate questionAnalysis ───────────────────────────────────────
      const { Question } = require('../models');
      const { Class } = require('../models');

      const examQuestions = await Question.find({ _id: { $in: exam.questionIds } }).lean();
      const questionMap = {};
      for (const q of examQuestions) {
        questionMap[q._id.toString()] = q;
      }

      // Per-question stats from submissions
      const questionStats = {};
      for (const qId of exam.questionIds) {
        const key = qId.toString();
        questionStats[key] = { correct: 0, incorrect: 0, empty: 0, total: 0 };
      }

      for (const sub of submissions) {
        for (const answer of sub.answers || []) {
          const key = answer.questionId?.toString();
          if (!key || !questionStats[key]) continue;
          questionStats[key].total++;
          if (answer.selectedAnswer == null) {
            questionStats[key].empty++;
          } else if (answer.isCorrect) {
            questionStats[key].correct++;
          } else {
            questionStats[key].incorrect++;
          }
        }
      }

      const questionAnalysis = [];
      for (const qId of exam.questionIds) {
        const key = qId.toString();
        const stats = questionStats[key] || { correct: 0, incorrect: 0, empty: 0, total: 0 };
        const total = stats.total || 1;
        const accuracy = Math.round((stats.correct / total) * 100);
        const question = questionMap[key];
        questionAnalysis.push({
          questionId: qId,
          position: questionAnalysis.length + 1,
          difficulty: question?.difficulty || 'medium',
          correctCount: stats.correct,
          incorrectCount: stats.incorrect,
          emptyCount: stats.empty,
          accuracy,
          topicId: question?.topicId,
          topicName: question?.topic?.name,
        });
      }

      report.questionAnalysis = questionAnalysis;

      // hardestQuestions: lowest accuracy
      const sortedHardest = [...questionAnalysis]
        .sort((a, b) => a.accuracy - b.accuracy)
        .slice(0, 5)
        .map((q) => ({
          questionId: q.questionId,
          position: q.position,
          accuracy: q.accuracy,
          incorrectCount: q.incorrectCount,
        }));
      report.hardestQuestions = sortedHardest;

      // easiestQuestions: highest accuracy
      const sortedEasiest = [...questionAnalysis]
        .sort((a, b) => b.accuracy - a.accuracy)
        .slice(0, 5)
        .map((q) => ({
          questionId: q.questionId,
          position: q.position,
          accuracy: q.accuracy,
          correctCount: q.correctCount,
        }));
      report.easiestQuestions = sortedEasiest;

      // ─── Populate classSummary ────────────────────────────────────────
      const classSummaries = [];
      for (const classId of exam.classIds || []) {
        const classDoc = await Class.findById(classId).select('name code studentIds').lean();
        if (!classDoc) continue;

        const classSubmissions = submissions.filter((s) => s.classId && s.classId.toString() === classId.toString());
        const classScores = classSubmissions.map((s) => ({
          score: s.totalScore,
          maxScore: s.maxScore,
          percentage: (s.totalScore / s.maxScore) * 100,
        }));

        const submittedCount = classSubmissions.length;
        const avgScore = submittedCount > 0 ? classScores.reduce((sum, s) => sum + s.percentage, 0) / submittedCount : 0;

        classSummaries.push({
          classId,
          className: classDoc.name || classDoc.code || classId.toString(),
          totalStudents: classDoc.studentIds?.length || 0,
          submittedCount,
          averageScore: Math.round((avgScore / 100) * (exam.totalScore || 10) * 10) / 10,
          highestScore: submittedCount > 0 ? Math.max(...classScores.map((s) => s.score)) : 0,
          lowestScore: submittedCount > 0 ? Math.min(...classScores.map((s) => s.score)) : 0,
        });
      }
      report.classSummary = classSummaries;

      // Get top and bottom students
      const studentScores = submissions
        .map((s) => ({
          studentId: s.studentId,
          studentName: s.studentId?.name,
          studentCode: s.studentCode,
          score: s.totalScore,
          percentage: (s.totalScore / s.maxScore) * 100,
        }))
        .sort((a, b) => b.percentage - a.percentage);

      report.topStudents = studentScores.slice(0, 10).map((s, i) => ({ ...s, rank: i + 1 }));
      report.bottomStudents = studentScores
        .slice(-10)
        .reverse()
        .map((s, i) => ({
          ...s,
          rank: totalStudents - i,
        }));

      report.status = 'completed';
      report.generatedAt = new Date();
      await report.save();

      return report;
    } catch (error) {
      report.status = 'failed';
      await report.save();
      throw error;
    }
  }

  async getExamReport(examId) {
    return ExamReport.findOne({ examId }).populate('examId', 'title examDate');
  }

  async exportReport(examId, format) {
    const report = await ExamReport.findOne({ examId });
    if (!report) {
      throw new ApiError(404, 'Report not found');
    }

    const exportService = require('./export.service');

    try {
      let filePath;
      if (format === 'pdf') {
        filePath = await exportService.generateExamReportPdf(examId);
      } else if (format === 'excel') {
        filePath = await exportService.generateExamReportExcel(examId);
      } else {
        throw new ApiError(400, 'Invalid format. Supported: pdf, excel');
      }

      const downloadUrl = await exportService.uploadToCloudinary(filePath, 'exam-reports');

      try {
        fs.unlinkSync(filePath);
      } catch (e) {
        /* ignore cleanup error */
      }

      return {
        report,
        format,
        downloadUrl,
      };
    } catch (error) {
      throw new ApiError(500, `Export failed: ${error.message}`);
    }
  }

  calculateStdDev(values) {
    if (values.length === 0) return 0;
    const avg = values.reduce((sum, v) => sum + v, 0) / values.length;
    const squareDiffs = values.map((v) => Math.pow(v - avg, 2));
    const avgSquareDiff = squareDiffs.reduce((sum, v) => sum + v, 0) / values.length;
    return Math.sqrt(avgSquareDiff);
  }

  calculateScoreDistribution(scores) {
    const ranges = [
      { range: '0-2', min: 0, max: 20 },
      { range: '2-4', min: 20, max: 40 },
      { range: '4-6', min: 40, max: 60 },
      { range: '6-8', min: 60, max: 80 },
      { range: '8-10', min: 80, max: 100 },
    ];

    return ranges.map((r) => {
      const count = scores.filter((s) => s.percentage >= r.min && s.percentage < r.max).length;
      return {
        range: r.range,
        minScore: r.min,
        maxScore: r.max,
        count,
        percentage: (count / scores.length) * 100,
      };
    });
  }

  async getStudentProgress(studentId) {
    const { StudentProgress } = require('../models');
    return StudentProgress.findOne({ studentId }).populate('scoreHistory.examId', 'title examDate');
  }

  async getProgressHistory(studentId, query = {}) {
    const { fromDate, toDate, limit = 20 } = query;
    const progress = await StudentProgress.findOne({ studentId });

    if (!progress) return { results: [], total: 0 };

    let history = progress.scoreHistory || [];

    if (fromDate) {
      history = history.filter((h) => new Date(h.examDate) >= new Date(fromDate));
    }
    if (toDate) {
      history = history.filter((h) => new Date(h.examDate) <= new Date(toDate));
    }

    return {
      results: history.slice(0, limit),
      total: history.length,
    };
  }

  async getClassLeaderboard(classId, query = {}) {
    const { examId, limit = 10 } = query;
    const { StudentProgress } = require('../models');

    // Get all students in class
    const { Class, User } = require('../models');
    const classData = await Class.findById(classId).populate('studentIds', '_id');

    if (!classData) {
      throw new ApiError(404, 'Class not found');
    }

    const studentIds = classData.studentIds.map((s) => s._id);

    // Get submissions for these students
    const filter = { studentId: { $in: studentIds } };
    if (examId) filter.examId = examId;

    const submissions = await Submission.find(filter).populate('studentId', 'name studentCode').sort({ totalScore: -1 });

    // Group by student and calculate average
    const studentScores = {};
    submissions.forEach((s) => {
      const sid = s.studentId._id.toString();
      if (!studentScores[sid]) {
        studentScores[sid] = {
          studentId: s.studentId._id,
          studentName: s.studentId.name,
          studentCode: s.studentId.studentCode,
          totalScore: 0,
          count: 0,
        };
      }
      studentScores[sid].totalScore += s.percentage;
      studentScores[sid].count++;
    });

    const leaderboard = Object.values(studentScores)
      .map((s) => ({
        ...s,
        averageScore: s.totalScore / s.count,
      }))
      .sort((a, b) => b.averageScore - a.averageScore)
      .slice(0, limit)
      .map((s, i) => ({ ...s, rank: i + 1 }));

    return { leaderboard, total: leaderboard.length };
  }
}

module.exports = new ReportService();
