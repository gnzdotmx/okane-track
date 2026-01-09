// Mock dependencies - jest.mock() calls are hoisted to the top
jest.mock('express-validator', () => ({
  validationResult: jest.fn(),
}));

import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import { validate } from '../validation';

const mockValidationResult = validationResult as jest.MockedFunction<typeof validationResult>;

// Mock request and response objects
const createMockRequest = (overrides: any = {}): Request => {
  return {
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

describe('validate middleware', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('successful validation', () => {
    it('should call next when there are no validation errors', () => {
      const mockResult = {
        isEmpty: jest.fn().mockReturnValue(true),
        array: jest.fn().mockReturnValue([]),
      };
      mockValidationResult.mockReturnValue(mockResult as any);

      const req = createMockRequest();
      const res = createMockResponse();
      const next = createMockNext();

      validate(req, res, next);

      expect(mockValidationResult).toHaveBeenCalledWith(req);
      expect(mockResult.isEmpty).toHaveBeenCalled();
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
      expect(res.json).not.toHaveBeenCalled();
    });
  });

  describe('validation errors', () => {
    it('should return 400 when there are field validation errors', () => {
      const mockErrors = [
        {
          type: 'field' as const,
          path: 'email',
          msg: 'Email is required',
        },
        {
          type: 'field' as const,
          path: 'password',
          msg: 'Password must be at least 8 characters',
        },
      ];

      const mockResult = {
        isEmpty: jest.fn().mockReturnValue(false),
        array: jest.fn().mockReturnValue(mockErrors),
      };
      mockValidationResult.mockReturnValue(mockResult as any);

      const req = createMockRequest();
      const res = createMockResponse();
      const next = createMockNext();

      validate(req, res, next);

      expect(mockValidationResult).toHaveBeenCalledWith(req);
      expect(mockResult.isEmpty).toHaveBeenCalled();
      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Validation error',
        errors: [
          {
            field: 'email',
            message: 'Email is required',
          },
          {
            field: 'password',
            message: 'Password must be at least 8 characters',
          },
        ],
      });
    });

    it('should return 400 when there are non-field validation errors', () => {
      const mockErrors = [
        {
          type: 'alternative' as const,
          path: undefined,
          msg: 'Invalid input',
        },
        {
          type: 'unknown_fields' as const,
          path: undefined,
          msg: 'Unknown fields detected',
        },
      ];

      const mockResult = {
        isEmpty: jest.fn().mockReturnValue(false),
        array: jest.fn().mockReturnValue(mockErrors),
      };
      mockValidationResult.mockReturnValue(mockResult as any);

      const req = createMockRequest();
      const res = createMockResponse();
      const next = createMockNext();

      validate(req, res, next);

      expect(mockValidationResult).toHaveBeenCalledWith(req);
      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Validation error',
        errors: [
          {
            field: undefined,
            message: 'Invalid input',
          },
          {
            field: undefined,
            message: 'Unknown fields detected',
          },
        ],
      });
    });

    it('should return 400 with mixed field and non-field errors', () => {
      const mockErrors = [
        {
          type: 'field' as const,
          path: 'email',
          msg: 'Email is invalid',
        },
        {
          type: 'alternative' as const,
          path: undefined,
          msg: 'General validation failed',
        },
        {
          type: 'field' as const,
          path: 'age',
          msg: 'Age must be a number',
        },
      ];

      const mockResult = {
        isEmpty: jest.fn().mockReturnValue(false),
        array: jest.fn().mockReturnValue(mockErrors),
      };
      mockValidationResult.mockReturnValue(mockResult as any);

      const req = createMockRequest();
      const res = createMockResponse();
      const next = createMockNext();

      validate(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Validation error',
        errors: [
          {
            field: 'email',
            message: 'Email is invalid',
          },
          {
            field: undefined,
            message: 'General validation failed',
          },
          {
            field: 'age',
            message: 'Age must be a number',
          },
        ],
      });
    });

    it('should return 400 with single validation error', () => {
      const mockErrors = [
        {
          type: 'field' as const,
          path: 'name',
          msg: 'Name is required',
        },
      ];

      const mockResult = {
        isEmpty: jest.fn().mockReturnValue(false),
        array: jest.fn().mockReturnValue(mockErrors),
      };
      mockValidationResult.mockReturnValue(mockResult as any);

      const req = createMockRequest();
      const res = createMockResponse();
      const next = createMockNext();

      validate(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Validation error',
        errors: [
          {
            field: 'name',
            message: 'Name is required',
          },
        ],
      });
    });

    it('should handle errors with empty path', () => {
      const mockErrors = [
        {
          type: 'field' as const,
          path: '',
          msg: 'Validation failed',
        },
      ];

      const mockResult = {
        isEmpty: jest.fn().mockReturnValue(false),
        array: jest.fn().mockReturnValue(mockErrors),
      };
      mockValidationResult.mockReturnValue(mockResult as any);

      const req = createMockRequest();
      const res = createMockResponse();
      const next = createMockNext();

      validate(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Validation error',
        errors: [
          {
            field: '',
            message: 'Validation failed',
          },
        ],
      });
    });

    it('should handle errors with empty message', () => {
      const mockErrors = [
        {
          type: 'field' as const,
          path: 'email',
          msg: '',
        },
      ];

      const mockResult = {
        isEmpty: jest.fn().mockReturnValue(false),
        array: jest.fn().mockReturnValue(mockErrors),
      };
      mockValidationResult.mockReturnValue(mockResult as any);

      const req = createMockRequest();
      const res = createMockResponse();
      const next = createMockNext();

      validate(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Validation error',
        errors: [
          {
            field: 'email',
            message: '',
          },
        ],
      });
    });
  });
});

