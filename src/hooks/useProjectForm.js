import { useState, useEffect, useCallback } from 'react';
import { customerAPI, projectAPI, locationAPI, apiHelpers } from '../services/api';

const INITIAL_STATE = { ProjectName: '', CustomerID: '', ProjectCode: '', ProjectDescription: '', LocationID: '', ProjectValue: '', StartDate: '', EndDate: '', Status: 'Active' };
const formatDateForInput = (dateString) => dateString ? new Date(new Date(dateString).getTime() + new Date(dateString).getTimezoneOffset() * 60000).toISOString().split('T')[0] : '';

export const useProjectForm = () => {
  const [projectData, setProjectData] = useState(INITIAL_STATE);
  const [projects, setProjects] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [locations, setLocations] = useState([]);
  const [customerSites, setCustomerSites] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [dateFilter, setDateFilter] = useState({ fromDate: '', toDate: '' });

  const resetForm = useCallback(() => {
    setProjectData(INITIAL_STATE);
    setErrors({});
    setEditingProject(null);
    setLocations([]);
    setSelectedCustomer(null);
    setCustomerSites([]);
  }, []);

  const generateProjectCode = useCallback(async (projectName, customerId, locationIds = []) => {
    if (!projectName || !customerId) return '';
    try {
      const response = await projectAPI.previewCode({ ProjectName: projectName, CustomerID: customerId, LocationID: locationIds });
      return response.data.success ? response.data.projectCode : '';
    } catch { return ''; }
  }, []);

  const handleInputChange = useCallback(async (e) => {
    const { name, value } = e.target;

    setProjectData(prev => {
      const newData = { ...prev, [name]: value };

      if (name === 'ProjectName' && selectedCustomer && value.trim()) {
        const selectedLocationIds = Array.isArray(prev.LocationID) ? prev.LocationID : (prev.LocationID ? [prev.LocationID] : []);
        selectedLocationIds.length > 0 && generateProjectCode(value, selectedCustomer.CustomerID, selectedLocationIds).then(generatedCode => {
          generatedCode && setProjectData(current => ({ ...current, ProjectCode: generatedCode }));
        });
      }

      return newData;
    });

    errors[name] && setErrors(prev => ({ ...prev, [name]: '' }));
  }, [errors, selectedCustomer, generateProjectCode]);

  const handleLocationChange = useCallback(async (e) => {
    const { name, value } = e.target;

    setProjectData(prev => {
      const newData = { ...prev, [name]: value };

      if (selectedCustomer && prev.ProjectName) {
        const selectedLocationIds = Array.isArray(value) ? value : (value ? [value] : []);
        generateProjectCode(prev.ProjectName, selectedCustomer.CustomerID, selectedLocationIds).then(generatedCode => {
          generatedCode && setProjectData(current => ({ ...current, ProjectCode: generatedCode }));
        });
      }

      return newData;
    });

    errors[name] && setErrors(prev => ({ ...prev, [name]: '' }));
  }, [errors, selectedCustomer, generateProjectCode]);

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

  const loadLocations = useCallback(async (customerId) => {
    try {
      const locationsData = customerSites.length > 0
        ? customerSites.map((site, index) => ({ LocationID: `site_${index + 1}`, LocationName: site.fullName, Address: site.fullName, CustomerID: customerId, isCustomerSite: true, displayName: `📍 ${site.fullName}`, siteData: site }))
        : (await locationAPI.getByCustomer(customerId)).data.data || [];

      setLocations(locationsData);
      locationsData.length === 1 && setProjectData(prev => ({ ...prev, LocationID: locationsData[0].LocationID.toString() }));
    } catch (error) {
      apiHelpers.showError(error, 'Failed to load locations');
    }
  }, [customerSites]);

  const loadCustomerSites = useCallback(async (customerId) => {
    try {
      const response = await customerAPI.getById(customerId);
      const sites = (response.data.CustomerSite || '').split(',').map(siteStr => {
        const parts = siteStr.trim().split(' - ');
        return { location: parts[0]?.trim() || '', site: parts[1]?.trim() || parts[0]?.trim() || '', fullName: siteStr.trim() };
      }).filter(site => site.location || site.site);
      setCustomerSites(sites);
    } catch (error) {
      apiHelpers.showError(error, 'Failed to load customer sites');
    }
  }, []);

  const handleCustomerChange = useCallback(async (e) => {
    const { value } = e.target;
    const customer = customers.find(c => c.CustomerID.toString() === value);
    setSelectedCustomer(customer);
    setProjectData(prev => ({ ...prev, CustomerID: value, LocationID: '', ProjectCode: '' }));

    if (value) {
      await loadCustomerSites(value);
      if (projectData.ProjectName?.trim()) {
        const generatedCode = await generateProjectCode(projectData.ProjectName, value, []);
        generatedCode && setProjectData(current => ({ ...current, ProjectCode: generatedCode }));
      }
    } else {
      setLocations([]);
      setCustomerSites([]);
      setSelectedCustomer(null);
    }
  }, [customers, projectData.ProjectName, loadCustomerSites, generateProjectCode]);

  useEffect(() => { fetchProjects(); loadCustomers(); }, [fetchProjects, loadCustomers]);
  useEffect(() => { selectedCustomer && customerSites.length > 0 && loadLocations(selectedCustomer.CustomerID); }, [customerSites, selectedCustomer, loadLocations]);

  return { projectData, setProjectData, projects, setProjects, customers, locations, customerSites, selectedCustomer, setSelectedCustomer, errors, setErrors, isSubmitting, setIsSubmitting, isLoading, setIsLoading, editingProject, setEditingProject, dateFilter, setDateFilter, resetForm, handleInputChange, handleLocationChange, handleCustomerChange, fetchProjects, loadCustomers, loadLocations, loadCustomerSites, generateProjectCode, formatDateForInput };
};
