const mongoose = require('mongoose');
const config = require('../config/config');
const { Exam, Submission, Question, OMRTemplate, Class, Subject, User } = require('../models');

const seedExams = async () => {
  console.log('Starting exams seeding...');
  const school = await require('../models').School.findOne({ code: 'CVA' });
  if (!school) {
    console.log('No school found, skipping.');
    return;
  }

  const subjects = await Subject.find({ schoolId: school._id });
  const classes = await Class.find({ schoolId: school._id });
  const teachers = await User.find({ role: 'teacher', schoolId: school._id });
  const students = await User.find({ role: 'student', schoolId: school._id });
  const omrTemplate = await OMRTemplate.findOne({ code: 'OMR_30_STD' });
  if (!omrTemplate) {
    console.log('No OMR template found, skipping exams.');
    return;
  }

  const examData = [
    {
      title: 'Kiểm tra giữa kỳ - Toán lớp 10',
      description: 'Đề thi giữa kỳ môn Toán, thời gian 45 phút',
      status: 'completed',
      daysAgo: 15,
      classIdx: 0,
      teacherIdx: 0,
      subjectCode: 'MATH',
    },
    {
      title: 'Kiểm tra 15 phút - Vật lý',
      description: 'Bài kiểm tra ngắn chương Chuyển động',
      status: 'completed',
      daysAgo: 7,
      classIdx: 0,
      teacherIdx: 1,
      subjectCode: 'PHYS',
    },
    {
      title: 'Thi cuối kỳ - Hóa học',
      description: 'Đề thi cuối kỳ môn Hóa học lớp 11',
      status: 'published',
      daysAgo: -3,
      classIdx: 3,
      teacherIdx: 2,
      subjectCode: 'CHEM',
    },
    {
      title: 'Kiểm tra giữa kỳ - Ngữ văn',
      description: 'Đề thi giữa kỳ môn Ngữ văn',
      status: 'draft',
      daysAgo: 0,
      classIdx: 4,
      teacherIdx: 3,
      subjectCode: 'LIT',
    },
    {
      title: 'Kiểm tra tiếng Anh - Đề A',
      description: 'Bài kiểm tra 45 phút môn Tiếng Anh',
      status: 'completed',
      daysAgo: 20,
      classIdx: 1,
      teacherIdx: 4,
      subjectCode: 'ENG',
    },
  ];

  const now = new Date();
  const examsCreated = [];

  for (const e of examData) {
    const cls = classes[e.classIdx];
    if (!cls) continue;
    const teacher = teachers[e.teacherIdx];
    if (!teacher) continue;
    const subject = subjects.find((s) => s.code === e.subjectCode);

    const existing = await Exam.findOne({ title: e.title });
    if (existing) {
      console.log(`  Exam "${e.title}" already exists, skipping.`);
      examsCreated.push(existing);
      continue;
    }

    const exam = await Exam.create({
      title: e.title,
      description: e.description,
      classIds: [cls._id],
      primaryClassId: cls._id,
      createdBy: teacher._id,
      omrTemplateId: omrTemplate._id,
      examDate: new Date(now.getTime() + e.daysAgo * 24 * 60 * 60 * 1000),
      startTime: '07:30',
      duration: 45,
      totalScore: 10,
      passingScore: 5,
      numberOfQuestions: 30,
      status: e.status,
      numberOfVersions: 4,
      questionIds: [],
      versions: [],
      totalStudents: 8,
      totalSubmissions: 0,
      publishedAt: e.status === 'published' || e.status === 'completed' ? new Date() : null,
      completedAt: e.status === 'completed' ? new Date() : null,
    });
    console.log(`  Created exam: ${e.title} (${e.status})`);
    examsCreated.push(exam);
  }

  console.log('Exams seeding completed!');
  return { exams: examsCreated, students, classes };
};

const seedSubmissions = async () => {
  console.log('Starting submissions seeding...');
  const exams = await Exam.find({ status: 'completed' });
  const students = await User.find({ role: 'student' });
  const questions = await Question.find({}).limit(30);

  if (exams.length === 0) {
    console.log('No completed exams, skipping submissions.');
    return;
  }
  if (students.length === 0) {
    console.log('No students, skipping submissions.');
    return;
  }

  let created = 0;
  for (const exam of exams) {
    if (exam.totalStudents === 0) continue;
    const examStudents = students.slice(0, Math.min(exam.totalStudents, students.length));
    for (const student of examStudents) {
      const existing = await Submission.findOne({ examId: exam._id, studentId: student._id });
      if (existing) continue;

      const numQuestions = Math.min(exam.numberOfQuestions || 30, questions.length || 30);
      const answers = [];
      let correctCount = 0;
      const answerOptions = ['A', 'B', 'C', 'D'];

      for (let i = 0; i < numQuestions; i++) {
        const correct = Math.random() > 0.35;
        const selectedAnswer = correct
          ? answerOptions[Math.floor(Math.random() * 4)]
          : answerOptions[Math.floor(Math.random() * 4)];
        if (correct) correctCount++;
        answers.push({
          position: i + 1,
          questionId: questions[i]?._id || new mongoose.Types.ObjectId(),
          selectedAnswer,
          correctAnswer: answerOptions[Math.floor(Math.random() * 4)],
          isCorrect: correct,
          score: correct ? exam.totalScore / numQuestions : 0,
        });
      }

      const totalScore = answers.reduce((sum, a) => sum + a.score, 0);
      const finalScore = Math.round((totalScore + Number.EPSILON) * 10) / 10;

      await Submission.create({
        examId: exam._id,
        versionId: exam.versions?.[0] || new mongoose.Types.ObjectId(),
        omrTemplateId: exam.omrTemplateId,
        studentId: student._id,
        studentCode: student.studentCode || student.email.split('@')[0],
        answers,
        totalScore,
        maxScore: exam.totalScore,
        finalScore,
        status: 'completed',
        scannedAt: new Date(exam.examDate.getTime() + 2 * 60 * 60 * 1000),
        scannedBy: exam.createdBy,
      });
      created++;
    }
    exam.totalSubmissions = created;
    await exam.save();
  }

  console.log(`  Created ${created} submissions`);
  console.log('Submissions seeding completed!');
};

