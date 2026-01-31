import React from 'react';
import './DocumentActionModal.css';

const DocumentActionModal = ({ 
  isOpen, 
  onClose, 
  fileType, 
  fileName, 
  onDownload, 
  onOpenInNewTab 
}) => {
  if (!isOpen) return null;

  const getFileIcon = (fileType) => {
    switch (fileType) {
      case 'word': return '📄';
      case 'excel': return '📊';
      case 'powerpoint': return '📽️';
      case 'pdf': return '📕';
      default: return '📄';
    }
  };

  const getFileDescription = (fileType) => {
    switch (fileType) {
      case 'word': return 'Word Document';
      case 'excel': return 'Excel Spreadsheet';
      case 'powerpoint': return 'PowerPoint Presentation';
      case 'pdf': return 'PDF Document';
      default: return 'Document';
    }
  };

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleDownload = () => {
    onDownload();
    onClose();
  };

  const handleOpenInNewTab = () => {
    onOpenInNewTab();
    onClose();
  };

  return (
    <div className="document-action-modal-overlay" onClick={handleOverlayClick}>
      <div className="document-action-modal">
        <div className="document-action-modal-header">
          <div className="file-info">
            <span className="file-icon">{getFileIcon(fileType)}</span>
            <div className="file-details">
              <h3 className="file-title">{getFileDescription(fileType)}</h3>
              <p className="file-name">{fileName}</p>
            </div>
          </div>
          <button 
            className="close-button" 
            onClick={onClose}
            title="Close"
          >
            ✕
          </button>
        </div>

        <div className="document-action-modal-body">
          <div className="message-content">
            <div className="warning-icon">⚠️</div>
            <div className="message-text">
              <p className="primary-message">
                This {getFileDescription(fileType).toLowerCase()} cannot be previewed in the browser.
              </p>
              <p className="secondary-message">
                Choose how you would like to access this file:
              </p>
            </div>
          </div>
        </div>

        <div className="document-action-modal-footer">
          <button 
            className="action-button download-button"
            onClick={handleDownload}
          >
            <span className="button-icon">💾</span>
            <span className="button-text">Download File</span>
            <span className="button-subtitle">Open in {getFileDescription(fileType).split(' ')[0]}</span>
          </button>
          
          <button 
            className="action-button open-button"
            onClick={handleOpenInNewTab}
          >
            <span className="button-icon">🔗</span>
            <span className="button-text">Open in Browser</span>
            <span className="button-subtitle">New tab</span>
          </button>
          
          <button 
            className="action-button cancel-button"
            onClick={onClose}
          >
            <span className="button-icon">❌</span>
            <span className="button-text">Cancel</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default DocumentActionModal;
