/* eslint-disable no-console */
// Test API directly with valid teacher token
const mongoose = require('mongoose');
const User = require('../src/models/user.model');
const SubmissionService = require('../src/services/submission.service');

require('../src/config/config');

(async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URL);
    console.log('Connected to MongoDB');

    // Find a teacher user
    const teacher = await User.findOne({ role: 'teacher' });
    if (!teacher) {
      console.log('No teacher user found');
      process.exit(1);
    }
    console.log('Found teacher:', teacher.email, 'role:', teacher.role, 'id:', teacher._id);

    // Call service directly (simulating what the API does)
    console.log('\n═══ Calling submissionService.getAll({}) ═══');
    try {
      const result = await SubmissionService.getAll({ page: 1, limit: 20 });
      console.log('total:', result.total);
      console.log('pages:', result.pages);
      console.log('results count:', result.results.length);
      if (result.results.length > 0) {
        console.log('\nFirst result fields:');
        console.log('  id:', result.results[0]._id);
        console.log('  status:', result.results[0].status);
        console.log('  examId:', result.results[0].examId?._id || result.results[0].examId);
        console.log('  studentId:', result.results[0].studentId?._id || result.results[0].studentId);
        console.log('  totalScore:', result.results[0].totalScore);
      } else {
        console.log('\n*** getAll returned EMPTY results ***');
      }
    } catch (err) {
      console.error('getAll THREW ERROR:', err.message);
      console.error(err.stack);
    }

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
})();
