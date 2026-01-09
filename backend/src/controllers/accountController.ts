import { Response } from 'express';
import accountRepository from '../repositories/accountRepository';
import { AuthRequest } from '../types';
import { asyncHandler } from '../middleware/errorHandler';
import prisma from '../config/database';

export class AccountController {
  getAll = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.id;

    const accounts = await accountRepository.findAllByUser(userId);

    res.status(200).json({
      success: true,
      data: accounts,
    });
  });

  getById = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.id;
    const { id } = req.params;

    const account = await accountRepository.findById(id, userId);

    if (!account) {
      res.status(404).json({
        success: false,
        message: 'Account not found',
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: account,
    });
  });

  create = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.id;
    const { name, type, currencyId, balance } = req.body;

    const initialBalance = balance || 0;
    const account = await accountRepository.create({
      name,
      type,
      balance: initialBalance,
      initialBalance: initialBalance,
      user: { connect: { id: userId } },
      currency: { connect: { id: currencyId } },
    });

    res.status(201).json({
      success: true,
      message: 'Account created successfully',
      data: account,
    });
  });

  update = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.id;
    const { id } = req.params;
    const { name, type, isActive } = req.body;

    await accountRepository.update(id, userId, {
      name,
      type,
      isActive,
    });

    const account = await accountRepository.findById(id, userId);

    res.status(200).json({
      success: true,
      message: 'Account updated successfully',
      data: account,
    });
  });

  delete = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.id;
    const { id } = req.params;

    await accountRepository.delete(id, userId);

    res.status(200).json({
      success: true,
      message: 'Account deleted successfully',
    });
  });

  getCurrencies = asyncHandler(async (req: AuthRequest, res: Response) => {
    const currencies = await accountRepository.getCurrencies();

    res.status(200).json({
      success: true,
      data: currencies,
    });
  });

  getExpenseTypes = asyncHandler(async (req: AuthRequest, res: Response) => {
    const expenseTypes = await accountRepository.getExpenseTypes();

    res.status(200).json({
      success: true,
      data: expenseTypes,
    });
  });

  getTransactionTypes = asyncHandler(async (req: AuthRequest, res: Response) => {
    const transactionTypes = await accountRepository.getTransactionTypes();

    res.status(200).json({
      success: true,
      data: transactionTypes,
    });
  });

  updateExchangeRates = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { updateExchangeRates } = await import('../utils/currency');
    
    try {
      await updateExchangeRates();
      
      const currencies = await accountRepository.getCurrencies();
      
      res.status(200).json({
        success: true,
        message: 'Exchange rates updated successfully',
        data: currencies,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to update exchange rates',
      });
    }
  });

  recalculateBalance = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.id;
    const { id } = req.params;
    const { initialBalance: providedInitialBalance } = req.body;

    const account = await accountRepository.findById(id, userId);
    if (!account) {
      res.status(404).json({
        success: false,
        message: 'Account not found',
      });
      return;
    }

    const transactions = await prisma.transaction.findMany({
      where: { accountId: id },
      include: { transactionType: true },
    });

    let initialBalance = providedInitialBalance;
    
    if (!initialBalance) {
      let transactionSum = 0;
      for (const tx of transactions) {
        if (
          tx.transactionType.name === 'INCOME' ||
          tx.transactionType.name === 'REIMBURSEMENT' ||
          tx.transactionType.name === 'ACCOUNT_TRANSFER_IN'
        ) {
          transactionSum += tx.amount;
        } else if (tx.transactionType.name === 'EXPENSE' || tx.transactionType.name === 'TRANSFER') {
          transactionSum -= tx.amount;
        }
      }
      
      initialBalance = account.balance - transactionSum;
    }

    try {
      await prisma.account.update({
        where: { id },
        data: { initialBalance: initialBalance } as any,
      });
    } catch (error) {
    }

    let balance = initialBalance;
    for (const tx of transactions) {
      if (
        tx.transactionType.name === 'INCOME' ||
        tx.transactionType.name === 'REIMBURSEMENT' ||
        tx.transactionType.name === 'ACCOUNT_TRANSFER_IN'
      ) {
        balance += tx.amount;
      } else if (tx.transactionType.name === 'EXPENSE' || tx.transactionType.name === 'TRANSFER') {
        balance -= tx.amount;
      }
    }

    await accountRepository.updateBalance(id, balance);

    const updatedAccount = await accountRepository.findById(id, userId);

    res.status(200).json({
      success: true,
      message: 'Balance recalculated successfully',
      data: {
        account: updatedAccount,
        initialBalance: initialBalance,
        calculatedBalance: balance,
        transactionCount: transactions.length,
      },
    });
  });
}

export default new AccountController();

