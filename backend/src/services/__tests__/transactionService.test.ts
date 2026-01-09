// Mock dependencies - jest.mock() calls are hoisted to the top
const mockFindAll = jest.fn();
const mockFindById = jest.fn();
const mockCreate = jest.fn();
const mockUpdate = jest.fn();
const mockDelete = jest.fn();
const mockGetRecentTransactions = jest.fn();

jest.mock('../../repositories/transactionRepository', () => ({
  __esModule: true,
  default: {
    findAll: mockFindAll,
    findById: mockFindById,
    create: mockCreate,
    update: mockUpdate,
    delete: mockDelete,
    getRecentTransactions: mockGetRecentTransactions,
  },
}));

const mockAccountFindById = jest.fn();
const mockAccountUpdateBalance = jest.fn();

jest.mock('../../repositories/accountRepository', () => ({
  __esModule: true,
  default: {
    findById: mockAccountFindById,
    updateBalance: mockAccountUpdateBalance,
  },
}));

const mockBudgetFindByUserCategoryAndYear = jest.fn();
const mockBudgetUpdateBalance = jest.fn();

jest.mock('../../repositories/budgetRepository', () => ({
  __esModule: true,
  default: {
    findByUserCategoryAndYear: mockBudgetFindByUserCategoryAndYear,
    updateBalance: mockBudgetUpdateBalance,
  },
}));

const mockConvertToBaseCurrency = jest.fn();

jest.mock('../../utils/currency', () => ({
  convertToBaseCurrency: mockConvertToBaseCurrency,
}));

const mockTransactionFindMany = jest.fn();
const mockAccountUpdate = jest.fn();

