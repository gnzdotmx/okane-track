import { PrismaClient } from '@prisma/client';
import logger from './logger';

class DatabaseConnection {
  private static instance: PrismaClient;

  private constructor() {}

  public static getInstance(): PrismaClient {
    if (!DatabaseConnection.instance) {
      DatabaseConnection.instance = new PrismaClient({
        log: process.env.NODE_ENV === 'development' 
          ? ['query', 'info', 'warn', 'error']
          : ['error'],
      });

      DatabaseConnection.instance.$connect()
        .then(() => {
          logger.info('Database connected successfully');
        })
        .catch((error) => {
          logger.error('Database connection failed:', error);
          process.exit(1);
        });
    }

    return DatabaseConnection.instance;
  }

  public static async disconnect(): Promise<void> {
    if (DatabaseConnection.instance) {
      await DatabaseConnection.instance.$disconnect();
      logger.info('Database disconnected');
    }
  }
}

export { DatabaseConnection };
export default DatabaseConnection.getInstance();

