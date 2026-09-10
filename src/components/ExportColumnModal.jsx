import React, { useState, useMemo, useEffect } from 'react';
import ExcelJS from 'exceljs';
import './ExportColumnModal.css';

const MANDATORY_IMPORT_KEYS = new Set([
  '__serial_number__',
  'triptype', 'typeoftransaction', 'type',
  'servicedate', 'service_date',
  'vehiclereturndate', 'vehicle_return_date', 'returndate',
  'tripno', 'trip_no',
  'customername', 'customer_name',
  'projectname', 'project_name',
  'location', 'customersite', 'customer_site', 'custsite',
  'vehiclenumber', 'vehicle_number', 'vehicleno', 'vehicle_no',
  'vendorname', 'vendor_name',
  'drivername', 'driver_name', 'drivernumber', 'driver_number',
  'openingkm', 'opening_km',
  'closingkm', 'closing_km',
  // Timing columns
  'vehiclereportingathub', 'vehicle_reporting_at_hub', 'reportingtime', 'reporting_time',
  'vehicleentryinhub', 'vehicle_entry_in_hub', 'entrytime', 'entry_time',
  'vehicleoutfromhubfordelivery', 'vehicle_out_from_hub_for_delivery', 'outtime', 'out_time',
  'vehiclereturnathub', 'vehicle_return_at_hub', 'returntime', 'return_time',
  'vehicleenteredathubreturn', 'vehicle_entered_at_hub_return', 'returnentrytime', 'return_entry_time',
  'vehicleoutfromhubfinal', 'vehicle_out_from_hub_final', 'finalouttime', 'final_out_time',
  'arrivaltimeathub', 'arrival_time_at_hub',
  'intimebycust', 'in_time_by_cust',
  'outtimefromhub', 'out_time_from_hub',
  'outtimefrom', 'out_time_from',
  'returnreportingtime', 'return_reporting_time'
]);

export const isColumnMandatory = (col) => {
  if (!col) return false;
  if (col.isMandatory || col.isRequiredForImport || col.required) return true;
  const k = String(col.key || '').toLowerCase().replace(/[^a-z0-9_]/g, '');
  const l = String(col.label || '').toLowerCase().replace(/[^a-z0-9_]/g, '');
  return MANDATORY_IMPORT_KEYS.has(k) || MANDATORY_IMPORT_KEYS.has(l);
};

