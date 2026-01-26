import { describe, it, expect } from 'vitest';
import { MockLLMClient } from '../../../../src/services/llm/MockLLMClient.js';
import { LLMClientConfig } from '../../../../src/services/llm/LLMClient.js';

describe('MockLLMClient', () => {
  const config: LLMClientConfig = {
    provider: 'mock',
    model: 'amazon.nova-lite-v1:0',
    maxTokens: 2000,
    temperature: 0.3,
  };

  const client = new MockLLMClient(config);

  describe('generate', () => {
    it('should return a mock CV extraction response', async () => {
      const request = {
        systemPrompt: 'You are a CV parser',
        prompt: 'Extract summary, experience, education, and skills from this CV:\n\nJohn Doe\nSoftware Engineer...',
      };

      const response = await client.generate(request);

      expect(response.text).toBeDefined();
      expect(response.text.length).toBeGreaterThan(0);
      expect(response.usage.promptTokens).toBeGreaterThan(0);
      expect(response.usage.completionTokens).toBeGreaterThan(0);
      expect(response.usage.totalTokens).toBe(
        response.usage.promptTokens + response.usage.completionTokens
      );
      expect(response.modelId).toBe(config.model);
      expect(response.latencyMs).toBeGreaterThan(0);

      // Should return valid JSON
      expect(() => JSON.parse(response.text)).not.toThrow();

      const parsed = JSON.parse(response.text);
      expect(parsed.summary).toBeDefined();
      expect(parsed.experience).toBeDefined();
      expect(Array.isArray(parsed.experience)).toBe(true);
    });

    it('should return a mock job description extraction response', async () => {
      const request = {
        systemPrompt: 'You are a job description parser',
        prompt: 'Extract summary, responsibilities, and requirements from this job description:\n\nSenior Developer...',
      };

      const response = await client.generate(request);

      expect(response.text).toBeDefined();

      const parsed = JSON.parse(response.text);
      expect(parsed.summary).toBeDefined();
      expect(parsed.responsibilities).toBeDefined();
      expect(parsed.requirements).toBeDefined();
      expect(Array.isArray(parsed.responsibilities)).toBe(true);
      expect(Array.isArray(parsed.requirements)).toBe(true);
    });

    it('should simulate realistic latency between 200-700ms', async () => {
      const request = {
        prompt: 'Test prompt',
      };

      const response = await client.generate(request);

      expect(response.latencyMs).toBeGreaterThanOrEqual(200);
      expect(response.latencyMs).toBeLessThanOrEqual(1000); // Allow some buffer
    });

    it('should estimate token counts based on prompt length', async () => {
      const shortPrompt = {
        prompt: 'Short prompt',
      };

      const longPrompt = {
        prompt: 'This is a much longer prompt that contains significantly more text and should result in higher token counts ' +
                'because the estimation is based on the length of the prompt divided by 4 characters per token',
      };

      const shortResponse = await client.generate(shortPrompt);
      const longResponse = await client.generate(longPrompt);

      expect(longResponse.usage.promptTokens).toBeGreaterThan(shortResponse.usage.promptTokens);
    });
  });

  describe('getCostEstimate', () => {
    it('should calculate cost for Nova Lite model', () => {
      const usage = {
        promptTokens: 1000,
        completionTokens: 500,
        totalTokens: 1500,
      };

      const cost = client.getCostEstimate(usage);

      // Nova Lite: $0.00008 input / $0.00032 output per 1K tokens
      // Expected: (1000/1000)*0.00008 + (500/1000)*0.00032 = 0.00008 + 0.00016 = 0.00024
      expect(cost).toBeCloseTo(0.00024, 6);
    });

    it('should calculate cost for Claude model', async () => {
      const claudeConfig: LLMClientConfig = {
        provider: 'mock',
        model: 'anthropic.claude-3-5-sonnet-20241022-v2:0',
        maxTokens: 2000,
        temperature: 0.3,
      };

      const claudeClient = new MockLLMClient(claudeConfig);

      const usage = {
        promptTokens: 1000,
        completionTokens: 500,
        totalTokens: 1500,
      };

      const cost = claudeClient.getCostEstimate(usage);

      // Claude: $0.003 input / $0.015 output per 1K tokens
      // Expected: (1000/1000)*0.003 + (500/1000)*0.015 = 0.003 + 0.0075 = 0.0105
      expect(cost).toBeCloseTo(0.0105, 4);
    });

    it('should return valid cost for various token counts', () => {
      const testCases = [
        { tokens: 100, expected: 0.000024 },
        { tokens: 10000, expected: 0.0024 },
        { tokens: 50000, expected: 0.012 },
      ];

      for (const testCase of testCases) {
        const usage = {
          promptTokens: testCase.tokens,
          completionTokens: testCase.tokens / 2,
          totalTokens: testCase.tokens + testCase.tokens / 2,
        };

        const cost = client.getCostEstimate(usage);

        expect(cost).toBeGreaterThan(0);
        expect(cost).toBeCloseTo(testCase.expected, 6);
      }
    });
  });

  describe('mock response content', () => {
    it('should include realistic CV data structure', async () => {
      const request = {
        prompt: 'Extract from CV: Alice Johnson, Frontend Developer',
      };

      const response = await client.generate(request);
      const parsed = JSON.parse(response.text);

      expect(parsed.summary).toContain('developer');
      expect(parsed.experience).toBeDefined();
      expect(parsed.experience.length).toBeGreaterThan(0);
      expect(parsed.experience[0]).toHaveProperty('company');
      expect(parsed.experience[0]).toHaveProperty('role');
      expect(parsed.experience[0]).toHaveProperty('duration');
      expect(parsed.skills).toBeDefined();
      expect(Array.isArray(parsed.skills)).toBe(true);
    });

    it('should include realistic job description data structure', async () => {
      const request = {
        prompt: 'Extract from job description: We are hiring a Senior Developer',
      };

      const response = await client.generate(request);
      const parsed = JSON.parse(response.text);

      expect(parsed.responsibilities).toBeDefined();
      expect(parsed.responsibilities.length).toBeGreaterThan(0);
      expect(parsed.responsibilities[0]).toHaveProperty('responsibility');
      expect(parsed.responsibilities[0]).toHaveProperty('category');
      expect(parsed.requirements).toBeDefined();
      expect(parsed.requirements[0]).toHaveProperty('type');
      expect(parsed.requirements[0]).toHaveProperty('skill');
    });
  });
});
