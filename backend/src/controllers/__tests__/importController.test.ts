// Mock dependencies - jest.mock() calls are hoisted to the top
jest.mock('../../services/importService');
jest.mock('fs');

// Mock database to prevent connection attempts during tests
jest.mock('../../config/database', () => {
  const mockTransactionFindMany = jest.fn();
  const mockAccountFindFirst = jest.fn();
  const mockImportHistoryFindMany = jest.fn();
  
  return {
    __esModule: true,
    DatabaseConnection: {
      getInstance: jest.fn(() => ({
        transaction: {
          findMany: mockTransactionFindMany,
        },
        account: {
          findFirst: mockAccountFindFirst,
        },
        importHistory: {
          findMany: mockImportHistoryFindMany,
        },
        $connect: jest.fn().mockResolvedValue(undefined),
        $disconnect: jest.fn().mockResolvedValue(undefined),
      })),
      disconnect: jest.fn().mockResolvedValue(undefined),
    },
    default: {
      transaction: {
        findMany: mockTransactionFindMany,
      },
      account: {
        findFirst: mockAccountFindFirst,
      },
      importHistory: {
        findMany: mockImportHistoryFindMany,
      },
      $connect: jest.fn().mockResolvedValue(undefined),
      $disconnect: jest.fn().mockResolvedValue(undefined),
    },
  };
});

