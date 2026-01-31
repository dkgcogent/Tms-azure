import { useState, useEffect, useCallback } from 'react';
import { vendorAPI, projectAPI, apiHelpers } from '../services/api';

const INITIAL_STATE = { vendor_name: '', vendor_mobile_no: '', project_id: '', house_flat_no: '', street_locality: '', city: '', state: '', pin_code: '', country: 'India', vendor_alternate_no: '', vendor_aadhar: '', vendor_pan: '', vendor_company_name: '', vendor_company_udhyam: '', vendor_company_pan: '', vendor_company_gst: '', type_of_company: 'Proprietorship', start_date_of_company: '', address_of_company: '', bank_details: '', vendor_photo_url: null, vendor_aadhar_doc_url: null, vendor_pan_doc_url: null, vendor_company_udhyam_doc_url: null, vendor_company_pan_doc_url: null, vendor_company_gst_doc_url: null, company_legal_docs_url: null, bank_cheque_upload_url: null, address_of_company_house_flat_no: '', address_of_company_street_locality: '', address_of_company_city: '', address_of_company_state: '', address_of_company_pin_code: '', address_of_company_country: 'India' };
const INITIAL_BANK_DETAILS = { account_holder_name: '', account_number: '', ifsc_code: '', bank_name: '', branch_name: '', branch_address: '', city: '', state: '' };
const INITIAL_FILES = { vendor_photo: null, vendor_aadhar_doc: null, vendor_pan_doc: null, vendor_company_udhyam_doc: null, vendor_company_pan_doc: null, vendor_company_gst_doc: null, company_legal_docs: null, bank_cheque_upload: null };

