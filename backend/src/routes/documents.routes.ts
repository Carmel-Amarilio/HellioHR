import { Router, Response, Request } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { roleGuard } from '../middleware/roleGuard.js';
import { AuthenticatedRequest } from '../types/index.js';
import { PrismaClient } from '@prisma/client';
import { ExtractionService } from '../services/extractionService.js';
import multer from 'multer';
import * as path from 'path';
import * as fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = Router();
const prisma = new PrismaClient();

// Configure Multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowed = ['.pdf', '.docx', '.doc', '.txt'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error(`Invalid file type. Allowed: ${allowed.join(', ')}`));
    }
  },
});

// Data directory path - check Docker path first, then local
const DOCKER_DATA_DIR = '/app/data';
const LOCAL_DATA_DIR = path.join(__dirname, '../../../..', 'data');
const DATA_DIR = fs.existsSync(DOCKER_DATA_DIR) ? DOCKER_DATA_DIR : LOCAL_DATA_DIR;

/**
 * POST /api/documents/ingest
 * Upload and ingest a document (CV or Job Description)
 */
router.post(
  '/ingest',
  authMiddleware,
  roleGuard('editor'),
  upload.single('file'),
  async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      const { entityType, entityId, useLLM } = req.body;

      if (!entityType || !['candidate', 'position'].includes(entityType)) {
        return res.status(400).json({
          error: 'Invalid entityType. Must be "candidate" or "position"',
        });
      }

      if (!entityId) {
        return res.status(400).json({ error: 'entityId is required' });
      }

      // Verify entity exists
      if (entityType === 'candidate') {
        const candidate = await prisma.candidate.findUnique({
          where: { id: entityId },
        });
        if (!candidate) {
          return res.status(404).json({ error: 'Candidate not found' });
        }
      } else {
        const position = await prisma.position.findUnique({
          where: { id: entityId },
        });
        if (!position) {
          return res.status(404).json({ error: 'Position not found' });
        }
      }

      const documentType = entityType === 'candidate' ? 'CV' : 'JOB_DESCRIPTION';

      const document = await prisma.document.create({
        data: {
          type: documentType,
          fileName: req.file.originalname,
          filePath: req.file.path,
          fileSize: req.file.size,
          mimeType: req.file.mimetype,
          candidateId: entityType === 'candidate' ? entityId : undefined,
          positionId: entityType === 'position' ? entityId : undefined,
          processingStatus: 'pending',
        },
      });

      // Trigger extraction (async)
      const shouldUseLLM = useLLM === 'true' || useLLM === true;
      const extractionService = new ExtractionService();

      extractionService
        .processDocument(document.id, shouldUseLLM)
        .then((result) => {
          console.log(`Extraction completed for document ${document.id}:`, result.success);
        })
        .catch((error) => {
          console.error(`Extraction failed for document ${document.id}:`, error);
        });

      res.status(201).json({
        message: 'Document uploaded successfully. Extraction in progress.',
        document: {
          id: document.id,
          fileName: document.fileName,
          type: document.type,
          processingStatus: document.processingStatus,
        },
      });
    } catch (error) {
      console.error('Document ingestion error:', error);
      res.status(500).json({
        error: 'Failed to ingest document',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

/**
 * POST /api/documents/extract/:id
 * Manually trigger extraction for a document
 */
router.post(
  '/extract/:id',
  authMiddleware,
  roleGuard('editor'),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params as { id: string };
      const { useLLM, modelName } = req.body as { useLLM?: boolean | string; modelName?: string };

      const document = await prisma.document.findUnique({
        where: { id },
      });

      if (!document) {
        return res.status(404).json({ error: 'Document not found' });
      }

      const shouldUseLLM = useLLM === undefined || useLLM === 'true' || useLLM === true;
      const extractionService = new ExtractionService(modelName);

      const result = await extractionService.processDocument(id, shouldUseLLM);

      if (result.success) {
        res.json({
          success: true,
          cached: result.cached,
          extraction: result.extraction,
          validation: result.validation,
        });
      } else {
        res.status(500).json({
          success: false,
          error: result.error,
        });
      }
    } catch (error) {
      console.error('Extraction error:', error);
      res.status(500).json({
        error: 'Failed to extract document',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

/**
 * GET /api/documents/:id/extraction
 * Get extraction results for a document
 */
router.get(
  '/:id/extraction',
  authMiddleware,
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params as { id: string };

      const document = await prisma.document.findUnique({
        where: { id },
      });

      if (!document) {
        return res.status(404).json({ error: 'Document not found' });
      }

      // Fetch the related entity with extraction fields
      let extraction = null;
      if (document.candidateId) {
        extraction = await prisma.candidate.findUnique({
          where: { id: document.candidateId },
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            skills: true,
            extractedSummary: true,
            extractedExperience: true,
            extractedEducation: true,
            extractionMethod: true,
            extractionStatus: true,
            lastExtractionDate: true,
            extractionPromptVersion: true,
          },
        });
      } else if (document.positionId) {
        extraction = await prisma.position.findUnique({
          where: { id: document.positionId },
          select: {
            id: true,
            title: true,
            extractedSummary: true,
            extractedRequirements: true,
            extractedResponsibilities: true,
            extractionMethod: true,
            extractionStatus: true,
            lastExtractionDate: true,
            extractionPromptVersion: true,
          },
        });
      }

      res.json({
        document: {
          id: document.id,
          fileName: document.fileName,
          type: document.type,
          processingStatus: document.processingStatus,
          processedAt: document.processedAt,
          createdAt: document.createdAt,
        },
        extraction,
      });
    } catch (error) {
      console.error('Get extraction error:', error);
      res.status(500).json({
        error: 'Failed to get extraction',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

// GET /api/documents/:id/download - Download document by ID
router.get('/:id/download', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;

    const document = await prisma.document.findUnique({
      where: { id },
    });

    if (!document) {
      res.status(404).json({ error: 'Document not found' });
      return;
    }

    const filePath = path.resolve(document.filePath);

    if (!fs.existsSync(filePath)) {
      res.status(404).json({ error: 'File not found on disk' });
      return;
    }

    // Determine content type
    const ext = path.extname(document.fileName).toLowerCase();
    const contentTypes: Record<string, string> = {
      '.pdf': 'application/pdf',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '.doc': 'application/msword',
      '.txt': 'text/plain',
    };

    const contentType = contentTypes[ext] || 'application/octet-stream';

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `inline; filename="${document.fileName}"`);

    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
  } catch (error) {
    console.error('Download document error:', error);
    res.status(500).json({ error: 'Failed to download document' });
  }
});

// GET /api/documents/cv/:filename - Serve CV file
router.get('/cv/:filename', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const filename = req.params.filename as string;

  // Prevent directory traversal
  const safeFilename = path.basename(filename);
  const filePath = path.join(DATA_DIR, 'cvs', safeFilename);

  if (!fs.existsSync(filePath)) {
    res.status(404).json({ error: 'CV not found' });
    return;
  }

  // Determine content type
  const ext = path.extname(safeFilename).toLowerCase();
  const contentTypes: Record<string, string> = {
    '.pdf': 'application/pdf',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.doc': 'application/msword',
    '.txt': 'text/plain',
  };

  const contentType = contentTypes[ext] || 'application/octet-stream';

  res.setHeader('Content-Type', contentType);
  res.setHeader('Content-Disposition', `inline; filename="${safeFilename}"`);

  const fileStream = fs.createReadStream(filePath);
  fileStream.pipe(res);
});

// GET /api/documents/job-description/:filename - Serve job description file
router.get('/job-description/:filename', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const filename = req.params.filename as string;

  // Prevent directory traversal
  const safeFilename = path.basename(filename);
  const filePath = path.join(DATA_DIR, 'job-descriptions', safeFilename);

  if (!fs.existsSync(filePath)) {
    res.status(404).json({ error: 'Job description not found' });
    return;
  }

  res.setHeader('Content-Type', 'text/plain');
  res.setHeader('Content-Disposition', `inline; filename="${safeFilename}"`);

  const fileStream = fs.createReadStream(filePath);
  fileStream.pipe(res);
});

/**
 * GET /api/documents/status
 * Get extraction status for all documents in the database
 */
router.get('/status', authMiddleware, async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const documents = await prisma.document.findMany({
      select: {
        id: true,
        type: true,
        fileName: true,
        createdAt: true,
        candidateId: true,
        positionId: true,
        candidate: {
          select: {
            id: true,
            name: true,
            extractionStatus: true,
            extractionMethod: true,
            lastExtractionDate: true,
          },
        },
        position: {
          select: {
            id: true,
            title: true,
            extractionStatus: true,
            extractionMethod: true,
            lastExtractionDate: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    res.json({ documents });
  } catch (error) {
    console.error('Get extraction status error:', error);
    res.status(500).json({
      error: 'Failed to get extraction status',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/documents/status/:id
 * Get detailed extraction status for a specific document
 */
router.get('/status/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;

    const document = await prisma.document.findUnique({
      where: { id },
      include: {
        candidate: {
          select: {
            id: true,
            name: true,
            extractedSummary: true,
            extractionStatus: true,
            extractionMethod: true,
            extractionPromptVersion: true,
            lastExtractionDate: true,
          },
        },
        position: {
          select: {
            id: true,
            title: true,
            extractedSummary: true,
            extractionStatus: true,
            extractionMethod: true,
            extractionPromptVersion: true,
            lastExtractionDate: true,
          },
        },
        llmMetrics: {
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
    });

    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    res.json({ document });
  } catch (error) {
    console.error('Get document status error:', error);
    res.status(500).json({
      error: 'Failed to get document status',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// GET /api/documents - List all documents (for admin purposes)
router.get('/', authMiddleware, async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const cvsDir = path.join(DATA_DIR, 'cvs');
    const jobDescDir = path.join(DATA_DIR, 'job-descriptions');

    const cvFiles = fs.existsSync(cvsDir) ? fs.readdirSync(cvsDir) : [];
    const jobDescFiles = fs.existsSync(jobDescDir) ? fs.readdirSync(jobDescDir) : [];

    res.json({
      cvs: cvFiles.map(f => ({ filename: f, url: `/api/documents/cv/${f}` })),
      jobDescriptions: jobDescFiles.map(f => ({ filename: f, url: `/api/documents/job-description/${f}` })),
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to list documents' });
  }
});

export default router;
