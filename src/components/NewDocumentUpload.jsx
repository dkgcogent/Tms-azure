import React, { useState, useEffect } from 'react';
import './DocumentUpload.css';

const NewDocumentUpload = ({
  label,
  name,
  value,
  onChange,
  accept = ".pdf,.jpg,.jpeg,.png,.doc,.docx",
  required = false,
  error = '',
  className = ''
}) => {
  const [previewUrl, setPreviewUrl] = useState(null);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      console.log('📁 NEW DOCUMENT UPLOAD - File selected:', {
        name: file.name,
        size: file.size,
        type: file.type,
        fieldName: name
      });

      onChange({
        target: {
          name,
          type: 'file',
          files: [file],
          value: file.name // Also provide value for compatibility
        }
      });
    }
  };

  // Generate preview URL when file changes
  useEffect(() => {
    console.log('📁 NEW DOCUMENT UPLOAD - Value changed:', {
      fieldName: name,
      value: value,
      isFile: value instanceof File,
      valueType: typeof value
    });

    if (value && value instanceof File) {
      const url = URL.createObjectURL(value);
      setPreviewUrl(url);

      // Cleanup URL when component unmounts or file changes
      return () => URL.revokeObjectURL(url);
    } else {
      setPreviewUrl(null);
    }
  }, [value, name]);

  const isImage = (file) => {
    return file && file.type && file.type.startsWith('image/');
  };

  const getFileIcon = (file) => {
    if (!file) return '📄';
    if (file.type.includes('pdf')) return '📄';
    if (file.type.includes('doc')) return '📝';
    if (file.type.includes('image')) return '🖼️';
    return '📄';
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className={`document-upload ${className}`}>
      <label>{label} {required && <span className="required">*</span>}</label>

      <div className="upload-container">
        <input
          type="file"
          id={`file-${name}`}
          name={name}
          onChange={handleFileChange}
          accept={accept}
          required={required}
          className="file-input-hidden"
        />

        <div className="file-display-area">
          <label htmlFor={`file-${name}`} className="choose-file-btn">
            Choose File
          </label>

          <div className="file-info">
            {value ? (
              <div className="file-details">
                <span className="file-icon">{getFileIcon(value)}</span>
                <div className="file-text">
                  <span className="file-name">{value.name}</span>
                  <span className="file-size">({formatFileSize(value.size)})</span>
                </div>
              </div>
            ) : (
              <span className="file-name-display">No file chosen</span>
            )}
          </div>
        </div>

        {/* File Preview */}
        {value && (
          <div className="file-preview">
            {isImage(value) && previewUrl ? (
              <div className="image-preview">
                <img
                  src={previewUrl}
                  alt="Preview"
                  style={{
                    maxWidth: '200px',
                    maxHeight: '150px',
                    objectFit: 'contain',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    marginTop: '10px'
                  }}
                />
              </div>
            ) : (
              <div className="document-preview">
                <div className="document-icon">
                  {getFileIcon(value)}
                </div>
                <span>Document ready for upload</span>
              </div>
            )}
          </div>
        )}
      </div>

      {error && <span className="error-message">{error}</span>}
    </div>
  );
};

export default NewDocumentUpload;
