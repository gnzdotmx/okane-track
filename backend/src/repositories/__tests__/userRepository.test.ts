// Mock dependencies - jest.mock() calls are hoisted to the top
jest.mock('../../config/database', () => {
  const mockUserFindUnique = jest.fn();
  const mockUserCreate = jest.fn();
  const mockUserUpdate = jest.fn();
  const mockUserDelete = jest.fn();
  
  return {
    __esModule: true,
    default: {
      user: {
        findUnique: mockUserFindUnique,
        create: mockUserCreate,
        update: mockUserUpdate,
        delete: mockUserDelete,
      },
    },
  };
});

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

import userRepository from '../userRepository';
import prisma from '../../config/database';

// Helper functions to get mock functions
const getMockUserFindUnique = () => (prisma as any).user.findUnique;
const getMockUserCreate = () => (prisma as any).user.create;
const getMockUserUpdate = () => (prisma as any).user.update;
const getMockUserDelete = () => (prisma as any).user.delete;

describe('UserRepository', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('findByEmail', () => {
    it('should return user by email', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        password: 'hashed-password',
        firstName: 'John',
        lastName: 'Doe',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      };

      getMockUserFindUnique().mockResolvedValue(mockUser);

      const result = await userRepository.findByEmail('test@example.com');

      expect(getMockUserFindUnique()).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
      });
      expect(result).toEqual(mockUser);
    });

    it('should return null when user not found', async () => {
      getMockUserFindUnique().mockResolvedValue(null);

      const result = await userRepository.findByEmail('nonexistent@example.com');

      expect(result).toBeNull();
    });
  });

  describe('findById', () => {
    it('should return user by id with accounts and currency', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        password: 'hashed-password',
        firstName: 'John',
        lastName: 'Doe',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
        accounts: [
          {
            id: 'account-1',
            name: 'Checking Account',
            type: 'CHECKING',
            balance: 1000,
            userId: 'user-123',
            currency: {
              id: 'currency-1',
              code: 'USD',
              symbol: '$',
              name: 'US Dollar',
              exchangeRate: 1,
              isBase: true,
              createdAt: new Date('2024-01-01'),
              updatedAt: new Date('2024-01-01'),
            },
          },
          {
            id: 'account-2',
            name: 'Savings Account',
            type: 'SAVINGS',
            balance: 5000,
            userId: 'user-123',
            currency: {
              id: 'currency-1',
              code: 'USD',
              symbol: '$',
              name: 'US Dollar',
              exchangeRate: 1,
              isBase: true,
              createdAt: new Date('2024-01-01'),
              updatedAt: new Date('2024-01-01'),
            },
          },
        ],
      };

      getMockUserFindUnique().mockResolvedValue(mockUser);

      const result = await userRepository.findById('user-123');

      expect(getMockUserFindUnique()).toHaveBeenCalledWith({
        where: { id: 'user-123' },
        include: {
          accounts: {
            include: {
              currency: true,
            },
          },
        },
      });
      expect(result).toEqual(mockUser);
    });

    it('should return user with empty accounts array', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        password: 'hashed-password',
        firstName: 'John',
        lastName: 'Doe',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
        accounts: [],
      };

      getMockUserFindUnique().mockResolvedValue(mockUser);

      const result = await userRepository.findById('user-123');

      expect(result).toEqual(mockUser);
      expect(result?.accounts).toEqual([]);
    });

    it('should return null when user not found', async () => {
      getMockUserFindUnique().mockResolvedValue(null);

      const result = await userRepository.findById('nonexistent-user-id');

      expect(result).toBeNull();
    });
  });

  describe('create', () => {
    it('should create a new user', async () => {
      const userData = {
        email: 'newuser@example.com',
        password: 'hashed-password',
        firstName: 'Jane',
        lastName: 'Smith',
      };

      const mockCreatedUser = {
        id: 'user-456',
        ...userData,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      };

      getMockUserCreate().mockResolvedValue(mockCreatedUser);

      const result = await userRepository.create(userData);

      expect(getMockUserCreate()).toHaveBeenCalledWith({
        data: userData,
      });
      expect(result).toEqual(mockCreatedUser);
    });
  });

  describe('update', () => {
    it('should update user with partial data', async () => {
      const updateData = {
        firstName: 'Johnny',
        lastName: 'Doe Jr.',
      };

      const mockUpdatedUser = {
        id: 'user-123',
        email: 'test@example.com',
        password: 'hashed-password',
        firstName: 'Johnny',
        lastName: 'Doe Jr.',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-02'),
      };

      getMockUserUpdate().mockResolvedValue(mockUpdatedUser);

      const result = await userRepository.update('user-123', updateData);

      expect(getMockUserUpdate()).toHaveBeenCalledWith({
        where: { id: 'user-123' },
        data: updateData,
      });
      expect(result).toEqual(mockUpdatedUser);
    });

    it('should update user email', async () => {
      const updateData = {
        email: 'newemail@example.com',
      };

      const mockUpdatedUser = {
        id: 'user-123',
        email: 'newemail@example.com',
        password: 'hashed-password',
        firstName: 'John',
        lastName: 'Doe',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-02'),
      };

      getMockUserUpdate().mockResolvedValue(mockUpdatedUser);

      const result = await userRepository.update('user-123', updateData);

      expect(getMockUserUpdate()).toHaveBeenCalledWith({
        where: { id: 'user-123' },
        data: updateData,
      });
      expect(result.email).toBe('newemail@example.com');
    });

    it('should update user password', async () => {
      const updateData = {
        password: 'new-hashed-password',
      };

      const mockUpdatedUser = {
        id: 'user-123',
        email: 'test@example.com',
        password: 'new-hashed-password',
        firstName: 'John',
        lastName: 'Doe',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-02'),
      };

      getMockUserUpdate().mockResolvedValue(mockUpdatedUser);

      const result = await userRepository.update('user-123', updateData);

      expect(result.password).toBe('new-hashed-password');
    });

    it('should update multiple fields at once', async () => {
      const updateData = {
        firstName: 'Jane',
        lastName: 'Smith',
        email: 'jane@example.com',
      };

      const mockUpdatedUser = {
        id: 'user-123',
        email: 'jane@example.com',
        password: 'hashed-password',
        firstName: 'Jane',
        lastName: 'Smith',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-02'),
      };

      getMockUserUpdate().mockResolvedValue(mockUpdatedUser);

      const result = await userRepository.update('user-123', updateData);

      expect(result.firstName).toBe('Jane');
      expect(result.lastName).toBe('Smith');
      expect(result.email).toBe('jane@example.com');
    });
  });

  describe('delete', () => {
    it('should delete a user', async () => {
      const mockDeletedUser = {
        id: 'user-123',
        email: 'test@example.com',
        password: 'hashed-password',
        firstName: 'John',
        lastName: 'Doe',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      };

      getMockUserDelete().mockResolvedValue(mockDeletedUser);

      const result = await userRepository.delete('user-123');

      expect(getMockUserDelete()).toHaveBeenCalledWith({
        where: { id: 'user-123' },
      });
      expect(result).toEqual(mockDeletedUser);
    });
  });
});

