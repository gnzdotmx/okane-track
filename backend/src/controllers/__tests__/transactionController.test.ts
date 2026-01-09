// Mock dependencies - jest.mock() calls are hoisted to the top
jest.mock('../../services/transactionService');

import { Response } from 'express';
import transactionController from '../transactionController';
import transactionService from '../../services/transactionService';
import { AuthRequest } from '../../types';

const mockTransactionService = transactionService as jest.Mocked<typeof transactionService>;

// Mock request and response objects
const createMockRequest = (overrides: any = {}): AuthRequest => {
  return {
    user: {
      id: 'user-123',
      email: 'test@example.com',
    },
    params: {},
    body: {},
    query: {},
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

describe('TransactionController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getAll', () => {
    it('should return all transactions without filters', async () => {
      const mockTransactions = [
        {
          id: 'tx-1',
          amount: 100,
          description: 'Test transaction',
          date: new Date('2024-01-01'),
        },
        {
          id: 'tx-2',
          amount: 200,
          description: 'Another transaction',
          date: new Date('2024-01-02'),
        },
      ];

      mockTransactionService.getAll.mockResolvedValue(mockTransactions as any);

      const req = createMockRequest({
        query: {},
      });
      const res = createMockResponse();

      transactionController.getAll(req, res, jest.fn());
      await waitForAsyncHandler();

      expect(mockTransactionService.getAll).toHaveBeenCalledWith('user-123', {
        startDate: undefined,
        endDate: undefined,
        accountId: undefined,
        categoryId: undefined,
        transactionTypeId: undefined,
        expenseTypeId: undefined,
        minAmount: undefined,
        maxAmount: undefined,
        search: undefined,
      });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        count: 2,
        data: mockTransactions,
      });
    });

    it('should return transactions with date filters', async () => {
      const mockTransactions: any[] = [];
      const startDate = '2024-01-01';
      const endDate = '2024-01-31';

      mockTransactionService.getAll.mockResolvedValue(mockTransactions);

      const req = createMockRequest({
        query: {
          startDate,
          endDate,
        },
      });
      const res = createMockResponse();

      transactionController.getAll(req, res, jest.fn());
      await waitForAsyncHandler();

      expect(mockTransactionService.getAll).toHaveBeenCalledWith('user-123', {
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        accountId: undefined,
        categoryId: undefined,
        transactionTypeId: undefined,
        expenseTypeId: undefined,
        minAmount: undefined,
        maxAmount: undefined,
        search: undefined,
      });
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('should return transactions with account filter', async () => {
      const mockTransactions: any[] = [];

      mockTransactionService.getAll.mockResolvedValue(mockTransactions);

      const req = createMockRequest({
        query: {
          accountId: 'account-123',
        },
      });
      const res = createMockResponse();

      transactionController.getAll(req, res, jest.fn());
      await waitForAsyncHandler();

      expect(mockTransactionService.getAll).toHaveBeenCalledWith('user-123', {
        startDate: undefined,
        endDate: undefined,
        accountId: 'account-123',
        categoryId: undefined,
        transactionTypeId: undefined,
        expenseTypeId: undefined,
        minAmount: undefined,
        maxAmount: undefined,
        search: undefined,
      });
    });

    it('should return transactions with amount filters', async () => {
      const mockTransactions: any[] = [];

      mockTransactionService.getAll.mockResolvedValue(mockTransactions);

      const req = createMockRequest({
        query: {
          minAmount: '100',
          maxAmount: '1000',
        },
      });
      const res = createMockResponse();

      transactionController.getAll(req, res, jest.fn());
      await waitForAsyncHandler();

      expect(mockTransactionService.getAll).toHaveBeenCalledWith('user-123', {
        startDate: undefined,
        endDate: undefined,
        accountId: undefined,
        categoryId: undefined,
        transactionTypeId: undefined,
        expenseTypeId: undefined,
        minAmount: 100,
        maxAmount: 1000,
        search: undefined,
      });
    });

    it('should return transactions with all filters', async () => {
      const mockTransactions: any[] = [];
      const startDate = '2024-01-01';
      const endDate = '2024-01-31';

      mockTransactionService.getAll.mockResolvedValue(mockTransactions);

      const req = createMockRequest({
        query: {
          startDate,
          endDate,
          accountId: 'account-123',
          categoryId: 'category-123',
          transactionTypeId: 'type-123',
          expenseTypeId: 'expense-123',
          minAmount: '50',
          maxAmount: '500',
          search: 'test',
        },
      });
      const res = createMockResponse();

      transactionController.getAll(req, res, jest.fn());
      await waitForAsyncHandler();

      expect(mockTransactionService.getAll).toHaveBeenCalledWith('user-123', {
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        accountId: 'account-123',
        categoryId: 'category-123',
        transactionTypeId: 'type-123',
        expenseTypeId: 'expense-123',
        minAmount: 50,
        maxAmount: 500,
        search: 'test',
      });
    });

    it('should handle errors when service throws', async () => {
      const error = new Error('Database error');
      mockTransactionService.getAll.mockRejectedValue(error);

      const req = createMockRequest({
        query: {},
      });
      const res = createMockResponse();
      const next = jest.fn();

      transactionController.getAll(req, res, next);
      await waitForAsyncHandler();

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe('getById', () => {
    it('should return transaction when found', async () => {
      const mockTransaction = {
        id: 'tx-1',
        amount: 100,
        description: 'Test transaction',
        date: new Date('2024-01-01'),
      };

      mockTransactionService.getById.mockResolvedValue(mockTransaction as any);

      const req = createMockRequest({
        params: { id: 'tx-1' },
      });
      const res = createMockResponse();

      transactionController.getById(req, res, jest.fn());
      await waitForAsyncHandler();

      expect(mockTransactionService.getById).toHaveBeenCalledWith('tx-1', 'user-123');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockTransaction,
      });
    });

    it('should handle errors when transaction not found', async () => {
      const error = new Error('Transaction not found');
      mockTransactionService.getById.mockRejectedValue(error);

      const req = createMockRequest({
        params: { id: 'non-existent' },
      });
      const res = createMockResponse();
      const next = jest.fn();

      transactionController.getById(req, res, next);
      await waitForAsyncHandler();

      expect(next).toHaveBeenCalledWith(error);
    });

    it('should handle errors when service throws', async () => {
      const error = new Error('Database error');
      mockTransactionService.getById.mockRejectedValue(error);

      const req = createMockRequest({
        params: { id: 'tx-1' },
      });
      const res = createMockResponse();
      const next = jest.fn();

      transactionController.getById(req, res, next);
      await waitForAsyncHandler();

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe('create', () => {
    it('should create transaction successfully', async () => {
      const mockTransaction = {
        id: 'tx-1',
        amount: 100,
        description: 'Test transaction',
        date: new Date('2024-01-01'),
        accountId: 'account-123',
      };

      mockTransactionService.create.mockResolvedValue(mockTransaction as any);

      const req = createMockRequest({
        body: {
          accountId: 'account-123',
          currencyId: 'currency-123',
          date: '2024-01-01',
          amount: 100,
          description: 'Test transaction',
          transactionTypeId: 'type-123',
          budgetCategoryId: 'category-123',
        },
      });
      const res = createMockResponse();

      transactionController.create(req, res, jest.fn());
      await waitForAsyncHandler();

      expect(mockTransactionService.create).toHaveBeenCalledWith('user-123', {
        accountId: 'account-123',
        currencyId: 'currency-123',
        date: '2024-01-01',
        amount: 100,
        description: 'Test transaction',
        transactionTypeId: 'type-123',
        budgetCategoryId: 'category-123',
      });
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Transaction created successfully',
        data: mockTransaction,
      });
    });

    it('should create transaction with optional fields', async () => {
      const mockTransaction = {
        id: 'tx-1',
        amount: 100,
        description: 'Test transaction',
        date: new Date('2024-01-01'),
        expenseTypeId: 'expense-123',
        isReimbursable: true,
        notes: 'Some notes',
      };

      mockTransactionService.create.mockResolvedValue(mockTransaction as any);

      const req = createMockRequest({
        body: {
          accountId: 'account-123',
          currencyId: 'currency-123',
          date: '2024-01-01',
          amount: 100,
          description: 'Test transaction',
          transactionTypeId: 'type-123',
          budgetCategoryId: 'category-123',
          expenseTypeId: 'expense-123',
          isReimbursable: true,
          notes: 'Some notes',
        },
      });
      const res = createMockResponse();

      transactionController.create(req, res, jest.fn());
      await waitForAsyncHandler();

      expect(mockTransactionService.create).toHaveBeenCalledWith('user-123', expect.objectContaining({
        expenseTypeId: 'expense-123',
        isReimbursable: true,
        notes: 'Some notes',
      }));
      expect(res.status).toHaveBeenCalledWith(201);
    });

    it('should handle errors when account not found', async () => {
      const error = new Error('Account not found');
      mockTransactionService.create.mockRejectedValue(error);

      const req = createMockRequest({
        body: {
          accountId: 'non-existent',
          currencyId: 'currency-123',
          date: '2024-01-01',
          amount: 100,
          description: 'Test transaction',
          transactionTypeId: 'type-123',
          budgetCategoryId: 'category-123',
        },
      });
      const res = createMockResponse();
      const next = jest.fn();

      transactionController.create(req, res, next);
      await waitForAsyncHandler();

      expect(next).toHaveBeenCalledWith(error);
    });

    it('should handle errors when service throws', async () => {
      const error = new Error('Database error');
      mockTransactionService.create.mockRejectedValue(error);

      const req = createMockRequest({
        body: {
          accountId: 'account-123',
          currencyId: 'currency-123',
          date: '2024-01-01',
          amount: 100,
          description: 'Test transaction',
          transactionTypeId: 'type-123',
          budgetCategoryId: 'category-123',
        },
      });
      const res = createMockResponse();
      const next = jest.fn();

      transactionController.create(req, res, next);
      await waitForAsyncHandler();

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe('update', () => {
    it('should update transaction successfully', async () => {
      const mockTransaction = {
        id: 'tx-1',
        amount: 200,
        description: 'Updated transaction',
        date: new Date('2024-01-02'),
      };

      mockTransactionService.update.mockResolvedValue(mockTransaction as any);

      const req = createMockRequest({
        params: { id: 'tx-1' },
        body: {
          amount: 200,
          description: 'Updated transaction',
          date: '2024-01-02',
        },
      });
      const res = createMockResponse();

      transactionController.update(req, res, jest.fn());
      await waitForAsyncHandler();

      expect(mockTransactionService.update).toHaveBeenCalledWith('tx-1', 'user-123', {
        amount: 200,
        description: 'Updated transaction',
        date: '2024-01-02',
      });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Transaction updated successfully',
        data: mockTransaction,
      });
    });

    it('should update transaction with partial data', async () => {
      const mockTransaction = {
        id: 'tx-1',
        amount: 100,
        description: 'Test transaction',
      };

      mockTransactionService.update.mockResolvedValue(mockTransaction as any);

      const req = createMockRequest({
        params: { id: 'tx-1' },
        body: {
          description: 'Updated description',
        },
      });
      const res = createMockResponse();

      transactionController.update(req, res, jest.fn());
      await waitForAsyncHandler();

      expect(mockTransactionService.update).toHaveBeenCalledWith('tx-1', 'user-123', {
        description: 'Updated description',
      });
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('should handle errors when transaction not found', async () => {
      const error = new Error('Transaction not found');
      mockTransactionService.update.mockRejectedValue(error);

      const req = createMockRequest({
        params: { id: 'non-existent' },
        body: {
          amount: 200,
        },
      });
      const res = createMockResponse();
      const next = jest.fn();

      transactionController.update(req, res, next);
      await waitForAsyncHandler();

      expect(next).toHaveBeenCalledWith(error);
    });

    it('should handle errors when service throws', async () => {
      const error = new Error('Database error');
      mockTransactionService.update.mockRejectedValue(error);

      const req = createMockRequest({
        params: { id: 'tx-1' },
        body: {
          amount: 200,
        },
      });
      const res = createMockResponse();
      const next = jest.fn();

      transactionController.update(req, res, next);
      await waitForAsyncHandler();

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe('delete', () => {
    it('should delete transaction successfully', async () => {
      mockTransactionService.delete.mockResolvedValue(undefined);

      const req = createMockRequest({
        params: { id: 'tx-1' },
      });
      const res = createMockResponse();

      transactionController.delete(req, res, jest.fn());
      await waitForAsyncHandler();

      expect(mockTransactionService.delete).toHaveBeenCalledWith('tx-1', 'user-123');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Transaction deleted successfully',
      });
    });

    it('should handle errors when transaction not found', async () => {
      const error = new Error('Transaction not found');
      mockTransactionService.delete.mockRejectedValue(error);

      const req = createMockRequest({
        params: { id: 'non-existent' },
      });
      const res = createMockResponse();
      const next = jest.fn();

      transactionController.delete(req, res, next);
      await waitForAsyncHandler();

      expect(next).toHaveBeenCalledWith(error);
    });

    it('should handle errors when service throws', async () => {
      const error = new Error('Database error');
      mockTransactionService.delete.mockRejectedValue(error);

      const req = createMockRequest({
        params: { id: 'tx-1' },
      });
      const res = createMockResponse();
      const next = jest.fn();

      transactionController.delete(req, res, next);
      await waitForAsyncHandler();

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe('getRecent', () => {
    it('should return recent transactions with default limit', async () => {
      const mockTransactions = [
        {
          id: 'tx-1',
          amount: 100,
          description: 'Recent transaction 1',
          date: new Date('2024-01-01'),
        },
        {
          id: 'tx-2',
          amount: 200,
          description: 'Recent transaction 2',
          date: new Date('2024-01-02'),
        },
      ];

      mockTransactionService.getRecent.mockResolvedValue(mockTransactions as any);

      const req = createMockRequest({
        query: {},
      });
      const res = createMockResponse();

      transactionController.getRecent(req, res, jest.fn());
      await waitForAsyncHandler();

      expect(mockTransactionService.getRecent).toHaveBeenCalledWith('user-123', 10);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockTransactions,
      });
    });

    it('should return recent transactions with custom limit', async () => {
      const mockTransactions: any[] = [];

      mockTransactionService.getRecent.mockResolvedValue(mockTransactions);

      const req = createMockRequest({
        query: {
          limit: '5',
        },
      });
      const res = createMockResponse();

      transactionController.getRecent(req, res, jest.fn());
      await waitForAsyncHandler();

      expect(mockTransactionService.getRecent).toHaveBeenCalledWith('user-123', 5);
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('should handle errors when service throws', async () => {
      const error = new Error('Database error');
      mockTransactionService.getRecent.mockRejectedValue(error);

      const req = createMockRequest({
        query: {},
      });
      const res = createMockResponse();
      const next = jest.fn();

      transactionController.getRecent(req, res, next);
      await waitForAsyncHandler();

      expect(next).toHaveBeenCalledWith(error);
    });
  });
});

