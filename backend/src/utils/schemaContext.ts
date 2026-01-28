/**
 * Schema Context Generator
 *
 * Generates a JSON representation of the database schema for LLM prompts.
 * Includes table names, columns, types, relationships, and sample values.
 */

export interface ColumnInfo {
  name: string;
  type: string;
  nullable: boolean;
  isPrimaryKey?: boolean;
  isForeignKey?: boolean;
  references?: { table: string; column: string };
}

export interface TableInfo {
  name: string;
  description: string;
  columns: ColumnInfo[];
  relationships?: string[];
  sampleValues?: Record<string, any>;
}

export interface SchemaContext {
  database: string;
  tables: TableInfo[];
  relationships: string[];
}

/**
 * Get schema context for SQL generation
 *
 * This provides the LLM with:
 * - Table and column names
 * - Data types
 * - Relationships (foreign keys)
 * - Descriptions of what each table stores
 * - Sample values to understand data format
 */
export function getSchemaContext(): SchemaContext {
  return {
    database: 'hellio_hr',
    tables: [
      {
        name: 'candidates',
        description: 'Stores candidate information including personal details and extracted data from CVs',
        columns: [
          { name: 'id', type: 'VARCHAR(255)', nullable: false, isPrimaryKey: true },
          { name: 'name', type: 'VARCHAR(255)', nullable: false },
          { name: 'email', type: 'VARCHAR(255)', nullable: false },
          { name: 'phone', type: 'VARCHAR(255)', nullable: false },
          { name: 'skills', type: 'JSON', nullable: false }, // Array of strings like ["React", "Node.js"]
          { name: 'cv_url', type: 'VARCHAR(255)', nullable: true },
          { name: 'status', type: 'ENUM("ACTIVE", "INACTIVE")', nullable: false },
          { name: 'created_at', type: 'DATETIME', nullable: false },
          { name: 'updated_at', type: 'DATETIME', nullable: false },
          // Extraction fields from Exercise 3
          { name: 'extracted_summary', type: 'TEXT', nullable: true },
          { name: 'extracted_experience', type: 'JSON', nullable: true }, // Array of {company, role, duration, achievements}
          { name: 'extracted_education', type: 'JSON', nullable: true }, // Array of {degree, institution, year}
          { name: 'last_extraction_date', type: 'DATETIME', nullable: true },
          { name: 'extraction_method', type: 'VARCHAR(255)', nullable: true }, // "heuristic", "llm", "hybrid"
          { name: 'extraction_status', type: 'VARCHAR(255)', nullable: true }, // "pending", "success", "partial", "failed"
        ],
        relationships: [
          'One candidate can apply to many positions (via candidate_position)',
          'One candidate can have many documents',
        ],
        sampleValues: {
          id: 'cand-001',
          name: 'Alice Johnson',
          email: 'alice.johnson@email.com',
          skills: '["React", "TypeScript", "Node.js"]',
          status: 'ACTIVE',
          extracted_summary: 'Frontend developer with 5+ years of experience...',
        },
      },
      {
        name: 'positions',
        description: 'Stores job position information including requirements and extracted data from job descriptions',
        columns: [
          { name: 'id', type: 'VARCHAR(255)', nullable: false, isPrimaryKey: true },
          { name: 'title', type: 'VARCHAR(255)', nullable: false },
          { name: 'department', type: 'VARCHAR(255)', nullable: false },
          { name: 'description', type: 'TEXT', nullable: false },
          { name: 'created_at', type: 'DATETIME', nullable: false },
          { name: 'updated_at', type: 'DATETIME', nullable: false },
          // Extraction fields from Exercise 3
          { name: 'extracted_summary', type: 'TEXT', nullable: true },
          { name: 'extracted_requirements', type: 'JSON', nullable: true }, // Array of {type, skill, yearsExp}
          { name: 'extracted_responsibilities', type: 'JSON', nullable: true }, // Array of {responsibility, category}
          { name: 'last_extraction_date', type: 'DATETIME', nullable: true },
          { name: 'extraction_method', type: 'VARCHAR(255)', nullable: true },
          { name: 'extraction_status', type: 'VARCHAR(255)', nullable: true },
        ],
        relationships: [
          'One position can have many candidates (via candidate_position)',
          'One position can have many documents',
        ],
        sampleValues: {
          id: 'pos-001',
          title: 'Frontend Developer',
          department: 'Engineering',
          description: 'We are looking for an experienced frontend developer...',
          extracted_summary: 'Senior frontend role requiring React expertise...',
        },
      },
      {
        name: 'candidate_position',
        description: 'Junction table linking candidates to positions they applied for',
        columns: [
          { name: 'candidate_id', type: 'VARCHAR(255)', nullable: false, isForeignKey: true, references: { table: 'candidates', column: 'id' } },
          { name: 'position_id', type: 'VARCHAR(255)', nullable: false, isForeignKey: true, references: { table: 'positions', column: 'id' } },
          { name: 'assigned_at', type: 'DATETIME', nullable: false },
        ],
        relationships: [
          'Links candidates to positions (many-to-many)',
        ],
        sampleValues: {
          candidate_id: 'cand-001',
          position_id: 'pos-001',
          assigned_at: '2026-01-15 10:30:00',
        },
      },
      {
        name: 'users',
        description: 'Application users with authentication credentials and roles',
        columns: [
          { name: 'id', type: 'VARCHAR(255)', nullable: false, isPrimaryKey: true },
          { name: 'email', type: 'VARCHAR(255)', nullable: false },
          { name: 'password_hash', type: 'VARCHAR(255)', nullable: false },
          { name: 'role', type: 'ENUM("VIEWER", "EDITOR")', nullable: false },
          { name: 'created_at', type: 'DATETIME', nullable: false },
          { name: 'updated_at', type: 'DATETIME', nullable: false },
        ],
        relationships: [],
        sampleValues: {
          email: 'viewer@hellio.hr',
          role: 'VIEWER',
        },
      },
      {
        name: 'documents',
        description: 'Stores metadata about uploaded documents (CVs, job descriptions)',
        columns: [
          { name: 'id', type: 'VARCHAR(255)', nullable: false, isPrimaryKey: true },
          { name: 'type', type: 'ENUM("CV", "JOB_DESCRIPTION")', nullable: false },
          { name: 'file_name', type: 'VARCHAR(255)', nullable: false },
          { name: 'file_path', type: 'VARCHAR(255)', nullable: false },
          { name: 'candidate_id', type: 'VARCHAR(255)', nullable: true, isForeignKey: true, references: { table: 'candidates', column: 'id' } },
          { name: 'position_id', type: 'VARCHAR(255)', nullable: true, isForeignKey: true, references: { table: 'positions', column: 'id' } },
          { name: 'created_at', type: 'DATETIME', nullable: false },
        ],
        relationships: [
          'Belongs to either a candidate (CV) or position (job description)',
        ],
      },
    ],
    relationships: [
      'candidates.id → candidate_position.candidate_id (one-to-many)',
      'positions.id → candidate_position.position_id (one-to-many)',
      'candidates.id → documents.candidate_id (one-to-many)',
      'positions.id → documents.position_id (one-to-many)',
    ],
  };
}

