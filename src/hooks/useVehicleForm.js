import { useState, useEffect, useCallback } from 'react';
import { vehicleAPI, vendorAPI, driverAPI, apiHelpers } from '../services/api';

const INITIAL_STATE = { VehicleRegistrationNo: '', VehicleCode: '', vendor_id: '', driver_id: '', RCUpload: null, VehicleChasisNo: '', VehicleModel: '', TypeOfBody: 'Open', VehicleType: '', VehicleRegistrationDate: '', VehicleAge: 0, VehicleKMS: '', VehicleKMSPhoto: null, VehiclePhotoFront: null, VehiclePhotoBack: null, VehiclePhotoLeftSide: null, VehiclePhotoRightSide: null, VehiclePhotoInterior: null, VehiclePhotoEngine: null, VehiclePhotoRoof: null, VehiclePhotoDoor: null, LastServicing: '', ServiceBillPhoto: null, VehicleInsuranceCompany: '', VehicleInsuranceDate: '', VehicleInsuranceExpiry: '', InsuranceCopy: null, VehicleFitnessCertificateIssue: '', VehicleFitnessCertificateExpiry: '', FitnessCertificateUpload: null, VehiclePollutionDate: '', VehiclePollutionExpiry: '', PollutionPhoto: null, StateTaxIssue: '', StateTaxExpiry: '', StateTaxPhoto: null, VehicleLoadingCapacity: '', GPS: 'No', GPSCompany: '', NoEntryPass: 'No', NoEntryPassStartDate: '', NoEntryPassExpiry: '', NoEntryPassCopy: null, FixRate: '', FuelRate: '', HandlingCharges: '' };

const INITIAL_FILES = { RCUpload: null, VehicleKMSPhoto: null, VehiclePhotoFront: null, VehiclePhotoBack: null, VehiclePhotoLeftSide: null, VehiclePhotoRightSide: null, VehiclePhotoInterior: null, VehiclePhotoEngine: null, VehiclePhotoRoof: null, VehiclePhotoDoor: null, ServiceBillPhoto: null, InsuranceCopy: null, FitnessCertificateUpload: null, PollutionPhoto: null, StateTaxPhoto: null, NoEntryPassCopy: null };

const formatDateForInput = (dateString) => dateString ? new Date(dateString).toISOString().split('T')[0] : '';

const calculateAge = (dateString) => {
  if (!dateString) return 0;
  const today = new Date();
  const birthDate = new Date(dateString);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) age--;
  return age;
};

