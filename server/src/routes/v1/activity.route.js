const express = require('express');
const auth = require('../../middlewares/auth');
const activityController = require('../../controllers/activity.controller');

const router = express.Router();

router.use(auth());

router.get('/', activityController.getRecentActivities);

module.exports = router;
