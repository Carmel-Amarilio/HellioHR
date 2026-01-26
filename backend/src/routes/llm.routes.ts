import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { roleGuard } from '../middleware/roleGuard.js';
import { LLMMetricsService } from '../services/llmMetricsService.js';

const router = Router();
const metricsService = new LLMMetricsService();

/**
 * GET /api/llm/metrics
 * Get LLM metrics summary
 */
router.get(
  '/metrics',
  authMiddleware,
  roleGuard('editor'),
  async (req: Request, res: Response) => {
    try {
      const { startDate, endDate, modelName, entityType } = req.query;

      const filters: any = {};

      if (startDate) {
        filters.startDate = new Date(startDate as string);
      }

      if (endDate) {
        filters.endDate = new Date(endDate as string);
      }

      if (modelName) {
        filters.modelName = modelName as string;
      }

      if (entityType && (entityType === 'candidate' || entityType === 'position')) {
        filters.entityType = entityType;
      }

      const metrics = await metricsService.getMetricsSummary(filters);

      res.json(metrics);
    } catch (error) {
      console.error('Get metrics error:', error);
      res.status(500).json({
        error: 'Failed to get metrics',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

/**
 * GET /api/llm/metrics/entity/:entityType/:entityId
 * Get LLM metrics for a specific entity
 */
router.get(
  '/metrics/entity/:entityType/:entityId',
  authMiddleware,
  async (req: Request, res: Response) => {
    try {
      const { entityType, entityId } = req.params as { entityType: string; entityId: string };

      if (entityType !== 'candidate' && entityType !== 'position') {
        return res.status(400).json({ error: 'Invalid entityType' });
      }

      const metrics = await metricsService.getEntityMetrics(entityType as 'candidate' | 'position', entityId);

      res.json(metrics);
    } catch (error) {
      console.error('Get entity metrics error:', error);
      res.status(500).json({
        error: 'Failed to get entity metrics',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

/**
 * GET /api/llm/metrics/document/:documentId
 * Get LLM metrics for a specific document
 */
router.get(
  '/metrics/document/:documentId',
  authMiddleware,
  async (req: Request, res: Response) => {
    try {
      const { documentId } = req.params as { documentId: string };

      const metrics = await metricsService.getDocumentMetrics(documentId);

      res.json(metrics);
    } catch (error) {
      console.error('Get document metrics error:', error);
      res.status(500).json({
        error: 'Failed to get document metrics',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

export default router;
