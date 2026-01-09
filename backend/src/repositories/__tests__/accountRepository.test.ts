// Mock dependencies - jest.mock() calls are hoisted to the top
jest.mock('../../config/database', () => {
  const mockAccountFindMany = jest.fn();
  const mockAccountFindFirst = jest.fn();
  const mockAccountCreate = jest.fn();
  const mockAccountUpdateMany = jest.fn();
  const mockAccountUpdate = jest.fn();
  const mockAccountDeleteMany = jest.fn();
  const mockCurrencyFindMany = jest.fn();
  const mockExpenseTypeFindMany = jest.fn();
  const mockTransactionTypeFindMany = jest.fn();
  
  return {
    __esModule: true,
    default: {
      account: {
        findMany: mockAccountFindMany,
        findFirst: mockAccountFindFirst,
        create: mockAccountCreate,
        updateMany: mockAccountUpdateMany,
        update: mockAccountUpdate,
        deleteMany: mockAccountDeleteMany,
      },
      currency: {
        findMany: mockCurrencyFindMany,
      },
      expenseType: {
        findMany: mockExpenseTypeFindMany,
      },
      transactionType: {
        findMany: mockTransactionTypeFindMany,
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

import accountRepository from '../accountRepository';
import prisma from '../../config/database';

// Helper functions to get mock functions
const getMockAccountFindMany = () => (prisma as any).account.findMany;
const getMockAccountFindFirst = () => (prisma as any).account.findFirst;
const getMockAccountCreate = () => (prisma as any).account.create;
const getMockAccountUpdateMany = () => (prisma as any).account.updateMany;
const getMockAccountUpdate = () => (prisma as any).account.update;
const getMockAccountDeleteMany = () => (prisma as any).account.deleteMany;
const getMockCurrencyFindMany = () => (prisma as any).currency.findMany;
const getMockExpenseTypeFindMany = () => (prisma as any).expenseType.findMany;
const getMockTransactionTypeFindMany = () => (prisma as any).transactionType.findMany;

describe('AccountRepository', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('findAllByUser', () => {
    it('should return all accounts for a user', async () => {
      const mockAccounts = [
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
          },
        },
      ];

      getMockAccountFindMany().mockResolvedValue(mockAccounts);

      const result = await accountRepository.findAllByUser('user-123');

      expect(getMockAccountFindMany()).toHaveBeenCalledWith({
        where: { userId: 'user-123' },
        include: {
          currency: true,
        },
        orderBy: {
          createdAt: 'asc',
        },
      });
      expect(result).toEqual(mockAccounts);
    });

    it('should return empty array when user has no accounts', async () => {
      getMockAccountFindMany().mockResolvedValue([]);

      const result = await accountRepository.findAllByUser('user-123');

      expect(result).toEqual([]);
    });
  });

  describe('findById', () => {
    it('should return account when found', async () => {
      const mockAccount = {
        id: 'account-1',
        name: 'Checking Account',
        type: 'CHECKING',
        balance: 1000,
        userId: 'user-123',
        currency: {
          id: 'currency-1',
          code: 'USD',
          symbol: '$',
        },
        transactions: [
          {
            id: 'tx-1',
            amount: 100,
            date: new Date('2024-01-01'),
          },
        ],
      };

      getMockAccountFindFirst().mockResolvedValue(mockAccount);

      const result = await accountRepository.findById('account-1', 'user-123');

      expect(getMockAccountFindFirst()).toHaveBeenCalledWith({
        where: { id: 'account-1', userId: 'user-123' },
        include: {
          currency: true,
          transactions: {
            take: 10,
            orderBy: {
              date: 'desc',
            },
          },
        },
      });
      expect(result).toEqual(mockAccount);
    });

    it('should return null when account not found', async () => {
      getMockAccountFindFirst().mockResolvedValue(null);

      const result = await accountRepository.findById('non-existent', 'user-123');

      expect(result).toBeNull();
    });
  });

  describe('create', () => {
    it('should create an account', async () => {
      const mockAccountData = {
        name: 'New Account',
        type: 'CHECKING' as any,
        balance: 1000,
        initialBalance: 1000,
        user: { connect: { id: 'user-123' } },
        currency: { connect: { id: 'currency-1' } },
      };

      const mockCreatedAccount = {
        id: 'account-1',
        ...mockAccountData,
        currency: {
          id: 'currency-1',
          code: 'USD',
          symbol: '$',
        },
      };

      getMockAccountCreate().mockResolvedValue(mockCreatedAccount);

      const result = await accountRepository.create(mockAccountData as any);

      expect(getMockAccountCreate()).toHaveBeenCalledWith({
        data: mockAccountData,
        include: {
          currency: true,
        },
      });
      expect(result).toEqual(mockCreatedAccount);
    });
  });

  describe('update', () => {
    it('should update an account', async () => {
      const updateData = {
        name: 'Updated Account',
        type: 'SAVINGS' as any,
      };

      const mockUpdateResult = { count: 1 };

      getMockAccountUpdateMany().mockResolvedValue(mockUpdateResult);

      const result = await accountRepository.update('account-1', 'user-123', updateData as any);

      expect(getMockAccountUpdateMany()).toHaveBeenCalledWith({
        where: { id: 'account-1', userId: 'user-123' },
        data: updateData,
      });
      expect(result).toEqual(mockUpdateResult);
    });

    it('should return count 0 when account not found', async () => {
      getMockAccountUpdateMany().mockResolvedValue({ count: 0 });

      const result = await accountRepository.update('non-existent', 'user-123', {
        name: 'Updated',
      });

      expect(result).toEqual({ count: 0 });
    });
  });

  describe('updateBalance', () => {
    it('should update account balance', async () => {
      const mockUpdatedAccount = {
        id: 'account-1',
        balance: 2000,
      };

      getMockAccountUpdate().mockResolvedValue(mockUpdatedAccount);

      const result = await accountRepository.updateBalance('account-1', 2000);

      expect(getMockAccountUpdate()).toHaveBeenCalledWith({
        where: { id: 'account-1' },
        data: { balance: 2000 },
      });
      expect(result).toEqual(mockUpdatedAccount);
    });
  });

  describe('delete', () => {
    it('should delete an account', async () => {
      const mockDeleteResult = { count: 1 };

      getMockAccountDeleteMany().mockResolvedValue(mockDeleteResult);

      const result = await accountRepository.delete('account-1', 'user-123');

      expect(getMockAccountDeleteMany()).toHaveBeenCalledWith({
        where: { id: 'account-1', userId: 'user-123' },
      });
      expect(result).toEqual(mockDeleteResult);
    });

    it('should return count 0 when account not found', async () => {
      getMockAccountDeleteMany().mockResolvedValue({ count: 0 });

      const result = await accountRepository.delete('non-existent', 'user-123');

      expect(result).toEqual({ count: 0 });
    });
  });

  describe('getCurrencies', () => {
    it('should return all currencies sorted by code', async () => {
      const mockCurrencies = [
        {
          id: 'currency-1',
          code: 'EUR',
          symbol: '€',
          name: 'Euro',
        },
        {
          id: 'currency-2',
          code: 'USD',
          symbol: '$',
          name: 'US Dollar',
        },
      ];

      getMockCurrencyFindMany().mockResolvedValue(mockCurrencies);

      const result = await accountRepository.getCurrencies();

      expect(getMockCurrencyFindMany()).toHaveBeenCalledWith({
        orderBy: {
          code: 'asc',
        },
      });
      expect(result).toEqual(mockCurrencies);
    });

    it('should return empty array when no currencies exist', async () => {
      getMockCurrencyFindMany().mockResolvedValue([]);

      const result = await accountRepository.getCurrencies();

      expect(result).toEqual([]);
    });
  });

  describe('getExpenseTypes', () => {
    it('should return all expense types sorted by name', async () => {
      const mockExpenseTypes = [
        {
          id: 'expense-1',
          name: 'Food',
          icon: '🍔',
          color: '#FF5733',
        },
        {
          id: 'expense-2',
          name: 'Transport',
          icon: '🚗',
          color: '#33C3F0',
        },
      ];

      getMockExpenseTypeFindMany().mockResolvedValue(mockExpenseTypes);

      const result = await accountRepository.getExpenseTypes();

      expect(getMockExpenseTypeFindMany()).toHaveBeenCalledWith({
        orderBy: {
          name: 'asc',
        },
      });
      expect(result).toEqual(mockExpenseTypes);
    });

    it('should return empty array when no expense types exist', async () => {
      getMockExpenseTypeFindMany().mockResolvedValue([]);

      const result = await accountRepository.getExpenseTypes();

      expect(result).toEqual([]);
    });
  });

  describe('getTransactionTypes', () => {
    it('should return all transaction types sorted by name', async () => {
      const mockTransactionTypes = [
        {
          id: 'type-1',
          name: 'EXPENSE',
        },
        {
          id: 'type-2',
          name: 'INCOME',
        },
        {
          id: 'type-3',
          name: 'TRANSFER',
        },
      ];

      getMockTransactionTypeFindMany().mockResolvedValue(mockTransactionTypes);

      const result = await accountRepository.getTransactionTypes();

      expect(getMockTransactionTypeFindMany()).toHaveBeenCalledWith({
        orderBy: {
          name: 'asc',
        },
      });
      expect(result).toEqual(mockTransactionTypes);
    });

    it('should return empty array when no transaction types exist', async () => {
      getMockTransactionTypeFindMany().mockResolvedValue([]);

      const result = await accountRepository.getTransactionTypes();

      expect(result).toEqual([]);
    });
  });
});

