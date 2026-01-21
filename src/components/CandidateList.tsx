import { CandidateCard } from './CandidateCard';
import type { Candidate } from '../types';
import './CandidateList.css';

interface CandidateListProps {
  candidates: Candidate[];
  selectedIds?: string[];
  onToggleSelect?: (id: string) => void;
  maxSelections?: number;
}

export function CandidateList({
  candidates,
  selectedIds = [],
  onToggleSelect,
  maxSelections = 2,
}: CandidateListProps) {
  if (candidates.length === 0) {
    return <p className="no-results">No candidates found.</p>;
  }

  const selectionDisabled = selectedIds.length >= maxSelections;

  return (
    <div className="candidate-list">
      {candidates.map((candidate) => (
        <CandidateCard
          key={candidate.id}
          candidate={candidate}
          isSelected={selectedIds.includes(candidate.id)}
          onToggleSelect={onToggleSelect}
          selectionDisabled={selectionDisabled}
        />
      ))}
    </div>
  );
}
