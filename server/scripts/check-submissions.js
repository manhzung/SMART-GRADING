/* eslint-disable no-console */
require('../src/config/config');
const mongoose = require('mongoose');
// Register all models so populate works
require('../src/models/index');
const Submission = require('../src/models/submission.model');
const Exam = require('../src/models/exam.model');
const User = require('../src/models/user.model');

(async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URL);
    console.log('Connected to MongoDB');

    const totalSubmissions = await Submission.countDocuments({});
    console.log('═══════════════════════════════════════════');
    console.log('Total submissions:', totalSubmissions);
    console.log('═══════════════════════════════════════════');

    if (totalSubmissions > 0) {
      const samples = await Submission.find({})
        .populate('examId', 'title status')
        .populate('studentId', 'name studentCode email')
        .populate('classId', 'name')
        .sort({ createdAt: -1 })
        .limit(5)
        .lean();

      console.log('\n=== First 5 submissions ===');
      samples.forEach((s, i) => {
        console.log(`\n[${i + 1}] id=${s._id}`);
        console.log('  examId:', s.examId ? `${s.examId._id} (${s.examId.title})` : 'NULL');
        console.log('  studentId:', s.studentId ? `${s.studentId._id} (${s.studentId.name})` : 'NULL');
        console.log('  classId:', s.classId ? `${s.classId._id} (${s.classId.name})` : 'NULL');
        console.log('  studentCode:', s.studentCode);
        console.log('  status:', s.status);
        console.log('  totalScore:', s.totalScore, '/ maxScore:', s.maxScore);
        console.log('  createdAt:', s.createdAt);
      });

      // Group by exam
      const byExam = await Submission.aggregate([
        {
          $group: {
            _id: '$examId',
            count: { $sum: 1 },
          },
        },
      ]);
      console.log('\n=== Submissions grouped by examId ===');
      const examIds = byExam.map((b) => b._id).filter(Boolean);
      const exams = await Exam.find({ _id: { $in: examIds } }).lean();
      const examMap = new Map(exams.map((e) => [e._id.toString(), e]));
      byExam.forEach((b) => {
        const e = examMap.get(b._id?.toString());
        console.log(`  examId=${b._id} (${e ? e.title : 'UNKNOWN'}) → ${b.count} submissions`);
      });
    } else {
      console.log('\n*** No submissions in DB ***');
      console.log('Check:');
      console.log('  1. Mobile app may not have scanned anything');
      console.log('  2. Submission.create may have failed silently');
      console.log('  3. Wrong DB connection (different database)');
    }

    // Also check schools/exams/users for context
    const totalExams = await Exam.countDocuments({});
    console.log('\nTotal exams:', totalExams);

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
})();