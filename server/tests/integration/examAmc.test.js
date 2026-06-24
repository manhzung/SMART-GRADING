const request = require('supertest');
const mongoose = require('mongoose');
const httpStatus = require('http-status');
jest.setTimeout(15000);
const app = require('../../src/app');
const { Exam, ExamVersion, OMRTemplate, Question } = require('../../src/models');
const {
  teacherOne,
  insertUsers,
} = require('../fixtures/user.fixture');
const {
  schoolA,
  insertSchools,
} = require('../fixtures/school.fixture');
const {
  classA,
  insertClasses,
} = require('../fixtures/class.fixture');
const setupTestDB = require('../utils/setupTestDB');
const { teacherOneAccessToken } = require('../fixtures/token.fixture');

setupTestDB();

describe('Exam AMC Integration APIs', () => {
  let omrTemplate;
  let exam;
  let questions;

  beforeEach(async () => {
    teacherOne.schoolId = schoolA._id;

    await insertSchools([schoolA]);
    await insertUsers([teacherOne]);
    await insertClasses([classA]);

    // Create OMR template
    omrTemplate = await OMRTemplate.create({
      name: 'Test OMR Template',
      code: 'OMR-TEST-001',
      rows: 50,
      cols: 4,
      questionCount: 50,
      schoolId: schoolA._id,
    });

    // Create questions
    questions = await Question.insertMany(
      Array.from({ length: 5 }, (_, i) => ({
        content: `Question ${i + 1}: What is ${i + 1} + 1?`,
        type: 'single_choice',
        options: [
          { id: 'A', content: `${i}`, isCorrect: false },
          { id: 'B', content: `${i + 1}`, isCorrect: i === 0 },
          { id: 'C', content: `${i + 2}`, isCorrect: false },
          { id: 'D', content: `${i + 3}`, isCorrect: false },
        ],
        correctAnswer: i === 0 ? 'B' : 'B',
        difficulty: 'easy',
        score: 2,
        source: 'manual',
        isApproved: true,
        usageCount: 0,
        createdBy: teacherOne._id,
        schoolId: schoolA._id,
      }))
    );
  });

  describe('POST /api/v1/exams — Create exam', () => {
    it('should create exam with valid data', async () => {
      const res = await request(app)
        .post('/api/v1/exams')
        .set('Authorization', `Bearer ${teacherOneAccessToken}`)
        .send({
          title: 'AMC Integration Test Exam',
          description: 'Test exam for AMC pipeline',
          classIds: [classA._id.toString()],
          primaryClassId: classA._id.toString(),
          subjectName: 'Mathematics',
          omrTemplateId: omrTemplate._id.toString(),
          examDate: new Date(Date.now() + 7 * 86400000).toISOString(),
          startTime: '08:00',
          duration: 60,
          totalScore: 10,
          passingScore: 5,
          numberOfQuestions: 5,
          questionIds: questions.map((q) => q._id.toString()),
        })
        .expect(httpStatus.CREATED);

      expect(res.body).toHaveProperty('_id');
      expect(res.body.title).toBe('AMC Integration Test Exam');
      expect(res.body.status).toBe('draft');
      expect(res.body.omrTemplateId).toBe(omrTemplate._id.toString());
      exam = res.body;
    });

    it('should return 400 if omrTemplateId is missing', async () => {
      await request(app)
        .post('/api/v1/exams')
        .set('Authorization', `Bearer ${teacherOneAccessToken}`)
        .send({
          title: 'Test Exam',
          classIds: [classA._id.toString()],
          examDate: new Date(Date.now() + 86400000).toISOString(),
          duration: 60,
          totalScore: 10,
          numberOfQuestions: 5,
        })
        .expect(httpStatus.BAD_REQUEST);
    });

    it('should return 401 if no token', async () => {
      await request(app)
        .post('/api/v1/exams')
        .send({ title: 'No Auth' })
        .expect(httpStatus.UNAUTHORIZED);
    });
  });

  describe('POST /api/v1/exams/:id/versions — Generate versions', () => {
    beforeEach(async () => {
      const res = await request(app)
        .post('/api/v1/exams')
        .set('Authorization', `Bearer ${teacherOneAccessToken}`)
        .send({
          title: 'Version Test Exam',
          classIds: [classA._id.toString()],
          primaryClassId: classA._id.toString(),
          omrTemplateId: omrTemplate._id.toString(),
          examDate: new Date(Date.now() + 86400000).toISOString(),
          duration: 60,
          totalScore: 10,
          numberOfQuestions: 5,
          questionIds: questions.map((q) => q._id.toString()),
        });
      exam = res.body;
    });

    it('should generate 3 exam versions', async () => {
      const res = await request(app)
        .post(`/api/v1/exams/${exam._id}/versions`)
        .set('Authorization', `Bearer ${teacherOneAccessToken}`)
        .send({ count: 3 })
        .expect(httpStatus.CREATED);

      expect(res.body).toHaveProperty('examId', exam._id);
      expect(res.body.versions).toHaveLength(3);
      expect(res.body.versions[0]).toMatch(/^\d{3}$/); // version codes like "001"
    });

    it('should return 400 if count is 0', async () => {
      await request(app)
        .post(`/api/v1/exams/${exam._id}/versions`)
        .set('Authorization', `Bearer ${teacherOneAccessToken}`)
        .send({ count: 0 })
        .expect(httpStatus.BAD_REQUEST);
    });

    it('should return 400 if exam not found', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      await request(app)
        .post(`/api/v1/exams/${fakeId}/versions`)
        .set('Authorization', `Bearer ${teacherOneAccessToken}`)
        .send({ count: 2 })
        .expect(httpStatus.NOT_FOUND);
    });
  });

  describe('GET /api/v1/exams/:id/versions — List versions (with AMC fields)', () => {
    beforeEach(async () => {
      const res = await request(app)
        .post('/api/v1/exams')
        .set('Authorization', `Bearer ${teacherOneAccessToken}`)
        .send({
          title: 'AMC Fields Test',
          classIds: [classA._id.toString()],
          primaryClassId: classA._id.toString(),
          omrTemplateId: omrTemplate._id.toString(),
          examDate: new Date(Date.now() + 86400000).toISOString(),
          duration: 60,
          totalScore: 10,
          numberOfQuestions: 5,
          questionIds: questions.map((q) => q._id.toString()),
        });
      exam = res.body;

      await request(app)
        .post(`/api/v1/exams/${exam._id}/versions`)
        .set('Authorization', `Bearer ${teacherOneAccessToken}`)
        .send({ count: 2 });
    });

    it('should return versions with AMC fields', async () => {
      const res = await request(app)
        .get(`/api/v1/exams/${exam._id}/versions`)
        .set('Authorization', `Bearer ${teacherOneAccessToken}`)
        .expect(httpStatus.OK);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body).toHaveLength(2);

      const version = res.body[0];
      expect(version).toHaveProperty('versionCode');
      expect(version).toHaveProperty('paperEngine'); // AMC field
      expect(version).toHaveProperty('pdfUrl');       // AMC field
      expect(version).toHaveProperty('generatedAt');  // AMC field
      expect(version).toHaveProperty('generationErrors'); // AMC field
      expect(version).toHaveProperty('templateJson');  // AMC field

      // Initial state — no PDF generated yet
      expect(version.pdfUrl).toBeNull();
      expect(version.generatedAt).toBeNull();
      expect(version.generationErrors).toEqual([]);
    });

    it('should return 401 if no token', async () => {
      await request(app)
        .get(`/api/v1/exams/${exam._id}/versions`)
        .expect(httpStatus.UNAUTHORIZED);
    });
  });

  describe('POST /api/v1/exams/:id/generate-papers — Generate papers (AMC pipeline)', () => {
    beforeEach(async () => {
      const res = await request(app)
        .post('/api/v1/exams')
        .set('Authorization', `Bearer ${teacherOneAccessToken}`)
        .send({
          title: 'Generate Papers Test',
          classIds: [classA._id.toString()],
          primaryClassId: classA._id.toString(),
          omrTemplateId: omrTemplate._id.toString(),
          examDate: new Date(Date.now() + 86400000).toISOString(),
          duration: 60,
          totalScore: 10,
          numberOfQuestions: 5,
          questionIds: questions.map((q) => q._id.toString()),
        });
      exam = res.body;
    });

    it('should return 400 if id is invalid format', async () => {
      await request(app)
        .post('/api/v1/exams/invalid-id/generate-papers')
        .set('Authorization', `Bearer ${teacherOneAccessToken}`)
        .expect(httpStatus.BAD_REQUEST);
    });

    it('should return 401 if no token', async () => {
      await request(app)
        .post(`/api/v1/exams/${exam._id}/generate-papers`)
        .expect(httpStatus.UNAUTHORIZED);
    });

    it('should return 404 if exam not found', async () => {
      const fakeExam = new mongoose.Types.ObjectId();
      await request(app)
        .post(`/api/v1/exams/${fakeExam}/generate-papers`)
        .set('Authorization', `Bearer ${teacherOneAccessToken}`)
        .expect(httpStatus.NOT_FOUND);
    });
  });

  describe('GET /api/v1/exams/:id/versions/:versionCode/pdf — Export version PDF', () => {
    beforeEach(async () => {
      const res = await request(app)
        .post('/api/v1/exams')
        .set('Authorization', `Bearer ${teacherOneAccessToken}`)
        .send({
          title: 'Export PDF Test',
          classIds: [classA._id.toString()],
          primaryClassId: classA._id.toString(),
          omrTemplateId: omrTemplate._id.toString(),
          examDate: new Date(Date.now() + 86400000).toISOString(),
          duration: 60,
          totalScore: 10,
          numberOfQuestions: 5,
          questionIds: questions.map((q) => q._id.toString()),
        });
      exam = res.body;

      await request(app)
        .post(`/api/v1/exams/${exam._id}/versions`)
        .set('Authorization', `Bearer ${teacherOneAccessToken}`)
        .send({ count: 1 });

      const versionsRes = await request(app)
        .get(`/api/v1/exams/${exam._id}/versions`)
        .set('Authorization', `Bearer ${teacherOneAccessToken}`);
      exam.versionCode = versionsRes.body[0].versionCode;
    });

    it('should return PDF when version exists (fallback to PDFKit)', async () => {
      const res = await request(app)
        .get(`/api/v1/exams/${exam._id}/versions/${exam.versionCode}/pdf`)
        .set('Authorization', `Bearer ${teacherOneAccessToken}`)
        .responseType('blob')
        .expect(200);

      expect(res.headers['content-type']).toMatch(/pdf/);
      expect(res.headers['content-disposition']).toMatch(/Export_PDF_Test/);
    });

    it('should return 401 if no token', async () => {
      await request(app)
        .get(`/api/v1/exams/${exam._id}/versions/${exam.versionCode}/pdf`)
        .expect(httpStatus.UNAUTHORIZED);
    });

    it('should return 404 if version not found', async () => {
      await request(app)
        .get(`/api/v1/exams/${exam._id}/versions/999/pdf`)
        .set('Authorization', `Bearer ${teacherOneAccessToken}`)
        .expect(httpStatus.NOT_FOUND);
    });
  });

  describe('GET /api/v1/exams/:id/template — Get exam template JSON', () => {
    beforeEach(async () => {
      const res = await request(app)
        .post('/api/v1/exams')
        .set('Authorization', `Bearer ${teacherOneAccessToken}`)
        .send({
          title: 'Template Test Exam',
          classIds: [classA._id.toString()],
          primaryClassId: classA._id.toString(),
          omrTemplateId: omrTemplate._id.toString(),
          examDate: new Date(Date.now() + 86400000).toISOString(),
          duration: 60,
          totalScore: 10,
          numberOfQuestions: 5,
          questionIds: questions.map((q) => q._id.toString()),
        });
      exam = res.body;

      await request(app)
        .post(`/api/v1/exams/${exam._id}/versions`)
        .set('Authorization', `Bearer ${teacherOneAccessToken}`)
        .send({ count: 1 });
    });

    it('should return template JSON', async () => {
      const res = await request(app)
        .get(`/api/v1/exams/${exam._id}/template`)
        .set('Authorization', `Bearer ${teacherOneAccessToken}`)
        .expect(httpStatus.OK);

      expect(res.body).toHaveProperty('examId', exam._id);
      expect(res.body).toHaveProperty('versionCode');
      expect(res.body).toHaveProperty('answerKey');
      expect(res.body).toHaveProperty('template'); // the AMC template JSON
      expect(res.body).toHaveProperty('totalScore', 10);
      expect(res.body).toHaveProperty('numberOfQuestions', 5);
    });

    it('should filter by versionCode', async () => {
      // Version code is "101" (not "001") because count=1 generates codes 101, 102...
      const res = await request(app)
        .get(`/api/v1/exams/${exam._id}/template?versionCode=101`)
        .set('Authorization', `Bearer ${teacherOneAccessToken}`)
        .expect(httpStatus.OK);

      expect(res.body.versionCode).toBe('101');
    });

    it('should return 400 if id is invalid', async () => {
      await request(app)
        .get('/api/v1/exams/invalid-id/template')
        .set('Authorization', `Bearer ${teacherOneAccessToken}`)
        .expect(httpStatus.BAD_REQUEST);
    });
  });

  describe('GET /api/v1/exams/:id/versions/export — Export versions ZIP', () => {
    beforeEach(async () => {
      const res = await request(app)
        .post('/api/v1/exams')
        .set('Authorization', `Bearer ${teacherOneAccessToken}`)
        .send({
          title: 'ZIP Export Test',
          classIds: [classA._id.toString()],
          primaryClassId: classA._id.toString(),
          omrTemplateId: omrTemplate._id.toString(),
          examDate: new Date(Date.now() + 86400000).toISOString(),
          duration: 60,
          totalScore: 10,
          numberOfQuestions: 5,
          questionIds: questions.map((q) => q._id.toString()),
        });
      exam = res.body;

      await request(app)
        .post(`/api/v1/exams/${exam._id}/versions`)
        .set('Authorization', `Bearer ${teacherOneAccessToken}`)
        .send({ count: 2 });
    });

    it('should return ZIP with multiple versions', async () => {
      const res = await request(app)
        .get(`/api/v1/exams/${exam._id}/versions/export`)
        .set('Authorization', `Bearer ${teacherOneAccessToken}`)
        .responseType('blob')
        .expect(200);

      expect(res.headers['content-type']).toMatch(/zip/);
    });

    it('should return 401 if no token', async () => {
      await request(app)
        .get(`/api/v1/exams/${exam._id}/versions/export`)
        .expect(httpStatus.UNAUTHORIZED);
    });
  });

  describe('PATCH /api/v1/exams/:id — Update exam', () => {
    beforeEach(async () => {
      const res = await request(app)
        .post('/api/v1/exams')
        .set('Authorization', `Bearer ${teacherOneAccessToken}`)
        .send({
          title: 'Update Test Exam',
          classIds: [classA._id.toString()],
          primaryClassId: classA._id.toString(),
          omrTemplateId: omrTemplate._id.toString(),
          examDate: new Date(Date.now() + 86400000).toISOString(),
          duration: 60,
          totalScore: 10,
          numberOfQuestions: 5,
          questionIds: questions.map((q) => q._id.toString()),
        });
      exam = res.body;
    });

    it('should update exam title', async () => {
      const res = await request(app)
        .patch(`/api/v1/exams/${exam._id}`)
        .set('Authorization', `Bearer ${teacherOneAccessToken}`)
        .send({ title: 'Updated Exam Title' })
        .expect(httpStatus.OK);

      expect(res.body.title).toBe('Updated Exam Title');
    });

    it('should update printConfig', async () => {
      const res = await request(app)
        .patch(`/api/v1/exams/${exam._id}`)
        .set('Authorization', `Bearer ${teacherOneAccessToken}`)
        .send({
          printConfig: {
            paperSize: 'A4',
            questionsPerPage: 5,
            includeAnswerSheet: true,
            schoolHeader: true,
          },
        })
        .expect(httpStatus.OK);

      expect(res.body.printConfig.paperSize).toBe('A4');
      expect(res.body.printConfig.questionsPerPage).toBe(5);
      expect(res.body.printConfig.includeAnswerSheet).toBe(true);
    });

    it('should update shuffleConfig', async () => {
      const res = await request(app)
        .patch(`/api/v1/exams/${exam._id}`)
        .set('Authorization', `Bearer ${teacherOneAccessToken}`)
        .send({
          shuffleConfig: {
            shuffleQuestions: true,
            shuffleOptions: true,
          },
        })
        .expect(httpStatus.OK);

      expect(res.body.shuffleConfig.shuffleQuestions).toBe(true);
      expect(res.body.shuffleConfig.shuffleOptions).toBe(true);
    });
  });
});
