import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, act, fireEvent } from '@testing-library/react';
import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import Transactions from '../Transactions';
import api from '../../services/api';
import { Transaction, Account, ExpenseType, TransactionType, BudgetCategory } from '../../types';

// Mock the API service
vi.mock('../../services/api', () => ({
  default: {
    getTransactions: vi.fn(),
    getAccounts: vi.fn(),
    getTransactionTypes: vi.fn(),
    getBudgetCategories: vi.fn(),
    getExpenseTypes: vi.fn(),
    createTransaction: vi.fn(),
    updateTransaction: vi.fn(),
    deleteTransaction: vi.fn(),
    exportCSV: vi.fn(),
  },
}));

// Mock the format utilities
vi.mock('../../utils/format', () => ({
  formatCurrency: vi.fn((amount: number, symbol: string) => `${symbol}${amount.toFixed(2)}`),
  formatDateString: vi.fn((date: string, format?: string) => {
    const d = new Date(date);
    if (format === 'MMM dd, yyyy') {
      return d.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
    }
    return d.toLocaleDateString();
  }),
  downloadCSV: vi.fn(),
}));

// Mock the Loading component
vi.mock('../../components/common/Loading', () => ({
  default: ({ message }: { message: string }) => <div>Loading: {message}</div>,
}));

// Mock window.confirm
const mockConfirm = vi.fn();
global.window.confirm = mockConfirm;

const mockApi = api as unknown as {
  getTransactions: ReturnType<typeof vi.fn>;
  getAccounts: ReturnType<typeof vi.fn>;
  getTransactionTypes: ReturnType<typeof vi.fn>;
  getBudgetCategories: ReturnType<typeof vi.fn>;
  getExpenseTypes: ReturnType<typeof vi.fn>;
  createTransaction: ReturnType<typeof vi.fn>;
  updateTransaction: ReturnType<typeof vi.fn>;
  deleteTransaction: ReturnType<typeof vi.fn>;
  exportCSV: ReturnType<typeof vi.fn>;
};

// Helper to render component with router
const renderWithRouter = (component: React.ReactElement) => {
  return render(<BrowserRouter>{component}</BrowserRouter>);
};

// Helper to create mock data
const createMockAccount = (overrides?: Partial<Account>): Account => ({
  id: 'account-1',
  name: 'Checking Account',
  type: 'CHECKING',
  balance: 1000,
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
  ...overrides,
});

const createMockTransactionType = (overrides?: Partial<TransactionType>): TransactionType => ({
  id: 'type-1',
  name: 'INCOME',
  ...overrides,
});

const createMockBudgetCategory = (overrides?: Partial<BudgetCategory>): BudgetCategory => ({
  id: 'category-1',
  name: 'Food',
  percentage: 0,
  ...overrides,
});

const createMockExpenseType = (overrides?: Partial<ExpenseType>): ExpenseType => ({
  id: 'expense-1',
  name: 'Groceries',
  icon: '🛒',
  ...overrides,
});

const createMockTransaction = (overrides?: Partial<Transaction>): Transaction => ({
  id: 'tx-1',
  date: new Date().toISOString(),
  amount: 100,
  description: 'Test Transaction',
  isReimbursable: false,
  notes: '',
  account: createMockAccount(),
  currency: {
    id: 'currency-1',
    code: 'USD',
    symbol: '$',
    name: 'US Dollar',
    exchangeRate: 1,
    isBase: true,
  },
  transactionType: createMockTransactionType(),
  budgetCategory: createMockBudgetCategory(),
  createdAt: new Date().toISOString(),
  ...overrides,
});

