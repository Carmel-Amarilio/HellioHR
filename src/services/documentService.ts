const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export interface DocumentUploadResponse {
  message: string;
  document: {
    id: string;
    fileName: string;
    type: string;
    processingStatus: string;
  };
}

export interface ExtractionStatus {
  document: {
    id: string;
    type: string;
    fileName: string;
    processingStatus: string;
    processedAt: string | null;
    createdAt: string;
    candidateId: string | null;
    positionId: string | null;
    candidate?: {
      id: string;
      name: string;
      extractedSummary: string | null;
      extractionStatus: string;
      extractionMethod: string | null;
      extractionPromptVersion: string | null;
      lastExtractionDate: string | null;
    };
    position?: {
      id: string;
      title: string;
      extractedSummary: string | null;
      extractionStatus: string;
      extractionMethod: string | null;
      extractionPromptVersion: string | null;
      lastExtractionDate: string | null;
    };
    llmMetrics?: Array<{
      id: string;
      modelName: string;
      promptTokens: number;
      completionTokens: number;
      totalTokens: number;
      latencyMs: number;
      costUsd: number;
      createdAt: string;
    }>;
  };
}

export interface ExtractionResults {
  document: {
    id: string;
    fileName: string;
    type: string;
    processingStatus: string;
    processedAt: string | null;
    createdAt: string;
  };
  extraction: {
    id: string;
    name?: string;
    title?: string;
    email?: string;
    phone?: string;
    skills?: string[];
    extractedSummary: string | null;
    extractedExperience?: string | null;
    extractedEducation?: string | null;
    extractedRequirements?: string | null;
    extractedResponsibilities?: string | null;
    extractionMethod: string | null;
    extractionStatus: string;
    lastExtractionDate: string | null;
    extractionPromptVersion: string | null;
  } | null;
}

/**
 * Upload a CV file for a candidate
 */
export async function uploadCV(
  candidateId: string,
  file: File,
  useLLM: boolean
): Promise<DocumentUploadResponse> {
  const token = localStorage.getItem('auth_token');
  if (!token) {
    throw new Error('Authentication required');
  }

  const formData = new FormData();
  formData.append('file', file);
  formData.append('entityType', 'candidate');
  formData.append('entityId', candidateId);
  formData.append('useLLM', useLLM.toString());

  try {
    const response = await fetch(`${API_BASE_URL}/api/documents/ingest`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        // Don't set Content-Type - browser will set it with boundary for multipart/form-data
      },
      body: formData,
    });

    if (response.status === 401) {
      localStorage.removeItem('auth_token');
      window.location.href = '/login';
      throw new Error('Unauthorized');
    }

    if (response.status === 403) {
      throw new Error('You do not have permission to upload documents');
    }

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || error.error || 'Upload failed');
    }

    return response.json();
  } catch (error: any) {
    if (error instanceof TypeError && error.message.includes('fetch')) {
      const networkError: any = new Error('Unable to connect to the server');
      networkError.suggestion = 'Please check if the backend is running: cd backend && npm run dev';
      throw networkError;
    }
    throw error;
  }
}

/**
 * Poll for extraction status of a document
 */
export async function pollExtractionStatus(documentId: string): Promise<ExtractionStatus> {
  const token = localStorage.getItem('auth_token');
  if (!token) {
    throw new Error('Authentication required');
  }

  try {
    const response = await fetch(`${API_BASE_URL}/api/documents/status/${documentId}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (response.status === 401) {
      localStorage.removeItem('auth_token');
      window.location.href = '/login';
      throw new Error('Unauthorized');
    }

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || error.error || 'Failed to get extraction status');
    }

    return response.json();
  } catch (error: any) {
    if (error instanceof TypeError && error.message.includes('fetch')) {
      const networkError: any = new Error('Unable to connect to the server');
      networkError.suggestion = 'Please check if the backend is running: cd backend && npm run dev';
      throw networkError;
    }
    throw error;
  }
}

/**
 * Get extraction results for a document
 */
export async function getExtractionResults(documentId: string): Promise<ExtractionResults> {
  const token = localStorage.getItem('auth_token');
  if (!token) {
    throw new Error('Authentication required');
  }

  try {
    const response = await fetch(`${API_BASE_URL}/api/documents/${documentId}/extraction`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (response.status === 401) {
      localStorage.removeItem('auth_token');
      window.location.href = '/login';
      throw new Error('Unauthorized');
    }

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || error.error || 'Failed to get extraction results');
    }

    return response.json();
  } catch (error: any) {
    if (error instanceof TypeError && error.message.includes('fetch')) {
      const networkError: any = new Error('Unable to connect to the server');
      networkError.suggestion = 'Please check if the backend is running: cd backend && npm run dev';
      throw networkError;
    }
    throw error;
  }
}

/**
 * Wait for extraction to complete with polling
 * @param documentId - Document ID to poll
 * @param maxAttempts - Maximum polling attempts (default 60)
 * @param intervalMs - Polling interval in milliseconds (default 2000)
 */
export async function waitForExtraction(
  documentId: string,
  maxAttempts: number = 60,
  intervalMs: number = 2000
): Promise<ExtractionStatus> {
  for (let i = 0; i < maxAttempts; i++) {
    const status = await pollExtractionStatus(documentId);

    // Check if extraction is complete based on candidate or position extraction status
    const extractionStatus = status.document.candidate?.extractionStatus ||
                            status.document.position?.extractionStatus;

    if (extractionStatus === 'success' || extractionStatus === 'error') {
      return status;
    }

    // Wait before next poll
    await new Promise(resolve => setTimeout(resolve, intervalMs));
  }

  throw new Error('Extraction timeout - took longer than expected');
}
