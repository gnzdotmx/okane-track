// Mock dependencies - jest.mock() calls are hoisted to the top
jest.mock('../../repositories/accountRepository');

// Create mock functions that will be used in the factory
// These need to be defined before the mock, but jest.mock is hoisted
// so we'll create them in the factory and access them via the imported module
jest.mock('../../config/database', () => {
  const mockTransactionFindMany = jest.fn();
  const mockAccountUpdate = jest.fn();
  
  return {
    __esModule: true,
    default: {
      transaction: {
        findMany: mockTransactionFindMany,
      },
      account: {
        update: mockAccountUpdate,
      },
    },
  };
});
jest.mock('../../utils/currency', () => ({
  updateExchangeRates: jest.fn(),
}));

import { Response } from 'express';
import accountController from '../accountController';
import accountRepository from '../../repositories/accountRepository';
import { AuthRequest } from '../../types';
import prisma from '../../config/database';

// Helper functions to get mock functions from the mocked module
// Access them directly from the imported prisma object
const getMockPrismaTransactionFindMany = () => (prisma as any).transaction.findMany;
const getMockPrismaAccountUpdate = () => (prisma as any).account.update;

const mockAccountRepository = accountRepository as jest.Mocked<typeof accountRepository>;

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

describe('AccountController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset prisma mock functions
    const mockTransactionFindMany = getMockPrismaTransactionFindMany();
    const mockAccountUpdate = getMockPrismaAccountUpdate();
    if (mockTransactionFindMany && typeof mockTransactionFindMany.mockClear === 'function') {
      mockTransactionFindMany.mockClear();
    }
    if (mockAccountUpdate && typeof mockAccountUpdate.mockClear === 'function') {
      mockAccountUpdate.mockClear();
    }
  });

  describe('getAll', () => {
    it('should return all accounts for the user', async () => {
      const mockAccounts = [
        {
          id: 'account-1',
          name: 'Checking Account',
          type: 'CHECKING',
          balance: 1000,
          currency: { id: 'currency-1', code: 'USD', symbol: '$' },
        },
        {
          id: 'account-2',
          name: 'Savings Account',
          type: 'SAVINGS',
          balance: 5000,
          currency: { id: 'currency-1', code: 'USD', symbol: '$' },
        },
      ];

      mockAccountRepository.findAllByUser.mockResolvedValue(mockAccounts as any);

      const req = createMockRequest();
      const res = createMockResponse();

      accountController.getAll(req, res, jest.fn());
      await waitForAsyncHandler();

      expect(mockAccountRepository.findAllByUser).toHaveBeenCalledWith('user-123');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockAccounts,
      });
    });

    it('should handle errors when repository throws', async () => {
      const error = new Error('Database error');
      mockAccountRepository.findAllByUser.mockRejectedValue(error);

      const req = createMockRequest();
      const res = createMockResponse();
      const next = jest.fn();

      accountController.getAll(req, res, next);
      await waitForAsyncHandler();

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe('getById', () => {
    it('should return account when found', async () => {
      const mockAccount = {
        id: 'account-1',
        name: 'Checking Account',
        type: 'CHECKING',
        balance: 1000,
        currency: { id: 'currency-1', code: 'USD', symbol: '$' },
      };

      mockAccountRepository.findById.mockResolvedValue(mockAccount as any);

      const req = createMockRequest({ params: { id: 'account-1' } });
      const res = createMockResponse();

      accountController.getById(req, res, jest.fn());
      await waitForAsyncHandler();

      expect(mockAccountRepository.findById).toHaveBeenCalledWith('account-1', 'user-123');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockAccount,
      });
    });

    it('should return 404 when account not found', async () => {
      mockAccountRepository.findById.mockResolvedValue(null);

      const req = createMockRequest({ params: { id: 'non-existent' } });
      const res = createMockResponse();

      accountController.getById(req, res, jest.fn());
      await waitForAsyncHandler();

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Account not found',
      });
    });
  });

  describe('create', () => {
    it('should create account with provided balance', async () => {
      const mockAccount = {
        id: 'account-1',
        name: 'New Account',
        type: 'CHECKING',
        balance: 500,
        initialBalance: 500,
        currency: { id: 'currency-1', code: 'USD', symbol: '$' },
      };

      mockAccountRepository.create.mockResolvedValue(mockAccount as any);

      const req = createMockRequest({
        body: {
          name: 'New Account',
          type: 'CHECKING',
          currencyId: 'currency-1',
          balance: 500,
        },
      });
      const res = createMockResponse();

      accountController.create(req, res, jest.fn());
      await waitForAsyncHandler();

      expect(mockAccountRepository.create).toHaveBeenCalledWith({
        name: 'New Account',
        type: 'CHECKING',
        balance: 500,
        initialBalance: 500,
        user: { connect: { id: 'user-123' } },
        currency: { connect: { id: 'currency-1' } },
      });
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Account created successfully',
        data: mockAccount,
      });
    });

    it('should create account with default balance of 0 when balance not provided', async () => {
      const mockAccount = {
        id: 'account-1',
        name: 'New Account',
        type: 'CHECKING',
        balance: 0,
        initialBalance: 0,
        currency: { id: 'currency-1', code: 'USD', symbol: '$' },
      };

      mockAccountRepository.create.mockResolvedValue(mockAccount as any);

      const req = createMockRequest({
        body: {
          name: 'New Account',
          type: 'CHECKING',
          currencyId: 'currency-1',
        },
      });
      const res = createMockResponse();

      accountController.create(req, res, jest.fn());
      await waitForAsyncHandler();

      expect(mockAccountRepository.create).toHaveBeenCalledWith({
        name: 'New Account',
        type: 'CHECKING',
        balance: 0,
        initialBalance: 0,
        user: { connect: { id: 'user-123' } },
        currency: { connect: { id: 'currency-1' } },
      });
      expect(res.status).toHaveBeenCalledWith(201);
    });
  });

  describe('update', () => {
    it('should update account successfully', async () => {
      const mockAccount = {
        id: 'account-1',
        name: 'Updated Account',
        type: 'SAVINGS',
        balance: 1000,
        currency: { id: 'currency-1', code: 'USD', symbol: '$' },
      };

      mockAccountRepository.update.mockResolvedValue({ count: 1 } as any);
      mockAccountRepository.findById.mockResolvedValue(mockAccount as any);

      const req = createMockRequest({
        params: { id: 'account-1' },
        body: {
          name: 'Updated Account',
          type: 'SAVINGS',
          isActive: true,
        },
      });
      const res = createMockResponse();

      accountController.update(req, res, jest.fn());
      await waitForAsyncHandler();

      expect(mockAccountRepository.update).toHaveBeenCalledWith('account-1', 'user-123', {
        name: 'Updated Account',
        type: 'SAVINGS',
        isActive: true,
      });
      expect(mockAccountRepository.findById).toHaveBeenCalledWith('account-1', 'user-123');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Account updated successfully',
        data: mockAccount,
      });
    });
  });

  describe('delete', () => {
    it('should delete account successfully', async () => {
      mockAccountRepository.delete.mockResolvedValue({ count: 1 } as any);

      const req = createMockRequest({ params: { id: 'account-1' } });
      const res = createMockResponse();

      accountController.delete(req, res, jest.fn());
      await waitForAsyncHandler();

      expect(mockAccountRepository.delete).toHaveBeenCalledWith('account-1', 'user-123');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Account deleted successfully',
      });
    });
  });

  describe('getCurrencies', () => {
    it('should return all currencies', async () => {
      const mockCurrencies = [
        { id: 'currency-1', code: 'USD', symbol: '$', name: 'US Dollar' },
        { id: 'currency-2', code: 'EUR', symbol: '€', name: 'Euro' },
      ];

      mockAccountRepository.getCurrencies.mockResolvedValue(mockCurrencies as any);

      const req = createMockRequest();
      const res = createMockResponse();

      accountController.getCurrencies(req, res, jest.fn());
      await waitForAsyncHandler();

      expect(mockAccountRepository.getCurrencies).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockCurrencies,
      });
    });
  });

  describe('getExpenseTypes', () => {
    it('should return all expense types', async () => {
      const mockExpenseTypes = [
        { id: 'expense-1', name: 'Food', icon: '🍔', color: '#FF5733' },
        { id: 'expense-2', name: 'Transport', icon: '🚗', color: '#33C3F0' },
      ];

      mockAccountRepository.getExpenseTypes.mockResolvedValue(mockExpenseTypes as any);

      const req = createMockRequest();
      const res = createMockResponse();

      accountController.getExpenseTypes(req, res, jest.fn());
      await waitForAsyncHandler();

      expect(mockAccountRepository.getExpenseTypes).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockExpenseTypes,
      });
    });
  });

  describe('getTransactionTypes', () => {
    it('should return all transaction types', async () => {
      const mockTransactionTypes = [
        { id: 'type-1', name: 'INCOME' },
        { id: 'type-2', name: 'EXPENSE' },
        { id: 'type-3', name: 'TRANSFER' },
      ];

      mockAccountRepository.getTransactionTypes.mockResolvedValue(mockTransactionTypes as any);

      const req = createMockRequest();
      const res = createMockResponse();

      accountController.getTransactionTypes(req, res, jest.fn());
      await waitForAsyncHandler();

      expect(mockAccountRepository.getTransactionTypes).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockTransactionTypes,
      });
    });
  });

  describe('updateExchangeRates', () => {
    it('should update exchange rates successfully', async () => {
      const { updateExchangeRates } = require('../../utils/currency');
      const mockCurrencies = [
        { id: 'currency-1', code: 'USD', symbol: '$', name: 'US Dollar' },
      ];

      updateExchangeRates.mockResolvedValue(undefined);
      mockAccountRepository.getCurrencies.mockResolvedValue(mockCurrencies as any);

      const req = createMockRequest();
      const res = createMockResponse();

      accountController.updateExchangeRates(req, res, jest.fn());
      await waitForAsyncHandler();

      expect(updateExchangeRates).toHaveBeenCalled();
      expect(mockAccountRepository.getCurrencies).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Exchange rates updated successfully',
        data: mockCurrencies,
      });
    });

    it('should handle errors when updateExchangeRates fails', async () => {
      const { updateExchangeRates } = require('../../utils/currency');
      const error = new Error('Failed to fetch exchange rates');

      updateExchangeRates.mockRejectedValue(error);

      const req = createMockRequest();
      const res = createMockResponse();

      accountController.updateExchangeRates(req, res, jest.fn());
      await waitForAsyncHandler();

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Failed to fetch exchange rates',
      });
    });

    it('should handle errors with custom message', async () => {
      const { updateExchangeRates } = require('../../utils/currency');
      const error = { message: 'Network timeout' };

      updateExchangeRates.mockRejectedValue(error);

      const req = createMockRequest();
      const res = createMockResponse();

      accountController.updateExchangeRates(req, res, jest.fn());
      await waitForAsyncHandler();

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Network timeout',
      });
    });
  });

  describe('recalculateBalance', () => {
    it('should recalculate balance with provided initial balance', async () => {
      const mockAccount = {
        id: 'account-1',
        name: 'Test Account',
        balance: 1000,
        currency: { id: 'currency-1', code: 'USD', symbol: '$' },
      };

      const mockTransactions = [
        {
          id: 'tx-1',
          amount: 100,
          transactionType: { name: 'INCOME' },
        },
        {
          id: 'tx-2',
          amount: 50,
          transactionType: { name: 'EXPENSE' },
        },
      ];

      getMockPrismaTransactionFindMany().mockResolvedValue(mockTransactions);
      getMockPrismaAccountUpdate().mockResolvedValue({});
      mockAccountRepository.updateBalance.mockResolvedValue({} as any);
      // First call: check if account exists, Second call: get updated account
      mockAccountRepository.findById
        .mockResolvedValueOnce(mockAccount as any)
        .mockResolvedValueOnce({
          ...mockAccount,
          balance: 1050,
        } as any);

      const req = createMockRequest({
        params: { id: 'account-1' },
        body: { initialBalance: 1000 },
      });
      const res = createMockResponse();

      accountController.recalculateBalance(req, res, jest.fn());
      await waitForAsyncHandler();

      expect(mockAccountRepository.findById).toHaveBeenCalledWith('account-1', 'user-123');
      expect(getMockPrismaTransactionFindMany()).toHaveBeenCalledWith({
        where: { accountId: 'account-1' },
        include: { transactionType: true },
      });
      expect(getMockPrismaAccountUpdate()).toHaveBeenCalledWith({
        where: { id: 'account-1' },
        data: { initialBalance: 1000 },
      });
      expect(mockAccountRepository.updateBalance).toHaveBeenCalledWith('account-1', 1050);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Balance recalculated successfully',
        data: expect.objectContaining({
          account: expect.any(Object),
          initialBalance: 1000,
          calculatedBalance: 1050,
          transactionCount: 2,
        }),
      });
    });

    it('should calculate initial balance from transactions when not provided', async () => {
      const mockAccount = {
        id: 'account-1',
        name: 'Test Account',
        balance: 1000,
        currency: { id: 'currency-1', code: 'USD', symbol: '$' },
      };

      const mockTransactions = [
        {
          id: 'tx-1',
          amount: 200,
          transactionType: { name: 'INCOME' },
        },
        {
          id: 'tx-2',
          amount: 50,
          transactionType: { name: 'EXPENSE' },
        },
      ];

      getMockPrismaTransactionFindMany().mockResolvedValue(mockTransactions);
      getMockPrismaAccountUpdate().mockResolvedValue({});
      mockAccountRepository.updateBalance.mockResolvedValue({} as any);
      // First call: check if account exists, Second call: get updated account
      mockAccountRepository.findById
        .mockResolvedValueOnce(mockAccount as any)
        .mockResolvedValueOnce({
          ...mockAccount,
          balance: 1000, // Final balance: 850 (initial) + 200 (income) - 50 (expense) = 1000
        } as any);

      const req = createMockRequest({
        params: { id: 'account-1' },
        body: {},
      });
      const res = createMockResponse();

      accountController.recalculateBalance(req, res, jest.fn());
      await waitForAsyncHandler();

      // Initial balance should be: 1000 - (200 - 50) = 850
      // Final balance: 850 + 200 - 50 = 1000
      expect(getMockPrismaAccountUpdate()).toHaveBeenCalledWith({
        where: { id: 'account-1' },
        data: { initialBalance: 850 },
      });
      expect(mockAccountRepository.updateBalance).toHaveBeenCalledWith('account-1', 1000);
    });

    it('should handle REIMBURSEMENT and ACCOUNT_TRANSFER_IN as income', async () => {
      const mockAccount = {
        id: 'account-1',
        name: 'Test Account',
        balance: 1000,
        currency: { id: 'currency-1', code: 'USD', symbol: '$' },
      };

      const mockTransactions = [
        {
          id: 'tx-1',
          amount: 100,
          transactionType: { name: 'REIMBURSEMENT' },
        },
        {
          id: 'tx-2',
          amount: 200,
          transactionType: { name: 'ACCOUNT_TRANSFER_IN' },
        },
        {
          id: 'tx-3',
          amount: 50,
          transactionType: { name: 'EXPENSE' },
        },
      ];

      getMockPrismaTransactionFindMany().mockResolvedValue(mockTransactions);
      getMockPrismaAccountUpdate().mockResolvedValue({});
      mockAccountRepository.updateBalance.mockResolvedValue({} as any);
      // First call: check if account exists, Second call: get updated account
      mockAccountRepository.findById
        .mockResolvedValueOnce(mockAccount as any)
        .mockResolvedValueOnce({
          ...mockAccount,
          balance: 750,
        } as any);

      const req = createMockRequest({
        params: { id: 'account-1' },
        body: {},
      });
      const res = createMockResponse();

      accountController.recalculateBalance(req, res, jest.fn());
      await waitForAsyncHandler();

      // Initial balance: 1000 - (100 + 200 - 50) = 750
      // Final balance: 750 + 100 + 200 - 50 = 1000
      expect(mockAccountRepository.updateBalance).toHaveBeenCalledWith('account-1', 1000);
    });

    it('should handle TRANSFER as expense', async () => {
      const mockAccount = {
        id: 'account-1',
        name: 'Test Account',
        balance: 1000,
        currency: { id: 'currency-1', code: 'USD', symbol: '$' },
      };

      const mockTransactions = [
        {
          id: 'tx-1',
          amount: 100,
          transactionType: { name: 'INCOME' },
        },
        {
          id: 'tx-2',
          amount: 200,
          transactionType: { name: 'TRANSFER' },
        },
      ];

      getMockPrismaTransactionFindMany().mockResolvedValue(mockTransactions);
      getMockPrismaAccountUpdate().mockResolvedValue({});
      mockAccountRepository.updateBalance.mockResolvedValue({} as any);
      // First call: check if account exists, Second call: get updated account
      mockAccountRepository.findById
        .mockResolvedValueOnce(mockAccount as any)
        .mockResolvedValueOnce({
          ...mockAccount,
          balance: 900,
        } as any);

      const req = createMockRequest({
        params: { id: 'account-1' },
        body: {},
      });
      const res = createMockResponse();

      accountController.recalculateBalance(req, res, jest.fn());
      await waitForAsyncHandler();

      // Initial balance: 1000 - (100 - 200) = 1100
      // Final balance: 1100 + 100 - 200 = 1000
      expect(mockAccountRepository.updateBalance).toHaveBeenCalledWith('account-1', 1000);
    });

    it('should return 404 when account not found', async () => {
      mockAccountRepository.findById.mockResolvedValue(null);
      // Mocks are already initialized in beforeEach

      const req = createMockRequest({
        params: { id: 'non-existent' },
        body: { initialBalance: 1000 },
      });
      const res = createMockResponse();

      accountController.recalculateBalance(req, res, jest.fn());
      await waitForAsyncHandler();

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Account not found',
      });
      expect(getMockPrismaTransactionFindMany()).not.toHaveBeenCalled();
    });

    it('should handle errors when updating account fails', async () => {
      const mockAccount = {
        id: 'account-1',
        name: 'Test Account',
        balance: 1000,
        currency: { id: 'currency-1', code: 'USD', symbol: '$' },
      };

      const mockTransactions: any[] = [];

      getMockPrismaTransactionFindMany().mockResolvedValue(mockTransactions);
      getMockPrismaAccountUpdate().mockRejectedValue(new Error('Update failed'));
      mockAccountRepository.updateBalance.mockResolvedValue({} as any);
      // First call: check if account exists, Second call: get updated account
      mockAccountRepository.findById
        .mockResolvedValueOnce(mockAccount as any)
        .mockResolvedValueOnce(mockAccount as any);

      const req = createMockRequest({
        params: { id: 'account-1' },
        body: { initialBalance: 1000 },
      });
      const res = createMockResponse();

      // Should not throw, error is caught silently
      accountController.recalculateBalance(req, res, jest.fn());
      await waitForAsyncHandler();

      expect(mockAccountRepository.updateBalance).toHaveBeenCalled();
    });
  });
});

