import React, { useState, useRef } from 'react';
import './VehiclePhotoUpload.css';

const VehiclePhotoUpload = ({ 
  photos = {}, 
  onChange, 
  errors = {},
  disabled = false 
}) => {
  const [draggedCategory, setDraggedCategory] = useState(null);
  const fileInputRefs = useRef({});

  // Predefined photo categories
  const PHOTO_CATEGORIES = [
    { key: 'front', label: 'Front View', icon: '🚗', description: 'Front of the vehicle' },
    { key: 'back', label: 'Back View', icon: '🚙', description: 'Rear of the vehicle' },
    { key: 'left_side', label: 'Left Side', icon: '🚐', description: 'Left side view' },
    { key: 'right_side', label: 'Right Side', icon: '🚚', description: 'Right side view' },
    { key: 'roof', label: 'Roof/Top', icon: '🔝', description: 'Top view of vehicle' },
    { key: 'door', label: 'Door', icon: '🚪', description: 'Door details' },
    { key: 'dashboard', label: 'Dashboard', icon: '📊', description: 'Interior dashboard' },
    { key: 'engine', label: 'Engine', icon: '⚙️', description: 'Engine compartment' },
    { key: 'documents', label: 'Documents', icon: '📄', description: 'Vehicle documents' },
    { key: 'other', label: 'Other', icon: '📷', description: 'Additional photos' }
  ];

  // Handle file selection for a category
  const handleFileSelect = (category, files) => {
    const fileArray = Array.from(files);
    const validFiles = [];
    const errors = [];

    fileArray.forEach(file => {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        errors.push(`${file.name} is not a valid image file`);
        return;
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        errors.push(`${file.name} is too large (max 5MB)`);
        return;
      }

      validFiles.push(file);
    });

    if (errors.length > 0) {
      alert('Upload errors:\n' + errors.join('\n'));
      return;
    }

    // Update photos for this category
    const updatedPhotos = {
      ...photos,
      [category]: [...(photos[category] || []), ...validFiles]
    };

    onChange(updatedPhotos);
  };

  // Remove photo from category
  const removePhoto = (category, index) => {
    const updatedPhotos = {
      ...photos,
      [category]: photos[category].filter((_, i) => i !== index)
    };
    onChange(updatedPhotos);
  };

  // Handle drag and drop
  const handleDragOver = (e, category) => {
    e.preventDefault();
    setDraggedCategory(category);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setDraggedCategory(null);
  };

  const handleDrop = (e, category) => {
    e.preventDefault();
    setDraggedCategory(null);
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileSelect(category, files);
    }
  };

  // Trigger file input
  const triggerFileInput = (category) => {
    if (fileInputRefs.current[category]) {
      fileInputRefs.current[category].click();
    }
  };

  // Get photo count for category
  const getPhotoCount = (category) => {
    return photos[category]?.length || 0;
  };

  // Create preview URL for file
  const createPreviewUrl = (file) => {
    if (file instanceof File) {
      return URL.createObjectURL(file);
    }
    return file; // Assume it's already a URL
  };

  return (
    <div className="vehicle-photo-upload">
      <div className="photo-categories-grid">
        {PHOTO_CATEGORIES.map(category => (
          <div 
            key={category.key}
            className={`photo-category ${draggedCategory === category.key ? 'drag-over' : ''} ${errors[category.key] ? 'has-error' : ''}`}
            onDragOver={(e) => handleDragOver(e, category.key)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, category.key)}
          >
            {/* Category Header */}
            <div className="category-header">
              <div className="category-info">
                <span className="category-icon">{category.icon}</span>
                <div className="category-text">
                  <h4>{category.label}</h4>
                  <p>{category.description}</p>
                </div>
              </div>
              <div className="photo-count">
                {getPhotoCount(category.key)} photo{getPhotoCount(category.key) !== 1 ? 's' : ''}
              </div>
            </div>

            {/* Upload Area */}
            <div 
              className="upload-area"
              onClick={() => triggerFileInput(category.key)}
            >
              <div className="upload-content">
                <span className="upload-icon">📷</span>
                <p>Click or drag photos here</p>
                <small>Max 5MB per photo</small>
              </div>
            </div>

            {/* Hidden File Input */}
            <input
              ref={el => fileInputRefs.current[category.key] = el}
              type="file"
              accept="image/*"
              multiple
              style={{ display: 'none' }}
              onChange={(e) => handleFileSelect(category.key, e.target.files)}
              disabled={disabled}
            />

            {/* Photo Previews */}
            {photos[category.key] && photos[category.key].length > 0 && (
              <div className="photo-previews">
                {photos[category.key].map((photo, index) => (
                  <div key={index} className="photo-preview">
                    <img
                      src={createPreviewUrl(photo)}
                      alt={`${category.label} ${index + 1}`}
                      className="preview-image"
                    />
                    <button
                      type="button"
                      className="remove-photo-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        removePhoto(category.key, index);
                      }}
                      disabled={disabled}
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Error Message */}
            {errors[category.key] && (
              <div className="category-error">
                {errors[category.key]}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Upload Summary */}
      <div className="upload-summary">
        <div className="summary-stats">
          <span className="stat">
            📷 {Object.values(photos).flat().length} total photos
          </span>
          <span className="stat">
            📁 {Object.keys(photos).filter(key => photos[key]?.length > 0).length} categories used
          </span>
        </div>
        
        {Object.values(photos).flat().length > 0 && (
          <div className="summary-actions">
            <button
              type="button"
              className="clear-all-btn"
              onClick={() => onChange({})}
              disabled={disabled}
            >
              🗑️ Clear All Photos
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default VehiclePhotoUpload;
