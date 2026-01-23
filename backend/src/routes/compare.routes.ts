import { Router, Response } from 'express';
import { candidateService } from '../services/candidateService.js';
import { authMiddleware } from '../middleware/auth.js';
import { AuthenticatedRequest } from '../types/index.js';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// GET /api/compare/:id1/:id2
router.get('/:id1/:id2', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const id1 = req.params.id1 as string;
  const id2 = req.params.id2 as string;

  // Get both candidates
  const candidates = await candidateService.getByIds([id1, id2]);

  const candidate1 = candidates.find((c) => c.id === id1);
  const candidate2 = candidates.find((c) => c.id === id2);

  if (!candidate1 || !candidate2) {
    const missing: string[] = [];
    if (!candidate1) missing.push(id1);
    if (!candidate2) missing.push(id2);

    res.status(404).json({
      error: 'Not Found',
      message: `Candidate(s) not found: ${missing.join(', ')}`,
    });
    return;
  }

  res.json({
    candidates: [candidate1, candidate2],
  });
});

export default router;
