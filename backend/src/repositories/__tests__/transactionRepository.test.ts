// Mock dependencies - jest.mock() calls are hoisted to the top
jest.mock('../../config/database', () => {
  const mockTransactionFindMany = jest.fn();
  const mockTransactionFindFirst = jest.fn();
  const mockTransactionCreate = jest.fn();
  const mockTransactionCreateMany = jest.fn();
  const mockTransactionUpdateMany = jest.fn();
  const mockTransactionDeleteMany = jest.fn();
  
  return {
    __esModule: true,
    default: {
      transaction: {
        findMany: mockTransactionFindMany,
        findFirst: mockTransactionFindFirst,
        create: mockTransactionCreate,
        createMany: mockTransactionCreateMany,
        updateMany: mockTransactionUpdateMany,
        deleteMany: mockTransactionDeleteMany,
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

import transactionRepository from '../transactionRepository';
import prisma from '../../config/database';
import { TransactionFilters } from '../../types';

// Helper functions to get mock functions
const getMockTransactionFindMany = () => (prisma as any).transaction.findMany;
const getMockTransactionFindFirst = () => (prisma as any).transaction.findFirst;
const getMockTransactionCreate = () => (prisma as any).transaction.create;
const getMockTransactionCreateMany = () => (prisma as any).transaction.createMany;
const getMockTransactionUpdateMany = () => (prisma as any).transaction.updateMany;
const getMockTransactionDeleteMany = () => (prisma as any).transaction.deleteMany;

describe('TransactionRepository', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should return all transactions for a user without filters', async () => {
      const mockTransactions = [
        {
          id: 'transaction-1',
          userId: 'user-123',
          accountId: 'account-1',
          amount: 100,
          date: new Date('2024-01-15'),
          description: 'Test transaction',
          account: {
            id: 'account-1',
            name: 'Checking',
            currency: { id: 'currency-1', code: 'USD' },
          },
          currency: { id: 'currency-1', code: 'USD' },
          expenseType: null,
          transactionType: { id: 'type-1', name: 'Expense' },
          budgetCategory: null,
          linkedTransaction: null,
        },
      ];

      getMockTransactionFindMany().mockResolvedValue(mockTransactions);

      const result = await transactionRepository.findAll('user-123');

      expect(getMockTransactionFindMany()).toHaveBeenCalledWith({
        where: {
          userId: 'user-123',
        },
        include: {
          account: {
            include: {
              currency: true,
            },
          },
          currency: true,
          expenseType: true,
          transactionType: true,
          budgetCategory: true,
          linkedTransaction: true,
        },
        orderBy: {
          date: 'desc',
        },
      });
      expect(result).toEqual(mockTransactions);
    });

    it('should apply date filters', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');
      const filters: TransactionFilters = { startDate, endDate };

      getMockTransactionFindMany().mockResolvedValue([]);

      await transactionRepository.findAll('user-123', filters);

      expect(getMockTransactionFindMany()).toHaveBeenCalledWith({
        where: {
          userId: 'user-123',
          date: {
            gte: startDate,
            lte: endDate,
          },
        },
        include: expect.any(Object),
        orderBy: {
          date: 'desc',
        },
      });
    });

    it('should apply accountId filter', async () => {
      const filters: TransactionFilters = { accountId: 'account-1' };

      getMockTransactionFindMany().mockResolvedValue([]);

      await transactionRepository.findAll('user-123', filters);

      expect(getMockTransactionFindMany()).toHaveBeenCalledWith({
        where: {
          userId: 'user-123',
          accountId: 'account-1',
        },
        include: expect.any(Object),
        orderBy: {
          date: 'desc',
        },
      });
    });

    it('should apply categoryId filter', async () => {
      const filters: TransactionFilters = { categoryId: 'category-1' };

      getMockTransactionFindMany().mockResolvedValue([]);

      await transactionRepository.findAll('user-123', filters);

      expect(getMockTransactionFindMany()).toHaveBeenCalledWith({
        where: {
          userId: 'user-123',
          budgetCategoryId: 'category-1',
        },
        include: expect.any(Object),
        orderBy: {
          date: 'desc',
        },
      });
    });

    it('should apply transactionTypeId filter', async () => {
      const filters: TransactionFilters = { transactionTypeId: 'type-1' };

      getMockTransactionFindMany().mockResolvedValue([]);

      await transactionRepository.findAll('user-123', filters);

      expect(getMockTransactionFindMany()).toHaveBeenCalledWith({
        where: {
          userId: 'user-123',
          transactionTypeId: 'type-1',
        },
        include: expect.any(Object),
        orderBy: {
          date: 'desc',
        },
      });
    });

    it('should apply expenseTypeId filter', async () => {
      const filters: TransactionFilters = { expenseTypeId: 'expense-1' };

      getMockTransactionFindMany().mockResolvedValue([]);

      await transactionRepository.findAll('user-123', filters);

      expect(getMockTransactionFindMany()).toHaveBeenCalledWith({
        where: {
          userId: 'user-123',
          expenseTypeId: 'expense-1',
        },
        include: expect.any(Object),
        orderBy: {
          date: 'desc',
        },
      });
    });

    it('should apply amount filters', async () => {
      const filters: TransactionFilters = { minAmount: 10, maxAmount: 100 };

      getMockTransactionFindMany().mockResolvedValue([]);

      await transactionRepository.findAll('user-123', filters);

      expect(getMockTransactionFindMany()).toHaveBeenCalledWith({
        where: {
          userId: 'user-123',
          amount: {
            gte: 10,
            lte: 100,
          },
        },
        include: expect.any(Object),
        orderBy: {
          date: 'desc',
        },
      });
    });

    it('should apply minAmount filter only', async () => {
      const filters: TransactionFilters = { minAmount: 10 };

      getMockTransactionFindMany().mockResolvedValue([]);

      await transactionRepository.findAll('user-123', filters);

      expect(getMockTransactionFindMany()).toHaveBeenCalledWith({
        where: {
          userId: 'user-123',
          amount: {
            gte: 10,
          },
        },
        include: expect.any(Object),
        orderBy: {
          date: 'desc',
        },
      });
    });

    it('should apply maxAmount filter only', async () => {
      const filters: TransactionFilters = { maxAmount: 100 };

      getMockTransactionFindMany().mockResolvedValue([]);

      await transactionRepository.findAll('user-123', filters);

      expect(getMockTransactionFindMany()).toHaveBeenCalledWith({
        where: {
          userId: 'user-123',
          amount: {
            lte: 100,
          },
        },
        include: expect.any(Object),
        orderBy: {
          date: 'desc',
        },
      });
    });

    it('should apply search filter', async () => {
      const filters: TransactionFilters = { search: 'test' };

      getMockTransactionFindMany().mockResolvedValue([]);

      await transactionRepository.findAll('user-123', filters);

      expect(getMockTransactionFindMany()).toHaveBeenCalledWith({
        where: {
          userId: 'user-123',
          OR: [
            { description: { contains: 'test', mode: 'insensitive' } },
            { notes: { contains: 'test', mode: 'insensitive' } },
          ],
        },
        include: expect.any(Object),
        orderBy: {
          date: 'desc',
        },
      });
    });

    it('should apply multiple filters together', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');
      const filters: TransactionFilters = {
        startDate,
        endDate,
        accountId: 'account-1',
        categoryId: 'category-1',
        minAmount: 10,
        maxAmount: 100,
        search: 'test',
      };

      getMockTransactionFindMany().mockResolvedValue([]);

      await transactionRepository.findAll('user-123', filters);

      expect(getMockTransactionFindMany()).toHaveBeenCalledWith({
        where: {
          userId: 'user-123',
          date: {
            gte: startDate,
            lte: endDate,
          },
          accountId: 'account-1',
          budgetCategoryId: 'category-1',
          amount: {
            gte: 10,
            lte: 100,
          },
          OR: [
            { description: { contains: 'test', mode: 'insensitive' } },
            { notes: { contains: 'test', mode: 'insensitive' } },
          ],
        },
        include: expect.any(Object),
        orderBy: {
          date: 'desc',
        },
      });
    });

    it('should return empty array when no transactions found', async () => {
      getMockTransactionFindMany().mockResolvedValue([]);

      const result = await transactionRepository.findAll('user-123');

      expect(result).toEqual([]);
    });
  });

  describe('findById', () => {
    it('should return transaction by id and userId', async () => {
      const mockTransaction = {
        id: 'transaction-1',
        userId: 'user-123',
        accountId: 'account-1',
        amount: 100,
        date: new Date('2024-01-15'),
        description: 'Test transaction',
        account: {
          id: 'account-1',
          name: 'Checking',
          currency: { id: 'currency-1', code: 'USD' },
        },
        currency: { id: 'currency-1', code: 'USD' },
        expenseType: null,
        transactionType: { id: 'type-1', name: 'Expense' },
        budgetCategory: null,
        linkedTransaction: null,
        reimbursement: null,
      };

      getMockTransactionFindFirst().mockResolvedValue(mockTransaction);

      const result = await transactionRepository.findById('transaction-1', 'user-123');

      expect(getMockTransactionFindFirst()).toHaveBeenCalledWith({
        where: { id: 'transaction-1', userId: 'user-123' },
        include: {
          account: {
            include: {
              currency: true,
            },
          },
          currency: true,
          expenseType: true,
          transactionType: true,
          budgetCategory: true,
          linkedTransaction: true,
          reimbursement: true,
        },
      });
      expect(result).toEqual(mockTransaction);
    });

    it('should return null when transaction not found', async () => {
      getMockTransactionFindFirst().mockResolvedValue(null);

      const result = await transactionRepository.findById('transaction-1', 'user-123');

      expect(result).toBeNull();
    });
  });

  describe('create', () => {
    it('should create a transaction', async () => {
      const mockTransactionData = {
        amount: 100,
        date: new Date('2024-01-15'),
        description: 'Test transaction',
        account: { connect: { id: 'account-1' } },
        currency: { connect: { id: 'currency-1' } },
        transactionType: { connect: { id: 'type-1' } },
        user: { connect: { id: 'user-123' } },
      };

      const mockCreatedTransaction = {
        id: 'transaction-1',
        ...mockTransactionData,
        account: { id: 'account-1', name: 'Checking' },
        currency: { id: 'currency-1', code: 'USD' },
        transactionType: { id: 'type-1', name: 'Expense' },
        expenseType: null,
        budgetCategory: null,
      };

      getMockTransactionCreate().mockResolvedValue(mockCreatedTransaction);

      const result = await transactionRepository.create(mockTransactionData as any);

      expect(getMockTransactionCreate()).toHaveBeenCalledWith({
        data: mockTransactionData,
        include: {
          account: true,
          currency: true,
          expenseType: true,
          transactionType: true,
          budgetCategory: true,
        },
      });
      expect(result).toEqual(mockCreatedTransaction);
    });
  });

  describe('createMany', () => {
    it('should create multiple transactions', async () => {
      const mockTransactionsData = [
        {
          amount: 100,
          date: new Date('2024-01-15'),
          description: 'Transaction 1',
          accountId: 'account-1',
          currencyId: 'currency-1',
          transactionTypeId: 'type-1',
          userId: 'user-123',
        },
        {
          amount: 200,
          date: new Date('2024-01-16'),
          description: 'Transaction 2',
          accountId: 'account-1',
          currencyId: 'currency-1',
          transactionTypeId: 'type-1',
          userId: 'user-123',
        },
      ];

      const mockResult = { count: 2 };

      getMockTransactionCreateMany().mockResolvedValue(mockResult);

      const result = await transactionRepository.createMany(mockTransactionsData as any);

      expect(getMockTransactionCreateMany()).toHaveBeenCalledWith({
        data: mockTransactionsData,
        skipDuplicates: true,
      });
      expect(result).toEqual(mockResult);
    });

    it('should handle empty array', async () => {
      const mockResult = { count: 0 };

      getMockTransactionCreateMany().mockResolvedValue(mockResult);

      const result = await transactionRepository.createMany([]);

      expect(getMockTransactionCreateMany()).toHaveBeenCalledWith({
        data: [],
        skipDuplicates: true,
      });
      expect(result).toEqual(mockResult);
    });
  });

  describe('update', () => {
    it('should update a transaction', async () => {
      const updateData = {
        amount: 150,
        description: 'Updated transaction',
      };

      const mockResult = { count: 1 };

      getMockTransactionUpdateMany().mockResolvedValue(mockResult);

      const result = await transactionRepository.update(
        'transaction-1',
        'user-123',
        updateData as any
      );

      expect(getMockTransactionUpdateMany()).toHaveBeenCalledWith({
        where: { id: 'transaction-1', userId: 'user-123' },
        data: updateData,
      });
      expect(result).toEqual(mockResult);
    });

    it('should return count 0 when transaction not found', async () => {
      const updateData = { amount: 150 };
      const mockResult = { count: 0 };

      getMockTransactionUpdateMany().mockResolvedValue(mockResult);

      const result = await transactionRepository.update(
        'transaction-1',
        'user-123',
        updateData as any
      );

      expect(result.count).toBe(0);
    });
  });

  describe('delete', () => {
    it('should delete a transaction', async () => {
      const mockResult = { count: 1 };

      getMockTransactionDeleteMany().mockResolvedValue(mockResult);

      const result = await transactionRepository.delete('transaction-1', 'user-123');

      expect(getMockTransactionDeleteMany()).toHaveBeenCalledWith({
        where: { id: 'transaction-1', userId: 'user-123' },
      });
      expect(result).toEqual(mockResult);
    });

    it('should return count 0 when transaction not found', async () => {
      const mockResult = { count: 0 };

      getMockTransactionDeleteMany().mockResolvedValue(mockResult);

      const result = await transactionRepository.delete('transaction-1', 'user-123');

      expect(result.count).toBe(0);
    });
  });

  describe('getRecentTransactions', () => {
    it('should return recent transactions with default limit', async () => {
      const mockTransactions = [
        {
          id: 'transaction-1',
          amount: 100,
          date: new Date('2024-01-15'),
          currency: { id: 'currency-1', code: 'USD' },
          expenseType: null,
          transactionType: { id: 'type-1', name: 'Expense' },
          budgetCategory: null,
        },
      ];

      getMockTransactionFindMany().mockResolvedValue(mockTransactions);

      const result = await transactionRepository.getRecentTransactions('user-123');

      expect(getMockTransactionFindMany()).toHaveBeenCalledWith({
        where: { userId: 'user-123' },
        include: {
          currency: true,
          expenseType: true,
          transactionType: true,
          budgetCategory: true,
        },
        orderBy: {
          date: 'desc',
        },
        take: 10,
      });
      expect(result).toEqual(mockTransactions);
    });

    it('should return recent transactions with custom limit', async () => {
      const mockTransactions = [
        {
          id: 'transaction-1',
          amount: 100,
          date: new Date('2024-01-15'),
          currency: { id: 'currency-1', code: 'USD' },
          expenseType: null,
          transactionType: { id: 'type-1', name: 'Expense' },
          budgetCategory: null,
        },
      ];

      getMockTransactionFindMany().mockResolvedValue(mockTransactions);

      const result = await transactionRepository.getRecentTransactions('user-123', 5);

      expect(getMockTransactionFindMany()).toHaveBeenCalledWith({
        where: { userId: 'user-123' },
        include: {
          currency: true,
          expenseType: true,
          transactionType: true,
          budgetCategory: true,
        },
        orderBy: {
          date: 'desc',
        },
        take: 5,
      });
      expect(result).toEqual(mockTransactions);
    });

    it('should return empty array when no recent transactions', async () => {
      getMockTransactionFindMany().mockResolvedValue([]);

      const result = await transactionRepository.getRecentTransactions('user-123');

      expect(result).toEqual([]);
    });
  });

  describe('getMonthlyStats', () => {
    it('should return monthly stats for a year', async () => {
      const mockTransactions = [
        {
          id: 'transaction-1',
          amount: 100,
          date: new Date('2024-01-15'),
          transactionType: { id: 'type-1', name: 'Expense' },
          currency: { id: 'currency-1', code: 'USD' },
          expenseType: { id: 'expense-1', name: 'Food' },
        },
        {
          id: 'transaction-2',
          amount: 200,
          date: new Date('2024-02-15'),
          transactionType: { id: 'type-2', name: 'Income' },
          currency: { id: 'currency-1', code: 'USD' },
          expenseType: null,
        },
      ];

      getMockTransactionFindMany().mockResolvedValue(mockTransactions);

      const result = await transactionRepository.getMonthlyStats('user-123', 2024);

      const startDate = new Date(2024, 0, 1);
      const endDate = new Date(2024, 11, 31, 23, 59, 59);

      expect(getMockTransactionFindMany()).toHaveBeenCalledWith({
        where: {
          userId: 'user-123',
          date: {
            gte: startDate,
            lte: endDate,
          },
        },
        include: {
          transactionType: true,
          currency: true,
          expenseType: true,
        },
        orderBy: {
          date: 'asc',
        },
      });
      expect(result).toEqual(mockTransactions);
    });

    it('should return empty array when no transactions for year', async () => {
      getMockTransactionFindMany().mockResolvedValue([]);

      const result = await transactionRepository.getMonthlyStats('user-123', 2024);

      expect(result).toEqual([]);
    });

    it('should handle different years correctly', async () => {
      getMockTransactionFindMany().mockResolvedValue([]);

      await transactionRepository.getMonthlyStats('user-123', 2023);

      const startDate = new Date(2023, 0, 1);
      const endDate = new Date(2023, 11, 31, 23, 59, 59);

      expect(getMockTransactionFindMany()).toHaveBeenCalledWith({
        where: {
          userId: 'user-123',
          date: {
            gte: startDate,
            lte: endDate,
          },
        },
        include: {
          transactionType: true,
          currency: true,
          expenseType: true,
        },
        orderBy: {
          date: 'asc',
        },
      });
    });
  });
});

