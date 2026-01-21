import { useState } from 'react';
import { CandidateList } from '../components/CandidateList';
import { useActiveCandidates } from '../hooks/useCandidates';
import { filterCandidatesBySearch } from '../utils/candidateUtils';
import './CandidatesPage.css';

export function CandidatesPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const candidates = useActiveCandidates();
  const filteredCandidates = filterCandidatesBySearch(candidates, searchTerm);

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
      <CandidateList candidates={filteredCandidates} />
    </div>
  );
}
