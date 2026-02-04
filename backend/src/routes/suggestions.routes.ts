import { Router } from 'express';
import { config } from '../config/env.js';
import { semanticSearch } from '../services/semanticSearchService.js';
import { matchExplanation } from '../services/matchExplanationService.js';
import { vectorStore } from '../services/embeddings/VectorStoreService.js';
import { authMiddleware } from '../middleware/auth.js';
import { AuthenticatedRequest, CandidateSuggestionsResponse, PositionSuggestionsResponse } from '../types/index.js';

const router = Router();

// Apply authentication middleware to all routes
router.use(authMiddleware);

/**
 * GET /api/positions/:id/suggest-candidates
 *
 * Get suggested candidates for a position using semantic search
 * Returns top 3 active candidates, excluding already-linked candidates
 */
router.get('/positions/:id/suggest-candidates', async (req: AuthenticatedRequest, res) => {
  try {
    const positionId = req.params.id as string;

    // Check if embeddings are enabled
    if (!config.embeddings.enabled) {
      return res.status(503).json({
        error: 'Semantic search unavailable',
        message: 'Embeddings feature is not enabled. Check EMBEDDINGS_ENABLED config.',
      });
    }

    // Verify vector store is initialized
    await vectorStore.initialize();

    // Get suggestions
    const result = await semanticSearch.suggestCandidatesForPosition(positionId);

    const response: CandidateSuggestionsResponse = {
      suggestions: result.suggestions,
      metadata: result.metadata,
    };

    res.json(response);
  } catch (error) {
    console.error(`Error suggesting candidates: ${error}`);

    if (error instanceof Error && error.message.includes('No embedding found')) {
      return res.status(404).json({
        error: 'Position not embedded',
        message: `No embedding found for position. Embeddings may still be generating.`,
      });
    }

    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/candidates/:id/suggest-positions
 *
 * Get suggested positions for a candidate using semantic search
 * Returns up to 3 open positions with semantic match explanations (if similarity >= threshold)
 */
router.get('/candidates/:id/suggest-positions', async (req: AuthenticatedRequest, res) => {
  try {
    const candidateId = req.params.id as string;

    // Check if embeddings are enabled
    if (!config.embeddings.enabled) {
      return res.status(503).json({
        error: 'Semantic search unavailable',
        message: 'Embeddings feature is not enabled. Check EMBEDDINGS_ENABLED config.',
      });
    }

    // Verify vector store is initialized
    await vectorStore.initialize();

    // Get suggestions
    const result = await semanticSearch.suggestPositionsForCandidate(candidateId);

    // Fetch embedding records for explanation cache keys
    const candidateEmbedding = await vectorStore.getEmbedding(candidateId, 'candidate');
    if (!candidateEmbedding) {
      return res.status(404).json({
        error: 'Candidate not embedded',
        message: `No embedding found for candidate. Embeddings may still be generating.`,
      });
    }

    // Generate explanations for each suggestion in parallel
    const suggestionsWithExplanations = await Promise.all(
      result.suggestions.map(async (suggestion) => {
        try {
          // Get position embedding for cache key
          const positionEmbedding = await vectorStore.getEmbedding(
            suggestion.position.id,
            'position'
          );

          if (!positionEmbedding) {
            return {
              ...suggestion,
              explanation: 'Unable to generate explanation (position embedding not found)',
              explanationCached: false,
              explanationPromptVersion: config.embeddings.explanationPromptVersion,
            };
          }

          const explanation = await matchExplanation.generateExplanation(
            candidateId,
            suggestion.position.id,
            candidateEmbedding.embeddingTextHash,
            positionEmbedding.embeddingTextHash,
            suggestion.similarity
          );

          return {
            ...suggestion,
            explanation,
            explanationCached: true, // Will be true if cache hit, false if miss (but we don't distinguish)
            explanationPromptVersion: config.embeddings.explanationPromptVersion,
          };
        } catch (error) {
          console.error(`Error generating explanation for position ${suggestion.position.id}: ${error}`);
          return {
            ...suggestion,
            explanation: 'Unable to generate explanation. Please try again later.',
            explanationCached: false,
            explanationPromptVersion: config.embeddings.explanationPromptVersion,
          };
        }
      })
    );

    const response: PositionSuggestionsResponse = {
      suggestions: suggestionsWithExplanations,
      metadata: result.metadata,
    };

    res.json(response);
  } catch (error) {
    console.error(`Error suggesting positions: ${error}`);

    if (error instanceof Error && error.message.includes('No embedding found')) {
      return res.status(404).json({
        error: 'Candidate not embedded',
        message: `No embedding found for candidate. Embeddings may still be generating.`,
      });
    }

    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;
