const express = require('express');
const validate = require('../../middlewares/validate');
const aiChatValidation = require('../../validations/ai.validation');
const aiChatController = require('../../controllers/aiChat.controller');
const auth = require('../../middlewares/auth');

const router = express.Router();

router.route('/send').post(auth(), validate(aiChatValidation.chatWithAI), aiChatController.sendMessage);

router.route('/conversations').get(auth(), aiChatController.getConversations);

router.route('/conversations').post(auth(), aiChatController.createConversation);

router.route('/history/:conversationId').get(auth(), aiChatController.getHistory);

router.route('/reports').get(auth(), aiChatController.getReports);

module.exports = router;
