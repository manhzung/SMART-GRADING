const mongoose = require('mongoose');
const config = require('../config/config');
const seedSchoolsData = require('./school.seeds');

mongoose
  .connect(config.mongoose.url)
  .then(() => {
    console.log('Connected to MongoDB');
    return seedSchoolsData();
  })
  .then(() => {
    return mongoose.disconnect();
  })
  .then(() => {
    console.log('Disconnected from MongoDB');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Error seeding schools:', error);
    process.exit(1);
  });
