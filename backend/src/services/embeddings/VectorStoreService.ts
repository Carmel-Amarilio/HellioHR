import { Pool, PoolClient } from 'pg';
import { config } from '../../config/env.js';

/**
 * Embedding record stored in PostgreSQL
 */
export interface EmbeddingRecord {
  entityId: string;
  entityType: 'candidate' | 'position';
  embedding: number[];
  embeddingText: string;
  embeddingTextHash: string;
  embeddingVersion: string;
  modelName: string;
  sourceUpdatedAt: Date | null;
  tokensEstimate: number | null;
  generationLatencyMs: number | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Similarity search result
 */
export interface SimilarityResult {
  entityId: string;
  similarity: number; // Cosine similarity (0-1), computed from distance: similarity = 1 - distance
  distance: number;   // Cosine distance from pgvector (0-2)
}

/**
 * Vector Store Service for PostgreSQL pgvector
 *
 * Manages embeddings in PostgreSQL with pgvector extension
 * Uses HNSW indexes for fast similarity search
 * Supports both candidate and position embeddings
 */
export class VectorStoreService {
  private pool: Pool | null = null;

  /**
   * Initialize connection pool
   */
  async initialize(): Promise<void> {
    if (this.pool) return;

    try {
      this.pool = new Pool({
        connectionString: config.vectorDatabaseUrl,
        max: 20,
      });

      // Test connection
      const client = await this.pool.connect();
      await client.query('SELECT 1');
      client.release();

      console.log('Vector database connected');
    } catch (error) {
      throw new Error(`Failed to connect to vector database: ${error}`);
    }
  }

  /**
   * Store embedding in PostgreSQL
   */
  async storeEmbedding(
    entityId: string,
    entityType: 'candidate' | 'position',
    embedding: number[],
    embeddingText: string,
    embeddingTextHash: string,
    embeddingVersion: string,
    modelName: string,
    sourceUpdatedAt: Date | null,
    tokensEstimate: number | null,
    generationLatencyMs: number | null
  ): Promise<void> {
    if (!this.pool) await this.initialize();

    const client = await this.pool!.connect();
    try {
      const table = entityType === 'candidate' ? 'candidate_embeddings' : 'position_embeddings';
      const idColumn = entityType === 'candidate' ? 'candidate_id' : 'position_id';

      // Convert embedding array to PostgreSQL vector format: [val1, val2, ...]
      const embeddingVector = `[${embedding.join(',')}]`;

      await client.query(
        `
        INSERT INTO ${table} (
          ${idColumn},
          embedding,
          embedding_text,
          embedding_text_hash,
          embedding_version,
          model_name,
          source_updated_at,
          tokens_estimate,
          generation_latency_ms,
          created_at,
          updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        ON CONFLICT (${idColumn}) DO UPDATE SET
          embedding = EXCLUDED.embedding,
          embedding_text = EXCLUDED.embedding_text,
          embedding_text_hash = EXCLUDED.embedding_text_hash,
          embedding_version = EXCLUDED.embedding_version,
          model_name = EXCLUDED.model_name,
          source_updated_at = EXCLUDED.source_updated_at,
          tokens_estimate = EXCLUDED.tokens_estimate,
          generation_latency_ms = EXCLUDED.generation_latency_ms,
          updated_at = CURRENT_TIMESTAMP
        `,
        [
          entityId,
          embeddingVector,
          embeddingText,
          embeddingTextHash,
          embeddingVersion,
          modelName,
          sourceUpdatedAt,
          tokensEstimate,
          generationLatencyMs,
        ]
      );
    } finally {
      client.release();
    }
  }

  /**
   * Retrieve embedding by entity ID
   */
  async getEmbedding(entityId: string, entityType: 'candidate' | 'position'): Promise<EmbeddingRecord | null> {
    if (!this.pool) await this.initialize();

    const client = await this.pool!.connect();
    try {
      const table = entityType === 'candidate' ? 'candidate_embeddings' : 'position_embeddings';
      const idColumn = entityType === 'candidate' ? 'candidate_id' : 'position_id';

      const result = await client.query(
        `
        SELECT
          ${idColumn} as entity_id,
          embedding,
          embedding_text,
          embedding_text_hash,
          embedding_version,
          model_name,
          source_updated_at,
          tokens_estimate,
          generation_latency_ms,
          created_at,
          updated_at
        FROM ${table}
        WHERE ${idColumn} = $1
        `,
        [entityId]
      );

      if (result.rows.length === 0) return null;

      const row = result.rows[0];

      // Parse embedding: pgvector returns as string "[1,2,3]", convert to array
      const embeddingArray = typeof row.embedding === 'string'
        ? JSON.parse(row.embedding)
        : row.embedding;

      return {
        entityId: row.entity_id,
        entityType,
        embedding: embeddingArray,
        embeddingText: row.embedding_text,
        embeddingTextHash: row.embedding_text_hash,
        embeddingVersion: row.embedding_version,
        modelName: row.model_name,
        sourceUpdatedAt: row.source_updated_at,
        tokensEstimate: row.tokens_estimate,
        generationLatencyMs: row.generation_latency_ms,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      };
    } finally {
      client.release();
    }
  }

