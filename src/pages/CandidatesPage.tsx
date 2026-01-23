import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CandidateList } from '../components/CandidateList';
import { CandidateTable, type SortField as TableSortField } from '../components/CandidateTable';
import { useCandidates } from '../hooks/useCandidates';
import { filterCandidatesBySearch } from '../utils/candidateUtils';
import type { Candidate } from '../types';
import './CandidatesPage.css';

type ViewMode = 'cards' | 'table';
type SortField = 'name' | 'email' | 'status' | 'skills';
type SortDirection = 'asc' | 'desc';

function sortCandidates(candidates: Candidate[], field: SortField, direction: SortDirection): Candidate[] {
  return [...candidates].sort((a, b) => {
    let comparison = 0;
    switch (field) {
      case 'name':
        comparison = a.name.localeCompare(b.name);
        break;
      case 'email':
        comparison = a.email.localeCompare(b.email);
        break;
      case 'status':
        comparison = a.status.localeCompare(b.status);
        break;
      case 'skills':
        comparison = (a.skills?.length ?? 0) - (b.skills?.length ?? 0);
        break;
    }
    return direction === 'asc' ? comparison : -comparison;
  });
}

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
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  const { candidates, loading } = useCandidates();
  const filteredCandidates = filterCandidatesBySearch(candidates, searchTerm);
  const sortedCandidates = useMemo(
    () => sortCandidates(filteredCandidates, sortField, sortDirection),
    [filteredCandidates, sortField, sortDirection]
  );

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

  const handleSortChange = (field: SortField) => {
    if (field === sortField) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
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

      <div className={`search-sort-bar ${viewMode === 'table' ? 'search-only' : ''}`}>
        <div className="search-bar">
          <input
            type="text"
            placeholder="Search by name, email, or skill..."
            value={searchTerm}
            onChange={(e) => handleSearchChange(e.target.value)}
          />
        </div>
        {viewMode === 'cards' && (
          <div className="sort-controls">
            <label>Sort by:</label>
            <select
              value={sortField}
              onChange={(e) => handleSortChange(e.target.value as SortField)}
              className="sort-select"
            >
              <option value="name">Name</option>
              <option value="email">Email</option>
              <option value="status">Status</option>
              <option value="skills">Skills Count</option>
            </select>
            <button
              className="sort-direction-btn"
              onClick={() => setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')}
              aria-label={`Sort ${sortDirection === 'asc' ? 'ascending' : 'descending'}`}
            >
              {sortDirection === 'asc' ? '↑' : '↓'}
            </button>
          </div>
        )}
      </div>

      {loading && <div className="loading">Loading candidates...</div>}

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
          candidates={sortedCandidates}
          selectedIds={selectedIds}
          onToggleSelect={handleToggleSelect}
        />
      ) : (
        <CandidateTable
          candidates={sortedCandidates}
          selectedIds={selectedIds}
          onToggleSelect={handleToggleSelect}
          sortField={sortField as TableSortField}
          sortDirection={sortDirection}
          onSort={handleSortChange}
        />
      )}
    </div>
  );
}
