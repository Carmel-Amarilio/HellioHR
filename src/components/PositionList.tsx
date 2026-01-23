import { PositionCard } from './PositionCard';
import { getLinkedCandidates } from '../utils/positionUtils';
import type { Position, Candidate } from '../types';
import './PositionList.css';

interface PositionListProps {
  positions: Position[];
  candidates: Candidate[];
  onPositionUpdate?: (updatedPosition: Position) => void;
}

export function PositionList({ positions, candidates, onPositionUpdate }: PositionListProps) {
  if (positions.length === 0) {
    return <p className="no-results">No positions found.</p>;
  }

  return (
    <div className="position-list">
      {positions.map((position) => (
        <PositionCard
          key={position.id}
          position={position}
          candidates={getLinkedCandidates(position, candidates)}
          onPositionUpdate={onPositionUpdate}
        />
      ))}
    </div>
  );
}
