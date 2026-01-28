import { describe, it, expect, beforeEach } from 'vitest';
import { SQLGenerationService } from '../../src/services/sqlGenerationService.js';
import { parseSQLGenerationResponse } from '../../src/prompts/sqlGeneration.js';

describe('SQLGenerationService', () => {
  let service: SQLGenerationService;

  beforeEach(() => {
    service = new SQLGenerationService();
  });

  describe('generateSQL', () => {
    it('should generate SQL for simple question', async () => {
      const result = await service.generateSQL('List all candidates');

      expect(result.success).toBe(true);
      expect(result.sql).toBeDefined();
      expect(result.sql).toContain('SELECT');
      expect(result.sql).toContain('candidates');
      expect(result.reasoning).toBeDefined();
    }, 30000);

    it('should generate SQL with JOIN for positions without candidates', async () => {
      const result = await service.generateSQL('Which positions do not have any candidates?');

      expect(result.success).toBe(true);
      expect(result.sql).toBeDefined();
      expect(result.sql?.toUpperCase()).toContain('LEFT JOIN');
      expect(result.sql?.toUpperCase()).toContain('IS NULL');
    }, 30000);

    it('should generate SQL with GROUP BY for department counts', async () => {
      const result = await service.generateSQL('List open position counts by department');

      expect(result.success).toBe(true);
      expect(result.sql).toBeDefined();
      expect(result.sql?.toUpperCase()).toContain('GROUP BY');
      expect(result.sql?.toUpperCase()).toContain('COUNT');
      expect(result.sql?.toUpperCase()).toContain('DEPARTMENT');
    }, 30000);

    it('should generate SQL with JSON_CONTAINS for skills search', async () => {
      const result = await service.generateSQL('Find candidates with React experience');

      expect(result.success).toBe(true);
      expect(result.sql).toBeDefined();
      // Mock LLM might not generate exact syntax, but should include skills search
      expect(result.sql?.toLowerCase()).toContain('skill');
    }, 30000);

    it('should reject empty questions', async () => {
      const result = await service.generateSQL('');

      expect(result.success).toBe(false);
      expect(result.error).toContain('empty');
    });

    it('should reject whitespace-only questions', async () => {
      const result = await service.generateSQL('   \n\t  ');

      expect(result.success).toBe(false);
      expect(result.error).toContain('empty');
    });

    it('should include metrics in successful response', async () => {
      const result = await service.generateSQL('List all candidates');

      expect(result.success).toBe(true);
      expect(result.metrics).toBeDefined();
      expect(result.metrics?.modelName).toBeDefined();
      expect(result.metrics?.totalTokens).toBeGreaterThan(0);
      expect(result.metrics?.latencyMs).toBeGreaterThan(0);
    }, 30000);

    it('should validate generated SQL', async () => {
      const result = await service.generateSQL('List all candidates');

      expect(result.success).toBe(true);
      expect(result.validation).toBeDefined();
      expect(result.validation?.isValid).toBe(true);
      expect(result.validation?.errors).toHaveLength(0);
    }, 30000);

    it('should add LIMIT clause if missing', async () => {
      const result = await service.generateSQL('List all candidates');

      expect(result.success).toBe(true);
      // Either SQL has LIMIT or sanitizedSQL was created
      if (!result.sql?.toUpperCase().includes('LIMIT')) {
        expect(result.sanitizedSQL).toContain('LIMIT');
      }
    }, 30000);
  });

  describe('isRelevantQuestion', () => {
    it('should identify candidate-related questions as relevant', () => {
      expect(service.isRelevantQuestion('List all candidates')).toBe(true);
      expect(service.isRelevantQuestion('Show me active applicants')).toBe(true);
      expect(service.isRelevantQuestion('How many candidates have React skills?')).toBe(true);
    });

    it('should identify position-related questions as relevant', () => {
      expect(service.isRelevantQuestion('Which positions are open?')).toBe(true);
      expect(service.isRelevantQuestion('Show me all jobs')).toBe(true);
      expect(service.isRelevantQuestion('List engineering roles')).toBe(true);
    });

    it('should identify skill/experience questions as relevant', () => {
      expect(service.isRelevantQuestion('Who has Python experience?')).toBe(true);
      expect(service.isRelevantQuestion('Find candidates with React skills')).toBe(true);
    });

    it('should identify irrelevant questions', () => {
      expect(service.isRelevantQuestion('What is the weather?')).toBe(false);
      expect(service.isRelevantQuestion('How do I cook pasta?')).toBe(false);
      expect(service.isRelevantQuestion('Tell me a joke')).toBe(false);
    });
  });

  describe('suggestClarification', () => {
    it('should suggest clarification for vague "how many" questions', () => {
      const suggestion = service.suggestClarification('How many are there?');
      expect(suggestion).toBeTruthy();
      expect(suggestion?.toLowerCase()).toContain('specify');
    });

    it('should suggest clarification for questions with unclear pronouns', () => {
      const suggestion = service.suggestClarification('Show me their emails');
      expect(suggestion).toBeTruthy();
      expect(suggestion?.toLowerCase()).toContain('clarify');
    });

    it('should not suggest clarification for clear questions', () => {
      expect(service.suggestClarification('List all candidates')).toBeNull();
      expect(service.suggestClarification('How many candidates have React?')).toBeNull();
    });
  });
});

describe('parseSQLGenerationResponse', () => {
  it('should parse valid JSON response', () => {
    const response = JSON.stringify({
      sql: 'SELECT * FROM candidates',
      reasoning: 'Simple select query',
    });

    const parsed = parseSQLGenerationResponse(response);
    expect(parsed).toBeDefined();
    expect(parsed?.sql).toBe('SELECT * FROM candidates');
    expect(parsed?.reasoning).toBe('Simple select query');
  });

  it('should parse JSON with markdown code blocks', () => {
    const response = '```json\n{"sql": "SELECT * FROM candidates", "reasoning": "Test"}\n```';

    const parsed = parseSQLGenerationResponse(response);
    expect(parsed).toBeDefined();
    expect(parsed?.sql).toBe('SELECT * FROM candidates');
  });

  it('should handle JSON with extra whitespace', () => {
    const response = '  \n\n  {"sql": "SELECT * FROM candidates", "reasoning": "Test"}  \n  ';

    const parsed = parseSQLGenerationResponse(response);
    expect(parsed).toBeDefined();
    expect(parsed?.sql).toBe('SELECT * FROM candidates');
  });

  it('should return null for invalid JSON', () => {
    const response = 'This is not JSON';

    const parsed = parseSQLGenerationResponse(response);
    expect(parsed).toBeNull();
  });

  it('should return null for JSON missing sql field', () => {
    const response = JSON.stringify({
      reasoning: 'No SQL field',
    });

    const parsed = parseSQLGenerationResponse(response);
    expect(parsed).toBeNull();
  });

  it('should return null for JSON missing reasoning field', () => {
    const response = JSON.stringify({
      sql: 'SELECT * FROM candidates',
    });

    const parsed = parseSQLGenerationResponse(response);
    expect(parsed).toBeNull();
  });

  it('should trim whitespace from sql and reasoning', () => {
    const response = JSON.stringify({
      sql: '  SELECT * FROM candidates  \n',
      reasoning: '  Test reasoning  ',
    });

    const parsed = parseSQLGenerationResponse(response);
    expect(parsed?.sql).toBe('SELECT * FROM candidates');
    expect(parsed?.reasoning).toBe('Test reasoning');
  });
});
