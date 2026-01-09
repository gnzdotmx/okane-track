// Mock dependencies - jest.mock() calls are hoisted to the top
jest.mock('../../services/dashboardService');

import { Response } from 'express';
import dashboardController from '../dashboardController';
import dashboardService from '../../services/dashboardService';
import { AuthRequest } from '../../types';

const mockDashboardService = dashboardService as jest.Mocked<typeof dashboardService>;

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

describe('DashboardController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getDashboard', () => {
    it('should return dashboard data successfully', async () => {
      const mockDashboard = {
        totalBalance: 10000,
        baseCurrency: {
          code: 'USD',
          symbol: '$',
        },
        balanceByCategory: [
          {
            categoryName: 'Food',
            balance: 1500,
            percentage: 30,
          },
          {
            categoryName: 'Transport',
            balance: 800,
            percentage: 20,
          },
        ],
        balanceByCurrency: [
          {
            currencyCode: 'USD',
            balance: 10000,
            balanceInBase: 10000,
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
        ],
        recentTransactions: [],
        monthlyStats: [
          {
            month: '2024-01',
            income: 5000,
            expenses: 3000,
            net: 2000,
          },
        ],
        totalReimbursed: 500,
        spendingByExpenseType: [
          {
            expenseTypeName: 'Food',
            amount: 1500,
            icon: '🍔',
            color: '#FF5733',
          },
        ],
      };

      mockDashboardService.getDashboard.mockResolvedValue(mockDashboard as any);

      const req = createMockRequest();
      const res = createMockResponse();

      dashboardController.getDashboard(req, res, jest.fn());
      await waitForAsyncHandler();

      expect(mockDashboardService.getDashboard).toHaveBeenCalledWith('user-123');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockDashboard,
      });
    });

    it('should handle errors when service throws', async () => {
      const error = new Error('Base currency not configured');
      mockDashboardService.getDashboard.mockRejectedValue(error);

      const req = createMockRequest();
      const res = createMockResponse();
      const next = jest.fn();

      dashboardController.getDashboard(req, res, next);
      await waitForAsyncHandler();

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe('getCharts', () => {
    it('should return category chart data successfully', async () => {
      const mockChartData = [
        {
          label: 'Food',
          value: 1500,
          percentage: 30,
        },
        {
          label: 'Transport',
          value: 800,
          percentage: 20,
        },
      ];

      mockDashboardService.getChartData.mockResolvedValue(mockChartData as any);

      const req = createMockRequest({ params: { type: 'category' } });
      const res = createMockResponse();

      dashboardController.getCharts(req, res, jest.fn());
      await waitForAsyncHandler();

      expect(mockDashboardService.getChartData).toHaveBeenCalledWith('user-123', 'category');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockChartData,
      });
    });

    it('should return expense chart data successfully', async () => {
      const mockChartData = [
        {
          label: 'Food',
          value: 1500,
          color: '#FF5733',
        },
        {
          label: 'Transport',
          value: 800,
          color: '#33C3F0',
        },
      ];

      mockDashboardService.getChartData.mockResolvedValue(mockChartData as any);

      const req = createMockRequest({ params: { type: 'expense' } });
      const res = createMockResponse();

      dashboardController.getCharts(req, res, jest.fn());
      await waitForAsyncHandler();

      expect(mockDashboardService.getChartData).toHaveBeenCalledWith('user-123', 'expense');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockChartData,
      });
    });

    it('should return monthly chart data successfully', async () => {
      const mockChartData = [
        {
          label: 'January',
          value: 2000,
        },
        {
          label: 'February',
          value: 2500,
        },
      ];

      mockDashboardService.getChartData.mockResolvedValue(mockChartData as any);

      const req = createMockRequest({ params: { type: 'monthly' } });
      const res = createMockResponse();

      dashboardController.getCharts(req, res, jest.fn());
      await waitForAsyncHandler();

      expect(mockDashboardService.getChartData).toHaveBeenCalledWith('user-123', 'monthly');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockChartData,
      });
    });

    it('should return 400 when chart type is invalid', async () => {
      const req = createMockRequest({ params: { type: 'invalid' } });
      const res = createMockResponse();

      dashboardController.getCharts(req, res, jest.fn());
      await waitForAsyncHandler();

      expect(mockDashboardService.getChartData).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Invalid chart type. Must be: category, expense, or monthly',
      });
    });

    it('should return 400 when chart type is missing', async () => {
      const req = createMockRequest({ params: {} });
      const res = createMockResponse();

      dashboardController.getCharts(req, res, jest.fn());
      await waitForAsyncHandler();

      expect(mockDashboardService.getChartData).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Invalid chart type. Must be: category, expense, or monthly',
      });
    });

    it('should return 400 when chart type is empty string', async () => {
      const req = createMockRequest({ params: { type: '' } });
      const res = createMockResponse();

      dashboardController.getCharts(req, res, jest.fn());
      await waitForAsyncHandler();

      expect(mockDashboardService.getChartData).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Invalid chart type. Must be: category, expense, or monthly',
      });
    });

    it('should handle errors when service throws', async () => {
      const error = new Error('Database error');
      mockDashboardService.getChartData.mockRejectedValue(error);

      const req = createMockRequest({ params: { type: 'category' } });
      const res = createMockResponse();
      const next = jest.fn();

      dashboardController.getCharts(req, res, next);
      await waitForAsyncHandler();

      expect(next).toHaveBeenCalledWith(error);
    });
  });
});

