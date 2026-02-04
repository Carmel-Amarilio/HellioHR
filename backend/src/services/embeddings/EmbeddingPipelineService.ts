import crypto from 'crypto';
import { prisma } from '../../config/database.js';
import { config } from '../../config/env.js';
import { TitanEmbeddingsClient } from './TitanEmbeddingsClient.js';
import { vectorStore, EmbeddingRecord } from './VectorStoreService.js';

/**
 * Embedding Pipeline Service
 *
 * Orchestrates embedding generation with traceability and drift detection
 * Handles:
 * - Standardized embedding text generation
 * - SHA256 hashing for cache validation
 * - Drift detection (source data changed, format changed)
 * - AWS Titan embeddings generation
 * - Storage in PostgreSQL vector store
 */
export class EmbeddingPipelineService {
  private titanClient: TitanEmbeddingsClient;

  constructor() {
    this.titanClient = new TitanEmbeddingsClient(
      config.embeddings.model,
      config.llm.region
    );
  }

  /**
   * Generate embedding for a candidate
   *
   * Process:
   * 1. Generate standardized embedding text from candidate fields
   * 2. Compute SHA256 hash of embedding text
   * 3. Check if embedding is fresh (drift detection)
   * 4. If fresh, skip; if stale, regenerate
   * 5. Call Titan API to generate embedding
   * 6. Store in PostgreSQL with metadata
   */
  async embedCandidate(candidateId: string): Promise<void> {
    if (!config.embeddings.enabled) {
      return;
    }

    try {
      // Fetch candidate from MySQL
      const candidate = await prisma.candidate.findUnique({
        where: { id: candidateId },
      });

      if (!candidate) {
        console.error(`Candidate not found: ${candidateId}`);
        return;
      }

      // Generate standardized embedding text
      const embeddingText = this.generateCandidateEmbeddingText(candidate);

      // Compute hash
      const hash = this.computeHash(embeddingText);

      // Check if embedding is fresh (drift detection)
      const shouldRegenerate = await this.shouldRegenerateEmbedding(
        candidateId,
        'candidate',
        candidate.updatedAt,
        hash
      );

      if (!shouldRegenerate) {
        console.log(`Embedding is fresh for candidate ${candidateId}, skipping`);
        return;
      }

      // Estimate tokens before calling API
      const tokenEstimate = TitanEmbeddingsClient.estimateTokenCount(embeddingText);

      // Generate embedding via Titan API
      const startTime = Date.now();
      const response = await this.titanClient.embed(embeddingText);
      const generationLatencyMs = Date.now() - startTime;

      // Store in PostgreSQL
      await vectorStore.storeEmbedding(
        candidateId,
        'candidate',
        response.embedding,
        embeddingText,
        hash,
        config.embeddings.version,
        config.embeddings.model,
        candidate.updatedAt,
        tokenEstimate,
        generationLatencyMs
      );

      console.log(
        `Generated embedding for candidate ${candidateId} (${tokenEstimate} tokens, ${generationLatencyMs}ms)`
      );
    } catch (error) {
      console.error(`Failed to embed candidate ${candidateId}: ${error}`);
      throw error;
    }
  }

  /**
   * Generate embedding for a position
   */
  async embedPosition(positionId: string): Promise<void> {
    if (!config.embeddings.enabled) {
      return;
    }

    try {
      // Fetch position from MySQL
      const position = await prisma.position.findUnique({
        where: { id: positionId },
      });

      if (!position) {
        console.error(`Position not found: ${positionId}`);
        return;
      }

      // Generate standardized embedding text
      const embeddingText = this.generatePositionEmbeddingText(position);

      // Compute hash
      const hash = this.computeHash(embeddingText);

      // Check if embedding is fresh
      const shouldRegenerate = await this.shouldRegenerateEmbedding(
        positionId,
        'position',
        position.updatedAt,
        hash
      );

      if (!shouldRegenerate) {
        console.log(`Embedding is fresh for position ${positionId}, skipping`);
        return;
      }

      // Estimate tokens
      const tokenEstimate = TitanEmbeddingsClient.estimateTokenCount(embeddingText);

      // Generate embedding
      const startTime = Date.now();
      const response = await this.titanClient.embed(embeddingText);
      const generationLatencyMs = Date.now() - startTime;

      // Store in PostgreSQL
      await vectorStore.storeEmbedding(
        positionId,
        'position',
        response.embedding,
        embeddingText,
        hash,
        config.embeddings.version,
        config.embeddings.model,
        position.updatedAt,
        tokenEstimate,
        generationLatencyMs
      );

      console.log(
        `Generated embedding for position ${positionId} (${tokenEstimate} tokens, ${generationLatencyMs}ms)`
      );
    } catch (error) {
      console.error(`Failed to embed position ${positionId}: ${error}`);
      throw error;
    }
  }

