import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useCandidate } from '../hooks/useCandidates';
import { usePositions } from '../hooks/usePositions';
import { getLinkedPositions } from '../utils/positionUtils';
import { CvViewer } from '../components/CvViewer';
import { UploadCVModal } from '../components/UploadCVModal';
import { ExtractionResults } from '../components/ExtractionResults';
import { SuggestedPositions } from '../components/SuggestedPositions';
import { useAuth } from '../context/AuthContext';
import { uploadCV, waitForExtraction, type ExtractionResults as ExtractionResultsData } from '../services/documentService';
import './CandidateProfilePage.css';

export function CandidateProfilePage() {
  const { id } = useParams<{ id: string }>();
  const { candidate, loading: candidateLoading } = useCandidate(id);
  const { positions } = usePositions();
  const { isEditor } = useAuth();
  const [showCv, setShowCv] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [extractionResults, setExtractionResults] = useState<ExtractionResultsData | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);

  if (candidateLoading) {
    return <div>Loading...</div>;
  }

  if (!candidate) {
    return (
      <div>
        <h1>Candidate Not Found</h1>
        <p>The candidate you're looking for doesn't exist.</p>
        <Link to="/">Back to Candidates</Link>
      </div>
    );
  }

  const linkedPositions = getLinkedPositions(candidate, positions);
  const skills = candidate.skills ?? [];

  const handleUpload = async (file: File, useLLM: boolean) => {
    if (!id) return;

    try {
      // Upload the file
      const uploadResponse = await uploadCV(id, file, useLLM);

      // Wait for extraction to complete
      const status = await waitForExtraction(uploadResponse.document.id);

      // Get extraction results
      // The status already includes the extraction data, so we can format it directly
      const results: ExtractionResultsData = {
        document: {
          id: status.document.id,
          fileName: status.document.fileName,
          type: status.document.type,
          processingStatus: status.document.processingStatus,
          processedAt: status.document.processedAt,
          createdAt: status.document.createdAt,
        },
        extraction: status.document.candidate ? {
          id: status.document.candidate.id,
          name: status.document.candidate.name,
          email: status.document.candidate.email,
          phone: status.document.candidate.phone,
          skills: status.document.candidate.skills,
          extractedSummary: status.document.candidate.extractedSummary,
          extractedExperience: status.document.candidate.extractedExperience,
          extractedEducation: status.document.candidate.extractedEducation,
          extractionMethod: status.document.candidate.extractionMethod,
          extractionStatus: status.document.candidate.extractionStatus,
          lastExtractionDate: status.document.candidate.lastExtractionDate,
          extractionPromptVersion: status.document.candidate.extractionPromptVersion,
        } : null,
      };

      setExtractionResults(results);
      setUploadSuccess(true);
      setShowUploadModal(false);

      // Reload candidate data to get updated info
      window.location.reload();
    } catch (error) {
      // Error is already displayed in the modal
      throw error;
    }
  };

  return (
    <div className="candidate-profile">
      <Link to="/" className="back-link">← Back to Candidates</Link>

      <div className="profile-header">
        <h1>{candidate.name}</h1>
        <span className={`candidate-status status-${candidate.status}`}>
          {candidate.status}
        </span>
      </div>

      <section className="profile-section">
        <h2>Contact Information</h2>
        <dl className="info-list">
          <dt>Email</dt>
          <dd><a href={`https://mail.google.com/mail/?view=cm&to=${encodeURIComponent(candidate.email)}`} target="_blank" rel="noopener noreferrer">{candidate.email}</a></dd>
          <dt>Phone</dt>
          <dd>{candidate.phone}</dd>
        </dl>
      </section>

      <section className="profile-section">
        <h2>Skills</h2>
        <div className="skills-list">
          {skills.length > 0 ? (
            skills.map((skill) => (
              <span key={skill} className="skill-tag">{skill}</span>
            ))
          ) : (
            <p className="no-data">No skills listed.</p>
          )}
        </div>
      </section>

      <section className="profile-section">
        <h2>Applied Positions</h2>
        {linkedPositions.length > 0 ? (
          <ul className="positions-list">
            {linkedPositions.map((position) => (
              <li key={position.id}>
                <strong>{position.title}</strong> - {position.department}
              </li>
            ))}
          </ul>
        ) : (
          <p className="no-positions">No positions linked.</p>
        )}
      </section>

      <SuggestedPositions candidateId={candidate.id} />

      <section className="profile-section">
        <div className="section-header">
          <h2>CV</h2>
          {isEditor && (
            <button className="btn-primary" onClick={() => setShowUploadModal(true)}>
              Upload CV
            </button>
          )}
        </div>
        <div className="cv-actions">
          <button className="cv-link-btn" onClick={() => setShowCv(true)}>
            View CV
          </button>
        </div>

        {uploadSuccess && (
          <div className="upload-success-message">
            CV uploaded and processed successfully! The page will reload to show updated data.
          </div>
        )}

        {/* Display extraction results if available */}
        <ExtractionResults
          extractedSummary={candidate.extractedSummary}
          extractedExperience={candidate.extractedExperience}
          extractedEducation={candidate.extractedEducation}
          extractionMethod={candidate.extractionMethod}
          extractionStatus={candidate.extractionStatus}
          lastExtractionDate={candidate.lastExtractionDate}
          extractionPromptVersion={candidate.extractionPromptVersion}
        />
      </section>

      {showCv && (
        <CvViewer candidate={candidate} onClose={() => setShowCv(false)} />
      )}

      {showUploadModal && (
        <UploadCVModal
          isOpen={showUploadModal}
          onClose={() => setShowUploadModal(false)}
          onUpload={handleUpload}
          candidateName={candidate.name}
        />
      )}
    </div>
  );
}
