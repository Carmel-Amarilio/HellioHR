import { prisma } from '../config/database.js';
import { config } from '../config/env.js';
import { vectorStore, SimilarityResult } from './embeddings/VectorStoreService.js';
import { TitanEmbeddingsClient } from './embeddings/TitanEmbeddingsClient.js';
import { Candidate, Position } from '../types/index.js';

/**
 * Candidate suggestion with similarity score and rank
 */
export interface CandidateSuggestion {
  candidate: Candidate;
  similarity: number; // 0-1, higher = better match
  rank: number;
}

/**
 * Position suggestion with similarity score
 */
export interface PositionSuggestion {
  position: Position;
  similarity: number; // 0-1, higher = better match
  rank: number;
}

/**
 * Retrieval metadata for diagnostics
 */
export interface SuggestionMetadata {
  retrievedCount: number;  // Top-K before filtering
  filteredCount: number;   // Final count after filtering
  filtersApplied: Record<string, any>;
  model: string;
  embeddingVersion: string;
  retrievalTimeMs: number;
  diagnosticsLogId: number;
}

/**
 * Semantic Search Service
 *
 * Provides intelligent candidate-position matching using embeddings
 * - Suggests top 3 candidates for a position
 * - Suggests up to 3 positions for a candidate (if above threshold)
 * - Includes hybrid filtering (status, exclusions, thresholds)
 * - Logs retrieval diagnostics for quality monitoring
 */
export class SemanticSearchService {
  private titanClient: TitanEmbeddingsClient;

  constructor() {
    this.titanClient = new TitanEmbeddingsClient(
      config.embeddings.model,
      config.llm.region
    );
  }

