import { apiClient } from './apiClient';
import type { ChatRequest, ChatResponse, ChatError } from '../types/index.js';

/**
 * Ask a natural language question and get a grounded answer from the SQL-RAG system
 */
export async function askQuestion(
  question: string,
  modelName?: string
): Promise<ChatResponse> {
  const request: ChatRequest = {
    question,
    ...(modelName && { modelName }),
  };

  try {
    return await apiClient.post<ChatResponse>('/api/chat', request);
  } catch (error: any) {
    // Re-throw with error details if available
    if (error.response?.data) {
      const errorData = error.response.data as ChatError;
      // Create custom error with suggestion property
      const customError: any = new Error(errorData.error || 'Failed to get answer from chat service');
      customError.suggestion = errorData.suggestion;
      throw customError;
    }
    throw error;
  }
}

/**
 * Get available model options for the chat interface
 */
export function getAvailableModels(): { value: string; label: string }[] {
  return [
    { value: 'demo-mock', label: 'Demo Model (Free - No AWS)' },
    { value: 'amazon.nova-lite-v1:0', label: 'Amazon Nova Lite (Real AWS Bedrock)' },
    {
      value: 'us.anthropic.claude-3-5-sonnet-20241022-v2:0',
      label: 'Claude 3.5 Sonnet v2 (Real AWS Bedrock)',
    },
  ];
}
