import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, act, fireEvent } from '@testing-library/react';
import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import Dashboard from '../Dashboard';
import api from '../../services/api';
import { DashboardStats } from '../../types';

// Mock the API service
vi.mock('../../services/api', () => ({
  default: {
    getDashboard: vi.fn(),
    updateExchangeRates: vi.fn(),
  },
}));

// Mock the format utilities
vi.mock('../../utils/format', () => ({
  formatCurrency: vi.fn((amount: number, symbol: string) => `${symbol}${amount.toFixed(2)}`),
  formatDateString: vi.fn((date: string, format?: string) => {
    const d = new Date(date);
    if (format === 'MMM dd') {
      return d.toLocaleDateString('en-US', { month: 'short', day: '2-digit' });
    }
    return d.toLocaleDateString();
  }),
  getCategoryColor: vi.fn((categoryName: string) => {
    const colors: Record<string, string> = {
      Food: '#ff6b6b',
      Transport: '#4ecdc4',
      Entertainment: '#45b7d1',
    };
    return colors[categoryName] || '#95a5a6';
  }),
}));

// Mock the Loading component
vi.mock('../../components/common/Loading', () => ({
  default: ({ message }: { message: string }) => <div>Loading: {message}</div>,
}));

// Mock window.alert
const mockAlert = vi.fn();
global.alert = mockAlert;

const mockApi = api as unknown as {
  getDashboard: ReturnType<typeof vi.fn>;
  updateExchangeRates: ReturnType<typeof vi.fn>;
};

// Helper to render component with router
const renderWithRouter = (component: React.ReactElement) => {
  return render(<BrowserRouter>{component}</BrowserRouter>);
};

// Helper to create mock dashboard stats
const createMockDashboardStats = (overrides?: Partial<DashboardStats>): DashboardStats => {
  return {
    totalBalance: 10000,
    baseCurrency: {
      code: 'USD',
      symbol: '$',
    },
    balanceByCategory: [
      {
        categoryName: 'Food',
        balance: 500,
        percentage: 20,
        allocated: 1000,
        starting: 1000,
      },
      {
        categoryName: 'Transport',
        balance: -200,
        percentage: 15,
        allocated: 500,
        starting: 500,
      },
    ],
    balanceByCurrency: [
      {
        currencyCode: 'USD',
        currencySymbol: '$',
        balance: 10000,
        balanceInBase: 10000,
      },
      {
        currencyCode: 'EUR',
        currencySymbol: '€',
        balance: 5000,
        balanceInBase: 5500,
      },
    ],
    accounts: [
      {
        id: 'account-1',
        name: 'Checking Account',
        type: 'CHECKING',
        balance: 5000,
        balanceInBase: 5000,
        currencyCode: 'USD',
        currencySymbol: '$',
        isActive: true,
      },
      {
        id: 'account-2',
        name: 'Savings Account',
        type: 'SAVINGS',
        balance: 5000,
        balanceInBase: 5000,
        currencyCode: 'USD',
        currencySymbol: '$',
        isActive: true,
      },
      {
        id: 'account-3',
        name: 'Inactive Account',
        type: 'CHECKING',
        balance: 1000,
        balanceInBase: 1000,
        currencyCode: 'USD',
        currencySymbol: '$',
        isActive: false,
      },
    ],
    recentTransactions: [
      {
        id: 'tx-1',
        date: new Date().toISOString(),
        amount: 100,
        description: 'Test Transaction',
        isReimbursable: false,
        notes: '',
        account: {
          id: 'account-1',
          name: 'Checking Account',
          type: 'CHECKING',
          balance: 5000,
          currency: {
            id: 'currency-1',
            code: 'USD',
            symbol: '$',
            name: 'US Dollar',
            exchangeRate: 1,
            isBase: true,
          },
          isActive: true,
          createdAt: new Date().toISOString(),
        },
        currency: {
          id: 'currency-1',
          code: 'USD',
          symbol: '$',
          name: 'US Dollar',
          exchangeRate: 1,
          isBase: true,
        },
        transactionType: {
          id: 'type-1',
          name: 'INCOME',
        },
        budgetCategory: {
          id: 'category-1',
          name: 'Food',
          percentage: 20,
        },
        createdAt: new Date().toISOString(),
      },
      {
        id: 'tx-2',
        date: new Date().toISOString(),
        amount: 50,
        description: '',
        isReimbursable: false,
        notes: '',
        account: {
          id: 'account-1',
          name: 'Checking Account',
          type: 'CHECKING',
          balance: 5000,
          currency: {
            id: 'currency-1',
            code: 'USD',
            symbol: '$',
            name: 'US Dollar',
            exchangeRate: 1,
            isBase: true,
          },
          isActive: true,
          createdAt: new Date().toISOString(),
        },
        currency: {
          id: 'currency-1',
          code: 'USD',
          symbol: '$',
          name: 'US Dollar',
          exchangeRate: 1,
          isBase: true,
        },
        transactionType: {
          id: 'type-2',
          name: 'EXPENSE',
        },
        expenseType: {
          id: 'expense-1',
          name: 'Groceries',
        },
        budgetCategory: {
          id: 'category-1',
          name: 'Food',
          percentage: 20,
        },
        createdAt: new Date().toISOString(),
      },
    ],
    monthlyStats: [
      {
        month: new Date().toISOString().slice(0, 7),
        income: 2000,
        expenses: 1500,
        net: 500,
      },
    ],
    totalReimbursed: 300,
    spendingByExpenseType: [
      {
        expenseTypeName: 'Groceries',
        amount: 500,
        icon: '🛒',
        color: '#ff6b6b',
      },
      {
        expenseTypeName: 'Transport',
        amount: 200,
        icon: '🚗',
        color: '#4ecdc4',
      },
    ],
    ...overrides,
  };
};

