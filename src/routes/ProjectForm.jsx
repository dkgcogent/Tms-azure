import React, { useState, useEffect } from 'react';
import { customerAPI, projectAPI, locationAPI, apiHelpers } from '../services/api';
import DataTable from '../components/DataTable';
import Dropdown from '../components/Dropdown';
import MultiSelectDropdown from '../components/MultiSelectDropdown';
import ExportButton from '../components/ExportButton';
import { useProjectValidation } from '../hooks/useProjectValidation';

import './ProjectForm.css';

// Simple date formatting function for display
const formatDate = (dateString) => {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-IN');
};

// Format date for input fields (YYYY-MM-DD) without timezone issues
const formatDateForInput = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  // Add timezone offset to avoid date shifting
  const offsetDate = new Date(date.getTime() + date.getTimezoneOffset() * 60000);
  return offsetDate.toISOString().split('T')[0];
};

// Format currency for display
const formatCurrency = (amount) => {
  if (!amount) return '₹0';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
};

const ProjectForm = () => {
  const getInitialState = () => ({
    ProjectName: '',
    CustomerID: '',
    ProjectCode: '',
    ProjectDescription: '',
    LocationID: '',
    ProjectValue: '',
    StartDate: '',
    EndDate: '',
    Status: 'Active'
  });

  const [projectData, setProjectData] = useState(getInitialState());
  const [projects, setProjects] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [locations, setLocations] = useState([]);
  const [customerSites, setCustomerSites] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [errors, setErrors] = useState({});

  // Use validation hook with auto-focus
  const { validateBeforeSubmit, focusField } = useProjectValidation();

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

    console.log('🗓️ Applying date filter to projects:', dateFilter);
    await fetchProjects();
  };

  const handleDateFilterClear = async () => {
    setDateFilter({
      fromDate: '',
      toDate: ''
    });
    console.log('🗑️ Clearing project date filter');
    await fetchProjects();
  };
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [editingProject, setEditingProject] = useState(null);

  useEffect(() => {
    fetchProjects();
    loadCustomers();
  }, []);

  // Trigger location loading when customer sites change
  useEffect(() => {
    if (selectedCustomer && customerSites.length > 0) {
      loadLocations(selectedCustomer.CustomerID);
    }
  }, [customerSites, selectedCustomer]);



  const fetchProjects = async () => {
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

      console.log('🗓️ Loading projects with date filter:', { fromDate: dateFilter.fromDate, toDate: dateFilter.toDate });

      const response = await projectAPI.getAll(url);
      const projectData = response.data.value || response.data || [];
      console.log('🔍 PROJECT FETCH DEBUG - Raw response:', response);
      console.log('🔍 PROJECT FETCH DEBUG - Project data:', projectData);
      console.log('🔍 PROJECT FETCH DEBUG - Project count:', projectData.length);
      setProjects(projectData);
    } catch (error) {
      console.error('🔍 PROJECT FETCH ERROR:', error);
      apiHelpers.showError(error, 'Failed to fetch projects');
    } finally {
      setIsLoading(false);
    }
  };

  const loadCustomers = async () => {
    try {
      const response = await customerAPI.getAll();
      setCustomers(response.data.value || response.data || []);
    } catch (error) {
      apiHelpers.showError(error, 'Failed to load customers');
    }
  };

  const loadLocations = async (customerId) => {
    console.log('Loading locations (customer sites) for customer:', customerId);

    try {
      // Use customer sites as the primary location source
      let locationsData = [];

      if (customerSites.length > 0) {
        console.log('Using customer sites as locations:', customerSites);
        locationsData = customerSites.map((site, index) => ({
          LocationID: `site_${index + 1}`, // Use a unique identifier for sites
          LocationName: site.fullName, // Use the full site name for display
          Address: site.fullName, // Keep full name as address too
          CustomerID: customerId,
          isCustomerSite: true, // Flag to identify this as a customer site
          displayName: `📍 ${site.fullName}`, // Formatted display name with icon
          siteData: site // Keep original site data for reference
        }));
        console.log('Converted customer sites to locations:', locationsData);
      } else {
        // Fallback: try to get formal locations from Location table
        console.log('No customer sites found, trying formal locations...');
        const response = await locationAPI.getByCustomer(customerId);
        console.log('Formal locations response:', response.data);
        locationsData = response.data.data ? response.data.data : [];
      }

      setLocations(locationsData);

      // Auto-select single location
      if (locationsData.length === 1) {
        const singleLocationId = locationsData[0].LocationID.toString();
        setProjectData(prev => ({
          ...prev,
          LocationID: singleLocationId
        }));

        // Generate project code if we have project name and customer
        if (projectData.ProjectName && projectData.ProjectName.trim() && customerId) {
          console.log('🔄 Single location auto-selected, generating project code...');
          const generatedCode = await generateProjectCode(
            projectData.ProjectName,
            customerId,
            [singleLocationId]
          );
          if (generatedCode) {
            setProjectData(current => ({ ...current, ProjectCode: generatedCode }));
          }
        }
      }
    } catch (error) {
      console.error('Error loading locations:', error);
      apiHelpers.showError(error, 'Failed to load locations');
    }
  };

  const loadCustomerSites = async (customerId) => {
    console.log('Loading customer sites for customer:', customerId);
    try {
      const response = await customerAPI.getById(customerId);
      console.log('Customer response:', response.data);

      // Parse customer sites from the CustomerSite field
      const customerSiteString = response.data.CustomerSite || '';
      const sites = customerSiteString
        .split(',')
        .map(siteStr => {
          const parts = siteStr.trim().split(' - ');
          return {
            location: parts[0]?.trim() || '',
            site: parts[1]?.trim() || parts[0]?.trim() || '',
            fullName: siteStr.trim()
          };
        })
        .filter(site => site.location || site.site);

      console.log('Parsed customer sites:', sites);
      setCustomerSites(sites);
    } catch (error) {
      console.error('Error loading customer sites:', error);
      apiHelpers.showError(error, 'Failed to load customer sites');
    }
  };

  const handleCustomerChange = async (e) => {
    const { value } = e.target;
    console.log('Customer changed to:', value, 'Edit mode:', !!editingProject);

    // Find selected customer details
    const customer = customers.find(c => c.CustomerID.toString() === value);
    setSelectedCustomer(customer);

    setProjectData(prev => ({
      ...prev,
      CustomerID: value,
      LocationID: '',
      ProjectCode: '' // Reset project code when customer changes
    }));

    if (value) {
      // Load customer sites - locations will be loaded automatically via useEffect
      await loadCustomerSites(value);

      // Generate project code if we have project name and this customer (works for both new and edit modes)
      if (projectData.ProjectName && projectData.ProjectName.trim()) {
        console.log('🔄 Customer changed, regenerating project code for:', projectData.ProjectName);
        const generatedCode = await generateProjectCode(
          projectData.ProjectName,
          value,
          [] // No location selected yet
        );
        if (generatedCode) {
          setProjectData(current => ({ ...current, ProjectCode: generatedCode }));
        }
      }
    } else {
      setLocations([]);
      setCustomerSites([]);
      setSelectedCustomer(null);
    }
  };

  // Generate project code using backend API for real-time generation (works for both new and edit modes)
  const generateProjectCode = async (projectName, customerId, locationIds = []) => {
    console.log('🔧 Generating project code:', { projectName, customerId, locationIds, editMode: !!editingProject });

    if (!projectName || !customerId) {
      console.log('❌ Missing required fields for project code generation');
      return '';
    }

    try {
      const requestData = {
        ProjectName: projectName,
        CustomerID: customerId,
        LocationID: locationIds
      };

      console.log('📤 Sending request to preview-code API:', requestData);

      const response = await projectAPI.previewCode(requestData);

      console.log('📥 Response from preview-code API:', response.data);

      if (response.data.success) {
        console.log('✅ Project code generated successfully:', response.data.projectCode);
        return response.data.projectCode;
      } else {
        console.log('❌ API returned error:', response.data.error);
      }
    } catch (error) {
      console.error('❌ Error generating project code:', error);
      console.error('Error details:', error.response?.data);
    }

    return ''; // Return empty if generation fails
  };

  const handleInputChange = async (e) => {
    const { name, value, type, files, selectedOption } = e.target;

    console.log('📝 Input change:', { name, value, type, files: files?.length });

    {
      setProjectData(prev => {
        const newData = { ...prev, [name]: value };

        // Auto-generate project code when project name changes and we have customer
        if (name === 'ProjectName' && selectedCustomer && value.trim()) {
          console.log('🎯 Project name changed, checking for code generation...');
          const selectedLocationIds = Array.isArray(prev.LocationID)
            ? prev.LocationID
            : (prev.LocationID ? [prev.LocationID] : []);

          console.log('📍 Current location IDs:', selectedLocationIds);
          console.log('👤 Selected customer:', selectedCustomer);

          // Generate code with or without location (backend will use customer's default location if needed)
          console.log('✅ Generating project code...');
          generateProjectCode(
            value,
            selectedCustomer.CustomerID,
            selectedLocationIds
          ).then(generatedCode => {
            console.log('🎉 Generated code received:', generatedCode);
            if (generatedCode) {
              setProjectData(current => ({ ...current, ProjectCode: generatedCode }));
            }
          });
        }

        return newData;
      });
    }

    // Clear errors when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  // Handle location changes (for multi-select)
  const handleLocationChange = async (e) => {
    const { name, value } = e.target;

    setProjectData(prev => {
      const newData = { ...prev, [name]: value };

      // Auto-generate project code when location changes
      if (selectedCustomer && prev.ProjectName) {
        const selectedLocationIds = Array.isArray(value) ? value : (value ? [value] : []);

        // Generate project code immediately
        generateProjectCode(
          prev.ProjectName,
          selectedCustomer.CustomerID,
          selectedLocationIds
        ).then(generatedCode => {
          if (generatedCode) {
            setProjectData(current => ({ ...current, ProjectCode: generatedCode }));
          }
        });
      }

      return newData;
    });

    // Clear errors when user makes selection
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    // Required field validation
    if (!projectData.ProjectName.trim()) {
      newErrors.ProjectName = 'Project name is required';
    }

    if (!projectData.CustomerID) {
      newErrors.CustomerID = 'Customer selection is required';
    }

    // if (!projectData.LocationID) {
    //   newErrors.LocationID = 'Location is required';
    // }

    if (!projectData.ProjectValue.trim()) {
      newErrors.ProjectValue = 'Project value is required';
    } else if (isNaN(projectData.ProjectValue) || parseFloat(projectData.ProjectValue) <= 0) {
      newErrors.ProjectValue = 'Project value must be a positive number';
    }

    if (!projectData.StartDate) {
      newErrors.StartDate = 'Project start date is required';
    }

    if (!projectData.EndDate) {
      newErrors.EndDate = 'Project end date is required';
    }

    if (!projectData.Status) {
      newErrors.Status = 'Project status is required';
    }

    // Date validation
    if (projectData.StartDate && projectData.EndDate) {
      const startDate = new Date(projectData.StartDate);
      const endDate = new Date(projectData.EndDate);
      
      if (endDate <= startDate) {
        newErrors.EndDate = 'End date must be after start date';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Use enhanced validation with auto-focus
    const isValid = await validateBeforeSubmit(
      projectData,
      // Success callback
      async (validatedData) => {
        await submitProjectData(validatedData);
      },
      // Error callback
      (validationResult) => {
        setErrors(validationResult.errors || {});
        // Error focus will be handled automatically
      }
    );

    if (!isValid) {
      return; // Validation failed, cursor moved to first error
    }
  };

  // Separate function for actual data submission
  const submitProjectData = async (validatedData) => {
    setIsSubmitting(true);

    try {
      const formData = new FormData();

      // Handle form data submission
      console.log('📁 PROJECT SUBMIT DEBUG - All project data:', projectData);

      for (const key in projectData) {
        if (key === 'LocationID') {
          // Convert LocationID to Location string
          if (Array.isArray(projectData[key])) {
            // Handle multiple locations - get location names and join
            const locationNames = projectData[key].map(locId => {
              const location = locations.find(loc => loc.LocationID === locId);
              return location ? location.LocationName : locId;
            });
            formData.append('Location', locationNames.join(', '));
          } else if (typeof projectData[key] === 'string' && projectData[key].startsWith('site_')) {
            // Handle customer site IDs - store the site name
            const siteLocation = locations.find(loc => loc.LocationID === projectData[key]);
            formData.append('Location', siteLocation ? siteLocation.LocationName : projectData[key]);
          } else if (projectData[key]) {
            // Handle single location ID - get location name
            const location = locations.find(loc => loc.LocationID === projectData[key]);
            formData.append('Location', location ? location.LocationName : projectData[key]);
          }
          // Don't append LocationID anymore, we're using Location string field
        } else if (projectData[key] !== null && projectData[key] !== undefined) {
          formData.append(key, projectData[key]);
        }
      }

      // Debug FormData contents
      console.log('📁 PROJECT SUBMIT DEBUG - FormData contents:');
      for (let [key, value] of formData.entries()) {
        if (value instanceof File) {
          console.log(`  ${key}: File(${value.name}, ${value.size} bytes)`);
        } else {
          console.log(`  ${key}: ${value}`);
        }
      }

      if (editingProject) {
        await projectAPI.update(editingProject.ProjectID, formData);
        apiHelpers.showSuccess(`Project "${projectData.ProjectName}" has been updated successfully!`);
      } else {
        // Capture the response to get the generated ProjectCode (like customer form)
        const response = await projectAPI.create(formData);

        const generatedProjectCode = response.data?.ProjectCode;

        if (generatedProjectCode) {
          // Update the form with the generated project code (like customer form)
          setProjectData(prev => {
            console.log('🔍 PROJECT SUBMIT DEBUG - Previous projectData:', prev);
            const newData = {
              ...prev,
              ProjectCode: generatedProjectCode
            };
            console.log('🔍 PROJECT SUBMIT DEBUG - New projectData:', newData);
            return newData;
          });
          apiHelpers.showSuccess(`Project "${projectData.ProjectName}" has been added successfully! Generated Code: ${generatedProjectCode}`);
        } else {
          console.log('🔍 PROJECT SUBMIT DEBUG - No generated code found in response');
          apiHelpers.showSuccess(`Project "${projectData.ProjectName}" has been added successfully!`);
        }
      }

      await fetchProjects();
      // Auto-clear form after successful submission
      resetForm();
    } catch (error) {
      apiHelpers.handleFormError(error, 'project');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setProjectData(getInitialState());
    setErrors({});
    setEditingProject(null);
    setLocations([]); // Clear locations when resetting form
    setCustomerSites([]); // Clear customer sites when resetting form
    setSelectedCustomer(null); // Clear selected customer when resetting form
  };

  // Direct backend export function
  const handleExportProjects = async () => {
    try {
      const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';
      const exportUrl = `${API_BASE_URL}/api/export/projects`;

      // Show loading message
      const loadingToast = document.createElement('div');
      loadingToast.style.cssText = `
        position: fixed; top: 20px; right: 20px; z-index: 10000;
        background: #007bff; color: white; padding: 15px 20px;
        border-radius: 5px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        font-family: Arial, sans-serif; font-size: 14px;
      `;
      loadingToast.textContent = '🔄 Exporting projects... Please wait';
      document.body.appendChild(loadingToast);

      // Create download link
      const link = document.createElement('a');
      link.href = exportUrl;
      link.download = `Project_Master_${new Date().toISOString().slice(0, 10)}.xlsx`;
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Remove loading and show success
      document.body.removeChild(loadingToast);

      const successToast = document.createElement('div');
      successToast.style.cssText = `
        position: fixed; top: 20px; right: 20px; z-index: 10000;
        background: #28a745; color: white; padding: 15px 20px;
        border-radius: 5px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        font-family: Arial, sans-serif; font-size: 14px;
      `;
      successToast.innerHTML = `✅ Project Export Started!<br><small>Downloading ALL project master fields + customer info</small>`;
      document.body.appendChild(successToast);
      setTimeout(() => {
        if (document.body.contains(successToast)) {
          document.body.removeChild(successToast);
        }
      }, 5000);

    } catch (error) {
      console.error('Export error:', error);
      alert(`❌ Export failed: ${error.message}`);
    }
  };

  const handleEdit = async (project) => {
    console.log('🔄 PROJECT EDIT DEBUG - Starting edit for project:', project.ProjectID);

    try {
      // Fetch complete project data including file URLs
      console.log('🔄 PROJECT EDIT DEBUG - Fetching complete project data for ID:', project.ProjectID);
      const response = await projectAPI.getById(project.ProjectID);
      const completeProjectData = response.data;

      console.log('✅ PROJECT EDIT DEBUG - Complete project data received:', completeProjectData);

      // Use the complete project data instead of the table row data
      project = completeProjectData;
    } catch (error) {
      console.error('❌ PROJECT EDIT DEBUG - Error fetching complete project data:', error);
      console.warn('⚠️ PROJECT EDIT DEBUG - Falling back to table data (no file URLs available)');
    }

    setEditingProject(project);

    // Find selected customer details
    const customer = customers.find(c => c.CustomerID.toString() === project.CustomerID.toString());
    setSelectedCustomer(customer);

    // Handle LocationID - need to determine if it's a customer site or regular location
    let locationValue = project.LocationID || '';

    console.log('🔄 PROJECT EDIT DEBUG - Original LocationID:', project.LocationID);
    console.log('🔄 PROJECT EDIT DEBUG - Customer sites available:', customerSites);

    // If LocationID is null, this might be a customer site project
    if (!project.LocationID && customer && customer.CustomerSite) {
      // This is likely a customer site project, we need to find the matching site
      const sites = customer.CustomerSite.split(',').map(site => site.trim());
      if (sites.length > 0) {
        // For now, select the first site (you might want to store which site was selected)
        locationValue = 'site_1'; // This will be handled by the location dropdown
      }
    } else if (typeof locationValue === 'string' && locationValue.includes(',')) {
      // If LocationID contains comma-separated values, convert to array
      locationValue = locationValue.split(',').map(id => id.trim()).filter(Boolean);
    }

    console.log('🔄 PROJECT EDIT DEBUG - Processed LocationID:', locationValue);

    setProjectData({
      ProjectName: project.ProjectName || '',
      CustomerID: project.CustomerID || '',
      ProjectCode: project.ProjectCode || '',
      ProjectDescription: project.ProjectDescription || '',
      LocationID: locationValue,
      ProjectValue: project.ProjectValue || '',
      StartDate: project.StartDate ? formatDateForInput(project.StartDate) : '',
      EndDate: project.EndDate ? formatDateForInput(project.EndDate) : '',
      Status: project.Status || 'Active',

    });

    console.log('🔄 PROJECT EDIT DEBUG - Original project data:', project);
    console.log('🔄 PROJECT EDIT DEBUG - Date conversion:', {
      originalStartDate: project.StartDate,
      convertedStartDate: project.StartDate ? formatDateForInput(project.StartDate) : '',
      originalEndDate: project.EndDate,
      convertedEndDate: project.EndDate ? formatDateForInput(project.EndDate) : '',
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
    });
    console.log('🔄 PROJECT EDIT DEBUG - Mapped form data:', project);

    if (project.CustomerID) {
      // Load customer sites and locations first, then set form data
      await loadCustomerSites(project.CustomerID);
      await loadLocations(project.CustomerID);

      console.log('🔄 PROJECT EDIT DEBUG - Locations loaded:', locations.length);
      console.log('🔄 PROJECT EDIT DEBUG - Customer sites loaded:', customerSites.length);
    }

    // Scroll to top of the page to show the form
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (projectOrId) => {
    // Extract ID and project object
    const projectId = typeof projectOrId === 'object'
      ? projectOrId.ProjectID
      : projectOrId;
    const project = typeof projectOrId === 'object'
      ? projectOrId
      : projects.find(p => p.ProjectID === projectId);
    const projectName = project?.ProjectName || 'Project';

    console.log('🗑️ Delete requested for project:', projectId, projectName);

    if (window.confirm(`Are you sure you want to delete "${projectName}"?`)) {
      try {
        await projectAPI.delete(projectId);
        apiHelpers.showSuccess('Project deleted successfully!');
        await fetchProjects();
      } catch (error) {
        apiHelpers.handleFormError(error, 'project deletion');
      }
    }
  };

  const handleBulkDelete = async (projectIds) => {
    console.log('🗑️ Bulk delete requested for project IDs:', projectIds);

    if (projectIds.length === 0) {
      apiHelpers.showError(null, 'No projects selected for deletion.');
      return;
    }

    // Get project names/codes for confirmation
    const selectedProjects = projects.filter(p => projectIds.includes(p.ProjectID));
    const projectDetails = selectedProjects.map(p =>
      `${p.ProjectName} (${p.ProjectCode || 'No Code'})`
    ).join(', ');

    const confirmMessage = projectIds.length === 1
      ? `Are you sure you want to delete "${projectDetails}"?`
      : `Are you sure you want to delete ${projectIds.length} projects?\n\nProjects: ${projectDetails}`;

    if (window.confirm(confirmMessage)) {
      try {
        const response = await projectAPI.bulkDelete(projectIds);

        if (response.data.deletedCount > 0) {
          apiHelpers.showSuccess(
            `Successfully deleted ${response.data.deletedCount} project(s)!` +
            (response.data.notFoundCount > 0 ? ` (${response.data.notFoundCount} not found)` : '')
          );
        } else {
          apiHelpers.showError(null, 'No projects were deleted. They may have already been removed.');
        }

        await fetchProjects(); // Refresh the list
      } catch (error) {
        console.error('Error bulk deleting projects:', error);

        // Provide specific error messages for bulk deletion
        let errorMessage;
        if (error.response?.status === 400) {
          errorMessage = 'Cannot delete one or more projects because they are linked to other records (vehicles, transactions, etc.). Please remove related records first.';
        } else if (error.response?.status === 403) {
          errorMessage = 'You do not have permission to delete these projects.';
        } else if (error.code === 'ECONNREFUSED' || error.message?.includes('Network Error')) {
          errorMessage = 'Unable to connect to server. Please check your connection and try again.';
        } else {
          errorMessage = 'Unable to delete projects. Please try again.';
        }

        apiHelpers.showError(error, errorMessage);
      }
    }
  };

  const renderFormField = (label, name, type = 'text', options = {}, required = false) => {
    const { placeholder, values, readOnly } = options;
    const isSelect = type === 'select';
    const isCustomerSelect = name === 'CustomerID';
    const isLocationSelect = name === 'LocationID';
    const isStatusSelect = name === 'Status';
    const isProjectCode = name === 'ProjectCode';
    const id = `project-${name}`;
    const hasError = errors[name];

    return (
      <div className={`form-group ${hasError ? 'has-error' : ''}`}>
        <label htmlFor={id} className="form-group-label">
          {label} {required && <span className="required-indicator">*</span>}
        </label>
        {isCustomerSelect ? (
          <Dropdown
            name={name}
            value={projectData[name]}
            onChange={handleCustomerChange}
            options={customers}
            valueKey="CustomerID"
            labelKey="Name"
            formatLabel={(customer) => `${customer.Name} (${customer.CustomerCode})`}
            placeholder="Select a customer"
            required={required}
            error={errors[name]}
            disabled={isSubmitting}
          />
        ) : isLocationSelect ? (
          // Smart location handling: single location = read-only, multiple = multi-select
          locations.length === 0 ? (
            <input
              type="text"
              id={id}
              name={name}
              value="No locations available"
              disabled={true}
              className="disabled-input"
              placeholder="Select a customer first"
            />
          ) : locations.length === 1 ? (
            // Single location - show as read-only
            <input
              type="text"
              id={id}
              name={name}
              value={locations[0].LocationName}
              disabled={true}
              className="readonly-input"
              title="Only one location available for this customer"
            />
          ) : (
            // Multiple locations - show multi-select dropdown
            <MultiSelectDropdown
              name={name}
              value={Array.isArray(projectData[name]) ? projectData[name] : (projectData[name] ? [projectData[name]] : [])}
              onChange={handleLocationChange}
              options={locations}
              valueKey="LocationID"
              labelKey="LocationName"
              formatLabel={(location) => location.isCustomerSite ? location.displayName : `${location.LocationName} (${location.Address || 'No address'})`}
              placeholder="Select locations..."
              searchPlaceholder="Search locations..."
              required={required}
              error={errors[name]}
              disabled={isSubmitting || !projectData.CustomerID}
              showSearch={true}
              allowSelectAll={true}
              maxHeight="250px"
            />
          )
        ) : isStatusSelect ? (
          <select
            id={id}
            name={name}
            value={projectData[name]}
            onChange={handleInputChange}
            required={required}
            className={errors[name] ? 'error' : ''}
            disabled={isSubmitting}
          >
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
            <option value="Completed">Completed</option>
          </select>
        ) : isProjectCode ? (
          // Project Code field - read-only with special styling
          <div className="project-code-container">
            <input
              type="text"
              id={id}
              name={name}
              value={projectData[name] || ''}
              readOnly={true}
              placeholder={placeholder || 'Auto-generated'}
              className={`project-code-input ${errors[name] ? 'error' : ''}`}
              title="Project code is automatically generated based on project name, customer, and location"
            />
            {projectData[name] && (
              <div className="project-code-status">
                ✅ Generated
              </div>
            )}
          </div>
        ) : type === 'textarea' ? (
          <textarea
            id={id}
            name={name}
            value={projectData[name]}
            onChange={handleInputChange}
            placeholder={placeholder}
            required={required}
            className={errors[name] ? 'error' : ''}
            disabled={isSubmitting}
            rows={4}
          />
        ) : (
          <input
            type={type}
            id={id}
            name={name}
            value={projectData[name]}
            onChange={handleInputChange}
            placeholder={placeholder}
            required={required}
            className={errors[name] ? 'error' : ''}
            disabled={isSubmitting}
            readOnly={readOnly}
            min={type === 'date' && name === 'EndDate' ? projectData.StartDate : undefined}
          />
        )}
        {errors[name] && <div className="error-message">{errors[name]}</div>}
      </div>
    );
  };

  const projectColumns = [
    { 
      key: 'ProjectName', 
      label: 'Project Name', 
      sortable: true,
      minWidth: '200px'
    },
    { 
      key: 'CustomerName', 
      label: 'Customer', 
      sortable: true,
      minWidth: '150px'
    },
    { 
      key: 'ProjectValue', 
      label: 'Value', 
      sortable: true,
      minWidth: '120px',
      render: (value) => formatCurrency(value)
    },
    { 
      key: 'StartDate', 
      label: 'Start Date', 
      sortable: true,
      minWidth: '120px',
      render: (value) => formatDate(value)
    },
    { 
      key: 'EndDate', 
      label: 'End Date', 
      sortable: true,
      minWidth: '120px',
      render: (value) => formatDate(value)
    },
    { 
      key: 'Status', 
      label: 'Status', 
      sortable: true,
      minWidth: '100px',
      render: (value) => (
        <span className={`status-badge ${value?.toLowerCase()}`}>
          {value || 'Active'}
        </span>
      )
    }
  ];

  return (
    <div className="project-form-container">
      <div className="form-header">
        <h1>📁 Project Master</h1>


        {editingProject && (
          <div className="edit-notice">
            <span className="edit-notice-text">
              Editing: <strong>{editingProject.ProjectName}</strong>
            </span>
            <button type="button" onClick={resetForm} className="cancel-edit-btn">
              Cancel Edit
            </button>
          </div>
        )}
      </div>

      <div className="project-form">
        <form onSubmit={handleSubmit} noValidate>
          <div className="form-sections">
            {/* Section 1: Basic Information */}
            <div className="form-section">
              <h4>📋 Basic Information</h4>
              <div className="form-grid">
                {renderFormField('Customer', 'CustomerID', 'select', {}, true)}
                {renderFormField('Project Name', 'ProjectName', 'text', { placeholder: 'Enter project name' }, true)}
                {renderFormField('Project Code', 'ProjectCode', 'text', { placeholder: 'Auto-generated', readOnly: true })}
              </div>
            </div>

            {/* Section 2: Location & Details */}
            <div className="form-section">
              <h4>📍 Location & Details</h4>
              <div className="form-grid">
                {renderFormField('Location', 'LocationID', 'select', {}, false)}
                {renderFormField('Project Description', 'ProjectDescription', 'textarea', { placeholder: 'Enter project description' })}
              </div>
            </div>

            {/* Section 3: Financial Information */}
            <div className="form-section">
              <h4>💰 Financial Information</h4>
              <div className="form-grid">
                {renderFormField('Project Value (₹)', 'ProjectValue', 'number', { placeholder: 'Enter project value' }, true)}
              </div>
            </div>

            {/* Section 4: Timeline & Status */}
            <div className="form-section">
              <h4>📅 Timeline & Status</h4>
              <div className="form-grid">
                {renderFormField('Start Date', 'StartDate', 'date', {}, true)}
                {renderFormField('End Date', 'EndDate', 'date', {}, true)}
                {renderFormField('Status', 'Status', 'select', {}, true)}
              </div>
            </div>
          </div>

          <div className="form-actions">
            <button type="submit" disabled={isSubmitting} className="submit-btn">
              {isSubmitting ? 'Processing...' : editingProject ? 'Update Project' : 'Add Project'}
            </button>
          </div>
        </form>
      </div>

      {/* Export Button - Bottom Right Above DataTable */}
      <div style={{
        display: 'flex',
        justifyContent: 'flex-end',
        marginBottom: '15px',
        paddingRight: '10px'
      }}>
        <ExportButton
          entity="projects"
          entityDisplayName="Projects"
          expectedFields={13}
        />
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
        title="📋 Project List"
        data={projects}
        columns={projectColumns}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onBulkDelete={handleBulkDelete}
        bulkSelectable={true}
        isLoading={isLoading}
        keyField="ProjectID"
        emptyMessage="No projects found. Add your first project above."
        defaultRowsPerPage={5}
        showPagination={true}
        customizable={true}
        exportable={false}
      />
    </div>
  );
};

export default ProjectForm;