import { useState, useEffect, useCallback } from 'react';
import { customerAPI, projectAPI, employeeAPI, apiHelpers } from '../services/api';
import useFormDraft from './useFormDraft';
import authService from '../services/authService';

const INITIAL_STATE = {
  ProjectName: '',
  CustomerID: '',
  ProjectCode: '',
  ProjectDescription: '',
  CustomerSite: [{ state: '', location: '', sites: [{ name: '', employee_id: '' }] }],
  ProjectValue: '',
  StartDate: '',
  EndDate: '',
  Status: 'Active',
  // Commercials & Billing
  Rates: '',
  RatesAnnexureFile: null,
  YearlyEscalationClause: 'No',
  GSTNo: '',
  GSTRate: '0',
  TypeOfBilling: 'RCM',
  BillingTenure: '',
  BillingFromDate: '',
  BillingToDate: ''
};

const formatDateForInput = (dateString) => dateString ? new Date(new Date(dateString).getTime() + new Date(dateString).getTimezoneOffset() * 60000).toISOString().split('T')[0] : '';

export const useProjectForm = () => {
  const [projectData, setProjectData] = useState(INITIAL_STATE);
  const [projects, setProjects] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [dateFilter, setDateFilter] = useState({ fromDate: '', toDate: '' });

  // Draft Management
  const user = authService.getUser();
  const userId = user?.UserID || user?.id || 'anonymous';
  const { hasDraft, getDraft, saveDraft, clearDraft } = useFormDraft('project-form', userId);

  const restoreDraft = useCallback(() => {
    const draft = getDraft();
    if (draft) {
      setProjectData(draft);
      apiHelpers.showSuccess('Progress restored successfully!');
    }
  }, [getDraft]);

  // Auto-save draft whenever projectData changes (only in add mode)
  useEffect(() => {
    if (!editingProject && JSON.stringify(projectData) !== JSON.stringify(INITIAL_STATE)) {
      saveDraft(projectData);
    }
  }, [projectData, editingProject, saveDraft]);

  const resetForm = useCallback(() => {
    setProjectData(INITIAL_STATE);
    setErrors({});
    setEditingProject(null);
    setSelectedCustomer(null);
  }, []);

  const generateProjectCode = useCallback(async (projectName, customerId, customerSitesList = []) => {
    if (!projectName || !customerId) return '';
    try {
      const locationNames = (customerSitesList || [])
        .map(item => item.location)
        .filter(Boolean);

      const response = await projectAPI.previewCode({
        ProjectName: projectName,
        CustomerID: customerId,
        LocationID: locationNames
      });
      return response.data.success ? response.data.projectCode : '';
    } catch { return ''; }
  }, []);

  const handleInputChange = useCallback(async (e) => {
    const { name, value } = e.target;

    setProjectData(prev => {
      const newData = { ...prev, [name]: value };

      if (name === 'ProjectName' && selectedCustomer && value.trim()) {
        generateProjectCode(value, selectedCustomer.CustomerID, prev.CustomerSite).then(generatedCode => {
          generatedCode && setProjectData(current => ({ ...current, ProjectCode: generatedCode }));
        });
      }

      // Auto-set GSTRate to 0 when RCM or Exempt is selected
      if (name === 'TypeOfBilling') {
        if (value === 'RCM' || value === 'Exempt') {
          newData.GSTRate = '0';
        } else if (value === 'GST' && (!prev.GSTRate || prev.GSTRate === '0')) {
          newData.GSTRate = '18';
        }
      }

      return newData;
    });

    errors[name] && setErrors(prev => ({ ...prev, [name]: '' }));
  }, [errors, selectedCustomer, generateProjectCode]);

  // Location Group Handlers
  const addLocation = useCallback(() => {
    setProjectData(prev => ({
      ...prev,
      CustomerSite: [
        ...(prev.CustomerSite || []),
        { state: '', location: '', sites: [{ name: '', employee_id: '' }] }
      ]
    }));
  }, []);

  const removeLocation = useCallback((locationIndex) => {
    setProjectData(prev => ({
      ...prev,
      CustomerSite: (prev.CustomerSite || []).filter((_, i) => i !== locationIndex)
    }));
  }, []);

  const handleLocationStateChange = useCallback((locationIndex, stateValue) => {
    setProjectData(prev => ({
      ...prev,
      CustomerSite: (prev.CustomerSite || []).map((item, i) =>
        i === locationIndex ? { ...item, state: stateValue } : item
      )
    }));
  }, []);

  const handleLocationNameChange = useCallback((locationIndex, value) => {
    setProjectData(prev => {
      const updatedSites = (prev.CustomerSite || []).map((item, i) =>
        i === locationIndex ? { ...item, location: value } : item
      );

      if (selectedCustomer && prev.ProjectName && prev.ProjectName.trim()) {
        generateProjectCode(prev.ProjectName, selectedCustomer.CustomerID, updatedSites).then(generatedCode => {
          generatedCode && setProjectData(current => ({ ...current, ProjectCode: generatedCode }));
        });
      }

      return { ...prev, CustomerSite: updatedSites };
    });
  }, [selectedCustomer, generateProjectCode]);

  const addSiteToLocation = useCallback((locationIndex) => {
    setProjectData(prev => ({
      ...prev,
      CustomerSite: (prev.CustomerSite || []).map((item, i) =>
        i === locationIndex
          ? { ...item, sites: [...(item.sites || []), { name: '', employee_id: '' }] }
          : item
      )
    }));
  }, []);

  const removeSiteFromLocation = useCallback((locationIndex, siteIndex) => {
    setProjectData(prev => ({
      ...prev,
      CustomerSite: (prev.CustomerSite || []).map((item, i) =>
        i === locationIndex
          ? { ...item, sites: (item.sites || []).filter((_, si) => si !== siteIndex) }
          : item
      )
    }));
  }, []);

  const handleSiteChange = useCallback((locationIndex, siteIndex, field, value) => {
    setProjectData(prev => ({
      ...prev,
      CustomerSite: (prev.CustomerSite || []).map((item, i) =>
        i === locationIndex
          ? {
              ...item,
              sites: (item.sites || []).map((site, si) =>
                si === siteIndex ? { ...site, [field]: value } : site
              )
            }
          : item
      )
    }));
  }, []);

  const fetchProjects = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      dateFilter.fromDate && params.append('fromDate', dateFilter.fromDate);
      dateFilter.toDate && params.append('toDate', dateFilter.toDate);
      const url = params.toString() ? `?${params}` : '';
      const response = await projectAPI.getAll(url);
      setProjects(response.data.value || response.data || []);
    } catch (error) {
      apiHelpers.showError(error, 'Failed to fetch projects');
    } finally {
      setIsLoading(false);
    }
  }, [dateFilter.fromDate, dateFilter.toDate]);

  const loadCustomers = useCallback(async () => {
    try {
      const response = await customerAPI.getAll();
      setCustomers(response.data.value || response.data || []);
    } catch (error) {
      apiHelpers.showError(error, 'Failed to load customers');
    }
  }, []);

  const loadEmployees = useCallback(async () => {
    try {
      const response = await employeeAPI.getAll();
      setEmployees(response.data.data || response.data || []);
    } catch (error) {
      console.error('Error loading employees:', error);
    }
  }, []);

  const handleCustomerChange = useCallback(async (e) => {
    const { value } = e.target;
    const customer = customers.find(c => c.CustomerID.toString() === value);
    setSelectedCustomer(customer);
    setProjectData(prev => ({ ...prev, CustomerID: value, ProjectCode: '' }));

    if (value && projectData.ProjectName?.trim()) {
      const generatedCode = await generateProjectCode(projectData.ProjectName, value, projectData.CustomerSite);
      generatedCode && setProjectData(current => ({ ...current, ProjectCode: generatedCode }));
    }
  }, [customers, projectData.ProjectName, projectData.CustomerSite, generateProjectCode]);

  useEffect(() => {
    fetchProjects();
    loadCustomers();
    loadEmployees();
  }, [fetchProjects, loadCustomers, loadEmployees]);

  return {
    projectData,
    setProjectData,
    projects,
    setProjects,
    customers,
    employees,
    selectedCustomer,
    setSelectedCustomer,
    errors,
    setErrors,
    isSubmitting,
    setIsSubmitting,
    isLoading,
    setIsLoading,
    editingProject,
    setEditingProject,
    dateFilter,
    setDateFilter,
    resetForm,
    handleInputChange,
    handleCustomerChange,
    addLocation,
    removeLocation,
    handleLocationStateChange,
    handleLocationNameChange,
    addSiteToLocation,
    removeSiteFromLocation,
    handleSiteChange,
    fetchProjects,
    loadCustomers,
    loadEmployees,
    generateProjectCode,
    formatDateForInput,
    hasDraft,
    restoreDraft,
    clearDraft
  };
};
