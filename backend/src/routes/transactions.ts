import { Router } from 'express';
import { body } from 'express-validator';
import transactionController from '../controllers/transactionController';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validation';

const router = Router();

// All routes are protected
router.use(authenticate);

// Get all transactions with filters
router.get('/', transactionController.getAll);

// Get recent transactions
router.get('/recent', transactionController.getRecent);

// Get transaction by ID
router.get('/:id', transactionController.getById);

// Create transaction
router.post(
  '/',
  [
    body('accountId').notEmpty().withMessage('Account ID is required'),
    body('currencyId').notEmpty().withMessage('Currency ID is required'),
    body('date').isISO8601().withMessage('Valid date is required'),
    body('amount').isFloat({ gt: 0 }).withMessage('Amount must be greater than 0'),
    body('transactionTypeId').notEmpty().withMessage('Transaction type is required'),
    body('budgetCategoryId').notEmpty().withMessage('Budget category is required'),
    validate,
  ],
  transactionController.create
);

// Update transaction
router.put('/:id', transactionController.update);

// Delete transaction
router.delete('/:id', transactionController.delete);

export default router;

