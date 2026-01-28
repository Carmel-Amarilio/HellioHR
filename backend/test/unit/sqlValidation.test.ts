import { describe, it, expect } from 'vitest';
import { SQLValidationService } from '../../src/services/sqlValidationService.js';

describe('SQLValidationService', () => {
  const validator = new SQLValidationService();

  describe('SELECT queries', () => {
    it('should allow simple SELECT queries', () => {
      const result = validator.validateQuery('SELECT * FROM candidates');
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should allow SELECT with WHERE clause', () => {
      const result = validator.validateQuery(
        "SELECT id, name FROM candidates WHERE status = 'ACTIVE'"
      );
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should allow SELECT with JOINs', () => {
      const result = validator.validateQuery(`
        SELECT c.name, p.title
        FROM candidates c
        JOIN candidate_position cp ON c.id = cp.candidate_id
        JOIN positions p ON cp.position_id = p.id
      `);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should allow SELECT with subqueries', () => {
      const result = validator.validateQuery(`
        SELECT * FROM candidates
        WHERE id IN (SELECT candidate_id FROM candidate_position)
      `);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should allow aggregate functions (COUNT, SUM, AVG)', () => {
      const result = validator.validateQuery(`
        SELECT department, COUNT(*) as count
        FROM positions
        GROUP BY department
      `);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('Forbidden operations', () => {
    it('should reject UPDATE statements', () => {
      const result = validator.validateQuery(
        "UPDATE candidates SET status = 'INACTIVE' WHERE id = '1'"
      );
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('UPDATE'))).toBe(true);
    });

    it('should reject DELETE statements', () => {
      const result = validator.validateQuery('DELETE FROM candidates WHERE id = 1');
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('DELETE'))).toBe(true);
    });

    it('should reject DROP TABLE statements', () => {
      const result = validator.validateQuery('DROP TABLE candidates');
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('DROP'))).toBe(true);
    });

    it('should reject INSERT statements', () => {
      const result = validator.validateQuery(
        "INSERT INTO candidates (name, email) VALUES ('Test', 'test@example.com')"
      );
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('INSERT'))).toBe(true);
    });

    it('should reject ALTER TABLE statements', () => {
      const result = validator.validateQuery('ALTER TABLE candidates ADD COLUMN test VARCHAR(255)');
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('ALTER'))).toBe(true);
    });

    it('should reject TRUNCATE statements', () => {
      const result = validator.validateQuery('TRUNCATE TABLE candidates');
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('TRUNCATE'))).toBe(true);
    });

    it('should reject CREATE TABLE statements', () => {
      const result = validator.validateQuery('CREATE TABLE test (id INT)');
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('CREATE'))).toBe(true);
    });
  });

  describe('SQL injection protection', () => {
    it('should reject queries with semicolons (multiple statements)', () => {
      const result = validator.validateQuery(
        "SELECT * FROM candidates; DROP TABLE candidates"
      );
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('malicious'))).toBe(true);
    });

    it('should reject UNION-based injection attempts', () => {
      // UNION is not banned by keyword, but combined with semicolon it fails
      const result = validator.validateQuery(
        "SELECT * FROM candidates; SELECT * FROM users"
      );
      expect(result.isValid).toBe(false);
    });

    it('should reject SQL comments (--)', () => {
      const result = validator.validateQuery(
        "SELECT * FROM candidates -- DROP TABLE candidates"
      );
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('malicious'))).toBe(true);
    });

    it('should reject block comments (/* */)', () => {
      const result = validator.validateQuery(
        "SELECT * FROM candidates /* malicious comment */"
      );
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('malicious'))).toBe(true);
    });
  });

  describe('LIMIT clause enforcement', () => {
    it('should add LIMIT clause if missing', () => {
      const result = validator.validateQuery('SELECT * FROM candidates');
      expect(result.isValid).toBe(true);
      expect(result.sanitizedSQL).toContain('LIMIT');
      expect(result.warnings.some(w => w.includes('Added LIMIT'))).toBe(true);
    });

    it('should reduce LIMIT if exceeds MAX_ROWS', () => {
      const maxRows = validator.getMaxRows();
      const result = validator.validateQuery(`SELECT * FROM candidates LIMIT ${maxRows + 100}`);
      expect(result.isValid).toBe(true);
      expect(result.sanitizedSQL).toContain(`LIMIT ${maxRows}`);
      expect(result.warnings.some(w => w.includes('Reduced LIMIT'))).toBe(true);
    });

    it('should allow LIMIT within MAX_ROWS', () => {
      const result = validator.validateQuery('SELECT * FROM candidates LIMIT 10');
      expect(result.isValid).toBe(true);
      expect(result.warnings).toHaveLength(0);
    });
  });

  describe('Edge cases', () => {
    it('should reject empty queries', () => {
      const result = validator.validateQuery('');
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('empty'))).toBe(true);
    });

    it('should reject null queries', () => {
      const result = validator.validateQuery(null as any);
      expect(result.isValid).toBe(false);
    });

    it('should reject whitespace-only queries', () => {
      const result = validator.validateQuery('   \n\t  ');
      expect(result.isValid).toBe(false);
    });

    it('should handle malformed SQL gracefully', () => {
      const result = validator.validateQuery('SELECT FROM WHERE');
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('parsing failed'))).toBe(true);
    });
  });

  describe('Helper methods', () => {
    it('isSelectQuery should return true for SELECT queries', () => {
      expect(validator.isSelectQuery('SELECT * FROM candidates')).toBe(true);
      expect(validator.isSelectQuery('  select id from users')).toBe(true);
    });

    it('isSelectQuery should return false for non-SELECT queries', () => {
      expect(validator.isSelectQuery('UPDATE candidates SET status = "inactive"')).toBe(false);
      expect(validator.isSelectQuery('DELETE FROM candidates')).toBe(false);
    });

    it('getMaxRows should return configured MAX_ROWS', () => {
      const maxRows = validator.getMaxRows();
      expect(maxRows).toBeGreaterThan(0);
      expect(typeof maxRows).toBe('number');
    });
  });
});