const seedQuestions = async () => {
  console.log('Starting questions seeding...');
  const school = await require('../models').School.findOne({ code: 'CVA' });
  const teachers = await User.find({ role: 'teacher' });
  if (!school || teachers.length === 0) {
    console.log('No school/teachers, skipping questions.');
    return;
  }

  const sampleQuestions = [
    { content: 'Tính đạo hàm của hàm số f(x) = x³ + 2x² - 5x + 1', difficulty: 'medium' },
    { content: 'Giải phương trình: 2x + 5 = 13', difficulty: 'easy' },
    { content: 'Tìm nghiệm của phương trình bậc 2: x² - 5x + 6 = 0', difficulty: 'easy' },
    { content: 'Tính tích phân: ∫(x² + 3x) dx', difficulty: 'medium' },
    { content: 'Chứng minh rằng tổng 3 góc trong tam giác bằng 180°', difficulty: 'hard' },
    { content: 'Vận tốc của một vật được cho bởi v(t) = 3t² - 2t + 1. Tính gia tốc tại t = 2s', difficulty: 'medium' },
    { content: 'Tìm giới hạn: lim(x→0) sin(x)/x', difficulty: 'medium' },
    {
      content: 'Một hình chữ nhật có chiều dài gấp 3 lần chiều rộng. Tính chu vi biết diện tích = 48m²',
      difficulty: 'easy',
    },
    { content: 'Hạt nhân nguyên tử oxygen có bao nhiêu proton?', difficulty: 'easy' },
    { content: 'Nêu các bước phân tích một câu lệnh SQL SELECT', difficulty: 'medium' },
    { content: 'Viết chương trình Python tính tổng các số từ 1 đến n', difficulty: 'easy' },
    { content: 'Giải thích hiện tượng quang điện và viết phương trình Einstein', difficulty: 'hard' },
    { content: 'Tính nồng độ mol của dung dịch khi hòa tan 20g NaOH vào 500ml nước', difficulty: 'medium' },
    { content: 'Nêu các yếu tố ảnh hưởng đến tốc độ phản ứng hóa học', difficulty: 'easy' },
    { content: 'Phân biệt sự khác nhau giữa nguyên nhân và điều kiện trong câu điều kiện', difficulty: 'medium' },
  ];

  for (let i = 0; i < sampleQuestions.length; i++) {
    const q = sampleQuestions[i];
    const existing = await Question.findOne({ content: q.content });
    if (existing) continue;

    const answerOptions = ['A', 'B', 'C', 'D'];
    const correctIdx = Math.floor(Math.random() * 4);

    await Question.create({
      content: q.content,
      type: 'single_choice',
      options: answerOptions.map((opt, idx) => ({
        id: opt,
        content: `Đáp án ${opt} cho câu hỏi trên`,
        isCorrect: idx === correctIdx,
        order: idx,
      })),
      correctAnswer: answerOptions[correctIdx],
      score: 1,
      difficulty: q.difficulty,
      topicName: 'Chủ đề mẫu',
      createdBy: teachers[Math.floor(Math.random() * teachers.length)]._id,
      schoolId: school._id,
      source: 'manual',
      isApproved: true,
      approvedBy: teachers[0]?._id,
      usageCount: Math.floor(Math.random() * 20),
      correctRate: Math.floor(Math.random() * 40) + 40,
      isActive: true,
    });
  }
  console.log('Questions seeding completed!');
};

async function seedExamsAndSubmissions() {
  console.log('='.repeat(50));
  console.log('Starting exam data seeding...');
  console.log('='.repeat(50));

  await seedQuestions();
  await seedExams();
  await seedSubmissions();

  console.log('\n' + '='.repeat(50));
  console.log('Exam data seeding completed!');
  console.log('='.repeat(50));
}

if (require.main === module) {
  mongoose
    .connect(config.mongoose.url)
    .then(() => {
      console.log('Connected to MongoDB');
      return seedExamsAndSubmissions();
    })
    .then(() => {
      return mongoose.disconnect();
    })
    .then(() => {
      console.log('Disconnected from MongoDB');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Error:', error);
      process.exit(1);
    });
}

module.exports = seedExamsAndSubmissions;
