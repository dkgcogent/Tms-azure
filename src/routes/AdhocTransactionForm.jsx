import React, { useState, useEffect, useCallback } from 'react';
import { adhocTransactionAPI, customerAPI, projectAPI, vehicleAPI, apiHelpers } from '../services/api';
import DataTable from '../components/DataTable';
import SearchableDropdown from '../components/SearchableDropdown';
import { focusField } from '../utils/globalFormValidation';

const AdhocTransactionForm = () => {
  // Utility functions for 12-hour time format validation and conversion
  const isValid12HourTime = (timeString) => {
    if (!timeString || typeof timeString !== 'string') return false;
    const timeRegex = /^(0?[1-9]|1[0-2]):([0-5][0-9])\s?(AM|PM|am|pm)$/i;
    return timeRegex.test(timeString.trim());
  };

  const convert12HourTo24Hour = (time12h) => {
    if (!time12h || !isValid12HourTime(time12h)) return null;
    const [time, period] = time12h.trim().split(/\s+/);
    let [hours, minutes] = time.split(':').map(Number);
    if (period.toUpperCase() === 'PM' && hours !== 12) {
      hours += 12;
    } else if (period.toUpperCase() === 'AM' && hours === 12) {
      hours = 0;
    }
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  };

  const getCurrentDate = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  };

  const initialTransactionData = {
    Date: getCurrentDate(),
    TripNo: '',
    VehicleNumber: '',
    FixedVehicleNumber: '',
    VehicleType: '',
    VendorName: '',
    VendorCode: '',
    VendorNumber: '',
    DriverName: '',
    DriverNumber: '',
    DriverAadharNumber: '',
    DriverLicenceNumber: '',
    ArrivalTimeAtHub: '',
    InTimeByCust: '',
    OutTimeFromHub: '',
    ReturnReportingTime: '',
    OutTimeFrom: '',
    OpeningKM: '',
    ClosingKM: '',
    TotalShipmentsForDeliveries: '',
    TotalShipmentDeliveriesAttempted: '',
    TotalShipmentDeliveriesDone: '',
    VFreightFix: '',
    FixKm: '',
    VFreightVariable: '',
    TollExpenses: '',
    ParkingCharges: '',
    LoadingCharges: '',
    UnloadingCharges: '',
    OtherCharges: '',
    OtherChargesRemarks: '',
    TotalDutyHours: '',
    TotalFreight: '',
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
    MarginPercentage: '',
    TripClose: false,
    Remarks: ''
  };

  const [masterData, setMasterData] = useState({ TypeOfTransaction: 'Adhoc', Customer: '', Project: '' });
  const [transactionData, setTransactionData] = useState(initialTransactionData);
  const [customers, setCustomers] = useState([]);
  const [projects, setProjects] = useState([]);
  const [availableProjects, setAvailableProjects] = useState([]);
  const [isProjectDropdownVisible, setIsProjectDropdownVisible] = useState(false);
  const [transactions, setTransactions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [errors, setErrors] = useState({});
  const [ids, setIds] = useState({ CustomerID: null, ProjectID: null });
  const [isFixedVehicleValid, setIsFixedVehicleValid] = useState(true);


  const fetchTransactions = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await adhocTransactionAPI.getAll();
      setTransactions(response.data.data || []);
    } catch (error) {
      apiHelpers.showError(error, 'Failed to fetch adhoc transactions');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const fetchInitialData = async () => {
        try {
            const customerRes = await customerAPI.getAll();
            setCustomers(customerRes.data.data.map(c => ({ ...c, value: c.CustomerID, label: c.Name })));
        } catch (error) {
            console.error("Error fetching customers:", error);
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
      if (selectedProject) setIds(prev => ({ ...prev, ProjectID: selectedProject.ProjectID }));
    }
  };

  const handleTransactionDataChange = (e) => {
    const { name, value, type, checked } = e.target;
    setTransactionData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleFixedVehicleNumberBlur = async (e) => {
    const vehicleNumber = e.target.value;
    if (vehicleNumber) {
      try {
        const response = await vehicleAPI.get(`/validate/by-reg-no/${vehicleNumber}`);
        if (response.data.exists) {
          setIsFixedVehicleValid(true);
          setErrors(prev => ({ ...prev, FixedVehicleNumber: '' }));
        } else {
          setIsFixedVehicleValid(false);
          setErrors(prev => ({ ...prev, FixedVehicleNumber: 'Fixed Vehicle Number does not exist.' }));
        }
      } catch (error) {
        setIsFixedVehicleValid(false);
        setErrors(prev => ({ ...prev, FixedVehicleNumber: 'Error validating vehicle number.' }));
      }
    }
  };

  const validateForm = () => {
    const newErrors = {};
    const errorFields = [];

    // Define field priority order (top to bottom)
    const fieldOrder = ['Customer', 'TripNo', 'VehicleNumber', 'VendorName', 'DriverName', 'DriverNumber', 'FixedVehicleNumber', 'ArrivalTimeAtHub', 'InTimeByCust', 'OutTimeFromHub', 'ReturnReportingTime'];

    if (!masterData.Customer) {
      newErrors.Customer = 'Customer is required';
      errorFields.push('Customer');
    }
    if (!transactionData.TripNo) {
      newErrors.TripNo = 'Trip No is required';
      errorFields.push('TripNo');
    }
    if (!transactionData.VehicleNumber) {
      newErrors.VehicleNumber = 'Vehicle Number is required';
      errorFields.push('VehicleNumber');
    }
    if (!transactionData.VendorName) {
      newErrors.VendorName = 'Vendor Name is required';
      errorFields.push('VendorName');
    }
    if (!transactionData.DriverName) {
      newErrors.DriverName = 'Driver Name is required';
      errorFields.push('DriverName');
    }
    if (!transactionData.DriverNumber) {
      newErrors.DriverNumber = 'Driver Number is required';
      errorFields.push('DriverNumber');
    }
    if (masterData.TypeOfTransaction === 'Replacement' && !transactionData.FixedVehicleNumber) {
      newErrors.FixedVehicleNumber = 'Fixed Vehicle Number is required for replacement trips.';
      errorFields.push('FixedVehicleNumber');
    }
    if (masterData.TypeOfTransaction === 'Replacement' && !isFixedVehicleValid) {
      newErrors.FixedVehicleNumber = 'Fixed Vehicle Number is not valid.';
      if (!errorFields.includes('FixedVehicleNumber')) {
        errorFields.push('FixedVehicleNumber');
      }
    }

    // Validate time fields in 12-hour format
    if (transactionData.ArrivalTimeAtHub && !isValid12HourTime(transactionData.ArrivalTimeAtHub)) {
      newErrors.ArrivalTimeAtHub = 'Invalid time format. Use HH:MM AM/PM (e.g., 02:30 PM)';
      errorFields.push('ArrivalTimeAtHub');
    }
    if (transactionData.InTimeByCust && !isValid12HourTime(transactionData.InTimeByCust)) {
      newErrors.InTimeByCust = 'Invalid time format. Use HH:MM AM/PM (e.g., 02:30 PM)';
      errorFields.push('InTimeByCust');
    }
    if (transactionData.OutTimeFromHub && !isValid12HourTime(transactionData.OutTimeFromHub)) {
      newErrors.OutTimeFromHub = 'Invalid time format. Use HH:MM AM/PM (e.g., 02:30 PM)';
      errorFields.push('OutTimeFromHub');
    }
    if (transactionData.ReturnReportingTime && !isValid12HourTime(transactionData.ReturnReportingTime)) {
      newErrors.ReturnReportingTime = 'Invalid time format. Use HH:MM AM/PM (e.g., 02:30 PM)';
      errorFields.push('ReturnReportingTime');
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
    setMasterData({ TypeOfTransaction: 'Adhoc', Customer: '', Project: '' });
    setTransactionData(initialTransactionData);
    setEditingTransaction(null);
    setErrors({});
    setIds({ CustomerID: null, ProjectID: null });
    setIsFixedVehicleValid(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      // Convert 12-hour format times to 24-hour format for backend
      const payload = {
        ...transactionData,
        TripType: masterData.TypeOfTransaction,
        CustomerID: ids.CustomerID,
        ProjectID: ids.ProjectID,
        TransactionDate: transactionData.Date,
        ArrivalTimeAtHub: transactionData.ArrivalTimeAtHub ? convert12HourTo24Hour(transactionData.ArrivalTimeAtHub) : null,
        InTimeByCust: transactionData.InTimeByCust ? convert12HourTo24Hour(transactionData.InTimeByCust) : null,
        OutTimeFromHub: transactionData.OutTimeFromHub ? convert12HourTo24Hour(transactionData.OutTimeFromHub) : null,
        ReturnReportingTime: transactionData.ReturnReportingTime ? convert12HourTo24Hour(transactionData.ReturnReportingTime) : null,
      };
      delete payload.Date;

      if (editingTransaction) {
        await adhocTransactionAPI.update(editingTransaction.TransactionID, payload);
        apiHelpers.showSuccess(`${masterData.TypeOfTransaction} transaction updated successfully`);
      } else {
        await adhocTransactionAPI.create(payload);
        apiHelpers.showSuccess(`${masterData.TypeOfTransaction} transaction created successfully`);
      }

      resetForm();
      fetchTransactions();
    } catch (error) {
      apiHelpers.showError(error, `Failed to save ${masterData.TypeOfTransaction} transaction`);
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
    setMasterData({ ...masterData, Customer: transaction.CustomerName, Project: transaction.ProjectName, TypeOfTransaction: transaction.TripType });
    setTransactionData({ ...initialTransactionData, ...transaction, Date: formatDateForInput(transaction.TransactionDate) });
    setIds({ CustomerID: transaction.CustomerID, ProjectID: transaction.ProjectID });
  };

  return (
    <div className="adhoc-transaction-form">
      <h2>Adhoc/Replacement Vehicle Transaction Form</h2>
      <form onSubmit={handleSubmit}>
        <div className="form-section">
          <div className="form-group">
            <label>Transaction Type *</label>
            <select name="TypeOfTransaction" value={masterData.TypeOfTransaction} onChange={(e) => handleMasterDataChange('TypeOfTransaction', e.target.value)} className="form-control">
              <option value="Adhoc">Adhoc</option>
              <option value="Replacement">Replacement</option>
            </select>
          </div>
        </div>

        <div className="form-section master-section">
          <h3>Reference Data</h3>
          <div className="form-group">
            <label>Master Customer Name *</label>
            <SearchableDropdown name="Customer" value={masterData.Customer} onChange={handleMasterDataChange} options={customers} placeholder="Select Customer" className={errors.Customer ? 'error' : ''} />
            {errors.Customer && <span className="error-message">{errors.Customer}</span>}
          </div>
          <div className="form-group">
            <label>Project</label>
            {isProjectDropdownVisible && availableProjects.length > 1 ? (
              <SearchableDropdown
                name="Project"
                value={masterData.Project}
                onChange={handleMasterDataChange}
                options={projects}
                placeholder="Select Project (Optional)"
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
          </div>
        </div>

        <div className="form-section transaction-section">
          <h3>Manual Transaction Details</h3>
          <div className="form-row">
            <div className="form-group">
              <label>Trip No *</label>
              <input type="text" name="TripNo" value={transactionData.TripNo} onChange={handleTransactionDataChange} className={errors.TripNo ? 'error' : ''} placeholder="Enter trip number" />
              {errors.TripNo && <span className="error-message">{errors.TripNo}</span>}
            </div>
            <div className="form-group">
              <label>Date *</label>
              <input type="date" name="Date" value={transactionData.Date} onChange={handleTransactionDataChange} className={errors.Date ? 'error' : ''} />
              {errors.Date && <span className="error-message">{errors.Date}</span>}
            </div>
          </div>

          {masterData.TypeOfTransaction === 'Replacement' && (
            <div className="form-group">
              <label>Fixed Vehicle No. *</label>
              <input type="text" name="FixedVehicleNumber" value={transactionData.FixedVehicleNumber} onChange={handleTransactionDataChange} onBlur={handleFixedVehicleNumberBlur} className={errors.FixedVehicleNumber ? 'error' : ''} placeholder="Enter original vehicle number" />
              {errors.FixedVehicleNumber && <span className="error-message">{errors.FixedVehicleNumber}</span>}
            </div>
          )}

          <div className="form-row">
            <div className="form-group">
              <label>Vehicle Number *</label>
              <input type="text" name="VehicleNumber" value={transactionData.VehicleNumber} onChange={handleTransactionDataChange} className={errors.VehicleNumber ? 'error' : ''} placeholder="Enter vehicle registration number" />
              {errors.VehicleNumber && <span className="error-message">{errors.VehicleNumber}</span>}
            </div>
            <div className="form-group">
              <label>Vehicle Type</label>
              <input type="text" name="VehicleType" value={transactionData.VehicleType} onChange={handleTransactionDataChange} placeholder="Enter vehicle type" />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Vendor Name *</label>
              <input type="text" name="VendorName" value={transactionData.VendorName} onChange={handleTransactionDataChange} className={errors.VendorName ? 'error' : ''} placeholder="Enter vendor name" />
              {errors.VendorName && <span className="error-message">{errors.VendorName}</span>}
            </div>
            <div className="form-group">
              <label>Vendor Code</label>
              <input type="text" name="VendorCode" value={transactionData.VendorCode} onChange={handleTransactionDataChange} placeholder="Enter vendor code" />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Arrival Time at Hub</label>
              <input type="text" name="ArrivalTimeAtHub" value={transactionData.ArrivalTimeAtHub} onChange={handleTransactionDataChange} placeholder="HH:MM AM/PM" />
            </div>
            <div className="form-group">
              <label>In Time by Customer</label>
              <input type="text" name="InTimeByCust" value={transactionData.InTimeByCust} onChange={handleTransactionDataChange} placeholder="HH:MM AM/PM" />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Out Time From Hub</label>
              <input type="text" name="OutTimeFromHub" value={transactionData.OutTimeFromHub} onChange={handleTransactionDataChange} placeholder="HH:MM AM/PM" />
            </div>
            <div className="form-group">
              <label>Return Reporting Time</label>
              <input type="text" name="ReturnReportingTime" value={transactionData.ReturnReportingTime} onChange={handleTransactionDataChange} placeholder="HH:MM AM/PM" />
            </div>
          </div>

        </div>

        <div className="form-actions">
          <button type="submit" disabled={isSubmitting} className="btn btn-primary">{isSubmitting ? 'Saving...' : editingTransaction ? 'Update Transaction' : 'Create Transaction'}</button>
          <button type="button" onClick={resetForm} className="btn btn-secondary" style={{ marginLeft: '10px' }}>Reset Form</button>
        </div>
      </form>

      <div className="transactions-list" style={{ marginTop: '40px' }}>
        <h3>Adhoc/Replacement Transactions</h3>
        <DataTable
          data={transactions}
          columns={[
            { key: 'SerialNumber', label: 'S.No.' },
            { key: 'TripType', label: 'Type' },
            { key: 'TripNo', label: 'Trip No' },
            { key: 'TransactionDate', label: 'Date' },
            { key: 'VehicleNumber', label: 'Vehicle' },
            { key: 'VendorName', label: 'Vendor' },
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

export default AdhocTransactionForm;