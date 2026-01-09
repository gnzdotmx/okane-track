import { Router } from 'express';
import dashboardController from '../controllers/dashboardController';
import { authenticate } from '../middleware/auth';

const router = Router();

// All routes are protected
router.use(authenticate);

// Get dashboard data
router.get('/', dashboardController.getDashboard);

// Get chart data
router.get('/charts/:type', dashboardController.getCharts);

export default router;

