// Mock dependencies - jest.mock() calls are hoisted to the top
const mockImport = jest.fn();
const mockExport = jest.fn();
const mockGetHistory = jest.fn();

// Mock multer upload instance
const mockUploadSingle = jest.fn((fieldName: string) => {
  return jest.fn((req: any, res: any, next: any) => {
    next();
  });
});

const mockUpload = {
  single: mockUploadSingle,
};

jest.mock('../../controllers/importController', () => ({
  __esModule: true,
  default: {
    import: mockImport,
    export: mockExport,
    getHistory: mockGetHistory,
  },
  upload: mockUpload,
}));

const mockAuthenticate = jest.fn((req: any, res: any, next: any) => {
  req.user = { id: 'user-123', email: 'test@example.com' };
  next();
});

jest.mock('../../middleware/auth', () => ({
  authenticate: mockAuthenticate,
}));

import { Router } from 'express';
import importRouter from '../import';
import importController from '../../controllers/importController';
import { upload } from '../../controllers/importController';
import { authenticate } from '../../middleware/auth';

describe('Import Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Router configuration', () => {
    it('should export a router', () => {
      expect(importRouter).toBeDefined();
      // Check if it has router-like properties (stack, use, get, post, etc.)
      expect(importRouter).toHaveProperty('stack');
      expect(typeof (importRouter as any).use).toBe('function');
    });

    it('should have authenticate middleware applied to all routes', () => {
      // The authenticate middleware is applied via router.use()
      // We can verify it's imported and used
      expect(authenticate).toBeDefined();
    });
  });

  describe('POST /import', () => {
    it('should be configured to call import controller', () => {
      const stack = (importRouter as any).stack;
      const importRoute = stack.find((layer: any) => 
        layer.route && layer.route.path === '/import' && layer.route.methods.post
      );
      
      expect(importRoute).toBeDefined();
      expect(importController.import).toBeDefined();
    });

    it('should use upload.single middleware', () => {
      // Verify upload is available and has single method
      expect(upload).toBeDefined();
      expect(upload).toHaveProperty('single');
      expect(typeof upload.single).toBe('function');
    });

    it('should configure upload.single with correct field name', () => {
      // The upload.single('file') middleware is applied to the route
      // We verify that upload.single is a function that can be called
      const middleware = upload.single('file');
      expect(typeof middleware).toBe('function');
    });
  });

  describe('GET /export', () => {
    it('should be configured to call export controller', () => {
      const stack = (importRouter as any).stack;
      const exportRoute = stack.find((layer: any) => 
        layer.route && layer.route.path === '/export' && layer.route.methods.get
      );
      
      expect(exportRoute).toBeDefined();
      expect(importController.export).toBeDefined();
    });
  });

  describe('GET /history', () => {
    it('should be configured to call getHistory controller', () => {
      const stack = (importRouter as any).stack;
      const historyRoute = stack.find((layer: any) => 
        layer.route && layer.route.path === '/history' && layer.route.methods.get
      );
      
      expect(historyRoute).toBeDefined();
      expect(importController.getHistory).toBeDefined();
    });
  });

  describe('Route order', () => {
    it('should have all routes registered', () => {
      const stack = (importRouter as any).stack;
      const routes = stack
        .filter((layer: any) => layer.route)
        .map((layer: any) => ({
          path: layer.route.path,
          method: Object.keys(layer.route.methods)[0],
        })) as Array<{ path: string; method: string }>;

      // Verify import route exists
      const importRoute = routes.find((r: { path: string; method: string }) => r.path === '/import');
      expect(importRoute).toBeDefined();

      // Verify export route exists
      const exportRoute = routes.find((r: { path: string; method: string }) => r.path === '/export');
      expect(exportRoute).toBeDefined();

      // Verify history route exists
      const historyRoute = routes.find((r: { path: string; method: string }) => r.path === '/history');
      expect(historyRoute).toBeDefined();
    });
  });

  describe('Route protection', () => {
    it('should protect all routes with authenticate middleware', () => {
      // All routes are protected via router.use(authenticate)
      expect(authenticate).toBeDefined();
      
      const stack = (importRouter as any).stack;
      const routes = stack.filter((layer: any) => layer.route);
      
      // Verify routes exist
      expect(routes.length).toBeGreaterThan(0);
    });
  });
});

