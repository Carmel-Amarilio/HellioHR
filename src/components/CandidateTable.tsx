import { Link } from 'react-router-dom';
import type { Candidate } from '../types';
import './CandidateTable.css';

export type SortField = 'name' | 'email' | 'status' | 'skills';
export type SortDirection = 'asc' | 'desc';

interface CandidateTableProps {
  candidates: Candidate[];
  selectedIds?: string[];
  onToggleSelect?: (id: string) => void;
  maxSelections?: number;
  sortField?: SortField;
  sortDirection?: SortDirection;
  onSort?: (field: SortField) => void;
}

export function CandidateTable({
  candidates,
  selectedIds = [],
  onToggleSelect,
  maxSelections = 2,
  sortField = 'name',
  sortDirection = 'asc',
  onSort,
}: CandidateTableProps) {
  if (candidates.length === 0) {
    return <p className="no-results">No candidates found.</p>;
  }

  const selectionDisabled = selectedIds.length >= maxSelections;

  const handleSelectClick = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    const isDisabled = selectionDisabled && !selectedIds.includes(id);
    if (!isDisabled && onToggleSelect) {
      onToggleSelect(id);
    }
  };

  return (
    <div className="candidate-table-wrapper">
      <table className="candidate-table">
        <thead>
          <tr>
            {onToggleSelect && <th className="col-select"></th>}
            <th
              className={`col-name sortable ${sortField === 'name' ? 'sorted' : ''}`}
              onClick={() => onSort?.('name')}
            >
              Name {sortField === 'name' && <span className="sort-indicator">{sortDirection === 'asc' ? '↑' : '↓'}</span>}
            </th>
            <th
              className={`col-email sortable ${sortField === 'email' ? 'sorted' : ''}`}
              onClick={() => onSort?.('email')}
            >
              Email {sortField === 'email' && <span className="sort-indicator">{sortDirection === 'asc' ? '↑' : '↓'}</span>}
            </th>
            <th className="col-phone">Phone</th>
            <th
              className={`col-skills sortable ${sortField === 'skills' ? 'sorted' : ''}`}
              onClick={() => onSort?.('skills')}
            >
              Skills {sortField === 'skills' && <span className="sort-indicator">{sortDirection === 'asc' ? '↑' : '↓'}</span>}
            </th>
            <th
              className={`col-status sortable ${sortField === 'status' ? 'sorted' : ''}`}
              onClick={() => onSort?.('status')}
            >
              Status {sortField === 'status' && <span className="sort-indicator">{sortDirection === 'asc' ? '↑' : '↓'}</span>}
            </th>
          </tr>
        </thead>
        <tbody>
          {candidates.map((candidate) => {
            const isSelected = selectedIds.includes(candidate.id);
            const isDisabled = selectionDisabled && !isSelected;
            const skills = candidate.skills ?? [];

            return (
              <tr
                key={candidate.id}
                className={isSelected ? 'selected' : ''}
              >
                {onToggleSelect && (
                  <td className="col-select">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      readOnly
                      disabled={isDisabled}
                      onClick={(e) => handleSelectClick(e, candidate.id)}
                      aria-label={`Select ${candidate.name}`}
                    />
                  </td>
                )}
                <td className="col-name">
                  <Link to={`/candidates/${candidate.id}`}>
                    {candidate.name}
                  </Link>
                </td>
                <td className="col-email">
                  <a
                    href={`https://mail.google.com/mail/?view=cm&to=${encodeURIComponent(candidate.email)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {candidate.email}
                  </a>
                </td>
                <td className="col-phone">{candidate.phone}</td>
                <td className="col-skills">
                  <div className="skills-cell">
                    {skills.slice(0, 3).map((skill) => (
                      <span key={skill} className="skill-tag">{skill}</span>
                    ))}
                    {skills.length > 3 && (
                      <span className="skill-more">+{skills.length - 3}</span>
                    )}
                  </div>
                </td>
                <td className="col-status">
                  <span className={`status-badge status-${candidate.status}`}>
                    {candidate.status}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
