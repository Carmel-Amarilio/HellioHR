/**
 * Answer Generation Service
 *
 * Generates grounded natural language answers from SQL query results using LLMs
 */

import { LLMFactory } from './llm/LLMFactory.js';
import { LLMMetricsService } from './llmMetricsService.js';
import {
  buildAnswerGenerationPrompt,
  parseAnswerGenerationResponse,
  ANSWER_GENERATION_PROMPT_VERSION,
} from '../prompts/answerGeneration.js';
import { config } from '../config/env.js';

export interface AnswerGenerationResult {
  success: boolean;
  answer?: string;
  error?: string;
  trace?: {
    question: string;
    sql: string;
    rowCount: number;
    columns: string[];
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

export class AnswerGenerationService {
  private metricsService: LLMMetricsService;

  constructor() {
    this.metricsService = new LLMMetricsService();
  }

  /**
   * Generate a grounded natural language answer from SQL query results
   *
   * @param question - The user's original question
   * @param sql - The SQL query that was executed
   * @param rows - The rows returned from the query
   * @param columns - The column names from the result
   * @param modelName - Optional model name (defaults to configured default)
   * @returns Answer generation result with answer, trace, and metrics
   */
  async generateAnswer(
    question: string,
    sql: string,
    rows: any[],
    columns: string[],
    modelName?: string
  ): Promise<AnswerGenerationResult> {
    const rowCount = rows.length;

    // Build prompt
    const prompt = buildAnswerGenerationPrompt(question, sql, rows, rowCount, columns);

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
        trace: {
          question,
          sql,
          rowCount,
          columns,
        },
      };
    }

    const latencyMs = Date.now() - startTime;

    // Calculate cost
    const estimatedCost = llmClient.getCostEstimate(llmResponse.usage);

    // Parse response
    const parsed = parseAnswerGenerationResponse(llmResponse.text);

    if (!parsed) {
      // Record failed metric
      await this.metricsService.recordMetric({
        entityType: 'sql_rag',
        modelName: selectedModel,
        promptVersion: ANSWER_GENERATION_PROMPT_VERSION,
        usage: llmResponse.usage,
        latencyMs,
        success: false,
        errorMessage: 'Failed to parse LLM response',
        estimatedCostUsd: estimatedCost,
      });

      return {
        success: false,
        error: 'Failed to parse LLM response. Expected non-empty text.',
        trace: {
          question,
          sql,
          rowCount,
          columns,
        },
      };
    }

    // Record successful metric
    await this.metricsService.recordMetric({
      entityType: 'sql_rag',
      modelName: selectedModel,
      promptVersion: ANSWER_GENERATION_PROMPT_VERSION,
      usage: llmResponse.usage,
      latencyMs,
      success: true,
      estimatedCostUsd: estimatedCost,
    });

    return {
      success: true,
      answer: parsed.answer,
      trace: {
        question,
        sql,
        rowCount,
        columns,
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
}

// Export singleton instance
export const answerGenerationService = new AnswerGenerationService();
