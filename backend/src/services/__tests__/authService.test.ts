// Mock dependencies - jest.mock() calls are hoisted to the top
const mockFindByEmail = jest.fn();
const mockFindById = jest.fn();
const mockCreate = jest.fn();

jest.mock('../../repositories/userRepository', () => ({
  __esModule: true,
  default: {
    findByEmail: mockFindByEmail,
    findById: mockFindById,
    create: mockCreate,
  },
}));

const mockHashPassword = jest.fn();
const mockComparePassword = jest.fn();

jest.mock('../../utils/password', () => ({
  hashPassword: mockHashPassword,
  comparePassword: mockComparePassword,
}));

const mockGenerateToken = jest.fn();

jest.mock('../../utils/jwt', () => ({
  generateToken: mockGenerateToken,
}));

// Mock logger to prevent logging during tests
jest.mock('../../config/logger', () => ({
  __esModule: true,
  default: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

import authService from '../authService';
import userRepository from '../../repositories/userRepository';
import { hashPassword, comparePassword } from '../../utils/password';
import { generateToken } from '../../utils/jwt';
import logger from '../../config/logger';

describe('AuthService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('register', () => {
    const registerData = {
      email: 'test@example.com',
      password: 'password123',
      firstName: 'John',
      lastName: 'Doe',
    };

    it('should register a new user successfully', async () => {
      const hashedPassword = 'hashed-password-123';
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        password: hashedPassword,
        firstName: 'John',
        lastName: 'Doe',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const mockToken = 'jwt-token-123';

      mockFindByEmail.mockResolvedValue(null);
      mockHashPassword.mockResolvedValue(hashedPassword);
      mockCreate.mockResolvedValue(mockUser);
      mockGenerateToken.mockReturnValue(mockToken);

      const result = await authService.register(registerData);

      expect(mockFindByEmail).toHaveBeenCalledWith('test@example.com');
      expect(mockHashPassword).toHaveBeenCalledWith('password123');
      expect(mockCreate).toHaveBeenCalledWith({
        ...registerData,
        password: hashedPassword,
      });
      expect(mockGenerateToken).toHaveBeenCalledWith({
        id: 'user-123',
        email: 'test@example.com',
      });
      expect(logger.info).toHaveBeenCalledWith('User registered: test@example.com');
      expect(result).toEqual({
        user: {
          id: 'user-123',
          email: 'test@example.com',
          firstName: 'John',
          lastName: 'Doe',
        },
        token: mockToken,
      });
    });

    it('should throw error if user already exists', async () => {
      const existingUser = {
        id: 'user-123',
        email: 'test@example.com',
        password: 'hashed-password',
        firstName: 'John',
        lastName: 'Doe',
      };

      mockFindByEmail.mockResolvedValue(existingUser);

      await expect(authService.register(registerData)).rejects.toThrow(
        'User with this email already exists'
      );

      expect(mockFindByEmail).toHaveBeenCalledWith('test@example.com');
      expect(mockHashPassword).not.toHaveBeenCalled();
      expect(mockCreate).not.toHaveBeenCalled();
      expect(mockGenerateToken).not.toHaveBeenCalled();
    });

    it('should hash password before creating user', async () => {
      const hashedPassword = 'hashed-password-123';
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        password: hashedPassword,
        firstName: 'John',
        lastName: 'Doe',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockFindByEmail.mockResolvedValue(null);
      mockHashPassword.mockResolvedValue(hashedPassword);
      mockCreate.mockResolvedValue(mockUser);
      mockGenerateToken.mockReturnValue('token');

      await authService.register(registerData);

      expect(mockHashPassword).toHaveBeenCalledWith('password123');
      expect(mockCreate).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: hashedPassword,
        firstName: 'John',
        lastName: 'Doe',
      });
    });
  });

  describe('login', () => {
    const email = 'test@example.com';
    const password = 'password123';
    const hashedPassword = 'hashed-password-123';

    const mockUser = {
      id: 'user-123',
      email: 'test@example.com',
      password: hashedPassword,
      firstName: 'John',
      lastName: 'Doe',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('should login user with valid credentials', async () => {
      const mockToken = 'jwt-token-123';

      mockFindByEmail.mockResolvedValue(mockUser);
      mockComparePassword.mockResolvedValue(true);
      mockGenerateToken.mockReturnValue(mockToken);

      const result = await authService.login(email, password);

      expect(mockFindByEmail).toHaveBeenCalledWith(email);
      expect(mockComparePassword).toHaveBeenCalledWith(password, hashedPassword);
      expect(mockGenerateToken).toHaveBeenCalledWith({
        id: 'user-123',
        email: 'test@example.com',
      });
      expect(logger.info).toHaveBeenCalledWith('User logged in: test@example.com');
      expect(result).toEqual({
        user: {
          id: 'user-123',
          email: 'test@example.com',
          firstName: 'John',
          lastName: 'Doe',
        },
        token: mockToken,
      });
    });

    it('should throw error if user does not exist', async () => {
      mockFindByEmail.mockResolvedValue(null);

      await expect(authService.login(email, password)).rejects.toThrow('Invalid credentials');

      expect(mockFindByEmail).toHaveBeenCalledWith(email);
      expect(mockComparePassword).not.toHaveBeenCalled();
      expect(mockGenerateToken).not.toHaveBeenCalled();
    });

    it('should throw error if password is invalid', async () => {
      mockFindByEmail.mockResolvedValue(mockUser);
      mockComparePassword.mockResolvedValue(false);

      await expect(authService.login(email, password)).rejects.toThrow('Invalid credentials');

      expect(mockFindByEmail).toHaveBeenCalledWith(email);
      expect(mockComparePassword).toHaveBeenCalledWith(password, hashedPassword);
      expect(mockGenerateToken).not.toHaveBeenCalled();
    });

    it('should verify password before generating token', async () => {
      mockFindByEmail.mockResolvedValue(mockUser);
      mockComparePassword.mockResolvedValue(true);
      mockGenerateToken.mockReturnValue('token');

      await authService.login(email, password);

      expect(mockComparePassword).toHaveBeenCalledWith(password, hashedPassword);
      expect(mockGenerateToken).toHaveBeenCalled();
    });
  });

  describe('getProfile', () => {
    const userId = 'user-123';

    it('should return user profile with accounts', async () => {
      const mockUser = {
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
            },
          },
        ],
      };

      mockFindById.mockResolvedValue(mockUser);

      const result = await authService.getProfile(userId);

      expect(mockFindById).toHaveBeenCalledWith(userId);
      expect(result).toEqual({
        id: 'user-123',
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        accounts: mockUser.accounts,
      });
    });

    it('should return user profile with empty accounts array', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        accounts: [],
      };

      mockFindById.mockResolvedValue(mockUser);

      const result = await authService.getProfile(userId);

      expect(result.accounts).toEqual([]);
    });

    it('should throw error if user not found', async () => {
      mockFindById.mockResolvedValue(null);

      await expect(authService.getProfile(userId)).rejects.toThrow('User not found');

      expect(mockFindById).toHaveBeenCalledWith(userId);
    });
  });
});

