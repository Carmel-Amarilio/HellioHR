import { Router, Response } from 'express';
import { positionService } from '../services/positionService.js';
import { authMiddleware } from '../middleware/auth.js';
import { roleGuard } from '../middleware/roleGuard.js';
import { AuthenticatedRequest } from '../types/index.js';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// GET /api/positions
router.get('/', async (_req: AuthenticatedRequest, res: Response): Promise<void> => {
  const positions = await positionService.getAll();
  res.json(positions);
});

// GET /api/positions/:id
router.get('/:id', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const id = req.params.id as string;
  const position = await positionService.getById(id);

  if (!position) {
    res.status(404).json({
      error: 'Not Found',
      message: `Position with id ${id} not found`,
    });
    return;
  }

  res.json(position);
});

// PATCH /api/positions/:id (editor only)
router.patch('/:id', roleGuard('editor'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const id = req.params.id as string;
  const { title, department, description } = req.body;

  if (!title && !department && !description) {
    res.status(400).json({
      error: 'Bad Request',
      message: 'At least one field (title, department, description) is required',
    });
    return;
  }

  const position = await positionService.update(id, { title, department, description });

  if (!position) {
    res.status(404).json({
      error: 'Not Found',
      message: `Position with id ${id} not found`,
    });
    return;
  }

  res.json(position);
});

export default router;
