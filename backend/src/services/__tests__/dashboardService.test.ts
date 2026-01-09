// Mock dependencies - jest.mock() calls are hoisted to the top
const mockFindByUserAndYear = jest.fn();
const mockFindAllByUser = jest.fn();
const mockGetRecentTransactions = jest.fn();
const mockGetMonthlyStats = jest.fn();

jest.mock('../../repositories/budgetRepository', () => ({
  __esModule: true,
  default: {
    findByUserAndYear: mockFindByUserAndYear,
  },
}));

jest.mock('../../repositories/accountRepository', () => ({
  __esModule: true,
  default: {
    findAllByUser: mockFindAllByUser,
  },
}));

jest.mock('../../repositories/transactionRepository', () => ({
  __esModule: true,
  default: {
    getRecentTransactions: mockGetRecentTransactions,
    getMonthlyStats: mockGetMonthlyStats,
  },
}));

const mockConvertToBaseCurrency = jest.fn();
const mockGetBaseCurrency = jest.fn();
const mockUpdateExchangeRates = jest.fn();

jest.mock('../../utils/currency', () => ({
  convertToBaseCurrency: mockConvertToBaseCurrency,
  getBaseCurrency: mockGetBaseCurrency,
  updateExchangeRates: mockUpdateExchangeRates,
}));

const mockTransactionFindMany = jest.fn();

