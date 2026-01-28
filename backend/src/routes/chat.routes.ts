/**
 * Chat API Routes
 *
 * SQL-RAG chat endpoint for natural language Q&A about candidates and positions
 */

import { Router, Request, Response } from 'express';
import { sqlRagService } from '../services/sqlRagService.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

// All chat routes require authentication
router.use(authMiddleware);

/**
 * POST /api/chat
 *
 * Process a natural language question and return a grounded answer
 *
 * Request body:
 * - question: string (required) - Natural language question about candidates/positions
 * - modelName?: string (optional) - LLM model to use (defaults to configured default)
 *
 * Response:
 * - answer: string - Grounded answer based on database results
 * - trace: object - Full execution trace (SQL, validation, execution, answer generation)
 * - totalMetrics: object - Combined metrics from all LLM calls
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const { question, modelName } = req.body;

    // Validate input
    if (!question) {
      return res.status(400).json({
        error: 'Question is required',
      });
    }

    if (typeof question !== 'string') {
      return res.status(400).json({
        error: 'Question must be a string',
      });
    }

    // Optional model validation
    if (modelName && typeof modelName !== 'string') {
      return res.status(400).json({
        error: 'modelName must be a string',
      });
    }

    // Process question through SQL-RAG pipeline
    const result = await sqlRagService.ask(question, modelName);

    if (!result.success) {
      // Return error with helpful suggestion if available
      return res.status(400).json({
        error: result.error,
        suggestion: result.suggestion,
        trace: result.trace,
      });
    }

    // Return successful result
    return res.status(200).json({
      answer: result.answer,
      trace: result.trace,
      totalMetrics: result.totalMetrics,
    });
  } catch (error) {
    console.error('Chat endpoint error:', error);

    return res.status(500).json({
      error: 'Internal server error while processing question',
      details: error instanceof Error ? error.message : String(error),
    });
  }
});

export default router;
