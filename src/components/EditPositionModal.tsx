import { useState, useEffect } from 'react';
import type { Position } from '../types';
import { updatePosition, type UpdatePositionData } from '../services/positionService';
import './EditPositionModal.css';

interface EditPositionModalProps {
  position: Position;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedPosition: Position) => void;
}

export function EditPositionModal({ position, isOpen, onClose, onSave }: EditPositionModalProps) {
  const [title, setTitle] = useState(position.title);
  const [department, setDepartment] = useState(position.department);
  const [description, setDescription] = useState(position.description);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset form when modal opens or position changes
  useEffect(() => {
    if (isOpen) {
      setTitle(position.title);
      setDepartment(position.department);
      setDescription(position.description);
      setError(null);
    }
  }, [position, isOpen]);

  // Handle Escape key to close modal
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isSaving) {
        onClose();
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, isSaving, onClose]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSaving(true);

    try {
      const trimmedTitle = title.trim();
      const trimmedDepartment = department.trim();
      const trimmedDescription = description.trim();

      // Validate no empty fields after trim
      if (!trimmedTitle || !trimmedDepartment || !trimmedDescription) {
        setError('All fields are required and cannot be empty');
        setIsSaving(false);
        return;
      }

      const data: UpdatePositionData = {};
      if (trimmedTitle !== position.title) data.title = trimmedTitle;
      if (trimmedDepartment !== position.department) data.department = trimmedDepartment;
      if (trimmedDescription !== position.description) data.description = trimmedDescription;

      if (Object.keys(data).length === 0) {
        onClose();
        return;
      }

      const updatedPosition = await updatePosition(position.id, data);
      onSave(updatedPosition);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update position');
    } finally {
      setIsSaving(false);
    }
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div className="modal-overlay" onClick={handleOverlayClick}>
      <div className="modal-content">
        <div className="modal-header">
          <h2>Edit Position</h2>
          <button className="modal-close" onClick={onClose} aria-label="Close">
            &times;
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="title">Title</label>
            <input
              type="text"
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="department">Department</label>
            <input
              type="text"
              id="department"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="description">Description</label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              required
            />
          </div>

          {error && <div className="form-error">{error}</div>}

          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={onClose} disabled={isSaving}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={isSaving}>
              {isSaving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
