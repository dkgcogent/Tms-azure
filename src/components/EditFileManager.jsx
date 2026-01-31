import React, { useState, useEffect } from 'react';
import './EditFileManager.css';

const EditFileManager = ({
  fieldName,
  label,
  value, // Can be File object (new upload) or string (existing file path)
  onChange,
  onDelete, // Callback for deleting existing files
  accept = "image/*,.pdf,.doc,.docx,.txt",
  required = false,
  error = null,
  existingFileUrl = null, // URL for existing file from database
  maxSize = 20 * 1024 * 1024, // 20MB default (increased for large PDF documents)
  showPreview = true,
  entityType = 'general', // 'vehicles', 'vendors', 'customers', 'drivers', 'transactions'
  entityId = null, // ID of the entity being edited
  isEditing = false // Whether we're in edit mode
}) => {
  const [preview, setPreview] = useState(null);
  const [fileType, setFileType] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [hasExistingFile, setHasExistingFile] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Generate file URL based on entity type
  const getFileUrl = (filename) => {
    if (!filename) return null;

    // If it's already a full URL, return as-is
    if (filename.startsWith('http')) return filename;

    // Get the API base URL from environment or default to current origin
    const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || window.location.origin;

    const baseUrls = {
      vehicles: `${apiBaseUrl}/api/vehicles/files/`,
      vendors: `${apiBaseUrl}/api/vendors/files/`,
      customers: `${apiBaseUrl}/api/customers/files/`,
      drivers: `${apiBaseUrl}/api/drivers/files/`,
      transactions: `${apiBaseUrl}/api/daily-vehicle-transactions/files/`
    };

    const baseUrl = baseUrls[entityType] || `${apiBaseUrl}/api/files/`;

    // Extract just the filename if it's a full path
    let cleanFilename = filename;
    if (filename.includes('/') || filename.includes('\\')) {
      cleanFilename = filename.split(/[/\\]/).pop();
    }

    // Remove any leading path separators
    cleanFilename = cleanFilename.replace(/^[/\\]+/, '');

    return baseUrl + cleanFilename;
  };

  // Set up preview when value changes
  useEffect(() => {
    if (value) {
      if (value instanceof File) {
        // New file upload
        const reader = new FileReader();
        reader.onload = (e) => {
          setPreview(e.target.result);
          setFileType(value.type);
          setHasExistingFile(false);
        };
        reader.readAsDataURL(value);
      } else if (typeof value === 'string') {
        // Existing file from database
        const fileUrl = getFileUrl(value);
        setPreview(fileUrl);
        setFileType(getFileTypeFromPath(value));
        setHasExistingFile(true);
      }
    } else if (existingFileUrl) {
      // Fallback to existingFileUrl prop
      setPreview(existingFileUrl);
      setFileType(getFileTypeFromPath(existingFileUrl));
      setHasExistingFile(true);
    } else {
      setPreview(null);
      setFileType(null);
      setHasExistingFile(false);
    }
  }, [value, existingFileUrl, entityType]);

  const getFileTypeFromPath = (path) => {
    if (!path) return null;
    const extension = path.split('.').pop().toLowerCase();
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(extension)) {
      return 'image';
    } else if (extension === 'pdf') {
      return 'application/pdf';
    } else {
      return 'document';
    }
  };

  const getFileName = () => {
    if (value instanceof File) {
      return value.name;
    } else if (typeof value === 'string') {
      return value.split('/').pop() || value;
    } else if (existingFileUrl) {
      return existingFileUrl.split('/').pop() || 'Document';
    }
    return 'Unknown file';
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (type) => {
    if (type?.includes('pdf')) return '📄';
    if (type?.includes('doc')) return '📝';
    if (type?.includes('excel') || type?.includes('sheet')) return '📊';
    if (type?.includes('image')) return '🖼️';
    return '📁';
  };

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

  const handleRemoveFile = async () => {
    if (hasExistingFile && onDelete && entityId) {
      // Delete existing file from server
      if (window.confirm('Are you sure you want to delete this file? This action cannot be undone.')) {
        setIsDeleting(true);
        try {
          await onDelete(fieldName, value);
          setPreview(null);
          setFileType(null);
          setHasExistingFile(false);
          onChange(null);
        } catch (error) {
          console.error('Error deleting file:', error);
          alert('Failed to delete file. Please try again.');
        } finally {
          setIsDeleting(false);
        }
      }
    } else {
      // Remove new file upload
      onChange(null);
      setPreview(null);
      setFileType(null);
      setHasExistingFile(false);
    }
  };

  const openModal = () => {
    if (showPreview && preview) {
      setShowModal(true);
    }
  };

  return (
    <div className="edit-file-manager">
      <label className="file-manager-label">
        {label} {required && <span className="required-indicator">*</span>}
        {isEditing && hasExistingFile && (
          <span className="existing-file-badge">📎 Existing File</span>
        )}
      </label>
      
      {/* File Upload/Preview Area */}
      <div 
        className={`file-manager-area ${dragOver ? 'drag-over' : ''} ${error ? 'error' : ''}`}
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
          required={required && !hasExistingFile}
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
              {fileType?.startsWith('image') || fileType === 'image' ? (
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
              {showPreview && (
                <div className="preview-overlay">
                  <span>🔍 Click to view</span>
                </div>
              )}
            </div>
            
            {/* File Info and Actions */}
            <div className="file-info">
              <div className="file-details">
                <span className="file-name-display">{getFileName()}</span>
                {value instanceof File && (
                  <span className="file-size">{formatFileSize(value.size)}</span>
                )}
                {hasExistingFile && (
                  <span className="file-status">📎 Saved</span>
                )}
              </div>
              <div className="file-actions">
                <label htmlFor={fieldName} className="change-file-btn">
                  📝 {hasExistingFile ? 'Replace' : 'Change'}
                </label>
                <button 
                  type="button" 
                  onClick={handleRemoveFile} 
                  className="remove-file-btn"
                  disabled={isDeleting}
                >
                  {isDeleting ? '⏳ Deleting...' : '🗑️ Remove'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
      
      {error && <div className="file-manager-error">{error}</div>}
      
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
              {fileType?.startsWith('image') || fileType === 'image' ? (
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
                  <p>Click the link below to download and view this document:</p>
                  <a 
                    href={preview} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="download-link"
                  >
                    📥 Download {getFileName()}
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

export default EditFileManager;
