export interface Candidate {
  id: string;
  name: string;
  email: string;
  phone: string;
  skills: string[];
  positionIds: string[];
  cvUrl: string;
  status: 'active' | 'inactive';
}

export interface Position {
  id: string;
  title: string;
  department: string;
  description: string;
  candidateIds: string[];
}

// Chat / SQL-RAG types
export interface ChatRequest {
  question: string;
  modelName?: string;
}

export interface ChatResponse {
  answer: string;
  trace: {
    question: string;
    relevance?: {
      isRelevant: boolean;
      suggestion?: string;
    };
    sqlGeneration?: {
      sql: string;
      sanitizedSQL?: string;
      reasoning: string;
      validation: {
        isValid: boolean;
        errors: string[];
        warnings: string[];
      };
      metrics: {
        modelName: string;
        promptTokens: number;
        completionTokens: number;
        totalTokens: number;
        latencyMs: number;
        estimatedCostUsd: number;
      };
    };
    sqlExecution?: {
      rowCount: number;
      columns: string[];
      executionTimeMs: number;
    };
    answerGeneration?: {
      metrics: {
        modelName: string;
        promptTokens: number;
        completionTokens: number;
        totalTokens: number;
        latencyMs: number;
        estimatedCostUsd: number;
      };
    };
  };
  totalMetrics: {
    totalTokens: number;
    totalCostUsd: number;
    totalLatencyMs: number;
    llmCalls: number;
  };
}

export interface ChatError {
  error: string;
  suggestion?: string;
  trace?: ChatResponse['trace'];
}
