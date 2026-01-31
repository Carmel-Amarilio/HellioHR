import { LLMClient, LLMRequest, LLMResponse } from './LLMClient.js';

export class MockLLMClient extends LLMClient {
  /**
   * Generate a mock response that looks realistic
   */
  async generate(request: LLMRequest): Promise<LLMResponse> {
    const startTime = Date.now();

    // Simulate realistic latency (200-700ms)
    const latency = Math.floor(Math.random() * 500) + 200;
    await new Promise(resolve => setTimeout(resolve, latency));

    // Estimate token counts
    const promptTokens = Math.floor(request.prompt.length / 4);
    const completionTokens = this.estimateCompletionTokens(request.prompt);
    const totalTokens = promptTokens + completionTokens;

    // Generate mock response based on request content
    const text = this.generateMockResponse(request.prompt);

    return {
      text,
      usage: {
        promptTokens,
        completionTokens,
        totalTokens,
      },
      modelId: this.config.model,
      latencyMs: Date.now() - startTime,
    };
  }

  /**
   * Calculate cost estimate for mock client (using Nova Lite pricing)
   */
  getCostEstimate(usage: LLMResponse['usage']): number {
    const pricing = {
      'amazon.nova-lite-v1:0': { input: 0.00008, output: 0.00032 },
      'anthropic.claude-3-5-sonnet-20241022-v2:0': { input: 0.003, output: 0.015 },
    };

    const rates = pricing[this.config.model as keyof typeof pricing] ?? { input: 0.00008, output: 0.00032 };

    const inputCost = (usage.promptTokens / 1000) * rates.input;
    const outputCost = (usage.completionTokens / 1000) * rates.output;

    return inputCost + outputCost;
  }

  /**
   * Generate a realistic mock response based on the prompt
   */
  private generateMockResponse(prompt: string): string {
    const promptLower = prompt.toLowerCase();

    // Check if this is an answer generation request (grounding prompt)
    if (promptLower.includes('retrieved data') || promptLower.includes('sql query executed')) {
      return this.generateMockAnswer(prompt);
    }

    // Check if this is a SQL generation request
    if (promptLower.includes('convert') && promptLower.includes('sql') ||
        (promptLower.includes('question:') && (promptLower.includes('select') || promptLower.includes('from')))) {
      return this.generateMockSQL(prompt);
    }

    // Check if this is a CV extraction request
    if (promptLower.includes('extract') && (promptLower.includes('cv') || promptLower.includes('resume'))) {
      return JSON.stringify({
        summary: 'Experienced software developer with strong background in web technologies and modern frameworks. Passionate about building scalable applications and mentoring team members.',
        experience: [
          {
            company: 'Tech Company Inc.',
            role: 'Senior Developer',
            duration: '2020 - Present',
            achievements: [
              'Led development of customer-facing platform',
              'Improved performance by 40%',
              'Mentored junior developers',
            ],
          },
          {
            company: 'Startup XYZ',
            role: 'Developer',
            duration: '2018 - 2020',
            achievements: [
              'Built core product features',
              'Implemented CI/CD pipeline',
            ],
          },
        ],
        education: [
          {
            degree: 'B.S. Computer Science',
            institution: 'University Name',
            year: '2018',
          },
        ],
        skills: ['JavaScript', 'TypeScript', 'React', 'Node.js', 'Python', 'AWS', 'Docker', 'Git'],
      }, null, 2);
    }

    // Check if this is a job description extraction request
    if (promptLower.includes('extract') && (promptLower.includes('job') || promptLower.includes('position'))) {
      return JSON.stringify({
        summary: 'We are seeking a talented developer to join our growing team and contribute to building innovative solutions.',
        responsibilities: [
          { responsibility: 'Design and develop software features', category: 'development' },
          { responsibility: 'Collaborate with cross-functional teams', category: 'collaboration' },
          { responsibility: 'Write clean, maintainable code', category: 'development' },
          { responsibility: 'Participate in code reviews', category: 'quality' },
        ],
        requirements: [
          { type: 'experience', skill: 'JavaScript', yearsExp: 3 },
          { type: 'experience', skill: 'React', yearsExp: 2 },
          { type: 'education', skill: 'Bachelor\'s degree in Computer Science', yearsExp: 0 },
          { type: 'skill', skill: 'Problem-solving', yearsExp: 0 },
        ],
      }, null, 2);
    }

    // Default response for other requests
    return JSON.stringify({
      message: 'Mock LLM response generated successfully',
      note: 'This is a simulated response from the mock LLM client',
    }, null, 2);
  }

  /**
   * Generate mock SQL query based on the question
   */
  private generateMockSQL(prompt: string): string {
    const promptLower = prompt.toLowerCase();

    // Extract the question from the prompt (find the LAST occurrence after "Now convert this question")
    let question = '';
    const convertMatch = prompt.match(/Now convert this question to SQL:\s*Question:\s*"([^"]+)"/i);
    if (convertMatch) {
      question = convertMatch[1].toLowerCase();
    }

    // Debug: log the extracted question (uncomment for debugging)
    // console.log('MockLLM: Extracted question:', question);

