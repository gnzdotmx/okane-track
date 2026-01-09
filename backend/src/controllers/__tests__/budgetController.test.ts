// Mock dependencies - jest.mock() calls are hoisted to the top
jest.mock('../../repositories/budgetRepository');

import { Response } from 'express';
import budgetController from '../budgetController';
import budgetRepository from '../../repositories/budgetRepository';
import { AuthRequest } from '../../types';

const mockBudgetRepository = budgetRepository as jest.Mocked<typeof budgetRepository>;

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

describe('BudgetController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getByYear', () => {
    it('should return budgets for the specified year', async () => {
      const mockBudgets = [
        {
          id: 'budget-1',
          startingBalance: 1000,
          allocatedAmount: 5000,
          currentBalance: 3500,
          year: 2024,
          userId: 'user-123',
          categoryId: 'category-1',
          category: {
            id: 'category-1',
            name: 'Food',
            percentage: 30,
          },
        },
        {
          id: 'budget-2',
          startingBalance: 500,
          allocatedAmount: 2000,
          currentBalance: 1500,
          year: 2024,
          userId: 'user-123',
          categoryId: 'category-2',
          category: {
            id: 'category-2',
            name: 'Transport',
            percentage: 20,
          },
        },
      ];

      mockBudgetRepository.findByUserAndYear.mockResolvedValue(mockBudgets as any);

      const req = createMockRequest({ params: { year: '2024' } });
      const res = createMockResponse();

      budgetController.getByYear(req, res, jest.fn());
      await waitForAsyncHandler();

      expect(mockBudgetRepository.findByUserAndYear).toHaveBeenCalledWith('user-123', 2024);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockBudgets,
      });
    });

    it('should use current year when year is not provided', async () => {
      const currentYear = new Date().getFullYear();
      const mockBudgets: any[] = [];

      mockBudgetRepository.findByUserAndYear.mockResolvedValue(mockBudgets);

      const req = createMockRequest();
      const res = createMockResponse();

      budgetController.getByYear(req, res, jest.fn());
      await waitForAsyncHandler();

      expect(mockBudgetRepository.findByUserAndYear).toHaveBeenCalledWith('user-123', currentYear);
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('should handle errors when repository throws', async () => {
      const error = new Error('Database error');
      mockBudgetRepository.findByUserAndYear.mockRejectedValue(error);

      const req = createMockRequest({ params: { year: '2024' } });
      const res = createMockResponse();
      const next = jest.fn();

      budgetController.getByYear(req, res, next);
      await waitForAsyncHandler();

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe('create', () => {
    it('should create a budget successfully', async () => {
      const mockBudget = {
        id: 'budget-1',
        startingBalance: 1000,
        allocatedAmount: 5000,
        currentBalance: 1000,
        year: 2024,
        userId: 'user-123',
        categoryId: 'category-1',
        category: {
          id: 'category-1',
          name: 'Food',
          percentage: 30,
        },
      };

      mockBudgetRepository.create.mockResolvedValue(mockBudget as any);

      const req = createMockRequest({
        body: {
          categoryId: 'category-1',
          startingBalance: 1000,
          allocatedAmount: 5000,
          year: 2024,
        },
      });
      const res = createMockResponse();

      budgetController.create(req, res, jest.fn());
      await waitForAsyncHandler();

      expect(mockBudgetRepository.create).toHaveBeenCalledWith({
        startingBalance: 1000,
        allocatedAmount: 5000,
        currentBalance: 1000,
        year: 2024,
        user: { connect: { id: 'user-123' } },
        category: { connect: { id: 'category-1' } },
      });
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Budget created successfully',
        data: mockBudget,
      });
    });

    it('should use current year when year is not provided', async () => {
      const currentYear = new Date().getFullYear();
      const mockBudget = {
        id: 'budget-1',
        startingBalance: 1000,
        allocatedAmount: 5000,
        currentBalance: 1000,
        year: currentYear,
        userId: 'user-123',
        categoryId: 'category-1',
        category: {
          id: 'category-1',
          name: 'Food',
          percentage: 30,
        },
      };

      mockBudgetRepository.create.mockResolvedValue(mockBudget as any);

      const req = createMockRequest({
        body: {
          categoryId: 'category-1',
          startingBalance: 1000,
          allocatedAmount: 5000,
        },
      });
      const res = createMockResponse();

      budgetController.create(req, res, jest.fn());
      await waitForAsyncHandler();

      expect(mockBudgetRepository.create).toHaveBeenCalledWith({
        startingBalance: 1000,
        allocatedAmount: 5000,
        currentBalance: 1000,
        year: currentYear,
        user: { connect: { id: 'user-123' } },
        category: { connect: { id: 'category-1' } },
      });
      expect(res.status).toHaveBeenCalledWith(201);
    });

    it('should handle errors when repository throws', async () => {
      const error = new Error('Database error');
      mockBudgetRepository.create.mockRejectedValue(error);

      const req = createMockRequest({
        body: {
          categoryId: 'category-1',
          startingBalance: 1000,
          allocatedAmount: 5000,
        },
      });
      const res = createMockResponse();
      const next = jest.fn();

      budgetController.create(req, res, next);
      await waitForAsyncHandler();

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe('update', () => {
    it('should update a budget successfully', async () => {
      const mockBudget = {
        id: 'budget-1',
        startingBalance: 1500,
        allocatedAmount: 6000,
        currentBalance: 3500,
        year: 2024,
        userId: 'user-123',
        categoryId: 'category-1',
        category: {
          id: 'category-1',
          name: 'Food',
          percentage: 30,
        },
      };

      mockBudgetRepository.update.mockResolvedValue(mockBudget as any);

      const req = createMockRequest({
        params: { id: 'budget-1' },
        body: {
          startingBalance: 1500,
          allocatedAmount: 6000,
        },
      });
      const res = createMockResponse();

      budgetController.update(req, res, jest.fn());
      await waitForAsyncHandler();

      expect(mockBudgetRepository.update).toHaveBeenCalledWith('budget-1', {
        startingBalance: 1500,
        allocatedAmount: 6000,
      });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Budget updated successfully',
        data: mockBudget,
      });
    });

    it('should handle errors when repository throws', async () => {
      const error = new Error('Budget not found');
      mockBudgetRepository.update.mockRejectedValue(error);

      const req = createMockRequest({
        params: { id: 'non-existent' },
        body: {
          startingBalance: 1500,
          allocatedAmount: 6000,
        },
      });
      const res = createMockResponse();
      const next = jest.fn();

      budgetController.update(req, res, next);
      await waitForAsyncHandler();

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe('getCategories', () => {
    it('should return all budget categories', async () => {
      const mockCategories = [
        {
          id: 'category-1',
          name: 'Food',
          percentage: 30,
        },
        {
          id: 'category-2',
          name: 'Transport',
          percentage: 20,
        },
        {
          id: 'category-3',
          name: 'Entertainment',
          percentage: 15,
        },
      ];

      mockBudgetRepository.getBudgetCategories.mockResolvedValue(mockCategories as any);

      const req = createMockRequest();
      const res = createMockResponse();

      budgetController.getCategories(req, res, jest.fn());
      await waitForAsyncHandler();

      expect(mockBudgetRepository.getBudgetCategories).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockCategories,
      });
    });

    it('should handle errors when repository throws', async () => {
      const error = new Error('Database error');
      mockBudgetRepository.getBudgetCategories.mockRejectedValue(error);

      const req = createMockRequest();
      const res = createMockResponse();
      const next = jest.fn();

      budgetController.getCategories(req, res, next);
      await waitForAsyncHandler();

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe('updateCategoryPercentages', () => {
    it('should update category percentages successfully', async () => {
      const mockCategories = [
        { id: 'category-1', name: 'Food', percentage: 30 },
        { id: 'category-2', name: 'Transport', percentage: 20 },
        { id: 'category-3', name: 'Entertainment', percentage: 15 },
      ];

      const mockUpdatedCategories = [
        { id: 'category-1', name: 'Food', percentage: 35 },
        { id: 'category-2', name: 'Transport', percentage: 25 },
        { id: 'category-3', name: 'Entertainment', percentage: 40 },
      ];

      mockBudgetRepository.getBudgetCategories.mockResolvedValue(mockCategories as any);
      mockBudgetRepository.updateCategoryPercentages.mockResolvedValue(mockUpdatedCategories as any);

      const req = createMockRequest({
        body: {
          percentages: [
            { id: 'category-1', percentage: 35 },
            { id: 'category-2', percentage: 25 },
            { id: 'category-3', percentage: 40 },
          ],
        },
      });
      const res = createMockResponse();

      budgetController.updateCategoryPercentages(req, res, jest.fn());
      await waitForAsyncHandler();

      expect(mockBudgetRepository.getBudgetCategories).toHaveBeenCalled();
      expect(mockBudgetRepository.updateCategoryPercentages).toHaveBeenCalledWith([
        { id: 'category-1', percentage: 35 },
        { id: 'category-2', percentage: 25 },
        { id: 'category-3', percentage: 40 },
      ]);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Budget category percentages updated successfully',
        data: mockUpdatedCategories,
      });
    });

    it('should return 400 when percentages array is missing', async () => {
      const req = createMockRequest({
        body: {},
      });
      const res = createMockResponse();

      budgetController.updateCategoryPercentages(req, res, jest.fn());
      await waitForAsyncHandler();

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Percentages array is required',
      });
      expect(mockBudgetRepository.getBudgetCategories).not.toHaveBeenCalled();
    });

    it('should return 400 when percentages array is empty', async () => {
      const req = createMockRequest({
        body: {
          percentages: [],
        },
      });
      const res = createMockResponse();

      budgetController.updateCategoryPercentages(req, res, jest.fn());
      await waitForAsyncHandler();

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Percentages array is required',
      });
    });

    it('should return 400 when percentages do not sum to 100', async () => {
      const mockCategories = [
        { id: 'category-1', name: 'Food', percentage: 30 },
        { id: 'category-2', name: 'Transport', percentage: 20 },
      ];

      mockBudgetRepository.getBudgetCategories.mockResolvedValue(mockCategories as any);

      const req = createMockRequest({
        body: {
          percentages: [
            { id: 'category-1', percentage: 50 },
            { id: 'category-2', percentage: 30 },
          ],
        },
      });
      const res = createMockResponse();

      budgetController.updateCategoryPercentages(req, res, jest.fn());
      await waitForAsyncHandler();

      expect(mockBudgetRepository.getBudgetCategories).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: expect.stringContaining('Percentages must sum to 100'),
      });
      expect(mockBudgetRepository.updateCategoryPercentages).not.toHaveBeenCalled();
    });

    it('should return 400 when category ID is invalid', async () => {
      const mockCategories = [
        { id: 'category-1', name: 'Food', percentage: 30 },
        { id: 'category-2', name: 'Transport', percentage: 20 },
      ];

      mockBudgetRepository.getBudgetCategories.mockResolvedValue(mockCategories as any);

      const req = createMockRequest({
        body: {
          percentages: [
            { id: 'invalid-category', percentage: 50 },
            { id: 'category-2', percentage: 50 },
          ],
        },
      });
      const res = createMockResponse();

      budgetController.updateCategoryPercentages(req, res, jest.fn());
      await waitForAsyncHandler();

      expect(mockBudgetRepository.getBudgetCategories).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Invalid category IDs or percentage values',
      });
      expect(mockBudgetRepository.updateCategoryPercentages).not.toHaveBeenCalled();
    });

    it('should return 400 when percentage is out of range', async () => {
      const mockCategories = [
        { id: 'category-1', name: 'Food', percentage: 30 },
        { id: 'category-2', name: 'Transport', percentage: 20 },
      ];

      mockBudgetRepository.getBudgetCategories.mockResolvedValue(mockCategories as any);

      const req = createMockRequest({
        body: {
          percentages: [
            { id: 'category-1', percentage: 150 },
            { id: 'category-2', percentage: -50 },
          ],
        },
      });
      const res = createMockResponse();

      budgetController.updateCategoryPercentages(req, res, jest.fn());
      await waitForAsyncHandler();

      expect(mockBudgetRepository.getBudgetCategories).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Invalid category IDs or percentage values',
      });
      expect(mockBudgetRepository.updateCategoryPercentages).not.toHaveBeenCalled();
    });

    it('should handle errors when repository throws', async () => {
      const error = new Error('Database error');
      mockBudgetRepository.getBudgetCategories.mockRejectedValue(error);

      const req = createMockRequest({
        body: {
          percentages: [
            { id: 'category-1', percentage: 50 },
            { id: 'category-2', percentage: 50 },
          ],
        },
      });
      const res = createMockResponse();
      const next = jest.fn();

      budgetController.updateCategoryPercentages(req, res, next);
      await waitForAsyncHandler();

      expect(next).toHaveBeenCalledWith(error);
    });
  });
});

