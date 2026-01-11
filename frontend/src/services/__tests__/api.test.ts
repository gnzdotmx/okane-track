import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AxiosError } from 'axios';

// Mock axios before importing api
// Note: vi.mock is hoisted, so we must create mocks inside the factory
vi.mock('axios', () => {
  // Create mock functions inside the factory
  const mockAxiosGet = vi.fn();
  const mockAxiosPost = vi.fn();
  const mockAxiosPut = vi.fn();
  const mockAxiosDelete = vi.fn();
  const mockAxiosRequestUse = vi.fn();
  const mockAxiosResponseUse = vi.fn();
  
  // Store references on global so tests can access them
  (globalThis as any).__mockAxiosGet = mockAxiosGet;
  (globalThis as any).__mockAxiosPost = mockAxiosPost;
  (globalThis as any).__mockAxiosPut = mockAxiosPut;
  (globalThis as any).__mockAxiosDelete = mockAxiosDelete;
  (globalThis as any).__mockAxiosRequestUse = mockAxiosRequestUse;
  (globalThis as any).__mockAxiosResponseUse = mockAxiosResponseUse;
  
  const mockAxiosInstance = {
    get: mockAxiosGet,
    post: mockAxiosPost,
    put: mockAxiosPut,
    delete: mockAxiosDelete,
    interceptors: {
      request: {
        use: mockAxiosRequestUse,
      },
      response: {
        use: mockAxiosResponseUse,
      },
    },
  };
  
  return {
    default: {
      create: vi.fn(() => mockAxiosInstance),
    },
  };
});

// Import after mocking
import apiService from '../api';
import axios from 'axios';

// Get the mocked axios.create function
const mockAxiosCreate = (axios as any).create as ReturnType<typeof vi.fn>;

// Verify axios.create was called (it should be when apiService is initialized)
if (!mockAxiosCreate.mock.calls.length) {
  throw new Error('axios.create was not called - apiService may not have initialized properly');
}

// Get the instance that was created (should be called once when apiService is initialized)
const createdInstance = mockAxiosCreate.mock.results[0]?.value;

if (!createdInstance) {
  throw new Error('axios.create did not return an instance');
}

// Get references to the mock functions from the created instance
// These are the actual functions that were used when setting up interceptors
const mockAxiosGet = createdInstance.get;
const mockAxiosPost = createdInstance.post;
const mockAxiosPut = createdInstance.put;
const mockAxiosDelete = createdInstance.delete;
const mockAxiosRequestUse = createdInstance.interceptors.request.use;
const mockAxiosResponseUse = createdInstance.interceptors.response.use;

