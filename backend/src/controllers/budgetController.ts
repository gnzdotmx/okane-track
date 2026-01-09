import { Response } from 'express';
import budgetRepository from '../repositories/budgetRepository';
import { AuthRequest } from '../types';
import { asyncHandler } from '../middleware/errorHandler';

export class BudgetController {
  getByYear = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.id;
    const year = req.params.year ? parseInt(req.params.year) : new Date().getFullYear();

    const budgets = await budgetRepository.findByUserAndYear(userId, year);

    res.status(200).json({
      success: true,
      data: budgets,
    });
  });

  create = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.id;
    const { categoryId, startingBalance, allocatedAmount, year } = req.body;

    const budget = await budgetRepository.create({
      startingBalance,
      allocatedAmount,
      currentBalance: startingBalance,
      year: year || new Date().getFullYear(),
      user: { connect: { id: userId } },
      category: { connect: { id: categoryId } },
    });

    res.status(201).json({
      success: true,
      message: 'Budget created successfully',
      data: budget,
    });
  });

  update = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const { startingBalance, allocatedAmount } = req.body;

    const budget = await budgetRepository.update(id, {
      startingBalance,
      allocatedAmount,
    });

    res.status(200).json({
      success: true,
      message: 'Budget updated successfully',
      data: budget,
    });
  });

  getCategories = asyncHandler(async (req: AuthRequest, res: Response) => {
    const categories = await budgetRepository.getBudgetCategories();

    res.status(200).json({
      success: true,
      data: categories,
    });
  });

  updateCategoryPercentages = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { percentages } = req.body;

    if (!Array.isArray(percentages) || percentages.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Percentages array is required',
      });
    }

    const allCategories = await budgetRepository.getBudgetCategories();
    const totalPercentage = percentages.reduce((sum: number, p: { percentage: number }) => sum + p.percentage, 0);

    if (Math.abs(totalPercentage - 100) > 0.01) {
      return res.status(400).json({
        success: false,
        message: `Percentages must sum to 100. Current sum: ${totalPercentage.toFixed(2)}%`,
      });
    }

    const categoryMap = new Map(allCategories.map((cat) => [cat.id, cat]));
    const validUpdates = percentages.filter((p: { id: string; percentage: number }) => {
      if (!categoryMap.has(p.id)) {
        return false;
      }
      if (typeof p.percentage !== 'number' || p.percentage < 0 || p.percentage > 100) {
        return false;
      }
      return true;
    });

    if (validUpdates.length !== percentages.length) {
      return res.status(400).json({
        success: false,
        message: 'Invalid category IDs or percentage values',
      });
    }

    const updated = await budgetRepository.updateCategoryPercentages(validUpdates);

    return res.status(200).json({
      success: true,
      message: 'Budget category percentages updated successfully',
      data: updated,
    });
  });
}

export default new BudgetController();

