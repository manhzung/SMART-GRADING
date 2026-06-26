const mongoose = require('mongoose');
const app = require('./app');
const config = require('./config/config');
const logger = require('./config/logger');
const geminiService = require('./services/gemini.service');

let server;
mongoose.connect(config.mongoose.url, config.mongoose.options).then(() => {
  logger.info('Connected to MongoDB');
  
  // Log AI configuration
  const aiProvider = config.ai?.provider || 'gemini';
  const aiModel = config.ai?.geminiModel || 'gemini-2.0-flash';
  const hasApiKey = !!config.ai?.geminiApiKey;
  
  logger.info(`AI Provider: ${aiProvider}`);
  logger.info(`AI Model: ${aiModel}`);
  logger.info(`AI API Key: ${hasApiKey ? '✅ Configured' : '❌ Not configured'}`);
  
  server = app.listen(config.port, () => {
    logger.info(`Listening to port ${config.port}`);
  });
});

const exitHandler = () => {
  if (server) {
    server.close(() => {
      logger.info('Server closed');
      process.exit(1);
    });
  } else {
    process.exit(1);
  }
};

const unexpectedErrorHandler = (error) => {
  logger.error(error);
  exitHandler();
};

process.on('uncaughtException', unexpectedErrorHandler);
process.on('unhandledRejection', unexpectedErrorHandler);

process.on('SIGTERM', () => {
  logger.info('SIGTERM received');
  if (server) {
    server.close();
  }
});
