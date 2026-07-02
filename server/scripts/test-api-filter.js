/* eslint-disable no-console */
require('../src/config/config');
const mongoose = require('mongoose');
require('../src/models/index');
const SubmissionService = require('../src/services/submission.service');

(async () => {
  await mongoose.connect(process.env.MONGODB_URL);
  console.log('Test 1: getAll({}) — no filter');
  let r = await SubmissionService.getAll({});
  console.log('  total:', r.total, 'results:', r.results.length);

  console.log('\nTest 2: getAll({ page: 1, limit: 5 }) — pagination only');
  r = await SubmissionService.getAll({ page: 1, limit: 5 });
  console.log('  total:', r.total, 'page:', r.page, 'limit:', r.limit, 'results:', r.results.length);

  console.log('\nTest 3: getAll({ status: "completed" }) — status filter');
  r = await SubmissionService.getAll({ status: 'completed', limit: 100 });
  console.log('  total:', r.total, 'results:', r.results.length);

  console.log('\nTest 4: getAll({ examId: "..." }) — examId filter');
  const someExamId = (await require('../src/models/submission.model').findOne({}))?.examId?.toString();
  if (someExamId) {
    r = await SubmissionService.getAll({ examId: someExamId, limit: 100 });
    console.log('  examId:', someExamId, '→ total:', r.total);
  }

  await mongoose.disconnect();
})();
