import { Link } from 'react-router-dom';
import type { Candidate } from '../types';
import './CandidateCard.css';

interface CandidateCardProps {
  candidate: Candidate;
}

export function CandidateCard({ candidate }: CandidateCardProps) {
  const skills = candidate.skills ?? [];

  return (
    <Link to={`/candidates/${candidate.id}`} className="candidate-card">
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
    </Link>
  );
}
