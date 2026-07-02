const express = require('express');
const router = express.Router();

// Simple health check endpoint for Docker healthcheck
router.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

module.exports = router;
