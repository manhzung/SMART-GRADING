const seedOMRTemplates = require('./omrTemplate.seeds');
const seedSchoolsData = require('./school.seeds');
const seedAdminUser = require('./admin.seed');
const seedAcademicData = require('./academic.seed');
const seedExamsAndSubmissions = require('./exam.seed');

async function runAllSeeds() {
  console.log('='.repeat(50));
  console.log('Starting database seeding...');
  console.log('='.repeat(50));

  try {
    await seedSchoolsData();
    await seedOMRTemplates();
    await seedAdminUser();
    await seedAcademicData();
    await seedExamsAndSubmissions();

    console.log('\n' + '='.repeat(50));
    console.log('All seeds completed successfully!');
    console.log('='.repeat(50));
  } catch (error) {
    console.error('Error running seeds:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  const mongoose = require('mongoose');
  const config = require('../config/config');

  mongoose
    .connect(config.mongoose.url)
    .then(() => {
      console.log('Connected to MongoDB');
      return runAllSeeds();
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

module.exports = { runAllSeeds };
