import { useState, useEffect, useCallback } from 'react';
import { customerAPI, locationAPI, apiHelpers } from '../services/api';

const INITIAL_STATE = {
  MasterCustomerName: '', Name: '', CustomerCode: '', TypeOfServices: '', ServiceCode: '',
  CustomerSite: [{ location: '', site: '' }],
  Agreement: 'No', AgreementFile: null, AgreementDate: '', AgreementTenure: '', AgreementExpiryDate: '',
  CustomerNoticePeriod: '', CogentNoticePeriod: '', CreditPeriod: '', Insurance: 'No', MinimumInsuranceValue: '',
  CogentDebitClause: 'No', CogentDebitLimit: '', BG: 'No', BGFile: null, BGAmount: '', BGDate: '', BGExpiryDate: '',
  BGBank: '', BGReceivingByCustomer: '', BGReceivingFile: null,
  PO: '', POFile: null, POValue: '', PODate: '', POTenure: '', POExpiryDate: '',
  Rates: '', RatesAnnexureFile: null, YearlyEscalationClause: 'No', GSTNo: '', GSTRate: '', TypeOfBilling: 'RCM', BillingTenure: '',
  MISFormatFile: null, KPISLAFile: null, PerformanceReportFile: null,
  PrimaryContact: { CustomerMobileNo: '', AlternateMobileNo: '', CustomerEmail: '', CustomerContactPerson: '', CustomerGroup: '' },
  house_flat_no: '', street_locality: '', city: '', state: '', pin_code: '', country: 'India',
  AdditionalContacts: [{
    ContactType: 'Office Address', Name: '', Department: '', Designation: '', Location: '', OfficeType: '', Mobile: '', Email: '', DOB: '',
    Address: { house_flat_no: '', street_locality: '', city: '', state: '', pin_code: '', country: 'India' }
  }],
  CustomerCogentContact: { CustomerOwner: '', ProjectHead: '', OpsHead: '', OpsManager: '', Supervisor: '' }
};

export const useCustomerForm = () => {
  const [customerData, setCustomerData] = useState(() => ({ ...INITIAL_STATE }));
  const [customers, setCustomers] = useState([]);
  const [locations, setLocations] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [errors, setErrors] = useState({});
  const [dateFilter, setDateFilter] = useState({ fromDate: '', toDate: '' });

  const resetForm = useCallback(() => {
    setCustomerData({ ...INITIAL_STATE });
    setEditingCustomer(null);
    setErrors({});
  }, []);

  const handleInputChange = useCallback((name, value) => {
    const isNested = name.includes('[') && name.includes(']');

    setCustomerData(prev => {
      if (isNested) {
        const [objectName, propertyName] = name.split(/[\[\]]/);
        return { ...prev, [objectName]: { ...prev[objectName], [propertyName]: value } };
      }
      return { ...prev, [name]: value };
    });

    errors[name] && setErrors(prev => ({ ...prev, [name]: null }));
  }, [errors]);

  const loadCustomers = useCallback(async () => {
    setIsLoading(true);
    try {
      setCustomers(await customerAPI.getAll());
    } catch (error) {
      apiHelpers.handleError(error, 'loading customers');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadLocations = useCallback(async () => {
    try {
      setLocations(await locationAPI.getAll());
    } catch (error) {
      console.error('Error loading locations:', error);
    }
  }, []);

  const handleFileDelete = useCallback(async (fileName) => {
    try {
      await customerAPI.deleteFile(fileName);
    } catch (error) {
      apiHelpers.handleFileError(error, 'file deletion');
      throw error;
    }
  }, []);

  const getExpiryStatus = useCallback((_fieldName, dateValue) => {
    if (!dateValue) return null;

    const daysUntilExpiry = Math.ceil((new Date(dateValue) - new Date()) / (1000 * 3600 * 24));

    return daysUntilExpiry < 0
      ? { status: 'expired', message: 'Expired', className: 'expiry-expired' }
      : daysUntilExpiry <= 30
        ? { status: 'warning', message: `${daysUntilExpiry} days left`, className: 'expiry-warning' }
        : null;
  }, []);

  useEffect(() => {
    loadCustomers();
    loadLocations();
  }, [loadCustomers, loadLocations]);

  return {
    customerData, setCustomerData, customers, setCustomers, locations,
    isLoading, setIsLoading, isSubmitting, setIsSubmitting,
    editingCustomer, setEditingCustomer, errors, setErrors,
    dateFilter, setDateFilter, resetForm, handleInputChange,
    loadCustomers, loadLocations, handleFileDelete, getExpiryStatus
  };
};
