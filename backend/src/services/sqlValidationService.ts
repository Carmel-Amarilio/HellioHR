/**
 * SQL Validation Service
 *
 * Provides safety layer for LLM-generated SQL queries:
 * - Ensures only SELECT statements are allowed
 * - Detects and blocks SQL injection patterns
 * - Enforces row limits
 * - Validates query structure
 */

import { Parser } from 'node-sql-parser';

const parser = new Parser();

// Configuration
const MAX_ROWS = parseInt(process.env.SQL_RAG_MAX_ROWS || '1000', 10);

// Banned keywords that indicate destructive operations
const BANNED_KEYWORDS = [
  'INSERT', 'UPDATE', 'DELETE', 'DROP', 'ALTER',
  'CREATE', 'TRUNCATE', 'GRANT', 'REVOKE',
  'EXEC', 'EXECUTE', 'CALL', 'LOAD',
];

// SQL injection patterns to detect
const INJECTION_PATTERNS = [
  /;/, // Multiple statements
  /--/, // SQL comment
  /\/\*/, // Block comment start
  /\*\//, // Block comment end
  /xp_/, // Extended stored procedures
  /sp_/, // System stored procedures
];

export interface ValidationResult {
  isValid: boolean;
  sanitizedSQL?: string;
  errors: string[];
  warnings: string[];
}

export class SQLValidationService {
  /**
   * Validate a SQL query for safety
   */
  validateQuery(sql: string): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Step 1: Basic string validation
    if (!sql || typeof sql !== 'string') {
      return {
        isValid: false,
        errors: ['Query must be a non-empty string'],
        warnings: [],
      };
    }

    const trimmedSQL = sql.trim();
    if (trimmedSQL.length === 0) {
      return {
        isValid: false,
        errors: ['Query cannot be empty'],
        warnings: [],
      };
    }

    // Step 2: Check for SQL injection patterns
    for (const pattern of INJECTION_PATTERNS) {
      if (pattern.test(trimmedSQL)) {
        errors.push(`Detected potentially malicious pattern: ${pattern}`);
      }
    }

    // Step 3: Check for banned keywords (case-insensitive)
    const upperSQL = trimmedSQL.toUpperCase();
    for (const keyword of BANNED_KEYWORDS) {
      // Use word boundaries to avoid false positives
      const regex = new RegExp(`\\b${keyword}\\b`, 'i');
      if (regex.test(trimmedSQL)) {
        errors.push(`Forbidden keyword detected: ${keyword}`);
      }
    }

    // Step 4: Parse SQL with node-sql-parser
    let ast;
    try {
      ast = parser.astify(trimmedSQL, { database: 'MySQL' });
    } catch (parseError) {
      errors.push(`SQL parsing failed: ${parseError instanceof Error ? parseError.message : String(parseError)}`);
      return { isValid: false, errors, warnings };
    }

    // Step 5: Ensure it's a SELECT statement
    if (!ast) {
      errors.push('Failed to parse SQL query');
      return { isValid: false, errors, warnings };
    }

    // Handle both single query and array of queries
    const queries = Array.isArray(ast) ? ast : [ast];

    // Only allow SELECT statements
    const hasNonSelect = queries.some(q => q.type !== 'select');
    if (hasNonSelect) {
      errors.push('Only SELECT queries are allowed');
      return { isValid: false, errors, warnings };
    }

    // Step 6: Enforce LIMIT clause
    let sanitizedSQL = trimmedSQL;
    const selectQuery = queries[0] as any; // Type assertion for node-sql-parser AST

    if (!selectQuery.limit) {
      // Add LIMIT clause if missing
      sanitizedSQL = `${trimmedSQL} LIMIT ${MAX_ROWS}`;
      warnings.push(`Added LIMIT ${MAX_ROWS} to query`);
    } else {
      // Check if LIMIT exceeds MAX_ROWS
      const limitValue = selectQuery.limit.value?.[0]?.value;
      if (limitValue && parseInt(String(limitValue), 10) > MAX_ROWS) {
        // Replace with MAX_ROWS
        const limitPattern = /LIMIT\s+\d+/i;
        sanitizedSQL = trimmedSQL.replace(limitPattern, `LIMIT ${MAX_ROWS}`);
        warnings.push(`Reduced LIMIT from ${limitValue} to ${MAX_ROWS}`);
      }
    }

    // Return validation result
    if (errors.length > 0) {
      return { isValid: false, errors, warnings };
    }

    return {
      isValid: true,
      sanitizedSQL,
      errors: [],
      warnings,
    };
  }

  /**
   * Quick check if a query is a SELECT statement (lightweight pre-check)
   */
  isSelectQuery(sql: string): boolean {
    const trimmed = sql.trim().toUpperCase();
    return trimmed.startsWith('SELECT');
  }

  /**
   * Get maximum allowed rows
   */
  getMaxRows(): number {
    return MAX_ROWS;
  }
}

// Export singleton instance
export const sqlValidationService = new SQLValidationService();
