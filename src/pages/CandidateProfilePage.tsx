import { useParams, Link } from 'react-router-dom';
import { useCandidate } from '../hooks/useCandidates';
import { usePositions } from '../hooks/usePositions';
import { getLinkedPositions } from '../utils/positionUtils';
import './CandidateProfilePage.css';

export function CandidateProfilePage() {
  const { id } = useParams<{ id: string }>();
  const candidate = useCandidate(id);
  const positions = usePositions();

  if (!candidate) {
    return (
      <div>
        <h1>Candidate Not Found</h1>
        <p>The candidate you're looking for doesn't exist.</p>
        <Link to="/">Back to Candidates</Link>
      </div>
    );
  }

  const linkedPositions = getLinkedPositions(candidate, positions);
  const skills = candidate.skills ?? [];

  return (
    <div className="candidate-profile">
      <Link to="/" className="back-link">← Back to Candidates</Link>

      <div className="profile-header">
        <h1>{candidate.name}</h1>
        <span className={`candidate-status status-${candidate.status}`}>
          {candidate.status}
        </span>
      </div>

      <section className="profile-section">
        <h2>Contact Information</h2>
        <dl className="info-list">
          <dt>Email</dt>
          <dd><a href={`mailto:${candidate.email}`}>{candidate.email}</a></dd>
          <dt>Phone</dt>
          <dd>{candidate.phone}</dd>
        </dl>
      </section>

      <section className="profile-section">
        <h2>Skills</h2>
        <div className="skills-list">
          {skills.length > 0 ? (
            skills.map((skill) => (
              <span key={skill} className="skill-tag">{skill}</span>
            ))
          ) : (
            <p className="no-data">No skills listed.</p>
          )}
        </div>
      </section>

      <section className="profile-section">
        <h2>Applied Positions</h2>
        {linkedPositions.length > 0 ? (
          <ul className="positions-list">
            {linkedPositions.map((position) => (
              <li key={position.id}>
                <strong>{position.title}</strong> - {position.department}
              </li>
            ))}
          </ul>
        ) : (
          <p className="no-positions">No positions linked.</p>
        )}
      </section>

      <section className="profile-section">
        <h2>CV</h2>
        <a href={candidate.cvUrl} className="cv-link" target="_blank" rel="noopener noreferrer">
          View CV (PDF)
        </a>
      </section>
    </div>
  );
}
