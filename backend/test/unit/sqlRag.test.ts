import { describe, it, expect, beforeAll } from 'vitest';
import { SQLRagService } from '../../src/services/sqlRagService.js';
import { prisma } from '../../src/config/database.js';

describe('SQLRagService', () => {
  let service: SQLRagService;

  beforeAll(async () => {
    service = new SQLRagService();

    // Ensure at least one candidate and position exist for testing
    const existingCandidate = await prisma.candidate.findFirst();
    if (!existingCandidate) {
      await prisma.candidate.create({
        data: {
          id: 'test-cand-sqlrag-001',
          name: 'Test SQL RAG Candidate',
          email: 'sqlrag@example.com',
          phone: '555-9999',
          skills: ['JavaScript', 'TypeScript', 'React'],
          status: 'ACTIVE',
        },
      });
    }

    const existingPosition = await prisma.position.findFirst();
    if (!existingPosition) {
      await prisma.position.create({
        data: {
          id: 'test-pos-sqlrag-001',
          title: 'Test Position',
          department: 'Engineering',
          description: 'Test position for SQL RAG',
        },
      });
    }
  });

  describe('ask', () => {
    it('should successfully process a valid question about candidates', async () => {
      const result = await service.ask('List all candidates');

      expect(result.success).toBe(true);
      expect(result.answer).toBeDefined();
      expect(result.trace).toBeDefined();
      expect(result.trace?.question).toBe('List all candidates');
      expect(result.trace?.sqlGeneration).toBeDefined();
      expect(result.trace?.sqlExecution).toBeDefined();
      expect(result.trace?.answerGeneration).toBeDefined();
      expect(result.totalMetrics).toBeDefined();
      expect(result.totalMetrics?.llmCalls).toBe(2);
    }, 60000);

    it('should reject empty questions', async () => {
      const result = await service.ask('');

      expect(result.success).toBe(false);
      expect(result.error).toContain('empty');
    });

    it('should reject whitespace-only questions', async () => {
      const result = await service.ask('   \n\t  ');

      expect(result.success).toBe(false);
      expect(result.error).toContain('empty');
    });

    it('should reject irrelevant questions', async () => {
      const result = await service.ask('What is the weather today?');

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.trace?.relevance?.isRelevant).toBe(false);
      expect(result.suggestion).toBeDefined();
    });

    it('should suggest clarification for ambiguous questions', async () => {
      const result = await service.ask('How many are there?');

      expect(result.success).toBe(false);
      expect(result.error).toContain('ambiguous');
      expect(result.suggestion).toBeDefined();
      expect(result.trace?.relevance?.suggestion).toBeDefined();
    });

    it('should include SQL generation trace', async () => {
      const result = await service.ask('List all positions');

      if (result.success) {
        expect(result.trace?.sqlGeneration?.sql).toBeDefined();
        expect(result.trace?.sqlGeneration?.reasoning).toBeDefined();
        expect(result.trace?.sqlGeneration?.validation).toBeDefined();
        expect(result.trace?.sqlGeneration?.validation.isValid).toBe(true);
        expect(result.trace?.sqlGeneration?.metrics).toBeDefined();
      }
    }, 60000);

    it('should include SQL execution trace', async () => {
      const result = await service.ask('How many candidates are there?');

      if (result.success) {
        expect(result.trace?.sqlExecution?.rowCount).toBeDefined();
        expect(result.trace?.sqlExecution?.columns).toBeDefined();
        expect(result.trace?.sqlExecution?.executionTimeMs).toBeGreaterThan(0);
      }
    }, 60000);

    it('should include answer generation trace', async () => {
      const result = await service.ask('Show me all departments');

      if (result.success) {
        expect(result.trace?.answerGeneration?.metrics).toBeDefined();
        expect(result.trace?.answerGeneration?.metrics.modelName).toBeDefined();
        expect(result.trace?.answerGeneration?.metrics.totalTokens).toBeGreaterThan(0);
      }
    }, 60000);

    it('should calculate total metrics correctly', async () => {
      const result = await service.ask('List candidates with React experience');

      if (result.success) {
        expect(result.totalMetrics?.totalTokens).toBeGreaterThan(0);
        expect(result.totalMetrics?.totalCostUsd).toBeGreaterThanOrEqual(0);
        expect(result.totalMetrics?.totalLatencyMs).toBeGreaterThan(0);
        expect(result.totalMetrics?.llmCalls).toBe(2);

        // Verify total tokens is sum of both LLM calls
        const sqlTokens = result.trace?.sqlGeneration?.metrics.totalTokens || 0;
        const answerTokens = result.trace?.answerGeneration?.metrics.totalTokens || 0;
        expect(result.totalMetrics?.totalTokens).toBe(sqlTokens + answerTokens);
      }
    }, 60000);

    it('should handle questions with no results gracefully', async () => {
      const result = await service.ask('Find candidates with extremely rare skill XYZABC123');

      expect(result.success).toBe(true);
      expect(result.answer).toBeDefined();
      expect(result.trace?.sqlExecution?.rowCount).toBe(0);
    }, 60000);

    it('should work with different models if specified', async () => {
      const result = await service.ask('List all candidates', 'amazon.nova-lite-v1:0');

      if (result.success) {
        expect(result.trace?.sqlGeneration?.metrics.modelName).toContain('nova');
      }
    }, 60000);

    it('should process candidate-related questions', async () => {
      const result = await service.ask('How many active candidates are there?');

      expect(result.success).toBe(true);
      expect(result.answer).toBeDefined();
      expect(result.trace?.sqlGeneration?.sql?.toLowerCase()).toContain('candidate');
    }, 60000);

    it('should process position-related questions', async () => {
      const result = await service.ask('List all open positions');

      expect(result.success).toBe(true);
      expect(result.answer).toBeDefined();
      expect(result.trace?.sqlGeneration?.sql?.toLowerCase()).toContain('position');
    }, 60000);

    it('should handle complex queries with JOINs', async () => {
      const result = await service.ask('Which positions do not have any candidates?');

      expect(result.success).toBe(true);
      expect(result.answer).toBeDefined();
      if (result.trace?.sqlGeneration?.sql) {
        const sqlUpper = result.trace.sqlGeneration.sql.toUpperCase();
        expect(sqlUpper).toContain('JOIN');
      }
    }, 60000);
  });
});
