import React, { useCallback } from 'react';
import { useDailyVehicleTransactionForm } from '../hooks/useDailyVehicleTransactionForm';
import { useDailyVehicleTransactionValidation } from '../hooks/useDailyVehicleTransactionValidation';
import MasterDataSection from '../components/dailyVehicleTransaction/sections/MasterDataSection';
import DriverDetailsSection from '../components/dailyVehicleTransaction/sections/DriverDetailsSection';
import AdhocReplacementSection from '../components/dailyVehicleTransaction/sections/AdhocReplacementSection';
import CalculationsSection from '../components/dailyVehicleTransaction/sections/CalculationsSection';
import SupervisorSection from '../components/dailyVehicleTransaction/sections/SupervisorSection';
import DataTable from '../components/DataTable';
import { vehicleTransactionAPI, apiHelpers } from '../services/api';
import './DailyVehicleTransactionForm.css';

const DailyVehicleTransactionFormRefactored = () => {
  const {
    // State
    masterData, setMasterData, selectedDrivers, setSelectedDrivers, transactionData, setTransactionData,
    calculatedData, setCalculatedData, supervisorData, setSupervisorData, files, setFiles,
    transactions, setTransactions, errors, setErrors, isSubmitting, setIsSubmitting,
    isLoading, setIsLoading, dateFilter, setDateFilter, editingTransaction, setEditingTransaction,
    customers, setCustomers, projects, setProjects, vehicles, setVehicles, drivers, setDrivers,
    vendors, setVendors, isProjectDropdownVisible, setIsProjectDropdownVisible,
    availableProjects, setAvailableProjects, ids, setIds,
    
    // Functions
    loadDropdownOptions, fetchTransactions, resetForm, getCurrentDate, formatDateForInput,
    convertTo12Hour, convertTo24Hour, generateAdvanceRequestNo
  } = useDailyVehicleTransactionForm();

  const {
    validateForm, validateBeforeSubmit, handleTripNumberChange, handleReplacementDriverNoChange,
    handleVendorNumberChange, handleDriverNumberChange, handleAadharNumberChange
  } = useDailyVehicleTransactionValidation();

  // Handler functions
  const handleMasterDataChange = useCallback(async (e) => {
    const { name, value } = e.target;
    setMasterData(prev => ({ ...prev, [name]: value }));

    // Auto-populate logic for different fields
    if (name === 'Customer' && (masterData.TypeOfTransaction === 'Adhoc' || masterData.TypeOfTransaction === 'Replacement')) {
      const selectedCustomer = customers.find(c => c.CustomerID === parseInt(value));
      if (selectedCustomer) {
        setMasterData(prev => ({
          ...prev,
          Customer: value,
          CompanyName: selectedCustomer.Name || selectedCustomer.MasterCustomerName || '',
          GSTNo: selectedCustomer.GSTNo || ''
        }));
        setIds(prev => ({ ...prev, CustomerID: value }));

        // Fetch projects for this customer
        try {
          const projectsForCustomer = projects.filter(p => p.CustomerID === parseInt(value));
          setAvailableProjects(projectsForCustomer);
          setIsProjectDropdownVisible(true);
        } catch (error) {
          // Silent fail
        }
      }
    }

    if (name === 'Project') {
      const selectedProject = availableProjects.find(p => p.ProjectID === parseInt(value));
      if (selectedProject) {
        setMasterData(prev => ({ ...prev, Project: value, CustSite: selectedProject.ProjectLocation || '' }));
        setIds(prev => ({ ...prev, ProjectID: value }));
      }
    }

    if (name === 'VendorName') {
      const selectedVendor = vendors.find(v => v.VendorID === parseInt(value));
      if (selectedVendor) {
        setMasterData(prev => ({
          ...prev,
          VendorName: selectedVendor.VendorName || '',
          VendorCode: selectedVendor.VendorCode || '',
          CompanyName: selectedVendor.CompanyName || selectedVendor.CustomerName || ''
        }));
        setIds(prev => ({ ...prev, VendorID: value }));

        // Auto-populate customer and project based on vendor
        if (selectedVendor.CustomerID) {
          const relatedCustomer = customers.find(c => c.CustomerID === selectedVendor.CustomerID);
          if (relatedCustomer) {
            setMasterData(prev => ({
              ...prev,
              Customer: selectedVendor.CustomerID.toString(),
              CompanyName: relatedCustomer.Name || relatedCustomer.MasterCustomerName || '',
              GSTNo: relatedCustomer.GSTNo || ''
            }));
            setIds(prev => ({ ...prev, CustomerID: selectedVendor.CustomerID.toString() }));

            // Filter and set projects for this customer
            const projectsForCustomer = projects.filter(p => p.CustomerID === selectedVendor.CustomerID);
            setAvailableProjects(projectsForCustomer);
            setIsProjectDropdownVisible(true);

            if (selectedVendor.ProjectID) {
              const relatedProject = projectsForCustomer.find(p => p.ProjectID === selectedVendor.ProjectID);
              if (relatedProject) {
                setMasterData(prev => ({
                  ...prev,
                  Project: selectedVendor.ProjectID.toString(),
                  CustSite: relatedProject.ProjectLocation || ''
                }));
                setIds(prev => ({ ...prev, ProjectID: selectedVendor.ProjectID.toString() }));
              }
            }
          }
        }
      }
    }
  }, [masterData.TypeOfTransaction, customers, projects, vendors, availableProjects]);

  const handleVehicleAutoPopulate = useCallback(async (e) => {
    const { value } = e.target;

    if (!value) {
      setMasterData(prev => ({ ...prev, VehicleNo: [], CompanyName: '', GSTNo: '', VendorName: '', VendorCode: '' }));
      setIds(prev => ({ ...prev, CustomerID: '', ProjectID: '', VendorID: '' }));
      return;
    }

    const vehicleIds = Array.isArray(value) ? value : [value];
    setMasterData(prev => ({ ...prev, VehicleNo: vehicleIds }));

    if (vehicleIds.length > 0) {
      const firstVehicleId = vehicleIds[0];
      const selectedVehicle = vehicles.find(v => v.VehicleID === parseInt(firstVehicleId));

      if (selectedVehicle) {
        // Auto-populate vendor information
        if (selectedVehicle.VendorID) {
          const relatedVendor = vendors.find(v => v.VendorID === selectedVehicle.VendorID);
          if (relatedVendor) {
            setMasterData(prev => ({
              ...prev,
              VendorName: relatedVendor.VendorName || '',
              VendorCode: relatedVendor.VendorCode || ''
            }));
            setIds(prev => ({ ...prev, VendorID: selectedVehicle.VendorID.toString() }));

            // Auto-populate customer and project based on vendor
            if (relatedVendor.CustomerID) {
              const relatedCustomer = customers.find(c => c.CustomerID === relatedVendor.CustomerID);
              if (relatedCustomer) {
                setMasterData(prev => ({
                  ...prev,
                  Customer: relatedVendor.CustomerID.toString(),
                  CompanyName: relatedCustomer.Name || relatedCustomer.MasterCustomerName || '',
                  GSTNo: relatedCustomer.GSTNo || ''
                }));
                setIds(prev => ({ ...prev, CustomerID: relatedVendor.CustomerID.toString() }));

                // Filter and set projects for this customer
                const projectsForCustomer = projects.filter(p => p.CustomerID === relatedVendor.CustomerID);
                setAvailableProjects(projectsForCustomer);
                setIsProjectDropdownVisible(true);

                if (relatedVendor.ProjectID) {
                  const relatedProject = projectsForCustomer.find(p => p.ProjectID === relatedVendor.ProjectID);
                  if (relatedProject) {
                    setMasterData(prev => ({
                      ...prev,
                      Project: relatedVendor.ProjectID.toString(),
                      CustSite: relatedProject.ProjectLocation || ''
                    }));
                    setIds(prev => ({ ...prev, ProjectID: relatedVendor.ProjectID.toString() }));
                  }
                }
              }
            }
          }
        }
      }
    }
  }, [vehicles, vendors, customers, projects]);

  const handleCompanySelect = useCallback(async (e) => {
    await handleMasterDataChange(e);
  }, [handleMasterDataChange]);

  const handleTransactionDataChange = useCallback((e) => {
    const { name, value, type, checked } = e.target;
    const finalValue = type === 'checkbox' ? checked : value;
    setTransactionData(prev => ({ ...prev, [name]: finalValue }));

    // Auto-populate driver mobile number when driver is selected
    if (name === 'DriverID' && value) {
      const selectedDriver = drivers.find(d => d.DriverID === parseInt(value));
      if (selectedDriver) {
        setTransactionData(prev => ({
          ...prev,
          DriverID: value,
          DriverMobileNo: selectedDriver.MobileNo || selectedDriver.DriverMobileNo || ''
        }));
      }
    }
  }, [drivers]);

  const handleCalculatedDataChange = useCallback((e) => {
    const { name, value } = e.target;
    setCalculatedData(prev => ({ ...prev, [name]: value }));
  }, []);

  const handleSupervisorDataChange = useCallback((e) => {
    const { name, value, type, checked } = e.target;
    const finalValue = type === 'checkbox' ? checked : value;
    setSupervisorData(prev => ({ ...prev, [name]: finalValue }));
  }, []);

  const handleFileChange = useCallback((name, file) => {
    setFiles(prev => ({ ...prev, [name]: file }));
  }, []);

  // Validation handlers
  const handleReplacementDriverNoChangeWrapper = useCallback((e) => {
    handleReplacementDriverNoChange(e, setTransactionData, setErrors);
  }, [handleReplacementDriverNoChange]);

  const handleVendorNumberChangeWrapper = useCallback((e) => {
    handleVendorNumberChange(e, setTransactionData, setErrors);
  }, [handleVendorNumberChange]);

  const handleDriverNumberChangeWrapper = useCallback((e) => {
    handleDriverNumberChange(e, setTransactionData, setErrors);
  }, [handleDriverNumberChange]);

  const handleAadharNumberChangeWrapper = useCallback((e) => {
    handleAadharNumberChange(e, setTransactionData, setErrors);
  }, [handleAadharNumberChange]);

  // Submit handler
  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();

    const formData = { masterData, transactionData, calculatedData, supervisorData, selectedDrivers };

    await validateBeforeSubmit(
      formData,
      async (validatedData) => {
        setIsSubmitting(true);
        try {
          // Prepare payload based on transaction type
          let payload = {
            ...validatedData.masterData,
            ...validatedData.transactionData,
            ...validatedData.calculatedData,
            CustomerID: ids.CustomerID,
            ProjectID: ids.ProjectID,
            VendorID: ids.VendorID
          };

          if (validatedData.masterData.TypeOfTransaction === 'Fixed') {
            payload = {
              ...payload,
              ...validatedData.supervisorData,
              VehicleIDs: JSON.stringify(validatedData.masterData.VehicleNo),
              DriverIDs: JSON.stringify(validatedData.selectedDrivers.map(d => d.DriverID))
            };
          }

          // Handle file uploads
          const hasFiles = Object.values(files).some(file => file !== null);
          let response;

          if (hasFiles) {
            const formData = new FormData();
            Object.keys(payload).forEach(key => formData.append(key, payload[key]));
            Object.keys(files).forEach(fieldName => {
              if (files[fieldName]) formData.append(fieldName, files[fieldName]);
            });

            response = editingTransaction
              ? await vehicleTransactionAPI.update(editingTransaction.TransactionID, formData)
              : await vehicleTransactionAPI.create(formData);
          } else {
            response = editingTransaction
              ? await vehicleTransactionAPI.update(editingTransaction.TransactionID, payload)
              : await vehicleTransactionAPI.create(payload);
          }

          apiHelpers.showSuccess(editingTransaction ? 'Transaction updated successfully!' : 'Transaction saved successfully!');
          resetForm();
          await fetchTransactions();
        } catch (error) {
          apiHelpers.showError(error, 'Failed to save transaction');
        } finally {
          setIsSubmitting(false);
        }
      },
      (validationResult) => {
        setErrors(validationResult.errors || {});
        apiHelpers.showError(new Error(validationResult.summary || 'Validation failed'), 'Please fix the errors and try again');
      }
    );
  }, [masterData, transactionData, calculatedData, supervisorData, selectedDrivers, files, ids, editingTransaction, validateBeforeSubmit, resetForm, fetchTransactions]);

  // Date filter handlers
  const handleDateFilterApply = useCallback(async () => {
    await fetchTransactions();
  }, [fetchTransactions]);

  const handleDateFilterClear = useCallback(async () => {
    setDateFilter({ fromDate: '', toDate: '' });
    await fetchTransactions();
  }, [fetchTransactions]);

  // New transaction handler
  const handleNewTransaction = useCallback(() => {
    resetForm();
  }, [resetForm]);

  // Export handler
  const handleExportAllTransactions = useCallback(async () => {
    try {
      const response = await vehicleTransactionAPI.exportToExcel();

      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `daily_vehicle_transactions_${new Date().toISOString().split('T')[0]}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      apiHelpers.showSuccess('Transactions exported successfully!');
    } catch (error) {
      apiHelpers.showError(error, 'Failed to export transactions');
    }
  }, []);

  // Edit handler
  const handleEdit = useCallback(async (row) => {
    try {
      setIsLoading(true);
      const response = await vehicleTransactionAPI.getById(row.TransactionID);
      const transactionData = response.data.data || response.data;
      setEditingTransaction(transactionData);

      // Populate form with transaction data
      setMasterData({
        Customer: transactionData.CustomerID?.toString() || '',
        CompanyName: transactionData.CompanyName || '',
        GSTNo: transactionData.GSTNo || '',
        Project: transactionData.ProjectID?.toString() || '',
        Location: transactionData.Location || '',
        CustSite: transactionData.CustSite || '',
        VehiclePlacementType: transactionData.VehiclePlacementType || '',
        VehicleType: transactionData.VehicleType || '',
        VehicleNo: transactionData.VehicleIDs ? JSON.parse(transactionData.VehicleIDs) : [],
        VendorName: transactionData.VendorID?.toString() || '',
        VendorCode: transactionData.VendorCode || '',
        TypeOfTransaction: transactionData.TypeOfTransaction || 'Fixed'
      });

      setTransactionData({
        ...transactionData,
        Date: formatDateForInput(transactionData.Date)
      });

      if (transactionData.DriverIDs) {
        const driverIds = JSON.parse(transactionData.DriverIDs);
        const selectedDriversData = drivers.filter(d => driverIds.includes(d.DriverID));
        setSelectedDrivers(selectedDriversData);
      }

      setIds({
        CustomerID: transactionData.CustomerID?.toString() || '',
        ProjectID: transactionData.ProjectID?.toString() || '',
        VendorID: transactionData.VendorID?.toString() || ''
      });
    } catch (error) {
      apiHelpers.showError(error, 'Failed to load transaction for editing');
    } finally {
      setIsLoading(false);
    }
  }, [drivers, formatDateForInput]);

  // Delete handler
  const handleDelete = useCallback(async (row) => {
    if (window.confirm('Are you sure you want to delete this transaction?')) {
      try {
        await vehicleTransactionAPI.delete(row.TransactionID);
        apiHelpers.showSuccess('Transaction deleted successfully!');
        await fetchTransactions();
      } catch (error) {
        apiHelpers.showError(error, 'Failed to delete transaction');
      }
    }
  }, [fetchTransactions]);

  // Transaction table columns
  const transactionColumns = [
    { key: 'TransactionID', label: 'ID', sortable: true },
    { key: 'Date', label: 'Date', sortable: true },
    { key: 'TypeOfTransaction', label: 'Type', sortable: true },
    { key: 'CompanyName', label: 'Company', sortable: true },
    { key: 'VehicleRegistrationNo', label: 'Vehicle', sortable: true },
    { key: 'DriverName', label: 'Driver', sortable: true },
    { key: 'TotalKM', label: 'Total KM', sortable: true },
    { key: 'TotalFreight', label: 'Total Freight', sortable: true }
  ];

  return (
    <div className="daily-vehicle-transaction-form">
      <h2>Daily Vehicle Transaction Form</h2>
      
      <form onSubmit={handleSubmit}>
        <div className="form-container">
          {/* Master Data Section */}
          <MasterDataSection
            masterData={masterData}
            customers={customers}
            projects={projects}
            vehicles={vehicles}
            vendors={vendors}
            availableProjects={availableProjects}
            errors={errors}
            onMasterDataChange={handleMasterDataChange}
            onVehicleAutoPopulate={handleVehicleAutoPopulate}
            onCompanySelect={handleCompanySelect}
          />

          {/* Fixed Transaction Sections */}
          {masterData.TypeOfTransaction === 'Fixed' && (
            <>
              <DriverDetailsSection
                transactionData={transactionData}
                drivers={drivers}
                errors={errors}
                onTransactionDataChange={handleTransactionDataChange}
                onReplacementDriverNoChange={handleReplacementDriverNoChangeWrapper}
              />

              <CalculationsSection
                calculatedData={calculatedData}
                transactionData={transactionData}
                masterData={masterData}
                onCalculatedDataChange={handleCalculatedDataChange}
              />

              <SupervisorSection
                supervisorData={supervisorData}
                onSupervisorDataChange={handleSupervisorDataChange}
              />
            </>
          )}

          {/* Adhoc/Replacement Transaction Section */}
          {(masterData.TypeOfTransaction === 'Adhoc' || masterData.TypeOfTransaction === 'Replacement') && (
            <AdhocReplacementSection
              transactionData={transactionData}
              calculatedData={calculatedData}
              files={files}
              errors={errors}
              editingTransaction={editingTransaction}
              onTransactionDataChange={handleTransactionDataChange}
              onVendorNumberChange={handleVendorNumberChangeWrapper}
              onDriverNumberChange={handleDriverNumberChangeWrapper}
              onAadharNumberChange={handleAadharNumberChangeWrapper}
              onFileChange={handleFileChange}
            />
          )}
        </div>

        {/* Form Actions */}
        <div className="form-actions">
          <button type="submit" className="submit-btn" disabled={isSubmitting}>
            {isSubmitting ? 'Saving...' : editingTransaction ? 'Update Transaction' : 'Save Transaction'}
          </button>

          {editingTransaction && (
            <>
              <button type="button" onClick={handleNewTransaction} className="new-transaction-btn">
                🆕 New Transaction
              </button>
              <button type="button" className="reset-btn" onClick={resetForm}>
                Cancel
              </button>
            </>
          )}
        </div>
      </form>

      {/* Transactions Table */}
      <div className="transactions-table-container">
        {/* Date Range Filter */}
        <div style={{ display: 'flex', gap: '15px', alignItems: 'center', marginBottom: '15px', padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <label style={{ fontWeight: 'bold', minWidth: '80px' }}>From Date:</label>
            <input
              type="date"
              value={dateFilter.fromDate}
              onChange={(e) => setDateFilter(prev => ({ ...prev, fromDate: e.target.value }))}
              style={{ padding: '8px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '14px' }}
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <label style={{ fontWeight: 'bold', minWidth: '70px' }}>To Date:</label>
            <input
              type="date"
              value={dateFilter.toDate}
              onChange={(e) => setDateFilter(prev => ({ ...prev, toDate: e.target.value }))}
              style={{ padding: '8px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '14px' }}
            />
          </div>
          <button onClick={handleDateFilterApply} style={{ backgroundColor: '#007bff', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '4px', cursor: 'pointer', fontSize: '14px', fontWeight: 'bold' }}>
            🔍 Filter
          </button>
          <button onClick={handleDateFilterClear} style={{ backgroundColor: '#6c757d', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '4px', cursor: 'pointer', fontSize: '14px' }}>
            🗑️ Clear
          </button>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h3>Recent Transactions</h3>
          <button onClick={handleExportAllTransactions} style={{ backgroundColor: '#007bff', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '6px', cursor: 'pointer', fontSize: '14px', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '8px' }}>
            📊 Export to Excel
          </button>
        </div>

        <DataTable
          title=""
          data={transactions}
          columns={transactionColumns}
          onEdit={handleEdit}
          onDelete={handleDelete}
          isLoading={isLoading}
          keyField="TransactionID"
          emptyMessage="No transactions found"
          defaultRowsPerPage={5}
          minRowsPerPage={5}
          showPagination={true}
          customizable={true}
          exportable={false}
          defaultSort={{ key: 'TransactionID', direction: 'desc' }}
        />
      </div>
    </div>
  );
};

export default DailyVehicleTransactionFormRefactored;
