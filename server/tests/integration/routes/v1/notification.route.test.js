const request = require('supertest');
const express = require('express');

// Mock the controller BEFORE requiring the route, so the router's
// already-bound handler references our spies.
const mockController = {
  markAsRead: jest.fn((req, res) => res.status(200).send({ _id: req.params.id, isRead: true })),
  markAllAsRead: jest.fn((req, res) => res.status(204).send()),
  getAll: jest.fn((_req, res) => res.status(200).send({ results: [], page: 1, limit: 20, total: 0, pages: 0 })),
  getUnreadCount: jest.fn((_req, res) => res.status(200).send({ unreadCount: 0 })),
  remove: jest.fn((_req, res) => res.status(204).send()),
};

jest.mock('../../../../src/controllers/notification.controller', () => mockController);

// Mock auth middleware - skip auth checks
jest.mock('../../../../src/middlewares/auth', () => () => (req, _res, next) => {
  req.user = { id: 'user1' };
  next();
});

// Mock validation middleware - pass-through
jest.mock('../../../../src/middlewares/validate', () => () => (_req, _res, next) => next());

// Build a minimal Express app with the real router to verify route registration.
const app = express();
app.use(express.json());
app.use('/api/v1/notifications', require('../../../../src/routes/v1/notification.route'));

describe('Notification routes - HTTP method & path registration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('PATCH /api/v1/notifications/:id', () => {
    it('is registered and invokes the markAsRead controller', async () => {
      const notificationId = '6a406630f259b51804cc2257';

      await request(app).patch(`/api/v1/notifications/${notificationId}`).send({ isRead: true }).expect(200);

      expect(mockController.markAsRead).toHaveBeenCalledTimes(1);
      const req = mockController.markAsRead.mock.calls[0][0];
      expect(req.params.id).toBe(notificationId);
    });

    it('is matched before the DELETE /:id route (does not 405)', async () => {
      await request(app).patch('/api/v1/notifications/6a406630f259b51804cc2257').send({ isRead: true }).expect(200);
    });
  });

  describe('PATCH /api/v1/notifications/read-all', () => {
    it('is registered and invokes the markAllAsRead controller', async () => {
      await request(app).patch('/api/v1/notifications/read-all').send({}).expect(204);

      expect(mockController.markAllAsRead).toHaveBeenCalledTimes(1);
    });
  });

  describe('Regression - existing endpoints still work', () => {
    it('GET / is still routed', async () => {
      await request(app).get('/api/v1/notifications').expect(200);
      expect(mockController.getAll).toHaveBeenCalledTimes(1);
    });

    it('DELETE /:id is still routed', async () => {
      await request(app).delete('/api/v1/notifications/6a406630f259b51804cc2257').expect(204);
      expect(mockController.remove).toHaveBeenCalledTimes(1);
    });
  });
});
