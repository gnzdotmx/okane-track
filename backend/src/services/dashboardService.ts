import prisma from '../config/database';
import budgetRepository from '../repositories/budgetRepository';
import accountRepository from '../repositories/accountRepository';
import transactionRepository from '../repositories/transactionRepository';
import { convertToBaseCurrency, getBaseCurrency, updateExchangeRates } from '../utils/currency';
import { DashboardStats } from '../types';

export class DashboardService {
  async getDashboard(userId: string): Promise<DashboardStats> {
    const currentYear = new Date().getFullYear();

    // Get all user data in parallel
    const [budgets, accounts, recentTransactions, baseCurrency] = await Promise.all([
      budgetRepository.findByUserAndYear(userId, currentYear),
      accountRepository.findAllByUser(userId),
      transactionRepository.getRecentTransactions(userId, 5),
      getBaseCurrency(),
    ]);

    if (!baseCurrency) {
      throw new Error('Base currency not configured');
    }

    let totalBalance = 0;
    const balanceByCurrency: { [key: string]: { balance: number; symbol: string } } = {};

    for (const account of accounts) {
      const balanceInBase = await convertToBaseCurrency(
        account.balance,
        account.currency.code
      );
      totalBalance += balanceInBase;

      if (!balanceByCurrency[account.currency.code]) {
        balanceByCurrency[account.currency.code] = {
          balance: 0,
          symbol: account.currency.symbol,
        };
      }
      balanceByCurrency[account.currency.code].balance += account.balance;
    }

    const balanceByCategory = budgets.map((budget) => ({
      categoryName: budget.category.name,
      balance: budget.currentBalance,
      percentage: budget.category.percentage,
      allocated: budget.allocatedAmount,
      starting: budget.startingBalance,
    }));

    const balanceByCurrencyArray = Object.entries(balanceByCurrency).map(
      async ([code, data]) => ({
        currencyCode: code,
        currencySymbol: data.symbol,
        balance: data.balance,
        balanceInBase: await convertToBaseCurrency(data.balance, code),
      })
    );

    // Accounts with balances
    const accountsWithBalances = await Promise.all(
      accounts.map(async (account) => ({
        id: account.id,
        name: account.name,
        type: account.type,
        balance: account.balance,
        balanceInBase: await convertToBaseCurrency(account.balance, account.currency.code),
        currencyCode: account.currency.code,
        currencySymbol: account.currency.symbol,
        isActive: account.isActive,
      }))
    );

    // Monthly stats
    const monthlyStats = await this.getMonthlyStats(userId, currentYear);

    // Calculate total reimbursed for current year
    const totalReimbursed = await this.getTotalReimbursed(userId, currentYear);

    // Calculate spending by expense type for current year
    const spendingByExpenseType = await this.getSpendingByExpenseType(userId, currentYear);

    return {
      totalBalance,
      baseCurrency: {
        code: baseCurrency.code,
        symbol: baseCurrency.symbol,
      },
      balanceByCategory: balanceByCategory.map((cat) => ({
        categoryName: cat.categoryName,
        balance: cat.balance,
        percentage: cat.percentage,
        allocated: cat.allocated,
        starting: cat.starting,
      })),
      balanceByCurrency: await Promise.all(balanceByCurrencyArray),
      accounts: accountsWithBalances,
      recentTransactions,
      monthlyStats,
      totalReimbursed,
      spendingByExpenseType,
    };
  }

  private async getMonthlyStats(userId: string, year: number) {
    const transactions = await transactionRepository.getMonthlyStats(userId, year);

    const monthlyData: { [key: string]: { income: number; expenses: number } } = {};

    // Initialize all months
    for (let month = 0; month < 12; month++) {
      const monthKey = new Date(year, month, 1).toISOString().slice(0, 7);
      monthlyData[monthKey] = { income: 0, expenses: 0 };
    }

    // Aggregate transactions by month
    for (const tx of transactions) {
      const monthKey = tx.date.toISOString().slice(0, 7);
      const amountInBase = await convertToBaseCurrency(tx.amount, tx.currency.code);

      // Exclude account transfers and reimbursements from income calculations
      const isAccountTransferIn = tx.transactionType.name === 'ACCOUNT_TRANSFER_IN';
      const isReimbursement = tx.transactionType.name === 'REIMBURSEMENT';
      if (
        tx.transactionType.name === 'INCOME' &&
        !isAccountTransferIn &&
        !isReimbursement
      ) {
        monthlyData[monthKey].income += amountInBase;
      } else if (
        tx.transactionType.name === 'EXPENSE' ||
        tx.transactionType.name === 'TRANSFER'
      ) {
        // Exclude inter-account transfers from expense calculations
        const isInterAccountTransfer = tx.expenseType?.name === 'Transferencia Entre Cuentas' || tx.expenseType?.name === 'Inter-Account Transfer';
        if (!isInterAccountTransfer) {
          monthlyData[monthKey].expenses += amountInBase;
        }
      }
    }

    return Object.entries(monthlyData).map(([month, data]) => ({
      month,
      income: data.income,
      expenses: data.expenses,
      net: data.income - data.expenses,
    }));
  }

