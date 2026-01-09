import { Router } from 'express';
import importController, { upload } from '../controllers/importController';
import { authenticate } from '../middleware/auth';

const router = Router();

// All routes are protected
router.use(authenticate);

// Import CSV
router.post('/import', upload.single('file'), importController.import);

// Export CSV
router.get('/export', importController.export);

// Get import history
router.get('/history', importController.getHistory);

export default router;

