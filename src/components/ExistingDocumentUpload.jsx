import React from 'react';
import './DocumentUpload.css';

const ExistingDocumentUpload = ({
  label,
  fileUrl,
  onDelete
}) => {
  if (!fileUrl) {
    return null;
  }

  const getFileTypeFromPath = (path) => {
    const extension = path.split('.').pop().toLowerCase();
    if (['jpg', 'jpeg', 'png', 'gif'].includes(extension)) {
      return 'image';
    } else if (extension === 'pdf') {
      return 'application/pdf';
    } else {
      return 'document';
    }
  };

  const fileType = getFileTypeFromPath(fileUrl);

  return (
    <div className="document-upload">
      <label>{label}</label>
      <div className="document-preview">
        {fileType === 'image' ? (
          <img
            src={fileUrl}
            alt="Document preview"
            className="preview-image"
          />
        ) : (
          <div className="document-icon">
            <span className="doc-icon">📄</span>
            <a href={fileUrl} target="_blank" rel="noopener noreferrer">View Document</a>
          </div>
        )}
        <button type="button" onClick={onDelete} className="remove-btn">
          ✕
        </button>
      </div>
    </div>
  );
};

export default ExistingDocumentUpload;
