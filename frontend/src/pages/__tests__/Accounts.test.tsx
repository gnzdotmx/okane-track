import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, act, fireEvent } from '@testing-library/react';
import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import Accounts from '../Accounts';
import api from '../../services/api';
import { Account, Currency } from '../../types';

// Mock the API service
vi.mock('../../services/api', () => ({
  default: {
    getAccounts: vi.fn(),
    getCurrencies: vi.fn(),
    createAccount: vi.fn(),
    updateAccount: vi.fn(),
    deleteAccount: vi.fn(),
    recalculateAccountBalance: vi.fn(),
  },
}));

// Mock the format utilities
vi.mock('../../utils/format', () => ({
  formatCurrency: vi.fn((amount: number, symbol: string) => `${symbol}${amount.toFixed(2)}`),
}));

// Mock the Loading component
vi.mock('../../components/common/Loading', () => ({
  default: ({ message }: { message: string }) => <div>Loading: {message}</div>,
}));

// Mock window.confirm, window.prompt, and window.alert
const mockConfirm = vi.fn();
const mockPrompt = vi.fn();
const mockAlert = vi.fn();

global.window.confirm = mockConfirm;
global.window.prompt = mockPrompt;
global.window.alert = mockAlert;

const mockApi = api as unknown as {
  getAccounts: ReturnType<typeof vi.fn>;
  getCurrencies: ReturnType<typeof vi.fn>;
  createAccount: ReturnType<typeof vi.fn>;
  updateAccount: ReturnType<typeof vi.fn>;
  deleteAccount: ReturnType<typeof vi.fn>;
  recalculateAccountBalance: ReturnType<typeof vi.fn>;
};

// Helper to render component with router
const renderWithRouter = (component: React.ReactElement) => {
  return render(<BrowserRouter>{component}</BrowserRouter>);
};

// Helper to create mock currency
const createMockCurrency = (overrides?: Partial<Currency>): Currency => ({
  id: 'currency-1',
  code: 'USD',
  symbol: '$',
  name: 'US Dollar',
  exchangeRate: 1,
  isBase: true,
  ...overrides,
});

// Helper to create mock account
const createMockAccount = (overrides?: Partial<Account>): Account => ({
  id: 'account-1',
  name: 'Checking Account',
  type: 'CHECKING',
  balance: 1000,
  isActive: true,
  createdAt: new Date().toISOString(),
  currency: createMockCurrency(),
  ...overrides,
});

