import { Router, Response } from 'express';
import { candidateService } from '../services/candidateService.js';
import { authMiddleware } from '../middleware/auth.js';
import { AuthenticatedRequest } from '../types/index.js';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

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

// GET /api/candidates/:id/extraction
// Get extraction metadata and history for a candidate
router.get('/:id/extraction', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const id = req.params.id as string;

  try {
    const candidate = await prisma.candidate.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        extractedSummary: true,
        extractionStatus: true,
        extractionMethod: true,
        extractionPromptVersion: true,
        lastExtractionDate: true,
        documents: {
          select: {
            id: true,
            type: true,
            fileName: true,
            createdAt: true,
            llmMetrics: {
              orderBy: {
                createdAt: 'desc',
              },
              take: 10, // Last 10 LLM calls for this document
            },
          },
        },
      },
    });

    if (!candidate) {
      res.status(404).json({
        error: 'Not Found',
        message: `Candidate with id ${id} not found`,
      });
      return;
    }

    res.json(candidate);
  } catch (error) {
    console.error('Get candidate extraction error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;