  /**
   * Suggest candidates for a position
   *
   * Process:
   * 1. Get position embedding from vector store
   * 2. Query pgvector for top 20 similar candidates
   * 3. Filter: status = Active, exclude already-linked candidates
   * 4. Return top 3 after filtering
   * 5. Log retrieval diagnostics
   */
  async suggestCandidatesForPosition(positionId: string): Promise<{
    suggestions: CandidateSuggestion[];
    metadata: SuggestionMetadata;
  }> {
    const startTime = Date.now();

    try {
      // Get position embedding
      const positionEmbedding = await vectorStore.getEmbedding(positionId, 'position');
      if (!positionEmbedding) {
        throw new Error(`No embedding found for position ${positionId}`);
      }

      // Query: retrieve top 20 candidates
      const topKResults = await vectorStore.findSimilar(
        positionEmbedding.embedding,
        'candidate',
        20
      );

      const topKIds = topKResults.map((r) => r.entityId);
      const topKScores = topKResults.map((r) => r.similarity);

      // Fetch position to get linked candidates
      const position = await prisma.position.findUnique({
        where: { id: positionId },
        include: {
          candidates: {
            select: { candidateId: true },
          },
        },
      });

      // Build filter: exclude already-linked candidates
      const linkedCandidateIds = position?.candidates.map((c) => c.candidateId) ?? [];

      // Fetch candidates from top-20 results
      const topKCandidates = await prisma.candidate.findMany({
        where: {
          id: { in: topKIds },
        },
        include: {
          positions: {
            select: { positionId: true },
          },
        },
      });

      // Filter: status = Active, exclude linked
      const filtered = topKCandidates
        .filter((c) => c.status === 'ACTIVE')
        .filter((c) => !linkedCandidateIds.includes(c.id))
        .map((c) => {
          const result = topKResults.find((r) => r.entityId === c.id);
          return {
            candidate: this.toCandidateContract(c),
            similarity: result?.similarity ?? 0,
            rank: 0,
          };
        })
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, 3) // Top 3 after filtering
        .map((s, idx) => ({ ...s, rank: idx + 1 }));

      // Log diagnostics
      const retrievalTimeMs = Date.now() - startTime;
      const diagnosticsLogId = await vectorStore.logRetrieval(
        'suggest_candidates',
        positionId,
        topKIds,
        topKScores,
        {
          status: 'Active',
          excludedCandidateIds: linkedCandidateIds,
        },
        filtered.length,
        retrievalTimeMs
      );

      return {
        suggestions: filtered,
        metadata: {
          retrievedCount: topKResults.length,
          filteredCount: filtered.length,
          filtersApplied: {
            status: 'Active',
            excludedIds: linkedCandidateIds,
          },
          model: config.embeddings.model,
          embeddingVersion: config.embeddings.version,
          retrievalTimeMs,
          diagnosticsLogId,
        },
      };
    } catch (error) {
      console.error(`Error suggesting candidates for position ${positionId}: ${error}`);
      throw error;
    }
  }

  /**
   * Suggest positions for a candidate
   *
   * Process:
   * 1. Get candidate embedding from vector store
   * 2. Query pgvector for top 20 similar positions
   * 3. Filter: status = Open, similarity >= threshold
   * 4. Return up to 3 after filtering
   * 5. Log retrieval diagnostics
   */
  async suggestPositionsForCandidate(candidateId: string): Promise<{
    suggestions: PositionSuggestion[];
    metadata: SuggestionMetadata;
  }> {
    const startTime = Date.now();

    try {
      // Get candidate embedding
      const candidateEmbedding = await vectorStore.getEmbedding(candidateId, 'candidate');
      if (!candidateEmbedding) {
        throw new Error(`No embedding found for candidate ${candidateId}`);
      }

      // Query: retrieve top 20 positions
      const topKResults = await vectorStore.findSimilar(
        candidateEmbedding.embedding,
        'position',
        20
      );

      const topKIds = topKResults.map((r) => r.entityId);
      const topKScores = topKResults.map((r) => r.similarity);

      // Fetch candidate to get linked positions
      const candidate = await prisma.candidate.findUnique({
        where: { id: candidateId },
        include: {
          positions: {
            select: { positionId: true },
          },
        },
      });

      // Build filter: exclude already-linked positions
      const linkedPositionIds = candidate?.positions.map((p) => p.positionId) ?? [];

      // Fetch positions from top-20 results
      const topKPositions = await prisma.position.findMany({
        where: {
          id: { in: topKIds },
        },
        include: {
          candidates: {
            select: { candidateId: true },
          },
        },
      });

      // Filter: exclude linked, apply threshold
      const filtered = topKPositions
        .filter((p) => !linkedPositionIds.includes(p.id))
        .map((p) => {
          const result = topKResults.find((r) => r.entityId === p.id);
          return {
            position: this.toPositionContract(p),
            similarity: result?.similarity ?? 0,
            rank: 0,
          };
        })
        .filter((s) => s.similarity >= config.embeddings.similarityThreshold)
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, 3) // Up to 3 after filtering
        .map((s, idx) => ({ ...s, rank: idx + 1 }));

      // Log diagnostics
      const retrievalTimeMs = Date.now() - startTime;
      const diagnosticsLogId = await vectorStore.logRetrieval(
        'suggest_positions',
        candidateId,
        topKIds,
        topKScores,
        {
          minSimilarity: config.embeddings.similarityThreshold,
          excludedIds: linkedPositionIds,
        },
        filtered.length,
        retrievalTimeMs
      );

      return {
        suggestions: filtered,
        metadata: {
          retrievedCount: topKResults.length,
          filteredCount: filtered.length,
          filtersApplied: {
            minSimilarity: config.embeddings.similarityThreshold,
            excludedIds: linkedPositionIds,
          },
          model: config.embeddings.model,
          embeddingVersion: config.embeddings.version,
          retrievalTimeMs,
          diagnosticsLogId,
        },
      };
    } catch (error) {
      console.error(`Error suggesting positions for candidate ${candidateId}: ${error}`);
      throw error;
    }
  }

  /**
   * Convert Prisma candidate to API contract
   */
  private toCandidateContract(candidate: any): Candidate {
    return {
      id: candidate.id,
      name: candidate.name,
      email: candidate.email,
      phone: candidate.phone,
      skills: Array.isArray(candidate.skills) ? candidate.skills : [],
      positionIds: candidate.positions?.map((p: any) => p.positionId) ?? [],
      cvUrl: candidate.cvUrl ?? '',
      status: candidate.status === 'ACTIVE' ? 'active' : 'inactive',
    };
  }

  /**
   * Convert Prisma position to API contract
   */
  private toPositionContract(position: any): Position {
    return {
      id: position.id,
      title: position.title,
      department: position.department,
      description: position.description,
      candidateIds: position.candidates?.map((c: any) => c.candidateId) ?? [],
    };
  }
}

// Singleton instance
export const semanticSearch = new SemanticSearchService();
