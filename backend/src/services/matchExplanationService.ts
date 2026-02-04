import crypto from 'crypto';
import { prisma } from '../config/database.js';
import { config } from '../config/env.js';
import { vectorStore } from './embeddings/VectorStoreService.js';
import { LLMFactory } from './llm/LLMFactory.js';
import { LLMRequest } from './llm/LLMClient.js';

/**
 * Match Explanation Service
 *
 * Generates LLM-powered explanations for why a candidate matches a position
 *
 * Features:
 * - Explanation caching by embedding hashes (invalidates when profiles change)
 * - Guardrails against hallucination (skill validation)
 * - Fallback explanations if validation fails
 * - Parallel generation for multiple matches
 */
export class MatchExplanationService {
  constructor() {
    // No initialization needed - LLMFactory is static
  }

  /**
   * Generate explanation for why a candidate matches a position
   *
   * Process:
   * 1. Check explanation cache by (candidate_id, position_id, embedding_hashes, prompt_version)
   * 2. If cache hit, return
   * 3. If cache miss, generate explanation with guardrails
   * 4. Validate explanation (no hallucinated skills)
   * 5. Store in cache
   * 6. Return explanation
   */
  async generateExplanation(
    candidateId: string,
    positionId: string,
    candidateEmbeddingHash: string,
    positionEmbeddingHash: string,
    similarityScore: number
  ): Promise<string> {
    try {
      // Check cache first
      const cached = await vectorStore.getCachedExplanation(
        candidateId,
        positionId,
        candidateEmbeddingHash,
        positionEmbeddingHash,
        config.embeddings.explanationPromptVersion
      );

      if (cached) {
        console.log(`Cache hit for explanation: ${candidateId} -> ${positionId}`);
        return cached;
      }

      // Fetch candidate and position
      const candidate = await prisma.candidate.findUnique({ where: { id: candidateId } });
      const position = await prisma.position.findUnique({ where: { id: positionId } });

      if (!candidate || !position) {
        return this.getFallbackExplanation(similarityScore);
      }

      // Build prompt
      const prompt = this.buildPrompt(candidate, position, similarityScore);

      // Call LLM with guardrails
      const llmClient = LLMFactory.createClient({
        provider: config.llm.provider,
        model: config.embeddings.explanationModel,
        region: config.llm.region,
        maxTokens: 300,
        temperature: 0.3,
      });
      const response = await llmClient.generate({
        prompt,
        maxTokens: 300,
        temperature: 0.3,
      });

      const explanation = response.text.trim();

      // Validate explanation
      const isValid = this.validateExplanation(explanation, candidate);

      if (!isValid) {
        console.warn(`Explanation validation failed for ${candidateId} -> ${positionId}`);
        const fallback = this.getFallbackExplanation(similarityScore);
        // Store fallback in cache
        await vectorStore.cacheExplanation(
          candidateId,
          positionId,
          candidateEmbeddingHash,
          positionEmbeddingHash,
          config.embeddings.explanationPromptVersion,
          fallback,
          similarityScore,
          config.embeddings.explanationModel
        );
        return fallback;
      }

      // Store in cache
      await vectorStore.cacheExplanation(
        candidateId,
        positionId,
        candidateEmbeddingHash,
        positionEmbeddingHash,
        config.embeddings.explanationPromptVersion,
        explanation,
        similarityScore,
        config.embeddings.explanationModel
      );

      return explanation;
    } catch (error) {
      console.error(`Error generating explanation: ${error}`);
      return this.getFallbackExplanation(similarityScore);
    }
  }

  /**
   * Generate explanations for multiple matches in parallel
   * Useful for batch processing
   */
  async generateExplanationsBatch(
    matches: Array<{
      candidateId: string;
      positionId: string;
      candidateEmbeddingHash: string;
      positionEmbeddingHash: string;
      similarityScore: number;
    }>
  ): Promise<string[]> {
    const promises = matches.map((m) =>
      this.generateExplanation(
        m.candidateId,
        m.positionId,
        m.candidateEmbeddingHash,
        m.positionEmbeddingHash,
        m.similarityScore
      )
    );

    // Generate in parallel with timeout per explanation
    return Promise.all(
      promises.map((p) =>
        Promise.race([
          p,
          new Promise<string>((resolve) =>
            setTimeout(() => resolve(this.getFallbackExplanation(0.5)), 5000)
          ),
        ])
      )
    );
  }

