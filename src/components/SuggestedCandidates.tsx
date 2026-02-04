import { useState, useEffect, useCallback } from 'react';
import { getSuggestedCandidates, formatSimilarity, getSimilarityColor } from '../services/suggestionService.js';
import type { CandidateSuggestionsResponse } from '../services/suggestionService.js';
import './SuggestedCandidates.css';

interface SuggestedCandidatesProps {
  positionId: string;
}

export function SuggestedCandidates({ positionId }: SuggestedCandidatesProps) {
  const [suggestions, setSuggestions] = useState<CandidateSuggestionsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

  const loadSuggestions = useCallback(async () => {
    setLoading(true);
    setError(null);

    const result = await getSuggestedCandidates(positionId);
    if (result) {
      setSuggestions(result);
    } else {
      setError('Unable to load suggestions. Embeddings may still be generating.');
    }

    setLoading(false);
  }, [positionId]);

  useEffect(() => {
    if (expanded) {
      loadSuggestions();
    }
  }, [expanded, loadSuggestions]);

  if (!expanded) {
    return (
      <div className="suggested-candidates-header">
        <button
          className="btn-suggest-candidates"
          onClick={() => setExpanded(true)}
        >
          💡 Suggest Candidates
        </button>
      </div>
    );
  }

  return (
    <div className="suggested-candidates-container">
      <div className="suggested-candidates-header">
        <h3>Suggested Candidates</h3>
        <button
          className="btn-collapse"
          onClick={() => setExpanded(false)}
        >
          ✕
        </button>
      </div>

      {loading && (
        <div className="suggestions-loading">
          <div className="loading-spinner"></div>
          <p>Finding best matches...</p>
        </div>
      )}

      {error && (
        <div className="suggestions-error">
          <p>{error}</p>
        </div>
      )}

      {suggestions && suggestions.suggestions.length > 0 ? (
        <div className="suggestions-list">
          {suggestions.suggestions.map((suggestion, index) => (
            <div key={`${suggestion.candidate.id}-${index}`} className="suggestion-item">
              <div className="suggestion-header">
                <div className="suggestion-title">
                  <h4>{suggestion.candidate.name}</h4>
                  <span className={`similarity-badge ${getSimilarityColor(suggestion.similarity)}`}>
                    {formatSimilarity(suggestion.similarity)} match
                  </span>
                </div>
                <span className="rank-badge">#{suggestion.rank}</span>
              </div>

              <div className="suggestion-details">
                <p className="email">{suggestion.candidate.email}</p>
                {suggestion.candidate.phone && (
                  <p className="phone">{suggestion.candidate.phone}</p>
                )}
                {suggestion.candidate.skills && suggestion.candidate.skills.length > 0 && (
                  <div className="skills">
                    <strong>Skills:</strong> {suggestion.candidate.skills.join(', ')}
                  </div>
                )}
              </div>

              {suggestion.candidate.cvUrl && (
                <a
                  href={suggestion.candidate.cvUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-view-profile"
                >
                  View Profile
                </a>
              )}
            </div>
          ))}
        </div>
      ) : suggestions && suggestions.suggestions.length === 0 ? (
        <div className="suggestions-empty">
          <p>No suitable candidates found. Check that embeddings have been generated.</p>
        </div>
      ) : null}

      {suggestions && (
        <div className="suggestions-metadata">
          <details>
            <summary>Retrieval Details ({suggestions.metadata.retrievalTimeMs}ms)</summary>
            <ul>
              <li>Retrieved: {suggestions.metadata.retrievedCount} candidates</li>
              <li>Returned: {suggestions.metadata.filteredCount} after filtering</li>
              <li>Model: {suggestions.metadata.model}</li>
            </ul>
          </details>
        </div>
      )}
    </div>
  );
}