  /**
   * Find similar embeddings using cosine distance
   *
   * pgvector `<=>` operator returns cosine distance (0-2)
   * We convert to similarity: similarity = 1 - distance
   *
   * Returns top-k results sorted by distance (ascending = most similar first)
   */
  async findSimilar(
    embedding: number[],
    entityType: 'candidate' | 'position',
    limit: number = 20
  ): Promise<SimilarityResult[]> {
    if (!this.pool) await this.initialize();

    const client = await this.pool!.connect();
    try {
      const table = entityType === 'candidate' ? 'candidate_embeddings' : 'position_embeddings';
      const idColumn = entityType === 'candidate' ? 'candidate_id' : 'position_id';

      // Convert embedding array to PostgreSQL vector format
      const embeddingVector = `[${embedding.join(',')}]`;

      const result = await client.query(
        `
        SELECT
          ${idColumn} as entity_id,
          embedding <=> $1::vector AS distance
        FROM ${table}
        ORDER BY embedding <=> $1::vector
        LIMIT $2
        `,
        [embeddingVector, limit]
      );

      // Convert distance to similarity (0-1 range, higher = more similar)
      return result.rows.map((row: any) => ({
        entityId: row.entity_id,
        similarity: 1 - row.distance, // similarity = 1 - distance
        distance: row.distance,
      }));
    } finally {
      client.release();
    }
  }

  /**
   * Log retrieval operation for diagnostics
   */
  async logRetrieval(
    queryType: 'suggest_candidates' | 'suggest_positions',
    queryEntityId: string,
    topKEntityIds: string[],
    topKScores: number[],
    filtersApplied: Record<string, any>,
    finalCount: number,
    retrievalTimeMs: number
  ): Promise<number> {
    if (!this.pool) await this.initialize();

    const client = await this.pool!.connect();
    try {
      const result = await client.query(
        `
        INSERT INTO retrieval_logs (
          query_type,
          query_entity_id,
          top_k_entity_ids,
          top_k_scores,
          filters_applied,
          final_count,
          retrieval_time_ms,
          created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)
        RETURNING id
        `,
        [
          queryType,
          queryEntityId,
          topKEntityIds,
          topKScores,
          JSON.stringify(filtersApplied),
          finalCount,
          retrievalTimeMs,
        ]
      );

      return result.rows[0].id;
    } finally {
      client.release();
    }
  }

  /**
   * Cache explanation in database
   */
  async cacheExplanation(
    candidateId: string,
    positionId: string,
    candidateEmbeddingHash: string,
    positionEmbeddingHash: string,
    promptVersion: string,
    explanation: string,
    similarityScore: number,
    modelName: string
  ): Promise<void> {
    if (!this.pool) await this.initialize();

    const client = await this.pool!.connect();
    try {
      await client.query(
        `
        INSERT INTO explanation_cache (
          candidate_id,
          position_id,
          candidate_embedding_hash,
          position_embedding_hash,
          prompt_version,
          explanation,
          similarity_score,
          model_name,
          created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP)
        ON CONFLICT (candidate_id, position_id, candidate_embedding_hash, position_embedding_hash, prompt_version)
        DO NOTHING
        `,
        [
          candidateId,
          positionId,
          candidateEmbeddingHash,
          positionEmbeddingHash,
          promptVersion,
          explanation,
          similarityScore,
          modelName,
        ]
      );
    } finally {
      client.release();
    }
  }

  /**
   * Retrieve cached explanation
   */
  async getCachedExplanation(
    candidateId: string,
    positionId: string,
    candidateEmbeddingHash: string,
    positionEmbeddingHash: string,
    promptVersion: string
  ): Promise<string | null> {
    if (!this.pool) await this.initialize();

    const client = await this.pool!.connect();
    try {
      const result = await client.query(
        `
        SELECT explanation
        FROM explanation_cache
        WHERE candidate_id = $1
          AND position_id = $2
          AND candidate_embedding_hash = $3
          AND position_embedding_hash = $4
          AND prompt_version = $5
        `,
        [candidateId, positionId, candidateEmbeddingHash, positionEmbeddingHash, promptVersion]
      );

      return result.rows.length > 0 ? result.rows[0].explanation : null;
    } finally {
      client.release();
    }
  }

  /**
   * Gracefully close connection pool
   */
  async close(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
    }
  }
}

// Singleton instance
export const vectorStore = new VectorStoreService();
