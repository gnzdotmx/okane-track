import { Response } from 'express';
import transactionService from '../services/transactionService';
import { AuthRequest } from '../types';
import { asyncHandler } from '../middleware/errorHandler';

export class TransactionController {
  getAll = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.id;
    const filters = {
      startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
      endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined,
      accountId: req.query.accountId as string,
      categoryId: req.query.categoryId as string,
      transactionTypeId: req.query.transactionTypeId as string,
      expenseTypeId: req.query.expenseTypeId as string,
      minAmount: req.query.minAmount ? parseFloat(req.query.minAmount as string) : undefined,
      maxAmount: req.query.maxAmount ? parseFloat(req.query.maxAmount as string) : undefined,
      search: req.query.search as string,
    };

    const transactions = await transactionService.getAll(userId, filters);

    res.status(200).json({
      success: true,
      count: transactions.length,
      data: transactions,
    });
  });

  getById = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.id;
    const { id } = req.params;

    const transaction = await transactionService.getById(id, userId);

    res.status(200).json({
      success: true,
      data: transaction,
    });
  });

  create = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.id;

    const transaction = await transactionService.create(userId, req.body);

    res.status(201).json({
      success: true,
      message: 'Transaction created successfully',
      data: transaction,
    });
  });

  update = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.id;
    const { id } = req.params;

    const transaction = await transactionService.update(id, userId, req.body);

    res.status(200).json({
      success: true,
      message: 'Transaction updated successfully',
      data: transaction,
    });
  });

  delete = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.id;
    const { id } = req.params;

    await transactionService.delete(id, userId);

    res.status(200).json({
      success: true,
      message: 'Transaction deleted successfully',
    });
  });

  getRecent = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.id;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;

    const transactions = await transactionService.getRecent(userId, limit);

    res.status(200).json({
      success: true,
      data: transactions,
    });
  });
}

export default new TransactionController();

