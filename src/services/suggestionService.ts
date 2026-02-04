import { getAuthToken } from './authService.js';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export interface Suggestion<T> {
  data: T;
  similarity: number;
  rank: number;
}

export interface SuggestionMetadata {
  retrievedCount: number;
  filteredCount: number;
  filtersApplied?: Record<string, any>;
  retrievalTimeMs: number;
  model: string;
  embeddingVersion?: string;
  diagnosticsLogId: number;
}

export interface CandidateSuggestion {
  candidate: {
    id: string;
    name: string;
    email: string;
    phone: string;
    skills: string[];
    cvUrl: string;
    status: 'active' | 'inactive';
  };
  similarity: number;
  rank: number;
}

export interface PositionSuggestion {
  position: {
    id: string;
    title: string;
    department: string;
    description: string;
  };
  similarity: number;
  rank: number;
  explanation?: string;
  explanationCached?: boolean;
}

export interface CandidateSuggestionsResponse {
  suggestions: CandidateSuggestion[];
  metadata: SuggestionMetadata;
}

export interface PositionSuggestionsResponse {
  suggestions: PositionSuggestion[];
  metadata: SuggestionMetadata;
}

/**
 * Get suggested candidates for a position
 */
export async function getSuggestedCandidates(
  positionId: string
): Promise<CandidateSuggestionsResponse | null> {
  try {
    const token = getAuthToken();
    if (!token) {
      console.error('No authentication token available');
      return null;
    }

    const response = await fetch(`${API_URL}/api/positions/${positionId}/suggest-candidates`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        console.warn(`Position ${positionId} not embedded yet`);
        return null;
      }
      if (response.status === 503) {
        console.warn('Semantic search unavailable - embeddings feature not enabled');
        return null;
      }
      throw new Error(`API error: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error(`Failed to get suggested candidates: ${error}`);
    return null;
  }
}

/**
 * Get suggested positions for a candidate
 */
export async function getSuggestedPositions(
  candidateId: string
): Promise<PositionSuggestionsResponse | null> {
  try {
    const token = getAuthToken();
    if (!token) {
      console.error('No authentication token available');
      return null;
    }

    const response = await fetch(`${API_URL}/api/candidates/${candidateId}/suggest-positions`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        console.warn(`Candidate ${candidateId} not embedded yet`);
        return null;
      }
      if (response.status === 503) {
        console.warn('Semantic search unavailable - embeddings feature not enabled');
        return null;
      }
      throw new Error(`API error: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error(`Failed to get suggested positions: ${error}`);
    return null;
  }
}

/**
 * Format similarity score as percentage
 */
export function formatSimilarity(similarity: number): string {
  return `${(similarity * 100).toFixed(0)}%`;
}

/**
 * Get color class for similarity score
 * - Green: >= 0.80 (80%)
 * - Yellow: 0.65-0.79
 * - Red: < 0.65
 */
export function getSimilarityColor(similarity: number): 'green' | 'yellow' | 'red' {
  if (similarity >= 0.8) return 'green';
  if (similarity >= 0.65) return 'yellow';
  return 'red';
}
