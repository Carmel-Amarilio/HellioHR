export interface LLMClientConfig {
  provider: 'bedrock' | 'mock';
  model: string;
  region?: string;
  maxTokens?: number;
  temperature?: number;
}

export interface LLMRequest {
  systemPrompt?: string;
  prompt: string;
  maxTokens?: number;
  temperature?: number;
}

export interface LLMResponse {
  text: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  modelId: string;
  latencyMs: number;
}

export abstract class LLMClient {
  protected config: LLMClientConfig;

  constructor(config: LLMClientConfig) {
    this.config = config;
  }

  /**
   * Generate text using the LLM
   */
  abstract generate(request: LLMRequest): Promise<LLMResponse>;

  /**
   * Calculate estimated cost in USD based on token usage
   */
  abstract getCostEstimate(usage: LLMResponse['usage']): number;
}
