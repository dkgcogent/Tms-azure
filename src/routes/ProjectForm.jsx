import React, { useState, useEffect } from 'react';
import { customerAPI, projectAPI, employeeAPI, apiHelpers } from '../services/api';
import DataTable from '../components/DataTable';
import Dropdown from '../components/Dropdown';
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

const INDIAN_STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Goa", "Gujarat", 
  "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh", 
  "Maharashtra", "Manipur", "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab", 
  "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh", 
  "Uttarakhand", "West Bengal", "Andaman and Nicobar Islands", "Chandigarh", 
  "Dadra and Nagar Haveli and Daman and Diu", "Delhi", "Jammu and Kashmir", 
  "Ladakh", "Lakshadweep", "Puducherry"
];

const ProjectForm = () => {
  const getInitialState = () => ({
    ProjectName: '',
    CustomerID: '',
    ProjectCode: '',
    ProjectDescription: '',
    State: '',
    Location: '',
    CustomerSite: '',
    AssignedEmployee: '',
    ProjectValue: '',
    StartDate: '',
    EndDate: '',
    Status: 'Active'
  });

  const [projectData, setProjectData] = useState(getInitialState());
  const [projects, setProjects] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [errors, setErrors] = useState({});

  // Use validation hook with auto-focus
  const { validateBeforeSubmit } = useProjectValidation();

  // Date filter state
  const [dateFilter, setDateFilter] = useState({
    fromDate: '',
    toDate: ''
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [editingProject, setEditingProject] = useState(null);

  useEffect(() => {
    fetchProjects();
    loadCustomers();
    loadEmployees();
  }, []);

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

  const fetchProjects = async () => {
    setIsLoading(true);
    try {
      const queryParams = new URLSearchParams();
      if (dateFilter.fromDate) {
        queryParams.append('fromDate', dateFilter.fromDate);
      }
      if (dateFilter.toDate) {
        queryParams.append('toDate', dateFilter.toDate);
      }

      const queryString = queryParams.toString();
      const url = queryString ? `?${queryString}` : '';

      const response = await projectAPI.getAll(url);
      const projectDataList = response.data.value || response.data || [];
      setProjects(projectDataList);
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

  const loadEmployees = async () => {
    try {
      const response = await employeeAPI.getAll();
      setEmployees(response.data.data || response.data || []);
    } catch (error) {
      console.error('Error loading employees:', error);
    }
  };

  const handleCustomerChange = async (e) => {
    const { value } = e.target;
    console.log('Customer changed to:', value, 'Edit mode:', !!editingProject);

    const customer = customers.find(c => c.CustomerID.toString() === value);
    setSelectedCustomer(customer);

    setProjectData(prev => ({
      ...prev,
      CustomerID: value,
      ProjectCode: ''
    }));

    if (value && projectData.ProjectName && projectData.ProjectName.trim()) {
      const generatedCode = await generateProjectCode(
        projectData.ProjectName,
        value,
        projectData.Location
      );
      if (generatedCode) {
        setProjectData(current => ({ ...current, ProjectCode: generatedCode }));
      }
    }
  };

  // Generate project code using backend API for real-time generation
  const generateProjectCode = async (projectName, customerId, locationVal = '') => {
    if (!projectName || !customerId) {
      return '';
    }

    try {
      const requestData = {
        ProjectName: projectName,
        CustomerID: customerId,
        LocationID: locationVal ? [locationVal] : []
      };

      const response = await projectAPI.previewCode(requestData);

      if (response.data.success) {
        return response.data.projectCode;
      }
    } catch (error) {
      console.error('❌ Error generating project code:', error);
    }

    return '';
  };

  const handleInputChange = async (e) => {
    const { name, value } = e.target;

    setProjectData(prev => {
      const newData = { ...prev, [name]: value };

      if ((name === 'ProjectName' || name === 'Location') && selectedCustomer && (name === 'ProjectName' ? value.trim() : prev.ProjectName.trim())) {
        const pName = name === 'ProjectName' ? value : prev.ProjectName;
        const loc = name === 'Location' ? value : prev.Location;
        generateProjectCode(
          pName,
          selectedCustomer.CustomerID,
          loc
        ).then(generatedCode => {
          if (generatedCode) {
            setProjectData(current => ({ ...current, ProjectCode: generatedCode }));
          }
        });
      }

      return newData;
    });

    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const isValid = await validateBeforeSubmit(
      projectData,
      async (validatedData) => {
        await submitProjectData(validatedData);
      },
      (validationResult) => {
        setErrors(validationResult.errors || {});
      }
    );

    if (!isValid) {
      return;
    }
  };

  const submitProjectData = async () => {
    setIsSubmitting(true);

    try {
      let finalCustomerSite = (projectData.CustomerSite || '').trim();
      if (projectData.AssignedEmployee && projectData.AssignedEmployee.trim()) {
        finalCustomerSite = `${finalCustomerSite} (Emp: ${projectData.AssignedEmployee.trim()})`;
      }

      const payload = {
        ProjectName: projectData.ProjectName,
        CustomerID: projectData.CustomerID,
        ProjectCode: projectData.ProjectCode,
        ProjectDescription: projectData.ProjectDescription || '',
        State: projectData.State || '',
        Location: projectData.Location || '',
        CustomerSite: finalCustomerSite || '',
        ProjectValue: projectData.ProjectValue,
        StartDate: projectData.StartDate,
        EndDate: projectData.EndDate,
        Status: projectData.Status || 'Active'
      };

      console.log('📁 PROJECT SUBMIT DEBUG - Payload:', payload);

      if (editingProject) {
        await projectAPI.update(editingProject.ProjectID, payload);
        apiHelpers.showSuccess(`Project "${projectData.ProjectName}" has been updated successfully!`);
      } else {
        const response = await projectAPI.create(payload);
        const generatedProjectCode = response.data?.ProjectCode;

        if (generatedProjectCode) {
          setProjectData(prev => ({
            ...prev,
            ProjectCode: generatedProjectCode
          }));
          apiHelpers.showSuccess(`Project "${projectData.ProjectName}" has been added successfully! Generated Code: ${generatedProjectCode}`);
        } else {
          apiHelpers.showSuccess(`Project "${projectData.ProjectName}" has been added successfully!`);
        }
      }

      await fetchProjects();
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
    setSelectedCustomer(null);
  };

  const handleEdit = async (project) => {
    console.log('🔄 PROJECT EDIT DEBUG - Starting edit for project:', project.ProjectID);

    try {
      const response = await projectAPI.getById(project.ProjectID);
      project = response.data;
    } catch (error) {
      console.warn('⚠️ PROJECT EDIT DEBUG - Falling back to table data');
    }

    setEditingProject(project);

    const customer = customers.find(c => c.CustomerID.toString() === project.CustomerID?.toString());
    setSelectedCustomer(customer);

    let rawCustomerSite = project.CustomerSite || '';
    let siteName = rawCustomerSite;
    let empVal = '';

    if (rawCustomerSite.includes('(Emp:')) {
      const match = rawCustomerSite.match(/\(Emp:\s*([^)]+)\)/);
      if (match) {
        empVal = match[1].trim();
        siteName = rawCustomerSite.replace(match[0], '').trim();
      }
    }

    setProjectData({
      ProjectName: project.ProjectName || '',
      CustomerID: project.CustomerID || '',
      ProjectCode: project.ProjectCode || '',
      ProjectDescription: project.ProjectDescription || '',
      State: project.State || '',
      Location: project.Location || '',
      CustomerSite: siteName,
      AssignedEmployee: empVal,
      ProjectValue: project.ProjectValue || '',
      StartDate: project.StartDate ? formatDateForInput(project.StartDate) : '',
      EndDate: project.EndDate ? formatDateForInput(project.EndDate) : '',
      Status: project.Status || 'Active'
    });

    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (projectOrId) => {
    const projectId = typeof projectOrId === 'object'
      ? projectOrId.ProjectID
      : projectOrId;
    const project = typeof projectOrId === 'object'
      ? projectOrId
      : projects.find(p => p.ProjectID === projectId);
    const projectName = project?.ProjectName || 'Project';

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
    if (projectIds.length === 0) {
      apiHelpers.showError(null, 'No projects selected for deletion.');
      return;
    }

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

        await fetchProjects();
      } catch (error) {
        console.error('Error bulk deleting projects:', error);
        apiHelpers.showError(error, 'Unable to delete projects. Please try again.');
      }
    }
  };

  const renderFormField = (label, name, type = 'text', options = {}, required = false) => {
    const { placeholder, values, readOnly } = options;
    const isCustomerSelect = name === 'CustomerID';
    const isStateSelect = name === 'State';
    const isEmployeeSelect = name === 'AssignedEmployee';
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
        ) : isStateSelect ? (
          <select
            id={id}
            name={name}
            value={projectData[name] || ''}
            onChange={handleInputChange}
            required={required}
            className={errors[name] ? 'error' : ''}
            disabled={isSubmitting}
          >
            <option value="">-- Select State --</option>
            {INDIAN_STATES.map(stateName => (
              <option key={stateName} value={stateName}>
                {stateName}
              </option>
            ))}
          </select>
        ) : isEmployeeSelect ? (
          <select
            id={id}
            name={name}
            value={projectData[name] || ''}
            onChange={handleInputChange}
            className={errors[name] ? 'error' : ''}
            disabled={isSubmitting}
          >
            <option value="">-- Assign Employee --</option>
            {employees.map(emp => (
              <option key={emp.id || emp.employee_id || emp.employee_code} value={emp.employee_code ? `${emp.employee_code}/${emp.employee_name}` : emp.employee_name}>
                {emp.employee_code ? `${emp.employee_code}/` : ''}{emp.employee_name}
              </option>
            ))}
          </select>
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
      minWidth: '180px'
    },
    {
      key: 'CustomerName',
      label: 'Customer',
      sortable: true,
      minWidth: '150px'
    },
    {
      key: 'State',
      label: 'State',
      sortable: true,
      minWidth: '120px',
      render: (value) => value || '-'
    },
    {
      key: 'Location',
      label: 'Location',
      sortable: true,
      minWidth: '130px',
      render: (value) => value || '-'
    },
    {
      key: 'CustomerSite',
      label: 'Customer Site',
      sortable: true,
      minWidth: '180px',
      render: (value) => value ? <div style={{ whiteSpace: 'normal', wordBreak: 'break-word', minWidth: '180px' }}>{value}</div> : '-'
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

            {/* Section 2: Location & Customer Site */}
            <div className="form-section">
              <h4>📍 Location & Customer Site</h4>
              <div className="form-grid">
                {renderFormField('State', 'State', 'select', {}, false)}
                {renderFormField('Location', 'Location', 'text', { placeholder: 'Enter location (e.g., Delhi)' }, false)}
                {renderFormField('Customer Site', 'CustomerSite', 'text', { placeholder: 'Enter customer site (e.g., Dwarka Sec 21)' }, false)}
                {renderFormField('Assign Employee', 'AssignedEmployee', 'select', {}, false)}
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