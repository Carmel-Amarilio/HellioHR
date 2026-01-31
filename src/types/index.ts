export interface Candidate {
  id: string;
  name: string;
  email: string;
  phone: string;
  skills: string[];
  positionIds: string[];
  cvUrl: string;
  status: 'active' | 'inactive';
  // Extraction fields (from Exercise 3)
  // Note: extractedExperience and extractedEducation can be either strings (formatted text)
  // or arrays (structured data) depending on when the extraction was performed
  extractedSummary?: string | null;
  extractedExperience?: string | any[] | null;
  extractedEducation?: string | any[] | null;
  extractionMethod?: string | null;
  extractionStatus?: string | null;
  lastExtractionDate?: string | null;
  extractionPromptVersion?: string | null;
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
