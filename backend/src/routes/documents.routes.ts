import { Router, Response } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { AuthenticatedRequest } from '../types/index.js';
import * as path from 'path';
import * as fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = Router();

// Data directory path - check Docker path first, then local
const DOCKER_DATA_DIR = '/app/data';
const LOCAL_DATA_DIR = path.join(__dirname, '../../../..', 'data');
const DATA_DIR = fs.existsSync(DOCKER_DATA_DIR) ? DOCKER_DATA_DIR : LOCAL_DATA_DIR;

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
