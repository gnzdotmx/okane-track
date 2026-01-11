// Mock dependencies - jest.mock() calls are hoisted to the top
const mockFindById = jest.fn();
const mockFindAllByUser = jest.fn();
const mockGetCurrencies = jest.fn();
const mockGetExpenseTypes = jest.fn();
const mockGetTransactionTypes = jest.fn();
const mockUpdateBalance = jest.fn();

jest.mock('../../repositories/accountRepository', () => ({
  __esModule: true,
  default: {
    findById: mockFindById,
    findAllByUser: mockFindAllByUser,
    getCurrencies: mockGetCurrencies,
    getExpenseTypes: mockGetExpenseTypes,
    getTransactionTypes: mockGetTransactionTypes,
    updateBalance: mockUpdateBalance,
  },
}));

const mockFindAll = jest.fn();
const mockCreateMany = jest.fn();

jest.mock('../../repositories/transactionRepository', () => ({
  __esModule: true,
  default: {
    findAll: mockFindAll,
    createMany: mockCreateMany,
  },
}));

const mockGetBudgetCategories = jest.fn();
const mockFindByUserCategoryAndYear = jest.fn();
const mockUpdateBudgetBalance = jest.fn();

jest.mock('../../repositories/budgetRepository', () => ({
  __esModule: true,
  default: {
    getBudgetCategories: mockGetBudgetCategories,
    findByUserCategoryAndYear: mockFindByUserCategoryAndYear,
    updateBalance: mockUpdateBudgetBalance,
  },
}));

const mockParseUserCSV = jest.fn();
const mockParseAmount = jest.fn();
const mockParseDate = jest.fn();
const mockInferBudgetCategory = jest.fn();
const mockIsReimbursableExpense = jest.fn();
const mockExportToCSV = jest.fn();

jest.mock('../../utils/csvParser', () => ({
  parseUserCSV: mockParseUserCSV,
  parseAmount: mockParseAmount,
  parseDate: mockParseDate,
  inferBudgetCategory: mockInferBudgetCategory,
  isReimbursableExpense: mockIsReimbursableExpense,
  exportToCSV: mockExportToCSV,
}));

const mockConvertToBaseCurrency = jest.fn();

jest.mock('../../utils/currency', () => ({
  convertToBaseCurrency: mockConvertToBaseCurrency,
}));

const mockTransactionFindMany = jest.fn();
const mockAccountUpdate = jest.fn();
const mockImportHistoryCreate = jest.fn();
const mockImportHistoryFindMany = jest.fn();