  /**
   * Check if embedding needs to be regenerated
   *
   * Returns true if:
   * - Embedding doesn't exist
   * - Source data is newer than embedding (updatedAt changed)
   * - Embedding version changed (our text format updated)
   * - Embedding text hash changed (semantic content changed)
   */
  async shouldRegenerateEmbedding(
    entityId: string,
    entityType: 'candidate' | 'position',
    sourceUpdatedAt: Date,
    currentHash: string
  ): Promise<boolean> {
    try {
      const existing = await vectorStore.getEmbedding(entityId, entityType);

      if (!existing) {
        return true; // No embedding exists
      }

      // Check if source data is newer than embedding
      if (sourceUpdatedAt > existing.sourceUpdatedAt!) {
        return true; // Source changed
      }

      // Check if embedding version changed (our text format updated)
      if (existing.embeddingVersion !== config.embeddings.version) {
        return true; // Format changed
      }

      // Check if embedding text hash changed (even without updatedAt change)
      if (existing.embeddingTextHash !== currentHash) {
        return true; // Content changed
      }

      return false; // Embedding is fresh
    } catch (error) {
      console.error(`Error checking embedding freshness: ${error}`);
      return true; // Regenerate on error
    }
  }

  /**
   * Generate standardized embedding text for a candidate
   *
   * Format includes:
   * - Professional summary
   * - Skills
   * - Experience
   * - Education
   */
  private generateCandidateEmbeddingText(candidate: any): string {
    const lines: string[] = [];

    // Header
    lines.push('PROFESSIONAL SUMMARY:');
    if (candidate.extractedSummary) {
      lines.push(candidate.extractedSummary);
    } else {
      lines.push('(No summary available)');
    }

    // Skills
    lines.push('\nSKILLS:');
    if (Array.isArray(candidate.skills) && candidate.skills.length > 0) {
      lines.push(candidate.skills.join(', '));
    } else {
      lines.push('(No skills listed)');
    }

    // Experience
    lines.push('\nEXPERIENCE:');
    if (candidate.extractedExperience && Array.isArray(candidate.extractedExperience)) {
      candidate.extractedExperience.forEach((exp: any) => {
        const parts: string[] = [];
        if (exp.company) parts.push(`Company: ${exp.company}`);
        if (exp.role) parts.push(`Role: ${exp.role}`);
        if (exp.duration) parts.push(`Duration: ${exp.duration}`);
        if (exp.achievements) parts.push(`Achievements: ${exp.achievements}`);
        if (parts.length > 0) {
          lines.push(parts.join(' | '));
        }
      });
    } else {
      lines.push('(No experience listed)');
    }

    // Education
    lines.push('\nEDUCATION:');
    if (candidate.extractedEducation && Array.isArray(candidate.extractedEducation)) {
      candidate.extractedEducation.forEach((edu: any) => {
        const parts: string[] = [];
        if (edu.degree) parts.push(`Degree: ${edu.degree}`);
        if (edu.institution) parts.push(`Institution: ${edu.institution}`);
        if (edu.year) parts.push(`Year: ${edu.year}`);
        if (parts.length > 0) {
          lines.push(parts.join(' | '));
        }
      });
    } else {
      lines.push('(No education listed)');
    }

    return lines.join('\n');
  }

  /**
   * Generate standardized embedding text for a position
   */
  private generatePositionEmbeddingText(position: any): string {
    const lines: string[] = [];

    // Header
    lines.push('POSITION: ' + position.title);
    lines.push('DEPARTMENT: ' + position.department);

    // Summary
    lines.push('\nSUMMARY:');
    if (position.extractedSummary) {
      lines.push(position.extractedSummary);
    } else {
      lines.push('(No summary available)');
    }

    // Requirements
    lines.push('\nREQUIREMENTS:');
    if (position.extractedRequirements && Array.isArray(position.extractedRequirements)) {
      position.extractedRequirements.forEach((req: any) => {
        const parts: string[] = [];
        if (req.skill) parts.push(`Skill: ${req.skill}`);
        if (req.type) parts.push(`Type: ${req.type}`);
        if (req.yearsExp) parts.push(`Years: ${req.yearsExp}`);
        if (parts.length > 0) {
          lines.push(parts.join(' | '));
        }
      });
    } else {
      lines.push('(No requirements listed)');
    }

    // Responsibilities
    lines.push('\nRESPONSIBILITIES:');
    if (position.extractedResponsibilities && Array.isArray(position.extractedResponsibilities)) {
      position.extractedResponsibilities.forEach((resp: any) => {
        if (resp.responsibility) {
          const parts: string[] = [resp.responsibility];
          if (resp.category) parts.push(`Category: ${resp.category}`);
          lines.push(parts.join(' | '));
        }
      });
    } else {
      lines.push('(No responsibilities listed)');
    }

    return lines.join('\n');
  }

  /**
   * Compute SHA256 hash of embedding text
   * Used for cache validation and detecting content changes
   */
  private computeHash(text: string): string {
    return crypto.createHash('sha256').update(text).digest('hex');
  }
}

// Singleton instance
export const embeddingPipeline = new EmbeddingPipelineService();