/**
 * Format schema context as a human-readable string for LLM prompts
 */
export function formatSchemaForPrompt(): string {
  const schema = getSchemaContext();

  let output = `Database: ${schema.database}\n\n`;
  output += 'Tables:\n\n';

  for (const table of schema.tables) {
    output += `## ${table.name}\n`;
    output += `${table.description}\n\n`;
    output += 'Columns:\n';

    for (const col of table.columns) {
      const pk = col.isPrimaryKey ? ' [PRIMARY KEY]' : '';
      const fk = col.isForeignKey ? ` [FOREIGN KEY → ${col.references?.table}.${col.references?.column}]` : '';
      const nullable = col.nullable ? 'NULL' : 'NOT NULL';
      output += `- ${col.name}: ${col.type} (${nullable})${pk}${fk}\n`;
    }

    if (table.sampleValues) {
      output += '\nSample values:\n';
      output += JSON.stringify(table.sampleValues, null, 2) + '\n';
    }

    output += '\n';
  }

  output += '\nRelationships:\n';
  for (const rel of schema.relationships) {
    output += `- ${rel}\n`;
  }

  return output;
}

/**
 * Get column names for querying JSON fields
 * Helps LLM generate correct JSON queries like JSON_CONTAINS(skills, '"React"')
 */
export function getJSONColumns(): Record<string, string[]> {
  return {
    candidates: ['skills', 'extracted_experience', 'extracted_education'],
    positions: ['extracted_requirements', 'extracted_responsibilities'],
  };
}

/**
 * Get searchable text columns for full-text queries
 */
export function getTextColumns(): Record<string, string[]> {
  return {
    candidates: ['name', 'email', 'extracted_summary'],
    positions: ['title', 'department', 'description', 'extracted_summary'],
  };
}
