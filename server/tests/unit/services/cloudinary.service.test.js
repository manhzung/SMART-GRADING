jest.mock('cloudinary', () => {
  const mockUploader = {
    upload: jest.fn(),
    destroy: jest.fn(),
  };
  const mockUtils = {
    api_sign_request: jest.fn(() => 'mock-signature'),
  };
  return {
    v2: {
      config: jest.fn(),
      uploader: mockUploader,
      utils: mockUtils,
    },
  };
});

const config = require('../../../src/config/config');

describe('CloudinaryService.generateUploadSignature', () => {
  beforeAll(() => {
    config.cloudinary.cloud_name = 'test-cloud';
    config.cloudinary.api_key = 'test-key';
    config.cloudinary.api_secret = 'test-secret';
  });

  it('returns signature with required fields', () => {
    const CloudinaryService = require('../../../src/services/cloudinary.service');
    const sig = CloudinaryService.generateUploadSignature({
      userId: 'u1',
      examId: 'e1',
      submissionId: 's1',
      type: 'original',
    });

    expect(sig).toEqual(
      expect.objectContaining({
        signature: expect.any(String),
        apiKey: 'test-key',
        cloudName: 'test-cloud',
        timestamp: expect.any(Number),
        folder: 'submissions/e1/s1/original',
        publicId: 'submissions/e1/s1/original',
        uploadUrl: 'https://api.cloudinary.com/v1_1/test-cloud/image/upload',
        expiresIn: 300,
      })
    );
    expect(sig.signature.length).toBeGreaterThan(10);
  });

  it('uses "pending" when submissionId is missing', () => {
    const CloudinaryService = require('../../../src/services/cloudinary.service');
    const sig = CloudinaryService.generateUploadSignature({
      userId: 'u1',
      examId: 'e1',
      type: 'preprocessed',
    });
    expect(sig.folder).toBe('submissions/e1/pending/preprocessed');
  });

  it('throws when Cloudinary env vars are missing', () => {
    const CloudinaryService = require('../../../src/services/cloudinary.service');
    const original = config.cloudinary.cloud_name;
    config.cloudinary.cloud_name = '';
    try {
      expect(() =>
        CloudinaryService.generateUploadSignature({
          userId: 'u1',
          examId: 'e1',
          type: 'original',
        })
      ).toThrow(/Cloudinary/);
    } finally {
      config.cloudinary.cloud_name = original;
    }
  });
});

describe('CloudinaryService.uploadBuffer', () => {
  let CloudinaryService;
  let mockUploader;

  beforeAll(() => {
    config.cloudinary.cloud_name = 'test-cloud';
    config.cloudinary.api_key = 'test-key';
    config.cloudinary.api_secret = 'test-secret';
    CloudinaryService = require('../../../src/services/cloudinary.service');
    mockUploader = require('cloudinary').v2.uploader;
  });

  beforeEach(() => {
    mockUploader.upload.mockReset();
  });

  it('uploads buffer and returns mapped result', async () => {
    mockUploader.upload.mockResolvedValueOnce({
      public_id: 'submissions/e1/s1/original',
      secure_url: 'https://res.cloudinary.com/test-cloud/image/upload/v1/submissions/e1/s1/original.jpg',
      url: 'http://res.cloudinary.com/test-cloud/image/upload/v1/submissions/e1/s1/original.jpg',
      width: 800,
      height: 600,
      bytes: 12345,
      format: 'jpg',
    });

    const result = await CloudinaryService.uploadBuffer(Buffer.from('xx'), {
      folder: 'submissions/e1/s1/original',
      publicId: 'submissions/e1/s1/original',
    });

    expect(result).toEqual({
      publicId: 'submissions/e1/s1/original',
      url: 'http://res.cloudinary.com/test-cloud/image/upload/v1/submissions/e1/s1/original.jpg',
      secureUrl: 'https://res.cloudinary.com/test-cloud/image/upload/v1/submissions/e1/s1/original.jpg',
      width: 800,
      height: 600,
      bytes: 12345,
      format: 'jpg',
    });
    expect(mockUploader.upload).toHaveBeenCalledWith(
      expect.any(Buffer),
      expect.objectContaining({ folder: 'submissions/e1/s1/original', public_id: 'submissions/e1/s1/original' })
    );
  });

  it('retries on transient failure then succeeds', async () => {
    mockUploader.upload.mockRejectedValueOnce({ http_code: 500, message: 'boom' }).mockResolvedValueOnce({
      public_id: 'p',
      secure_url: 'https://x/y',
      url: 'http://x/y',
      width: 1,
      height: 1,
      bytes: 1,
      format: 'jpg',
    });

    const result = await CloudinaryService.uploadBuffer(Buffer.from('x'), {
      folder: 'f',
      publicId: 'p',
    });
    expect(result.publicId).toBe('p');
    expect(mockUploader.upload).toHaveBeenCalledTimes(2);
  });

  it('throws CloudinaryError after exhausting retries', async () => {
    mockUploader.upload.mockRejectedValue({ http_code: 500, message: 'dead' });
    await expect(CloudinaryService.uploadBuffer(Buffer.from('x'), { folder: 'f', publicId: 'p' })).rejects.toThrow(
      /Cloudinary/
    );
    expect(mockUploader.upload).toHaveBeenCalledTimes(3);
  });
});

describe('CloudinaryService.uploadBase64', () => {
  let CloudinaryService;
  let mockUploader;

  beforeAll(() => {
    config.cloudinary.cloud_name = 'test-cloud';
    config.cloudinary.api_key = 'test-key';
    config.cloudinary.api_secret = 'test-secret';
    CloudinaryService = require('../../../src/services/cloudinary.service');
    mockUploader = require('cloudinary').v2.uploader;
  });

  it('strips data URI prefix and uploads', async () => {
    mockUploader.upload.mockReset();
    mockUploader.upload.mockResolvedValueOnce({
      public_id: 'p',
      secure_url: 'https://x/y',
      url: 'http://x/y',
      width: 1,
      height: 1,
      bytes: 1,
      format: 'jpg',
    });
    const dataUri = 'data:image/jpeg;base64,/9j/abc';
    const result = await CloudinaryService.uploadBase64(dataUri, {
      folder: 'f',
      publicId: 'p',
    });
    expect(result.publicId).toBe('p');
    const callArg = mockUploader.upload.mock.calls[0][0];
    expect(callArg).not.toContain('data:image/jpeg;base64,');
    expect(callArg).toBe('/9j/abc');
  });
});

describe('CloudinaryService.destroy', () => {
  let CloudinaryService;
  let mockUploader;

  beforeAll(() => {
    config.cloudinary.cloud_name = 'test-cloud';
    config.cloudinary.api_key = 'test-key';
    config.cloudinary.api_secret = 'test-secret';
    CloudinaryService = require('../../../src/services/cloudinary.service');
    mockUploader = require('cloudinary').v2.uploader;
  });

  beforeEach(() => mockUploader.destroy.mockReset());

  it('returns result=ok on success', async () => {
    mockUploader.destroy.mockResolvedValueOnce({ result: 'ok' });
    const out = await CloudinaryService.destroy('submissions/e1/s1/original');
    expect(out).toEqual({ result: 'ok' });
    expect(mockUploader.destroy).toHaveBeenCalledWith('submissions/e1/s1/original');
  });

  it('returns result=not_found without throwing', async () => {
    mockUploader.destroy.mockResolvedValueOnce({ result: 'not found' });
    const out = await CloudinaryService.destroy('does/not/exist');
    expect(out.result).toBe('not_found');
  });
});
