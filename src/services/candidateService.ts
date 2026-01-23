import candidatesData from '../data/candidates.json';
import type { Candidate } from '../types';
import { apiClient } from './apiClient';

const candidates = candidatesData as Candidate[];

// Use API mode when authenticated, fallback to JSON for development
const shouldUseApi = () => apiClient.isAuthenticated();

// Synchronous functions (original - for backward compatibility)
export function getAllCandidates(): Candidate[] {
  return candidates;
}

export function getCandidateById(id: string): Candidate | undefined {
  return candidates.find((c) => c.id === id);
}

export function getActiveCandidates(): Candidate[] {
  return candidates.filter((c) => c.status === 'active');
}

export function getCandidatesByIds(ids: string[]): Candidate[] {
  return candidates.filter((c) => ids.includes(c.id));
}

// Async API functions
export async function fetchAllCandidates(): Promise<Candidate[]> {
  if (!shouldUseApi()) {
    return candidates;
  }
  return apiClient.get<Candidate[]>('/api/candidates');
}

export async function fetchCandidateById(id: string): Promise<Candidate | undefined> {
  if (!shouldUseApi()) {
    return candidates.find((c) => c.id === id);
  }
  try {
    return await apiClient.get<Candidate>(`/api/candidates/${id}`);
  } catch {
    return undefined;
  }
}

export async function fetchCandidatesByIds(ids: string[]): Promise<Candidate[]> {
  if (!shouldUseApi()) {
    return candidates.filter((c) => ids.includes(c.id));
  }
  // Fetch all and filter client-side (or could use a bulk endpoint)
  const allCandidates = await apiClient.get<Candidate[]>('/api/candidates');
  return allCandidates.filter((c) => ids.includes(c.id));
}

export interface CompareResponse {
  candidates: [Candidate, Candidate];
}

export async function fetchCandidatesForCompare(id1: string, id2: string): Promise<CompareResponse> {
  if (!shouldUseApi()) {
    const c1 = candidates.find((c) => c.id === id1);
    const c2 = candidates.find((c) => c.id === id2);
    if (!c1 || !c2) {
      throw new Error('Candidates not found');
    }
    return { candidates: [c1, c2] };
  }
  return apiClient.get<CompareResponse>(`/api/compare/${id1}/${id2}`);
}
