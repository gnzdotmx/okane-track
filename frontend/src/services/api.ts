import axios, { AxiosInstance, AxiosError } from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

class ApiService {
  private api: AxiosInstance;

  constructor() {
    this.api = axios.create({
      baseURL: API_URL,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor to add auth token
    this.api.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor for error handling
    this.api.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        if (error.response?.status === 401) {
          // Unauthorized - clear token and redirect to login
          localStorage.removeItem('token');
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }
    );
  }

  // Auth endpoints
  async register(data: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
  }) {
    const response = await this.api.post('/auth/register', data);
    return response.data;
  }

  async login(email: string, password: string) {
    const response = await this.api.post('/auth/login', { email, password });
    return response.data;
  }

  async getProfile() {
    const response = await this.api.get('/auth/profile');
    return response.data;
  }

  // Account endpoints
  async getAccounts() {
    const response = await this.api.get('/accounts');
    return response.data;
  }

  async getAccount(id: string) {
    const response = await this.api.get(`/accounts/${id}`);
    return response.data;
  }

  async createAccount(data: any) {
    const response = await this.api.post('/accounts', data);
    return response.data;
  }

  async updateAccount(id: string, data: any) {
    const response = await this.api.put(`/accounts/${id}`, data);
    return response.data;
  }

  async deleteAccount(id: string) {
    const response = await this.api.delete(`/accounts/${id}`);
    return response.data;
  }

  async recalculateAccountBalance(id: string, initialBalance?: number) {
    const response = await this.api.post(`/accounts/${id}/recalculate`, { initialBalance });
    return response.data;
  }

  async getCurrencies() {
    const response = await this.api.get('/accounts/meta/currencies');
    return response.data;
  }

  async getExpenseTypes() {
    const response = await this.api.get('/accounts/meta/expense-types');
    return response.data;
  }

  async getTransactionTypes() {
    const response = await this.api.get('/accounts/meta/transaction-types');
    return response.data;
  }

  async updateExchangeRates() {
    const response = await this.api.post('/accounts/meta/update-exchange-rates');
    return response.data;
  }

  // Transaction endpoints
  async getTransactions(filters?: any) {
    const response = await this.api.get('/transactions', { params: filters });
    return response.data;
  }

  async getTransaction(id: string) {
    const response = await this.api.get(`/transactions/${id}`);
    return response.data;
  }

  async createTransaction(data: any) {
    const response = await this.api.post('/transactions', data);
    return response.data;
  }

  async updateTransaction(id: string, data: any) {
    const response = await this.api.put(`/transactions/${id}`, data);
    return response.data;
  }

  async deleteTransaction(id: string) {
    const response = await this.api.delete(`/transactions/${id}`);
    return response.data;
  }

  async getRecentTransactions(limit: number = 10) {
    const response = await this.api.get('/transactions/recent', {
      params: { limit },
    });
    return response.data;
  }

  // Budget endpoints
  async getBudgets(year?: number) {
    const response = await this.api.get(`/budgets/${year || ''}`);
    return response.data;
  }

  async createBudget(data: any) {
    const response = await this.api.post('/budgets', data);
    return response.data;
  }

  async updateBudget(id: string, data: any) {
    const response = await this.api.put(`/budgets/${id}`, data);
    return response.data;
  }

  async getBudgetCategories() {
    const response = await this.api.get('/budgets/categories');
    return response.data;
  }

  async updateBudgetCategoryPercentages(percentages: Array<{ id: string; percentage: number }>) {
    const response = await this.api.put('/budgets/categories/percentages', { percentages });
    return response.data;
  }

  // Dashboard endpoints
  async getDashboard() {
    const response = await this.api.get('/dashboard');
    return response.data;
  }

  async getChartData(type: 'category' | 'expense' | 'monthly') {
    const response = await this.api.get(`/dashboard/charts/${type}`);
    return response.data;
  }

  // Import/Export endpoints
  async importCSV(file: File, accountId?: string) {
    const formData = new FormData();
    formData.append('file', file);
    if (accountId) {
      formData.append('accountId', accountId);
    }

    const response = await this.api.post('/data/import', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  }

  async exportCSV(filters?: any) {
    const response = await this.api.get('/data/export', {
      params: filters,
      responseType: 'blob',
    });
    return response.data;
  }

  async getImportHistory() {
    const response = await this.api.get('/data/history');
    return response.data;
  }
}

export default new ApiService();

