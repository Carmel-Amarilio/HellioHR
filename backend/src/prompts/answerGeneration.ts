/**
 * Answer Generation Prompt Templates
 *
 * Versioned prompts for generating grounded answers from SQL query results
 */

export const ANSWER_GENERATION_PROMPT_VERSION = 'answer-generation-v1.0';

/**
 * Get the system prompt for answer generation
 */
export function getAnswerGenerationSystemPrompt(): string {
  return `You are an expert data analyst for the Hellio HR system.

Your task is to answer questions about candidates and positions based ONLY on the data retrieved from the database.

CRITICAL RULES FOR GROUNDED ANSWERS:
1. Answer ONLY based on the retrieved data shown below - never invent or assume information
2. If the data shows zero rows, say so explicitly (e.g., "No candidates/positions match that criteria")
3. Cite specific values from the retrieved data when making claims
4. If a column is NULL or missing, mention it if relevant
5. Use natural, professional language while being precise
6. If the data is ambiguous or incomplete, acknowledge the limitation
7. Format your answer for readability:
   - Use bullet points for lists
   - Use tables for structured data when appropriate
   - Highlight key numbers and names

RESPONSE FORMAT:
Your response should be a clear, natural language answer that directly addresses the user's question.
Do NOT include meta-commentary like "Based on the query results..." - just answer the question naturally.

EXAMPLES:

Question: "How many candidates have React experience?"
Retrieved: 3 rows with names and emails
Answer: "3 candidates have React experience:
• John Doe (john@example.com)
• Jane Smith (jane@example.com)
• Bob Wilson (bob@example.com)"

Question: "Which positions have no candidates?"
Retrieved: 2 positions
Answer: "2 positions currently have no candidates:
• Senior Developer (Engineering)
• Product Manager (Product)"

Question: "Show me all active candidates"
Retrieved: 0 rows
Answer: "There are currently no active candidates in the system."`;
}

/**
 * Build the complete answer generation prompt
 */
export function buildAnswerGenerationPrompt(
  question: string,
  sql: string,
  rows: any[],
  rowCount: number,
  columns: string[]
): string {
  const systemPrompt = getAnswerGenerationSystemPrompt();

  // Format retrieved data for the prompt
  let dataSection = '';
  if (rowCount === 0) {
    dataSection = 'RETRIEVED DATA: No rows returned (empty result set)';
  } else {
    // Convert rows to a readable format
    const formattedRows = formatRowsForPrompt(rows, columns);
    dataSection = `RETRIEVED DATA: ${rowCount} row(s) returned

Columns: ${columns.join(', ')}

${formattedRows}`;
  }

  const userPrompt = `QUESTION: "${question}"

SQL QUERY EXECUTED:
${sql}

${dataSection}

Now provide a natural language answer to the question based ONLY on the retrieved data above.`;

  return systemPrompt + '\n\n' + userPrompt;
}

/**
 * Format rows in a readable way for the prompt
 */
function formatRowsForPrompt(rows: any[], columns: string[], maxRows: number = 100): string {
  const displayRows = rows.slice(0, maxRows);

  let output = 'Data:\n';

  for (let i = 0; i < displayRows.length; i++) {
    const row = displayRows[i];
    output += `\nRow ${i + 1}:\n`;

    for (const col of columns) {
      const value = row[col];
      let formattedValue: string;

      if (value === null || value === undefined) {
        formattedValue = 'NULL';
      } else if (Array.isArray(value)) {
        formattedValue = JSON.stringify(value);
      } else if (typeof value === 'object') {
        formattedValue = JSON.stringify(value);
      } else {
        formattedValue = String(value);
      }

      output += `  ${col}: ${formattedValue}\n`;
    }
  }

  if (rows.length > maxRows) {
    output += `\n... and ${rows.length - maxRows} more rows`;
  }

  return output;
}

/**
 * Parse LLM response for answer generation
 * (Currently just returns the text directly, but could add validation later)
 */
export interface AnswerGenerationResponse {
  answer: string;
}

export function parseAnswerGenerationResponse(llmResponse: string): AnswerGenerationResponse | null {
  try {
    // For now, the LLM response is the answer directly
    const trimmed = llmResponse.trim();

    if (!trimmed || trimmed.length === 0) {
      return null;
    }

    return {
      answer: trimmed,
    };
  } catch (error) {
    console.error('Failed to parse answer generation response:', error);
    return null;
  }
}
