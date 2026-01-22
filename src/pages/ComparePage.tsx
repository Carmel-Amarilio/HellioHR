import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useCandidate } from '../hooks/useCandidates';
import { usePositions } from '../hooks/usePositions';
import { getLinkedPositions } from '../utils/positionUtils';
import { CvViewer } from '../components/CvViewer';
import type { Candidate } from '../types';
import './ComparePage.css';

export function ComparePage() {
  const { id1, id2 } = useParams<{ id1: string; id2: string }>();
  const candidate1 = useCandidate(id1);
  const candidate2 = useCandidate(id2);
  const positions = usePositions();
  const [cvCandidate, setCvCandidate] = useState<Candidate | null>(null);

  if (!candidate1 || !candidate2) {
    return (
      <div>
        <h1>Comparison Not Available</h1>
        <p>One or both candidates could not be found.</p>
        <Link to="/">Back to Candidates</Link>
      </div>
    );
  }

  const positions1 = getLinkedPositions(candidate1, positions);
  const positions2 = getLinkedPositions(candidate2, positions);

  const skills1 = candidate1.skills ?? [];
  const skills2 = candidate2.skills ?? [];
  const allSkills = [...new Set([...skills1, ...skills2])].sort();

  return (
    <div className="compare-page">
      <Link to="/" className="back-link">← Back to Candidates</Link>
      <h1>Compare Candidates</h1>

      <div className="compare-grid">
        {/* Header Row */}
        <div className="compare-cell compare-header empty"></div>
        <div className="compare-cell compare-header">
          <h2>{candidate1.name}</h2>
          <span className={`candidate-status status-${candidate1.status}`}>
            {candidate1.status}
          </span>
        </div>
        <div className="compare-cell compare-header">
          <h2>{candidate2.name}</h2>
          <span className={`candidate-status status-${candidate2.status}`}>
            {candidate2.status}
          </span>
        </div>

        {/* Contact Section */}
        <div className="compare-cell compare-label">Email</div>
        <div className="compare-cell">
          <a href={`https://mail.google.com/mail/?view=cm&to=${encodeURIComponent(candidate1.email)}`} target="_blank" rel="noopener noreferrer">
            {candidate1.email}
          </a>
        </div>
        <div className="compare-cell">
          <a href={`https://mail.google.com/mail/?view=cm&to=${encodeURIComponent(candidate2.email)}`} target="_blank" rel="noopener noreferrer">
            {candidate2.email}
          </a>
        </div>

        <div className="compare-cell compare-label">Phone</div>
        <div className="compare-cell">{candidate1.phone}</div>
        <div className="compare-cell">{candidate2.phone}</div>

        {/* Skills Section */}
        <div className="compare-cell compare-label">Skills</div>
        <div className="compare-cell">
          <div className="skills-list">
            {allSkills.map((skill) => (
              <span
                key={skill}
                className={`skill-tag ${skills1.includes(skill) ? '' : 'skill-missing'}`}
              >
                {skill}
              </span>
            ))}
          </div>
        </div>
        <div className="compare-cell">
          <div className="skills-list">
            {allSkills.map((skill) => (
              <span
                key={skill}
                className={`skill-tag ${skills2.includes(skill) ? '' : 'skill-missing'}`}
              >
                {skill}
              </span>
            ))}
          </div>
        </div>

        {/* Positions Section */}
        <div className="compare-cell compare-label">Applied Positions</div>
        <div className="compare-cell">
          {positions1.length > 0 ? (
            <ul className="positions-list">
              {positions1.map((p) => (
                <li key={p.id}>{p.title}</li>
              ))}
            </ul>
          ) : (
            <span className="no-data">None</span>
          )}
        </div>
        <div className="compare-cell">
          {positions2.length > 0 ? (
            <ul className="positions-list">
              {positions2.map((p) => (
                <li key={p.id}>{p.title}</li>
              ))}
            </ul>
          ) : (
            <span className="no-data">None</span>
          )}
        </div>

        {/* CV Section */}
        <div className="compare-cell compare-label">CV</div>
        <div className="compare-cell">
          <button className="cv-link-btn" onClick={() => setCvCandidate(candidate1)}>
            View CV
          </button>
        </div>
        <div className="compare-cell">
          <button className="cv-link-btn" onClick={() => setCvCandidate(candidate2)}>
            View CV
          </button>
        </div>
      </div>

      {cvCandidate && (
        <CvViewer candidate={cvCandidate} onClose={() => setCvCandidate(null)} />
      )}
    </div>
  );
}
