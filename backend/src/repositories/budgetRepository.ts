import prisma from '../config/database';
import { Prisma } from '@prisma/client';

export class BudgetRepository {
  async findByUserAndYear(userId: string, year: number) {
    return await prisma.budget.findMany({
      where: {
        userId,
        year,
      },
      include: {
        category: true,
      },
    });
  }

  async findByUserCategoryAndYear(userId: string, categoryId: string, year: number) {
    return await prisma.budget.findUnique({
      where: {
        userId_categoryId_year: {
          userId,
          categoryId,
          year,
        },
      },
      include: {
        category: true,
      },
    });
  }

  async create(data: Prisma.BudgetCreateInput) {
    return await prisma.budget.create({
      data,
      include: {
        category: true,
      },
    });
  }

  async update(id: string, data: Prisma.BudgetUpdateInput) {
    return await prisma.budget.update({
      where: { id },
      data,
      include: {
        category: true,
      },
    });
  }

  async updateBalance(id: string, newBalance: number) {
    return await prisma.budget.update({
      where: { id },
      data: { currentBalance: newBalance },
    });
  }

  async getBudgetCategories() {
    return await prisma.budgetCategory.findMany({
      orderBy: {
        name: 'asc',
      },
    });
  }

  async updateCategoryPercentage(id: string, percentage: number) {
    return await prisma.budgetCategory.update({
      where: { id },
      data: { percentage },
    });
  }

  async updateCategoryPercentages(updates: { id: string; percentage: number }[]) {
    return await Promise.all(
      updates.map((update) =>
        prisma.budgetCategory.update({
          where: { id: update.id },
          data: { percentage: update.percentage },
        })
      )
    );
  }
}

export default new BudgetRepository();

