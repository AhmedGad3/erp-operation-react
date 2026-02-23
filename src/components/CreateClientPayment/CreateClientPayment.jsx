import React, { useState, useEffect, useContext } from 'react';
import { DollarSign, ArrowLeft, AlertCircle, CheckCircle, CreditCard, Building2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import axiosInstance, { getErrorMessage } from '../../utils/axiosInstance';
import FullPageLoader from '../Loader/Loader';
import { LanguageContext } from '../../context/LanguageContext';
import { toast } from 'react-toastify';

const CreateClientPayment = () => {
  const { lang, t } = useContext(LanguageContext);
  const navigate = useNavigate();
  
  const [clients, setClients] = useState([]);
  const [projects, setProjects] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  
  const [formData, setFormData] = useState({
    clientId: '',
    projectId: '',
    totalAmount: '',
    contractPayment: '',
    additionalPayment: '',
    method: 'CASH',
    chequeNo: '',
    transferRef: '',
    paymentDate: new Date().toISOString().split('T')[0],
    notes: ''
  });
  
  const [errors, setErrors] = useState({});
  
  useEffect(() => {
    fetchData();
  }, []);
  
  // Fetch projects when client changes
  useEffect(() => {
    if (formData.clientId) {
      fetchProjectsByClient(formData.clientId);
    } else {
      setProjects([]);
      setFormData(prev => ({ ...prev, projectId: '' }));
    }
  }, [formData.clientId]);
  
  const fetchData = async () => {
    try {
      setLoading(true);
      const response = await axiosInstance.get('/clients');
      const clientsData = Array.isArray(response.data) ? response.data : (response.data.result || []);
      setClients(clientsData.filter(c => c.isActive !== false));
    } catch (error) {
      toast.error(getErrorMessage(error, lang === 'ar' ? 'فشل تحميل العملاء' : 'Failed to load clients'));
    } finally {
      setLoading(false);
    }
  };

  const fetchProjectsByClient = async (clientId) => {
    try {
      const response = await axiosInstance.get(`/projects`);
      const allProjects = Array.isArray(response.data) ? response.data : (response.data.result || []);
      
      // Filter projects by client and only active ones with remaining balance
      const clientProjects = allProjects.filter(p => {
        // Handle both string and object clientId formats
        const projectClientId = typeof p.clientId === 'object' ? p.clientId._id || p.clientId.id : p.clientId;
        return (
          projectClientId === clientId && 
          p.isActive !== false &&
          (p.contractRemaining > 0 || p.contractRemaining === undefined)
        );
      });
      
      setProjects(clientProjects);
    } catch (error) {
      toast.error(getErrorMessage(error, lang === 'ar' ? 'فشل تحميل المشاريع' : 'Failed to load projects'));
    }
  };
  
  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.clientId) {
      newErrors.clientId = lang === 'ar' ? 'اختر عميل' : 'Please select a client';
    }
    
    if (!formData.projectId) {
      newErrors.projectId = lang === 'ar' ? 'اختر مشروع' : 'Please select a project';
    }

    if (!formData.totalAmount || parseFloat(formData.totalAmount) <= 0) {
      newErrors.totalAmount = lang === 'ar' ? 'أدخل المبلغ الكلي' : 'Enter a valid total amount';
    }

    if (!formData.contractPayment || parseFloat(formData.contractPayment) < 0) {
      newErrors.contractPayment = lang === 'ar' ? 'أدخل دفعة العقد' : 'Enter valid contract payment';
    }

    if (!formData.additionalPayment || parseFloat(formData.additionalPayment) < 0) {
      newErrors.additionalPayment = lang === 'ar' ? 'أدخل الدفعة الإضافية' : 'Enter valid additional payment';
    }
    
    const total = parseFloat(formData.contractPayment || 0) + parseFloat(formData.additionalPayment || 0);
    if (total !== parseFloat(formData.totalAmount || 0)) {
      newErrors.totalAmount = lang === 'ar' ? 'مجموع الدفعات غير متطابق' : 'Total payments do not match';
    }
    
    if (formData.method === 'CHEQUE' && !formData.chequeNo) {
      newErrors.chequeNo = lang === 'ar' ? 'أدخل رقم الشيك' : 'Enter cheque number';
    }
    
    if (formData.method === 'TRANSFER' && !formData.transferRef) {
      newErrors.transferRef = lang === 'ar' ? 'أدخل رقم التحويل' : 'Enter transfer reference';
    }
    
    if (!formData.paymentDate) {
      newErrors.paymentDate = lang === 'ar' ? 'حدد التاريخ' : 'Please select a date';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast.error(lang === 'ar' ? 'يرجى إصلاح الأخطاء' : 'Please fix errors');
      return;
    }
    
    try {
      setSubmitting(true);
      
      const payload = {
        projectId: formData.projectId,
        totalAmount: parseFloat(formData.totalAmount),
        contractPayment: parseFloat(formData.contractPayment),
        additionalPayment: parseFloat(formData.additionalPayment),
        method: formData.method,
        paymentDate: formData.paymentDate,
        notes: formData.notes.trim()
      };
      
      // Add method-specific fields
      if (formData.method === 'CHEQUE') {
        payload.chequeNo = formData.chequeNo.trim();
      } else if (formData.method === 'TRANSFER') {
        payload.transferRef = formData.transferRef.trim();
      }
      
     const response = await axiosInstance.post('/projects/payments', payload);
      const paymentId = response.data.result._id
      

      toast.success(lang === 'ar' ? 'تم إنشاء الدفعة بنجاح!' : 'Payment created successfully!');

      setTimeout(() => {
        navigate(`/finance/client-payments/${paymentId}`);
      }, 1500);
    } catch (error) {
      toast.error(getErrorMessage(error, lang === 'ar' ? 'فشل إنشاء الدفعة' : 'Failed to create payment'));
    } finally {
      setSubmitting(false);
    }
  };

  const getSelectedClient = () => {
    return clients.find(c => c._id === formData.clientId);
  };

  const getSelectedProject = () => {
    return projects.find(p => p._id === formData.projectId);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat(lang === 'ar' ? 'ar-EG' : 'en-US', {
      style: 'currency',
      currency: 'EGP',
      minimumFractionDigits: 0
    }).format(amount);
  };

  if (loading) {
    return <FullPageLoader text={lang === "ar" ? "جاري التحميل..." : "Loading..."} />;
  }

  const selectedClient = getSelectedClient();
  const selectedProject = getSelectedProject();
  const totalFromFields = parseFloat(formData.contractPayment || 0) + parseFloat(formData.additionalPayment || 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-8 px-4">
      {/* Toast */}

      {submitting && <FullPageLoader text={lang === "ar" ? "جاري المعالجة..." : "Processing..."} />}

      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-8 py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <CreditCard className="w-8 h-8 text-white" />
                <div>
                  <h1 className="text-2xl font-bold text-white">
                    {lang === 'ar' ? 'دفعة عميل' : 'Client Payment'}
                  </h1>
                  <p className="text-blue-100 mt-1">
                    {lang === 'ar' ? 'تسجيل دفعة جديدة' : 'Create new payment'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => navigate('/finance/client-payments')}
                className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg transition"
              >
                <ArrowLeft className="w-4 h-4" />
                {lang === 'ar' ? 'رجوع' : 'Back'}
              </button>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-8 space-y-6">
            
            {/* Client Selection */}
            <div className="bg-gray-50 p-6 rounded-lg">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                {lang === 'ar' ? 'اختر العميل والمشروع' : 'Select Client & Project'}
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Client Dropdown */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    {lang === 'ar' ? 'العميل' : 'Client'} <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.clientId}
                    onChange={(e) => setFormData({ ...formData, clientId: e.target.value })}
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition ${
                      errors.clientId ? 'border-red-500' : 'border-gray-300'
                    }`}
                    disabled={submitting}
                  >
                    <option value="">{lang === 'ar' ? 'اختر عميل' : 'Select a client'}</option>
                    {clients.map((client) => (
                      <option key={client._id} value={client._id}>
                        {lang === 'ar' ? client.nameAr : client.nameEn} ({client.code})
                      </option>
                    ))}
                  </select>
                  {errors.clientId && <p className="mt-1 text-sm text-red-500">{errors.clientId}</p>}
                </div>

                {/* Project Dropdown */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    {lang === 'ar' ? 'المشروع' : 'Project'} <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.projectId}
                    onChange={(e) => setFormData({ ...formData, projectId: e.target.value })}
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition ${
                      errors.projectId ? 'border-red-500' : 'border-gray-300'
                    }`}
                    disabled={!formData.clientId || submitting}
                  >
                    <option value="">
                      {!formData.clientId 
                        ? (lang === 'ar' ? 'اختر عميل أولاً' : 'Select client first')
                        : (lang === 'ar' ? 'اختر مشروع' : 'Select a project')
                      }
                    </option>
                    {projects.map((project) => (
                      <option key={project._id} value={project._id}>
                        {lang === 'ar' ? project.nameAr : project.nameEn} ({project.code})
                      </option>
                    ))}
                  </select>
                  {errors.projectId && <p className="mt-1 text-sm text-red-500">{errors.projectId}</p>}
                </div>
              </div>

              {/* Project Info Card */}
              {selectedProject && (
                <div className="mt-6 p-4 bg-white border-l-4 border-blue-500 rounded">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <p className="text-sm text-gray-600 mb-1">
                        {lang === 'ar' ? 'قيمة العقد' : 'Contract Amount'}
                      </p>
                      <p className="text-lg font-semibold text-gray-900">
                        {formatCurrency(selectedProject.contractAmount)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 mb-1">
                        {lang === 'ar' ? 'المدفوع' : 'Total Paid'}
                      </p>
                      <p className="text-lg font-semibold text-green-600">
                        {formatCurrency(selectedProject.totalPaid || 0)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 mb-1">
                        {lang === 'ar' ? 'المتبقي' : 'Remaining'}
                      </p>
                      <p className="text-lg font-semibold text-red-600">
                        {formatCurrency(selectedProject.contractRemaining || 0)}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Payment Amount Section */}
            <div className="bg-gray-50 p-6 rounded-lg">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                {lang === 'ar' ? 'تفاصيل الدفعة' : 'Payment Details'}
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-4">
                {/* Contract Payment */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    {lang === 'ar' ? 'دفعة العقد' : 'Contract Payment'} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.contractPayment}
                    onChange={(e) => setFormData({ ...formData, contractPayment: e.target.value })}
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition ${
                      errors.contractPayment ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="0.00"
                    disabled={submitting}
                  />
                  {errors.contractPayment && <p className="mt-1 text-sm text-red-500">{errors.contractPayment}</p>}
                </div>

                {/* Additional Payment */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    {lang === 'ar' ? 'دفعة إضافية' : 'Additional Payment'} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.additionalPayment}
                    onChange={(e) => setFormData({ ...formData, additionalPayment: e.target.value })}
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition ${
                      errors.additionalPayment ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="0.00"
                    disabled={submitting}
                  />
                  {errors.additionalPayment && <p className="mt-1 text-sm text-red-500">{errors.additionalPayment}</p>}
                </div>

                {/* Total Amount */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    {lang === 'ar' ? 'إجمالي الدفعة' : 'Total Amount'} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.totalAmount}
                    onChange={(e) => setFormData({ ...formData, totalAmount: e.target.value })}
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition ${
                      errors.totalAmount ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="0.00"
                    disabled={submitting}
                  />
                  {errors.totalAmount && <p className="mt-1 text-sm text-red-500">{errors.totalAmount}</p>}
                </div>
              </div>

              {/* Auto-calculate total */}
              {totalFromFields > 0 && (
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, totalAmount: totalFromFields.toString() })}
                    className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition text-sm font-semibold"
                  >
                    {lang === 'ar' ? 'حساب المجموع' : 'Calculate Total'}
                  </button>
                </div>
              )}
            </div>

            {/* Payment Method Section */}
            <div className="bg-gray-50 p-6 rounded-lg">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                {lang === 'ar' ? 'طريقة الدفع' : 'Payment Method'}
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Payment Method */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    {lang === 'ar' ? 'الطريقة' : 'Method'} <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.method}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      method: e.target.value,
                      chequeNo: '',
                      transferRef: ''
                    })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                    disabled={submitting}
                  >
                    <option value="CASH">{lang === 'ar' ? 'نقد' : 'Cash'}</option>
                    <option value="CHEQUE">{lang === 'ar' ? 'شيك' : 'Cheque'}</option>
                    <option value="TRANSFER">{lang === 'ar' ? 'تحويل بنكي' : 'Transfer'}</option>
                  </select>
                </div>

                {/* Method-specific field */}
                {formData.method === 'CHEQUE' && (
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      {lang === 'ar' ? 'رقم الشيك' : 'Cheque Number'} <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.chequeNo}
                      onChange={(e) => setFormData({ ...formData, chequeNo: e.target.value })}
                      className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition ${
                        errors.chequeNo ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder={lang === 'ar' ? 'أدخل رقم الشيك' : 'Enter cheque number'}
                      disabled={submitting}
                    />
                    {errors.chequeNo && <p className="mt-1 text-sm text-red-500">{errors.chequeNo}</p>}
                  </div>
                )}

                {formData.method === 'TRANSFER' && (
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      {lang === 'ar' ? 'رقم التحويل' : 'Transfer Reference'} <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.transferRef}
                      onChange={(e) => setFormData({ ...formData, transferRef: e.target.value })}
                      className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition ${
                        errors.transferRef ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder={lang === 'ar' ? 'أدخل رقم التحويل' : 'Enter transfer reference'}
                      disabled={submitting}
                    />
                    {errors.transferRef && <p className="mt-1 text-sm text-red-500">{errors.transferRef}</p>}
                  </div>
                )}
              </div>
            </div>

            {/* Payment Date */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                {lang === 'ar' ? 'تاريخ الدفعة' : 'Payment Date'} <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={formData.paymentDate}
                onChange={(e) => setFormData({ ...formData, paymentDate: e.target.value })}
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition ${
                  errors.paymentDate ? 'border-red-500' : 'border-gray-300'
                }`}
                disabled={submitting}
              />
              {errors.paymentDate && <p className="mt-1 text-sm text-red-500">{errors.paymentDate}</p>}
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                {lang === 'ar' ? 'ملاحظات' : 'Notes'}
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                placeholder={lang === 'ar' ? 'أدخل ملاحظات' : 'Enter notes'}
                rows={4}
                disabled={submitting}
              />
            </div>

            {/* Submit Buttons */}
            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={() => navigate('/finance/client-payments')}
                className="flex-1 px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition font-semibold"
                disabled={submitting}
              >
                {lang === 'ar' ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold py-3 rounded-lg hover:from-blue-700 hover:to-blue-800 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <DollarSign className="w-5 h-5" />
                {lang === 'ar' ? 'تسجيل الدفعة' : 'Register Payment'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CreateClientPayment;