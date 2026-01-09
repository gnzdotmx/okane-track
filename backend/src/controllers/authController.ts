import { Response } from 'express';
import authService from '../services/authService';
import { AuthRequest } from '../types';
import { asyncHandler } from '../middleware/errorHandler';

export class AuthController {
  register = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { email, password, firstName, lastName } = req.body;

    const result = await authService.register({
      email,
      password,
      firstName,
      lastName,
    });

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: result,
    });
  });

  login = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { email, password } = req.body;

    const result = await authService.login(email, password);

    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: result,
    });
  });

  getProfile = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.id;

    const profile = await authService.getProfile(userId);

    res.status(200).json({
      success: true,
      data: profile,
    });
  });
}

export default new AuthController();

