const activityService = require('../services/activity.service');
const catchAsync = require('../utils/catchAsync');

const getRecentActivities = catchAsync(async (req, res) => {
  const limit = parseInt(req.query.limit, 10) || 10;
  const activities = await activityService.getRecentActivities(req.user, limit);
  res.send({
    results: activities,
    count: activities.length,
  });
});

module.exports = {
  getRecentActivities,
};
