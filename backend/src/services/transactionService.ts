import transactionRepository from '../repositories/transactionRepository';
import accountRepository from '../repositories/accountRepository';
import budgetRepository from '../repositories/budgetRepository';
import { TransactionFilters } from '../types';
import { convertToBaseCurrency } from '../utils/currency';
import logger from '../config/logger';
import prisma from '../config/database';

export class TransactionService {
  async getAll(userId: string, filters?: TransactionFilters) {
    return await transactionRepository.findAll(userId, filters);
  }

  async getById(id: string, userId: string) {
    const transaction = await transactionRepository.findById(id, userId);
    if (!transaction) {
      throw new Error('Transaction not found');
    }
    return transaction;
  }

  async create(userId: string, data: any) {
    // Validate account belongs to user
    const account = await accountRepository.findById(data.accountId, userId);
    if (!account) {
      throw new Error('Account not found');
    }

    const transaction = await transactionRepository.create({
      user: { connect: { id: userId } },
      account: { connect: { id: data.accountId } },
      currency: { connect: { id: data.currencyId } },
      date: new Date(data.date),
      amount: data.amount,
      description: data.description,
      expenseType: data.expenseTypeId ? { connect: { id: data.expenseTypeId } } : undefined,
      transactionType: { connect: { id: data.transactionTypeId } },
      budgetCategory: { connect: { id: data.budgetCategoryId } },
      isReimbursable: data.isReimbursable || false,
      reimbursementId: data.reimbursementId,
      linkedTransaction: data.linkedTransactionId 
        ? { connect: { id: data.linkedTransactionId } }
        : undefined,
      notes: data.notes,
    });

    // Update account balance
    await this.updateAccountBalance(data.accountId, userId);

    // Update budget balance
    await this.updateBudgetBalance(data.budgetCategoryId, userId);

    logger.info(`Transaction created: ${transaction.id}`);

    return transaction;
  }

  async update(id: string, userId: string, data: any) {
    const existing = await transactionRepository.findById(id, userId);
    if (!existing) {
      throw new Error('Transaction not found');
    }

    await transactionRepository.update(id, userId, {
      date: data.date ? new Date(data.date) : undefined,
      amount: data.amount,
      description: data.description,
      expenseType: data.expenseTypeId ? { connect: { id: data.expenseTypeId } } : undefined,
      transactionType: data.transactionTypeId ? { connect: { id: data.transactionTypeId } } : undefined,
      budgetCategory: data.budgetCategoryId ? { connect: { id: data.budgetCategoryId } } : undefined,
      isReimbursable: data.isReimbursable,
      reimbursementId: data.reimbursementId,
      notes: data.notes,
    });

    // Update balances
    await this.updateAccountBalance(existing.accountId, userId);
    await this.updateBudgetBalance(existing.budgetCategoryId, userId);

    logger.info(`Transaction updated: ${id}`);

    return await transactionRepository.findById(id, userId);
  }

  async delete(id: string, userId: string) {
    const transaction = await transactionRepository.findById(id, userId);
    if (!transaction) {
      throw new Error('Transaction not found');
    }

    await transactionRepository.delete(id, userId);

    // Update balances
    await this.updateAccountBalance(transaction.accountId, userId);
    await this.updateBudgetBalance(transaction.budgetCategoryId, userId);

    logger.info(`Transaction deleted: ${id}`);
  }

  private async updateAccountBalance(accountId: string, userId: string) {
    const account = await accountRepository.findById(accountId, userId);
    if (!account) return;

    // Get all transactions for this account
    const transactions = await prisma.transaction.findMany({
      where: { accountId },
      include: { transactionType: true },
    });

    // Get initial balance (stored separately when account was created)
    let initialBalance = (account as any).initialBalance;
    
    // If initialBalance is not set (0 or undefined), try to calculate it
    // This handles accounts created before the initialBalance field was added
    if (!initialBalance || initialBalance === 0) {
      // Calculate transaction sum
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

      // If account has a balance but no initialBalance, calculate it
      // currentBalance = initialBalance + transactionSum
      // So: initialBalance = currentBalance - transactionSum
      if (account.balance !== 0 && transactions.length > 0) {
        initialBalance = account.balance - transactionSum;
        try {
          await prisma.account.update({
            where: { id: accountId },
            data: { initialBalance: initialBalance } as any,
          });
        } catch (error) {
        }
      } else {
        initialBalance = 0;
      }
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

    await accountRepository.updateBalance(accountId, balance);
  }

  private async updateBudgetBalance(categoryId: string, userId: string) {
    const currentYear = new Date().getFullYear();
    const budget = await budgetRepository.findByUserCategoryAndYear(userId, categoryId, currentYear);
    
    if (!budget) return;

    // Calculate total from all transactions for this category this year
    const startDate = new Date(currentYear, 0, 1);
    const endDate = new Date(currentYear, 11, 31, 23, 59, 59);

    const transactions = await prisma.transaction.findMany({
      where: {
        userId,
        budgetCategoryId: categoryId,
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: { transactionType: true, currency: true, expenseType: true },
    });

    let balance = budget.startingBalance;
    for (const tx of transactions) {
      // Exclude inter-account transfers from budget calculations
      const isInterAccountTransfer = tx.expenseType?.name === 'Transferencia Entre Cuentas' || tx.expenseType?.name === 'Inter-Account Transfer';
      if (isInterAccountTransfer) {
        continue;
      }

      // Exclude account transfer in and reimbursements from income calculations
      const isAccountTransferIn = tx.transactionType.name === 'ACCOUNT_TRANSFER_IN';
      const isReimbursement = tx.transactionType.name === 'REIMBURSEMENT';
      if (isAccountTransferIn || isReimbursement) {
        continue;
      }

      // Convert to base currency
      const amountInBase = await convertToBaseCurrency(tx.amount, tx.currency.code);
      
      if (tx.transactionType.name === 'INCOME') {
        balance += amountInBase;
      } else if (tx.transactionType.name === 'EXPENSE' || tx.transactionType.name === 'TRANSFER') {
        balance -= amountInBase;
      }
    }

    await budgetRepository.updateBalance(budget.id, balance);
  }

  async getRecent(userId: string, limit: number = 10) {
    return await transactionRepository.getRecentTransactions(userId, limit);
  }
}

export default new TransactionService();

