const {
  extractPublicIdFromUrl,
  assertIsCloudinaryUrl,
  buildFolder,
} = require('../../../src/utils/cloudinary.util');

describe('cloudinary.util', () => {
  describe('extractPublicIdFromUrl', () => {
    it('extracts publicId from standard Cloudinary URL', () => {
      const url = 'https://res.cloudinary.com/smart-grading/image/upload/v1234/submissions/exam1/sub1/original.jpg';
      expect(extractPublicIdFromUrl(url)).toBe('submissions/exam1/sub1/original');
    });

    it('extracts publicId from URL without version', () => {
      const url = 'https://res.cloudinary.com/smart-grading/image/upload/submissions/exam1/sub1/original.png';
      expect(extractPublicIdFromUrl(url)).toBe('submissions/exam1/sub1/original');
    });

    it('returns null for non-Cloudinary URL', () => {
      expect(extractPublicIdFromUrl('https://example.com/foo.jpg')).toBeNull();
    });

    it('returns null for invalid input', () => {
      expect(extractPublicIdFromUrl(null)).toBeNull();
      expect(extractPublicIdFromUrl('')).toBeNull();
    });
  });

  describe('assertIsCloudinaryUrl', () => {
    it('does not throw for valid Cloudinary URL', () => {
      expect(() =>
        assertIsCloudinaryUrl('https://res.cloudinary.com/smart-grading/image/upload/x.jpg', 'smart-grading')
      ).not.toThrow();
    });

    it('throws for URL from different cloud', () => {
      expect(() =>
        assertIsCloudinaryUrl('https://res.cloudinary.com/other-cloud/image/upload/x.jpg', 'smart-grading')
      ).toThrow(/not the expected cloud/);
    });

    it('throws for non-Cloudinary URL', () => {
      expect(() =>
        assertIsCloudinaryUrl('https://example.com/x.jpg', 'smart-grading')
      ).toThrow();
    });
  });

  describe('buildFolder', () => {
    it('joins examId, submissionId or "pending", and type', () => {
      expect(buildFolder('exam1', 'sub1', 'original')).toBe('submissions/exam1/sub1/original');
    });

    it('uses "pending" when submissionId is missing', () => {
      expect(buildFolder('exam1', null, 'original')).toBe('submissions/exam1/pending/original');
    });
  });
});
