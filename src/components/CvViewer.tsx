import { useEffect, useState } from 'react';
import type { Candidate } from '../types';
import './CvViewer.css';

interface CvViewerProps {
  candidate: Candidate;
  onClose: () => void;
}

export function CvViewer({ candidate, onClose }: CvViewerProps) {
  const API_BASE_URL = 'http://localhost:3000';
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEscape);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  // Fetch PDF with authentication
  useEffect(() => {
    const fetchPdf = async () => {
      if (!candidate.cvUrl) {
        setLoading(false);
        return;
      }

      try {
        const token = localStorage.getItem('auth_token');
        const response = await fetch(`${API_BASE_URL}${candidate.cvUrl}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (!response.ok) {
          throw new Error(`Failed to load PDF: ${response.status} ${response.statusText}`);
        }

        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        setPdfUrl(url);
        setError(null);
      } catch (err) {
        console.error('Error fetching PDF:', err);
        setError(err instanceof Error ? err.message : 'Failed to load PDF');
      } finally {
        setLoading(false);
      }
    };

    fetchPdf();

    // Cleanup: revoke object URL when component unmounts
    return () => {
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl);
      }
    };
  }, [candidate.cvUrl]);

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  };

  const handleDownload = async () => {
    if (!candidate.cvUrl) return;

    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${API_BASE_URL}${candidate.cvUrl}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to download CV');
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${candidate.name}_CV.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error downloading CV:', err);
      alert('Failed to download CV. Please try again.');
    }
  };

  return (
    <div className="cv-modal-backdrop" onClick={handleBackdropClick}>
      <div className="cv-modal" role="dialog" aria-labelledby="cv-title">
        <button className="cv-close-btn" onClick={onClose} aria-label="Close CV" />
        <div className="cv-content">
          <header className="cv-header">
            <h1 id="cv-title">{candidate.name} - CV</h1>
          </header>

          {candidate.cvUrl ? (
            <div className="cv-pdf-container">
              {loading && (
                <div style={{ padding: '3rem', textAlign: 'center', color: '#666' }}>
                  <p style={{ fontSize: '1.1rem' }}>Loading CV...</p>
                </div>
              )}

              {error && (
                <div style={{ padding: '3rem', textAlign: 'center', color: '#d32f2f' }}>
                  <p style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>Failed to load CV</p>
                  <p style={{ fontSize: '0.9rem' }}>{error}</p>
                </div>
              )}

              {!loading && !error && pdfUrl && (
                <>
                  <iframe
                    src={pdfUrl}
                    title={`${candidate.name} CV`}
                    style={{
                      width: '100%',
                      height: '70vh',
                      border: 'none',
                      borderRadius: '8px',
                    }}
                  />
                  <div className="cv-actions" style={{ marginTop: '1rem', display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                    <button
                      onClick={handleDownload}
                      style={{
                        padding: '0.75rem 1.5rem',
                        backgroundColor: '#0066cc',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        fontSize: '1rem',
                        fontWeight: '500',
                        cursor: 'pointer',
                      }}
                    >
                      📥 Download CV
                    </button>
                  </div>
                </>
              )}
            </div>
          ) : (
            <div style={{ padding: '3rem', textAlign: 'center', color: '#666' }}>
              <p style={{ fontSize: '1.1rem' }}>No CV has been uploaded for this candidate yet.</p>
            </div>
          )}

          {/* Extracted Information Section */}
          <section className="cv-section" style={{ marginTop: '2rem', borderTop: '2px solid #eee', paddingTop: '2rem' }}>
            <h2>AI-Extracted Information</h2>

            {candidate.extractedSummary && (
              <div style={{ marginBottom: '1.5rem' }}>
                <h3 style={{ color: '#333', marginBottom: '0.5rem' }}>Professional Summary</h3>
                <p style={{ lineHeight: '1.6' }}>{candidate.extractedSummary}</p>
              </div>
            )}

            {candidate.skills && candidate.skills.length > 0 && (
              <div style={{ marginBottom: '1.5rem' }}>
                <h3 style={{ color: '#333', marginBottom: '0.5rem' }}>Skills</h3>
                <div className="cv-skills">
                  {candidate.skills.map((skill) => (
                    <span key={skill} className="cv-skill-tag">{skill}</span>
                  ))}
                </div>
              </div>
            )}

            {candidate.extractedExperience && (
              <div style={{ marginBottom: '1.5rem' }}>
                <h3 style={{ color: '#333', marginBottom: '0.5rem' }}>Work Experience</h3>
                <pre style={{ whiteSpace: 'pre-wrap', lineHeight: '1.6', fontFamily: 'inherit' }}>
                  {candidate.extractedExperience}
                </pre>
              </div>
            )}

            {candidate.extractedEducation && (
              <div style={{ marginBottom: '1.5rem' }}>
                <h3 style={{ color: '#333', marginBottom: '0.5rem' }}>Education</h3>
                <p style={{ lineHeight: '1.6' }}>{candidate.extractedEducation}</p>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
