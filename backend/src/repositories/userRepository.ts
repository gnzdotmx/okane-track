import prisma from '../config/database';
import { User, Prisma } from '@prisma/client';

type UserWithAccounts = Prisma.UserGetPayload<{
  include: { accounts: { include: { currency: true } } };
}>;

export class UserRepository {
  async findByEmail(email: string): Promise<User | null> {
    return await prisma.user.findUnique({
      where: { email },
    });
  }

  async findById(id: string): Promise<UserWithAccounts | null> {
    return await prisma.user.findUnique({
      where: { id },
      include: {
        accounts: {
          include: {
            currency: true,
          },
        },
      },
    });
  }

  async create(data: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
  }): Promise<User> {
    return await prisma.user.create({
      data,
    });
  }

  async update(id: string, data: Partial<User>): Promise<User> {
    return await prisma.user.update({
      where: { id },
      data,
    });
  }

  async delete(id: string): Promise<User> {
    return await prisma.user.delete({
      where: { id },
    });
  }
}

export default new UserRepository();

