import React, { useState, useEffect, useCallback } from 'react';
import { fixedTransactionAPI, customerAPI, vehicleAPI, driverAPI, projectAPI, vendorAPI, apiHelpers } from '../services/api';
import DataTable from '../components/DataTable';
import Dropdown from '../components/Dropdown';
import SearchableDropdown from '../components/SearchableDropdown';
import { focusField } from '../utils/globalFormValidation';

const FixedTransactionForm = () => {
  const getCurrentDate = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  };

  const initialTransactionData = {
    DriverID: '',
    DriverMobileNo: '',
    ReplacementDriverID: '',
    ReplacementDriverName: '',
    ReplacementDriverNo: '',
    Date: getCurrentDate(),
    ArrivalTimeAtHub: '',
    InTimeByCust: '',
    OutTimeFromHub: '',
    ReturnReportingTime: '',
    OpeningKM: '',
    ClosingKM: '',
    TotalDeliveries: '',
    TotalDeliveriesAttempted: '',
    TotalDeliveriesDone: '',
    TotalDutyHours: '', // Read-only, calculated by backend
    OvertimeCostPerHour: '', // New field
    Remarks: '',
    VFreightFix: '',
    FixKm: '',
    VFreightVariable: '',
    TotalFreight: '',
    TollExpenses: '',
    ParkingCharges: '',
    LoadingCharges: '',
    UnloadingCharges: '',
    OtherCharges: '',
    OtherChargesRemarks: '',
    HandlingCharges: '',
    VehicleType: '',
    VehicleNumber: '',
    VendorName: '',
    VendorCode: '',
    VendorNumber: '',
    DriverName: '',
    DriverNumber: '',
    DriverAadharNumber: '',
    DriverLicenceNumber: '',
    CompanyName: '',
    GSTNo: '',
    CustomerSite: '',
    Location: '',
    OutTimeFrom: '',
    TripNo: '',
    TotalShipmentsForDeliveries: '',
    TotalShipmentDeliveriesAttempted: '',
    TotalShipmentDeliveriesDone: '',
    DriverAadharDoc: null,
    DriverLicenceDoc: null,
    TollExpensesDoc: null,
    ParkingChargesDoc: null,
    AdvanceRequestNo: '',
    AdvanceToPaid: '',
    AdvanceApprovedAmount: '',
    AdvanceApprovedBy: '',
    AdvancePaidAmount: '',
    AdvancePaidMode: '',
    AdvancePaidDate: '',
    AdvancePaidBy: '',
    EmployeeDetailsAdvance: '',
    BalanceToBePaid: '',
    BalancePaidAmount: '',
    Variance: '',
    BalancePaidDate: '',
    BalancePaidBy: '',
    EmployeeDetailsBalance: '',
    Revenue: '',
    Margin: '',
    MarginPercentage: ''
  };

  const [masterData, setMasterData] = useState({
    TypeOfTransaction: 'Fixed',
    Customer: '',
    Project: '',
    VehicleNo: [],
    VendorName: ''
  });

  const [transactionData, setTransactionData] = useState(initialTransactionData);
  const [customers, setCustomers] = useState([]);
  const [projects, setProjects] = useState([]);
  const [availableProjects, setAvailableProjects] = useState([]);
  const [isProjectDropdownVisible, setIsProjectDropdownVisible] = useState(false);
  const [vehicles, setVehicles] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [selectedVehicleTags, setSelectedVehicleTags] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [errors, setErrors] = useState({});
  const [ids, setIds] = useState({
    CustomerID: null,
    ProjectID: null,
    VehicleID: null,
    DriverID: null,
    VendorID: null
  });

  const fetchTransactions = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fixedTransactionAPI.getAll();
      setTransactions(response.data.data || []);
    } catch (error) {
      apiHelpers.showError(error, 'Failed to fetch fixed transactions');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const fetchInitialData = async () => {
        try {
            const [customerRes, vehicleRes, driverRes, vendorRes] = await Promise.all([
                customerAPI.getAll(),
                vehicleAPI.getAll(),
                driverAPI.getAll(),
                vendorAPI.getAll(),
            ]);
            setCustomers(customerRes.data.data.map(c => ({ ...c, value: c.CustomerID, label: c.Name })));
            setVehicles(vehicleRes.data.data);
            setDrivers(driverRes.data.data);
            setVendors(vendorRes.data.data);
        } catch (error) {
            console.error("Error fetching initial data:", error);
        }
    };
    fetchInitialData();
    fetchTransactions();
  }, [fetchTransactions]);

  const fetchProjects = async (customerId) => {
    try {
      const response = await projectAPI.getByCustomer(customerId);
      const projectData = response.data.data || [];
      const formattedProjects = projectData.map(p => ({ ...p, value: p.ProjectID, label: p.ProjectName }));

      setProjects(formattedProjects);
      setAvailableProjects(projectData);

      // Dynamic project field logic: single project = readonly, multiple = dropdown
      if (projectData.length === 1) {
        // Single project - auto-select and show as readonly
        const project = projectData[0];
        setMasterData(prev => ({ ...prev, Project: project.ProjectName }));
        setIds(prev => ({ ...prev, ProjectID: project.ProjectID }));
        setIsProjectDropdownVisible(false);
        console.log('✅ Single project auto-selected:', project.ProjectName);
      } else if (projectData.length > 1) {
        // Multiple projects - show dropdown for selection
        setIsProjectDropdownVisible(true);
        console.log('📋 Multiple projects available, showing dropdown');
      } else {
        // No projects
        setIsProjectDropdownVisible(false);
        setMasterData(prev => ({ ...prev, Project: '' }));
        setIds(prev => ({ ...prev, ProjectID: null }));
        console.log('❌ No projects found for customer');
      }
    } catch (error) {
      console.error('Error fetching projects:', error);
    }
  };

  const handleMasterDataChange = (name, value) => {
    setMasterData(prev => ({ ...prev, [name]: value }));

    if (name === 'Customer') {
      const selectedCustomer = customers.find(c => c.label === value);
      if (selectedCustomer) {
        setIds(prev => ({ ...prev, CustomerID: selectedCustomer.CustomerID }));
        fetchProjects(selectedCustomer.CustomerID);
      }
    }

    if (name === 'Project') {
      const selectedProject = projects.find(p => p.label === value);
      if (selectedProject) {
        setIds(prev => ({ ...prev, ProjectID: selectedProject.ProjectID }));
      }
    }

    if (name === 'VendorName') {
      const selectedVendor = vendors.find(v => v.VendorName === value);
      if (selectedVendor) {
        setIds(prev => ({ ...prev, VendorID: selectedVendor.VendorID }));
        setTransactionData(prev => ({ ...prev, VendorCode: selectedVendor.VendorCode }));
      }
    }
  };

  const handleTransactionDataChange = (e) => {
    const { name, value } = e.target;
    setTransactionData(prev => ({ ...prev, [name]: value }));

    if (name === 'DriverID') {
      const selectedDriver = drivers.find(d => d.DriverID === parseInt(value));
      if (selectedDriver) {
        setTransactionData(prev => ({ ...prev, DriverMobileNo: selectedDriver.DriverMobileNo || '' }));
        setIds(prev => ({ ...prev, DriverID: selectedDriver.DriverID }));
      }
    }
  };

  const handleVehicleSelect = (e) => {
    const vehicleId = e.target.value;
    if (vehicleId && !masterData.VehicleNo.includes(vehicleId)) {
      const selectedVehicle = vehicles.find(v => v.VehicleID === parseInt(vehicleId));
      if (selectedVehicle) {
        setMasterData(prev => ({ ...prev, VehicleNo: [...prev.VehicleNo, vehicleId] }));
        setSelectedVehicleTags(prev => [...prev, { id: vehicleId, registrationNo: selectedVehicle.VehicleRegistrationNo, type: selectedVehicle.VehicleType }]);
      }
    }
    e.target.value = '';
  };

  const removeVehicleTag = (vehicleId) => {
    setMasterData(prev => ({ ...prev, VehicleNo: prev.VehicleNo.filter(id => id !== vehicleId) }));
    setSelectedVehicleTags(prev => prev.filter(tag => tag.id !== vehicleId));
  };

  const validateForm = () => {
    const newErrors = {};
    const errorFields = [];

    // Define field priority order (top to bottom)
    const fieldOrder = ['Customer', 'Project', 'VehicleNo', 'DriverID', 'Date', 'OpeningKM', 'ClosingKM', 'ArrivalTimeAtHub', 'ReturnReportingTime'];

    if (!masterData.Customer) {
      newErrors.Customer = 'Customer is required';
      errorFields.push('Customer');
    }
    if (!masterData.Project) {
      newErrors.Project = 'Project is required';
      errorFields.push('Project');
    }
    if (!masterData.VehicleNo || masterData.VehicleNo.length === 0) {
      newErrors.VehicleNo = 'At least one vehicle must be selected';
      errorFields.push('VehicleNo');
    }
    if (!transactionData.DriverID) {
      newErrors.DriverID = 'Driver is required';
      errorFields.push('DriverID');
    }
    if (!transactionData.Date) {
      newErrors.Date = 'Date is required';
      errorFields.push('Date');
    }
    if (!transactionData.OpeningKM) {
      newErrors.OpeningKM = 'Opening KM is required';
      errorFields.push('OpeningKM');
    }
    if (!transactionData.ClosingKM) {
      newErrors.ClosingKM = 'Closing KM is required';
      errorFields.push('ClosingKM');
    }

    // Validate time format for HH:MM (24-hour format)
    const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
    if (transactionData.ArrivalTimeAtHub && !timeRegex.test(transactionData.ArrivalTimeAtHub)) {
        newErrors.ArrivalTimeAtHub = 'Invalid format. Use HH:MM.';
        errorFields.push('ArrivalTimeAtHub');
    }
    if (transactionData.ReturnReportingTime && !timeRegex.test(transactionData.ReturnReportingTime)) {
        newErrors.ReturnReportingTime = 'Invalid format. Use HH:MM.';
        errorFields.push('ReturnReportingTime');
    }

    // New validation logic for return time
    if (
      transactionData.ArrivalTimeAtHub &&
      transactionData.ReturnReportingTime &&
      timeRegex.test(transactionData.ArrivalTimeAtHub) &&
      timeRegex.test(transactionData.ReturnReportingTime)
    ) {
      const arrival = transactionData.ArrivalTimeAtHub;
      const arrivalTime = new Date(`1970-01-01T${arrival}`);
      const departure = transactionData.ReturnReportingTime;
      const returnTime = new Date(`1970-01-01T${departure}`);

      if (returnTime <= arrivalTime) {
        newErrors.ReturnReportingTime = 'Return time must be after arrival time.';
        if (!errorFields.includes('ReturnReportingTime')) {
          errorFields.push('ReturnReportingTime');
        }
      }
    }

    setErrors(newErrors);

    // Auto-focus on first error field
    if (errorFields.length > 0) {
      const firstErrorField = fieldOrder.find(field => errorFields.includes(field));
      if (firstErrorField) {
        focusField(firstErrorField);
      }
    }

    return Object.keys(newErrors).length === 0;
  };

  const resetForm = () => {
    setMasterData({ TypeOfTransaction: 'Fixed', Customer: '', Project: '', VehicleNo: [], VendorName: '' });
    setTransactionData(initialTransactionData);
    setSelectedVehicleTags([]);
    setEditingTransaction(null);
    setErrors({});
    setIds({ CustomerID: null, ProjectID: null, VehicleID: null, DriverID: null, VendorID: null });
    setAvailableProjects([]);
    setIsProjectDropdownVisible(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      const selectedVendor = vendors.find(v => v.VendorID === ids.VendorID);

      const payload = {
        ...transactionData,
        ...ids,
        TripType: 'Fixed',
        TransactionDate: transactionData.Date,
        VehicleID: masterData.VehicleNo.length > 0 ? masterData.VehicleNo[0] : null,
        VendorCode: selectedVendor ? selectedVendor.VendorCode : null,
        OvertimeCostPerHour: transactionData.OvertimeCostPerHour ? Number(transactionData.OvertimeCostPerHour) : null,
        ArrivalTimeAtHub: transactionData.ArrivalTimeAtHub,
        ReturnReportingTime: transactionData.ReturnReportingTime,
      };
      
      delete payload.Date;

      if (editingTransaction) {
        await fixedTransactionAPI.update(editingTransaction.TransactionID, payload);
        apiHelpers.showSuccess('Fixed transaction updated successfully');
      } else {
        await fixedTransactionAPI.create(payload);
        apiHelpers.showSuccess('Fixed transaction created successfully');
      }

      resetForm();
      fetchTransactions();
    } catch (error) {
      apiHelpers.showError(error, 'Failed to save fixed transaction');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Helper function to format date for input field
  const formatDateForInput = (date) => {
    if (!date) return '';
    if (date instanceof Date) {
      return date.toLocaleDateString('en-CA'); // Returns YYYY-MM-DD format in local timezone
    }
    if (typeof date === 'string') {
      const parsedDate = new Date(date);
      return parsedDate.toLocaleDateString('en-CA');
    }
    return date;
  };

  const handleEdit = (transaction) => {
    setEditingTransaction(transaction);
    setMasterData({
        TypeOfTransaction: 'Fixed',
        Customer: transaction.CustomerName || '',
        Project: transaction.ProjectName || '',
        VehicleNo: transaction.VehicleIDs ? JSON.parse(transaction.VehicleIDs) : [],
        VendorName: transaction.VendorName || ''
    });

    setTransactionData({
        ...initialTransactionData,
        ...transaction,
        Date: formatDateForInput(transaction.TransactionDate),
        ArrivalTimeAtHub: transaction.ArrivalTimeAtHub,
        ReturnReportingTime: transaction.ReturnReportingTime,
    });
    setIds({ ...ids, ...transaction });
    if (transaction.VehicleIDs) {
        try {
            const vehicleIds = JSON.parse(transaction.VehicleIDs);
            const tags = vehicles
                .filter(v => vehicleIds.includes(v.VehicleID.toString()))
                .map(v => ({ id: v.VehicleID, registrationNo: v.VehicleRegistrationNo, type: v.VehicleType }));
            setSelectedVehicleTags(tags);
        } catch (e) {
            console.warn('Could not parse VehicleIDs:', transaction.VehicleIDs);
        }
    }
  };

  return (
    <div className="daily-vehicle-transaction-form">
      <h2>Fixed Vehicle Transaction Form</h2>
      <form onSubmit={handleSubmit}>
        <div className="form-section master-section">
          <h3>Master Data (Fixed Transaction)</h3>
          <div className="form-group">
            <label>Master Customer Name *</label>
            <SearchableDropdown name="Customer" value={masterData.Customer} onChange={handleMasterDataChange} options={customers} placeholder="Select Customer" className={errors.Customer ? 'error' : ''} />
            {errors.Customer && <span className="error-message">{errors.Customer}</span>}
          </div>
          <div className="form-group">
            <label>Project *</label>
            {isProjectDropdownVisible && availableProjects.length > 1 ? (
              <SearchableDropdown
                name="Project"
                value={masterData.Project}
                onChange={handleMasterDataChange}
                options={projects}
                placeholder="Select Project"
                className={errors.Project ? 'error' : ''}
              />
            ) : (
              <input
                type="text"
                name="Project"
                value={masterData.Project}
                className="readonly-field"
                readOnly
                placeholder={availableProjects.length === 1 ? 'Auto-selected (only one project available)' : 'Select a customer first'}
              />
            )}
            {errors.Project && <span className="error-message">{errors.Project}</span>}
          </div>
          <div className="form-group">
            <label>Vehicle No *</label>
            <select name="VehicleNo" onChange={handleVehicleSelect} className={`form-control ${errors.VehicleNo ? 'error' : ''}`} defaultValue="">
              <option value="">Select Vehicle to Add</option>
              {vehicles.filter(v => !masterData.VehicleNo.includes(v.VehicleID.toString())).map(v => <option key={v.VehicleID} value={v.VehicleID}>{`${v.VehicleRegistrationNo} - ${v.VehicleType}`}</option>)}
            </select>
            {selectedVehicleTags.length > 0 && <div className="selected-vehicles-tags" style={{ marginTop: '10px' }}>{selectedVehicleTags.map(tag => <span key={tag.id} className="vehicle-tag" style={{ display: 'inline-block', backgroundColor: '#007bff', color: 'white', padding: '6px 12px', margin: '4px 4px 4px 0', borderRadius: '20px', fontSize: '13px', cursor: 'pointer' }} onClick={() => removeVehicleTag(tag.id)} title="Click to remove">{`${tag.registrationNo} - ${tag.type}`} &times;</span>)}</div>}
            {errors.VehicleNo && <span className="error-message">{errors.VehicleNo}</span>}
          </div>
          <div className="form-group">
            <label>Vendor Name & Code</label>
            <Dropdown name="VendorName" value={masterData.VendorName} onChange={handleMasterDataChange} apiCall={vendorAPI.getAll} valueKey="VendorID" labelKey="VendorName" formatLabel={(vendor) => `${vendor.VendorName} (${vendor.VendorCode})`} placeholder="Select Vendor" allowEmpty={true} />
          </div>
        </div>

        <div className="form-section transaction-section">
          <h3>Transaction Details</h3>
          <div className="form-row">
            <div className="form-group">
              <label>Driver *</label>
              <select name="DriverID" value={transactionData.DriverID} onChange={handleTransactionDataChange} className={errors.DriverID ? 'error' : ''}>
                <option value="">Select Driver</option>
                {drivers.map(driver => <option key={driver.DriverID} value={driver.DriverID}>{`${driver.DriverName} - ${driver.DriverMobileNo}`}</option>)}
              </select>
              {errors.DriverID && <span className="error-message">{errors.DriverID}</span>}
            </div>
            <div className="form-group">
              <label>Date *</label>
              <input type="date" name="Date" value={transactionData.Date} onChange={handleTransactionDataChange} className={errors.Date ? 'error' : ''} />
              {errors.Date && <span className="error-message">{errors.Date}</span>}
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Arrival Time at Hub</label>
              <input type="time" name="ArrivalTimeAtHub" value={transactionData.ArrivalTimeAtHub} onChange={handleTransactionDataChange} className={errors.ArrivalTimeAtHub ? 'error' : ''} />
              {errors.ArrivalTimeAtHub && <span className="error-message">{errors.ArrivalTimeAtHub}</span>}
            </div>
            <div className="form-group">
              <label>Return Reporting Time</label>
              <input type="time" name="ReturnReportingTime" value={transactionData.ReturnReportingTime} onChange={handleTransactionDataChange} className={errors.ReturnReportingTime ? 'error' : ''} />
              {errors.ReturnReportingTime && <span className="error-message">{errors.ReturnReportingTime}</span>}
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Opening KM *</label>
              <input type="number" name="OpeningKM" value={transactionData.OpeningKM} onChange={handleTransactionDataChange} className={errors.OpeningKM ? 'error' : ''} step="0.01" />
              {errors.OpeningKM && <span className="error-message">{errors.OpeningKM}</span>}
            </div>
            <div className="form-group">
              <label>Closing KM *</label>
              <input type="number" name="ClosingKM" value={transactionData.ClosingKM} onChange={handleTransactionDataChange} className={errors.ClosingKM ? 'error' : ''} step="0.01" />
              {errors.ClosingKM && <span className="error-message">{errors.ClosingKM}</span>}
            </div>
          </div>

          <div className="form-row">
              <div className="form-group">
                  <label>Duty Hours</label>
                  <input type="number" name="TotalDutyHours" value={transactionData.TotalDutyHours} readOnly className="readonly-field" />
              </div>
              <div className="form-group">
                  <label>Overtime Cost Per Hour</label>
                  <input type="number" name="OvertimeCostPerHour" value={transactionData.OvertimeCostPerHour} onChange={handleTransactionDataChange} step="0.01" />
              </div>
          </div>

          <div className="form-group">
            <label>Company Name</label>
            <input type="text" name="CompanyName" value={transactionData.CompanyName} onChange={handleTransactionDataChange} />
          </div>

        </div>

        <div className="form-actions">
          <button type="submit" disabled={isSubmitting} className="btn btn-primary">{isSubmitting ? 'Saving...' : editingTransaction ? 'Update Transaction' : 'Create Transaction'}</button>
          <button type="button" onClick={resetForm} className="btn btn-secondary" style={{ marginLeft: '10px' }}>Reset Form</button>
        </div>
      </form>

      <div className="transactions-list" style={{ marginTop: '40px' }}>
        <h3>Fixed Transactions</h3>
        <DataTable
          data={transactions}
          columns={[
            { key: 'SerialNumber', label: 'S.No.' },
            { key: 'TripType', label: 'Type' },
            { key: 'TransactionDate', label: 'Date' },
            { key: 'CustomerName', label: 'Customer' },
            { key: 'ProjectName', label: 'Project' },
            { key: 'VehicleRegistrationNo', label: 'Vehicle' },
            { key: 'DriverName', label: 'Driver' },
            { key: 'OpeningKM', label: 'Opening KM' },
            { key: 'ClosingKM', label: 'Closing KM' },
            { key: 'Status', label: 'Status' }
          ]}
          keyField="TransactionID"
          isLoading={isLoading}
          onEdit={handleEdit}
        />
      </div>
    </div>
  );
};

export default FixedTransactionForm;