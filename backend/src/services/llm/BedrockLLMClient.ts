import { LLMClient, LLMRequest, LLMResponse, LLMClientConfig } from './LLMClient.js';

/**
 * AWS Bedrock LLM Client
 *
 * Supports both Amazon Nova and Anthropic Claude models through AWS Bedrock.
 * Install required package: npm install @aws-sdk/client-bedrock-runtime
 */
export class BedrockLLMClient extends LLMClient {
  private client: any; // BedrockRuntimeClient
  private isInitialized: boolean = false;

  constructor(config: LLMClientConfig) {
    super(config);
    // Lazy initialization - only import AWS SDK when actually needed
  }

  /**
   * Initialize AWS Bedrock client (lazy loading)
   */
  private async initialize() {
    if (this.isInitialized) return;

    try {
      // Dynamic import to avoid errors when @aws-sdk is not installed
      const { BedrockRuntimeClient } = await import('@aws-sdk/client-bedrock-runtime');

      this.client = new BedrockRuntimeClient({
        region: this.config.region ?? 'us-east-1',
        // Credentials automatically loaded from:
        // 1. Environment variables (AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY)
        // 2. AWS credentials file (~/.aws/credentials)
        // 3. IAM role (when running on EC2, ECS, Lambda, etc.)
      });

      this.isInitialized = true;
    } catch (error) {
      throw new Error(
        'AWS SDK not installed. Run: npm install @aws-sdk/client-bedrock-runtime\n' +
        'Or set LLM_PROVIDER=mock in .env to use mock client for development.'
      );
    }
  }

  /**
   * Generate text using AWS Bedrock
   */
  async generate(request: LLMRequest): Promise<LLMResponse> {
    await this.initialize();

    const startTime = Date.now();

    try {
      // Determine if this is a Nova or Claude model
      const isNovaModel = this.config.model.startsWith('amazon.nova') || this.config.model.includes('.amazon.nova');
      const isClaudeModel = this.config.model.startsWith('anthropic.claude');

      if (!isNovaModel && !isClaudeModel) {
        throw new Error(`Unsupported model: ${this.config.model}`);
      }

      // Build request body based on model type
      const requestBody = isNovaModel
        ? this.buildNovaRequest(request)
        : this.buildClaudeRequest(request);

      // Invoke model
      const { InvokeModelCommand } = await import('@aws-sdk/client-bedrock-runtime');

      const command = new InvokeModelCommand({
        modelId: this.config.model,
        contentType: 'application/json',
        accept: 'application/json',
        body: JSON.stringify(requestBody),
      });

      const response = await this.client.send(command);

      // Parse response body
      const responseBody = JSON.parse(new TextDecoder().decode(response.body));

      // Extract text and usage based on model type
      const result = isNovaModel
        ? this.parseNovaResponse(responseBody)
        : this.parseClaudeResponse(responseBody);

      return {
        text: result.text,
        usage: result.usage,
        modelId: this.config.model,
        latencyMs: Date.now() - startTime,
      };
    } catch (error) {
      // Enhance error message with context
      if (error instanceof Error) {
        if (error.message.includes('credentials')) {
          throw new Error(
            'AWS credentials not configured. Set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY in .env file.\n' +
            'See AWS_BEDROCK_SETUP.md for detailed instructions.'
          );
        }
        if (error.message.includes('AccessDeniedException')) {
          throw new Error(
            'AWS Bedrock access denied. Ensure IAM user has bedrock:InvokeModel permission.\n' +
            'See AWS_BEDROCK_SETUP.md Step 4 for IAM setup.'
          );
        }
        if (error.message.includes('ResourceNotFoundException')) {
          throw new Error(
            `Model not available: ${this.config.model}\n` +
            'Check model access in AWS Bedrock console (see AWS_BEDROCK_SETUP.md Step 3)'
          );
        }
        if (error.message.includes('ThrottlingException')) {
          throw new Error(
            'AWS Bedrock rate limit exceeded. Wait a few seconds and try again.\n' +
            'Consider implementing retry logic or requesting quota increase.'
          );
        }
      }
      throw error;
    }
  }

