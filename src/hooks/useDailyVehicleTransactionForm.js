import { useState, useEffect } from 'react';
import { vehicleTransactionAPI, customerAPI, vehicleAPI, driverAPI, projectAPI, vendorAPI, apiHelpers } from '../services/api';

// Date utility functions
const getCurrentDate = () => new Date().toISOString().split('T')[0];
const formatDateForInput = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toISOString().split('T')[0];
};

// Time utility functions for 12-hour format
const convertTo12Hour = (time24) => {
  if (!time24) return '';
  const [hours, minutes] = time24.split(':');
  const hour = parseInt(hours, 10);
  const minute = minutes || '00';
  if (hour === 0) return `12:${minute} AM`;
  else if (hour < 12) return `${hour}:${minute} AM`;
  else if (hour === 12) return `12:${minute} PM`;
  else return `${hour - 12}:${minute} PM`;
};

const convertTo24Hour = (time12) => {
  if (!time12) return '';
  const timeRegex = /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i;
  const match = time12.match(timeRegex);
  if (!match) return time12;
  let [, hours, minutes, period] = match;
  hours = parseInt(hours, 10);
  if (period.toUpperCase() === 'AM') {
    if (hours === 12) hours = 0;
  } else {
    if (hours !== 12) hours += 12;
  }
  return `${hours.toString().padStart(2, '0')}:${minutes}`;
};

// Form data persistence functions
const loadFormDataFromStorage = () => {
  try {
    const savedData = localStorage.getItem('dailyVehicleTransactionForm');
    return savedData ? JSON.parse(savedData) : null;
  } catch (error) {
    return null;
  }
};

const saveFormDataToStorage = (data) => {
  try {
    localStorage.setItem('dailyVehicleTransactionForm', JSON.stringify(data));
  } catch (error) {
    // Silent fail
  }
};

const clearFormDataFromStorage = () => {
  try {
    localStorage.removeItem('dailyVehicleTransactionForm');
  } catch (error) {
    // Silent fail
  }
};

// Initial state functions
const initializeMasterData = () => {
  const savedData = loadFormDataFromStorage();
  return savedData?.masterData || {
    Customer: '', CompanyName: '', GSTNo: '', Project: '', Location: '', CustSite: '',
    VehiclePlacementType: '', VehicleType: '', VehicleNo: [], VendorName: '', VendorCode: '',
    TypeOfTransaction: 'Fixed'
  };
};

const initializeTransactionData = () => {
  const savedData = loadFormDataFromStorage();
  return savedData?.transactionData || {
    DriverID: '', DriverMobileNo: '', TripNo: '', ReplacementDriverName: '', ReplacementDriverNo: '',
    ArrivalTimeAtHub: '', InTimeByCust: '', TotalShipmentsForDeliveries: '', TotalShipmentDeliveriesAttempted: '',
    TotalShipmentDeliveriesDone: '', VFreightFix: '', FixKm: '', VFreightVariable: '', TollExpenses: '',
    ParkingCharges: '', LoadingCharges: '', UnloadingCharges: '', OtherCharges: '', OtherChargesRemarks: '',
    Date: getCurrentDate(), OpeningKM: '', ClosingKM: '', TripNo: '', VehicleNumber: '', VendorName: '',
    VendorNumber: '', DriverName: '', DriverNumber: '', DriverAadharNumber: '', TotalExpenses: '',
    Revenue: '', Margin: '', MarginPercentage: '', TotalDutyHours: ''
  };
};

const initializeCalculatedData = () => {
  const savedData = loadFormDataFromStorage();
  return savedData?.calculatedData || {
    TotalKM: '', VFreightFix: '', TollExpenses: '', ParkingCharges: '', HandlingCharges: '',
    OutTimeFromHUB: '', TotalDutyHours: '', KilometerRate: '', KMCharges: ''
  };
};