const ExportColumnModal = ({
  isOpen = false,
  onClose,
  columns = [],
  data = [],
  defaultSelectedKeys = null,
  fileName = 'Transactions_Export',
  sheetName = 'Transactions',
  title = 'Select Columns to Export'
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const [selectedKeys, setSelectedKeys] = useState([]);

  // Default keys when opening or resetting
  const defaultKeys = useMemo(() => {
    if (defaultSelectedKeys && defaultSelectedKeys.length > 0) {
      return defaultSelectedKeys;
    }
    // Default to all columns if nothing specified
    return columns.map(c => c.key);
  }, [columns, defaultSelectedKeys]);

  // Sync selection when modal opens
  useEffect(() => {
    if (isOpen) {
      setSearchTerm('');
      // Use saved preference if available, else defaultKeys
      const saved = localStorage.getItem(`export_columns_${fileName}`);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setSelectedKeys(parsed);
            return;
          }
        } catch (e) {
          // ignore
        }
      }
      setSelectedKeys(defaultKeys);
    }
  }, [isOpen, defaultKeys, fileName]);

  // Filter columns based on search
  const filteredColumns = useMemo(() => {
    if (!searchTerm.trim()) return columns;
    const lower = searchTerm.toLowerCase();
    return columns.filter(col => 
      (col.label && col.label.toLowerCase().includes(lower)) ||
      (col.key && col.key.toLowerCase().includes(lower))
    );
  }, [columns, searchTerm]);

  if (!isOpen) return null;

  const handleToggle = (key) => {
    setSelectedKeys(prev => {
      const next = prev.includes(key)
        ? prev.filter(k => k !== key)
        : [...prev, key];
      return next;
    });
  };

  const handleSelectAll = () => {
    setSelectedKeys(columns.map(c => c.key));
  };

  const handleSelectMandatory = () => {
    const mandatoryKeys = columns
      .filter(c => isColumnMandatory(c))
      .map(c => c.key);
    setSelectedKeys(mandatoryKeys.length > 0 ? mandatoryKeys : defaultKeys);
  };

  const handleDeselectAll = () => {
    setSelectedKeys([]);
  };

  const handleResetToDefault = () => {
    setSelectedKeys(defaultKeys);
  };

  // Helper to format values for Excel export
  const formatCellValue = (val, key) => {
    if (val === null || val === undefined || val === '') return '';
    
    // Check if boolean
    if (typeof val === 'boolean') {
      return val ? 'Yes' : 'No';
    }

    // Check if date column or date value
    const isDateField = /date/i.test(key) || /at$/i.test(key) || key.includes('DOB');
    if (isDateField && (typeof val === 'string' || val instanceof Date)) {
      const parsedDate = new Date(val);
      if (!isNaN(parsedDate.getTime())) {
        return parsedDate.toLocaleDateString('en-GB'); // DD/MM/YYYY
      }
    }

    // Arrays / Objects
    if (Array.isArray(val)) {
      return val.join(', ');
    }
    if (typeof val === 'object') {
      try {
        return JSON.stringify(val);
      } catch {
        return String(val);
      }
    }

    return val;
  };

  const handleDownloadExcel = async () => {
    if (selectedKeys.length === 0) {
      alert('Please select at least one column to export.');
      return;
    }

    setIsExporting(true);
    try {
      // Save column preference
      localStorage.setItem(`export_columns_${fileName}`, JSON.stringify(selectedKeys));

      // Get ordered list of selected column definitions
      const activeColumns = columns.filter(col => selectedKeys.includes(col.key));

      // Create workbook and worksheet using ExcelJS
      const workbook = new ExcelJS.Workbook();
      workbook.creator = 'Cogentes TMS';
      workbook.created = new Date();

      const worksheet = workbook.addWorksheet(sheetName);

      // Define worksheet columns
      worksheet.columns = activeColumns.map(col => {
        const headerText = typeof col.label === 'string' ? col.label : col.key;
        return {
          header: headerText,
          key: col.key,
          width: Math.max(headerText.length + 5, 15)
        };
      });

      // Style header row with distinct color per cell (Mandatory = Orange/Amber, Optional = Purple)
      const headerRow = worksheet.getRow(1);
      headerRow.height = 30;
      headerRow.alignment = { vertical: 'middle', horizontal: 'center' };

      activeColumns.forEach((col, idx) => {
        const cell = headerRow.getCell(idx + 1);
        const mandatory = isColumnMandatory(col);

        cell.font = { 
          bold: true, 
          color: { argb: 'FFFFFFFF' }, 
          size: 11,
          name: 'Calibri'
        };

        if (mandatory) {
          // Orange / Amber highlight for mandatory import columns
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFEA580C' } // Vibrant Amber-Orange
          };
          cell.note = 'Required for importing Excel into TMS';
        } else {
          // Purple / Indigo for optional columns
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FF5B45FF' } // Royal Purple
          };
        }

        cell.border = {
          top: { style: 'medium', color: { argb: 'FFFFFFFF' } },
          bottom: { style: 'medium', color: { argb: 'FFFFFFFF' } },
          left: { style: 'thin', color: { argb: 'FFFFFFFF' } },
          right: { style: 'thin', color: { argb: 'FFFFFFFF' } }
        };
      });

      // Add data rows
      data.forEach((item, index) => {
        const rowData = {};
        activeColumns.forEach(col => {
          if (col.isSerialNumber || col.key === '__serial_number__' || col.key === 'SerialNumber') {
            rowData[col.key] = index + 1;
          } else {
            const rawVal = item[col.key];
            rowData[col.key] = formatCellValue(rawVal, col.key);
          }
        });

        const row = worksheet.addRow(rowData);
        row.height = 22;
        row.alignment = { vertical: 'middle', horizontal: 'left' };
      });

      // Apply borders to all cells
      worksheet.eachRow((row, rowNumber) => {
        row.eachCell((cell) => {
          if (rowNumber > 1) {
            cell.border = {
              top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
              left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
              bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
              right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
            };
            cell.font = { size: 10, name: 'Calibri' };
          }
        });
      });

      // Auto-fit column widths with bounds
      worksheet.columns.forEach(column => {
        let maxLen = column.header ? String(column.header).length : 12;
        column.eachCell({ includeEmpty: false }, (cell, rowNumber) => {
          if (rowNumber > 1) {
            const cellVal = cell.value ? String(cell.value) : '';
            if (cellVal.length > maxLen) {
              maxLen = Math.min(cellVal.length, 50); // cap max column width at 50
            }
          }
        });
        column.width = Math.max(maxLen + 4, 14);
      });

      // Write to buffer and trigger download
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${fileName}_${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      // Show success toast
      const successToast = document.createElement('div');
      successToast.style.cssText = `
        position: fixed; top: 20px; right: 20px; z-index: 99999;
        background: #10b981; color: white; padding: 14px 22px;
        border-radius: 8px; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.2);
        font-family: system-ui, sans-serif; font-size: 14px; font-weight: 500;
        animation: modalSlideUp 0.3s ease;
      `;
      successToast.innerHTML = `✅ <strong>Export Complete!</strong><br><small>Downloaded ${data.length} records with ${activeColumns.length} columns.</small>`;
      document.body.appendChild(successToast);
      setTimeout(() => {
        if (document.body.contains(successToast)) {
          document.body.removeChild(successToast);
        }
      }, 4000);

      onClose();
    } catch (error) {
      console.error('❌ Excel Export Error:', error);
      alert('Failed to export Excel file. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="export-modal-overlay" onClick={onClose}>
      <div className="export-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="export-modal-header">
          <h3>🔧 {title}</h3>
          <button className="export-modal-close-btn" onClick={onClose} title="Close">
            ✕
          </button>
        </div>

        {/* Action Buttons */}
        <div className="export-modal-actions">
          <button onClick={handleSelectAll} className="export-action-btn select-all">
            ✅ Select All
          </button>
          <button onClick={handleSelectMandatory} className="export-action-btn select-mandatory">
            ⭐ Select Import Mandatory
          </button>
          <button onClick={handleDeselectAll} className="export-action-btn deselect-all">
            ❌ Deselect All
          </button>
          <button onClick={handleResetToDefault} className="export-action-btn reset">
            🔄 Reset to Default
          </button>
        </div>

        {/* Legend Bar */}
        <div className="export-legend-bar">
          <span className="export-legend-title">Header Colors:</span>
          <span className="export-legend-item">
            <span className="export-legend-dot orange"></span> Mandatory for Import
          </span>
          <span className="export-legend-item">
            <span className="export-legend-dot purple"></span> Optional / Details
          </span>
        </div>

        {/* Search Box */}
        <div className="export-search-container">
          <input
            type="text"
            className="export-search-input"
            placeholder="🔍 Search columns..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Column List */}
        <div className="export-column-list-container">
          <div className="export-column-list-header">
            <span>📊 Available Columns ({columns.length})</span>
            <span>👁️ Selected: {selectedKeys.length}</span>
          </div>

          {filteredColumns.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '20px', color: '#94a3b8' }}>
              No matching columns found
            </div>
          ) : (
            filteredColumns.map(col => {
              const isChecked = selectedKeys.includes(col.key);
              const mandatory = isColumnMandatory(col);

              return (
                <div key={col.key} className={`export-column-item ${mandatory ? 'is-mandatory' : ''}`}>
                  <label className="export-column-checkbox-label">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => handleToggle(col.key)}
                    />
                    <span className="export-column-text">
                      <span>{col.label}</span>
                      {col.isSerialNumber && (
                        <span className="export-always-visible-badge">Always Visible</span>
                      )}
                      {mandatory && (
                        <span className="export-mandatory-badge">⭐ Required for Import</span>
                      )}
                      <span className="export-column-key-hint">({col.key})</span>
                    </span>
                  </label>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="export-modal-footer">
          <button className="export-footer-cancel-btn" onClick={onClose} disabled={isExporting}>
            Cancel
          </button>
          <button
            className="export-footer-download-btn"
            onClick={handleDownloadExcel}
            disabled={isExporting || selectedKeys.length === 0}
          >
            {isExporting ? '⏳ Generating Excel...' : `📊 Download Excel (${selectedKeys.length})`}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ExportColumnModal;
