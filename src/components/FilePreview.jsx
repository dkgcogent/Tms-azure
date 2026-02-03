import React, { useState } from 'react';
import { createFilePreviewData, isImageFile, isPDFFile } from '../utils/fileUtils';
import './FilePreview.css';

/**
 * Universal File Preview Component
 * Handles preview, viewing, and downloading of files across the entire application
 */
const FilePreview = ({
  file,
  baseUrl = '',
  showActions = true,
  showModal = true,
  className = '',
  style = {},
  onRemove = null,
  maxPreviewSize = { width: 200, height: 150 }
}) => {
  const [modalOpen, setModalOpen] = useState(false);

  if (!file) return null;

  const previewData = createFilePreviewData(file, { baseUrl, showActions });

  if (!previewData) return null;

  const { fileName, fileType, previewUrl, icon, size, actions } = previewData;

  const renderImagePreview = () => (
    <div className="file-preview-image">
      <img
        src={previewUrl}
        alt={fileName}
        className="preview-image clickable-preview"
        style={{
          maxWidth: maxPreviewSize.width,
          maxHeight: maxPreviewSize.height,
          objectFit: 'contain',
          cursor: showModal ? 'pointer' : 'default'
        }}
        onClick={showModal ? () => setModalOpen(true) : undefined}
        title={showModal ? "Click to view full size" : fileName}
      />
    </div>
  );

  const renderPDFPreview = () => (
    <div className="file-preview-pdf">
      <div className="pdf-preview-container">
        <span className="file-icon" style={{ fontSize: '2rem' }}>📄</span>
        <div className="file-info">
          <div className="file-name" title={fileName}>{fileName}</div>
          <div className="file-type">PDF Document</div>
          {size && <div className="file-size">{size}</div>}
        </div>
      </div>
    </div>
  );

  const renderDocumentPreview = () => (
    <div className="file-preview-document">
      <div className="document-preview-container">
        <span className="file-icon" style={{ fontSize: '2rem' }}>{icon}</span>
        <div className="file-info">
          <div className="file-name" title={fileName}>{fileName}</div>
          <div className="file-type">Document</div>
          {size && <div className="file-size">{size}</div>}
        </div>
      </div>
    </div>
  );

  const renderPreview = () => {
    switch (fileType) {
      case 'image':
        return renderImagePreview();
      case 'pdf':
        return renderPDFPreview();
      default:
        return renderDocumentPreview();
    }
  };

  const renderActions = () => {
    if (!showActions) return null;

    return (
      <div className="file-preview-actions">
        {fileType === 'pdf' && (
          <>
            <button
              type="button"
              onClick={actions.view}
              className="file-action-btn view-btn"
              title="View PDF"
            >
              👁️ View
            </button>
            <button
              type="button"
              onClick={actions.download}
              className="file-action-btn download-btn"
              title="Download PDF"
            >
              📥 Download
            </button>
          </>
        )}

        {fileType === 'document' && (
          <>
            <button
              type="button"
              onClick={actions.view}
              className="file-action-btn view-btn"
              title="View Document"
            >
              👁️ View
            </button>
            <button
              type="button"
              onClick={actions.download}
              className="file-action-btn download-btn"
              title="Download Document"
            >
              📥 Download
            </button>
          </>
        )}

        {fileType === 'image' && (
          <button
            type="button"
            onClick={actions.download}
            className="file-action-btn download-btn"
            title="Download Image"
          >
            📥 Download
          </button>
        )}

        {onRemove && (
          <button
            type="button"
            onClick={onRemove}
            className="file-action-btn remove-btn"
            title="Remove File"
          >
            🗑️ Remove
          </button>
        )}
      </div>
    );
  };

  return (
    <div className={`file-preview ${className}`} style={style}>
      <div className="file-preview-content">
        {renderPreview()}
        {renderActions()}
      </div>

      {/* Modal for full-size image viewing */}
      {modalOpen && fileType === 'image' && showModal && (
        <div
          className="file-preview-modal-overlay"
          onClick={() => setModalOpen(false)}
        >
          <div
            className="file-preview-modal-content"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="file-preview-modal-header">
              <h3>Image Preview</h3>
              <button
                className="modal-close-btn"
                onClick={() => setModalOpen(false)}
              >
                ✕
              </button>
            </div>
            <div className="file-preview-modal-body">
              <img
                src={previewUrl}
                alt={fileName}
                className="modal-image"
              />
              <div className="modal-file-info">
                <div className="modal-file-name">{fileName}</div>
                {size && <div className="modal-file-size">{size}</div>}
              </div>
            </div>
            <div className="file-preview-modal-actions">
              <button
                type="button"
                onClick={actions.download}
                className="modal-action-btn download-btn"
              >
                📥 Download Image
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FilePreview;
