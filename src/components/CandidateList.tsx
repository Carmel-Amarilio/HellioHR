import { CandidateCard } from './CandidateCard';
import type { Candidate } from '../types';
import './CandidateList.css';

interface CandidateListProps {
  candidates: Candidate[];
}

export function CandidateList({ candidates }: CandidateListProps) {
  if (candidates.length === 0) {
    return <p className="no-results">No candidates found.</p>;
  }

  return (
    <div className="candidate-list">
      {candidates.map((candidate) => (
        <CandidateCard key={candidate.id} candidate={candidate} />
      ))}
    </div>
  );
}
