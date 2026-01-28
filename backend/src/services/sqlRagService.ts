/**
 * SQL-RAG Orchestration Service
 *
 * Orchestrates the complete SQL-RAG pipeline:
 * Question → SQL Generation → Validation → Execution → Answer Generation
 */

import { SQLGenerationService } from './sqlGenerationService.js';
import { SQLExecutionService } from './sqlExecutionService.js';
import { AnswerGenerationService } from './answerGenerationService.js';

const sqlGenerationService = new SQLGenerationService();
const sqlExecutionService = new SQLExecutionService();
const answerGenerationService = new AnswerGenerationService();

export interface SQLRagResult {
  success: boolean;
  answer?: string;
  error?: string;
  suggestion?: string;
  trace?: {
    question: string;
    relevance?: {
      isRelevant: boolean;
      suggestion?: string;
    };
    sqlGeneration?: {
      sql: string;
      sanitizedSQL?: string;
      reasoning: string;
      validation: {
        isValid: boolean;
        errors: string[];
        warnings: string[];
      };
      metrics: {
        modelName: string;
        promptTokens: number;
        completionTokens: number;
        totalTokens: number;
        latencyMs: number;
        estimatedCostUsd: number;
      };
    };
    sqlExecution?: {
      rowCount: number;
      columns: string[];
      executionTimeMs: number;
    };
    answerGeneration?: {
      metrics: {
        modelName: string;
        promptTokens: number;
        completionTokens: number;
        totalTokens: number;
        latencyMs: number;
        estimatedCostUsd: number;
      };
    };
  };
  totalMetrics?: {
    totalTokens: number;
    totalCostUsd: number;
    totalLatencyMs: number;
    llmCalls: number;
  };
}

export class SQLRagService {
  /**
   * Process a user question through the complete SQL-RAG pipeline
   *
   * @param question - Natural language question from user
   * @param modelName - Optional model name (defaults to configured default)
   * @returns Complete result with answer, trace, and metrics
   */
  async ask(question: string, modelName?: string): Promise<SQLRagResult> {
    // Step 0: Validate input
    if (!question || question.trim().length === 0) {
      return {
        success: false,
        error: 'Question cannot be empty',
      };
    }

    const trimmedQuestion = question.trim();

    // Initialize trace
    const trace: SQLRagResult['trace'] = {
      question: trimmedQuestion,
    };

    // Step 1: Check for clarification needs first (before relevance)
    const clarification = sqlGenerationService.suggestClarification(trimmedQuestion);

    if (clarification) {
      trace.relevance = {
        isRelevant: true, // Assume relevant if we can suggest clarification
        suggestion: clarification,
      };

      return {
        success: false,
        error: 'Your question is ambiguous and needs clarification.',
        suggestion: clarification,
        trace,
      };
    }

    // Step 2: Check question relevance
    const isRelevant = sqlGenerationService.isRelevantQuestion(trimmedQuestion);

    trace.relevance = {
      isRelevant,
    };

    if (!isRelevant) {
      return {
        success: false,
        error: 'This question does not appear to be about candidates or positions in the HR system.',
        suggestion: 'Please ask questions about candidates, positions, skills, departments, or hiring status.',
        trace,
      };
    }

    // Step 2: Generate SQL
    const sqlGenResult = await sqlGenerationService.generateSQL(trimmedQuestion, modelName);

    if (!sqlGenResult.success) {
      return {
        success: false,
        error: sqlGenResult.error,
        trace,
      };
    }

    // Add SQL generation trace
    trace.sqlGeneration = {
      sql: sqlGenResult.sql!,
      sanitizedSQL: sqlGenResult.sanitizedSQL,
      reasoning: sqlGenResult.reasoning!,
      validation: sqlGenResult.validation!,
      metrics: sqlGenResult.metrics!,
    };

    // Step 3: Execute SQL
    const finalSQL = sqlGenResult.sanitizedSQL || sqlGenResult.sql!;
    const execResult = await sqlExecutionService.executeQuery(finalSQL);

    if (!execResult.success) {
      return {
        success: false,
        error: execResult.error,
        trace,
      };
    }

    // Add execution trace
    trace.sqlExecution = {
      rowCount: execResult.rowCount!,
      columns: execResult.columns!,
      executionTimeMs: execResult.executionTimeMs!,
    };

    // Step 4: Generate grounded answer
    const answerResult = await answerGenerationService.generateAnswer(
      trimmedQuestion,
      finalSQL,
      execResult.rows!,
      execResult.columns!,
      modelName
    );

    if (!answerResult.success) {
      return {
        success: false,
        error: answerResult.error,
        trace,
      };
    }

    // Add answer generation trace
    trace.answerGeneration = {
      metrics: answerResult.metrics!,
    };

    // Calculate total metrics
    const totalMetrics = {
      totalTokens:
        trace.sqlGeneration.metrics.totalTokens +
        trace.answerGeneration.metrics.totalTokens,
      totalCostUsd:
        trace.sqlGeneration.metrics.estimatedCostUsd +
        trace.answerGeneration.metrics.estimatedCostUsd,
      totalLatencyMs:
        trace.sqlGeneration.metrics.latencyMs +
        trace.sqlExecution.executionTimeMs +
        trace.answerGeneration.metrics.latencyMs,
      llmCalls: 2, // SQL generation + answer generation
    };

    return {
      success: true,
      answer: answerResult.answer!,
      trace,
      totalMetrics,
    };
  }
}

// Export singleton instance
export const sqlRagService = new SQLRagService();
