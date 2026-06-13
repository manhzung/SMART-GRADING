import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock fetch and XMLHttpRequest before importing service
const mockFetch = vi.fn();
(globalThis as unknown as Record<string, unknown>).fetch = mockFetch;

interface MockXHR {
  upload: { addEventListener: ReturnType<typeof vi.fn> };
  open: ReturnType<typeof vi.fn>;
  send: ReturnType<typeof vi.fn>;
  addEventListener: ReturnType<typeof vi.fn>;
  responseText: string;
  status: number;
}

const createMockXHR = (status: number, body: unknown): MockXHR => {
  const xhr: MockXHR = {
    upload: { addEventListener: vi.fn() },
    open: vi.fn(),
    send: vi.fn(),
    addEventListener: vi.fn(),
    responseText: JSON.stringify(body),
    status,
  };
  return xhr;
};

describe('cloudinaryService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    localStorage.setItem('accessToken', 'test-token');
  });

  describe('getUploadSignature', () => {
    it('fetches signature with correct query params', async () => {
      const { cloudinaryService } = await import('./cloudinary.service');

      const sigResponse = {
        signature: 'sig-1',
        apiKey: 'k',
        cloudName: 'cn',
        timestamp: 1,
        folder: 'submissions/e/s/o',
        publicId: 'p',
        uploadUrl: 'https://api.cloudinary.com/v1_1/cn/image/upload',
        expiresIn: 300,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(sigResponse),
        text: () => Promise.resolve(JSON.stringify(sigResponse)),
      });

      const sig = await cloudinaryService.getUploadSignature({
        examId: 'e1',
        type: 'original',
      });

      expect(sig).toEqual(sigResponse);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/upload/signature?examId=e1&type=original'),
        expect.objectContaining({
          headers: expect.objectContaining({ Authorization: 'Bearer test-token' }),
        })
      );
    });

    it('throws on non-2xx', async () => {
      const { cloudinaryService } = await import('./cloudinary.service');

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: () => Promise.resolve({ message: 'Unauthorized' }),
        text: () => Promise.resolve(JSON.stringify({ message: 'Unauthorized' })),
      });

      await expect(
        cloudinaryService.getUploadSignature({ examId: 'e1', type: 'original' })
      ).rejects.toThrow(/Failed to get upload signature: 401/);
    });
  });

  describe('uploadAndAttach', () => {
    it('chains signature, upload, and attach-image', async () => {
      const { cloudinaryService } = await import('./cloudinary.service');

      const sigResponse = {
        signature: 'sig-1',
        apiKey: 'k',
        cloudName: 'cn',
        timestamp: 1,
        folder: 'submissions/e/s/o',
        publicId: 'p',
        uploadUrl: 'https://api.cloudinary.com/v1_1/cn/image/upload',
        expiresIn: 300,
      };

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () => Promise.resolve(sigResponse),
          text: () => Promise.resolve(JSON.stringify(sigResponse)),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ _id: 's1', images: {} }),
          text: () => Promise.resolve(JSON.stringify({ _id: 's1', images: {} })),
        });

      const xhr = createMockXHR(200, {
        public_id: 'p',
        secure_url: 'https://res.cloudinary.com/cn/x.jpg',
        url: 'http://x',
        width: 1,
        height: 1,
        bytes: 1,
        format: 'jpg',
      });
      // Track load handler so we can fire it after send
      let loadHandler: (() => void) | null = null;
      xhr.addEventListener.mockImplementation(
        (event: string, cb: () => void) => {
          if (event === 'load') loadHandler = cb;
        }
      );
      xhr.send.mockImplementation(() => {
        if (loadHandler) loadHandler();
      });

      function MockXHR() {
        return xhr;
      }
      (globalThis as unknown as Record<string, unknown>).XMLHttpRequest = MockXHR;

      const fakeFile = new File(['x'], 'a.jpg', { type: 'image/jpeg' });
      const result = await cloudinaryService.uploadAndAttach(fakeFile, {
        examId: 'e1',
        submissionId: 's1',
        type: 'original',
      });

      expect(result.publicId).toBe('p');
      expect(result.secureUrl).toBe('https://res.cloudinary.com/cn/x.jpg');
      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(mockFetch.mock.calls[0][0]).toContain('/api/v1/upload/signature');
      expect(mockFetch.mock.calls[1][0]).toContain(
        '/api/v1/submissions/s1/attach-image'
      );
      expect(xhr.open).toHaveBeenCalledWith('POST', sigResponse.uploadUrl);
    });
  });
});
