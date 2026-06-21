const aiChatController = require('../../../src/controllers/aiChat.controller');

describe('AIChatController', () => {
  it('should have sendMessage function', () => {
    expect(typeof aiChatController.sendMessage).toBe('function');
  });

  it('should have getConversations function', () => {
    expect(typeof aiChatController.getConversations).toBe('function');
  });

  it('should have getHistory function', () => {
    expect(typeof aiChatController.getHistory).toBe('function');
  });

  it('should have createConversation function', () => {
    expect(typeof aiChatController.createConversation).toBe('function');
  });

  it('should have getReports function', () => {
    expect(typeof aiChatController.getReports).toBe('function');
  });
});
