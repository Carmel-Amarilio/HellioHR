/**
 * AWS Titan Embeddings Client
 *
 * Wrapper around AWS Bedrock Embeddings API
 * Supports Amazon Titan Embed Text v2 (amazon.titan-embed-text-v2:0)
 * Returns 1024-dimensional embeddings
 */

export interface EmbeddingResponse {
  embedding: number[];
  inputTextTokenCount: number;
}

export class TitanEmbeddingsClient {
  private client: any; // BedrockRuntimeClient
  private isInitialized: boolean = false;
  private model: string;
  private region: string;

  constructor(model: string = 'amazon.titan-embed-text-v2:0', region: string = 'us-east-1') {
    this.model = model;
    this.region = region;
  }

  /**
   * Initialize AWS Bedrock client (lazy loading)
   */
  private async initialize() {
    if (this.isInitialized) return;

    try {
      // Dynamic import to avoid errors when @aws-sdk is not installed
      const { BedrockRuntimeClient } = await import('@aws-sdk/client-bedrock-runtime');

      // Explicitly use credentials from environment variables if available
      const credentials = process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY
        ? {
            accessKeyId: process.env.AWS_ACCESS_KEY_ID,
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
          }
        : undefined;

      this.client = new BedrockRuntimeClient({
        region: this.region,
        credentials,
      });

      this.isInitialized = true;
    } catch (error) {
      throw new Error(
        'AWS SDK not installed. Run: npm install @aws-sdk/client-bedrock-runtime'
      );
    }
  }

  /**
   * Generate embedding for input text
   * Input: text string (up to 8,192 tokens)
   * Output: float[] (1024 dimensions)
   */
  async embed(text: string): Promise<EmbeddingResponse> {
    await this.initialize();

    try {
      const { InvokeModelCommand } = await import('@aws-sdk/client-bedrock-runtime');

      const requestBody = {
        inputText: text,
      };

      const command = new InvokeModelCommand({
        modelId: this.model,
        contentType: 'application/json',
        accept: 'application/json',
        body: JSON.stringify(requestBody),
      });

      const response = await this.client.send(command);

      // Parse response body
      const responseBody = JSON.parse(new TextDecoder().decode(response.body));

      // Titan response format:
      // {
      //   embedding: [0.123, -0.456, ...],  // 1024 floats
      //   inputTextTokenCount: 42
      // }

      return {
        embedding: responseBody.embedding ?? [],
        inputTextTokenCount: responseBody.inputTextTokenCount ?? 0,
      };
    } catch (error) {
      // Enhance error message with context
      if (error instanceof Error) {
        if (error.message.includes('credentials')) {
          throw new Error(
            'AWS credentials not configured. Set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY in .env file.'
          );
        }
        if (error.message.includes('AccessDeniedException')) {
          throw new Error(
            'AWS Bedrock access denied. Ensure IAM user has bedrock:InvokeModel permission.'
          );
        }
        if (error.message.includes('ResourceNotFoundException')) {
          throw new Error(
            `Embedding model not available: ${this.model}. Check model access in AWS Bedrock console.`
          );
        }
        if (error.message.includes('ThrottlingException')) {
          throw new Error(
            'AWS Bedrock rate limit exceeded. Wait a few seconds and try again.'
          );
        }
      }
      throw error;
    }
  }

  /**
   * Generate embeddings for multiple texts (batch)
   * Note: This calls embed() sequentially; for production, consider parallel batching with rate limiting
   */
  async embedBatch(texts: string[]): Promise<EmbeddingResponse[]> {
    const results: EmbeddingResponse[] = [];

    for (const text of texts) {
      try {
        const result = await this.embed(text);
        results.push(result);
      } catch (error) {
        console.error(`Failed to embed text: ${error}`);
        // Continue with next text instead of failing entire batch
        results.push({
          embedding: [],
          inputTextTokenCount: 0,
        });
      }
    }

    return results;
  }

  /**
   * Estimate token count for text (approximate)
   * Rule of thumb: ~4 characters per token
   */
  static estimateTokenCount(text: string): number {
    return Math.ceil(text.length / 4);
  }
}
