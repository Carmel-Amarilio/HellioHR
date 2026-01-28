/**
 * SQL Generation Prompt Templates
 *
 * Versioned prompts for converting natural language to SQL queries
 */

import { formatSchemaForPrompt } from '../utils/schemaContext.js';

export const SQL_GENERATION_PROMPT_VERSION = 'sql-generation-v1.0';

/**
 * Get the system prompt for SQL generation
 */
export function getSQLGenerationSystemPrompt(): string {
  const schemaContext = formatSchemaForPrompt();

  return `You are an expert SQL query generator for the Hellio HR system.

Your task is to convert natural language questions into valid MySQL SELECT queries.

CRITICAL RULES:
1. Generate ONLY SELECT queries - never UPDATE, DELETE, INSERT, DROP, ALTER, or any other destructive operation
2. Use ONLY the tables and columns provided in the schema below
3. Always use table aliases for clarity (e.g., "c" for candidates, "p" for positions)
4. For JSON array columns like skills, use JSON_CONTAINS function: JSON_CONTAINS(skills, '"React"')
5. Return your response as valid JSON with two fields: "sql" and "reasoning"
6. Keep queries simple and efficient - avoid unnecessary complexity
7. If the question is ambiguous or cannot be answered with the available data, explain why in the reasoning

DATABASE SCHEMA:
${schemaContext}

IMPORTANT NOTES:
- The "skills" column in candidates is a JSON array of strings, e.g., ["React", "TypeScript"]
- Use JSON_CONTAINS(c.skills, '"keyword"') to search for skills (note the escaped quotes!)
- The "extracted_experience" and "extracted_education" columns are also JSON arrays
- Status values are "ACTIVE" or "INACTIVE" (uppercase)
- All IDs follow the pattern "cand-001", "pos-001", etc.

RESPONSE FORMAT:
You must respond with ONLY valid JSON in this exact format:
{
  "sql": "SELECT ... FROM ... WHERE ...",
  "reasoning": "Brief explanation of the query logic"
}

Do not include any text before or after the JSON object.`;
}

/**
 * Few-shot examples for common query patterns
 */
export const FEW_SHOT_EXAMPLES = [
  {
    question: 'List all active candidates',
    response: {
      sql: `SELECT c.id, c.name, c.email, c.status
FROM candidates c
WHERE c.status = 'ACTIVE'
LIMIT 100`,
      reasoning: 'Simple filter on status column to show only active candidates',
    },
  },
  {
    question: 'Which positions do not have any candidates?',
    response: {
      sql: `SELECT p.id, p.title, p.department
FROM positions p
LEFT JOIN candidate_position cp ON p.id = cp.position_id
WHERE cp.candidate_id IS NULL
LIMIT 100`,
      reasoning: 'LEFT JOIN with NULL check to find positions without any candidate applications',
    },
  },
  {
    question: 'List open position counts by department',
    response: {
      sql: `SELECT p.department, COUNT(*) as count
FROM positions p
GROUP BY p.department
ORDER BY count DESC
LIMIT 100`,
      reasoning: 'GROUP BY department with COUNT aggregate to show position counts',
    },
  },
  {
    question: 'Find candidates with React experience',
    response: {
      sql: `SELECT c.id, c.name, c.email, c.skills
FROM candidates c
WHERE JSON_CONTAINS(c.skills, '"React"')
LIMIT 100`,
      reasoning: 'JSON_CONTAINS to search within skills JSON array for the React keyword',
    },
  },
  {
    question: 'Show positions with more than 2 candidates',
    response: {
      sql: `SELECT p.id, p.title, p.department, COUNT(cp.candidate_id) as candidate_count
FROM positions p
JOIN candidate_position cp ON p.id = cp.position_id
GROUP BY p.id, p.title, p.department
HAVING COUNT(cp.candidate_id) > 2
ORDER BY candidate_count DESC
LIMIT 100`,
      reasoning: 'JOIN with GROUP BY and HAVING clause to filter positions by candidate count',
    },
  },
  {
    question: 'Which candidates applied to the Frontend Developer position?',
    response: {
      sql: `SELECT c.id, c.name, c.email, c.skills
FROM candidates c
JOIN candidate_position cp ON c.id = cp.candidate_id
JOIN positions p ON cp.position_id = p.id
WHERE p.title = 'Frontend Developer'
LIMIT 100`,
      reasoning: 'Double JOIN through junction table to link candidates to specific position by title',
    },
  },
];

/**
 * Build the complete SQL generation prompt with few-shot examples
 */
export function buildSQLGenerationPrompt(question: string): string {
  const systemPrompt = getSQLGenerationSystemPrompt();

  // Build few-shot examples
  let examplesText = '\n\nEXAMPLES:\n';
  for (const example of FEW_SHOT_EXAMPLES) {
    examplesText += `\nQuestion: "${example.question}"\n`;
    examplesText += `Response:\n${JSON.stringify(example.response, null, 2)}\n`;
  }

  const userPrompt = `${examplesText}

Now convert this question to SQL:

Question: "${question}"

Response (JSON only):`;

  return systemPrompt + '\n\n' + userPrompt;
}

/**
 * Parse LLM response to extract SQL and reasoning
 */
export interface SQLGenerationResponse {
  sql: string;
  reasoning: string;
}

export function parseSQLGenerationResponse(llmResponse: string): SQLGenerationResponse | null {
  try {
    // Remove markdown code blocks if present
    let cleaned = llmResponse.trim();

    // Remove ```json and ``` markers
    cleaned = cleaned.replace(/^```json\s*/i, '');
    cleaned = cleaned.replace(/^```\s*/, '');
    cleaned = cleaned.replace(/\s*```$/, '');

    // Parse JSON
    const parsed = JSON.parse(cleaned);

    // Validate structure
    if (!parsed.sql || typeof parsed.sql !== 'string') {
      return null;
    }

    if (!parsed.reasoning || typeof parsed.reasoning !== 'string') {
      return null;
    }

    return {
      sql: parsed.sql.trim(),
      reasoning: parsed.reasoning.trim(),
    };
  } catch (error) {
    console.error('Failed to parse SQL generation response:', error);
    return null;
  }
}
