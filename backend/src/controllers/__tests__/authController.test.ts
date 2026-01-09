// Mock dependencies - jest.mock() calls are hoisted to the top
jest.mock('../../services/authService');

import { Response } from 'express';
import authController from '../authController';
import authService from '../../services/authService';
import { AuthRequest } from '../../types';

const mockAuthService = authService as jest.Mocked<typeof authService>;

// Mock request and response objects
const createMockRequest = (overrides: any = {}): AuthRequest => {
  return {
    user: {
      id: 'user-123',
      email: 'test@example.com',
    },
    params: {},
    body: {},
    ...overrides,
  } as AuthRequest;
};

const createMockResponse = (): Response => {
  const res = {} as Response;
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

// Helper to wait for async handler to complete
// Since asyncHandler returns void but creates a Promise internally,
// we need to wait a bit for the Promise to resolve
const waitForAsyncHandler = () => new Promise(resolve => setTimeout(resolve, 0));

describe('AuthController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('register', () => {
    it('should register a new user successfully', async () => {
      const mockResult = {
        user: {
          id: 'user-123',
          email: 'test@example.com',
          firstName: 'John',
          lastName: 'Doe',
        },
        token: 'mock-jwt-token',
      };

      mockAuthService.register.mockResolvedValue(mockResult);

      const req = createMockRequest({
        body: {
          email: 'test@example.com',
          password: 'password123',
          firstName: 'John',
          lastName: 'Doe',
        },
      });
      const res = createMockResponse();

      authController.register(req, res, jest.fn());
      await waitForAsyncHandler();

      expect(mockAuthService.register).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
        firstName: 'John',
        lastName: 'Doe',
      });
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'User registered successfully',
        data: mockResult,
      });
    });

    it('should handle errors when registration fails', async () => {
      const error = new Error('User with this email already exists');
      mockAuthService.register.mockRejectedValue(error);

      const req = createMockRequest({
        body: {
          email: 'existing@example.com',
          password: 'password123',
          firstName: 'John',
          lastName: 'Doe',
        },
      });
      const res = createMockResponse();
      const next = jest.fn();

      authController.register(req, res, next);
      await waitForAsyncHandler();

      expect(next).toHaveBeenCalledWith(error);
    });

    it('should handle missing required fields', async () => {
      const error = new Error('Missing required fields');
      mockAuthService.register.mockRejectedValue(error);

      const req = createMockRequest({
        body: {
          email: 'test@example.com',
          // Missing password, firstName, lastName
        },
      });
      const res = createMockResponse();
      const next = jest.fn();

      authController.register(req, res, next);
      await waitForAsyncHandler();

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe('login', () => {
    it('should login user successfully', async () => {
      const mockResult = {
        user: {
          id: 'user-123',
          email: 'test@example.com',
          firstName: 'John',
          lastName: 'Doe',
        },
        token: 'mock-jwt-token',
      };

      mockAuthService.login.mockResolvedValue(mockResult);

      const req = createMockRequest({
        body: {
          email: 'test@example.com',
          password: 'password123',
        },
      });
      const res = createMockResponse();

      authController.login(req, res, jest.fn());
      await waitForAsyncHandler();

      expect(mockAuthService.login).toHaveBeenCalledWith(
        'test@example.com',
        'password123'
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Login successful',
        data: mockResult,
      });
    });

    it('should handle invalid credentials', async () => {
      const error = new Error('Invalid credentials');
      mockAuthService.login.mockRejectedValue(error);

      const req = createMockRequest({
        body: {
          email: 'test@example.com',
          password: 'wrongpassword',
        },
      });
      const res = createMockResponse();
      const next = jest.fn();

      authController.login(req, res, next);
      await waitForAsyncHandler();

      expect(mockAuthService.login).toHaveBeenCalledWith(
        'test@example.com',
        'wrongpassword'
      );
      expect(next).toHaveBeenCalledWith(error);
    });

    it('should handle user not found', async () => {
      const error = new Error('Invalid credentials');
      mockAuthService.login.mockRejectedValue(error);

      const req = createMockRequest({
        body: {
          email: 'nonexistent@example.com',
          password: 'password123',
        },
      });
      const res = createMockResponse();
      const next = jest.fn();

      authController.login(req, res, next);
      await waitForAsyncHandler();

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe('getProfile', () => {
    it('should return user profile successfully', async () => {
      const mockProfile = {
        id: 'user-123',
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        accounts: [],
      };

      mockAuthService.getProfile.mockResolvedValue(mockProfile as any);

      const req = createMockRequest();
      const res = createMockResponse();

      authController.getProfile(req, res, jest.fn());
      await waitForAsyncHandler();

      expect(mockAuthService.getProfile).toHaveBeenCalledWith('user-123');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockProfile,
      });
    });

    it('should return user profile with accounts', async () => {
      const mockProfile = {
        id: 'user-123',
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        accounts: [
          {
            id: 'account-1',
            name: 'Checking Account',
            type: 'CHECKING',
            balance: 1000,
            currency: {
              id: 'currency-1',
              code: 'USD',
              symbol: '$',
              name: 'US Dollar',
              exchangeRate: 1,
              isBase: true,
              createdAt: new Date(),
              updatedAt: new Date(),
            },
            userId: 'user-123',
            currencyId: 'currency-1',
            initialBalance: 1000,
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
      };

      mockAuthService.getProfile.mockResolvedValue(mockProfile as any);

      const req = createMockRequest();
      const res = createMockResponse();

      authController.getProfile(req, res, jest.fn());
      await waitForAsyncHandler();

      expect(mockAuthService.getProfile).toHaveBeenCalledWith('user-123');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockProfile,
      });
    });

    it('should handle user not found', async () => {
      const error = new Error('User not found');
      mockAuthService.getProfile.mockRejectedValue(error);

      const req = createMockRequest({
        user: {
          id: 'non-existent-user',
          email: 'test@example.com',
        },
      });
      const res = createMockResponse();
      const next = jest.fn();

      authController.getProfile(req, res, next);
      await waitForAsyncHandler();

      expect(mockAuthService.getProfile).toHaveBeenCalledWith('non-existent-user');
      expect(next).toHaveBeenCalledWith(error);
    });

    it('should handle errors when service throws', async () => {
      const error = new Error('Database error');
      mockAuthService.getProfile.mockRejectedValue(error);

      const req = createMockRequest();
      const res = createMockResponse();
      const next = jest.fn();

      authController.getProfile(req, res, next);
      await waitForAsyncHandler();

      expect(next).toHaveBeenCalledWith(error);
    });
  });
});