jest.mock('../../config/database', () => ({
  __esModule: true,
  default: {
    transaction: {
      findMany: mockTransactionFindMany,
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

import dashboardService from '../dashboardService';
import budgetRepository from '../../repositories/budgetRepository';
import accountRepository from '../../repositories/accountRepository';
import transactionRepository from '../../repositories/transactionRepository';
import { convertToBaseCurrency, getBaseCurrency } from '../../utils/currency';
import prisma from '../../config/database';

describe('DashboardService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getDashboard', () => {
    it('should return dashboard stats successfully', async () => {
      const userId = 'user-123';
      const mockBudgets = [
        {
          id: 'budget-1',
          categoryId: 'category-1',
          year: 2024,
          startingBalance: 1000,
          allocatedAmount: 5000,
          currentBalance: 3500,
          category: {
            id: 'category-1',
            name: 'Food',
            percentage: 30,
          },
        },
      ];

      const mockAccounts = [
        {
          id: 'account-1',
          name: 'Checking',
          type: 'CHECKING',
          balance: 1000,
          isActive: true,
          currency: {
            id: 'currency-1',
            code: 'USD',
            symbol: '$',
          },
        },
      ];

      const mockRecentTransactions = [
        {
          id: 'tx-1',
          amount: 100,
          date: new Date('2024-01-15'),
        },
      ];

      const mockBaseCurrency = {
        id: 'currency-1',
        code: 'USD',
        symbol: '$',
      };

      const mockMonthlyTransactions: any[] = [];
      const mockReimbursements: any[] = [];
      const mockExpenseTransactions: any[] = [];

      mockFindByUserAndYear.mockResolvedValue(mockBudgets);
      mockFindAllByUser.mockResolvedValue(mockAccounts);
      mockGetRecentTransactions.mockResolvedValue(mockRecentTransactions);
      mockGetMonthlyStats.mockResolvedValue(mockMonthlyTransactions);
      mockTransactionFindMany
        .mockResolvedValueOnce(mockReimbursements) // for getTotalReimbursed
        .mockResolvedValueOnce(mockExpenseTransactions); // for getSpendingByExpenseType
      mockGetBaseCurrency.mockResolvedValue(mockBaseCurrency);
      mockConvertToBaseCurrency.mockResolvedValue(1000);

      const result = await dashboardService.getDashboard(userId);

      expect(mockFindByUserAndYear).toHaveBeenCalledWith(userId, expect.any(Number));
      expect(mockFindAllByUser).toHaveBeenCalledWith(userId);
      expect(mockGetRecentTransactions).toHaveBeenCalledWith(userId, 5);
      expect(mockGetBaseCurrency).toHaveBeenCalled();

      expect(result).toHaveProperty('totalBalance');
      expect(result).toHaveProperty('baseCurrency');
      expect(result).toHaveProperty('balanceByCategory');
      expect(result).toHaveProperty('balanceByCurrency');
      expect(result).toHaveProperty('accounts');
      expect(result).toHaveProperty('recentTransactions');
      expect(result).toHaveProperty('monthlyStats');
      expect(result).toHaveProperty('totalReimbursed');
      expect(result).toHaveProperty('spendingByExpenseType');
    });

    it('should throw error if base currency not configured', async () => {
      const userId = 'user-123';

      mockFindByUserAndYear.mockResolvedValue([]);
      mockFindAllByUser.mockResolvedValue([]);
      mockGetRecentTransactions.mockResolvedValue([]);
      mockGetBaseCurrency.mockResolvedValue(null);

      await expect(dashboardService.getDashboard(userId)).rejects.toThrow(
        'Base currency not configured'
      );
    });

    it('should calculate total balance correctly', async () => {
      const userId = 'user-123';
      const mockAccounts = [
        {
          id: 'account-1',
          name: 'Checking',
          type: 'CHECKING',
          balance: 1000,
          isActive: true,
          currency: {
            id: 'currency-1',
            code: 'USD',
            symbol: '$',
          },
        },
        {
          id: 'account-2',
          name: 'Savings',
          type: 'SAVINGS',
          balance: 2000,
          isActive: true,
          currency: {
            id: 'currency-2',
            code: 'EUR',
            symbol: '€',
          },
        },
      ];

      const mockBaseCurrency = {
        id: 'currency-1',
        code: 'USD',
        symbol: '$',
      };

      const mockMonthlyTransactions: any[] = [];
      const mockReimbursements: any[] = [];
      const mockExpenseTransactions: any[] = [];

      mockFindByUserAndYear.mockResolvedValue([]);
      mockFindAllByUser.mockResolvedValue(mockAccounts);
      mockGetRecentTransactions.mockResolvedValue([]);
      mockGetMonthlyStats.mockResolvedValue(mockMonthlyTransactions);
      mockTransactionFindMany
        .mockResolvedValueOnce(mockReimbursements) // for getTotalReimbursed
        .mockResolvedValueOnce(mockExpenseTransactions); // for getSpendingByExpenseType
      mockGetBaseCurrency.mockResolvedValue(mockBaseCurrency);
      mockConvertToBaseCurrency
        .mockResolvedValueOnce(1000) // account-1 balance in base
        .mockResolvedValueOnce(2200) // account-2 balance in base (EUR converted)
        .mockResolvedValueOnce(2200); // balanceByCurrency conversion

      const result = await dashboardService.getDashboard(userId);

      expect(result.totalBalance).toBe(3200); // 1000 + 2200
    });

    it('should handle empty accounts', async () => {
      const userId = 'user-123';
      const mockBaseCurrency = {
        id: 'currency-1',
        code: 'USD',
        symbol: '$',
      };

      const mockMonthlyTransactions: any[] = [];
      const mockReimbursements: any[] = [];
      const mockExpenseTransactions: any[] = [];

      mockFindByUserAndYear.mockResolvedValue([]);
      mockFindAllByUser.mockResolvedValue([]);
      mockGetRecentTransactions.mockResolvedValue([]);
      mockGetMonthlyStats.mockResolvedValue(mockMonthlyTransactions);
      mockTransactionFindMany
        .mockResolvedValueOnce(mockReimbursements) // for getTotalReimbursed
        .mockResolvedValueOnce(mockExpenseTransactions); // for getSpendingByExpenseType
      mockGetBaseCurrency.mockResolvedValue(mockBaseCurrency);

      const result = await dashboardService.getDashboard(userId);

      expect(result.totalBalance).toBe(0);
      expect(result.accounts).toEqual([]);
      expect(result.balanceByCurrency).toEqual([]);
    });
  });

  describe('getChartData', () => {
    it('should return category chart data', async () => {
      const userId = 'user-123';
      const mockBudgets = [
        {
          id: 'budget-1',
          categoryId: 'category-1',
          year: 2024,
          currentBalance: 3500,
          category: {
            id: 'category-1',
            name: 'Food',
            percentage: 30,
          },
        },
      ];

      mockFindByUserAndYear.mockResolvedValue(mockBudgets);

      const result = await dashboardService.getChartData(userId, 'category');

      expect(mockFindByUserAndYear).toHaveBeenCalledWith(userId, expect.any(Number));
      expect(result).toEqual([
        {
          label: 'Food',
          value: 3500,
          percentage: 30,
        },
      ]);
    });

    it('should return expense type chart data', async () => {
      const userId = 'user-123';
      const mockTransactions = [
        {
          id: 'tx-1',
          amount: 100,
          currency: {
            code: 'USD',
          },
          expenseType: {
            name: 'Food',
            color: '#FF0000',
          },
        },
        {
          id: 'tx-2',
          amount: 200,
          currency: {
            code: 'USD',
          },
          expenseType: {
            name: 'Transport',
            color: '#00FF00',
          },
        },
      ];

      mockTransactionFindMany.mockResolvedValue(mockTransactions);
      mockConvertToBaseCurrency
        .mockResolvedValueOnce(100) // Food transaction
        .mockResolvedValueOnce(200); // Transport transaction

      const result = await dashboardService.getChartData(userId, 'expense');

      expect(mockTransactionFindMany).toHaveBeenCalled();
      expect(result).toHaveLength(2);
      expect(result[0]).toHaveProperty('label');
      expect(result[0]).toHaveProperty('value');
      expect(result[0]).toHaveProperty('color');
    });

    it('should return monthly chart data', async () => {
      const userId = 'user-123';
      const currentYear = new Date().getFullYear();
      const mockTransactions = [
        {
          id: 'tx-1',
          amount: 100,
          date: new Date(currentYear, 0, 15), // January of current year
          currency: {
            code: 'USD',
          },
          transactionType: {
            name: 'INCOME',
          },
          expenseType: null,
        },
      ];

      mockGetMonthlyStats.mockResolvedValue(mockTransactions);
      mockConvertToBaseCurrency.mockResolvedValue(100);

      const result = await dashboardService.getChartData(userId, 'monthly');

      expect(mockGetMonthlyStats).toHaveBeenCalledWith(userId, expect.any(Number));
      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(12); // 12 months
      expect((result as any)[0]).toHaveProperty('month');
      expect((result as any)[0]).toHaveProperty('income');
      expect((result as any)[0]).toHaveProperty('expenses');
      expect((result as any)[0]).toHaveProperty('net');
    });

    it('should throw error for invalid chart type', async () => {
      const userId = 'user-123';

      await expect(
        dashboardService.getChartData(userId, 'invalid' as any)
      ).rejects.toThrow('Invalid chart type');
    });

    it('should exclude inter-account transfers from expense type chart', async () => {
      const userId = 'user-123';
      const mockTransactions = [
        {
          id: 'tx-1',
          amount: 100,
          currency: {
            code: 'USD',
          },
          expenseType: {
            name: 'Transferencia Entre Cuentas',
            color: '#000000',
          },
        },
        {
          id: 'tx-2',
          amount: 200,
          currency: {
            code: 'USD',
          },
          expenseType: {
            name: 'Food',
            color: '#FF0000',
          },
        },
      ];

      mockTransactionFindMany.mockResolvedValue(mockTransactions);
      // Only Food transaction is converted (Transferencia Entre Cuentas is skipped before conversion)
      mockConvertToBaseCurrency.mockResolvedValueOnce(200);

      const result = await dashboardService.getChartData(userId, 'expense');

      // Should only include Food, not Transferencia Entre Cuentas
      expect(result).toHaveLength(1);
      expect((result as any)[0].label).toBe('Food');
    });

    it('should handle transactions without expense type', async () => {
      const userId = 'user-123';
      const mockTransactions = [
        {
          id: 'tx-1',
          amount: 100,
          currency: {
            code: 'USD',
          },
          expenseType: null,
        },
      ];

      mockTransactionFindMany.mockResolvedValue(mockTransactions);

      const result = await dashboardService.getChartData(userId, 'expense');

      expect(result).toEqual([]);
    });

    it('should sort expense type chart data by value descending', async () => {
      const userId = 'user-123';
      const mockTransactions = [
        {
          id: 'tx-1',
          amount: 100,
          currency: {
            code: 'USD',
          },
          expenseType: {
            name: 'Food',
            color: '#FF0000',
          },
        },
        {
          id: 'tx-2',
          amount: 300,
          currency: {
            code: 'USD',
          },
          expenseType: {
            name: 'Transport',
            color: '#00FF00',
          },
        },
      ];

      mockTransactionFindMany.mockResolvedValue(mockTransactions);
      mockConvertToBaseCurrency
        .mockResolvedValueOnce(100) // Food transaction
        .mockResolvedValueOnce(300); // Transport transaction

      const result = await dashboardService.getChartData(userId, 'expense');

      expect((result as any)[0].value).toBeGreaterThanOrEqual((result as any)[1].value);
    });

    it('should use default color when expense type has no color', async () => {
      const userId = 'user-123';
      const mockTransactions = [
        {
          id: 'tx-1',
          amount: 100,
          currency: {
            code: 'USD',
          },
          expenseType: {
            name: 'Food',
            color: null,
          },
        },
      ];

      mockTransactionFindMany.mockResolvedValue(mockTransactions);
      mockConvertToBaseCurrency.mockResolvedValue(100);

      const result = await dashboardService.getChartData(userId, 'expense');

      expect((result as any)[0].color).toBe('#999999');
    });
  });

  describe('getMonthlyStats (via getChartData)', () => {
    it('should exclude ACCOUNT_TRANSFER_IN from income', async () => {
      const userId = 'user-123';
      const currentYear = new Date().getFullYear();
      const mockTransactions = [
        {
          id: 'tx-1',
          amount: 1000,
          date: new Date(currentYear, 0, 15),
          currency: {
            code: 'USD',
          },
          transactionType: {
            name: 'ACCOUNT_TRANSFER_IN',
          },
          expenseType: null,
        },
        {
          id: 'tx-2',
          amount: 500,
          date: new Date(currentYear, 0, 20),
          currency: {
            code: 'USD',
          },
          transactionType: {
            name: 'INCOME',
          },
          expenseType: null,
        },
      ];

      mockGetMonthlyStats.mockResolvedValue(mockTransactions);
      mockConvertToBaseCurrency
        .mockResolvedValueOnce(1000) // ACCOUNT_TRANSFER_IN (converted but excluded from income)
        .mockResolvedValueOnce(500); // INCOME

      const result = await dashboardService.getChartData(userId, 'monthly');

      const januaryData = (result as any).find((m: any) => m.month === `${currentYear}-01`);
      expect(januaryData.income).toBe(500); // Only INCOME, not ACCOUNT_TRANSFER_IN
    });

    it('should exclude REIMBURSEMENT from income', async () => {
      const userId = 'user-123';
      const currentYear = new Date().getFullYear();
      const mockTransactions = [
        {
          id: 'tx-1',
          amount: 1000,
          date: new Date(currentYear, 0, 15),
          currency: {
            code: 'USD',
          },
          transactionType: {
            name: 'REIMBURSEMENT',
          },
          expenseType: null,
        },
        {
          id: 'tx-2',
          amount: 500,
          date: new Date(currentYear, 0, 20),
          currency: {
            code: 'USD',
          },
          transactionType: {
            name: 'INCOME',
          },
          expenseType: null,
        },
      ];

      mockGetMonthlyStats.mockResolvedValue(mockTransactions);
      mockConvertToBaseCurrency
        .mockResolvedValueOnce(1000) // REIMBURSEMENT (converted but excluded from income)
        .mockResolvedValueOnce(500); // INCOME

      const result = await dashboardService.getChartData(userId, 'monthly');

      const januaryData = (result as any).find((m: any) => m.month === `${currentYear}-01`);
      expect(januaryData.income).toBe(500); // Only INCOME, not REIMBURSEMENT
    });

    it('should exclude inter-account transfers from expenses', async () => {
      const userId = 'user-123';
      const currentYear = new Date().getFullYear();
      const mockTransactions = [
        {
          id: 'tx-1',
          amount: 1000,
          date: new Date(currentYear, 0, 15),
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
          amount: 500,
          date: new Date(currentYear, 0, 20),
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

      mockGetMonthlyStats.mockResolvedValue(mockTransactions);
      mockConvertToBaseCurrency
        .mockResolvedValueOnce(1000) // Transferencia Entre Cuentas (converted but excluded from expenses)
        .mockResolvedValueOnce(500); // Food expense

      const result = await dashboardService.getChartData(userId, 'monthly');

      const januaryData = (result as any).find((m: any) => m.month === `${currentYear}-01`);
      expect(januaryData.expenses).toBe(500); // Only Food expense, not inter-account transfer
    });

    it('should handle TRANSFER transactions as expenses', async () => {
      const userId = 'user-123';
      const currentYear = new Date().getFullYear();
      const mockTransactions = [
        {
          id: 'tx-1',
          amount: 1000,
          date: new Date(currentYear, 0, 15),
          currency: {
            code: 'USD',
          },
          transactionType: {
            name: 'TRANSFER',
          },
          expenseType: null,
        },
      ];

      mockGetMonthlyStats.mockResolvedValue(mockTransactions);
      mockConvertToBaseCurrency.mockResolvedValue(1000);

      const result = await dashboardService.getChartData(userId, 'monthly');

      const januaryData = (result as any).find((m: any) => m.month === `${currentYear}-01`);
      expect(januaryData.expenses).toBe(1000);
    });

    it('should calculate net correctly (income - expenses)', async () => {
      const userId = 'user-123';
      const currentYear = new Date().getFullYear();
      const mockTransactions = [
        {
          id: 'tx-1',
          amount: 1000,
          date: new Date(currentYear, 0, 15),
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
          amount: 300,
          date: new Date(currentYear, 0, 20),
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

      mockGetMonthlyStats.mockResolvedValue(mockTransactions);
      mockConvertToBaseCurrency
        .mockResolvedValueOnce(1000) // INCOME transaction
        .mockResolvedValueOnce(300); // EXPENSE transaction

      const result = await dashboardService.getChartData(userId, 'monthly');

      const januaryData = (result as any).find((m: any) => m.month === `${currentYear}-01`);
      expect(januaryData.income).toBe(1000);
      expect(januaryData.expenses).toBe(300);
      expect(januaryData.net).toBe(700); // 1000 - 300
    });
  });

  describe('getDashboard - additional coverage', () => {
    it('should handle multiple currencies in balanceByCurrency', async () => {
      const userId = 'user-123';
      const mockAccounts = [
        {
          id: 'account-1',
          name: 'Checking',
          type: 'CHECKING',
          balance: 1000,
          isActive: true,
          currency: {
            id: 'currency-1',
            code: 'USD',
            symbol: '$',
          },
        },
        {
          id: 'account-2',
          name: 'Savings',
          type: 'SAVINGS',
          balance: 2000,
          isActive: true,
          currency: {
            id: 'currency-2',
            code: 'EUR',
            symbol: '€',
          },
        },
      ];

      const mockBaseCurrency = {
        id: 'currency-1',
        code: 'USD',
        symbol: '$',
      };

      const mockMonthlyTransactions: any[] = [];
      const mockReimbursements: any[] = [];
      const mockExpenseTransactions: any[] = [];

      mockFindByUserAndYear.mockResolvedValue([]);
      mockFindAllByUser.mockResolvedValue(mockAccounts);
      mockGetRecentTransactions.mockResolvedValue([]);
      mockGetMonthlyStats.mockResolvedValue(mockMonthlyTransactions);
      mockTransactionFindMany
        .mockResolvedValueOnce(mockReimbursements)
        .mockResolvedValueOnce(mockExpenseTransactions);
      mockGetBaseCurrency.mockResolvedValue(mockBaseCurrency);
      mockConvertToBaseCurrency
        .mockResolvedValueOnce(1000) // account-1 balance in base
        .mockResolvedValueOnce(2200) // account-2 balance in base
        .mockResolvedValueOnce(1000) // USD balanceByCurrency conversion
        .mockResolvedValueOnce(2200); // EUR balanceByCurrency conversion

      const result = await dashboardService.getDashboard(userId);

      expect(result.balanceByCurrency).toHaveLength(2);
      expect((result.balanceByCurrency as any)[0]).toHaveProperty('currencyCode');
      expect((result.balanceByCurrency as any)[0]).toHaveProperty('balance');
      expect((result.balanceByCurrency as any)[0]).toHaveProperty('balanceInBase');
    });

    it('should calculate totalReimbursed correctly', async () => {
      const userId = 'user-123';
      const currentYear = new Date().getFullYear();
      const mockReimbursements = [
        {
          id: 'tx-1',
          amount: 500,
          currency: {
            code: 'USD',
          },
        },
        {
          id: 'tx-2',
          amount: 300,
          currency: {
            code: 'EUR',
          },
        },
      ];

      const mockBaseCurrency = {
        id: 'currency-1',
        code: 'USD',
        symbol: '$',
      };

      const mockMonthlyTransactions: any[] = [];
      const mockExpenseTransactions: any[] = [];

      mockFindByUserAndYear.mockResolvedValue([]);
      mockFindAllByUser.mockResolvedValue([]);
      mockGetRecentTransactions.mockResolvedValue([]);
      mockGetMonthlyStats.mockResolvedValue(mockMonthlyTransactions);
      mockTransactionFindMany
        .mockResolvedValueOnce(mockReimbursements)
        .mockResolvedValueOnce(mockExpenseTransactions);
      mockGetBaseCurrency.mockResolvedValue(mockBaseCurrency);
      mockConvertToBaseCurrency
        .mockResolvedValueOnce(500) // first reimbursement
        .mockResolvedValueOnce(330); // second reimbursement (EUR converted)

      const result = await dashboardService.getDashboard(userId);

      expect(result.totalReimbursed).toBe(830); // 500 + 330
    });

    it('should calculate spendingByExpenseType correctly', async () => {
      const userId = 'user-123';
      const currentYear = new Date().getFullYear();
      const mockExpenseTransactions = [
        {
          id: 'tx-1',
          amount: 500,
          currency: {
            code: 'USD',
          },
          expenseType: {
            name: 'Food',
            icon: '🍔',
            color: '#FF0000',
          },
        },
        {
          id: 'tx-2',
          amount: 300,
          currency: {
            code: 'USD',
          },
          expenseType: {
            name: 'Transport',
            icon: '🚗',
            color: '#00FF00',
          },
        },
      ];

      const mockBaseCurrency = {
        id: 'currency-1',
        code: 'USD',
        symbol: '$',
      };

      const mockMonthlyTransactions: any[] = [];
      const mockReimbursements: any[] = [];

      mockFindByUserAndYear.mockResolvedValue([]);
      mockFindAllByUser.mockResolvedValue([]);
      mockGetRecentTransactions.mockResolvedValue([]);
      mockGetMonthlyStats.mockResolvedValue(mockMonthlyTransactions);
      mockTransactionFindMany
        .mockResolvedValueOnce(mockReimbursements)
        .mockResolvedValueOnce(mockExpenseTransactions);
      mockGetBaseCurrency.mockResolvedValue(mockBaseCurrency);
      mockConvertToBaseCurrency
        .mockResolvedValueOnce(500) // Food expense
        .mockResolvedValueOnce(300); // Transport expense

      const result = await dashboardService.getDashboard(userId);

      expect(result.spendingByExpenseType).toHaveLength(2);
      expect((result.spendingByExpenseType as any)[0]).toHaveProperty('expenseTypeName');
      expect((result.spendingByExpenseType as any)[0]).toHaveProperty('amount');
      expect((result.spendingByExpenseType as any)[0]).toHaveProperty('icon');
      expect((result.spendingByExpenseType as any)[0]).toHaveProperty('color');
    });

    it('should handle spendingByExpenseType without icon and color', async () => {
      const userId = 'user-123';
      const mockExpenseTransactions = [
        {
          id: 'tx-1',
          amount: 500,
          currency: {
            code: 'USD',
          },
          expenseType: {
            name: 'Food',
            icon: null,
            color: null,
          },
        },
      ];

      const mockBaseCurrency = {
        id: 'currency-1',
        code: 'USD',
        symbol: '$',
      };

      const mockMonthlyTransactions: any[] = [];
      const mockReimbursements: any[] = [];

      mockFindByUserAndYear.mockResolvedValue([]);
      mockFindAllByUser.mockResolvedValue([]);
      mockGetRecentTransactions.mockResolvedValue([]);
      mockGetMonthlyStats.mockResolvedValue(mockMonthlyTransactions);
      mockTransactionFindMany
        .mockResolvedValueOnce(mockReimbursements)
        .mockResolvedValueOnce(mockExpenseTransactions);
      mockGetBaseCurrency.mockResolvedValue(mockBaseCurrency);
      mockConvertToBaseCurrency.mockResolvedValue(500);

      const result = await dashboardService.getDashboard(userId);

      expect((result.spendingByExpenseType as any)[0].icon).toBeUndefined();
      expect((result.spendingByExpenseType as any)[0].color).toBeUndefined();
    });

    it('should handle negative currentBalance in category chart', async () => {
      const userId = 'user-123';
      const mockBudgets = [
        {
          id: 'budget-1',
          categoryId: 'category-1',
          year: 2024,
          currentBalance: -500,
          category: {
            id: 'category-1',
            name: 'Food',
            percentage: 30,
          },
        },
      ];

      mockFindByUserAndYear.mockResolvedValue(mockBudgets);

      const result = await dashboardService.getChartData(userId, 'category');

      expect((result as any)[0].value).toBe(500); // Math.abs(-500)
    });

    it('should handle empty budgets in category chart', async () => {
      const userId = 'user-123';

      mockFindByUserAndYear.mockResolvedValue([]);

      const result = await dashboardService.getChartData(userId, 'category');

      expect(result).toEqual([]);
    });

    it('should aggregate multiple transactions of same expense type', async () => {
      const userId = 'user-123';
      const mockTransactions = [
        {
          id: 'tx-1',
          amount: 100,
          currency: {
            code: 'USD',
          },
          expenseType: {
            name: 'Food',
            color: '#FF0000',
          },
        },
        {
          id: 'tx-2',
          amount: 200,
          currency: {
            code: 'USD',
          },
          expenseType: {
            name: 'Food',
            color: '#FF0000',
          },
        },
      ];

      mockTransactionFindMany.mockResolvedValue(mockTransactions);
      mockConvertToBaseCurrency
        .mockResolvedValueOnce(100) // first transaction
        .mockResolvedValueOnce(200); // second transaction

      const result = await dashboardService.getChartData(userId, 'expense');

      expect(result).toHaveLength(1);
      expect((result as any)[0].label).toBe('Food');
      expect((result as any)[0].value).toBe(300); // 100 + 200
    });
  });
});

