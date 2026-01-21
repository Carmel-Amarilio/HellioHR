import { useMemo } from 'react';
import {
  getAllCandidates,
  getActiveCandidates,
  getCandidateById,
} from '../services/candidateService';
import type { Candidate } from '../types';

export function useCandidates(): Candidate[] {
  return useMemo(() => getAllCandidates(), []);
}

export function useActiveCandidates(): Candidate[] {
  return useMemo(() => getActiveCandidates(), []);
}

export function useCandidate(id: string | undefined): Candidate | undefined {
  return useMemo(() => {
    if (!id) return undefined;
    return getCandidateById(id);
  }, [id]);
}