describe('Dashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAlert.mockClear();
  });

  describe('Loading State', () => {
    it('should show loading state initially', async () => {
      mockApi.getDashboard.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve({ data: createMockDashboardStats() }), 100))
      );

      renderWithRouter(<Dashboard />);

      expect(screen.getByText(/Loading: Loading dashboard.../i)).toBeInTheDocument();
    });

    it('should hide loading state after data loads', async () => {
      mockApi.getDashboard.mockResolvedValue({
        data: createMockDashboardStats(),
      });

      await act(async () => {
        renderWithRouter(<Dashboard />);
      });

      await waitFor(() => {
        expect(screen.queryByText(/Loading: Loading dashboard.../i)).not.toBeInTheDocument();
      });
    });
  });

  describe('Error State', () => {
    it('should display error message when API call fails', async () => {
      mockApi.getDashboard.mockRejectedValue({
        response: {
          data: {
            message: 'Failed to fetch dashboard data',
          },
        },
      });

      await act(async () => {
        renderWithRouter(<Dashboard />);
      });

      await waitFor(() => {
        expect(screen.getByText('Failed to fetch dashboard data')).toBeInTheDocument();
      });
    });

    it('should display generic error message when error has no response', async () => {
      mockApi.getDashboard.mockRejectedValue(new Error('Network error'));

      await act(async () => {
        renderWithRouter(<Dashboard />);
      });

      await waitFor(() => {
        expect(screen.getByText('Failed to load dashboard')).toBeInTheDocument();
      });
    });
  });

  describe('Dashboard Content', () => {
    beforeEach(() => {
      mockApi.getDashboard.mockResolvedValue({
        data: createMockDashboardStats(),
      });
    });

    it('should render dashboard title', async () => {
      await act(async () => {
        renderWithRouter(<Dashboard />);
      });

      await waitFor(() => {
        expect(screen.getByText('Dashboard')).toBeInTheDocument();
      });
    });

    it('should render summary cards', async () => {
      await act(async () => {
        renderWithRouter(<Dashboard />);
      });

      await waitFor(() => {
        expect(screen.getByText('Total Balance')).toBeInTheDocument();
        expect(screen.getByText('Monthly Income')).toBeInTheDocument();
        expect(screen.getByText('Monthly Expenses')).toBeInTheDocument();
      });
    });

    it('should display total balance correctly', async () => {
      await act(async () => {
        renderWithRouter(<Dashboard />);
      });

      await waitFor(() => {
        // Total balance appears in summary card and balance by currency table
        expect(screen.getAllByText('$10000.00').length).toBeGreaterThan(0);
      });
    });

    it('should display monthly income and expenses', async () => {
      await act(async () => {
        renderWithRouter(<Dashboard />);
      });

      await waitFor(() => {
        // These values may appear multiple times in the dashboard
        expect(screen.getAllByText('$2000.00').length).toBeGreaterThan(0); // Monthly income
        expect(screen.getAllByText('$1500.00').length).toBeGreaterThan(0); // Monthly expenses
      });
    });

    it('should render budget by category section', async () => {
      await act(async () => {
        renderWithRouter(<Dashboard />);
      });

      await waitFor(() => {
        expect(screen.getByText('Budget by Category')).toBeInTheDocument();
        expect(screen.getByText(/Food \(20%\)/i)).toBeInTheDocument();
        expect(screen.getByText(/Transport \(15%\)/i)).toBeInTheDocument();
      });
    });

    it('should display empty state when no budgets configured', async () => {
      const stats = createMockDashboardStats({
        balanceByCategory: [],
      });

      mockApi.getDashboard.mockResolvedValue({
        data: stats,
      });

      await act(async () => {
        renderWithRouter(<Dashboard />);
      });

      await waitFor(() => {
        expect(screen.getByText(/No budgets configured for/i)).toBeInTheDocument();
        expect(screen.getByText(/Create budgets to track spending by category/i)).toBeInTheDocument();
      });
    });

    it('should render balance by currency section', async () => {
      await act(async () => {
        renderWithRouter(<Dashboard />);
      });

      await waitFor(() => {
        expect(screen.getByText('Balance by Currency')).toBeInTheDocument();
        expect(screen.getByText('USD')).toBeInTheDocument();
        expect(screen.getByText('EUR')).toBeInTheDocument();
      });
    });

    it('should render Update Rates button', async () => {
      await act(async () => {
        renderWithRouter(<Dashboard />);
      });

      await waitFor(() => {
        expect(screen.getByText('Update Rates')).toBeInTheDocument();
      });
    });

    it('should update exchange rates when Update Rates button is clicked', async () => {
      mockApi.updateExchangeRates.mockResolvedValue({});

      await act(async () => {
        renderWithRouter(<Dashboard />);
      });

      await waitFor(() => {
        expect(screen.getByText('Update Rates')).toBeInTheDocument();
      });

      const updateButton = screen.getByText('Update Rates');
      await act(async () => {
        fireEvent.click(updateButton);
      });

      await waitFor(() => {
        expect(mockApi.updateExchangeRates).toHaveBeenCalledTimes(1);
        expect(mockAlert).toHaveBeenCalledWith('Exchange rates updated successfully!');
        expect(mockApi.getDashboard).toHaveBeenCalledTimes(2); // Initial load + reload after update
      });
    });

    it('should handle error when updating exchange rates fails', async () => {
      mockApi.updateExchangeRates.mockRejectedValue({
        response: {
          data: {
            message: 'Failed to update rates',
          },
        },
      });

      await act(async () => {
        renderWithRouter(<Dashboard />);
      });

      await waitFor(() => {
        expect(screen.getByText('Update Rates')).toBeInTheDocument();
      });

      const updateButton = screen.getByText('Update Rates');
      await act(async () => {
        fireEvent.click(updateButton);
      });

      await waitFor(() => {
        expect(mockAlert).toHaveBeenCalledWith('Failed to update rates');
      });
    });

    it('should display year summary section', async () => {
      await act(async () => {
        renderWithRouter(<Dashboard />);
      });

      await waitFor(() => {
        expect(screen.getByText('Year Summary')).toBeInTheDocument();
        expect(screen.getByText(/Total Reimbursed/i)).toBeInTheDocument();
        expect(screen.getByText(/Spending by Expense Type/i)).toBeInTheDocument();
      });
    });

    it('should display total reimbursed amount', async () => {
      await act(async () => {
        renderWithRouter(<Dashboard />);
      });

      await waitFor(() => {
        // totalReimbursed may appear multiple times
        expect(screen.getAllByText('$300.00').length).toBeGreaterThan(0); // totalReimbursed
      });
    });

    it('should display spending by expense type', async () => {
      await act(async () => {
        renderWithRouter(<Dashboard />);
      });

      await waitFor(() => {
        // Groceries appears in both recent transactions and spending by expense type
        expect(screen.getAllByText('Groceries').length).toBeGreaterThan(0);
        expect(screen.getByText('Transport')).toBeInTheDocument();
        // These amounts may appear multiple times
        expect(screen.getAllByText('$500.00').length).toBeGreaterThan(0); // Groceries amount
        expect(screen.getAllByText('$200.00').length).toBeGreaterThan(0); // Transport amount
      });
    });

    it('should display empty state when no expense data available', async () => {
      const stats = createMockDashboardStats({
        spendingByExpenseType: [],
      });

      mockApi.getDashboard.mockResolvedValue({
        data: stats,
      });

      await act(async () => {
        renderWithRouter(<Dashboard />);
      });

      await waitFor(() => {
        expect(screen.getByText('No expense data available')).toBeInTheDocument();
      });
    });

    it('should render account balances section', async () => {
      await act(async () => {
        renderWithRouter(<Dashboard />);
      });

      await waitFor(() => {
        expect(screen.getByText('Account Balances')).toBeInTheDocument();
        expect(screen.getByText('Checking Account')).toBeInTheDocument();
        expect(screen.getByText('Savings Account')).toBeInTheDocument();
        expect(screen.queryByText('Inactive Account')).not.toBeInTheDocument(); // Should be filtered out
      });
    });

    it('should display empty state when no accounts found', async () => {
      const stats = createMockDashboardStats({
        accounts: [],
      });

      mockApi.getDashboard.mockResolvedValue({
        data: stats,
      });

      await act(async () => {
        renderWithRouter(<Dashboard />);
      });

      await waitFor(() => {
        expect(screen.getByText('No accounts found')).toBeInTheDocument();
      });
    });

    it('should render recent transactions section', async () => {
      await act(async () => {
        renderWithRouter(<Dashboard />);
      });

      await waitFor(() => {
        expect(screen.getByText('Recent Transactions')).toBeInTheDocument();
        expect(screen.getByText('Test Transaction')).toBeInTheDocument();
        expect(screen.getByText('INCOME')).toBeInTheDocument();
        expect(screen.getByText('EXPENSE')).toBeInTheDocument();
      });
    });

    it('should display transaction description or expense type name', async () => {
      await act(async () => {
        renderWithRouter(<Dashboard />);
      });

      await waitFor(() => {
        expect(screen.getByText('Test Transaction')).toBeInTheDocument();
        // Groceries appears in both recent transactions and spending by expense type
        expect(screen.getAllByText('Groceries').length).toBeGreaterThan(0); // From expenseType.name
      });
    });

    it('should handle missing monthly stats for current month', async () => {
      const stats = createMockDashboardStats({
        monthlyStats: [
          {
            month: '2023-01',
            income: 1000,
            expenses: 500,
            net: 500,
          },
        ],
      });

      mockApi.getDashboard.mockResolvedValue({
        data: stats,
      });

      await act(async () => {
        renderWithRouter(<Dashboard />);
      });

      await waitFor(() => {
        // Should show $0.00 for income and expenses when current month not found
        // $0.00 may appear multiple times (income and expenses both default to 0)
        expect(screen.getAllByText('$0.00').length).toBeGreaterThanOrEqual(2); // Monthly income and expenses (default)
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle null stats gracefully', async () => {
      mockApi.getDashboard.mockResolvedValue({
        data: null,
      });

      await act(async () => {
        renderWithRouter(<Dashboard />);
      });

      await waitFor(() => {
        // Component should return null when stats is null
        expect(screen.queryByText('Dashboard')).not.toBeInTheDocument();
      });
    });

    it('should filter out inactive accounts', async () => {
      const stats = createMockDashboardStats({
        accounts: [
          {
            id: 'account-1',
            name: 'Active Account',
            type: 'CHECKING',
            balance: 1000,
            balanceInBase: 1000,
            currencyCode: 'USD',
            currencySymbol: '$',
            isActive: true,
          },
          {
            id: 'account-2',
            name: 'Inactive Account',
            type: 'SAVINGS',
            balance: 500,
            balanceInBase: 500,
            currencyCode: 'USD',
            currencySymbol: '$',
            isActive: false,
          },
        ],
      });

      mockApi.getDashboard.mockResolvedValue({
        data: stats,
      });

      await act(async () => {
        renderWithRouter(<Dashboard />);
      });

      await waitFor(() => {
        expect(screen.getByText('Active Account')).toBeInTheDocument();
        expect(screen.queryByText('Inactive Account')).not.toBeInTheDocument();
      });
    });
  });
});

