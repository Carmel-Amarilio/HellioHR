import { useState, useEffect, useCallback } from 'react';
import { getSuggestedPositions, formatSimilarity, getSimilarityColor } from '../services/suggestionService.js';
import type { PositionSuggestionsResponse } from '../services/suggestionService.js';
import './SuggestedPositions.css';

interface SuggestedPositionsProps {
  candidateId: string;
}

export function SuggestedPositions({ candidateId }: SuggestedPositionsProps) {
  const [suggestions, setSuggestions] = useState<PositionSuggestionsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadSuggestions = useCallback(async () => {
    setLoading(true);
    setError(null);

    const result = await getSuggestedPositions(candidateId);
    if (result) {
      setSuggestions(result);
    } else {
      setError('Unable to load suggestions. Embeddings may still be generating.');
    }

    setLoading(false);
  }, [candidateId]);

  useEffect(() => {
    loadSuggestions();
  }, [loadSuggestions]);

  if (loading) {
    return (
      <div className="suggested-positions-container">
        <div className="suggestions-loading">
          <p>Loading suggestions...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="suggested-positions-container">
        <div className="suggestions-error">
          <p>{error}</p>
        </div>
      </div>
    );
  }

  if (!suggestions || suggestions.suggestions.length === 0) {
    return (
      <div className="suggested-positions-container">
        <h3>Suggested Positions</h3>
        <div className="suggestions-empty">
          <p>No positions currently match above the 65% threshold. This candidate may still be qualified for positions shown in the "Applied Positions" section above.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="suggested-positions-container">
      <div className="suggested-positions-header">
        <h3>Suggested Positions</h3>
      </div>

      <div className="suggestions-list">
        {suggestions.suggestions.map((suggestion, index) => (
          <div key={`${suggestion.position.id}-${index}`} className="suggestion-item">
            <div className="suggestion-header">
              <div className="suggestion-title">
                <h4>{suggestion.position.title}</h4>
                <span className={`similarity-badge ${getSimilarityColor(suggestion.similarity)}`}>
                  {formatSimilarity(suggestion.similarity)} match
                </span>
              </div>
              <span className="rank-badge">#{suggestion.rank}</span>
            </div>

            <div className="suggestion-details">
              <p className="department">
                <strong>Department:</strong> {suggestion.position.department}
              </p>

              {suggestion.explanation && (
                <div className="explanation">
                  <strong>Why this match:</strong>
                  <p>{suggestion.explanation}</p>
                </div>
              )}

              {suggestion.position.description && (
                <div className="description">
                  <strong>Overview:</strong>
                  <p>{suggestion.position.description.substring(0, 150)}...</p>
                </div>
              )}
            </div>

            <a
              href={`/positions/${suggestion.position.id}`}
              className="btn-view-position"
            >
              View Position Details
            </a>
          </div>
        ))}
      </div>

      {suggestions && (
        <div className="suggestions-metadata">
          <details>
            <summary>Retrieval Details ({suggestions.metadata.retrievalTimeMs}ms)</summary>
            <ul>
              <li>Retrieved: {suggestions.metadata.retrievedCount} positions</li>
              <li>Returned: {suggestions.metadata.filteredCount} above threshold</li>
              <li>Threshold: {(suggestions.metadata.filtersApplied?.minSimilarity * 100 || 65).toFixed(0)}%</li>
              <li>Model: {suggestions.metadata.model}</li>
            </ul>
          </details>
        </div>
      )}
    </div>
  );
}