describe('Accounts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockApi.getAccounts.mockResolvedValue({ data: [] });
    mockApi.getCurrencies.mockResolvedValue({
      data: [createMockCurrency()],
    });
  });

  describe('Loading State', () => {
    it('should show loading state initially', async () => {
      mockApi.getAccounts.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve({ data: [] }), 100))
      );

      await act(async () => {
        renderWithRouter(<Accounts />);
      });

      expect(screen.getByText(/Loading: Loading accounts.../i)).toBeInTheDocument();
    });

    it('should not show loading when data is loaded', async () => {
      mockApi.getAccounts.mockResolvedValue({
        data: [createMockAccount()],
      });

      await act(async () => {
        renderWithRouter(<Accounts />);
      });

      await waitFor(() => {
        expect(screen.queryByText(/Loading: Loading accounts.../i)).not.toBeInTheDocument();
      });
    });
  });

  describe('Rendering', () => {
    beforeEach(() => {
      mockApi.getAccounts.mockResolvedValue({
        data: [
          createMockAccount({ id: 'account-1', name: 'Checking Account', balance: 1000 }),
          createMockAccount({ id: 'account-2', name: 'Savings Account', balance: 5000 }),
        ],
      });
    });

    it('should render accounts title and add button', async () => {
      await act(async () => {
        renderWithRouter(<Accounts />);
      });

      await waitFor(() => {
        expect(screen.getByText('Accounts & Cards')).toBeInTheDocument();
        expect(screen.getByText('Add Account')).toBeInTheDocument();
      });
    });

    it('should render account cards with details', async () => {
      await act(async () => {
        renderWithRouter(<Accounts />);
      });

      await waitFor(() => {
        expect(screen.getByText('Checking Account')).toBeInTheDocument();
        expect(screen.getByText('Savings Account')).toBeInTheDocument();
        expect(screen.getByText('$1000.00')).toBeInTheDocument();
        expect(screen.getByText('$5000.00')).toBeInTheDocument();
        // US Dollar (USD) appears for each account, so use getAllByText
        expect(screen.getAllByText('US Dollar (USD)').length).toBeGreaterThan(0);
        // CHECKING appears for the checking account (but both accounts might be CHECKING type)
        expect(screen.getAllByText('CHECKING').length).toBeGreaterThan(0);
        // Current Balance appears for each account, so use getAllByText
        expect(screen.getAllByText('Current Balance').length).toBeGreaterThan(0);
      });
    });

    it('should display empty state when no accounts', async () => {
      mockApi.getAccounts.mockResolvedValue({
        data: [],
      });

      await act(async () => {
        renderWithRouter(<Accounts />);
      });

      await waitFor(() => {
        expect(screen.getByText(/No accounts found. Create your first account to get started/i)).toBeInTheDocument();
      });
    });
  });

  describe('Add Account Dialog', () => {
    beforeEach(() => {
      mockApi.getAccounts.mockResolvedValue({
        data: [createMockAccount()],
      });
    });

    it('should open add account dialog', async () => {
      await act(async () => {
        renderWithRouter(<Accounts />);
      });

      await waitFor(() => {
        expect(screen.getByText('Add Account')).toBeInTheDocument();
      });

      const addButton = screen.getByText('Add Account');
      fireEvent.click(addButton);

      await waitFor(() => {
        expect(screen.getByText('Add New Account')).toBeInTheDocument();
      });
    });

    it('should display all form fields in dialog', async () => {
      await act(async () => {
        renderWithRouter(<Accounts />);
      });

      await waitFor(() => {
        expect(screen.getByText('Add Account')).toBeInTheDocument();
      });

      const addButton = screen.getByText('Add Account');
      fireEvent.click(addButton);

      await waitFor(() => {
        expect(screen.getByLabelText('Account Name')).toBeInTheDocument();
        expect(screen.getByLabelText('Account Type')).toBeInTheDocument();
        expect(screen.getByLabelText('Currency')).toBeInTheDocument();
        expect(screen.getByLabelText('Initial Balance')).toBeInTheDocument();
      });
    });

    it('should close dialog when cancel is clicked', async () => {
      await act(async () => {
        renderWithRouter(<Accounts />);
      });

      await waitFor(() => {
        expect(screen.getByText('Add Account')).toBeInTheDocument();
      });

      const addButton = screen.getByText('Add Account');
      fireEvent.click(addButton);

      await waitFor(() => {
        expect(screen.getByText('Cancel')).toBeInTheDocument();
      });

      const cancelButton = screen.getByText('Cancel');
      fireEvent.click(cancelButton);

      await waitFor(() => {
        expect(screen.queryByLabelText('Account Name')).not.toBeInTheDocument();
      });
    });

    it('should show validation error when account name is empty', async () => {
      await act(async () => {
        renderWithRouter(<Accounts />);
      });

      await waitFor(() => {
        expect(screen.getByText('Add Account')).toBeInTheDocument();
      });

      const addButton = screen.getByText('Add Account');
      fireEvent.click(addButton);

      await waitFor(() => {
        expect(screen.getByText('Create Account')).toBeInTheDocument();
      });

      const createButton = screen.getByText('Create Account');
      await act(async () => {
        fireEvent.click(createButton);
      });

      await waitFor(() => {
        expect(screen.getByText('Please enter an account name')).toBeInTheDocument();
      });
    });

    it('should show validation error when currency is not selected', async () => {
      // Mock empty currencies from the start to test currency validation
      mockApi.getCurrencies.mockResolvedValue({
        data: [],
      });

      await act(async () => {
        renderWithRouter(<Accounts />);
      });

      await waitFor(() => {
        expect(screen.getByText('Add Account')).toBeInTheDocument();
      });

      const addButton = screen.getByText('Add Account');
      fireEvent.click(addButton);

      await waitFor(() => {
        expect(screen.getByLabelText('Account Name')).toBeInTheDocument();
      });

      const nameInput = screen.getByLabelText('Account Name');
      fireEvent.change(nameInput, { target: { value: 'Test Account' } });

      const createButton = screen.getByText('Create Account');
      await act(async () => {
        fireEvent.click(createButton);
      });

      await waitFor(() => {
        expect(screen.getByText('Please select a currency')).toBeInTheDocument();
      });
    });

    it('should create account when form is valid', async () => {
      mockApi.createAccount.mockResolvedValue({});

      await act(async () => {
        renderWithRouter(<Accounts />);
      });

      await waitFor(() => {
        expect(screen.getByText('Add Account')).toBeInTheDocument();
      });

      const addButton = screen.getByText('Add Account');
      fireEvent.click(addButton);

      await waitFor(() => {
        expect(screen.getByLabelText('Account Name')).toBeInTheDocument();
      });

      const nameInput = screen.getByLabelText('Account Name');
      fireEvent.change(nameInput, { target: { value: 'New Account' } });

      const initialBalanceInput = screen.getByLabelText('Initial Balance');
      fireEvent.change(initialBalanceInput, { target: { value: '500' } });

      const createButton = screen.getByText('Create Account');
      await act(async () => {
        fireEvent.click(createButton);
      });

      await waitFor(() => {
        expect(mockApi.createAccount).toHaveBeenCalledWith({
          name: 'New Account',
          type: 'CHECKING',
          currencyId: 'currency-1',
          balance: 500,
        });
        // getAccounts may be called multiple times due to re-renders
        expect(mockApi.getAccounts.mock.calls.length).toBeGreaterThanOrEqual(2);
      });
    });

    it('should handle API error when creating account', async () => {
      mockApi.createAccount.mockRejectedValue({
        response: {
          data: {
            message: 'Failed to create account',
          },
        },
      });

      await act(async () => {
        renderWithRouter(<Accounts />);
      });

      await waitFor(() => {
        expect(screen.getByText('Add Account')).toBeInTheDocument();
      });

      const addButton = screen.getByText('Add Account');
      fireEvent.click(addButton);

      await waitFor(() => {
        expect(screen.getByLabelText('Account Name')).toBeInTheDocument();
      });

      const nameInput = screen.getByLabelText('Account Name');
      fireEvent.change(nameInput, { target: { value: 'New Account' } });

      const createButton = screen.getByText('Create Account');
      await act(async () => {
        fireEvent.click(createButton);
      });

      await waitFor(() => {
        expect(screen.getByText('Failed to create account')).toBeInTheDocument();
      });
    });

    it('should handle generic error when creating account', async () => {
      mockApi.createAccount.mockRejectedValue(new Error('Network error'));

      await act(async () => {
        renderWithRouter(<Accounts />);
      });

      await waitFor(() => {
        expect(screen.getByText('Add Account')).toBeInTheDocument();
      });

      const addButton = screen.getByText('Add Account');
      fireEvent.click(addButton);

      await waitFor(() => {
        expect(screen.getByLabelText('Account Name')).toBeInTheDocument();
      });

      const nameInput = screen.getByLabelText('Account Name');
      fireEvent.change(nameInput, { target: { value: 'New Account' } });

      const createButton = screen.getByText('Create Account');
      await act(async () => {
        fireEvent.click(createButton);
      });

      await waitFor(() => {
        expect(screen.getByText('Failed to create account')).toBeInTheDocument();
      });
    });
  });

  describe('Edit Account Dialog', () => {
    beforeEach(() => {
      mockApi.getAccounts.mockResolvedValue({
        data: [createMockAccount({ id: 'account-1', name: 'Original Account' })],
      });
    });

    it('should open edit dialog with account data', async () => {
      await act(async () => {
        renderWithRouter(<Accounts />);
      });

      await waitFor(() => {
        expect(screen.getByText('Original Account')).toBeInTheDocument();
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
        expect(screen.getByText('Edit Account')).toBeInTheDocument();
        expect(screen.getByDisplayValue('Original Account')).toBeInTheDocument();
      });
    });

    it('should disable currency field when editing', async () => {
      await act(async () => {
        renderWithRouter(<Accounts />);
      });

      await waitFor(() => {
        expect(screen.getByText('Original Account')).toBeInTheDocument();
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
        const currencyField = screen.getByLabelText('Currency');
        // Material-UI Select uses aria-disabled instead of disabled attribute
        expect(currencyField).toHaveAttribute('aria-disabled', 'true');
      });
    });

    it('should not show initial balance field when editing', async () => {
      await act(async () => {
        renderWithRouter(<Accounts />);
      });

      await waitFor(() => {
        expect(screen.getByText('Original Account')).toBeInTheDocument();
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
        expect(screen.queryByLabelText('Initial Balance')).not.toBeInTheDocument();
      });
    });

    it('should update account when form is submitted', async () => {
      mockApi.updateAccount.mockResolvedValue({});

      await act(async () => {
        renderWithRouter(<Accounts />);
      });

      await waitFor(() => {
        expect(screen.getByText('Original Account')).toBeInTheDocument();
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
        expect(screen.getByText('Update Account')).toBeInTheDocument();
      });

      const nameInput = screen.getByDisplayValue('Original Account');
      fireEvent.change(nameInput, { target: { value: 'Updated Account' } });

      const updateButton = screen.getByText('Update Account');
      await act(async () => {
        fireEvent.click(updateButton);
      });

      await waitFor(() => {
        expect(mockApi.updateAccount).toHaveBeenCalledWith('account-1', {
          name: 'Updated Account',
          type: 'CHECKING',
        });
        // getAccounts may be called multiple times due to re-renders
        expect(mockApi.getAccounts.mock.calls.length).toBeGreaterThanOrEqual(2);
      });
    });

    it('should handle API error when updating account', async () => {
      mockApi.updateAccount.mockRejectedValue({
        response: {
          data: {
            message: 'Failed to update account',
          },
        },
      });

      await act(async () => {
        renderWithRouter(<Accounts />);
      });

      await waitFor(() => {
        expect(screen.getByText('Original Account')).toBeInTheDocument();
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
        expect(screen.getByText('Update Account')).toBeInTheDocument();
      });

      const updateButton = screen.getByText('Update Account');
      await act(async () => {
        fireEvent.click(updateButton);
      });

      await waitFor(() => {
        expect(screen.getByText('Failed to update account')).toBeInTheDocument();
      });
    });
  });

  describe('Delete Account', () => {
    beforeEach(() => {
      mockApi.getAccounts.mockResolvedValue({
        data: [createMockAccount({ id: 'account-1', name: 'Account to Delete' })],
      });
    });

    it('should confirm before deleting account', async () => {
      mockApi.deleteAccount.mockResolvedValue({});
      mockConfirm.mockReturnValue(true);

      await act(async () => {
        renderWithRouter(<Accounts />);
      });

      await waitFor(() => {
        expect(screen.getByText('Account to Delete')).toBeInTheDocument();
      });

      const deleteButtons = screen.getAllByRole('button');
      const deleteButton = deleteButtons.find((btn) => {
        const icon = btn.querySelector('svg[data-testid="DeleteIcon"]');
        return icon !== null;
      });

      if (deleteButton) {
        fireEvent.click(deleteButton);
      }

      expect(mockConfirm).toHaveBeenCalledWith('Are you sure you want to delete "Account to Delete"? This action cannot be undone.');
      await waitFor(() => {
        expect(mockApi.deleteAccount).toHaveBeenCalledWith('account-1');
        // getAccounts may be called multiple times due to re-renders
        expect(mockApi.getAccounts.mock.calls.length).toBeGreaterThanOrEqual(2);
      });
    });

    it('should not delete when user cancels confirmation', async () => {
      mockConfirm.mockReturnValue(false);

      await act(async () => {
        renderWithRouter(<Accounts />);
      });

      await waitFor(() => {
        expect(screen.getByText('Account to Delete')).toBeInTheDocument();
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
      expect(mockApi.deleteAccount).not.toHaveBeenCalled();
    });

    it('should handle API error when deleting account', async () => {
      mockApi.deleteAccount.mockRejectedValue({
        response: {
          data: {
            message: 'Failed to delete account',
          },
        },
      });
      mockConfirm.mockReturnValue(true);

      await act(async () => {
        renderWithRouter(<Accounts />);
      });

      await waitFor(() => {
        expect(screen.getByText('Account to Delete')).toBeInTheDocument();
      });

      const deleteButtons = screen.getAllByRole('button');
      const deleteButton = deleteButtons.find((btn) => {
        const icon = btn.querySelector('svg[data-testid="DeleteIcon"]');
        return icon !== null;
      });

      if (deleteButton) {
        fireEvent.click(deleteButton);
      }

      await waitFor(() => {
        expect(mockAlert).toHaveBeenCalledWith('Failed to delete account');
      });
    });
  });

  describe('Recalculate Balance', () => {
    beforeEach(() => {
      mockApi.getAccounts.mockResolvedValue({
        data: [createMockAccount({ id: 'account-1', name: 'Test Account' })],
      });
    });

    it('should recalculate balance with user-provided initial balance', async () => {
      mockApi.recalculateAccountBalance.mockResolvedValue({
        data: {
          initialBalance: 500,
          calculatedBalance: 1500,
        },
      });
      mockPrompt.mockReturnValue('500');

      await act(async () => {
        renderWithRouter(<Accounts />);
      });

      await waitFor(() => {
        expect(screen.getByText('Test Account')).toBeInTheDocument();
      });

      const recalculateButtons = screen.getAllByRole('button');
      const recalculateButton = recalculateButtons.find((btn) => {
        const icon = btn.querySelector('svg[data-testid="RefreshIcon"]');
        return icon !== null;
      });

      if (recalculateButton) {
        fireEvent.click(recalculateButton);
      }

      expect(mockPrompt).toHaveBeenCalledWith(
        expect.stringContaining('Recalculate balance for "Test Account"'),
        ''
      );

      await waitFor(() => {
        expect(mockApi.recalculateAccountBalance).toHaveBeenCalledWith('account-1', 500);
        expect(mockAlert).toHaveBeenCalledWith(
          expect.stringContaining('Balance recalculated successfully!')
        );
        // getAccounts may be called multiple times due to re-renders
        expect(mockApi.getAccounts.mock.calls.length).toBeGreaterThanOrEqual(2);
      });
    });

    it('should recalculate balance with auto-calculated initial balance', async () => {
      mockApi.recalculateAccountBalance.mockResolvedValue({
        data: {
          initialBalance: 1000,
          calculatedBalance: 2000,
        },
      });
      mockPrompt.mockReturnValue(''); // Empty string for auto-calculate

      await act(async () => {
        renderWithRouter(<Accounts />);
      });

      await waitFor(() => {
        expect(screen.getByText('Test Account')).toBeInTheDocument();
      });

      const recalculateButtons = screen.getAllByRole('button');
      const recalculateButton = recalculateButtons.find((btn) => {
        const icon = btn.querySelector('svg[data-testid="RefreshIcon"]');
        return icon !== null;
      });

      if (recalculateButton) {
        fireEvent.click(recalculateButton);
      }

      await waitFor(() => {
        expect(mockApi.recalculateAccountBalance).toHaveBeenCalledWith('account-1', undefined);
      });
    });

    it('should not recalculate when user cancels prompt', async () => {
      mockPrompt.mockReturnValue(null); // User cancelled

      await act(async () => {
        renderWithRouter(<Accounts />);
      });

      await waitFor(() => {
        expect(screen.getByText('Test Account')).toBeInTheDocument();
      });

      const recalculateButtons = screen.getAllByRole('button');
      const recalculateButton = recalculateButtons.find((btn) => {
        const icon = btn.querySelector('svg[data-testid="RefreshIcon"]');
        return icon !== null;
      });

      if (recalculateButton) {
        fireEvent.click(recalculateButton);
      }

      expect(mockPrompt).toHaveBeenCalled();
      expect(mockApi.recalculateAccountBalance).not.toHaveBeenCalled();
    });

    it('should handle API error when recalculating balance', async () => {
      mockApi.recalculateAccountBalance.mockRejectedValue({
        response: {
          data: {
            message: 'Failed to recalculate balance',
          },
        },
      });
      mockPrompt.mockReturnValue('500');

      await act(async () => {
        renderWithRouter(<Accounts />);
      });

      await waitFor(() => {
        expect(screen.getByText('Test Account')).toBeInTheDocument();
      });

      const recalculateButtons = screen.getAllByRole('button');
      const recalculateButton = recalculateButtons.find((btn) => {
        const icon = btn.querySelector('svg[data-testid="RefreshIcon"]');
        return icon !== null;
      });

      if (recalculateButton) {
        fireEvent.click(recalculateButton);
      }

      await waitFor(() => {
        expect(mockAlert).toHaveBeenCalledWith('Failed to recalculate balance');
      });
    });
  });

  describe('Form Interactions', () => {
    beforeEach(() => {
      mockApi.getAccounts.mockResolvedValue({
        data: [createMockAccount()],
      });
      mockApi.getCurrencies.mockResolvedValue({
        data: [
          createMockCurrency({ id: 'currency-1', code: 'USD', name: 'US Dollar', isBase: true }),
          createMockCurrency({ id: 'currency-2', code: 'EUR', name: 'Euro', isBase: false }),
        ],
      });
    });

    it('should update account name field', async () => {
      await act(async () => {
        renderWithRouter(<Accounts />);
      });

      await waitFor(() => {
        expect(screen.getByText('Add Account')).toBeInTheDocument();
      });

      const addButton = screen.getByText('Add Account');
      fireEvent.click(addButton);

      await waitFor(() => {
        expect(screen.getByLabelText('Account Name')).toBeInTheDocument();
      });

      const nameInput = screen.getByLabelText('Account Name');
      fireEvent.change(nameInput, { target: { value: 'My Account' } });

      expect(nameInput).toHaveValue('My Account');
    });

    it('should update account type field', async () => {
      await act(async () => {
        renderWithRouter(<Accounts />);
      });

      await waitFor(() => {
        expect(screen.getByText('Add Account')).toBeInTheDocument();
      });

      const addButton = screen.getByText('Add Account');
      fireEvent.click(addButton);

      await waitFor(() => {
        expect(screen.getByLabelText('Account Type')).toBeInTheDocument();
      });

      const typeSelect = screen.getByLabelText('Account Type');
      fireEvent.mouseDown(typeSelect);

      await waitFor(() => {
        const option = screen.getByRole('option', { name: 'Savings Account' });
        fireEvent.click(option);
      });

      await waitFor(() => {
        expect(typeSelect).toHaveTextContent('Savings Account');
      });
    });

    it('should update currency field', async () => {
      await act(async () => {
        renderWithRouter(<Accounts />);
      });

      await waitFor(() => {
        expect(screen.getByText('Add Account')).toBeInTheDocument();
      });

      const addButton = screen.getByText('Add Account');
      fireEvent.click(addButton);

      await waitFor(() => {
        expect(screen.getByLabelText('Currency')).toBeInTheDocument();
      });

      const currencySelect = screen.getByLabelText('Currency');
      fireEvent.mouseDown(currencySelect);

      await waitFor(() => {
        const option = screen.getByRole('option', { name: /Euro/i });
        fireEvent.click(option);
      });

      await waitFor(() => {
        expect(currencySelect).toHaveTextContent(/Euro/i);
      });
    });

    it('should update initial balance field', async () => {
      await act(async () => {
        renderWithRouter(<Accounts />);
      });

      await waitFor(() => {
        expect(screen.getByText('Add Account')).toBeInTheDocument();
      });

      const addButton = screen.getByText('Add Account');
      fireEvent.click(addButton);

      await waitFor(() => {
        expect(screen.getByLabelText('Initial Balance')).toBeInTheDocument();
      });

      const balanceInput = screen.getByLabelText('Initial Balance');
      fireEvent.change(balanceInput, { target: { value: '2500' } });

      // Number inputs may return the value as a number, so check for either string or number
      expect(balanceInput).toHaveValue(2500);
    });

    it('should show saving state when creating account', async () => {
      mockApi.createAccount.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve({}), 100))
      );

      await act(async () => {
        renderWithRouter(<Accounts />);
      });

      await waitFor(() => {
        expect(screen.getByText('Add Account')).toBeInTheDocument();
      });

      const addButton = screen.getByText('Add Account');
      fireEvent.click(addButton);

      await waitFor(() => {
        expect(screen.getByLabelText('Account Name')).toBeInTheDocument();
      });

      const nameInput = screen.getByLabelText('Account Name');
      fireEvent.change(nameInput, { target: { value: 'New Account' } });

      const createButton = screen.getByText('Create Account');
      fireEvent.click(createButton);

      await waitFor(() => {
        expect(screen.getByText('Creating...')).toBeInTheDocument();
        expect(createButton).toBeDisabled();
      });
    });

    it('should show saving state when updating account', async () => {
      mockApi.updateAccount.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve({}), 100))
      );

      await act(async () => {
        renderWithRouter(<Accounts />);
      });

      await waitFor(() => {
        expect(screen.getByText('Checking Account')).toBeInTheDocument();
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
        expect(screen.getByText('Update Account')).toBeInTheDocument();
      });

      const updateButton = screen.getByText('Update Account');
      fireEvent.click(updateButton);

      await waitFor(() => {
        expect(screen.getByText('Updating...')).toBeInTheDocument();
        expect(updateButton).toBeDisabled();
      });
    });
  });

  describe('Account Display', () => {
    it('should display different account types', async () => {
      mockApi.getAccounts.mockResolvedValue({
        data: [
          createMockAccount({ type: 'CHECKING' }),
          createMockAccount({ id: 'account-2', type: 'SAVINGS' }),
          createMockAccount({ id: 'account-3', type: 'CREDIT_CARD' }),
          createMockAccount({ id: 'account-4', type: 'CASH' }),
          createMockAccount({ id: 'account-5', type: 'INVESTMENT' }),
        ],
      });

      await act(async () => {
        renderWithRouter(<Accounts />);
      });

      await waitFor(() => {
        expect(screen.getByText('CHECKING')).toBeInTheDocument();
        expect(screen.getByText('SAVINGS')).toBeInTheDocument();
        expect(screen.getByText('CREDIT_CARD')).toBeInTheDocument();
        expect(screen.getByText('CASH')).toBeInTheDocument();
        expect(screen.getByText('INVESTMENT')).toBeInTheDocument();
      });
    });

    it('should display account with different currency', async () => {
      const eurCurrency = createMockCurrency({
        id: 'currency-2',
        code: 'EUR',
        symbol: '€',
        name: 'Euro',
        isBase: false,
      });

      mockApi.getAccounts.mockResolvedValue({
        data: [createMockAccount({ currency: eurCurrency })],
      });

      await act(async () => {
        renderWithRouter(<Accounts />);
      });

      await waitFor(() => {
        expect(screen.getByText('Euro (EUR)')).toBeInTheDocument();
      });
    });
  });
});

