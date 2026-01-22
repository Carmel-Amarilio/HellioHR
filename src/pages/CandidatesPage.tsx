import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CandidateList } from '../components/CandidateList';
import { CandidateTable } from '../components/CandidateTable';
import { useActiveCandidates } from '../hooks/useCandidates';
import { filterCandidatesBySearch } from '../utils/candidateUtils';
import './CandidatesPage.css';

type ViewMode = 'cards' | 'table';

export function CandidatesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const searchTerm = searchParams.get('search') ?? '';
  const selectedIdsParam = searchParams.get('selected') ?? '';
  const viewParam = searchParams.get('view') as ViewMode | null;

  const [selectedIds, setSelectedIds] = useState<string[]>(() =>
    selectedIdsParam ? selectedIdsParam.split(',').filter(Boolean) : []
  );
  const [viewMode, setViewMode] = useState<ViewMode>(() =>
    viewParam === 'table' ? 'table' : 'cards'
  );

  const candidates = useActiveCandidates();
  const filteredCandidates = filterCandidatesBySearch(candidates, searchTerm);

  // Sync selectedIds to URL
  useEffect(() => {
    const newParams = new URLSearchParams(searchParams);
    if (selectedIds.length > 0) {
      newParams.set('selected', selectedIds.join(','));
    } else {
      newParams.delete('selected');
    }
    setSearchParams(newParams, { replace: true });
  }, [selectedIds, searchParams, setSearchParams]);

  const handleSearchChange = (value: string) => {
    const newParams = new URLSearchParams(searchParams);
    if (value) {
      newParams.set('search', value);
    } else {
      newParams.delete('search');
    }
    setSearchParams(newParams, { replace: true });
  };

  const handleViewChange = (mode: ViewMode) => {
    setViewMode(mode);
    const newParams = new URLSearchParams(searchParams);
    if (mode === 'table') {
      newParams.set('view', 'table');
    } else {
      newParams.delete('view');
    }
    setSearchParams(newParams, { replace: true });
  };

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
      <div className="page-header">
        <h1>Candidates</h1>
        <div className="view-toggle">
          <button
            className={`view-btn ${viewMode === 'cards' ? 'active' : ''}`}
            onClick={() => handleViewChange('cards')}
            aria-label="Cards view"
          >
            <span className="view-icon">▦</span>
            <span className="view-label">Cards</span>
          </button>
          <button
            className={`view-btn ${viewMode === 'table' ? 'active' : ''}`}
            onClick={() => handleViewChange('table')}
            aria-label="Table view"
          >
            <span className="view-icon">☰</span>
            <span className="view-label">Table</span>
          </button>
        </div>
      </div>

      <div className="search-bar">
        <input
          type="text"
          placeholder="Search by name, email, or skill..."
          value={searchTerm}
          onChange={(e) => handleSearchChange(e.target.value)}
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

      {viewMode === 'cards' ? (
        <CandidateList
          candidates={filteredCandidates}
          selectedIds={selectedIds}
          onToggleSelect={handleToggleSelect}
        />
      ) : (
        <CandidateTable
          candidates={filteredCandidates}
          selectedIds={selectedIds}
          onToggleSelect={handleToggleSelect}
        />
      )}
    </div>
  );
}