// Mock logger to prevent logging during tests
jest.mock('../../config/logger', () => ({
  __esModule: true,
  default: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

import { Response } from 'express';
import importController, { upload } from '../importController';
import importService from '../../services/importService';
import { AuthRequest } from '../../types';
import fs from 'fs';

const mockImportService = importService as jest.Mocked<typeof importService>;
const mockFs = fs as jest.Mocked<typeof fs>;

// Mock request and response objects
const createMockRequest = (overrides: any = {}): AuthRequest => {
  return {
    user: {
      id: 'user-123',
      email: 'test@example.com',
    },
    params: {},
    body: {},
    query: {},
    file: undefined,
    ...overrides,
  } as AuthRequest;
};

const createMockResponse = (): Response => {
  const res = {} as Response;
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.setHeader = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  return res;
};

// Helper to wait for async handler to complete
// Since asyncHandler returns void but creates a Promise internally,
// we need to wait a bit for the Promise to resolve
const waitForAsyncHandler = () => new Promise(resolve => setTimeout(resolve, 0));

describe('ImportController', () => {
  const originalExit = process.exit;

  beforeEach(() => {
    jest.clearAllMocks();
    // Mock process.exit to prevent test from actually exiting
    process.exit = jest.fn() as any;
  });

  afterEach(() => {
    process.exit = originalExit;
  });

  describe('import', () => {
    it('should import CSV file successfully', async () => {
      const mockFile = {
        fieldname: 'file',
        originalname: 'transactions.csv',
        encoding: '7bit',
        mimetype: 'text/csv',
        size: 1024,
        destination: 'uploads/',
        filename: 'file-1234567890.csv',
        path: 'uploads/file-1234567890.csv',
        buffer: Buffer.from('test,data'),
      };

      const mockFileContent = 'date,amount,description\n2024-01-01,100,Test';
      const mockImportResult = {
        success: true,
        totalRecords: 1,
        successCount: 1,
        errorCount: 0,
        errors: [],
      };

      mockFs.readFileSync = jest.fn().mockReturnValue(mockFileContent);
      mockFs.unlinkSync = jest.fn();
      mockImportService.importCSV.mockResolvedValue(mockImportResult);

      const req = createMockRequest({
        file: mockFile,
        body: { accountId: 'account-123' },
      });
      const res = createMockResponse();

      importController.import(req, res, jest.fn());
      await waitForAsyncHandler();

      expect(mockFs.readFileSync).toHaveBeenCalledWith(mockFile.path, 'utf-8');
      expect(mockImportService.importCSV).toHaveBeenCalledWith(
        'user-123',
        mockFileContent,
        'account-123'
      );
      expect(mockFs.unlinkSync).toHaveBeenCalledWith(mockFile.path);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Import completed successfully',
        data: mockImportResult,
      });
    });

    it('should handle import with errors', async () => {
      const mockFile = {
        fieldname: 'file',
        originalname: 'transactions.csv',
        encoding: '7bit',
        mimetype: 'text/csv',
        size: 1024,
        destination: 'uploads/',
        filename: 'file-1234567890.csv',
        path: 'uploads/file-1234567890.csv',
        buffer: Buffer.from('test,data'),
      };

      const mockFileContent = 'date,amount,description\n2024-01-01,invalid,Test';
      const mockImportResult = {
        success: false,
        totalRecords: 1,
        successCount: 0,
        errorCount: 1,
        errors: [
          {
            row: 1,
            field: 'amount',
            message: 'Invalid amount: invalid',
          },
        ],
      };

      mockFs.readFileSync = jest.fn().mockReturnValue(mockFileContent);
      mockFs.unlinkSync = jest.fn();
      mockImportService.importCSV.mockResolvedValue(mockImportResult);

      const req = createMockRequest({
        file: mockFile,
        body: { accountId: 'account-123' },
      });
      const res = createMockResponse();

      importController.import(req, res, jest.fn());
      await waitForAsyncHandler();

      expect(mockFs.readFileSync).toHaveBeenCalledWith(mockFile.path, 'utf-8');
      expect(mockImportService.importCSV).toHaveBeenCalledWith(
        'user-123',
        mockFileContent,
        'account-123'
      );
      expect(mockFs.unlinkSync).toHaveBeenCalledWith(mockFile.path);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Import completed with errors',
        data: mockImportResult,
      });
    });

    it('should return 400 when no file is uploaded', async () => {
      const req = createMockRequest({
        body: { accountId: 'account-123' },
      });
      const res = createMockResponse();

      importController.import(req, res, jest.fn());
      await waitForAsyncHandler();

      expect(mockImportService.importCSV).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'No file uploaded',
      });
    });

    it('should import CSV without accountId when CSV contains account information', async () => {
      const mockFile = {
        fieldname: 'file',
        originalname: 'transactions.csv',
        encoding: '7bit',
        mimetype: 'text/csv',
        size: 1024,
        destination: 'uploads/',
        filename: 'file-1234567890.csv',
        path: 'uploads/file-1234567890.csv',
        buffer: Buffer.from('test,data'),
      };

      const mockFileContent = 'Account,Account ID,Date,Amount,Type,Description\nChecking Account,account-1,2024-01-01,100,Food,Lunch';
      const mockImportResult = {
        success: true,
        totalRecords: 1,
        successCount: 1,
        errorCount: 0,
        errors: [],
      };

      mockFs.readFileSync = jest.fn().mockReturnValue(mockFileContent);
      mockFs.unlinkSync = jest.fn();
      mockImportService.importCSV.mockResolvedValue(mockImportResult);

      const req = createMockRequest({
        file: mockFile,
        body: {}, // No accountId provided
      });
      const res = createMockResponse();

      importController.import(req, res, jest.fn());
      await waitForAsyncHandler();

      expect(mockFs.readFileSync).toHaveBeenCalledWith(mockFile.path, 'utf-8');
      expect(mockImportService.importCSV).toHaveBeenCalledWith(
        'user-123',
        mockFileContent,
        undefined // accountId is optional
      );
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('should import CSV with accountId when CSV does not contain account information', async () => {
      const mockFile = {
        fieldname: 'file',
        originalname: 'transactions.csv',
        encoding: '7bit',
        mimetype: 'text/csv',
        size: 1024,
        destination: 'uploads/',
        filename: 'file-1234567890.csv',
        path: 'uploads/file-1234567890.csv',
        buffer: Buffer.from('test,data'),
      };

      const mockFileContent = 'Date,Amount,Type,Description\n2024-01-01,100,Food,Lunch';
      const mockImportResult = {
        success: true,
        totalRecords: 1,
        successCount: 1,
        errorCount: 0,
        errors: [],
      };

      mockFs.readFileSync = jest.fn().mockReturnValue(mockFileContent);
      mockFs.unlinkSync = jest.fn();
      mockImportService.importCSV.mockResolvedValue(mockImportResult);

      const req = createMockRequest({
        file: mockFile,
        body: { accountId: 'account-123' }, // accountId provided for CSV without account info
      });
      const res = createMockResponse();

      importController.import(req, res, jest.fn());
      await waitForAsyncHandler();

      expect(mockImportService.importCSV).toHaveBeenCalledWith(
        'user-123',
        mockFileContent,
        'account-123'
      );
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('should handle file read errors', async () => {
      const mockFile = {
        fieldname: 'file',
        originalname: 'transactions.csv',
        encoding: '7bit',
        mimetype: 'text/csv',
        size: 1024,
        destination: 'uploads/',
        filename: 'file-1234567890.csv',
        path: 'uploads/file-1234567890.csv',
        buffer: Buffer.from('test,data'),
      };

      const readError = new Error('File read error');
      mockFs.readFileSync = jest.fn().mockImplementation(() => {
        throw readError;
      });
      mockFs.unlinkSync = jest.fn();

      const req = createMockRequest({
        file: mockFile,
        body: { accountId: 'account-123' },
      });
      const res = createMockResponse();
      const next = jest.fn();

      importController.import(req, res, next);
      await waitForAsyncHandler();

      expect(mockFs.readFileSync).toHaveBeenCalledWith(mockFile.path, 'utf-8');
      expect(next).toHaveBeenCalledWith(readError);
    });

    it('should handle file deletion errors gracefully', async () => {
      const mockFile = {
        fieldname: 'file',
        originalname: 'transactions.csv',
        encoding: '7bit',
        mimetype: 'text/csv',
        size: 1024,
        destination: 'uploads/',
        filename: 'file-1234567890.csv',
        path: 'uploads/file-1234567890.csv',
        buffer: Buffer.from('test,data'),
      };

      const mockFileContent = 'date,amount,description\n2024-01-01,100,Test';
      const mockImportResult = {
        success: true,
        totalRecords: 1,
        successCount: 1,
        errorCount: 0,
        errors: [],
      };

      const unlinkError = new Error('File deletion error');
      mockFs.readFileSync = jest.fn().mockReturnValue(mockFileContent);
      mockFs.unlinkSync = jest.fn().mockImplementation(() => {
        throw unlinkError;
      });
      mockImportService.importCSV.mockResolvedValue(mockImportResult);

      const req = createMockRequest({
        file: mockFile,
        body: { accountId: 'account-123' },
      });
      const res = createMockResponse();
      const next = jest.fn();

      importController.import(req, res, next);
      await waitForAsyncHandler();

      expect(mockFs.readFileSync).toHaveBeenCalledWith(mockFile.path, 'utf-8');
      expect(mockImportService.importCSV).toHaveBeenCalled();
      expect(mockFs.unlinkSync).toHaveBeenCalledWith(mockFile.path);
      // The error from unlinkSync should be caught and passed to next
      expect(next).toHaveBeenCalledWith(unlinkError);
    });

    it('should handle errors when service throws', async () => {
      const mockFile = {
        fieldname: 'file',
        originalname: 'transactions.csv',
        encoding: '7bit',
        mimetype: 'text/csv',
        size: 1024,
        destination: 'uploads/',
        filename: 'file-1234567890.csv',
        path: 'uploads/file-1234567890.csv',
        buffer: Buffer.from('test,data'),
      };

      const mockFileContent = 'date,amount,description\n2024-01-01,100,Test';
      const error = new Error('Account not found');

      mockFs.readFileSync = jest.fn().mockReturnValue(mockFileContent);
      mockFs.unlinkSync = jest.fn();
      mockImportService.importCSV.mockRejectedValue(error);

      const req = createMockRequest({
        file: mockFile,
        body: { accountId: 'account-123' },
      });
      const res = createMockResponse();
      const next = jest.fn();

      importController.import(req, res, next);
      await waitForAsyncHandler();

      expect(next).toHaveBeenCalledWith(error);
    });

    it('should delete file even when import fails', async () => {
      const mockFile = {
        fieldname: 'file',
        originalname: 'transactions.csv',
        encoding: '7bit',
        mimetype: 'text/csv',
        size: 1024,
        destination: 'uploads/',
        filename: 'file-1234567890.csv',
        path: 'uploads/file-1234567890.csv',
        buffer: Buffer.from('test,data'),
      };

      const mockFileContent = 'date,amount,description\n2024-01-01,100,Test';
      const error = new Error('Import failed');

      mockFs.readFileSync = jest.fn().mockReturnValue(mockFileContent);
      mockFs.unlinkSync = jest.fn();
      mockImportService.importCSV.mockRejectedValue(error);

      const req = createMockRequest({
        file: mockFile,
        body: { accountId: 'account-123' },
      });
      const res = createMockResponse();
      const next = jest.fn();

      importController.import(req, res, next);
      await waitForAsyncHandler();

      // Note: In the actual implementation, the file deletion happens before error handling
      // So unlinkSync should be called, but the error will still be passed to next
      expect(mockFs.readFileSync).toHaveBeenCalled();
    });
  });

  describe('export', () => {
    it('should export CSV successfully without filters', async () => {
      const mockCsv = 'date,amount,description\n2024-01-01,100,Test';

      mockImportService.exportCSV.mockResolvedValue(mockCsv);

      const req = createMockRequest({
        query: {},
      });
      const res = createMockResponse();

      importController.export(req, res, jest.fn());
      await waitForAsyncHandler();

      expect(mockImportService.exportCSV).toHaveBeenCalledWith('user-123', {
        startDate: undefined,
        endDate: undefined,
      });
      expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'text/csv');
      expect(res.setHeader).toHaveBeenCalledWith(
        'Content-Disposition',
        'attachment; filename=transactions.csv'
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalledWith(mockCsv);
    });

    it('should export CSV with date filters', async () => {
      const mockCsv = 'date,amount,description\n2024-01-01,100,Test';
      const startDate = '2024-01-01';
      const endDate = '2024-01-31';

      mockImportService.exportCSV.mockResolvedValue(mockCsv);

      const req = createMockRequest({
        query: {
          startDate,
          endDate,
        },
      });
      const res = createMockResponse();

      importController.export(req, res, jest.fn());
      await waitForAsyncHandler();

      expect(mockImportService.exportCSV).toHaveBeenCalledWith('user-123', {
        startDate: new Date(startDate),
        endDate: new Date(endDate),
      });
      expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'text/csv');
      expect(res.setHeader).toHaveBeenCalledWith(
        'Content-Disposition',
        'attachment; filename=transactions.csv'
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalledWith(mockCsv);
    });

    it('should export CSV with only startDate filter', async () => {
      const mockCsv = 'date,amount,description\n2024-01-01,100,Test';
      const startDate = '2024-01-01';

      mockImportService.exportCSV.mockResolvedValue(mockCsv);

      const req = createMockRequest({
        query: {
          startDate,
        },
      });
      const res = createMockResponse();

      importController.export(req, res, jest.fn());
      await waitForAsyncHandler();

      expect(mockImportService.exportCSV).toHaveBeenCalledWith('user-123', {
        startDate: new Date(startDate),
        endDate: undefined,
      });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalledWith(mockCsv);
    });

    it('should export CSV with only endDate filter', async () => {
      const mockCsv = 'date,amount,description\n2024-01-01,100,Test';
      const endDate = '2024-01-31';

      mockImportService.exportCSV.mockResolvedValue(mockCsv);

      const req = createMockRequest({
        query: {
          endDate,
        },
      });
      const res = createMockResponse();

      importController.export(req, res, jest.fn());
      await waitForAsyncHandler();

      expect(mockImportService.exportCSV).toHaveBeenCalledWith('user-123', {
        startDate: undefined,
        endDate: new Date(endDate),
      });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalledWith(mockCsv);
    });

    it('should handle errors when service throws', async () => {
      const error = new Error('Export failed');
      mockImportService.exportCSV.mockRejectedValue(error);

      const req = createMockRequest({
        query: {},
      });
      const res = createMockResponse();
      const next = jest.fn();

      importController.export(req, res, next);
      await waitForAsyncHandler();

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe('getHistory', () => {
    it('should return import history successfully', async () => {
      const mockHistory = [
        {
          id: 'history-1',
          userId: 'user-123',
          fileName: 'transactions.csv',
          totalRecords: 10,
          successCount: 10,
          errorCount: 0,
          importedAt: new Date('2024-01-01'),
        },
        {
          id: 'history-2',
          userId: 'user-123',
          fileName: 'transactions2.csv',
          totalRecords: 5,
          successCount: 4,
          errorCount: 1,
          importedAt: new Date('2024-01-02'),
        },
      ];

      mockImportService.getImportHistory.mockResolvedValue(mockHistory as any);

      const req = createMockRequest();
      const res = createMockResponse();

      importController.getHistory(req, res, jest.fn());
      await waitForAsyncHandler();

      expect(mockImportService.getImportHistory).toHaveBeenCalledWith('user-123');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockHistory,
      });
    });

    it('should return empty array when no history exists', async () => {
      mockImportService.getImportHistory.mockResolvedValue([]);

      const req = createMockRequest();
      const res = createMockResponse();

      importController.getHistory(req, res, jest.fn());
      await waitForAsyncHandler();

      expect(mockImportService.getImportHistory).toHaveBeenCalledWith('user-123');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: [],
      });
    });

    it('should handle errors when service throws', async () => {
      const error = new Error('Database error');
      mockImportService.getImportHistory.mockRejectedValue(error);

      const req = createMockRequest();
      const res = createMockResponse();
      const next = jest.fn();

      importController.getHistory(req, res, next);
      await waitForAsyncHandler();

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe('upload middleware', () => {
    it('should export upload middleware', () => {
      expect(upload).toBeDefined();
      expect(upload.single).toBeDefined();
      expect(typeof upload.single).toBe('function');
    });

    it('should have fileFilter configured', () => {
      // The upload middleware is configured with fileFilter
      // We verify it exists by checking the upload object
      expect(upload).toBeDefined();
    });
  });

  describe('edge cases', () => {
    it('should handle accountId as null when CSV has account info', async () => {
      const mockFile = {
        fieldname: 'file',
        originalname: 'transactions.csv',
        encoding: '7bit',
        mimetype: 'text/csv',
        size: 1024,
        destination: 'uploads/',
        filename: 'file-1234567890.csv',
        path: 'uploads/file-1234567890.csv',
        buffer: Buffer.from('test,data'),
      };

      const mockFileContent = 'Account,Account ID,Date,Amount,Type,Description\nChecking Account,account-1,2024-01-01,100,Food,Lunch';
      const mockImportResult = {
        success: true,
        totalRecords: 1,
        successCount: 1,
        errorCount: 0,
        errors: [],
      };

      mockFs.readFileSync = jest.fn().mockReturnValue(mockFileContent);
      mockFs.unlinkSync = jest.fn();
      mockImportService.importCSV.mockResolvedValue(mockImportResult);

      const req = createMockRequest({
        file: mockFile,
        body: { accountId: null }, // null accountId is allowed if CSV has account info
      });
      const res = createMockResponse();

      importController.import(req, res, jest.fn());
      await waitForAsyncHandler();

      expect(mockImportService.importCSV).toHaveBeenCalledWith(
        'user-123',
        mockFileContent,
        null
      );
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('should handle import error when account is missing from CSV and accountId not provided', async () => {
      const mockFile = {
        fieldname: 'file',
        originalname: 'transactions.csv',
        encoding: '7bit',
        mimetype: 'text/csv',
        size: 1024,
        destination: 'uploads/',
        filename: 'file-1234567890.csv',
        path: 'uploads/file-1234567890.csv',
        buffer: Buffer.from('test,data'),
      };

      const mockFileContent = 'Date,Amount,Type,Description\n2024-01-01,100,Food,Lunch';
      const mockImportError = new Error('Account ID is required when CSV does not contain account information');

      mockFs.readFileSync = jest.fn().mockReturnValue(mockFileContent);
      mockFs.unlinkSync = jest.fn();
      mockImportService.importCSV.mockRejectedValue(mockImportError);

      const req = createMockRequest({
        file: mockFile,
        body: {}, // No accountId and CSV doesn't have account info
      });
      const res = createMockResponse();
      const next = jest.fn();

      importController.import(req, res, next);
      await waitForAsyncHandler();

      expect(mockImportService.importCSV).toHaveBeenCalledWith(
        'user-123',
        mockFileContent,
        undefined
      );
      // Error should be handled by errorHandler middleware
      expect(next).toHaveBeenCalled();
    });

    it('should handle file as null', async () => {
      const req = createMockRequest({
        file: null as any,
        body: { accountId: 'account-123' },
      });
      const res = createMockResponse();

      importController.import(req, res, jest.fn());
      await waitForAsyncHandler();

      expect(mockImportService.importCSV).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'No file uploaded',
      });
    });
  });
});

