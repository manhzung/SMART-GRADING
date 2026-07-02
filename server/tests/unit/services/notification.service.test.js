const mongoose = require('mongoose');
const setupTestDB = require('../../utils/setupTestDB');

setupTestDB();

const notificationService = require('../../../src/services/notification.service');
const { Notification } = require('../../../src/models');

describe('Notification Service - bank events', () => {
  it('notifies owner of a new access request', async () => {
    const bankId = new mongoose.Types.ObjectId();
    const ownerId = new mongoose.Types.ObjectId();
    const requesterId = new mongoose.Types.ObjectId();
    await notificationService.notifyBankRequestSubmitted({
      bankId,
      bankName: 'My Bank',
      requesterName: 'Lan',
      ownerId,
      requesterId,
    });
    const docs = await Notification.find({ type: 'bank_request_submitted' });
    expect(docs).toHaveLength(1);
    expect(docs[0].title).toContain('access request');
    expect(docs[0].body).toContain('Lan');
    const data = docs[0].toObject().data || {};
    expect(String(data.bankId || '')).toBe(bankId.toString());
  });

  it('notifies user when their request is approved', async () => {
    const bankId = new mongoose.Types.ObjectId();
    const userId = new mongoose.Types.ObjectId();
    await notificationService.notifyBankRequestApproved({
      bankId,
      bankName: 'Bank',
      userId,
    });
    const docs = await Notification.find({ type: 'bank_request_approved' });
    expect(docs).toHaveLength(1);
    expect(docs[0].userId.toString()).toBe(userId.toString());
  });

  it('notifies user when their request is rejected', async () => {
    const bankId = new mongoose.Types.ObjectId();
    const userId = new mongoose.Types.ObjectId();
    await notificationService.notifyBankRequestRejected({
      bankId,
      bankName: 'Bank',
      userId,
    });
    const docs = await Notification.find({ type: 'bank_request_rejected' });
    expect(docs).toHaveLength(1);
    expect(docs[0].userId.toString()).toBe(userId.toString());
  });

  it('notifies user when added as a member', async () => {
    const bankId = new mongoose.Types.ObjectId();
    const userId = new mongoose.Types.ObjectId();
    await notificationService.notifyBankMemberAdded({
      bankId,
      bankName: 'Bank',
      userId,
      role: 'manager',
    });
    const docs = await Notification.find({ type: 'bank_member_added' });
    expect(docs).toHaveLength(1);
    expect(docs[0].title).toContain('manager');
  });
});
