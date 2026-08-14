import React, { useState, useEffect, useRef } from 'react';
import * as xlsx from 'xlsx';
import { customerAPI, projectAPI, vehicleAPI, commercialAPI, apiHelpers } from '../services/api';
import SearchableDropdown from '../components/SearchableDropdown';
import DataTable from '../components/DataTable';
import './CustomerForm.css';

const CommercialForm = () => {
  const [formData, setFormData] = useState({
    master_customer: '',
    company_name: '',
    project: '',
    state: '',
    type_of_vehicle_placement: '',
    type_of_vehicle: '',
    type_of_body: '',
    no_of_days_per_month: '',
    hours: '',
    fixed_rate: '',
    km_include_in_fix_rate: '',
    additional_rate_per_km: '',
    toll: '',
    parking: '',
    fixed_charges_loading_unloading: '',
    da_applicable: 'No',
    da_charges: '',
    no_entry_pass_charges: '',
    above_551_lts: '',
    between_351_550_lts: '',
    description_only_sbs: '',
    handling_charges_applicable: 'No',
    handling_charges: '',
    state_tax_charges: '',
    floor_delivery_charges: '',
    driver_charges: '',
    over_time_charges: '',
    holiday_working_charges: '',
    additional_delivery_points_charges: '',
    per_kg_cost: ''
  });

  const [customers, setCustomers] = useState([]);
  const [projects, setProjects] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [commercials, setCommercials] = useState([]);
  const [isLoadingList, setIsLoadingList] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState(null);

  // File import state
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState({ current: 0, total: 0, success: 0, failed: 0 });
  const fileInputRef = useRef(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [customerRes, projectRes, vehicleRes] = await Promise.all([
          customerAPI.getAll(),
          projectAPI.getAll(),
          vehicleAPI.getAll()
        ]);
        setCustomers(customerRes.data.value || customerRes.data || []);
        setProjects(projectRes.data.value || projectRes.data || []);
        
        // Handle different vehicle data structures correctly
        const vehiclesData = vehicleRes.data?.data || (Array.isArray(vehicleRes.data) ? vehicleRes.data : []);
        setVehicles(vehiclesData);
      } catch (error) {
        console.error('Error loading data:', error);
      }
    };

    const fetchCommercials = async () => {
      setIsLoadingList(true);
      try {
        const response = await commercialAPI.getAll();
        setCommercials(response.data || []);
      } catch (error) {
        console.error('Error fetching commercials:', error);
      } finally {
        setIsLoadingList(false);
      }
    };

    loadData();
    fetchCommercials();
  }, []);

  // Master Customer: Group by name and show representative ID
  const masterCustomerOptions = Array.isArray(customers) 
    ? [...new Map(customers.map(c => [c.MasterCustomerName, c])).values()]
        .filter(c => c.MasterCustomerName)
        .map(c => ({
          name: c.MasterCustomerName,
          displayText: `${c.MasterCustomerName} / ${c.CustomerID}`
        }))
    : [];
    
  // Project: Show projects filtered by the selected Company or Master Customer
  const projectOptions = Array.isArray(projects)
    ? projects
        .filter(p => {
          // If a specific company is selected, filter projects for that company
          if (formData.company_name) {
            return p.CustomerID.toString() === formData.company_name.toString();
          }
          // If only a Master Customer is selected, filter projects for all customers in that group
          if (formData.master_customer) {
            const relatedCustomerIds = customers
              .filter(c => c.MasterCustomerName === formData.master_customer)
              .map(c => c.CustomerID.toString());
            return relatedCustomerIds.includes(p.CustomerID.toString());
          }
          // If nothing selected, show all
          return true;
        })
        .map(p => ({
          id: p.ProjectID,
          name: p.ProjectName,
          displayText: `${p.ProjectName} / ${p.ProjectID}`
        }))
    : [];
    
  const stateOptions = [
    "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Goa", "Gujarat", 
    "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh", 
    "Maharashtra", "Manipur", "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab", 
    "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh", 
    "Uttarakhand", "West Bengal", "Andaman and Nicobar Islands", "Chandigarh", 
    "Dadra and Nagar Haveli and Daman and Diu", "Delhi", "Jammu and Kashmir", 
    "Ladakh", "Lakshadweep", "Puducherry"
  ];
  
  // Standard options from Add Vehicle Form
  const standardVehicleTypes = ['LP', 'LPT', 'Tata Ace', 'Pickup', 'Tata 407 10ft', 'Tata 407 14ft', 'Eicher 17ft'];
  const standardBodyTypes = ['Open', 'CBD', 'Container'];

  // Combine standard options with any unique types found in existing vehicles
  const vehicleTypeOptions = Array.isArray(vehicles)
    ? [...new Set([...standardVehicleTypes, ...vehicles.map(v => v.VehicleType).filter(Boolean)])]
    : standardVehicleTypes;
    
  const bodyTypeOptions = Array.isArray(vehicles)
    ? [...new Set([...standardBodyTypes, ...vehicles.map(v => v.TypeOfBody).filter(Boolean)])]
    : standardBodyTypes;

  // Fixed options as per Daily Entry Form
  const placementOptions = ["Fixed", "Adhoc", "Replacement"];
  
  // Optionally filter company names by the selected master customer
  const companyNameOptions = Array.isArray(customers)
    ? customers
        .filter(c => formData.master_customer ? c.MasterCustomerName === formData.master_customer : true)
        .map(c => ({
          id: c.CustomerID,
          name: c.Name,
          displayText: `${c.Name} / ${c.CustomerID}`
        }))
        .filter(opt => opt.name)
    : [];

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    setFormData(prev => {
      const newData = { ...prev, [name]: value };
      
      // Cascading logic: reset children when parent changes
      if (name === 'master_customer') {
        newData.company_name = '';
        newData.project = '';
      } else if (name === 'company_name') {
        newData.project = '';
      }
      
      return newData;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      // Prepare the data for submission
      // Convert numeric strings to actual numbers and "Yes/No" to 1/0
      const saveData = { ...formData };
      
      // Numeric fields (Decimals and Integers)
      const numericFields = [
        'no_of_days_per_month', 'hours', 'fixed_rate', 'km_include_in_fix_rate',
        'additional_rate_per_km', 'toll', 'parking', 'fixed_charges_loading_unloading',
        'da_charges', 'no_entry_pass_charges', 'above_551_lts', 'between_351_550_lts',
        'handling_charges', 'state_tax_charges', 'floor_delivery_charges',
        'driver_charges', 'over_time_charges', 'holiday_working_charges',
        'additional_delivery_points_charges', 'per_kg_cost'
      ];
      
      numericFields.forEach(field => {
        if (saveData[field] !== '' && saveData[field] !== null) {
          saveData[field] = parseFloat(saveData[field]);
        } else {
          saveData[field] = null;
        }
      });
      
      // Boolean fields (tinyint in DB)
      saveData.da_applicable = formData.da_applicable === 'Yes' ? 1 : 0;
      saveData.handling_charges_applicable = formData.handling_charges_applicable === 'Yes' ? 1 : 0;
      
      // Format Company and Project as "Name / ID" for database storage as requested
      // Extract IDs for the new database structure
      let extractedCustomerId = null;
      let extractedProjectId = null;
      
      if (typeof saveData.company_name === 'string' && saveData.company_name.includes('/')) {
        const parts = saveData.company_name.split('/');
        extractedCustomerId = parts[parts.length - 1].trim();
      } else if (saveData.company_name) {
        extractedCustomerId = saveData.company_name;
      }
      
      if (typeof saveData.project === 'string' && saveData.project.includes('/')) {
        const parts = saveData.project.split('/');
        extractedProjectId = parts[parts.length - 1].trim();
      } else if (saveData.project) {
        extractedProjectId = saveData.project;
      }
      
      saveData.customer_id = extractedCustomerId;
      saveData.project_id = extractedProjectId;

      if (extractedCustomerId) {
        const company = customers.find(c => c.CustomerID.toString() === extractedCustomerId.toString());
        if (company) {
          saveData.company_name = `${company.Name} / ${company.CustomerID}`;
        }
      }
      
      if (extractedProjectId) {
        const proj = projects.find(p => p.ProjectID.toString() === extractedProjectId.toString());
        if (proj) {
          saveData.project = `${proj.ProjectName} / ${proj.ProjectID}`;
        }
      }

      console.log('Final Payload to DB:', saveData);
      
      let response;
      if (isEditing) {
        response = await commercialAPI.update(editId, saveData);
      } else {
        response = await commercialAPI.create(saveData);
      }
      
      if (response.status === 201 || response.status === 200) {
        apiHelpers.showSuccess(isEditing ? 'Agreement updated successfully!' : 'Agreement saved successfully!');
        
        // Reset state
        if (isEditing) {
          setIsEditing(false);
          setEditId(null);
        }
        
        // Refresh the list after save
        try {
          const listResponse = await commercialAPI.getAll();
          setCommercials(listResponse.data || []);
        } catch (fetchErr) {
          console.error('Error refreshing list after save:', fetchErr);
        }
        
        // Reset form for new entry or after edit
        if (!isEditing) {
          setFormData(prev => ({
            ...prev,
            project: '',
            fixed_rate: '',
            km_include_in_fix_rate: '',
            additional_rate_per_km: '',
            toll: '',
            parking: '',
            fixed_charges_loading_unloading: '',
            da_charges: '',
            no_entry_pass_charges: '',
            above_551_lts: '',
            between_351_550_lts: '',
            description_only_sbs: '',
            handling_charges: '',
            state_tax_charges: '',
            floor_delivery_charges: '',
            driver_charges: '',
            over_time_charges: '',
            holiday_working_charges: '',
            additional_delivery_points_charges: '',
            per_kg_cost: ''
          }));
        } else {
          // Reset everything after edit
          setFormData({
            master_customer: '', company_name: '', project: '', state: '',
            type_of_vehicle_placement: 'Fixed', type_of_vehicle: '', type_of_body: '',
            no_of_days_per_month: '', hours: '', fixed_rate: '',
            km_include_in_fix_rate: '', additional_rate_per_km: '', toll: '',
            parking: '', fixed_charges_loading_unloading: '', da_applicable: 'No',
            da_charges: '', no_entry_pass_charges: '', above_551_lts: '',
            between_351_550_lts: '', description_only_sbs: '',
            handling_charges_applicable: 'No', handling_charges: '',
            state_tax_charges: '', floor_delivery_charges: '',
            driver_charges: '', over_time_charges: '', holiday_working_charges: '',
            additional_delivery_points_charges: '', per_kg_cost: ''
          });
        }
      }
    } catch (error) {
      console.error('Submission Error:', error);
      apiHelpers.handleFormError(error, 'Customer Commercial Form');
    }
  };

  // --- Excel Import Functionality ---

  const getCellValue = (row, fieldNames) => {
    for (const field of fieldNames) {
      if (row[field] !== undefined && row[field] !== null && row[field] !== "") {
        return row[field];
      }
    }
    return "";
  };

  const formatExcelDate = (dateVal) => {
    if (!dateVal) return null;
    if (dateVal instanceof Date) return dateVal.toISOString().split('T')[0];
    
    // Excel serial date handling
    if (typeof dateVal === 'number' && dateVal > 25569) {
      const d = new Date(Math.round((dateVal - 25569) * 86400 * 1000));
      return d.toISOString().split('T')[0];
    }
    
    // String date handling
    const str = String(dateVal).trim();
    if (str.match(/^\d{4}-\d{2}-\d{2}/)) return str; // ALready YYYY-MM-DD
    
    const parts = str.split(/[-/]/);
    if (parts.length === 3) {
      // Try to parse common formats like DD-MM-YYYY or MM-DD-YYYY
      let d = new Date(str);
      if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
    }
    
    return str;
  };

  const parseNumeric = (val) => {
    if (val === undefined || val === null || val === "") return null;
    // Remove currency symbols and commas
    const cleaned = String(val).replace(/[₹,]/g, '').trim();
    if (cleaned === "") return null;
    const num = Number(cleaned);
    return isNaN(num) ? null : num;
  };

  const handleExcelImport = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    setImportProgress({ current: 0, total: 0, success: 0, failed: 0 });

    try {
      const data = await file.arrayBuffer();
      const workbook = xlsx.read(data);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = xlsx.utils.sheet_to_json(worksheet, { defval: "" });

      if (jsonData.length === 0) {
        throw new Error('Excel file is empty.');
      }

      const totalRows = jsonData.length;
      let successCount = 0;
      let failedCount = 0;

      for (let i = 0; i < totalRows; i++) {
        setImportProgress({ current: i + 1, total: totalRows, success: successCount, failed: failedCount });
        const row = jsonData[i];

        try {
          // Normalize the entire row object for case-insensitive and space-neutral matching
          const normalizedRow = {};
          Object.keys(row).forEach(key => {
            const normalizedKey = String(key).toLowerCase().replace(/\s+/g, '');
            normalizedRow[normalizedKey] = row[key];
          });

          // Helper to get normalized value
          const getVal = (aliases) => {
            for (const alias of aliases) {
              const normAlias = String(alias).toLowerCase().replace(/\s+/g, '');
              if (normalizedRow[normAlias] !== undefined && normalizedRow[normAlias] !== null && normalizedRow[normAlias] !== "") {
                return normalizedRow[normAlias];
              }
            }
            return "";
          };

          // Resolve Company ID if name provided instead of ID
          let resolvedCompanyId = getVal(['company_name', 'Company Name', 'Company', 'Company / ID']);
          if (resolvedCompanyId && customers.length > 0) {
            // Extract ID if in "Name / ID" format
            if (typeof resolvedCompanyId === 'string' && resolvedCompanyId.includes('/')) {
              const parts = resolvedCompanyId.split('/');
              resolvedCompanyId = parts[parts.length - 1].trim();
            }
            
            const foundC = customers.find(c => 
              c.CustomerID.toString() === resolvedCompanyId.toString() || 
              (c.Name && String(c.Name).toLowerCase() === String(resolvedCompanyId).toLowerCase())
            );
            if (foundC) resolvedCompanyId = foundC.CustomerID;
          }

          // Resolve Project ID if name provided instead of ID
          let resolvedProjectId = getVal(['project', 'Project', 'ProjectID', 'Project ID', 'Project / ID']);
          if (resolvedProjectId && projects.length > 0) {
            // Extract ID if in "Name / ID" format
            if (typeof resolvedProjectId === 'string' && resolvedProjectId.includes('/')) {
              const parts = resolvedProjectId.split('/');
              resolvedProjectId = parts[parts.length - 1].trim();
            }
            
            const foundP = projects.find(p => 
              p.ProjectID.toString() === resolvedProjectId.toString() || 
              (p.ProjectName && String(p.ProjectName).toLowerCase() === String(resolvedProjectId).toLowerCase())
            );
            if (foundP) resolvedProjectId = foundP.ProjectID;
          }

          const payload = {
            master_customer: getVal(['master_customer', 'Master Customer', 'Customer']),
            company_name: resolvedCompanyId && customers.length > 0 
              ? `${customers.find(c => c.CustomerID.toString() === resolvedCompanyId.toString())?.Name || ''} / ${resolvedCompanyId}`
              : getVal(['company_name', 'Company Name', 'Company', 'Company / ID']),
            project: resolvedProjectId && projects.length > 0
              ? `${projects.find(p => p.ProjectID.toString() === resolvedProjectId.toString())?.ProjectName || ''} / ${resolvedProjectId}`
              : getVal(['project', 'Project', 'ProjectID', 'Project ID', 'Project / ID']),
            state: getVal(['state', 'State']),
            type_of_vehicle_placement: getVal(['type_of_vehicle_placement', 'Vehicle Placement', 'Placement Type', 'Placement']) || 'Fixed',
            type_of_vehicle: getVal(['type_of_vehicle', 'Vehicle Type', 'Type of Vehicle', 'Vehicle']),
            type_of_body: getVal(['type_of_body', 'Body Type', 'Type of Body', 'Body']),
            no_of_days_per_month: parseNumeric(getVal(['no_of_days_per_month', 'Days Per Month', 'No of Days', 'Days/Month', 'No. of Days / Month'])),
            hours: parseNumeric(getVal(['hours', 'Hours'])),
            fixed_rate: parseNumeric(getVal(['fixed_rate', 'Fixed Rate'])),
            km_include_in_fix_rate: parseNumeric(getVal(['km_include_in_fix_rate', 'KM Included', 'Included KM', 'KM Inc', 'KM Include in Fix Rate'])),
            additional_rate_per_km: parseNumeric(getVal(['additional_rate_per_km', 'Additional Rate KM', 'Extra KM Rate', 'Extra KM', 'Additional Rate per KM'])),
            toll: parseNumeric(getVal(['toll', 'Toll'])),
            parking: parseNumeric(getVal(['parking', 'Parking'])),
            fixed_charges_loading_unloading: parseNumeric(getVal(['fixed_charges_loading_unloading', 'Loading Unloading Charges', 'Loading/Unloading', 'Fixed Charges for Loading / Unloading'])),
            da_applicable: (getVal(['da_applicable', 'DA Applicable', 'DA?']) === 'Yes' || getVal(['da_applicable', 'DA Applicable', 'DA?']) == 1 || String(getVal(['da_applicable', 'DA?'])).includes('✅')) ? 1 : 0,
            da_charges: parseNumeric(getVal(['da_charges', 'DA Charges'])),
            no_entry_pass_charges: parseNumeric(getVal(['no_entry_pass_charges', 'No Entry Pass Charges', 'No Entry Pass'])),
            above_551_lts: parseNumeric(getVal(['above_551_lts', 'Above 551 Lts', '>551 Lts', '(>551) Lts'])),
            between_351_550_lts: parseNumeric(getVal(['between_351_550_lts', 'Between 351-550 Lts', '351-550 Lts', '(351–550) Lts'])),
            description_only_sbs: getVal(['description_only_sbs', 'Description', 'If Description Only SBS']),
            handling_charges_applicable: (getVal(['handling_charges_applicable', 'Handling Applicable', 'Handling?']) === 'Yes' || getVal(['handling_charges_applicable', 'Handling Applicable', 'Handling?']) == 1 || String(getVal(['handling_charges_applicable', 'Handling?'])).includes('✅')) ? 1 : 0,
            handling_charges: parseNumeric(getVal(['handling_charges', 'Handling Charges'])),
            state_tax_charges: parseNumeric(getVal(['state_tax_charges', 'State Tax Charges', 'State Tax'])),
            floor_delivery_charges: parseNumeric(getCellValue(row, ['floor_delivery_charges', 'Floor Delivery Charges', 'Floor Delivery'])),
            driver_charges: parseNumeric(getVal(['driver_charges', 'Driver Charges'])),
            over_time_charges: parseNumeric(getVal(['over_time_charges', 'Over Time Charges', 'Over Time'])),
            holiday_working_charges: parseNumeric(getVal(['holiday_working_charges', 'Holiday Working Charges', 'Holiday Working'])),
            additional_delivery_points_charges: parseNumeric(getVal(['additional_delivery_points_charges', 'Additional Points Charges', 'Addl Points', 'Additional Delivery Points Charges'])),
            per_kg_cost: parseNumeric(getVal(['per_kg_cost', 'Per Kg Cost']))
          };
          
          console.log(`Row ${i + 1} Parsed Payload:`, payload);

          await commercialAPI.create(payload);
          successCount++;
        } catch (rowErr) {
          const errorDetail = rowErr.response?.data?.message || rowErr.response?.data?.error || rowErr.message;
          console.error(`❌ Error importing row ${i + 1}:`, errorDetail);
          failedCount++;
        }
      }

      apiHelpers.showSuccess(`Import completed! Success: ${successCount}, Failed: ${failedCount}`);
      // Refresh list
      const listResponse = await commercialAPI.getAll();
      setCommercials(listResponse.data || []);
      
    } catch (error) {
      console.error('Excel Import Error:', error);
      apiHelpers.showError(error, 'Failed to import Excel file. Check format and try again.');
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleEdit = (item) => {
    setIsEditing(true);
    setEditId(item.id);
    
    // Map database values back to form structure
    const editData = { ...item };

    // Extract raw ID from combined "Name / ID" string for dropdowns
    if (editData.company_name && String(editData.company_name).includes(' / ')) {
      const parts = editData.company_name.split(' / ');
      editData.company_name = parts[parts.length - 1].trim();
    }
    
    if (editData.project && String(editData.project).includes(' / ')) {
      const parts = editData.project.split(' / ');
      editData.project = parts[parts.length - 1].trim();
    }
    
    // Convert numbers back to strings for form inputs
    Object.keys(editData).forEach(key => {
      if (editData[key] === null) editData[key] = '';
    });
    
    // Convert 1/0 back to Yes/No
    editData.da_applicable = item.da_applicable === 1 ? 'Yes' : 'No';
    editData.handling_charges_applicable = item.handling_charges_applicable === 1 ? 'Yes' : 'No';
    
    setFormData(editData);
    
    // Scroll to top of form
    window.scrollTo({ top: 0, behavior: 'smooth' });
    apiHelpers.showSuccess('Form loaded for editing');
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditId(null);
    setFormData({
      master_customer: '', company_name: '', project: '', state: '',
      type_of_vehicle_placement: 'Fixed', type_of_vehicle: '', type_of_body: '',
      no_of_days_per_month: '', hours: '', fixed_rate: '',
      km_include_in_fix_rate: '', additional_rate_per_km: '', toll: '',
      parking: '', fixed_charges_loading_unloading: '', da_applicable: 'No',
      da_charges: '', no_entry_pass_charges: '', above_551_lts: '',
      between_351_550_lts: '', description_only_sbs: '',
      handling_charges_applicable: 'No', handling_charges: '',
      state_tax_charges: '', floor_delivery_charges: '',
      driver_charges: '', over_time_charges: '', holiday_working_charges: '',
      additional_delivery_points_charges: '', per_kg_cost: ''
    });
  };

  const handleDelete = async (item) => {
    if (!window.confirm('Are you sure you want to delete this commercial agreement?')) return;
    
    try {
      await commercialAPI.delete(item.id);
      apiHelpers.showSuccess('Commercial agreement deleted.');
      setCommercials(prev => prev.filter(c => c.id !== item.id));
    } catch (error) {
      apiHelpers.handleError(error, 'Could not delete agreement');
    }
  };

  const handleBulkDelete = async (ids) => {
    if (!window.confirm(`Are you sure you want to delete ${ids.length} agreements?`)) return;

    try {
      await commercialAPI.bulkDelete(ids);
      apiHelpers.showSuccess('Records deleted successfully.');
      setCommercials(prev => prev.filter(c => !ids.includes(c.id)));
    } catch (error) {
      apiHelpers.handleError(error, 'Bulk delete failed');
    }
  };

  const tableColumns = [
    { key: 'master_customer', label: 'Master Customer', sortable: true },
    { key: 'company_name', label: 'Company / ID', sortable: true, render: (val) => {
      const company = customers.find(c => c.CustomerID.toString() === val?.toString());
      return company ? `${company.Name} / ${val}` : val;
    }},
    { key: 'project', label: 'Project / ID', sortable: true, render: (val) => {
      const proj = projects.find(p => p.ProjectID.toString() === val?.toString());
      return proj ? `${proj.ProjectName} / ${val}` : val;
    }},
    { key: 'state', label: 'State', sortable: true },
    { key: 'type_of_vehicle_placement', label: 'Placement', sortable: true },
    { key: 'type_of_vehicle', label: 'Vehicle', sortable: true },
    { key: 'type_of_body', label: 'Body', sortable: true },
    { key: 'no_of_days_per_month', label: 'Days/Month', sortable: true },
    { key: 'hours', label: 'Hours', sortable: true },
    { key: 'fixed_rate', label: 'Fixed Rate', sortable: true, render: (val) => val ? `₹${val}` : '-' },
    { key: 'km_include_in_fix_rate', label: 'KM Inc', sortable: true },
    { key: 'additional_rate_per_km', label: 'Extra KM', sortable: true },
    { key: 'toll', label: 'Toll', sortable: true },
    { key: 'parking', label: 'Parking', sortable: true },
    { key: 'fixed_charges_loading_unloading', label: 'Loading/Unloading', sortable: true },
    { key: 'da_applicable', label: 'DA?', sortable: true, render: (val) => val ? '✅ Yes' : '❌ No' },
    { key: 'da_charges', label: 'DA Charges', sortable: true },
    { key: 'no_entry_pass_charges', label: 'No Entry Pass', sortable: true },
    { key: 'above_551_lts', label: '>551 Lts', sortable: true },
    { key: 'between_351_550_lts', label: '351-550 Lts', sortable: true },
    { key: 'handling_charges_applicable', label: 'Handling?', sortable: true, render: (val) => val ? '✅ Yes' : '❌ No' },
    { key: 'handling_charges', label: 'Handling Charges', sortable: true },
    { key: 'state_tax_charges', label: 'State Tax', sortable: true },
    { key: 'floor_delivery_charges', label: 'Floor Delivery', sortable: true },
    { key: 'driver_charges', label: 'Driver Charges', sortable: true },
    { key: 'over_time_charges', label: 'Over Time', sortable: true },
    { key: 'holiday_working_charges', label: 'Holiday Working', sortable: true },
    { key: 'additional_delivery_points_charges', label: 'Addl Points', sortable: true },
    { key: 'per_kg_cost', label: 'Per Kg Cost', sortable: true },
    { key: 'created_at', label: 'Added On', sortable: true, render: (val) => val ? new Date(val).toLocaleDateString() : '-' }
  ];

  return (
    <div className="customer-form-container commercial-form-wrapper">
      <div className="form-header">
        <h2>Customer Commercial</h2>
      </div>
      
      <div className="customer-form">
        <form onSubmit={handleSubmit} className="form-sections">
          <div className="form-section">
            <h4>Basic Details</h4>
            <div className="form-grid">
            <div className="form-group">
              <label>Master Customer</label>
              <SearchableDropdown
                name="master_customer"
                value={formData.master_customer}
                onChange={handleChange}
                options={masterCustomerOptions}
                labelKey="displayText"
                valueKey="name"
                placeholder="Search/Select Master Customer"
              />
            </div>
            
            <div className="form-group">
              <label>Company Name</label>
              <SearchableDropdown
                name="company_name"
                value={formData.company_name}
                onChange={handleChange}
                options={companyNameOptions}
                labelKey="displayText"
                valueKey="id"
                placeholder="Search/Select Company Name"
              />
            </div>
            
            <div className="form-group">
              <label>Project</label>
              <SearchableDropdown
                name="project"
                value={formData.project}
                onChange={handleChange}
                options={projectOptions}
                labelKey="displayText"
                valueKey="id"
                placeholder="Search/Select Project"
              />
            </div>

            <div className="form-group">
              <label>State</label>
              <SearchableDropdown
                name="state"
                value={formData.state}
                onChange={handleChange}
                options={stateOptions}
                placeholder="Search/Select State"
              />
            </div>
          </div>
          
          <div className="form-grid">
            <div className="form-group">
              <label>Type of Vehicle Placement</label>
              <select name="type_of_vehicle_placement" value={formData.type_of_vehicle_placement} onChange={handleChange} className="form-input">
                <option value="">Select Placement</option>
                {placementOptions.map(option => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </div>
            
            <div className="form-group">
              <label>Type of Vehicle</label>
              <select name="type_of_vehicle" value={formData.type_of_vehicle} onChange={handleChange} className="form-input">
                <option value="">Select Vehicle</option>
                {vehicleTypeOptions.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>
            
            <div className="form-group">
              <label>Type of Body</label>
              <select name="type_of_body" value={formData.type_of_body} onChange={handleChange} className="form-input">
                <option value="">Select Body</option>
                {bodyTypeOptions.map(body => (
                  <option key={body} value={body}>{body}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="form-section">
          <h4>Rates & Charges</h4>
          <div className="form-grid">
            <div className="form-group">
              <label>No. of Days / Month</label>
              <input type="number" name="no_of_days_per_month" value={formData.no_of_days_per_month} onChange={handleChange} className="form-input" />
            </div>
            <div className="form-group">
              <label>Hours</label>
              <input type="number" name="hours" value={formData.hours} onChange={handleChange} className="form-input" />
            </div>
            <div className="form-group">
              <label>Fixed Rate</label>
              <input type="number" step="0.01" name="fixed_rate" value={formData.fixed_rate} onChange={handleChange} className="form-input" />
            </div>
            <div className="form-group">
              <label>KM Include in Fix Rate</label>
              <input type="number" step="0.01" name="km_include_in_fix_rate" value={formData.km_include_in_fix_rate} onChange={handleChange} className="form-input" />
            </div>
            <div className="form-group">
              <label>Additional Rate per KM</label>
              <input type="number" step="0.01" name="additional_rate_per_km" value={formData.additional_rate_per_km} onChange={handleChange} className="form-input" />
            </div>
            <div className="form-group">
              <label>Toll</label>
              <input type="number" step="0.01" name="toll" value={formData.toll} onChange={handleChange} className="form-input" />
            </div>
            <div className="form-group">
              <label>Parking</label>
              <input type="number" step="0.01" name="parking" value={formData.parking} onChange={handleChange} className="form-input" />
            </div>
            <div className="form-group">
              <label>Fixed Charges for Loading / Unloading</label>
              <input type="number" step="0.01" name="fixed_charges_loading_unloading" value={formData.fixed_charges_loading_unloading} onChange={handleChange} className="form-input" />
            </div>
          </div>
        </div>

        <div className="form-section">
          <h4>SBS Charges (RIL)</h4>
          <div className="form-grid">
            <div className="form-group">
              <label>DA Applicable</label>
              <select name="da_applicable" value={formData.da_applicable} onChange={handleChange} className="form-input">
                <option value="Yes">Yes</option>
                <option value="No">No</option>
              </select>
            </div>
            {formData.da_applicable === 'Yes' && (
              <div className="form-group">
                <label>DA Charges</label>
                <input type="number" step="0.01" name="da_charges" value={formData.da_charges} onChange={handleChange} className="form-input" />
              </div>
            )}
            <div className="form-group">
              <label>No Entry Pass Charges</label>
              <input type="number" step="0.01" name="no_entry_pass_charges" value={formData.no_entry_pass_charges} onChange={handleChange} className="form-input" />
            </div>
            <div className="form-group">
              <label>{'(>551) Lts'}</label>
              <input type="number" step="0.01" name="above_551_lts" value={formData.above_551_lts} onChange={handleChange} className="form-input" />
            </div>
            <div className="form-group">
              <label>{'(351–550) Lts'}</label>
              <input type="number" step="0.01" name="between_351_550_lts" value={formData.between_351_550_lts} onChange={handleChange} className="form-input" />
            </div>
            <div className="form-group">
              <label>If Description Only SBS</label>
              <input type="text" name="description_only_sbs" value={formData.description_only_sbs} onChange={handleChange} className="form-input" />
            </div>
          </div>
        </div>

        <div className="form-section">
          <h4>Other Charges</h4>
          <div className="form-grid">
            <div className="form-group">
              <label>Handling Charges Applicable</label>
              <select name="handling_charges_applicable" value={formData.handling_charges_applicable} onChange={handleChange} className="form-input">
                <option value="Yes">Yes</option>
                <option value="No">No</option>
              </select>
            </div>
            {formData.handling_charges_applicable === 'Yes' && (
              <div className="form-group">
                <label>Handling Charges</label>
                <input type="number" step="0.01" name="handling_charges" value={formData.handling_charges} onChange={handleChange} className="form-input" />
              </div>
            )}
            <div className="form-group">
              <label>State Tax Charges</label>
              <input type="number" step="0.01" name="state_tax_charges" value={formData.state_tax_charges} onChange={handleChange} className="form-input" />
            </div>
            <div className="form-group">
              <label>Floor Delivery Charges</label>
              <input type="number" step="0.01" name="floor_delivery_charges" value={formData.floor_delivery_charges} onChange={handleChange} className="form-input" />
            </div>
            <div className="form-group">
              <label>Driver Charges</label>
              <input type="number" step="0.01" name="driver_charges" value={formData.driver_charges} onChange={handleChange} className="form-input" />
            </div>
            <div className="form-group">
              <label>Over Time Charges</label>
              <input type="number" step="0.01" name="over_time_charges" value={formData.over_time_charges} onChange={handleChange} className="form-input" />
            </div>
            <div className="form-group">
              <label>Holiday Working Charges</label>
              <input type="number" step="0.01" name="holiday_working_charges" value={formData.holiday_working_charges} onChange={handleChange} className="form-input" />
            </div>
            <div className="form-group">
              <label>Additional Delivery Points Charges</label>
              <input type="number" step="0.01" name="additional_delivery_points_charges" value={formData.additional_delivery_points_charges} onChange={handleChange} className="form-input" />
            </div>
            <div className="form-group">
              <label>Per KG Cost</label>
              <input type="number" step="0.01" name="per_kg_cost" value={formData.per_kg_cost} onChange={handleChange} className="form-input" />
            </div>
          </div>
        </div>

        <div className="form-actions">
          {isEditing && (
            <button 
              type="button" 
              className="btn btn-secondary" 
              onClick={handleCancelEdit}
              style={{ marginRight: '10px' }}
            >
              Cancel Edit
            </button>
          )}
          <button type="submit" className="btn btn-primary submit-btn">
            {isEditing ? 'Update Commercial' : 'Save Commercial'}
          </button>
        </div>
        </form>
      </div>

      <div className="commercial-list-section" style={{ marginTop: '40px' }}>
        <DataTable
          title="Saved Commercial Agreements"
          data={commercials}
          columns={tableColumns}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onBulkDelete={handleBulkDelete}
          isLoading={isLoadingList}
          keyField="id"
          bulkSelectable={true}
          exportable={true}
          exportFilename="customer_commercials"
          renderExtraControls={
            <div className="import-actions" style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              {isImporting && (
                <div className="import-status" style={{ fontSize: '12px', color: '#666', fontWeight: '500' }}>
                  {importProgress.current}/{importProgress.total}...
                </div>
              )}
              <input
                type="file"
                ref={fileInputRef}
                style={{ display: 'none' }}
                accept=".xlsx, .xls"
                onChange={handleExcelImport}
              />
              <button
                className="export-btn"
                onClick={() => fileInputRef.current?.click()}
                disabled={isImporting}
                title="Import Commercials from Excel"
                style={{
                  backgroundColor: '#28a745',
                  color: 'white',
                  border: 'none',
                  padding: '10px 20px',
                  borderRadius: '6px',
                  cursor: isImporting ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                  fontWeight: '500',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  boxShadow: '0 2px 4px rgba(40,167,69,0.3)'
                }}
              >
                {isImporting ? '⌛' : '📥'} Import Excel
              </button>
            </div>
          }
        />
      </div>
    </div>
  );
};

export default CommercialForm;
