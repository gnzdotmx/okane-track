import { Response } from 'express';
import multer from 'multer';
import importService from '../services/importService';
import { AuthRequest } from '../types';
import { asyncHandler } from '../middleware/errorHandler';
import config from '../config';

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + '-' + uniqueSuffix + '.csv');
  },
});

const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
    cb(null, true);
  } else {
    cb(new Error('Only CSV files are allowed'));
  }
};

export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: config.upload.maxFileSize,
  },
});

export class ImportController {
  import = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.id;
    const file = req.file;
    const { accountId } = req.body;

    if (!file) {
      res.status(400).json({
        success: false,
        message: 'No file uploaded',
      });
      return;
    }

    if (!accountId) {
      res.status(400).json({
        success: false,
        message: 'Account ID is required',
      });
      return;
    }

    // Read file content
    const fs = require('fs');
    const fileContent = fs.readFileSync(file.path, 'utf-8');

    // Import transactions
    const result = await importService.importCSV(userId, fileContent, accountId);

    // Delete uploaded file
    fs.unlinkSync(file.path);

    res.status(200).json({
      success: result.success,
      message: result.success
        ? 'Import completed successfully'
        : 'Import completed with errors',
      data: result,
    });
  });

  export = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.id;
    const filters = {
      startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
      endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined,
    };

    const csv = await importService.exportCSV(userId, filters);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=transactions.csv');
    res.status(200).send(csv);
  });

  getHistory = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.id;

    const history = await importService.getImportHistory(userId);

    res.status(200).json({
      success: true,
      data: history,
    });
  });
}

export default new ImportController();

