const COMMON_ACCEPT = '.pdf,.doc,.docx,.jpg,.jpeg,.png';
const EXTENDED_ACCEPT = '.pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png';

export const FILE_UPLOAD_FIELDS = [
  { name: 'AgreementFile', label: 'Agreement File', accept: COMMON_ACCEPT, section: 'agreement' },
  { name: 'BGFile', label: 'Bank Guarantee File', accept: COMMON_ACCEPT, section: 'agreement' },
  { name: 'BGReceivingFile', label: 'BG Receiving File', accept: COMMON_ACCEPT, section: 'agreement' },
  { name: 'POFile', label: 'Purchase Order File', accept: COMMON_ACCEPT, section: 'po' },
  { name: 'RatesAnnexureFile', label: 'Rates Annexure', accept: EXTENDED_ACCEPT, section: 'billing' },
  { name: 'MISFormatFile', label: 'MIS Format', accept: EXTENDED_ACCEPT, section: 'mis' },
  { name: 'KPISLAFile', label: 'KPI / SLA', accept: EXTENDED_ACCEPT, section: 'mis' },
  { name: 'PerformanceReportFile', label: 'Performance Report', accept: EXTENDED_ACCEPT, section: 'mis' }
];

export const getFileUploadFieldsBySection = (section) => FILE_UPLOAD_FIELDS.filter(field => field.section === section);
export const createFileUploadHandler = (fieldName, setCustomerData) => (file) => setCustomerData(prev => ({ ...prev, [fieldName]: file }));
