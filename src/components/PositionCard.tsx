import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { Position, Candidate } from '../types';
import { useAuth } from '../context/AuthContext';
import { EditPositionModal } from './EditPositionModal';
import './PositionCard.css';

interface PositionCardProps {
  position: Position;
  candidates: Candidate[];
  onPositionUpdate?: (updatedPosition: Position) => void;
}

export function PositionCard({ position, candidates, onPositionUpdate }: PositionCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const { isEditor } = useAuth();

  return (
    <div className="position-card">
      <div
        className="position-card-header"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="position-info">
          <h3 className="position-title">{position.title}</h3>
          <span className="position-department">{position.department}</span>
        </div>
        <div className="position-meta">
          <span className="candidate-count">
            {candidates.length} candidate{candidates.length !== 1 ? 's' : ''}
          </span>
          {isEditor && (
            <button
              className="btn-secondary btn-sm"
              onClick={(e) => {
                e.stopPropagation();
                setIsEditModalOpen(true);
              }}
            >
              Edit
            </button>
          )}
          <span className={`expand-icon ${isExpanded ? 'expanded' : ''}`}>
            ▼
          </span>
        </div>
      </div>

      {isExpanded && (
        <div className="position-card-body">
          <div className="position-description">
            <h4>Description</h4>
            <p>{position.description}</p>
          </div>

          <div className="position-candidates">
            <div className="candidates-header">
              <h4>Candidates</h4>
              {candidates.length === 2 && (
                <Link
                  to={`/compare/${candidates[0].id}/${candidates[1].id}`}
                  className="btn-primary btn-sm"
                  onClick={(e) => e.stopPropagation()}
                >
                  Compare
                </Link>
              )}
            </div>
            {candidates.length > 0 ? (
              <ul className="candidates-list">
                {candidates.map((candidate) => (
                  <li key={candidate.id}>
                    <Link to={`/candidates/${candidate.id}`}>
                      {candidate.name}
                    </Link>
                    <span className="candidate-skills">
                      {(candidate.skills ?? []).slice(0, 3).join(', ')}
                      {(candidate.skills ?? []).length > 3 && '...'}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="no-candidates">No candidates yet.</p>
            )}
          </div>
        </div>
      )}

      <EditPositionModal
        position={position}
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSave={(updatedPosition) => {
          if (onPositionUpdate) {
            onPositionUpdate(updatedPosition);
          }
        }}
      />
    </div>
  );
}
