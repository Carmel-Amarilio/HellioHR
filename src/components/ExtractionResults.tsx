import { useState } from 'react';
import './ExtractionResults.css';

interface ExperienceEntry {
  role: string;
  company: string;
  duration: string;
  achievements?: string[];
}

interface EducationEntry {
  year: string;
  degree: string;
  institution: string;
}

interface ExtractionResultsProps {
  extractedSummary?: string | null;
  extractedExperience?: string | ExperienceEntry[] | null;
  extractedEducation?: string | EducationEntry[] | null;
  extractionMethod?: string | null;
  extractionStatus?: string | null;
  lastExtractionDate?: string | null;
  extractionPromptVersion?: string | null;
}

export function ExtractionResults({
  extractedSummary,
  extractedExperience,
  extractedEducation,
  extractionMethod,
  extractionStatus,
  lastExtractionDate,
  extractionPromptVersion,
}: ExtractionResultsProps) {
  const [expandedSections, setExpandedSections] = useState({
    summary: true,
    experience: false,
    education: false,
  });

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  // Helper to check if experience is an array
  const isExperienceArray = (exp: any): exp is ExperienceEntry[] => {
    return Array.isArray(exp) && exp.length > 0;
  };

  // Helper to check if education is an array
  const isEducationArray = (edu: any): edu is EducationEntry[] => {
    return Array.isArray(edu) && edu.length > 0;
  };

  const hasAnyData = extractedSummary || extractedExperience || extractedEducation;

  if (!hasAnyData) {
    return null;
  }

  const isLLMExtraction = extractionMethod?.toLowerCase().includes('llm') ||
                         extractionMethod?.toLowerCase().includes('bedrock');

  return (
    <div className={`extraction-results ${isLLMExtraction ? 'llm-extraction' : 'heuristic-extraction'}`}>
      <div className="extraction-header">
        <h3>Extracted Information</h3>
        <div className="extraction-badge">
          {isLLMExtraction ? '🤖 AI-Powered' : '⚡ Pattern-Based'}
        </div>
      </div>

      {extractedSummary && (
        <div className="extraction-section">
          <button
            type="button"
            className="section-toggle"
            onClick={() => toggleSection('summary')}
            aria-expanded={expandedSections.summary}
          >
            <span className="toggle-icon">{expandedSections.summary ? '▼' : '▶'}</span>
            <strong>Summary</strong>
          </button>
          {expandedSections.summary && (
            <div className="section-content">
              <p>{extractedSummary}</p>
            </div>
          )}
        </div>
      )}

      {extractedExperience && (
        <div className="extraction-section">
          <button
            type="button"
            className="section-toggle"
            onClick={() => toggleSection('experience')}
            aria-expanded={expandedSections.experience}
          >
            <span className="toggle-icon">{expandedSections.experience ? '▼' : '▶'}</span>
            <strong>Experience</strong>
          </button>
          {expandedSections.experience && (
            <div className="section-content">
              {isExperienceArray(extractedExperience) ? (
                extractedExperience.map((exp, index) => (
                  <div key={index} className="experience-item">
                    <div className="experience-header">
                      <strong>{exp.role}</strong> at {exp.company}
                    </div>
                    <div className="experience-duration">{exp.duration}</div>
                    {exp.achievements && exp.achievements.length > 0 && (
                      <ul className="experience-achievements">
                        {exp.achievements.map((achievement, i) => (
                          <li key={i}>{achievement}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))
              ) : (
                <p>{extractedExperience}</p>
              )}
            </div>
          )}
        </div>
      )}

      {extractedEducation && (
        <div className="extraction-section">
          <button
            type="button"
            className="section-toggle"
            onClick={() => toggleSection('education')}
            aria-expanded={expandedSections.education}
          >
            <span className="toggle-icon">{expandedSections.education ? '▼' : '▶'}</span>
            <strong>Education</strong>
          </button>
          {expandedSections.education && (
            <div className="section-content">
              {isEducationArray(extractedEducation) ? (
                extractedEducation.map((edu, index) => (
                  <div key={index} className="education-item">
                    <div className="education-degree"><strong>{edu.degree}</strong></div>
                    <div className="education-institution">{edu.institution}</div>
                    <div className="education-year">{edu.year}</div>
                  </div>
                ))
              ) : (
                <p>{extractedEducation}</p>
              )}
            </div>
          )}
        </div>
      )}

      <div className="extraction-meta">
        <div className="meta-item">
          <span className="meta-label">Method:</span>
          <span className="meta-value">{extractionMethod || 'N/A'}</span>
        </div>
        <div className="meta-item">
          <span className="meta-label">Status:</span>
          <span className={`meta-value status-${extractionStatus?.toLowerCase()}`}>
            {extractionStatus || 'N/A'}
          </span>
        </div>
        <div className="meta-item">
          <span className="meta-label">Last extracted:</span>
          <span className="meta-value">
            {lastExtractionDate ? new Date(lastExtractionDate).toLocaleString() : 'N/A'}
          </span>
        </div>
        {extractionPromptVersion && (
          <div className="meta-item">
            <span className="meta-label">Prompt version:</span>
            <span className="meta-value">{extractionPromptVersion}</span>
          </div>
        )}
      </div>
    </div>
  );
}
