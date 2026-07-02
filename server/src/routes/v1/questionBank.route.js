const express = require('express');
const auth = require('../../middlewares/auth');
const { checkBankAccess, requireBankRole } = require('../../middlewares/bankAccess.middleware');
const bankController = require('../../controllers/questionBank.controller');
const questionController = require('../../controllers/question.controller');

const router = express.Router();
const ownerOrManager = requireBankRole(['owner', 'manager']);
const ownerOnly = requireBankRole(['owner']);

router
  .route('/')
  .post(auth(), bankController.createBank)
  .get(auth(), bankController.listBanks);

router
  .route('/search')
  .get(auth(), bankController.listAllBanks);

router.route('/:bankId').get(auth(), checkBankAccess, bankController.getBank);

router
  .route('/:bankId/members')
  .get(auth(), checkBankAccess, bankController.listMembers)
  .post(auth(), checkBankAccess, ownerOrManager, bankController.inviteMember);

router
  .route('/:bankId/members/:userId')
  .patch(auth(), checkBankAccess, ownerOnly, bankController.updateMember)
  .delete(auth(), checkBankAccess, ownerOrManager, bankController.removeMember);

router
  .route('/:bankId/leave')
  .post(auth(), checkBankAccess, bankController.leaveBank);

router
  .route('/:bankId/request-access')
  .post(auth(), bankController.requestAccess);

router
  .route('/:bankId/requests/pending')
  .get(auth(), checkBankAccess, ownerOrManager, bankController.listPending);

router
  .route('/:bankId/requests/:userId/respond')
  .post(auth(), checkBankAccess, ownerOrManager, bankController.respondRequest);

router
  .route('/:bankId/transfer')
  .post(auth(), checkBankAccess, ownerOnly, bankController.transferOwnership);

router
  .route('/:bankId/questions')
  .get(auth(), checkBankAccess, questionController.getByBank);

module.exports = router;
