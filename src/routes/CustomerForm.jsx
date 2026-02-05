import { useState, useEffect } from 'react';
import { customerAPI, locationAPI, apiHelpers } from '../services/api';
import DataTable from '../components/DataTable';

import AddressForm from '../components/AddressForm';
import ValidatedInput from '../components/ValidatedInput';
import DocumentUpload from '../components/DocumentUpload';
import ValidationErrorModal from '../components/ValidationErrorModal';
import PDFPreviewModal from '../components/PDFPreviewModal';
import DocumentActionModal from '../components/DocumentActionModal';
import { showWarning } from '../components/Notification';
import useFormValidation from '../hooks/useFormValidation';
import Dropdown from '../components/Dropdown';
import './CustomerForm.css';

// Utility function to format date for input fields
const formatDateForInput = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return '';
  return date.toISOString().split('T')[0]; // Returns YYYY-MM-DD format
};

const CustomerForm = () => {
  // Global validation system
  const {
    validateBeforeSubmit,
    showErrorModal,
    closeErrorModal,
    errorSummary,
    goToField,
    isValidating
  } = useFormValidation('customer', {
    // Custom validation functions for customer-specific rules
    Name: (value) => {
      if (!value || value.trim().length < 2) {
        return { isValid: false, error: 'Company name must be at least 2 characters' };
      }
      return { isValid: true, error: null };
    },
    MasterCustomerName: (value) => {
      if (!value || value.trim().length < 2) {
        return { isValid: false, error: 'Master customer name must be at least 2 characters' };
      }
      return { isValid: true, error: null };
    },
    // Validate structured address fields instead of single Address field
    pin_code: (value) => {
      if (value && !/^\d{6}$/.test(value)) {
        return { isValid: false, error: 'PIN code must be exactly 6 digits' };
      }
      return { isValid: true, error: null };
    },
    AgreementExpiryDate: (value, formData) => {
      if (formData.AgreementDate && value && new Date(value) < new Date(formData.AgreementDate)) {
        return { isValid: false, error: 'Agreement Expiry Date cannot be before Agreement Date' };
      }
      return { isValid: true, error: null };
    },
    BGExpiryDate: (value, formData) => {
      if (formData.BGDate && value && new Date(value) < new Date(formData.BGDate)) {
        return { isValid: false, error: 'BG Expiry Date cannot be before BG Date' };
      }
      return { isValid: true, error: null };
    },
    POExpiryDate: (value, formData) => {
      if (formData.PODate && value && new Date(value) < new Date(formData.PODate)) {
        return { isValid: false, error: 'PO Expiry Date cannot be before PO Date' };
      }
      return { isValid: true, error: null };
    }
  });

  const getInitialState = () => ({
    // Name & Code Section
    MasterCustomerName: '',
    Name: '',
    CustomerCode: '', // Auto-generated, read-only
    TypeOfServices: '',
    ServiceCode: '', // Auto-selected based on TypeOfServices
    CustomerSite: [{ location: '', sites: [''] }], // Grouped: one location with multiple sites

    // Agreement & Terms Section
    Agreement: 'No',
    AgreementFile: null,
    AgreementDate: '',
    AgreementTenure: '',
    AgreementExpiryDate: '',
    CustomerNoticePeriod: '',
    CogentNoticePeriod: '',
    CreditPeriod: '',
    Insurance: 'No',
    MinimumInsuranceValue: '',
    CogentDebitClause: 'No',
    CogentDebitLimit: '',
    BG: 'No',
    BGFile: null,
    BGAmount: '',
    BGDate: '',
    BGExpiryDate: '',
    BGBank: '',
    BGReceivingByCustomer: '',
    BGReceivingFile: null,

    // PO Section
    PO: '',
    POFile: null,
    POValue: '',
    PODate: '',
    POTenure: '',
    POExpiryDate: '',

    // Commercials & Billing Section
    Rates: '',
    RatesAnnexureFile: null,
    YearlyEscalationClause: 'No',
    GSTNo: '',
    GSTRate: '',
    TypeOfBilling: 'RCM',
    BillingTenure: '',
    BillingFromDate: '',
    BillingToDate: '',

    // MIS Section
    MISFormatFile: null,
    KPISLAFile: null,
    PerformanceReportFile: null,

    // Primary Contact Information (consolidated from Section 6)
    PrimaryContact: {
      CustomerMobileNo: '',
      AlternateMobileNo: '',
      CustomerEmail: '',
      CustomerContactPerson: '',
      CustomerGroup: ''
    },

    // Address fields for AddressForm component
    house_flat_no: '',
    street_locality: '',
    city: '',
    state: '',
    pin_code: '',
    country: 'India',

    // Unified Additional Contacts (replaces CustomerOfficeAddress and CustomerKeyContact)
    AdditionalContacts: [
      {
        ContactType: 'Office Address', // 'Office Address' or 'Key Contact'
        Name: '',
        Department: '',
        Designation: '',
        Location: '',        // Used for Key Contacts
        OfficeType: '',      // Used for both types
        Mobile: '',
        Email: '',
        DOB: '',
        // Structured address instead of simple string
        Address: {
          house_flat_no: '',
          street_locality: '',
          city: '',
          state: '',
          pin_code: '',
          country: 'India'
        }
      }
    ],
    CustomerCogentContact: {
      CustomerOwner: '',
      ProjectHead: '',
      OpsHead: '',
      OpsManager: '',
      Supervisor: '',
      EmailID: '',
      MobileNo: ''
    }
  });

  const [customerData, setCustomerData] = useState(getInitialState());
  const [customers, setCustomers] = useState([]);
  const [locations, setLocations] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [errors, setErrors] = useState({});

  // Track files marked for deletion (will be deleted on form submit)
  const [filesToDelete, setFilesToDelete] = useState([]);

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

    console.log('🗓️ Applying date filter to customers:', dateFilter);
    await loadCustomers();
  };

  const handleDateFilterClear = async () => {
    setDateFilter({
      fromDate: '',
      toDate: ''
    });
    console.log('🗑️ Clearing customer date filter');
    await loadCustomers();
  };

  // State for modal viewer
  const [modalImage, setModalImage] = useState(null);
  const [showModal, setShowModal] = useState(false);

  // State for PDF preview modal
  const [showPDFModal, setShowPDFModal] = useState(false);
  const [pdfModalUrl, setPdfModalUrl] = useState(null);
  const [pdfFileName, setPdfFileName] = useState(null);

  // State for document action modal
  const [showDocumentActionModal, setShowDocumentActionModal] = useState(false);
  const [documentActionData, setDocumentActionData] = useState({
    fileType: '',
    fileName: '',
    fileUrl: '',
    onDownload: null,
    onOpenInNewTab: null
  });



  // Service code mapping based on type of services
  const serviceCodeMapping = {
    'Transportation': 'TRANS',
    'Warehousing': 'WARE',
    'Both': 'BOTH',
    'Logistics': 'LOG',
    'Industrial Transport': 'INDTRANS',
    'Retail Distribution': 'RETAIL',
    'Other': 'OTHER'
  };



  // Handle adding new location group
  const addLocation = () => {
    setCustomerData(prev => ({
      ...prev,
      CustomerSite: [...prev.CustomerSite, { location: '', sites: [''] }]
    }));
  };

  // Handle removing location group
  const removeLocation = (locationIndex) => {
    setCustomerData(prev => ({
      ...prev,
      CustomerSite: prev.CustomerSite.filter((_, i) => i !== locationIndex)
    }));
  };

  // Handle location name change
  const handleLocationChange = (locationIndex, value) => {
    setCustomerData(prev => ({
      ...prev,
      CustomerSite: prev.CustomerSite.map((item, i) =>
        i === locationIndex ? { ...item, location: value } : item
      )
    }));
  };

  // Handle adding site to a specific location
  const addSiteToLocation = (locationIndex) => {
    setCustomerData(prev => ({
      ...prev,
      CustomerSite: prev.CustomerSite.map((item, i) =>
        i === locationIndex ? { ...item, sites: [...item.sites, ''] } : item
      )
    }));
  };

  // Handle removing site from a specific location
  const removeSiteFromLocation = (locationIndex, siteIndex) => {
    setCustomerData(prev => ({
      ...prev,
      CustomerSite: prev.CustomerSite.map((item, i) =>
        i === locationIndex
          ? { ...item, sites: item.sites.filter((_, si) => si !== siteIndex) }
          : item
      )
    }));
  };

  // Handle site value change
  const handleSiteChange = (locationIndex, siteIndex, value) => {
    setCustomerData(prev => ({
      ...prev,
      CustomerSite: prev.CustomerSite.map((item, i) =>
        i === locationIndex
          ? {
            ...item,
            sites: item.sites.map((site, si) => (si === siteIndex ? value : site))
          }
          : item
      )
    }));
  };

  const addArrayItem = (arrayName) => {
    const newItem = arrayName === 'AdditionalContacts'
      ? {
        ContactType: 'Office Address',
        Name: '',
        Department: '',
        Designation: '',
        Location: '',
        OfficeType: '',
        Mobile: '',
        Email: '',
        DOB: '',
        Address: {
          house_flat_no: '',
          street_locality: '',
          city: '',
          state: '',
          pin_code: '',
          country: 'India'
        }
      }
      : getInitialState()[arrayName][0];

    setCustomerData(prev => ({
      ...prev,
      [arrayName]: [...prev[arrayName], newItem]
    }));
  };

  const removeArrayItem = (arrayName, index) => {
    setCustomerData(prev => ({
      ...prev,
      [arrayName]: prev[arrayName].filter((_, i) => i !== index)
    }));
  };

  const handleArrayInputChange = (e, index, arrayName = 'AdditionalContacts') => {
    const { name, value } = e.target;
    console.log('🔧 handleArrayInputChange called:', { name, value, index, arrayName });
    console.log('🔧 Current customerData[arrayName]:', customerData[arrayName]);

    const updatedArray = [...customerData[arrayName]];
    updatedArray[index][name] = value;

    console.log('🔧 Updated array:', updatedArray);
    setCustomerData(prev => ({ ...prev, [arrayName]: updatedArray }));

    // Clear existing error for this field
    const fieldKey = `${arrayName}[${index}].${name}`;
    if (errors[fieldKey]) {
      setErrors(prev => ({ ...prev, [fieldKey]: '' }));
    }
  };

  // Handle Additional Contact field blur for validation
  const handleAdditionalContactBlur = (e, index) => {
    const { name, value } = e.target;
    const fieldKey = `AdditionalContacts[${index}].${name}`;

    let error = null;
    const contact = customerData.AdditionalContacts[index];

    // Only validate if the contact has some data (not completely empty)
    const hasData = contact.Name?.trim() || contact.Mobile?.trim() || contact.Email?.trim();

    if (hasData) {
      switch (name) {
        case 'Name':
          if (!value?.trim()) {
            error = `Contact ${index + 1}: Name is required`;
          }
          break;
        case 'Mobile':
          if (value && !/^[6-9]\d{9}$/.test(value.replace(/\D/g, ''))) {
            error = `Contact ${index + 1}: Mobile number must be 10 digits starting with 6-9`;
          }
          break;
        case 'Email':
          if (value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
            error = `Contact ${index + 1}: Please enter a valid email address`;
          }
          break;
        case 'DOB':
          if (value && new Date(value) > new Date()) {
            error = `Contact ${index + 1}: Date of birth cannot be in the future`;
          }
          break;
      }
    }

    if (error) {
      setErrors(prev => ({ ...prev, [fieldKey]: error }));
    }
  };

  // Handle PrimaryContact input changes
  const handlePrimaryContactChange = (e) => {
    const { name, value } = e.target;
    setCustomerData(prev => ({
      ...prev,
      PrimaryContact: {
        ...prev.PrimaryContact,
        [name]: value
      }
    }));

    // Clear existing error for this field
    const fieldKey = `PrimaryContact.${name}`;
    if (errors[fieldKey]) {
      setErrors(prev => ({ ...prev, [fieldKey]: '' }));
    }
  };

  // Handle PrimaryContact field blur for validation
  const handlePrimaryContactBlur = (e) => {
    const { name, value } = e.target;
    const fieldKey = `PrimaryContact.${name}`;

    let error = null;
    switch (name) {
      case 'CustomerMobileNo':
      case 'AlternateMobileNo':
        if (value && !/^[6-9]\d{9}$/.test(value.replace(/\D/g, ''))) {
          error = 'Mobile number must be 10 digits starting with 6-9';
        }
        break;
      case 'CustomerEmail':
        if (value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
          error = 'Please enter a valid email address';
        }
        break;
    }

    if (error) {
      setErrors(prev => ({ ...prev, [fieldKey]: error }));
    }
  };

  // Load customers on component mount
  useEffect(() => {
    loadCustomers();
    loadLocations();
  }, []);

  // Auto-generate customer code when MasterCustomerName or Name changes
  useEffect(() => {
    const generateCode = async () => {
      // Only generate for new customers (not editing)
      if (!editingCustomer && (customerData.MasterCustomerName || customerData.Name)) {
        // Combine both Master Customer Name and Company Name for code generation
        const masterName = customerData.MasterCustomerName?.trim() || '';
        const companyName = customerData.Name?.trim() || '';

        // Create combined name for code generation
        let combinedName = '';
        if (masterName && companyName) {
          combinedName = `${masterName} ${companyName}`;
        } else if (masterName) {
          combinedName = masterName;
        } else if (companyName) {
          combinedName = companyName;
        }

        if (combinedName) {
          try {
            const generatedCode = await generateCustomerCode(combinedName);
            setCustomerData(prev => ({
              ...prev,
              CustomerCode: generatedCode
            }));
          } catch (error) {
            console.error('Error generating customer code:', error);
            // Show user-friendly message for code generation failure
            apiHelpers.showWarning('Unable to generate customer code automatically. You may need to enter it manually.');
          }
        }
      }
    };

    // Debounce the code generation to avoid too many API calls
    const timeoutId = setTimeout(generateCode, 500);
    return () => clearTimeout(timeoutId);
  }, [customerData.MasterCustomerName, customerData.Name, editingCustomer]);

  // Expiry date reminder logic with red flag popups
  const checkExpiryDates = (customerData) => {
    const today = new Date();
    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(today.getDate() + 7);
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(today.getDate() + 30);

    const expiryFields = [
      { field: 'AgreementExpiryDate', label: 'Agreement', date: customerData.AgreementExpiryDate },
      { field: 'BGExpiryDate', label: 'Bank Guarantee', date: customerData.BGExpiryDate },
      { field: 'POExpiryDate', label: 'Purchase Order', date: customerData.POExpiryDate }
    ];

    expiryFields.forEach(({ field, label, date }) => {
      if (date) {
        const expiryDate = new Date(date);
        if (expiryDate < today) {
          // Expired - Red flag
          showExpiryAlert('danger', `${label} has EXPIRED!`, `Expired on ${formatDateForInput(date)}`, field);
        } else if (expiryDate <= sevenDaysFromNow) {
          // Expires within 7 days - Critical warning
          const daysUntilExpiry = Math.ceil((expiryDate - today) / (1000 * 60 * 60 * 24));
          showExpiryAlert('warning', `${label} expires soon!`, `Expires in ${daysUntilExpiry} day${daysUntilExpiry !== 1 ? 's' : ''} (${formatDateForInput(date)})`, field);
        } else if (expiryDate <= thirtyDaysFromNow) {
          // Expires within 30 days - Regular warning
          const daysUntilExpiry = Math.ceil((expiryDate - today) / (1000 * 60 * 60 * 24));
          showWarning(`${label} expires in ${daysUntilExpiry} days (${formatDateForInput(date)})`);
        }
      }
    });
  };

  // Show red flag popup for critical expiry alerts
  const showExpiryAlert = (type, title, message, fieldName) => {
    // Create a custom alert modal for critical expiries
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type === 'danger' ? 'danger' : 'warning'} alert-dismissible fade show position-fixed`;
    alertDiv.style.cssText = `
      top: 20px;
      right: 20px;
      z-index: 9999;
      min-width: 350px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      border: 2px solid ${type === 'danger' ? '#dc3545' : '#ffc107'};
    `;

    alertDiv.innerHTML = `
      <div class="d-flex align-items-start">
        <div class="me-3">
          <i class="fas fa-exclamation-triangle fa-2x text-${type === 'danger' ? 'danger' : 'warning'}"></i>
        </div>
        <div class="flex-grow-1">
          <h6 class="alert-heading mb-1">${title}</h6>
          <p class="mb-2">${message}</p>
          <button class="btn btn-sm btn-outline-${type === 'danger' ? 'danger' : 'warning'} me-2" onclick="document.getElementById('${fieldName}').focus(); this.parentElement.parentElement.parentElement.remove();">
            Fix Now
          </button>
        </div>
        <button type="button" class="btn-close" onclick="this.parentElement.parentElement.remove();"></button>
      </div>
    `;

    document.body.appendChild(alertDiv);

    // Auto-remove after 10 seconds for danger alerts, 7 seconds for warnings
    setTimeout(() => {
      if (alertDiv.parentElement) {
        alertDiv.remove();
      }
    }, type === 'danger' ? 10000 : 7000);
  };

  // Check expiry dates when customer data changes
  useEffect(() => {
    if (customerData && Object.keys(customerData).length > 0) {
      checkExpiryDates(customerData);
    }
  }, [customerData.AgreementExpiryDate, customerData.BGExpiryDate, customerData.POExpiryDate]);

  // Auto-calculate Agreement Expiry Date based on Agreement Date and Tenure
  useEffect(() => {
    if (customerData.AgreementDate && customerData.AgreementTenure) {
      const agreementDate = new Date(customerData.AgreementDate);
      const tenureYears = parseFloat(customerData.AgreementTenure);

      if (!isNaN(tenureYears) && tenureYears > 0) {
        // Add years to the agreement date
        const expiryDate = new Date(agreementDate);
        expiryDate.setFullYear(expiryDate.getFullYear() + tenureYears);

        // Format as YYYY-MM-DD for date input
        const formattedDate = expiryDate.toISOString().split('T')[0];

        // Only update if the calculated date is different from current value
        if (customerData.AgreementExpiryDate !== formattedDate) {
          setCustomerData(prev => ({
            ...prev,
            AgreementExpiryDate: formattedDate
          }));
        }
      }
    }
  }, [customerData.AgreementDate, customerData.AgreementTenure]);

  // Auto-calculate PO Expiry Date based on PO Date and Tenure
  useEffect(() => {
    if (customerData.PODate && customerData.POTenure) {
      const poDate = new Date(customerData.PODate);
      // Convert POTenure to string first to handle numeric values from database
      const tenureText = String(customerData.POTenure).toLowerCase().trim();

      // Parse tenure (e.g., "1 year", "2 years", "6 months")
      const yearMatch = tenureText.match(/(\d+\.?\d*)\s*(year|yr)/);
      const monthMatch = tenureText.match(/(\d+\.?\d*)\s*(month|mon)/);

      let expiryDate = null;

      if (yearMatch) {
        const years = parseFloat(yearMatch[1]);
        expiryDate = new Date(poDate);
        expiryDate.setFullYear(expiryDate.getFullYear() + years);
      } else if (monthMatch) {
        const months = parseFloat(monthMatch[1]);
        expiryDate = new Date(poDate);
        expiryDate.setMonth(expiryDate.getMonth() + months);
      }

      if (expiryDate) {
        // Format as YYYY-MM-DD for date input
        const formattedDate = expiryDate.toISOString().split('T')[0];

        // Only update if the calculated date is different from current value
        if (customerData.POExpiryDate !== formattedDate) {
          setCustomerData(prev => ({
            ...prev,
            POExpiryDate: formattedDate
          }));
        }
      }
    }
  }, [customerData.PODate, customerData.POTenure]);

  // Handle GST Rate based on Type of Billing
  useEffect(() => {
    if (customerData.TypeOfBilling) {
      const billingType = customerData.TypeOfBilling;

      // If RCM or Exempt, set GST Rate to 0
      if (billingType === 'RCM' || billingType === 'Exempt') {
        if (customerData.GSTRate !== '0') {
          setCustomerData(prev => ({
            ...prev,
            GSTRate: '0'
          }));
        }
      }
      // If GST and GSTRate is currently 0 (from previous RCM/Exempt), clear it
      else if (billingType === 'GST' && customerData.GSTRate === '0') {
        setCustomerData(prev => ({
          ...prev,
          GSTRate: ''
        }));
      }
    }
  }, [customerData.TypeOfBilling]);

  // Handle Billing Tenure date fields based on selection
  useEffect(() => {
    if (customerData.BillingTenure === 'Monthly') {
      // Clear date fields when Monthly is selected
      if (customerData.BillingFromDate || customerData.BillingToDate) {
        setCustomerData(prev => ({
          ...prev,
          BillingFromDate: '',
          BillingToDate: ''
        }));
      }
    }
  }, [customerData.BillingTenure]);

  const loadCustomers = async () => {
    try {
      setIsLoading(true);

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

      console.log('🗓️ Loading customers with date filter:', { fromDate: dateFilter.fromDate, toDate: dateFilter.toDate });

      const response = await customerAPI.getAll(url);
      setCustomers(response.data.value || response.data || []);
    } catch (error) {
      console.error('Error loading customers:', error);
      // Use specialized error handler for data loading
      apiHelpers.handleLoadError(error, 'customer list');
    } finally {
      setIsLoading(false);
    }
  };

  const loadLocations = async (customerId) => {
    try {
      if (customerId) {
        const response = await locationAPI.getByCustomer(customerId);
        setLocations(response.data.data || []);
      } else {
        const response = await locationAPI.getAll();
        setLocations(response.data || []);
      }
    } catch (error) {
      console.error('Error loading locations:', error);
      // Use specialized error handler for data loading
      apiHelpers.handleLoadError(error, 'location data');
    }
  };

  const validateField = (fieldName, fieldValue, allData = customerData) => {
    // Real-time field validation
    switch (fieldName) {
      case 'Name':
        if (!fieldValue.trim()) return 'Company name is required';
        if (fieldValue.trim().length < 2) return 'Company name must be at least 2 characters long';
        break;
      case 'MasterCustomerName':
        if (!fieldValue.trim()) return 'Master customer name is required';
        if (fieldValue.trim().length < 2) return 'Master customer name must be at least 2 characters long';
        break;
      case 'TypeOfServices':
        if (!fieldValue) return 'Please select a type of service';
        break;
      case 'AgreementDate':
        break;
      case 'AgreementExpiryDate':
        if (allData.AgreementDate && fieldValue && new Date(fieldValue) <= new Date(allData.AgreementDate)) {
          return 'Agreement expiry date must be after agreement date';
        }
        break;
      case 'BGDate':
        if (allData.BG === 'Yes' && !fieldValue) return 'BG date is required when BG is Yes';
        break;
      case 'BGExpiryDate':
        if (allData.BG === 'Yes' && !fieldValue) return 'BG expiry date is required when BG is Yes';
        if (allData.BGDate && fieldValue && new Date(fieldValue) <= new Date(allData.BGDate)) {
          return 'BG expiry date must be after BG date';
        }
        break;
      case 'BGAmount':
        if (allData.BG === 'Yes' && (!fieldValue || fieldValue <= 0)) {
          return 'BG amount is required and must be greater than 0 when BG is Yes';
        }
        break;
      case 'PODate':
        if (allData.PO && allData.PO.trim() && !fieldValue) return 'PO date is required when PO number is provided';
        break;
      case 'POExpiryDate':
        if (allData.PO && allData.PO.trim() && !fieldValue) return 'PO expiry date is required when PO number is provided';
        if (allData.PODate && fieldValue && new Date(fieldValue) <= new Date(allData.PODate)) {
          return 'PO expiry date must be after PO date';
        }
        break;
      case 'POValue':
        if (allData.PO && allData.PO.trim() && (!fieldValue || fieldValue <= 0)) {
          return 'PO value is required and must be greater than 0 when PO number is provided';
        }
        break;
      case 'BillingFromDate':
        if (allData.BillingTenure === 'Specific Dates' && !fieldValue) {
          return 'Billing From Date is required when Specific Dates is selected';
        }
        break;
      case 'BillingToDate':
        if (allData.BillingTenure === 'Specific Dates' && !fieldValue) {
          return 'Billing To Date is required when Specific Dates is selected';
        }
        if (allData.BillingFromDate && fieldValue && new Date(fieldValue) <= new Date(allData.BillingFromDate)) {
          return 'Billing To Date must be after Billing From Date';
        }
        break;
      case 'CustomerCogentContact[EmailID]':
        if (fieldValue && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fieldValue)) {
          return 'Please enter a valid email address';
        }
        break;
      case 'CustomerCogentContact[MobileNo]':
        if (fieldValue && !/^[6-9]\d{9}$/.test(fieldValue.replace(/\D/g, ''))) {
          return 'Mobile number must be 10 digits starting with 6-9';
        }
        break;
      default:
        return null;
    }
    return null;
  };

  const handleInputChange = (e) => {
    const { name, value, type, files } = e.target;

    if (type === 'file') {
      setCustomerData(prev => ({ ...prev, [name]: files[0] }));
    } else {
      setCustomerData(prev => {
        const newData = { ...prev };

        // Handle nested object fields like CustomerCogentContact[CustomerOwner]
        if (name.includes('[') && name.includes(']')) {
          const [objectName, propertyName] = name.split(/[\[\]]/);
          if (!newData[objectName]) {
            newData[objectName] = {};
          }
          newData[objectName][propertyName] = value;
        } else {
          newData[name] = value;
        }

        // Auto-select service code based on type of services
        if (name === 'TypeOfServices') {
          const serviceCode = serviceCodeMapping[value] || '';
          newData.ServiceCode = serviceCode;
        }

        return newData;
      });
    }

    // Clear existing error for this field
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleInputBlur = (e) => {
    const { name, value } = e.target;

    // Validate field on blur (when user leaves the field)
    const error = validateField(name, value);
    if (error) {
      setErrors(prev => ({ ...prev, [name]: error }));
    }
  };

  const handleKeyDown = (e) => {
    if (e.target.type === 'number' && e.key === 'e') {
      e.preventDefault();
    }
  };

  // Helper function to get file preview URL
  const getFilePreview = (file) => {
    if (!file) return null;

    if (file.type && file.type.startsWith('image/')) {
      return URL.createObjectURL(file);
    }
    return null;
  };

  // Helper function to format file size
  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Helper function to get existing image URL from database path
  const getExistingImageUrl = (imagePath) => {
    if (!imagePath) {
      console.warn('⚠️ getExistingImageUrl: No image path provided');
      return null;
    }

    // Check if it's already a full URL
    if (imagePath.startsWith('http')) {
      console.log('🔗 getExistingImageUrl: Using full URL:', imagePath);
      return imagePath;
    }

    // Create URL for server-stored image - use backend port 3004
    const baseUrl = import.meta.env.VITE_API_BASE_URL || '';

    // Extract just the filename from the path
    let filename = imagePath;
    if (imagePath.includes('/') || imagePath.includes('\\')) {
      filename = imagePath.split(/[/\\]/).pop();
    }

    // Use the proper API endpoint for customers
    const constructedUrl = `${baseUrl}/api/customers/files/${filename}`;
    console.log('🔗 getExistingImageUrl: Constructed URL:', {
      originalPath: imagePath,
      filename: filename,
      baseUrl: baseUrl,
      finalUrl: constructedUrl
    });

    return constructedUrl;
  };

  // Helper functions for PDF preview modal
  const openPDFPreview = (url, fileName) => {
    console.log('📄 Opening PDF preview modal:', url);
    setPdfModalUrl(url);
    setPdfFileName(fileName || 'PDF Document');
    setShowPDFModal(true);
  };

  const closePDFPreview = () => {
    setShowPDFModal(false);
    setPdfModalUrl(null);
    setPdfFileName(null);
  };

  // Helper functions for document action modal
  const openDocumentActionModal = (fileType, fileName, fileUrl) => {
    const handleDownload = () => {
      const link = document.createElement('a');
      link.href = fileUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    };

    const handleOpenInNewTab = () => {
      window.open(fileUrl, '_blank', 'noopener,noreferrer');
    };

    setDocumentActionData({
      fileType,
      fileName,
      fileUrl,
      onDownload: handleDownload,
      onOpenInNewTab: handleOpenInNewTab
    });
    setShowDocumentActionModal(true);
  };

  const closeDocumentActionModal = () => {
    setShowDocumentActionModal(false);
    setDocumentActionData({
      fileType: '',
      fileName: '',
      fileUrl: '',
      onDownload: null,
      onOpenInNewTab: null
    });
  };

  // Handle address changes from AddressForm component
  const handleAddressChange = (newAddressData) => {
    setCustomerData(prev => ({
      ...prev,
      ...newAddressData
      // Address field removed - using structured address fields only
    }));
  };

  // Get address data for AddressForm component
  const getAddressData = () => ({
    house_flat_no: customerData.house_flat_no || '',
    street_locality: customerData.street_locality || '',
    city: customerData.city || '',
    state: customerData.state || '',
    pin_code: customerData.pin_code || '',
    country: customerData.country || 'India'
  });

  // Helper function to render comprehensive file preview (images and documents)
  const renderFilePreview = (fieldName, displayName = null) => {
    const newFile = customerData[fieldName];
    const existingPath = editingCustomer?.[fieldName];



    // Show preview if there's either a new file or existing file path
    if (!newFile && !existingPath) return null;

    const isImage = (file) => {
      if (file && file.type) return file.type.startsWith('image/');
      if (typeof file === 'string') return /\.(jpg|jpeg|png|gif|webp)$/i.test(file);
      return false;
    };

    const getFileIcon = (fileName) => {
      const ext = fileName?.split('.').pop()?.toLowerCase();
      switch (ext) {
        case 'pdf': return '📄';
        case 'doc':
        case 'docx': return '📝';
        case 'xls':
        case 'xlsx': return '📊';
        default: return '📎';
      }
    };

    return (
      <div className="file-preview">
        {newFile && newFile.name ? (
          // Show newly selected file preview
          isImage(newFile) ? (
            <img
              src={getFilePreview(newFile)}
              alt={`${displayName || fieldName} Preview`}
              className="image-preview clickable-preview"
              onClick={() => {
                setModalImage(getFilePreview(newFile));
                setShowModal(true);
              }}
              title="Click to view full size"
            />
          ) : (
            <div className="document-preview">
              <span className="document-icon">{getFileIcon(newFile.name)}</span>
              <span className="document-type">{newFile.type || 'Document'}</span>
            </div>
          )
        ) : (
          // Show existing file from database
          existingPath && (
            isImage(existingPath) ? (
              <img
                src={getExistingImageUrl(existingPath)}
                alt={`Existing ${displayName || fieldName}`}
                className="image-preview clickable-preview"
                onClick={() => {
                  setModalImage(getExistingImageUrl(existingPath));
                  setShowModal(true);
                }}
                onError={(e) => {
                  e.target.style.display = 'none';
                  console.warn(`Failed to load existing image for ${fieldName}:`, existingPath);
                }}
                title="Click to view full size"
              />
            ) : (
              <div className="document-preview">
                <span className="document-icon">{getFileIcon(existingPath)}</span>
                <span className="document-type">Document</span>
                <button
                  type="button"
                  onClick={() => {
                    const fileUrl = getExistingImageUrl(existingPath);
                    if (fileUrl) {
                      try {
                        console.log('📄 Opening document:', fileUrl);

                        // Check file type and handle appropriately
                        const fileExtension = existingPath.toLowerCase();
                        const isPDF = fileExtension.endsWith('.pdf');
                        const isImage = fileExtension.match(/\.(jpg|jpeg|png|gif|webp)$/);
                        const isWordDoc = fileExtension.match(/\.(doc|docx)$/);
                        const isExcel = fileExtension.match(/\.(xls|xlsx)$/);
                        const isPowerPoint = fileExtension.match(/\.(ppt|pptx)$/);

                        if (isPDF) {
                          // For PDFs, open in modal preview
                          console.log('📄 Opening PDF in modal preview');
                          const fileName = existingPath.split(/[/\\]/).pop() || 'PDF Document';
                          openPDFPreview(fileUrl, fileName);
                        } else if (isImage) {
                          // For images, open in image modal
                          console.log('🖼️ Opening image in modal');
                          setModalImage(fileUrl);
                          setShowModal(true);
                        } else if (isWordDoc || isExcel || isPowerPoint) {
                          // For Office documents, show custom modal instead of browser confirm
                          console.log('📄 Handling Office document:', fileExtension);
                          const fileType = isWordDoc ? 'word' : isExcel ? 'excel' : 'powerpoint';
                          const fileName = existingPath.split(/[/\\]/).pop() || 'document';
                          openDocumentActionModal(fileType, fileName, fileUrl);
                        } else {
                          // For other documents, open in new tab
                          console.log('📄 Opening other document in new tab');
                          const newWindow = window.open(fileUrl, '_blank', 'noopener,noreferrer');
                          if (!newWindow) {
                            // Popup blocked, try alternative method
                            const link = document.createElement('a');
                            link.href = fileUrl;
                            link.target = '_blank';
                            link.rel = 'noopener noreferrer';
                            document.body.appendChild(link);
                            link.click();
                            document.body.removeChild(link);
                          }
                        }
                      } catch (error) {
                        console.error('Error opening document:', error);
                        apiHelpers.showError(error, 'Unable to open document. Please check if the file exists.');
                      }
                    } else {
                      apiHelpers.showError(new Error('No file URL'), 'Document URL not available.');
                    }
                  }}
                  className="document-link"
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#007bff',
                    textDecoration: 'underline',
                    cursor: 'pointer',
                    fontSize: 'inherit'
                  }}
                >
                  View Document
                </button>
              </div>
            )
          )
        )}
        <div className="file-info">
          {newFile && newFile.name ? (
            <>
              <span className="file-name">{newFile.name}</span>
              <span className="file-size">({formatFileSize(newFile.size)})</span>
            </>
          ) : (
            <span className="file-name">Existing: {existingPath?.split('/').pop() || fieldName}</span>
          )}
        </div>
      </div>
    );
  };

  const validateForm = () => {
    const newErrors = {};

    // 1. Name & Code Section
    if (!customerData.Name.trim()) {
      newErrors.Name = 'Company name is required';
    } else if (customerData.Name.trim().length < 2) {
      newErrors.Name = 'Company name must be at least 2 characters long';
    } else if (!/^[a-zA-Z0-9\s\-&.,()]+$/.test(customerData.Name.trim())) {
      newErrors.Name = 'Company name can only contain letters, numbers, spaces, hyphens, ampersands, periods, commas, and parentheses';
    }

    if (!customerData.MasterCustomerName.trim()) {
      newErrors.MasterCustomerName = 'Master customer name is required';
    } else if (customerData.MasterCustomerName.trim().length < 2) {
      newErrors.MasterCustomerName = 'Master customer name must be at least 2 characters long';
    } else if (!/^[a-zA-Z0-9\s\-&.,()]+$/.test(customerData.MasterCustomerName.trim())) {
      newErrors.MasterCustomerName = 'Master customer name can only contain letters, numbers, spaces, hyphens, ampersands, periods, commas, and parentheses';
    }

    if (!customerData.TypeOfServices) {
      newErrors.TypeOfServices = 'Please select a type of service';
    }

    // ServiceCode is auto-generated based on TypeOfServices - ensure it's set
    if (customerData.TypeOfServices && !customerData.ServiceCode.trim()) {
      // Auto-generate ServiceCode if missing
      const serviceCode = serviceCodeMapping[customerData.TypeOfServices] || '';
      if (serviceCode) {
        // Update the customerData with the generated ServiceCode
        setCustomerData(prev => ({ ...prev, ServiceCode: serviceCode }));
      } else {
        newErrors.ServiceCode = 'Invalid type of service selected. Please reselect the type of service.';
      }
    }

    // 2. Agreement & Terms Section
    if (customerData.Agreement === 'Yes') {
      if (customerData.AgreementDate && customerData.AgreementExpiryDate && new Date(customerData.AgreementExpiryDate) <= new Date(customerData.AgreementDate)) {
        newErrors.AgreementExpiryDate = 'Agreement expiry date must be after agreement date';
      }
    }

    // 3. Financial Section
    if (customerData.BG === 'Yes') {
      if (!customerData.BGDate) {
        newErrors.BGDate = 'BG date is required when BG is Yes';
      }
      if (!customerData.BGExpiryDate) {
        newErrors.BGExpiryDate = 'BG expiry date is required when BG is Yes';
      } else if (customerData.BGDate && new Date(customerData.BGExpiryDate) <= new Date(customerData.BGDate)) {
        newErrors.BGExpiryDate = 'BG expiry date must be after BG date';
      }
      if (!customerData.BGAmount || customerData.BGAmount <= 0) {
        newErrors.BGAmount = 'BG amount is required and must be greater than 0 when BG is Yes';
      }
    }

    // PO Section validation - only validate if PO number is provided
    if (customerData.PO && customerData.PO.trim()) {
      if (!customerData.PODate) {
        newErrors.PODate = 'PO date is required when PO number is provided';
      }
      if (!customerData.POExpiryDate) {
        newErrors.POExpiryDate = 'PO expiry date is required when PO number is provided';
      } else if (customerData.PODate && new Date(customerData.POExpiryDate) <= new Date(customerData.PODate)) {
        newErrors.POExpiryDate = 'PO expiry date must be after PO date';
      }
      if (!customerData.POValue || customerData.POValue <= 0) {
        newErrors.POValue = 'PO value is required and must be greater than 0 when PO number is provided';
      }
    }

    // 4. Primary Contact Validation
    if (customerData.PrimaryContact.CustomerMobileNo &&
      !/^[6-9]\d{9}$/.test(customerData.PrimaryContact.CustomerMobileNo.replace(/\D/g, ''))) {
      newErrors['PrimaryContact.CustomerMobileNo'] = 'Mobile number must be 10 digits starting with 6-9';
    }

    if (customerData.PrimaryContact.AlternateMobileNo &&
      !/^[6-9]\d{9}$/.test(customerData.PrimaryContact.AlternateMobileNo.replace(/\D/g, ''))) {
      newErrors['PrimaryContact.AlternateMobileNo'] = 'Alternate mobile number must be 10 digits starting with 6-9';
    }

    if (customerData.PrimaryContact.CustomerEmail &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerData.PrimaryContact.CustomerEmail)) {
      newErrors['PrimaryContact.CustomerEmail'] = 'Please enter a valid email address';
    }

    // 5. Address Validation
    const addressData = getAddressData();
    if (!addressData.house_flat_no?.trim()) {
      newErrors['customer_house_flat_no'] = 'Flat/House number is required';
    }
    if (!addressData.street_locality?.trim()) {
      newErrors['customer_street_locality'] = 'Street/Locality is required';
    }
    if (!addressData.city?.trim()) {
      newErrors['customer_city'] = 'City is required';
    }
    if (!addressData.state?.trim()) {
      newErrors['customer_state'] = 'State is required';
    }
    if (!addressData.pin_code?.trim()) {
      newErrors['customer_pin_code'] = 'PIN code is required';
    } else if (!/^\d{6}$/.test(addressData.pin_code)) {
      newErrors['customer_pin_code'] = 'PIN code must be exactly 6 digits';
    }
    if (!addressData.country?.trim()) {
      newErrors['customer_country'] = 'Country is required';
    }

    // 6. Additional Contacts Validation
    const contactKeys = new Set();
    customerData.AdditionalContacts.forEach((contact, index) => {
      if (contact.Name?.trim() || contact.Mobile?.trim() || contact.Email?.trim()) {
        // If any field is filled, validate the contact
        if (!contact.Name?.trim()) {
          newErrors[`AdditionalContacts[${index}].Name`] = `Contact ${index + 1}: Name is required`;
        }
        if (contact.Mobile && !/^[6-9]\d{9}$/.test(contact.Mobile.replace(/\D/g, ''))) {
          newErrors[`AdditionalContacts[${index}].Mobile`] = `Contact ${index + 1}: Mobile number must be 10 digits starting with 6-9`;
        }
        if (contact.Email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact.Email)) {
          newErrors[`AdditionalContacts[${index}].Email`] = `Contact ${index + 1}: Please enter a valid email address`;
        }
        if (contact.DOB && new Date(contact.DOB) > new Date()) {
          newErrors[`AdditionalContacts[${index}].DOB`] = `Contact ${index + 1}: Date of birth cannot be in the future`;
        }

        // Check for duplicate contacts
        const contactKey = `${contact.Name?.trim() || ''}-${contact.Mobile?.trim() || ''}-${contact.Email?.trim() || ''}`;
        if (contactKey !== '--' && contactKeys.has(contactKey)) {
          newErrors[`AdditionalContacts[${index}].Duplicate`] = `Contact ${index + 1}: This contact already exists. Please remove duplicate entries.`;
        } else if (contactKey !== '--') {
          contactKeys.add(contactKey);
        }
      }
    });

    // 5. Location & Customer Sites Validation
    const hasValidLocation = customerData.CustomerSite.some(locationGroup =>
      locationGroup.location && locationGroup.location.trim() !== ''
    );

    if (!hasValidLocation) {
      newErrors.CustomerSite = 'At least one location is required';
    }

    // 6. Billing Tenure Validation
    if (customerData.BillingTenure === 'Specific Dates') {
      if (!customerData.BillingFromDate) {
        newErrors.BillingFromDate = 'Billing From Date is required when Specific Dates is selected';
      }
      if (!customerData.BillingToDate) {
        newErrors.BillingToDate = 'Billing To Date is required when Specific Dates is selected';
      } else if (customerData.BillingFromDate && new Date(customerData.BillingToDate) <= new Date(customerData.BillingFromDate)) {
        newErrors.BillingToDate = 'Billing To Date must be after Billing From Date';
      }
    }

    // 7. Cognizant Contact Validation
    if (customerData.CustomerCogentContact.EmailID &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerData.CustomerCogentContact.EmailID)) {
      newErrors['CustomerCogentContact[EmailID]'] = 'Please enter a valid email address';
    }

    if (customerData.CustomerCogentContact.MobileNo &&
      !/^[6-9]\d{9}$/.test(customerData.CustomerCogentContact.MobileNo.replace(/\D/g, ''))) {
      newErrors['CustomerCogentContact[MobileNo]'] = 'Mobile number must be 10 digits starting with 6-9';
    }

    setErrors(newErrors);



    return Object.keys(newErrors).length === 0;
  };

  const scrollToFirstError = () => {
    const errorKeys = Object.keys(errors);
    if (errorKeys.length === 0) return;

    // Define the field order as they appear in the form (top to bottom)
    const fieldOrder = [
      // 1. Name & Code Section
      'MasterCustomerName', 'Name', 'CustomerCode', 'TypeOfServices', 'ServiceCode', 'CustomerSite',
      // 2. Agreement & Terms Section
      'Agreement', 'AgreementFile', 'AgreementDate', 'AgreementTenure', 'AgreementExpiryDate',
      'CustomerNoticePeriod', 'CogentNoticePeriod', 'CreditPeriod', 'Insurance', 'MinimumInsuranceValue',
      // 3. Financial Section
      'BG', 'BGFile', 'BGDate', 'BGExpiryDate', 'BGAmount',
      // 4. PO Section
      'PO', 'POFile', 'POValue', 'PODate', 'POTenure', 'POExpiryDate',
      // 5. Commercials & Billing Section
      'Rates', 'RatesAnnexureFile', 'YearlyEscalationClause', 'GSTNo', 'GSTRate', 'TypeOfBilling', 'BillingTenure', 'BillingFromDate', 'BillingToDate',
      // 6. MIS Section
      'MISFormatFile', 'KPISLAFile', 'PerformanceReportFile',
      // 7. Primary Contact
      'PrimaryContact.CustomerName', 'PrimaryContact.CustomerMobileNo', 'PrimaryContact.CustomerEmailID',
      'PrimaryContact.CustomerDesignation',
      // 8. Additional Contacts
      'AdditionalContacts',
      // 9. Cogent Contact
      'CustomerCogentContact[CustomerOwner]', 'CustomerCogentContact[ProjectHead]',
      'CustomerCogentContact[OpsHead]', 'CustomerCogentContact[OpsManager]',
      'CustomerCogentContact[Supervisor]', 'CustomerCogentContact[EmailID]', 'CustomerCogentContact[MobileNo]',
      // 10. Address Section
      'CustomerAddress', 'CustomerCity', 'CustomerState', 'CustomerPincode'
    ];

    // Find the first error in form order
    let firstErrorKey = null;
    for (const field of fieldOrder) {
      if (errorKeys.includes(field)) {
        firstErrorKey = field;
        break;
      }
    }

    // If no match found in fieldOrder, use the first error key
    if (!firstErrorKey) {
      firstErrorKey = errorKeys[0];
    }

    let fieldName = firstErrorKey;

    // Handle nested field names (e.g., 'PrimaryContact.CustomerMobileNo' -> 'CustomerMobileNo')
    if (fieldName.includes('.')) {
      fieldName = fieldName.split('.').pop();
    }

    // Handle array field names (e.g., 'AdditionalContacts[0].Name' -> 'Name')
    if (fieldName.includes('[') && fieldName.includes(']')) {
      const match = fieldName.match(/\[(\d+)\]\.(.+)/);
      if (match) {
        const index = match[1];
        const field = match[2];
        fieldName = field; // We'll look for the field in the specific contact section
      }
    }

    // Try different selectors to find the field
    const selectors = [
      `[name="${firstErrorKey}"]`,
      `[name="${fieldName}"]`,
      `#customer-${firstErrorKey}`,
      `#customer-${fieldName}`,
      `.form-group:has([name="${firstErrorKey}"])`,
      `.form-group:has([name="${fieldName}"])`,
      `.has-error:first`,
      `.error:first`
    ];

    let targetElement = null;
    let containerElement = null;

    for (const selector of selectors) {
      try {
        const element = document.querySelector(selector);
        if (element) {
          targetElement = element;
          // If we found a container, look for the first focusable element inside
          if (element.classList.contains('form-group') || element.classList.contains('has-error')) {
            containerElement = element;
            const focusable = element.querySelector('input, select, textarea, [tabindex="0"]');
            if (focusable) {
              targetElement = focusable;
            }
          }
          break;
        }
      } catch (e) {
        // Invalid selector, continue to next
        continue;
      }
    }

    if (targetElement) {
      // Scroll to the element with some offset for better visibility
      const scrollTarget = containerElement || targetElement;
      const elementRect = scrollTarget.getBoundingClientRect();
      const absoluteElementTop = elementRect.top + window.pageYOffset;
      const offset = 100; // Offset from top of viewport
      const scrollPosition = absoluteElementTop - offset;

      window.scrollTo({
        top: scrollPosition,
        behavior: 'smooth'
      });

      // Focus the field based on its type
      setTimeout(() => {
        if (targetElement.tagName === 'INPUT' || targetElement.tagName === 'SELECT' || targetElement.tagName === 'TEXTAREA') {
          targetElement.focus();

          // For text inputs, select the content for easy replacement
          if (targetElement.tagName === 'INPUT' &&
            (targetElement.type === 'text' || targetElement.type === 'number' || targetElement.type === 'email')) {
            targetElement.select();
          }
        } else if (targetElement.type === 'radio') {
          // For radio buttons, focus the first radio in the group
          targetElement.focus();
        } else {
          // For other elements, try to focus them anyway
          try {
            targetElement.focus();
          } catch (e) {
            // Element might not be focusable
            console.log('Could not focus element:', targetElement);
          }
        }
      }, 400); // Reduced delay for better UX
    } else {
      console.warn('Could not find error field:', firstErrorKey);
    }
  };

  const showErrorSummary = () => {
    const errorCount = Object.keys(errors).length;
    if (errorCount === 0) return;

    const message = `Please correct ${errorCount} error${errorCount > 1 ? 's' : ''} below before submitting the form.`;

    // Show notification at the top of the page
    apiHelpers.showError(new Error(message), 'Form Validation Error');

    // Scroll to first error after a brief delay
    setTimeout(() => {
      scrollToFirstError();
    }, 100);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();



    // First check basic form validation
    if (!validateForm()) {
      showErrorSummary();
      return; // Stop submission if basic validation fails
    }

    // Use global validation system with error modal and cursor movement
    const isValid = await validateBeforeSubmit(
      customerData,
      // Success callback
      async (validatedData) => {
        await submitCustomerData(validatedData);
      },
      // Error callback
      () => {
        // Error modal will be shown automatically
      }
    );

    if (!isValid) {
      return; // Validation failed, modal shown, cursor moved
    }
  };

  // Helper function to generate customer code abbreviation (same as backend)
  const generateCustomerAbbreviation = (name, maxLength = 3) => {
    if (!name || name.trim() === '') return 'CUS';

    // Remove common words and get meaningful parts
    const cleanName = name
      .replace(/\b(Ltd|Limited|Pvt|Private|Company|Corp|Corporation|Inc|Incorporated|LLC|LLP)\b/gi, '')
      .replace(/\b(The|And|Of|For|In|On|At|By|With)\b/gi, '')
      .trim();

    // Split into words and take first letters
    const words = cleanName.split(/\s+/).filter(word => word.length > 0);

    if (words.length === 1) {
      // Single word - take first few characters
      return words[0].substring(0, maxLength).toUpperCase();
    } else if (words.length <= maxLength) {
      // Multiple words - take first letter of each
      return words.map(word => word.charAt(0)).join('').toUpperCase();
    } else {
      // Too many words - take first letter of first few words
      return words.slice(0, maxLength).map(word => word.charAt(0)).join('').toUpperCase();
    }
  };

  // Function to generate live preview of customer code
  const generateCustomerCodePreview = (name) => {
    if (!name || name.trim() === '') return '';
    const prefix = generateCustomerAbbreviation(name, 3);
    return `${prefix}XXX`; // Show XXX as placeholder for the number part
  };

  // Function to generate actual customer code with sequential numbering
  const generateCustomerCode = async (name) => {
    if (!name || name.trim() === '') return '';

    const prefix = generateCustomerAbbreviation(name, 3);

    try {
      // Fetch all existing customers to find the highest number for this prefix
      const response = await customerAPI.getAll();
      const existingCustomers = response.data.value || response.data || [];

      // Find all customer codes that start with the same prefix
      const matchingCodes = existingCustomers
        .map(customer => customer.CustomerCode)
        .filter(code => code && code.startsWith(prefix) && code.length === prefix.length + 3)
        .map(code => parseInt(code.substring(prefix.length)))
        .filter(num => !isNaN(num));

      // Find the highest number and add 1
      const nextNumber = matchingCodes.length > 0 ? Math.max(...matchingCodes) + 1 : 1;

      // Pad with zeros to make it 3 digits
      const paddedNumber = nextNumber.toString().padStart(3, '0');

      return `${prefix}${paddedNumber}`;
    } catch (error) {
      console.error('Error generating customer code:', error);
      // Fallback: generate with 001 if API fails
      return `${prefix}001`;
    }
  };

  // Separate function for actual data submission
  const submitCustomerData = async (validatedData) => {
    try {
      // If editing, delete marked files first before updating
      if (editingCustomer && filesToDelete.length > 0) {
        console.log('🗑️ CUSTOMER UPDATE - Deleting marked files:', filesToDelete);

        // Parallelize deletions for better performance
        await Promise.all(filesToDelete.map(async (fileToDelete) => {
          try {
            console.log('🗑️ Deleting file:', fileToDelete.fieldName);
            await customerAPI.deleteFile(editingCustomer.CustomerID, fileToDelete.fieldName);
            console.log('✅ File deleted successfully:', fileToDelete.fieldName);
          } catch (error) {
            console.error('❌ Failed to delete file:', fileToDelete.fieldName, error);
            // Continue with other deletions even if one fails
          }
        }));

        // Clear the marked deletions after processing
        setFilesToDelete([]);
      }

      // Create a FormData object to handle file uploads
      const formData = new FormData();

      // For new customers, don't set CustomerCode - let backend generate it
      // Remove any existing CustomerCode to ensure backend generates it
      if (!editingCustomer && validatedData.CustomerCode) {
        delete validatedData.CustomerCode;
      }

      // Use validatedData instead of customerData to ensure latest validated values
      for (const key in validatedData) {
        if (validatedData[key] instanceof File) {
          formData.append(key, validatedData[key], validatedData[key].name);
        } else if (key === 'Locations') {
          // Convert locations array to comma-separated string
          const locationsString = validatedData.Locations
            .map(loc => loc.location)
            .filter(loc => loc.trim() !== '')
            .join(', ');
          formData.append(key, locationsString);
        } else if (key === 'CustomerSite') {
          // Convert nested customer sites structure to formatted string
          // Structure: [{ location: 'Delhi', sites: ['Dwarka Sec 21', 'Dwarka Sec 20'] }]
          // Output: "Delhi - Dwarka Sec 21, Delhi - Dwarka Sec 20"
          const sitesString = validatedData.CustomerSite
            .filter(locationGroup => locationGroup.location?.trim())
            .flatMap(locationGroup =>
              locationGroup.sites
                .filter(site => site?.trim())
                .map(site => `${locationGroup.location.trim()} - ${site.trim()}`)
            )
            .join(', ');
          formData.append(key, sitesString);
        } else if (Array.isArray(validatedData[key]) || (typeof validatedData[key] === 'object' && validatedData[key] !== null)) {
          // Convert arrays and objects to JSON strings
          formData.append(key, JSON.stringify(validatedData[key]));
        } else {
          formData.append(key, validatedData[key]);
        }
      }

      setIsSubmitting(true);
      if (editingCustomer) {
        await customerAPI.update(editingCustomer.CustomerID, formData);
        apiHelpers.showSuccess(`Customer "${validatedData.Name}" has been updated successfully!`);
      } else {
        // Capture the response to get the generated CustomerCode
        const response = await customerAPI.create(formData);

        const generatedCustomerCode = response.data?.CustomerCode;

        if (generatedCustomerCode) {
          // Update the form with the generated customer code
          setCustomerData(prev => ({
            ...prev,
            CustomerCode: generatedCustomerCode
          }));
          apiHelpers.showSuccess(`Customer "${validatedData.Name}" has been added successfully! Generated Code: ${generatedCustomerCode}`);
        } else {
          apiHelpers.showSuccess(`Customer "${validatedData.Name}" has been added successfully!`);
        }
      }
      await loadCustomers();
      // Don't reset form immediately for new customers so they can see the generated code
      if (editingCustomer) {
        resetForm();
      }
    } catch (error) {
      console.error('Error saving customer:', error);
      // Use specialized form error handler
      apiHelpers.handleFormError(error, editingCustomer ? 'customer update' : 'customer creation');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setCustomerData(getInitialState());
    setEditingCustomer(null);
    setErrors({});

    // Clear files marked for deletion
    setFilesToDelete([]);
  };



  const handleEdit = async (customer) => {
    try {
      // Fetch complete customer data including contacts
      const response = await customerAPI.getById(customer.CustomerID);
      const completeCustomerData = response.data;

      // Use the complete customer data instead of the table row data
      customer = completeCustomerData;
    } catch (error) {
      console.error('Error fetching complete customer data:', error);

      // Show user-friendly error message for edit data loading
      let errorMessage;
      if (error.response?.status === 404) {
        errorMessage = 'Customer not found. It may have been deleted by another user.';
      } else if (error.response?.status === 403) {
        errorMessage = 'You do not have permission to edit this customer.';
      } else if (error.code === 'ECONNREFUSED' || error.message?.includes('Network Error')) {
        errorMessage = 'Unable to connect to server. Please check your connection and try again.';
      } else {
        errorMessage = 'Unable to load customer details for editing. Some information may be missing.';
      }

      apiHelpers.showWarning(errorMessage);
      // Fall back to using the table data if API call fails
    }

    // Note: file fields cannot be re-populated for security reasons.
    // The user will have to re-upload files if they want to change them.
    const editableCustomerData = { ...getInitialState() };

    // Map customer data with proper date formatting
    for (const key in customer) {
      if (Object.prototype.hasOwnProperty.call(editableCustomerData, key)) {
        // Handle date fields specifically
        if (key.includes('Date') || key.includes('date')) {
          editableCustomerData[key] = formatDateForInput(customer[key]);
        } else if (key === 'Locations') {
          // Convert comma-separated string back to array
          const locationsString = customer[key] || '';
          editableCustomerData[key] = locationsString
            .split(',')
            .map(loc => ({ location: loc.trim() }))
            .filter(loc => loc.location !== '');
          if (editableCustomerData[key].length === 0) {
            editableCustomerData[key] = [{ location: '' }];
          }
        } else if (key === 'CustomerSite') {
          // Convert comma-separated string back to nested structure
          // Input: "Delhi - Dwarka Sec 21, Delhi - Dwarka Sec 20, Mumbai - Andheri"
          // Output: [{ location: 'Delhi', sites: ['Dwarka Sec 21', 'Dwarka Sec 20'] }, { location: 'Mumbai', sites: ['Andheri'] }]
          const sitesString = customer[key] || '';
          const locationMap = new Map();

          sitesString.split(',').forEach(siteStr => {
            const parts = siteStr.trim().split(' - ');
            const location = parts[0]?.trim() || '';
            const site = parts[1]?.trim() || '';

            if (location) {
              if (!locationMap.has(location)) {
                locationMap.set(location, []);
              }
              if (site) {
                locationMap.get(location).push(site);
              }
            }
          });

          editableCustomerData[key] = Array.from(locationMap.entries()).map(([location, sites]) => ({
            location,
            sites: sites.length > 0 ? sites : ['']
          }));

          if (editableCustomerData[key].length === 0) {
            editableCustomerData[key] = [{ location: '', sites: [''] }];
          }
        } else {
          editableCustomerData[key] = customer[key] || '';
        }
      }
    }

    // Map database address fields to frontend address fields
    // Note: Database stores with different field names than frontend uses
    editableCustomerData.house_flat_no = customer.HouseFlatNo || '';
    editableCustomerData.street_locality = customer.StreetLocality || '';
    editableCustomerData.city = customer.CustomerCity || customer.city || '';
    editableCustomerData.state = customer.CustomerState || customer.state || '';
    editableCustomerData.pin_code = customer.CustomerPinCode || customer.pin_code || '';
    editableCustomerData.country = customer.CustomerCountry || customer.country || 'India';



    // Handle contact data conversion from old structure to new unified structure
    if (customer.CustomerOfficeAddress || customer.CustomerKeyContact) {
      // Convert old contact structure to new unified structure
      editableCustomerData.PrimaryContact = {
        CustomerMobileNo: customer.CustomerMobileNo || '',
        AlternateMobileNo: customer.AlternateMobileNo || '',
        CustomerEmail: customer.CustomerEmail || '',
        CustomerContactPerson: customer.CustomerContactPerson || '',
        CustomerGroup: customer.CustomerGroup || ''
      };

      // Combine office addresses and key contacts into AdditionalContacts
      const additionalContacts = [];

      // Add office addresses
      if (customer.CustomerOfficeAddress) {
        try {
          const officeAddresses = typeof customer.CustomerOfficeAddress === 'string'
            ? JSON.parse(customer.CustomerOfficeAddress)
            : customer.CustomerOfficeAddress;

          if (Array.isArray(officeAddresses)) {
            officeAddresses.forEach(address => {
              // Parse address if it's a string, otherwise use structured format
              let parsedAddress = {
                house_flat_no: '',
                street_locality: '',
                city: '',
                state: '',
                pin_code: '',
                country: 'India'
              };

              if (typeof address.Address === 'string' && address.Address) {
                // If it's a string, put it in street_locality for now
                parsedAddress.street_locality = address.Address;
              } else if (typeof address.Address === 'object' && address.Address) {
                parsedAddress = { ...parsedAddress, ...address.Address };
              }

              // Format DOB for date input (YYYY-MM-DD format)
              let formattedDOB = '';
              if (address.DOB) {
                try {
                  const dobDate = new Date(address.DOB);
                  if (!isNaN(dobDate.getTime())) {
                    formattedDOB = dobDate.toISOString().split('T')[0];
                  }
                } catch (e) {
                  console.warn('Error formatting DOB for office address:', address.DOB, e);
                }
              }

              additionalContacts.push({
                ContactType: 'Office Address',
                Name: address.ContactPerson || '',
                Department: address.Department || '',
                Designation: address.Designation || '',
                Location: '',
                OfficeType: address.OfficeType || '',
                Mobile: address.Mobile || '',
                Email: address.Email || '',
                DOB: formattedDOB,
                Address: parsedAddress
              });
            });
          }
        } catch (e) {
          console.warn('Error parsing CustomerOfficeAddress:', e);
        }
      }

      // Add key contacts
      if (customer.CustomerKeyContact) {
        try {
          const keyContacts = typeof customer.CustomerKeyContact === 'string'
            ? JSON.parse(customer.CustomerKeyContact)
            : customer.CustomerKeyContact;

          if (Array.isArray(keyContacts)) {
            keyContacts.forEach(contact => {
              // Parse address if it's a string, otherwise use structured format
              let parsedAddress = {
                house_flat_no: '',
                street_locality: '',
                city: '',
                state: '',
                pin_code: '',
                country: 'India'
              };

              if (typeof contact.Address === 'string' && contact.Address) {
                // If it's a string, put it in street_locality for now
                parsedAddress.street_locality = contact.Address;
              } else if (typeof contact.Address === 'object' && contact.Address) {
                parsedAddress = { ...parsedAddress, ...contact.Address };
              }

              // Format DOB for date input (YYYY-MM-DD format)
              let formattedDOB = '';
              if (contact.DOB) {
                try {
                  const dobDate = new Date(contact.DOB);
                  if (!isNaN(dobDate.getTime())) {
                    formattedDOB = dobDate.toISOString().split('T')[0];
                  }
                } catch (e) {
                  console.warn('Error formatting DOB for key contact:', contact.DOB, e);
                }
              }

              additionalContacts.push({
                ContactType: 'Key Contact',
                Name: contact.Name || '',
                Department: contact.Department || '',
                Designation: contact.Designation || '',
                Location: contact.Location || '',
                OfficeType: contact.OfficeType || '',
                Mobile: contact.Mobile || '',
                Email: contact.Email || '',
                DOB: formattedDOB,
                Address: parsedAddress
              });
            });
          }
        } catch (e) {
          console.warn('Error parsing CustomerKeyContact:', e);
        }
      }

      // Ensure at least one contact exists
      if (additionalContacts.length === 0) {
        additionalContacts.push({
          ContactType: 'Office Address',
          Name: '',
          Department: '',
          Designation: '',
          Location: '',
          OfficeType: '',
          Mobile: '',
          Email: '',
          DOB: '',
          Address: {
            house_flat_no: '',
            street_locality: '',
            city: '',
            state: '',
            pin_code: '',
            country: 'India'
          }
        });
      }

      // Remove duplicate contacts based on name, mobile, and email
      const deduplicatedContacts = [];
      const contactKeys = new Set();

      additionalContacts.forEach((contact) => {
        // Create a unique key based on contact information
        const contactKey = `${contact.Name?.trim() || ''}-${contact.Mobile?.trim() || ''}-${contact.Email?.trim() || ''}`;

        // Only add if this contact combination hasn't been seen before
        if (!contactKeys.has(contactKey) || contactKey === '--') {
          deduplicatedContacts.push(contact);
          contactKeys.add(contactKey);
        }
      });

      editableCustomerData.AdditionalContacts = deduplicatedContacts;
    }

    // Handle CustomerCogentContact data
    console.log('🔍 DEBUG: CustomerCogentContact from API:', customer.CustomerCogentContact);
    if (customer.CustomerCogentContact) {
      editableCustomerData.CustomerCogentContact = {
        CustomerOwner: customer.CustomerCogentContact.CustomerOwner || '',
        ProjectHead: customer.CustomerCogentContact.ProjectHead || '',
        OpsHead: customer.CustomerCogentContact.OpsHead || '',
        OpsManager: customer.CustomerCogentContact.OpsManager || '',
        Supervisor: customer.CustomerCogentContact.Supervisor || '',
        EmailID: customer.CustomerCogentContact.EmailID || '',
        MobileNo: customer.CustomerCogentContact.MobileNo || ''
      };
      console.log('✅ DEBUG: Cogent Contact data processed:', editableCustomerData.CustomerCogentContact);
    } else {
      editableCustomerData.CustomerCogentContact = {
        CustomerOwner: '',
        ProjectHead: '',
        OpsHead: '',
        OpsManager: '',
        Supervisor: '',
        EmailID: '',
        MobileNo: ''
      };
      console.log('⚠️  DEBUG: No Cogent Contact data found, using empty values');
    }

    // Set file paths for DocumentUpload component to show existing files
    // The DocumentUpload component needs both value (file path) and existingFileUrl props
    editableCustomerData.AgreementFile = customer.AgreementFile || '';
    editableCustomerData.BGFile = customer.BGFile || '';
    editableCustomerData.BGReceivingFile = customer.BGReceivingFile || '';
    editableCustomerData.POFile = customer.POFile || '';
    editableCustomerData.RatesAnnexureFile = customer.RatesAnnexureFile || '';
    editableCustomerData.MISFormatFile = customer.MISFormatFile || '';
    editableCustomerData.KPISLAFile = customer.KPISLAFile || '';
    editableCustomerData.PerformanceReportFile = customer.PerformanceReportFile || '';

    setCustomerData(editableCustomerData);
    setEditingCustomer(customer);

    // Scroll to top of the page to show the form
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Handle file deletion during edit - Mark for deletion, don't delete immediately
  const handleFileDelete = (fieldName) => {
    try {
      if (!editingCustomer) {
        console.warn('⚠️ No customer being edited, ignoring delete request');
        return;
      }

      console.log('🗑️ CUSTOMER FILE MARK FOR DELETE - Field:', fieldName);

      // Mark this file for deletion (will be deleted when form is submitted)
      setFilesToDelete(prev => {
        // Avoid duplicates
        if (!prev.some(item => item.fieldName === fieldName)) {
          return [...prev, { fieldName: fieldName }];
        }
        return prev;
      });

      // Update form data to remove the URL reference (clear UI preview)
      setCustomerData(prev => ({
        ...prev,
        [`${fieldName}Url`]: null, // Remove the URL reference to clear preview (CustomerForm uses Url suffix)
      }));

      // Update editing customer data to remove the URL reference
      setEditingCustomer(prev => ({
        ...prev,
        [`${fieldName}Url`]: null
      }));

      console.log('✅ CUSTOMER FILE MARKED FOR DELETE - Will be deleted on form submit:', {
        fieldName,
        urlField: fieldName + 'Url'
      });

    } catch (error) {
      console.error('🗑️ CUSTOMER FILE MARK DELETE ERROR:', error);
      apiHelpers.showError(error, 'Failed to mark file for deletion');
    }
  };

  // Export handler - Excel export for filtered customers
  const handleExportCustomers = async () => {
    try {
      console.log('📊 Exporting customers to Excel...');

      // Build query parameters for date filtering (same as loadCustomers)
      const queryParams = new URLSearchParams();
      if (dateFilter.fromDate) {
        queryParams.append('fromDate', dateFilter.fromDate);
      }
      if (dateFilter.toDate) {
        queryParams.append('toDate', dateFilter.toDate);
      }

      const queryString = queryParams.toString();
      const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';
      const exportUrl = `${API_BASE_URL}/api/export/customers${queryString ? `?${queryString}` : ''}`;

      console.log('📊 Export URL with filters:', exportUrl);
      console.log('🗓️ Date filter applied to export:', { fromDate: dateFilter.fromDate, toDate: dateFilter.toDate });

      // Show loading message
      const loadingToast = document.createElement('div');
      loadingToast.style.cssText = `
        position: fixed; top: 20px; right: 20px; z-index: 10000;
        background: #007bff; color: white; padding: 15px 20px;
        border-radius: 5px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        font-family: Arial, sans-serif; font-size: 14px;
      `;
      loadingToast.textContent = '🔄 Exporting customers... Please wait';
      document.body.appendChild(loadingToast);

      // Create download link
      const link = document.createElement('a');
      link.href = exportUrl;
      link.download = `Customer_Master_${new Date().toISOString().slice(0, 10)}.xlsx`;
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
      successToast.innerHTML = `✅ Export Started!<br><small>Downloading all customer master fields</small>`;
      document.body.appendChild(successToast);
      setTimeout(() => {
        if (document.body.contains(successToast)) {
          document.body.removeChild(successToast);
        }
      }, 5000);

    } catch (error) {
      console.error('❌ Export error:', error);

      // Provide user-friendly export error messages
      let errorMessage;
      if (error.response?.status === 404) {
        errorMessage = 'No customer data found to export.';
      } else if (error.response?.status === 403) {
        errorMessage = 'You do not have permission to export customer data.';
      } else if (error.code === 'ECONNREFUSED' || error.message?.includes('Network Error')) {
        errorMessage = 'Unable to connect to server. Please check your connection and try again.';
      } else {
        errorMessage = 'Unable to export customer data. Please try again.';
      }

      apiHelpers.showError(error, errorMessage);
    }
  };

  const handleDelete = async (customerOrId) => {
    // Extract ID and customer object
    const customerId = typeof customerOrId === 'object'
      ? customerOrId.CustomerID
      : customerOrId;
    const customer = typeof customerOrId === 'object'
      ? customerOrId
      : customers.find(c => c.CustomerID === customerId);
    const customerName = customer?.Name || 'Customer';

    console.log('🗑️ Delete requested for customer:', customerId, customerName);

    if (window.confirm(`Are you sure you want to delete "${customerName}"?`)) {
      try {
        await customerAPI.delete(customerId);
        apiHelpers.showSuccess(`Customer "${customerName}" has been deleted successfully!`);
        await loadCustomers();
      } catch (error) {
        console.error('Error deleting customer:', error);

        // Provide specific error messages for customer deletion
        let errorMessage;
        if (error.response?.status === 404) {
          errorMessage = 'Customer not found. It may have already been deleted.';
        } else if (error.response?.status === 400) {
          errorMessage = 'Cannot delete this customer because it is linked to other records. Please remove related records first.';
        } else if (error.response?.status === 403) {
          errorMessage = 'You do not have permission to delete this customer.';
        } else if (error.code === 'ECONNREFUSED' || error.message?.includes('Network Error')) {
          errorMessage = 'Unable to connect to server. Please check your connection and try again.';
        } else {
          errorMessage = 'Unable to delete customer. Please try again.';
        }

        apiHelpers.showError(error, errorMessage);
      }
    }
  };

  const handleBulkDelete = async (customerIds) => {
    console.log('🗑️ Bulk delete requested for customer IDs:', customerIds);

    if (customerIds.length === 0) {
      apiHelpers.showError(null, 'No customers selected for deletion.');
      return;
    }

    // Get customer names for confirmation
    const selectedCustomers = customers.filter(c => customerIds.includes(c.CustomerID));
    const customerNames = selectedCustomers.map(c => c.Name).join(', ');
    const confirmMessage = customerIds.length === 1
      ? `Are you sure you want to delete "${customerNames}"?`
      : `Are you sure you want to delete ${customerIds.length} customers?\n\nCustomers: ${customerNames}`;

    if (window.confirm(confirmMessage)) {
      try {
        const response = await customerAPI.bulkDelete(customerIds);

        if (response.data.deletedCount > 0) {
          apiHelpers.showSuccess(
            `Successfully deleted ${response.data.deletedCount} customer(s)!` +
            (response.data.notFoundCount > 0 ? ` (${response.data.notFoundCount} not found)` : '')
          );
        } else {
          apiHelpers.showError(null, 'No customers were deleted. They may have already been removed.');
        }

        await loadCustomers(); // Refresh the list
      } catch (error) {
        console.error('Error bulk deleting customers:', error);

        // Provide specific error messages for bulk deletion
        let errorMessage;
        if (error.response?.status === 400) {
          errorMessage = 'Cannot delete one or more customers because they are linked to other records. Please remove related records first.';
        } else if (error.response?.status === 403) {
          errorMessage = 'You do not have permission to delete these customers.';
        } else if (error.code === 'ECONNREFUSED' || error.message?.includes('Network Error')) {
          errorMessage = 'Unable to connect to server. Please check your connection and try again.';
        } else {
          errorMessage = 'Unable to delete customers. Please try again.';
        }

        apiHelpers.showError(error, errorMessage);
      }
    }
  };

  // Render multiple locations input
  const renderMultipleLocations = () => {
    return (
      <div className="form-group">
        <label>
          Locations <span className="required-indicator">*</span>
        </label>
        <div className="multiple-inputs-container">
          {customerData.Locations.map((location, index) => (
            <div key={index} className="multiple-input-row">
              <input
                type="text"
                value={location.location}
                onChange={(e) => handleLocationChange(index, e.target.value)}
                placeholder={`Enter location`}
                className="multiple-input"
              />
              {customerData.Locations.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeLocation(index)}
                  className="remove-input-btn"
                  title="Remove location"
                >
                  ×
                </button>
              )}
            </div>
          ))}
          <button
            type="button"
            onClick={addLocation}
            className="add-input-btn"
          >
            + Add Location
          </button>
        </div>
      </div>
    );
  };

  // Render multiple customer sites input with grouped locations
  const renderMultipleCustomerSites = () => {
    return (
      <div
        id="customer-CustomerSite"
        className={errors.CustomerSite ? 'has-error' : ''}
        style={{
          width: '100%',
          marginBottom: '20px',
          gridColumn: '1 / -1'  // Span all grid columns
        }}
      >
        <label style={{
          fontWeight: '600',
          color: errors.CustomerSite ? '#dc3545' : '#495057',
          marginBottom: '8px',
          fontSize: '14px',
          display: 'block'
        }}>
          Location & Customer Sites <span className="required-indicator">*</span>
        </label>
        {errors.CustomerSite && (
          <div className="error-message" style={{ marginBottom: '8px' }}>
            {errors.CustomerSite}
          </div>
        )}
        <div style={{
          display: 'flex',
          flexDirection: 'row',
          flexWrap: 'wrap',
          gap: '20px',
          alignItems: 'flex-start',
          width: '100%'
        }}>
          {customerData.CustomerSite.map((locationGroup, locationIndex) => (
            <div key={locationIndex} style={{
              width: '280px',
              minWidth: '280px',
              maxWidth: '280px',
              padding: '15px',
              border: '1px solid #d0d0d0',
              borderRadius: '8px',
              backgroundColor: '#f9f9f9',
              boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
              flexShrink: 0
            }}>
              {/* Location Input */}
              <div className="multiple-input-row" style={{ marginBottom: '10px', display: 'flex', alignItems: 'center' }}>
                <input
                  type="text"
                  name={locationIndex === 0 ? "CustomerSite" : undefined}
                  value={locationGroup.location}
                  onChange={(e) => handleLocationChange(locationIndex, e.target.value)}
                  placeholder="Enter location (e.g., Delhi)"
                  className="multiple-input"
                  style={{
                    fontWeight: '600',
                    fontSize: '14px',
                    flex: 1,
                    width: '100%',
                    padding: '8px 10px',
                    border: '1px solid #ccc',
                    borderRadius: '4px'
                  }}
                  required={locationIndex === 0}
                />
                {customerData.CustomerSite.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeLocation(locationIndex)}
                    className="remove-input-btn"
                    title="Remove location and all its sites"
                    style={{
                      marginLeft: '8px',
                      minWidth: '28px',
                      height: '28px',
                      padding: '0',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    ×
                  </button>
                )}
              </div>

              {/* Sites for this location */}
              <div>
                <label style={{
                  fontSize: '12px',
                  color: '#666',
                  marginBottom: '8px',
                  display: 'block',
                  fontWeight: '500',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>
                  Customer Sites for {locationGroup.location || 'this location'}:
                </label>
                {locationGroup.sites.map((site, siteIndex) => (
                  <div key={siteIndex} className="multiple-input-row" style={{
                    marginBottom: '8px',
                    display: 'flex',
                    alignItems: 'center'
                  }}>
                    <input
                      type="text"
                      value={site}
                      onChange={(e) => handleSiteChange(locationIndex, siteIndex, e.target.value)}
                      placeholder="Enter customer site (e.g., Dwarka Sec 21)"
                      className="multiple-input"
                      style={{
                        flex: 1,
                        width: '100%',
                        padding: '8px 10px',
                        border: '1px solid #ccc',
                        borderRadius: '4px',
                        fontSize: '13px'
                      }}
                    />
                    {locationGroup.sites.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeSiteFromLocation(locationIndex, siteIndex)}
                        className="remove-input-btn"
                        title="Remove this site"
                        style={{
                          marginLeft: '8px',
                          minWidth: '28px',
                          height: '28px',
                          padding: '0',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      >
                        ×
                      </button>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => addSiteToLocation(locationIndex)}
                  className="add-input-btn"
                  style={{
                    fontSize: '12px',
                    padding: '6px 12px',
                    marginTop: '8px',
                    width: '100%'
                  }}
                >
                  + Add Site to {locationGroup.location || 'this location'}
                </button>
              </div>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={addLocation}
          className="add-input-btn"
          style={{ marginTop: '15px' }}
        >
          + Add New Location
        </button>
      </div>
    );
  };

  // Helper function to get expiry status for date fields
  const getExpiryStatus = (fieldName, dateValue) => {
    if (!dateValue) return null;

    const today = new Date();
    const expiryDate = new Date(dateValue);
    const daysUntilExpiry = Math.ceil((expiryDate - today) / (1000 * 60 * 60 * 24));

    if (expiryDate < today) {
      return { status: 'expired', message: 'EXPIRED', className: 'expiry-expired' };
    } else if (daysUntilExpiry <= 7) {
      return { status: 'critical', message: `${daysUntilExpiry} days left`, className: 'expiry-critical' };
    } else if (daysUntilExpiry <= 30) {
      return { status: 'warning', message: `${daysUntilExpiry} days left`, className: 'expiry-warning' };
    }
    return null;
  };

  const renderFormField = (label, name, type = 'text', options = {}, required = false) => {
    const { placeholder, values, readOnly } = options;
    const isFile = type === 'file';
    const isRadio = type === 'radio';
    const isSelect = type === 'select';
    const isTextarea = type === 'textarea';
    const hasError = errors[name];

    const id = `customer-${name}`;

    // Get the field value, handling nested objects like CustomerCogentContact[CustomerOwner]
    let fieldValue = '';
    if (name.includes('[') && name.includes(']')) {
      const [objectName, propertyName] = name.split(/[\[\]]/);
      fieldValue = customerData[objectName]?.[propertyName] || '';
    } else {
      fieldValue = customerData[name] || '';
    }

    // Check for expiry status only on expiry date fields (fields ending with 'ExpiryDate')
    const isExpiryField = name.endsWith('ExpiryDate');
    const expiryStatus = (type === 'date' && isExpiryField && fieldValue) ? getExpiryStatus(name, fieldValue) : null;

    return (
      <div className={`form-group ${options.fullWidth ? 'full-width' : ''} ${expiryStatus ? expiryStatus.className : ''} ${hasError ? 'has-error' : ''}`}>
        <label htmlFor={id}>
          {label} {required && <span className="required-indicator">*</span>}
          {expiryStatus && (
            <span className={`expiry-indicator ${expiryStatus.status}`}>
              {expiryStatus.message}
            </span>
          )}
        </label>
        {isRadio ? (
          <div className="radio-group">
            {values.map(val => (
              <label key={val}>
                <input
                  type="radio"
                  id={`${id}-${val}`}
                  name={name}
                  value={val}
                  checked={fieldValue === val}
                  onChange={handleInputChange}
                  onBlur={handleInputBlur}
                />
                {val}
              </label>
            ))}
          </div>
        ) : isSelect ? (
          <select
            id={id}
            name={name}
            value={fieldValue}
            onChange={handleInputChange}
            onBlur={handleInputBlur}
            required={required}
            className={hasError ? 'error' : ''}
          >
            <option value="">Select {label}</option>
            {values.map(val => <option key={val} value={val}>{val}</option>)}
          </select>
        ) : isTextarea ? (
          <textarea
            id={id}
            name={name}
            value={fieldValue}
            onChange={handleInputChange}
            onBlur={handleInputBlur}
            placeholder={placeholder}
            rows={3}
            className={hasError ? 'error' : ''}
          />
        ) : (
          <input
            type={type}
            id={id}
            name={name}
            value={type !== 'file' ? fieldValue : undefined}
            onChange={handleInputChange}
            onBlur={type !== 'file' ? handleInputBlur : undefined}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            required={required}
            readOnly={readOnly}
            className={`${hasError ? 'error' : ''} ${readOnly ? 'readonly' : ''} ${expiryStatus ? expiryStatus.className : ''}`}
          />
        )}
        {isFile && renderFilePreview(name, label)}
        {hasError && <div className="error-message">{errors[name]}</div>}
      </div>
    );
  };

  const customerColumns = [
    {
      key: 'CustomerCode',
      label: 'Code',
      sortable: true,
      minWidth: '120px'
    },
    {
      key: 'Name',
      label: 'Company Name',
      sortable: true,
      minWidth: '150px'
    },
    {
      key: 'Locations',
      label: 'Locations',
      sortable: true,
      minWidth: '140px',
      render: (value) => value ? (value.length > 30 ? value.substring(0, 30) + '...' : value) : '-'
    },
    {
      key: 'CustomerSite',
      label: 'Customer Site',
      sortable: true,
      minWidth: '120px',
      render: (value) => value ? (value.length > 25 ? value.substring(0, 25) + '...' : value) : '-'
    },
    {
      key: 'TypeOfServices',
      label: 'Services',
      sortable: true,
      minWidth: '120px'
    },
    {
      key: 'GSTNo',
      label: 'GST No.',
      sortable: true,
      minWidth: '140px',
      render: (value) => value || '-'
    },
    {
      key: 'TypeOfBilling',
      label: 'Billing Type',
      sortable: true,
      minWidth: '100px'
    }
  ];

  return (
    <div className="customer-form-container">
      <div className="form-header">
        <h1>👥 CRM</h1>
        <p>Add and manage customer details, agreements, and billing information.</p>


        {editingCustomer && (
          <div className="edit-notice">
            <span className="edit-notice-text">
              Editing: <strong>{editingCustomer.Name}</strong>
            </span>
            <button type="button" onClick={resetForm} className="cancel-edit-btn">
              Cancel Edit
            </button>
          </div>
        )}
      </div>

      <div className="customer-form">
        <form onSubmit={handleSubmit} noValidate>
          <div className="form-sections">
            {/* Section 1: Basic Information */}
            <div className="form-section">
              <h4>📋 Basic Information</h4>
              <div className="form-grid">
                {renderFormField('Master Customer Name', 'MasterCustomerName', 'text', { placeholder: 'Enter master customer name' }, true)}
                {renderFormField('Company Name', 'Name', 'text', { placeholder: 'Enter company name' }, true)}
                {renderFormField('Customer Code', 'CustomerCode', 'text', { placeholder: 'Auto-generated', readOnly: true })}
                {renderFormField('Type of Services', 'TypeOfServices', 'select', { values: ['Transportation', 'Warehousing', 'Both', 'Logistics', 'Industrial Transport', 'Retail Distribution', 'Other'] }, true)}
                {renderFormField('Service Code', 'ServiceCode', 'text', { placeholder: 'Auto-selected', readOnly: true })}
                {renderMultipleCustomerSites()}
              </div>
            </div>

            {/* Section 2: Agreement & Terms */}
            <div className="form-section">
              <h4>📜 Agreement & Terms</h4>
              <div className="form-grid">
                {renderFormField('Agreement', 'Agreement', 'radio', { values: ['Yes', 'No'] })}



                {/* Agreement File Upload */}
                <div className="form-group">
                  <DocumentUpload
                    label="Agreement File"
                    name="AgreementFile"
                    value={customerData.AgreementFile}
                    onChange={(file) => {
                      setCustomerData(prev => ({ ...prev, AgreementFile: file }));
                    }}
                    onDelete={handleFileDelete}
                    existingFileUrl={editingCustomer?.AgreementFileUrl}
                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                    entityType="customers"
                    entityId={editingCustomer?.CustomerID}
                    isEditing={!!editingCustomer}
                  />
                </div>

                {renderFormField('Agreement Date', 'AgreementDate', 'date')}
                {renderFormField('Agreement Tenure (in Years)', 'AgreementTenure', 'number', { placeholder: 'e.g., 2' })}
                {renderFormField('Agreement Expiry Date', 'AgreementExpiryDate', 'date')}
                {renderFormField('Customer Notice Period (in Days)', 'CustomerNoticePeriod', 'number', { placeholder: 'e.g., 30' })}
                {renderFormField('Cogent Notice Period (in Days)', 'CogentNoticePeriod', 'number', { placeholder: 'e.g., 30' })}
                {renderFormField('Credit Period (in Days)', 'CreditPeriod', 'number', { placeholder: 'e.g., 45' })}
                {renderFormField('Customer Insurance', 'Insurance', 'radio', { values: ['Yes', 'No'] })}
                {renderFormField('Minimum Insurance value (in Rs)', 'MinimumInsuranceValue', 'number', {
                  placeholder: 'Enter amount', onKeyDown: (e) => {
                    if (e.key === 'e' || e.key === 'E') {
                      e.preventDefault();
                    }
                  }
                })}
                {renderFormField('Cogent Debit Clause', 'CogentDebitClause', 'radio', { values: ['Yes', 'No'] })}
                {renderFormField('Cogent Debit Limit', 'CogentDebitLimit', 'number', { placeholder: 'Enter limit' })}
                {renderFormField('BG (Bank Guarantee)', 'BG', 'radio', { values: ['Yes', 'No'] })}

                {/* BG File Upload */}
                <div className="form-group">
                  <DocumentUpload
                    label="Bank Guarantee File"
                    name="BGFile"
                    value={customerData.BGFile}
                    onChange={(file) => {
                      setCustomerData(prev => ({ ...prev, BGFile: file }));
                    }}
                    onDelete={handleFileDelete}
                    existingFileUrl={editingCustomer?.BGFileUrl}
                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                    entityType="customers"
                    entityId={editingCustomer?.CustomerID}
                    isEditing={!!editingCustomer}
                  />
                </div>

                {renderFormField('BG Amount', 'BGAmount', 'number', { placeholder: 'Enter amount' })}
                {renderFormField('BG Date', 'BGDate', 'date')}
                {renderFormField('BG Expiry Date', 'BGExpiryDate', 'date')}
                {renderFormField('BG Bank', 'BGBank', 'text', { placeholder: 'Enter bank name' })}
                {renderFormField('BG Receiving by Customer', 'BGReceivingByCustomer', 'text', { placeholder: 'Receiver name' })}

                {/* BG Receiving File Upload */}
                <div className="form-group">
                  <DocumentUpload
                    label="BG Receiving File"
                    name="BGReceivingFile"
                    value={customerData.BGReceivingFile}
                    onChange={(file) => {

                      setCustomerData(prev => ({ ...prev, BGReceivingFile: file }));
                    }}
                    onDelete={handleFileDelete}
                    existingFileUrl={editingCustomer?.BGReceivingFileUrl}
                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                    entityType="customers"
                    entityId={editingCustomer?.CustomerID}
                    isEditing={!!editingCustomer}
                  />
                </div>
              </div>
            </div>

            {/* Section 3: Purchase Order */}
            <div className="form-section">
              <h4>📦 Purchase Order</h4>
              <div className="form-grid">
                {renderFormField('PO', 'PO', 'text', { placeholder: 'Enter PO number' })}

                {/* PO File Upload */}
                <div className="form-group">
                  <DocumentUpload
                    label="Purchase Order File"
                    name="POFile"
                    value={customerData.POFile}
                    onChange={(file) => {

                      setCustomerData(prev => ({ ...prev, POFile: file }));
                    }}
                    onDelete={handleFileDelete}
                    existingFileUrl={editingCustomer?.POFileUrl}
                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                    entityType="customers"
                    entityId={editingCustomer?.CustomerID}
                    isEditing={!!editingCustomer}
                  />
                </div>

                {renderFormField('PO Value', 'POValue', 'number', { placeholder: 'Enter PO value' })}
                {renderFormField('PO Date', 'PODate', 'date')}
                {renderFormField('PO Tenure', 'POTenure', 'text', { placeholder: 'e.g., 1 year' })}
                {renderFormField('PO Expiry Date', 'POExpiryDate', 'date')}
              </div>
            </div>

            {/* Section 4: Commercials & Billing */}
            <div className="form-section">
              <h4>💰 Commercials & Billing</h4>
              <div className="form-grid">
                <div className="form-group">
                  <DocumentUpload
                    label="Rates Annexure"
                    name="RatesAnnexureFile"
                    value={customerData.RatesAnnexureFile}
                    onChange={(file) => {

                      setCustomerData(prev => ({ ...prev, RatesAnnexureFile: file }));
                    }}
                    onDelete={handleFileDelete}
                    existingFileUrl={editingCustomer?.RatesAnnexureFileUrl}
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
                    entityType="customers"
                    entityId={editingCustomer?.CustomerID}
                    isEditing={!!editingCustomer}
                  />
                </div>
                {renderFormField('Rates', 'Rates', 'text', { placeholder: 'e.g., As per annexure' })}
                {renderFormField('Yearly Escalation Clause', 'YearlyEscalationClause', 'radio', { values: ['Yes', 'No'] })}
                <ValidatedInput
                  name="GSTNo"
                  value={customerData.GSTNo}
                  onChange={handleInputChange}
                  validationRule="GST"
                  required={false}
                  label="GST No."
                  placeholder="Enter GST number (optional)"
                  showFormatHint={true}
                  autoFormat={true}
                />
                {renderFormField('Type of Billing', 'TypeOfBilling', 'select', { values: ['RCM', 'GST', 'Exempt'] }, true)}
                {/* Conditional GST Rate field based on Type of Billing */}
                {customerData.TypeOfBilling === 'RCM' || customerData.TypeOfBilling === 'Exempt' ? (
                  // Read-only field with value 0 for RCM and Exempt
                  renderFormField('GST Rate (%)', 'GSTRate', 'number', { readOnly: true, placeholder: '0' })
                ) : customerData.TypeOfBilling === 'GST' ? (
                  // Dropdown with GST rate options for GST billing type
                  renderFormField('GST Rate (%)', 'GSTRate', 'select', { values: ['0', '5', '12', '18', '28'] }, true)
                ) : (
                  // Default number input when no billing type is selected
                  renderFormField('GST Rate (%)', 'GSTRate', 'number', { placeholder: 'e.g., 18' })
                )}
                {renderFormField('Billing Tenure', 'BillingTenure', 'select', { values: ['Monthly', 'Specific Dates'] }, false)}
                {/* Conditional date fields for Specific Dates billing tenure */}
                {customerData.BillingTenure === 'Specific Dates' && (
                  <>
                    {renderFormField('Billing From Date', 'BillingFromDate', 'date', { placeholder: 'Select from date' }, true)}
                    {renderFormField('Billing To Date', 'BillingToDate', 'date', { placeholder: 'Select to date' }, true)}
                  </>
                )}
              </div>
            </div>

            {/* Section 5: MIS & Reports */}
            <div className="form-section">
              <h4>📊 MIS & Reports</h4>
              <div className="form-grid">
                <div className="form-group">
                  <DocumentUpload
                    label="MIS Format"
                    name="MISFormatFile"
                    value={customerData.MISFormatFile}
                    onChange={(file) => {

                      setCustomerData(prev => ({ ...prev, MISFormatFile: file }));
                    }}
                    onDelete={handleFileDelete}
                    existingFileUrl={editingCustomer?.MISFormatFileUrl}
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
                    entityType="customers"
                    entityId={editingCustomer?.CustomerID}
                    isEditing={!!editingCustomer}
                  />
                </div>
                <div className="form-group">
                  <DocumentUpload
                    label="KPI / SLA"
                    name="KPISLAFile"
                    value={customerData.KPISLAFile}
                    onChange={(file) => {

                      setCustomerData(prev => ({ ...prev, KPISLAFile: file }));
                    }}
                    onDelete={handleFileDelete}
                    existingFileUrl={editingCustomer?.KPISLAFileUrl}
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
                    entityType="customers"
                    entityId={editingCustomer?.CustomerID}
                    isEditing={!!editingCustomer}
                  />
                </div>
                <div className="form-group">
                  <DocumentUpload
                    label="Performance Report"
                    name="PerformanceReportFile"
                    value={customerData.PerformanceReportFile}
                    onChange={(file) => {

                      setCustomerData(prev => ({ ...prev, PerformanceReportFile: file }));
                    }}
                    onDelete={handleFileDelete}
                    existingFileUrl={editingCustomer?.PerformanceReportFileUrl}
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
                    entityType="customers"
                    entityId={editingCustomer?.CustomerID}
                    isEditing={!!editingCustomer}
                  />
                </div>
              </div>
            </div>

            {/* Section 6: Contact Management */}
            <div className="form-section">
              <h4>👥 Contact Management</h4>

              {/* Primary Contact Information */}
              <div className="form-subsection">
                <h5>📞 Primary Contact Information</h5>
                <div className="form-grid">
                  <ValidatedInput
                    name="CustomerMobileNo"
                    value={customerData.PrimaryContact.CustomerMobileNo}
                    onChange={handlePrimaryContactChange}
                    validationRule="MOBILE"
                    required={false}
                    label="Primary Mobile No"
                    placeholder="Enter mobile number"
                    showFormatHint={true}
                    autoFormat={true}
                  />
                  <ValidatedInput
                    name="AlternateMobileNo"
                    value={customerData.PrimaryContact.AlternateMobileNo}
                    onChange={handlePrimaryContactChange}
                    validationRule="MOBILE"
                    required={false}
                    label="Alternate Mobile No"
                    placeholder="Enter alternate mobile number"
                    showFormatHint={true}
                    autoFormat={true}
                  />
                  <ValidatedInput
                    name="CustomerEmail"
                    value={customerData.PrimaryContact.CustomerEmail}
                    onChange={handlePrimaryContactChange}
                    validationRule="EMAIL"
                    required={false}
                    label="Primary Email"
                    placeholder="Enter email address"
                    showFormatHint={false}
                    autoFormat={false}
                  />
                  <div className={`form-group ${errors['PrimaryContact.CustomerContactPerson'] ? 'has-error' : ''}`}>
                    <label htmlFor="CustomerContactPerson">Primary Contact Person</label>
                    <input
                      type="text"
                      id="CustomerContactPerson"
                      name="CustomerContactPerson"
                      value={customerData.PrimaryContact.CustomerContactPerson}
                      onChange={handlePrimaryContactChange}
                      onBlur={handlePrimaryContactBlur}
                      placeholder="Enter contact person name"
                      className={errors['PrimaryContact.CustomerContactPerson'] ? 'error' : ''}
                    />
                    {errors['PrimaryContact.CustomerContactPerson'] && (
                      <div className="error-message">{errors['PrimaryContact.CustomerContactPerson']}</div>
                    )}
                  </div>
                  <div className={`form-group ${errors['PrimaryContact.CustomerGroup'] ? 'has-error' : ''}`}>
                    <label htmlFor="CustomerGroup">Customer Group</label>
                    <input
                      type="text"
                      id="CustomerGroup"
                      name="CustomerGroup"
                      value={customerData.PrimaryContact.CustomerGroup}
                      onChange={handlePrimaryContactChange}
                      onBlur={handlePrimaryContactBlur}
                      placeholder="Enter customer group"
                      className={errors['PrimaryContact.CustomerGroup'] ? 'error' : ''}
                    />
                    {errors['PrimaryContact.CustomerGroup'] && (
                      <div className="error-message">{errors['PrimaryContact.CustomerGroup']}</div>
                    )}
                  </div>

                  {/* Enhanced Customer Address with Pin Code Lookup */}
                  <div className="form-group full-width">
                    <AddressForm
                      addressData={getAddressData()}
                      onAddressChange={handleAddressChange}
                      errors={errors}
                      required={true}
                      prefix="customer"
                      title="Primary Address"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Additional Contacts (Office Addresses & Key Contacts) */}
            <div className="form-subsection">
              <h5>🏢 Additional Contacts</h5>
              {customerData.AdditionalContacts.map((contact, index) => (
                <div key={index} className="contact-card">
                  <div className="contact-header">
                    <h6>Contact #{index + 1}</h6>
                    {customerData.AdditionalContacts.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeArrayItem('AdditionalContacts', index)}
                        className="remove-contact-btn"
                        title="Remove contact"
                      >
                        ×
                      </button>
                    )}
                  </div>
                  <div className="form-grid">
                    <div className="form-group">
                      <label htmlFor={`AdditionalContacts[${index}][ContactType]`}>Contact Type</label>
                      <select
                        id={`AdditionalContacts[${index}][ContactType]`}
                        name="ContactType"
                        value={contact.ContactType}
                        onChange={(e) => handleArrayInputChange(e, index, 'AdditionalContacts')}
                      >
                        <option value="Office Address">Office Address</option>
                        <option value="Key Contact">Key Contact</option>
                      </select>
                    </div>

                    <div className={`form-group ${errors[`AdditionalContacts[${index}].Name`] ? 'has-error' : ''}`}>
                      <label htmlFor={`AdditionalContacts[${index}][Name]`}>Name/Contact Person</label>
                      <input
                        type="text"
                        id={`AdditionalContacts[${index}][Name]`}
                        name="Name"
                        value={contact.Name}
                        onChange={(e) => handleArrayInputChange(e, index, 'AdditionalContacts')}
                        onBlur={(e) => handleAdditionalContactBlur(e, index)}
                        placeholder="Enter name"
                        className={errors[`AdditionalContacts[${index}].Name`] ? 'error' : ''}
                      />
                      {errors[`AdditionalContacts[${index}].Name`] && (
                        <div className="error-message">{errors[`AdditionalContacts[${index}].Name`]}</div>
                      )}
                    </div>

                    <div className="form-group">
                      <label htmlFor={`AdditionalContacts[${index}][Department]`}>Department</label>
                      <input
                        type="text"
                        id={`AdditionalContacts[${index}][Department]`}
                        name="Department"
                        value={contact.Department}
                        onChange={(e) => handleArrayInputChange(e, index, 'AdditionalContacts')}
                        placeholder="Enter department"
                      />
                    </div>

                    <div className="form-group">
                      <label htmlFor={`AdditionalContacts[${index}][Designation]`}>Designation</label>
                      <input
                        type="text"
                        id={`AdditionalContacts[${index}][Designation]`}
                        name="Designation"
                        value={contact.Designation}
                        onChange={(e) => handleArrayInputChange(e, index, 'AdditionalContacts')}
                        placeholder="Enter designation"
                      />
                    </div>

                    {contact.ContactType === 'Key Contact' && (
                      <div className="form-group">
                        <label htmlFor={`AdditionalContacts[${index}][Location]`}>Location</label>
                        <input
                          type="text"
                          id={`AdditionalContacts[${index}][Location]`}
                          name="Location"
                          value={contact.Location}
                          onChange={(e) => handleArrayInputChange(e, index, 'AdditionalContacts')}
                          placeholder="Enter location"
                        />
                      </div>
                    )}

                    <div className="form-group">
                      <label htmlFor={`AdditionalContacts[${index}][OfficeType]`}>Office Type</label>
                      <select
                        id={`AdditionalContacts[${index}][OfficeType]`}
                        name="OfficeType"
                        value={contact.OfficeType}
                        onChange={(e) => handleArrayInputChange(e, index, 'AdditionalContacts')}
                      >
                        <option value="">Select Office Type</option>
                        {contact.ContactType === 'Office Address' ? (
                          <>
                            <option value="Registered Office">Registered Office</option>
                            <option value="Corporate Office">Corporate Office</option>
                            <option value="Regional Office">Regional Office</option>
                            <option value="Branch Office">Branch Office</option>
                            <option value="Warehouse">Warehouse</option>
                            <option value="Site Office">Site Office</option>
                            <option value="Other">Other</option>
                          </>
                        ) : (
                          <>
                            <option value="HO">HO</option>
                            <option value="RO">RO</option>
                            <option value="Branch">Branch</option>
                            <option value="WH">WH</option>
                            <option value="Others">Others</option>
                          </>
                        )}
                      </select>
                    </div>

                    <ValidatedInput
                      name="Mobile"
                      value={contact.Mobile}
                      onChange={(e) => handleArrayInputChange(e, index, 'AdditionalContacts')}
                      validationRule="MOBILE"
                      required={false}
                      label="Mobile No"
                      placeholder="Enter mobile number"
                      showFormatHint={true}
                      autoFormat={true}
                    />

                    <ValidatedInput
                      name="Email"
                      value={contact.Email}
                      onChange={(e) => handleArrayInputChange(e, index, 'AdditionalContacts')}
                      validationRule="EMAIL"
                      required={false}
                      label="Email"
                      placeholder="Enter email address"
                      showFormatHint={false}
                      autoFormat={false}
                    />

                    <div className={`form-group ${errors[`AdditionalContacts[${index}].DOB`] ? 'has-error' : ''}`}>
                      <label htmlFor={`AdditionalContacts[${index}][DOB]`}>Date of Birth</label>
                      <input
                        type="date"
                        id={`AdditionalContacts[${index}][DOB]`}
                        name="DOB"
                        value={contact.DOB}
                        onChange={(e) => handleArrayInputChange(e, index, 'AdditionalContacts')}
                        onBlur={(e) => handleAdditionalContactBlur(e, index)}
                        className={errors[`AdditionalContacts[${index}].DOB`] ? 'error' : ''}
                      />
                      {errors[`AdditionalContacts[${index}].DOB`] && (
                        <div className="error-message">{errors[`AdditionalContacts[${index}].DOB`]}</div>
                      )}
                    </div>

                    <div className="form-group full-width">
                      <label>Address</label>
                      <AddressForm
                        addressData={contact.Address || {
                          house_flat_no: '',
                          street_locality: '',
                          city: '',
                          state: '',
                          pin_code: '',
                          country: 'India'
                        }}
                        onAddressChange={(addressData) => {
                          console.log('🏠 AddressForm onChange called for contact', index, ':', addressData);
                          const updatedContacts = [...customerData.AdditionalContacts];
                          updatedContacts[index] = {
                            ...updatedContacts[index],
                            Address: addressData
                          };
                          console.log('🏠 Updated contacts array:', updatedContacts);
                          setCustomerData(prev => ({
                            ...prev,
                            AdditionalContacts: updatedContacts
                          }));
                        }}
                        errors={errors}
                        required={false}
                        title="Contact Address"
                      />
                    </div>
                  </div>
                </div>
              ))}
              <button type="button" onClick={() => addArrayItem('AdditionalContacts')} className="add-input-btn">
                + Add Contact
              </button>
            </div>

            <div className="form-section">
              <h4>7. Cogent Contact</h4>
              <div className="form-grid">
                {renderFormField('Customer Owner', 'CustomerCogentContact[CustomerOwner]', 'text', { placeholder: 'Enter name' })}
                {renderFormField('Project Head', 'CustomerCogentContact[ProjectHead]', 'text', { placeholder: 'Enter name' })}
                {renderFormField('Ops Head', 'CustomerCogentContact[OpsHead]', 'text', { placeholder: 'Enter name' })}
                {renderFormField('Ops Manager', 'CustomerCogentContact[OpsManager]', 'text', { placeholder: 'Enter name' })}
                {renderFormField('Supervisor', 'CustomerCogentContact[Supervisor]', 'text', { placeholder: 'Enter name' })}
                {renderFormField('Email ID', 'CustomerCogentContact[EmailID]', 'email', { placeholder: 'e.g., contact@example.com' })}
                {renderFormField('Mobile No.', 'CustomerCogentContact[MobileNo]', 'text', { placeholder: 'e.g., 9876543210' })}
              </div>
            </div>
          </div>

          <div className="form-actions">
            <button type="submit" disabled={isSubmitting} className="submit-btn">
              {isSubmitting ? 'Processing...' : editingCustomer ? 'Update Customer' : 'Add Customer'}
            </button>
          </div>
        </form>
      </div>

      {/* Export Button - Above DataTable */}
      <div style={{
        display: 'flex',
        justifyContent: 'flex-end',
        marginBottom: '15px',
        paddingRight: '10px'
      }}>
        <button
          onClick={handleExportCustomers}
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
          title="Export All Customers to Excel"
        >
          📊 Export to Excel
        </button>
      </div>

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

      <DataTable
        title="📋 Customer List"
        data={customers}
        columns={customerColumns}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onBulkDelete={handleBulkDelete}
        bulkSelectable={true}
        isLoading={isLoading}
        keyField="CustomerID"
        emptyMessage="No customers found. Add your first customer above."
        showPagination={true}
        customizable={true}
        exportable={false}
      />

      {/* Image Modal Viewer */}
      {showModal && modalImage && (
        <div className="image-modal-overlay" onClick={() => setShowModal(false)}>
          <div className="image-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="image-modal-header">
              <h3>Image Preview</h3>
              <button className="modal-close-btn" onClick={() => setShowModal(false)}>
                ✕
              </button>
            </div>
            <div className="image-modal-body">
              <img
                src={modalImage}
                alt="Full size preview"
                className="modal-image-full"
              />
            </div>
          </div>
        </div>
      )}

      {/* Global Validation Error Modal */}
      <ValidationErrorModal
        isOpen={showErrorModal}
        onClose={closeErrorModal}
        errorSummary={errorSummary}
        onGoToField={goToField}
        onTryAgain={() => handleSubmit({ preventDefault: () => { } })}
      />

      {/* PDF Preview Modal */}
      <PDFPreviewModal
        isOpen={showPDFModal}
        onClose={closePDFPreview}
        pdfUrl={pdfModalUrl}
        fileName={pdfFileName}
      />

      {/* Document Action Modal */}
      <DocumentActionModal
        isOpen={showDocumentActionModal}
        onClose={closeDocumentActionModal}
        fileType={documentActionData.fileType}
        fileName={documentActionData.fileName}
        onDownload={documentActionData.onDownload}
        onOpenInNewTab={documentActionData.onOpenInNewTab}
      />
    </div>
  );
};

export default CustomerForm;