jest.mock('../../config/database', () => ({
  __esModule: true,
  default: {
    transaction: {
      findMany: mockTransactionFindMany,
    },
    account: {
      update: mockAccountUpdate,
    },
  },
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

import transactionService from '../transactionService';
import transactionRepository from '../../repositories/transactionRepository';
import accountRepository from '../../repositories/accountRepository';
import budgetRepository from '../../repositories/budgetRepository';
import { convertToBaseCurrency } from '../../utils/currency';
import prisma from '../../config/database';

describe('TransactionService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset the mock implementation to ensure clean state
    mockTransactionFindMany.mockReset();
  });

  describe('getAll', () => {
    it('should return all transactions for user', async () => {
      const userId = 'user-123';
      const mockTransactions = [
        { id: 'tx-1', amount: 100 },
        { id: 'tx-2', amount: 200 },
      ];

      mockFindAll.mockResolvedValue(mockTransactions);

      const result = await transactionService.getAll(userId);

      expect(mockFindAll).toHaveBeenCalledWith(userId, undefined);
      expect(result).toEqual(mockTransactions);
    });

    it('should return transactions with filters', async () => {
      const userId = 'user-123';
      const filters = { startDate: new Date('2024-01-01') };
      const mockTransactions = [{ id: 'tx-1', amount: 100 }];

      mockFindAll.mockResolvedValue(mockTransactions);

      const result = await transactionService.getAll(userId, filters);

      expect(mockFindAll).toHaveBeenCalledWith(userId, filters);
      expect(result).toEqual(mockTransactions);
    });
  });

  describe('getById', () => {
    it('should return transaction by id', async () => {
      const id = 'tx-123';
      const userId = 'user-123';
      const mockTransaction = { id, userId, amount: 100 };

      mockFindById.mockResolvedValue(mockTransaction);

      const result = await transactionService.getById(id, userId);

      expect(mockFindById).toHaveBeenCalledWith(id, userId);
      expect(result).toEqual(mockTransaction);
    });

    it('should throw error if transaction not found', async () => {
      const id = 'tx-123';
      const userId = 'user-123';

      mockFindById.mockResolvedValue(null);

      await expect(transactionService.getById(id, userId)).rejects.toThrow(
        'Transaction not found'
      );
    });
  });

  describe('create', () => {
    const userId = 'user-123';
    const mockAccount = {
      id: 'account-123',
      userId,
      balance: 1000,
      initialBalance: 500,
    };

    const transactionData = {
      accountId: 'account-123',
      currencyId: 'currency-1',
      date: '2024-01-15',
      amount: 100,
      description: 'Test transaction',
      transactionTypeId: 'type-1',
      budgetCategoryId: 'category-1',
    };

    it('should create transaction successfully', async () => {
      const mockTransaction = {
        id: 'tx-123',
        ...transactionData,
      };

      mockAccountFindById.mockResolvedValue(mockAccount);
      mockCreate.mockResolvedValue(mockTransaction);
      mockTransactionFindMany
        .mockResolvedValueOnce([]) // for account balance update
        .mockResolvedValueOnce([]); // for budget balance update
      mockAccountUpdateBalance.mockResolvedValue({});
      mockBudgetFindByUserCategoryAndYear.mockResolvedValue(null);

      const result = await transactionService.create(userId, transactionData);

      expect(mockAccountFindById).toHaveBeenCalledWith(transactionData.accountId, userId);
      expect(mockCreate).toHaveBeenCalled();
      expect(result).toEqual(mockTransaction);
    });

    it('should throw error if account not found', async () => {
      mockAccountFindById.mockResolvedValue(null);

      await expect(transactionService.create(userId, transactionData)).rejects.toThrow(
        'Account not found'
      );
    });

    it('should update account balance after creation', async () => {
      const mockTransaction = {
        id: 'tx-123',
        ...transactionData,
      };

      const mockTransactions = [
        {
          id: 'tx-1',
          amount: 100,
          transactionType: {
            name: 'INCOME',
          },
        },
      ];

      mockAccountFindById
        .mockResolvedValueOnce(mockAccount)
        .mockResolvedValueOnce(mockAccount);
      mockCreate.mockResolvedValue(mockTransaction);
      mockTransactionFindMany
        .mockResolvedValueOnce(mockTransactions) // for account balance update
        .mockResolvedValueOnce([]); // for budget balance update
      mockAccountUpdateBalance.mockResolvedValue({});
      mockBudgetFindByUserCategoryAndYear.mockResolvedValue(null);

      await transactionService.create(userId, transactionData);

      expect(mockAccountUpdateBalance).toHaveBeenCalled();
    });

    it('should update budget balance after creation', async () => {
      const mockTransaction = {
        id: 'tx-123',
        ...transactionData,
      };

      const mockBudget = {
        id: 'budget-1',
        startingBalance: 1000,
      };

      const mockBudgetTransactions = [
        {
          id: 'tx-1',
          amount: 50,
          currency: {
            code: 'USD',
          },
          transactionType: {
            name: 'EXPENSE',
          },
          expenseType: null,
        },
      ];

      mockAccountFindById.mockResolvedValue(mockAccount);
      mockCreate.mockResolvedValue(mockTransaction);
      mockTransactionFindMany
        .mockResolvedValueOnce([]) // for account balance update
        .mockResolvedValueOnce(mockBudgetTransactions); // for budget balance update
      mockAccountUpdateBalance.mockResolvedValue({});
      mockBudgetFindByUserCategoryAndYear.mockResolvedValue(mockBudget);
      mockConvertToBaseCurrency.mockResolvedValue(50);
      mockBudgetUpdateBalance.mockResolvedValue({});

      await transactionService.create(userId, transactionData);

      expect(mockBudgetFindByUserCategoryAndYear).toHaveBeenCalled();
      expect(mockBudgetUpdateBalance).toHaveBeenCalled();
    });

    it('should handle optional fields in transaction data', async () => {
      const transactionDataWithOptional = {
        ...transactionData,
        expenseTypeId: 'expense-1',
        isReimbursable: true,
        reimbursementId: 'reimb-1',
        linkedTransactionId: 'linked-1',
        notes: 'Test notes',
      };

      const mockTransaction = {
        id: 'tx-123',
        ...transactionDataWithOptional,
      };

      mockAccountFindById.mockResolvedValue(mockAccount);
      mockCreate.mockResolvedValue(mockTransaction);
      mockTransactionFindMany
        .mockResolvedValueOnce([]) // for account balance update
        .mockResolvedValueOnce([]); // for budget balance update
      mockAccountUpdateBalance.mockResolvedValue({});
      mockBudgetFindByUserCategoryAndYear.mockResolvedValue(null);

      const result = await transactionService.create(userId, transactionDataWithOptional);

      expect(mockCreate).toHaveBeenCalled();
      expect(result).toEqual(mockTransaction);
    });
  });

  describe('update', () => {
    const userId = 'user-123';
    const transactionId = 'tx-123';
    const existingTransaction = {
      id: transactionId,
      userId,
      accountId: 'account-123',
      budgetCategoryId: 'category-1',
      amount: 100,
    };

    const updateData = {
      amount: 200,
      description: 'Updated description',
    };

    it('should update transaction successfully', async () => {
      const updatedTransaction = {
        ...existingTransaction,
        ...updateData,
      };

      mockFindById
        .mockResolvedValueOnce(existingTransaction)
        .mockResolvedValueOnce(updatedTransaction);
      mockUpdate.mockResolvedValue({});
      mockAccountFindById.mockResolvedValue({
        id: 'account-123',
        userId,
        balance: 1000,
        initialBalance: 500,
      });
      mockTransactionFindMany
        .mockResolvedValueOnce([]) // for account balance update
        .mockResolvedValueOnce([]); // for budget balance update
      mockAccountUpdateBalance.mockResolvedValue({});
      mockBudgetFindByUserCategoryAndYear.mockResolvedValue(null);

      const result = await transactionService.update(transactionId, userId, updateData);

      expect(mockFindById).toHaveBeenCalledWith(transactionId, userId);
      expect(mockUpdate).toHaveBeenCalled();
      expect(result).toEqual(updatedTransaction);
    });

    it('should throw error if transaction not found', async () => {
      mockFindById.mockResolvedValue(null);

      await expect(transactionService.update(transactionId, userId, updateData)).rejects.toThrow(
        'Transaction not found'
      );
    });

    it('should update account and budget balances after update', async () => {
      const updatedTransaction = {
        ...existingTransaction,
        ...updateData,
      };

      mockFindById
        .mockResolvedValueOnce(existingTransaction)
        .mockResolvedValueOnce(updatedTransaction);
      mockUpdate.mockResolvedValue({});
      mockAccountFindById.mockResolvedValue({
        id: 'account-123',
        userId,
        balance: 1000,
        initialBalance: 500,
      });
      mockTransactionFindMany
        .mockResolvedValueOnce([]) // for account balance update
        .mockResolvedValueOnce([]); // for budget balance update
      mockAccountUpdateBalance.mockResolvedValue({});
      mockBudgetFindByUserCategoryAndYear.mockResolvedValue(null);

      await transactionService.update(transactionId, userId, updateData);

      expect(mockAccountUpdateBalance).toHaveBeenCalled();
    });

    it('should handle date conversion in update data', async () => {
      const updateDataWithDate = {
        ...updateData,
        date: '2024-02-15',
      };

      const updatedTransaction = {
        ...existingTransaction,
        ...updateDataWithDate,
      };

      mockFindById
        .mockResolvedValueOnce(existingTransaction)
        .mockResolvedValueOnce(updatedTransaction);
      mockUpdate.mockResolvedValue({});
      mockAccountFindById.mockResolvedValue({
        id: 'account-123',
        userId,
        balance: 1000,
        initialBalance: 500,
      });
      mockTransactionFindMany
        .mockResolvedValueOnce([]) // for account balance update
        .mockResolvedValueOnce([]); // for budget balance update
      mockAccountUpdateBalance.mockResolvedValue({});
      mockBudgetFindByUserCategoryAndYear.mockResolvedValue(null);

      await transactionService.update(transactionId, userId, updateDataWithDate);

      expect(mockUpdate).toHaveBeenCalledWith(
        transactionId,
        userId,
        expect.objectContaining({
          date: expect.any(Date),
        })
      );
    });
  });

  describe('delete', () => {
    const userId = 'user-123';
    const transactionId = 'tx-123';
    const existingTransaction = {
      id: transactionId,
      userId,
      accountId: 'account-123',
      budgetCategoryId: 'category-1',
    };

    it('should delete transaction successfully', async () => {
      mockFindById.mockResolvedValue(existingTransaction);
      mockDelete.mockResolvedValue({});
      mockAccountFindById.mockResolvedValue({
        id: 'account-123',
        userId,
        balance: 1000,
        initialBalance: 500,
      });
      mockTransactionFindMany
        .mockResolvedValueOnce([]) // for account balance update
        .mockResolvedValueOnce([]); // for budget balance update
      mockAccountUpdateBalance.mockResolvedValue({});
      mockBudgetFindByUserCategoryAndYear.mockResolvedValue(null);

      await transactionService.delete(transactionId, userId);

      expect(mockFindById).toHaveBeenCalledWith(transactionId, userId);
      expect(mockDelete).toHaveBeenCalledWith(transactionId, userId);
    });

    it('should throw error if transaction not found', async () => {
      mockFindById.mockResolvedValue(null);

      await expect(transactionService.delete(transactionId, userId)).rejects.toThrow(
        'Transaction not found'
      );
    });

    it('should update account and budget balances after delete', async () => {
      mockFindById.mockResolvedValue(existingTransaction);
      mockDelete.mockResolvedValue({});
      mockAccountFindById.mockResolvedValue({
        id: 'account-123',
        userId,
        balance: 1000,
        initialBalance: 500,
      });
      mockTransactionFindMany
        .mockResolvedValueOnce([]) // for account balance update
        .mockResolvedValueOnce([]); // for budget balance update
      mockAccountUpdateBalance.mockResolvedValue({});
      mockBudgetFindByUserCategoryAndYear.mockResolvedValue(null);

      await transactionService.delete(transactionId, userId);

      expect(mockAccountUpdateBalance).toHaveBeenCalled();
    });
  });

  describe('getRecent', () => {
    it('should return recent transactions with default limit', async () => {
      const userId = 'user-123';
      const mockTransactions = [
        { id: 'tx-1', amount: 100 },
        { id: 'tx-2', amount: 200 },
      ];

      mockGetRecentTransactions.mockResolvedValue(mockTransactions);

      const result = await transactionService.getRecent(userId);

      expect(mockGetRecentTransactions).toHaveBeenCalledWith(userId, 10);
      expect(result).toEqual(mockTransactions);
    });

    it('should return recent transactions with custom limit', async () => {
      const userId = 'user-123';
      const limit = 5;
      const mockTransactions = [{ id: 'tx-1', amount: 100 }];

      mockGetRecentTransactions.mockResolvedValue(mockTransactions);

      const result = await transactionService.getRecent(userId, limit);

      expect(mockGetRecentTransactions).toHaveBeenCalledWith(userId, limit);
      expect(result).toEqual(mockTransactions);
    });
  });

  describe('updateAccountBalance (via create/update/delete)', () => {
    const userId = 'user-123';
    const accountId = 'account-123';

    it('should calculate balance from initialBalance and transactions', async () => {
      const account = {
        id: accountId,
        userId,
        balance: 1000,
        initialBalance: 500,
      };

      const transactions = [
        {
          id: 'tx-1',
          amount: 200,
          transactionType: {
            name: 'INCOME',
          },
        },
        {
          id: 'tx-2',
          amount: 100,
          transactionType: {
            name: 'EXPENSE',
          },
        },
      ];

      // First call is for validation in create, second is in updateAccountBalance
      mockAccountFindById
        .mockResolvedValueOnce(account)
        .mockResolvedValueOnce(account);
      mockAccountUpdateBalance.mockResolvedValue({});

      // Call via create
      const transactionData = {
        accountId,
        currencyId: 'currency-1',
        date: '2024-01-15',
        amount: 50,
        description: 'Test',
        transactionTypeId: 'type-1',
        budgetCategoryId: 'category-1',
      };

      mockCreate.mockResolvedValue({ id: 'tx-123' });
      // The service queries transactions AFTER creating
      // First call: updateAccountBalance queries all transactions for the account (where: { accountId })
      // Second call: updateBudgetBalance queries transactions for the budget category (where: { userId, budgetCategoryId, date })
      mockTransactionFindMany.mockImplementation((query: any) => {
        // If query has accountId, it's for account balance update
        if (query?.where?.accountId) {
          return Promise.resolve(transactions);
        }
        // Otherwise, it's for budget balance update
        return Promise.resolve([]);
      });
      mockBudgetFindByUserCategoryAndYear.mockResolvedValue(null);

      await transactionService.create(userId, transactionData);

      // Verify the mock was called
      expect(mockTransactionFindMany).toHaveBeenCalled();
      // Balance = 500 (initial) + 200 (income) - 100 (expense) = 600
      expect(mockAccountUpdateBalance).toHaveBeenCalledWith(accountId, 600);
    });

    it('should calculate initialBalance when not set', async () => {
      const account = {
        id: accountId,
        userId,
        balance: 1000,
        initialBalance: 0,
      };

      const transactions = [
        {
          id: 'tx-1',
          amount: 500,
          transactionType: {
            name: 'INCOME',
          },
        },
        {
          id: 'tx-2',
          amount: 100,
          transactionType: {
            name: 'EXPENSE',
          },
        },
      ];

      mockAccountFindById
        .mockResolvedValueOnce(account)
        .mockResolvedValueOnce(account);
      mockAccountUpdate.mockResolvedValue({});
      mockAccountUpdateBalance.mockResolvedValue({});

      // Call via create
      const transactionData = {
        accountId,
        currencyId: 'currency-1',
        date: '2024-01-15',
        amount: 50,
        description: 'Test',
        transactionTypeId: 'type-1',
        budgetCategoryId: 'category-1',
      };

      mockCreate.mockResolvedValue({ id: 'tx-123' });
      mockTransactionFindMany.mockImplementation((query: any) => {
        // If query has accountId, it's for account balance update
        if (query?.where?.accountId) {
          return Promise.resolve(transactions);
        }
        // Otherwise, it's for budget balance update
        return Promise.resolve([]);
      });
      mockBudgetFindByUserCategoryAndYear.mockResolvedValue(null);

      await transactionService.create(userId, transactionData);

      // initialBalance calculation happens when balance !== 0 and transactions.length > 0
      // transactionSum = 500 (income) - 100 (expense) = 400
      // initialBalance = 1000 - 400 = 600
      expect(mockAccountUpdate).toHaveBeenCalledWith({
        where: { id: accountId },
        data: { initialBalance: 600 },
      });
    });

    it('should handle account with balance = 0 and no transactions', async () => {
      const account = {
        id: accountId,
        userId,
        balance: 0,
        initialBalance: 0,
      };

      // First call is for validation in create, second is in updateAccountBalance
      mockAccountFindById
        .mockResolvedValueOnce(account)
        .mockResolvedValueOnce(account);
      mockAccountUpdateBalance.mockResolvedValue({});

      // Call via create
      const transactionData = {
        accountId,
        currencyId: 'currency-1',
        date: '2024-01-15',
        amount: 50,
        description: 'Test',
        transactionTypeId: 'type-1',
        budgetCategoryId: 'category-1',
      };

      mockCreate.mockResolvedValue({ id: 'tx-123' });
      mockTransactionFindMany
        .mockResolvedValueOnce([]) // for account balance update
        .mockResolvedValueOnce([]); // for budget balance update
      mockBudgetFindByUserCategoryAndYear.mockResolvedValue(null);

      await transactionService.create(userId, transactionData);

      // Should not update initialBalance when balance is 0
      expect(mockAccountUpdate).not.toHaveBeenCalled();
    });

    it('should handle different transaction types correctly', async () => {
      const account = {
        id: accountId,
        userId,
        balance: 1000,
        initialBalance: 500,
      };

      const transactions = [
        {
          id: 'tx-1',
          amount: 200,
          transactionType: {
            name: 'INCOME',
          },
        },
        {
          id: 'tx-2',
          amount: 100,
          transactionType: {
            name: 'REIMBURSEMENT',
          },
        },
        {
          id: 'tx-3',
          amount: 50,
          transactionType: {
            name: 'ACCOUNT_TRANSFER_IN',
          },
        },
        {
          id: 'tx-4',
          amount: 75,
          transactionType: {
            name: 'EXPENSE',
          },
        },
        {
          id: 'tx-5',
          amount: 25,
          transactionType: {
            name: 'TRANSFER',
          },
        },
      ];

      // First call is for validation in create, second is in updateAccountBalance
      mockAccountFindById
        .mockResolvedValueOnce(account)
        .mockResolvedValueOnce(account);
      mockAccountUpdateBalance.mockResolvedValue({});

      // Call via create
      const transactionData = {
        accountId,
        currencyId: 'currency-1',
        date: '2024-01-15',
        amount: 50,
        description: 'Test',
        transactionTypeId: 'type-1',
        budgetCategoryId: 'category-1',
      };

      mockCreate.mockResolvedValue({ id: 'tx-123' });
      mockTransactionFindMany.mockImplementation((query: any) => {
        // If query has accountId, it's for account balance update
        if (query?.where?.accountId) {
          return Promise.resolve(transactions);
        }
        // Otherwise, it's for budget balance update
        return Promise.resolve([]);
      });
      mockBudgetFindByUserCategoryAndYear.mockResolvedValue(null);

      await transactionService.create(userId, transactionData);

      // Balance = 500 (initial) + 200 (income) + 100 (reimbursement) + 50 (transfer in) - 75 (expense) - 25 (transfer) = 750
      expect(mockAccountUpdateBalance).toHaveBeenCalledWith(accountId, 750);
    });

    it('should return early if account not found', async () => {
      mockAccountFindById.mockResolvedValue(null);

      // Call via create
      const transactionData = {
        accountId,
        currencyId: 'currency-1',
        date: '2024-01-15',
        amount: 50,
        description: 'Test',
        transactionTypeId: 'type-1',
        budgetCategoryId: 'category-1',
      };

      mockCreate.mockResolvedValue({ id: 'tx-123' });
      mockTransactionFindMany
        .mockResolvedValueOnce([]) // for account balance update
        .mockResolvedValueOnce([]); // for budget balance update
      mockBudgetFindByUserCategoryAndYear.mockResolvedValue(null);

      // This will fail at account validation, but if it didn't, updateAccountBalance would return early
      await expect(transactionService.create(userId, transactionData)).rejects.toThrow(
        'Account not found'
      );
    });
  });

  describe('updateBudgetBalance (via create/update/delete)', () => {
    const userId = 'user-123';
    const categoryId = 'category-1';
    const currentYear = new Date().getFullYear();

    it('should calculate budget balance from startingBalance and transactions', async () => {
      const budget = {
        id: 'budget-1',
        startingBalance: 1000,
      };

      const transactions = [
        {
          id: 'tx-1',
          amount: 100,
          currency: {
            code: 'USD',
          },
          transactionType: {
            name: 'INCOME',
          },
          expenseType: null,
        },
        {
          id: 'tx-2',
          amount: 50,
          currency: {
            code: 'USD',
          },
          transactionType: {
            name: 'EXPENSE',
          },
          expenseType: null,
        },
      ];

      mockBudgetFindByUserCategoryAndYear.mockResolvedValue(budget);
      mockConvertToBaseCurrency
        .mockResolvedValueOnce(100) // INCOME
        .mockResolvedValueOnce(50); // EXPENSE
      mockBudgetUpdateBalance.mockResolvedValue({});

      // Call via create
      const transactionData = {
        accountId: 'account-123',
        currencyId: 'currency-1',
        date: '2024-01-15',
        amount: 50,
        description: 'Test',
        transactionTypeId: 'type-1',
        budgetCategoryId: categoryId,
      };

      // First call is for validation in create, second is in updateAccountBalance
      const mockAccount = {
        id: 'account-123',
        userId,
        balance: 1000,
        initialBalance: 500,
      };
      mockAccountFindById
        .mockResolvedValueOnce(mockAccount)
        .mockResolvedValueOnce(mockAccount);
      mockCreate.mockResolvedValue({ id: 'tx-123' });
      mockTransactionFindMany.mockImplementation((query: any) => {
        // If query has accountId, it's for account balance update
        if (query?.where?.accountId) {
          return Promise.resolve([]);
        }
        // Otherwise, it's for budget balance update (has budgetCategoryId)
        if (query?.where?.budgetCategoryId) {
          return Promise.resolve(transactions);
        }
        return Promise.resolve([]);
      });
      mockAccountUpdateBalance.mockResolvedValue({});

      await transactionService.create(userId, transactionData);

      // Balance = 1000 (starting) + 100 (income) - 50 (expense) = 1050
      expect(mockBudgetUpdateBalance).toHaveBeenCalledWith('budget-1', 1050);
    });

    it('should exclude inter-account transfers from budget balance', async () => {
      const budget = {
        id: 'budget-1',
        startingBalance: 1000,
      };

      const transactions = [
        {
          id: 'tx-1',
          amount: 100,
          currency: {
            code: 'USD',
          },
          transactionType: {
            name: 'EXPENSE',
          },
          expenseType: {
            name: 'Transferencia Entre Cuentas',
          },
        },
        {
          id: 'tx-2',
          amount: 50,
          currency: {
            code: 'USD',
          },
          transactionType: {
            name: 'EXPENSE',
          },
          expenseType: {
            name: 'Food',
          },
        },
      ];

      mockBudgetFindByUserCategoryAndYear.mockResolvedValue(budget);
      mockConvertToBaseCurrency.mockResolvedValue(50);
      mockBudgetUpdateBalance.mockResolvedValue({});

      // Call via create
      const transactionData = {
        accountId: 'account-123',
        currencyId: 'currency-1',
        date: '2024-01-15',
        amount: 50,
        description: 'Test',
        transactionTypeId: 'type-1',
        budgetCategoryId: categoryId,
      };

      // First call is for validation in create, second is in updateAccountBalance
      const mockAccount = {
        id: 'account-123',
        userId,
        balance: 1000,
        initialBalance: 500,
      };
      mockAccountFindById
        .mockResolvedValueOnce(mockAccount)
        .mockResolvedValueOnce(mockAccount);
      mockCreate.mockResolvedValue({ id: 'tx-123' });
      mockTransactionFindMany.mockImplementation((query: any) => {
        // If query has accountId, it's for account balance update
        if (query?.where?.accountId) {
          return Promise.resolve([]);
        }
        // Otherwise, it's for budget balance update (has budgetCategoryId)
        if (query?.where?.budgetCategoryId) {
          return Promise.resolve(transactions);
        }
        return Promise.resolve([]);
      });
      mockAccountUpdateBalance.mockResolvedValue({});

      await transactionService.create(userId, transactionData);

      // Should only process Food expense, not Transferencia Entre Cuentas
      // The service skips Transferencia Entre Cuentas before calling convertToBaseCurrency
      expect(mockConvertToBaseCurrency).toHaveBeenCalledTimes(1);
      expect(mockBudgetUpdateBalance).toHaveBeenCalledWith('budget-1', 950); // 1000 - 50
    });

    it('should exclude ACCOUNT_TRANSFER_IN and REIMBURSEMENT from budget balance', async () => {
      const budget = {
        id: 'budget-1',
        startingBalance: 1000,
      };

      const transactions = [
        {
          id: 'tx-1',
          amount: 200,
          currency: {
            code: 'USD',
          },
          transactionType: {
            name: 'ACCOUNT_TRANSFER_IN',
          },
          expenseType: {
            name: 'Food',
          },
        },
        {
          id: 'tx-2',
          amount: 150,
          currency: {
            code: 'USD',
          },
          transactionType: {
            name: 'REIMBURSEMENT',
          },
          expenseType: {
            name: 'Food',
          },
        },
        {
          id: 'tx-3',
          amount: 50,
          currency: {
            code: 'USD',
          },
          transactionType: {
            name: 'INCOME',
          },
          expenseType: null,
        },
      ];

      mockBudgetFindByUserCategoryAndYear.mockResolvedValue(budget);
      mockConvertToBaseCurrency.mockResolvedValue(50);
      mockBudgetUpdateBalance.mockResolvedValue({});

      // Call via create
      const transactionData = {
        accountId: 'account-123',
        currencyId: 'currency-1',
        date: '2024-01-15',
        amount: 50,
        description: 'Test',
        transactionTypeId: 'type-1',
        budgetCategoryId: categoryId,
      };

      // First call is for validation in create, second is in updateAccountBalance
      const mockAccount = {
        id: 'account-123',
        userId,
        balance: 1000,
        initialBalance: 500,
      };
      mockAccountFindById
        .mockResolvedValueOnce(mockAccount)
        .mockResolvedValueOnce(mockAccount);
      mockCreate.mockResolvedValue({ id: 'tx-123' });
      mockTransactionFindMany.mockImplementation((query: any) => {
        // If query has accountId, it's for account balance update
        if (query?.where?.accountId) {
          return Promise.resolve([]);
        }
        // Otherwise, it's for budget balance update (has budgetCategoryId)
        if (query?.where?.budgetCategoryId) {
          return Promise.resolve(transactions);
        }
        return Promise.resolve([]);
      });
      mockAccountUpdateBalance.mockResolvedValue({});

      await transactionService.create(userId, transactionData);

      // Should only process INCOME, not ACCOUNT_TRANSFER_IN or REIMBURSEMENT
      // The service skips ACCOUNT_TRANSFER_IN and REIMBURSEMENT before calling convertToBaseCurrency
      expect(mockConvertToBaseCurrency).toHaveBeenCalledTimes(1);
      expect(mockBudgetUpdateBalance).toHaveBeenCalledWith('budget-1', 1050); // 1000 + 50
    });

    it('should return early if budget not found', async () => {
      mockBudgetFindByUserCategoryAndYear.mockResolvedValue(null);

      // Call via create
      const transactionData = {
        accountId: 'account-123',
        currencyId: 'currency-1',
        date: '2024-01-15',
        amount: 50,
        description: 'Test',
        transactionTypeId: 'type-1',
        budgetCategoryId: categoryId,
      };

      // First call is for validation in create, second is in updateAccountBalance
      const mockAccount = {
        id: 'account-123',
        userId,
        balance: 1000,
        initialBalance: 500,
      };
      mockAccountFindById
        .mockResolvedValueOnce(mockAccount)
        .mockResolvedValueOnce(mockAccount);
      mockCreate.mockResolvedValue({ id: 'tx-123' });
      mockTransactionFindMany
        .mockResolvedValueOnce([]) // for account balance update
        .mockResolvedValueOnce([]); // for budget balance update
      mockAccountUpdateBalance.mockResolvedValue({});

      await transactionService.create(userId, transactionData);

      // Should not update budget balance if budget not found
      expect(mockBudgetUpdateBalance).not.toHaveBeenCalled();
    });

    it('should handle TRANSFER transactions as expenses in budget', async () => {
      const budget = {
        id: 'budget-1',
        startingBalance: 1000,
      };

      const transactions = [
        {
          id: 'tx-1',
          amount: 100,
          currency: {
            code: 'USD',
          },
          transactionType: {
            name: 'TRANSFER',
          },
          expenseType: null,
        },
      ];

      mockBudgetFindByUserCategoryAndYear.mockResolvedValue(budget);
      mockConvertToBaseCurrency.mockResolvedValue(100);
      mockBudgetUpdateBalance.mockResolvedValue({});

      // Call via create
      const transactionData = {
        accountId: 'account-123',
        currencyId: 'currency-1',
        date: '2024-01-15',
        amount: 50,
        description: 'Test',
        transactionTypeId: 'type-1',
        budgetCategoryId: categoryId,
      };

      // First call is for validation in create, second is in updateAccountBalance
      const mockAccount = {
        id: 'account-123',
        userId,
        balance: 1000,
        initialBalance: 500,
      };
      mockAccountFindById
        .mockResolvedValueOnce(mockAccount)
        .mockResolvedValueOnce(mockAccount);
      mockCreate.mockResolvedValue({ id: 'tx-123' });
      mockTransactionFindMany.mockImplementation((query: any) => {
        // If query has accountId, it's for account balance update
        if (query?.where?.accountId) {
          return Promise.resolve([]);
        }
        // Otherwise, it's for budget balance update (has budgetCategoryId)
        if (query?.where?.budgetCategoryId) {
          return Promise.resolve(transactions);
        }
        return Promise.resolve([]);
      });
      mockAccountUpdateBalance.mockResolvedValue({});

      await transactionService.create(userId, transactionData);

      // TRANSFER should be treated as expense
      // Balance = 1000 (starting) - 100 (TRANSFER as expense) = 900
      expect(mockBudgetUpdateBalance).toHaveBeenCalledWith('budget-1', 900); // 1000 - 100
    });
  });
});

