import React, { useState, useEffect, useContext } from 'react';
import { AlertCircle, CheckCircle, Loader2, DollarSign, Calendar, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import axiosInstance from '../../utils/axiosInstance';
import FullPageLoader from '../Loader/Loader';
import { LanguageContext } from '../../context/LanguageContext';
import { toast } from 'react-toastify';

const SupplierRefundForm = () => {
    const { lang, t } = useContext(LanguageContext);
  
  const navigate = useNavigate();

  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [balanceLoading, setBalanceLoading] = useState(false);

  const [formData, setFormData] = useState({
    supplierId: '',
    amount: '',
    method: 'CASH',
    refundDate: new Date().toISOString().split('T')[0],
    notes: ''
  });

  const [balance, setBalance] = useState(0);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    fetchSuppliers();
  }, []);

  const fetchSuppliers = async () => {
    try {
      setLoading(true);
      const response = await axiosInstance.get('/suppliers');
      setSuppliers(response.data.result || []);
    } catch (error) {
      console.error('Fetch suppliers error:', error);
      toast.error(lang === 'ar' ? 'فشل تحميل الموردين' : 'Failed to load suppliers');
    } finally {
      setLoading(false);
    }
  };

  const handleSupplierChange = async (supplierId) => {
    setFormData({ ...formData, supplierId, amount: '' });
    setBalance(0);
    setErrors({});

    if (!supplierId) return;

    try {
      setBalanceLoading(true);
      const response = await axiosInstance.get(`/ledger/supplier/${supplierId}/balance`);
      const fetchedBalance = response.data.result?.amountDue ?? 0;
      setBalance(Number(fetchedBalance));
    } catch (error) {
      console.error('Balance fetch error:', error);
      toast.error(lang === 'ar' ? 'فشل تحميل رصيد المورد' : 'Failed to load supplier balance');
      setBalance(0);
    } finally {
      setBalanceLoading(false);
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.supplierId) newErrors.supplierId = 'Please select a supplier';
    if (!formData.amount || parseFloat(formData.amount) <= 0) newErrors.amount = 'Amount must be greater than 0';

    const numBalance = Number(balance) || 0;
    if (numBalance >= 0) newErrors.balance = 'No refund due. Supplier balance must be negative';
    if (parseFloat(formData.amount) > Math.abs(numBalance)) {
      newErrors.amount = `Amount cannot exceed ${Math.abs(numBalance).toFixed(2)} EGP`;
    }

    if (!formData.refundDate) newErrors.refundDate = 'Refund date is required';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      toast.error(lang === 'ar' ? 'يرجى إصلاح الأخطاء قبل الإرسال' : 'Please fix the errors before submitting');
      return;
    }

    try {
      setSubmitting(true);
      const response = await axiosInstance.post('/supplier/payments/refund', {
        supplierId: formData.supplierId,
        amount: parseFloat(formData.amount),
        method: formData.method,
        refundDate: formData.refundDate,
        notes: formData.notes || undefined
      });

      toast.success(lang === 'ar' ? `تم إنشاء الاسترداد بنجاح! رقم الاسترداد #${response.data.refundNo}` : `Refund created successfully! Refund #${response.data.refundNo}`);

      // Navigate to refunds list page after successful creation
      setTimeout(() => {
        navigate('/finance/supplier-refunds');
      }, 1500);
    } catch (error) {
      const message = error.response?.data?.message || (lang === 'ar' ? 'فشل إنشاء الاسترداد' : 'Failed to create refund');
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  const numBalance = Number(balance) || 0;

  

  return (
    
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-8 px-4">
      {loading && (
  <FullPageLoader  text={lang === "ar" ? "جاري التحميل..." : "Loading..."} />
)}
      {/* Toast */}

      {/* Submitting Overlay */}
        {submitting && <FullPageLoader
                text={lang === "ar" ? "جاري المعالجة..." : "Processing..."}
              />}

      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-red-600 to-red-700 px-8 py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <DollarSign className="w-8 h-8 text-white" />
                <div>
                  <h1 className="text-2xl font-bold text-white">
                    {lang === "ar" ? "إنشاء مرتجع مورد" : "Create Supplier Refund"}
                  </h1>
                  <p className="text-blue-100 mt-1">
                    {lang === "ar" ? "إرجاع الأموال للمورد" : "Refund money to supplier"}
                  </p>
                </div>
              </div>
              <button
                onClick={() => navigate('/finance/supplier-refunds')}
                className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg transition"
              >
                <ArrowLeft className="w-4 h-4" />
                {lang === "ar" ? "رجوع" : "Back"}
              </button>
            </div>
          </div>

          {/* Form */}
          <div className="p-8 space-y-6">
            {/* Supplier & Date */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  {lang === "ar" ? "المورد" : "Supplier"} <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.supplierId}
                  onChange={(e) => handleSupplierChange(e.target.value)}
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent transition ${
                    errors.supplierId ? 'border-red-500' : 'border-gray-300'
                  }`}
                  disabled={submitting}
                >
                  <option value="">{lang === "ar" ? "اختر مورد..." : "Select Supplier..."}</option>
                  {suppliers.map((supplier) => (
                    <option key={supplier._id} value={supplier._id}>
                      {supplier.nameEn} - {supplier.nameAr}
                    </option>
                  ))}
                </select>
                {errors.supplierId && <p className="mt-1 text-sm text-red-500">{errors.supplierId}</p>}
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  {lang === "ar" ? "تاريخ المرتجع" : "Refund Date"} <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="date"
                    value={formData.refundDate}
                    onChange={(e) => setFormData({ ...formData, refundDate: e.target.value })}
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent transition ${
                      errors.refundDate ? 'border-red-500' : 'border-gray-300'
                    }`}
                    disabled={submitting}
                  />
                  <Calendar className="absolute right-3 top-3.5 w-5 h-5 text-gray-400 pointer-events-none" />
                </div>
                {errors.refundDate && <p className="mt-1 text-sm text-red-500">{errors.refundDate}</p>}
              </div>
            </div>

            {/* Balance Card */}
            {formData.supplierId && (
              <div className={`p-4 rounded-lg border-l-4 ${
                balanceLoading ? 'bg-gray-50 border-gray-400' :
                numBalance < 0 ? 'bg-blue-50 border-red-500' : 
                'bg-red-50 border-red-500'
              }`}>
                {balanceLoading ? (
                  <div className="flex items-center gap-2 text-gray-600">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>{lang === "ar" ? "جاري تحميل الرصيد..." : "Loading balance..."}</span>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700">
                        {lang === "ar" ? "الرصيد الحالي:" : "Current Balance:"}
                      </span>
                      <span className={`text-lg font-bold ${numBalance < 0 ? 'text-red-600' : 'text-red-600'}`}>
                        {numBalance.toFixed(2)} EGP
                      </span>
                    </div>
                    {numBalance < 0 ? (
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-700">
                          {lang === "ar" ? "الحد الأقصى للمرتجع:" : "Max Refund Available:"}
                        </span>
                        <span className="text-lg font-bold text-green-600">{Math.abs(numBalance).toFixed(2)} EGP</span>
                      </div>
                    ) : (
                      <p className="text-sm text-red-600 font-medium">
                        ⚠️ {lang === "ar" 
                          ? "لا يوجد مرتجع مستحق. يجب أن يكون رصيد المورد سالب." 
                          : "No refund due. Supplier must have negative balance."}
                      </p>
                    )}
                  </div>
                )}
                {errors.balance && <p className="mt-2 text-sm text-red-600 font-medium">{errors.balance}</p>}
              </div>
            )}

            {/* Amount & Method */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  {lang === "ar" ? "مبلغ المرتجع" : "Refund Amount"} <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent transition ${
                    errors.amount ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="0.00"
                  disabled={submitting || !formData.supplierId || numBalance >= 0}
                />
                {errors.amount && <p className="mt-1 text-sm text-red-500">{errors.amount}</p>}
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  {lang === "ar" ? "طريقة الدفع" : "Payment Method"} <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.method}
                  onChange={(e) => setFormData({ ...formData, method: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent transition"
                  disabled={submitting}
                >
                  <option value="CASH">{lang === "ar" ? "نقدي" : "Cash"}</option>
                  <option value="BANK">{lang === "ar" ? "تحويل بنكي" : "Bank Transfer"}</option>
                  <option value="CHECK">{lang === "ar" ? "شيك" : "Check"}</option>
                </select>
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                {lang === "ar" ? "ملاحظات (اختياري)" : "Notes (Optional)"}
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows="3"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent transition resize-none"
                placeholder={lang === "ar" ? "أضف أي ملاحظات إضافية..." : "Add any additional notes..."}
                disabled={submitting}
              />
            </div>

            {/* Submit Button */}
            <button
              onClick={handleSubmit}
              disabled={submitting || !formData.supplierId || numBalance >= 0}
              className="w-full bg-gradient-to-r from-red-600 to-red-700 text-white font-semibold py-4 rounded-lg hover:from-blue-700 hover:to-blue-800 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  {lang === "ar" ? "جاري المعالجة..." : "Processing..."}
                </>
              ) : (
                <>
                  <DollarSign className="w-5 h-5" />
                  {lang === "ar" ? "إرسال المرتجع" : "Submit Refund"}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SupplierRefundForm;