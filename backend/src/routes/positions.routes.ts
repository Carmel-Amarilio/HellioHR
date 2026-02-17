import { Router, Response } from 'express';
import { positionService } from '../services/positionService.js';
import { authMiddleware } from '../middleware/auth.js';
import { roleGuard } from '../middleware/roleGuard.js';
import { AuthenticatedRequest } from '../types/index.js';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

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

// POST /api/positions (editor only)
router.post('/', roleGuard('editor'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { title, department, description } = req.body;

    if (!title || !department || !description) {
      res.status(400).json({
        error: 'Bad Request',
        message: 'title, department, and description are required',
      });
      return;
    }

    const { randomUUID } = await import('crypto');
    const position = await prisma.position.create({
      data: {
        id: randomUUID(),
        title,
        department,
        description,
      },
      include: {
        candidates: { select: { candidateId: true } },
      },
    });

    res.status(201).json({
      id: position.id,
      title: position.title,
      department: position.department,
      description: position.description,
      candidateIds: position.candidates.map((c) => c.candidateId),
    });
  } catch (error) {
    console.error('Create position error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
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

// GET /api/positions/:id/extraction
// Get extraction metadata and history for a position
router.get('/:id/extraction', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const id = req.params.id as string;

  try {
    const position = await prisma.position.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
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

    if (!position) {
      res.status(404).json({
        error: 'Not Found',
        message: `Position with id ${id} not found`,
      });
      return;
    }

    res.json(position);
  } catch (error) {
    console.error('Get position extraction error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;
