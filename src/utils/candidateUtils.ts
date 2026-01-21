import type { Candidate } from '../types';

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
