import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CandidateList } from '../components/CandidateList';
import { useActiveCandidates } from '../hooks/useCandidates';
import { filterCandidatesBySearch } from '../utils/candidateUtils';
import './CandidatesPage.css';

export function CandidatesPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const navigate = useNavigate();

  const candidates = useActiveCandidates();
  const filteredCandidates = filterCandidatesBySearch(candidates, searchTerm);

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id)
        ? prev.filter((selectedId) => selectedId !== id)
        : prev.length < 2
          ? [...prev, id]
          : prev
    );
  };

  const handleCompare = () => {
    if (selectedIds.length === 2) {
      navigate(`/compare/${selectedIds[0]}/${selectedIds[1]}`);
    }
  };

  const handleClearSelection = () => {
    setSelectedIds([]);
  };

  return (
    <div>
      <h1>Candidates</h1>
      <div className="search-bar">
        <input
          type="text"
          placeholder="Search by name, email, or skill..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {selectedIds.length > 0 && (
        <div className="selection-bar">
          <span className="selection-count">
            {selectedIds.length} of 2 selected
          </span>
          <div className="selection-actions">
            <button
              className="btn-secondary"
              onClick={handleClearSelection}
            >
              Clear
            </button>
            <button
              className="btn-primary"
              onClick={handleCompare}
              disabled={selectedIds.length !== 2}
            >
              Compare
            </button>
          </div>
        </div>
      )}

      <CandidateList
        candidates={filteredCandidates}
        selectedIds={selectedIds}
        onToggleSelect={handleToggleSelect}
      />
    </div>
  );
}
