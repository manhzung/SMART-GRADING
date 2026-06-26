const request = require('supertest');
const httpStatus = require('http-status');
const faker = require('faker');
const app = require('../../../src/app');
const setupTestDB = require('../../utils/setupTestDB');
const { emailService } = require('../../../src/services');
const { insertSchools, schoolA } = require('../../fixtures/school.fixture');

setupTestDB();

describe('GET /api/v1/schools', () => {
  beforeEach(async () => {
    await insertSchools([schoolA]);
  });

  test('should return schools with string `id` field (not raw `_id`) so frontend can use it directly', async () => {
    const res = await request(app).get('/api/v1/schools').expect(httpStatus.OK);

    expect(res.body.results).toHaveLength(1);
    const school = res.body.results[0];

    // The frontend RegisterPage reads `school.id`; without toJSON plugin this is undefined.
    expect(school.id).toBe(schoolA._id.toString());
    expect(school).not.toHaveProperty('_id');
    expect(school).not.toHaveProperty('__v');
  });
});

describe('POST /api/v1/auth/register (regression for "School not found")', () => {
  beforeEach(async () => {
    await insertSchools([schoolA]);
    jest.spyOn(emailService.transport, 'sendMail').mockResolvedValue();
  });

  test('should successfully register when schoolId is sent as the string from `GET /schools` (id field)', async () => {
    // Step 1: fetch the school list the way the frontend does
    const listRes = await request(app).get('/api/v1/schools').expect(httpStatus.OK);
    const firstSchoolId = listRes.body.results[0].id;
    expect(typeof firstSchoolId).toBe('string');

    // Step 2: register using that exact string
    const newUser = {
      name: faker.name.findName(),
      email: faker.internet.email().toLowerCase(),
      password: 'password1',
      schoolId: firstSchoolId,
    };

    const res = await request(app).post('/api/v1/auth/register').send(newUser).expect(httpStatus.CREATED);

    expect(res.body.user.schoolId).toBe(firstSchoolId);
  });
});
