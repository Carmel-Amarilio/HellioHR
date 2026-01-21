import candidatesData from '../data/candidates.json';
import type { Candidate } from '../types';

const candidates = candidatesData as Candidate[];

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
