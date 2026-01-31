import React, { useState, useEffect } from 'react';
import { vehicleTransactionAPI, adhocTransactionAPI, customerAPI, vehicleAPI, driverAPI, projectAPI, vendorAPI, apiHelpers } from '../services/api';
import DataTable from '../components/DataTable';

import SearchableDropdown from '../components/SearchableDropdown';
import DocumentUpload from '../components/DocumentUpload';

import TimeInput12Hour from '../components/TimeInput12Hour';

import { validateChronologicalTimes, calculateDutyHours, getTimeFieldsMetadata } from '../utils/timeValidation';

import './DailyVehicleTransactionForm.css';

// Date utility functions
const getCurrentDate = () => {
  return new Date().toISOString().split('T')[0];
};

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

// Time utility functions for 12-hour format
const convertTo12Hour = (time24) => {
  if (!time24) return '';

  const [hours, minutes] = time24.split(':');
  const hour = parseInt(hours, 10);
  const minute = minutes || '00';

  if (hour === 0) {
    return `12:${minute} AM`;
  } else if (hour < 12) {
    return `${hour}:${minute} AM`;
  } else if (hour === 12) {
    return `12:${minute} PM`;
  } else {
    return `${hour - 12}:${minute} PM`;
  }
};

const convertTo24Hour = (time12) => {
  if (!time12) return '';

  const timeRegex = /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i;
  const match = time12.match(timeRegex);

  if (!match) return time12; // Return as-is if format doesn't match

  let [, hours, minutes, period] = match;
  hours = parseInt(hours, 10);

  if (period.toUpperCase() === 'AM') {
    if (hours === 12) hours = 0;
  } else {
    if (hours !== 12) hours += 12;
  }

  return `${hours.toString().padStart(2, '0')}:${minutes}`;
};



