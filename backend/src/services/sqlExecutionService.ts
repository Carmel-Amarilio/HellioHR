/**
 * SQL Execution Service
 *
 * Safely executes validated SQL queries and returns results with metadata
 */

import { prisma } from '../config/database.js';

export interface ExecutionResult {
  success: boolean;
  rows?: any[];
  rowCount?: number;
  columns?: string[];
  executionTimeMs?: number;
  error?: string;
  sql?: string;
}

export class SQLExecutionService {
  private readonly MAX_ROWS = 1000;

  /**
   * Execute a validated SQL query and return results with metadata
   *
   * @param sql - Validated SELECT query
   * @returns Execution result with rows, metadata, and timing
   */
  async executeQuery(sql: string): Promise<ExecutionResult> {
    const startTime = Date.now();

    try {
      // Execute raw query using Prisma
      // Note: This uses $queryRawUnsafe which executes the SQL as-is
      // The sql parameter MUST already be validated by sqlValidationService
      const rows: any[] = await prisma.$queryRawUnsafe(sql);

      const executionTimeMs = Date.now() - startTime;

      // Extract column names from first row (if any)
      const columns = rows.length > 0 ? Object.keys(rows[0]) : [];

      // Check row count safety
      if (rows.length > this.MAX_ROWS) {
        return {
          success: false,
          error: `Query returned ${rows.length} rows, exceeding maximum of ${this.MAX_ROWS}. Please add more specific filters.`,
          rowCount: rows.length,
          executionTimeMs,
          sql,
        };
      }

      return {
        success: true,
        rows,
        rowCount: rows.length,
        columns,
        executionTimeMs,
        sql,
      };
    } catch (error) {
      const executionTimeMs = Date.now() - startTime;
      const errorMsg = error instanceof Error ? error.message : String(error);

      return {
        success: false,
        error: `SQL execution failed: ${errorMsg}`,
        executionTimeMs,
        sql,
      };
    }
  }

  /**
   * Format rows for display in a human-readable way
   * (useful for debugging or showing raw results to users)
   */
  formatRows(rows: any[], maxRows: number = 10): string {
    if (rows.length === 0) {
      return 'No rows returned';
    }

    const displayRows = rows.slice(0, maxRows);
    const columns = Object.keys(displayRows[0]);

    let output = `Found ${rows.length} row(s):\n\n`;

    // Create a simple table format
    output += columns.join(' | ') + '\n';
    output += columns.map(() => '---').join(' | ') + '\n';

    for (const row of displayRows) {
      const values = columns.map(col => {
        const val = row[col];
        // Handle different types
        if (val === null || val === undefined) return 'NULL';
        if (Array.isArray(val)) return JSON.stringify(val);
        if (typeof val === 'object') return JSON.stringify(val);
        return String(val);
      });
      output += values.join(' | ') + '\n';
    }

    if (rows.length > maxRows) {
      output += `\n... and ${rows.length - maxRows} more row(s)`;
    }

    return output;
  }
}

// Export singleton instance
export const sqlExecutionService = new SQLExecutionService();
