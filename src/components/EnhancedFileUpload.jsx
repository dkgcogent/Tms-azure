import React, { useState, useEffect } from 'react';
import './EnhancedFileUpload.css';

const EnhancedFileUpload = ({
  fieldName,
  label,
  value, // Can be File object (new upload) or string (existing file path)
  onChange,
  accept = "image/*,.pdf,.doc,.docx,.txt", // Accept all common file types
  required = false,
  error = null,
  existingFileUrl = null, // URL for existing file
  maxSize = 20 * 1024 * 1024, // 20MB default (increased for large PDF documents)
  showPreview = true
}) => {
  const [preview, setPreview] = useState(null);
  const [fileType, setFileType] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  // Generate preview when file changes
  useEffect(() => {
    if (value instanceof File) {
      const fileUrl = URL.createObjectURL(value);
      setPreview(fileUrl);
      setFileType(value.type);
      
      // Cleanup URL when component unmounts
      return () => URL.revokeObjectURL(fileUrl);
    } else if (existingFileUrl) {
      setPreview(existingFileUrl);
      // Determine file type from URL extension
      const extension = existingFileUrl.split('.').pop().toLowerCase();
      if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(extension)) {
        setFileType('image');
      } else if (extension === 'pdf') {
        setFileType('application/pdf');
      } else {
        setFileType('document');
      }
    } else {
      setPreview(null);
      setFileType(null);
    }
  }, [value, existingFileUrl]);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file size
      if (file.size > maxSize) {
        alert(`File size must be less than ${Math.round(maxSize / (1024 * 1024))}MB`);
        return;
      }
      onChange(file);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    
    const file = e.dataTransfer.files[0];
    if (file) {
      // Validate file size
      if (file.size > maxSize) {
        alert(`File size must be less than ${Math.round(maxSize / (1024 * 1024))}MB`);
        return;
      }
      onChange(file);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setDragOver(false);
  };

  const removeFile = () => {
    onChange(null);
    setPreview(null);
    setFileType(null);
  };

  const openModal = () => {
    if (preview) {
      setShowModal(true);
    }
  };

  const getFileIcon = (type) => {
    if (type?.startsWith('image/') || type === 'image') return '🖼️';
    if (type?.includes('pdf')) return '📄';
    if (type?.includes('doc')) return '📝';
    if (type?.includes('text')) return '📃';
    return '📎';
  };

  const getFileName = () => {
    if (value instanceof File) {
      return value.name;
    } else if (existingFileUrl) {
      return existingFileUrl.split('/').pop();
    }
    return 'No file chosen';
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="enhanced-file-upload">
      <label className="file-upload-label">
        {label} {required && <span className="required-indicator">*</span>}
      </label>
      
      {/* File Upload Area */}
      <div 
        className={`file-upload-area ${dragOver ? 'drag-over' : ''} ${error ? 'error' : ''}`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        <input
          type="file"
          id={fieldName}
          name={fieldName}
          onChange={handleFileChange}
          accept={accept}
          required={required}
          className="file-input-hidden"
        />
        
        {!preview ? (
          <div className="upload-placeholder">
            <div className="upload-icon">📁</div>
            <div className="upload-text">
              <strong>Click to upload</strong> or drag and drop
            </div>
            <div className="upload-hint">
              Supports: Images, PDF, DOC, TXT (Max {Math.round(maxSize / (1024 * 1024))}MB)
            </div>
            <label htmlFor={fieldName} className="upload-button">
              Choose File
            </label>
          </div>
        ) : (
          <div className="file-preview-container">
            {/* File Preview */}
            <div className="file-preview" onClick={openModal}>
              {fileType?.startsWith('image/') || fileType === 'image' ? (
                <img 
                  src={preview} 
                  alt="Preview" 
                  className="preview-image"
                />
              ) : (
                <div className="file-icon-preview">
                  <div className="file-icon-large">{getFileIcon(fileType)}</div>
                  <div className="file-name">{getFileName()}</div>
                </div>
              )}
              <div className="preview-overlay">
                <span>🔍 Click to view</span>
              </div>
            </div>
            
            {/* File Info */}
            <div className="file-info">
              <div className="file-details">
                <span className="file-name-display">{getFileName()}</span>
                {value instanceof File && (
                  <span className="file-size">{formatFileSize(value.size)}</span>
                )}
              </div>
              <div className="file-actions">
                <label htmlFor={fieldName} className="change-file-btn">
                  📝 Change
                </label>
                <button type="button" onClick={removeFile} className="remove-file-btn">
                  🗑️ Remove
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
      
      {error && <div className="file-upload-error">{error}</div>}
      
      {/* Modal for full-size viewing */}
      {showModal && preview && (
        <div className="file-modal-overlay" onClick={() => setShowModal(false)}>
          <div className="file-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="file-modal-header">
              <h3>{getFileName()}</h3>
              <button className="modal-close-btn" onClick={() => setShowModal(false)}>
                ✕
              </button>
            </div>
            <div className="file-modal-body">
              {fileType?.startsWith('image/') || fileType === 'image' ? (
                <img 
                  src={preview} 
                  alt="Full size preview" 
                  className="modal-image"
                />
              ) : fileType?.includes('pdf') ? (
                <iframe 
                  src={preview} 
                  className="modal-pdf"
                  title="PDF Preview"
                />
              ) : (
                <div className="modal-document">
                  <div className="document-icon">{getFileIcon(fileType)}</div>
                  <p>Preview not available for this file type</p>
                  <a href={preview} target="_blank" rel="noopener noreferrer" className="download-link">
                    📥 Download File
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EnhancedFileUpload;
