/**
 * SQL Generation Service
 *
 * Converts natural language questions to SQL queries using LLMs
 */

import { LLMFactory } from './llm/LLMFactory.js';
import { LLMMetricsService } from './llmMetricsService.js';
import { sqlValidationService } from './sqlValidationService.js';
import {
  buildSQLGenerationPrompt,
  parseSQLGenerationResponse,
  SQL_GENERATION_PROMPT_VERSION,
} from '../prompts/sqlGeneration.js';
import { config } from '../config/env.js';

export interface SQLGenerationResult {
  success: boolean;
  sql?: string;
  sanitizedSQL?: string;
  reasoning?: string;
  error?: string;
  validation?: {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  };
  metrics?: {
    modelName: string;
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    latencyMs: number;
    estimatedCostUsd: number;
  };
}

export class SQLGenerationService {
  private metricsService: LLMMetricsService;

  constructor() {
    this.metricsService = new LLMMetricsService();
  }

  /**
   * Generate SQL query from natural language question
   *
   * @param question - Natural language question
   * @param modelName - Optional model name (defaults to configured default)
   * @returns SQL generation result with query, reasoning, and validation
   */
  async generateSQL(
    question: string,
    modelName?: string
  ): Promise<SQLGenerationResult> {
    // Validate input
    if (!question || question.trim().length === 0) {
      return {
        success: false,
        error: 'Question cannot be empty',
      };
    }

    const trimmedQuestion = question.trim();

    // Build prompt
    const prompt = buildSQLGenerationPrompt(trimmedQuestion);

    // Select model
    const selectedModel = modelName || config.llm.defaultModel;

    // Auto-detect provider based on model
    // If model is 'demo-mock', use mock provider, otherwise use bedrock
    const provider = selectedModel === 'demo-mock' ? 'mock' : 'bedrock';

    // Create LLM client
    const llmClient = LLMFactory.createClient({
      provider,
      model: selectedModel,
      region: config.llm.region,
      maxTokens: config.llm.maxTokens,
      temperature: config.llm.temperature,
    });

    // Call LLM
    const startTime = Date.now();
    let llmResponse;

    try {
      llmResponse = await llmClient.generate({ prompt });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        error: `LLM generation failed: ${errorMsg}`,
      };
    }

    const latencyMs = Date.now() - startTime;

    // Calculate cost
    const estimatedCost = llmClient.getCostEstimate(llmResponse.usage);

    // Parse response
    const parsed = parseSQLGenerationResponse(llmResponse.text);

    if (!parsed) {
      // Record failed metric
      await this.metricsService.recordMetric({
        entityType: 'sql_rag',
        modelName: selectedModel,
        promptVersion: SQL_GENERATION_PROMPT_VERSION,
        usage: llmResponse.usage,
        latencyMs,
        success: false,
        errorMessage: 'Failed to parse LLM response as JSON',
        estimatedCostUsd: estimatedCost,
      });

      return {
        success: false,
        error: 'Failed to parse LLM response. Expected JSON with "sql" and "reasoning" fields.',
      };
    }

    // Validate generated SQL
    const validation = sqlValidationService.validateQuery(parsed.sql);

    // Record metric
    await this.metricsService.recordMetric({
      entityType: 'sql_rag',
      modelName: selectedModel,
      promptVersion: SQL_GENERATION_PROMPT_VERSION,
      usage: llmResponse.usage,
      latencyMs,
      success: validation.isValid,
      errorMessage: validation.isValid ? undefined : validation.errors.join('; '),
      estimatedCostUsd: estimatedCost,
    });

    // Return result
    if (!validation.isValid) {
      return {
        success: false,
        sql: parsed.sql,
        reasoning: parsed.reasoning,
        error: `Generated SQL failed validation: ${validation.errors.join(', ')}`,
        validation: {
          isValid: false,
          errors: validation.errors,
          warnings: validation.warnings,
        },
        metrics: {
          modelName: selectedModel,
          promptTokens: llmResponse.usage.promptTokens,
          completionTokens: llmResponse.usage.completionTokens,
          totalTokens: llmResponse.usage.totalTokens,
          latencyMs,
          estimatedCostUsd: estimatedCost,
        },
      };
    }

    return {
      success: true,
      sql: parsed.sql,
      sanitizedSQL: validation.sanitizedSQL,
      reasoning: parsed.reasoning,
      validation: {
        isValid: true,
        errors: [],
        warnings: validation.warnings,
      },
      metrics: {
        modelName: selectedModel,
        promptTokens: llmResponse.usage.promptTokens,
        completionTokens: llmResponse.usage.completionTokens,
        totalTokens: llmResponse.usage.totalTokens,
        latencyMs,
        estimatedCostUsd: estimatedCost,
      },
    };
  }

  /**
   * Check if a question is relevant to the database
   * (Quick pre-check before calling expensive LLM)
   */
  isRelevantQuestion(question: string): boolean {
    const lowerQuestion = question.toLowerCase();

    // Keywords that suggest HR/candidate/position queries
    const relevantKeywords = [
      'candidate', 'candidates', 'applicant', 'applicants',
      'position', 'positions', 'job', 'jobs', 'role', 'roles',
      'skill', 'skills', 'experience', 'education',
      'department', 'hire', 'hiring', 'recruit',
      'cv', 'resume', 'apply', 'application',
    ];

    // Check if question contains any relevant keywords
    return relevantKeywords.some(keyword => lowerQuestion.includes(keyword));
  }

  /**
   * Suggest clarification for ambiguous questions
   */
  suggestClarification(question: string): string | null {
    const lowerQuestion = question.toLowerCase();

    // Detect vague questions that need clarification
    if (lowerQuestion.includes('how many') && !lowerQuestion.includes('candidate') && !lowerQuestion.includes('position')) {
      return 'Please specify what you want to count (candidates or positions).';
    }

    if (lowerQuestion.match(/\b(they|them|their|it)\b/) && !lowerQuestion.includes('candidate') && !lowerQuestion.includes('position')) {
      return 'Please clarify what "they" or "it" refers to (candidates or positions).';
    }

    return null;
  }
}

// Export singleton instance
export const sqlGenerationService = new SQLGenerationService();
