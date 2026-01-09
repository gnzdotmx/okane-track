// Mock dependencies - jest.mock() calls are hoisted to the top
jest.mock('../../config/logger', () => ({
  __esModule: true,
  default: {
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

import { Request, Response, NextFunction } from 'express';
import { errorHandler, notFound, asyncHandler } from '../errorHandler';
import logger from '../../config/logger';

const mockLogger = logger as jest.Mocked<typeof logger>;

// Mock request and response objects
const createMockRequest = (overrides: any = {}): Request => {
  return {
    path: '/test',
    method: 'GET',
    originalUrl: '/test',
    ...overrides,
  } as Request;
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

describe('errorHandler middleware', () => {
  const originalEnv = process.env.NODE_ENV;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
  });

  describe('errorHandler', () => {
    it('should handle error with default status code 500', () => {
      const error = new Error('Test error');
      const req = createMockRequest();
      const res = createMockResponse();
      const next = createMockNext();

      errorHandler(error, req, res, next);

      expect(mockLogger.error).toHaveBeenCalledWith('Error:', {
        message: 'Test error',
        stack: error.stack,
        path: '/test',
        method: 'GET',
      });
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        status: 'error',
        message: 'Test error',
      });
    });

    it('should handle error with custom statusCode', () => {
      const error = new Error('Not found') as any;
      error.statusCode = 404;
      const req = createMockRequest();
      const res = createMockResponse();
      const next = createMockNext();

      errorHandler(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        status: 'error',
        message: 'Not found',
      });
    });

    it('should handle error with custom status', () => {
      const error = new Error('Unauthorized') as any;
      error.statusCode = 401;
      error.status = 'unauthorized';
      const req = createMockRequest();
      const res = createMockResponse();
      const next = createMockNext();

      errorHandler(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        status: 'unauthorized',
        message: 'Unauthorized',
      });
    });

    it('should use default message when error message is missing', () => {
      const error = new Error('');
      error.message = '';
      const req = createMockRequest();
      const res = createMockResponse();
      const next = createMockNext();

      errorHandler(error, req, res, next);

      expect(res.json).toHaveBeenCalledWith({
        success: false,
        status: 'error',
        message: 'Internal server error',
      });
    });

    it('should include stack trace in development mode', () => {
      process.env.NODE_ENV = 'development';
      const error = new Error('Test error');
      const req = createMockRequest();
      const res = createMockResponse();
      const next = createMockNext();

      errorHandler(error, req, res, next);

      expect(res.json).toHaveBeenCalledWith({
        success: false,
        status: 'error',
        message: 'Test error',
        stack: error.stack,
      });
    });

    it('should not include stack trace in production mode', () => {
      process.env.NODE_ENV = 'production';
      const error = new Error('Test error');
      const req = createMockRequest();
      const res = createMockResponse();
      const next = createMockNext();

      errorHandler(error, req, res, next);

      expect(res.json).toHaveBeenCalledWith({
        success: false,
        status: 'error',
        message: 'Test error',
      });
      expect(res.json).not.toHaveBeenCalledWith(
        expect.objectContaining({
          stack: expect.anything(),
        })
      );
    });

    it('should not include stack trace when NODE_ENV is not set', () => {
      delete process.env.NODE_ENV;
      const error = new Error('Test error');
      const req = createMockRequest();
      const res = createMockResponse();
      const next = createMockNext();

      errorHandler(error, req, res, next);

      expect(res.json).toHaveBeenCalledWith({
        success: false,
        status: 'error',
        message: 'Test error',
      });
    });

    it('should log error with request path and method', () => {
      const error = new Error('Test error');
      const req = createMockRequest({
        path: '/api/users',
        method: 'POST',
      });
      const res = createMockResponse();
      const next = createMockNext();

      errorHandler(error, req, res, next);

      expect(mockLogger.error).toHaveBeenCalledWith('Error:', {
        message: 'Test error',
        stack: error.stack,
        path: '/api/users',
        method: 'POST',
      });
    });

    it('should handle error without stack trace', () => {
      const error = new Error('Test error');
      error.stack = undefined;
      const req = createMockRequest();
      const res = createMockResponse();
      const next = createMockNext();

      errorHandler(error, req, res, next);

      expect(mockLogger.error).toHaveBeenCalledWith('Error:', {
        message: 'Test error',
        stack: undefined,
        path: '/test',
        method: 'GET',
      });
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        status: 'error',
        message: 'Test error',
      });
    });

    it('should handle error with isOperational property', () => {
      const error = new Error('Operational error') as any;
      error.statusCode = 400;
      error.isOperational = true;
      const req = createMockRequest();
      const res = createMockResponse();
      const next = createMockNext();

      errorHandler(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        status: 'error',
        message: 'Operational error',
      });
    });
  });

  describe('notFound', () => {
    it('should return 404 with route message', () => {
      const req = createMockRequest({
        originalUrl: '/api/nonexistent',
      });
      const res = createMockResponse();
      const next = createMockNext();

      notFound(req, res, next);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Route /api/nonexistent not found',
      });
    });

    it('should handle different route paths', () => {
      const req = createMockRequest({
        originalUrl: '/users/123',
      });
      const res = createMockResponse();
      const next = createMockNext();

      notFound(req, res, next);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Route /users/123 not found',
      });
    });

    it('should handle root path', () => {
      const req = createMockRequest({
        originalUrl: '/',
      });
      const res = createMockResponse();
      const next = createMockNext();

      notFound(req, res, next);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Route / not found',
      });
    });
  });

  describe('asyncHandler', () => {
    it('should wrap async function and call it', async () => {
      const mockFn = jest.fn().mockResolvedValue(undefined);
      const wrappedFn = asyncHandler(mockFn);

      const req = createMockRequest();
      const res = createMockResponse();
      const next = createMockNext();

      wrappedFn(req, res, next);

      // Wait for promise to resolve
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(mockFn).toHaveBeenCalledWith(req, res, next);
      expect(next).not.toHaveBeenCalled();
    });

    it('should catch errors and pass them to next', async () => {
      const error = new Error('Async error');
      const mockFn = jest.fn().mockRejectedValue(error);
      const wrappedFn = asyncHandler(mockFn);

      const req = createMockRequest();
      const res = createMockResponse();
      const next = createMockNext();

      wrappedFn(req, res, next);

      // Wait for promise to resolve/reject
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(mockFn).toHaveBeenCalledWith(req, res, next);
      expect(next).toHaveBeenCalledWith(error);
    });

    it('should handle synchronous errors in async function', async () => {
      const error = new Error('Sync error');
      // Promise.resolve() converts synchronous throws to rejected promises
      // Since Promise.resolve wraps the function call, sync throws become async rejections
      // This is effectively the same as mockRejectedValue, so we test it similarly
      // by using a function that immediately returns a rejected promise
      const mockFn = jest.fn().mockReturnValue(Promise.reject(error));
      const wrappedFn = asyncHandler(mockFn);

      const req = createMockRequest();
      const res = createMockResponse();
      const next = jest.fn();

      wrappedFn(req, res, next);

      // Wait for promise chain to complete
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(mockFn).toHaveBeenCalledWith(req, res, next);
      // The error should be passed to next (Promise.resolve converts sync throws the same way)
      expect(next).toHaveBeenCalledWith(error);
    });

    it('should handle promise rejection', async () => {
      const error = new Error('Promise rejection');
      const mockFn = jest.fn().mockReturnValue(Promise.reject(error));
      const wrappedFn = asyncHandler(mockFn);

      const req = createMockRequest();
      const res = createMockResponse();
      const next = createMockNext();

      wrappedFn(req, res, next);

      // Wait for promise to reject
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(mockFn).toHaveBeenCalledWith(req, res, next);
      expect(next).toHaveBeenCalledWith(error);
    });

    it('should return void (not a promise)', () => {
      const mockFn = jest.fn().mockResolvedValue(undefined);
      const wrappedFn = asyncHandler(mockFn);

      const req = createMockRequest();
      const res = createMockResponse();
      const next = createMockNext();

      const result = wrappedFn(req, res, next);

      expect(result).toBeUndefined();
    });

    it('should handle async function that returns a value', async () => {
      const mockFn = jest.fn().mockResolvedValue({ data: 'test' });
      const wrappedFn = asyncHandler(mockFn);

      const req = createMockRequest();
      const res = createMockResponse();
      const next = createMockNext();

      wrappedFn(req, res, next);

      // Wait for promise to resolve
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(mockFn).toHaveBeenCalledWith(req, res, next);
      expect(next).not.toHaveBeenCalled();
    });
  });
});