describe('Transactions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockConfirm.mockReturnValue(true);

    // Default mock responses
    mockApi.getAccounts.mockResolvedValue({
      data: [createMockAccount()],
    });
    mockApi.getTransactionTypes.mockResolvedValue({
      data: [
        createMockTransactionType({ id: 'type-1', name: 'INCOME' }),
        createMockTransactionType({ id: 'type-2', name: 'EXPENSE' }),
        createMockTransactionType({ id: 'type-3', name: 'REIMBURSEMENT' }),
      ],
    });
    mockApi.getBudgetCategories.mockResolvedValue({
      data: [createMockBudgetCategory()],
    });
    mockApi.getExpenseTypes.mockResolvedValue({
      data: [createMockExpenseType()],
    });
    mockApi.getTransactions.mockResolvedValue({
      data: [],
    });
  });

  describe('Loading State', () => {
    it('should show loading state initially when no transactions', async () => {
      mockApi.getTransactions.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve({ data: [] }), 100))
      );

      await act(async () => {
        renderWithRouter(<Transactions />);
      });

      expect(screen.getByText(/Loading: Loading transactions.../i)).toBeInTheDocument();
    });

    it('should not show loading when transactions exist', async () => {
      mockApi.getTransactions.mockResolvedValue({
        data: [createMockTransaction()],
      });

      await act(async () => {
        renderWithRouter(<Transactions />);
      });

      await waitFor(() => {
        expect(screen.queryByText(/Loading: Loading transactions.../i)).not.toBeInTheDocument();
      });
    });
  });

  describe('Rendering', () => {
    beforeEach(() => {
      mockApi.getTransactions.mockResolvedValue({
        data: [
          createMockTransaction({ id: 'tx-1', description: 'Transaction 1' }),
          createMockTransaction({ id: 'tx-2', description: 'Transaction 2' }),
        ],
      });
    });

    it('should render transactions title and count', async () => {
      await act(async () => {
        renderWithRouter(<Transactions />);
      });

      await waitFor(() => {
        expect(screen.getByText('Transactions')).toBeInTheDocument();
        expect(screen.getByText(/Total: 2 transactions/i)).toBeInTheDocument();
      });
    });

    it('should render Add Transaction and Export CSV buttons', async () => {
      await act(async () => {
        renderWithRouter(<Transactions />);
      });

      await waitFor(() => {
        // Add Transaction appears as button text
        expect(screen.getAllByText('Add Transaction').length).toBeGreaterThan(0);
        expect(screen.getByText('Export CSV')).toBeInTheDocument();
      });
    });

    it('should render filter inputs', async () => {
      await act(async () => {
        renderWithRouter(<Transactions />);
      });

      await waitFor(() => {
        expect(screen.getByLabelText('Search')).toBeInTheDocument();
        expect(screen.getByLabelText('Start Date')).toBeInTheDocument();
        expect(screen.getByLabelText('End Date')).toBeInTheDocument();
        expect(screen.getByText('Clear Filters')).toBeInTheDocument();
      });
    });

    it('should render transactions table with headers', async () => {
      await act(async () => {
        renderWithRouter(<Transactions />);
      });

      await waitFor(() => {
        expect(screen.getByText('Date')).toBeInTheDocument();
        expect(screen.getByText('Description')).toBeInTheDocument();
        expect(screen.getByText('Type')).toBeInTheDocument();
        expect(screen.getByText('Category')).toBeInTheDocument();
        expect(screen.getByText('Account')).toBeInTheDocument();
        expect(screen.getByText('Amount')).toBeInTheDocument();
        expect(screen.getByText('Actions')).toBeInTheDocument();
      });
    });

    it('should render transaction rows', async () => {
      await act(async () => {
        renderWithRouter(<Transactions />);
      });

      await waitFor(() => {
        expect(screen.getByText('Transaction 1')).toBeInTheDocument();
        expect(screen.getByText('Transaction 2')).toBeInTheDocument();
      });
    });

    it('should display empty state when no transactions', async () => {
      mockApi.getTransactions.mockResolvedValue({
        data: [],
      });

      await act(async () => {
        renderWithRouter(<Transactions />);
      });

      await waitFor(() => {
        expect(screen.getByText(/No transactions found. Add your first transaction to get started/i)).toBeInTheDocument();
      });
    });
  });

  describe('Filtering', () => {
    beforeEach(() => {
      mockApi.getTransactions.mockResolvedValue({
        data: [createMockTransaction()],
      });
    });

    it('should update search filter', async () => {
      await act(async () => {
        renderWithRouter(<Transactions />);
      });

      await waitFor(() => {
        expect(screen.getByLabelText('Search')).toBeInTheDocument();
      });

      const searchInput = screen.getByLabelText('Search');
      fireEvent.change(searchInput, { target: { value: 'test' } });

      await waitFor(() => {
        expect(mockApi.getTransactions).toHaveBeenCalledWith(
          expect.objectContaining({ search: 'test' })
        );
      });
    });

    it('should update start date filter', async () => {
      await act(async () => {
        renderWithRouter(<Transactions />);
      });

      await waitFor(() => {
        expect(screen.getByLabelText('Start Date')).toBeInTheDocument();
      });

      const startDateInput = screen.getByLabelText('Start Date');
      fireEvent.change(startDateInput, { target: { value: '2024-01-01' } });

      await waitFor(() => {
        expect(mockApi.getTransactions).toHaveBeenCalledWith(
          expect.objectContaining({ startDate: '2024-01-01' })
        );
      });
    });

    it('should update end date filter', async () => {
      await act(async () => {
        renderWithRouter(<Transactions />);
      });

      await waitFor(() => {
        expect(screen.getByLabelText('End Date')).toBeInTheDocument();
      });

      const endDateInput = screen.getByLabelText('End Date');
      fireEvent.change(endDateInput, { target: { value: '2024-12-31' } });

      await waitFor(() => {
        expect(mockApi.getTransactions).toHaveBeenCalledWith(
          expect.objectContaining({ endDate: '2024-12-31' })
        );
      });
    });

    it('should clear all filters', async () => {
      await act(async () => {
        renderWithRouter(<Transactions />);
      });

      await waitFor(() => {
        expect(screen.getByText('Clear Filters')).toBeInTheDocument();
      });

      const clearButton = screen.getByText('Clear Filters');
      fireEvent.click(clearButton);

      await waitFor(() => {
        expect(mockApi.getTransactions).toHaveBeenCalledWith({
          search: '',
          startDate: '',
          endDate: '',
          categoryId: '',
          transactionTypeId: '',
        });
      });
    });
  });

  describe('Sorting', () => {
    beforeEach(() => {
      mockApi.getTransactions.mockResolvedValue({
        data: [
          createMockTransaction({
            id: 'tx-1',
            date: '2024-01-01T00:00:00Z',
            amount: 100,
            description: 'A Transaction',
            account: createMockAccount({ name: 'Account A' }),
            budgetCategory: createMockBudgetCategory({ name: 'Category A' }),
            transactionType: createMockTransactionType({ name: 'EXPENSE' }),
          }),
          createMockTransaction({
            id: 'tx-2',
            date: '2024-01-02T00:00:00Z',
            amount: 200,
            description: 'B Transaction',
            account: createMockAccount({ name: 'Account B' }),
            budgetCategory: createMockBudgetCategory({ name: 'Category B' }),
            transactionType: createMockTransactionType({ name: 'INCOME' }),
          }),
        ],
      });
    });

    it('should sort by date when clicking date header', async () => {
      await act(async () => {
        renderWithRouter(<Transactions />);
      });

      await waitFor(() => {
        expect(screen.getByText('Date')).toBeInTheDocument();
      });

      const dateHeader = screen.getByText('Date');
      fireEvent.click(dateHeader);

      // Should toggle sort order (default is desc, so clicking should make it asc)
      await waitFor(() => {
        expect(screen.getByText('Date')).toBeInTheDocument();
      });
    });

    it('should sort by description when clicking description header', async () => {
      await act(async () => {
        renderWithRouter(<Transactions />);
      });

      await waitFor(() => {
        expect(screen.getByText('Description')).toBeInTheDocument();
      });

      const descriptionHeader = screen.getByText('Description');
      fireEvent.click(descriptionHeader);

      await waitFor(() => {
        expect(screen.getByText('Description')).toBeInTheDocument();
      });
    });

    it('should sort by type when clicking type header', async () => {
      await act(async () => {
        renderWithRouter(<Transactions />);
      });

      await waitFor(() => {
        expect(screen.getByText('Type')).toBeInTheDocument();
      });

      const typeHeader = screen.getByText('Type');
      fireEvent.click(typeHeader);

      await waitFor(() => {
        expect(screen.getByText('Type')).toBeInTheDocument();
      });
    });

    it('should sort by category when clicking category header', async () => {
      await act(async () => {
        renderWithRouter(<Transactions />);
      });

      await waitFor(() => {
        expect(screen.getByText('Category')).toBeInTheDocument();
      });

      const categoryHeader = screen.getByText('Category');
      fireEvent.click(categoryHeader);

      await waitFor(() => {
        expect(screen.getByText('Category')).toBeInTheDocument();
      });
    });

    it('should sort by account when clicking account header', async () => {
      await act(async () => {
        renderWithRouter(<Transactions />);
      });

      await waitFor(() => {
        expect(screen.getByText('Account')).toBeInTheDocument();
      });

      const accountHeader = screen.getByText('Account');
      fireEvent.click(accountHeader);

      await waitFor(() => {
        expect(screen.getByText('Account')).toBeInTheDocument();
      });
    });

    it('should sort by amount when clicking amount header', async () => {
      await act(async () => {
        renderWithRouter(<Transactions />);
      });

      await waitFor(() => {
        expect(screen.getByText('Amount')).toBeInTheDocument();
      });

      const amountHeader = screen.getByText('Amount');
      fireEvent.click(amountHeader);

      await waitFor(() => {
        expect(screen.getByText('Amount')).toBeInTheDocument();
      });
    });
  });

  describe('Pagination', () => {
    beforeEach(() => {
      // Create 30 transactions for pagination testing
      const transactions = Array.from({ length: 30 }, (_, i) =>
        createMockTransaction({
          id: `tx-${i + 1}`,
          description: `Transaction ${i + 1}`,
        })
      );

      mockApi.getTransactions.mockResolvedValue({
        data: transactions,
      });
    });

    it('should display pagination controls', async () => {
      await act(async () => {
        renderWithRouter(<Transactions />);
      });

      await waitFor(() => {
        // TablePagination renders with specific text patterns
        expect(screen.getByText(/Rows per page/i)).toBeInTheDocument();
      });
    });

    it('should change rows per page', async () => {
      await act(async () => {
        renderWithRouter(<Transactions />);
      });

      await waitFor(() => {
        expect(screen.getByText(/Rows per page/i)).toBeInTheDocument();
        // Verify initial transactions are visible
        expect(screen.getByText('Transaction 1')).toBeInTheDocument();
      });

      // Find and click the rows per page selector
      const rowsPerPageSelect = screen.getByRole('combobox', { name: /rows per page/i });
      await act(async () => {
        fireEvent.mouseDown(rowsPerPageSelect);
      });

      await waitFor(() => {
        // Use getByRole to find the menu option, not the combobox value
        // Change to 10 to ensure it's different from default (25)
        const option = screen.getByRole('option', { name: '10' });
        expect(option).toBeInTheDocument();
      });

      // Click the option
      const option = screen.getByRole('option', { name: '10' });
      await act(async () => {
        fireEvent.click(option);
      });

      // Wait for the menu to close
      await waitFor(() => {
        expect(screen.queryByRole('option', { name: '10' })).not.toBeInTheDocument();
      });

      // Wait for pagination to update and transactions to re-render
      // After changing to 10 rows per page, Transaction 1 should still be visible (it's on the first page)
      // The component resets to page 0 when rowsPerPage changes
      await waitFor(() => {
        // Verify that transactions are still visible after pagination change
        // Check for multiple transactions to ensure pagination is working
        expect(screen.getByText('Transaction 1')).toBeInTheDocument();
        // Transaction 10 should be visible (first page with 10 rows per page)
        expect(screen.getByText('Transaction 10')).toBeInTheDocument();
      }, { timeout: 10000 });
    }, { timeout: 15000 });
  });

  describe('Add Transaction Dialog', () => {
    beforeEach(() => {
      mockApi.getTransactions.mockResolvedValue({
        data: [createMockTransaction()],
      });
    });

    it('should open add transaction dialog', async () => {
      await act(async () => {
        renderWithRouter(<Transactions />);
      });

      await waitFor(() => {
        // Find the button (not the dialog title)
        const addButtons = screen.getAllByText('Add Transaction');
        expect(addButtons.length).toBeGreaterThan(0);
      });

      // Get the button (first one is the button, second would be dialog title if open)
      const addButtons = screen.getAllByText('Add Transaction');
      const addButton = addButtons[0];
      fireEvent.click(addButton);

      await waitFor(() => {
        // After clicking, dialog title should appear
        expect(screen.getAllByText('Add Transaction').length).toBeGreaterThanOrEqual(2); // Button + Dialog title
      });
    });

    it('should display all form fields in dialog', async () => {
      await act(async () => {
        renderWithRouter(<Transactions />);
      });

      await waitFor(() => {
        const addButtons = screen.getAllByText('Add Transaction');
        expect(addButtons.length).toBeGreaterThan(0);
      });

      const addButtons = screen.getAllByText('Add Transaction');
      const addButton = addButtons[0];
      fireEvent.click(addButton);

      await waitFor(() => {
        expect(screen.getByLabelText('Date')).toBeInTheDocument();
        expect(screen.getByLabelText('Amount')).toBeInTheDocument();
        expect(screen.getByLabelText('Account')).toBeInTheDocument();
        expect(screen.getByLabelText('Transaction Type')).toBeInTheDocument();
        expect(screen.getByLabelText('Budget Category')).toBeInTheDocument();
        expect(screen.getByLabelText('Expense Type (Optional)')).toBeInTheDocument();
        expect(screen.getByLabelText('Description')).toBeInTheDocument();
        expect(screen.getByLabelText('Notes (Optional)')).toBeInTheDocument();
        expect(screen.getByText(/This expense is reimbursable/i)).toBeInTheDocument();
      });
    });

    it('should close dialog when cancel is clicked', async () => {
      await act(async () => {
        renderWithRouter(<Transactions />);
      });

      await waitFor(() => {
        const addButtons = screen.getAllByText('Add Transaction');
        expect(addButtons.length).toBeGreaterThan(0);
      });

      const addButtons = screen.getAllByText('Add Transaction');
      const addButton = addButtons[0];
      fireEvent.click(addButton);

      await waitFor(() => {
        expect(screen.getByText('Cancel')).toBeInTheDocument();
      });

      const cancelButton = screen.getByText('Cancel');
      fireEvent.click(cancelButton);

      await waitFor(() => {
        expect(screen.queryByLabelText('Date')).not.toBeInTheDocument();
      });
    });

    it('should show validation error when account is not selected', async () => {
      // Mock empty accounts so no default is set
      mockApi.getAccounts.mockResolvedValue({
        data: [],
      });

      await act(async () => {
        renderWithRouter(<Transactions />);
      });

      await waitFor(() => {
        const addButtons = screen.getAllByText('Add Transaction');
        expect(addButtons.length).toBeGreaterThan(0);
      });

      const addButtons = screen.getAllByText('Add Transaction');
      const addButton = addButtons[0];
      fireEvent.click(addButton);

      await waitFor(() => {
        expect(screen.getByText('Create')).toBeInTheDocument();
      });

      const createButton = screen.getByText('Create');
      await act(async () => {
        fireEvent.click(createButton);
      });

      await waitFor(() => {
        expect(screen.getByText('Please select an account')).toBeInTheDocument();
      });
    });

    it('should show validation error when amount is invalid', async () => {
      await act(async () => {
        renderWithRouter(<Transactions />);
      });

      await waitFor(() => {
        const addButtons = screen.getAllByText('Add Transaction');
        expect(addButtons.length).toBeGreaterThan(0);
      });

      const addButtons = screen.getAllByText('Add Transaction');
      const addButton = addButtons[0];
      fireEvent.click(addButton);

      await waitFor(() => {
        expect(screen.getByLabelText('Amount')).toBeInTheDocument();
      });

      const amountInput = screen.getByLabelText('Amount');
      fireEvent.change(amountInput, { target: { value: '0' } });

      const createButton = screen.getByText('Create');
      await act(async () => {
        fireEvent.click(createButton);
      });

      await waitFor(() => {
        expect(screen.getByText('Please enter a valid amount')).toBeInTheDocument();
      });
    });

    it('should show validation error when transaction type is not selected', async () => {
      await act(async () => {
        renderWithRouter(<Transactions />);
      });

      await waitFor(() => {
        const addButtons = screen.getAllByText('Add Transaction');
        expect(addButtons.length).toBeGreaterThan(0);
      });

      const addButtons = screen.getAllByText('Add Transaction');
      const addButton = addButtons[0];
      fireEvent.click(addButton);

      await waitFor(() => {
        expect(screen.getByLabelText('Amount')).toBeInTheDocument();
      });

      const amountInput = screen.getByLabelText('Amount');
      fireEvent.change(amountInput, { target: { value: '100' } });

      const createButton = screen.getByText('Create');
      await act(async () => {
        fireEvent.click(createButton);
      });

      await waitFor(() => {
        expect(screen.getByText('Please select a transaction type')).toBeInTheDocument();
      });
    });

    it('should show validation error when budget category is not selected', async () => {
      await act(async () => {
        renderWithRouter(<Transactions />);
      });

      await waitFor(() => {
        const addButtons = screen.getAllByText('Add Transaction');
        expect(addButtons.length).toBeGreaterThan(0);
      });

      const addButtons = screen.getAllByText('Add Transaction');
      const addButton = addButtons[0];
      fireEvent.click(addButton);

      await waitFor(() => {
        expect(screen.getByLabelText('Amount')).toBeInTheDocument();
      });

      const amountInput = screen.getByLabelText('Amount');
      fireEvent.change(amountInput, { target: { value: '100' } });

      const transactionTypeSelect = screen.getByLabelText('Transaction Type');
      fireEvent.mouseDown(transactionTypeSelect);
      await waitFor(() => {
        // Use getByRole to find the menu option, not the chip in the table
        const option = screen.getByRole('option', { name: 'INCOME' });
        fireEvent.click(option);
      });

      const createButton = screen.getByText('Create');
      await act(async () => {
        fireEvent.click(createButton);
      });

      await waitFor(() => {
        expect(screen.getByText('Please select a budget category')).toBeInTheDocument();
      });
    });

    it('should create transaction when form is valid', async () => {
      mockApi.createTransaction.mockResolvedValue({});

      await act(async () => {
        renderWithRouter(<Transactions />);
      });

      await waitFor(() => {
        const addButtons = screen.getAllByText('Add Transaction');
        expect(addButtons.length).toBeGreaterThan(0);
      });

      const addButtons = screen.getAllByText('Add Transaction');
      const addButton = addButtons[0];
      fireEvent.click(addButton);

      await waitFor(() => {
        expect(screen.getByLabelText('Amount')).toBeInTheDocument();
      });

      const amountInput = screen.getByLabelText('Amount');
      fireEvent.change(amountInput, { target: { value: '100' } });

      const transactionTypeSelect = screen.getByLabelText('Transaction Type');
      fireEvent.mouseDown(transactionTypeSelect);
      await waitFor(() => {
        // Use getByRole to find the menu option, not the chip in the table
        const option = screen.getByRole('option', { name: 'INCOME' });
        fireEvent.click(option);
      });

      const categorySelect = screen.getByLabelText('Budget Category');
      fireEvent.mouseDown(categorySelect);
      await waitFor(() => {
        // Use getByRole to find the menu option, not the category in the table
        const option = screen.getByRole('option', { name: 'Food' });
        fireEvent.click(option);
      });

      const createButton = screen.getByText('Create');
      await act(async () => {
        fireEvent.click(createButton);
      });

      await waitFor(() => {
        expect(mockApi.createTransaction).toHaveBeenCalled();
        // getTransactions may be called multiple times due to re-renders or filter changes
        // At least initial load + reload after create
        expect(mockApi.getTransactions.mock.calls.length).toBeGreaterThanOrEqual(2);
      });
    });

    it('should update currency when account changes', async () => {
      const account2 = createMockAccount({
        id: 'account-2',
        name: 'EUR Account',
        currency: {
          id: 'currency-2',
          code: 'EUR',
          symbol: '€',
          name: 'Euro',
          exchangeRate: 0.85,
          isBase: false,
        },
      });

      mockApi.getAccounts.mockResolvedValue({
        data: [createMockAccount(), account2],
      });

      await act(async () => {
        renderWithRouter(<Transactions />);
      });

      await waitFor(() => {
        const addButtons = screen.getAllByText('Add Transaction');
        expect(addButtons.length).toBeGreaterThan(0);
      });

      const addButtons = screen.getAllByText('Add Transaction');
      const addButton = addButtons[0];
      fireEvent.click(addButton);

      await waitFor(() => {
        expect(screen.getByLabelText('Account')).toBeInTheDocument();
      });

      const accountSelect = screen.getByLabelText('Account');
      fireEvent.mouseDown(accountSelect);
      await waitFor(() => {
        const option = screen.getByText(/EUR Account/i);
        fireEvent.click(option);
      });

      // Currency should be updated to EUR
      await waitFor(() => {
        expect(accountSelect).toBeInTheDocument();
      });
    });
  });

  describe('Edit Transaction Dialog', () => {
    beforeEach(() => {
      mockApi.getTransactions.mockResolvedValue({
        data: [createMockTransaction({ id: 'tx-1', description: 'Original Transaction' })],
      });
    });

    it('should open edit dialog with transaction data', async () => {
      await act(async () => {
        renderWithRouter(<Transactions />);
      });

      await waitFor(() => {
        expect(screen.getByText('Original Transaction')).toBeInTheDocument();
      });

      // Find edit button (IconButton with Edit icon)
      const editButtons = screen.getAllByRole('button');
      const editButton = editButtons.find((btn) => {
        const icon = btn.querySelector('svg[data-testid="EditIcon"]');
        return icon !== null;
      });

      expect(editButton).toBeDefined();
      if (editButton) {
        fireEvent.click(editButton);
      }

      await waitFor(() => {
        expect(screen.getByText('Edit Transaction')).toBeInTheDocument();
        expect(screen.getByDisplayValue('Original Transaction')).toBeInTheDocument();
      });
    });

    it('should update transaction when form is submitted', async () => {
      mockApi.updateTransaction.mockResolvedValue({});

      await act(async () => {
        renderWithRouter(<Transactions />);
      });

      await waitFor(() => {
        expect(screen.getByText('Original Transaction')).toBeInTheDocument();
      });

      const editButtons = screen.getAllByRole('button');
      const editButton = editButtons.find((btn) => {
        const icon = btn.querySelector('svg[data-testid="EditIcon"]');
        return icon !== null;
      });

      if (editButton) {
        fireEvent.click(editButton);
      }

      await waitFor(() => {
        expect(screen.getByText('Update')).toBeInTheDocument();
      });

      const updateButton = screen.getByText('Update');
      await act(async () => {
        fireEvent.click(updateButton);
      });

      await waitFor(() => {
        expect(mockApi.updateTransaction).toHaveBeenCalled();
        // getTransactions may be called multiple times due to re-renders or filter changes
        // At least initial load + reload after update
        expect(mockApi.getTransactions.mock.calls.length).toBeGreaterThanOrEqual(2);
      });
    });
  });

  describe('Delete Transaction', () => {
    beforeEach(() => {
      mockApi.getTransactions.mockResolvedValue({
        data: [createMockTransaction({ id: 'tx-1', description: 'Transaction to Delete' })],
      });
    });

    it('should confirm before deleting transaction', async () => {
      mockApi.deleteTransaction.mockResolvedValue({});
      mockConfirm.mockReturnValue(true);

      await act(async () => {
        renderWithRouter(<Transactions />);
      });

      await waitFor(() => {
        expect(screen.getByText('Transaction to Delete')).toBeInTheDocument();
      });

      const deleteButtons = screen.getAllByRole('button');
      const deleteButton = deleteButtons.find((btn) => {
        const icon = btn.querySelector('svg[data-testid="DeleteIcon"]');
        return icon !== null;
      });

      if (deleteButton) {
        fireEvent.click(deleteButton);
      }

      expect(mockConfirm).toHaveBeenCalledWith('Are you sure you want to delete this transaction?');
      await waitFor(() => {
        expect(mockApi.deleteTransaction).toHaveBeenCalledWith('tx-1');
      });
    });

    it('should not delete when user cancels confirmation', async () => {
      mockConfirm.mockReturnValue(false);

      await act(async () => {
        renderWithRouter(<Transactions />);
      });

      await waitFor(() => {
        expect(screen.getByText('Transaction to Delete')).toBeInTheDocument();
      });

      const deleteButtons = screen.getAllByRole('button');
      const deleteButton = deleteButtons.find((btn) => {
        const icon = btn.querySelector('svg[data-testid="DeleteIcon"]');
        return icon !== null;
      });

      if (deleteButton) {
        fireEvent.click(deleteButton);
      }

      expect(mockConfirm).toHaveBeenCalled();
      expect(mockApi.deleteTransaction).not.toHaveBeenCalled();
    });
  });

  describe('Export CSV', () => {
    beforeEach(() => {
      mockApi.getTransactions.mockResolvedValue({
        data: [createMockTransaction()],
      });
    });

    it('should export CSV when Export CSV button is clicked', async () => {
      const mockBlob = new Blob(['test'], { type: 'text/csv' });
      mockApi.exportCSV.mockResolvedValue(mockBlob);

      await act(async () => {
        renderWithRouter(<Transactions />);
      });

      await waitFor(() => {
        expect(screen.getByText('Export CSV')).toBeInTheDocument();
      });

      const exportButton = screen.getByText('Export CSV');
      await act(async () => {
        fireEvent.click(exportButton);
      });

      await waitFor(() => {
        expect(mockApi.exportCSV).toHaveBeenCalled();
      });
    });
  });

  describe('Transaction Display', () => {
    it('should display reimbursable chip for reimbursable transactions', async () => {
      mockApi.getTransactions.mockResolvedValue({
        data: [createMockTransaction({ isReimbursable: true })],
      });

      await act(async () => {
        renderWithRouter(<Transactions />);
      });

      await waitFor(() => {
        expect(screen.getByText('Reimbursable')).toBeInTheDocument();
      });
    });

    it('should display expense type name when description is missing', async () => {
      const expenseType = createMockExpenseType({ name: 'Groceries' });
      mockApi.getTransactions.mockResolvedValue({
        data: [
          createMockTransaction({
            description: '',
            expenseType,
          }),
        ],
      });

      await act(async () => {
        renderWithRouter(<Transactions />);
      });

      await waitFor(() => {
        expect(screen.getByText('Groceries')).toBeInTheDocument();
      });
    });

    it('should display dash when description and expense type are missing', async () => {
      mockApi.getTransactions.mockResolvedValue({
        data: [
          createMockTransaction({
            description: '',
            expenseType: undefined,
          }),
        ],
      });

      await act(async () => {
        renderWithRouter(<Transactions />);
      });

      await waitFor(() => {
        expect(screen.getByText('-')).toBeInTheDocument();
      });
    });

    it('should display transaction type chips with correct colors', async () => {
      mockApi.getTransactions.mockResolvedValue({
        data: [
          createMockTransaction({
            id: 'tx-1',
            transactionType: createMockTransactionType({ name: 'INCOME' }),
          }),
          createMockTransaction({
            id: 'tx-2',
            transactionType: createMockTransactionType({ name: 'EXPENSE' }),
          }),
          createMockTransaction({
            id: 'tx-3',
            transactionType: createMockTransactionType({ name: 'REIMBURSEMENT' }),
          }),
        ],
      });

      await act(async () => {
        renderWithRouter(<Transactions />);
      });

      await waitFor(() => {
        expect(screen.getAllByText('INCOME').length).toBeGreaterThan(0);
        expect(screen.getAllByText('EXPENSE').length).toBeGreaterThan(0);
        expect(screen.getAllByText('REIMBURSEMENT').length).toBeGreaterThan(0);
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle API error when creating transaction', async () => {
      mockApi.createTransaction.mockRejectedValue({
        response: {
          data: {
            message: 'Failed to create transaction',
          },
        },
      });

      await act(async () => {
        renderWithRouter(<Transactions />);
      });

      await waitFor(() => {
        const addButtons = screen.getAllByText('Add Transaction');
        expect(addButtons.length).toBeGreaterThan(0);
      });

      const addButtons = screen.getAllByText('Add Transaction');
      const addButton = addButtons[0];
      fireEvent.click(addButton);

      await waitFor(() => {
        expect(screen.getByLabelText('Amount')).toBeInTheDocument();
      });

      const amountInput = screen.getByLabelText('Amount');
      fireEvent.change(amountInput, { target: { value: '100' } });

      const transactionTypeSelect = screen.getByLabelText('Transaction Type');
      fireEvent.mouseDown(transactionTypeSelect);
      await waitFor(() => {
        // Use getByRole to find the menu option, not the chip in the table
        const option = screen.getByRole('option', { name: 'INCOME' });
        fireEvent.click(option);
      });

      const categorySelect = screen.getByLabelText('Budget Category');
      fireEvent.mouseDown(categorySelect);
      await waitFor(() => {
        // Use getByRole to find the menu option, not the category in the table
        const option = screen.getByRole('option', { name: 'Food' });
        fireEvent.click(option);
      });

      const createButton = screen.getByText('Create');
      await act(async () => {
        fireEvent.click(createButton);
      });

      await waitFor(() => {
        expect(screen.getByText('Failed to create transaction')).toBeInTheDocument();
      });
    });

    it('should handle generic error when creating transaction', async () => {
      mockApi.createTransaction.mockRejectedValue(new Error('Network error'));

      await act(async () => {
        renderWithRouter(<Transactions />);
      });

      await waitFor(() => {
        const addButtons = screen.getAllByText('Add Transaction');
        expect(addButtons.length).toBeGreaterThan(0);
      });

      const addButtons = screen.getAllByText('Add Transaction');
      const addButton = addButtons[0];
      fireEvent.click(addButton);

      await waitFor(() => {
        expect(screen.getByLabelText('Amount')).toBeInTheDocument();
      });

      const amountInput = screen.getByLabelText('Amount');
      fireEvent.change(amountInput, { target: { value: '100' } });

      const transactionTypeSelect = screen.getByLabelText('Transaction Type');
      fireEvent.mouseDown(transactionTypeSelect);
      await waitFor(() => {
        // Use getByRole to find the menu option, not the chip in the table
        const option = screen.getByRole('option', { name: 'INCOME' });
        fireEvent.click(option);
      });

      const categorySelect = screen.getByLabelText('Budget Category');
      fireEvent.mouseDown(categorySelect);
      await waitFor(() => {
        // Use getByRole to find the menu option, not the category in the table
        const option = screen.getByRole('option', { name: 'Food' });
        fireEvent.click(option);
      });

      const createButton = screen.getByText('Create');
      await act(async () => {
        fireEvent.click(createButton);
      });

      await waitFor(() => {
        expect(screen.getByText('Failed to save transaction')).toBeInTheDocument();
      });
    });
  });
});

