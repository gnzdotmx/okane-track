// Mock dependencies - jest.mock() calls are hoisted to the top
jest.mock('jsonwebtoken', () => {
  const actualJwt = jest.requireActual('jsonwebtoken');
  return {
    ...actualJwt,
    verify: jest.fn(),
  };
});
jest.mock('../../config', () => ({
  __esModule: true,
  default: {
    jwt: {
      secret: 'test-secret-key',
      expiresIn: '7d',
    },
  },
}));
jest.mock('../../config/logger', () => ({
  __esModule: true,
  default: {
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { authenticate } from '../auth';
import { AuthRequest } from '../../types';
import config from '../../config';
import logger from '../../config/logger';

const mockJwt = jwt as jest.Mocked<typeof jwt>;
const mockConfig = config as jest.Mocked<typeof config>;
const mockLogger = logger as jest.Mocked<typeof logger>;

// Mock request and response objects
const createMockRequest = (overrides: any = {}): AuthRequest => {
  return {
    headers: {},
    ...overrides,
  } as AuthRequest;
};

const createMockResponse = (): Response => {
  const res = {} as Response;
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

const createMockNext = (): NextFunction => {
  return jest.fn();
};

describe('authenticate middleware', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockConfig.jwt = {
      secret: 'test-secret-key',
      expiresIn: '7d',
    };
    mockLogger.error = jest.fn();
  });

  describe('successful authentication', () => {
    it('should authenticate user with valid Bearer token', async () => {
      const mockDecoded = {
        id: 'user-123',
        email: 'test@example.com',
      };

      mockJwt.verify = jest.fn().mockReturnValue(mockDecoded);

      const req = createMockRequest({
        headers: {
          authorization: 'Bearer valid-token-123',
        },
      });
      const res = createMockResponse();
      const next = createMockNext();

      await authenticate(req, res, next);

      expect(mockJwt.verify).toHaveBeenCalledWith('valid-token-123', 'test-secret-key');
      expect(req.user).toEqual({
        id: 'user-123',
        email: 'test@example.com',
      });
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
      expect(res.json).not.toHaveBeenCalled();
    });

    it('should handle token with extra spaces', async () => {
      const mockDecoded = {
        id: 'user-123',
        email: 'test@example.com',
      };

      mockJwt.verify = jest.fn().mockReturnValue(mockDecoded);

      const req = createMockRequest({
        headers: {
          authorization: 'Bearer  valid-token-123  ',
        },
      });
      const res = createMockResponse();
      const next = createMockNext();

      await authenticate(req, res, next);

      // Token should be extracted correctly (substring(7) removes 'Bearer ')
      expect(mockJwt.verify).toHaveBeenCalledWith(' valid-token-123  ', 'test-secret-key');
      expect(req.user).toEqual({
        id: 'user-123',
        email: 'test@example.com',
      });
      expect(next).toHaveBeenCalled();
    });
  });

  describe('missing or invalid authorization header', () => {
    it('should return 401 when authorization header is missing', async () => {
      const req = createMockRequest({
        headers: {},
      });
      const res = createMockResponse();
      const next = createMockNext();

      await authenticate(req, res, next);

      expect(mockJwt.verify).not.toHaveBeenCalled();
      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'No token provided. Please authenticate.',
      });
    });

    it('should return 401 when authorization header is null', async () => {
      const req = createMockRequest({
        headers: {
          authorization: null as any,
        },
      });
      const res = createMockResponse();
      const next = createMockNext();

      await authenticate(req, res, next);

      expect(mockJwt.verify).not.toHaveBeenCalled();
      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'No token provided. Please authenticate.',
      });
    });

    it('should return 401 when authorization header does not start with Bearer', async () => {
      const req = createMockRequest({
        headers: {
          authorization: 'InvalidFormat token-123',
        },
      });
      const res = createMockResponse();
      const next = createMockNext();

      await authenticate(req, res, next);

      expect(mockJwt.verify).not.toHaveBeenCalled();
      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'No token provided. Please authenticate.',
      });
    });

    it('should return 401 when authorization header is empty string', async () => {
      const req = createMockRequest({
        headers: {
          authorization: '',
        },
      });
      const res = createMockResponse();
      const next = createMockNext();

      await authenticate(req, res, next);

      expect(mockJwt.verify).not.toHaveBeenCalled();
      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'No token provided. Please authenticate.',
      });
    });

    it('should return 401 when authorization header is just "Bearer" without token', async () => {
      const req = createMockRequest({
        headers: {
          authorization: 'Bearer',
        },
      });
      const res = createMockResponse();
      const next = createMockNext();

      await authenticate(req, res, next);

      // 'Bearer' does not start with 'Bearer ' (note the space), so it will return 401
      // before attempting to verify the token
      expect(mockJwt.verify).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'No token provided. Please authenticate.',
      });
    });
  });

  describe('JWT verification errors', () => {
    it('should return 401 when token is invalid (JsonWebTokenError)', async () => {
      const jsonWebTokenError = new jwt.JsonWebTokenError('Invalid token');
      mockJwt.verify = jest.fn().mockImplementation(() => {
        throw jsonWebTokenError;
      });

      const req = createMockRequest({
        headers: {
          authorization: 'Bearer invalid-token',
        },
      });
      const res = createMockResponse();
      const next = createMockNext();

      await authenticate(req, res, next);

      expect(mockJwt.verify).toHaveBeenCalledWith('invalid-token', 'test-secret-key');
      expect(mockLogger.error).toHaveBeenCalledWith('Authentication error:', jsonWebTokenError);
      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Invalid token',
      });
    });

    it('should return 401 when token is expired (TokenExpiredError)', async () => {
      const tokenExpiredError = new jwt.TokenExpiredError('Token expired', new Date());
      mockJwt.verify = jest.fn().mockImplementation(() => {
        throw tokenExpiredError;
      });

      const req = createMockRequest({
        headers: {
          authorization: 'Bearer expired-token',
        },
      });
      const res = createMockResponse();
      const next = createMockNext();

      await authenticate(req, res, next);

      expect(mockJwt.verify).toHaveBeenCalledWith('expired-token', 'test-secret-key');
      expect(mockLogger.error).toHaveBeenCalledWith('Authentication error:', tokenExpiredError);
      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Token expired',
      });
    });

    it('should return 500 when unexpected error occurs', async () => {
      const unexpectedError = new Error('Unexpected error');
      mockJwt.verify = jest.fn().mockImplementation(() => {
        throw unexpectedError;
      });

      const req = createMockRequest({
        headers: {
          authorization: 'Bearer some-token',
        },
      });
      const res = createMockResponse();
      const next = createMockNext();

      await authenticate(req, res, next);

      expect(mockJwt.verify).toHaveBeenCalledWith('some-token', 'test-secret-key');
      expect(mockLogger.error).toHaveBeenCalledWith('Authentication error:', unexpectedError);
      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Internal server error',
      });
    });
  });

  describe('edge cases', () => {
    it('should handle case-insensitive Bearer prefix', async () => {
      const mockDecoded = {
        id: 'user-123',
        email: 'test@example.com',
      };

      mockJwt.verify = jest.fn().mockReturnValue(mockDecoded);

      const req = createMockRequest({
        headers: {
          authorization: 'bearer valid-token-123',
        },
      });
      const res = createMockResponse();
      const next = createMockNext();

      await authenticate(req, res, next);

      // Note: The code checks for 'Bearer ' (case-sensitive), so 'bearer' won't work
      // This test verifies that behavior
      expect(mockJwt.verify).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(401);
    });

    it('should extract token correctly from Bearer string', async () => {
      const mockDecoded = {
        id: 'user-123',
        email: 'test@example.com',
      };

      mockJwt.verify = jest.fn().mockReturnValue(mockDecoded);

      const token = 'my-special-token-123';
      const req = createMockRequest({
        headers: {
          authorization: `Bearer ${token}`,
        },
      });
      const res = createMockResponse();
      const next = createMockNext();

      await authenticate(req, res, next);

      // Verify that substring(7) correctly extracts the token
      expect(mockJwt.verify).toHaveBeenCalledWith(token, 'test-secret-key');
      expect(req.user).toEqual({
        id: 'user-123',
        email: 'test@example.com',
      });
    });

    it('should not modify request user if authentication fails', async () => {
      const jsonWebTokenError = new jwt.JsonWebTokenError('Invalid token');
      mockJwt.verify = jest.fn().mockImplementation(() => {
        throw jsonWebTokenError;
      });

      const req = createMockRequest({
        headers: {
          authorization: 'Bearer invalid-token',
        },
        user: undefined,
      });
      const res = createMockResponse();
      const next = createMockNext();

      await authenticate(req, res, next);

      expect(req.user).toBeUndefined();
      expect(res.status).toHaveBeenCalledWith(401);
    });
  });
});

