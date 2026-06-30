const express = require('express');
const auth = require('../../middlewares/auth');
const bankController = require('../../controllers/questionBank.controller');

const router = express.Router();

router.route('/').post(auth(), bankController.createBank);
router.route('/:bankId').get(auth(), bankController.getBank);

module.exports = router;
