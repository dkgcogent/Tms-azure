import React, { useState, useEffect } from 'react';
import './PDFPreviewModal.css';

const PDFPreviewModal = ({ isOpen, onClose, pdfUrl, fileName }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [scale, setScale] = useState(1.0);

  useEffect(() => {
    if (isOpen && pdfUrl) {
      setLoading(true);
      setError(null);
      setScale(1.0);

      // Debug logging
      console.log('📄 PDFPreviewModal: Opening PDF:', pdfUrl);

      // Test if the URL is accessible
      fetch(pdfUrl, { method: 'HEAD' })
        .then(response => {
          console.log('📄 PDFPreviewModal: URL test result:', {
            url: pdfUrl,
            status: response.status,
            contentType: response.headers.get('content-type'),
            contentDisposition: response.headers.get('content-disposition')
          });
        })
        .catch(error => {
          console.warn('📄 PDFPreviewModal: URL test failed:', error);
        });
    }
  }, [isOpen, pdfUrl]);

  const handleIframeLoad = () => {
    setLoading(false);
  };

  const handleIframeError = () => {
    setLoading(false);
    setError('Failed to load PDF. The file may be corrupted or not accessible.');
  };

  const handleZoomIn = () => {
    setScale(prev => Math.min(prev + 0.25, 3.0));
  };

  const handleZoomOut = () => {
    setScale(prev => Math.max(prev - 0.25, 0.5));
  };

  const handleResetZoom = () => {
    setScale(1.0);
  };

  const handleDownload = () => {
    try {
      const link = document.createElement('a');
      link.href = pdfUrl;
      link.download = fileName || 'document.pdf';
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Download failed:', error);
      alert('Download failed. Please try again.');
    }
  };

  const handleOpenInNewTab = () => {
    try {
      console.log('📄 Opening PDF in new tab:', pdfUrl);
      window.open(pdfUrl, '_blank', 'noopener,noreferrer');
    } catch (error) {
      console.error('Failed to open in new tab:', error);
      alert('Failed to open in new tab. Please try again.');
    }
  };

  const handleDirectView = () => {
    try {
      console.log('📄 Direct view attempt:', pdfUrl);
      // Try to navigate to the PDF directly
      window.location.href = pdfUrl;
    } catch (error) {
      console.error('Failed direct view:', error);
      alert('Failed to view PDF directly. Please try download.');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="pdf-preview-modal-overlay" onClick={onClose}>
      <div className="pdf-preview-modal" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="pdf-preview-header">
          <div className="pdf-preview-title">
            <span className="pdf-icon">📄</span>
            <span className="pdf-filename">{fileName || 'PDF Document'}</span>
          </div>
          
          {/* Toolbar */}
          <div className="pdf-preview-toolbar">
            <button 
              className="toolbar-btn" 
              onClick={handleZoomOut}
              title="Zoom Out"
              disabled={scale <= 0.5}
            >
              🔍-
            </button>
            
            <span className="zoom-level">{Math.round(scale * 100)}%</span>
            
            <button 
              className="toolbar-btn" 
              onClick={handleZoomIn}
              title="Zoom In"
              disabled={scale >= 3.0}
            >
              🔍+
            </button>
            
            <button 
              className="toolbar-btn" 
              onClick={handleResetZoom}
              title="Reset Zoom"
            >
              🔄
            </button>
            
            <div className="toolbar-separator"></div>
            
            <button 
              className="toolbar-btn" 
              onClick={handleDownload}
              title="Download PDF"
            >
              💾
            </button>
            
            <button
              className="toolbar-btn"
              onClick={handleOpenInNewTab}
              title="Open in New Tab"
            >
              🔗
            </button>

            <button
              className="toolbar-btn"
              onClick={handleDirectView}
              title="Direct View (Debug)"
              style={{ background: '#ffc107', color: '#000' }}
            >
              🔍
            </button>

            <button
              className="toolbar-btn close-btn"
              onClick={onClose}
              title="Close"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Modal Content */}
        <div className="pdf-preview-content">
          {loading && (
            <div className="pdf-preview-loading">
              <div className="loading-spinner"></div>
              <p>Loading PDF...</p>
            </div>
          )}
          
          {error && (
            <div className="pdf-preview-error">
              <div className="error-icon">⚠️</div>
              <p>{error}</p>
              <button className="retry-btn" onClick={() => window.location.reload()}>
                Retry
              </button>
            </div>
          )}
          
          {pdfUrl && (
            <div
              className="pdf-preview-container"
              style={{
                transform: `scale(${scale})`,
                transformOrigin: 'top left',
                display: loading || error ? 'none' : 'block'
              }}
            >
              <iframe
                src={pdfUrl}
                className="pdf-preview-iframe"
                onLoad={handleIframeLoad}
                onError={handleIframeError}
                title={fileName || 'PDF Preview'}
                frameBorder="0"
                allow="fullscreen"
              />
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="pdf-preview-footer">
          <div className="footer-info">
            <span>Use mouse wheel or toolbar buttons to zoom • Right-click to access browser PDF controls</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PDFPreviewModal;
