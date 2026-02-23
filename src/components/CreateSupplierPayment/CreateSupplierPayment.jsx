import React, { useState, useEffect, useContext } from 'react';
import { DollarSign, ArrowLeft, AlertCircle, CheckCircle, CreditCard, Building2, Calendar, Tag } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import axiosInstance, { getErrorMessage } from '../../utils/axiosInstance';
import FullPageLoader from '../Loader/Loader';
import { LanguageContext } from '../../context/LanguageContext';
import { toast } from 'react-toastify';

const CreateSupplierPayment = () => {
  const { lang, t } = useContext(LanguageContext);
  const navigate = useNavigate();
  const location = useLocation();

  const [suppliers, setSuppliers] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedSupplierBalance, setSelectedSupplierBalance] = useState(0);

  // ✅ Get supplierId from URL parameters
  const searchParams = new URLSearchParams(location.search);
  const preSelectedSupplierId = searchParams.get('supplierId');

  const [formData, setFormData] = useState({
    supplierId: '',
    amount: '',
    discountAmount: '',
    method: 'CASH',
    chequeNo: '',
    transferRef: '',
    paymentDate: new Date().toISOString().split('T')[0],
    notes: ''
  });

  const [errors, setErrors] = useState({});

  // Calculate totals
  const amount = Number(formData.amount) || 0;
  const discountAmount = Number(formData.discountAmount) || 0;
  const totalAmount = amount + discountAmount;

  useEffect(() => {
    fetchSuppliers();
  }, []);

  // ✅ Set pre-selected supplier after suppliers are loaded
  useEffect(() => {
    if (preSelectedSupplierId && suppliers.length > 0 && !formData.supplierId) {
      const supplierExists = suppliers.find(s => s._id === preSelectedSupplierId);
      if (supplierExists) {
        setFormData(prev => ({ ...prev, supplierId: preSelectedSupplierId }));
      }
    }
  }, [preSelectedSupplierId, suppliers]);

  useEffect(() => {
    if (formData.supplierId) {
      fetchSupplierBalance(formData.supplierId);
    } else {
      setSelectedSupplierBalance(0);
    }
  }, [formData.supplierId]);

  const fetchSuppliers = async () => {
    try {
      setLoading(true);
      const response = await axiosInstance.get('/suppliers');
      const suppliersData = Array.isArray(response.data) ? response.data : (response.data.result || []);
      setSuppliers(suppliersData.filter(s => s.isActive !== false));
    } catch (error) {
      toast.error(getErrorMessage(error, lang === 'ar' ? 'فشل تحميل الموردين' : 'Failed to load suppliers'));
    } finally {
      setLoading(false);
    }
  };

  const fetchSupplierBalance = async (supplierId) => {
    try {
      const { data } = await axiosInstance.get(`/ledger/supplier/${supplierId}/balance`);
      setSelectedSupplierBalance(Number(data.result?.amountDue || 0));
    } catch {
      setSelectedSupplierBalance(0);
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.supplierId) {
      newErrors.supplierId = lang === 'ar' ? 'اختر مورد' : 'Please select a supplier';
    }

    if (!formData.amount || amount <= 0) {
      newErrors.amount = lang === 'ar' ? 'أدخل المبلغ' : 'Enter a valid amount';
    }

    if (discountAmount > 0 && discountAmount >= selectedSupplierBalance) {
      newErrors.discountAmount = lang === 'ar'
        ? 'الخصم لازم يكون أقل من الرصيد'
        : 'Discount must be less than current balance';
    }

    if (totalAmount > selectedSupplierBalance) {
      newErrors.amount = lang === 'ar'
        ? 'المبلغ الإجمالي يتجاوز الرصيد الحالي'
        : 'Total amount exceeds current balance';
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
        supplierId: formData.supplierId,
        amount,
        discountAmount: discountAmount || 0,
        method: formData.method,
        paymentDate: formData.paymentDate,
        notes: formData.notes.trim()
      };

      if (formData.method === 'CHEQUE') {
        payload.chequeNo = formData.chequeNo.trim();
      } else if (formData.method === 'TRANSFER') {
        payload.transferRef = formData.transferRef.trim();
      }

      await axiosInstance.post('/supplier/payments', payload);

      toast.success(lang === 'ar' ? 'تم إضافة الدفعة بنجاح!' : 'Payment added successfully!');

      setTimeout(() => {
        navigate('/finance/supplier-payments');
      }, 1500);
    } catch (error) {
      toast.error(getErrorMessage(error, lang === 'ar' ? 'فشل إضافة الدفعة' : 'Failed to add payment'));
    } finally {
      setSubmitting(false);
    }
  };

  const getSelectedSupplier = () => {
    return suppliers.find(s => s._id === formData.supplierId);
  };

  const formatCurrency = (val) => {
    return new Intl.NumberFormat(lang === 'ar' ? 'ar-EG' : 'en-US', {
      style: 'currency',
      currency: 'EGP',
      minimumFractionDigits: 0
    }).format(val);
  };

  if (loading) {
    return <FullPageLoader text={lang === "ar" ? "جاري التحميل..." : "Loading..."} />;
  }

  const selectedSupplier = getSelectedSupplier();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-8 px-4">
      {submitting && <FullPageLoader text={lang === "ar" ? "جاري المعالجة..." : "Processing..."} />}

      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-green-600 to-green-700 px-8 py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <DollarSign className="w-8 h-8 text-white" />
                <div>
                  <h1 className="text-2xl font-bold text-white">
                    {lang === 'ar' ? 'دفعة مورد' : 'Supplier Payment'}
                  </h1>
                  <p className="text-green-100 mt-1">
                    {lang === 'ar' ? 'تسجيل دفعة جديدة للمورد' : 'Create new supplier payment'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => navigate('/finance/supplier-payments')}
                className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg transition"
              >
                <ArrowLeft className="w-4 h-4" />
                {lang === 'ar' ? 'رجوع' : 'Back'}
              </button>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-8 space-y-6">
            
            {/* Supplier Selection */}
            <div className="bg-gray-50 p-6 rounded-lg">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Building2 className="w-5 h-5" />
                {lang === 'ar' ? 'اختر المورد' : 'Select Supplier'}
              </h3>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  {lang === 'ar' ? 'المورد' : 'Supplier'} <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.supplierId}
                  onChange={(e) => setFormData({ ...formData, supplierId: e.target.value })}
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition ${
                    errors.supplierId ? 'border-red-500' : 'border-gray-300'
                  }`}
                  disabled={submitting}
                >
                  <option value="">{lang === 'ar' ? 'اختر مورد' : 'Select a supplier'}</option>
                  {suppliers.map((supplier) => (
                    <option key={supplier._id} value={supplier._id}>
                      {lang === 'ar' ? supplier.nameAr : supplier.nameEn} ({supplier.code})
                    </option>
                  ))}
                </select>
                {errors.supplierId && <p className="mt-1 text-sm text-red-500">{errors.supplierId}</p>}
              </div>

              {/* Supplier Info Card */}
              {selectedSupplier && (
                <div className="mt-6 p-4 bg-white border-l-4 border-green-500 rounded">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <p className="text-sm text-gray-600 mb-1">
                        {lang === 'ar' ? 'اسم المورد' : 'Supplier Name'}
                      </p>
                      <p className="text-lg font-semibold text-gray-900">
                        {lang === 'ar' ? selectedSupplier.nameAr : selectedSupplier.nameEn}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 mb-1">
                        {lang === 'ar' ? 'الكود' : 'Code'}
                      </p>
                      <p className="text-lg font-semibold text-gray-900">
                        {selectedSupplier.code}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 mb-1">
                        {lang === 'ar' ? 'المبلغ المستحق' : 'Amount Due'}
                      </p>
                      <p className={`text-lg font-semibold ${
                        selectedSupplierBalance > 0 ? 'text-red-600' : 
                        selectedSupplierBalance < 0 ? 'text-green-600' : 'text-gray-600'
                      }`}>
                        {formatCurrency(selectedSupplierBalance)}
                      </p>
                    </div>
                  </div>
                  {selectedSupplier.phone && (
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <p className="text-sm text-gray-600">
                        {lang === 'ar' ? 'الهاتف:' : 'Phone:'} <span className="font-medium text-gray-900">{selectedSupplier.phone}</span>
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Payment Amount Section */}
            <div className="bg-gray-50 p-6 rounded-lg">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <CreditCard className="w-5 h-5" />
                {lang === 'ar' ? 'تفاصيل الدفعة' : 'Payment Details'}
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Amount */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    {lang === 'ar' ? 'المبلغ' : 'Amount'} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition ${
                      errors.amount ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="0.00"
                    disabled={submitting}
                  />
                  {errors.amount && <p className="mt-1 text-sm text-red-500">{errors.amount}</p>}
                </div>

                {/* Discount */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1">
                    <Tag className="w-4 h-4 text-green-600" />
                    {lang === 'ar' ? 'الخصم من المورد' : 'Supplier Discount'}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.discountAmount}
                    onChange={(e) => setFormData({ ...formData, discountAmount: e.target.value })}
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition ${
                      errors.discountAmount ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="0.00"
                    disabled={submitting}
                  />
                  {errors.discountAmount && <p className="mt-1 text-sm text-red-500">{errors.discountAmount}</p>}
                </div>
              </div>

              {/* Summary Box */}
              {(amount > 0 || discountAmount > 0) && (
                <div className="mt-6 bg-white border border-gray-200 rounded-lg p-4 space-y-3">
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>{lang === 'ar' ? 'الدفعة الفعلية' : 'Payment Amount'}</span>
                    <span className="font-medium">{formatCurrency(amount)}</span>
                  </div>
                  {discountAmount > 0 && (
                    <div className="flex justify-between text-sm text-green-600">
                      <span>{lang === 'ar' ? 'الخصم من المورد' : 'Supplier Discount'}</span>
                      <span className="font-medium">+ {formatCurrency(discountAmount)}</span>
                    </div>
                  )}
                  <div className="border-t pt-3 flex justify-between text-base font-bold text-gray-800">
                    <span>{lang === 'ar' ? 'الإجمالي' : 'Total'}</span>
                    <span>{formatCurrency(totalAmount)}</span>
                  </div>
                  <div className="flex justify-between text-xs text-gray-500 pt-1">
                    <span>{lang === 'ar' ? 'الرصيد بعد الدفعة' : 'Balance After'}</span>
                    <span className={`font-semibold ${totalAmount > selectedSupplierBalance ? 'text-red-500' : 'text-green-600'}`}>
                      {formatCurrency(selectedSupplierBalance - totalAmount)}
                    </span>
                  </div>
                </div>
              )}

              {/* Quick Amount Buttons */}
              {selectedSupplierBalance > 0 && (
                <div className="mt-4">
                  <p className="text-sm text-gray-600 mb-2">
                    {lang === 'ar' ? 'اختصارات سريعة:' : 'Quick Actions:'}
                  </p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, amount: selectedSupplierBalance.toString(), discountAmount: '' })}
                      className="px-4 py-2 bg-green-100 text-green-700 rounded hover:bg-green-200 transition text-sm font-semibold"
                    >
                      {lang === 'ar' ? 'دفع المبلغ الكامل' : 'Pay Full Amount'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, amount: (selectedSupplierBalance / 2).toFixed(2), discountAmount: '' })}
                      className="px-4 py-2 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition text-sm font-semibold"
                    >
                      {lang === 'ar' ? 'دفع النصف' : 'Pay Half'}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Payment Date */}
            <div className="bg-gray-50 p-6 rounded-lg">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                <Calendar className="w-4 h-4 inline mr-1" />
                {lang === 'ar' ? 'تاريخ الدفعة' : 'Payment Date'} <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={formData.paymentDate}
                onChange={(e) => setFormData({ ...formData, paymentDate: e.target.value })}
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition ${
                  errors.paymentDate ? 'border-red-500' : 'border-gray-300'
                }`}
                disabled={submitting}
              />
              {errors.paymentDate && <p className="mt-1 text-sm text-red-500">{errors.paymentDate}</p>}
            </div>

            {/* Payment Method Section */}
            <div className="bg-gray-50 p-6 rounded-lg">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                {lang === 'ar' ? 'طريقة الدفع' : 'Payment Method'}
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition"
                    disabled={submitting}
                  >
                    <option value="CASH">{lang === 'ar' ? 'نقد' : 'Cash'}</option>
                    <option value="CHEQUE">{lang === 'ar' ? 'شيك' : 'Cheque'}</option>
                    <option value="TRANSFER">{lang === 'ar' ? 'تحويل بنكي' : 'Transfer'}</option>
                  </select>
                </div>

                {formData.method === 'CHEQUE' && (
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      {lang === 'ar' ? 'رقم الشيك' : 'Cheque Number'} <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.chequeNo}
                      onChange={(e) => setFormData({ ...formData, chequeNo: e.target.value })}
                      className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition ${
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
                      className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition ${
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

            {/* Notes */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                {lang === 'ar' ? 'ملاحظات' : 'Notes'}
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition"
                placeholder={lang === 'ar' ? 'أدخل ملاحظات إضافية' : 'Enter additional notes'}
                rows={4}
                disabled={submitting}
              />
            </div>

            {/* Submit Buttons */}
            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={() => navigate('/finance/supplier-payments')}
                className="flex-1 px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition font-semibold"
                disabled={submitting}
              >
                {lang === 'ar' ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                type="submit"
                disabled={submitting || totalAmount > selectedSupplierBalance}
                className="flex-1 bg-gradient-to-r from-green-600 to-green-700 text-white font-semibold py-3 rounded-lg hover:from-green-700 hover:to-green-800 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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

export default CreateSupplierPayment;