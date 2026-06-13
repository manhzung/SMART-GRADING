const request = require('supertest');
const httpStatus = require('http-status');

process.env.CLOUDINARY_CLOUD_NAME = 'test-cloud';
process.env.CLOUDINARY_API_KEY = 'test-key';
process.env.CLOUDINARY_API_SECRET = 'test-secret';
process.env.UPLOAD_MODE = 'cloudinary';

const app = require('../../../../src/app');
const setupTestDB = require('../../../utils/setupTestDB');
const { userOne, insertUsers } = require('../../../fixtures/user.fixture');
const { schoolA, insertSchools } = require('../../../fixtures/school.fixture');
const { userOneAccessToken } = require('../../../fixtures/token.fixture');
const { submissionOne, insertSubmissions } = require('../../../fixtures/submission.fixture');

setupTestDB();

jest.mock('cloudinary', () => ({
  v2: {
    config: jest.fn(),
    uploader: {
      upload: jest.fn(),
      destroy: jest.fn().mockResolvedValue({ result: 'ok' }),
    },
    utils: { api_sign_request: jest.fn(() => 'mock-signature') },
  },
}));

describe('Upload routes', () => {
  beforeEach(async () => {
    await insertSchools([schoolA]);
    await insertUsers([userOne]);
  });

  describe('GET /api/v1/upload/signature', () => {
    it('returns 401 without auth', async () => {
      await request(app)
        .get('/api/v1/upload/signature?examId=664f00000000000000000000&type=original')
        .expect(httpStatus.UNAUTHORIZED);
    });

    it('returns 400 for missing examId', async () => {
      await request(app)
        .get('/api/v1/upload/signature?type=original')
        .set('Authorization', `Bearer ${userOneAccessToken}`)
        .expect(httpStatus.BAD_REQUEST);
    });

    it('returns 200 with signature fields for valid request', async () => {
      const examId = '664f00000000000000000000';
      const res = await request(app)
        .get(`/api/v1/upload/signature?examId=${examId}&type=original`)
        .set('Authorization', `Bearer ${userOneAccessToken}`)
        .expect(httpStatus.OK);

      expect(res.body).toEqual(
        expect.objectContaining({
          signature: expect.any(String),
          apiKey: 'test-key',
          cloudName: 'test-cloud',
          timestamp: expect.any(Number),
          folder: `submissions/${examId}/pending/original`,
          publicId: `submissions/${examId}/pending/original`,
          uploadUrl: expect.stringContaining('test-cloud'),
          expiresIn: 300,
        })
      );
    });
  });

  describe('POST /api/v1/submissions/:id/attach-image', () => {
    let sub;
    beforeEach(async () => {
      sub = { ...submissionOne };
      await insertSubmissions([sub]);
    });

    it('attaches original image and writes to submission', async () => {
      const res = await request(app)
        .post(`/api/v1/submissions/${submissionOne._id}/attach-image`)
        .set('Authorization', `Bearer ${userOneAccessToken}`)
        .send({
          type: 'original',
          url: 'https://res.cloudinary.com/test-cloud/image/upload/v1/submissions/x/y/original.jpg',
          publicId: 'submissions/x/y/original',
          width: 800,
          height: 600,
          bytes: 12345,
          format: 'jpg',
        })
        .expect(httpStatus.OK);

      expect(res.body.images.original.url).toContain('test-cloud');
      expect(res.body.images.original.publicId).toBe('submissions/x/y/original');
    });

    it('rejects non-Cloudinary URL', async () => {
      await request(app)
        .post(`/api/v1/submissions/${submissionOne._id}/attach-image`)
        .set('Authorization', `Bearer ${userOneAccessToken}`)
        .send({
          type: 'original',
          url: 'https://example.com/x.jpg',
          publicId: 'x',
        })
        .expect(httpStatus.BAD_REQUEST);
    });
  });

  describe('DELETE /api/v1/submissions/:id/image/:type', () => {
    beforeEach(async () => {
      submissionOne.images = {
        original: {
          publicId: 'submissions/x/y/original',
          url: 'https://res.cloudinary.com/test-cloud/image/upload/v1/x.jpg',
        },
      };
      await insertSubmissions([submissionOne]);
    });

    it('removes the image and calls Cloudinary destroy', async () => {
      const cloudinary = require('cloudinary');
      const res = await request(app)
        .delete(`/api/v1/submissions/${submissionOne._id}/image/original`)
        .set('Authorization', `Bearer ${userOneAccessToken}`)
        .expect(httpStatus.OK);
      expect(res.body.images.original).toBeUndefined();
      expect(cloudinary.v2.uploader.destroy).toHaveBeenCalledWith('submissions/x/y/original');
    });
  });
});
