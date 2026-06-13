import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ApiException } from '../core/errors';

// Mock fetch globally
const mockFetch = vi.fn();
(globalThis as unknown as Record<string, unknown>).fetch = mockFetch;

describe('aiChatService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  const createMockResponse = (data: unknown) => ({
    ok: true,
    status: 200,
    text: () => Promise.resolve(JSON.stringify(data)),
  });

  const createErrorResponse = (status: number, message: string) => ({
    ok: false,
    status,
    json: () => Promise.resolve({ message }),
    text: () => Promise.resolve(JSON.stringify({ message })),
  });

  describe('sendMessage', () => {
    it('calls POST /ai-chat/send with correct body and returns content', async () => {
      const { aiChatService } = await import('./ai-chat.service');

      const mockResponse = {
        success: true,
        data: {
          id: 'msg-1',
          content: 'Xin chao!',
          createdAt: '2026-06-10T00:00:00Z',
        },
      };

      mockFetch.mockResolvedValueOnce(createMockResponse(mockResponse));

      const result = await aiChatService.sendMessage({
        message: 'Xin chao',
      });

      expect(result.content).toBe('Xin chao!');
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/ai-chat/send'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ message: 'Xin chao', history: undefined, context: undefined }),
        })
      );
    });

    it('throws ApiException on error response (status 500)', async () => {
      const { aiChatService } = await import('./ai-chat.service');

      mockFetch.mockResolvedValueOnce(createErrorResponse(500, 'AI service unavailable'));

      await expect(
        aiChatService.sendMessage({ message: 'test' })
      ).rejects.toThrow(ApiException);
    });

    it('includes history array in request body', async () => {
      const { aiChatService } = await import('./ai-chat.service');

      const mockResponse = {
        success: true,
        data: {
          id: 'msg-2',
          content: 'Reply',
          createdAt: '2026-06-10T00:00:00Z',
        },
      };

      mockFetch.mockResolvedValueOnce(createMockResponse(mockResponse));

      const history: Array<{ role: 'user' | 'assistant' | 'system'; content: string }> = [
        { role: 'user', content: 'Hello' },
        { role: 'assistant', content: 'Hi' },
      ];

      await aiChatService.sendMessage({
        message: 'Continue',
        history,
      });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/ai-chat/send'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            message: 'Continue',
            history,
            context: undefined,
          }),
        })
      );
    });
  });

  describe('getReports', () => {
    it('calls GET /ai-chat/reports with query params and returns array', async () => {
      const { aiChatService } = await import('./ai-chat.service');

      const mockResponse = {
        success: true,
        data: [{ _id: 'r1', type: 'summary' }],
      };

      mockFetch.mockResolvedValueOnce(createMockResponse(mockResponse));

      const result = await aiChatService.getReports({
        subjectId: 's1',
        limit: 5,
      });

      expect(result.length).toBe(1);
      expect(result[0]._id).toBe('r1');
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/ai-chat/reports'),
        expect.objectContaining({
          method: 'GET',
        })
      );
      const callUrl = mockFetch.mock.calls[0][0];
      expect(callUrl).toContain('subjectId=s1');
      expect(callUrl).toContain('limit=5');
    });
  });

  describe('createConversation', () => {
    it('calls POST /ai-chat/conversations and returns id', async () => {
      const { aiChatService } = await import('./ai-chat.service');

      const mockResponse = {
        success: true,
        data: { id: 'conv-1' },
      };

      mockFetch.mockResolvedValueOnce(createMockResponse(mockResponse));

      const result = await aiChatService.createConversation();

      expect(result.id).toBe('conv-1');
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/ai-chat/conversations'),
        expect.objectContaining({
          method: 'POST',
        })
      );
    });
  });

  describe('getConversationHistory', () => {
    it('calls GET /ai-chat/history/:id', async () => {
      const { aiChatService } = await import('./ai-chat.service');

      const mockResponse = {
        success: true,
        data: [
          { role: 'user', content: 'Hello' },
          { role: 'assistant', content: 'Hi there!' },
        ],
      };

      mockFetch.mockResolvedValueOnce(createMockResponse(mockResponse));

      const result = await aiChatService.getConversationHistory('conv-123');

      expect(result.length).toBe(2);
      expect(result[0].content).toBe('Hello');
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/ai-chat/history/conv-123'),
        expect.objectContaining({
          method: 'GET',
        })
      );
    });
  });
});
