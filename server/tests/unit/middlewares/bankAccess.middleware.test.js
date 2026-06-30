const httpStatus = require('http-status');
const mongoose = require('mongoose');
const setupTestDB = require('../../utils/setupTestDB');
const bankAccessMod = require('../../../src/middlewares/bankAccess.middleware');
const { QuestionBank, QuestionBankMember } = require('../../../src/models');

setupTestDB();

const { checkBankAccess } = bankAccessMod;

describe('bankAccess middleware', () => {
  const mockReq = () => ({ params: {}, user: {} });
  const mockRes = () => ({ status: jest.fn().mockReturnThis(), send: jest.fn() });
  const mockNext = jest.fn();

  it('calls next for active member', async () => {
    const userId = new mongoose.Types.ObjectId();
    const bankId = new mongoose.Types.ObjectId();
    await QuestionBank.create({ _id: bankId, name: 'Bank', createdBy: userId });
    await QuestionBankMember.create({ bankId, userId, role: 'manager', status: 'active' });

    const req = mockReq();
    req.params = { bankId: bankId.toString() };
    req.user = { id: userId.toString() };
    const res = mockRes();

    await checkBankAccess(req, res, mockNext);
    expect(mockNext).toHaveBeenCalled();
  });

  it('forbids non member', async () => {
    const bankId = new mongoose.Types.ObjectId();
    const otherUserId = new mongoose.Types.ObjectId();
    await QuestionBank.create({ _id: bankId, name: 'Bank', createdBy: otherUserId });

    const req = mockReq();
    req.params = { bankId: bankId.toString() };
    req.user = { id: new mongoose.Types.ObjectId().toString() };
    const res = mockRes();

    await expect(checkBankAccess(req, res, mockNext)).rejects.toMatchObject({
      statusCode: httpStatus.FORBIDDEN,
    });
  });
});
