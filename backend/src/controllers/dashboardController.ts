import { Response } from 'express';
import dashboardService from '../services/dashboardService';
import { AuthRequest } from '../types';
import { asyncHandler } from '../middleware/errorHandler';

export class DashboardController {
  getDashboard = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.id;

    const dashboard = await dashboardService.getDashboard(userId);

    res.status(200).json({
      success: true,
      data: dashboard,
    });
  });

  getCharts = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.id;
    const type = req.params.type as 'category' | 'expense' | 'monthly';

    if (!['category', 'expense', 'monthly'].includes(type)) {
      res.status(400).json({
        success: false,
        message: 'Invalid chart type. Must be: category, expense, or monthly',
      });
      return;
    }

    const chartData = await dashboardService.getChartData(userId, type);

    res.status(200).json({
      success: true,
      data: chartData,
    });
  });
}

export default new DashboardController();