describe('ApiService', () => {
  beforeEach(() => {
    // Clear localStorage
    localStorage.clear();
    
    // Reset window.location
    (window.location as any).href = '';

    // Reset HTTP method mocks (but not interceptor mocks - they're set up once on module load)
    mockAxiosGet.mockClear();
    mockAxiosPost.mockClear();
    mockAxiosPut.mockClear();
    mockAxiosDelete.mockClear();
  });

  afterEach(() => {
    // Don't clear all mocks - we need to preserve interceptor setup calls
    // Only clear HTTP method mocks
    if (mockAxiosGet) mockAxiosGet.mockClear();
    if (mockAxiosPost) mockAxiosPost.mockClear();
    if (mockAxiosPut) mockAxiosPut.mockClear();
    if (mockAxiosDelete) mockAxiosDelete.mockClear();
  });

  describe('Initialization', () => {
    it('should set up request interceptor to add auth token', () => {
      // The interceptor should be set up when the module loads
      expect(mockAxiosRequestUse).toHaveBeenCalled();
      expect(mockAxiosRequestUse.mock.calls.length).toBeGreaterThan(0);
    });

    it('should set up response interceptor for error handling', () => {
      // The interceptor should be set up when the module loads
      expect(mockAxiosResponseUse).toHaveBeenCalled();
      expect(mockAxiosResponseUse.mock.calls.length).toBeGreaterThan(0);
    });
  });

  describe('Request Interceptor', () => {
    it('should add Authorization header when token exists', () => {
      localStorage.setItem('token', 'test-token-123');
      
      // Get the request interceptor callback from the first call
      const calls = mockAxiosRequestUse.mock.calls;
      expect(calls.length).toBeGreaterThan(0);
      const requestInterceptor = calls[0][0];
      const config = { headers: {} };
      
      const result = requestInterceptor(config);
      
      expect(result.headers.Authorization).toBe('Bearer test-token-123');
    });

    it('should not add Authorization header when token does not exist', () => {
      localStorage.removeItem('token');
      
      const calls = mockAxiosRequestUse.mock.calls;
      expect(calls.length).toBeGreaterThan(0);
      const requestInterceptor = calls[0][0];
      const config = { headers: {} };
      
      const result = requestInterceptor(config);
      
      expect(result.headers.Authorization).toBeUndefined();
    });
  });

  describe('Response Interceptor', () => {
    it('should redirect to login on 401 error', async () => {
      const calls = mockAxiosResponseUse.mock.calls;
      expect(calls.length).toBeGreaterThan(0);
      const responseInterceptorError = calls[0][1];
      
      const error = {
        response: {
          status: 401,
        },
      } as AxiosError;
      
      // The interceptor returns Promise.reject, so we need to handle it properly
      const promise = responseInterceptorError(error);
      await promise.catch(() => {
        // Expected rejection - ignore it
      });
      
      expect(localStorage.getItem('token')).toBeNull();
      expect(window.location.href).toBe('/login');
    });

    it('should not redirect on non-401 errors', async () => {
      const calls = mockAxiosResponseUse.mock.calls;
      expect(calls.length).toBeGreaterThan(0);
      const responseInterceptorError = calls[0][1];
      
      const error = {
        response: {
          status: 500,
        },
      } as AxiosError;
      
      // The interceptor returns Promise.reject, so we need to handle it properly
      const promise = responseInterceptorError(error);
      await promise.catch(() => {
        // Expected rejection - ignore it
      });
      
      expect(window.location.href).toBe('');
    });
  });

  describe('Auth endpoints', () => {
    it('should register user', async () => {
      const mockData = { success: true, data: { id: '1' } };
      mockAxiosPost.mockResolvedValue({ data: mockData });

      const result = await apiService.register({
        email: 'test@example.com',
        password: 'password123',
        firstName: 'John',
        lastName: 'Doe',
      });

      expect(mockAxiosPost).toHaveBeenCalledWith('/auth/register', {
        email: 'test@example.com',
        password: 'password123',
        firstName: 'John',
        lastName: 'Doe',
      });
      expect(result).toEqual(mockData);
    });

    it('should login user', async () => {
      const mockData = { success: true, token: 'token123' };
      mockAxiosPost.mockResolvedValue({ data: mockData });

      const result = await apiService.login('test@example.com', 'password123');

      expect(mockAxiosPost).toHaveBeenCalledWith('/auth/login', {
        email: 'test@example.com',
        password: 'password123',
      });
      expect(result).toEqual(mockData);
    });

    it('should get user profile', async () => {
      const mockData = { success: true, data: { id: '1', email: 'test@example.com' } };
      mockAxiosGet.mockResolvedValue({ data: mockData });

      const result = await apiService.getProfile();

      expect(mockAxiosGet).toHaveBeenCalledWith('/auth/profile');
      expect(result).toEqual(mockData);
    });
  });

  describe('Account endpoints', () => {
    it('should get all accounts', async () => {
      const mockData = { success: true, data: [] };
      mockAxiosGet.mockResolvedValue({ data: mockData });

      const result = await apiService.getAccounts();

      expect(mockAxiosGet).toHaveBeenCalledWith('/accounts');
      expect(result).toEqual(mockData);
    });

    it('should get account by id', async () => {
      const mockData = { success: true, data: { id: '1' } };
      mockAxiosGet.mockResolvedValue({ data: mockData });

      const result = await apiService.getAccount('account-123');

      expect(mockAxiosGet).toHaveBeenCalledWith('/accounts/account-123');
      expect(result).toEqual(mockData);
    });

    it('should create account', async () => {
      const accountData = { name: 'Test Account', type: 'CHECKING' };
      const mockData = { success: true, data: { id: '1', ...accountData } };
      mockAxiosPost.mockResolvedValue({ data: mockData });

      const result = await apiService.createAccount(accountData);

      expect(mockAxiosPost).toHaveBeenCalledWith('/accounts', accountData);
      expect(result).toEqual(mockData);
    });

    it('should update account', async () => {
      const updateData = { name: 'Updated Account' };
      const mockData = { success: true, data: { id: '1', ...updateData } };
      mockAxiosPut.mockResolvedValue({ data: mockData });

      const result = await apiService.updateAccount('account-123', updateData);

      expect(mockAxiosPut).toHaveBeenCalledWith('/accounts/account-123', updateData);
      expect(result).toEqual(mockData);
    });

    it('should delete account', async () => {
      const mockData = { success: true };
      mockAxiosDelete.mockResolvedValue({ data: mockData });

      const result = await apiService.deleteAccount('account-123');

      expect(mockAxiosDelete).toHaveBeenCalledWith('/accounts/account-123');
      expect(result).toEqual(mockData);
    });

    it('should recalculate account balance', async () => {
      const mockData = { success: true, data: { balance: 1000 } };
      mockAxiosPost.mockResolvedValue({ data: mockData });

      const result = await apiService.recalculateAccountBalance('account-123', 500);

      expect(mockAxiosPost).toHaveBeenCalledWith('/accounts/account-123/recalculate', { initialBalance: 500 });
      expect(result).toEqual(mockData);
    });

    it('should get currencies', async () => {
      const mockData = { success: true, data: [] };
      mockAxiosGet.mockResolvedValue({ data: mockData });

      const result = await apiService.getCurrencies();

      expect(mockAxiosGet).toHaveBeenCalledWith('/accounts/meta/currencies');
      expect(result).toEqual(mockData);
    });

    it('should get expense types', async () => {
      const mockData = { success: true, data: [] };
      mockAxiosGet.mockResolvedValue({ data: mockData });

      const result = await apiService.getExpenseTypes();

      expect(mockAxiosGet).toHaveBeenCalledWith('/accounts/meta/expense-types');
      expect(result).toEqual(mockData);
    });

    it('should get transaction types', async () => {
      const mockData = { success: true, data: [] };
      mockAxiosGet.mockResolvedValue({ data: mockData });

      const result = await apiService.getTransactionTypes();

      expect(mockAxiosGet).toHaveBeenCalledWith('/accounts/meta/transaction-types');
      expect(result).toEqual(mockData);
    });

    it('should update exchange rates', async () => {
      const mockData = { success: true };
      mockAxiosPost.mockResolvedValue({ data: mockData });

      const result = await apiService.updateExchangeRates();

      expect(mockAxiosPost).toHaveBeenCalledWith('/accounts/meta/update-exchange-rates');
      expect(result).toEqual(mockData);
    });
  });

  describe('Transaction endpoints', () => {
    it('should get transactions without filters', async () => {
      const mockData = { success: true, data: [] };
      mockAxiosGet.mockResolvedValue({ data: mockData });

      const result = await apiService.getTransactions();

      expect(mockAxiosGet).toHaveBeenCalledWith('/transactions', { params: undefined });
      expect(result).toEqual(mockData);
    });

    it('should get transactions with filters', async () => {
      const filters = { startDate: '2024-01-01', endDate: '2024-12-31' };
      const mockData = { success: true, data: [] };
      mockAxiosGet.mockResolvedValue({ data: mockData });

      const result = await apiService.getTransactions(filters);

      expect(mockAxiosGet).toHaveBeenCalledWith('/transactions', { params: filters });
      expect(result).toEqual(mockData);
    });

    it('should get transaction by id', async () => {
      const mockData = { success: true, data: { id: '1' } };
      mockAxiosGet.mockResolvedValue({ data: mockData });

      const result = await apiService.getTransaction('transaction-123');

      expect(mockAxiosGet).toHaveBeenCalledWith('/transactions/transaction-123');
      expect(result).toEqual(mockData);
    });

    it('should create transaction', async () => {
      const transactionData = { accountId: '1', amount: 100 };
      const mockData = { success: true, data: { id: '1', ...transactionData } };
      mockAxiosPost.mockResolvedValue({ data: mockData });

      const result = await apiService.createTransaction(transactionData);

      expect(mockAxiosPost).toHaveBeenCalledWith('/transactions', transactionData);
      expect(result).toEqual(mockData);
    });

    it('should update transaction', async () => {
      const updateData = { amount: 200 };
      const mockData = { success: true, data: { id: '1', ...updateData } };
      mockAxiosPut.mockResolvedValue({ data: mockData });

      const result = await apiService.updateTransaction('transaction-123', updateData);

      expect(mockAxiosPut).toHaveBeenCalledWith('/transactions/transaction-123', updateData);
      expect(result).toEqual(mockData);
    });

    it('should delete transaction', async () => {
      const mockData = { success: true };
      mockAxiosDelete.mockResolvedValue({ data: mockData });

      const result = await apiService.deleteTransaction('transaction-123');

      expect(mockAxiosDelete).toHaveBeenCalledWith('/transactions/transaction-123');
      expect(result).toEqual(mockData);
    });

    it('should get recent transactions with default limit', async () => {
      const mockData = { success: true, data: [] };
      mockAxiosGet.mockResolvedValue({ data: mockData });

      const result = await apiService.getRecentTransactions();

      expect(mockAxiosGet).toHaveBeenCalledWith('/transactions/recent', { params: { limit: 10 } });
      expect(result).toEqual(mockData);
    });

    it('should get recent transactions with custom limit', async () => {
      const mockData = { success: true, data: [] };
      mockAxiosGet.mockResolvedValue({ data: mockData });

      const result = await apiService.getRecentTransactions(5);

      expect(mockAxiosGet).toHaveBeenCalledWith('/transactions/recent', { params: { limit: 5 } });
      expect(result).toEqual(mockData);
    });
  });

  describe('Budget endpoints', () => {
    it('should get budgets without year', async () => {
      const mockData = { success: true, data: [] };
      mockAxiosGet.mockResolvedValue({ data: mockData });

      const result = await apiService.getBudgets();

      expect(mockAxiosGet).toHaveBeenCalledWith('/budgets/');
      expect(result).toEqual(mockData);
    });

    it('should get budgets with year', async () => {
      const mockData = { success: true, data: [] };
      mockAxiosGet.mockResolvedValue({ data: mockData });

      const result = await apiService.getBudgets(2024);

      expect(mockAxiosGet).toHaveBeenCalledWith('/budgets/2024');
      expect(result).toEqual(mockData);
    });

    it('should create budget', async () => {
      const budgetData = { year: 2024, startingBalance: 1000 };
      const mockData = { success: true, data: { id: '1', ...budgetData } };
      mockAxiosPost.mockResolvedValue({ data: mockData });

      const result = await apiService.createBudget(budgetData);

      expect(mockAxiosPost).toHaveBeenCalledWith('/budgets', budgetData);
      expect(result).toEqual(mockData);
    });

    it('should update budget', async () => {
      const updateData = { startingBalance: 2000 };
      const mockData = { success: true, data: { id: '1', ...updateData } };
      mockAxiosPut.mockResolvedValue({ data: mockData });

      const result = await apiService.updateBudget('budget-123', updateData);

      expect(mockAxiosPut).toHaveBeenCalledWith('/budgets/budget-123', updateData);
      expect(result).toEqual(mockData);
    });

    it('should get budget categories', async () => {
      const mockData = { success: true, data: [] };
      mockAxiosGet.mockResolvedValue({ data: mockData });

      const result = await apiService.getBudgetCategories();

      expect(mockAxiosGet).toHaveBeenCalledWith('/budgets/categories');
      expect(result).toEqual(mockData);
    });

    it('should update budget category percentages', async () => {
      const percentages = [
        { id: '1', percentage: 40 },
        { id: '2', percentage: 20 },
      ];
      const mockData = { success: true };
      mockAxiosPut.mockResolvedValue({ data: mockData });

      const result = await apiService.updateBudgetCategoryPercentages(percentages);

      expect(mockAxiosPut).toHaveBeenCalledWith('/budgets/categories/percentages', { percentages });
      expect(result).toEqual(mockData);
    });
  });

  describe('Dashboard endpoints', () => {
    it('should get dashboard data', async () => {
      const mockData = { success: true, data: {} };
      mockAxiosGet.mockResolvedValue({ data: mockData });

      const result = await apiService.getDashboard();

      expect(mockAxiosGet).toHaveBeenCalledWith('/dashboard');
      expect(result).toEqual(mockData);
    });

    it('should get category chart data', async () => {
      const mockData = { success: true, data: [] };
      mockAxiosGet.mockResolvedValue({ data: mockData });

      const result = await apiService.getChartData('category');

      expect(mockAxiosGet).toHaveBeenCalledWith('/dashboard/charts/category');
      expect(result).toEqual(mockData);
    });

    it('should get expense chart data', async () => {
      const mockData = { success: true, data: [] };
      mockAxiosGet.mockResolvedValue({ data: mockData });

      const result = await apiService.getChartData('expense');

      expect(mockAxiosGet).toHaveBeenCalledWith('/dashboard/charts/expense');
      expect(result).toEqual(mockData);
    });

    it('should get monthly chart data', async () => {
      const mockData = { success: true, data: [] };
      mockAxiosGet.mockResolvedValue({ data: mockData });

      const result = await apiService.getChartData('monthly');

      expect(mockAxiosGet).toHaveBeenCalledWith('/dashboard/charts/monthly');
      expect(result).toEqual(mockData);
    });
  });

  describe('Import/Export endpoints', () => {
    it('should import CSV file with accountId', async () => {
      const file = new File(['content'], 'test.csv', { type: 'text/csv' });
      const accountId = 'account-123';
      const mockData = { success: true, data: { imported: 10 } };
      mockAxiosPost.mockResolvedValue({ data: mockData });

      const result = await apiService.importCSV(file, accountId);

      expect(mockAxiosPost).toHaveBeenCalledWith(
        '/data/import',
        expect.any(FormData),
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );
      expect(result).toEqual(mockData);
    });

    it('should import CSV file without accountId when accountId is undefined', async () => {
      const file = new File(['content'], 'test.csv', { type: 'text/csv' });
      const mockData = { success: true, data: { imported: 10 } };
      mockAxiosPost.mockResolvedValue({ data: mockData });

      const result = await apiService.importCSV(file, undefined);

      expect(mockAxiosPost).toHaveBeenCalledWith(
        '/data/import',
        expect.any(FormData),
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );
      expect(result).toEqual(mockData);
    });

    it('should export CSV without filters', async () => {
      const mockBlob = new Blob(['csv content'], { type: 'text/csv' });
      mockAxiosGet.mockResolvedValue({ data: mockBlob });

      const result = await apiService.exportCSV();

      expect(mockAxiosGet).toHaveBeenCalledWith('/data/export', {
        params: undefined,
        responseType: 'blob',
      });
      expect(result).toEqual(mockBlob);
    });

    it('should export CSV with filters', async () => {
      const filters = { startDate: '2024-01-01', endDate: '2024-12-31' };
      const mockBlob = new Blob(['csv content'], { type: 'text/csv' });
      mockAxiosGet.mockResolvedValue({ data: mockBlob });

      const result = await apiService.exportCSV(filters);

      expect(mockAxiosGet).toHaveBeenCalledWith('/data/export', {
        params: filters,
        responseType: 'blob',
      });
      expect(result).toEqual(mockBlob);
    });

    it('should get import history', async () => {
      const mockData = { success: true, data: [] };
      mockAxiosGet.mockResolvedValue({ data: mockData });

      const result = await apiService.getImportHistory();

      expect(mockAxiosGet).toHaveBeenCalledWith('/data/history');
      expect(result).toEqual(mockData);
    });
  });
});

