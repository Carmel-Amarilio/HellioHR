import { describe, it, expect, beforeAll } from 'vitest';
import { SQLExecutionService } from '../../src/services/sqlExecutionService.js';
import { prisma } from '../../src/config/database.js';

describe('SQLExecutionService', () => {
  let service: SQLExecutionService;

  beforeAll(async () => {
    service = new SQLExecutionService();

    // Ensure at least one candidate exists for testing
    const existingCandidate = await prisma.candidate.findFirst();
    if (!existingCandidate) {
      await prisma.candidate.create({
        data: {
          id: 'test-cand-001',
          name: 'Test Candidate',
          email: 'test@example.com',
          phone: '555-0100',
          skills: ['JavaScript', 'TypeScript'],
          status: 'ACTIVE',
        },
      });
    }
  });

  describe('executeQuery', () => {
    it('should execute a valid SELECT query and return results', async () => {
      const sql = 'SELECT id, name, email FROM candidates LIMIT 10';
      const result = await service.executeQuery(sql);

      expect(result.success).toBe(true);
      expect(result.rows).toBeDefined();
      expect(Array.isArray(result.rows)).toBe(true);
      expect(result.rowCount).toBeDefined();
      expect(result.columns).toBeDefined();
      expect(result.executionTimeMs).toBeGreaterThan(0);
    }, 10000);

    it('should return empty array for query with no matches', async () => {
      const sql = "SELECT id, name FROM candidates WHERE id = 'nonexistent-id' LIMIT 10";
      const result = await service.executeQuery(sql);

      expect(result.success).toBe(true);
      expect(result.rows).toEqual([]);
      expect(result.rowCount).toBe(0);
      expect(result.columns).toEqual([]);
    }, 10000);

    it('should include column names in result', async () => {
      const sql = 'SELECT id, name, email FROM candidates LIMIT 1';
      const result = await service.executeQuery(sql);

      if (result.success && result.rowCount! > 0) {
        expect(result.columns).toContain('id');
        expect(result.columns).toContain('name');
        expect(result.columns).toContain('email');
      }
    }, 10000);

    it('should handle SQL execution errors gracefully', async () => {
      const sql = 'SELECT * FROM nonexistent_table LIMIT 10';
      const result = await service.executeQuery(sql);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error).toContain('execution failed');
    }, 10000);

    it('should include execution time in result', async () => {
      const sql = 'SELECT COUNT(*) as count FROM candidates LIMIT 10';
      const result = await service.executeQuery(sql);

      expect(result.executionTimeMs).toBeDefined();
      expect(result.executionTimeMs).toBeGreaterThanOrEqual(0);
    }, 10000);

    it('should handle queries with aggregates', async () => {
      const sql = 'SELECT COUNT(*) as total FROM candidates';
      const result = await service.executeQuery(sql);

      expect(result.success).toBe(true);
      expect(result.rows).toBeDefined();
      expect(result.rows![0]).toHaveProperty('total');
    }, 10000);

    it('should handle queries with JSON columns', async () => {
      const sql = 'SELECT id, skills FROM candidates WHERE skills IS NOT NULL LIMIT 1';
      const result = await service.executeQuery(sql);

      if (result.success && result.rowCount! > 0) {
        expect(result.rows![0]).toHaveProperty('skills');
      }
    }, 10000);
  });

  describe('formatRows', () => {
    it('should format empty result set', () => {
      const formatted = service.formatRows([]);
      expect(formatted).toBe('No rows returned');
    });

    it('should format single row result', () => {
      const rows = [{ id: 'cand-001', name: 'John Doe', email: 'john@example.com' }];
      const formatted = service.formatRows(rows);

      expect(formatted).toContain('id | name | email');
      expect(formatted).toContain('cand-001');
      expect(formatted).toContain('John Doe');
      expect(formatted).toContain('john@example.com');
    });

    it('should format multiple rows', () => {
      const rows = [
        { id: 'cand-001', name: 'John Doe' },
        { id: 'cand-002', name: 'Jane Smith' },
      ];
      const formatted = service.formatRows(rows);

      expect(formatted).toContain('Found 2 row(s)');
      expect(formatted).toContain('cand-001');
      expect(formatted).toContain('cand-002');
    });

    it('should limit displayed rows when maxRows specified', () => {
      const rows = Array.from({ length: 20 }, (_, i) => ({
        id: `cand-${String(i + 1).padStart(3, '0')}`,
        name: `Candidate ${i + 1}`,
      }));

      const formatted = service.formatRows(rows, 5);

      expect(formatted).toContain('Found 20 row(s)');
      expect(formatted).toContain('and 15 more row(s)');
      expect(formatted).toContain('cand-001');
      expect(formatted).not.toContain('cand-020');
    });

    it('should handle NULL values', () => {
      const rows = [{ id: 'cand-001', name: 'John', phone: null }];
      const formatted = service.formatRows(rows);

      expect(formatted).toContain('NULL');
    });

    it('should handle array values', () => {
      const rows = [{ id: 'cand-001', skills: ['JavaScript', 'React'] }];
      const formatted = service.formatRows(rows);

      expect(formatted).toContain('JavaScript');
      expect(formatted).toContain('React');
    });
  });
});
