import React, { useState, useEffect } from 'react';
import { Button, Dropdown, Modal, Form, Alert, Spinner, Row, Col } from 'react-bootstrap';
import { FaDownload, FaFileExcel, FaFileCsv, FaFilePdf, FaCog } from 'react-icons/fa';
import axios from 'axios';

const ExportButton = ({
  entity,
  entityId = null,
  buttonText = 'Export',
  variant = 'outline-primary',
  size = 'sm',
  className = '',
  onExportStart,
  onExportComplete,
  onExportError,
  // External date filter props
  externalFromDate = '',
  externalToDate = '',
  useExternalDates = false
}) => {
  const [showModal, setShowModal] = useState(false);
  const [selectedFormat, setSelectedFormat] = useState('xlsx');
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState(null);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [dateError, setDateError] = useState(null);
  const [isExportDisabled, setIsExportDisabled] = useState(false);

  // Use external dates if provided and useExternalDates is true
  const effectiveFromDate = useExternalDates ? externalFromDate : fromDate;
  const effectiveToDate = useExternalDates ? externalToDate : toDate;

  const exportFormats = [
    { value: 'xlsx', label: 'Excel (.xlsx)', icon: FaFileExcel, color: '#217346' },
    { value: 'csv', label: 'CSV (.csv)', icon: FaFileCsv, color: '#6c757d' },
    { value: 'pdf', label: 'PDF (.pdf)', icon: FaFilePdf, color: '#dc3545' }
  ];

  useEffect(() => {
    if (effectiveFromDate && effectiveToDate) {
      if (effectiveFromDate > effectiveToDate) {
        setDateError('From Date cannot be later than To Date.');
        setIsExportDisabled(true);
      } else {
        setDateError(null);
        setIsExportDisabled(false);
      }
    } else {
      setDateError(null);
      setIsExportDisabled(false);
    }
  }, [effectiveFromDate, effectiveToDate]);

  const handleExport = async (format) => {
    setSelectedFormat(format);
    setExporting(true);
    setError(null);

    if (onExportStart) {
      onExportStart({ entity, format, entityId, fromDate: effectiveFromDate, toDate: effectiveToDate });
    }

    try {
      const params = new URLSearchParams({
        format,
        ...(entityId && { id: entityId }),
        ...(effectiveFromDate && { fromDate: effectiveFromDate }),
        ...(effectiveToDate && { toDate: effectiveToDate })
      });

      const response = await axios.get(`/api/export/${entity}?${params}`, {
        responseType: 'blob',
        timeout: 30000, // 30 second timeout
      });

      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;

      // Get filename from response headers or generate one
      const contentDisposition = response.headers['content-disposition'];
      let filename = `${entity}_${new Date().toISOString().split('T')[0]}.${format}`;

      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
        if (filenameMatch && filenameMatch[1]) {
          filename = filenameMatch[1].replace(/['"]/g, '');
        }
      }

      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      setShowModal(false);

      if (onExportComplete) {
        onExportComplete({ entity, format, entityId, filename });
      }

    } catch (error) {
      console.error('Export error:', error);
      let errorMessage = 'Failed to export data';

      if (error.response) {
        if (error.response.status === 404) {
          errorMessage = 'No data found to export';
        } else if (error.response.status === 500) {
          errorMessage = 'Server error occurred during export';
        } else if (error.response.data) {
          errorMessage = error.response.data.error || errorMessage;
        }
      } else if (error.code === 'ECONNABORTED') {
        errorMessage = 'Export request timed out. Please try again.';
      }

      setError(errorMessage);

      if (onExportError) {
        onExportError({ entity, format, entityId, error: errorMessage });
      }
    } finally {
      setExporting(false);
    }
  };

  const handleQuickExport = (format) => {
    handleExport(format);
  };

  const getFormatIcon = (format) => {
    const formatInfo = exportFormats.find(f => f.value === format);
    if (formatInfo) {
      const IconComponent = formatInfo.icon;
      return <IconComponent style={{ color: formatInfo.color }} />;
    }
    return <FaDownload />;
  };

  return (
    <>
      <Dropdown className={className}>
        <Dropdown.Toggle
          variant={variant}
          size={size}
          disabled={exporting}
          className="d-flex align-items-center"
        >
          {exporting ? (
            <>
              <Spinner animation="border" size="sm" className="me-2" />
              Exporting...
            </>
          ) : (
            <>
              <FaDownload className="me-2" />
              {buttonText}
            </>
          )}
        </Dropdown.Toggle>

        <Dropdown.Menu>
          <Dropdown.Header>Quick Export</Dropdown.Header>
          {exportFormats.map(format => (
            <Dropdown.Item
              key={format.key || format.value}
              onClick={() => handleQuickExport(format.value)}
              disabled={exporting}
              className="d-flex align-items-center"
            >
              {getFormatIcon(format.value)}
              <span className="ms-2">{format.label}</span>
            </Dropdown.Item>
          ))}

          <Dropdown.Divider />

          <Dropdown.Item
            onClick={() => setShowModal(true)}
            disabled={exporting}
            className="d-flex align-items-center"
          >
            <FaCog className="me-2" />
            Advanced Export Options
          </Dropdown.Item>
        </Dropdown.Menu>
      </Dropdown>

      {/* Advanced Export Modal */}
      <Modal show={showModal} onHide={() => !exporting && setShowModal(false)}>
        <Modal.Header closeButton={!exporting}>
          <Modal.Title>
            <FaDownload className="me-2" />
            Export {entity.charAt(0).toUpperCase() + entity.slice(1)}
          </Modal.Title>
        </Modal.Header>

        <Modal.Body>
          {error && (
            <Alert variant="danger" dismissible onClose={() => setError(null)}>
              <strong>Export Failed:</strong> {error}
            </Alert>
          )}

          {dateError && (
            <Alert variant="danger" dismissible onClose={() => setDateError(null)}>
              <strong>Date Range Error:</strong> {dateError}
            </Alert>
          )}

          <Form.Group className="mb-3">
            <Form.Label>Export Format</Form.Label>
            <div className="d-grid gap-2">
              {exportFormats.map(format => {
                const IconComponent = format.icon;
                return (
                  <Button
                    key={format.value}
                    variant={selectedFormat === format.value ? 'primary' : 'outline-primary'}
                    onClick={() => setSelectedFormat(format.value)}
                    disabled={exporting}
                    className="d-flex align-items-center justify-content-start"
                  >
                    <IconComponent className="me-3" style={{ color: format.color }} />
                    <div className="text-start">
                      <div>{format.label}</div>
                      <small className="text-muted">
                        {format.value === 'xlsx' && 'Best for data analysis and formatting'}
                        {format.value === 'csv' && 'Simple text format, compatible with most applications'}
                        {format.value === 'pdf' && 'Portable document format for sharing'}
                      </small>
                    </div>
                  </Button>
                );
              })}
            </div>
          </Form.Group>

          {/* Date Range Inputs */}
          <Form.Group className="mb-3">
            <Row>
              <Col>
                <Form.Label>From Date {useExternalDates && <small className="text-muted">(from table filter)</small>}</Form.Label>
                <Form.Control
                  type="date"
                  value={effectiveFromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  disabled={exporting || useExternalDates}
                />
              </Col>
              <Col>
                <Form.Label>To Date {useExternalDates && <small className="text-muted">(from table filter)</small>}</Form.Label>
                <Form.Control
                  type="date"
                  value={effectiveToDate}
                  onChange={(e) => setToDate(e.target.value)}
                  disabled={exporting || useExternalDates}
                />
              </Col>
            </Row>
          </Form.Group>

          {entityId && (
            <Alert variant="info">
              <strong>Single Record Export:</strong> Exporting specific record (ID: {entityId})
            </Alert>
          )}

          <div className="mt-3 p-3 bg-light rounded">
            <h6>What will be exported?</h6>
            <ul className="mb-0 small">
              <li>All {entity} records with complete information</li>
              <li>Related data from connected tables</li>
              <li>Proper column headers and formatting</li>
              <li>Date fields in readable format</li>
            </ul>
          </div>
        </Modal.Body>

        <Modal.Footer>
          <Button
            variant="secondary"
            onClick={() => setShowModal(false)}
            disabled={exporting}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={() => handleExport(selectedFormat)}
            disabled={exporting || isExportDisabled}
          >
            {exporting ? (
              <>
                <Spinner animation="border" size="sm" className="me-2" />
                Exporting...
              </>
            ) : (
              <>
                <FaDownload className="me-2" />
                Export as {exportFormats.find(f => f.value === selectedFormat)?.label}
              </>
            )}
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
};

export default ExportButton;