  /**
   * Build request body for Amazon Nova models
   */
  private buildNovaRequest(request: LLMRequest): any {
    // Nova models don't support separate system role
    // Combine system prompt with user message
    let userMessage = request.prompt;
    if (request.systemPrompt) {
      userMessage = `${request.systemPrompt}\n\n${request.prompt}`;
    }

    const messages: any[] = [
      {
        role: 'user',
        content: [{ text: userMessage }],
      },
    ];

    return {
      schemaVersion: 'messages-v1',
      messages,
      inferenceConfig: {
        max_new_tokens: request.maxTokens ?? this.config.maxTokens ?? 2000,
        temperature: request.temperature ?? this.config.temperature ?? 0.3,
      },
    };
  }

  /**
   * Build request body for Anthropic Claude models
   */
  private buildClaudeRequest(request: LLMRequest): any {
    const body: any = {
      anthropic_version: 'bedrock-2023-05-31',
      max_tokens: request.maxTokens ?? this.config.maxTokens ?? 2000,
      messages: [
        {
          role: 'user',
          content: request.prompt,
        },
      ],
      temperature: request.temperature ?? this.config.temperature ?? 0.3,
    };

    // Add system prompt if provided
    if (request.systemPrompt) {
      body.system = request.systemPrompt;
    }

    return body;
  }

  /**
   * Parse response from Amazon Nova models
   */
  private parseNovaResponse(responseBody: any): { text: string; usage: LLMResponse['usage'] } {
    // Nova response format:
    // {
    //   output: {
    //     message: {
    //       role: 'assistant',
    //       content: [{ text: '...' }]
    //     }
    //   },
    //   usage: {
    //     inputTokens: 100,
    //     outputTokens: 200,
    //     totalTokens: 300
    //   }
    // }

    const text = responseBody.output?.message?.content?.[0]?.text ?? '';
    const usage = {
      promptTokens: responseBody.usage?.inputTokens ?? 0,
      completionTokens: responseBody.usage?.outputTokens ?? 0,
      totalTokens: responseBody.usage?.totalTokens ?? 0,
    };

    return { text, usage };
  }

  /**
   * Parse response from Anthropic Claude models
   */
  private parseClaudeResponse(responseBody: any): { text: string; usage: LLMResponse['usage'] } {
    // Claude response format:
    // {
    //   content: [{ type: 'text', text: '...' }],
    //   usage: {
    //     input_tokens: 100,
    //     output_tokens: 200
    //   }
    // }

    const text = responseBody.content?.[0]?.text ?? '';
    const usage = {
      promptTokens: responseBody.usage?.input_tokens ?? 0,
      completionTokens: responseBody.usage?.output_tokens ?? 0,
      totalTokens: (responseBody.usage?.input_tokens ?? 0) + (responseBody.usage?.output_tokens ?? 0),
    };

    return { text, usage };
  }

  /**
   * Calculate estimated cost in USD based on token usage
   * Prices as of January 2025 (us-east-1)
   */
  getCostEstimate(usage: LLMResponse['usage']): number {
    // Pricing per 1,000 tokens (input / output)
    const pricing: Record<string, { input: number; output: number }> = {
      'amazon.nova-lite-v1:0': { input: 0.00008, output: 0.00032 },
      'amazon.nova-2-lite-v1:0': { input: 0.00008, output: 0.00032 },
      'us.amazon.nova-lite-v1:0': { input: 0.00008, output: 0.00032 }, // Cross-region inference profile
      'amazon.nova-micro-v1:0': { input: 0.000035, output: 0.00014 },
      'amazon.nova-pro-v1:0': { input: 0.0008, output: 0.0032 },
      'anthropic.claude-3-5-sonnet-20241022-v2:0': { input: 0.003, output: 0.015 },
      'anthropic.claude-3-5-haiku-20241022-v1:0': { input: 0.001, output: 0.005 },
    };

    const rates = pricing[this.config.model] ?? { input: 0, output: 0 };

    const inputCost = (usage.promptTokens / 1000) * rates.input;
    const outputCost = (usage.completionTokens / 1000) * rates.output;

    return inputCost + outputCost;
  }
}