    // Generate appropriate SQL based on question keywords
    if (question.includes('list') && question.includes('position')) {
      return JSON.stringify({
        sql: 'SELECT p.id, p.title, p.department FROM positions p LIMIT 100',
        reasoning: 'Simple SELECT query to list all positions with their basic information'
      });
    }

    if (question.includes('list') && (question.includes('candidate') || question.includes('all'))) {
      return JSON.stringify({
        sql: 'SELECT c.id, c.name, c.email, c.status FROM candidates c WHERE c.status = "ACTIVE" LIMIT 100',
        reasoning: 'Simple SELECT query to list all active candidates with their basic information'
      });
    }

    if (question.includes('position') && (question.includes('no') || question.includes('not') || question.includes('without'))) {
      return JSON.stringify({
        sql: 'SELECT p.id, p.title, p.department FROM positions p LEFT JOIN candidate_position cp ON p.id = cp.position_id WHERE cp.candidate_id IS NULL LIMIT 100',
        reasoning: 'LEFT JOIN with NULL check to find positions that do not have any candidates'
      });
    }

    if (question.includes('count') && question.includes('department')) {
      return JSON.stringify({
        sql: 'SELECT p.department, COUNT(*) as count FROM positions p GROUP BY p.department ORDER BY count DESC LIMIT 100',
        reasoning: 'GROUP BY query with COUNT aggregate to show position counts by department'
      });
    }

    if (question.includes('react') || question.includes('kubernetes') || question.includes('skill')) {
      const skill = question.includes('react') ? 'React' : question.includes('kubernetes') ? 'Kubernetes' : 'JavaScript';
      return JSON.stringify({
        sql: `SELECT c.id, c.name, c.email, c.skills FROM candidates c WHERE JSON_CONTAINS(c.skills, '"${skill}"') LIMIT 100`,
        reasoning: `JSON_CONTAINS query to search for candidates with ${skill} in their skills array`
      });
    }

    if (question.includes('more than') && question.includes('candidate')) {
      const num = question.match(/\d+/)?.[0] || '2';
      return JSON.stringify({
        sql: `SELECT p.id, p.title, p.department, COUNT(cp.candidate_id) as candidate_count FROM positions p JOIN candidate_position cp ON p.id = cp.position_id GROUP BY p.id, p.title, p.department HAVING COUNT(cp.candidate_id) > ${num} ORDER BY candidate_count DESC LIMIT 100`,
        reasoning: `JOIN with GROUP BY and HAVING clause to find positions with more than ${num} candidates`
      });
    }

    // Default SQL response
    return JSON.stringify({
      sql: 'SELECT c.id, c.name, c.email FROM candidates c LIMIT 100',
      reasoning: 'Default SELECT query to list candidates'
    });
  }

  /**
   * Generate mock answer based on retrieved data in the prompt
   */
  private generateMockAnswer(prompt: string): string {
    const promptLower = prompt.toLowerCase();

    // Extract the row count from the prompt
    const rowCountMatch = prompt.match(/(\d+) row\(s\) returned/i);
    const rowCount = rowCountMatch ? parseInt(rowCountMatch[1]) : 0;

    // Check if no rows were returned
    if (rowCount === 0 || promptLower.includes('no rows returned')) {
      // Extract question to provide context
      const questionMatch = prompt.match(/question:\s*"([^"]+)"/i);
      const question = questionMatch ? questionMatch[1] : 'the query';

      return 'No matching records were found for your query.';
    }

    // Extract the question
    const questionMatch = prompt.match(/question:\s*"([^"]+)"/i);
    const question = questionMatch ? questionMatch[1].toLowerCase() : '';

    // Generate appropriate answer based on question type
    if (question.includes('how many') || question.includes('count')) {
      return `Based on the retrieved data, there are ${rowCount} matching record(s).`;
    }

    if (question.includes('list') || question.includes('show') || question.includes('which')) {
      if (rowCount === 1) {
        return `1 record was found matching your criteria.`;
      }
      return `${rowCount} records were found matching your criteria.`;
    }

    // Default answer for other question types
    return `Based on the query results, ${rowCount} record(s) were found. The data shows the requested information from the database.`;
  }

  /**
   * Estimate completion tokens based on prompt
   */
  private estimateCompletionTokens(prompt: string): number {
    // For extraction tasks, estimate based on prompt length
    const promptLower = prompt.toLowerCase();

    // Answer generation requests
    if (promptLower.includes('retrieved data') || promptLower.includes('sql query executed')) {
      return Math.floor(Math.random() * 80) + 50; // 50-130 tokens (answers are shorter)
    }

    // SQL generation requests
    if (promptLower.includes('convert') && promptLower.includes('sql')) {
      return Math.floor(Math.random() * 50) + 100; // 100-150 tokens
    }

    if (promptLower.includes('extract') && promptLower.includes('cv')) {
      return Math.floor(Math.random() * 200) + 400; // 400-600 tokens
    }

    if (promptLower.includes('extract') && promptLower.includes('job')) {
      return Math.floor(Math.random() * 150) + 350; // 350-500 tokens
    }

    // Default estimation
    return Math.floor(Math.random() * 100) + 200; // 200-300 tokens
  }
}
