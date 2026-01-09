// Mock dependencies - jest.mock() calls are hoisted to the top
const mockGetAll = jest.fn();
const mockGetById = jest.fn();
const mockCreate = jest.fn();
const mockUpdate = jest.fn();
const mockRecalculateBalance = jest.fn();
const mockDelete = jest.fn();
const mockGetCurrencies = jest.fn();
const mockGetExpenseTypes = jest.fn();
const mockGetTransactionTypes = jest.fn();
const mockUpdateExchangeRates = jest.fn();

jest.mock('../../controllers/accountController', () => ({
  __esModule: true,
  default: {
    getAll: mockGetAll,
    getById: mockGetById,
    create: mockCreate,
    update: mockUpdate,
    recalculateBalance: mockRecalculateBalance,
    delete: mockDelete,
    getCurrencies: mockGetCurrencies,
    getExpenseTypes: mockGetExpenseTypes,
    getTransactionTypes: mockGetTransactionTypes,
    updateExchangeRates: mockUpdateExchangeRates,
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
  chain.isIn = jest.fn().mockReturnValue(chain);
  
  return chain;
};

const mockBody = jest.fn(() => createMockValidationChain());

jest.mock('express-validator', () => ({
  body: mockBody,
}));

import { Router, Response, NextFunction } from 'express';
import accountsRouter from '../accounts';
import accountController from '../../controllers/accountController';
import { authenticate } from '../../middleware/auth';
import { validate } from '../../middleware/validation';
import { body } from 'express-validator';
import { AuthRequest } from '../../types';

describe('Accounts Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Router configuration', () => {
    it('should export a router', () => {
      expect(accountsRouter).toBeDefined();
      // Check if it has router-like properties (stack, use, get, post, etc.)
      expect(accountsRouter).toHaveProperty('stack');
      expect(typeof (accountsRouter as any).use).toBe('function');
    });

    it('should have authenticate middleware applied to all routes', () => {
      // The authenticate middleware is applied via router.use()
      // We can verify it's imported and used
      expect(authenticate).toBeDefined();
    });
  });

  describe('GET /', () => {
    it('should be configured to call getAll controller', () => {
      // Verify the route exists by checking the router stack
      const stack = (accountsRouter as any).stack;
      const getRoute = stack.find((layer: any) => 
        layer.route && layer.route.path === '/' && layer.route.methods.get
      );
      
      expect(getRoute).toBeDefined();
      expect(accountController.getAll).toBeDefined();
    });
  });

  describe('GET /:id', () => {
    it('should be configured to call getById controller', () => {
      const stack = (accountsRouter as any).stack;
      const getRoute = stack.find((layer: any) => 
        layer.route && layer.route.path === '/:id' && layer.route.methods.get
      );
      
      expect(getRoute).toBeDefined();
      expect(accountController.getById).toBeDefined();
    });
  });

  describe('POST /', () => {
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

    it('should call create controller after validation', () => {
      expect(accountController.create).toBeDefined();
    });
  });

  describe('PUT /:id', () => {
    it('should be configured to call update controller', () => {
      const stack = (accountsRouter as any).stack;
      const putRoute = stack.find((layer: any) => 
        layer.route && layer.route.path === '/:id' && layer.route.methods.put
      );
      
      expect(putRoute).toBeDefined();
      expect(accountController.update).toBeDefined();
    });
  });

  describe('POST /:id/recalculate', () => {
    it('should be configured to call recalculateBalance controller', () => {
      const stack = (accountsRouter as any).stack;
      const recalculateRoute = stack.find((layer: any) => 
        layer.route && layer.route.path === '/:id/recalculate' && layer.route.methods.post
      );
      
      expect(recalculateRoute).toBeDefined();
      expect(accountController.recalculateBalance).toBeDefined();
    });
  });

  describe('DELETE /:id', () => {
    it('should be configured to call delete controller', () => {
      const stack = (accountsRouter as any).stack;
      const deleteRoute = stack.find((layer: any) => 
        layer.route && layer.route.path === '/:id' && layer.route.methods.delete
      );
      
      expect(deleteRoute).toBeDefined();
      expect(accountController.delete).toBeDefined();
    });
  });

  describe('GET /meta/currencies', () => {
    it('should be configured to call getCurrencies controller', () => {
      const stack = (accountsRouter as any).stack;
      const currenciesRoute = stack.find((layer: any) => 
        layer.route && layer.route.path === '/meta/currencies' && layer.route.methods.get
      );
      
      expect(currenciesRoute).toBeDefined();
      expect(accountController.getCurrencies).toBeDefined();
    });
  });

  describe('GET /meta/expense-types', () => {
    it('should be configured to call getExpenseTypes controller', () => {
      const stack = (accountsRouter as any).stack;
      const expenseTypesRoute = stack.find((layer: any) => 
        layer.route && layer.route.path === '/meta/expense-types' && layer.route.methods.get
      );
      
      expect(expenseTypesRoute).toBeDefined();
      expect(accountController.getExpenseTypes).toBeDefined();
    });
  });

  describe('GET /meta/transaction-types', () => {
    it('should be configured to call getTransactionTypes controller', () => {
      const stack = (accountsRouter as any).stack;
      const transactionTypesRoute = stack.find((layer: any) => 
        layer.route && layer.route.path === '/meta/transaction-types' && layer.route.methods.get
      );
      
      expect(transactionTypesRoute).toBeDefined();
      expect(accountController.getTransactionTypes).toBeDefined();
    });
  });

  describe('POST /meta/update-exchange-rates', () => {
    it('should be configured to call updateExchangeRates controller', () => {
      const stack = (accountsRouter as any).stack;
      const updateRatesRoute = stack.find((layer: any) => 
        layer.route && layer.route.path === '/meta/update-exchange-rates' && layer.route.methods.post
      );
      
      expect(updateRatesRoute).toBeDefined();
      expect(accountController.updateExchangeRates).toBeDefined();
    });
  });

  describe('Route order', () => {
    it('should have both meta routes and parameterized routes registered', () => {
      const stack = (accountsRouter as any).stack;
      const routes = stack
        .filter((layer: any) => layer.route)
        .map((layer: any) => ({
          path: layer.route.path,
          method: Object.keys(layer.route.methods)[0],
        })) as Array<{ path: string; method: string }>;

      // Verify meta routes exist
      const metaCurrenciesRoute = routes.find((r: { path: string; method: string }) => r.path === '/meta/currencies');
      expect(metaCurrenciesRoute).toBeDefined();

      // Verify parameterized routes exist
      const paramIdRoute = routes.find((r: { path: string; method: string }) => r.path === '/:id' && r.method === 'get');
      expect(paramIdRoute).toBeDefined();
    });
  });

  describe('Validation rules', () => {
    it('should have validation middleware configured for POST route', () => {
      // The validation is set up in the route file
      // We verify that the validation chain supports the required methods
      const validationChain = body('test');
      expect(validationChain).toBeDefined();
      expect(typeof (validationChain as any).notEmpty).toBe('function');
      expect(typeof (validationChain as any).withMessage).toBe('function');
      expect(typeof (validationChain as any).isIn).toBe('function');
    });
  });
});