  async getChartData(userId: string, type: 'category' | 'expense' | 'monthly') {
    const currentYear = new Date().getFullYear();

    if (type === 'category') {
      return await this.getCategoryChartData(userId, currentYear);
    } else if (type === 'expense') {
      return await this.getExpenseTypeChartData(userId, currentYear);
    } else if (type === 'monthly') {
      return await this.getMonthlyChartData(userId, currentYear);
    }

    throw new Error('Invalid chart type');
  }

  private async getCategoryChartData(userId: string, year: number) {
    const budgets = await budgetRepository.findByUserAndYear(userId, year);

    return budgets.map((budget) => ({
      label: budget.category.name,
      value: Math.abs(budget.currentBalance),
      percentage: budget.category.percentage,
    }));
  }

  private async getExpenseTypeChartData(userId: string, year: number) {
    const startDate = new Date(year, 0, 1);
    const endDate = new Date(year, 11, 31, 23, 59, 59);

    const transactions = await prisma.transaction.findMany({
      where: {
        userId,
        date: { gte: startDate, lte: endDate },
        transactionType: { name: 'EXPENSE' },
      },
      include: {
        expenseType: true,
        currency: true,
      },
    });

    const expensesByType: { [key: string]: { amount: number; color: string } } = {};

    for (const tx of transactions) {
      if (!tx.expenseType) continue;

      // Exclude inter-account transfers from expense calculations
      if (tx.expenseType.name === 'Transferencia Entre Cuentas' || tx.expenseType.name === 'Inter-Account Transfer') {
        continue;
      }

      const amountInBase = await convertToBaseCurrency(tx.amount, tx.currency.code);

      if (!expensesByType[tx.expenseType.name]) {
        expensesByType[tx.expenseType.name] = {
          amount: 0,
          color: tx.expenseType.color || '#999999',
        };
      }

      expensesByType[tx.expenseType.name].amount += amountInBase;
    }

    return Object.entries(expensesByType)
      .map(([name, data]) => ({
        label: name,
        value: data.amount,
        color: data.color,
      }))
      .sort((a, b) => b.value - a.value);
  }

  private async getMonthlyChartData(userId: string, year: number) {
    return await this.getMonthlyStats(userId, year);
  }

  private async getTotalReimbursed(userId: string, year: number): Promise<number> {
    const startDate = new Date(year, 0, 1);
    const endDate = new Date(year, 11, 31, 23, 59, 59);

    const reimbursements = await prisma.transaction.findMany({
      where: {
        userId,
        date: { gte: startDate, lte: endDate },
        transactionType: { name: 'REIMBURSEMENT' },
      },
      include: {
        currency: true,
      },
    });

    let total = 0;
    for (const tx of reimbursements) {
      const amountInBase = await convertToBaseCurrency(tx.amount, tx.currency.code);
      total += amountInBase;
    }

    return total;
  }

  private async getSpendingByExpenseType(
    userId: string,
    year: number
  ): Promise<{ expenseTypeName: string; amount: number; icon?: string; color?: string }[]> {
    const startDate = new Date(year, 0, 1);
    const endDate = new Date(year, 11, 31, 23, 59, 59);

    const transactions = await prisma.transaction.findMany({
      where: {
        userId,
        date: { gte: startDate, lte: endDate },
        transactionType: { name: 'EXPENSE' },
        expenseType: { isNot: null },
      },
      include: {
        expenseType: true,
        currency: true,
      },
    });

    const spendingByType: {
      [key: string]: { amount: number; icon?: string; color?: string };
    } = {};

    for (const tx of transactions) {
      if (!tx.expenseType) continue;

      // Exclude inter-account transfers from expense calculations
      if (tx.expenseType.name === 'Transferencia Entre Cuentas' || tx.expenseType.name === 'Inter-Account Transfer') {
        continue;
      }

      const amountInBase = await convertToBaseCurrency(tx.amount, tx.currency.code);

      if (!spendingByType[tx.expenseType.name]) {
        spendingByType[tx.expenseType.name] = {
          amount: 0,
          icon: tx.expenseType.icon || undefined,
          color: tx.expenseType.color || undefined,
        };
      }

      spendingByType[tx.expenseType.name].amount += amountInBase;
    }

    return Object.entries(spendingByType)
      .map(([name, data]) => ({
        expenseTypeName: name,
        amount: data.amount,
        icon: data.icon,
        color: data.color,
      }))
      .sort((a, b) => b.amount - a.amount);
  }
}

export default new DashboardService();

