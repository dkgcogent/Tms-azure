import React, { useState, useRef } from 'react';
import { Modal, Button, Form, ProgressBar, Alert, Table } from 'react-bootstrap';
import { FaUpload, FaFile, FaCheck, FaTimes, FaDownload } from 'react-icons/fa';
import axios from 'axios';

const ImportModal = ({
  show,
  onHide,
  entityType,
  onImportSuccess,
  acceptedFormats = ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.csv', '.jpg', '.jpeg', '.png']
}) => {
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('');
  const fileInputRef = useRef(null);

  const categories = {
    customers: [
      { value: 'agreement', label: 'Agreement Document' },
      { value: 'bg', label: 'Bank Guarantee' },
      { value: 'po', label: 'Purchase Order' },
      { value: 'annexure', label: 'Annexure' },
      { value: 'mis', label: 'MIS Format' },
      { value: 'kpi', label: 'KPI SLA' },
      { value: 'performance', label: 'Performance Report' }
    ],
    vendors: [
      { value: 'aadhar', label: 'Aadhar Document' },
      { value: 'pan', label: 'PAN Document' },
      { value: 'gst', label: 'GST Document' },
      { value: 'company_pan', label: 'Company PAN' },
      { value: 'udhyam', label: 'Udhyam Certificate' },
      { value: 'legal', label: 'Legal Documents' },
      { value: 'cheque', label: 'Bank Cheque' }
    ],
    vehicles: [
      { value: 'rc', label: 'RC Document' },
      { value: 'insurance', label: 'Insurance Document' },
      { value: 'fitness', label: 'Fitness Certificate' },
      { value: 'pollution', label: 'Pollution Certificate' },
      { value: 'tax', label: 'State Tax Document' },
      { value: 'photo', label: 'Vehicle Photo' },
      { value: 'kms_photo', label: 'KMS Photo' },
      { value: 'service_bill', label: 'Service Bill' }
    ],
    drivers: [
      { value: 'license', label: 'License Document' },
      { value: 'photo', label: 'Driver Photo' },
      { value: 'medical', label: 'Medical Certificate' }
    ],
    billing: [
      { value: 'commercial_rates', label: 'Commercial Rates' },
      { value: 'invoice', label: 'Invoice Document' }
    ]
  };

  const handleFileSelect = (event) => {
    const selectedFiles = Array.from(event.target.files);
    const validFiles = selectedFiles.filter(file => {
      const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
      return acceptedFormats.includes(fileExtension);
    });

    if (validFiles.length !== selectedFiles.length) {
      setError('Some files were skipped due to unsupported format. Supported formats: ' + acceptedFormats.join(', '));
    }

    setFiles(prev => [...prev, ...validFiles]);
    setError(null);
  };

  const removeFile = (index) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (files.length === 0) {
      setError('Please select at least one file to upload');
      return;
    }

    if (!selectedCategory) {
      setError('Please select a document category');
      return;
    }

    setUploading(true);
    setUploadProgress(0);
    setError(null);
    setResults(null);

    try {
      const formData = new FormData();

      files.forEach((file, index) => {
        formData.append('files', file);
      });

      formData.append('entityType', entityType);
      formData.append('category', selectedCategory);
      formData.append('entityId', '1'); // This would come from props or context

      const response = await axios.post('/api/import/upload', formData, {
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
      setFiles([]);
      setSelectedCategory('');

      if (onImportSuccess) {
        onImportSuccess(response.data);
      }

    } catch (error) {
      console.error('Upload error:', error);
      setError(error.response?.data?.error || 'Failed to upload files');
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const resetModal = () => {
    setFiles([]);
    setUploading(false);
    setUploadProgress(0);
    setResults(null);
    setError(null);
    setSelectedCategory('');
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

  return (
    <Modal show={show} onHide={handleClose} size="lg">
      <Modal.Header closeButton>
        <Modal.Title>
          <FaUpload className="me-2" />
          Import Documents - {entityType.charAt(0).toUpperCase() + entityType.slice(1)}
        </Modal.Title>
      </Modal.Header>

      <Modal.Body>
        {error && (
          <Alert variant="danger" dismissible onClose={() => setError(null)}>
            <FaTimes className="me-2" />
            {error}
          </Alert>
        )}

        {results && (
          <Alert variant="success">
            <FaCheck className="me-2" />
            <strong>Import completed successfully!</strong>
            <div className="mt-2">
              <small>
                {results.successfulUploads} of {results.totalFiles} files uploaded successfully
              </small>
            </div>
          </Alert>
        )}

        {!results && (
          <>
            {/* Category Selection */}
            <Form.Group className="mb-3">
              <Form.Label>Document Category</Form.Label>
              <Form.Select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                disabled={uploading}
              >
                <option value="">Select category...</option>
                {categories[entityType]?.map(category => (
                  <option key={category.value} value={category.value}>
                    {category.label}
                  </option>
                ))}
              </Form.Select>
            </Form.Group>

            {/* File Selection */}
            <Form.Group className="mb-3">
              <Form.Label>Select Files</Form.Label>
              <div className="d-flex gap-2">
                <Form.Control
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept={acceptedFormats.join(',')}
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
                  Choose Files
                </Button>
                <small className="text-muted align-self-center">
                  Supported formats: {acceptedFormats.join(', ')}
                </small>
              </div>
            </Form.Group>

            {/* File List */}
            {files.length > 0 && (
              <div className="mb-3">
                <h6>Selected Files ({files.length})</h6>
                <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
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
                            <FaFile className="me-2" />
                            {file.name}
                          </td>
                          <td>{formatFileSize(file.size)}</td>
                          <td>
                            <Button
                              size="sm"
                              variant="outline-danger"
                              onClick={() => removeFile(index)}
                              disabled={uploading}
                            >
                              <FaTimes />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </div>
              </div>
            )}

            {/* Upload Progress */}
            {uploading && (
              <div className="mb-3">
                <div className="d-flex justify-content-between mb-2">
                  <span>Uploading...</span>
                  <span>{uploadProgress}%</span>
                </div>
                <ProgressBar now={uploadProgress} animated />
              </div>
            )}
          </>
        )}

        {/* Sample Template Download */}
        <div className="mt-3 p-3 bg-light rounded">
          <h6>Need help with file format?</h6>
          <p className="mb-2">Download sample templates for proper formatting:</p>
          <Button variant="outline-info" size="sm">
            <FaDownload className="me-2" />
            Download Template
          </Button>
        </div>
      </Modal.Body>

      <Modal.Footer>
        <Button variant="secondary" onClick={handleClose} disabled={uploading}>
          Close
        </Button>
        {!results && (
          <Button
            variant="primary"
            onClick={handleUpload}
            disabled={uploading || files.length === 0 || !selectedCategory}
          >
            {uploading ? (
              <>
                <span className="spinner-border spinner-border-sm me-2" />
                Uploading...
              </>
            ) : (
              <>
                <FaUpload className="me-2" />
                Upload Files
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

export default ImportModal;
