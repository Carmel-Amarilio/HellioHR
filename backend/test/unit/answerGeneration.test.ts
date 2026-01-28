import { describe, it, expect, beforeEach } from 'vitest';
import { AnswerGenerationService } from '../../src/services/answerGenerationService.js';
import { buildAnswerGenerationPrompt, parseAnswerGenerationResponse } from '../../src/prompts/answerGeneration.js';

describe('AnswerGenerationService', () => {
  let service: AnswerGenerationService;

  beforeEach(() => {
    service = new AnswerGenerationService();
  });

  describe('generateAnswer', () => {
    it('should generate answer for query with results', async () => {
      const question = 'List all candidates with JavaScript experience';
      const sql = 'SELECT id, name, email FROM candidates WHERE JSON_CONTAINS(skills, \'"JavaScript"\') LIMIT 10';
      const rows = [
        { id: 'cand-001', name: 'John Doe', email: 'john@example.com' },
        { id: 'cand-002', name: 'Jane Smith', email: 'jane@example.com' },
      ];
      const columns = ['id', 'name', 'email'];

      const result = await service.generateAnswer(question, sql, rows, columns);

      expect(result.success).toBe(true);
      expect(result.answer).toBeDefined();
      expect(result.answer!.length).toBeGreaterThan(0);
      expect(result.trace).toBeDefined();
      expect(result.trace?.question).toBe(question);
      expect(result.trace?.sql).toBe(sql);
      expect(result.trace?.rowCount).toBe(2);
      expect(result.trace?.columns).toEqual(columns);
    }, 30000);

    it('should generate answer for query with no results', async () => {
      const question = 'Find candidates with Haskell experience';
      const sql = 'SELECT id, name FROM candidates WHERE JSON_CONTAINS(skills, \'"Haskell"\') LIMIT 10';
      const rows: any[] = [];
      const columns: string[] = [];

      const result = await service.generateAnswer(question, sql, rows, columns);

      expect(result.success).toBe(true);
      expect(result.answer).toBeDefined();
      expect(result.trace?.rowCount).toBe(0);
    }, 30000);

    it('should generate answer for aggregate query', async () => {
      const question = 'How many candidates are in the database?';
      const sql = 'SELECT COUNT(*) as total FROM candidates';
      const rows = [{ total: 5 }];
      const columns = ['total'];

      const result = await service.generateAnswer(question, sql, rows, columns);

      expect(result.success).toBe(true);
      expect(result.answer).toBeDefined();
      expect(result.trace?.rowCount).toBe(1);
    }, 30000);

    it('should include metrics in successful response', async () => {
      const question = 'List all positions';
      const sql = 'SELECT id, title FROM positions LIMIT 10';
      const rows = [{ id: 'pos-001', title: 'Developer' }];
      const columns = ['id', 'title'];

      const result = await service.generateAnswer(question, sql, rows, columns);

      expect(result.success).toBe(true);
      expect(result.metrics).toBeDefined();
      expect(result.metrics?.modelName).toBeDefined();
      expect(result.metrics?.totalTokens).toBeGreaterThan(0);
      expect(result.metrics?.latencyMs).toBeGreaterThan(0);
      expect(result.metrics?.estimatedCostUsd).toBeGreaterThanOrEqual(0);
    }, 30000);

    it('should handle queries with JSON columns', async () => {
      const question = 'What skills do candidates have?';
      const sql = 'SELECT name, skills FROM candidates LIMIT 5';
      const rows = [
        { name: 'John Doe', skills: ['JavaScript', 'React', 'Node.js'] },
        { name: 'Jane Smith', skills: ['Python', 'Django'] },
      ];
      const columns = ['name', 'skills'];

      const result = await service.generateAnswer(question, sql, rows, columns);

      expect(result.success).toBe(true);
      expect(result.answer).toBeDefined();
    }, 30000);

    it('should include trace information', async () => {
      const question = 'Show me all departments';
      const sql = 'SELECT DISTINCT department FROM positions';
      const rows = [
        { department: 'Engineering' },
        { department: 'Product' },
      ];
      const columns = ['department'];

      const result = await service.generateAnswer(question, sql, rows, columns);

      expect(result.success).toBe(true);
      expect(result.trace).toBeDefined();
      expect(result.trace?.question).toBe(question);
      expect(result.trace?.sql).toBe(sql);
      expect(result.trace?.rowCount).toBe(2);
      expect(result.trace?.columns).toEqual(['department']);
    }, 30000);
  });
});

describe('buildAnswerGenerationPrompt', () => {
  it('should build prompt with all required sections', () => {
    const question = 'List all candidates';
    const sql = 'SELECT id, name FROM candidates LIMIT 10';
    const rows = [{ id: 'cand-001', name: 'John Doe' }];
    const columns = ['id', 'name'];

    const prompt = buildAnswerGenerationPrompt(question, sql, rows, rows.length, columns);

    expect(prompt).toContain('QUESTION:');
    expect(prompt).toContain(question);
    expect(prompt).toContain('SQL QUERY EXECUTED:');
    expect(prompt).toContain(sql);
    expect(prompt).toContain('RETRIEVED DATA:');
    expect(prompt).toContain('1 row(s) returned');
  });

  it('should handle empty result set', () => {
    const question = 'Find nonexistent data';
    const sql = 'SELECT * FROM candidates WHERE id = \'fake\'';
    const rows: any[] = [];
    const columns: string[] = [];

    const prompt = buildAnswerGenerationPrompt(question, sql, rows, 0, columns);

    expect(prompt).toContain('QUESTION:');
    expect(prompt).toContain('No rows returned');
  });

  it('should include grounding instructions', () => {
    const question = 'Any question';
    const sql = 'SELECT id FROM candidates';
    const rows = [{ id: 'cand-001' }];
    const columns = ['id'];

    const prompt = buildAnswerGenerationPrompt(question, sql, rows, rows.length, columns);

    expect(prompt.toLowerCase()).toContain('grounded');
    expect(prompt.toLowerCase()).toContain('retrieved data');
    expect(prompt.toLowerCase()).toContain('only');
  });
});

describe('parseAnswerGenerationResponse', () => {
  it('should parse valid text response', () => {
    const response = '3 candidates were found matching your criteria:\n• John Doe\n• Jane Smith\n• Bob Wilson';

    const parsed = parseAnswerGenerationResponse(response);
    expect(parsed).toBeDefined();
    expect(parsed?.answer).toBe(response);
  });

  it('should trim whitespace', () => {
    const response = '  \n\nHere is the answer\n\n  ';

    const parsed = parseAnswerGenerationResponse(response);
    expect(parsed?.answer).toBe('Here is the answer');
  });

  it('should return null for empty response', () => {
    const response = '';

    const parsed = parseAnswerGenerationResponse(response);
    expect(parsed).toBeNull();
  });

  it('should return null for whitespace-only response', () => {
    const response = '   \n\n   \t   ';

    const parsed = parseAnswerGenerationResponse(response);
    expect(parsed).toBeNull();
  });
});
