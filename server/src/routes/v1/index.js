const express = require('express');
const authRoute = require('./auth.route');
const userRoute = require('./user.route');
const docsRoute = require('./docs.route');
const schoolRoute = require('./school.route');
const subjectRoute = require('./subject.route');
const classRoute = require('./class.route');
const omrTemplateRoute = require('./omrTemplate.route');
const questionRoute = require('./question.route');
const examRoute = require('./exam.route');
const submissionRoute = require('./submission.route');
const appealRoute = require('./appeal.route');
const reportRoute = require('./report.route');
const notificationRoute = require('./notification.route');
const analyticsRoute = require('./analytics.route');
const uploadRoute = require('./upload.route');
const aiChatRoute = require('./aiChat.route');
const config = require('../../config/config');

const router = express.Router();

router.use('/auth', authRoute);
router.use('/users', userRoute);
router.use('/schools', schoolRoute);
router.use('/subjects', subjectRoute);
router.use('/classes', classRoute);
router.use('/omr-templates', omrTemplateRoute);
router.use('/questions', questionRoute);
router.use('/exams', examRoute);
router.use('/submissions', submissionRoute);
router.use('/appeals', appealRoute);
router.use('/reports', reportRoute);
router.use('/notifications', notificationRoute);
router.use('/analytics', analyticsRoute);
router.use('/upload', uploadRoute);
router.use('/ai-chat', aiChatRoute);

if (config.env === 'development') {
  router.use('/docs', docsRoute);
}

module.exports = router;
