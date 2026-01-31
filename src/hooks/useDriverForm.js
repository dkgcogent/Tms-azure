import { useState, useEffect, useCallback } from 'react';
import { driverAPI, vendorAPI, apiHelpers } from '../services/api';

const INITIAL_STATE = { DriverName: '', DriverLicenceNo: '', DriverMobileNo: '', DriverAddress: '', vendor_id: '', house_flat_no: '', street_locality: '', city: '', state: '', pin_code: '', country: 'India', DriverLicenceIssueDate: '', DriverLicenceExpiryDate: '', DriverMedicalDate: '', DriverSameAsVendor: 'Separate', DriverAlternateNo: '', DriverTotalExperience: '', DriverPhoto: null, DriverPhoto_url: null };
const INITIAL_FILES = { DriverPhoto: null };

const formatDateForInput = (dateString) => dateString ? new Date(dateString).toISOString().split('T')[0] : '';

export const useDriverForm = () => {
  const [driverData, setDriverData] = useState(INITIAL_STATE);
  const [drivers, setDrivers] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [files, setFiles] = useState(INITIAL_FILES);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [editingDriver, setEditingDriver] = useState(null);
  const [dateFilter, setDateFilter] = useState({ fromDate: '', toDate: '' });
  const [modalImage, setModalImage] = useState(null);
  const [showModal, setShowModal] = useState(false);

  const parseFullAddress = useCallback((fullAddress) => {
    if (!fullAddress) return {};
    const parts = fullAddress.split(',').map(part => part.trim());
    if (parts.length >= 4) return { house_flat_no: parts[0] || '', street_locality: parts[1] || '', city: parts[2] || '', state: parts[3] || '', pin_code: parts[4] || '' };
    if (parts.length >= 2) return { street_locality: parts.slice(0, -2).join(', ') || '', city: parts[parts.length - 2] || '', state: parts[parts.length - 1] || '' };
    return { street_locality: fullAddress };
  }, []);

  const resetForm = useCallback(() => {
    setDriverData(INITIAL_STATE);
    setErrors({});
    setEditingDriver(null);
    setFiles(INITIAL_FILES);
    document.querySelectorAll('input[type="file"]').forEach(input => input.value = '');
  }, []);

  const handleInputChange = useCallback((e) => {
    const { name, value } = e.target;
    setDriverData(prev => ({ ...prev, [name]: value }));
    errors[name] && setErrors(prev => ({ ...prev, [name]: '' }));
  }, [errors]);

  const handleFileChange = useCallback((e) => {
    const { name, files: selectedFiles } = e.target;
    selectedFiles?.[0] && setFiles(prev => ({ ...prev, [name]: selectedFiles[0] }));
  }, []);

  const handleAddressChange = useCallback((newAddressData) => {
    setDriverData(prev => ({ ...prev, ...newAddressData, DriverAddress: `${newAddressData.house_flat_no || ''}, ${newAddressData.street_locality || ''}, ${newAddressData.city || ''}, ${newAddressData.state || ''}, ${newAddressData.pin_code || ''}${newAddressData.country && newAddressData.country !== 'India' ? ', ' + newAddressData.country : ''}` }));
  }, []);

  const getAddressData = useCallback(() => ({ house_flat_no: driverData.house_flat_no || '', street_locality: driverData.street_locality || '', city: driverData.city || '', state: driverData.state || '', pin_code: driverData.pin_code || '', country: driverData.country || 'India' }), [driverData]);

  const fetchDrivers = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await driverAPI.getAll();
      setDrivers(response.data.value || response.data || []);
    } catch (error) {
      apiHelpers.showError(error, 'Failed to fetch drivers');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchVendors = useCallback(async () => {
    try {
      const response = await vendorAPI.getAll();
      setVendors(response.data.value || response.data || []);
    } catch (error) {
      apiHelpers.showError(error, 'Failed to load vendors');
    }
  }, []);

  const handleEdit = useCallback(async (driver) => {
    try {
      const response = await driverAPI.getById(driver.DriverID);
      const completeDriverData = response.data || response;
      setEditingDriver(completeDriverData);
      setDriverData({ DriverName: completeDriverData.DriverName || '', DriverLicenceNo: completeDriverData.DriverLicenceNo || '', DriverMobileNo: completeDriverData.DriverMobileNo || '', DriverAddress: completeDriverData.DriverAddress || '', DriverLicenceIssueDate: formatDateForInput(completeDriverData.DriverLicenceIssueDate), DriverLicenceExpiryDate: formatDateForInput(completeDriverData.LicenceExpiry), DriverMedicalDate: formatDateForInput(completeDriverData.MedicalDate), DriverSameAsVendor: completeDriverData.DriverSameAsVendor || 'Separate', DriverAlternateNo: completeDriverData.DriverAlternateNo || '', DriverTotalExperience: completeDriverData.DriverTotalExperience || '', vendor_id: completeDriverData.VendorID || '', house_flat_no: completeDriverData.HouseFlatNo || '', street_locality: completeDriverData.StreetLocality || '', city: completeDriverData.DriverCity || '', state: completeDriverData.DriverState || '', pin_code: completeDriverData.DriverPinCode || '', country: completeDriverData.DriverCountry || 'India', ...((!completeDriverData.HouseFlatNo && !completeDriverData.StreetLocality && completeDriverData.DriverAddress) ? parseFullAddress(completeDriverData.DriverAddress) : {}), DriverPhoto: completeDriverData.DriverPhoto || null, DriverPhoto_url: completeDriverData.DriverPhoto_url || null });
      setErrors({});
      setFiles(INITIAL_FILES);
    } catch (error) {
      setEditingDriver(driver);
      setDriverData({ DriverName: driver.DriverName || '', DriverLicenceNo: driver.DriverLicenceNo || '', DriverMobileNo: driver.DriverMobileNo || '', DriverPhoto: driver.DriverPhoto || null, DriverPhoto_url: driver.DriverPhoto_url || null });
      setErrors({});
      apiHelpers.showError('Could not fetch complete driver data. Some images may not display.');
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [parseFullAddress]);

  const handleDelete = useCallback(async (driver) => {
    if (!window.confirm(`Are you sure you want to delete driver "${driver.DriverName}"?`)) return;
    try {
      await driverAPI.delete(driver.DriverID);
      apiHelpers.showSuccess('Driver deleted successfully!');
      await fetchDrivers();
    } catch (error) {
      apiHelpers.showError(error, 'Failed to delete driver');
    }
  }, [fetchDrivers]);

  const handleFileDelete = useCallback(async (fieldName, fileName) => {
    try {
      if (!editingDriver) throw new Error('No driver being edited');
      await driverAPI.deleteFile(editingDriver.DriverID, fieldName);
      setEditingDriver(prev => ({ ...prev, [fieldName]: null }));
      setDriverData(prev => ({ ...prev, [fieldName]: null }));
      setFiles(prev => ({ ...prev, [fieldName]: null }));
      apiHelpers.showSuccess(`File deleted successfully`);
    } catch (error) {
      apiHelpers.showError(error, 'Failed to delete file');
      throw error;
    }
  }, [editingDriver]);

  const handleVendorSelection = useCallback((vendorId) => {
    const selectedVendor = vendors.find(v => v.VendorID == vendorId);
    if (selectedVendor) {
      setDriverData(prev => ({ ...prev, vendor_id: vendorId, DriverName: selectedVendor.VendorName, DriverMobileNo: selectedVendor.VendorMobileNo, DriverAddress: selectedVendor.VendorAddress, house_flat_no: selectedVendor.HouseFlatNo, street_locality: selectedVendor.StreetLocality, city: selectedVendor.City, state: selectedVendor.State, pin_code: selectedVendor.PinCode, country: selectedVendor.Country }));
    }
  }, [vendors]);

  useEffect(() => { fetchDrivers(); fetchVendors(); }, [fetchDrivers, fetchVendors]);

  return { driverData, setDriverData, drivers, vendors, files, errors, setErrors, isSubmitting, setIsSubmitting, isLoading, editingDriver, setEditingDriver, dateFilter, setDateFilter, modalImage, setModalImage, showModal, setShowModal, resetForm, handleInputChange, handleFileChange, handleAddressChange, getAddressData, fetchDrivers, fetchVendors, handleEdit, handleDelete, handleFileDelete, handleVendorSelection, parseFullAddress };
};
