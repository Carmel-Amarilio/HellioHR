import { Request } from 'express';

export interface JwtPayload {
  userId: string;
  email: string;
  role: 'viewer' | 'editor';
}

export interface AuthenticatedRequest extends Request {
  user?: JwtPayload;
}

// Frontend contract types (must match frontend exactly)
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

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: {
    id: string;
    email: string;
    role: 'viewer' | 'editor';
  };
}

export interface MeResponse {
  id: string;
  email: string;
  role: 'viewer' | 'editor';
}

export interface ApiError {
  error: string;
  message: string;
}

// Semantic search suggestion types

export interface CandidateSuggestion {
  candidate: Candidate;
  similarity: number;  // 0-1, cosine similarity
  rank: number;
}

export interface PositionSuggestion {
  position: Position;
  similarity: number;  // 0-1, cosine similarity
  rank: number;
}

export interface SuggestionMetadata {
  retrievedCount: number;
  filteredCount: number;
  filtersApplied: Record<string, any>;
  model: string;
  embeddingVersion: string;
  retrievalTimeMs: number;
  diagnosticsLogId: number;
}

export interface CandidateSuggestionsResponse {
  suggestions: CandidateSuggestion[];
  metadata: SuggestionMetadata;
}

export interface PositionSuggestionsResponse {
  suggestions: PositionSuggestion[];
  metadata: SuggestionMetadata;
}
