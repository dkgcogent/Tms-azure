import React, { useState, useEffect } from 'react';
import FormLayout from '../components/FormLayout';
import FormField from '../components/FormField';
import { FormInput, FormSelect, FormTextarea } from '../components/FormComponents';
import DataTable from '../components/DataTable';
import { billingAPI, paymentAPI, customerAPI, projectAPI, apiHelpers } from '../services/api';
import { focusField } from '../utils/globalFormValidation';

import './BillingForm.css';

const BillingForm = () => {
  const [activeTab, setActiveTab] = useState('billing');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingBilling, setEditingBilling] = useState(null);
  const [editingPayment, setEditingPayment] = useState(null);
  const [errors, setErrors] = useState({});

  // Data lists for dropdowns
  const [customers, setCustomers] = useState([]);
  const [projects, setProjects] = useState([]);
  const [billingRecords, setBillingRecords] = useState([]);
  const [paymentRecords, setPaymentRecords] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  // Billing form state
  const [billingData, setBillingData] = useState({
    InvoiceNo: '',
    InvoiceDate: new Date().toISOString().split('T')[0],
    DueDate: '',
    CustomerID: '',
    ProjectID: '',
    BillingTenure: '',
    TotalTransactions: 0,
    TotalAmount: '',
    GSTRate: 18.00,
    GSTAmount: '',
    GrandTotal: '',
    PaymentStatus: 'Pending'
  });

  // Payment form state
  const [paymentData, setPaymentData] = useState({
    BillingID: '',
    PaymentDate: new Date().toISOString().split('T')[0],
    PaymentAmount: '',
    PaymentMode: '',
    PaymentReference: '',
    Remarks: ''
  });

  // Fetch data on component mount
  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    setIsLoading(true);
    try {
      const [customersRes, projectsRes, billingRes, paymentsRes] = await Promise.all([
        customerAPI.getAll(),
        projectAPI.getAll(),
        billingAPI.getAll(),
        paymentAPI.getAll()
      ]);

      setCustomers(customersRes.data || []);
      setProjects(projectsRes.data || []);
      setBillingRecords(billingRes.data || []);
      setPaymentRecords(paymentsRes.data || []);
    } catch (error) {
      console.error('Error fetching initial data:', error);
      apiHelpers.showError(error, 'Failed to load data');
    } finally {
      setIsLoading(false);
    }
  };

  // Auto-calculate due date (30 days from invoice date)
  useEffect(() => {
    if (billingData.InvoiceDate) {
      const invoiceDate = new Date(billingData.InvoiceDate);
      const dueDate = new Date(invoiceDate);
      dueDate.setDate(dueDate.getDate() + 30);
      setBillingData(prev => ({
        ...prev,
        DueDate: dueDate.toISOString().split('T')[0]
      }));
    }
  }, [billingData.InvoiceDate]);

  // Auto-calculate GST and Grand Total
  useEffect(() => {
    const totalAmount = parseFloat(billingData.TotalAmount) || 0;
    const gstRate = parseFloat(billingData.GSTRate) || 0;
    const gstAmount = (totalAmount * gstRate) / 100;
    const grandTotal = totalAmount + gstAmount;

    setBillingData(prev => ({
      ...prev,
      GSTAmount: gstAmount.toFixed(2),
      GrandTotal: grandTotal.toFixed(2)
    }));
  }, [billingData.TotalAmount, billingData.GSTRate]);

  // Auto-calculate amounts
  useEffect(() => {
    const quantity = parseFloat(billingData.Quantity) || 0;
    const rate = parseFloat(billingData.Rate) || 0;
    const amount = quantity * rate;
    
    const cgst = amount * 0.09; // 9% CGST
    const sgst = amount * 0.09; // 9% SGST
    const totalAmount = amount + cgst + sgst;

    setBillingData(prev => ({
      ...prev,
      Amount: amount.toFixed(2),
      CGST: cgst.toFixed(2),
      SGST: sgst.toFixed(2),
      TotalAmount: totalAmount.toFixed(2)
    }));
  }, [billingData.Quantity, billingData.Rate]);

  const generateInvoiceNumber = () => {
    const timestamp = Date.now();
    return `INV-${timestamp.toString().slice(-6)}`;
  };

  const handleBillingInputChange = (e) => {
    const { name, value } = e.target;
    setBillingData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handlePaymentInputChange = (e) => {
    const { name, value } = e.target;
    setPaymentData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleBillingSubmit = async (e) => {
    e.preventDefault();

    // Validate required fields
    const newErrors = {};
    const errorFields = [];
    const fieldOrder = ['InvoiceNo', 'InvoiceDate', 'DueDate', 'CustomerID', 'ProjectID', 'TotalAmount'];

    if (!billingData.InvoiceNo) {
      newErrors.InvoiceNo = 'Invoice number is required';
      errorFields.push('InvoiceNo');
    }
    if (!billingData.InvoiceDate) {
      newErrors.InvoiceDate = 'Invoice date is required';
      errorFields.push('InvoiceDate');
    }
    if (!billingData.DueDate) {
      newErrors.DueDate = 'Due date is required';
      errorFields.push('DueDate');
    }
    if (!billingData.CustomerID) {
      newErrors.CustomerID = 'Customer is required';
      errorFields.push('CustomerID');
    }
    if (!billingData.TotalAmount || parseFloat(billingData.TotalAmount) <= 0) {
      newErrors.TotalAmount = 'Total amount must be greater than 0';
      errorFields.push('TotalAmount');
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      // Focus on first error field
      const firstErrorField = fieldOrder.find(field => errorFields.includes(field));
      if (firstErrorField) {
        focusField(firstErrorField);
      }
      return;
    }

    setIsSubmitting(true);

    try {
      // Prepare billing data for API
      const billingPayload = {
        InvoiceNo: billingData.InvoiceNo,
        InvoiceDate: billingData.InvoiceDate,
        DueDate: billingData.DueDate,
        CustomerID: billingData.CustomerID || null,
        ProjectID: billingData.ProjectID || null,
        BillingTenure: billingData.BillingTenure,
        TotalTransactions: billingData.TotalTransactions || 0,
        TotalAmount: parseFloat(billingData.TotalAmount) || 0,
        GSTRate: billingData.GSTRate || 18.00,
        GSTAmount: parseFloat(billingData.GSTAmount) || 0,
        GrandTotal: parseFloat(billingData.GrandTotal) || 0,
        PaymentStatus: billingData.PaymentStatus || 'Pending'
      };

      let response;
      if (editingBilling) {
        response = await billingAPI.update(editingBilling.BillingID, billingPayload);
      } else {
        response = await billingAPI.create(billingPayload);
      }

      apiHelpers.showSuccess(editingBilling ? 'Billing record updated successfully!' : 'Billing record created successfully!');

      // Refresh billing records
      await fetchInitialData();
      
      // Reset form
      setBillingData({
        InvoiceNo: '',
        InvoiceDate: new Date().toISOString().split('T')[0],
        DueDate: '',
        CustomerName: '',
        CustomerAddress: '',
        CustomerPhone: '',
        CustomerEmail: '',
        BillingPeriodFrom: '',
        BillingPeriodTo: '',
        ServiceDescription: '',
        Quantity: '',
        Rate: '',
        Amount: '',
        CGST: '',
        SGST: '',
        TotalAmount: '',
        Notes: ''
      });
      setEditingBilling(null);
    } catch (error) {
      console.error('Error saving billing:', error);
      apiHelpers.handleFormError(error, 'billing record');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePaymentSubmit = async (e) => {
    e.preventDefault();

    // Validate required fields
    const newErrors = {};
    const errorFields = [];
    const fieldOrder = ['BillingID', 'PaymentDate', 'PaymentAmount', 'PaymentMode'];

    if (!paymentData.BillingID) {
      newErrors.BillingID = 'Billing record is required';
      errorFields.push('BillingID');
    }
    if (!paymentData.PaymentDate) {
      newErrors.PaymentDate = 'Payment date is required';
      errorFields.push('PaymentDate');
    }
    if (!paymentData.PaymentAmount || parseFloat(paymentData.PaymentAmount) <= 0) {
      newErrors.PaymentAmount = 'Payment amount must be greater than 0';
      errorFields.push('PaymentAmount');
    }
    if (!paymentData.PaymentMode) {
      newErrors.PaymentMode = 'Payment mode is required';
      errorFields.push('PaymentMode');
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      // Focus on first error field
      const firstErrorField = fieldOrder.find(field => errorFields.includes(field));
      if (firstErrorField) {
        focusField(firstErrorField);
      }
      return;
    }

    setIsSubmitting(true);

    try {
      // Prepare payment data for API
      const paymentPayload = {
        BillingID: paymentData.BillingID || null,
        PaymentDate: paymentData.PaymentDate,
        PaymentAmount: parseFloat(paymentData.PaymentAmount) || 0,
        PaymentMode: paymentData.PaymentMode,
        PaymentReference: paymentData.PaymentReference || null,
        Remarks: paymentData.Remarks || null
      };

      let response;
      if (editingPayment) {
        response = await paymentAPI.update(editingPayment.PaymentID, paymentPayload);
      } else {
        response = await paymentAPI.create(paymentPayload);
      }

      apiHelpers.showSuccess(editingPayment ? 'Payment record updated successfully!' : 'Payment record created successfully!');

      // Refresh payment records
      await fetchInitialData();
      
      // Reset form
      setPaymentData({
        BillingID: '',
        PaymentDate: new Date().toISOString().split('T')[0],
        PaymentAmount: '',
        PaymentMode: '',
        PaymentReference: '',
        Remarks: ''
      });
      setEditingPayment(null);
    } catch (error) {
      console.error('Error saving payment:', error);
      apiHelpers.handleFormError(error, 'payment record');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetBillingForm = () => {
    setBillingData({
      InvoiceNo: '',
      InvoiceDate: new Date().toISOString().split('T')[0],
      DueDate: '',
      CustomerID: '',
      ProjectID: '',
      BillingTenure: '',
      TotalTransactions: 0,
      TotalAmount: '',
      GSTRate: 18.00,
      GSTAmount: '',
      GrandTotal: '',
      PaymentStatus: 'Pending'
    });
    setEditingBilling(null);
    setErrors({});
  };

  const resetPaymentForm = () => {
    setPaymentData({
      BillingID: '',
      PaymentDate: new Date().toISOString().split('T')[0],
      PaymentAmount: '',
      PaymentMode: '',
      PaymentReference: '',
      Remarks: ''
    });
    setEditingPayment(null);
    setErrors({});
  };

  return (
    <div className="billing-management-container">
      {/* Clean Tab Navigation */}
      <div className="clean-tab-navigation">
        <div className="tab-header">
          <h1>💰 Billing & Collections</h1>
          <p>Manage billing records and payment collections</p>
        </div>
        <div className="tab-buttons">
          <button
            className={`clean-tab-btn ${activeTab === 'billing' ? 'active' : ''}`}
            onClick={() => setActiveTab('billing')}
          >
            📄 Billing
          </button>
          <button
            className={`clean-tab-btn ${activeTab === 'payment' ? 'active' : ''}`}
            onClick={() => setActiveTab('payment')}
          >
            💳 Payment Collection
          </button>
        </div>
      </div>

      {/* Billing Form Section */}
      {activeTab === 'billing' && (
        <FormLayout
          title="Create Billing Record"
          subtitle="Generate invoices with automated calculations"
          onSubmit={handleBillingSubmit}
          submitText={editingBilling ? 'Update Billing' : 'Create Billing'}
          isSubmitting={isSubmitting}
          editMode={!!editingBilling}
          editingItem={editingBilling ? `Invoice: ${editingBilling.InvoiceNo}` : null}
          onCancelEdit={resetBillingForm}
        >
          {/* Basic Information */}
          <FormField label="Basic Information" fullWidth>
            <div className="form-grid">
              <FormField label="Invoice Number" required error={errors.InvoiceNo}>
                <FormInput
                  name="InvoiceNo"
                  value={billingData.InvoiceNo}
                  onChange={handleBillingInputChange}
                  placeholder="Enter invoice number"
                  required
                  error={!!errors.InvoiceNo}
                  icon="📄"
                />
              </FormField>

              <FormField label="Generate Invoice">
                <button
                  type="button"
                  className="generate-invoice-btn"
                  onClick={() => setBillingData(prev => ({ ...prev, InvoiceNo: generateInvoiceNumber() }))}
                >
                  🎲 Auto Generate
                </button>
              </FormField>

              <FormField label="Invoice Date" required error={errors.InvoiceDate}>
                <FormInput
                  type="date"
                  name="InvoiceDate"
                  value={billingData.InvoiceDate}
                  onChange={handleBillingInputChange}
                  required
                  error={!!errors.InvoiceDate}
                  icon="📅"
                />
              </FormField>

              <FormField label="Due Date" required error={errors.DueDate} hint="Auto-calculated (30 days)">
                <FormInput
                  type="date"
                  name="DueDate"
                  value={billingData.DueDate}
                  onChange={handleBillingInputChange}
                  required
                  error={!!errors.DueDate}
                  icon="📅"
                  readOnly
                />
              </FormField>
            </div>
          </FormField>

          {/* Customer and Project Selection */}
          <FormField label="Customer & Project Information" fullWidth>
            <div className="form-grid">
              <FormField label="Customer" required error={errors.CustomerID}>
                <FormSelect
                  name="CustomerID"
                  value={billingData.CustomerID}
                  onChange={handleBillingInputChange}
                  required
                  error={!!errors.CustomerID}
                >
                  <option value="">Select Customer</option>
                  {customers.map(customer => (
                    <option key={customer.CustomerID} value={customer.CustomerID}>
                      {customer.Name}
                    </option>
                  ))}
                </FormSelect>
              </FormField>

              <FormField label="Project" error={errors.ProjectID}>
                <FormSelect
                  name="ProjectID"
                  value={billingData.ProjectID}
                  onChange={handleBillingInputChange}
                  error={!!errors.ProjectID}
                >
                  <option value="">Select Project (Optional)</option>
                  {projects.map(project => (
                    <option key={project.ProjectID} value={project.ProjectID}>
                      {project.ProjectName}
                    </option>
                  ))}
                </FormSelect>
              </FormField>
            </div>
          </FormField>

          {/* Billing Period */}
          <FormField label="Billing Tenure" fullWidth>
            <FormInput
              type="text"
              name="BillingTenure"
              value={billingData.BillingTenure}
              onChange={handleBillingInputChange}
              placeholder="e.g. 25th to 24th or 1st to 31st"
              required
              error={!!errors.BillingTenure}
              icon="📅"
            />
          </FormField>

          {/* Amount Details */}
          <FormField label="Amount Details" fullWidth>
            <div className="form-grid">
              <FormField label="Total Transactions" error={errors.TotalTransactions}>
                <FormInput
                  type="number"
                  name="TotalTransactions"
                  value={billingData.TotalTransactions}
                  onChange={handleBillingInputChange}
                  placeholder="Number of transactions"
                  error={!!errors.TotalTransactions}
                  icon="🔢"
                />
              </FormField>

              <FormField label="Total Amount" required error={errors.TotalAmount}>
                <FormInput
                  type="number"
                  step="0.01"
                  name="TotalAmount"
                  value={billingData.TotalAmount}
                  onChange={handleBillingInputChange}
                  placeholder="Enter total amount"
                  required
                  error={!!errors.TotalAmount}
                  icon="💰"
                />
              </FormField>

              <FormField label="GST Rate (%)" error={errors.GSTRate}>
                <FormInput
                  type="number"
                  step="0.01"
                  name="GSTRate"
                  value={billingData.GSTRate}
                  onChange={handleBillingInputChange}
                  placeholder="GST rate"
                  error={!!errors.GSTRate}
                  icon="📊"
                />
              </FormField>

              <FormField label="GST Amount" error={errors.GSTAmount}>
                <FormInput
                  type="number"
                  step="0.01"
                  name="GSTAmount"
                  value={billingData.GSTAmount}
                  onChange={handleBillingInputChange}
                  placeholder="Auto-calculated"
                  error={!!errors.GSTAmount}
                  icon="💰"
                  readOnly
                />
              </FormField>

              <FormField label="Grand Total" error={errors.GrandTotal}>
                <FormInput
                  type="number"
                  step="0.01"
                  name="GrandTotal"
                  value={billingData.GrandTotal}
                  onChange={handleBillingInputChange}
                  placeholder="Auto-calculated"
                  error={!!errors.GrandTotal}
                  icon="💰"
                  readOnly
                />
              </FormField>

              <FormField label="Payment Status" error={errors.PaymentStatus}>
                <FormSelect
                  name="PaymentStatus"
                  value={billingData.PaymentStatus}
                  onChange={handleBillingInputChange}
                  error={!!errors.PaymentStatus}
                >
                  <option value="Pending">Pending</option>
                  <option value="Paid">Paid</option>
                  <option value="Overdue">Overdue</option>
                  <option value="Cancelled">Cancelled</option>
                </FormSelect>
              </FormField>
            </div>
          </FormField>
        </FormLayout>
      )}

      {/* Payment Collection Form Section */}
      {activeTab === 'payment' && (
        <FormLayout
          title="Record Payment"
          subtitle="Collect and track payments for billing records"
          onSubmit={handlePaymentSubmit}
          submitText={editingPayment ? 'Update Payment' : 'Record Payment'}
          isSubmitting={isSubmitting}
          editMode={!!editingPayment}
          editingItem={editingPayment ? `Payment #${editingPayment.PaymentID}` : null}
          onCancelEdit={resetPaymentForm}
        >
          <div className="form-grid">
            <FormField label="Billing Record" required error={errors.BillingID}>
              <FormSelect
                name="BillingID"
                value={paymentData.BillingID}
                onChange={handlePaymentInputChange}
                required
                error={!!errors.BillingID}
              >
                <option value="">Select Billing Record</option>
                {billingRecords.map(billing => (
                  <option key={billing.BillingID} value={billing.BillingID}>
                    {billing.InvoiceNo} - {billing.CustomerName || `Customer ${billing.CustomerID}`}
                  </option>
                ))}
              </FormSelect>
            </FormField>

            <FormField label="Payment Date" required error={errors.PaymentDate}>
              <FormInput
                type="date"
                name="PaymentDate"
                value={paymentData.PaymentDate}
                onChange={handlePaymentInputChange}
                required
                error={!!errors.PaymentDate}
                icon="📅"
              />
            </FormField>

            <FormField label="Payment Method" required error={errors.PaymentMode}>
              <FormSelect
                name="PaymentMode"
                value={paymentData.PaymentMode}
                onChange={handlePaymentInputChange}
                required
                error={!!errors.PaymentMode}
                icon="💳"
              >
                <option value="">Select Method</option>
                <option value="Cash">Cash</option>
                <option value="Bank Transfer">Bank Transfer</option>
                <option value="Credit Card">Credit Card</option>
                <option value="Cheque">Cheque</option>
                <option value="UPI">UPI</option>
              </FormSelect>
            </FormField>

            <FormField label="Payment Amount" required error={errors.PaymentAmount}>
              <FormInput
                type="number"
                step="0.01"
                name="PaymentAmount"
                value={paymentData.PaymentAmount}
                onChange={handlePaymentInputChange}
                placeholder="0.00"
                required
                error={!!errors.PaymentAmount}
                icon="💰"
              />
            </FormField>

            <FormField label="Payment Reference" error={errors.PaymentReference}>
              <FormInput
                name="PaymentReference"
                value={paymentData.PaymentReference}
                onChange={handlePaymentInputChange}
                placeholder="Transaction ID, Cheque No, etc."
                error={!!errors.PaymentReference}
                icon="🔗"
              />
            </FormField>
          </div>

          <FormField label="Remarks" error={errors.Remarks}>
            <FormTextarea
              name="Remarks"
              value={paymentData.Remarks}
              onChange={handlePaymentInputChange}
              placeholder="Additional notes about the payment"
              rows={3}
              error={!!errors.Remarks}
            />
          </FormField>
        </FormLayout>
      )}

      {/* Data Tables */}
      <div className="data-tables-section">
        {isLoading ? (
          <div className="data-table-loading">
            <div className="loading-spinner"></div>
            Loading data...
          </div>
        ) : (
          <>
            {activeTab === 'billing' && (
              <DataTable
                title="📄 Billing Records"
                data={billingRecords}
                columns={[
                  { key: 'InvoiceNo', label: 'Invoice No' },
                  { key: 'CustomerID', label: 'Customer ID' },
                  { key: 'InvoiceDate', label: 'Invoice Date' },
                  { key: 'BillingTenure', label: 'Billing Tenure' },
                  { key: 'DueDate', label: 'Due Date' },
                  { key: 'TotalAmount', label: 'Total Amount' },
                  { key: 'GSTRate', label: 'GST Rate (%)' },
                  { key: 'GSTAmount', label: 'GST Amount' },
                  { key: 'GrandTotal', label: 'Grand Total' },
                  { key: 'PaymentStatus', label: 'Status' }
                ]}
                keyField="BillingID"
                customizable={true}
                onEdit={(record) => {
                  setEditingBilling(record);
                  setBillingData(record);
                  // Scroll to top of the page to show the form
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                onDelete={(record) => {
                  if (confirm('Are you sure you want to delete this billing record?')) {
                  }
                }}
              />
            )}

            {activeTab === 'payment' && (
              <DataTable
                title="💳 Payment Records"
                data={paymentRecords}
                columns={[
                  { key: 'PaymentID', label: 'Payment ID' },
                  { key: 'BillingID', label: 'Billing ID' },
                  { key: 'PaymentDate', label: 'Payment Date' },
                  { key: 'PaymentMode', label: 'Method' },
                  { key: 'PaymentAmount', label: 'Amount Paid' }
                ]}
                keyField="PaymentID"
                customizable={true}
                onEdit={(record) => {
                  setEditingPayment(record);
                  setPaymentData(record);
                  // Scroll to top of the page to show the form
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                onDelete={(record) => {
                  if (confirm('Are you sure you want to delete this payment record?')) {
                  }
                }}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default BillingForm;
