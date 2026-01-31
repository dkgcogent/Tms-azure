import { useState } from 'react';
import './KMImageUpload.css';

const KMImageUpload = ({
  label = "Upload KM Image",
  onFileSelect,
  accept = "image/*",
  maxSize = 5,
  className = ""
}) => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [showModal, setShowModal] = useState(false);

  const handleFileSelect = (file) => {
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file (JPG, PNG, GIF, etc.)');
      return;
    }

    // Validate file size
    if (file.size > maxSize * 1024 * 1024) {
      alert(`File size must be less than ${maxSize}MB`);
      return;
    }

    // Create preview
    const previewUrl = URL.createObjectURL(file);
    setPreview(previewUrl);
    setSelectedFile(file);

    // Call parent callback
    if (onFileSelect) {
      onFileSelect(file);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    handleFileSelect(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    handleFileSelect(file);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleRemove = () => {
    setSelectedFile(null);
    setPreview(null);
    if (onFileSelect) {
      onFileSelect(null);
    }
  };

  return (
    <div className={`km-image-upload ${className}`}>
      <input
        type="file"
        id={`km-upload-${Math.random()}`}
        accept={accept}
        onChange={handleFileChange}
        className="km-file-input-hidden"
      />
      
      <div 
        className={`km-upload-area ${isDragOver ? 'drag-over' : ''} ${selectedFile ? 'has-file' : ''}`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        {selectedFile ? (
          <div className="km-file-selected">
            <div className="km-file-info">
              <div className="km-file-icon">📷</div>
              <div className="km-file-details">
                <div className="km-file-name">{selectedFile.name}</div>
                <div className="km-file-size">
                  {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                </div>
              </div>
              <button 
                type="button" 
                className="km-remove-btn"
                onClick={handleRemove}
                title="Remove file"
              >
                ✕
              </button>
            </div>
            {preview && (
              <div className="km-preview">
                <img
                  src={preview}
                  alt="KM Preview"
                  className="km-preview-image"
                  onClick={() => setShowModal(true)}
                  style={{ cursor: 'pointer' }}
                  title="Click to view full size"
                />
              </div>
            )}
          </div>
        ) : (
          <label htmlFor={`km-upload-${Math.random()}`} className="km-upload-label">
            <div className="km-upload-icon">📷</div>
            <div className="km-upload-text">
              <div className="km-upload-primary">{label}</div>
              <div className="km-upload-secondary">
                Click to browse or drag & drop image
              </div>
              <div className="km-upload-info">
                Max size: {maxSize}MB • JPG, PNG, GIF
              </div>
            </div>
          </label>
        )}
      </div>

      {/* Modal for full-size image viewing */}
      {showModal && preview && (
        <div
          className="km-image-modal-overlay"
          onClick={() => setShowModal(false)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}
        >
          <div
            className="km-image-modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'relative',
              maxWidth: '90vw',
              maxHeight: '90vh',
              backgroundColor: 'white',
              borderRadius: '8px',
              padding: '20px'
            }}
          >
            <div
              className="km-modal-header"
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '15px'
              }}
            >
              <h3 style={{ margin: 0 }}>KM Image Preview</h3>
              <button
                className="km-modal-close-btn"
                onClick={() => setShowModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '24px',
                  cursor: 'pointer',
                  padding: '0',
                  color: '#666'
                }}
              >
                ✕
              </button>
            </div>
            <div className="km-modal-body">
              <img
                src={preview}
                alt="Full size KM preview"
                style={{
                  maxWidth: '100%',
                  maxHeight: '70vh',
                  objectFit: 'contain'
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default KMImageUpload;
