// Mock dependencies - jest.mock() calls are hoisted to the top
const mockAccountFindMany = jest.fn();
const mockAccountUpdate = jest.fn();
const mockPrismaDisconnect = jest.fn();

jest.mock('../../config/database', () => ({
  __esModule: true,
  default: {
    account: {
      findMany: mockAccountFindMany,
      update: mockAccountUpdate,
    },
    $disconnect: mockPrismaDisconnect,
  },
}));

// Mock console.log to avoid cluttering test output
const mockConsoleLog = jest.spyOn(console, 'log').mockImplementation(() => {});
const mockConsoleError = jest.spyOn(console, 'error').mockImplementation(() => {});

import prisma from '../../config/database';
import { fixInitialBalances } from '../fix-initial-balance';

describe('fixInitialBalances', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockConsoleLog.mockClear();
    mockConsoleError.mockClear();
  });

  afterAll(() => {
    mockConsoleLog.mockRestore();
    mockConsoleError.mockRestore();
  });

  it('should skip accounts with initialBalance already set', async () => {
    const mockAccounts = [
      {
        id: 'account-1',
        name: 'Checking Account',
        balance: 1000,
        initialBalance: 500,
        transactions: [],
      },
    ];

    mockAccountFindMany.mockResolvedValue(mockAccounts);

    await fixInitialBalances();

    expect(mockAccountFindMany).toHaveBeenCalledWith({
      include: {
        transactions: {
          include: {
            transactionType: true,
          },
          orderBy: {
            date: 'asc',
          },
        },
      },
    });
    expect(mockAccountUpdate).not.toHaveBeenCalled();
    expect(mockPrismaDisconnect).toHaveBeenCalled();
    expect(mockConsoleLog).toHaveBeenCalledWith('\n✓ Account: Checking Account - initialBalance already set: 500');
  });

  it('should skip accounts with balance = 0', async () => {
    const mockAccounts = [
      {
        id: 'account-1',
        name: 'Empty Account',
        balance: 0,
        initialBalance: 0,
        transactions: [],
      },
    ];

    mockAccountFindMany.mockResolvedValue(mockAccounts);

    await fixInitialBalances();

    expect(mockAccountUpdate).not.toHaveBeenCalled();
    expect(mockPrismaDisconnect).toHaveBeenCalled();
    expect(mockConsoleLog).toHaveBeenCalledWith('\n✓ Account: Empty Account - initialBalance already set: 0');
  });

  it('should calculate and update initialBalance for account with transactions', async () => {
    const mockAccounts = [
      {
        id: 'account-1',
        name: 'Test Account',
        balance: 1500,
        initialBalance: 0,
        transactions: [
          {
            id: 'tx-1',
            amount: 1000,
            transactionType: {
              name: 'INCOME',
            },
          },
          {
            id: 'tx-2',
            amount: 300,
            transactionType: {
              name: 'EXPENSE',
            },
          },
          {
            id: 'tx-3',
            amount: 200,
            transactionType: {
              name: 'REIMBURSEMENT',
            },
          },
        ],
      },
    ];

    mockAccountFindMany.mockResolvedValue(mockAccounts);
    mockAccountUpdate.mockResolvedValue({});

    await fixInitialBalances();

    // Transaction sum: 1000 (INCOME) + 200 (REIMBURSEMENT) - 300 (EXPENSE) = 900
    // Calculated initial balance: 1500 - 900 = 600
    expect(mockAccountUpdate).toHaveBeenCalledWith({
      where: { id: 'account-1' },
      data: { initialBalance: 600 },
    });
    expect(mockPrismaDisconnect).toHaveBeenCalled();
    expect(mockConsoleLog).toHaveBeenCalledWith('\nAccount: Test Account');
    expect(mockConsoleLog).toHaveBeenCalledWith('   Current balance: 1500');
    expect(mockConsoleLog).toHaveBeenCalledWith('   Transaction sum: 900');
    expect(mockConsoleLog).toHaveBeenCalledWith('   Calculated initial balance: 600');
    expect(mockConsoleLog).toHaveBeenCalledWith('   Updated initialBalance to 600');
  });

  it('should handle TRANSFER transactions correctly', async () => {
    const mockAccounts = [
      {
        id: 'account-1',
        name: 'Test Account',
        balance: 500,
        initialBalance: 0,
        transactions: [
          {
            id: 'tx-1',
            amount: 1000,
            transactionType: {
              name: 'INCOME',
            },
          },
          {
            id: 'tx-2',
            amount: 200,
            transactionType: {
              name: 'TRANSFER',
            },
          },
        ],
      },
    ];

    mockAccountFindMany.mockResolvedValue(mockAccounts);
    mockAccountUpdate.mockResolvedValue({});

    await fixInitialBalances();

    // Transaction sum: 1000 (INCOME) - 200 (TRANSFER) = 800
    // Calculated initial balance: 500 - 800 = -300
    expect(mockAccountUpdate).toHaveBeenCalledWith({
      where: { id: 'account-1' },
      data: { initialBalance: -300 },
    });
  });

  it('should handle account with only income transactions', async () => {
    const mockAccounts = [
      {
        id: 'account-1',
        name: 'Test Account',
        balance: 2000,
        initialBalance: 0,
        transactions: [
          {
            id: 'tx-1',
            amount: 1000,
            transactionType: {
              name: 'INCOME',
            },
          },
          {
            id: 'tx-2',
            amount: 1000,
            transactionType: {
              name: 'REIMBURSEMENT',
            },
          },
        ],
      },
    ];

    mockAccountFindMany.mockResolvedValue(mockAccounts);
    mockAccountUpdate.mockResolvedValue({});

    await fixInitialBalances();

    // Transaction sum: 1000 (INCOME) + 1000 (REIMBURSEMENT) = 2000
    // Calculated initial balance: 2000 - 2000 = 0
    expect(mockAccountUpdate).toHaveBeenCalledWith({
      where: { id: 'account-1' },
      data: { initialBalance: 0 },
    });
  });

  it('should handle account with only expense transactions', async () => {
    const mockAccounts = [
      {
        id: 'account-1',
        name: 'Test Account',
        balance: 500,
        initialBalance: 0,
        transactions: [
          {
            id: 'tx-1',
            amount: 300,
            transactionType: {
              name: 'EXPENSE',
            },
          },
          {
            id: 'tx-2',
            amount: 200,
            transactionType: {
              name: 'TRANSFER',
            },
          },
        ],
      },
    ];

    mockAccountFindMany.mockResolvedValue(mockAccounts);
    mockAccountUpdate.mockResolvedValue({});

    await fixInitialBalances();

    // Transaction sum: -300 (EXPENSE) - 200 (TRANSFER) = -500
    // Calculated initial balance: 500 - (-500) = 1000
    expect(mockAccountUpdate).toHaveBeenCalledWith({
      where: { id: 'account-1' },
      data: { initialBalance: 1000 },
    });
  });

  it('should handle account with no transactions', async () => {
    const mockAccounts = [
      {
        id: 'account-1',
        name: 'Test Account',
        balance: 1000,
        initialBalance: 0,
        transactions: [],
      },
    ];

    mockAccountFindMany.mockResolvedValue(mockAccounts);
    mockAccountUpdate.mockResolvedValue({});

    await fixInitialBalances();

    // Transaction sum: 0
    // Calculated initial balance: 1000 - 0 = 1000
    expect(mockAccountUpdate).toHaveBeenCalledWith({
      where: { id: 'account-1' },
      data: { initialBalance: 1000 },
    });
  });

  it('should handle multiple accounts', async () => {
    const mockAccounts = [
      {
        id: 'account-1',
        name: 'Account 1',
        balance: 1000,
        initialBalance: 0,
        transactions: [
          {
            id: 'tx-1',
            amount: 500,
            transactionType: {
              name: 'INCOME',
            },
          },
        ],
      },
      {
        id: 'account-2',
        name: 'Account 2',
        balance: 2000,
        initialBalance: 100,
        transactions: [],
      },
      {
        id: 'account-3',
        name: 'Account 3',
        balance: 500,
        initialBalance: 0,
        transactions: [
          {
            id: 'tx-2',
            amount: 300,
            transactionType: {
              name: 'EXPENSE',
            },
          },
        ],
      },
    ];

    mockAccountFindMany.mockResolvedValue(mockAccounts);
    mockAccountUpdate.mockResolvedValue({});

    await fixInitialBalances();

    // Account 1: 1000 - 500 = 500
    // Account 2: skipped (initialBalance already set)
    // Account 3: 500 - (-300) = 800
    expect(mockAccountUpdate).toHaveBeenCalledTimes(2);
    expect(mockAccountUpdate).toHaveBeenCalledWith({
      where: { id: 'account-1' },
      data: { initialBalance: 500 },
    });
    expect(mockAccountUpdate).toHaveBeenCalledWith({
      where: { id: 'account-3' },
      data: { initialBalance: 800 },
    });
    expect(mockPrismaDisconnect).toHaveBeenCalled();
  });

  it('should handle errors and not disconnect from Prisma', async () => {
    const error = new Error('Database error');
    mockAccountFindMany.mockRejectedValue(error);

    await expect(fixInitialBalances()).rejects.toThrow();

    // Should NOT disconnect when error occurs (disconnect is only called on success)
    expect(mockPrismaDisconnect).not.toHaveBeenCalled();
  });

  it('should log checking accounts message', async () => {
    mockAccountFindMany.mockResolvedValue([]);

    await fixInitialBalances();

    expect(mockConsoleLog).toHaveBeenCalledWith('Checking accounts...');
    expect(mockConsoleLog).toHaveBeenCalledWith('\nDone!');
  });
});

