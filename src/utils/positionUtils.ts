import type { Candidate, Position } from '../types';

export function getLinkedPositions(
  candidate: Candidate,
  allPositions: Position[]
): Position[] {
  const positionIds = candidate.positionIds ?? [];
  return allPositions.filter((p) => positionIds.includes(p.id));
}

export function getLinkedCandidates(
  position: Position,
  allCandidates: Candidate[]
): Candidate[] {
  const candidateIds = position.candidateIds ?? [];
  return allCandidates.filter((c) => candidateIds.includes(c.id));
}
