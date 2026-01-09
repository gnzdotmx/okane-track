// Mock dependencies - jest.mock() calls are hoisted to the top
jest.mock('../../config/database', () => {
  const mockBudgetFindMany = jest.fn();
  const mockBudgetFindUnique = jest.fn();
  const mockBudgetCreate = jest.fn();
  const mockBudgetUpdate = jest.fn();
  const mockBudgetCategoryFindMany = jest.fn();
  const mockBudgetCategoryUpdate = jest.fn();
  
  return {
    __esModule: true,
    default: {
      budget: {
        findMany: mockBudgetFindMany,
        findUnique: mockBudgetFindUnique,
        create: mockBudgetCreate,
        update: mockBudgetUpdate,
      },
      budgetCategory: {
        findMany: mockBudgetCategoryFindMany,
        update: mockBudgetCategoryUpdate,
      },
    },
  };
});

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

import budgetRepository from '../budgetRepository';
import prisma from '../../config/database';

// Helper functions to get mock functions
const getMockBudgetFindMany = () => (prisma as any).budget.findMany;
const getMockBudgetFindUnique = () => (prisma as any).budget.findUnique;
const getMockBudgetCreate = () => (prisma as any).budget.create;
const getMockBudgetUpdate = () => (prisma as any).budget.update;
const getMockBudgetCategoryFindMany = () => (prisma as any).budgetCategory.findMany;
const getMockBudgetCategoryUpdate = () => (prisma as any).budgetCategory.update;