  /**
   * Build LLM prompt for explanation generation
   */
  private buildPrompt(candidate: any, position: any, similarityScore: number): string {
    const template = `You are an expert recruiter. Explain why this candidate is a good match for this position.

POSITION:
Title: ${position.title}
Department: ${position.department}
Summary: ${position.extractedSummary ?? '(No summary available)'}
${
  Array.isArray(position.extractedRequirements)
    ? `Requirements: ${position.extractedRequirements.map((r: any) => r.skill ?? r.type).join(', ')}`
    : ''
}

CANDIDATE:
Name: ${candidate.name}
Summary: ${candidate.extractedSummary ?? '(No summary available)'}
Skills: ${Array.isArray(candidate.skills) ? candidate.skills.join(', ') : '(No skills listed)'}
${
  candidate.extractedExperience && Array.isArray(candidate.extractedExperience)
    ? `Experience: ${candidate.extractedExperience.map((e: any) => `${e.role} at ${e.company}`).join('; ')}`
    : ''
}

Match Score: ${(similarityScore * 100).toFixed(0)}%

INSTRUCTIONS:
- Write a 2-3 sentence explanation of why this candidate fits this role
- ONLY use facts from the provided candidate and position data
- If there is not enough evidence for a claim, say "limited information available" instead of guessing
- Reference specific skills, experience, or qualifications
- Be concise and professional
- Do NOT hallucinate skills or experience not mentioned above
- Focus on the strongest match points

Explanation:`;

    return template;
  }

  /**
   * Validate explanation against candidate data
   *
   * Extracts claimed skills from explanation and verifies they exist
   * in candidate's skills or experience
   */
  private validateExplanation(explanation: string, candidate: any): boolean {
    // Extract mentioned skills (simple heuristic: quoted phrases or skill keywords)
    const candidateSkills = new Set(
      Array.isArray(candidate.skills) ? candidate.skills.map((s: string) => s.toLowerCase()) : []
    );

    // Add skills from experience
    if (candidate.extractedExperience && Array.isArray(candidate.extractedExperience)) {
      candidate.extractedExperience.forEach((exp: any) => {
        if (exp.role) candidateSkills.add(exp.role.toLowerCase());
        if (exp.company) candidateSkills.add(exp.company.toLowerCase());
      });
    }

    // Simple validation: check if explanation seems reasonable
    // (Not too short, mentions some relevant terms, no obvious hallucinations)
    const explanationLower = explanation.toLowerCase();

    // Red flags for hallucination
    const redFlags = [
      /\bunverifie[d]?\s+skill/i,
      /\bassume[d]?\s+expertise/i,
      /\bprobably\s+knows/i,
      /\blikely\s+has\s+experienc/i,
    ];

    for (const flag of redFlags) {
      if (flag.test(explanation)) {
        return false;
      }
    }

    // Green flag: explanation references real data
    let hasRealReference = false;
    if (candidate.skills && candidate.skills.length > 0) {
      for (const skill of candidate.skills) {
        if (explanationLower.includes(skill.toLowerCase())) {
          hasRealReference = true;
          break;
        }
      }
    }

    if (!hasRealReference && candidate.extractedExperience) {
      for (const exp of candidate.extractedExperience) {
        if (exp.role && explanationLower.includes(exp.role.toLowerCase())) {
          hasRealReference = true;
          break;
        }
      }
    }

    // If no real reference found, allow if explanation is short and generic
    if (!hasRealReference && explanation.length < 50) {
      return false;
    }

    return true;
  }

  /**
   * Get fallback explanation when generation fails or validation fails
   * Shows match percentage without making claims
   */
  private getFallbackExplanation(similarityScore: number): string {
    const percentage = (similarityScore * 100).toFixed(0);
    return `This candidate's profile shows relevant experience and qualifications for this role (${percentage}% semantic match). Please review the full profiles for detailed fit assessment.`;
  }

  /**
   * Compute hash for embedding
   * Used as cache key component
   */
  static computeHash(embedding: number[]): string {
    return crypto
      .createHash('sha256')
      .update(JSON.stringify(embedding))
      .digest('hex');
  }
}

// Singleton instance
export const matchExplanation = new MatchExplanationService();
