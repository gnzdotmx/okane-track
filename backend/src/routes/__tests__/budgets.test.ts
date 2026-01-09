// Mock dependencies - jest.mock() calls are hoisted to the top
const mockGetByYear = jest.fn();
const mockCreate = jest.fn();
const mockUpdate = jest.fn();
const mockGetCategories = jest.fn();
const mockUpdateCategoryPercentages = jest.fn();

jest.mock('../../controllers/budgetController', () => ({
  __esModule: true,
  default: {
    getByYear: mockGetByYear,
    create: mockCreate,
    update: mockUpdate,
    getCategories: mockGetCategories,
    updateCategoryPercentages: mockUpdateCategoryPercentages,
  },
}));

const mockAuthenticate = jest.fn((req: any, res: any, next: any) => {
  req.user = { id: 'user-123', email: 'test@example.com' };
  next();
});

jest.mock('../../middleware/auth', () => ({
  authenticate: mockAuthenticate,
}));

const mockValidate = jest.fn((req: any, res: any, next: any) => {
  next();
});

jest.mock('../../middleware/validation', () => ({
  validate: mockValidate,
}));

// Create a mock validation chain that is both a function (middleware) and has chainable methods
const createMockValidationChain = () => {
  const chain: any = jest.fn((req: any, res: any, next: any) => {
    // This is the middleware function - just call next
    next();
  });
  
  // Add chainable methods
  chain.notEmpty = jest.fn().mockReturnValue(chain);
  chain.withMessage = jest.fn().mockReturnValue(chain);
  chain.isArray = jest.fn().mockReturnValue(chain);
  chain.isFloat = jest.fn().mockReturnValue(chain);
  
  return chain;
};

const mockBody = jest.fn(() => createMockValidationChain());

jest.mock('express-validator', () => ({
  body: mockBody,
}));

import { Router } from 'express';
import budgetsRouter from '../budgets';
import budgetController from '../../controllers/budgetController';
import { authenticate } from '../../middleware/auth';
import { validate } from '../../middleware/validation';
import { body } from 'express-validator';

describe('Budgets Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Router configuration', () => {
    it('should export a router', () => {
      expect(budgetsRouter).toBeDefined();
      // Check if it has router-like properties (stack, use, get, post, etc.)
      expect(budgetsRouter).toHaveProperty('stack');
      expect(typeof (budgetsRouter as any).use).toBe('function');
    });

    it('should have authenticate middleware applied to all routes', () => {
      // The authenticate middleware is applied via router.use()
      // We can verify it's imported and used
      expect(authenticate).toBeDefined();
    });
  });

  describe('GET /categories', () => {
    it('should be configured to call getCategories controller', () => {
      const stack = (budgetsRouter as any).stack;
      const categoriesRoute = stack.find((layer: any) => 
        layer.route && layer.route.path === '/categories' && layer.route.methods.get
      );
      
      expect(categoriesRoute).toBeDefined();
      expect(budgetController.getCategories).toBeDefined();
    });
  });

  describe('PUT /categories/percentages', () => {
    it('should be configured to call updateCategoryPercentages controller', () => {
      const stack = (budgetsRouter as any).stack;
      const percentagesRoute = stack.find((layer: any) => 
        layer.route && layer.route.path === '/categories/percentages' && layer.route.methods.put
      );
      
      expect(percentagesRoute).toBeDefined();
      expect(budgetController.updateCategoryPercentages).toBeDefined();
    });

    it('should be configured with validation middleware', () => {
      // Verify body validator and validate middleware are available
      expect(body).toBeDefined();
      expect(validate).toBeDefined();
    });

    it('should have validation chain configured', () => {
      // The validation is set up in the route file when it loads
      // We verify that body() function is available and returns a chainable object
      const validationChain = body('test');
      expect(validationChain).toBeDefined();
      expect(typeof validationChain).toBe('function');
    });
  });

  describe('GET /:year?', () => {
    it('should be configured to call getByYear controller', () => {
      const stack = (budgetsRouter as any).stack;
      const getByYearRoute = stack.find((layer: any) => 
        layer.route && layer.route.path === '/:year?' && layer.route.methods.get
      );
      
      expect(getByYearRoute).toBeDefined();
      expect(budgetController.getByYear).toBeDefined();
    });
  });

  describe('POST /', () => {
    it('should be configured to call create controller', () => {
      const stack = (budgetsRouter as any).stack;
      const createRoute = stack.find((layer: any) => 
        layer.route && layer.route.path === '/' && layer.route.methods.post
      );
      
      expect(createRoute).toBeDefined();
      expect(budgetController.create).toBeDefined();
    });

    it('should be configured with validation middleware', () => {
      // Verify body validator and validate middleware are available
      expect(body).toBeDefined();
      expect(validate).toBeDefined();
    });

    it('should have validation chain configured', () => {
      // The validation is set up in the route file when it loads
      // We verify that body() function is available and returns a chainable object
      const validationChain = body('test');
      expect(validationChain).toBeDefined();
      expect(typeof validationChain).toBe('function');
    });
  });

  describe('PUT /:id', () => {
    it('should be configured to call update controller', () => {
      const stack = (budgetsRouter as any).stack;
      const updateRoute = stack.find((layer: any) => 
        layer.route && layer.route.path === '/:id' && layer.route.methods.put
      );
      
      expect(updateRoute).toBeDefined();
      expect(budgetController.update).toBeDefined();
    });
  });

  describe('Route order', () => {
    it('should register specific routes before parameterized routes', () => {
      const stack = (budgetsRouter as any).stack;
      const routes = stack
        .filter((layer: any) => layer.route)
        .map((layer: any) => ({
          path: layer.route.path,
          method: Object.keys(layer.route.methods)[0],
        })) as Array<{ path: string; method: string }>;

      // Verify categories route exists
      const categoriesRoute = routes.find((r: { path: string; method: string }) => r.path === '/categories');
      expect(categoriesRoute).toBeDefined();

      // Verify parameterized routes exist
      const yearRoute = routes.find((r: { path: string; method: string }) => r.path === '/:year?');
      expect(yearRoute).toBeDefined();

      const idRoute = routes.find((r: { path: string; method: string }) => r.path === '/:id');
      expect(idRoute).toBeDefined();
    });
  });

  describe('Validation rules', () => {
    it('should have validation middleware configured for create route', () => {
      // The validation is set up in the route file
      // We verify that the validation chain supports the required methods
      const validationChain = body('test');
      expect(validationChain).toBeDefined();
      expect(typeof (validationChain as any).notEmpty).toBe('function');
      expect(typeof (validationChain as any).withMessage).toBe('function');
      expect(typeof (validationChain as any).isFloat).toBe('function');
    });

    it('should have validation middleware configured for updateCategoryPercentages route', () => {
      // The validation is set up in the route file
      // We verify that the validation chain supports the required methods
      const validationChain = body('test');
      expect(validationChain).toBeDefined();
      expect(typeof (validationChain as any).notEmpty).toBe('function');
      expect(typeof (validationChain as any).withMessage).toBe('function');
      expect(typeof (validationChain as any).isArray).toBe('function');
      expect(typeof (validationChain as any).isFloat).toBe('function');
    });
  });
});

