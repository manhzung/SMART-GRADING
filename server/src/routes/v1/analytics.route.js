const express = require('express');
const auth = require('../../middlewares/auth');

const analyticsController = require('../../controllers/analytics.controller');

const router = express.Router();

router.get('/dashboard-stats', auth(), analyticsController.getDashboardStats);
router.get('/analytics', auth(), analyticsController.getAnalytics);

module.exports = router;