describe('BudgetRepository', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('findByUserAndYear', () => {
    it('should return budgets for a user and year', async () => {
      const mockBudgets = [
        {
          id: 'budget-1',
          userId: 'user-123',
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
        {
          id: 'budget-2',
          userId: 'user-123',
          categoryId: 'category-2',
          year: 2024,
          startingBalance: 500,
          allocatedAmount: 2000,
          currentBalance: 1500,
          category: {
            id: 'category-2',
            name: 'Transport',
            percentage: 20,
          },
        },
      ];

      getMockBudgetFindMany().mockResolvedValue(mockBudgets);

      const result = await budgetRepository.findByUserAndYear('user-123', 2024);

      expect(getMockBudgetFindMany()).toHaveBeenCalledWith({
        where: {
          userId: 'user-123',
          year: 2024,
        },
        include: {
          category: true,
        },
      });
      expect(result).toEqual(mockBudgets);
    });

    it('should return empty array when no budgets found', async () => {
      getMockBudgetFindMany().mockResolvedValue([]);

      const result = await budgetRepository.findByUserAndYear('user-123', 2024);

      expect(result).toEqual([]);
    });
  });

  describe('findByUserCategoryAndYear', () => {
    it('should return budget for user, category, and year', async () => {
      const mockBudget = {
        id: 'budget-1',
        userId: 'user-123',
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
      };

      getMockBudgetFindUnique().mockResolvedValue(mockBudget);

      const result = await budgetRepository.findByUserCategoryAndYear(
        'user-123',
        'category-1',
        2024
      );

      expect(getMockBudgetFindUnique()).toHaveBeenCalledWith({
        where: {
          userId_categoryId_year: {
            userId: 'user-123',
            categoryId: 'category-1',
            year: 2024,
          },
        },
        include: {
          category: true,
        },
      });
      expect(result).toEqual(mockBudget);
    });

    it('should return null when budget not found', async () => {
      getMockBudgetFindUnique().mockResolvedValue(null);

      const result = await budgetRepository.findByUserCategoryAndYear(
        'user-123',
        'category-1',
        2024
      );

      expect(result).toBeNull();
    });
  });

  describe('create', () => {
    it('should create a budget', async () => {
      const mockBudgetData = {
        startingBalance: 1000,
        allocatedAmount: 5000,
        currentBalance: 1000,
        year: 2024,
        user: { connect: { id: 'user-123' } },
        category: { connect: { id: 'category-1' } },
      };

      const mockCreatedBudget = {
        id: 'budget-1',
        ...mockBudgetData,
        category: {
          id: 'category-1',
          name: 'Food',
          percentage: 30,
        },
      };

      getMockBudgetCreate().mockResolvedValue(mockCreatedBudget);

      const result = await budgetRepository.create(mockBudgetData as any);

      expect(getMockBudgetCreate()).toHaveBeenCalledWith({
        data: mockBudgetData,
        include: {
          category: true,
        },
      });
      expect(result).toEqual(mockCreatedBudget);
    });
  });

  describe('update', () => {
    it('should update a budget', async () => {
      const updateData = {
        startingBalance: 1500,
        allocatedAmount: 6000,
      };

      const mockUpdatedBudget = {
        id: 'budget-1',
        startingBalance: 1500,
        allocatedAmount: 6000,
        currentBalance: 3500,
        category: {
          id: 'category-1',
          name: 'Food',
          percentage: 30,
        },
      };

      getMockBudgetUpdate().mockResolvedValue(mockUpdatedBudget);

      const result = await budgetRepository.update('budget-1', updateData as any);

      expect(getMockBudgetUpdate()).toHaveBeenCalledWith({
        where: { id: 'budget-1' },
        data: updateData,
        include: {
          category: true,
        },
      });
      expect(result).toEqual(mockUpdatedBudget);
    });
  });

  describe('updateBalance', () => {
    it('should update budget balance', async () => {
      const mockUpdatedBudget = {
        id: 'budget-1',
        currentBalance: 2000,
      };

      getMockBudgetUpdate().mockResolvedValue(mockUpdatedBudget);

      const result = await budgetRepository.updateBalance('budget-1', 2000);

      expect(getMockBudgetUpdate()).toHaveBeenCalledWith({
        where: { id: 'budget-1' },
        data: { currentBalance: 2000 },
      });
      expect(result).toEqual(mockUpdatedBudget);
    });
  });

  describe('getBudgetCategories', () => {
    it('should return all budget categories sorted by name', async () => {
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

      getMockBudgetCategoryFindMany().mockResolvedValue(mockCategories);

      const result = await budgetRepository.getBudgetCategories();

      expect(getMockBudgetCategoryFindMany()).toHaveBeenCalledWith({
        orderBy: {
          name: 'asc',
        },
      });
      expect(result).toEqual(mockCategories);
    });

    it('should return empty array when no categories exist', async () => {
      getMockBudgetCategoryFindMany().mockResolvedValue([]);

      const result = await budgetRepository.getBudgetCategories();

      expect(result).toEqual([]);
    });
  });

  describe('updateCategoryPercentage', () => {
    it('should update a single category percentage', async () => {
      const mockUpdatedCategory = {
        id: 'category-1',
        name: 'Food',
        percentage: 35,
      };

      getMockBudgetCategoryUpdate().mockResolvedValue(mockUpdatedCategory);

      const result = await budgetRepository.updateCategoryPercentage('category-1', 35);

      expect(getMockBudgetCategoryUpdate()).toHaveBeenCalledWith({
        where: { id: 'category-1' },
        data: { percentage: 35 },
      });
      expect(result).toEqual(mockUpdatedCategory);
    });
  });

  describe('updateCategoryPercentages', () => {
    it('should update multiple category percentages', async () => {
      const updates = [
        { id: 'category-1', percentage: 35 },
        { id: 'category-2', percentage: 25 },
        { id: 'category-3', percentage: 40 },
      ];

      const mockUpdatedCategories = [
        { id: 'category-1', name: 'Food', percentage: 35 },
        { id: 'category-2', name: 'Transport', percentage: 25 },
        { id: 'category-3', name: 'Entertainment', percentage: 40 },
      ];

      const mockUpdate = getMockBudgetCategoryUpdate();
      mockUpdate
        .mockResolvedValueOnce(mockUpdatedCategories[0])
        .mockResolvedValueOnce(mockUpdatedCategories[1])
        .mockResolvedValueOnce(mockUpdatedCategories[2]);

      const result = await budgetRepository.updateCategoryPercentages(updates);

      expect(mockUpdate).toHaveBeenCalledTimes(3);
      expect(mockUpdate).toHaveBeenCalledWith({
        where: { id: 'category-1' },
        data: { percentage: 35 },
      });
      expect(mockUpdate).toHaveBeenCalledWith({
        where: { id: 'category-2' },
        data: { percentage: 25 },
      });
      expect(mockUpdate).toHaveBeenCalledWith({
        where: { id: 'category-3' },
        data: { percentage: 40 },
      });
      expect(result).toEqual(mockUpdatedCategories);
    });

    it('should handle empty updates array', async () => {
      const mockUpdate = getMockBudgetCategoryUpdate();
      const result = await budgetRepository.updateCategoryPercentages([]);

      expect(mockUpdate).not.toHaveBeenCalled();
      expect(result).toEqual([]);
    });

    it('should handle single category update', async () => {
      const updates = [{ id: 'category-1', percentage: 50 }];
      const mockUpdatedCategory = { id: 'category-1', name: 'Food', percentage: 50 };

      const mockUpdate = getMockBudgetCategoryUpdate();
      mockUpdate.mockResolvedValue(mockUpdatedCategory);

      const result = await budgetRepository.updateCategoryPercentages(updates);

      expect(mockUpdate).toHaveBeenCalledTimes(1);
      expect(result).toEqual([mockUpdatedCategory]);
    });
  });
});

