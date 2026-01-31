import React, { useState, useRef } from 'react';
import { Modal, Button, Form, ProgressBar, Alert, Table, Card } from 'react-bootstrap';
import { FaUpload, FaFile, FaCheck, FaTimes, FaDownload, FaCalculator, FaEye } from 'react-icons/fa';
import axios from 'axios';

const RatesImportModal = ({
  show,
  onHide,
  customerId,
  customerName,
  projectId,
  projectName,
  locationId,
  locationName,
  onImportSuccess
}) => {
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);
  const [validationErrors, setValidationErrors] = useState([]);
  const fileInputRef = useRef(null);

  const handleFileSelect = (event) => {
    const selectedFiles = Array.from(event.target.files);
    const validFiles = selectedFiles.filter(file => {
      const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
      return ['.xlsx', '.xls', '.csv'].includes(fileExtension);
    });

    if (validFiles.length !== selectedFiles.length) {
      setError('Some files were skipped due to unsupported format. Supported formats: .xlsx, .xls, .csv');
    }

    setFiles(validFiles);
    setError(null);
    setValidationErrors([]);
    setResults(null);
  };

  const removeFile = (index) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const viewFile = (file) => {
    const fileURL = URL.createObjectURL(file);
    const newWindow = window.open(fileURL, '_blank', 'noopener,noreferrer');
    
    if (newWindow) {
      newWindow.onload = () => {
        URL.revokeObjectURL(fileURL);
      };
    } else {
      alert('Your browser blocked the file view. Please allow pop-ups for this site to view files.');
    }
  };

  const handleUpload = async () => {
    if (files.length === 0) {
      setError('Please select at least one file to upload');
      return;
    }

    if (files.length > 1) {
      setError('Please select only one file for rates import');
      return;
    }

    setUploading(true);
    setUploadProgress(0);
    setError(null);
    setValidationErrors([]);
    setResults(null);

    try {
      const formData = new FormData();
      formData.append('file', files[0]);

      if (customerId) formData.append('customerId', customerId);
      if (projectId) formData.append('projectId', projectId);
      if (locationId) formData.append('locationId', locationId);

      const response = await axios.post('/api/rates/import', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          );
          setUploadProgress(percentCompleted);
        },
      });

      setResults(response.data);

      // Show validation errors if any
      if (response.data.validationResults && response.data.validationResults.errors.length > 0) {
        setValidationErrors(response.data.validationResults.errors);
      }

      if (onImportSuccess) {
        onImportSuccess(response.data);
      }

    } catch (error) {
      console.error('Upload error:', error);
      const errorMessage = error.response?.data?.error || 'Failed to import rates';
      setError(errorMessage);

      // Show validation errors if available
      if (error.response?.data?.validationResults?.errors) {
        setValidationErrors(error.response.data.validationResults.errors);
      }
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const downloadTemplate = async () => {
    try {
      const response = await axios.get('/api/rates/template', {
        responseType: 'blob'
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'rates_template.xlsx');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading template:', error);
      setError('Failed to download template');
    }
  };

  const resetModal = () => {
    setFiles([]);
    setUploading(false);
    setUploadProgress(0);
    setResults(null);
    setError(null);
    setValidationErrors([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleClose = () => {
    resetModal();
    onHide();
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getContextInfo = () => {
    const context = [];
    if (customerName) context.push(`Customer: ${customerName}`);
    if (projectName) context.push(`Project: ${projectName}`);
    if (locationName) context.push(`Location: ${locationName}`);
    return context.join(' | ');
  };

  return (
    <Modal show={show} onHide={handleClose} size="lg">
      <Modal.Header closeButton>
        <Modal.Title>
          <FaCalculator className="me-2" />
          Import Rates Annexure
        </Modal.Title>
      </Modal.Header>

      <Modal.Body>
        {/* Context Information */}
        {getContextInfo() && (
          <Alert variant="info" className="mb-3">
            <strong>Import Context:</strong> {getContextInfo()}
          </Alert>
        )}

        {/* Error Alert */}
        {error && (
          <Alert variant="danger" dismissible onClose={() => setError(null)} className="mb-3">
            <FaTimes className="me-2" />
            {error}
          </Alert>
        )}

        {/* Validation Errors */}
        {validationErrors.length > 0 && (
          <Alert variant="warning" className="mb-3">
            <strong>Validation Issues Found:</strong>
            <ul className="mb-0 mt-2">
              {validationErrors.slice(0, 5).map((err, index) => (
                <li key={index}>
                  Row {err.row}: {err.message}
                </li>
              ))}
              {validationErrors.length > 5 && (
                <li>... and {validationErrors.length - 5} more issues</li>
              )}
            </ul>
          </Alert>
        )}

        {/* Success Results */}
        {results && validationErrors.length === 0 && (
          <Alert variant="success" className="mb-3">
            <FaCheck className="me-2" />
            <strong>Import completed successfully!</strong>
            <div className="mt-2">
              <small>
                Processed {results.recordsProcessed} records
                {results.saveResults && (
                  <span> | Saved {results.saveResults.savedRecords} rates</span>
                )}
              </small>
            </div>
          </Alert>
        )}

        {/* Template Download */}
        <Card className="mb-3">
          <Card.Body>
            <div className="d-flex justify-content-between align-items-center">
              <div>
                <h6 className="mb-1">Need help with file format?</h6>
                <p className="mb-0 text-muted">Download the rates template with proper column structure</p>
              </div>
              <Button variant="outline-primary" onClick={downloadTemplate}>
                <FaDownload className="me-2" />
                Download Template
              </Button>
            </div>
          </Card.Body>
        </Card>

        {/* File Selection */}
        <Form.Group className="mb-3">
          <Form.Label>Select Rates File</Form.Label>
          <div className="d-flex gap-2">
            <Form.Control
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleFileSelect}
              disabled={uploading}
              style={{ display: 'none' }}
            />
            <Button
              variant="outline-primary"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              <FaFile className="me-2" />
              Choose File
            </Button>
            <small className="text-muted align-self-center">
              Supported formats: Excel (.xlsx, .xls) and CSV files
            </small>
          </div>
        </Form.Group>

        {/* File List */}
        {files.length > 0 && (
          <div className="mb-3">
            <h6>Selected File</h6>
            <Table size="sm">
              <thead>
                <tr>
                  <th>File Name</th>
                  <th>Size</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {files.map((file, index) => (
                  <tr key={index}>
                    <td>
                      <Button
                        variant="link"
                        onClick={() => viewFile(file)}
                        title="View File"
                        className="p-0"
                      >
                        <FaFile className="me-2" />
                        {file.name}
                      </Button>
                    </td>
                    <td>{formatFileSize(file.size)}</td>
                    <td>
                      <div className="d-flex gap-1">
                        <Button
                          size="sm"
                          variant="outline-info"
                          onClick={() => viewFile(file)}
                          disabled={uploading}
                          title="View File"
                        >
                          <FaEye />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline-danger"
                          onClick={() => removeFile(index)}
                          disabled={uploading}
                          title="Remove File"
                        >
                          <FaTimes />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
        )}

        {/* Upload Progress */}
        {uploading && (
          <div className="mb-3">
            <div className="d-flex justify-content-between mb-2">
              <span>Processing rates data...</span>
              <span>{uploadProgress}%</span>
            </div>
            <ProgressBar now={uploadProgress} animated />
          </div>
        )}

        {/* Required Columns Info */}
        <Alert variant="light" className="mt-3">
          <strong>Required Columns:</strong>
          <ul className="mb-0 mt-2">
            <li>Customer Code (or will use selected customer)</li>
            <li>Vehicle Type</li>
            <li>Base Rate</li>
            <li>Optional: Fuel Rate, Toll Rate, Loading Charges, Unloading Charges, Other Charges</li>
            <li>Optional: Effective From/To dates, Remarks</li>
          </ul>
        </Alert>
      </Modal.Body>

      <Modal.Footer>
        <Button variant="secondary" onClick={handleClose} disabled={uploading}>
          Close
        </Button>
        {!results && (
          <Button
            variant="primary"
            onClick={handleUpload}
            disabled={uploading || files.length === 0}
          >
            {uploading ? (
              <>
                <span className="spinner-border spinner-border-sm me-2" />
                Importing...
              </>
            ) : (
              <>
                <FaUpload className="me-2" />
                Import Rates
              </>
            )}
          </Button>
        )}
        {results && (
          <Button variant="primary" onClick={handleClose}>
            Done
          </Button>
        )}
      </Modal.Footer>
    </Modal>
  );
};

export default RatesImportModal;
