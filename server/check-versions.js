const mongoose = require('mongoose');
mongoose.connect('mongodb://localhost:27017/smart-grading').then(async () => {
  const { ExamVersion } = require('./src/models');
  
  const examId = '6a3cc3a9e288476df0c3ba67';
  console.log(`Checking versions for: ${examId}`);
  const versions = await ExamVersion.find({examId}).lean();
  console.log(`Found ${versions.length} versions`);
  versions.forEach(v => {
    console.log(`\n=== Version ${v.versionCode} ===`);
    console.log('corrigePdfUrl:', v.corrigePdfUrl);
    console.log('pdfUrl:', v.pdfUrl);
    console.log('answerSheetPdfUrl:', v.answerSheetPdfUrl);
  });
  process.exit(0);
});
