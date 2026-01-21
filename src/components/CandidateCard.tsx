import { Link } from 'react-router-dom';
import type { Candidate } from '../types';
import './CandidateCard.css';

interface CandidateCardProps {
  candidate: Candidate;
  isSelected?: boolean;
  onToggleSelect?: (id: string) => void;
  selectionDisabled?: boolean;
}

export function CandidateCard({
  candidate,
  isSelected = false,
  onToggleSelect,
  selectionDisabled = false,
}: CandidateCardProps) {
  const skills = candidate.skills ?? [];

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
    onToggleSelect?.(candidate.id);
  };

  const handleCheckboxClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  return (
    <Link
      to={`/candidates/${candidate.id}`}
      className={`candidate-card ${isSelected ? 'selected' : ''}`}
    >
      {onToggleSelect && (
        <div className="candidate-select" onClick={handleCheckboxClick}>
          <input
            type="checkbox"
            checked={isSelected}
            onChange={handleCheckboxChange}
            disabled={selectionDisabled && !isSelected}
            aria-label={`Select ${candidate.name} for comparison`}
          />
        </div>
      )}
      <div className="candidate-card-content">
        <div className="candidate-card-header">
          <h3 className="candidate-name">{candidate.name}</h3>
          <span className={`candidate-status status-${candidate.status}`}>
            {candidate.status}
          </span>
        </div>
        <p className="candidate-email">{candidate.email}</p>
        <div className="candidate-skills">
          {skills.map((skill) => (
            <span key={skill} className="skill-tag">{skill}</span>
          ))}
        </div>
      </div>
    </Link>
  );
}
