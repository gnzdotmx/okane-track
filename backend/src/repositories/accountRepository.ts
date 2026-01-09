import prisma from '../config/database';
import { Prisma } from '@prisma/client';

export class AccountRepository {
  async findAllByUser(userId: string) {
    return await prisma.account.findMany({
      where: { userId },
      include: {
        currency: true,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });
  }

  async findById(id: string, userId: string) {
    return await prisma.account.findFirst({
      where: { id, userId },
      include: {
        currency: true,
        transactions: {
          take: 10,
          orderBy: {
            date: 'desc',
          },
        },
      },
    });
  }

  async create(data: Prisma.AccountCreateInput) {
    return await prisma.account.create({
      data,
      include: {
        currency: true,
      },
    });
  }

  async update(id: string, userId: string, data: Prisma.AccountUpdateInput) {
    return await prisma.account.updateMany({
      where: { id, userId },
      data,
    });
  }

  async updateBalance(id: string, newBalance: number) {
    return await prisma.account.update({
      where: { id },
      data: { balance: newBalance },
    });
  }

  async delete(id: string, userId: string) {
    return await prisma.account.deleteMany({
      where: { id, userId },
    });
  }

  async getCurrencies() {
    return await prisma.currency.findMany({
      orderBy: {
        code: 'asc',
      },
    });
  }

  async getExpenseTypes() {
    return await prisma.expenseType.findMany({
      orderBy: {
        name: 'asc',
      },
    });
  }

  async getTransactionTypes() {
    return await prisma.transactionType.findMany({
      orderBy: {
        name: 'asc',
      },
    });
  }
}

export default new AccountRepository();

