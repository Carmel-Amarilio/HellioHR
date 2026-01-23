import { Router, Response } from 'express';
import { candidateService } from '../services/candidateService.js';
import { authMiddleware } from '../middleware/auth.js';
import { AuthenticatedRequest } from '../types/index.js';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// GET /api/candidates
router.get('/', async (_req: AuthenticatedRequest, res: Response): Promise<void> => {
  const candidates = await candidateService.getAll();
  res.json(candidates);
});

// GET /api/candidates/:id
router.get('/:id', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const id = req.params.id as string;
  const candidate = await candidateService.getById(id);

  if (!candidate) {
    res.status(404).json({
      error: 'Not Found',
      message: `Candidate with id ${id} not found`,
    });
    return;
  }

  res.json(candidate);
});

export default router;
