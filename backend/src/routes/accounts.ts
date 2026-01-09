import { Router } from 'express';
import { body } from 'express-validator';
import accountController from '../controllers/accountController';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validation';

const router = Router();

// All routes are protected
router.use(authenticate);

// Get all accounts
router.get('/', accountController.getAll);

// Get account by ID
router.get('/:id', accountController.getById);

// Create account
router.post(
  '/',
  [
    body('name').notEmpty().withMessage('Account name is required'),
    body('type').isIn(['CHECKING', 'SAVINGS', 'CREDIT_CARD', 'CASH', 'INVESTMENT'])
      .withMessage('Valid account type is required'),
    body('currencyId').notEmpty().withMessage('Currency is required'),
    validate,
  ],
  accountController.create
);

// Update account
router.put('/:id', accountController.update);

// Recalculate account balance
router.post('/:id/recalculate', accountController.recalculateBalance);

// Delete account
router.delete('/:id', accountController.delete);

// Get currencies
router.get('/meta/currencies', accountController.getCurrencies);

// Get expense types
router.get('/meta/expense-types', accountController.getExpenseTypes);

// Get transaction types
router.get('/meta/transaction-types', accountController.getTransactionTypes);

// Update exchange rates
router.post('/meta/update-exchange-rates', accountController.updateExchangeRates);

export default router;

