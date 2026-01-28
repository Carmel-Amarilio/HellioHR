import { describe, it, expect } from 'vitest';
import { getSchemaContext, formatSchemaForPrompt, getJSONColumns, getTextColumns } from '../../src/utils/schemaContext.js';

describe('Schema Context Generator', () => {
  describe('getSchemaContext', () => {
    it('should return schema with all tables', () => {
      const schema = getSchemaContext();
      expect(schema.database).toBe('hellio_hr');
      expect(schema.tables).toHaveLength(5); // candidates, positions, candidate_position, users, documents
      expect(schema.relationships).toBeDefined();
    });

    it('should include candidates table with all columns', () => {
      const schema = getSchemaContext();
      const candidates = schema.tables.find(t => t.name === 'candidates');
      expect(candidates).toBeDefined();
      expect(candidates?.columns).toBeDefined();
      expect(candidates?.columns.some(c => c.name === 'id')).toBe(true);
      expect(candidates?.columns.some(c => c.name === 'name')).toBe(true);
      expect(candidates?.columns.some(c => c.name === 'skills')).toBe(true);
      expect(candidates?.columns.some(c => c.name === 'extracted_summary')).toBe(true);
    });

    it('should include positions table with all columns', () => {
      const schema = getSchemaContext();
      const positions = schema.tables.find(t => t.name === 'positions');
      expect(positions).toBeDefined();
      expect(positions?.columns).toBeDefined();
      expect(positions?.columns.some(c => c.name === 'id')).toBe(true);
      expect(positions?.columns.some(c => c.name === 'title')).toBe(true);
      expect(positions?.columns.some(c => c.name === 'department')).toBe(true);
    });

    it('should include candidate_position junction table', () => {
      const schema = getSchemaContext();
      const junction = schema.tables.find(t => t.name === 'candidate_position');
      expect(junction).toBeDefined();
      expect(junction?.columns.some(c => c.name === 'candidate_id')).toBe(true);
      expect(junction?.columns.some(c => c.name === 'position_id')).toBe(true);
    });

    it('should mark primary keys correctly', () => {
      const schema = getSchemaContext();
      const candidates = schema.tables.find(t => t.name === 'candidates');
      const idColumn = candidates?.columns.find(c => c.name === 'id');
      expect(idColumn?.isPrimaryKey).toBe(true);
    });

    it('should mark foreign keys correctly', () => {
      const schema = getSchemaContext();
      const junction = schema.tables.find(t => t.name === 'candidate_position');
      const candIdColumn = junction?.columns.find(c => c.name === 'candidate_id');
      expect(candIdColumn?.isForeignKey).toBe(true);
      expect(candIdColumn?.references).toEqual({ table: 'candidates', column: 'id' });
    });
  });

  describe('formatSchemaForPrompt', () => {
    it('should format schema as readable string', () => {
      const formatted = formatSchemaForPrompt();
      expect(formatted).toContain('Database: hellio_hr');
      expect(formatted).toContain('## candidates');
      expect(formatted).toContain('## positions');
      expect(formatted).toContain('## candidate_position');
    });

    it('should include column information', () => {
      const formatted = formatSchemaForPrompt();
      expect(formatted).toContain('- id:');
      expect(formatted).toContain('[PRIMARY KEY]');
      expect(formatted).toContain('[FOREIGN KEY');
    });

    it('should include sample values', () => {
      const formatted = formatSchemaForPrompt();
      expect(formatted).toContain('Sample values:');
      expect(formatted).toContain('cand-001');
      expect(formatted).toContain('pos-001');
    });

    it('should include relationships', () => {
      const formatted = formatSchemaForPrompt();
      expect(formatted).toContain('Relationships:');
      expect(formatted).toContain('candidates.id');
      expect(formatted).toContain('positions.id');
    });
  });

  describe('getJSONColumns', () => {
    it('should return JSON columns for candidates', () => {
      const jsonColumns = getJSONColumns();
      expect(jsonColumns.candidates).toContain('skills');
      expect(jsonColumns.candidates).toContain('extracted_experience');
      expect(jsonColumns.candidates).toContain('extracted_education');
    });

    it('should return JSON columns for positions', () => {
      const jsonColumns = getJSONColumns();
      expect(jsonColumns.positions).toContain('extracted_requirements');
      expect(jsonColumns.positions).toContain('extracted_responsibilities');
    });
  });

  describe('getTextColumns', () => {
    it('should return searchable text columns for candidates', () => {
      const textColumns = getTextColumns();
      expect(textColumns.candidates).toContain('name');
      expect(textColumns.candidates).toContain('email');
      expect(textColumns.candidates).toContain('extracted_summary');
    });

    it('should return searchable text columns for positions', () => {
      const textColumns = getTextColumns();
      expect(textColumns.positions).toContain('title');
      expect(textColumns.positions).toContain('department');
      expect(textColumns.positions).toContain('description');
      expect(textColumns.positions).toContain('extracted_summary');
    });
  });
});
