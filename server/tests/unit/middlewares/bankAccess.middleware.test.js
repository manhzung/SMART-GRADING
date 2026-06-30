const httpStatus = require('http-status');
const mockFindOne = jest.fn();

jest.mock('../../../src/models', () => {
  const actual = jest.requireActual('../../../src/models');
  return {
    ...actual,
    QuestionBankMember: {
      ...actual.QuestionBankMember,
      findOne: mockFindOne,
    },
  };
});

const mockReq = () => ({ params: {}, user: {} });
const mockRes = () => ({ status: jest.fn().mockReturnThis(), json: jest.fn() });
const mockNext = jest.fn();

it('calls next for active member', async () => {
  mockFindOne.mockResolvedValue({});
  const { checkBankAccess } = require('../../../src/middlewares/bankAccess.middleware');
  const { QuestionBankMember } = require('../../../src/models');

  const bankId = 'bank-1';
  const userId = 'user-1';

  const req = mockReq();
  req.params = { bankId };
  req.user = { id: userId };
  const res = mockRes();

  await checkBankAccess(req, res, mockNext);

  expect(mockFindOne).toHaveBeenCalledTimes(1);
  expect(mockNext).toHaveBeenCalled();
  expect(res.status).not.toHaveBeenCalled();
});

it('returns 403 for non member', async () => {
  mockFindOne.mockResolvedValue(null);
  const { checkBankAccess } = require('../../../src/middlewares/bankAccess.middleware');
  const { QuestionBankMember } = require('../../../src/models');

  const bankId = 'bank-1';
  const userId = 'user-1';

  const req = mockReq();
  req.params = { bankId };
  req.user = { id: userId };
  const res = mockRes();

  await checkBankAccess(req, res, mockNext);

  expect(mockFindOne).toHaveBeenCalledTimes(1);
  expect(mockNext).not.toHaveBeenCalled();
  expect(res.status).toHaveBeenCalledWith(httpStatus.FORBIDDEN);
});
