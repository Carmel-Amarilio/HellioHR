import { apiClient } from './apiClient';
import { ChatRequest, ChatResponse, ChatError } from '../types';

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
      throw new Error(errorData.error || 'Failed to get answer from chat service');
    }
    throw error;
  }
}

/**
 * Get available model options for the chat interface
 */
export function getAvailableModels(): { value: string; label: string }[] {
  return [
    { value: 'amazon.nova-lite-v1:0', label: 'Amazon Nova Lite (Fast, Economical)' },
    {
      value: 'anthropic.claude-3-5-sonnet-20241022-v2:0',
      label: 'Claude 3.5 Sonnet (Higher Quality)',
    },
  ];
}