export const useVendorForm = () => {
  const [vendorData, setVendorData] = useState(INITIAL_STATE);
  const [bankDetails, setBankDetails] = useState(INITIAL_BANK_DETAILS);
  const [files, setFiles] = useState(INITIAL_FILES);
  const [vendors, setVendors] = useState([]);
  const [projects, setProjects] = useState([]);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [editingVendor, setEditingVendor] = useState(null);
  const [dateFilter, setDateFilter] = useState({ fromDate: '', toDate: '' });

  const parseCompanyAddress = useCallback((combinedAddress) => {
    if (!combinedAddress) return { address_of_company_house_flat_no: '', address_of_company_street_locality: '', address_of_company_city: '', address_of_company_state: '', address_of_company_pin_code: '', address_of_company_country: 'India' };
    const parts = combinedAddress.split(',').map(part => part.trim());
    return { address_of_company_house_flat_no: parts[0] || '', address_of_company_street_locality: parts[1] || '', address_of_company_city: parts[2] || '', address_of_company_state: parts[3] || '', address_of_company_pin_code: parts[4] || '', address_of_company_country: parts[5] || 'India' };
  }, []);

  const resetForm = useCallback(() => {
    setVendorData(INITIAL_STATE);
    setBankDetails(INITIAL_BANK_DETAILS);
    setFiles(INITIAL_FILES);
    setErrors({});
    setEditingVendor(null);
    document.querySelectorAll('input[type="file"]').forEach(input => input.value = '');
  }, []);

  const handleInputChange = useCallback((e) => {
    const { name, value } = e.target;
    setVendorData(prev => ({ ...prev, [name]: value }));
    errors[name] && setErrors(prev => ({ ...prev, [name]: '' }));
  }, [errors]);

  const handleFileChange = useCallback((e) => {
    const { name, files: selectedFiles } = e.target;
    selectedFiles?.[0] && setFiles(prev => ({ ...prev, [name]: selectedFiles[0] }));
  }, []);

  const handleAddressChange = useCallback((newAddressData) => {
    setVendorData(prev => ({ ...prev, ...newAddressData, vendor_address: `${newAddressData.house_flat_no || ''}, ${newAddressData.street_locality || ''}, ${newAddressData.city || ''}, ${newAddressData.state || ''}, ${newAddressData.pin_code || ''}${newAddressData.country && newAddressData.country !== 'India' ? ', ' + newAddressData.country : ''}` }));
  }, []);

  const getAddressData = useCallback(() => ({ house_flat_no: vendorData.house_flat_no || '', street_locality: vendorData.street_locality || '', city: vendorData.city || '', state: vendorData.state || '', pin_code: vendorData.pin_code || '', country: vendorData.country || 'India' }), [vendorData]);

  const fetchVendors = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await vendorAPI.getAll();
      const body = response?.data ?? response;
      const list = Array.isArray(body) ? body : (Array.isArray(body?.value) ? body.value : []);
      setVendors(list.map((v) => ({ ...v, vendor_id: v.VendorID ?? v.vendor_id ?? v.id ?? null, vendor_name: v.VendorName ?? v.vendor_name ?? v.name ?? v.Name ?? '', vendor_mobile_no: v.VendorMobileNo ?? v.vendor_mobile_no ?? v.mobile ?? v.MobileNo ?? v.Mobile ?? '', type_of_company: v.TypeOfCompany ?? v.type_of_company ?? '', vendor_company_name: v.CompanyName ?? v.vendor_company_name ?? v.company_name ?? '', vendor_company_gst: v.CompanyGST ?? v.vendor_company_gst ?? v.company_gst ?? '', vendor_address: v.VendorAddress ?? v.vendor_address ?? v.address_of_company ?? v.Address ?? '', vendor_photo: v.VendorPhoto ?? v.vendor_photo ?? null })));
    } catch (error) {
      apiHelpers.showError(error, 'Failed to fetch vendors');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchProjects = useCallback(async () => {
    try {
      const response = await projectAPI.getAll();
      setProjects(response.data.value || response.data || []);
    } catch (error) {
      apiHelpers.showError(error, 'Failed to load projects');
    }
  }, []);

  const handleEdit = useCallback(async (vendor) => {
    try {
      const response = await vendorAPI.getById(vendor.VendorID || vendor.vendor_id);
      setEditingVendor(response.data || response);
    } catch (error) {
      setEditingVendor(vendor);
      apiHelpers.showError('Could not fetch complete vendor data. Some images may not display.');
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handleDelete = useCallback(async (vendor) => {
    if (!window.confirm(`Are you sure you want to delete vendor "${vendor.vendor_name}"?`)) return;
    try {
      await vendorAPI.delete(vendor.vendor_id);
      apiHelpers.showSuccess('Vendor deleted successfully!');
      await fetchVendors();
    } catch (error) {
      apiHelpers.showError(error, 'Failed to delete vendor');
    }
  }, [fetchVendors]);

  const getDbFieldName = useCallback((frontendFieldName) => ({ 'vendor_photo': 'VendorPhoto', 'vendor_aadhar_doc': 'VendorAadharDoc', 'vendor_pan_doc': 'VendorPANDoc', 'vendor_company_udhyam_doc': 'VendorCompanyUdhyamDoc', 'vendor_company_pan_doc': 'VendorCompanyPANDoc', 'vendor_company_gst_doc': 'VendorCompanyGSTDoc', 'company_legal_docs': 'CompanyLegalDocs', 'bank_cheque_upload': 'BankChequeUpload' }[frontendFieldName] || frontendFieldName), []);

  const handleFileDelete = useCallback(async (fieldName, fileName) => {
    try {
      if (!editingVendor) throw new Error('No vendor being edited');
      const dbFieldName = getDbFieldName(fieldName);
      await vendorAPI.deleteFile(editingVendor.VendorID, dbFieldName);
      setEditingVendor(prev => ({ ...prev, [dbFieldName]: null }));
      setVendorData(prev => ({ ...prev, [fieldName + '_url']: null, [dbFieldName]: null }));
      setFiles(prev => ({ ...prev, [fieldName]: null }));
      await fetchVendors();
      apiHelpers.showSuccess(`File deleted successfully`);
    } catch (error) {
      apiHelpers.showError(error, 'Failed to delete file');
      throw error;
    }
  }, [editingVendor, getDbFieldName, fetchVendors]);

  useEffect(() => {
    if (editingVendor) {
      setVendorData({ vendor_name: editingVendor.VendorName || editingVendor.vendor_name || '', vendor_mobile_no: editingVendor.VendorMobileNo || '', project_id: editingVendor.project_id || '', house_flat_no: editingVendor.HouseFlatNo || '', street_locality: editingVendor.StreetLocality || '', city: editingVendor.City || '', state: editingVendor.State || '', pin_code: editingVendor.PinCode || '', country: editingVendor.Country || 'India', vendor_alternate_no: editingVendor.VendorAlternateNo || '', vendor_aadhar: editingVendor.VendorAadhar || '', vendor_pan: editingVendor.VendorPAN || '', vendor_company_name: editingVendor.CompanyName || '', vendor_company_udhyam: editingVendor.VendorCompanyUdhyam || '', vendor_company_pan: editingVendor.VendorCompanyPAN || '', vendor_company_gst: editingVendor.CompanyGST || '', type_of_company: editingVendor.TypeOfCompany || 'Proprietorship', start_date_of_company: editingVendor.StartDateOfCompany ? editingVendor.StartDateOfCompany.split('T')[0] : '', address_of_company: editingVendor.AddressOfCompany || '', ...parseCompanyAddress(editingVendor.AddressOfCompany || ''), bank_details: editingVendor.BankDetails || '', vendor_photo: editingVendor.VendorPhoto || null, vendor_photo_url: editingVendor.vendor_photo_url || null, vendor_aadhar_doc: editingVendor.VendorAadharDoc || null, vendor_aadhar_doc_url: editingVendor.vendor_aadhar_doc_url || null, vendor_pan_doc: editingVendor.VendorPANDoc || null, vendor_pan_doc_url: editingVendor.vendor_pan_doc_url || null, vendor_company_udhyam_doc: editingVendor.VendorCompanyUdhyamDoc || null, vendor_company_udhyam_doc_url: editingVendor.vendor_company_udhyam_doc_url || null, vendor_company_pan_doc: editingVendor.VendorCompanyPANDoc || null, vendor_company_pan_doc_url: editingVendor.vendor_company_pan_doc_url || null, vendor_company_gst_doc: editingVendor.VendorCompanyGSTDoc || null, vendor_company_gst_doc_url: editingVendor.vendor_company_gst_doc_url || null, company_legal_docs: editingVendor.CompanyLegalDocs || null, company_legal_docs_url: editingVendor.company_legal_docs_url || null, bank_cheque_upload: editingVendor.BankChequeUpload || null, bank_cheque_upload_url: editingVendor.bank_cheque_upload_url || null });
      setBankDetails({ account_holder_name: editingVendor.AccountHolderName || editingVendor.account_holder_name || '', account_number: editingVendor.AccountNumber || editingVendor.account_number || '', ifsc_code: editingVendor.IFSCCode || editingVendor.ifsc_code || '', bank_name: editingVendor.BankName || editingVendor.bank_name || '', branch_name: editingVendor.BranchName || editingVendor.branch_name || '', branch_address: editingVendor.BranchAddress || editingVendor.branch_address || '', city: editingVendor.BankCity || editingVendor.bank_city || '', state: editingVendor.BankState || editingVendor.bank_state || '' });
      setFiles(INITIAL_FILES);
      setErrors({});
    }
  }, [editingVendor, parseCompanyAddress]);

  useEffect(() => { fetchVendors(); fetchProjects(); }, [fetchVendors, fetchProjects]);

  return { vendorData, setVendorData, bankDetails, setBankDetails, files, setFiles, vendors, projects, errors, setErrors, isSubmitting, setIsSubmitting, isLoading, editingVendor, setEditingVendor, dateFilter, setDateFilter, resetForm, handleInputChange, handleFileChange, handleAddressChange, getAddressData, fetchVendors, fetchProjects, handleEdit, handleDelete, handleFileDelete, parseCompanyAddress };
};
