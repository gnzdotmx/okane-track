import { Router } from 'express';
import { body } from 'express-validator';
import budgetController from '../controllers/budgetController';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validation';

const router = Router();

// All routes are protected
router.use(authenticate);

// Get budget categories
router.get('/categories', budgetController.getCategories);

// Update budget category percentages
router.put(
  '/categories/percentages',
  [
    body('percentages').isArray().withMessage('Percentages must be an array'),
    body('percentages.*.id').notEmpty().withMessage('Category ID is required'),
    body('percentages.*.percentage')
      .isFloat({ min: 0, max: 100 })
      .withMessage('Percentage must be between 0 and 100'),
    validate,
  ],
  budgetController.updateCategoryPercentages
);

// Get budgets by year
router.get('/:year?', budgetController.getByYear);

// Create budget
router.post(
  '/',
  [
    body('categoryId').notEmpty().withMessage('Category is required'),
    body('startingBalance').isFloat().withMessage('Starting balance must be a number'),
    body('allocatedAmount').isFloat().withMessage('Allocated amount must be a number'),
    validate,
  ],
  budgetController.create
);

// Update budget
router.put('/:id', budgetController.update);

export default router;

