import { useState, useMemo, useEffect, useRef } from 'react';
import './DataTable.css';
import * as XLSX from 'xlsx';

const DataTable = ({
  title = "Data Table",
  data = [],
  columns = [],
  onEdit,
  onDelete,
  onBulkDelete, // New prop for bulk delete functionality
  searchable = true,
  isLoading = false,
  emptyMessage = "No data available",
  keyField = "id",
  showPagination = true,
  defaultRowsPerPage = 5,
  exportable = true,
  exportFilename = "data_export",
  exportEntity = null, // For backend export API
  customizable = true, // Enable column customization
  bulkSelectable = false // Enable bulk selection functionality
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(defaultRowsPerPage);
  const [showColumnCustomizer, setShowColumnCustomizer] = useState(false);
  const tableRef = useRef(null);
  const tableWrapperRef = useRef(null);
  const [scrollState, setScrollState] = useState({ left: false, right: false });
  const [tableWidth, setTableWidth] = useState('100%');

  // Bulk selection state
  const [selectedRows, setSelectedRows] = useState(new Set());
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);

  // Generate all available columns from data
  const allAvailableColumns = useMemo(() => {
    // Always start with Serial Number column
    const serialNumberColumn = {
      key: '__serial_number__',
      label: 'S.No',
      sortable: false,
      width: '60px',
      isSerialNumber: true
    };

    if (!data || data.length === 0) {
      return [serialNumberColumn, ...columns];
    }

    const sampleRow = data[0];
    const availableFields = Object.keys(sampleRow).map(key => {
      // Check if column already exists in provided columns
      const existingColumn = columns.find(col => col.key === key);
      if (existingColumn) return existingColumn;

      // Generate friendly name for new fields
      const friendlyName = key
        .replace(/([A-Z])/g, ' $1') // Add space before capital letters
        .replace(/^./, str => str.toUpperCase()) // Capitalize first letter
        .replace(/ID/g, 'ID') // Keep ID uppercase
        .trim();

      return {
        key: key,
        label: friendlyName,
        sortable: true
      };
    });

    return [serialNumberColumn, ...availableFields];
  }, [data, columns]);

  // Manage visible columns
  const [visibleColumns, setVisibleColumns] = useState(() => {
    const savedColumns = localStorage.getItem(`${exportEntity || title}_visible_columns`);
    const defaultColumns = ['__serial_number__', ...columns.map(col => col.key)];

    if (savedColumns) {
      try {
        const parsed = JSON.parse(savedColumns);
        // Always ensure serial number is included
        const columnsWithSerial = parsed.includes('__serial_number__')
          ? parsed
          : ['__serial_number__', ...parsed.filter(col => col !== '__serial_number__')];
        return columnsWithSerial.length > 0 ? columnsWithSerial : defaultColumns;
      } catch (e) {
        return defaultColumns;
      }
    }
    return defaultColumns;
  });

  // Get currently displayed columns
  const displayedColumns = useMemo(() => {
    return allAvailableColumns.filter(col => visibleColumns.includes(col.key));
  }, [allAvailableColumns, visibleColumns]);

  // Save column preferences
  const saveColumnPreferences = (newVisibleColumns) => {
    setVisibleColumns(newVisibleColumns);
    localStorage.setItem(`${exportEntity || title}_visible_columns`, JSON.stringify(newVisibleColumns));
  };

  // Calculate dynamic table width based on visible columns
  const calculateTableWidth = useMemo(() => {
    const baseColumnWidth = 150; // Base width per column
    const serialNumberWidth = 60; // Fixed width for serial number
    const actionsWidth = (onEdit || onDelete) ? 120 : 0; // Actions column width

    const visibleColumnCount = displayedColumns.length - 1; // Exclude serial number from count
    const calculatedWidth = serialNumberWidth + (visibleColumnCount * baseColumnWidth) + actionsWidth;

    // Ensure minimum width and maximum width
    const minWidth = 600;
    const maxWidth = window.innerWidth - 100; // Leave some margin

    return Math.min(Math.max(calculatedWidth, minWidth), maxWidth);
  }, [displayedColumns, onEdit, onDelete]);

  // Update table width when columns change
  useEffect(() => {
    setTableWidth(`${calculateTableWidth}px`);
  }, [calculateTableWidth]);

  // Scroll detection for shadow indicators
  const handleScroll = (e) => {
    const { scrollLeft, scrollWidth, clientWidth } = e.target;
    setScrollState({
      left: scrollLeft > 0,
      right: scrollLeft < scrollWidth - clientWidth - 1
    });
  };

  // Add scroll event listener
  useEffect(() => {
    const wrapper = tableWrapperRef.current;
    if (wrapper) {
      wrapper.addEventListener('scroll', handleScroll);
      // Initial scroll state check
      handleScroll({ target: wrapper });

      return () => {
        wrapper.removeEventListener('scroll', handleScroll);
      };
    }
  }, [displayedColumns]);

  // Bulk selection handlers
  const handleSelectAll = (checked) => {
    if (checked) {
      const allRowIds = new Set(paginatedData.map(row => row[keyField]));
      setSelectedRows(allRowIds);
    } else {
      setSelectedRows(new Set());
    }
  };

  const handleRowSelect = (rowId, checked) => {
    const newSelectedRows = new Set(selectedRows);
    if (checked) {
      newSelectedRows.add(rowId);
    } else {
      newSelectedRows.delete(rowId);
    }
    setSelectedRows(newSelectedRows);
  };

  const handleBulkDelete = async () => {
    if (selectedRows.size === 0) return;

    try {
      const idsToDelete = Array.from(selectedRows);
      await onBulkDelete(idsToDelete);
      setSelectedRows(new Set());
      setShowBulkDeleteConfirm(false);
    } catch (error) {
      console.error('Bulk delete failed:', error);
    }
  };

  // Clear selection when data changes
  useEffect(() => {
    setSelectedRows(new Set());
  }, [data]);

  // Filter data based on search term
  const filteredData = useMemo(() => {
    if (!searchTerm) return data;

    return data.filter(item =>
      displayedColumns.some(column => {
        const value = item[column.key];
        return value && value.toString().toLowerCase().includes(searchTerm.toLowerCase());
      })
    );
  }, [data, searchTerm, displayedColumns]);

  // Sort data
  const sortedData = useMemo(() => {
    if (!sortConfig.key) return filteredData;

    return [...filteredData].sort((a, b) => {
      const aValue = a[sortConfig.key];
      const bValue = b[sortConfig.key];

      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredData, sortConfig]);

  // Paginate data
  const paginatedData = useMemo(() => {
    if (!showPagination) return sortedData;

    const startIndex = (currentPage - 1) * rowsPerPage;
    const endIndex = startIndex + rowsPerPage;
    return sortedData.slice(startIndex, endIndex);
  }, [sortedData, currentPage, rowsPerPage, showPagination]);

  const totalPages = Math.ceil(sortedData.length / rowsPerPage);

  const handleSort = (key) => {
    setSortConfig(prevConfig => ({
      key,
      direction: prevConfig.key === key && prevConfig.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  const handleRowsPerPageChange = (newRowsPerPage) => {
    setRowsPerPage(newRowsPerPage);
    setCurrentPage(1); // Reset to first page
  };

  // Export functions
  const exportToExcel = async (exportAll = false) => {
    try {
      // PRIORITY 1: Always use backend export if exportEntity is provided
      if (exportEntity) {
        const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';
        const exportUrl = `${API_BASE_URL}/api/export/${exportEntity}`;

        // Show loading indicator
        const loadingAlert = document.createElement('div');
        loadingAlert.style.cssText = `
          position: fixed; top: 20px; right: 20px; z-index: 10000;
          background: #007bff; color: white; padding: 15px 20px;
          border-radius: 5px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);
          font-family: Arial, sans-serif; font-size: 14px;
        `;
        loadingAlert.textContent = `🔄 Exporting ${exportEntity}... Please wait`;
        document.body.appendChild(loadingAlert);

        try {
          const response = await fetch(exportUrl, {
            method: 'GET',
            headers: {
              'Accept': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            },
          });

          // Remove loading indicator
          document.body.removeChild(loadingAlert);

          if (response.ok) {
            const blob = await response.blob();

            // Verify we got an Excel file
            if (blob.size === 0) {
              throw new Error('Empty response from server');
            }

            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;

            const contentDisposition = response.headers.get('Content-Disposition');
            const filename = contentDisposition
              ? contentDisposition.split('filename="')[1].split('"')[0]
              : `${exportFilename}_${new Date().toISOString().slice(0, 10)}.xlsx`;

            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);


            // Show success message
            const successAlert = document.createElement('div');
            successAlert.style.cssText = `
              position: fixed; top: 20px; right: 20px; z-index: 10000;
              background: #28a745; color: white; padding: 15px 20px;
              border-radius: 5px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);
              font-family: Arial, sans-serif; font-size: 14px;
            `;
            successAlert.innerHTML = `✅ Export completed!<br>Downloaded: ${filename}<br><small>Includes ALL ${exportEntity} master fields</small>`;
            document.body.appendChild(successAlert);
            setTimeout(() => document.body.removeChild(successAlert), 5000);

            return;
          } else {
            console.error(`❌ Backend export failed with status: ${response.status} - ${response.statusText}`);
            const errorText = await response.text();
            console.error(`Error details:`, errorText);

            // Show error message
            const errorAlert = document.createElement('div');
            errorAlert.style.cssText = `
              position: fixed; top: 20px; right: 20px; z-index: 10000;
              background: #dc3545; color: white; padding: 15px 20px;
              border-radius: 5px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);
              font-family: Arial, sans-serif; font-size: 14px;
            `;
            errorAlert.innerHTML = `❌ Backend export failed<br><small>Status: ${response.status}</small><br><small>Using visible columns only</small>`;
            document.body.appendChild(errorAlert);
            setTimeout(() => document.body.removeChild(errorAlert), 5000);
          }
        } catch (fetchError) {
          // Remove loading indicator if still present
          if (document.body.contains(loadingAlert)) {
            document.body.removeChild(loadingAlert);
          }

          console.error('❌ Network error during backend export:', fetchError);

          // Show network error message
          const networkErrorAlert = document.createElement('div');
          networkErrorAlert.style.cssText = `
            position: fixed; top: 20px; right: 20px; z-index: 10000;
            background: #dc3545; color: white; padding: 15px 20px;
            border-radius: 5px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            font-family: Arial, sans-serif; font-size: 14px;
          `;
          networkErrorAlert.innerHTML = `❌ Network error<br><small>${fetchError.message}</small><br><small>Using visible columns only</small>`;
          document.body.appendChild(networkErrorAlert);
          setTimeout(() => document.body.removeChild(networkErrorAlert), 5000);
        }

        console.warn('⚠️ Backend export failed, falling back to client-side export');
      }
      
      // PRIORITY 2: Client-side export fallback
      let dataToExport = exportAll ? data : paginatedData;

      if (!exportEntity) {
      } else {

        // Show warning about incomplete export
        const warningAlert = document.createElement('div');
        warningAlert.style.cssText = `
          position: fixed; top: 20px; right: 20px; z-index: 10000;
          background: #ffc107; color: #212529; padding: 15px 20px;
          border-radius: 5px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);
          font-family: Arial, sans-serif; font-size: 14px; max-width: 300px;
        `;
        warningAlert.innerHTML = `⚠️ Incomplete Export Warning<br><small>Only ${displayedColumns.length} visible columns will be exported.<br>Backend export failed - check network connection.</small>`;
        document.body.appendChild(warningAlert);
        setTimeout(() => {
          if (document.body.contains(warningAlert)) {
            document.body.removeChild(warningAlert);
          }
        }, 8000);
      }
      
      // Client-side export fallback
      if (dataToExport.length === 0) {
        alert('No data to export');
        return;
      }

      // Prepare data for export
      const exportData = dataToExport.map(item => {
        const exportRow = {};
        displayedColumns.forEach(column => {
          let value = item[column.key];

          // Handle special render functions by extracting raw value
          if (column.render && typeof column.render === 'function') {
            // For rendered content, try to get the original value
            value = item[column.key];
          }

          // Clean up the value
          if (value === null || value === undefined) {
            value = '';
          } else if (typeof value === 'object') {
            value = JSON.stringify(value);
          }

          exportRow[column.label] = value;
        });
        return exportRow;
      });

      // Create workbook and worksheet
      const workbook = XLSX.utils.book_new();
      const worksheet = XLSX.utils.json_to_sheet(exportData);

      // Auto-size columns
      const columnWidths = displayedColumns.map(col => ({
        wch: Math.max(col.label.length, 15)
      }));
      worksheet['!cols'] = columnWidths;
      
      // Add worksheet to workbook
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Data');
      
      // Generate filename with timestamp
      const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
      const filename = `${exportFilename}_${timestamp}.xlsx`;
      
      // Save file
      XLSX.writeFile(workbook, filename);
      
    } catch (error) {
      console.error('Export error:', error);
      alert('Failed to export data. Please try again.');
    }
  };

  // Force backend export function
  const forceBackendExport = async () => {
    if (!exportEntity) {
      alert('Backend export not available for this table');
      return;
    }

    const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';
    const exportUrl = `${API_BASE_URL}/api/export/${exportEntity}`;

    try {
      // Create a temporary link and trigger download
      const link = document.createElement('a');
      link.href = exportUrl;
      link.download = `${exportFilename}_complete_${new Date().toISOString().slice(0, 10)}.xlsx`;
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Show success message
      const successAlert = document.createElement('div');
      successAlert.style.cssText = `
        position: fixed; top: 20px; right: 20px; z-index: 10000;
        background: #28a745; color: white; padding: 15px 20px;
        border-radius: 5px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        font-family: Arial, sans-serif; font-size: 14px;
      `;
      successAlert.innerHTML = `✅ Complete Export Started!<br><small>Downloading ALL ${exportEntity} master fields</small>`;
      document.body.appendChild(successAlert);
      setTimeout(() => {
        if (document.body.contains(successAlert)) {
          document.body.removeChild(successAlert);
        }
      }, 5000);

    } catch (error) {
      console.error('❌ Force backend export failed:', error);
      alert(`❌ Force backend export failed: ${error.message}`);
    }
  };

  // Column Customizer Component
  const renderColumnCustomizer = () => {
    if (!customizable || !showColumnCustomizer) return null;

    const handleColumnToggle = (columnKey) => {
      // Prevent hiding the serial number column
      if (columnKey === '__serial_number__') return;

      const newVisibleColumns = visibleColumns.includes(columnKey)
        ? visibleColumns.filter(key => key !== columnKey)
        : [...visibleColumns, columnKey];
      saveColumnPreferences(newVisibleColumns);
    };

    const handleSelectAll = () => {
      saveColumnPreferences(allAvailableColumns.map(col => col.key));
    };

    const handleDeselectAll = () => {
      // Always keep the serial number column visible
      saveColumnPreferences(['__serial_number__']);
    };

    const handleResetToDefault = () => {
      saveColumnPreferences(['__serial_number__', ...columns.map(col => col.key)]);
    };

    return (
      <div className="column-customizer-overlay" onClick={() => setShowColumnCustomizer(false)}>
        <div className="column-customizer" onClick={(e) => e.stopPropagation()}>
          <div className="column-customizer-header">
            <h3>🔧 Customize Columns</h3>
            <button
              className="close-btn"
              onClick={() => setShowColumnCustomizer(false)}
            >
              ✕
            </button>
          </div>

          <div className="column-customizer-actions">
            <button onClick={handleSelectAll} className="action-btn select-all">
              ✅ Select All
            </button>
            <button onClick={handleDeselectAll} className="action-btn deselect-all">
              ❌ Deselect All
            </button>
            <button onClick={handleResetToDefault} className="action-btn reset">
              🔄 Reset to Default
            </button>
          </div>

          <div className="column-list">
            <div className="column-list-header">
              <span>📊 Available Columns ({allAvailableColumns.length})</span>
              <span>👁️ Visible: {visibleColumns.length}</span>
            </div>

            {allAvailableColumns.map(column => (
              <div key={column.key} className={`column-item ${column.isSerialNumber ? 'always-visible' : ''}`}>
                <label className="column-checkbox">
                  <input
                    type="checkbox"
                    checked={visibleColumns.includes(column.key)}
                    onChange={() => handleColumnToggle(column.key)}
                    disabled={column.isSerialNumber}
                  />
                  <span className="checkmark"></span>
                  <span className="column-label">
                    {column.label}
                    {column.isSerialNumber && <span className="always-visible-badge">Always Visible</span>}
                    <span className="column-key">({column.key})</span>
                  </span>
                </label>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const renderPagination = () => {
    if (!showPagination || totalPages <= 1) return null;

    const pageNumbers = [];
    const maxVisiblePages = 5;

    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      pageNumbers.push(i);
    }

    return (
      <div className="pagination-container">
        <div className="pagination-info">
          Showing {((currentPage - 1) * rowsPerPage) + 1} to {Math.min(currentPage * rowsPerPage, sortedData.length)} of {sortedData.length} entries
        </div>

        <div className="pagination-controls">
          <div className="rows-per-page">
            <label>
              Rows per page:
              <select
                value={rowsPerPage}
                onChange={(e) => handleRowsPerPageChange(Number(e.target.value))}
                className="rows-select"
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </label>
          </div>

          <div className="pagination-buttons">
            <button
              onClick={() => handlePageChange(1)}
              disabled={currentPage === 1}
              className="pagination-btn"
              title="First page"
            >
              ⏮️
            </button>

            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="pagination-btn"
              title="Previous page"
            >
              ⏪
            </button>

            {pageNumbers.map(number => (
              <button
                key={number}
                onClick={() => handlePageChange(number)}
                className={`pagination-btn ${currentPage === number ? 'active' : ''}`}
              >
                {number}
              </button>
            ))}

            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="pagination-btn"
              title="Next page"
            >
              ⏩
            </button>

            <button
              onClick={() => handlePageChange(totalPages)}
              disabled={currentPage === totalPages}
              className="pagination-btn"
              title="Last page"
            >
              ⏭️
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="data-table-container">
      <div className="data-table-header">
        <h2 className="data-table-title">{title}</h2>
        <div className="data-table-controls">
          {bulkSelectable && selectedRows.size > 0 && (
            <div className="bulk-actions">
              <button
                className="bulk-delete-btn"
                onClick={() => setShowBulkDeleteConfirm(true)}
                title={`Delete ${selectedRows.size} selected item(s)`}
              >
                🗑️ Delete Selected ({selectedRows.size})
              </button>
            </div>
          )}
          {searchable && (
            <div className="search-container">
              <input
                type="text"
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="search-input"
              />
            </div>
          )}
          {customizable && (
            <div className="column-controls">
              <button
                className="customize-btn"
                onClick={() => setShowColumnCustomizer(true)}
                title="Customize columns"
              >
                🔧 Columns ({visibleColumns.length}/{allAvailableColumns.length})
              </button>
            </div>
          )}
          {exportable && data.length > 0 && (
            <div className="export-container">
              <div className="export-dropdown">
                <button
                  className="export-btn"
                  onClick={() => exportToExcel(false)}
                  title="Export current page"
                >
                  📊 Export Page
                </button>
                <button
                  className="export-btn export-all"
                  onClick={() => exportToExcel(true)}
                  title="Export all data"
                >
                  📈 Export All
                </button>
                {exportEntity && (
                  <button
                    className="export-btn complete-export"
                    onClick={forceBackendExport}
                    title="Force complete export with ALL master form fields"
                    style={{
                      background: 'linear-gradient(135deg, #28a745, #20c997)',
                      border: 'none',
                      color: 'white',
                      fontWeight: 'bold',
                      marginLeft: '5px'
                    }}
                  >
                    🚀 Complete Export
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading...</p>
        </div>
      ) : (
        <>
          {sortedData.length === 0 ? (
            <div className="empty-state">
              <p>{emptyMessage}</p>
            </div>
          ) : (
            <>
              <div className="table-wrapper" style={{ width: tableWidth }}>
                <table className="data-table" ref={tableRef}>
                  <thead>
                    <tr>
                      {bulkSelectable && (
                        <th className="bulk-select-header">
                          <input
                            type="checkbox"
                            checked={selectedRows.size > 0 && selectedRows.size === paginatedData.length}
                            onChange={(e) => handleSelectAll(e.target.checked)}
                            title="Select all rows"
                          />
                        </th>
                      )}
                      {displayedColumns.map(column => (
                        <th
                          key={column.key}
                          onClick={() => column.sortable && handleSort(column.key)}
                          className={column.sortable ? 'sortable' : ''}
                          style={{ minWidth: column.minWidth }}
                        >
                          {column.label}
                          {sortConfig.key === column.key && (
                            <span className="sort-indicator">
                              {sortConfig.direction === 'asc' ? ' ↑' : ' ↓'}
                            </span>
                          )}
                        </th>
                      ))}
                      {(onEdit || onDelete || bulkSelectable) && <th className="actions-header">Actions</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedData.map((item, index) => (
                      <tr key={item[keyField] || index}>
                        {bulkSelectable && (
                          <td className="bulk-select-cell">
                            <input
                              type="checkbox"
                              checked={selectedRows.has(item[keyField])}
                              onChange={(e) => handleRowSelect(item[keyField], e.target.checked)}
                            />
                          </td>
                        )}
                        {displayedColumns.map(column => (
                          <td key={column.key} className={column.className}>
                            {column.isSerialNumber
                              ? (currentPage - 1) * rowsPerPage + index + 1
                              : column.render
                                ? column.render(item[column.key], item)
                                : (item[column.key] || '-')
                            }
                          </td>
                        ))}
                      {(onEdit || onDelete || bulkSelectable) && (
                        <td className="actions-cell">
                          {onEdit && (
                            <button
                              onClick={() => onEdit(item)}
                              className="action-btn edit-btn"
                              title="Edit"
                            >
                              ✏️
                            </button>
                          )}
                          {onDelete && (
                            <button
                              onClick={() => onDelete(item)}
                              className="action-btn delete-btn"
                              title="Delete"
                            >
                              🗑️
                            </button>
                          )}
                        </td>
                      )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {renderPagination()}
            </>
          )}
        </>
      )}

      {/* Column Customizer Modal */}
      {renderColumnCustomizer()}

      {/* Bulk Delete Confirmation Dialog */}
      {showBulkDeleteConfirm && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>Confirm Bulk Delete</h3>
            <p>
              Are you sure you want to delete <strong>{selectedRows.size}</strong> selected item(s)?
              This action cannot be undone.
            </p>
            <div className="modal-actions">
              <button
                className="cancel-btn"
                onClick={() => setShowBulkDeleteConfirm(false)}
              >
                Cancel
              </button>
              <button
                className="delete-btn"
                onClick={handleBulkDelete}
              >
                Delete {selectedRows.size} Item(s)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DataTable;