export const useDailyVehicleTransactionForm = () => {
  // Master data (Grey Section)
  const [masterData, setMasterData] = useState(initializeMasterData);
  
  // State for multiple drivers (for Fixed type)
  const [selectedDrivers, setSelectedDrivers] = useState([]);
  
  // Daily transaction data (Blue Section)
  const [transactionData, setTransactionData] = useState(initializeTransactionData);
  
  // System calculations (Yellow Section)
  const [calculatedData, setCalculatedData] = useState(initializeCalculatedData);
  
  // Supervisor section (Orange Section)
  const [supervisorData, setSupervisorData] = useState({ Remarks: '', TripClose: false });
  
  // State for all file uploads
  const [files, setFiles] = useState({
    DriverAadharDoc: null, DriverLicenceDoc: null, TollExpensesDoc: null,
    ParkingChargesDoc: null, OpeningKMImage: null, ClosingKMImage: null
  });
  
  const [transactions, setTransactions] = useState([]);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  // Date filter state
  const [dateFilter, setDateFilter] = useState({ fromDate: '', toDate: '' });
  const [editingTransaction, setEditingTransaction] = useState(null);
  
  // Dropdown options
  const [customers, setCustomers] = useState([]);
  const [projects, setProjects] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [vendors, setVendors] = useState([]);
  
  // UI state for dropdowns
  const [isProjectDropdownVisible, setIsProjectDropdownVisible] = useState(false);
  const [availableProjects, setAvailableProjects] = useState([]);
  
  // Internal IDs to submit to API
  const [ids, setIds] = useState({ CustomerID: '', ProjectID: '', VendorID: '' });

  // Auto-save form data to localStorage whenever it changes
  useEffect(() => {
    const formData = { masterData, transactionData, calculatedData, supervisorData, selectedDrivers, timestamp: new Date().toISOString() };
    saveFormDataToStorage(formData);
  }, [masterData, transactionData, calculatedData, supervisorData, selectedDrivers]);

  // Load saved drivers on component mount
  useEffect(() => {
    const savedData = loadFormDataFromStorage();
    if (savedData?.selectedDrivers) {
      setSelectedDrivers(savedData.selectedDrivers);
    }
  }, []);

  useEffect(() => {
    fetchTransactions();
    loadDropdownOptions();
  }, []);

  // Auto-calculate total KM when opening/closing KM changes
  useEffect(() => {
    if (transactionData.OpeningKM && transactionData.ClosingKM) {
      const opening = parseFloat(transactionData.OpeningKM) || 0;
      const closing = parseFloat(transactionData.ClosingKM) || 0;
      const total = closing - opening;
      if (total >= 0) {
        setCalculatedData(prev => ({ ...prev, TotalKM: total.toString() }));
      }
    }
  }, [transactionData.OpeningKM, transactionData.ClosingKM]);

  // Auto-calculate Total Duty Hours for Adhoc/Replacement
  useEffect(() => {
    if ((masterData.TypeOfTransaction === 'Adhoc' || masterData.TypeOfTransaction === 'Replacement') &&
        transactionData.ArrivalTimeAtHub && transactionData.OutTimeFromHub) {
      try {
        const convertTimeForCalculation = (timeStr) => {
          if (!timeStr) return null;
          if (timeStr.match(/^\d{1,2}:\d{2}$/) && !timeStr.match(/AM|PM/i)) return `${timeStr}:00`;
          const time24 = convertTo24Hour(timeStr);
          return time24 ? `${time24}:00` : null;
        };

        const arrivalTime24 = convertTimeForCalculation(transactionData.ArrivalTimeAtHub);
        const outTime24 = convertTimeForCalculation(transactionData.OutTimeFromHub);

        if (arrivalTime24 && outTime24) {
          const arrivalTime = new Date(`2000-01-01T${arrivalTime24}`);
          const outTime = new Date(`2000-01-01T${outTime24}`);

          if (!isNaN(arrivalTime.getTime()) && !isNaN(outTime.getTime())) {
            let diffMs = arrivalTime - outTime;
            if (diffMs < 0) diffMs += 24 * 60 * 60 * 1000;
            const diffHours = diffMs / (1000 * 60 * 60);
            setTransactionData(prev => ({ ...prev, TotalDutyHours: diffHours.toFixed(2) }));
          }
        }
      } catch (error) {
        // Silent fail
      }
    }
  }, [transactionData.ArrivalTimeAtHub, transactionData.OutTimeFromHub, masterData.TypeOfTransaction]);

  // Auto-calculate Total Freight for Adhoc/Replacement
  useEffect(() => {
    if (masterData.TypeOfTransaction === 'Adhoc' || masterData.TypeOfTransaction === 'Replacement') {
      const vFreightFix = parseFloat(transactionData.VFreightFix) || 0;
      const vFreightVariable = parseFloat(transactionData.VFreightVariable) || 0;
      const totalKM = parseFloat(calculatedData.TotalKM) || 0;
      const fixKm = parseFloat(transactionData.FixKm) || 0;

      const variableKM = Math.max(0, totalKM - fixKm);
      const fixFreight = fixKm * vFreightFix;
      const variableFreight = variableKM * vFreightVariable;
      const totalFreight = fixFreight + variableFreight;
      setTransactionData(prev => ({ ...prev, TotalFreight: totalFreight.toFixed(2) }));
    }
  }, [transactionData.VFreightFix, transactionData.VFreightVariable, transactionData.FixKm, calculatedData.TotalKM, masterData.TypeOfTransaction]);

  // Auto-calculate Balance to be Paid for Adhoc/Replacement
  useEffect(() => {
    if (masterData.TypeOfTransaction === 'Adhoc' || masterData.TypeOfTransaction === 'Replacement') {
      const totalFreight = parseFloat(transactionData.TotalFreight) || 0;
      const advancePaid = parseFloat(transactionData.AdvancePaidAmount) || 0;
      const balance = totalFreight - advancePaid;
      setTransactionData(prev => ({ ...prev, BalanceToBePaid: balance.toFixed(2) }));
    }
  }, [transactionData.TotalFreight, transactionData.AdvancePaidAmount, masterData.TypeOfTransaction]);

  // Generate Advance Request Number for Adhoc/Replacement
  const generateAdvanceRequestNo = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    return `ARN-${year}${month}${day}-${hours}${minutes}${seconds}`;
  };

  // Auto-generate Advance Request No for Adhoc/Replacement
  useEffect(() => {
    if (masterData.TypeOfTransaction === 'Adhoc' || masterData.TypeOfTransaction === 'Replacement') {
      if (!transactionData.AdvanceRequestNo) {
        const advanceRequestNo = generateAdvanceRequestNo();
        setTransactionData(prev => ({ ...prev, AdvanceRequestNo: advanceRequestNo }));
      }
    } else if (masterData.TypeOfTransaction === 'Fixed') {
      if (transactionData.AdvanceRequestNo) {
        setTransactionData(prev => ({ ...prev, AdvanceRequestNo: '' }));
      }
    }
  }, [masterData.TypeOfTransaction, transactionData.AdvanceRequestNo]);

  // Auto-calculate Variance for Adhoc/Replacement
  useEffect(() => {
    if (masterData.TypeOfTransaction === 'Adhoc' || masterData.TypeOfTransaction === 'Replacement') {
      const balanceToBePaid = parseFloat(transactionData.BalanceToBePaid) || 0;
      const balancePaidAmount = parseFloat(transactionData.BalancePaidAmount) || 0;
      const variance = balanceToBePaid - balancePaidAmount;
      setTransactionData(prev => ({ ...prev, Variance: variance.toFixed(2) }));
    }
  }, [transactionData.BalanceToBePaid, transactionData.BalancePaidAmount, masterData.TypeOfTransaction]);

  // Auto-calculate Revenue, Margin, and Margin Percentage for Adhoc/Replacement
  useEffect(() => {
    if (masterData.TypeOfTransaction === 'Adhoc' || masterData.TypeOfTransaction === 'Replacement') {
      const totalFreight = parseFloat(transactionData.TotalFreight) || 0;
      const tollExpenses = parseFloat(transactionData.TollExpenses) || 0;
      const parkingCharges = parseFloat(transactionData.ParkingCharges) || 0;
      const loadingCharges = parseFloat(transactionData.LoadingCharges) || 0;
      const unloadingCharges = parseFloat(transactionData.UnloadingCharges) || 0;
      const otherCharges = parseFloat(transactionData.OtherCharges) || 0;

      const revenue = totalFreight;
      const totalExpenses = tollExpenses + parkingCharges + loadingCharges + unloadingCharges + otherCharges;
      const margin = revenue - totalExpenses;
      const marginPercentage = revenue > 0 ? (margin / revenue) * 100 : 0;

      setTransactionData(prev => ({
        ...prev,
        Revenue: revenue.toFixed(2),
        Margin: margin.toFixed(2),
        MarginPercentage: marginPercentage.toFixed(2),
        TotalExpenses: totalExpenses.toFixed(2)
      }));
    }
  }, [
    transactionData.TotalFreight, transactionData.TollExpenses, transactionData.ParkingCharges,
    transactionData.LoadingCharges, transactionData.UnloadingCharges, transactionData.OtherCharges,
    masterData.TypeOfTransaction
  ]);

  const loadDropdownOptions = async () => {
    try {
      const [customersRes, projectsRes, vehiclesRes, driversRes, vendorsRes] = await Promise.all([
        customerAPI.getAll(), projectAPI.getAll(), vehicleAPI.getAll(), driverAPI.getAll(), vendorAPI.getAll()
      ]);

      const customersData = customersRes.data.value || customersRes.data || [];
      const projectsData = projectsRes.data.value || projectsRes.data || [];
      const vehiclesData = vehiclesRes.data.data || vehiclesRes.data || [];
      const driversData = driversRes.data.value || driversRes.data || [];
      const vendorsData = vendorsRes.data.value || vendorsRes.data || [];

      setCustomers(customersData);
      setProjects(projectsData);
      setVehicles(vehiclesData);
      setDrivers(driversData);
      setVendors(vendorsData);
    } catch (error) {
      // Silent fail
    }
  };

  const fetchTransactions = async () => {
    setIsLoading(true);
    try {
      const queryParams = new URLSearchParams();
      if (dateFilter.fromDate) queryParams.append('fromDate', dateFilter.fromDate);
      if (dateFilter.toDate) queryParams.append('toDate', dateFilter.toDate);

      const queryString = queryParams.toString();
      const url = queryString ? `?${queryString}` : '';
      const response = await vehicleTransactionAPI.getAll(url);
      let transactionData = response.data.data || response.data.value || response.data || [];
      transactionData.sort((a, b) => b.TransactionID - a.TransactionID);
      setTransactions(transactionData);
    } catch (error) {
      apiHelpers.showError(error, 'Failed to fetch transactions');
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setMasterData({
      Customer: '', CompanyName: '', GSTNo: '', Project: '', Location: '', CustSite: '',
      VehiclePlacementType: '', VehicleType: '', VehicleNo: [], VendorName: '', VendorCode: '',
      TypeOfTransaction: 'Fixed'
    });
    setSelectedDrivers([]);
    setTransactionData({
      DriverID: '', DriverMobileNo: '', TripNo: '', ReplacementDriverName: '', ReplacementDriverNo: '',
      Date: getCurrentDate(), ArrivalTimeAtHub: '', InTimeByCust: '', OutTimeFromHub: '', OpeningKM: '',
      TotalDeliveries: '', TotalDeliveriesAttempted: '', TotalDeliveriesDone: '', ReturnReportingTime: '',
      ClosingKM: '', Remarks: '', TripNo: '', VehicleNumber: '', VendorName: '', VendorNumber: '',
      DriverName: '', DriverNumber: '', DriverAadharNumber: '', DriverLicenceNumber: '',
      TotalShipmentsForDeliveries: '', TotalShipmentDeliveriesAttempted: '', TotalShipmentDeliveriesDone: '',
      VFreightFix: '', FixKm: '', VFreightVariable: '', TollExpenses: '', ParkingCharges: '',
      LoadingCharges: '', UnloadingCharges: '', OtherCharges: '', OtherChargesRemarks: '',
      OutTimeFrom: '', TotalFreight: '', AdvanceRequestNo: '', AdvanceToPaid: '', AdvanceApprovedAmount: '',
      AdvanceApprovedBy: '', AdvancePaidAmount: '', AdvancePaidMode: '', AdvancePaidDate: '',
      AdvancePaidBy: '', EmployeeDetailsAdvance: '', BalanceToBePaid: '', BalancePaidAmount: '',
      Variance: '', BalancePaidDate: '', BalancePaidBy: '', EmployeeDetailsBalance: '',
      Revenue: '', Margin: '', MarginPercentage: '', TotalExpenses: '', TripClose: false
    });
    setCalculatedData({
      TotalKM: '', VFreightFix: '', TollExpenses: '', ParkingCharges: '', HandlingCharges: '',
      OutTimeFromHUB: '', TotalDutyHours: '', KilometerRate: '', KMCharges: ''
    });
    setSupervisorData({ Remarks: '', TripClose: false });
    setFiles({
      DriverAadharDoc: null, DriverLicenceDoc: null, TollExpensesDoc: null,
      ParkingChargesDoc: null, OpeningKMImage: null, ClosingKMImage: null
    });
    setEditingTransaction(null);
    setErrors({});
    clearFormDataFromStorage();
  };

  return {
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
  };
};