const DailyVehicleTransactionForm = () => {
  // Form data persistence functions
  const loadFormDataFromStorage = () => {
    try {
      const savedData = localStorage.getItem('dailyVehicleTransactionForm');
      if (savedData) {
        const parsedData = JSON.parse(savedData);
        console.log('📂 STORAGE - Loading saved form data:', parsedData);
        return parsedData;
      }
    } catch (error) {
      console.error('📂 STORAGE - Error loading form data:', error);
    }
    return null;
  };

  // Save form data to localStorage
  const saveFormDataToStorage = (data) => {
    try {
      localStorage.setItem('dailyVehicleTransactionForm', JSON.stringify(data));
      console.log('💾 STORAGE - Form data saved to localStorage');
    } catch (error) {
      console.error('💾 STORAGE - Error saving form data:', error);
    }
  };

  // Clear form data from localStorage
  const clearFormDataFromStorage = () => {
    try {
      localStorage.removeItem('dailyVehicleTransactionForm');
      console.log('🗑️ STORAGE - Form data cleared from localStorage');
    } catch (error) {
      console.error('🗑️ STORAGE - Error clearing form data:', error);
    }
  };

  // Initialize state with saved data or defaults
  const initializeMasterData = () => {
    const savedData = loadFormDataFromStorage();
    return savedData?.masterData || {
      Customer: '',
      CompanyName: '',
      GSTNo: '',
      Project: '',
      Location: '',
      CustSite: '',
      VehiclePlacementType: '',
      VehicleType: '',
      VehicleNo: [], // Array for selected vehicle IDs
      VendorName: '',
      VendorCode: '',
      TypeOfTransaction: 'Fixed' // Default to Fixed
    };
  };

  const initializeTransactionData = () => {
    const savedData = loadFormDataFromStorage();
    return savedData?.transactionData || {
      DriverID: '',
      DriverMobileNo: '',
      TripNo: '',
      ReplacementDriverName: '',
      ReplacementDriverNo: '',
      ArrivalTimeAtHub: '',
      InTimeByCust: '',

      // New 6 Time Fields (Mandatory - Chronological Order)
      VehicleReportingAtHub: '',
      VehicleEntryInHub: '',
      VehicleOutFromHubForDelivery: '',
      VehicleReturnAtHub: '',
      VehicleEnteredAtHubReturn: '',
      VehicleOutFromHubFinal: '',

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
      Date: getCurrentDate(),
      OpeningKM: '',
      ClosingKM: '',
      // TripNo: '',
      VehicleNumber: '',
      VendorName: '',
      VendorNumber: '',
      DriverName: '',
      DriverNumber: '',
      DriverAadharNumber: '',
      TotalExpenses: '',
      Revenue: '',
      Margin: '',
      MarginPercentage: '',
      TotalDutyHours: ''
    };
  };

  const initializeCalculatedData = () => {
    const savedData = loadFormDataFromStorage();
    return savedData?.calculatedData || {
      TotalKM: '',
      VFreightFix: '',
      TollExpenses: '',
      ParkingCharges: '',
      HandlingCharges: '',
      OutTimeFromHUB: '',
      TotalDutyHours: '',
      KilometerRate: '',
      KMCharges: ''
    };
  };

  // Master data (Grey Section)
  const [masterData, setMasterData] = useState(initializeMasterData);



  // State for multiple drivers (for Fixed type)
  const [selectedDrivers, setSelectedDrivers] = useState([]);

  // Daily transaction data (Blue Section)
  const [transactionData, setTransactionData] = useState(initializeTransactionData);

  // System calculations (Yellow Section)
  const [calculatedData, setCalculatedData] = useState(initializeCalculatedData);

  // Supervisor section (Orange Section)
  const [supervisorData, setSupervisorData] = useState({
    Remarks: '',
    TripClose: false
  });

  // State for all file uploads (following Vendor Form pattern)
  const [files, setFiles] = useState({
    DriverAadharDoc: null,
    DriverLicenceDoc: null,
    TollExpensesDoc: null,
    ParkingChargesDoc: null,
    OpeningKMImage: null,
    ClosingKMImage: null
  });

  const [transactions, setTransactions] = useState([]);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Date filter state
  const [dateFilter, setDateFilter] = useState({
    fromDate: '',
    toDate: ''
  });

  // Date filter handlers
  const handleDateFilterApply = async () => {
    if (!dateFilter.fromDate || !dateFilter.toDate) {
      alert('Please select both From Date and To Date');
      return;
    }

    if (new Date(dateFilter.fromDate) > new Date(dateFilter.toDate)) {
      alert('From Date cannot be later than To Date');
      return;
    }

    console.log('🗓️ Applying date filter:', dateFilter);
    await fetchTransactions();
  };

  const handleDateFilterClear = async () => {
    setDateFilter({
      fromDate: '',
      toDate: ''
    });
    console.log('🗑️ Clearing date filter');
    await fetchTransactions();
  };
  const [editingTransaction, setEditingTransaction] = useState(null);

  // Dropdown options
  const [customers, setCustomers] = useState([]);
  const [projects, setProjects] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [vendors, setVendors] = useState([]);

  // UI state for dropdowns
  const [isProjectDropdownVisible, setIsProjectDropdownVisible] = useState(false);

  // State for project-based location filtering
  const [availableProjects, setAvailableProjects] = useState([]);


  // Internal IDs to submit to API (only single-value IDs, vehicles and drivers use arrays)
  const [ids, setIds] = useState({
    CustomerID: '',
    ProjectID: '',
    VendorID: '' // kept internally if needed by backend, but not shown on the form
  });

  // Auto-save form data to localStorage whenever it changes
  useEffect(() => {
    const formData = {
      masterData,
      transactionData,
      calculatedData,
      supervisorData,
      selectedDrivers,
      timestamp: new Date().toISOString()
    };
    saveFormDataToStorage(formData);
  }, [masterData, transactionData, calculatedData, supervisorData, selectedDrivers]);

  // Load saved drivers on component mount
  useEffect(() => {
    const savedData = loadFormDataFromStorage();
    if (savedData?.selectedDrivers) {
      setSelectedDrivers(savedData.selectedDrivers);
      console.log('📂 STORAGE - Restored selected drivers:', savedData.selectedDrivers);
    }
  }, []);

  useEffect(() => {
    fetchTransactions();
    loadDropdownOptions();
  }, []);

  // Trigger vendor selection after vendors are loaded and when editing
  useEffect(() => {
    if (editingTransaction && vendors.length > 0 && masterData.VendorName && !masterData.CompanyName) {
      console.log('🔧 Edit: Triggering vendor selection after vendors loaded, VendorID:', masterData.VendorName);
      const vendorSelectEvent = {
        target: {
          name: 'VendorName',
          value: masterData.VendorName
        }
      };
      handleMasterDataChange(vendorSelectEvent);
    }
  }, [editingTransaction, vendors, masterData.VendorName]);



  // Auto-calculate total KM when opening/closing KM changes
  useEffect(() => {
    if (transactionData.OpeningKM && transactionData.ClosingKM) {
      const opening = parseFloat(transactionData.OpeningKM) || 0;
      const closing = parseFloat(transactionData.ClosingKM) || 0;
      const total = closing - opening;
      console.log('🧮 Auto-calculating Total KM:', opening, '->', closing, '=', total);
      if (total >= 0) {
        setCalculatedData(prev => ({
          ...prev,
          TotalKM: total.toString()
        }));
      }
    }
  }, [transactionData.OpeningKM, transactionData.ClosingKM]);

  // DISABLED: Auto-calculate Total Duty Hours for Adhoc/Replacement
  // Now using unified calculation below for both Fixed and Adhoc/Replacement
  useEffect(() => {
    if ((masterData.TypeOfTransaction === 'Adhoc' || masterData.TypeOfTransaction === 'Replacement') &&
        transactionData.ArrivalTimeAtHub && transactionData.OutTimeFromHub) {

      try {
        // Convert 12-hour format to 24-hour format for calculation
        const convertTimeForCalculation = (timeStr) => {
          if (!timeStr) return null;

          // If it's already in 24-hour format (HH:MM), use as is
          if (timeStr.match(/^\d{1,2}:\d{2}$/) && !timeStr.match(/AM|PM/i)) {
            return `${timeStr}:00`;
          }

          // If it's in 12-hour format, convert to 24-hour
          const time24 = convertTo24Hour(timeStr);
          return time24 ? `${time24}:00` : null;
        };

        const arrivalTime24 = convertTimeForCalculation(transactionData.ArrivalTimeAtHub);
        const outTime24 = convertTimeForCalculation(transactionData.OutTimeFromHub);

        console.log('🧮 Adhoc/Replacement - Converted times - Arrival:', arrivalTime24, 'OutTime:', outTime24);

        if (arrivalTime24 && outTime24) {
          const arrivalTime = new Date(`2000-01-01T${arrivalTime24}`);
          const outTime = new Date(`2000-01-01T${outTime24}`);

          if (!isNaN(arrivalTime.getTime()) && !isNaN(outTime.getTime())) {
            // Fix: Calculate from OutTime to ArrivalTime (arrival - out)
            let diffMs = arrivalTime - outTime;

            // Handle case where arrival time is next day
            if (diffMs < 0) {
              diffMs += 24 * 60 * 60 * 1000; // Add 24 hours
            }

            const diffHours = diffMs / (1000 * 60 * 60);

            setTransactionData(prev => ({
              ...prev,
              TotalDutyHours: diffHours.toFixed(2)
            }));

            console.log('🧮 Adhoc/Replacement - Total Duty Hours calculated:', diffHours.toFixed(2));
            console.log('🧮 Adhoc/Replacement - OutTime:', outTime24, 'ArrivalTime:', arrivalTime24, 'Diff:', diffHours.toFixed(2), 'hours');
          }
        }
      } catch (error) {
        console.error('Error calculating duty hours:', error);
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

      // Calculate freight components
      const variableKM = Math.max(0, totalKM - fixKm);
      const fixFreight = fixKm * vFreightFix;           // Fix KM × V.Freight (Fix)
      const variableFreight = variableKM * vFreightVariable; // Variable KM × V.Freight (Variable)
      const totalFreight = fixFreight + variableFreight;

      console.log('🧮 ADHOC/REPLACEMENT Total Freight Calculation:', {
        totalKM,
        fixKm,
        variableKM,
        vFreightFix: `₹${vFreightFix}`,
        vFreightVariable: `₹${vFreightVariable}`,
        fixFreight: `${fixKm} × ₹${vFreightFix} = ₹${fixFreight}`,
        variableFreight: `${variableKM} × ₹${vFreightVariable} = ₹${variableFreight}`,
        totalFreight: `₹${fixFreight} + ₹${variableFreight} = ₹${totalFreight}`
      });

      setTransactionData(prev => ({
        ...prev,
        TotalFreight: totalFreight.toFixed(2)
      }));
    }
  }, [transactionData.VFreightFix, transactionData.VFreightVariable, transactionData.FixKm, calculatedData.TotalKM, masterData.TypeOfTransaction]);

  // Debug effect to track masterData.TypeOfTransaction changes
  useEffect(() => {
    console.log('🔄 RENDER DEBUG - masterData.TypeOfTransaction changed to:', masterData.TypeOfTransaction);
    console.log('🔄 RENDER DEBUG - editingTransaction:', editingTransaction ? editingTransaction.TransactionID : 'null');
    console.log('🔄 RENDER DEBUG - Form sections that should be visible:', {
      'Fixed sections': masterData.TypeOfTransaction === 'Fixed',
      'ADHOC/REPLACEMENT section': masterData.TypeOfTransaction === 'Adhoc' || masterData.TypeOfTransaction === 'Replacement'
    });
  }, [masterData.TypeOfTransaction, editingTransaction]);

  // Debug effect to track transactionData.TripNo changes
  useEffect(() => {
    console.log('🔄 TRIPNO DEBUG - transactionData.TripNo changed to:', transactionData.TripNo);
    console.log('🔄 TRIPNO DEBUG - Type:', typeof transactionData.TripNo);
    console.log('🔄 TRIPNO DEBUG - Length:', transactionData.TripNo ? transactionData.TripNo.length : 'undefined');
  }, [transactionData.TripNo]);

  // Auto-calculate Balance to be Paid for Adhoc/Replacement
  useEffect(() => {
    if (masterData.TypeOfTransaction === 'Adhoc' || masterData.TypeOfTransaction === 'Replacement') {
      const totalFreight = parseFloat(transactionData.TotalFreight) || 0;
      const advancePaid = parseFloat(transactionData.AdvancePaidAmount) || 0;
      const balance = totalFreight - advancePaid;

      setTransactionData(prev => ({
        ...prev,
        BalanceToBePaid: balance.toFixed(2)
      }));
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

    // Format: ARN-YYYYMMDD-HHMMSS (e.g., ARN-20241221-143052)
    return `ARN-${year}${month}${day}-${hours}${minutes}${seconds}`;
  };

  // Auto-generate Advance Request No for Adhoc/Replacement
  useEffect(() => {
    if (masterData.TypeOfTransaction === 'Adhoc' || masterData.TypeOfTransaction === 'Replacement') {
      // Generate new number if not already set
      if (!transactionData.AdvanceRequestNo) {
        const advanceRequestNo = generateAdvanceRequestNo();
        setTransactionData(prev => ({
          ...prev,
          AdvanceRequestNo: advanceRequestNo
        }));
        console.log('🔢 Auto-generated Advance Request No:', advanceRequestNo);
      }
    } else if (masterData.TypeOfTransaction === 'Fixed') {
      // Clear the field for Fixed transactions
      if (transactionData.AdvanceRequestNo) {
        setTransactionData(prev => ({
          ...prev,
          AdvanceRequestNo: ''
        }));
        console.log('🔢 Cleared Advance Request No for Fixed transaction');
      }
    }
  }, [masterData.TypeOfTransaction, transactionData.AdvanceRequestNo]);

  // Handle company selection for Adhoc/Replacement transactions
  const handleCompanySelect = async (e) => {
    const selectedCompanyId = e.target.value;
    console.log('🏢 ADHOC/REPLACEMENT - Company selection triggered:', selectedCompanyId);

    if (!selectedCompanyId) {
      console.log('🏢 ADHOC/REPLACEMENT - No company selected, clearing fields');
      setMasterData(prev => ({
        ...prev,
        CompanyName: '',
        Customer: '',
        GSTNo: '',
        Project: '',
        Location: ''
      }));
      setIds(prev => ({ ...prev, CustomerID: null, ProjectID: null }));
      setAvailableProjects([]);
      setIsProjectDropdownVisible(false);
      return;
    }

    const selectedCompany = customers.find(c => c.CustomerID == selectedCompanyId);
    console.log('🏢 ADHOC/REPLACEMENT - Found company:', selectedCompany);

    if (!selectedCompany) {
      console.error('🏢 ADHOC/REPLACEMENT - Company not found in customers list');
      return;
    }

    console.log('🏢 ADHOC/REPLACEMENT - Company selected:', selectedCompany);

    try {
      // Fetch data using proper API services
      const [customerResponse, projectsResponse] = await Promise.all([
        // Fetch customer details for GST No
        customerAPI.getById(selectedCompanyId),
        // Fetch projects for this customer
        projectAPI.getByCustomer(selectedCompanyId)
      ]);

      console.log('🏢 ADHOC/REPLACEMENT - Customer API response:', customerResponse);
      console.log('🏢 ADHOC/REPLACEMENT - Projects API response:', projectsResponse);

      // Extract customer info (GST No from Customer Master)
      const customerInfo = customerResponse.data || selectedCompany;
      const gstNo = customerInfo.GSTNo || '';

      // Extract project info and implement dynamic project field logic
      const projectsData = projectsResponse.data?.data || [];
      console.log('🏢 ADHOC/REPLACEMENT - Projects found:', projectsData.length);

      // Set available projects for dropdown
      setAvailableProjects(projectsData);

      let projectName = '';
      let location = '';
      let projectId = null;

      if (projectsData.length === 1) {
        // Single project - auto-select and show as readonly
        const project = projectsData[0];
        projectName = project.ProjectName || '';
        location = project.Location || '';
        projectId = project.ProjectID;
        setIsProjectDropdownVisible(false);
        console.log('✅ ADHOC/REPLACEMENT - Single project auto-selected:', projectName);
      } else if (projectsData.length > 1) {
        // Multiple projects - show dropdown for selection
        setIsProjectDropdownVisible(true);
        console.log('📋 ADHOC/REPLACEMENT - Multiple projects available, showing dropdown');
      } else {
        // No projects
        setIsProjectDropdownVisible(false);
        console.log('❌ ADHOC/REPLACEMENT - No projects found for customer');
      }

      // Update master data with fetched information
      setMasterData(prev => ({
        ...prev,
        CompanyName: selectedCompany.Name || selectedCompany.MasterCustomerName || '',
        Customer: selectedCompanyId,
        GSTNo: gstNo,
        Project: projectName,
        Location: location,
        CustSite: location // Use CustSite for validation
      }));

      // Update IDs
      setIds(prev => ({
        ...prev,
        CustomerID: selectedCompanyId,
        ProjectID: projectId
      }));

      console.log('✅ ADHOC/REPLACEMENT - Auto-populated data:', {
        CompanyName: selectedCompany.Name || selectedCompany.MasterCustomerName,
        GSTNo: gstNo,
        Project: projectName,
        Location: location,
        ProjectsCount: projectsData.length,
        IsDropdownVisible: projectsData.length > 1
      });

    } catch (error) {
      console.error('🏢 ADHOC/REPLACEMENT - Error fetching company data:', error);

      // Fallback to basic company info from dropdown data
      setMasterData(prev => ({
        ...prev,
        CompanyName: selectedCompany.Name || selectedCompany.MasterCustomerName || '',
        Customer: selectedCompanyId,
        GSTNo: selectedCompany.GSTNo || '',
        Project: '',
        Location: '',
        CustSite: selectedCompany.Locations || ''
      }));

      setIds(prev => ({
        ...prev,
        CustomerID: selectedCompanyId,
        ProjectID: null
      }));

      setAvailableProjects([]);
      setIsProjectDropdownVisible(false);

      console.log('🏢 ADHOC/REPLACEMENT - Fallback to dropdown data');
    }
  };

  // Auto-calculate Variance for Adhoc/Replacement
  useEffect(() => {
    if (masterData.TypeOfTransaction === 'Adhoc' || masterData.TypeOfTransaction === 'Replacement') {
      const balanceToBePaid = parseFloat(transactionData.BalanceToBePaid) || 0;
      const balancePaidAmount = parseFloat(transactionData.BalancePaidAmount) || 0;
      const variance = balanceToBePaid - balancePaidAmount;

      setTransactionData(prev => ({
        ...prev,
        Variance: variance.toFixed(2)
      }));
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

      // Revenue = Total Freight
      const revenue = totalFreight;

      // Total Expenses
      const totalExpenses = tollExpenses + parkingCharges + loadingCharges + unloadingCharges + otherCharges;

      // Margin = Revenue - Total Expenses
      const margin = revenue - totalExpenses;

      // Margin Percentage = (Margin / Revenue) * 100
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
    transactionData.TotalFreight,
    transactionData.TollExpenses,
    transactionData.ParkingCharges,
    transactionData.LoadingCharges,
    transactionData.UnloadingCharges,
    transactionData.OtherCharges,
    masterData.TypeOfTransaction
  ]);

  // Auto-calculate Total Expenses for Fixed transactions (includes all charges)
  useEffect(() => {
    console.log('🧮 EXPENSE CALCULATION TRIGGERED - TypeOfTransaction:', masterData.TypeOfTransaction);

    if (masterData.TypeOfTransaction === 'Fixed') {
      // For Fixed transactions, expense fields are in calculatedData
      const tollExpenses = parseFloat(calculatedData.TollExpenses) || 0;
      const parkingCharges = parseFloat(calculatedData.ParkingCharges) || 0;
      const handlingCharges = parseFloat(calculatedData.HandlingCharges) || 0;
      const totalKM = parseFloat(calculatedData.TotalKM) || 0;

      // Use V. FREIGHT (FIX) value for KM rate calculation
      const vFreightFix = parseFloat(calculatedData.VFreightFix) || 0;

      // Calculate KM charges based on V. FREIGHT (FIX) value
      const kmCharges = totalKM * vFreightFix;

      // Total Expenses for Fixed transactions = All charges + KM charges
      const totalExpenses = tollExpenses + parkingCharges + handlingCharges + kmCharges;

      console.log('🧮 Fixed Auto-calculation:', {
        tollExpenses,
        parkingCharges,
        handlingCharges,
        totalKM,
        vFreightFix: `₹${vFreightFix}/KM`,
        kmCharges,
        totalExpenses,
        breakdown: `₹${tollExpenses} + ₹${parkingCharges} + ₹${handlingCharges} + ₹${kmCharges} = ₹${totalExpenses}`
      });

      setTransactionData(prev => ({
        ...prev,
        TotalExpenses: totalExpenses.toFixed(2)
      }));

      // Store KM charges in calculated data for reference
      setCalculatedData(prev => ({
        ...prev,
        KMCharges: kmCharges.toFixed(2)
      }));
    }
  }, [
    calculatedData.TollExpenses,
    calculatedData.ParkingCharges,
    calculatedData.HandlingCharges,
    calculatedData.TotalKM,
    calculatedData.VFreightFix,
    masterData.TypeOfTransaction
  ]);


  // Note: DriverID sync removed as we now use DriverIDs array instead of single DriverID in ids state

  // Calculate total duty hours - Works for both Fixed and Adhoc/Replacement transactions
  // Calculates from OutTimeFromHub to ArrivalTimeAtHub
  useEffect(() => {
    console.log('🧮 UNIFIED DUTY HOURS CALCULATION TRIGGERED');
    console.log('🧮 transactionData.OutTimeFromHub:', transactionData.OutTimeFromHub);
    console.log('🧮 calculatedData.OutTimeFromHUB:', calculatedData.OutTimeFromHUB);
    console.log('🧮 transactionData.ArrivalTimeAtHub:', transactionData.ArrivalTimeAtHub);
    console.log('🧮 Transaction Type:', masterData.TypeOfTransaction);

    // Check both locations for OutTime (different field names used in different sections)
    const outTimeFromTransaction = transactionData.OutTimeFromHub?.toString().trim();
    const outTimeFromCalculated = calculatedData.OutTimeFromHUB?.toString().trim();
    const outTime = outTimeFromTransaction || outTimeFromCalculated;

    const arrivalTime = transactionData.ArrivalTimeAtHub?.toString().trim();

    console.log('🧮 Final values - outTime:', outTime, 'arrivalTime:', arrivalTime);

    if (outTime && arrivalTime && outTime !== '' && arrivalTime !== '') {
      console.log('🧮 Both times available, starting calculation...');
      try {
        // Enhanced time parsing function
        const parseTimeToMinutes = (timeStr) => {
          if (!timeStr) return null;

          console.log('🧮 Parsing time:', timeStr);

          // Handle different time formats
          let hours = 0, minutes = 0;

          // Remove any extra spaces and normalize
          timeStr = timeStr.toString().trim();

          // Check if it's in 12-hour format with AM/PM (handle space variations)
          const ampmMatch = timeStr.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
          if (ampmMatch) {
            hours = parseInt(ampmMatch[1]);
            minutes = parseInt(ampmMatch[2]);
            const period = ampmMatch[3].toUpperCase();

            console.log('🧮 12-hour format detected:', hours, ':', minutes, period);

            if (period === 'PM' && hours !== 12) {
              hours += 12;
            } else if (period === 'AM' && hours === 12) {
              hours = 0;
            }
          }
          // Check if it's in HH:MM format (24-hour)
          else if (timeStr.match(/^\d{1,2}:\d{2}$/)) {
            const [h, m] = timeStr.split(':');
            hours = parseInt(h);
            minutes = parseInt(m);
            console.log('🧮 24-hour format detected:', hours, ':', minutes);
          }

          const totalMinutes = hours * 60 + minutes;
          console.log('🧮 Parsed time:', timeStr, '→', hours + ':' + minutes.toString().padStart(2, '0'), '→', totalMinutes, 'minutes');
          console.log('🧮 Debug - Original timeStr:', JSON.stringify(timeStr), 'Type:', typeof timeStr);
          console.log('🧮 Debug - Final hours:', hours, 'minutes:', minutes, 'totalMinutes:', totalMinutes);
          return totalMinutes;
        };

        const outMinutes = parseTimeToMinutes(outTime);
        const arrivalMinutes = parseTimeToMinutes(arrivalTime);

        console.log('🧮 Parsed times - OutTimeFromHub:', outMinutes, 'minutes, ArrivalTimeAtHub:', arrivalMinutes, 'minutes');

        if (outMinutes !== null && arrivalMinutes !== null) {
          let diffMinutes = arrivalMinutes - outMinutes;

          // Handle overnight shifts (out time is next day)
          if (diffMinutes < 0) {
            diffMinutes += 24 * 60; // Add 24 hours in minutes
            console.log('🧮 Overnight shift detected, adding 24 hours');
          }

          const dutyHours = diffMinutes / 60;
          const dutyHoursValue = dutyHours.toFixed(2);

          console.log('🧮 Auto-calculating Total Duty Hours:');
          console.log('🧮 OutTimeFromHub:', outTime, '(', outMinutes, 'minutes)');
          console.log('🧮 ArrivalTimeAtHub:', arrivalTime, '(', arrivalMinutes, 'minutes)');
          console.log('🧮 Difference:', diffMinutes, 'minutes =', dutyHoursValue, 'hours');

          // Update both calculatedData and transactionData
          setCalculatedData(prev => ({
            ...prev,
            TotalDutyHours: dutyHoursValue
          }));

          setTransactionData(prev => ({
            ...prev,
            TotalDutyHours: dutyHoursValue
          }));
        } else {
          console.error('🧮 Invalid time format for duty hours calculation');
        }
      } catch (error) {
        console.error('🧮 Error calculating duty hours:', error);
      }
    }
  }, [transactionData.OutTimeFromHub, calculatedData.OutTimeFromHUB, transactionData.ArrivalTimeAtHub, masterData.TypeOfTransaction]);

  // NEW: Calculate duty hours using the 6 new time fields
  // Calculates from VehicleReportingAtHub (Time 1) to VehicleOutFromHubFinal (Time 6)
  useEffect(() => {
    const startTime = transactionData.VehicleReportingAtHub;
    const endTime = transactionData.VehicleOutFromHubFinal;

    if (startTime && endTime) {
      console.log('🧮 NEW TIME FIELDS - Calculating duty hours from:', startTime, 'to:', endTime);

      const dutyHours = calculateDutyHours(startTime, endTime);

      if (dutyHours !== null) {
        console.log('🧮 NEW TIME FIELDS - Calculated duty hours:', dutyHours);

        // Update both calculatedData and transactionData
        setCalculatedData(prev => ({
          ...prev,
          TotalDutyHours: dutyHours.toString()
        }));

        setTransactionData(prev => ({
          ...prev,
          TotalDutyHours: dutyHours.toString()
        }));
      }
    }
  }, [transactionData.VehicleReportingAtHub, transactionData.VehicleOutFromHubFinal]);

  // NEW: Real-time chronological validation for the 6 time fields
  // Validates immediately as user enters/changes time fields
  useEffect(() => {
    // Get all 6 time field values
    const timeFields = [
      transactionData.VehicleReportingAtHub,
      transactionData.VehicleEntryInHub,
      transactionData.VehicleOutFromHubForDelivery,
      transactionData.VehicleReturnAtHub,
      transactionData.VehicleEnteredAtHubReturn,
      transactionData.VehicleOutFromHubFinal
    ];

    // Only validate if at least one time field has a value
    const hasAnyTimeValue = timeFields.some(time => time && time.trim() !== '');

    if (hasAnyTimeValue) {
      console.log('⏰ REAL-TIME VALIDATION - Validating chronological order of time fields');

      // Run chronological validation
      const chronologicalErrors = validateChronologicalTimes(transactionData);

      // Get the list of time field names
      const timeFieldNames = [
        'VehicleReportingAtHub',
        'VehicleEntryInHub',
        'VehicleOutFromHubForDelivery',
        'VehicleReturnAtHub',
        'VehicleEnteredAtHubReturn',
        'VehicleOutFromHubFinal'
      ];

      // Update errors state - only update time field errors, preserve other errors
      setErrors(prevErrors => {
        const newErrors = { ...prevErrors };

        // Clear all previous time field errors
        timeFieldNames.forEach(fieldName => {
          delete newErrors[fieldName];
        });

        // Add new chronological errors
        Object.assign(newErrors, chronologicalErrors);

        console.log('⏰ REAL-TIME VALIDATION - Updated errors:', newErrors);

        return newErrors;
      });
    } else {
      // If no time fields have values, clear all time field errors
      setErrors(prevErrors => {
        const newErrors = { ...prevErrors };
        const timeFieldNames = [
          'VehicleReportingAtHub',
          'VehicleEntryInHub',
          'VehicleOutFromHubForDelivery',
          'VehicleReturnAtHub',
          'VehicleEnteredAtHubReturn',
          'VehicleOutFromHubFinal'
        ];

        timeFieldNames.forEach(fieldName => {
          delete newErrors[fieldName];
        });

        return newErrors;
      });
    }
  }, [
    transactionData.VehicleReportingAtHub,
    transactionData.VehicleEntryInHub,
    transactionData.VehicleOutFromHubForDelivery,
    transactionData.VehicleReturnAtHub,
    transactionData.VehicleEnteredAtHubReturn,
    transactionData.VehicleOutFromHubFinal
  ]);

  const loadDropdownOptions = async () => {
    try {
      const [customersRes, projectsRes, vehiclesRes, driversRes, vendorsRes] = await Promise.all([
        customerAPI.getAll(),
        projectAPI.getAll(),
        vehicleAPI.getAll(),
        driverAPI.getAll(),
        vendorAPI.getAll()
      ]);

      // Handle different response formats
      const customersData = customersRes.data.value || customersRes.data || [];
      const projectsData = projectsRes.data.value || projectsRes.data || [];
      const vehiclesData = vehiclesRes.data.data || vehiclesRes.data || [];
      const driversData = driversRes.data.value || driversRes.data || [];
      const vendorsData = vendorsRes.data.value || vendorsRes.data || [];

      console.log('🏢 Loaded customers data:', customersData.slice(0, 3)); // Show first 3 customers for debugging
      console.log('🏢 Total customers loaded:', customersData.length);

      setCustomers(customersData);
      setProjects(projectsData);
      setVehicles(vehiclesData);
      setDrivers(driversData);
      setVendors(vendorsData);



    } catch (error) {
      console.error('Error loading dropdown options:', error);
    }
  };

  const fetchTransactions = async () => {
    setIsLoading(true);
    try {
      // Build query parameters for date filtering
      const queryParams = new URLSearchParams();
      if (dateFilter.fromDate) {
        queryParams.append('fromDate', dateFilter.fromDate);
      }
      if (dateFilter.toDate) {
        queryParams.append('toDate', dateFilter.toDate);
      }

      const queryString = queryParams.toString();
      const url = queryString ? `?${queryString}` : '';

      console.log('🗓️ Fetching transactions with date filter:', { fromDate: dateFilter.fromDate, toDate: dateFilter.toDate });

      const response = await vehicleTransactionAPI.getAll(url);
      let transactionData = response.data.data || response.data.value || response.data || [];

      console.log('📊 Frontend: Received transaction data:', transactionData.length, 'records');
      console.log('📊 Frontend: Transaction types breakdown:',
        transactionData.reduce((acc, t) => {
          acc[t.TripType] = (acc[t.TripType] || 0) + 1;
          return acc;
        }, {})
      );
      console.log('📊 Frontend: Sample transactions:', transactionData.slice(0, 3).map(t => ({
        ID: t.TransactionID,
        Type: t.TripType,
        Customer: t.CustomerName
      })));

      // Sort by TransactionID descending to show latest first
      transactionData.sort((a, b) => b.TransactionID - a.TransactionID);

      setTransactions(transactionData);
    } catch (error) {
      apiHelpers.showError(error, 'Failed to fetch transactions');
    } finally {
      setIsLoading(false);
    }
  };

  // Function to fetch linked data through hierarchy for Fixed transactions
  const fetchLinkedDataForFixedTransaction = async (customerID, autoPopulatedData) => {
    try {
      console.log('🔗 Fetching linked data for customer:', customerID);

      // Step 1: Get projects for this customer
      console.log('📋 Fetching projects for customer...');
      const projectsRes = await projectAPI.getByCustomer(customerID);
      console.log('📋 Projects response:', projectsRes);
      const customerProjects = projectsRes.data || [];
      console.log('📋 Customer projects found:', customerProjects.length);

      if (customerProjects.length === 0) {
        console.log('❌ No projects found for customer');
        autoPopulatedData.Project = 'N/A';
        setMasterData(prev => ({ ...prev, ...autoPopulatedData }));
        return;
      }

      // For now, take the first project (you can enhance this later for multiple projects)
      const project = customerProjects[0];
      autoPopulatedData.Project = project.ProjectName || 'N/A';

      console.log('✅ Found project:', project.ProjectName);

      // Step 2: Find vendor linked to this project (through project table or separate linking)
      // For now, we'll get all vendors and find one linked to this customer/project
      console.log('🏢 Fetching vendors...');
      const vendorsRes = await vendorAPI.getAll();
      const allVendors = vendorsRes.data.value || vendorsRes.data || [];
      console.log('🏢 Vendors found:', allVendors.length);

      // Step 3: Find vehicles linked to the vendor
      console.log('🚛 Fetching vehicles...');
      const vehiclesRes = await vehicleAPI.getAll();
      const allVehicles = vehiclesRes.data.data || vehiclesRes.data || [];
      console.log('🚛 Vehicles found:', allVehicles.length);

      // Step 4: Find drivers linked to the vehicle/vendor
      console.log('👨‍💼 Fetching drivers...');
      const driversRes = await driverAPI.getAll();
      const allDrivers = driversRes.data.value || driversRes.data || [];
      console.log('👨‍💼 Drivers found:', allDrivers.length);

      // For now, we'll use the first available vendor, vehicle, and driver
      // You can enhance this logic based on your specific linking requirements
      if (allVendors.length > 0) {
        const vendor = allVendors[0];
        autoPopulatedData.VendorName = vendor.VendorID;

        // Find vehicles for this vendor
        const vendorVehicles = allVehicles.filter(v => v.VendorID === vendor.VendorID);
        if (vendorVehicles.length > 0) {
          const vehicle = vendorVehicles[0];
          autoPopulatedData.VehicleNo = vehicle.VehicleID;
          autoPopulatedData.VehicleType = vehicle.VehicleType || 'N/A';

          // Find drivers for this vendor
          const vendorDrivers = allDrivers.filter(d => d.VendorID === vendor.VendorID);
          if (vendorDrivers.length > 0) {
            const driver = vendorDrivers[0];

            // Set IDs for submission
            setIds(prev => ({
              ...prev,
              ProjectID: project.ProjectID,
              VendorID: vendor.VendorID,
              VehicleID: vehicle.VehicleID,
              DriverID: driver.DriverID
            }));

            // Set driver in transaction data
            setTransactionData(prev => ({
              ...prev,
              DriverID: driver.DriverID
            }));

            console.log('✅ Auto-populated hierarchy:', {
              project: project.ProjectName,
              vendor: vendor.VendorName,
              vehicle: vehicle.VehicleRegistrationNo,
              driver: driver.DriverName
            });
          }
        }
      }

      // Update master data with all auto-populated fields
      setMasterData(prev => ({
        ...prev,
        ...autoPopulatedData
      }));

      // Update projects dropdown
      setProjects(customerProjects);
      setAvailableProjects(customerProjects); // Store projects for location lookup
      setIsProjectDropdownVisible(customerProjects.length > 1);

    } catch (error) {
      console.error('❌ Error fetching linked data:', error);
      // Fallback to basic customer data
      setMasterData(prev => ({
        ...prev,
        ...autoPopulatedData
      }));
    }
  };

  // Handler for Trip Number input (allows alphanumeric and special characters)
  const handleTripNumberChange = (e) => {
    const value = e.target.value;

    // Allow any alphanumeric and special characters
    // Maximum length of 50 characters (as per database schema: varchar(50))
    if (value.length <= 50) {
      setTransactionData(prev => ({
        ...prev,
        TripNumber: value
      }));
    }
  };

  // Handler for project selection - automatically populate location
  const handleProjectSelection = async (e) => {
    const selectedProjectId = e.target.value;
    console.log('🏗️ PROJECT SELECTION - Selected project ID:', selectedProjectId);

    if (!selectedProjectId) {
      setMasterData(prev => ({
        ...prev,
        Project: '',
        Location: ''
      }));
      setIds(prev => ({ ...prev, ProjectID: '' }));
      return;
    }

    try {
      // Find the selected project from available projects
      const selectedProject = availableProjects.find(p => p.ProjectID == selectedProjectId);

      if (selectedProject) {
        console.log('🏗️ PROJECT SELECTION - Found project:', selectedProject);

        // Update master data with project name and location
        setMasterData(prev => ({
          ...prev,
          Project: selectedProject.ProjectName,
          Location: selectedProject.Location || '', // Auto-populate location from project
          CustSite: selectedProject.Location || '' // Also update CustSite for validation
        }));

        // Update project ID for submission
        setIds(prev => ({ ...prev, ProjectID: selectedProjectId }));

        console.log('✅ PROJECT SELECTION - Auto-populated location:', selectedProject.Location);
      }
    } catch (error) {
      console.error('❌ PROJECT SELECTION - Error:', error);
    }
  };

  // Handler for driver auto-population (populates driver number)
  const handleDriverAutoPopulate = (e) => {
    const selectedDriverId = e.target.value;

    if (!selectedDriverId) {
      setTransactionData(prev => ({
        ...prev,
        DriverID: '',
        DriverMobileNo: ''
      }));
      // Clear selectedDrivers for Fixed transactions
      if (masterData.TypeOfTransaction === 'Fixed') {
        setSelectedDrivers([]);
      }
      return;
    }

    // Find the selected driver
    const selectedDriver = drivers.find(d => d.DriverID == selectedDriverId);
    if (selectedDriver) {
      setTransactionData(prev => ({
        ...prev,
        DriverID: selectedDriverId,
        DriverMobileNo: selectedDriver.DriverMobileNo || selectedDriver.MobileNo || ''
      }));

      // For Fixed transactions, also update selectedDrivers array
      if (masterData.TypeOfTransaction === 'Fixed') {
        const driverTag = {
          id: selectedDriverId,
          name: selectedDriver.DriverName || 'Unknown Driver',
          mobile: selectedDriver.DriverMobileNo || selectedDriver.MobileNo || 'N/A'
        };

        // Check if driver is already selected
        if (!selectedDrivers.some(d => d.id === selectedDriverId)) {
          setSelectedDrivers([driverTag]); // Replace with single driver for now
          console.log('👨‍💼 Driver added to selectedDrivers:', driverTag);
        }
      }

      console.log('✅ Driver Auto-Populate - Driver selected:', selectedDriver.DriverName, selectedDriver.DriverMobileNo);
    }
  };

  // Handler for vehicle auto-population (Phase 2 - primary vehicle selection)
  const handleVehicleAutoPopulate = async (e) => {
    const selectedVehicleId = e.target.value;
    if (!selectedVehicleId) return;

    console.log('🚗 Vehicle Auto-Populate - Selected Vehicle ID:', selectedVehicleId);

    try {
      // Find the vehicle details from the vehicles array
      const vehicle = vehicles.find(v => v.VehicleID == selectedVehicleId);
      if (!vehicle) {
        console.error('🚗 Vehicle not found in vehicles array');
        return;
      }

      console.log('🚗 Vehicle Auto-Populate - Vehicle found:', vehicle);

      // Fetch complete vehicle details from API
      const vehicleResponse = await vehicleAPI.getById(selectedVehicleId);
      const vehicleDetails = vehicleResponse.data || vehicleResponse;

      console.log('🚗 Vehicle Auto-Populate - Complete vehicle details:', vehicleDetails);

      // Initialize auto-populated data with vehicle info
      const autoPopulatedData = {
        VehicleNo: [selectedVehicleId],
        VehicleType: vehicleDetails.VehicleType || vehicle.VehicleType || '',
        VehiclePlacementType: 'Fixed' // Default for vehicle-based selection
      };

      // Step 1: Get Vendor information from vehicle
      let vendorData = null;
      if (vehicleDetails.VendorID || vehicleDetails.vendor_id) {
        const vendorId = vehicleDetails.VendorID || vehicleDetails.vendor_id;
        console.log('🚗 Fetching vendor data for ID:', vendorId);

        try {
          const vendorResponse = await vendorAPI.getAll();
          const vendorsData = vendorResponse.data?.value || vendorResponse.data || [];
          vendorData = vendorsData.find(v => v.VendorID == vendorId);

          if (vendorData) {
            autoPopulatedData.VendorName = vendorData.VendorName || '';
            autoPopulatedData.VendorCode = vendorData.VendorCode || '';
            console.log('✅ Vendor data found:', vendorData.VendorName);
          }
        } catch (error) {
          console.error('❌ Error fetching vendor data:', error);
        }
      }

      // Step 2: Get Project information (from vehicle or vendor)
      let projectData = null;
      const projectId = vehicleDetails.ProjectID || vehicleDetails.project_id || vendorData?.project_id;

      if (projectId) {
        console.log('🚗 Fetching project data for ID:', projectId);

        try {
          const projectResponse = await projectAPI.getAll();
          const projectsData = projectResponse.data?.value || projectResponse.data || [];
          projectData = projectsData.find(p => p.ProjectID == projectId);

          if (projectData) {
            autoPopulatedData.Project = projectData.ProjectName; // Use project name for display
            console.log('✅ Project data found:', projectData.ProjectName);

            // Get exact location from project (try multiple possible field names)
            const projectLocation = projectData.Location || projectData.LocationName || projectData.LocationID || projectData.ProjectLocation || projectData.SiteLocation;
            if (projectLocation) {
              autoPopulatedData.CustSite = projectLocation;
              autoPopulatedData.Location = projectLocation; // Also set Location field
              console.log('✅ Project location found:', projectLocation);
              console.log('🔍 Project data fields:', Object.keys(projectData));
            } else {
              console.log('⚠️ No location found in project data');
              console.log('🔍 Available project fields:', Object.keys(projectData));
              console.log('🔍 Full project data:', projectData);
            }
          }
        } catch (error) {
          console.error('❌ Error fetching project data:', error);
        }
      }

      // Step 3: Get Customer information (from project)
      let customerData = null;
      const customerId = projectData?.CustomerID || vehicleDetails.CustomerID || vehicleDetails.customer_id;

      if (customerId) {
        console.log('🚗 Fetching customer data for ID:', customerId);

        try {
          const customerResponse = await customerAPI.getAll();
          const customersData = customerResponse.data?.value || customerResponse.data || [];
          customerData = customersData.find(c => c.CustomerID == customerId);

          if (customerData) {
            autoPopulatedData.Customer = customerData.Name || ''; // Use name for readonly field
            autoPopulatedData.CompanyName = customerData.Name || '';
            autoPopulatedData.GSTNo = customerData.GSTNo || '';
            console.log('✅ Customer data found:', customerData.Name);
          }
        } catch (error) {
          console.error('❌ Error fetching customer data:', error);
        }
      }

      console.log('🚗 Vehicle Auto-Populate - Final auto-populated data:', autoPopulatedData);

      // Update master data
      setMasterData(prev => ({
        ...prev,
        ...autoPopulatedData
      }));

      // Update IDs for submission
      setIds(prev => ({
        ...prev,
        CustomerID: customerData?.CustomerID || '',
        ProjectID: projectData?.ProjectID || '',
        VendorID: vendorData?.VendorID || '',
        VehicleID: selectedVehicleId
      }));



      // Step 4: Get Driver information from vehicle (for Fixed transactions only)
      if (masterData.TypeOfTransaction === 'Fixed') {
        // Use driver info from the vehicle object (from vehicles array) which includes driver details
        const driverId = vehicle.DriverID || vehicle.driver_id;
        const driverName = vehicle.DriverName || '';

        console.log('🚗 Checking vehicle for assigned driver - ID:', driverId, 'Name:', driverName);

        if (driverId) {
          // Try to get mobile number from driver API
          let driverMobileNo = '';

          try {
            const driverResponse = await driverAPI.getAll();
            const driversData = driverResponse.data?.value || driverResponse.data || [];
            const driverData = driversData.find(d => d.DriverID == driverId);

            if (driverData) {
              driverMobileNo = driverData.DriverMobileNo || '';
              console.log('✅ Driver mobile found:', driverMobileNo);
            } else {
              console.log('⚠️ Driver not found in drivers list');
            }
          } catch (error) {
            console.error('❌ Error fetching driver mobile:', error);
          }

          // Update transaction data with driver information
          console.log('🚗 Setting driver data - ID:', driverId, 'Mobile:', driverMobileNo);
          setTransactionData(prev => ({
            ...prev,
            DriverID: driverId || '',
            DriverMobileNo: driverMobileNo || ''
          }));
        } else {
          console.log('⚠️ No driver assigned to this vehicle');
        }
      }

      console.log('✅ Vehicle Auto-Populate - Complete with all related data');

    } catch (error) {
      console.error('❌ Vehicle Auto-Populate - Error:', error);
    }
  };

  // Handler for vehicle selection (single select that adds to tags)
  const handleVehicleSelect = (e) => {
    const selectedVehicleId = e.target.value;
    if (!selectedVehicleId) return;

    // Find the vehicle details
    const vehicle = vehicles.find(v => v.VehicleID == selectedVehicleId);
    if (!vehicle) return;

    // Check if vehicle is already selected
    if (masterData.VehicleNo.includes(selectedVehicleId)) {
      console.log('🚛 Vehicle already selected');
      return;
    }

    // Add to selected vehicles
    const newVehicleIds = [...masterData.VehicleNo, selectedVehicleId];
    const newVehicleTag = {
      id: selectedVehicleId,
      registrationNo: vehicle.VehicleRegistrationNo,
      type: vehicle.VehicleType
    };

    setMasterData(prev => ({
      ...prev,
      VehicleNo: newVehicleIds
    }));



    // Reset dropdown to placeholder
    e.target.value = '';

    console.log('🚛 Vehicle added:', vehicle.VehicleRegistrationNo);
  };

  // Handler to remove vehicle tag
  const removeVehicleTag = (vehicleIdToRemove) => {
    const newVehicleIds = masterData.VehicleNo.filter(id => id !== vehicleIdToRemove);
    const newVehicleTags = selectedVehicleTags.filter(tag => tag.id !== vehicleIdToRemove);

    setMasterData(prev => ({
      ...prev,
      VehicleNo: newVehicleIds
    }));



    // Update IDs for submission (use first remaining vehicle)
    if (newVehicleIds.length > 0) {
      setIds(prev => ({ ...prev, VehicleID: newVehicleIds[0] }));
    } else {
      setIds(prev => ({ ...prev, VehicleID: '' }));
    }

    console.log('🚛 Vehicle removed');
  };

  // Handler for driver selection (for Fixed type - multiple drivers)
  const handleDriverSelect = async (e) => {
    const selectedDriverId = e.target.value;
    if (!selectedDriverId) return;

    // Check if driver is already selected
    if (selectedDrivers.some(d => d.id === selectedDriverId)) {
      console.log('👨‍💼 Driver already selected');
      return;
    }

    try {
      // Fetch driver details
      const driverRes = await driverAPI.getById(selectedDriverId);
      const driver = driverRes.data || driverRes;

      if (driver) {
        const newDriverTag = {
          id: selectedDriverId,
          name: driver.DriverName,
          mobile: driver.DriverMobileNo || 'N/A'
        };

        setSelectedDrivers(prev => [...prev, newDriverTag]);

        // Set first driver as primary driver for submission
        if (selectedDrivers.length === 0) {
          setTransactionData(prev => ({
            ...prev,
            DriverID: selectedDriverId,
            DriverMobileNo: driver.DriverMobileNo || ''
          }));
        }

        // Reset dropdown
        e.target.value = '';
        console.log('✅ Driver added:', driver.DriverName);
      }
    } catch (error) {
      console.error('❌ Error fetching driver details:', error);
    }
  };

  // Handler to remove driver tag
  const removeDriverTag = (driverIdToRemove) => {
    const newDrivers = selectedDrivers.filter(d => d.id !== driverIdToRemove);
    setSelectedDrivers(newDrivers);

    // If removing the primary driver, set next driver as primary
    if (transactionData.DriverID === driverIdToRemove) {
      if (newDrivers.length > 0) {
        setTransactionData(prev => ({
          ...prev,
          DriverID: newDrivers[0].id,
          DriverMobileNo: newDrivers[0].mobile
        }));
        setIds(prev => ({ ...prev, DriverID: newDrivers[0].id }));
      } else {
        setTransactionData(prev => ({
          ...prev,
          DriverID: '',
          DriverMobileNo: ''
        }));
        setIds(prev => ({ ...prev, DriverID: '' }));
      }
    }

    console.log('👨‍💼 Driver removed');
  };

  // Handler for replacement driver number with validation
  const handleReplacementDriverNoChange = (e) => {
    const value = e.target.value;

    // Allow "NA" as a valid value
    if (value.toLowerCase() === 'na' || value.toLowerCase() === 'n/a') {
      setTransactionData(prev => ({
        ...prev,
        ReplacementDriverNo: 'NA'
      }));

      // Clear any errors for "NA"
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors.ReplacementDriverNo;
        return newErrors;
      });
      return;
    }

    // Only allow digits for non-NA values
    if (!/^\d*$/.test(value)) {
      return;
    }

    // Limit to 10 digits
    if (value.length > 10) {
      return;
    }

    setTransactionData(prev => ({
      ...prev,
      ReplacementDriverNo: value
    }));

    // Validate mobile number (skip validation for empty or "NA")
    if (value.length > 0 && value.length !== 10) {
      setErrors(prev => ({
        ...prev,
        ReplacementDriverNo: 'Mobile number must be exactly 10 digits'
      }));
    } else {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors.ReplacementDriverNo;
        return newErrors;
      });
    }
  };

  // Handler for vendor number with validation
  const handleVendorNumberChange = (e) => {
    const value = e.target.value;
    if (!/^\d*$/.test(value)) return;
    if (value.length > 10) return;

    setTransactionData(prev => ({ ...prev, VendorNumber: value }));

    if (value.length > 0 && value.length !== 10) {
      setErrors(prev => ({ ...prev, VendorNumber: 'Vendor number must be exactly 10 digits' }));
    } else {
      setErrors(prev => { const newErrors = { ...prev }; delete newErrors.VendorNumber; return newErrors; });
    }
  };

  // Handler for driver number with validation
  const handleDriverNumberChange = (e) => {
    const value = e.target.value;
    if (!/^\d*$/.test(value)) return;
    if (value.length > 10) return;

    setTransactionData(prev => ({ ...prev, DriverNumber: value }));

    if (value.length > 0 && value.length !== 10) {
      setErrors(prev => ({ ...prev, DriverNumber: 'Driver number must be exactly 10 digits' }));
    } else {
      setErrors(prev => { const newErrors = { ...prev }; delete newErrors.DriverNumber; return newErrors; });
    }
  };

  // Handler for Aadhar number with validation
  const handleAadharNumberChange = (e) => {
    const value = e.target.value;
    if (!/^\d*$/.test(value)) return;
    if (value.length > 12) return;

    setTransactionData(prev => ({ ...prev, DriverAadharNumber: value }));

    if (value.length > 0 && value.length !== 12) {
      setErrors(prev => ({ ...prev, DriverAadharNumber: 'Aadhar number must be exactly 12 digits' }));
    } else {
      setErrors(prev => { const newErrors = { ...prev }; delete newErrors.DriverAadharNumber; return newErrors; });
    }
  };

  // Create a wrapper function for each DocumentUpload field (following Vendor Form pattern)
  const createFileChangeHandler = (fieldName) => {
    return (file) => {
      console.log(`📁 TRANSACTION FILE CHANGE - ${fieldName}:`, file);
      setFiles(prev => ({
        ...prev,
        [fieldName]: file
      }));
    };
  };





  const handleMasterDataChange = async (e) => {
    const { name, value } = e.target;

    setMasterData(prev => ({
      ...prev,
      [name]: value
    }));

    // Auto-populate related fields when customer changes
    if (name === 'Customer') {
      const customer = customers.find(c => c.CustomerID == value);
      if (customer) {
        try {
          // Track IDs
          setIds(prev => ({ ...prev, CustomerID: customer.CustomerID }));

          // Initialize with Customer Master data
          let autoPopulatedData = {
            // From Customer Master or CRM
            CompanyName: customer.Name || customer.MasterCustomerName || 'N/A',
            GSTNo: customer.GSTNo || 'N/A',
            Location: customer.Locations || customer.Location || 'N/A',
            CustSite: customer.CustomerSite || 'N/A',
          };

          // Fetch project name along with code from project master
          try {
            console.log('📋 Fetching projects linked to master customer:', customer.Name || customer.MasterCustomerName);

            // Get all projects and filter by master customer name
            const allProjectsRes = await projectAPI.getAll();
            const allProjects = allProjectsRes.data || [];

            // Filter projects that are linked to this master customer
            const linkedProjects = allProjects.filter(project =>
              project.CustomerID === customer.CustomerID ||
              project.MasterCustomerName === customer.Name ||
              project.MasterCustomerName === customer.MasterCustomerName
            );

            if (linkedProjects.length > 0) {
              // Store all projects for dropdown selection
              setAvailableProjects(linkedProjects);
              setIsProjectDropdownVisible(linkedProjects.length > 1);

              // Take the first project or let user select if multiple
              const project = linkedProjects[0];
              autoPopulatedData.Project = `${project.ProjectName} [${project.ProjectCode || project.ProjectID}]`;
              console.log('✅ Project found:', autoPopulatedData.Project);

              // Store project ID for submission
              setIds(prev => ({ ...prev, ProjectID: project.ProjectID }));
            } else {
              autoPopulatedData.Project = 'N/A';
              setAvailableProjects([]);
              setIsProjectDropdownVisible(false);
              console.log('❌ No projects found linked to master customer');
            }
          } catch (error) {
            console.error('❌ Error fetching projects:', error);
            autoPopulatedData.Project = 'N/A';
          }

          // Check current transaction type (use the current state or default to Fixed)
          const currentTransactionType = masterData.TypeOfTransaction || 'Fixed';

          // For Fixed transactions, auto-populate through hierarchy
          if (currentTransactionType === 'Fixed') {
            console.log('🔗 Fixed transaction - fetching linked data through hierarchy');
            await fetchLinkedDataForFixedTransaction(customer.CustomerID, autoPopulatedData);
          } else {
            // For Adhoc/Replacement transactions, populate customer data and project location
            console.log('📝 Adhoc/Replacement transaction - populating customer data and project location');

            // If we found linked projects, use the project location
            if (linkedProjects.length > 0) {
              const project = linkedProjects[0];
              console.log('📍 ADHOC/REPLACEMENT Location - Found project:', {
                ProjectName: project.ProjectName,
                ProjectID: project.ProjectID,
                ProjectLocation: project.Location
              });

              if (project.Location) {
                autoPopulatedData.Location = project.Location;
                console.log('✅ Using project location for Adhoc/Replacement:', project.Location);
              } else {
                console.log('⚠️ Project found but no location available, using customer location');
              }
            } else {
              console.log('⚠️ No linked projects found, using customer location only');
            }

            setMasterData(prev => ({
              ...prev,
              ...autoPopulatedData
            }));
          }

          // This will be handled by fetchLinkedDataForFixedTransaction function

        } catch (error) {
          console.error('Error fetching customer data:', error);
          // Fallback: populate basic customer data and set others to N/A
          setMasterData(prev => ({
            ...prev,
            CompanyName: customer.Name || customer.MasterCustomerName || 'N/A',
            GSTNo: customer.GSTNo || 'N/A',
            Location: customer.Locations || 'N/A',
            CustSite: customer.CustomerSite || 'N/A',
            Project: 'N/A',
            VehiclePlacementType: 'Fixed',
            VehicleNo: 'N/A',
            VehicleType: 'N/A'
            // VendorName and VendorCode will be selected manually via dropdown
          }));

          // Clear driver data on error
          setTransactionData(prev => ({
            ...prev,
            DriverName: 'N/A',
            DriverNo: 'N/A'
          }));
        }
      }
    }

    // Auto-populate when vehicle changes
    if (name === 'VehicleNo') {
      const vehicle = vehicles.find(v => v.vehicle_id === value);
      if (vehicle) {
        try {
          // Get vehicle details from Vehicle Master
          const vehicleRes = await fetch(`http://localhost:3000/api/vehicles/${value}`);
          const vehicleData = await vehicleRes.json();
          const vehicleDetails = vehicleData.data || vehicleData;

          setMasterData(prev => ({
            ...prev,
            VehicleType: vehicleDetails.vehicle_type || vehicle.vehicle_type || '',
            VehiclePlacementType: vehicleDetails.placement_type || 'Fixed' // Default to Fixed
          }));

          // Find and set vendor info from the vehicle data
          if (vehicleDetails.vendor_id || vehicle.vendor_id) {
            const vendorId = vehicleDetails.vendor_id || vehicle.vendor_id;
            const vendor = vendors.find(vend => vend.VendorID === vendorId);
            if (vendor) {
              setMasterData(prev => ({
                ...prev,
                VendorName: vendor.VendorName || ''
              }));
            }
          }
        } catch (error) {
          console.error('Error fetching vehicle details:', error);
          // Fallback to basic vehicle data
          setMasterData(prev => ({
            ...prev,
            VehicleType: vehicle.vehicle_type || '',
            VehiclePlacementType: 'Fixed'
          }));
        }
      }
    }

    // Handle TypeOfTransaction changes
    if (name === 'TypeOfTransaction') {
      console.log('🔄 Transaction type changed to:', value);

      // If switching to Fixed and customer is selected, fetch linked data
      if (value === 'Fixed' && masterData.Customer) {
        const customer = customers.find(c => c.CustomerID == masterData.Customer);
        if (customer) {
          const autoPopulatedData = {
            CompanyName: customer.Name || customer.MasterCustomerName || 'N/A',
            GSTNo: customer.GSTNo || 'N/A',
            Location: customer.Locations || 'N/A',
            CustSite: customer.CustomerSite || 'N/A',
          };
          await fetchLinkedDataForFixedTransaction(customer.CustomerID, autoPopulatedData);
        }
      }
      // If switching to Adhoc or Replacement, clear auto-populated data but keep customer info
      else if (value === 'Adhoc' || value === 'Replacement') {
        console.log(`📝 Switched to ${value} - clearing auto-populated data`);
        setMasterData(prev => ({
          ...prev,
          Project: '',
          VehicleNo: '',
          VehicleType: '',
          VendorName: ''
        }));
        setTransactionData(prev => ({
          ...prev,
          DriverID: ''
        }));
        setIds(prev => ({
          ...prev,
          ProjectID: '',
          VehicleID: '',
          DriverID: '',
          VendorID: ''
        }));
      }
    }

    // Auto-populate when vendor name changes
    if (name === 'VendorName') {
      const vendor = vendors.find(v => v.VendorID === value);
      if (vendor) {
        setMasterData(prev => ({
          ...prev,
          VendorName: vendor.VendorName || ''
        }));
        // Also set the VendorID in ids for submission
        setIds(prev => ({
          ...prev,
          VendorID: vendor.VendorID
        }));
        console.log('✅ Vendor selected:', vendor.VendorName, vendor.VendorCode, 'ID:', vendor.VendorID);
      }
    }

    // Auto-populate when project changes
    if (name === 'Project') {
      const project = projects.find(p => p.project_id == value);
      if (project) {
        try {
          // Get vehicle assignments for this project from Vehicle Project Linking
          const assignmentsRes = await fetch(`http://localhost:3000/api/vehicle-project-linking/assignments`);
          const assignmentsData = await assignmentsRes.json();
          const allAssignments = assignmentsData.data || [];

          // Find assignments for this project
          const projectAssignments = allAssignments.filter(a => a.project_id == value);

          if (projectAssignments.length > 0) {
            const assignment = projectAssignments[0]; // Use first assignment

            // Auto-populate from vehicle project linking data with names
            setMasterData(prev => ({
              ...prev,
              VehicleNo: assignment.vehicle_number || 'N/A',
              VehicleType: assignment.vehicle_type || 'N/A',
              VehiclePlacementType: assignment.placement_type || 'Fixed',
              // VendorName and VendorCode will be selected manually via dropdown
            }));

            // Capture IDs for submission
            setIds(prev => ({
              ...prev,
              ProjectID: assignment.project_id,
              VehicleID: assignment.vehicle_id,
              DriverID: assignment.driver_id,
              VendorID: assignment.vendor_id
            }));

            // Auto-populate driver data from vehicle project linking
            setTransactionData(prev => ({
              ...prev,
              DriverName: assignment.driver_name || 'N/A',
              DriverNo: assignment.driver_mobile_no || 'N/A'
            }));

          } else {
            // No assignments for this project - set to N/A
            setMasterData(prev => ({
              ...prev,
              VehicleNo: 'N/A',
              VehicleType: 'N/A',
              VehiclePlacementType: 'Fixed'
              // VendorName and VendorCode will be selected manually via dropdown
            }));

            // Clear driver data
            setTransactionData(prev => ({
              ...prev,
              DriverID: ''
            }));
          }
        } catch (error) {
          console.error('Error fetching project assignments:', error);
          // Fallback - set all to N/A
          setMasterData(prev => ({
            ...prev,
            VehicleNo: 'N/A',
            VehicleType: 'N/A',
            VehiclePlacementType: 'Fixed'
            // VendorName and VendorCode will be selected manually via dropdown
          }));

          // Clear driver data on error
          setTransactionData(prev => ({
            ...prev,
            DriverName: 'N/A',
            DriverNo: 'N/A'
          }));
        }
      }
    }
  };

  const handleTransactionDataChange = async (e) => {
    const { name, value } = e.target;
    console.log('🔄 TRANSACTION DATA CHANGE:', name, '=', value);
    setTransactionData(prev => ({
      ...prev,
      [name]: value
    }));

    // Auto-populate driver details when driver changes
    if (name === 'DriverID') {
      if (value) {
        // Fetch driver details from API to get mobile number
        try {
          const driverRes = await driverAPI.getById(value);
          const driver = driverRes.data || driverRes;

          if (driver) {
            // Store the DriverID directly in transactionData and also in ids for consistency
            setIds(prev => ({ ...prev, DriverID: value }));

            // Auto-populate driver mobile number
            setTransactionData(prev => ({
              ...prev,
              DriverMobileNo: driver.DriverMobileNo || ''
            }));

            console.log('✅ Driver selected:', driver.DriverName, driver.DriverMobileNo);
          }
        } catch (error) {
          console.error('❌ Error fetching driver details:', error);
          // Fallback to local drivers array
          const driver = drivers.find(d => d.DriverID === value);
          if (driver) {
            setTransactionData(prev => ({
              ...prev,
              DriverMobileNo: driver.DriverMobileNo || ''
            }));
          }
        }
      } else {
        // Clear driver mobile number if no driver selected
        setTransactionData(prev => ({
          ...prev,
          DriverMobileNo: ''
        }));
      }
    }

    // ReplacementDriverID handling removed - we only use manual text inputs now

    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };



  const handleCalculatedDataChange = (e) => {
    const { name, value } = e.target;
    console.log('🔄 CALCULATED DATA CHANGE:', name, '=', value);
    setCalculatedData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSupervisorDataChange = (e) => {
    const { name, value, type, checked } = e.target;
    setSupervisorData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };



  const validateForm = () => {
    console.log('🔍 VALIDATION - Starting form validation');
    console.log('🔍 VALIDATION - Master Data:', masterData);
    console.log('🔍 VALIDATION - Transaction Data:', transactionData);
    console.log('🔍 VALIDATION - Selected Drivers:', selectedDrivers);

    const newErrors = {};

    // Master data validations
    if (!masterData.Customer) {
      newErrors.Customer = 'Company Name is required';
      console.log('❌ VALIDATION - Customer missing:', masterData.Customer);
    }
    if (!masterData.Project) {
      newErrors.Project = 'Project is required';
      console.log('❌ VALIDATION - Project missing:', masterData.Project);
    }
    if (!masterData.CustSite) {
      newErrors.CustSite = 'Location is required';
      console.log('❌ VALIDATION - CustSite missing:', masterData.CustSite);
    }

    // Fixed transaction specific validations
    if (masterData.TypeOfTransaction === 'Fixed') {
      console.log('🔍 VALIDATION - Fixed transaction validation');
      console.log('🔍 VALIDATION - VehicleNo:', masterData.VehicleNo);
      console.log('🔍 VALIDATION - DriverID:', transactionData.DriverID);
      console.log('🔍 VALIDATION - selectedDrivers:', selectedDrivers);

      if (!masterData.VehicleNo || masterData.VehicleNo.length === 0) {
        newErrors.VehicleNo = 'At least one vehicle must be selected';
        console.log('❌ VALIDATION - Vehicle validation failed');
      }

      // Check if driver is selected (either through selectedDrivers array or DriverID)
      const hasDriver = (selectedDrivers && selectedDrivers.length > 0) || transactionData.DriverID;
      if (!hasDriver) {
        newErrors.DriverID = 'Driver must be selected for Fixed transactions';
        console.log('❌ VALIDATION - Driver validation failed - no driver selected');
      }
    }

    // Common transaction data validations
    if (!transactionData.Date) newErrors.Date = 'Date is required';
    if (!transactionData.OpeningKM) newErrors.OpeningKM = 'Opening KM is required';
    if (!transactionData.ClosingKM) newErrors.ClosingKM = 'Closing KM is required';

    // Trip Number validation for all transaction types
    // Allows alphanumeric and special characters (varchar(50) in database)
    if (!transactionData.TripNo) {
      newErrors.TripNo = 'Trip Number is required';
    } else if (transactionData.TripNo.trim() === '') {
      newErrors.TripNo = 'Trip Number cannot be empty';
    } else if (transactionData.TripNo.length > 50) {
      newErrors.TripNo = 'Trip Number cannot exceed 50 characters';
    }

    // Adhoc/Replacement-specific validations
    if (masterData.TypeOfTransaction === 'Adhoc' || masterData.TypeOfTransaction === 'Replacement') {
      if (!transactionData.TripNo) newErrors.TripNo = 'Trip No is required for Adhoc/Replacement transactions';
      if (!transactionData.VehicleNumber) newErrors.VehicleNumber = 'Vehicle Number is required for Adhoc/Replacement transactions';
      if (!transactionData.VendorName) newErrors.VendorName = 'Vendor Name is required for Adhoc/Replacement transactions';
      if (!transactionData.DriverName) newErrors.DriverName = 'Driver Name is required for Adhoc/Replacement transactions';
      if (!transactionData.DriverNumber) newErrors.DriverNumber = 'Driver Number is required for Adhoc/Replacement transactions';

      // Validate driver number format
      if (transactionData.DriverNumber && transactionData.DriverNumber.length !== 10) {
        newErrors.DriverNumber = 'Driver Number must be exactly 10 digits';
      }

      // Validate vendor number format if provided
      if (transactionData.VendorNumber && transactionData.VendorNumber.length !== 10) {
        newErrors.VendorNumber = 'Vendor Number must be exactly 10 digits';
      }

      // Validate Aadhar number format if provided
      if (transactionData.DriverAadharNumber && transactionData.DriverAadharNumber.length !== 12) {
        newErrors.DriverAadharNumber = 'Aadhar Number must be exactly 12 digits';
      }
    }

    // Replacement driver validation - optional but conditional
    // Skip validation if the values are "NA" (default values)
    if (transactionData.ReplacementDriverName &&
        transactionData.ReplacementDriverName.trim() !== '' &&
        transactionData.ReplacementDriverName.trim().toLowerCase() !== 'na') {
      // If replacement driver name is provided (and not "NA"), number is required
      if (!transactionData.ReplacementDriverNo ||
          transactionData.ReplacementDriverNo.trim() === '' ||
          transactionData.ReplacementDriverNo.trim().toLowerCase() === 'na') {
        newErrors.ReplacementDriverNo = 'Replacement driver number is required when driver name is provided';
      } else if (transactionData.ReplacementDriverNo.length !== 10) {
        newErrors.ReplacementDriverNo = 'Replacement driver number must be exactly 10 digits';
      }
    }

    // Validation for KM values
    if (transactionData.OpeningKM && transactionData.ClosingKM) {
      const opening = parseFloat(transactionData.OpeningKM);
      const closing = parseFloat(transactionData.ClosingKM);
      if (closing <= opening) {
        newErrors.ClosingKM = 'Closing KM must be greater than Opening KM';
      }
    }

    // NEW: Validate 6 mandatory time fields
    const timeFieldsMetadata = getTimeFieldsMetadata();
    for (const field of timeFieldsMetadata) {
      if (!transactionData[field.name] || transactionData[field.name].trim() === '') {
        newErrors[field.name] = `${field.label} is required`;
      }
    }

    // NEW: Validate chronological order of time fields
    const chronologicalErrors = validateChronologicalTimes(transactionData);
    Object.assign(newErrors, chronologicalErrors);

    console.log('🔍 VALIDATION - Final errors:', newErrors);
    console.log('🔍 VALIDATION - Error count:', Object.keys(newErrors).length);

    setErrors(newErrors);
    const isValid = Object.keys(newErrors).length === 0;
    console.log('🔍 VALIDATION - Form is valid:', isValid);
    return isValid;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    console.log('🚀 SUBMIT - Form submission started');
    console.log('🚀 SUBMIT - editingTransaction:', editingTransaction);
    console.log('🚀 SUBMIT - Is editing mode:', !!editingTransaction);
    console.log('🚀 SUBMIT - Master Data:', masterData);
    console.log('🚀 SUBMIT - Transaction Data:', transactionData);
    console.log('🚀 SUBMIT - TripNo field value:', transactionData.TripNo);
    console.log('🚀 SUBMIT - Current Errors:', errors);

    const isValid = validateForm();
    console.log('🚀 SUBMIT - Form validation result:', isValid);
    console.log('🚀 SUBMIT - Validation errors:', errors);

    if (!isValid) {
      console.log('❌ SUBMIT - Form validation failed, stopping submission');
      alert('Please fix the validation errors before submitting');
      return;
    }

    console.log('✅ SUBMIT - Form validation passed, proceeding with submission');
    setIsSubmitting(true);
    try {
      // Build payload for /api/daily-vehicle-transactions
      let payload = {
        TripType: masterData.TypeOfTransaction || 'Fixed',
        TransactionDate: transactionData.Date,
        CustomerID: ids.CustomerID,
        ProjectID: ids.ProjectID || null,
        ArrivalTimeAtHub: transactionData.ArrivalTimeAtHub || null,
        InTimeByCust: transactionData.InTimeByCust || null,
        OutTimeFromHub: transactionData.OutTimeFromHub || null,
        ReturnReportingTime: transactionData.ReturnReportingTime || null,

        // NEW: 6 Time Fields (Mandatory - Chronological Order)
        VehicleReportingAtHub: transactionData.VehicleReportingAtHub || null,
        VehicleEntryInHub: transactionData.VehicleEntryInHub || null,
        VehicleOutFromHubForDelivery: transactionData.VehicleOutFromHubForDelivery || null,
        VehicleReturnAtHub: transactionData.VehicleReturnAtHub || null,
        VehicleEnteredAtHubReturn: transactionData.VehicleEnteredAtHubReturn || null,
        VehicleOutFromHubFinal: transactionData.VehicleOutFromHubFinal || null,

        OpeningKM: transactionData.OpeningKM ? Number(transactionData.OpeningKM) : null,
        ClosingKM: transactionData.ClosingKM ? Number(transactionData.ClosingKM) : null,
        TotalDutyHours: transactionData.TotalDutyHours ? Number(transactionData.TotalDutyHours) : null,
        Remarks: supervisorData.Remarks || null,
        Status: 'Pending'
      };

      if (masterData.TypeOfTransaction === 'Fixed') {
        // Fixed transactions use master data IDs - always use VehicleIDs and DriverIDs arrays
        const vehicleIds = masterData.VehicleNo.length > 0 ? masterData.VehicleNo : [];
        const driverIds = selectedDrivers.length > 0 ? selectedDrivers.map(d => d.id) : (transactionData.DriverID ? [transactionData.DriverID] : []);

        console.log('🚛 Submit Debug - VendorID from ids:', ids.VendorID);
        console.log('🚛 Submit Debug - Remarks from supervisorData:', supervisorData.Remarks);
        console.log('🚛 Submit Debug - TripClose from supervisorData:', supervisorData.TripClose);
        console.log('🚛 Submit Debug - OutTimeFromHUB from calculatedData:', calculatedData.OutTimeFromHUB);

        // Debug required fields
        console.log('🔍 REQUIRED FIELDS DEBUG:');
        console.log('🔍 CustomerID:', ids.CustomerID);
        console.log('🔍 VehicleIDs array:', vehicleIds);
        console.log('🔍 DriverIDs array:', driverIds);
        console.log('🔍 TransactionDate:', transactionData.Date);
        console.log('🔍 OpeningKM:', transactionData.OpeningKM);
        console.log('🔍 ids object:', ids);
        console.log('🔍 masterData.VehicleNo:', masterData.VehicleNo);
        console.log('🔍 selectedDrivers:', selectedDrivers);
        console.log('🔍 transactionData.DriverID:', transactionData.DriverID);
        console.log('🔍 masterData.Customer:', masterData.Customer);

        // If CustomerID is empty, try to use fallback values
        if (!ids.CustomerID || ids.CustomerID === '') {
          console.log('🔧 CustomerID is empty, trying fallbacks');
          console.log('🔧 masterData.Customer:', masterData.Customer, 'type:', typeof masterData.Customer);
          console.log('🔧 editingTransaction?.CustomerID:', editingTransaction?.CustomerID);

          // First try: use the original CustomerID from the editing transaction
          if (editingTransaction && editingTransaction.CustomerID) {
            console.log('🔧 Using original CustomerID from editingTransaction:', editingTransaction.CustomerID);
            payload.CustomerID = editingTransaction.CustomerID;
          }
          // Second try: use masterData.Customer if it's numeric
          else if (masterData.Customer && !isNaN(masterData.Customer)) {
            console.log('🔧 Using numeric masterData.Customer:', masterData.Customer);
            payload.CustomerID = parseInt(masterData.Customer);
          }
          // Last resort: set to null (backend will preserve existing value)
          else {
            console.log('🔧 No valid CustomerID found, setting to null (backend will preserve existing)');
            payload.CustomerID = null;
          }
        }

        // Get driver details from the selected driver
        const selectedDriver = driverIds.length > 0
          ? drivers.find(d => d.DriverID == driverIds[0])
          : null;

        // Get vendor details from masterData
        const vendorName = masterData.VendorName || null;
        const vendorNumber = masterData.VendorCode || null; // VendorCode is stored as VendorNumber

        payload = {
          ...payload,
          // Trip Number - CRITICAL FIX: Use TripNo field consistently
          TripNo: transactionData.TripNo || null,
          VehicleIDs: JSON.stringify(vehicleIds), // Always send as JSON array
          DriverIDs: JSON.stringify(driverIds),   // Always send as JSON array
          VendorID: ids.VendorID || null,
          Shift: transactionData.Shift || null,
          LocationID: null, // Fixed transactions don't use LocationID typically
          ReplacementDriverID: null, // Always null - we don't use ReplacementDriverID anymore
          ReplacementDriverName: transactionData.ReplacementDriverName && transactionData.ReplacementDriverName.trim() !== ''
            ? transactionData.ReplacementDriverName
            : 'NA',
          ReplacementDriverNo: transactionData.ReplacementDriverNo && transactionData.ReplacementDriverNo.trim() !== ''
            ? transactionData.ReplacementDriverNo
            : 'NA',
          TotalDeliveries: transactionData.TotalDeliveries ? Number(transactionData.TotalDeliveries) : null,
          TotalDeliveriesAttempted: transactionData.TotalDeliveriesAttempted ? Number(transactionData.TotalDeliveriesAttempted) : null,
          TotalDeliveriesDone: transactionData.TotalDeliveriesDone ? Number(transactionData.TotalDeliveriesDone) : null,
          TripClose: supervisorData.TripClose || false,

          // Vehicle and Driver Details (for Excel export and reference)
          VehicleNumber: masterData.VehicleNo && masterData.VehicleNo.length > 0 ? masterData.VehicleNo[0] : null,
          VendorName: vendorName,
          VendorNumber: vendorNumber,
          DriverName: selectedDriver ? selectedDriver.DriverName : null,
          DriverNumber: selectedDriver ? (selectedDriver.DriverMobileNo || selectedDriver.MobileNo) : null,
          DriverAadharNumber: selectedDriver ? selectedDriver.DriverAadharNumber : null,
          DriverLicenceNumber: selectedDriver ? selectedDriver.DriverLicenceNumber : null,

          // Financial and calculated fields from calculatedData
          TotalKM: calculatedData.TotalKM ? Number(calculatedData.TotalKM) : null,
          VFreightFix: calculatedData.VFreightFix ? Number(calculatedData.VFreightFix) : null,
          FixKm: calculatedData.FixKm ? Number(calculatedData.FixKm) : null,
          VFreightVariable: calculatedData.VFreightVariable ? Number(calculatedData.VFreightVariable) : null,
          TollExpenses: calculatedData.TollExpenses ? Number(calculatedData.TollExpenses) : null,
          ParkingCharges: calculatedData.ParkingCharges ? Number(calculatedData.ParkingCharges) : null,
          LoadingCharges: calculatedData.LoadingCharges ? Number(calculatedData.LoadingCharges) : null,
          UnloadingCharges: calculatedData.UnloadingCharges ? Number(calculatedData.UnloadingCharges) : null,
          OtherCharges: calculatedData.OtherCharges ? Number(calculatedData.OtherCharges) : null,
          OtherChargesRemarks: calculatedData.OtherChargesRemarks || null,
          HandlingCharges: calculatedData.HandlingCharges ? Number(calculatedData.HandlingCharges) : null,
          OutTimeFrom: calculatedData.OutTimeFromHUB || null,
          TotalDutyHours: calculatedData.TotalDutyHours ? Number(calculatedData.TotalDutyHours) : null,

          // Master data fields
          VehicleType: masterData.VehicleType || null,
          CompanyName: masterData.CompanyName || null,
          GSTNo: masterData.GSTNo || null,
          Location: masterData.Location || null,
          CustomerSite: masterData.CustSite || null
        };

        console.log('🔧 FIXED TRANSACTION PAYLOAD - TripNo field:', payload.TripNo);
        console.log('🔧 FIXED TRANSACTION PAYLOAD - Source TripNo:', transactionData.TripNo);
        console.log('🔧 FIXED TRANSACTION PAYLOAD - Full payload TripNo:', JSON.stringify({TripNo: payload.TripNo}));
      } else if (masterData.TypeOfTransaction === 'Adhoc' || masterData.TypeOfTransaction === 'Replacement') {
        // Adhoc/Replacement transactions use manual entry fields - ordered to match frontend form
        payload = {
          ...payload,
          // Basic Transaction Info
          TripNo: transactionData.TripNo || null,

          // Vehicle Details
          VehicleNumber: transactionData.VehicleNumber || null,
          VehicleType: masterData.VehicleType || null,

          // Vendor Details
          VendorName: transactionData.VendorName || null,
          VendorNumber: transactionData.VendorNumber || null,

          // Driver Details
          DriverName: transactionData.DriverName || null,
          DriverNumber: transactionData.DriverNumber || null,
          DriverAadharNumber: transactionData.DriverAadharNumber || null,
          DriverLicenceNumber: transactionData.DriverLicenceNumber || null,

          // Note: ADHOC transactions don't have ReplacementDriver fields in database

          // Time Fields (already in base payload: ArrivalTimeAtHub, InTimeByCust, OutTimeFromHub, ReturnReportingTime)

          // KM and Delivery Fields (already in base payload: OpeningKM, ClosingKM)
          TotalShipmentsForDeliveries: transactionData.TotalShipmentsForDeliveries ? Number(transactionData.TotalShipmentsForDeliveries) : null,
          TotalShipmentDeliveriesAttempted: transactionData.TotalShipmentDeliveriesAttempted ? Number(transactionData.TotalShipmentDeliveriesAttempted) : null,
          TotalShipmentDeliveriesDone: transactionData.TotalShipmentDeliveriesDone ? Number(transactionData.TotalShipmentDeliveriesDone) : null,

          // Freight Fields
          VFreightFix: transactionData.VFreightFix ? Number(transactionData.VFreightFix) : null,
          FixKm: transactionData.FixKm ? Number(transactionData.FixKm) : null,
          VFreightVariable: transactionData.VFreightVariable ? Number(transactionData.VFreightVariable) : null,

          // Expense Fields
          TollExpenses: transactionData.TollExpenses ? Number(transactionData.TollExpenses) : null,
          ParkingCharges: transactionData.ParkingCharges ? Number(transactionData.ParkingCharges) : null,
          LoadingCharges: transactionData.LoadingCharges ? Number(transactionData.LoadingCharges) : null,
          UnloadingCharges: transactionData.UnloadingCharges ? Number(transactionData.UnloadingCharges) : null,
          OtherCharges: transactionData.OtherCharges ? Number(transactionData.OtherCharges) : null,
          OtherChargesRemarks: transactionData.OtherChargesRemarks || null,

          // Advance Payment Fields
          AdvanceRequestNo: transactionData.AdvanceRequestNo || null,
          AdvanceToPaid: transactionData.AdvanceToPaid ? Number(transactionData.AdvanceToPaid) : null,
          AdvanceApprovedAmount: transactionData.AdvanceApprovedAmount ? Number(transactionData.AdvanceApprovedAmount) : null,
          AdvanceApprovedBy: transactionData.AdvanceApprovedBy || null,
          AdvancePaidAmount: transactionData.AdvancePaidAmount ? Number(transactionData.AdvancePaidAmount) : null,
          AdvancePaidMode: transactionData.AdvancePaidMode || null,
          AdvancePaidDate: transactionData.AdvancePaidDate || null,
          AdvancePaidBy: transactionData.AdvancePaidBy || null,
          EmployeeDetailsAdvance: transactionData.EmployeeDetailsAdvance || null,

          // Balance Payment Fields
          BalancePaidAmount: transactionData.BalancePaidAmount ? Number(transactionData.BalancePaidAmount) : null,
          BalancePaidDate: transactionData.BalancePaidDate || null,
          BalancePaidBy: transactionData.BalancePaidBy || null,
          EmployeeDetailsBalance: transactionData.EmployeeDetailsBalance || null
        };
      }

      console.log('🚀 Payload being sent:', JSON.stringify(payload, null, 2));

      // Check if there are any file uploads (following Vendor Form pattern)
      const hasFiles = files.DriverAadharDoc instanceof File ||
                      files.DriverLicenceDoc instanceof File ||
                      files.TollExpensesDoc instanceof File ||
                      files.ParkingChargesDoc instanceof File ||
                      files.OpeningKMImage instanceof File ||
                      files.ClosingKMImage instanceof File;

      if (hasFiles) {
        // Use FormData for file uploads
        const formData = new FormData();

        // Add all payload fields to FormData
        Object.keys(payload).forEach(key => {
          if (payload[key] !== null && payload[key] !== undefined) {
            formData.append(key, payload[key]);
          }
        });

        // Add file fields (following Vendor Form pattern)
        if (files.DriverAadharDoc instanceof File) {
          formData.append('DriverAadharDoc', files.DriverAadharDoc);
        }
        if (files.DriverLicenceDoc instanceof File) {
          formData.append('DriverLicenceDoc', files.DriverLicenceDoc);
        }
        if (files.TollExpensesDoc instanceof File) {
          formData.append('TollExpensesDoc', files.TollExpensesDoc);
        }
        if (files.ParkingChargesDoc instanceof File) {
          formData.append('ParkingChargesDoc', files.ParkingChargesDoc);
        }

        // Add KM image files based on transaction type
        if (masterData.TypeOfTransaction === 'Fixed') {
          if (files.OpeningKMImage instanceof File) {
            formData.append('OpeningKMImage', files.OpeningKMImage);
          }
          if (files.ClosingKMImage instanceof File) {
            formData.append('ClosingKMImage', files.ClosingKMImage);
          }
        } else if (masterData.TypeOfTransaction === 'Adhoc' || masterData.TypeOfTransaction === 'Replacement') {
          if (files.OpeningKMImage instanceof File) {
            formData.append('OpeningKMImageAdhoc', files.OpeningKMImage);
          }
          if (files.ClosingKMImage instanceof File) {
            formData.append('ClosingKMImageAdhoc', files.ClosingKMImage);
          }
        }

        console.log('🚀 Sending FormData with files');

        // Note: For file uploads, we use the combined API which has ID mapping logic
        // This ensures file uploads work correctly for all transaction types
        if (editingTransaction) {
          console.log('🔧 UPDATING TRANSACTION WITH FILES:', editingTransaction.TransactionID);
          console.log('🔧 Editing Transaction Object:', editingTransaction);
          await vehicleTransactionAPI.updateWithFiles(editingTransaction.TransactionID, formData);
          apiHelpers.showSuccess('Transaction updated successfully');

          // After successful update with files, refresh the current editing transaction data
          console.log('🔧 REFRESHING EDITED TRANSACTION DATA after file update');
          await handleEdit(editingTransaction);
        } else {
          await vehicleTransactionAPI.createWithFiles(formData);
          apiHelpers.showSuccess('Transaction created successfully');

          // Reset form after successful creation
          resetForm();
        }
      } else {
        // Use regular JSON payload
        if (editingTransaction) {
          console.log('🔧 UPDATING TRANSACTION:', editingTransaction.TransactionID);
          console.log('🔧 Transaction Type:', masterData.TypeOfTransaction);
          console.log('🔧 Editing Transaction Object:', editingTransaction);
          console.log('🔧 FINAL PAYLOAD BEING SENT:', JSON.stringify(payload, null, 2));

          // Use the correct API endpoint based on transaction type
          if (masterData.TypeOfTransaction === 'Adhoc' || masterData.TypeOfTransaction === 'Replacement') {
            // Use adhoc API for adhoc/replacement transactions
            await adhocTransactionAPI.update(editingTransaction.TransactionID, payload);
          } else {
            // Use combined API for fixed transactions
            await vehicleTransactionAPI.update(editingTransaction.TransactionID, payload);
          }
          apiHelpers.showSuccess('Transaction updated successfully');

          // After successful update, refresh the current editing transaction data
          console.log('🔧 REFRESHING EDITED TRANSACTION DATA after update');
          await handleEdit(editingTransaction);

        } else {
          // For creation, use the appropriate API
          if (masterData.TypeOfTransaction === 'Adhoc' || masterData.TypeOfTransaction === 'Replacement') {
            await adhocTransactionAPI.create(payload);
          } else {
            await vehicleTransactionAPI.create(payload);
          }
          apiHelpers.showSuccess('Transaction created successfully');

          // Reset form only for new transactions
          resetForm();
        }
      }

      // Always refresh the transaction list
      fetchTransactions();
    } catch (error) {
      apiHelpers.showError(error, 'Failed to save transaction');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setMasterData({
      Customer: '',
      CompanyName: '',
      GSTNo: '',
      Project: '',
      Location: '',
      CustSite: '',
      VehiclePlacementType: '',
      VehicleType: '',
      VehicleNo: [], // Reset to empty array
      VendorName: '',
      VendorCode: '',
      TypeOfTransaction: 'Fixed'
    });

    // Reset selected drivers
    setSelectedDrivers([]);

    setTransactionData({
      DriverID: '',
      DriverMobileNo: '', // Reset driver mobile number
      TripNo: '', // Reset trip number
      ReplacementDriverName: '', // Reset replacement driver name
      ReplacementDriverNo: '', // Reset replacement driver number
      Date: getCurrentDate(),
      ArrivalTimeAtHub: '',
      InTimeByCust: '',
      OutTimeFromHub: '',
      OpeningKM: '',
      TotalDeliveries: '',
      TotalDeliveriesAttempted: '',
      TotalDeliveriesDone: '',
      ReturnReportingTime: '',
      ClosingKM: '',
      Remarks: '',
      // NEW: 6 Time Fields (Mandatory - Chronological Order)
      VehicleReportingAtHub: '',
      VehicleEntryInHub: '',
      VehicleOutFromHubForDelivery: '',
      VehicleReturnAtHub: '',
      VehicleEnteredAtHubReturn: '',
      VehicleOutFromHubFinal: '',
      // Adhoc/Replacement-specific fields
      // TripNo: '',
      VehicleNumber: '',
      VendorName: '',
      VendorNumber: '',
      DriverName: '',
      DriverNumber: '',
      DriverAadharNumber: '',
      DriverLicenceNumber: '',
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
      OutTimeFrom: '',
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
      TotalExpenses: '',
      TripClose: false
    });

    setCalculatedData({
      TotalKM: '',
      VFreightFix: '',
      TollExpenses: '',
      ParkingCharges: '',
      HandlingCharges: '',
      OutTimeFromHUB: '',
      TotalDutyHours: '',
      KilometerRate: '',
      KMCharges: ''
    });

    setSupervisorData({
      Remarks: '',
      TripClose: false
    });

    // Reset files state (following Vendor Form pattern)
    setFiles({
      DriverAadharDoc: null,
      DriverLicenceDoc: null,
      TollExpensesDoc: null,
      ParkingChargesDoc: null,
      OpeningKMImage: null,
      ClosingKMImage: null
    });

    // Reset IDs state
    setIds({
      CustomerID: '',
      ProjectID: '',
      VendorID: ''
    });

    setEditingTransaction(null);
    setErrors({});

    // Clear saved form data from localStorage
    clearFormDataFromStorage();
  };

  // Function to start creating a new transaction (clear editing state)
  const handleNewTransaction = () => {
    console.log('🆕 Starting new transaction');
    resetForm();
  };

  const handleEdit = async (row) => {
    console.log('🔧 EDIT START - Edit clicked for row:', row);
    console.log('🔧 EDIT START - Row data keys:', Object.keys(row));
    console.log('🔧 EDIT START - Row replacement driver data:', {
      ReplacementDriverName: row.ReplacementDriverName,
      ReplacementDriverNo: row.ReplacementDriverNo
    });

    try {
      // Keep the whole row for reference
      setEditingTransaction(row);
      console.log('🔧 EDIT START - editingTransaction set to:', row);

    // Try to fetch full record by ID for complete data (some list fields are trimmed)
    let full = row;
    console.log('🔧 EDIT API - Starting API fetch for transaction ID:', row?.TransactionID);

    if (row?.TransactionID) {
      console.log('🔧 EDIT API - Fetching transaction with type:', row.TripType);
      // Use TransactionID directly since we fixed the ID mapping
      const transactionIdToFetch = row.TransactionID;
      console.log('🔧 EDIT API - Using transaction ID for fetch:', transactionIdToFetch);

      try {
        console.log('🔧 EDIT API - Making API call to vehicleTransactionAPI.getById...');
        const resp = await vehicleTransactionAPI.getById(transactionIdToFetch, row.TripType);
        console.log('🔧 EDIT API - Raw API response:', resp);

        full = resp.data || resp || row;
        console.log('✅ EDIT API - Processed full transaction data:', full);
        console.log('✅ EDIT API - Key fields in full object:', {
          TransactionID: full.TransactionID,
          CustomerID: full.CustomerID,
          ProjectID: full.ProjectID,
          TripType: full.TripType,
          TripNo: full.TripNo,
          Location: full.Location,
          ProjectLocation: full.ProjectLocation,
          CustomerLocation: full.CustomerLocation
        });

        // CRITICAL LOCATION DEBUG - Check if ProjectLocation is in API response
        console.log('🚨 LOCATION API DEBUG - full.ProjectLocation value:', full.ProjectLocation);
        console.log('🚨 LOCATION API DEBUG - full.ProjectLocation type:', typeof full.ProjectLocation);
        console.log('🚨 LOCATION API DEBUG - Is ProjectLocation truthy?', !!full.ProjectLocation);
        console.log('✅ EDIT API - Replacement driver data from API:', {
          ReplacementDriverName: full.ReplacementDriverName,
          ReplacementDriverNo: full.ReplacementDriverNo
        });
        console.log('✅ EDIT API - Document data from API:', {
          DriverAadharDoc: full.DriverAadharDoc,
          DriverLicenceDoc: full.DriverLicenceDoc,
          TollExpensesDoc: full.TollExpensesDoc,
          ParkingChargesDoc: full.ParkingChargesDoc
        });
      } catch (e) {
        console.error('🔧 EDIT API - API fetch failed:', e);
        console.warn('🔧 EDIT API - Falling back to row data due to fetch error');
        full = row;
      }
    } else {
      console.warn('🔧 EDIT API - No TransactionID found, using row data directly');
    }

    // Determine transaction type first
    const isAdhocOrReplacement = full.TripType === 'Adhoc' || full.TripType === 'Replacement';
    console.log('🔧 EDIT STATE - Transaction type determined:', full.TripType, 'isAdhocOrReplacement:', isAdhocOrReplacement);

    // Parse VehicleIDs and DriverIDs first
    let parsedVehicleIds = [];
    let parsedDriverIds = [];

    if (!isAdhocOrReplacement) {
      try {
        parsedVehicleIds = full.VehicleIDs ? (Array.isArray(full.VehicleIDs) ? full.VehicleIDs : JSON.parse(full.VehicleIDs)) : [];
        parsedDriverIds = full.DriverIDs ? (Array.isArray(full.DriverIDs) ? full.DriverIDs : JSON.parse(full.DriverIDs)) : [];
      } catch (e) {
        console.warn('Failed to parse VehicleIDs/DriverIDs:', e);
      }
    }

    // Fetch related master entities so all display fields can populate
    let rel = {};

    try {
      const promises = [];
      // Always fetch customer and project
      console.log('🔧 Edit: Fetching customer and project with IDs:', { CustomerID: full.CustomerID, ProjectID: full.ProjectID });
      if (full.CustomerID) promises.push(customerAPI.getById(full.CustomerID)); else promises.push(Promise.resolve(null));
      if (full.ProjectID) promises.push(projectAPI.getById(full.ProjectID)); else promises.push(Promise.resolve(null));

      // Only fetch vehicle/driver/vendor for Fixed transactions
      if (!isAdhocOrReplacement) {
        // For Fixed transactions, use the first vehicle from VehicleIDs array
        const firstVehicleId = parsedVehicleIds.length > 0 ? parsedVehicleIds[0] : null;
        const firstDriverId = parsedDriverIds.length > 0 ? parsedDriverIds[0] : null;

        if (firstVehicleId) promises.push(vehicleAPI.getById(firstVehicleId)); else promises.push(Promise.resolve(null));
        if (firstDriverId) promises.push(driverAPI.getById(firstDriverId)); else promises.push(Promise.resolve(null));
        if (full.VendorID) promises.push(vendorAPI.getById(full.VendorID)); else promises.push(Promise.resolve(null));

        const [custResp, projResp, vehResp, drvResp, venResp] = await Promise.all(promises);
        rel.customer = custResp?.data || custResp || null;
        rel.project = projResp?.data || projResp || null;
        console.log('🔧 Edit: Project API response:', projResp);
        console.log('🔧 Edit: Processed project data:', rel.project);
        rel.vehicle = vehResp?.data || vehResp || null;
        rel.driver = drvResp?.data || drvResp || null;
        rel.vendor = venResp?.data || venResp || null;
      } else {
        // For Adhoc/Replacement, only fetch customer and project
        const [custResp, projResp] = await Promise.all(promises);
        rel.customer = custResp?.data || custResp || null;
        rel.project = projResp?.data || projResp || null;
        console.log('🔧 Edit: ADHOC/REPLACEMENT - Project API response:', projResp);
        console.log('🔧 Edit: ADHOC/REPLACEMENT - Processed project data:', rel.project);
        rel.vehicle = null;
        rel.driver = null;
        rel.vendor = null;
      }
    } catch (e) {
      console.warn('Edit: related fetches failed', e);
    }

    // Capture IDs for submission (only keep CustomerID, ProjectID, VendorID as single values)
    const newCustomerID = full.CustomerID || row.CustomerID || prev.CustomerID || '';
    console.log('🔧 Edit: Setting CustomerID in ids:', newCustomerID, 'from full.CustomerID:', full.CustomerID, 'row.CustomerID:', row.CustomerID);
    console.log('🔧 Edit: CustomerID type:', typeof newCustomerID, 'is numeric:', !isNaN(newCustomerID));

    setIds(prev => ({
      ...prev,
      CustomerID: newCustomerID,
      ProjectID: full.ProjectID || row.ProjectID || prev.ProjectID || '',
      VendorID: full.VendorID || row.VendorID || prev.VendorID || ''
    }));

    // Store the original CustomerID for fallback during submission
    if (full.CustomerID || row.CustomerID) {
      console.log('🔧 Edit: Storing original CustomerID for fallback:', full.CustomerID || row.CustomerID);
      // We'll use this in the submission logic
    }

    // Handle vehicles from VehicleIDs JSON field (Fixed transactions only)
    let vehicleIds = [];
    let vehicleTags = [];

    if (!isAdhocOrReplacement && full.VehicleIDs) {
      // Parse JSON array of vehicle IDs
      try {
        vehicleIds = Array.isArray(full.VehicleIDs) ? full.VehicleIDs : JSON.parse(full.VehicleIDs);
        // Fetch details for all vehicles
        for (const vId of vehicleIds) {
          try {
            const vResp = await vehicleAPI.getById(vId);
            const vehicle = vResp?.data || vResp;
            if (vehicle) {
              vehicleTags.push({
                id: vId,
                registrationNo: vehicle.VehicleRegistrationNo || 'Unknown',
                type: vehicle.VehicleType || 'Unknown'
              });
            }
          } catch (e) {
            console.warn('Failed to fetch vehicle details for ID:', vId);
          }
        }
      } catch (e) {
        console.warn('Failed to parse VehicleIDs JSON:', e);
      }
    }

    // Handle drivers from DriverIDs JSON field (Fixed transactions only)
    let driverTags = [];

    if (!isAdhocOrReplacement && full.DriverIDs) {
      // Parse JSON array of driver IDs
      try {
        const driverIds = Array.isArray(full.DriverIDs) ? full.DriverIDs : JSON.parse(full.DriverIDs);
        // Fetch details for all drivers
        for (const dId of driverIds) {
          try {
            const dResp = await driverAPI.getById(dId);
            const driver = dResp?.data || dResp;
            if (driver) {
              driverTags.push({
                id: dId,
                name: driver.DriverName || 'Unknown',
                mobile: driver.DriverMobileNo || 'N/A'
              });
            }
          } catch (e) {
            console.warn('Failed to fetch driver details for ID:', dId);
          }
        }
      } catch (e) {
        console.warn('Failed to parse DriverIDs JSON:', e);
      }
    }

    // Populate master section (display fields)
    console.log('🔧 Edit: Setting master data for transaction type:', full.TripType);
    console.log('🔧 Edit: Full transaction data:', full);
    console.log('🔧 Edit: Related data:', rel);

    // Update parsedVehicleIds and parsedDriverIds for multi-select - only use JSON array fields
    if (full.VehicleIDs) {
      try {
        parsedVehicleIds = Array.isArray(full.VehicleIDs) ? full.VehicleIDs : JSON.parse(full.VehicleIDs);
      } catch (e) {
        console.warn('Failed to parse VehicleIDs:', e);
        parsedVehicleIds = [];
      }
    }
    if (full.DriverIDs) {
      try {
        parsedDriverIds = Array.isArray(full.DriverIDs) ? full.DriverIDs : JSON.parse(full.DriverIDs);
      } catch (e) {
        console.warn('Failed to parse DriverIDs:', e);
        parsedDriverIds = [];
      }
    }
    console.log('🔧 Edit: VehicleType from database:', full.VehicleType);
    console.log('🔧 Edit: VehicleType from related vehicle:', rel.vehicle?.VehicleType);

    console.log('🔧 Edit: Setting vendor - full.VendorID:', full.VendorID, 'rel.vendor?.VendorID:', rel.vendor?.VendorID);
    console.log('🔧 Edit: TotalDutyHours from database:', full.TotalDutyHours);
    console.log('🔧 Edit: Document fields from database:', {
      DriverAadharDoc: full.DriverAadharDoc,
      DriverLicenceDoc: full.DriverLicenceDoc,
      TollExpensesDoc: full.TollExpensesDoc,
      ParkingChargesDoc: full.ParkingChargesDoc
    });
    console.log('🔧 Edit: Transaction type for section rendering:', full.TripType);
    console.log('🔧 Edit: Will show Fixed sections:', full.TripType === 'Fixed');

    const newMasterData = {
      Customer: full.CustomerID || '',
      CompanyName: rel.customer?.Name || rel.customer?.MasterCustomerName || full.CompanyName || '',
      GSTNo: rel.customer?.GSTNo || full.CustomerGSTNo || full.GSTNo || '',
      Project: rel.project?.ProjectName || full.ProjectName || '',
      Location: (() => {
        // PRIORITY ORDER: ProjectLocation first, then fallbacks
        const location = full.ProjectLocation || rel.project?.Location || rel.customer?.Locations || full.CustomerLocation || full.Location || '';
        console.log('🔧 LOCATION DEBUG - ProjectLocation from API:', full.ProjectLocation);
        console.log('🔧 LOCATION DEBUG - full.Location from API:', full.Location);
        console.log('🔧 LOCATION DEBUG - rel.project?.Location:', rel.project?.Location);
        console.log('🔧 LOCATION DEBUG - rel.customer?.Locations:', rel.customer?.Locations);
        console.log('🔧 LOCATION DEBUG - full.CustomerLocation:', full.CustomerLocation);
        console.log('🔧 LOCATION DEBUG - Final location value:', location);
        return location;
      })(),
      CustSite: rel.customer?.CustomerSite || full.CustomerSite || '',
      VehiclePlacementType: rel.project?.PlacementType || full.VehiclePlacementType || 'Fixed',
      VehicleType: full.VehicleType || rel.vehicle?.VehicleType || '', // Use database value first
      VehicleNo: parsedVehicleIds, // Always use parsed VehicleIDs array
      VendorName: rel.vendor?.VendorName || full.VendorName || '',
      VendorCode: rel.vendor?.VendorCode || full.VendorCode || '',
      TypeOfTransaction: full.TripType || 'Fixed'
    };

    console.log('🔧 EDIT STATE - Setting masterData to:', newMasterData);
    console.log('🔧 EDIT STATE - About to set masterData.Location to:', newMasterData.Location);
    console.log('🔧 EDIT STATE - About to set masterData.TypeOfTransaction to:', newMasterData.TypeOfTransaction);
    console.log('🔧 VEHICLE DEBUG - parsedVehicleIds:', parsedVehicleIds);
    console.log('🔧 VEHICLE DEBUG - newMasterData.VehicleNo:', newMasterData.VehicleNo);

    // ADDITIONAL LOCATION DEBUGGING
    console.log('🔧 LOCATION FINAL DEBUG - API Response full.ProjectLocation:', full.ProjectLocation);
    console.log('🔧 LOCATION FINAL DEBUG - Related project location:', rel.project?.Location);
    console.log('🔧 LOCATION FINAL DEBUG - Related customer locations:', rel.customer?.Locations);
    console.log('🔧 LOCATION FINAL DEBUG - Final masterData.Location:', newMasterData.Location);

    setMasterData(newMasterData);

    // VERIFY STATE WAS SET CORRECTLY
    console.log('🔧 EDIT STATE - masterData state has been updated');
    console.log('🔧 EDIT STATE - Expected Location in form field:', newMasterData.Location);
    console.log('🔧 EDIT STATE - Form field should now show Location:', newMasterData.Location);

    console.log('🔧 EDIT STATE - masterData.TypeOfTransaction set to:', full.TripType || 'Fixed');
    console.log('🔧 EDIT STATE - This will determine which form sections are shown');
    console.log('🔧 EDIT STATE - Expected sections for', full.TripType, ':', {
      'Fixed': 'Blue (driver), Yellow (calculation), Orange (supervisor) sections',
      'Adhoc': 'ADHOC/REPLACEMENT section only',
      'Replacement': 'ADHOC/REPLACEMENT section only'
    }[full.TripType] || 'Unknown transaction type');

    console.log('🔧 Edit: masterData.VendorName set to:', full.VendorID || rel.vendor?.VendorID || '');

    // Store the VendorID for later use after vendors are loaded
    if (full.VendorID) {
      console.log('🔧 Edit: Storing VendorID for later selection:', full.VendorID);
      // We'll trigger vendor selection after vendors are loaded in useEffect
    }
    setSelectedDrivers(parsedDriverIds); // Always use parsed DriverIDs array

    // Set driver tags for display
    setSelectedDrivers(driverTags);

    // Populate transaction section
    console.log('🔧 Edit: Populating transaction data...');
    console.log('🔧 Edit: Transaction fields from DB:', {
      DriverID: full.DriverID,
      DriverMobileNo: full.DriverMobileNo,
      TransactionDate: full.TransactionDate,
      ArrivalTimeAtHub: full.ArrivalTimeAtHub,
      TotalDeliveries: full.TotalDeliveries,
      TripNo: full.TripNo,
      VehicleNumber: full.VehicleNumber
    });

    // Populate transaction data based on transaction type
    console.log('🔧 EDIT STATE - About to populate transactionData, isAdhocOrReplacement:', isAdhocOrReplacement);

    if (isAdhocOrReplacement) {
      // For Adhoc/Replacement transactions, populate all fields
      console.log('🔧 EDIT STATE - Setting Adhoc/Replacement transactionData');
      setTransactionData(prev => ({
        ...prev,
        DriverID: rel.driver?.DriverID || full.DriverID || '',
        DriverMobileNo: rel.driver?.DriverMobileNo || full.DriverMobileNo || '',
        TripNumber: full.TripNumber || '',
        Date: formatDateForInput(full.TransactionDate) || getCurrentDate(),
        ArrivalTimeAtHub: full.ArrivalTimeAtHub || '',
        InTimeByCust: full.InTimeByCust || '',
        OutTimeFromHub: full.OutTimeFromHub || '',

        // NEW: 6 Time Fields (Mandatory - Chronological Order)
        VehicleReportingAtHub: full.VehicleReportingAtHub || '',
        VehicleEntryInHub: full.VehicleEntryInHub || '',
        VehicleOutFromHubForDelivery: full.VehicleOutFromHubForDelivery || '',
        VehicleReturnAtHub: full.VehicleReturnAtHub || '',
        VehicleEnteredAtHubReturn: full.VehicleEnteredAtHubReturn || '',
        VehicleOutFromHubFinal: full.VehicleOutFromHubFinal || '',

        OpeningKM: full.OpeningKM || '',
        ClosingKM: full.ClosingKM || '',
        ReturnReportingTime: full.ReturnReportingTime || '',
        TotalDutyHours: full.TotalDutyHours || '',
        TripClose: !!full.TripClose,
        Remarks: full.Remarks || '',
        // Adhoc/Replacement specific fields
        TripNo: full.TripNo || '',
        VehicleNumber: full.VehicleNumber || '',
        VehicleType: full.VehicleType || '',
        VendorName: full.VendorName || '',
        VendorNumber: full.VendorNumber || '',
        DriverName: full.DriverName || '',
        DriverNumber: full.DriverNumber || '',
        DriverAadharNumber: full.DriverAadharNumber || '',
        DriverLicenceNumber: full.DriverLicenceNumber || '',

        // Document fields removed - handled by files state and _url fields
        TotalShipmentsForDeliveries: full.TotalShipmentsForDeliveries || '',
        TotalShipmentDeliveriesAttempted: full.TotalShipmentDeliveriesAttempted || '',
        TotalShipmentDeliveriesDone: full.TotalShipmentDeliveriesDone || '',
        VFreightFix: full.VFreightFix || '',
        FixKm: full.FixKm || '',
        VFreightVariable: full.VFreightVariable || '',
        TollExpenses: full.TollExpenses || '',
        ParkingCharges: full.ParkingCharges || '',
        LoadingCharges: full.LoadingCharges || '',
        UnloadingCharges: full.UnloadingCharges || '',
        OtherCharges: full.OtherCharges || '',
        OtherChargesRemarks: full.OtherChargesRemarks || '',
        AdvanceRequestNo: full.AdvanceRequestNo || '',
        AdvanceToPaid: full.AdvanceToPaid || '',
        AdvanceApprovedAmount: full.AdvanceApprovedAmount || '',
        AdvanceApprovedBy: full.AdvanceApprovedBy || '',
        AdvancePaidAmount: full.AdvancePaidAmount || '',
        AdvancePaidMode: full.AdvancePaidMode || '',
        AdvancePaidDate: formatDateForInput(full.AdvancePaidDate) || '',
        AdvancePaidBy: full.AdvancePaidBy || '',
        EmployeeDetailsAdvance: full.EmployeeDetailsAdvance || '',
        BalancePaidAmount: full.BalancePaidAmount || '',
        BalancePaidDate: formatDateForInput(full.BalancePaidDate) || '',
        BalancePaidBy: full.BalancePaidBy || '',
        EmployeeDetailsBalance: full.EmployeeDetailsBalance || ''
      }));
    } else {
      // For Fixed transactions, populate ALL fields including financial fields
      console.log('🔧 FIXED EDIT - About to populate TripNo with:', full.TripNo);
      console.log('🔧 FIXED EDIT - About to populate Location with:', full.ProjectLocation);
      setTransactionData(prev => ({
        ...prev,
        DriverID: parsedDriverIds.length > 0 ? parsedDriverIds[0] : '',
        DriverMobileNo: rel.driver?.DriverMobileNo || '',
        TripNo: full.TripNo || '',
        ReplacementDriverName: full.ReplacementDriverName || '',
        ReplacementDriverNo: full.ReplacementDriverNo || '',
        Date: formatDateForInput(full.TransactionDate) || getCurrentDate(),
        Shift: full.Shift || '',
        ArrivalTimeAtHub: full.ArrivalTimeAtHub || '',
        InTimeByCust: full.InTimeByCust || '',
        OutTimeFromHub: full.OutTimeFromHub || '',
        ReturnReportingTime: full.ReturnReportingTime || '',

        // NEW: 6 Time Fields (Mandatory - Chronological Order)
        VehicleReportingAtHub: full.VehicleReportingAtHub || '',
        VehicleEntryInHub: full.VehicleEntryInHub || '',
        VehicleOutFromHubForDelivery: full.VehicleOutFromHubForDelivery || '',
        VehicleReturnAtHub: full.VehicleReturnAtHub || '',
        VehicleEnteredAtHubReturn: full.VehicleEnteredAtHubReturn || '',
        VehicleOutFromHubFinal: full.VehicleOutFromHubFinal || '',

        OpeningKM: full.OpeningKM || '',
        ClosingKM: full.ClosingKM || '',
        TotalDeliveries: full.TotalDeliveries || '',
        TotalDeliveriesAttempted: full.TotalDeliveriesAttempted || '',
        TotalDeliveriesDone: full.TotalDeliveriesDone || '',
        TotalDutyHours: full.TotalDutyHours || '',
        TripClose: !!full.TripClose,
        Remarks: full.Remarks || '',

        // Financial and additional fields for Fixed transactions
        VFreightFix: full.VFreightFix || '',
        FixKm: full.FixKm || '',
        VFreightVariable: full.VFreightVariable || '',
        TollExpenses: full.TollExpenses || '',
        ParkingCharges: full.ParkingCharges || '',
        LoadingCharges: full.LoadingCharges || '',
        UnloadingCharges: full.UnloadingCharges || '',
        OtherCharges: full.OtherCharges || '',
        OtherChargesRemarks: full.OtherChargesRemarks || '',
        HandlingCharges: full.HandlingCharges || '',
        OutTimeFrom: full.OutTimeFrom || '',
        TotalFreight: full.TotalFreight || '',

        // Vehicle and vendor fields
        VehicleType: full.VehicleType || '',
        VehicleNumber: full.VehicleNumber || '',
        VendorName: full.VendorName || '',
        VendorNumber: full.VendorNumber || '',
        DriverName: full.DriverName || '',
        DriverNumber: full.DriverNumber || '',
        DriverAadharNumber: full.DriverAadharNumber || '',
        DriverLicenceNumber: full.DriverLicenceNumber || '',

        // Company and customer site fields (Location is handled in masterData, not transactionData)
        CompanyName: full.CompanyName || '',
        GSTNo: full.GSTNo || '',
        CustomerSite: full.CustomerSite || '',

        // Shipment fields
        TotalShipmentsForDeliveries: full.TotalShipmentsForDeliveries || '',
        TotalShipmentDeliveriesAttempted: full.TotalShipmentDeliveriesAttempted || '',
        TotalShipmentDeliveriesDone: full.TotalShipmentDeliveriesDone || '',

        // Advance payment fields
        AdvanceRequestNo: full.AdvanceRequestNo || '',
        AdvanceToPaid: full.AdvanceToPaid || '',
        AdvanceApprovedAmount: full.AdvanceApprovedAmount || '',
        AdvanceApprovedBy: full.AdvanceApprovedBy || '',
        AdvancePaidAmount: full.AdvancePaidAmount || '',
        AdvancePaidMode: full.AdvancePaidMode || '',
        AdvancePaidDate: full.AdvancePaidDate || '',
        AdvancePaidBy: full.AdvancePaidBy || '',
        EmployeeDetailsAdvance: full.EmployeeDetailsAdvance || '',

        // Balance payment fields
        BalanceToBePaid: full.BalanceToBePaid || '',
        BalancePaidAmount: full.BalancePaidAmount || '',
        Variance: full.Variance || '',
        BalancePaidDate: full.BalancePaidDate || '',
        BalancePaidBy: full.BalancePaidBy || '',
        EmployeeDetailsBalance: full.EmployeeDetailsBalance || '',

        // Financial calculations
        Revenue: full.Revenue || '',
        Margin: full.Margin || '',
        MarginPercentage: full.MarginPercentage || '',

        // Document fields removed - handled by files state and _url fields
      }));

      console.log('🔧 FIXED EDIT - TransactionData populated with documents:', {
        DriverAadharDoc: full.DriverAadharDoc,
        DriverLicenceDoc: full.DriverLicenceDoc,
        TollExpensesDoc: full.TollExpensesDoc,
        ParkingChargesDoc: full.ParkingChargesDoc,
        ReplacementDriverName: full.ReplacementDriverName,
        ReplacementDriverNo: full.ReplacementDriverNo
      });
      console.log('🔧 FIXED EDIT - Document fields should now be available in transactionData state');
      console.log('🔧 Edit: Key fields populated:', {
        ProjectID: full.ProjectID,
        TripNo: full.TripNo,
        CustomerID: full.CustomerID,
        TransactionDate: full.TransactionDate
      });

      // CRITICAL DEBUG: Check if transactionData.TripNo is actually set
      console.log('🚨 CRITICAL DEBUG - transactionData.TripNo after setting:', full.TripNo);
      console.log('🚨 CRITICAL DEBUG - masterData.Location after setting:', newMasterData.Location);
      console.log('🚨 CRITICAL DEBUG - masterData.TypeOfTransaction after setting:', newMasterData.TypeOfTransaction);
      console.log('🔧 Edit: ALL AVAILABLE FIELDS in full object:', Object.keys(full));
      console.log('🔧 Edit: Project data fetched:', rel.project);
      console.log('🔧 Edit: Project data keys:', rel.project ? Object.keys(rel.project) : 'No project data');
      console.log('🔧 Edit: Location data sources:', {
        'full.Location': full.Location,
        'full.CustomerLocation': full.CustomerLocation,
        'full.ProjectLocation': full.ProjectLocation,
        'rel.customer?.Locations': rel.customer?.Locations,
        'rel.project?.Location': rel.project?.Location,
        'rel.project (full object)': rel.project,
        'final_location_used': rel.project?.Location || rel.customer?.Locations || full.Location || full.CustomerLocation || full.ProjectLocation || ''
      });
    }

    // Populate calculation section
    console.log('🔧 Edit: Setting calculatedData - TotalDutyHours:', full.TotalDutyHours);
    setCalculatedData(prev => ({
      ...prev,
      TotalKM: full.TotalKM || prev.TotalKM || ((full.ClosingKM && full.OpeningKM) ? (Number(full.ClosingKM) - Number(full.OpeningKM)) : ''),
      VFreightFix: full.VFreightFix ?? prev.VFreightFix ?? '',
      TollExpenses: full.TollExpenses ?? prev.TollExpenses ?? '',
      ParkingCharges: full.ParkingCharges ?? prev.ParkingCharges ?? '',
      HandlingCharges: full.HandlingCharges ?? prev.HandlingCharges ?? '',
      OutTimeFromHUB: full.OutTimeFrom ?? prev.OutTimeFromHUB ?? '',
      TotalDutyHours: full.TotalDutyHours ?? prev.TotalDutyHours ?? ''
    }));

    // Populate supervisor section
    console.log('🔧 Edit: Setting supervisor data - Remarks:', full.Remarks, 'TripClose:', full.TripClose, 'Status:', full.Status);
    // Fix: Use simple boolean conversion of TripClose field from database
    const tripCloseValue = !!full.TripClose;
    console.log('🔧 Edit: Calculated TripClose value:', tripCloseValue);
    setSupervisorData(prev => ({
      ...prev,
      Remarks: full.Remarks || prev.Remarks || '',
      TripClose: tripCloseValue
    }));

    // Also update transactionData.TripClose to sync both checkboxes
    setTransactionData(prev => ({
      ...prev,
      TripClose: tripCloseValue
    }));

    // Hide project dropdown by default when editing; user can change customer to re-evaluate
    setIsProjectDropdownVisible(false);

    // Trigger customer selection logic to load projects and set correct values
    if (full.CustomerID) {
      console.log('🔄 Edit: Triggering customer selection for CustomerID:', full.CustomerID);
      // Use different handlers based on transaction type
      setTimeout(() => {
        if (isAdhocOrReplacement) {
          // For ADHOC/Replacement, use handleCompanySelect to load projects
          handleCompanySelect({ target: { value: full.CustomerID } });
        } else {
          // For Fixed transactions, use handleMasterDataChange
          handleMasterDataChange({ target: { name: 'Customer', value: full.CustomerID } });
        }
      }, 100);
    }

    // Reset files state for new uploads (following Vendor Form pattern)
    setFiles({
      DriverAadharDoc: null,
      DriverLicenceDoc: null,
      TollExpensesDoc: null,
      ParkingChargesDoc: null,
      OpeningKMImage: null,
      ClosingKMImage: null
    });

    // Scroll to top of the page to show the form
    window.scrollTo({ top: 0, behavior: 'smooth' });
    console.log('🔧 EDIT COMPLETE - Edit process completed successfully');

    } catch (error) {
      console.error('🔧 EDIT ERROR - Error during edit process:', error);
      alert('Error loading transaction data for edit. Please try again.');
    }
  };

  const handleDelete = async (transactionOrId) => {
    // Extract ID from object or use the ID directly
    const transactionId = typeof transactionOrId === 'object'
      ? transactionOrId.TransactionID
      : transactionOrId;

    console.log('🗑️ Delete requested for transaction:', transactionId);

    if (window.confirm('Are you sure you want to delete this transaction?')) {
      try {
        await vehicleTransactionAPI.delete(transactionId);
        apiHelpers.showSuccess('Transaction deleted successfully');
        fetchTransactions();
      } catch (error) {
        apiHelpers.showError(error, 'Failed to delete transaction');
      }
    }
  };

  const handleBulkDelete = async (transactionIds) => {
    console.log('🗑️ Bulk delete requested for transaction IDs:', transactionIds);

    if (transactionIds.length === 0) {
      apiHelpers.showError(null, 'No transactions selected for deletion.');
      return;
    }

    // Get transaction details for confirmation
    const selectedTransactions = transactions.filter(t => transactionIds.includes(t.TransactionID));
    const transactionDetails = selectedTransactions.map(t =>
      `${t.TransactionID} (${t.VehicleRegistrationNo || 'N/A'})`
    ).join(', ');

    const confirmMessage = transactionIds.length === 1
      ? `Are you sure you want to delete transaction ${transactionDetails}?`
      : `Are you sure you want to delete ${transactionIds.length} transactions?\n\nTransactions: ${transactionDetails}`;

    if (window.confirm(confirmMessage)) {
      try {
        const response = await vehicleTransactionAPI.bulkDelete(transactionIds);

        if (response.data.deletedCount > 0) {
          apiHelpers.showSuccess(
            `Successfully deleted ${response.data.deletedCount} transaction(s)!` +
            (response.data.notFoundCount > 0 ? ` (${response.data.notFoundCount} not found)` : '')
          );
        } else {
          apiHelpers.showError(null, 'No transactions were deleted. They may have already been removed.');
        }

        fetchTransactions(); // Refresh the list
      } catch (error) {
        console.error('Error bulk deleting transactions:', error);

        // Provide specific error messages for bulk deletion
        let errorMessage;
        if (error.response?.status === 400) {
          errorMessage = 'Cannot delete one or more transactions because they are linked to other records.';
        } else if (error.response?.status === 403) {
          errorMessage = 'You do not have permission to delete these transactions.';
        } else if (error.code === 'ECONNREFUSED' || error.message?.includes('Network Error')) {
          errorMessage = 'Unable to connect to server. Please check your connection and try again.';
        } else {
          errorMessage = 'Unable to delete transactions. Please try again.';
        }

        apiHelpers.showError(error, errorMessage);
      }
    }
  };

  // Export handler - Unified Excel export for all transactions
  const handleExportAllTransactions = async () => {
    try {
      console.log('📊 Exporting all transactions to Excel...');

      // Create download link for all transactions
      const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3004';
      const exportUrl = `${API_BASE_URL}/api/daily-vehicle-transactions/export/all`;

      // Show loading message
      const loadingToast = document.createElement('div');
      loadingToast.style.cssText = `
        position: fixed; top: 20px; right: 20px; z-index: 10000;
        background: #007bff; color: white; padding: 15px 20px;
        border-radius: 5px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        font-family: Arial, sans-serif; font-size: 14px;
      `;
      loadingToast.textContent = '🔄 Exporting transactions... Please wait';
      document.body.appendChild(loadingToast);

      // Create download link
      const link = document.createElement('a');
      link.href = exportUrl;
      link.download = `Daily_Vehicle_Transactions_${new Date().toISOString().slice(0, 10)}.xlsx`;
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Remove loading message
      setTimeout(() => {
        if (document.body.contains(loadingToast)) {
          document.body.removeChild(loadingToast);
        }
      }, 1000);

      // Show success message
      const successToast = document.createElement('div');
      successToast.style.cssText = `
        position: fixed; top: 20px; right: 20px; z-index: 10000;
        background: #28a745; color: white; padding: 15px 20px;
        border-radius: 5px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        font-family: Arial, sans-serif; font-size: 14px;
      `;
      successToast.innerHTML = `✅ Export Started!<br><small>Downloading all transactions (Fixed + Adhoc)</small>`;
      document.body.appendChild(successToast);
      setTimeout(() => {
        if (document.body.contains(successToast)) {
          document.body.removeChild(successToast);
        }
      }, 5000);

    } catch (error) {
      console.error('❌ Export error:', error);
      apiHelpers.showError(error, 'Failed to export transactions');
    }
  };

  const transactionColumns = [
    { key: 'SerialNumber', label: 'S.No.', sortable: true, width: '60px' },
    { key: 'TripType', label: 'Type', sortable: true, width: '80px', render: (value) => {
        const typeColors = {
          'Fixed': '🟢 Fixed',
          'Adhoc': '🟡 Adhoc',
          'Replacement': '🔴 Replace'
        };
        return typeColors[value] || value || '-';
      }
    },
    { key: 'TransactionDate', label: 'Date', type: 'date', sortable: true, width: '100px' },
    { key: 'CustomerName', label: 'Customer', sortable: true, width: '150px' },
    { key: 'DisplayVehicle', label: 'Vehicle', sortable: true, width: '120px', render: (value, row) => value || row.VehicleRegistrationNo || row.VehicleNumber || '-' },
    { key: 'DisplayDriver', label: 'Driver', sortable: true, width: '120px', render: (value, row) => value || row.DriverName || '-' },
    { key: 'TotalKM', label: 'KM', sortable: true, width: '80px', render: (value) => (value ? `${value}` : '-') },
    { key: 'Status', label: 'Status', sortable: true, width: '80px', render: (value, row) => {
        const txt = value || 'Pending';
        const isClosed = row.TripClose === 1 || row.TripClose === true;
        return isClosed ? '🔒 Closed' : (txt === 'Completed' ? '✅ Done' : '⏳ ' + txt);
      }
    }
  ];

  return (
    <div className="daily-transaction-form-container">
      <div className="form-header">
        <h1>Daily Vehicle Transaction Entry</h1>
        <p>Enter daily vehicle transaction details with color-coded sections for clarity</p>
        <div style={{
          fontSize: '12px',
          color: '#28a745',
          marginTop: '5px',
          display: 'flex',
          alignItems: 'center',
          gap: '5px'
        }}>
          💾 <span>Form data is automatically saved and will persist until you submit or reset</span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="daily-transaction-form">
        <h3>{editingTransaction ? 'Edit Transaction' : 'Daily Transaction Entry'}</h3>

        {editingTransaction && (
          <div className="edit-mode-notice">
            <p>You are editing an existing transaction</p>
            <button
              type="button"
              className="cancel-edit-btn"
              onClick={resetForm}
            >
              Cancel Edit
            </button>
          </div>
        )}

        <div className="form-sections">
          {/* GREY SECTION - Details from Master */}
          <div className="form-section master-section">

            <div className="form-grid">
              {/* Type of Transaction - First field */}
              <div className="form-group">
                <label>Type of Vehicle Placement *</label>
                <select
                  name="TypeOfTransaction"
                  value={masterData.TypeOfTransaction}
                  onChange={handleMasterDataChange}
                  className="form-control"
                  required
                >
                  <option value="Fixed">Fixed</option>
                  <option value="Adhoc">Adhoc</option>
                  <option value="Replacement">Replacement</option>
                </select>
              </div>

              {/* Vehicle Number - Show only for Fixed transactions */}
              {masterData.TypeOfTransaction === 'Fixed' && (
                <div className="form-group">
                  <label>Vehicle Number *</label>
                  <SearchableDropdown
                    name="VehicleNo"
                    value={masterData.VehicleNo.length > 0 ? masterData.VehicleNo[0] : ''}
                    onChange={handleVehicleAutoPopulate}
                    options={vehicles}
                    valueKey="VehicleID"
                    labelKey="VehicleRegistrationNo"
                    placeholder="Select Vehicle"
                    searchPlaceholder="Search vehicles..."
                    emptyLabel="Select Vehicle"
                    required
                    error={errors.VehicleNo}
                  />
                </div>
              )}

              {/* Company Name - Different behavior for Fixed vs Adhoc/Replacement */}
              <div className="form-group">
                <label>Company Name *</label>
                {masterData.TypeOfTransaction === 'Fixed' ? (
                  <input
                    type="text"
                    name="CompanyName"
                    value={masterData.CompanyName}
                    onChange={handleMasterDataChange}
                    className="readonly-field"
                    readOnly
                    placeholder="Auto-populated from selected vehicle"
                  />
                ) : (
                  <SearchableDropdown
                    name="Customer"
                    value={masterData.Customer}
                    onChange={handleCompanySelect}
                    options={customers}
                    valueKey="CustomerID"
                    labelKey="Name"
                    formatLabel={(customer) => customer.Name || customer.MasterCustomerName || `Customer ${customer.CustomerID}`}
                    placeholder="Select Company"
                    searchPlaceholder="Search companies..."
                    emptyLabel="Select Company"
                    required
                  />
                )}
                {errors.Customer && <span className="error-message">{errors.Customer}</span>}
              </div>

              <div className="form-group">
                <label>GST No</label>
                <input
                  type="text"
                  name="GSTNo"
                  value={masterData.GSTNo}
                  onChange={handleMasterDataChange}
                  className="readonly-field"
                  readOnly
                  placeholder={masterData.TypeOfTransaction === 'Fixed' ? 'Auto-populated from selected vehicle' : 'Auto-populated from selected company'}
                />
              </div>

              <div className="form-group">
                <label>Project *</label>
                {isProjectDropdownVisible && availableProjects.length > 1 ? (
                  <SearchableDropdown
                    name="Project"
                    value={ids.ProjectID}
                    onChange={handleProjectSelection}
                    options={availableProjects}
                    valueKey="ProjectID"
                    labelKey="ProjectName"
                    placeholder="Select a project"
                    className={errors.Project ? 'error' : ''}
                  />
                ) : (
                  <input
                    type="text"
                    name="Project"
                    value={masterData.Project}
                    onChange={handleMasterDataChange}
                    className="readonly-field"
                    readOnly
                    placeholder={masterData.TypeOfTransaction === 'Fixed' ? 'Auto-populated from selected vehicle\'s project' : 'Auto-populated from selected company'}
                  />
                )}
                {errors.Project && <span className="error-message">{errors.Project}</span>}
              </div>

              <div className="form-group">
                <label>Location *</label>
                <input
                  type="text"
                  name="Location"
                  value={masterData.Location}
                  onChange={handleMasterDataChange}
                  className="readonly-field"
                  readOnly
                  placeholder={masterData.TypeOfTransaction === 'Fixed' ? 'Auto-populated from selected vehicle' : 'Auto-populated from selected project'}
                />
                {errors.CustSite && <span className="error-message">{errors.CustSite}</span>}
              </div>



              {/* Vehicle Type - Dropdown for Adhoc/Replacement, Read-only for Fixed */}
              <div className="form-group">
                <label>Vehicle Type</label>
                {masterData.TypeOfTransaction === 'Fixed' ? (
                  <input
                    type="text"
                    name="VehicleType"
                    value={masterData.VehicleType}
                    onChange={handleMasterDataChange}
                    className="readonly-field"
                    readOnly
                    placeholder="Auto-populated from selected vehicle"
                  />
                ) : (
                  <select
                    name="VehicleType"
                    value={masterData.VehicleType}
                    onChange={handleMasterDataChange}
                    className="form-control"
                    required
                  >
                    <option value="">Select Vehicle Type</option>
                    <option value="LP">LP</option>
                    <option value="LPT">LPT</option>
                    <option value="Tata Ace">Tata Ace</option>
                    <option value="Pickup">Pickup</option>
                    <option value="Tata 407 10ft">Tata 407 10ft</option>
                    <option value="Tata 407 14ft">Tata 407 14ft</option>
                    <option value="Eicher 17ft">Eicher 17ft</option>
                  </select>
                )}
              </div>

              {/* Vendor Name - Show only for Fixed transactions */}
              {masterData.TypeOfTransaction === 'Fixed' && (
                <div className="form-group">
                  <label>Vendor Name</label>
                  <input
                    type="text"
                    name="VendorName"
                    value={masterData.VendorName}
                    onChange={handleMasterDataChange}
                    className="readonly-field"
                    readOnly
                    placeholder="Auto-populated from selected vehicle"
                  />
                </div>
              )}

              {/* Vendor Code - Show only for Fixed transactions */}
              {masterData.TypeOfTransaction === 'Fixed' && (
                <div className="form-group">
                  <label>Vendor Code</label>
                  <input
                    type="text"
                    name="VendorCode"
                    value={masterData.VendorCode}
                    onChange={handleMasterDataChange}
                    className="readonly-field"
                    readOnly
                    placeholder="Auto-populated from selected vehicle"
                  />
                </div>
              )}

            </div>
          </div>

          {/* BLUE SECTION - Daily Transactions Details by Driver (FIXED ONLY) */}
          {masterData.TypeOfTransaction === 'Fixed' && (
            <div className="form-section driver-section">


            <div className="form-grid">
              {/* Driver Selection - Multiple for Fixed, Single for Adhoc/Replacement */}
              {masterData.TypeOfTransaction === 'Fixed' ? (
                <>
                  <div className="form-group">
                    <label>Driver Name *</label>
                    <input
                      type="text"
                      name="DriverName"
                      value={transactionData.DriverID ?
                        drivers.find(d => d.DriverID == transactionData.DriverID)?.DriverName || ""
                        : ""
                      }
                      className="readonly-field"
                      readOnly
                      placeholder="Auto-populated from selected vehicle"
                    />
                  </div>

                  <div className="form-group">
                    <label>Driver Number</label>
                    <input
                      type="text"
                      name="DriverMobileNo"
                      value={transactionData.DriverMobileNo}
                      onChange={handleTransactionDataChange}
                      className="readonly-field"
                      readOnly
                      placeholder="Auto-populated from selected driver"
                    />
                  </div>

                  <div className="form-group">
                    <label>Trip Number *</label>
                    <input
                      type="text"
                      name="TripNumber"
                      value={transactionData.TripNo || ''}
                      onChange={(e) => {
                        setTransactionData(prev => ({
                          ...prev,
                          TripNo: e.target.value
                        }));
                      }}
                      className={errors.TripNo ? 'error' : ''}
                      placeholder="Enter trip number"
                    />
                    {errors.TripNo && <span className="error-message">{errors.TripNo}</span>}
                  </div>
                </>
              ) : (
                <>
                  <div className="form-group">
                    <label>Driver Name *</label>
                    <SearchableDropdown
                      name="DriverID"
                      value={transactionData.DriverID}
                      onChange={handleDriverAutoPopulate}
                      options={drivers}
                      valueKey="DriverID"
                      labelKey="DriverName"
                      placeholder={transactionData.DriverID ?
                        drivers.find(d => d.DriverID == transactionData.DriverID)?.DriverName || "Select Driver"
                        : "Select Driver"
                      }
                      searchPlaceholder="Search drivers..."
                      emptyLabel="Select Driver"
                      required
                      error={errors.DriverID}
                    />
                  </div>

                  <div className="form-group">
                    <label>Driver Number</label>
                    <input
                      type="text"
                      name="DriverMobileNo"
                      value={transactionData.DriverMobileNo}
                      onChange={handleTransactionDataChange}
                      className="readonly-field"
                      readOnly
                      placeholder="Auto-populated from selected driver"
                    />
                  </div>


                </>
              )}

              {/* Replacement Driver Fields - Only for Fixed transactions */}
              {masterData.TypeOfTransaction === 'Fixed' && (
                <>
                  <div className="form-group">
                    <label>Replacement Driver Name</label>
                    <input
                      type="text"
                      name="ReplacementDriverName"
                      value={transactionData.ReplacementDriverName}
                      onChange={handleTransactionDataChange}
                      className="form-control"
                      placeholder="Enter replacement driver name"
                      title={`Current value: ${transactionData.ReplacementDriverName || 'empty'}`}
                    />
                    {/* Debug info */}
                    <small style={{color: '#666', fontSize: '0.8em'}}>
                      Debug: "{transactionData.ReplacementDriverName || 'empty'}"
                    </small>
                  </div>

                  <div className="form-group">
                    <label>Replacement Driver No</label>
                    <input
                      type="text"
                      name="ReplacementDriverNo"
                      value={transactionData.ReplacementDriverNo}
                      onChange={handleReplacementDriverNoChange}
                      className="form-control"
                      placeholder="Enter 10-digit mobile number"
                      maxLength="10"
                      style={{
                        MozAppearance: 'textfield',
                        WebkitAppearance: 'none'
                      }}
                      title={`Current value: ${transactionData.ReplacementDriverNo || 'empty'}`}
                    />
                    {/* Debug info */}
                    <small style={{color: '#666', fontSize: '0.8em'}}>
                      Debug: "{transactionData.ReplacementDriverNo || 'empty'}"
                    </small>
                    {errors.ReplacementDriverNo && <span className="error-message">{errors.ReplacementDriverNo}</span>}
                  </div>
                </>
              )}




              {/* <div className="form-group">
                <label>Replacement Driver No</label>
                <input
                  type="text"
                  name="ReplacementDriverNo"
                  value={transactionData.ReplacementDriverNo}
                  readOnly
                  className="readonly-field"
                  placeholder="Auto-populated when replacement driver selected"
                />
              </div> */}

              <div className="form-group">
                <label>Date *</label>
                <input
                  type="date"
                  name="Date"
                  value={transactionData.Date}
                  onChange={handleTransactionDataChange}
                  className={errors.Date ? 'error' : ''}
                />
                {errors.Date && <span className="error-message">{errors.Date}</span>}
              </div>

              {/* NEW: 6 Time Fields (Mandatory - Chronological Order) */}
              <div className="form-group">
                <label>Vehicle Reporting at Hub/WH *</label>
                <TimeInput12Hour
                  name="VehicleReportingAtHub"
                  value={transactionData.VehicleReportingAtHub}
                  onChange={handleTransactionDataChange}
                  className={errors.VehicleReportingAtHub ? 'error' : ''}
                />
                {errors.VehicleReportingAtHub && <span className="error-message">{errors.VehicleReportingAtHub}</span>}
              </div>

              <div className="form-group">
                <label>Vehicle Entry in Hub/WH *</label>
                <TimeInput12Hour
                  name="VehicleEntryInHub"
                  value={transactionData.VehicleEntryInHub}
                  onChange={handleTransactionDataChange}
                  className={errors.VehicleEntryInHub ? 'error' : ''}
                />
                {errors.VehicleEntryInHub && <span className="error-message">{errors.VehicleEntryInHub}</span>}
              </div>

              <div className="form-group">
                <label>Vehicle Out from Hub/WH for Delivery *</label>
                <TimeInput12Hour
                  name="VehicleOutFromHubForDelivery"
                  value={transactionData.VehicleOutFromHubForDelivery}
                  onChange={handleTransactionDataChange}
                  className={errors.VehicleOutFromHubForDelivery ? 'error' : ''}
                />
                {errors.VehicleOutFromHubForDelivery && <span className="error-message">{errors.VehicleOutFromHubForDelivery}</span>}
              </div>

              <div className="form-group">
                <label>Vehicle Return at Hub/WH *</label>
                <TimeInput12Hour
                  name="VehicleReturnAtHub"
                  value={transactionData.VehicleReturnAtHub}
                  onChange={handleTransactionDataChange}
                  className={errors.VehicleReturnAtHub ? 'error' : ''}
                />
                {errors.VehicleReturnAtHub && <span className="error-message">{errors.VehicleReturnAtHub}</span>}
              </div>

              <div className="form-group">
                <label>Vehicle Entered at Hub/WH (Return) *</label>
                <TimeInput12Hour
                  name="VehicleEnteredAtHubReturn"
                  value={transactionData.VehicleEnteredAtHubReturn}
                  onChange={handleTransactionDataChange}
                  className={errors.VehicleEnteredAtHubReturn ? 'error' : ''}
                />
                {errors.VehicleEnteredAtHubReturn && <span className="error-message">{errors.VehicleEnteredAtHubReturn}</span>}
              </div>

              <div className="form-group">
                <label>Vehicle Out from Hub Final (Trip Close) *</label>
                <TimeInput12Hour
                  name="VehicleOutFromHubFinal"
                  value={transactionData.VehicleOutFromHubFinal}
                  onChange={handleTransactionDataChange}
                  className={errors.VehicleOutFromHubFinal ? 'error' : ''}
                />
                {errors.VehicleOutFromHubFinal && <span className="error-message">{errors.VehicleOutFromHubFinal}</span>}
              </div>

              <div className="form-group">
                <label>Opening KM *</label>
                <input
                  type="number"
                  name="OpeningKM"
                  value={transactionData.OpeningKM}
                  onChange={handleTransactionDataChange}
                  className={errors.OpeningKM ? 'error' : ''}
                  step="0.01"
                  placeholder="Enter opening KM"
                />
                {errors.OpeningKM && <span className="error-message">{errors.OpeningKM}</span>}
              </div>

              <div className="form-group">
                <label>Opening KM Image</label>
                <DocumentUpload
                  label=""
                  name="OpeningKMImage"
                  value={files.OpeningKMImage}
                  onChange={createFileChangeHandler('OpeningKMImage')}
                  accept="image/*"
                  required={false}
                  isEditing={!!editingTransaction}
                  existingFileUrl={editingTransaction?.OpeningKMImage_url || null}
                  entityType="transactions"
                />
              </div>



              <div className="form-group">
                <label>Total Deliveries</label>
                <input
                  type="number"
                  name="TotalDeliveries"
                  value={transactionData.TotalDeliveries}
                  onChange={handleTransactionDataChange}
                />
              </div>

              <div className="form-group">
                <label>Total Deliveries Attempted</label>
                <input
                  type="number"
                  name="TotalDeliveriesAttempted"
                  value={transactionData.TotalDeliveriesAttempted}
                  onChange={handleTransactionDataChange}
                />
              </div>

              <div className="form-group">
                <label>Total Deliveries Done</label>
                <input
                  type="number"
                  name="TotalDeliveriesDone"
                  value={transactionData.TotalDeliveriesDone}
                  onChange={handleTransactionDataChange}
                />
              </div>



              <div className="form-group">
                <label>Closing KM *</label>
                <input
                  type="number"
                  name="ClosingKM"
                  value={transactionData.ClosingKM}
                  onChange={handleTransactionDataChange}
                  className={errors.ClosingKM ? 'error' : ''}
                  step="0.01"
                  placeholder="Enter closing KM"
                />
                {errors.ClosingKM && <span className="error-message">{errors.ClosingKM}</span>}
              </div>

              <div className="form-group">
                <label>Closing KM Image</label>
                <DocumentUpload
                  label=""
                  name="ClosingKMImage"
                  value={files.ClosingKMImage}
                  onChange={createFileChangeHandler('ClosingKMImage')}
                  accept="image/*"
                  required={false}
                  isEditing={!!editingTransaction}
                  existingFileUrl={editingTransaction?.ClosingKMImage_url || null}
                  entityType="transactions"
                />
              </div>


            </div>
          </div>
          )}

          {/* ADHOC/REPLACEMENT SECTION - Comprehensive Form */}
          {(masterData.TypeOfTransaction === 'Adhoc' || masterData.TypeOfTransaction === 'Replacement') && (
            <div className="form-section adhoc-replacement-section" style={{ backgroundColor: '#f8f9fa', border: '2px solid #007bff', borderRadius: '8px', padding: '20px', margin: '20px 0' }}>
              <h3 style={{ color: '#007bff', marginBottom: '20px', textAlign: 'center' }}>
                {masterData.TypeOfTransaction} Transaction Details
              </h3>
              {/* Debug info */}
              <div style={{ fontSize: '0.8em', color: '#666', marginBottom: '10px' }}>
                Debug: TypeOfTransaction = "{masterData.TypeOfTransaction}", EditingTransaction = {editingTransaction ? editingTransaction.TransactionID : 'null'}
              </div>

              <div className="form-grid">
                {/* Date */}
                <div className="form-group">
                  <label>Date *</label>
                  <input
                    type="date"
                    name="Date"
                    value={transactionData.Date}
                    onChange={handleTransactionDataChange}
                    className={errors.Date ? 'error' : ''}
                  />
                  {errors.Date && <span className="error-message">{errors.Date}</span>}
                </div>

                {/* Trip No */}
                <div className="form-group">
                  <label>Trip No *</label>
                  <input
                    type="text"
                    name="TripNo"
                    value={transactionData.TripNo}
                    onChange={handleTransactionDataChange}
                    className={errors.TripNo ? 'error' : ''}
                    placeholder="Enter trip number"
                  />
                  {errors.TripNo && <span className="error-message">{errors.TripNo}</span>}
                </div>

                {/* Vehicle Number - Manual Entry */}
                <div className="form-group">
                  <label>Vehicle Number *</label>
                  <input
                    type="text"
                    name="VehicleNumber"
                    value={transactionData.VehicleNumber}
                    onChange={handleTransactionDataChange}
                    className={errors.VehicleNumber ? 'error' : ''}
                    placeholder="Enter vehicle number"
                  />
                  {errors.VehicleNumber && <span className="error-message">{errors.VehicleNumber}</span>}
                </div>

                {/* Vendor Name - Manual Entry */}
                <div className="form-group">
                  <label>Vendor Name *</label>
                  <input
                    type="text"
                    name="VendorName"
                    value={transactionData.VendorName}
                    onChange={handleTransactionDataChange}
                    className={errors.VendorName ? 'error' : ''}
                    placeholder="Enter vendor name"
                  />
                  {errors.VendorName && <span className="error-message">{errors.VendorName}</span>}
                </div>

                {/* Vendor Number - Manual Entry */}
                <div className="form-group">
                  <label>Vendor Number</label>
                  <input
                    type="text"
                    name="VendorNumber"
                    value={transactionData.VendorNumber}
                    onChange={handleVendorNumberChange}
                    placeholder="Enter 10-digit vendor number"
                    maxLength="10"
                  />
                  {errors.VendorNumber && <span className="error-message">{errors.VendorNumber}</span>}
                </div>

                {/* Driver Name - Manual Entry */}
                <div className="form-group">
                  <label>Driver Name *</label>
                  <input
                    type="text"
                    name="DriverName"
                    value={transactionData.DriverName}
                    onChange={handleTransactionDataChange}
                    className={errors.DriverName ? 'error' : ''}
                    placeholder="Enter driver name"
                  />
                  {errors.DriverName && <span className="error-message">{errors.DriverName}</span>}
                </div>

                {/* Driver Number - Manual Entry */}
                <div className="form-group">
                  <label>Driver Number *</label>
                  <input
                    type="text"
                    name="DriverNumber"
                    value={transactionData.DriverNumber}
                    onChange={handleDriverNumberChange}
                    className={errors.DriverNumber ? 'error' : ''}
                    placeholder="Enter 10-digit driver number"
                    maxLength="10"
                  />
                  {errors.DriverNumber && <span className="error-message">{errors.DriverNumber}</span>}
                </div>



                {/* Driver Aadhar Number */}
                <div className="form-group">
                  <label>Driver Aadhar Number</label>
                  <input
                    type="text"
                    name="DriverAadharNumber"
                    value={transactionData.DriverAadharNumber}
                    onChange={handleAadharNumberChange}
                    placeholder="Enter 12-digit Aadhar number"
                    maxLength="12"
                  />
                  {errors.DriverAadharNumber && <span className="error-message">{errors.DriverAadharNumber}</span>}
                </div>

                {/* Driver Aadhar Document Upload */}
                <DocumentUpload
                  label="Driver Aadhar Document"
                  name="DriverAadharDoc"
                  value={files.DriverAadharDoc}
                  onChange={createFileChangeHandler('DriverAadharDoc')}
                  accept=".pdf,.jpg,.jpeg,.png"
                  isEditing={!!editingTransaction}
                  existingFileUrl={editingTransaction?.DriverAadharDoc_url || null}
                  entityType="transactions"
                  entityId={editingTransaction?.TransactionID}
                />

                {/* Driver Licence Number */}
                <div className="form-group">
                  <label>Driver Licence Number</label>
                  <input
                    type="text"
                    name="DriverLicenceNumber"
                    value={transactionData.DriverLicenceNumber}
                    onChange={handleTransactionDataChange}
                    placeholder="Enter driver licence number"
                  />
                </div>

                {/* Driver Licence Document Upload */}
                <DocumentUpload
                  label="Driver Licence Document"
                  name="DriverLicenceDoc"
                  value={files.DriverLicenceDoc}
                  onChange={createFileChangeHandler('DriverLicenceDoc')}
                  accept=".pdf,.jpg,.jpeg,.png"
                  isEditing={!!editingTransaction}
                  existingFileUrl={editingTransaction?.DriverLicenceDoc_url || null}
                  entityType="transactions"
                  entityId={editingTransaction?.TransactionID}
                />

                {/* NEW: 6 Time Fields (Mandatory - Chronological Order) */}
                <div className="form-group">
                  <label>Vehicle Reporting at Hub/WH *</label>
                  <TimeInput12Hour
                    name="VehicleReportingAtHub"
                    value={transactionData.VehicleReportingAtHub}
                    onChange={handleTransactionDataChange}
                    className={errors.VehicleReportingAtHub ? 'error' : ''}
                  />
                  {errors.VehicleReportingAtHub && <span className="error-message">{errors.VehicleReportingAtHub}</span>}
                </div>

                <div className="form-group">
                  <label>Vehicle Entry in Hub/WH *</label>
                  <TimeInput12Hour
                    name="VehicleEntryInHub"
                    value={transactionData.VehicleEntryInHub}
                    onChange={handleTransactionDataChange}
                    className={errors.VehicleEntryInHub ? 'error' : ''}
                  />
                  {errors.VehicleEntryInHub && <span className="error-message">{errors.VehicleEntryInHub}</span>}
                </div>

                <div className="form-group">
                  <label>Vehicle Out from Hub/WH for Delivery *</label>
                  <TimeInput12Hour
                    name="VehicleOutFromHubForDelivery"
                    value={transactionData.VehicleOutFromHubForDelivery}
                    onChange={handleTransactionDataChange}
                    className={errors.VehicleOutFromHubForDelivery ? 'error' : ''}
                  />
                  {errors.VehicleOutFromHubForDelivery && <span className="error-message">{errors.VehicleOutFromHubForDelivery}</span>}
                </div>

                <div className="form-group">
                  <label>Vehicle Return at Hub/WH *</label>
                  <TimeInput12Hour
                    name="VehicleReturnAtHub"
                    value={transactionData.VehicleReturnAtHub}
                    onChange={handleTransactionDataChange}
                    className={errors.VehicleReturnAtHub ? 'error' : ''}
                  />
                  {errors.VehicleReturnAtHub && <span className="error-message">{errors.VehicleReturnAtHub}</span>}
                </div>

                <div className="form-group">
                  <label>Vehicle Entered at Hub/WH (Return) *</label>
                  <TimeInput12Hour
                    name="VehicleEnteredAtHubReturn"
                    value={transactionData.VehicleEnteredAtHubReturn}
                    onChange={handleTransactionDataChange}
                    className={errors.VehicleEnteredAtHubReturn ? 'error' : ''}
                  />
                  {errors.VehicleEnteredAtHubReturn && <span className="error-message">{errors.VehicleEnteredAtHubReturn}</span>}
                </div>

                <div className="form-group">
                  <label>Vehicle Out from Hub Final (Trip Close) *</label>
                  <TimeInput12Hour
                    name="VehicleOutFromHubFinal"
                    value={transactionData.VehicleOutFromHubFinal}
                    onChange={handleTransactionDataChange}
                    className={errors.VehicleOutFromHubFinal ? 'error' : ''}
                  />
                  {errors.VehicleOutFromHubFinal && <span className="error-message">{errors.VehicleOutFromHubFinal}</span>}
                </div>

                {/* Opening KM */}
                <div className="form-group">
                  <label>Opening KM *</label>
                  <input
                    type="number"
                    name="OpeningKM"
                    value={transactionData.OpeningKM}
                    onChange={handleTransactionDataChange}
                    className={errors.OpeningKM ? 'error' : ''}
                    step="0.01"
                    placeholder="Enter opening KM"
                  />
                  {errors.OpeningKM && <span className="error-message">{errors.OpeningKM}</span>}
                </div>

                <div className="form-group">
                  <label>Opening KM Image</label>
                  <DocumentUpload
                    label=""
                    name="OpeningKMImage"
                    value={files.OpeningKMImage}
                    onChange={createFileChangeHandler('OpeningKMImage')}
                    accept="image/*"
                    required={false}
                    isEditing={!!editingTransaction}
                    existingFileUrl={editingTransaction?.OpeningKMImage_url || null}
                    entityType="transactions"
                  />
                </div>



                {/* Total Shipments for Deliveries */}
                <div className="form-group">
                  <label>Total Shipments for Deliveries</label>
                  <input
                    type="number"
                    name="TotalShipmentsForDeliveries"
                    value={transactionData.TotalShipmentsForDeliveries}
                    onChange={handleTransactionDataChange}
                    step="1"
                  />
                </div>

                {/* Total Shipment Deliveries Attempted */}
                <div className="form-group">
                  <label>Total Shipment Deliveries Attempted</label>
                  <input
                    type="number"
                    name="TotalShipmentDeliveriesAttempted"
                    value={transactionData.TotalShipmentDeliveriesAttempted}
                    onChange={handleTransactionDataChange}
                    step="1"
                  />
                </div>

                {/* Total Shipment Deliveries Done */}
                <div className="form-group">
                  <label>Total Shipment Deliveries Done</label>
                  <input
                    type="number"
                    name="TotalShipmentDeliveriesDone"
                    value={transactionData.TotalShipmentDeliveriesDone}
                    onChange={handleTransactionDataChange}
                    step="1"
                  />
                </div>



                {/* Closing KM */}
                <div className="form-group">
                  <label>Closing KM *</label>
                  <input
                    type="number"
                    name="ClosingKM"
                    value={transactionData.ClosingKM}
                    onChange={handleTransactionDataChange}
                    className={errors.ClosingKM ? 'error' : ''}
                    step="0.01"
                    placeholder="Enter closing KM"
                  />
                  {errors.ClosingKM && <span className="error-message">{errors.ClosingKM}</span>}
                </div>

                <div className="form-group">
                  <label>Closing KM Image</label>
                  <DocumentUpload
                    label=""
                    name="ClosingKMImage"
                    value={files.ClosingKMImage}
                    onChange={createFileChangeHandler('ClosingKMImage')}
                    accept="image/*"
                    required={false}
                    isEditing={!!editingTransaction}
                    existingFileUrl={editingTransaction?.ClosingKMImage_url || null}
                    entityType="transactions"
                  />
                </div>

                {/* Total KM - Auto Calculated (Yellow/Highlighted) */}
                <div className="form-group">
                  <label>Total KM</label>
                  <input
                    type="number"
                    name="TotalKM"
                    value={calculatedData.TotalKM}
                    className="readonly-field calculated-field"
                    readOnly
                    style={{ backgroundColor: '#fff3cd', border: '1px solid #ffeaa7' }}
                  />
                </div>

                {/* V.Freight (Fix) */}
                <div className="form-group">
                  <label>V.Freight (Fix)</label>
                  <input
                    type="number"
                    name="VFreightFix"
                    value={transactionData.VFreightFix}
                    onChange={handleTransactionDataChange}
                    step="0.01"
                    placeholder="Enter fixed freight amount"
                  />
                </div>

                {/* Fix KM (if any) */}
                <div className="form-group">
                  <label>Fix KM (if any)</label>
                  <input
                    type="number"
                    name="FixKm"
                    value={transactionData.FixKm}
                    onChange={handleTransactionDataChange}
                    step="0.01"
                    placeholder="Enter fixed KM"
                  />
                </div>

                {/* V.Freight (Variable - Per KM) */}
                <div className="form-group">
                  <label>V.Freight (Variable - Per KM)</label>
                  <input
                    type="number"
                    name="VFreightVariable"
                    value={transactionData.VFreightVariable}
                    onChange={handleTransactionDataChange}
                    step="0.01"
                    placeholder="Enter variable freight per KM"
                  />
                </div>

                {/* Toll Expenses */}
                <div className="form-group">
                  <label>Toll Expenses</label>
                  <input
                    type="number"
                    name="TollExpenses"
                    value={transactionData.TollExpenses}
                    onChange={handleTransactionDataChange}
                    step="0.01"
                    placeholder="Enter toll expenses"
                  />
                </div>

                {/* Toll Expenses Document Upload */}
                <DocumentUpload
                  label="Toll Expenses Document"
                  name="TollExpensesDoc"
                  value={files.TollExpensesDoc}
                  onChange={createFileChangeHandler('TollExpensesDoc')}
                  accept=".pdf,.jpg,.jpeg,.png"
                  isEditing={!!editingTransaction}
                  existingFileUrl={editingTransaction?.TollExpensesDoc_url || null}
                  entityType="transactions"
                  entityId={editingTransaction?.TransactionID}
                />

                {/* Parking Charges */}
                <div className="form-group">
                  <label>Parking Charges</label>
                  <input
                    type="number"
                    name="ParkingCharges"
                    value={transactionData.ParkingCharges}
                    onChange={handleTransactionDataChange}
                    step="0.01"
                    placeholder="Enter parking charges"
                  />
                </div>

                {/* Parking Charges Document Upload */}
                <DocumentUpload
                  label="Parking Charges Document"
                  name="ParkingChargesDoc"
                  value={files.ParkingChargesDoc}
                  onChange={createFileChangeHandler('ParkingChargesDoc')}
                  accept=".pdf,.jpg,.jpeg,.png"
                  isEditing={!!editingTransaction}
                  existingFileUrl={editingTransaction?.ParkingChargesDoc_url || null}
                  entityType="transactions"
                  entityId={editingTransaction?.TransactionID}
                />
                {/* Loading Charges */}
                <div className="form-group">
                  <label>Loading Charges</label>
                  <input
                    type="number"
                    name="LoadingCharges"
                    value={transactionData.LoadingCharges}
                    onChange={handleTransactionDataChange}
                    step="0.01"
                    placeholder="Enter loading charges"
                  />
                </div>

                {/* Unloading Charges */}
                <div className="form-group">
                  <label>Unloading Charges</label>
                  <input
                    type="number"
                    name="UnloadingCharges"
                    value={transactionData.UnloadingCharges}
                    onChange={handleTransactionDataChange}
                    step="0.01"
                    placeholder="Enter unloading charges"
                  />
                </div>

                {/* Other Charges (if any) */}
                <div className="form-group">
                  <label>Other Charges (if any)</label>
                  <input
                    type="number"
                    name="OtherCharges"
                    value={transactionData.OtherCharges}
                    onChange={handleTransactionDataChange}
                    step="0.01"
                    placeholder="Enter other charges"
                  />
                </div>

                {/* Other Charges Remarks */}
                <div className="form-group">
                  <label>Other Charges Remarks</label>
                  <textarea
                    name="OtherChargesRemarks"
                    value={transactionData.OtherChargesRemarks}
                    onChange={handleTransactionDataChange}
                    placeholder="Enter remarks for other charges"
                    rows="2"
                  />
                </div>



                {/* Total Duty Hours - Auto Calculated (Yellow/Highlighted) */}
                <div className="form-group">
                  <label>Total Duty Hours</label>
                  <input
                    type="number"
                    name="TotalDutyHours"
                    value={transactionData.TotalDutyHours}
                    className="readonly-field calculated-field"
                    readOnly
                    style={{ backgroundColor: '#fff3cd', border: '1px solid #ffeaa7' }}
                    step="0.01"
                    key={`duty-hours-${editingTransaction?.TransactionID || 'new'}-${transactionData.TotalDutyHours}`}
                  />
                </div>

                {/* Total Freight - Auto Calculated (Yellow/Highlighted) */}
                <div className="form-group">
                  <label>Total Freight</label>
                  <input
                    type="number"
                    name="TotalFreight"
                    value={transactionData.TotalFreight}
                    className="readonly-field calculated-field"
                    readOnly
                    style={{ backgroundColor: '#fff3cd', border: '1px solid #ffeaa7' }}
                    step="0.01"
                  />
                </div>

                {/* Advance Request No - Auto-generated for Adhoc/Replacement */}
                <div className="form-group">
                  <label>Advance Request No</label>
                  <input
                    type="text"
                    name="AdvanceRequestNo"
                    value={transactionData.AdvanceRequestNo}
                    onChange={handleTransactionDataChange}
                    placeholder="Auto-generated for Adhoc/Replacement"
                    readOnly={masterData.TypeOfTransaction === 'Adhoc' || masterData.TypeOfTransaction === 'Replacement'}
                    className={masterData.TypeOfTransaction === 'Adhoc' || masterData.TypeOfTransaction === 'Replacement' ? 'readonly-field calculated-field' : ''}
                    style={masterData.TypeOfTransaction === 'Adhoc' || masterData.TypeOfTransaction === 'Replacement' ? { backgroundColor: '#fff3cd', border: '1px solid #ffeaa7' } : {}}
                  />
                </div>

                {/* Advance to Paid */}
                <div className="form-group">
                  <label>Advance to Paid</label>
                  <input
                    type="number"
                    name="AdvanceToPaid"
                    value={transactionData.AdvanceToPaid}
                    onChange={handleTransactionDataChange}
                    step="0.01"
                    placeholder="Enter advance amount to be paid"
                  />
                </div>

                {/* Advance Approved Amount */}
                <div className="form-group">
                  <label>Advance Approved Amount</label>
                  <input
                    type="number"
                    name="AdvanceApprovedAmount"
                    value={transactionData.AdvanceApprovedAmount}
                    onChange={handleTransactionDataChange}
                    step="0.01"
                    placeholder="Enter approved advance amount"
                  />
                </div>

                {/* Advance Approved By */}
                <div className="form-group">
                  <label>Advance Approved By</label>
                  <input
                    type="text"
                    name="AdvanceApprovedBy"
                    value={transactionData.AdvanceApprovedBy}
                    onChange={handleTransactionDataChange}
                    placeholder="Enter approver name"
                  />
                </div>

                {/* Advance Paid */}
                <div className="form-group">
                  <label>Advance Paid</label>
                  <input
                    type="number"
                    name="AdvancePaidAmount"
                    value={transactionData.AdvancePaidAmount}
                    onChange={handleTransactionDataChange}
                    step="0.01"
                    placeholder="Enter advance paid amount"
                  />
                </div>

                {/* Advance Paid Mode */}
                <div className="form-group">
                  <label>Advance Paid Mode</label>
                  <select
                    name="AdvancePaidMode"
                    value={transactionData.AdvancePaidMode}
                    onChange={handleTransactionDataChange}
                    className="form-control"
                  >
                    <option value="">Select Payment Mode</option>
                    <option value="UPI">UPI</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                  </select>
                </div>

                {/* Advance Paid Date */}
                <div className="form-group">
                  <label>Advance Paid Date</label>
                  <input
                    type="date"
                    name="AdvancePaidDate"
                    value={transactionData.AdvancePaidDate}
                    onChange={handleTransactionDataChange}
                  />
                </div>

                {/* Advance Paid By */}
                <div className="form-group">
                  <label>Advance Paid By</label>
                  <input
                    type="text"
                    name="AdvancePaidBy"
                    value={transactionData.AdvancePaidBy}
                    onChange={handleTransactionDataChange}
                    placeholder="Enter payer name"
                  />
                </div>

                {/* Employee Details (if advance paid by employee) */}
                <div className="form-group">
                  <label>Employee Details (if advance paid by employee)</label>
                  <textarea
                    name="EmployeeDetailsAdvance"
                    value={transactionData.EmployeeDetailsAdvance}
                    onChange={handleTransactionDataChange}
                    placeholder="Enter employee details"
                    rows="2"
                  />
                </div>

                {/* Balance to be Paid - Auto Calculated (Yellow/Highlighted) */}
                <div className="form-group">
                  <label>Balance to be Paid</label>
                  <input
                    type="number"
                    name="BalanceToBePaid"
                    value={transactionData.BalanceToBePaid}
                    className="readonly-field calculated-field"
                    readOnly
                    style={{ backgroundColor: '#fff3cd', border: '1px solid #ffeaa7' }}
                    step="0.01"
                  />
                </div>

                {/* Balance Paid Amount */}
                <div className="form-group">
                  <label>Balance Paid Amount</label>
                  <input
                    type="number"
                    name="BalancePaidAmount"
                    value={transactionData.BalancePaidAmount}
                    onChange={handleTransactionDataChange}
                    step="0.01"
                    placeholder="Enter balance paid amount"
                  />
                </div>

                {/* Variance (if any) - Auto Calculated (Yellow/Highlighted) */}
                <div className="form-group">
                  <label>Variance (if any)</label>
                  <input
                    type="number"
                    name="Variance"
                    value={transactionData.Variance}
                    className="readonly-field calculated-field"
                    readOnly
                    style={{ backgroundColor: '#fff3cd', border: '1px solid #ffeaa7' }}
                    step="0.01"
                  />
                </div>

                {/* Balance Paid Date */}
                <div className="form-group">
                  <label>Balance Paid Date</label>
                  <input
                    type="date"
                    name="BalancePaidDate"
                    value={transactionData.BalancePaidDate}
                    onChange={handleTransactionDataChange}
                  />
                </div>

                {/* Balance Paid By */}
                <div className="form-group">
                  <label>Balance Paid By</label>
                  <input
                    type="text"
                    name="BalancePaidBy"
                    value={transactionData.BalancePaidBy}
                    onChange={handleTransactionDataChange}
                    placeholder="Enter balance payer name"
                  />
                </div>

                {/* Employee Details (if balance paid by employee) */}
                <div className="form-group">
                  <label>Employee Details (if balance paid by employee)</label>
                  <textarea
                    name="EmployeeDetailsBalance"
                    value={transactionData.EmployeeDetailsBalance}
                    onChange={handleTransactionDataChange}
                    placeholder="Enter employee details"
                    rows="2"
                  />
                </div>



                {/* Total Expenses - Auto Calculated (Yellow/Highlighted) */}
                <div className="form-group">
                  <label>Total Expenses</label>
                  <input
                    type="number"
                    name="TotalExpenses"
                    value={transactionData.TotalExpenses}
                    className="readonly-field calculated-field"
                    readOnly
                    style={{ backgroundColor: '#fff3cd', border: '1px solid #ffeaa7' }}
                    step="0.01"
                  />
                </div>

                {/* Revenue - Auto Calculated (Yellow/Highlighted) */}
                <div className="form-group">
                  <label>Revenue</label>
                  <input
                    type="number"
                    name="Revenue"
                    value={transactionData.Revenue}
                    className="readonly-field calculated-field"
                    readOnly
                    style={{ backgroundColor: '#fff3cd', border: '1px solid #ffeaa7' }}
                    step="0.01"
                  />
                </div>

                {/* Margin - Auto Calculated (Yellow/Highlighted) */}
                <div className="form-group">
                  <label>Margin</label>
                  <input
                    type="number"
                    name="Margin"
                    value={transactionData.Margin}
                    className="readonly-field calculated-field"
                    readOnly
                    style={{ backgroundColor: '#fff3cd', border: '1px solid #ffeaa7' }}
                    step="0.01"
                  />
                </div>

                {/* Margin (%age) - Auto Calculated (Yellow/Highlighted) */}
                <div className="form-group">
                  <label>Margin (%age)</label>
                  <input
                    type="number"
                    name="MarginPercentage"
                    value={transactionData.MarginPercentage}
                    className="readonly-field calculated-field"
                    readOnly
                    style={{ backgroundColor: '#fff3cd', border: '1px solid #ffeaa7' }}
                    step="0.01"
                  />
                </div>

                {/* Remarks */}
                <div className="form-group full-width">
                  <label>Remarks</label>
                  <textarea
                    name="Remarks"
                    value={transactionData.Remarks}
                    onChange={handleTransactionDataChange}
                    rows="4"
                    placeholder="Enter any remarks or notes..."
                  />
                </div>

                {/* Trip Close */}
                <div className="form-group">
                  <label>Trip Close</label>
                  <input
                    type="checkbox"
                    name="TripClose"
                    checked={transactionData.TripClose}
                    onChange={(e) => setTransactionData(prev => ({ ...prev, TripClose: e.target.checked }))}
                    key={`trip-close-${editingTransaction?.TransactionID || 'new'}-${transactionData.TripClose}`}
                  />
                  <span style={{ marginLeft: '8px' }}>Mark trip as closed</span>
                </div>

                {/* Replacement Driver Fields - Only for Fixed transactions */}
                {masterData.TypeOfTransaction === 'Fixed' && (
                  <>
                    <div className="form-group">
                      <label>Replacement Driver Name</label>
                      <input
                        type="text"
                        name="ReplacementDriverName"
                        value={transactionData.ReplacementDriverName}
                        onChange={handleTransactionDataChange}
                        placeholder="Enter replacement driver name"
                      />
                    </div>

                    <div className="form-group">
                      <label>Replacement Driver No</label>
                      <input
                        type="text"
                        name="ReplacementDriverNo"
                        value={transactionData.ReplacementDriverNo}
                        onChange={handleReplacementDriverNoChange}
                        className="form-control"
                        placeholder="Enter 10-digit mobile number"
                        maxLength="10"
                        style={{
                          MozAppearance: 'textfield',
                          WebkitAppearance: 'none'
                        }}
                      />
                      {errors.ReplacementDriverNo && <span className="error-message">{errors.ReplacementDriverNo}</span>}
                    </div>
                  </>
                )}


              </div>
            </div>
          )}

          {/* YELLOW SECTION - System Calculation (FIXED ONLY) */}
          {masterData.TypeOfTransaction === 'Fixed' && (
          <div className="form-section calculation-section">

            <div className="form-grid">
              <div className="form-group">
                <label>TOTAL KM</label>
                <input
                  type="text"
                  name="TotalKM"
                  value={calculatedData.TotalKM}
                  onChange={handleCalculatedDataChange}
                  className="readonly-field calculated-field"
                  readOnly
                />
              </div>

              <div className="form-group">
                <label>V. FREIGHT (FIX)</label>
                <input
                  type="number"
                  name="VFreightFix"
                  value={calculatedData.VFreightFix}
                  onChange={handleCalculatedDataChange}
                  step="0.01"
                />
              </div>

              <div className="form-group">
                <label>Toll Expenses</label>
                <input
                  type="number"
                  name="TollExpenses"
                  value={calculatedData.TollExpenses}
                  onChange={handleCalculatedDataChange}
                  step="0.01"
                />
              </div>

              <div className="form-group">
                <label>Parking Charges</label>
                <input
                  type="number"
                  name="ParkingCharges"
                  value={calculatedData.ParkingCharges}
                  onChange={handleCalculatedDataChange}
                  step="0.01"
                />
              </div>

              <div className="form-group">
                <label>Handling Charges</label>
                <input
                  type="number"
                  name="HandlingCharges"
                  value={calculatedData.HandlingCharges}
                  onChange={handleCalculatedDataChange}
                  step="0.01"
                />
              </div>

              <div className="form-group">
                <label>Total Duty Hours</label>
                <input
                  type="text"
                  name="TotalDutyHours"
                  value={calculatedData.TotalDutyHours}
                  onChange={handleCalculatedDataChange}
                  className="readonly-field calculated-field"
                  readOnly
                />
              </div>

              {/* Total Expenses - Auto Calculated for Fixed transactions */}
              {masterData.TypeOfTransaction === 'Fixed' && (
                <div className="form-group">
                  <label>Total Expenses</label>
                  <input
                    type="text"
                    name="TotalExpenses"
                    value={transactionData.TotalExpenses}
                    className="readonly-field calculated-field"
                    readOnly
                    style={{ backgroundColor: '#fff3cd', border: '1px solid #ffeaa7' }}
                    placeholder="Auto-calculated: Toll + Parking + Loading + Unloading + Other + Handling + KM Charges"
                  />
                </div>
              )}
            </div>
          </div>
          )}

          {/* ORANGE SECTION - Remark & Trip Close by Supervisor (FIXED ONLY) */}
          {masterData.TypeOfTransaction === 'Fixed' && (
          <div className="form-section supervisor-section">

            <div className="form-grid">
              <div className="form-group full-width">
                <label>Remarks</label>
                <textarea
                  name="Remarks"
                  value={supervisorData.Remarks}
                  onChange={handleSupervisorDataChange}
                  rows="4"
                  placeholder="Enter any remarks or notes..."
                />
              </div>

              <div className="form-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    name="TripClose"
                    checked={supervisorData.TripClose}
                    onChange={handleSupervisorDataChange}
                  />
                  Trip Close
                </label>
              </div>
            </div>
          </div>
          )}
        </div>

        <div className="form-actions">
          <button
            type="submit"
            className="submit-btn"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Saving...' : editingTransaction ? 'Update Transaction' : 'Save Transaction'}
          </button>

          {editingTransaction && (
            <button
              type="button"
              onClick={handleNewTransaction}
              className="new-transaction-btn"
              style={{
                backgroundColor: '#28a745',
                color: 'white',
                border: 'none',
                padding: '10px 20px',
                borderRadius: '4px',
                cursor: 'pointer',
                marginLeft: '10px'
              }}
            >
              🆕 New Transaction
            </button>
          )}

          {editingTransaction && (
            <button
              type="button"
              className="reset-btn"
              onClick={resetForm}
            >
              Cancel
            </button>
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
              style={{
                padding: '8px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '14px'
              }}
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <label style={{ fontWeight: 'bold', minWidth: '70px' }}>To Date:</label>
            <input
              type="date"
              value={dateFilter.toDate}
              onChange={(e) => setDateFilter(prev => ({ ...prev, toDate: e.target.value }))}
              style={{
                padding: '8px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '14px'
              }}
            />
          </div>
          <button
            onClick={handleDateFilterApply}
            style={{
              backgroundColor: '#007bff',
              color: 'white',
              border: 'none',
              padding: '8px 16px',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 'bold'
            }}
          >
            🔍 Filter
          </button>
          <button
            onClick={handleDateFilterClear}
            style={{
              backgroundColor: '#6c757d',
              color: 'white',
              border: 'none',
              padding: '8px 16px',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            🗑️ Clear
          </button>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h3>Recent Transactions</h3>
          <button
            onClick={handleExportAllTransactions}
            style={{
              backgroundColor: '#007bff',
              color: 'white',
              border: 'none',
              padding: '10px 20px',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: '0 2px 4px rgba(0,123,255,0.3)',
              transition: 'all 0.2s ease'
            }}
            onMouseOver={(e) => {
              e.target.style.backgroundColor = '#0056b3';
              e.target.style.transform = 'translateY(-1px)';
            }}
            onMouseOut={(e) => {
              e.target.style.backgroundColor = '#007bff';
              e.target.style.transform = 'translateY(0)';
            }}
            title="Export All Transactions to Excel"
          >
            📊 Export to Excel
          </button>
        </div>
        <DataTable
          title=""
          data={transactions}
          columns={transactionColumns}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onBulkDelete={handleBulkDelete}
          bulkSelectable={true}
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

export default DailyVehicleTransactionForm;
