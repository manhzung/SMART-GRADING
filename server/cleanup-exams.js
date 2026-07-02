const mongoose = require('mongoose');
const config = require('./src/config/config');

mongoose
  .connect(config.mongoose.url)
  .then(async () => {
    const { Exam } = require('./src/models');
    const r = await Exam.deleteMany({
      title: { $regex: 'Kiểm tra|Thi cuối' },
    });
    console.log('Deleted', r.deletedCount, 'exams');
    await mongoose.disconnect();
    process.exit(0);
  })
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
