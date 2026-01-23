import { Router, Request, Response } from 'express';
import { authService } from '../services/authService.js';
import { authMiddleware } from '../middleware/auth.js';
import { AuthenticatedRequest, LoginRequest } from '../types/index.js';

const router = Router();

// POST /api/auth/login
router.post('/login', async (req: Request<unknown, unknown, LoginRequest>, res: Response): Promise<void> => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400).json({
      error: 'Bad Request',
      message: 'Email and password are required',
    });
    return;
  }

  const result = await authService.login(email, password);

  if (!result) {
    res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid credentials',
    });
    return;
  }

  res.json(result);
});

// GET /api/auth/me
router.get('/me', authMiddleware, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  if (!req.user) {
    res.status(401).json({
      error: 'Unauthorized',
      message: 'No user in request',
    });
    return;
  }

  const user = await authService.getMe(req.user.userId);

  if (!user) {
    res.status(404).json({
      error: 'Not Found',
      message: 'User not found',
    });
    return;
  }

  res.json(user);
});

export default router;