export const useVehicleForm = () => {
  const [vehicleData, setVehicleData] = useState(INITIAL_STATE);
  const [vehicles, setVehicles] = useState([]);
  const [files, setFiles] = useState(INITIAL_FILES);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState(null);
  const [dateFilter, setDateFilter] = useState({ fromDate: '', toDate: '' });
  const [modalImage, setModalImage] = useState(null);
  const [showModal, setShowModal] = useState(false);

  const resetForm = useCallback(() => {
    setVehicleData(INITIAL_STATE);
    setErrors({});
    setEditingVehicle(null);
    setFiles(INITIAL_FILES);
    document.querySelectorAll('input[type="file"]').forEach(input => input.value = '');
  }, []);

  const handleInputChange = useCallback((e) => {
    const { name, value } = e.target;
    setVehicleData(prev => ({ ...prev, [name]: value }));
    errors[name] && setErrors(prev => ({ ...prev, [name]: '' }));
  }, [errors]);

  const handleFileChange = useCallback((e) => {
    const { name, files: selectedFiles } = e.target;
    selectedFiles?.[0] && setFiles(prev => ({ ...prev, [name]: selectedFiles[0] }));
  }, []);

  const generateVehicleCode = useCallback(async () => {
    try {
      if (!vehicleData.vendor_id || !vehicleData.VehicleRegistrationNo) return;
      
      const vendorResponse = await vendorAPI.getAll();
      const vendor = vendorResponse.data?.find(v => v.VendorID == vehicleData.vendor_id);
      if (!vendor) throw new Error(`Vendor not found with ID: ${vehicleData.vendor_id}`);

      const getLetters = (name, count = 2, fallback = 'XX') => {
        if (!name) return fallback;
        const letters = name.toUpperCase().replace(/[^A-Z]/g, '');
        return letters.length >= count ? letters.substring(0, count) : (letters + fallback).substring(0, count);
      };

      const vendorCode = getLetters(vendor.VendorName || vendor.vendor_name, 2, 'VE');
      const cleanRegNumber = vehicleData.VehicleRegistrationNo.replace(/[^A-Z0-9]/gi, '').toUpperCase();
      const regSuffix = cleanRegNumber.length >= 4 ? cleanRegNumber.slice(-4) : cleanRegNumber.padStart(4, '0');
      const generatedCode = `${vendorCode}${regSuffix}`;

      setVehicleData(prev => ({ ...prev, VehicleCode: generatedCode }));
    } catch (error) {
      const cleanRegNumber = vehicleData.VehicleRegistrationNo.replace(/[^A-Z0-9]/gi, '').toUpperCase();
      const fallbackCode = `VH${cleanRegNumber.slice(-4).padStart(4, '0')}`;
      setVehicleData(prev => ({ ...prev, VehicleCode: fallbackCode }));
    }
  }, [vehicleData.vendor_id, vehicleData.VehicleRegistrationNo]);

  const fetchVehicles = useCallback(async () => {
    setIsLoading(true);
    try {
      const queryParams = new URLSearchParams();
      dateFilter.fromDate && queryParams.append('fromDate', dateFilter.fromDate);
      dateFilter.toDate && queryParams.append('toDate', dateFilter.toDate);
      const queryString = queryParams.toString();
      const url = queryString ? `?${queryString}` : '';

      const response = await vehicleAPI.getAll(url);
      setVehicles(response.data?.data || response.data || []);
    } catch (error) {
      apiHelpers.showError(error, 'Failed to fetch vehicles');
    } finally {
      setIsLoading(false);
    }
  }, [dateFilter]);

  const getExpiryStatus = useCallback((fieldName, dateValue) => {
    if (!dateValue) return null;
    const today = new Date();
    const expiryDate = new Date(dateValue);
    const daysUntilExpiry = Math.ceil((expiryDate - today) / (1000 * 60 * 60 * 24));

    if (expiryDate < today) return { status: 'expired', message: 'EXPIRED', className: 'expiry-expired' };
    if (daysUntilExpiry <= 7) return { status: 'critical', message: `${daysUntilExpiry} days left`, className: 'expiry-critical' };
    if (daysUntilExpiry <= 30) return { status: 'warning', message: `${daysUntilExpiry} days left`, className: 'expiry-warning' };
    return null;
  }, []);

  const checkExpiryDates = useCallback((vehicleData) => {
    const today = new Date();
    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(today.getDate() + 7);
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(today.getDate() + 30);

    const expiryFields = [
      { field: 'VehicleInsuranceExpiry', label: 'Vehicle Insurance', date: vehicleData.VehicleInsuranceExpiry },
      { field: 'VehicleFitnessCertificateExpiry', label: 'Fitness Certificate', date: vehicleData.VehicleFitnessCertificateExpiry },
      { field: 'VehiclePollutionExpiry', label: 'Pollution Certificate', date: vehicleData.VehiclePollutionExpiry },
      { field: 'StateTaxExpiry', label: 'State Tax', date: vehicleData.StateTaxExpiry },
      { field: 'NoEntryPassExpiry', label: 'No Entry Pass', date: vehicleData.NoEntryPassExpiry }
    ];

    expiryFields.forEach(({ field, label, date }) => {
      if (date) {
        const expiryDate = new Date(date);
        if (expiryDate < today) {
          showExpiryAlert('danger', `${label} has EXPIRED!`, `Expired on ${formatDateForInput(date)}`, field);
        } else if (expiryDate <= sevenDaysFromNow) {
          const daysUntilExpiry = Math.ceil((expiryDate - today) / (1000 * 60 * 60 * 24));
          showExpiryAlert('warning', `${label} expires soon!`, `Expires in ${daysUntilExpiry} day${daysUntilExpiry !== 1 ? 's' : ''} (${formatDateForInput(date)})`, field);
        } else if (expiryDate <= thirtyDaysFromNow) {
          const daysUntilExpiry = Math.ceil((expiryDate - today) / (1000 * 60 * 60 * 24));
          apiHelpers.showWarning(`${label} expires in ${daysUntilExpiry} days (${formatDateForInput(date)})`);
        }
      }
    });
  }, []);

  const showExpiryAlert = useCallback((type, title, message, fieldName) => {
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type === 'danger' ? 'danger' : 'warning'} alert-dismissible fade show position-fixed`;
    alertDiv.style.cssText = `top: 20px; right: 20px; z-index: 9999; min-width: 350px; box-shadow: 0 4px 12px rgba(0,0,0,0.3); border: 2px solid ${type === 'danger' ? '#dc3545' : '#ffc107'};`;
    alertDiv.innerHTML = `<div class="d-flex align-items-start"><div class="me-3"><i class="fas fa-exclamation-triangle fa-2x text-${type === 'danger' ? 'danger' : 'warning'}"></i></div><div class="flex-grow-1"><h6 class="alert-heading mb-1">${title}</h6><p class="mb-2">${message}</p><button class="btn btn-sm btn-outline-${type === 'danger' ? 'danger' : 'warning'} me-2" onclick="document.getElementById('${fieldName}').focus(); this.parentElement.parentElement.parentElement.remove();">Fix Now</button></div><button type="button" class="btn-close" onclick="this.parentElement.parentElement.remove();"></button></div>`;
    document.body.appendChild(alertDiv);
    setTimeout(() => { alertDiv.parentElement && alertDiv.remove(); }, type === 'danger' ? 10000 : 7000);
  }, []);

  const handleEdit = useCallback(async (vehicle) => {
    try {
      const response = await vehicleAPI.getById(vehicle.VehicleID);
      const completeVehicleData = response.data || response;
      setEditingVehicle(completeVehicleData);

      const editData = { ...INITIAL_STATE };
      const backendToFrontendMapping = { VehicleRegistrationNo: 'VehicleRegistrationNo', VehicleCode: 'VehicleCode', VehicleChasisNo: 'VehicleChasisNo', VehicleModel: 'VehicleModel', TypeOfBody: 'TypeOfBody', VehicleType: 'VehicleType', VehicleRegistrationDate: 'VehicleRegistrationDate', VehicleAge: 'VehicleAge', VehicleKMS: 'VehicleKMS', VendorID: 'vendor_id', DriverID: 'driver_id', GPSCompany: 'GPSCompany', NoEntryPassStartDate: 'NoEntryPassStartDate', NoEntryPassExpiry: 'NoEntryPassExpiry', LastServicing: 'LastServicing', VehicleLoadingCapacity: 'VehicleLoadingCapacity', VehicleInsuranceCompany: 'VehicleInsuranceCompany', VehicleInsuranceDate: 'VehicleInsuranceDate', VehicleInsuranceExpiry: 'VehicleInsuranceExpiry', VehicleFitnessCertificateIssue: 'VehicleFitnessCertificateIssue', VehicleFitnessCertificateExpiry: 'VehicleFitnessCertificateExpiry', VehiclePollutionDate: 'VehiclePollutionDate', VehiclePollutionExpiry: 'VehiclePollutionExpiry', StateTaxIssue: 'StateTaxIssue', StateTaxExpiry: 'StateTaxExpiry', FixRate: 'FixRate', FuelRate: 'FuelRate', HandlingCharges: 'HandlingCharges' };
      const dateFields = ['VehicleRegistrationDate', 'VehicleInsuranceDate', 'VehicleInsuranceExpiry', 'VehicleFitnessCertificateIssue', 'VehicleFitnessCertificateExpiry', 'VehiclePollutionDate', 'VehiclePollutionExpiry', 'StateTaxIssue', 'StateTaxExpiry', 'NoEntryPassStartDate', 'NoEntryPassExpiry', 'LastServicing'];

      Object.keys(editData).forEach(key => { completeVehicleData[key] !== undefined && completeVehicleData[key] !== null && (editData[key] = dateFields.includes(key) ? formatDateForInput(completeVehicleData[key]) : completeVehicleData[key]); });
      Object.entries(backendToFrontendMapping).forEach(([backendKey, frontendKey]) => { completeVehicleData[backendKey] !== undefined && completeVehicleData[backendKey] !== null && (editData[frontendKey] = dateFields.includes(frontendKey) ? formatDateForInput(completeVehicleData[backendKey]) : completeVehicleData[backendKey]); });

      editData.GPS = (completeVehicleData.GPS === 1 || completeVehicleData.GPS === '1' || completeVehicleData.GPS === 'Yes') ? 'Yes' : 'No';
      editData.NoEntryPass = (completeVehicleData.NoEntryPass === 1 || completeVehicleData.NoEntryPass === '1' || completeVehicleData.NoEntryPass === 'Yes') ? 'Yes' : 'No';

      setVehicleData(editData);
      setErrors({});
      setFiles(INITIAL_FILES);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error) {
      setEditingVehicle(vehicle);
      const editData = { ...INITIAL_STATE };
      Object.keys(editData).forEach(key => { vehicle[key] !== undefined && vehicle[key] !== null && (editData[key] = vehicle[key]); });
      setVehicleData(editData);
      setErrors({});
      window.scrollTo({ top: 0, behavior: 'smooth' });
      apiHelpers.showError('Could not fetch complete vehicle data. Some images may not display.');
    }
  }, []);

  const handleDelete = useCallback(async (vehicle) => {
    if (!window.confirm(`Are you sure you want to delete vehicle "${vehicle.VehicleRegistrationNo}"?`)) return;
    try {
      await vehicleAPI.delete(vehicle.VehicleID);
      apiHelpers.showSuccess('Vehicle deleted successfully!');
      await fetchVehicles();
    } catch (error) {
      apiHelpers.showError(error, 'Failed to delete vehicle');
    }
  }, [fetchVehicles]);

  const handleFileDelete = useCallback(async (fieldName) => {
    try {
      if (!editingVehicle) throw new Error('No vehicle being edited');
      await vehicleAPI.deleteFile(editingVehicle.VehicleID, fieldName);
      setEditingVehicle(prev => ({ ...prev, [fieldName]: null, [`${fieldName}_url`]: null }));
      setVehicleData(prev => ({ ...prev, [fieldName]: null, [`${fieldName}_url`]: null }));
      setFiles(prev => ({ ...prev, [fieldName]: null }));
      apiHelpers.showSuccess('File deleted successfully');
    } catch (error) {
      apiHelpers.showError('Failed to delete file: ' + error.message);
      throw error;
    }
  }, [editingVehicle]);

  const createToast = useCallback((content, bgColor) => {
    const toast = document.createElement('div');
    toast.style.cssText = `position: fixed; top: 20px; right: 20px; z-index: 10000; background: ${bgColor}; color: white; padding: 15px 20px; border-radius: 5px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); font-family: Arial, sans-serif; font-size: 14px;`;
    toast.innerHTML = content;
    document.body.appendChild(toast);
    return toast;
  }, []);

  const handleExportVehicles = useCallback(async () => {
    try {
      // Build query parameters for date filtering (same as fetchVehicles)
      const queryParams = new URLSearchParams();
      if (dateFilter.fromDate) {
        queryParams.append('fromDate', dateFilter.fromDate);
      }
      if (dateFilter.toDate) {
        queryParams.append('toDate', dateFilter.toDate);
      }

      const queryString = queryParams.toString();
      const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';
      const exportUrl = `${API_BASE_URL}/api/export/vehicles${queryString ? `?${queryString}` : ''}`;

      console.log('📊 Export URL with filters:', exportUrl);
      console.log('🗓️ Date filter applied to export:', { fromDate: dateFilter.fromDate, toDate: dateFilter.toDate });

      const loadingToast = createToast('🔄 Exporting vehicles... Please wait', '#007bff');
      
      const link = document.createElement('a');
      Object.assign(link, { href: exportUrl, download: `Vehicle_Master_${new Date().toISOString().slice(0, 10)}.xlsx`, target: '_blank' });
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      document.body.removeChild(loadingToast);

      const successToast = createToast('✅ Vehicle Export Started!<br><small>Downloading ALL vehicle master fields + vendor info</small>', '#28a745');
      setTimeout(() => { document.body.contains(successToast) && document.body.removeChild(successToast); }, 5000);
    } catch (error) {
      alert(`❌ Export failed: ${error.message}`);
    }
  }, [createToast, dateFilter]);

  const handleDateFilterApply = useCallback(async () => {
    if (!dateFilter.fromDate || !dateFilter.toDate) return alert('Please select both From Date and To Date');
    if (new Date(dateFilter.fromDate) > new Date(dateFilter.toDate)) return alert('From Date cannot be later than To Date');
    await fetchVehicles();
  }, [dateFilter, fetchVehicles]);

  const handleDateFilterClear = useCallback(async () => { setDateFilter({ fromDate: '', toDate: '' }); await fetchVehicles(); }, [fetchVehicles]);

  useEffect(() => { fetchVehicles(); }, [fetchVehicles]);
  useEffect(() => { vehicleData.vendor_id && vehicleData.VehicleRegistrationNo && !editingVehicle && generateVehicleCode(); }, [vehicleData.vendor_id, vehicleData.VehicleRegistrationNo, editingVehicle, generateVehicleCode]);
  useEffect(() => { vehicleData.VehicleRegistrationDate && setVehicleData(prev => ({ ...prev, VehicleAge: calculateAge(vehicleData.VehicleRegistrationDate) })); }, [vehicleData.VehicleRegistrationDate]);
  useEffect(() => { vehicleData && Object.keys(vehicleData).length > 0 && checkExpiryDates(vehicleData); }, [vehicleData.VehicleInsuranceExpiry, vehicleData.VehicleFitnessCertificateExpiry, vehicleData.VehiclePollutionExpiry, vehicleData.StateTaxExpiry, vehicleData.NoEntryPassExpiry, checkExpiryDates]);

  return { vehicleData, setVehicleData, vehicles, files, errors, setErrors, isSubmitting, setIsSubmitting, isLoading, editingVehicle, setEditingVehicle, dateFilter, setDateFilter, modalImage, setModalImage, showModal, setShowModal, resetForm, handleInputChange, handleFileChange, generateVehicleCode, fetchVehicles, getExpiryStatus, handleEdit, handleDelete, handleFileDelete, handleExportVehicles, handleDateFilterApply, handleDateFilterClear };
};