jest.mock('../../config/database', () => ({
  __esModule: true,
  default: {
    transaction: {
      findMany: mockTransactionFindMany,
    },
    account: {
      update: mockAccountUpdate,
    },
    importHistory: {
      create: mockImportHistoryCreate,
      findMany: mockImportHistoryFindMany,
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

import importService from '../importService';
import accountRepository from '../../repositories/accountRepository';
import transactionRepository from '../../repositories/transactionRepository';
import budgetRepository from '../../repositories/budgetRepository';
import { parseUserCSV, parseAmount, parseDate, inferBudgetCategory, isReimbursableExpense, exportToCSV } from '../../utils/csvParser';
import { convertToBaseCurrency } from '../../utils/currency';
import prisma from '../../config/database';

describe('ImportService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('importCSV', () => {
    const userId = 'user-123';
    const accountId = 'account-123';
    const fileContent = 'CSV content';

    const mockAccount = {
      id: accountId,
      userId,
      currencyId: 'currency-1',
      balance: 1000,
      initialBalance: 500,
    };

    const mockCurrencies = [
      { id: 'currency-1', code: 'USD', symbol: '$' },
    ];

    const mockExpenseTypes = [
      { id: 'expense-1', name: 'Food' },
    ];

    const mockTransactionTypes = [
      { id: 'type-1', name: 'INCOME' },
      { id: 'type-2', name: 'EXPENSE' },
      { id: 'type-3', name: 'REIMBURSEMENT' },
      { id: 'type-4', name: 'ACCOUNT_TRANSFER_IN' },
    ];

    const mockBudgetCategories = [
      { id: 'category-1', name: 'Food' },
      { id: 'category-2', name: 'Expenses' },
    ];

    it('should import CSV with account information from CSV', async () => {
      const parsedTransactions = [
        {
          date: '2024-01-15',
          amount: '100',
          type: 'Food',
          description: 'Lunch',
          transactionType: 'EXPENSE',
          accountId: 'account-1',
          accountName: 'Checking Account',
        },
      ];

      const mockAccounts = [
        {
          id: 'account-1',
          name: 'Checking Account',
          userId: 'user-123',
          currencyId: 'currency-1',
        },
      ];

      mockParseUserCSV.mockReturnValue(parsedTransactions);
      mockFindAllByUser.mockResolvedValue(mockAccounts);
      // Mock findById for updateAccountBalanceAfterImport (called after import)
      mockFindById.mockResolvedValue({
        id: 'account-1',
        name: 'Checking Account',
        userId: 'user-123',
        currencyId: 'currency-1',
        balance: 0,
        initialBalance: 0,
      });
      mockGetCurrencies.mockResolvedValue(mockCurrencies);
      mockGetExpenseTypes.mockResolvedValue(mockExpenseTypes);
      mockGetTransactionTypes.mockResolvedValue(mockTransactionTypes);
      mockGetBudgetCategories.mockResolvedValue(mockBudgetCategories);
      mockParseAmount.mockReturnValue(100);
      mockParseDate.mockReturnValue(new Date('2024-01-15'));
      mockInferBudgetCategory.mockReturnValue('Expenses');
      mockIsReimbursableExpense.mockReturnValue(false);
      mockCreateMany.mockResolvedValue({ count: 1 });
      mockTransactionFindMany.mockResolvedValue([]);
      mockUpdateBalance.mockResolvedValue({});
      mockFindByUserCategoryAndYear.mockResolvedValue(null);
      mockUpdateBudgetBalance.mockResolvedValue({});
      mockImportHistoryCreate.mockResolvedValue({ id: 'history-1' });

      const result = await importService.importCSV('user-123', 'CSV content', undefined);

      expect(mockFindAllByUser).toHaveBeenCalledWith('user-123');
      // findById is called by updateAccountBalanceAfterImport, not for initial account lookup
      expect(mockFindById).toHaveBeenCalledWith('account-1', 'user-123');
      expect(result.success).toBe(true);
      expect(result.successCount).toBe(1);
      expect(mockCreateMany).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            accountId: 'account-1',
          }),
        ])
      );
    });

    it('should import CSV successfully', async () => {
      const parsedTransactions = [
        {
          date: '2024-01-15',
          amount: '100',
          type: 'Food',
          description: 'Lunch',
          transactionType: 'EXPENSE',
        },
      ];

      mockParseUserCSV.mockReturnValue(parsedTransactions);
      mockParseAmount.mockReturnValue(100);
      mockParseDate.mockReturnValue(new Date('2024-01-15'));
      mockInferBudgetCategory.mockReturnValue('Food');
      mockIsReimbursableExpense.mockReturnValue(false);

      mockFindById.mockResolvedValue(mockAccount);
      mockGetCurrencies.mockResolvedValue(mockCurrencies);
      mockGetExpenseTypes.mockResolvedValue(mockExpenseTypes);
      mockGetTransactionTypes.mockResolvedValue(mockTransactionTypes);
      mockGetBudgetCategories.mockResolvedValue(mockBudgetCategories);
      mockCreateMany.mockResolvedValue({ count: 1 });
      mockTransactionFindMany.mockResolvedValue([]);
      mockImportHistoryCreate.mockResolvedValue({ id: 'history-1' });

      const result = await importService.importCSV(userId, fileContent, accountId);

      expect(mockParseUserCSV).toHaveBeenCalledWith(fileContent);
      expect(mockCreateMany).toHaveBeenCalled();
      expect(result.success).toBe(true);
      expect(result.successCount).toBe(1);
      expect(result.errorCount).toBe(0);
    });

    it('should throw error if account not found when accountId provided', async () => {
      const parsedTransactions = [
        {
          date: '2024-01-15',
          amount: '100',
          type: 'Food',
          description: 'Lunch',
          transactionType: 'EXPENSE',
        },
      ];

      mockParseUserCSV.mockReturnValue(parsedTransactions);
      mockFindById.mockResolvedValue(null); // Account not found

      await expect(importService.importCSV(userId, fileContent, accountId)).rejects.toThrow(
        'Account not found'
      );
    });

    it('should throw error if account info missing from CSV and no accountId provided', async () => {
      const parsedTransactions = [
        {
          date: '2024-01-15',
          amount: '100',
          type: 'Food',
          description: 'Lunch',
          transactionType: 'EXPENSE',
          // No accountId or accountName
        },
      ];

      mockParseUserCSV.mockReturnValue(parsedTransactions);
      mockFindAllByUser.mockResolvedValue([]);

      await expect(importService.importCSV(userId, fileContent, undefined)).rejects.toThrow(
        'Account ID is required when CSV does not contain account information'
      );
    });

    it('should fallback to account name when account ID not found but account name exists', async () => {
      const parsedTransactions = [
        {
          date: '2024-01-15',
          amount: '100',
          type: 'Food',
          description: 'Lunch',
          transactionType: 'EXPENSE',
          accountId: 'non-existent-account-id',
          accountName: 'Checking Account',
        },
      ];

      const mockAccounts = [
        {
          id: 'account-1',
          name: 'Checking Account',
          userId: 'user-123',
          currencyId: 'currency-1',
        },
      ];

      mockParseUserCSV.mockReturnValue(parsedTransactions);
      mockFindAllByUser.mockResolvedValue(mockAccounts);
      mockGetCurrencies.mockResolvedValue(mockCurrencies);
      mockGetExpenseTypes.mockResolvedValue(mockExpenseTypes);
      mockGetTransactionTypes.mockResolvedValue(mockTransactionTypes);
      mockGetBudgetCategories.mockResolvedValue(mockBudgetCategories);
      mockParseAmount.mockReturnValue(100);
      mockParseDate.mockReturnValue(new Date('2024-01-15'));
      mockInferBudgetCategory.mockReturnValue('Expenses');
      mockIsReimbursableExpense.mockReturnValue(false);
      mockCreateMany.mockResolvedValue({ count: 1 });
      mockTransactionFindMany.mockResolvedValue([]);
      mockUpdateBalance.mockResolvedValue({});
      mockFindById.mockResolvedValue({
        id: 'account-1',
        name: 'Checking Account',
        userId: 'user-123',
        currencyId: 'currency-1',
        balance: 0,
        initialBalance: 0,
      });
      mockFindByUserCategoryAndYear.mockResolvedValue(null);
      mockUpdateBudgetBalance.mockResolvedValue({});
      mockImportHistoryCreate.mockResolvedValue({ id: 'history-1' });

      const result = await importService.importCSV(userId, fileContent, undefined);
      expect(result.success).toBe(true);
      expect(result.successCount).toBe(1);
      expect(result.errorCount).toBe(0);
      expect(mockCreateMany).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            accountId: 'account-1', // Should use the account found by name
          }),
        ])
      );
    });

    it('should throw error if account from CSV not found by ID or name', async () => {
      const parsedTransactions = [
        {
          date: '2024-01-15',
          amount: '100',
          type: 'Food',
          description: 'Lunch',
          transactionType: 'EXPENSE',
          accountId: 'non-existent-account-id',
          accountName: 'Non-existent Account',
        },
      ];

      mockParseUserCSV.mockReturnValue(parsedTransactions);
      mockFindAllByUser.mockResolvedValue([]); // Account not found

      const result = await importService.importCSV(userId, fileContent, undefined);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0].message).toContain('Account ID "non-existent-account-id" not found');
      expect(result.errors[0].message).toContain('account name "Non-existent Account" not found');
    });

    it('should handle invalid amount', async () => {
      const parsedTransactions = [
        {
          date: '2024-01-15',
          amount: 'invalid',
          type: 'Food',
          description: 'Lunch',
        },
      ];

      mockParseUserCSV.mockReturnValue(parsedTransactions);
      mockParseAmount.mockReturnValue(null);
      mockFindById.mockResolvedValue(mockAccount);
      mockGetCurrencies.mockResolvedValue(mockCurrencies);
      mockGetExpenseTypes.mockResolvedValue(mockExpenseTypes);
      mockGetTransactionTypes.mockResolvedValue(mockTransactionTypes);
      mockGetBudgetCategories.mockResolvedValue(mockBudgetCategories);
      mockImportHistoryCreate.mockResolvedValue({ id: 'history-1' });

      const result = await importService.importCSV(userId, fileContent, accountId);

      expect(result.errorCount).toBe(1);
      expect(result.errors[0].field).toBe('amount');
      expect(result.errors[0].message).toContain('Invalid amount');
    });

    it('should handle invalid date', async () => {
      const parsedTransactions = [
        {
          date: 'invalid-date',
          amount: '100',
          type: 'Food',
          description: 'Lunch',
        },
      ];

      mockParseUserCSV.mockReturnValue(parsedTransactions);
      mockParseAmount.mockReturnValue(100);
      mockParseDate.mockReturnValue(null);
      mockFindById.mockResolvedValue(mockAccount);
      mockGetCurrencies.mockResolvedValue(mockCurrencies);
      mockGetExpenseTypes.mockResolvedValue(mockExpenseTypes);
      mockGetTransactionTypes.mockResolvedValue(mockTransactionTypes);
      mockGetBudgetCategories.mockResolvedValue(mockBudgetCategories);
      mockImportHistoryCreate.mockResolvedValue({ id: 'history-1' });

      const result = await importService.importCSV(userId, fileContent, accountId);

      expect(result.errorCount).toBe(1);
      expect(result.errors[0].field).toBe('date');
      expect(result.errors[0].message).toContain('Invalid date');
    });

    it('should handle unknown transaction type', async () => {
      const parsedTransactions = [
        {
          date: '2024-01-15',
          amount: '100',
          type: 'Food',
          description: 'Lunch',
          transactionType: 'UNKNOWN_TYPE',
        },
      ];

      mockParseUserCSV.mockReturnValue(parsedTransactions);
      mockParseAmount.mockReturnValue(100);
      mockParseDate.mockReturnValue(new Date('2024-01-15'));
      mockFindById.mockResolvedValue(mockAccount);
      mockGetCurrencies.mockResolvedValue(mockCurrencies);
      mockGetExpenseTypes.mockResolvedValue(mockExpenseTypes);
      mockGetTransactionTypes.mockResolvedValue(mockTransactionTypes);
      mockGetBudgetCategories.mockResolvedValue(mockBudgetCategories);
      mockImportHistoryCreate.mockResolvedValue({ id: 'history-1' });

      const result = await importService.importCSV(userId, fileContent, accountId);

      expect(result.errorCount).toBe(1);
      expect(result.errors[0].field).toBe('transactionType');
      expect(result.errors[0].message).toContain('Unknown transaction type');
    });

    it('should handle unknown budget category', async () => {
      const parsedTransactions = [
        {
          date: '2024-01-15',
          amount: '100',
          type: 'Food',
          description: 'Lunch',
          transactionType: 'EXPENSE',
        },
      ];

      mockParseUserCSV.mockReturnValue(parsedTransactions);
      mockParseAmount.mockReturnValue(100);
      mockParseDate.mockReturnValue(new Date('2024-01-15'));
      mockInferBudgetCategory.mockReturnValue('UnknownCategory');
      mockFindById.mockResolvedValue(mockAccount);
      mockGetCurrencies.mockResolvedValue(mockCurrencies);
      mockGetExpenseTypes.mockResolvedValue(mockExpenseTypes);
      mockGetTransactionTypes.mockResolvedValue(mockTransactionTypes);
      mockGetBudgetCategories.mockResolvedValue(mockBudgetCategories);
      mockImportHistoryCreate.mockResolvedValue({ id: 'history-1' });

      const result = await importService.importCSV(userId, fileContent, accountId);

      expect(result.errorCount).toBe(1);
      expect(result.errors[0].field).toBe('category');
      expect(result.errors[0].message).toContain('Unknown budget category');
    });

    it('should handle mixed success and errors', async () => {
      const parsedTransactions = [
        {
          date: '2024-01-15',
          amount: '100',
          type: 'Food',
          description: 'Lunch',
          transactionType: 'EXPENSE',
        },
        {
          date: 'invalid',
          amount: '200',
          type: 'Food',
          description: 'Dinner',
          transactionType: 'EXPENSE',
        },
      ];

      mockParseUserCSV.mockReturnValue(parsedTransactions);
      mockParseAmount
        .mockReturnValueOnce(100)
        .mockReturnValueOnce(200);
      mockParseDate
        .mockReturnValueOnce(new Date('2024-01-15'))
        .mockReturnValueOnce(null);
      mockInferBudgetCategory.mockReturnValue('Food');
      mockIsReimbursableExpense.mockReturnValue(false);

      mockFindById.mockResolvedValue(mockAccount);
      mockGetCurrencies.mockResolvedValue(mockCurrencies);
      mockGetExpenseTypes.mockResolvedValue(mockExpenseTypes);
      mockGetTransactionTypes.mockResolvedValue(mockTransactionTypes);
      mockGetBudgetCategories.mockResolvedValue(mockBudgetCategories);
      mockCreateMany.mockResolvedValue({ count: 1 });
      mockTransactionFindMany.mockResolvedValue([]);
      mockImportHistoryCreate.mockResolvedValue({ id: 'history-1' });

      const result = await importService.importCSV(userId, fileContent, accountId);

      expect(result.successCount).toBe(1);
      expect(result.errorCount).toBe(1);
      expect(result.success).toBe(false);
    });

    it('should detect INCOME transaction type from type field', async () => {
      const parsedTransactions = [
        {
          date: '2024-01-15',
          amount: '100',
          type: 'Ingresos',
          description: 'Salary',
        },
      ];

      mockParseUserCSV.mockReturnValue(parsedTransactions);
      mockParseAmount.mockReturnValue(100);
      mockParseDate.mockReturnValue(new Date('2024-01-15'));
      mockInferBudgetCategory.mockReturnValue('Food');
      mockIsReimbursableExpense.mockReturnValue(false);

      mockFindById.mockResolvedValue(mockAccount);
      mockGetCurrencies.mockResolvedValue(mockCurrencies);
      mockGetExpenseTypes.mockResolvedValue(mockExpenseTypes);
      mockGetTransactionTypes.mockResolvedValue(mockTransactionTypes);
      mockGetBudgetCategories.mockResolvedValue(mockBudgetCategories);
      mockCreateMany.mockResolvedValue({ count: 1 });
      mockTransactionFindMany.mockResolvedValue([]);
      mockImportHistoryCreate.mockResolvedValue({ id: 'history-1' });

      const result = await importService.importCSV(userId, fileContent, accountId);

      expect(mockCreateMany).toHaveBeenCalled();
      expect(result.successCount).toBe(1);
    });

    it('should detect REIMBURSEMENT transaction type', async () => {
      const parsedTransactions = [
        {
          date: '2024-01-15',
          amount: '100',
          type: 'reembolso',
          description: 'Reimbursement',
        },
      ];

      mockParseUserCSV.mockReturnValue(parsedTransactions);
      mockParseAmount.mockReturnValue(100);
      mockParseDate.mockReturnValue(new Date('2024-01-15'));
      mockInferBudgetCategory.mockReturnValue('Food');
      mockIsReimbursableExpense.mockReturnValue(false);

      mockFindById.mockResolvedValue(mockAccount);
      mockGetCurrencies.mockResolvedValue(mockCurrencies);
      mockGetExpenseTypes.mockResolvedValue(mockExpenseTypes);
      mockGetTransactionTypes.mockResolvedValue(mockTransactionTypes);
      mockGetBudgetCategories.mockResolvedValue(mockBudgetCategories);
      mockCreateMany.mockResolvedValue({ count: 1 });
      mockTransactionFindMany.mockResolvedValue([]);
      mockImportHistoryCreate.mockResolvedValue({ id: 'history-1' });

      const result = await importService.importCSV(userId, fileContent, accountId);

      expect(result.successCount).toBe(1);
    });

    it('should handle reimbursable transactions', async () => {
      const parsedTransactions = [
        {
          date: '2024-01-15',
          amount: '100',
          type: 'Food',
          description: 'Business lunch',
          reimbursable: 'YES',
        },
      ];

      mockParseUserCSV.mockReturnValue(parsedTransactions);
      mockParseAmount.mockReturnValue(100);
      mockParseDate.mockReturnValue(new Date('2024-01-15'));
      mockInferBudgetCategory.mockReturnValue('Food');
      mockIsReimbursableExpense.mockReturnValue(false);

      mockFindById.mockResolvedValue(mockAccount);
      mockGetCurrencies.mockResolvedValue(mockCurrencies);
      mockGetExpenseTypes.mockResolvedValue(mockExpenseTypes);
      mockGetTransactionTypes.mockResolvedValue(mockTransactionTypes);
      mockGetBudgetCategories.mockResolvedValue(mockBudgetCategories);
      mockCreateMany.mockResolvedValue({ count: 1 });
      mockTransactionFindMany.mockResolvedValue([]);
      mockImportHistoryCreate.mockResolvedValue({ id: 'history-1' });

      const result = await importService.importCSV(userId, fileContent, accountId);

      expect(mockCreateMany).toHaveBeenCalled();
      const createCall = mockCreateMany.mock.calls[0][0];
      expect(createCall[0].isReimbursable).toBe(true);
      expect(createCall[0].reimbursementId).toBeDefined();
    });

    it('should update account balance after import', async () => {
      const parsedTransactions = [
        {
          date: '2024-01-15',
          amount: '100',
          type: 'Food',
          description: 'Lunch',
          transactionType: 'EXPENSE',
        },
      ];

      const mockTransactions = [
        {
          id: 'tx-1',
          amount: 100,
          transactionType: {
            name: 'EXPENSE',
          },
        },
      ];

      mockParseUserCSV.mockReturnValue(parsedTransactions);
      mockParseAmount.mockReturnValue(100);
      mockParseDate.mockReturnValue(new Date('2024-01-15'));
      mockInferBudgetCategory.mockReturnValue('Food');
      mockIsReimbursableExpense.mockReturnValue(false);

      mockFindById
        .mockResolvedValueOnce(mockAccount)
        .mockResolvedValueOnce(mockAccount);
      mockGetCurrencies.mockResolvedValue(mockCurrencies);
      mockGetExpenseTypes.mockResolvedValue(mockExpenseTypes);
      mockGetTransactionTypes.mockResolvedValue(mockTransactionTypes);
      mockGetBudgetCategories.mockResolvedValue(mockBudgetCategories);
      mockCreateMany.mockResolvedValue({ count: 1 });
      mockTransactionFindMany.mockResolvedValue(mockTransactions);
      mockUpdateBalance.mockResolvedValue({});
      mockImportHistoryCreate.mockResolvedValue({ id: 'history-1' });

      await importService.importCSV(userId, fileContent, accountId);

      expect(mockUpdateBalance).toHaveBeenCalled();
    });

    it('should update budget balance after import', async () => {
      const parsedTransactions = [
        {
          date: '2024-01-15',
          amount: '100',
          type: 'Food',
          description: 'Lunch',
          transactionType: 'EXPENSE',
        },
      ];

      const mockBudget = {
        id: 'budget-1',
        startingBalance: 1000,
        currentBalance: 900,
      };

      mockParseUserCSV.mockReturnValue(parsedTransactions);
      mockParseAmount.mockReturnValue(100);
      mockParseDate.mockReturnValue(new Date('2024-01-15'));
      mockInferBudgetCategory.mockReturnValue('Food');
      mockIsReimbursableExpense.mockReturnValue(false);

      mockFindById.mockResolvedValue(mockAccount);
      mockGetCurrencies.mockResolvedValue(mockCurrencies);
      mockGetExpenseTypes.mockResolvedValue(mockExpenseTypes);
      mockGetTransactionTypes.mockResolvedValue(mockTransactionTypes);
      mockGetBudgetCategories.mockResolvedValue(mockBudgetCategories);
      mockCreateMany.mockResolvedValue({ count: 1 });
      mockTransactionFindMany.mockResolvedValue([]);
      mockFindByUserCategoryAndYear.mockResolvedValue(mockBudget);
      mockConvertToBaseCurrency.mockResolvedValue(100);
      mockUpdateBudgetBalance.mockResolvedValue({});
      mockImportHistoryCreate.mockResolvedValue({ id: 'history-1' });

      await importService.importCSV(userId, fileContent, accountId);

      expect(mockFindByUserCategoryAndYear).toHaveBeenCalled();
      expect(mockUpdateBudgetBalance).toHaveBeenCalled();
    });

    it('should handle errors during import and still create history', async () => {
      const parsedTransactions = [
        {
          date: '2024-01-15',
          amount: '100',
          type: 'Food',
          description: 'Lunch',
          transactionType: 'EXPENSE',
        },
      ];

      mockParseUserCSV.mockReturnValue(parsedTransactions);
      mockParseAmount.mockReturnValue(100);
      mockParseDate.mockReturnValue(new Date('2024-01-15'));
      mockInferBudgetCategory.mockReturnValue('Food');
      mockIsReimbursableExpense.mockReturnValue(false);

      mockFindById.mockResolvedValue(mockAccount);
      mockGetCurrencies.mockResolvedValue(mockCurrencies);
      mockGetExpenseTypes.mockResolvedValue(mockExpenseTypes);
      mockGetTransactionTypes.mockResolvedValue(mockTransactionTypes);
      mockGetBudgetCategories.mockResolvedValue(mockBudgetCategories);
      mockCreateMany.mockRejectedValue(new Error('Database error'));
      mockImportHistoryCreate.mockResolvedValue({ id: 'history-1' });

      await expect(importService.importCSV(userId, fileContent, accountId)).rejects.toThrow(
        'Import failed'
      );
    });

    it('should handle amount <= 0', async () => {
      const parsedTransactions = [
        {
          date: '2024-01-15',
          amount: '0',
          type: 'Food',
          description: 'Lunch',
        },
      ];

      mockParseUserCSV.mockReturnValue(parsedTransactions);
      mockParseAmount.mockReturnValue(0);
      mockFindById.mockResolvedValue(mockAccount);
      mockGetCurrencies.mockResolvedValue(mockCurrencies);
      mockGetExpenseTypes.mockResolvedValue(mockExpenseTypes);
      mockGetTransactionTypes.mockResolvedValue(mockTransactionTypes);
      mockGetBudgetCategories.mockResolvedValue(mockBudgetCategories);
      mockImportHistoryCreate.mockResolvedValue({ id: 'history-1' });

      const result = await importService.importCSV(userId, fileContent, accountId);

      expect(result.errorCount).toBe(1);
      expect(result.errors[0].field).toBe('amount');
    });

    it('should handle empty transactions array', async () => {
      mockParseUserCSV.mockReturnValue([]);
      mockFindById.mockResolvedValue(mockAccount);
      mockGetCurrencies.mockResolvedValue(mockCurrencies);
      mockGetExpenseTypes.mockResolvedValue(mockExpenseTypes);
      mockGetTransactionTypes.mockResolvedValue(mockTransactionTypes);
      mockGetBudgetCategories.mockResolvedValue(mockBudgetCategories);
      mockImportHistoryCreate.mockResolvedValue({ id: 'history-1' });

      const result = await importService.importCSV(userId, fileContent, accountId);

      expect(mockCreateMany).not.toHaveBeenCalled();
      expect(result.totalRecords).toBe(0);
      expect(result.successCount).toBe(0);
    });

    it('should handle exception during transaction processing', async () => {
      const parsedTransactions = [
        {
          date: '2024-01-15',
          amount: '100',
          type: 'Food',
          description: 'Lunch',
          transactionType: 'EXPENSE',
        },
      ];

      mockParseUserCSV.mockReturnValue(parsedTransactions);
      mockParseAmount.mockImplementation(() => {
        throw new Error('Parse error');
      });
      mockFindById.mockResolvedValue(mockAccount);
      mockGetCurrencies.mockResolvedValue(mockCurrencies);
      mockGetExpenseTypes.mockResolvedValue(mockExpenseTypes);
      mockGetTransactionTypes.mockResolvedValue(mockTransactionTypes);
      mockGetBudgetCategories.mockResolvedValue(mockBudgetCategories);
      mockImportHistoryCreate.mockResolvedValue({ id: 'history-1' });

      const result = await importService.importCSV(userId, fileContent, accountId);

      expect(result.errorCount).toBe(1);
      expect(result.errors[0].message).toBeDefined();
    });

    it('should calculate initialBalance when not set', async () => {
      const parsedTransactions = [
        {
          date: '2024-01-15',
          amount: '100',
          type: 'Food',
          description: 'Lunch',
          transactionType: 'EXPENSE',
        },
      ];

      const accountWithoutInitialBalance = {
        ...mockAccount,
        initialBalance: 0,
        balance: 1000,
      };

      const mockTransactions = [
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

      mockParseUserCSV.mockReturnValue(parsedTransactions);
      mockParseAmount.mockReturnValue(100);
      mockParseDate.mockReturnValue(new Date('2024-01-15'));
      mockInferBudgetCategory.mockReturnValue('Food');
      mockIsReimbursableExpense.mockReturnValue(false);

      mockFindById
        .mockResolvedValueOnce(accountWithoutInitialBalance)
        .mockResolvedValueOnce(accountWithoutInitialBalance);
      mockGetCurrencies.mockResolvedValue(mockCurrencies);
      mockGetExpenseTypes.mockResolvedValue(mockExpenseTypes);
      mockGetTransactionTypes.mockResolvedValue(mockTransactionTypes);
      mockGetBudgetCategories.mockResolvedValue(mockBudgetCategories);
      mockCreateMany.mockResolvedValue({ count: 1 });
      mockTransactionFindMany
        .mockResolvedValueOnce(mockTransactions) // for account balance update
        .mockResolvedValueOnce([]); // for budget balance update (no budget transactions)
      mockFindByUserCategoryAndYear.mockResolvedValue(null); // no budget found
      mockAccountUpdate.mockResolvedValue({});
      mockUpdateBalance.mockResolvedValue({});
      mockImportHistoryCreate.mockResolvedValue({ id: 'history-1' });

      await importService.importCSV(userId, fileContent, accountId);

      // initialBalance = 1000 - (500 - 100) = 600
      expect(mockAccountUpdate).toHaveBeenCalledWith({
        where: { id: accountId },
        data: { initialBalance: 600 },
      });
    });

    it('should handle account update error for initialBalance', async () => {
      const parsedTransactions = [
        {
          date: '2024-01-15',
          amount: '100',
          type: 'Food',
          description: 'Lunch',
          transactionType: 'EXPENSE',
        },
      ];

      const accountWithoutInitialBalance = {
        ...mockAccount,
        initialBalance: 0,
        balance: 1000,
      };

      const mockTransactions = [
        {
          id: 'tx-1',
          amount: 500,
          transactionType: {
            name: 'INCOME',
          },
        },
      ];

      mockParseUserCSV.mockReturnValue(parsedTransactions);
      mockParseAmount.mockReturnValue(100);
      mockParseDate.mockReturnValue(new Date('2024-01-15'));
      mockInferBudgetCategory.mockReturnValue('Food');
      mockIsReimbursableExpense.mockReturnValue(false);

      mockFindById
        .mockResolvedValueOnce(accountWithoutInitialBalance)
        .mockResolvedValueOnce(accountWithoutInitialBalance);
      mockGetCurrencies.mockResolvedValue(mockCurrencies);
      mockGetExpenseTypes.mockResolvedValue(mockExpenseTypes);
      mockGetTransactionTypes.mockResolvedValue(mockTransactionTypes);
      mockGetBudgetCategories.mockResolvedValue(mockBudgetCategories);
      mockCreateMany.mockResolvedValue({ count: 1 });
      mockTransactionFindMany
        .mockResolvedValueOnce(mockTransactions) // for account balance update
        .mockResolvedValueOnce([]); // for budget balance update (no budget transactions)
      mockFindByUserCategoryAndYear.mockResolvedValue(null); // no budget found
      mockAccountUpdate.mockRejectedValue(new Error('Field does not exist'));
      mockUpdateBalance.mockResolvedValue({});
      mockImportHistoryCreate.mockResolvedValue({ id: 'history-1' });

      // Should not throw, just log warning
      await importService.importCSV(userId, fileContent, accountId);

      expect(mockUpdateBalance).toHaveBeenCalled();
    });

    it('should handle account with balance = 0 and no transactions', async () => {
      const parsedTransactions = [
        {
          date: '2024-01-15',
          amount: '100',
          type: 'Food',
          description: 'Lunch',
          transactionType: 'EXPENSE',
        },
      ];

      const accountWithZeroBalance = {
        ...mockAccount,
        initialBalance: 0,
        balance: 0,
      };

      mockParseUserCSV.mockReturnValue(parsedTransactions);
      mockParseAmount.mockReturnValue(100);
      mockParseDate.mockReturnValue(new Date('2024-01-15'));
      mockInferBudgetCategory.mockReturnValue('Food');
      mockIsReimbursableExpense.mockReturnValue(false);

      mockFindById
        .mockResolvedValueOnce(accountWithZeroBalance)
        .mockResolvedValueOnce(accountWithZeroBalance);
      mockGetCurrencies.mockResolvedValue(mockCurrencies);
      mockGetExpenseTypes.mockResolvedValue(mockExpenseTypes);
      mockGetTransactionTypes.mockResolvedValue(mockTransactionTypes);
      mockGetBudgetCategories.mockResolvedValue(mockBudgetCategories);
      mockCreateMany.mockResolvedValue({ count: 1 });
      mockTransactionFindMany.mockResolvedValue([]);
      mockUpdateBalance.mockResolvedValue({});
      mockImportHistoryCreate.mockResolvedValue({ id: 'history-1' });

      await importService.importCSV(userId, fileContent, accountId);

      // Should not update initialBalance when balance is 0
      expect(mockAccountUpdate).not.toHaveBeenCalled();
    });

    it('should handle budget not found when updating balance', async () => {
      const parsedTransactions = [
        {
          date: '2024-01-15',
          amount: '100',
          type: 'Food',
          description: 'Lunch',
          transactionType: 'EXPENSE',
        },
      ];

      mockParseUserCSV.mockReturnValue(parsedTransactions);
      mockParseAmount.mockReturnValue(100);
      mockParseDate.mockReturnValue(new Date('2024-01-15'));
      mockInferBudgetCategory.mockReturnValue('Food');
      mockIsReimbursableExpense.mockReturnValue(false);

      mockFindById.mockResolvedValue(mockAccount);
      mockGetCurrencies.mockResolvedValue(mockCurrencies);
      mockGetExpenseTypes.mockResolvedValue(mockExpenseTypes);
      mockGetTransactionTypes.mockResolvedValue(mockTransactionTypes);
      mockGetBudgetCategories.mockResolvedValue(mockBudgetCategories);
      mockCreateMany.mockResolvedValue({ count: 1 });
      mockTransactionFindMany.mockResolvedValue([]);
      mockFindByUserCategoryAndYear.mockResolvedValue(null);
      mockImportHistoryCreate.mockResolvedValue({ id: 'history-1' });

      await importService.importCSV(userId, fileContent, accountId);

      // Should not update budget balance if budget not found
      expect(mockUpdateBudgetBalance).not.toHaveBeenCalled();
    });

    it('should exclude inter-account transfers from budget balance', async () => {
      const parsedTransactions = [
        {
          date: '2024-01-15',
          amount: '100',
          type: 'Food',
          description: 'Lunch',
          transactionType: 'EXPENSE',
        },
      ];

      const mockBudget = {
        id: 'budget-1',
        startingBalance: 1000,
        currentBalance: 900,
      };

      const mockTransactions = [
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

      mockParseUserCSV.mockReturnValue(parsedTransactions);
      mockParseAmount.mockReturnValue(100);
      mockParseDate.mockReturnValue(new Date('2024-01-15'));
      mockInferBudgetCategory.mockReturnValue('Food');
      mockIsReimbursableExpense.mockReturnValue(false);

      mockFindById.mockResolvedValue(mockAccount);
      mockGetCurrencies.mockResolvedValue(mockCurrencies);
      mockGetExpenseTypes.mockResolvedValue(mockExpenseTypes);
      mockGetTransactionTypes.mockResolvedValue(mockTransactionTypes);
      mockGetBudgetCategories.mockResolvedValue(mockBudgetCategories);
      mockCreateMany.mockResolvedValue({ count: 1 });
      mockTransactionFindMany
        .mockResolvedValueOnce([]) // for account balance update
        .mockResolvedValueOnce(mockTransactions); // for budget balance update
      mockFindByUserCategoryAndYear.mockResolvedValue(mockBudget);
      mockConvertToBaseCurrency.mockResolvedValue(50);
      mockUpdateBudgetBalance.mockResolvedValue({});
      mockImportHistoryCreate.mockResolvedValue({ id: 'history-1' });

      await importService.importCSV(userId, fileContent, accountId);

      // Should only process Food expense, not Transferencia Entre Cuentas
      expect(mockConvertToBaseCurrency).toHaveBeenCalledTimes(1);
      expect(mockUpdateBudgetBalance).toHaveBeenCalledWith('budget-1', 950); // 1000 - 50
    });

    it('should exclude ACCOUNT_TRANSFER_IN and REIMBURSEMENT from budget balance', async () => {
      const parsedTransactions = [
        {
          date: '2024-01-15',
          amount: '100',
          type: 'Food',
          description: 'Lunch',
          transactionType: 'EXPENSE',
        },
      ];

      const mockBudget = {
        id: 'budget-1',
        startingBalance: 1000,
        currentBalance: 900,
      };

      const mockTransactions = [
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

      mockParseUserCSV.mockReturnValue(parsedTransactions);
      mockParseAmount.mockReturnValue(100);
      mockParseDate.mockReturnValue(new Date('2024-01-15'));
      mockInferBudgetCategory.mockReturnValue('Food');
      mockIsReimbursableExpense.mockReturnValue(false);

      mockFindById.mockResolvedValue(mockAccount);
      mockGetCurrencies.mockResolvedValue(mockCurrencies);
      mockGetExpenseTypes.mockResolvedValue(mockExpenseTypes);
      mockGetTransactionTypes.mockResolvedValue(mockTransactionTypes);
      mockGetBudgetCategories.mockResolvedValue(mockBudgetCategories);
      mockCreateMany.mockResolvedValue({ count: 1 });
      mockTransactionFindMany
        .mockResolvedValueOnce([]) // for account balance update
        .mockResolvedValueOnce(mockTransactions); // for budget balance update
      mockFindByUserCategoryAndYear.mockResolvedValue(mockBudget);
      mockConvertToBaseCurrency.mockResolvedValue(50);
      mockUpdateBudgetBalance.mockResolvedValue({});
      mockImportHistoryCreate.mockResolvedValue({ id: 'history-1' });

      await importService.importCSV(userId, fileContent, accountId);

      // Should only process INCOME, not ACCOUNT_TRANSFER_IN or REIMBURSEMENT
      expect(mockConvertToBaseCurrency).toHaveBeenCalledTimes(1);
      expect(mockUpdateBudgetBalance).toHaveBeenCalledWith('budget-1', 1050); // 1000 + 50
    });
  });

  describe('exportCSV', () => {
    it('should export transactions to CSV with account information', async () => {
      const userId = 'user-123';
      const mockTransactions = [
        {
          id: 'tx-1',
          accountId: 'account-1',
          account: { name: 'Checking Account' },
          amount: 100,
          date: new Date('2024-01-15'),
          expenseType: { name: 'Food' },
          description: 'Lunch',
          budgetCategory: { name: 'Expenses' },
          isReimbursable: false,
          reimbursementId: '',
          transactionType: { name: 'EXPENSE' },
        },
      ];
      const mockCSV = 'Account,Account ID,Date,Amount,Type,Description,Source/Dest,Reimbursable,Reimb ID,Transaction Type\nChecking Account,account-1,2024-01-15,100,Food,Lunch,Expenses,NO,,EXPENSE';

      mockFindAll.mockResolvedValue(mockTransactions);
      mockExportToCSV.mockReturnValue(mockCSV);

      const result = await importService.exportCSV(userId);

      expect(mockFindAll).toHaveBeenCalledWith(userId, undefined);
      expect(mockExportToCSV).toHaveBeenCalledWith(mockTransactions);
      expect(result).toBe(mockCSV);
      expect(mockCSV).toContain('Account');
      expect(mockCSV).toContain('Account ID');
    });

    it('should export transactions with filters', async () => {
      const userId = 'user-123';
      const filters = { startDate: new Date('2024-01-01') };
      const mockTransactions: any[] = [];
      const mockCSV = 'CSV content';

      mockFindAll.mockResolvedValue(mockTransactions);
      mockExportToCSV.mockReturnValue(mockCSV);

      const result = await importService.exportCSV(userId, filters);

      expect(mockFindAll).toHaveBeenCalledWith(userId, filters);
      expect(result).toBe(mockCSV);
    });
  });

  describe('getImportHistory', () => {
    it('should return import history for user', async () => {
      const userId = 'user-123';
      const mockHistory = [
        {
          id: 'history-1',
          userId,
          fileName: 'test.csv',
          recordCount: 10,
          successCount: 8,
          errorCount: 2,
          importedAt: new Date('2024-01-15'),
        },
      ];

      mockImportHistoryFindMany.mockResolvedValue(mockHistory);

      const result = await importService.getImportHistory(userId);

      expect(mockImportHistoryFindMany).toHaveBeenCalledWith({
        where: { userId },
        orderBy: { importedAt: 'desc' },
        take: 10,
      });
      expect(result).toEqual(mockHistory);
    });
  });
});

