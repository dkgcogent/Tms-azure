import React, { useState, useEffect } from 'react';
import { vehicleTransactionAPI, adhocTransactionAPI, customerAPI, vehicleAPI, driverAPI, projectAPI, vendorAPI, apiHelpers } from '../services/api';
import DataTable from '../components/DataTable';
import Dropdown from '../components/Dropdown';
import SearchableDropdown from '../components/SearchableDropdown';
import DocumentUpload from '../components/DocumentUpload';

import './DailyVehicleTransactionForm.css';

// Date utility functions
const getCurrentDate = () => {
  return new Date().toISOString().split('T')[0];
};



const formatDateForInput = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toISOString().split('T')[0];
};

const DailyVehicleTransactionForm = () => {
  // Master data (Grey Section)
  const [masterData, setMasterData] = useState({
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
    TypeOfTransaction: 'Fixed' // Default to Fixed
  });

  // State for selected vehicle tags (for display)
  const [selectedVehicleTags, setSelectedVehicleTags] = useState([]);

  // State for multiple drivers (for Fixed type)
  const [selectedDrivers, setSelectedDrivers] = useState([]);

  // Daily transaction data (Blue Section)
  const [transactionData, setTransactionData] = useState({
    DriverID: '',
    DriverMobileNo: '', // Add driver mobile number
    ReplacementDriverName: '', // Replacement driver name as text
    ReplacementDriverNo: '', // Replacement driver number as integer

    // Additional missing fields for Adhoc/Replacement
    ArrivalTimeAtHub: '',
    InTimeByCust: '',
    TotalShipmentsForDeliveries: '',
    TotalShipmentDeliveriesAttempted: '',
    TotalShipmentDeliveriesDone: '',
    VFreightFix: '',
    FixKm: '',
    VFreightVariable: '',
    TollExpenses: '',
    TollExpensesDoc: null,
    ParkingCharges: '',
    ParkingChargesDoc: null,
    LoadingCharges: '',
    UnloadingCharges: '',
    OtherCharges: '',
    OtherChargesRemarks: '',
    OutTimeFrom: '',
    TotalFreight: '', // Auto-calculated
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
    MarginPercentage: '', // Auto-calculated
    TripClose: false,
    Date: getCurrentDate(),
    Shift: '',
    ArrivalTimeAtHub: '',
    InTimeByCust: '',
    OutTimeFromHub: '',
    OpeningKM: '',
    TotalDeliveries: '',
    TotalDeliveriesAttempted: '',
    TotalDeliveriesDone: '',
    ReturnReportingTime: '',
    ClosingKM: '',
    // Adhoc/Replacement-specific fields
    TripNo: '',
    VehicleNumber: '', // Manual entry for adhoc/replacement
    VendorName: '', // Manual entry for adhoc/replacement
    VendorNumber: '', // Manual entry for adhoc/replacement
    DriverName: '', // Manual entry for adhoc/replacement
    DriverNumber: '', // Manual entry for adhoc/replacement
    DriverAadharNumber: '',
    DriverAadharDoc: null,
    DriverLicenceNumber: '',
    DriverLicenceDoc: null,
    TotalShipmentsForDeliveries: '',
    TotalShipmentDeliveriesAttempted: '',
    TotalShipmentDeliveriesDone: '',
    VFreightFix: '',
    FixKm: '',
    VFreightVariable: '',
    TollExpenses: '',
    TollExpensesDoc: null,
    ParkingCharges: '',
    ParkingChargesDoc: null,
    LoadingCharges: '',
    UnloadingCharges: '',
    OtherCharges: '',
    OtherChargesRemarks: '',
    OutTimeFrom: '',
    TotalFreight: '', // Auto-calculated
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
    MarginPercentage: '' // Auto-calculated
  });

  // System calculations (Yellow Section)
  const [calculatedData, setCalculatedData] = useState({
    TotalKM: '',
    VFreightFix: '',
    TollExpenses: '',
    ParkingCharges: '',
    HandlingCharges: '',
    OutTimeFromHUB: '',
    TotalDutyHours: ''
  });

  // Supervisor section (Orange Section)
  const [supervisorData, setSupervisorData] = useState({
    Remarks: '',
    TripClose: false
  });

  const [transactions, setTransactions] = useState([]);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState(null);

  // Dropdown options
  const [customers, setCustomers] = useState([]);
  const [projects, setProjects] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [vendors, setVendors] = useState([]);

  // Control project field visibility
  const [isProjectDropdownVisible, setIsProjectDropdownVisible] = useState(false);

  // Internal IDs to submit to API (only single-value IDs, vehicles and drivers use arrays)
  const [ids, setIds] = useState({
    CustomerID: '',
    ProjectID: '',
    VendorID: '' // kept internally if needed by backend, but not shown on the form
  });

  useEffect(() => {
    fetchTransactions();
    loadDropdownOptions();
  }, []);

  // Trigger vendor selection after vendors are loaded and when editing
  useEffect(() => {
    if (editingTransaction && vendors.length > 0 && masterData.VendorName && !masterData.CompanyName) {
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
      if (total >= 0) {
        setCalculatedData(prev => ({
          ...prev,
          TotalKM: total.toString()
        }));
      }
    }
  }, [transactionData.OpeningKM, transactionData.ClosingKM]);

  // Auto-calculate Total Duty Hours for Adhoc/Replacement
  useEffect(() => {
    if ((masterData.TypeOfTransaction === 'Adhoc' || masterData.TypeOfTransaction === 'Replacement') &&
        transactionData.ArrivalTimeAtHub && transactionData.OutTimeFromHub) {

      try {
        // Convert time strings to Date objects for calculation
        const arrivalTime = new Date(`2000-01-01T${transactionData.ArrivalTimeAtHub}:00`);
        const outTime = new Date(`2000-01-01T${transactionData.OutTimeFromHub}:00`);

        if (!isNaN(arrivalTime.getTime()) && !isNaN(outTime.getTime())) {
          let diffMs = outTime - arrivalTime;

          // Handle case where out time is next day
          if (diffMs < 0) {
            diffMs += 24 * 60 * 60 * 1000; // Add 24 hours
          }

          const diffHours = diffMs / (1000 * 60 * 60);

          setTransactionData(prev => ({
            ...prev,
            TotalDutyHours: diffHours.toFixed(2)
          }));
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

      // Calculate variable freight: (Total KM - Fix KM) * Variable Rate
      const variableKM = Math.max(0, totalKM - fixKm);
      const variableFreight = variableKM * vFreightVariable;
      const totalFreight = vFreightFix + variableFreight;

      setTransactionData(prev => ({
        ...prev,
        TotalFreight: totalFreight.toFixed(2)
      }));
    }
  }, [transactionData.VFreightFix, transactionData.VFreightVariable, transactionData.FixKm, calculatedData.TotalKM, masterData.TypeOfTransaction]);

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
        MarginPercentage: marginPercentage.toFixed(2)
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


  // Note: DriverID sync removed as we now use DriverIDs array instead of single DriverID in ids state

  // Calculate total duty hours
  useEffect(() => {
    if (transactionData.ArrivalTimeAtHub && transactionData.ReturnReportingTime) {
      try {
        // Handle different time formats (HH:MM:SS or HH:MM)
        const formatTime = (timeStr) => {
          if (!timeStr) return null;
          // If already in HH:MM:SS format, use as is
          if (timeStr.includes(':') && timeStr.split(':').length === 3) {
            return timeStr;
          }
          // If in HH:MM format, add :00
          if (timeStr.includes(':') && timeStr.split(':').length === 2) {
            return `${timeStr}:00`;
          }
          return `${timeStr}:00:00`;
        };

        const arrivalTimeFormatted = formatTime(transactionData.ArrivalTimeAtHub);
        const returnTimeFormatted = formatTime(transactionData.ReturnReportingTime);


        const arrivalTime = new Date(`1970-01-01T${arrivalTimeFormatted}`);
        const returnTime = new Date(`1970-01-01T${returnTimeFormatted}`);


        if (!isNaN(arrivalTime.getTime()) && !isNaN(returnTime.getTime())) {
          let diffMs = returnTime - arrivalTime;

          // Handle overnight shifts (return time is next day)
          if (diffMs < 0) {
            diffMs += 24 * 60 * 60 * 1000; // Add 24 hours
          }

          const diffHours = diffMs / (1000 * 60 * 60);
          const dutyHoursValue = diffHours.toFixed(2);


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
  }, [transactionData.ArrivalTimeAtHub, transactionData.ReturnReportingTime]);

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
      setCustomers(customersRes.data.value || customersRes.data || []);
      setProjects(projectsRes.data.value || projectsRes.data || []);
      setVehicles(vehiclesRes.data.data || vehiclesRes.data || []);
      setDrivers(driversRes.data.value || driversRes.data || []);
      setVendors(vendorsRes.data.value || vendorsRes.data || []);
    } catch (error) {
      console.error('Error loading dropdown options:', error);
    }
  };

  const fetchTransactions = async () => {
    setIsLoading(true);
    try {
      const response = await vehicleTransactionAPI.getAll();
      let transactionData = response.data.data || response.data.value || response.data || [];

        transactionData.reduce((acc, t) => {
          acc[t.TripType] = (acc[t.TripType] || 0) + 1;
          return acc;
        }, {})
      );
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

      // Step 1: Get projects for this customer
      const projectsRes = await projectAPI.getByCustomer(customerID);
      const customerProjects = projectsRes.data || [];

      if (customerProjects.length === 0) {
        autoPopulatedData.Project = 'N/A';
        setMasterData(prev => ({ ...prev, ...autoPopulatedData }));
        return;
      }

      // For now, take the first project (you can enhance this later for multiple projects)
      const project = customerProjects[0];
      autoPopulatedData.Project = project.ProjectName || 'N/A';


      // Step 2: Find vendor linked to this project (through project table or separate linking)
      // For now, we'll get all vendors and find one linked to this customer/project
      const vendorsRes = await vendorAPI.getAll();
      const allVendors = vendorsRes.data.value || vendorsRes.data || [];

      // Step 3: Find vehicles linked to the vendor
      const vehiclesRes = await vehicleAPI.getAll();
      const allVehicles = vehiclesRes.data.data || vehiclesRes.data || [];

      // Step 4: Find drivers linked to the vehicle/vendor
      const driversRes = await driverAPI.getAll();
      const allDrivers = driversRes.data.value || driversRes.data || [];

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

  // Handler for vehicle selection (single select that adds to tags)
  const handleVehicleSelect = (e) => {
    const selectedVehicleId = e.target.value;
    if (!selectedVehicleId) return;

    // Find the vehicle details
    const vehicle = vehicles.find(v => v.VehicleID == selectedVehicleId);
    if (!vehicle) return;

    // Check if vehicle is already selected
    if (masterData.VehicleNo.includes(selectedVehicleId)) {
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

    setSelectedVehicleTags(prev => [...prev, newVehicleTag]);

    // Reset dropdown to placeholder
    e.target.value = '';

  };

  // Handler to remove vehicle tag
  const removeVehicleTag = (vehicleIdToRemove) => {
    const newVehicleIds = masterData.VehicleNo.filter(id => id !== vehicleIdToRemove);
    const newVehicleTags = selectedVehicleTags.filter(tag => tag.id !== vehicleIdToRemove);

    setMasterData(prev => ({
      ...prev,
      VehicleNo: newVehicleIds
    }));

    setSelectedVehicleTags(newVehicleTags);

    // Update IDs for submission (use first remaining vehicle)
    if (newVehicleIds.length > 0) {
      setIds(prev => ({ ...prev, VehicleID: newVehicleIds[0] }));
    } else {
      setIds(prev => ({ ...prev, VehicleID: '' }));
    }

  };

  // Handler for driver selection (for Fixed type - multiple drivers)
  const handleDriverSelect = async (e) => {
    const selectedDriverId = e.target.value;
    if (!selectedDriverId) return;

    // Check if driver is already selected
    if (selectedDrivers.some(d => d.id === selectedDriverId)) {
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

  };

  // Handler for replacement driver number with validation
  const handleReplacementDriverNoChange = (e) => {
    const value = e.target.value;

    // Only allow digits
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

    // Validate mobile number
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

  // Handler for file uploads
  const handleFileChange = (e) => {
    const { name, files } = e.target;
    if (files && files[0]) {
      setTransactionData(prev => ({ ...prev, [name]: files[0] }));
    }
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
              // Take the first project or let user select if multiple
              const project = linkedProjects[0];
              autoPopulatedData.Project = `${project.ProjectName} [${project.ProjectCode || project.ProjectID}]`;

              // Store project ID for submission
              setIds(prev => ({ ...prev, ProjectID: project.ProjectID }));
            } else {
              autoPopulatedData.Project = 'N/A';
            }
          } catch (error) {
            console.error('❌ Error fetching projects:', error);
            autoPopulatedData.Project = 'N/A';
          }

          // Check current transaction type (use the current state or default to Fixed)
          const currentTransactionType = masterData.TypeOfTransaction || 'Fixed';

          // For Fixed transactions, auto-populate through hierarchy
          if (currentTransactionType === 'Fixed') {
            await fetchLinkedDataForFixedTransaction(customer.CustomerID, autoPopulatedData);
          } else {
            // For Adhoc transactions, just populate basic customer data
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
    const newErrors = {};

    // Master data validations
    if (!masterData.Customer) newErrors.Customer = 'Customer is required';
    if (!masterData.Project) newErrors.Project = 'Project is required';

    // Fixed transaction specific validations
    if (masterData.TypeOfTransaction === 'Fixed') {
      if (!masterData.VehicleNo || masterData.VehicleNo.length === 0) newErrors.VehicleNo = 'At least one vehicle must be selected';
      if (!selectedDrivers || selectedDrivers.length === 0) newErrors.DriverID = 'At least one driver must be selected';
    }

    // Common transaction data validations
    if (!transactionData.Date) newErrors.Date = 'Date is required';
    if (!transactionData.OpeningKM) newErrors.OpeningKM = 'Opening KM is required';
    if (!transactionData.ClosingKM) newErrors.ClosingKM = 'Closing KM is required';

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

    // Validation for KM values
    if (transactionData.OpeningKM && transactionData.ClosingKM) {
      const opening = parseFloat(transactionData.OpeningKM);
      const closing = parseFloat(transactionData.ClosingKM);
      if (closing <= opening) {
        newErrors.ClosingKM = 'Closing KM must be greater than Opening KM';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

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


        payload = {
          ...payload,
          VehicleIDs: JSON.stringify(vehicleIds), // Always send as JSON array
          DriverIDs: JSON.stringify(driverIds),   // Always send as JSON array
          VendorID: ids.VendorID || null,
          Shift: transactionData.Shift || null,
          LocationID: null, // Fixed transactions don't use LocationID typically
          ReplacementDriverID: null, // Always null - we don't use ReplacementDriverID anymore
          ReplacementDriverName: transactionData.ReplacementDriverName || null,
          ReplacementDriverNo: transactionData.ReplacementDriverNo || null,
          TotalDeliveries: transactionData.TotalDeliveries ? Number(transactionData.TotalDeliveries) : null,
          TotalDeliveriesAttempted: transactionData.TotalDeliveriesAttempted ? Number(transactionData.TotalDeliveriesAttempted) : null,
          TotalDeliveriesDone: transactionData.TotalDeliveriesDone ? Number(transactionData.TotalDeliveriesDone) : null,
          TripClose: supervisorData.TripClose || false,

          // Financial and calculated fields from calculatedData
          TotalKM: calculatedData.TotalKM ? Number(calculatedData.TotalKM) : null,
          VFreightFix: calculatedData.VFreightFix ? Number(calculatedData.VFreightFix) : null,
          TollExpenses: calculatedData.TollExpenses ? Number(calculatedData.TollExpenses) : null,
          ParkingCharges: calculatedData.ParkingCharges ? Number(calculatedData.ParkingCharges) : null,
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


      // Check if there are any file uploads
      const hasFiles = transactionData.DriverAadharDoc instanceof File ||
                      transactionData.DriverLicenceDoc instanceof File ||
                      transactionData.TollExpensesDoc instanceof File ||
                      transactionData.ParkingChargesDoc instanceof File;

      if (hasFiles) {
        // Use FormData for file uploads
        const formData = new FormData();

        // Add all payload fields to FormData
        Object.keys(payload).forEach(key => {
          if (payload[key] !== null && payload[key] !== undefined) {
            formData.append(key, payload[key]);
          }
        });

        // Add file fields
        if (transactionData.DriverAadharDoc instanceof File) {
          formData.append('DriverAadharDoc', transactionData.DriverAadharDoc);
        }
        if (transactionData.DriverLicenceDoc instanceof File) {
          formData.append('DriverLicenceDoc', transactionData.DriverLicenceDoc);
        }
        if (transactionData.TollExpensesDoc instanceof File) {
          formData.append('TollExpensesDoc', transactionData.TollExpensesDoc);
        }
        if (transactionData.ParkingChargesDoc instanceof File) {
          formData.append('ParkingChargesDoc', transactionData.ParkingChargesDoc);
        }


        // Note: For file uploads, we use the combined API which has ID mapping logic
        // This ensures file uploads work correctly for all transaction types
        if (editingTransaction) {
          await vehicleTransactionAPI.updateWithFiles(editingTransaction.TransactionID, formData);
          apiHelpers.showSuccess('Transaction updated successfully');
        } else {
          await vehicleTransactionAPI.createWithFiles(formData);
          apiHelpers.showSuccess('Transaction created successfully');
        }
      } else {
        // Use regular JSON payload
        if (editingTransaction) {
          // Use the correct API endpoint based on transaction type
          if (masterData.TypeOfTransaction === 'Adhoc' || masterData.TypeOfTransaction === 'Replacement') {
            // Use adhoc API for adhoc/replacement transactions
            await adhocTransactionAPI.update(editingTransaction.TransactionID, payload);
          } else {
            // Use combined API for fixed transactions
            await vehicleTransactionAPI.update(editingTransaction.TransactionID, payload);
          }
          apiHelpers.showSuccess('Transaction updated successfully');
        } else {
          // For creation, use the appropriate API
          if (masterData.TypeOfTransaction === 'Adhoc' || masterData.TypeOfTransaction === 'Replacement') {
            await adhocTransactionAPI.create(payload);
          } else {
            await vehicleTransactionAPI.create(payload);
          }
          apiHelpers.showSuccess('Transaction created successfully');
        }
      }

      // Reset form
      resetForm();
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
      TypeOfTransaction: 'Fixed'
    });

    // Reset vehicle tags and selected drivers
    setSelectedVehicleTags([]);
    setSelectedDrivers([]);

    setTransactionData({
      DriverID: '',
      DriverMobileNo: '', // Reset driver mobile number
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
      // Adhoc/Replacement-specific fields
      TripNo: '',
      VehicleNumber: '',
      VendorName: '',
      VendorNumber: '',
      DriverName: '',
      DriverNumber: '',
      DriverAadharNumber: '',
      DriverAadharDoc: null,
      DriverLicenceNumber: '',
      DriverLicenceDoc: null,
      TotalShipmentsForDeliveries: '',
      TotalShipmentDeliveriesAttempted: '',
      TotalShipmentDeliveriesDone: '',
      VFreightFix: '',
      FixKm: '',
      VFreightVariable: '',
      TollExpenses: '',
      TollExpensesDoc: null,
      ParkingCharges: '',
      ParkingChargesDoc: null,
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
      TripClose: false
    });

    setCalculatedData({
      TotalKM: '',
      VFreightFix: '',
      TollExpenses: '',
      ParkingCharges: '',
      HandlingCharges: '',
      OutTimeFromHUB: '',
      TotalDutyHours: ''
    });

    setSupervisorData({
      Remarks: '',
      TripClose: false
    });

    setEditingTransaction(null);
    setErrors({});
  };

  const handleEdit = async (row) => {

    // Keep the whole row for reference
    setEditingTransaction(row);

    // Try to fetch full record by ID for complete data (some list fields are trimmed)
    let full = row;
    try {
      if (row?.TransactionID) {
        // Use OriginalTransactionID if available (for continuous ID mapping), otherwise use TransactionID
        const transactionIdToFetch = row.OriginalTransactionID || row.TransactionID;
        const resp = await vehicleTransactionAPI.getById(transactionIdToFetch, row.TripType);
        full = resp.data || resp || row;
      }
    } catch (e) {
      console.warn('Edit: fallback to row due to fetch error', e);
    }

    // Fetch related master entities so all display fields can populate
    let rel = {};
    const isAdhocOrReplacement = full.TripType === 'Adhoc' || full.TripType === 'Replacement';

    try {
      const promises = [];
      // Always fetch customer and project
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
        rel.vehicle = vehResp?.data || vehResp || null;
        rel.driver = drvResp?.data || drvResp || null;
        rel.vendor = venResp?.data || venResp || null;
      } else {
        // For Adhoc/Replacement, only fetch customer and project
        const [custResp, projResp] = await Promise.all(promises);
        rel.customer = custResp?.data || custResp || null;
        rel.project = projResp?.data || projResp || null;
        rel.vehicle = null;
        rel.driver = null;
        rel.vendor = null;
      }
    } catch (e) {
      console.warn('Edit: related fetches failed', e);
    }

    // Capture IDs for submission (only keep CustomerID, ProjectID, VendorID as single values)
    setIds(prev => ({
      ...prev,
      CustomerID: full.CustomerID || row.CustomerID || prev.CustomerID || '',
      ProjectID: full.ProjectID || row.ProjectID || prev.ProjectID || '',
      VendorID: full.VendorID || row.VendorID || prev.VendorID || ''
    }));

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

    // Parse VehicleIDs and DriverIDs for multi-select - only use JSON array fields
    let parsedVehicleIds = [];
    if (full.VehicleIDs) {
      try {
        parsedVehicleIds = Array.isArray(full.VehicleIDs) ? full.VehicleIDs : JSON.parse(full.VehicleIDs);
      } catch (e) {
        console.warn('Failed to parse VehicleIDs:', e);
        parsedVehicleIds = [];
      }
    }
    let parsedDriverIds = [];
    if (full.DriverIDs) {
      try {
        parsedDriverIds = Array.isArray(full.DriverIDs) ? full.DriverIDs : JSON.parse(full.DriverIDs);
      } catch (e) {
        console.warn('Failed to parse DriverIDs:', e);
        parsedDriverIds = [];
      }
    }

    setMasterData({
      Customer: full.CustomerID || '',
      CompanyName: rel.customer?.Name || rel.customer?.MasterCustomerName || full.CompanyName || '',
      GSTNo: rel.customer?.GSTNo || full.CustomerGSTNo || full.GSTNo || '',
      Project: full.ProjectID || '',
      Location: rel.customer?.Locations || rel.project?.Location || full.Location || '',
      CustSite: rel.customer?.CustomerSite || full.CustomerSite || '',
      VehiclePlacementType: rel.project?.PlacementType || full.VehiclePlacementType || 'Fixed',
      VehicleType: full.VehicleType || rel.vehicle?.VehicleType || '', // Use database value first
      VehicleNo: parsedVehicleIds, // Always use parsed VehicleIDs array
      VendorName: (full.VendorID || rel.vendor?.VendorID || '').toString(), // Use VendorID for dropdown value, ensure string
      TypeOfTransaction: full.TripType || 'Fixed'
    });


    // Store the VendorID for later use after vendors are loaded
    if (full.VendorID) {
      // We'll trigger vendor selection after vendors are loaded in useEffect
    }
    setSelectedDrivers(parsedDriverIds); // Always use parsed DriverIDs array

    // Set vehicle and driver tags for display
    setSelectedVehicleTags(vehicleTags);
    setSelectedDrivers(driverTags);

    // Populate transaction section
      DriverID: full.DriverID,
      DriverMobileNo: full.DriverMobileNo,
      TransactionDate: full.TransactionDate,
      ArrivalTimeAtHub: full.ArrivalTimeAtHub,
      TotalDeliveries: full.TotalDeliveries,
      TripNo: full.TripNo,
      VehicleNumber: full.VehicleNumber
    });

    // Populate transaction data based on transaction type
    if (isAdhocOrReplacement) {
      // For Adhoc/Replacement transactions, populate all fields
      setTransactionData(prev => ({
        ...prev,
        DriverID: rel.driver?.DriverID || full.DriverID || '',
        DriverMobileNo: rel.driver?.DriverMobileNo || full.DriverMobileNo || '',
        Date: formatDateForInput(full.TransactionDate) || getCurrentDate(),
        ArrivalTimeAtHub: full.ArrivalTimeAtHub || '',
        InTimeByCust: full.InTimeByCust || '',
        OutTimeFromHub: full.OutTimeFromHub || '',
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

        // Document fields
        DriverAadharDoc: full.DriverAadharDoc || '',
        DriverLicenceDoc: full.DriverLicenceDoc || '',
        TollExpensesDoc: full.TollExpensesDoc || '',
        ParkingChargesDoc: full.ParkingChargesDoc || '',
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
      setTransactionData(prev => ({
        ...prev,
        DriverID: parsedDriverIds.length > 0 ? parsedDriverIds[0] : '',
        DriverMobileNo: rel.driver?.DriverMobileNo || '',
        ReplacementDriverName: full.ReplacementDriverName || '',
        ReplacementDriverNo: full.ReplacementDriverNo || '',
        Date: formatDateForInput(full.TransactionDate) || getCurrentDate(),
        Shift: full.Shift || '',
        ArrivalTimeAtHub: full.ArrivalTimeAtHub || '',
        InTimeByCust: full.InTimeByCust || '',
        OutTimeFromHub: full.OutTimeFromHub || '',
        ReturnReportingTime: full.ReturnReportingTime || '',
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

        // Company and location fields
        CompanyName: full.CompanyName || '',
        GSTNo: full.GSTNo || '',
        CustomerSite: full.CustomerSite || '',
        Location: full.Location || '',

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
        MarginPercentage: full.MarginPercentage || ''
      }));
    }

    // Populate calculation section
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
    // Fix: Use simple boolean conversion of TripClose field from database
    const tripCloseValue = !!full.TripClose;
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
      // Simulate customer change to load projects and vehicle assignments
      setTimeout(() => {
        handleMasterDataChange({ target: { name: 'Customer', value: full.CustomerID } });
      }, 100);
    }

    // Scroll to top of the page to show the form
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (transactionOrId) => {
    // Extract ID from object or use the ID directly
    const transactionId = typeof transactionOrId === 'object'
      ? transactionOrId.TransactionID
      : transactionOrId;




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

  // Export handlers
  const handleExportFixed = async () => {
    try {
      await vehicleTransactionAPI.exportFixed();
      apiHelpers.showSuccess('Fixed transactions exported successfully');
    } catch (error) {
      console.error('❌ Export Fixed error:', error);
      apiHelpers.showError(error, 'Failed to export Fixed transactions');
    }
  };

  const handleExportAdhoc = async () => {
    try {
      await vehicleTransactionAPI.exportAdhoc();
      apiHelpers.showSuccess('Adhoc/Replacement transactions exported successfully');
    } catch (error) {
      console.error('❌ Export Adhoc error:', error);
      apiHelpers.showError(error, 'Failed to export Adhoc/Replacement transactions');
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

              <div className="form-group">
                <label>Master Customer Name *</label>
                <SearchableDropdown
                  name="Customer"
                  value={masterData.Customer}
                  onChange={handleMasterDataChange}
                  options={customers}
                  valueKey="CustomerID"
                  labelKey="Name"
                  placeholder="Select Customer"
                  searchPlaceholder="Search customers..."
                  emptyLabel="Select Customer"
                  error={errors.Customer}
                  formatLabel={(customer) => `${customer.Name} [${customer.CustomerCode}]`}
                />
              </div>

              <div className="form-group">
                <label>Company Name</label>
                <input
                  type="text"
                  name="CompanyName"
                  value={masterData.CompanyName}
                  onChange={handleMasterDataChange}
                  className="readonly-field"
                  readOnly
                />
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
                />
              </div>

              <div className="form-group">
                <label>Project *</label>
                {isProjectDropdownVisible ? (
                  // Show dropdown when customer has multiple projects
                  <SearchableDropdown
                    name="Project"
                    value={masterData.Project}
                    onChange={handleMasterDataChange}
                    options={projects}
                    valueKey="project_id"
                    labelKey="project_name"
                    placeholder="Select Project"
                    searchPlaceholder="Search projects..."
                    emptyLabel="Select Project"
                    error={errors.Project}
                  />
                ) : (
                  // Show readonly input when customer has single project or no projects
                  <input
                    type="text"
                    name="Project"
                    value={masterData.Project}
                    readOnly
                    className={`form-control ${errors.Project ? 'error' : ''}`}
                    placeholder="Auto-populated from Vehicle Project Linking"
                  />
                )}
                {errors.Project && <span className="error-message">{errors.Project}</span>}
              </div>

              <div className="form-group">
                <label>Location</label>
                <input
                  type="text"
                  name="Location"
                  value={masterData.Location}
                  onChange={handleMasterDataChange}
                  className="readonly-field"
                  readOnly
                />
              </div>

              <div className="form-group">
                <label>Customer Site</label>
                <input
                  type="text"
                  name="CustSite"
                  value={masterData.CustSite}
                  onChange={handleMasterDataChange}
                  className="form-control"
                  placeholder="Enter customer site"
                />
              </div>



              <div className="form-group">
                <label>Vehicle Type *</label>
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
              </div>

              {/* Vehicle and Vendor Dropdowns - Only for Fixed Transactions */}
              {masterData.TypeOfTransaction === 'Fixed' && (
                <>
                  <div className="form-group">
                    <label>Vehicle No *</label>
                    <select
                      name="VehicleNo"
                      onChange={handleVehicleSelect}
                      className={`form-control ${errors.VehicleNo ? 'error' : ''}`}
                      defaultValue=""
                    >
                      <option value="">Select Vehicle to Add</option>
                      {vehicles
                        .filter(vehicle => !masterData.VehicleNo.includes(vehicle.VehicleID))
                        .map(vehicle => (
                          <option key={vehicle.VehicleID} value={vehicle.VehicleID}>
                            {vehicle.VehicleRegistrationNo} - {vehicle.VehicleType}
                          </option>
                        ))}
                    </select>

                    {/* Selected Vehicle Tags */}
                    {selectedVehicleTags.length > 0 && (
                      <div className="selected-vehicles-tags" style={{ marginTop: '10px' }}>
                        {selectedVehicleTags.map(tag => (
                          <span
                            key={tag.id}
                            className="vehicle-tag"
                            style={{
                              display: 'inline-block',
                              backgroundColor: '#007bff',
                              color: 'white',
                              padding: '6px 12px',
                              margin: '4px 4px 4px 0',
                              borderRadius: '20px',
                              fontSize: '13px',
                              cursor: 'pointer',
                              border: 'none',
                              boxShadow: '0 2px 4px rgba(0,123,255,0.3)',
                              transition: 'all 0.2s ease',
                              userSelect: 'none'
                            }}
                            onMouseEnter={(e) => {
                              e.target.style.backgroundColor = '#0056b3';
                              e.target.style.transform = 'scale(1.05)';
                            }}
                            onMouseLeave={(e) => {
                              e.target.style.backgroundColor = '#007bff';
                              e.target.style.transform = 'scale(1)';
                            }}
                            onClick={() => removeVehicleTag(tag.id)}
                            title="Click to remove"
                          >
                            {tag.registrationNo} - {tag.type} ✕
                          </span>
                        ))}
                      </div>
                    )}

                    {errors.VehicleNo && <span className="error-message">{errors.VehicleNo}</span>}
                  </div>

                  <div className="form-group">
                    <label>Vendor Name & Code</label>
                    <Dropdown
                      name="VendorName"
                      value={masterData.VendorName}
                      onChange={handleMasterDataChange}
                      apiCall={vendorAPI.getAll}
                      valueKey="VendorID"
                      labelKey="VendorName"
                      formatLabel={(vendor) => `${vendor.VendorName} (${vendor.VendorCode})`}
                      placeholder="Select Vendor"
                      allowEmpty={true}
                      key={`vendor-${editingTransaction?.TransactionID || 'new'}-${masterData.VendorName}`}
                    />
                  </div>
                </>
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
                    <select
                      name="DriverID"
                      onChange={handleDriverSelect}
                      className={`form-control ${errors.DriverID ? 'error' : ''}`}
                      defaultValue=""
                    >
                      <option value="">Select Driver to Add</option>
                      {drivers
                        .filter(driver => !selectedDrivers.some(d => d.id === driver.DriverID))
                        .map(driver => (
                          <option key={driver.DriverID} value={driver.DriverID}>
                            {driver.DriverName}
                          </option>
                        ))}
                    </select>

                    {/* Selected Driver Tags */}
                    {selectedDrivers.length > 0 && (
                      <div className="selected-drivers-tags" style={{ marginTop: '10px' }}>
                        {selectedDrivers.map(tag => (
                          <span
                            key={tag.id}
                            className="driver-tag"
                            style={{
                              display: 'inline-block',
                              backgroundColor: '#28a745',
                              color: 'white',
                              padding: '6px 12px',
                              margin: '4px 4px 4px 0',
                              borderRadius: '20px',
                              fontSize: '13px',
                              cursor: 'pointer',
                              border: 'none',
                              boxShadow: '0 2px 4px rgba(40,167,69,0.3)',
                              transition: 'all 0.2s ease',
                              userSelect: 'none'
                            }}
                            onClick={() => removeDriverTag(tag.id)}
                            title="Click to remove"
                            onMouseEnter={(e) => {
                              e.target.style.backgroundColor = '#1e7e34';
                              e.target.style.transform = 'scale(1.05)';
                            }}
                            onMouseLeave={(e) => {
                              e.target.style.backgroundColor = '#28a745';
                              e.target.style.transform = 'scale(1)';
                            }}
                          >
                            {tag.name} - {tag.mobile} ✕
                          </span>
                        ))}
                      </div>
                    )}
                    {errors.DriverID && <span className="error-message">{errors.DriverID}</span>}
                  </div>
                </>
              ) : (
                <>
                  <div className="form-group">
                    <label>Driver Name *</label>
                    <Dropdown
                      name="DriverID"
                      value={transactionData.DriverID}
                      onChange={handleTransactionDataChange}
                      apiCall={driverAPI.getAll}
                      valueKey="DriverID"
                      labelKey="DriverName"
                      formatLabel={(driver) => `${driver.DriverName}`}
                      placeholder="Select Driver"
                      allowEmpty={true}
                      className={errors.DriverID ? 'error' : ''}
                    />
                    {errors.DriverID && <span className="error-message">{errors.DriverID}</span>}
                  </div>

                  <div className="form-group">
                    <label>Driver Mobile No</label>
                    <input
                      type="text"
                      name="DriverMobileNo"
                      value={transactionData.DriverMobileNo}
                      className="readonly-field"
                      readOnly
                      placeholder="Auto-populated when driver is selected"
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

              <div className="form-group">
                <label>Arrival Time at Hub</label>
                <input
                  type="time"
                  name="ArrivalTimeAtHub"
                  value={transactionData.ArrivalTimeAtHub}
                  onChange={handleTransactionDataChange}
                />
              </div>

              <div className="form-group">
                <label>In Time by Customer</label>
                <input
                  type="time"
                  name="InTimeByCust"
                  value={transactionData.InTimeByCust}
                  onChange={handleTransactionDataChange}
                />
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
                />
                {errors.OpeningKM && <span className="error-message">{errors.OpeningKM}</span>}
              </div>

              <div className="form-group">
                <label>Out Time from Hub</label>
                <input
                  type="time"
                  name="OutTimeFromHub"
                  value={transactionData.OutTimeFromHub}
                  onChange={handleTransactionDataChange}
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
                <label>Return Reporting Time</label>
                <input
                  type="time"
                  name="ReturnReportingTime"
                  value={transactionData.ReturnReportingTime}
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
                />
                {errors.ClosingKM && <span className="error-message">{errors.ClosingKM}</span>}
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
                  value={transactionData.DriverAadharDoc}
                  onChange={handleFileChange}
                  accept=".pdf,.jpg,.jpeg,.png"
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
                  value={transactionData.DriverLicenceDoc}
                  onChange={handleFileChange}
                  accept=".pdf,.jpg,.jpeg,.png"
                />

                {/* Arrival Time at Hub */}
                <div className="form-group">
                  <label>Arrival Time at Hub</label>
                  <input
                    type="time"
                    name="ArrivalTimeAtHub"
                    value={transactionData.ArrivalTimeAtHub}
                    onChange={handleTransactionDataChange}
                  />
                </div>

                {/* In Time by Customer */}
                <div className="form-group">
                  <label>In Time by Customer</label>
                  <input
                    type="time"
                    name="InTimeByCust"
                    value={transactionData.InTimeByCust}
                    onChange={handleTransactionDataChange}
                  />
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
                  />
                  {errors.OpeningKM && <span className="error-message">{errors.OpeningKM}</span>}
                </div>

                {/* Out Time from Hub */}
                <div className="form-group">
                  <label>Out Time from Hub</label>
                  <input
                    type="time"
                    name="OutTimeFromHub"
                    value={transactionData.OutTimeFromHub}
                    onChange={handleTransactionDataChange}
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

                {/* Return Reporting Time */}
                <div className="form-group">
                  <label>Return Reporting Time</label>
                  <input
                    type="time"
                    name="ReturnReportingTime"
                    value={transactionData.ReturnReportingTime}
                    onChange={handleTransactionDataChange}
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
                  />
                  {errors.ClosingKM && <span className="error-message">{errors.ClosingKM}</span>}
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
                  value={transactionData.TollExpensesDoc}
                  onChange={handleFileChange}
                  accept=".pdf,.jpg,.jpeg,.png"
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
                  value={transactionData.ParkingChargesDoc}
                  onChange={handleFileChange}
                  accept=".pdf,.jpg,.jpeg,.png"
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

                {/* Advance Request No */}
                <div className="form-group">
                  <label>Advance Request No</label>
                  <input
                    type="text"
                    name="AdvanceRequestNo"
                    value={transactionData.AdvanceRequestNo}
                    onChange={handleTransactionDataChange}
                    placeholder="Enter advance request number"
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
                <label>Out Time From HUB</label>
                <input
                  type="time"
                  name="OutTimeFromHUB"
                  value={calculatedData.OutTimeFromHUB}
                  onChange={handleCalculatedDataChange}
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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h3>Recent Transactions</h3>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={handleExportFixed}
              style={{
                backgroundColor: '#28a745',
                color: 'white',
                border: 'none',
                padding: '8px 16px',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '14px'
              }}
              title="Export Fixed Transactions to Excel"
            >
              📊 Export Fixed
            </button>
            <button
              onClick={handleExportAdhoc}
              style={{
                backgroundColor: '#fd7e14',
                color: 'white',
                border: 'none',
                padding: '8px 16px',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '14px'
              }}
              title="Export Adhoc/Replacement Transactions to Excel"
            >
              📊 Export Adhoc
            </button>
          </div>
        </div>
        <DataTable
          title="📋 Daily Vehicle Transaction List"
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

export default DailyVehicleTransactionForm;
