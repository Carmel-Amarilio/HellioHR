import { useState, useEffect } from 'react';
import {
  fetchAllCandidates,
  fetchCandidateById,
} from '../services/candidateService';
import type { Candidate } from '../types';

export function useCandidates(): { candidates: Candidate[]; loading: boolean } {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAllCandidates()
      .then(setCandidates)
      .finally(() => setLoading(false));
  }, []);

  return { candidates, loading };
}

export function useActiveCandidates(): { candidates: Candidate[]; loading: boolean } {
  const { candidates, loading } = useCandidates();
  return {
    candidates: candidates.filter((c) => c.status === 'active'),
    loading,
  };
}

export function useCandidate(id: string | undefined): { candidate: Candidate | undefined; loading: boolean } {
  const [candidate, setCandidate] = useState<Candidate | undefined>(undefined);
  const [loading, setLoading] = useState(!!id);

  useEffect(() => {
    if (!id) {
      return;
    }
    let cancelled = false;
    fetchCandidateById(id)
      .then((result) => {
        if (!cancelled) setCandidate(result);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  return { candidate, loading };
}
