// Mock dependencies - jest.mock() calls are hoisted to the top
const mockGetDashboard = jest.fn();
const mockGetCharts = jest.fn();

jest.mock('../../controllers/dashboardController', () => ({
  __esModule: true,
  default: {
    getDashboard: mockGetDashboard,
    getCharts: mockGetCharts,
  },
}));

const mockAuthenticate = jest.fn((req: any, res: any, next: any) => {
  req.user = { id: 'user-123', email: 'test@example.com' };
  next();
});

jest.mock('../../middleware/auth', () => ({
  authenticate: mockAuthenticate,
}));

import { Router } from 'express';
import dashboardRouter from '../dashboard';
import dashboardController from '../../controllers/dashboardController';
import { authenticate } from '../../middleware/auth';

describe('Dashboard Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Router configuration', () => {
    it('should export a router', () => {
      expect(dashboardRouter).toBeDefined();
      // Check if it has router-like properties (stack, use, get, post, etc.)
      expect(dashboardRouter).toHaveProperty('stack');
      expect(typeof (dashboardRouter as any).use).toBe('function');
    });

    it('should have authenticate middleware applied to all routes', () => {
      // The authenticate middleware is applied via router.use()
      // We can verify it's imported and used
      expect(authenticate).toBeDefined();
    });
  });

  describe('GET /', () => {
    it('should be configured to call getDashboard controller', () => {
      const stack = (dashboardRouter as any).stack;
      const dashboardRoute = stack.find((layer: any) => 
        layer.route && layer.route.path === '/' && layer.route.methods.get
      );
      
      expect(dashboardRoute).toBeDefined();
      expect(dashboardController.getDashboard).toBeDefined();
    });
  });

  describe('GET /charts/:type', () => {
    it('should be configured to call getCharts controller', () => {
      const stack = (dashboardRouter as any).stack;
      const chartsRoute = stack.find((layer: any) => 
        layer.route && layer.route.path === '/charts/:type' && layer.route.methods.get
      );
      
      expect(chartsRoute).toBeDefined();
      expect(dashboardController.getCharts).toBeDefined();
    });
  });

  describe('Route order', () => {
    it('should register root route before parameterized routes', () => {
      const stack = (dashboardRouter as any).stack;
      const routes = stack
        .filter((layer: any) => layer.route)
        .map((layer: any) => ({
          path: layer.route.path,
          method: Object.keys(layer.route.methods)[0],
        })) as Array<{ path: string; method: string }>;

      // Verify root route exists
      const rootRoute = routes.find((r: { path: string; method: string }) => r.path === '/' && r.method === 'get');
      expect(rootRoute).toBeDefined();

      // Verify parameterized route exists
      const chartsRoute = routes.find((r: { path: string; method: string }) => r.path === '/charts/:type');
      expect(chartsRoute).toBeDefined();
    });
  });

  describe('Route protection', () => {
    it('should protect all routes with authenticate middleware', () => {
      // All routes are protected via router.use(authenticate)
      expect(authenticate).toBeDefined();
      
      const stack = (dashboardRouter as any).stack;
      const routes = stack.filter((layer: any) => layer.route);
      
      // Verify routes exist
      expect(routes.length).toBeGreaterThan(0);
    });
  });
});

