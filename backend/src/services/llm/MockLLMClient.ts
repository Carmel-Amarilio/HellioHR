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
   * Estimate completion tokens based on prompt
   */
  private estimateCompletionTokens(prompt: string): number {
    // For extraction tasks, estimate based on prompt length
    const promptLower = prompt.toLowerCase();

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
