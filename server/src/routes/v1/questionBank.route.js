const express = require('express');
const auth = require('../../middlewares/auth');
const bankController = require('../../controllers/questionBank.controller');
const questionController = require('../../controllers/question.controller');

const router = express.Router();

router.route('/').post(auth(), bankController.createBank);
router.route('/:bankId').get(auth(), bankController.getBank);
router.route('/:bankId/questions').get(auth(), questionController.getByBank);

module.exports = router;
