import React, { useCallback } from 'react';
import { projectAPI, apiHelpers } from '../services/api';
import { useProjectForm } from '../hooks/useProjectForm';
import { useProjectValidation } from '../hooks/useProjectValidation';
import DataTable from '../components/DataTable';

import ProjectDetailsSection from '../components/project/sections/ProjectDetailsSection';
import ProjectLocationSitesSection from '../components/project/sections/ProjectLocationSitesSection';
import ProjectCommercialsBillingSection from '../components/project/sections/ProjectCommercialsBillingSection';
import ProjectTimelineSection from '../components/project/sections/ProjectTimelineSection';
import RestoreDraftNotification from '../components/RestoreDraftNotification';
import './ProjectForm.css';

const formatDate = (dateString) => dateString ? new Date(dateString).toLocaleDateString('en-IN') : '-';
const formatCurrency = (amount) => amount ? new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount) : '₹0';

const ProjectFormRefactored = () => {
  const {
    projectData,
    setProjectData,
    projects,
    customers,
    employees,
    selectedCustomer,
    setSelectedCustomer,
    errors,
    setErrors,
    isSubmitting,
    setIsSubmitting,
    isLoading,
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
    formatDateForInput,
    hasDraft,
    restoreDraft,
    clearDraft
  } = useProjectForm();

  const { validateForm } = useProjectValidation();

  const handleDateFilterApply = useCallback(async () => {
    if (!dateFilter.fromDate || !dateFilter.toDate) return alert('Please select both From Date and To Date');
    if (new Date(dateFilter.fromDate) > new Date(dateFilter.toDate)) return alert('From Date cannot be later than To Date');
    await fetchProjects();
  }, [dateFilter, fetchProjects]);

  const handleDateFilterClear = useCallback(async () => {
    setDateFilter({ fromDate: '', toDate: '' });
    await fetchProjects();
  }, [setDateFilter, fetchProjects]);

  // Export handler - Excel export for filtered projects
  const handleExportProjects = useCallback(async () => {
    try {
      console.log('📊 Exporting projects to Excel...');

      const queryParams = new URLSearchParams();
      if (dateFilter.fromDate) {
        queryParams.append('fromDate', dateFilter.fromDate);
      }
      if (dateFilter.toDate) {
        queryParams.append('toDate', dateFilter.toDate);
      }

      const queryString = queryParams.toString();
      const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';
      const exportUrl = `${API_BASE_URL}/api/export/projects${queryString ? `?${queryString}` : ''}`;

      const loadingToast = document.createElement('div');
      loadingToast.style.cssText = `
        position: fixed; top: 20px; right: 20px; z-index: 10000;
        background: #007bff; color: white; padding: 15px 20px;
        border-radius: 5px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        font-family: Arial, sans-serif; font-size: 14px;
      `;
      loadingToast.textContent = '🔄 Exporting projects... Please wait';
      document.body.appendChild(loadingToast);

      const link = document.createElement('a');
      link.href = exportUrl;
      link.download = `Project_Master_${new Date().toISOString().slice(0, 10)}.xlsx`;
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      document.body.removeChild(loadingToast);

      const successToast = document.createElement('div');
      successToast.style.cssText = `
        position: fixed; top: 20px; right: 20px; z-index: 10000;
        background: #28a745; color: white; padding: 15px 20px;
        border-radius: 5px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        font-family: Arial, sans-serif; font-size: 14px;
      `;
      successToast.innerHTML = `✅ Project Export Started!<br><small>Downloading ${dateFilter.fromDate || dateFilter.toDate ? 'filtered' : 'all'} project records</small>`;
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
  }, [dateFilter]);

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    const validation = validateForm(projectData);
    if (!validation.isValid) return setErrors(validation.errors);

    setIsSubmitting(true);
    try {
      // Build individual site records
      const customerSiteList = [];

      (projectData.CustomerSite || []).forEach(locationGroup => {
        const state = locationGroup.state ? locationGroup.state.trim() : '';
        const location = locationGroup.location ? locationGroup.location.trim() : '';
        const validSites = (locationGroup.sites || []).filter(s =>
          s && (typeof s === 'object' ? s.name?.trim() : s?.trim())
        );

        if (validSites.length > 0) {
          validSites.forEach(site => {
            const siteName = typeof site === 'object' ? site.name.trim() : site.trim();
            const empStr = (typeof site === 'object' && site.employee_id) ? ` (Emp: ${site.employee_id})` : '';
            customerSiteList.push({
              State: state || null,
              Location: location || null,
              CustomerSite: `${siteName}${empStr}`
            });
          });
        } else if (state || location) {
          customerSiteList.push({
            State: state || null,
            Location: location || null,
            CustomerSite: null
          });
        }
      });

      const primaryEntry = customerSiteList[0] || { State: null, Location: null, CustomerSite: null };

      const payload = {
        ProjectName: projectData.ProjectName,
        CustomerID: projectData.CustomerID,
        ProjectCode: projectData.ProjectCode,
        ProjectDescription: projectData.ProjectDescription || '',
        State: primaryEntry.State,
        Location: primaryEntry.Location,
        CustomerSite: primaryEntry.CustomerSite,
        CustomerSiteList: customerSiteList,
        ProjectValue: projectData.ProjectValue,
        StartDate: projectData.StartDate,
        EndDate: projectData.EndDate,
        Status: projectData.Status || 'Active',
        // Commercials & Billing
        GSTNo: projectData.GSTNo || null,
        TypeOfBilling: projectData.TypeOfBilling || 'RCM',
        GSTRate: projectData.GSTRate || '0',
        BillingTenure: projectData.BillingTenure || null,
        BillingFromDate: projectData.BillingFromDate || null,
        BillingToDate: projectData.BillingToDate || null
      };

      if (editingProject) {
        await projectAPI.update(editingProject.ProjectID, payload);
        apiHelpers.showSuccess(`Project "${projectData.ProjectName}" has been updated successfully!`);
        resetForm();
      } else {
        const response = await projectAPI.create(payload);
        const generatedProjectCode = response.data?.ProjectCode;
        if (generatedProjectCode) {
          setProjectData(prev => ({ ...prev, ProjectCode: generatedProjectCode }));
          apiHelpers.showSuccess(`Project "${projectData.ProjectName}" has been added successfully! Generated Code: ${generatedProjectCode}`);
        } else {
          apiHelpers.showSuccess(`Project "${projectData.ProjectName}" has been added successfully!`);
        }
        clearDraft();
      }

      await fetchProjects();
    } catch (error) {
      apiHelpers.handleFormError(error, 'project');
    } finally {
      setIsSubmitting(false);
    }
  }, [projectData, validateForm, setErrors, setIsSubmitting, editingProject, setProjectData, resetForm, fetchProjects, clearDraft]);

  const handleEdit = useCallback(async (project) => {
    try {
      project = (await projectAPI.getById(project.ProjectID)).data;
    } catch { /* Fallback to table data */ }

    setEditingProject(project);
    const customer = customers.find(c => c.CustomerID.toString() === project.CustomerID.toString());
    setSelectedCustomer(customer);

    // Find all sibling rows or parse comma-separated locations for this project to load all location cards
    const siblingRows = projects.filter(p =>
      p.ProjectName && project.ProjectName &&
      p.ProjectName.trim().toLowerCase() === project.ProjectName.trim().toLowerCase() &&
      p.CustomerID.toString() === project.CustomerID.toString()
    );

    const rowsToProcess = siblingRows.length > 0 ? siblingRows : [project];
    const locationMap = new Map();

    rowsToProcess.forEach(row => {
      const locList = (row.Location || '').split(',').map(l => l.trim()).filter(Boolean);
      const stateList = (row.State || '').split(',').map(s => s.trim());
      const siteList = (row.CustomerSite || '').split(',').map(cs => cs.trim()).filter(Boolean);

      if (locList.length > 0) {
        locList.forEach((locKey, idx) => {
          const state = stateList[idx] || stateList[0] || '';
          const siteStr = siteList[idx] || '';
          let siteName = '';
          let empId = '';

          if (siteStr) {
            const empMatch = siteStr.match(/\(Emp:\s*([^)]+)\)/);
            if (empMatch) {
              empId = empMatch[1].trim();
              siteName = siteStr.replace(empMatch[0], '').trim();
            } else {
              siteName = siteStr.trim();
            }
          }

          if (!locationMap.has(locKey)) {
            locationMap.set(locKey, {
              state: state,
              location: locKey,
              sites: siteName ? [{ name: siteName, employee_id: empId }] : [{ name: '', employee_id: '' }]
            });
          }
        });
      }
    });

    const parsedCustomerSite = locationMap.size > 0
      ? Array.from(locationMap.values())
      : [{ state: '', location: '', sites: [{ name: '', employee_id: '' }] }];

    setProjectData({
      ProjectName: project.ProjectName || '',
      CustomerID: project.CustomerID || '',
      ProjectCode: project.ProjectCode || '',
      ProjectDescription: project.ProjectDescription || '',
      CustomerSite: parsedCustomerSite,
      ProjectValue: project.ProjectValue || '',
      StartDate: project.StartDate ? formatDateForInput(project.StartDate) : '',
      EndDate: project.EndDate ? formatDateForInput(project.EndDate) : '',
      Status: project.Status || 'Active',
      // Commercials & Billing
      GSTNo: project.GSTNo || '',
      TypeOfBilling: project.TypeOfBilling || 'RCM',
      GSTRate: project.GSTRate || '0',
      BillingTenure: project.BillingTenure || '',
      BillingFromDate: project.BillingFromDate ? formatDateForInput(project.BillingFromDate) : '',
      BillingToDate: project.BillingToDate ? formatDateForInput(project.BillingToDate) : ''
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [customers, projects, setEditingProject, setSelectedCustomer, setProjectData, formatDateForInput]);

  const handleDelete = useCallback(async (projectOrId) => {
    const projectId = typeof projectOrId === 'object' ? projectOrId.ProjectID : projectOrId;
    const project = typeof projectOrId === 'object' ? projectOrId : projects.find(p => p.ProjectID === projectId);
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
  }, [projects, fetchProjects]);

  const projectColumns = [
    { key: 'ProjectName', label: 'Project Name', sortable: true, minWidth: '180px' },
    { key: 'CustomerName', label: 'Customer', sortable: true, minWidth: '150px' },
    { key: 'State', label: 'State', sortable: true, minWidth: '120px', render: (val) => val || '-' },
    { key: 'Location', label: 'Location', sortable: true, minWidth: '130px', render: (val) => val || '-' },
    { key: 'CustomerSite', label: 'Customer Site', sortable: true, minWidth: '180px', render: (val) => val || '-' },
    { key: 'TypeOfBilling', label: 'Billing Type', sortable: true, minWidth: '120px', render: (val) => val || '-' },
    { key: 'ProjectValue', label: 'Value', sortable: true, minWidth: '120px', render: formatCurrency },
    { key: 'StartDate', label: 'Start Date', sortable: true, minWidth: '120px', render: formatDate },
    { key: 'EndDate', label: 'End Date', sortable: true, minWidth: '120px', render: formatDate },
    { key: 'Status', label: 'Status', sortable: true, minWidth: '100px', render: (value) => <span className={`status-badge ${value?.toLowerCase()}`}>{value || 'Active'}</span> }
  ];

  return (
    <div className="project-form-container">
      <div className="form-header">
        <h1>📁 Project Master</h1>
        {editingProject && (
          <div className="edit-notice">
            <span className="edit-notice-text">Editing: <strong>{editingProject.ProjectName}</strong></span>
            <button type="button" onClick={resetForm} className="cancel-edit-btn">Cancel Edit</button>
          </div>
        )}
        <RestoreDraftNotification isVisible={hasDraft && !editingProject} onRestore={restoreDraft} onClear={clearDraft} />
      </div>

      <div className="project-form">
        <form onSubmit={handleSubmit} noValidate>
          <div className="form-sections">
            <ProjectDetailsSection
              projectData={projectData}
              handleInputChange={handleInputChange}
              handleCustomerChange={handleCustomerChange}
              customers={customers}
              errors={errors}
              isSubmitting={isSubmitting}
            />
            <ProjectLocationSitesSection
              projectData={projectData}
              employees={employees}
              errors={errors}
              addLocation={addLocation}
              removeLocation={removeLocation}
              handleLocationStateChange={handleLocationStateChange}
              handleLocationNameChange={handleLocationNameChange}
              addSiteToLocation={addSiteToLocation}
              removeSiteFromLocation={removeSiteFromLocation}
              handleSiteChange={handleSiteChange}
            />
            <ProjectCommercialsBillingSection
              projectData={projectData}
              handleInputChange={handleInputChange}
              errors={errors}
              isSubmitting={isSubmitting}
            />
            <ProjectTimelineSection
              projectData={projectData}
              handleInputChange={handleInputChange}
              errors={errors}
              isSubmitting={isSubmitting}
            />
          </div>
          <div className="form-actions">
            <button type="submit" disabled={isSubmitting} className="submit-btn">{isSubmitting ? 'Processing...' : editingProject ? 'Update Project' : 'Add Project'}</button>
          </div>
        </form>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '15px', paddingRight: '10px' }}>
        <button
          onClick={handleExportProjects}
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
          title="Export Projects to Excel"
        >
          📊 Export to Excel
        </button>
      </div>
      <div style={{ display: 'flex', gap: '15px', alignItems: 'center', marginBottom: '15px', padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><label style={{ fontWeight: 'bold', minWidth: '80px' }}>From Date:</label><input type="date" value={dateFilter.fromDate} onChange={(e) => setDateFilter(prev => ({ ...prev, fromDate: e.target.value }))} style={{ padding: '8px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '14px' }} /></div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><label style={{ fontWeight: 'bold', minWidth: '70px' }}>To Date:</label><input type="date" value={dateFilter.toDate} onChange={(e) => setDateFilter(prev => ({ ...prev, toDate: e.target.value }))} style={{ padding: '8px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '14px' }} /></div>
        <button onClick={handleDateFilterApply} style={{ backgroundColor: '#007bff', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '4px', cursor: 'pointer', fontSize: '14px', fontWeight: 'bold' }}>🔍 Filter</button>
        <button onClick={handleDateFilterClear} style={{ backgroundColor: '#6c757d', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '4px', cursor: 'pointer', fontSize: '14px' }}>🗑️ Clear</button>
      </div>
      <DataTable title="📋 Project List" data={projects} columns={projectColumns} onEdit={handleEdit} onDelete={handleDelete} isLoading={isLoading} keyField="ProjectID" emptyMessage="No projects found. Add your first project above." defaultRowsPerPage={5} showPagination exportable={false} customizable />
    </div>
  );
};

export default ProjectFormRefactored;
