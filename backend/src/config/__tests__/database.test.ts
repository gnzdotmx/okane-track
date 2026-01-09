import { PrismaClient } from '@prisma/client';

const mockConnect = jest.fn();
const mockDisconnect = jest.fn();
const mockLoggerInfo = jest.fn();
const mockLoggerError = jest.fn();

const createMockPrismaClient = () => ({
  $connect: mockConnect,
  $disconnect: mockDisconnect,
});

const MockedPrismaClient = jest.fn().mockImplementation(() => createMockPrismaClient());

jest.mock('@prisma/client', () => ({
  PrismaClient: MockedPrismaClient,
}));

jest.mock('../logger', () => ({
  __esModule: true,
  default: {
    info: mockLoggerInfo,
    error: mockLoggerError,
    warn: jest.fn(),
  },
}));

describe('DatabaseConnection', () => {
  const originalExit = process.exit;
  let mockPrismaClient: any;

  beforeEach(() => {
    jest.clearAllMocks();
    MockedPrismaClient.mockClear();
    mockConnect.mockResolvedValue(undefined);
    mockDisconnect.mockResolvedValue(undefined);
    mockLoggerInfo.mockClear();
    mockLoggerError.mockClear();
    process.exit = jest.fn() as any;
    
    mockPrismaClient = createMockPrismaClient();
    MockedPrismaClient.mockImplementation(() => mockPrismaClient);
  });

  afterEach(() => {
    process.exit = originalExit;
    jest.restoreAllMocks();
  });

  describe('Module Export', () => {
    beforeEach(() => {
      jest.resetModules();
    });

    it('should export a PrismaClient instance', () => {
      const database = require('../database').default;
      expect(database).toBeDefined();
      expect(database).toHaveProperty('$connect');
      expect(database).toHaveProperty('$disconnect');
      expect(typeof database.$connect).toBe('function');
      expect(typeof database.$disconnect).toBe('function');
    });

    it('should call $connect when module is loaded', async () => {
      jest.resetModules();
      require('../database');
      await new Promise((resolve) => setTimeout(resolve, 10));
      expect(mockConnect).toHaveBeenCalled();
    });

    it('should log success message when connection succeeds', async () => {
      jest.resetModules();
      require('../database');
      await new Promise((resolve) => setTimeout(resolve, 10));
      expect(mockLoggerInfo).toHaveBeenCalledWith('Database connected successfully');
    });

    it('should log error and exit process when connection fails', async () => {
      const connectionError = new Error('Connection failed');
      mockConnect.mockRejectedValueOnce(connectionError);

      jest.resetModules();
      require('../database');
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(mockLoggerError).toHaveBeenCalledWith('Database connection failed:', connectionError);
      expect(process.exit).toHaveBeenCalledWith(1);
    });
  });

  describe('PrismaClient Configuration', () => {
    beforeEach(() => {
      jest.clearAllMocks();
      MockedPrismaClient.mockClear();
    });

    it('should configure PrismaClient with correct log levels in development', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      jest.resetModules();
      MockedPrismaClient.mockImplementation(() => createMockPrismaClient());
      require('../database');

      expect(MockedPrismaClient).toHaveBeenCalledWith({
        log: ['query', 'info', 'warn', 'error'],
      });

      process.env.NODE_ENV = originalEnv;
    });

    it('should configure PrismaClient with error log only in production', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      jest.resetModules();
      MockedPrismaClient.mockImplementation(() => createMockPrismaClient());
      require('../database');

      expect(MockedPrismaClient).toHaveBeenCalledWith({
        log: ['error'],
      });

      process.env.NODE_ENV = originalEnv;
    });

    it('should configure PrismaClient with error log only when NODE_ENV is not development', () => {
      const originalEnv = process.env.NODE_ENV;
      delete process.env.NODE_ENV;

      jest.resetModules();
      MockedPrismaClient.mockImplementation(() => createMockPrismaClient());
      require('../database');

      expect(MockedPrismaClient).toHaveBeenCalledWith({
        log: ['error'],
      });

      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('Singleton Pattern', () => {
    beforeEach(() => {
      jest.resetModules();
    });

    it('should return the same instance on multiple imports', () => {
      const instance1 = require('../database').default;
      const instance2 = require('../database').default;
      
      expect(instance1).toBeDefined();
      expect(instance2).toBeDefined();
      expect(instance1).toBe(instance2);
    });

    it('should return the same instance when getInstance() is called multiple times', () => {
      const { DatabaseConnection } = require('../database');
      const instance1 = DatabaseConnection.getInstance();
      const instance2 = DatabaseConnection.getInstance();
      
      expect(instance1).toBeDefined();
      expect(instance2).toBeDefined();
      expect(instance1).toBe(instance2);
    });

    it('should return the same instance from default export and getInstance()', () => {
      const database = require('../database').default;
      const { DatabaseConnection } = require('../database');
      const instance = DatabaseConnection.getInstance();
      
      expect(database).toBe(instance);
    });
  });

  describe('Disconnect Functionality', () => {
    beforeEach(() => {
      jest.resetModules();
      require('../database');
    });

    it('should be able to disconnect the database using the class method', async () => {
      const { DatabaseConnection } = require('../database');
      
      await DatabaseConnection.disconnect();
      
      expect(mockDisconnect).toHaveBeenCalled();
      expect(mockLoggerInfo).toHaveBeenCalledWith('Database disconnected');
    });

    it('should handle disconnect gracefully when called multiple times', async () => {
      const { DatabaseConnection } = require('../database');
      
      await DatabaseConnection.disconnect();
      await DatabaseConnection.disconnect();
      
      expect(mockDisconnect).toHaveBeenCalledTimes(2);
    });

    it('should be able to disconnect using PrismaClient $disconnect directly', async () => {
      const database = require('../database').default;
      await database.$disconnect();
      expect(mockDisconnect).toHaveBeenCalled();
    });

    it('should only create one instance even after disconnect', async () => {
      const { DatabaseConnection } = require('../database');
      const instance1 = DatabaseConnection.getInstance();
      
      await DatabaseConnection.disconnect();
      
      const instance2 = DatabaseConnection.getInstance();
      
      // After disconnect, getInstance should return the same instance
      // (Note: In the actual implementation, disconnect doesn't clear the instance,
      // so this tests that the singleton pattern is maintained)
      expect(instance1).toBe(instance2);
      expect(MockedPrismaClient).toHaveBeenCalledTimes(1);
    });
  });
});
