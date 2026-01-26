import { LLMClient, LLMClientConfig } from './LLMClient.js';
import { MockLLMClient } from './MockLLMClient.js';
import { BedrockLLMClient } from './BedrockLLMClient.js';

export class LLMFactory {
  /**
   * Create an LLM client based on the configuration
   */
  static createClient(config: LLMClientConfig): LLMClient {
    switch (config.provider) {
      case 'mock':
        return new MockLLMClient(config);
      case 'bedrock':
        return new BedrockLLMClient(config);
      default:
        throw new Error(`Unknown LLM provider: ${config.provider}`);
    }
  }
}
