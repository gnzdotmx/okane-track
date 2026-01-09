import prisma from '../config/database';
import { Transaction, Prisma } from '@prisma/client';
import { TransactionFilters } from '../types';

export class TransactionRepository {
  async findAll(userId: string, filters?: TransactionFilters) {
    const where: Prisma.TransactionWhereInput = {
      userId,
    };

    if (filters) {
      if (filters.startDate || filters.endDate) {
        where.date = {};
        if (filters.startDate) where.date.gte = filters.startDate;
        if (filters.endDate) where.date.lte = filters.endDate;
      }

      if (filters.accountId) where.accountId = filters.accountId;
      if (filters.categoryId) where.budgetCategoryId = filters.categoryId;
      if (filters.transactionTypeId) where.transactionTypeId = filters.transactionTypeId;
      if (filters.expenseTypeId) where.expenseTypeId = filters.expenseTypeId;

      if (filters.minAmount !== undefined || filters.maxAmount !== undefined) {
        where.amount = {};
        if (filters.minAmount !== undefined) where.amount.gte = filters.minAmount;
        if (filters.maxAmount !== undefined) where.amount.lte = filters.maxAmount;
      }

      if (filters.search) {
        where.OR = [
          { description: { contains: filters.search, mode: 'insensitive' } },
          { notes: { contains: filters.search, mode: 'insensitive' } },
        ];
      }
    }

    return await prisma.transaction.findMany({
      where,
      include: {
        account: {
          include: {
            currency: true,
          },
        },
        currency: true,
        expenseType: true,
        transactionType: true,
        budgetCategory: true,
        linkedTransaction: true,
      },
      orderBy: {
        date: 'desc',
      },
    });
  }

  async findById(id: string, userId: string) {
    return await prisma.transaction.findFirst({
      where: { id, userId },
      include: {
        account: {
          include: {
            currency: true,
          },
        },
        currency: true,
        expenseType: true,
        transactionType: true,
        budgetCategory: true,
        linkedTransaction: true,
        reimbursement: true,
      },
    });
  }

  async create(data: Prisma.TransactionCreateInput) {
    return await prisma.transaction.create({
      data,
      include: {
        account: true,
        currency: true,
        expenseType: true,
        transactionType: true,
        budgetCategory: true,
      },
    });
  }

  async createMany(data: Prisma.TransactionCreateManyInput[]) {
    return await prisma.transaction.createMany({
      data,
      skipDuplicates: true,
    });
  }

  async update(id: string, userId: string, data: Prisma.TransactionUpdateInput) {
    return await prisma.transaction.updateMany({
      where: { id, userId },
      data,
    });
  }

  async delete(id: string, userId: string) {
    return await prisma.transaction.deleteMany({
      where: { id, userId },
    });
  }

  async getRecentTransactions(userId: string, limit: number = 10) {
    return await prisma.transaction.findMany({
      where: { userId },
      include: {
        currency: true,
        expenseType: true,
        transactionType: true,
        budgetCategory: true,
      },
      orderBy: {
        date: 'desc',
      },
      take: limit,
    });
  }

  async getMonthlyStats(userId: string, year: number) {
    const startDate = new Date(year, 0, 1);
    const endDate = new Date(year, 11, 31, 23, 59, 59);

    return await prisma.transaction.findMany({
      where: {
        userId,
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        transactionType: true,
        currency: true,
        expenseType: true,
      },
      orderBy: {
        date: 'asc',
      },
    });
  }
}

export default new TransactionRepository();

