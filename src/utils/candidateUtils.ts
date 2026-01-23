import type { Candidate, Position } from '../types';

export function filterCandidatesBySearch(
  candidates: Candidate[],
  searchTerm: string
): Candidate[] {
  const search = searchTerm.toLowerCase().trim();
  if (!search) return candidates;

  return candidates.filter((candidate) => {
    const name = candidate.name?.toLowerCase() ?? '';
    const email = candidate.email?.toLowerCase() ?? '';
    const skills = candidate.skills ?? [];

    return (
      name.includes(search) ||
      email.includes(search) ||
      skills.some((skill) => skill?.toLowerCase().includes(search))
    );
  });
}

export function sortCandidatesByName(candidates: Candidate[]): Candidate[] {
  return [...candidates].sort((a, b) =>
    (a.name ?? '').localeCompare(b.name ?? '')
  );
}

export function getAllSkillsComparison(candidate1: Candidate, candidate2: Candidate): string[] {
  const skills1 = candidate1.skills ?? [];
  const skills2 = candidate2.skills ?? [];
  return [...new Set([...skills1, ...skills2])].sort();
}

export function hasSkill(candidate: Candidate, skill: string): boolean {
  const skills = candidate.skills ?? [];
  return skills.includes(skill);
}

export interface ComparisonData {
  candidate1: Candidate;
  candidate2: Candidate;
  allSkills: string[];
  positions1: Position[];
  positions2: Position[];
}

export function createComparisonData(
  candidate1: Candidate,
  candidate2: Candidate,
  positions: Position[]
): ComparisonData {
  const allSkills = getAllSkillsComparison(candidate1, candidate2);

  // Filter positions linked to each candidate
  const positions1 = positions.filter(p =>
    candidate1.positionIds?.includes(p.id)
  );
  const positions2 = positions.filter(p =>
    candidate2.positionIds?.includes(p.id)
  );

  return {
    candidate1,
    candidate2,
    allSkills,
    positions1,
    positions2
  };
}

export function validateComparisonIds(id1: string | undefined, id2: string | undefined): boolean {
  return !!(id1 && id2 && id1 !== id2);
}
