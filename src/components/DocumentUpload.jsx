import { useState, useEffect } from 'react';
import './DocumentUpload.css';
import PDFPreviewModal from './PDFPreviewModal';
import DocumentActionModal from './DocumentActionModal';
import { showError } from './Notification';

const DocumentUpload = ({
  label, name, value, onChange, accept = "*/*", required = false,
  className = "", existingFileUrl = null, entityType = "customers",
  maxFileSize = 20 * 1024 * 1024, // Default 20MB in bytes (increased for large PDF documents)
  onDelete = null // Callback for deleting existing files from server
}) => {
  const [preview, setPreview] = useState(null);
  const [fileType, setFileType] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [showPDFModal, setShowPDFModal] = useState(false);
  const [pdfModalUrl, setPdfModalUrl] = useState(null);
  const [pdfFileName, setPdfFileName] = useState(null);
  const [showDocumentActionModal, setShowDocumentActionModal] = useState(false);
  const [documentActionData, setDocumentActionData] = useState({
    fileType: '', fileName: '', fileUrl: '', onDownload: null, onOpenInNewTab: null
  });

  const getFileTypeInfo = (fileName) => {
    const ext = fileName.toLowerCase();
    if (ext.endsWith('.pdf')) return { type: 'pdf', description: 'PDF Document' };
    if (ext.match(/\.(jpg|jpeg|png|gif|webp)$/)) return { type: 'image', description: 'Image' };
    if (ext.match(/\.(doc|docx)$/)) return { type: 'word', description: 'Word Document' };
    if (ext.match(/\.(xls|xlsx)$/)) return { type: 'excel', description: 'Excel Spreadsheet' };
    if (ext.match(/\.(ppt|pptx)$/)) return { type: 'powerpoint', description: 'PowerPoint Presentation' };
    return { type: 'other', description: 'Document' };
  };

  const openPDFPreview = (url, fileName) => {
    setPdfModalUrl(url);
    setPdfFileName(fileName || 'PDF Document');
    setShowPDFModal(true);
  };

  const closePDFPreview = () => {
    setShowPDFModal(false);
    setPdfModalUrl(null);
    setPdfFileName(null);
  };

  const openDocumentActionModal = (fileType, fileName, fileUrl) => {
    setDocumentActionData({
      fileType, fileName, fileUrl,
      onDownload: () => {
        const link = document.createElement('a');
        link.href = fileUrl;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      },
      onOpenInNewTab: () => window.open(fileUrl, '_blank', 'noopener,noreferrer')
    });
    setShowDocumentActionModal(true);
  };

  const closeDocumentActionModal = () => {
    setShowDocumentActionModal(false);
    setDocumentActionData({ fileType: '', fileName: '', fileUrl: '', onDownload: null, onOpenInNewTab: null });
  };

  const truncateFileName = (fileName, maxLength = 30) => {
    if (!fileName) return '';
    if (fileName.length <= maxLength) return fileName;
    const extension = fileName.split('.').pop();
    const nameWithoutExt = fileName.substring(0, fileName.lastIndexOf('.'));
    const truncatedName = nameWithoutExt.substring(0, maxLength - extension.length - 4);
    return `${truncatedName}...${extension}`;
  };

  useEffect(() => {
    if (value instanceof File) {
      console.log('📄 DocumentUpload - Processing new file:', value.name);
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreview(e.target.result);
        setFileType(value.type);
      };
      reader.readAsDataURL(value);
    } else if (typeof value === 'string' && value) {
      // For existing files, construct the preview URL
      const fileName = value.split(/[/\\]/).pop();
      const fileUrl = `/api/${entityType}/files/${fileName}`;
      console.log('📄 DocumentUpload - Setting preview from value string:', fileUrl);
      setPreview(fileUrl);

      // Determine file type from extension
      const extension = fileName.toLowerCase();
      if (extension.endsWith('.pdf')) {
        setFileType('application/pdf');
      } else if (extension.match(/\.(jpg|jpeg|png|gif|webp)$/)) {
        setFileType('image');
      } else {
        setFileType('document');
      }
    } else if (existingFileUrl) {
      console.log('📄 DocumentUpload - Setting preview from existingFileUrl:', existingFileUrl);
      setPreview(existingFileUrl);
      const fileName = existingFileUrl.split('/').pop();
      const extension = fileName.toLowerCase();
      if (extension.endsWith('.pdf')) {
        setFileType('application/pdf');
      } else if (extension.match(/\.(jpg|jpeg|png|gif|webp)$/)) {
        setFileType('image');
      } else {
        setFileType('document');
      }
    } else {
      console.log('📄 DocumentUpload - No file to preview');
      setPreview(null);
      setFileType(null);
    }
  }, [value, existingFileUrl, entityType]);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Check file size limit
      if (file.size > maxFileSize) {
        showError(`File size exceeds the maximum limit of ${formatMaxFileSize(maxFileSize)}. Please select a smaller file.`);
        e.target.value = ''; // Clear the input
        return;
      }
      onChange(file);
    }
  };

  const handleRemove = () => {
    // If there's an existing file and onDelete callback, mark for deletion
    // (The actual deletion will happen when the form is submitted)
    if (existingFileUrl && onDelete && !value) {
      console.log('🗑️ DocumentUpload - Marking existing file for deletion (will delete on form submit):', name);
      onDelete(name); // Call the parent's delete handler with field name to mark for deletion
    }

    // Clear local state immediately to update UI
    setPreview(null);
    setFileType(null);
    onChange(null);
  };

  const isImageFile = (type) => {
    return type && (type.startsWith('image/') || type === 'image');
  };



  const formatFileSize = (bytes) => {
    if (!bytes) return '';
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  const formatMaxFileSize = (bytes) => {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    const size = Math.round(bytes / Math.pow(1024, i));
    return `${size} ${sizes[i]}`;
  };

  const getFileIcon = (fileName) => {
    const ext = fileName.toLowerCase();
    if (ext.endsWith('.pdf')) return '📄';
    if (ext.match(/\.(jpg|jpeg|png|gif|webp)$/)) return '🖼️';
    if (ext.match(/\.(doc|docx)$/)) return '📝';
    if (ext.match(/\.(xls|xlsx)$/)) return '📊';
    if (ext.match(/\.(ppt|pptx)$/)) return '📽️';
    return '📄';
  };

  const fileInputId = `file-${name}-${Math.random().toString(36).substring(2, 11)}`;

  return (
    <div className={`document-upload ${className}`}>
      {label && (
        <label className="upload-label">
          {label} {required && <span className="required">*</span>}
        </label>
      )}

      <div className="upload-container">
        <input
          type="file"
          id={fileInputId}
          onChange={handleFileChange}
          accept={accept}
          className="file-input-hidden"
        />

        {!(value || existingFileUrl) ? (
          // Show upload button only when no file is selected
          <div className="file-display-area">
            <label htmlFor={fileInputId} className="choose-file-btn">
              📁 Choose File
            </label>
            <div className="file-size-limit">
              Max file size: {formatMaxFileSize(maxFileSize)}
            </div>
          </div>
        ) : (
          // Show file info and preview when file is selected
          <div className="file-uploaded-area">
            <div className="file-header">
              <div className="file-info">
                <div className="file-details">
                  <span className="file-icon">
                    {getFileIcon(value?.name || (existingFileUrl ? existingFileUrl.split('/').pop() : 'file'))}
                  </span>
                  <div className="file-text">
                    <span className="file-name">
                      {truncateFileName(value?.name || (existingFileUrl ? existingFileUrl.split('/').pop() : 'Uploaded file'))}
                    </span>
                    {value?.size && (
                      <span className="file-size">{formatFileSize(value.size)}</span>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleRemove}
                  className="remove-btn"
                  title="Remove file"
                >
                  ✕
                </button>
              </div>

              {/* Action buttons for all file types */}
              <div className="file-actions">
                <button
                  type="button"
                  onClick={() => {
                    if (preview) {
                      const fileName = value?.name || (existingFileUrl ? existingFileUrl.split('/').pop() : 'Document');
                      const fileInfo = getFileTypeInfo(fileName);
                      console.log('👁️ DocumentUpload - View clicked:', { preview, fileName, fileType: fileInfo.type });

                      if (fileInfo.type === 'pdf') {
                        openPDFPreview(preview, fileName);
                      } else if (fileInfo.type === 'image' || isImageFile(fileType)) {
                        setShowModal(true);
                      } else if (fileInfo.type === 'word' || fileInfo.type === 'excel' || fileInfo.type === 'powerpoint') {
                        openDocumentActionModal(fileInfo.type, fileName, preview);
                      } else {
                        window.open(preview, '_blank');
                      }
                    } else {
                      console.warn('⚠️ DocumentUpload - No preview available for viewing');
                    }
                  }}
                  className="action-btn view-btn"
                  title="View file"
                >
                  👁️ View
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (preview) {
                      const fileName = value?.name || existingFileUrl?.split('/').pop() || 'document';
                      console.log('📥 DocumentUpload - Download clicked:', { preview, fileName });
                      const link = document.createElement('a');
                      link.href = preview;
                      link.download = fileName;
                      link.target = '_blank';
                      document.body.appendChild(link);
                      link.click();
                      document.body.removeChild(link);
                    } else {
                      console.warn('⚠️ DocumentUpload - No preview available for download');
                    }
                  }}
                  className="action-btn download-btn"
                  title="Download file"
                >
                  📥 Download
                </button>
              </div>
            </div>

            {/* Show image preview only for image files */}
            {(isImageFile(fileType) || (preview && preview.startsWith('data:image'))) && (
              <div className="image-preview-area">
                <img
                  src={preview || existingFileUrl}
                  alt="Preview"
                  className="inline-image-preview"
                  onClick={() => setShowModal(true)}
                />
              </div>
            )}
          </div>
        )}
      </div>

      {showModal && (
        <div className="image-modal-overlay" onClick={() => setShowModal(false)}>
          <div className="image-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="image-modal-header">
              <h3>Image Preview</h3>
              <button className="modal-close-btn" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <div className="image-modal-body">
              <img src={preview || existingFileUrl} alt="Full size preview" className="modal-image" />
            </div>
          </div>
        </div>
      )}

      <PDFPreviewModal
        isOpen={showPDFModal}
        onClose={closePDFPreview}
        pdfUrl={pdfModalUrl}
        fileName={pdfFileName}
      />

      <DocumentActionModal
        isOpen={showDocumentActionModal}
        onClose={closeDocumentActionModal}
        fileType={documentActionData.fileType}
        fileName={documentActionData.fileName}
        onDownload={documentActionData.onDownload}
        onOpenInNewTab={documentActionData.onOpenInNewTab}
      />
    </div>
  );
};

export default DocumentUpload;
