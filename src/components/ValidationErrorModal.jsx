import React, { useEffect, useRef } from 'react';
import './ValidationErrorModal.css';

const ValidationErrorModal = ({
  isOpen,
  onClose,
  errorSummary,
  onGoToField,
  onTryAgain
}) => {
  const modalRef = useRef(null);
  const firstButtonRef = useRef(null);

  // Handle escape key and outside click
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    const handleOutsideClick = (e) => {
      if (modalRef.current && !modalRef.current.contains(e.target)) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    document.addEventListener('mousedown', handleOutsideClick);

    // Focus first button for accessibility
    if (firstButtonRef.current) {
      firstButtonRef.current.focus();
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [isOpen, onClose]);

  if (!isOpen || !errorSummary) return null;

  const handleGoToFirstField = () => {
    if (errorSummary.fields && errorSummary.fields.length > 0 && onGoToField) {
      onGoToField(errorSummary.fields[0]);
    }
    onClose();
  };

  const handleGoToField = (fieldInfo) => {
    if (onGoToField) {
      onGoToField(fieldInfo);
    }
    onClose();
  };

  const handleTryAgain = () => {
    if (onTryAgain) {
      onTryAgain();
    }
    onClose();
  };

  return (
    <div className="validation-modal-overlay">
      <div className="validation-modal" ref={modalRef}>
        {/* Header */}
        <div className="validation-modal-header">
          <div className="error-icon">⚠️</div>
          <div className="error-title">
            <h3>{errorSummary.title}</h3>
            <p>{errorSummary.subtitle}</p>
          </div>
          <button 
            className="close-button"
            onClick={onClose}
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Error Fields */}
        <div className="validation-modal-body">
          <div className="error-section">
            <h4 className="section-title">Required Fields</h4>
            <ul className="error-list">
              {errorSummary.fields && errorSummary.fields.map((fieldInfo, index) => (
                <li key={index} className="error-item clickable" onClick={() => handleGoToField(fieldInfo)}>
                  <span className="error-bullet">•</span>
                  <span className="error-text">{fieldInfo.label}</span>
                  <span className="error-detail">{fieldInfo.error}</span>
                  <span className="go-to-field">📍 Go to field</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="validation-modal-footer">
          <div className="error-summary">
            <span className="error-count">
              {errorSummary.fields ? errorSummary.fields.length : 0} error{(errorSummary.fields && errorSummary.fields.length > 1) ? 's' : ''} found
            </span>
          </div>
          
          <div className="modal-actions">
            <button
              ref={firstButtonRef}
              className="btn btn-primary"
              onClick={handleGoToFirstField}
            >
              📍 Go to First Error
            </button>
            
            <button
              className="btn btn-secondary"
              onClick={handleTryAgain}
            >
              🔄 Try Again
            </button>
            
            <button
              className="btn btn-outline"
              onClick={onClose}
            >
              Cancel
            </button>
          </div>
        </div>

        {/* Progress Indicator */}
        <div className="validation-progress">
          <div className="progress-text">
            Fix errors to continue with form submission
          </div>
        </div>
      </div>
    </div>
  );
};

export default ValidationErrorModal;
