import React, { useState, useEffect } from 'react';
import FormLayout from '../components/FormLayout';
import SearchableDropdown from '../components/SearchableDropdown';
import DataTable from '../components/DataTable';
import { showNotification } from '../components/Notification';
import './VehicleProjectLinking.css';

const VehicleProjectLinking = () => {

    // Form state
    const [formData, setFormData] = useState({
        customer: null,
        project: null,
        vendor: null,
        vehicle: null,
        driver: null,
        placementType: 'Fixed' // Default to Fixed
    });

    // Dropdown data
    const [customers, setCustomers] = useState([]);
    const [projects, setProjects] = useState([]);
    const [vendors, setVendors] = useState([]);
    const [vehicles, setVehicles] = useState([]);
    const [drivers, setDrivers] = useState([]);

    // UI state
    const [loading, setLoading] = useState(false);

    // State for assignments table
    const [assignments, setAssignments] = useState([]);
    const [assignmentsLoading, setAssignmentsLoading] = useState(true);


    const [isSubmitting, setIsSubmitting] = useState(false);

    // API base URL
    const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000') + '/api/vehicle-project-linking';



    // Load initial data
    useEffect(() => {
        loadCustomers();
        loadVendors();
        loadAllDrivers(); // Load all drivers immediately on component mount
        loadAssignments();
    }, []);

    // Load customers
    const loadCustomers = async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/customers`);
            const data = await response.json();
            if (data.success) {
                setCustomers(data.data);
            } else {
                showNotification('Failed to load customers', 'error');
            }
        } catch (error) {
            console.error('Error loading customers:', error);
            showNotification('Error loading customers', 'error');
        }
    };

    // Load vendors
    const loadVendors = async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/vendors`);
            const data = await response.json();
            if (data.success) {
                setVendors(data.data);
            } else {
                showNotification('Failed to load vendors', 'error');
            }
        } catch (error) {
            console.error('Error loading vendors:', error);
            showNotification('Error loading vendors', 'error');
        }
    };

    // Load projects for selected customer
    const loadCustomerProjects = async (customerId) => {
        if (!customerId) {
            setProjects([]);
            return;
        }

        setLoading(true);
        try {
            const response = await fetch(`${API_BASE_URL}/projects/customer/${customerId}`);
            const data = await response.json();

            if (data.success) {
                if (data.data.length === 0) {
                    showNotification('No projects assigned to this customer', 'warning');
                    setProjects([]);
                } else if (data.data.length === 1) {
                    // Auto-select if only one project (no dropdown needed)
                    setProjects(data.data);
                    setFormData(prev => ({
                        ...prev,
                        project: data.data[0]
                    }));
                } else {
                    // Multiple projects - show dropdown
                    setProjects(data.data);
                }
            } else {
                showNotification('Failed to load customer projects', 'error');
                setProjects([]);
            }
        } catch (error) {
            console.error('Error loading customer projects:', error);
            showNotification('Error loading customer projects', 'error');
            setProjects([]);
        } finally {
            setLoading(false);
        }
    };

    // Load all vehicles when vendor is selected
    const loadVendorVehicles = async (vendorId) => {
        if (!vendorId) {
            setVehicles([]);
            return;
        }

        setLoading(true);
        try {
            // Load ALL vehicles instead of filtering by vendor
            const response = await fetch('/api/vehicles');
            const data = await response.json();

            if (data.success) {
                // Transform the data to match expected format
                const vehicleData = data.data || [];
                const transformedVehicles = vehicleData.map(vehicle => ({
                    vehicle_id: vehicle.VehicleID,
                    vehicle_number: vehicle.VehicleRegistrationNo,
                    vehicle_model: vehicle.VehicleModel,
                    vehicle_code: vehicle.VehicleCode,
                    type_of_body: vehicle.TypeOfBody
                }));

                setVehicles(transformedVehicles);

                if (transformedVehicles.length === 0) {
                    showNotification('No vehicles available', 'warning');
                }
            } else {
                showNotification('Failed to load vehicles', 'error');
                setVehicles([]);
            }
        } catch (error) {
            console.error('Error loading vehicles:', error);
            showNotification('Error loading vehicles', 'error');
            setVehicles([]);
        } finally {
            setLoading(false);
        }
    };

    // Load all drivers (independent of vendor)
    const loadAllDrivers = async () => {
        setLoading(true);
        try {
            const response = await fetch('/api/drivers');
            const data = await response.json();

            // Backend returns a plain array (not {success, data}) for /api/drivers
            const driverArray = Array.isArray(data) ? data : (data?.data || data?.rows || []);

            const transformedDrivers = (driverArray || []).map(driver => ({
                driver_id: driver.DriverID,
                driver_name: driver.DriverName,
                driver_licence_no: driver.DriverLicenceNo,
                driver_mobile: driver.DriverMobileNo,
                driver_experience: driver.DriverTotalExperience
            }));

            setDrivers(transformedDrivers);

            if (transformedDrivers.length === 0) {
                showNotification('No drivers available', 'warning');
            }
        } catch (error) {
            console.error('Error loading drivers:', error);
            showNotification('Error loading drivers', 'error');
            setDrivers([]);
        } finally {
            setLoading(false);
        }
    };



    // Handle customer selection
    const handleCustomerChange = (e) => {
        const customerId = e.target.value;
        const customer = customers.find(c => c.customer_id.toString() === customerId.toString());
        setFormData(prev => ({
            ...prev,
            customer: customer,
            project: null // Reset project when customer changes
        }));
        setProjects([]);

        if (customer) {
            loadCustomerProjects(customer.customer_id);
        }
    };

    // Handle vendor selection
    const handleVendorChange = (e) => {
        const vendorId = e.target.value;
        const vendor = vendors.find(v => v.vendor_id.toString() === vendorId.toString());
        setFormData(prev => ({
            ...prev,
            vendor: vendor,
            vehicle: null, // Reset vehicle when vendor changes
            driver: null   // Reset driver when vendor changes (though drivers are now independent of vendor)
        }));
        setVehicles([]);
        // Do not clear drivers; drivers are global now

        if (vendor) {
            loadVendorVehicles(vendor.vendor_id);
            // Do not filter drivers by vendor anymore
        }
    };

    // Handle project selection
    const handleProjectChange = (e) => {
        const projectId = e.target.value;
        const project = projects.find(p => p.project_id.toString() === projectId.toString());
        setFormData(prev => ({
            ...prev,
            project: project
        }));
    };

    // Handle vehicle selection
    const handleVehicleChange = (e) => {
        const vehicleId = e.target.value;
        const vehicle = vehicles.find(v => v.vehicle_id.toString() === vehicleId.toString());
        setFormData(prev => ({
            ...prev,
            vehicle: vehicle
        }));
    };

    // Handle driver selection
    const handleDriverChange = (e) => {
        const driverId = e.target.value;
        const driver = drivers.find(d => d.driver_id.toString() === driverId.toString());
        setFormData(prev => ({
            ...prev,
            driver: driver
        }));
    };

    // Handle form submission
    const handleSubmit = async (e) => {
        e.preventDefault();

        // Validate required fields
        if (!formData.customer || !formData.project || !formData.vendor || !formData.vehicle || !formData.driver) {
            showNotification('Please select all required fields', 'error');
            return;
        }

        setIsSubmitting(true);
        try {
            const assignmentData = {
                vehicle_id: formData.vehicle.vehicle_id,
                project_id: formData.project.project_id,
                driver_id: formData.driver.driver_id,
                customer_id: formData.customer.customer_id,
                vendor_id: formData.vendor.vendor_id,
                placement_type: formData.placementType,
                assigned_by: 'System Admin',
                assignment_notes: `Vehicle ${formData.vehicle.vehicle_number} assigned to project ${formData.project.project_name} with driver ${formData.driver.driver_name} (${formData.placementType} placement)`
            };

            const response = await fetch(`${API_BASE_URL}/assign-vehicle-with-driver`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(assignmentData)
            });

            const result = await response.json();

            if (result.success) {
                showNotification('Vehicle successfully linked to project!', 'success');
                // Reset form
                setFormData({
                    customer: null,
                    project: null,
                    vendor: null,
                    vehicle: null,
                    driver: null,
                    placementType: 'Fixed'
                });
                setProjects([]);
                setVehicles([]);
                setDrivers([]);

                // Reload assignments table
                loadAssignments();
            } else {
                showNotification(result.message || 'Failed to link vehicle to project', 'error');
            }
        } catch (error) {
            showNotification('Error linking vehicle to project', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    // Load assignments for the table
    const loadAssignments = async () => {
        setAssignmentsLoading(true);
        try {
            const response = await fetch(`${API_BASE_URL}/assignments`);
            const data = await response.json();

            if (data.success) {
                setAssignments(data.data);
            } else {
                setAssignments([]);
            }
        } catch (err) {
            setAssignments([]);
        } finally {
            setAssignmentsLoading(false);
        }
    };

    // Format date for display
    const formatDate = (dateString) => {
        if (!dateString) return '-';
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    // Status badge renderer
    const renderStatusBadge = (status) => {
        const statusStyles = {
            'active': { backgroundColor: '#d4edda', color: '#155724', border: '1px solid #c3e6cb' },
            'completed': { backgroundColor: '#cce7ff', color: '#004085', border: '1px solid #b3d7ff' },
            'cancelled': { backgroundColor: '#f8d7da', color: '#721c24', border: '1px solid #f5c6cb' }
        };

        const style = statusStyles[status] || { backgroundColor: '#e2e3e5', color: '#383d41', border: '1px solid #d6d8db' };

        return (
            <span style={{
                ...style,
                padding: '4px 12px',
                borderRadius: '20px',
                fontSize: '11px',
                fontWeight: '600',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                display: 'inline-block'
            }}>
                {status?.toUpperCase() || 'UNKNOWN'}
            </span>
        );
    };

    // Define table columns
    const assignmentColumns = [
        {
            key: 'assignment_id',
            label: 'ID',
            sortable: true,
            minWidth: '80px',
            render: (value) => `#${value}`
        },
        {
            key: 'vehicle_number',
            label: 'VEHICLE',
            sortable: true,
            minWidth: '140px',
            render: (value, item) => (
                <div>
                    <div style={{ fontWeight: '600', color: '#2c3e50' }}>
                        {value || 'N/A'}
                    </div>
                    <div style={{ fontSize: '12px', color: '#6c757d' }}>
                        {item.vehicle_code} • {item.vehicle_model}
                    </div>
                </div>
            )
        },
        {
            key: 'driver_name',
            label: 'DRIVER',
            sortable: true,
            minWidth: '140px',
            render: (value, item) => (
                <div>
                    <div style={{ fontWeight: '600', color: '#2c3e50' }}>
                        {value || 'N/A'}
                    </div>
                    <div style={{ fontSize: '12px', color: '#6c757d' }}>
                        {item.driver_phone || 'No phone'}
                    </div>
                </div>
            )
        },
        {
            key: 'project_name',
            label: 'PROJECT',
            sortable: true,
            minWidth: '160px',
            render: (value, item) => (
                <div>
                    <div style={{ fontWeight: '600', color: '#2c3e50' }}>
                        {value || 'N/A'}
                    </div>
                    <div style={{ fontSize: '12px', color: '#6c757d' }}>
                        {item.project_code}
                    </div>
                </div>
            )
        },
        {
            key: 'customer_name',
            label: 'CUSTOMER',
            sortable: true,
            minWidth: '150px',
            render: (value, item) => (
                <div>
                    <div style={{ fontWeight: '600', color: '#2c3e50' }}>
                        {value || 'N/A'}
                    </div>
                    <div style={{ fontSize: '12px', color: '#6c757d' }}>
                        {item.customer_code}
                    </div>
                </div>
            )
        },
        {
            key: 'vendor_name',
            label: 'VENDOR',
            sortable: true,
            minWidth: '140px',
            render: (value, item) => (
                <div>
                    <div style={{ fontWeight: '600', color: '#2c3e50' }}>
                        {value || 'N/A'}
                    </div>
                    <div style={{ fontSize: '12px', color: '#6c757d' }}>
                        {item.vendor_code}
                    </div>
                </div>
            )
        },
        {
            key: 'assigned_date',
            label: 'ASSIGNED DATE',
            sortable: true,
            minWidth: '120px',
            render: (value) => formatDate(value)
        },
        {
            key: 'assignment_status',
            label: 'STATUS',
            sortable: true,
            minWidth: '100px',
            render: (value) => renderStatusBadge(value)
        }
    ];

    // Handle edit assignment
    const handleEditAssignment = (assignment) => {
        // Pre-fill the form with assignment data
        const customer = customers.find(c => c.customer_id === assignment.customer_id);
        const vendor = vendors.find(v => v.vendor_id === assignment.vendor_id);

        if (customer) {
            setFormData(prev => ({ ...prev, customer }));
            loadCustomerProjects(customer.customer_id);

            // Set the project after projects are loaded
            setTimeout(() => {
                const project = projects.find(p => p.project_id === assignment.project_id);
                if (project) {
                    setFormData(prev => ({ ...prev, project }));
                }
            }, 500);
        }

        if (vendor) {
            setFormData(prev => ({ ...prev, vendor }));
            loadVendorVehicles(vendor.vendor_id);
            loadAllDrivers();

            // Set the vehicle and driver after they are loaded
            setTimeout(() => {
                const vehicle = vehicles.find(v => v.vehicle_id === assignment.vehicle_id);
                const driver = drivers.find(d => d.driver_id === assignment.driver_id);
                if (vehicle) {
                    setFormData(prev => ({ ...prev, vehicle }));
                }
                if (driver) {
                    setFormData(prev => ({ ...prev, driver }));
                }
            }, 500);
        }

        // No notification needed - user can see the form is populated
    };

    // Handle delete assignment
    const handleDeleteAssignment = async (assignment) => {
        if (!window.confirm(`Are you sure you want to delete assignment #${assignment.assignment_id}?`)) {
            return;
        }

        try {
            const response = await fetch(`${API_BASE_URL}/assignments/${assignment.assignment_id}`, {
                method: 'DELETE'
            });

            const data = await response.json();

            if (data.success) {
                showNotification('Assignment deleted successfully!', 'success');
                loadAssignments(); // Reload the table
            } else {
                showNotification('Failed to delete assignment: ' + data.message, 'error');
            }
        } catch (error) {
            showNotification('Error deleting assignment', 'error');
        }
    };

    return (
        <div>
            <FormLayout
            title="🚗🔗 Vehicle-Project Linking"
            subtitle="Link vehicles to customer projects with proper vendor and driver assignments"
            onSubmit={handleSubmit}
            submitText={isSubmitting ? "Linking..." : "Link Vehicle to Project"}
            isSubmitting={isSubmitting}
            editMode={false}
        >





            <div className="form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                {/* Customer Dropdown */}
                <div className="form-group">
                    <label htmlFor="customer">Customer *</label>
                    <SearchableDropdown
                        name="customer"
                        value={formData.customer?.customer_id || ''}
                        onChange={handleCustomerChange}
                        options={customers}
                        valueKey="customer_id"
                        labelKey="company_name"
                        placeholder="Select Customer..."
                        required={true}
                        formatLabel={(customer) => `${customer.company_name} (${customer.customer_code})`}
                        searchPlaceholder="Search customers..."
                    />
                </div>

                {/* Project Dropdown or Auto-Selected Display */}
                <div className="form-group">
                    <label htmlFor="project">Project *</label>
                    {projects.length === 1 ? (
                        // Show read-only field when only one project (auto-selected)
                        <input
                            type="text"
                            value={formData.project ? `${formData.project.project_name} (${formData.project.project_code})` : ''}
                            readOnly
                            style={{
                                width: '100%',
                                padding: '12px 16px',
                                border: '1px solid #d1d5db',
                                borderRadius: '6px',
                                backgroundColor: '#f9fafb',
                                color: '#374151',
                                fontSize: '1rem'
                            }}
                            placeholder="Auto-selected project"
                        />
                    ) : (
                        // Show dropdown when multiple projects
                        <SearchableDropdown
                            name="project"
                            value={formData.project?.project_id || ''}
                            onChange={handleProjectChange}
                            options={projects}
                            valueKey="project_id"
                            labelKey="project_name"
                            placeholder={formData.customer ? "Select Project..." : "Select Customer First..."}
                            required={true}
                            disabled={!formData.customer || loading}
                            formatLabel={(project) => `${project.project_name} (${project.project_code})`}
                            searchPlaceholder="Search projects..."
                        />
                    )}
                </div>

                {/* Vendor Dropdown */}
                <div className="form-group">
                    <label htmlFor="vendor">Vendor *</label>
                    <SearchableDropdown
                        name="vendor"
                        value={formData.vendor?.vendor_id || ''}
                        onChange={handleVendorChange}
                        options={vendors}
                        valueKey="vendor_id"
                        labelKey="vendor_name"
                        placeholder="Select Vendor..."
                        required={true}
                        formatLabel={(vendor) => `${vendor.vendor_name} (${vendor.vendor_code})`}
                        searchPlaceholder="Search vendors..."
                    />
                </div>

                {/* Vehicle Dropdown */}
                <div className="form-group">
                    <label htmlFor="vehicle">Vehicle *</label>
                    <SearchableDropdown
                        name="vehicle"
                        value={formData.vehicle?.vehicle_id || ''}
                        onChange={handleVehicleChange}
                        options={vehicles}
                        valueKey="vehicle_id"
                        labelKey="vehicle_number"
                        placeholder={formData.vendor ? "Select Vehicle..." : "Select Vendor First..."}
                        required={true}
                        disabled={!formData.vendor || loading}
                        formatLabel={(vehicle) => `${vehicle.vehicle_number} - ${vehicle.vehicle_model} (${vehicle.type_of_body})`}
                        searchPlaceholder="Search vehicles..."
                    />
                </div>

                {/* Type of Vehicle Placement Dropdown */}
                <div className="form-group">
                    <label htmlFor="placementType">Type of Vehicle Placement *</label>
                    <select
                        name="placementType"
                        value={formData.placementType}
                        onChange={(e) => setFormData(prev => ({ ...prev, placementType: e.target.value }))}
                        className="form-control"
                        required
                    >
                        <option value="Fixed">Fixed</option>
                        <option value="Adhoc">Adhoc</option>
                    </select>
                </div>

                {/* Driver Dropdown */}
                <div className="form-group">
                    <label htmlFor="driver">Driver *</label>
                    <SearchableDropdown
                        name="driver"
                        value={formData.driver?.driver_id || ''}
                        onChange={handleDriverChange}
                        options={drivers}
                        valueKey="driver_id"
                        labelKey="driver_name"
                        placeholder="Select Driver..."
                        required={true}
                        disabled={loading}
                        formatLabel={(driver) => `${driver.driver_name} - ${driver.driver_licence_no} (${driver.driver_experience || 0} yrs exp)`}
                        searchPlaceholder="Search drivers..."
                    />
                </div>
            </div>

            {/* Loading indicator */}
            {loading && (
                <div style={{ textAlign: 'center', padding: '20px' }}>
                    <div style={{
                        display: 'inline-block',
                        width: '20px',
                        height: '20px',
                        border: '3px solid #f3f3f3',
                        borderTop: '3px solid #3498db',
                        borderRadius: '50%',
                        animation: 'spin 1s linear infinite'
                    }}></div>
                    <span style={{ marginLeft: '10px' }}>Loading...</span>
                </div>
            )}
        </FormLayout>

        {/* Vehicle Assignments Table */}
        <DataTable
            title="📋 Vehicle Assignment List"
            data={assignments}
            columns={assignmentColumns}
            onEdit={handleEditAssignment}
            onDelete={handleDeleteAssignment}
            isLoading={assignmentsLoading}
            keyField="assignment_id"
            emptyMessage="No vehicle assignments found. Create your first assignment using the form above."
            showPagination={true}
        />
        </div>
    );
};

export default VehicleProjectLinking;