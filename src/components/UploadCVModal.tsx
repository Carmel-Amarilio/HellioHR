import { useState, useRef, DragEvent } from 'react';
import './UploadCVModal.css';

interface UploadCVModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpload: (file: File, useLLM: boolean) => Promise<void>;
  candidateName: string;
}

export function UploadCVModal({ isOpen, onClose, onUpload, candidateName }: UploadCVModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [useLLM, setUseLLM] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const allowedTypes = [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/msword',
    'text/plain',
  ];

  const allowedExtensions = ['.pdf', '.docx', '.doc', '.txt'];
  const maxFileSize = 10 * 1024 * 1024; // 10MB

  if (!isOpen) return null;

  const validateFile = (selectedFile: File): boolean => {
    setError(null);

    if (!allowedTypes.includes(selectedFile.type)) {
      setError(`Invalid file type. Allowed: ${allowedExtensions.join(', ')}`);
      return false;
    }

    if (selectedFile.size > maxFileSize) {
      setError('File size exceeds 10MB limit');
      return false;
    }

    return true;
  };

  const handleFileSelect = (selectedFile: File) => {
    if (validateFile(selectedFile)) {
      setFile(selectedFile);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      handleFileSelect(selectedFile);
    }
  };

  const handleDrag = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) {
      handleFileSelect(droppedFile);
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);
    setError(null);

    try {
      await onUpload(file, useLLM);
      // Success - parent component will handle closing
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
      setUploading(false);
    }
  };

  const handleClose = () => {
    if (!uploading) {
      setFile(null);
      setError(null);
      setUseLLM(true);
      onClose();
    }
  };

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-content upload-cv-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Upload CV for {candidateName}</h2>
          <button className="modal-close" onClick={handleClose} disabled={uploading}>
            ×
          </button>
        </div>

        <div className="modal-body">
          {!file ? (
            <div
              className={`upload-dropzone ${dragActive ? 'drag-active' : ''}`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <div className="upload-icon">📄</div>
              <p className="upload-text">
                Drag and drop a CV file here, or click to browse
              </p>
              <p className="upload-hint">
                Supported formats: PDF, DOCX, DOC, TXT (max 10MB)
              </p>
              <p className="upload-preview-hint">
                💡 You'll be able to choose between AI-powered or pattern-based extraction after selecting a file
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.docx,.doc,.txt"
                onChange={handleFileInput}
                style={{ display: 'none' }}
              />
            </div>
          ) : (
            <div className="upload-file-selected">
              <div className="file-info">
                <span className="file-icon">📄</span>
                <div className="file-details">
                  <div className="file-name">{file.name}</div>
                  <div className="file-size">
                    {(file.size / 1024 / 1024).toFixed(2)} MB
                  </div>
                </div>
                <button
                  className="file-remove"
                  onClick={() => setFile(null)}
                  disabled={uploading}
                >
                  ✕
                </button>
              </div>

              <div className="extraction-options">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={useLLM}
                    onChange={(e) => setUseLLM(e.target.checked)}
                    disabled={uploading}
                  />
                  <span>Use LLM for extraction (higher quality, slower)</span>
                </label>
                <p className="extraction-hint">
                  {useLLM
                    ? 'AWS Bedrock will extract skills, experience, and education with high accuracy'
                    : 'Heuristic extraction will use pattern matching (faster, lower cost)'}
                </p>
              </div>
            </div>
          )}

          {error && (
            <div className="upload-error">
              <strong>Error:</strong> {error}
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button
            className="btn-secondary"
            onClick={handleClose}
            disabled={uploading}
          >
            Cancel
          </button>
          <button
            className="btn-primary"
            onClick={handleUpload}
            disabled={!file || uploading}
          >
            {uploading ? 'Uploading...' : 'Upload & Extract'}
          </button>
        </div>
      </div>
    </div>
  );
}
