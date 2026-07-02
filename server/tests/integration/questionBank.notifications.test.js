const mongoose = require('mongoose');
const setupTestDB = require('../utils/setupTestDB');

setupTestDB();

const questionBankService = require('../../src/services/questionBank.service');
const { Notification, User, QuestionBank } = require('../../src/models');

describe('Notification hooks on bank events', () => {
  async function makeUser(name = 'Test') {
    return User.create({
      name,
      email: `${name.toLowerCase().replace(/\s/g, '')}@test.com`,
      password: 'Password123!',
      role: 'teacher',
    });
  }

  beforeEach(async () => {
    await Notification.deleteMany({});
  });

  it('emits a request_submitted notification when access is requested', async () => {
    const owner = await makeUser('Owner');
    const requester = await makeUser('Requester');
    const bank = await questionBankService.createBank({
      name: 'Bank',
      createdBy: owner._id,
    });

    await questionBankService.requestAccess(bank._id.toString(), requester._id.toString());

    const docs = await Notification.find({ type: 'bank_request_submitted' });
    expect(docs).toHaveLength(1);
    expect(docs[0].userId.toString()).toBe(owner._id.toString());
  });

  it('emits approved notification on approval', async () => {
    const owner = await makeUser('Owner');
    const requester = await makeUser('Requester');
    const bank = await questionBankService.createBank({
      name: 'Bank',
      createdBy: owner._id,
    });
    await questionBankService.requestAccess(bank._id.toString(), requester._id.toString());

    await Notification.deleteMany({});
    await questionBankService.respondToRequest(
      bank._id.toString(),
      requester._id.toString(),
      'approve',
      owner._id.toString()
    );

    const docs = await Notification.find({ type: 'bank_request_approved' });
    expect(docs).toHaveLength(1);
    expect(docs[0].userId.toString()).toBe(requester._id.toString());
  });

  it('emits rejected notification on rejection', async () => {
    const owner = await makeUser('Owner');
    const requester = await makeUser('Requester');
    const bank = await questionBankService.createBank({
      name: 'Bank',
      createdBy: owner._id,
    });
    await questionBankService.requestAccess(bank._id.toString(), requester._id.toString());

    await Notification.deleteMany({});
    await questionBankService.respondToRequest(
      bank._id.toString(),
      requester._id.toString(),
      'reject',
      owner._id.toString()
    );

    const docs = await Notification.find({ type: 'bank_request_rejected' });
    expect(docs).toHaveLength(1);
    expect(docs[0].userId.toString()).toBe(requester._id.toString());
  });

  it('emits member_added notification on invite', async () => {
    const owner = await makeUser('Owner');
    const invitee = await makeUser('Invitee');
    const bank = await questionBankService.createBank({
      name: 'Bank',
      createdBy: owner._id,
    });

    await questionBankService.inviteMember(bank._id.toString(), invitee._id.toString(), owner._id.toString());

    const docs = await Notification.find({ type: 'bank_member_added' });
    expect(docs).toHaveLength(1);
    expect(docs[0].userId.toString()).toBe(invitee._id.toString());
  });
});
