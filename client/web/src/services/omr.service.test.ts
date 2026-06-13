import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ApiException } from '../core/errors';

// Mock fetch globally
const mockFetch = vi.fn();
(globalThis as unknown as Record<string, unknown>).fetch = mockFetch;

describe('omrService', () => {
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

  describe('uploadAndProcess', () => {
    it('should call correct endpoint and return data', async () => {
      const { omrService } = await import('./omr.service');
      
      const mockResponse = {
        success: true,
        data: {
          id: 'sheet-123',
          detectedAnswers: { q1: 'A' },
          confidence: 0.95,
          templateId: 't1',
        },
      };

      mockFetch.mockResolvedValueOnce(createMockResponse(mockResponse));

      const testFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      const result = await omrService.uploadAndProcess(testFile, 'template-1');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/omr/upload'),
        expect.objectContaining({
          method: 'POST',
        })
      );
      expect(result).toEqual(mockResponse.data);
    });

    it('should throw ApiException when response not ok', async () => {
      const { omrService } = await import('./omr.service');

      mockFetch.mockResolvedValueOnce(createErrorResponse(400, 'Invalid format'));

      const testFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });

      await expect(omrService.uploadAndProcess(testFile, 'template-1')).rejects.toThrow(ApiException);
    });
  });

  describe('matchSheetToExam', () => {
    it('should call correct endpoint POST /omr/match-exam', async () => {
      const { omrService } = await import('./omr.service');

      const mockResponse = {
        success: true,
        data: {
          examId: 'exam-1',
          title: 'Kiem tra HK1',
          matchScore: 0.9,
        },
      };

      mockFetch.mockResolvedValueOnce(createMockResponse(mockResponse));

      const result = await omrService.matchSheetToExam('sheet-123');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/omr/match-exam'),
        expect.objectContaining({
          method: 'POST',
        })
      );
      expect(result.examId).toBe('exam-1');
    });
  });

  describe('submitSheet', () => {
    it('should call correct endpoint POST /omr/submit', async () => {
      const { omrService } = await import('./omr.service');

      const mockResponse = {
        success: true,
        data: {
          submissionId: 'sub-1',
          status: 'graded',
        },
      };

      mockFetch.mockResolvedValueOnce(createMockResponse(mockResponse));

      const answers = { q1: 'A', q2: 'B' };
      const result = await omrService.submitSheet('sheet-123', answers, 'exam-1');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/omr/submit'),
        expect.objectContaining({
          method: 'POST',
        })
      );
      expect(result.submissionId).toBe('sub-1');
    });
  });

  describe('getProcessingStatus', () => {
    it('should call GET /omr/status/:sheetId and return status', async () => {
      const { omrService } = await import('./omr.service');

      const mockResponse = {
        success: true,
        data: {
          status: 'completed',
          progress: 100,
        },
      };

      mockFetch.mockResolvedValueOnce(createMockResponse(mockResponse));

      const result = await omrService.getProcessingStatus('sheet-123');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/omr/status/sheet-123'),
        expect.objectContaining({
          method: 'GET',
        })
      );
      expect(result.status).toBe('completed');
      expect(result.progress).toBe(100);
    });
  });

  describe('getTemplates', () => {
    it('should call GET /omr/templates and return array', async () => {
      const { omrService } = await import('./omr.service');

      const mockResponse = {
        success: true,
        data: [
          { id: 't1', name: 'Mau 40 cau', questionCount: 40, rowCount: 5 },
        ],
      };

      mockFetch.mockResolvedValueOnce(createMockResponse(mockResponse));

      const result = await omrService.getTemplates();

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/omr/templates'),
        expect.objectContaining({
          method: 'GET',
        })
      );
      expect(result.length).toBe(1);
    });
  });

  describe('Authorization header', () => {
    it('should send Authorization header with Bearer token', async () => {
      const { omrService } = await import('./omr.service');

      localStorage.setItem('auth-storage', JSON.stringify({
        state: { token: 'test-token', refreshToken: 'test-refresh' }
      }));

      const mockResponse = {
        success: true,
        data: { id: 'sheet-123', detectedAnswers: {}, confidence: 0.95, templateId: 't1' },
      };

      mockFetch.mockResolvedValueOnce(createMockResponse(mockResponse));

      const testFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      await omrService.uploadAndProcess(testFile, 'template-1');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer test-token',
          }),
        })
      );
    });
  });
});
