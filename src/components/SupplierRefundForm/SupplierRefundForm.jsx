import React, { useState, useEffect, useContext } from 'react';
import { DollarSign, ArrowLeft, Calendar, Loader2, Building2, CreditCard } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import axiosInstance from '../../utils/axiosInstance';
import FullPageLoader from '../Loader/Loader';
import { LanguageContext } from '../../context/LanguageContext';
import { toast } from 'react-toastify';

// ── Section wrapper ───────────────────────────────────────
const Section = ({ icon: Icon, title, children }) => (
  <div className="bg-white border border-gray-200 rounded-2xl p-6">
    {title && (
      <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-900 mb-5">
        {Icon && <Icon className="w-4 h-4 text-gray-400" />}
        {title}
      </h3>
    )}
    {children}
  </div>
);

// ── Field wrapper ─────────────────────────────────────────
const Field = ({ label, required, error, children }) => (
  <div>
    <label className="block text-sm font-medium text-gray-700 mb-1.5">
      {label}{required && <span className="text-red-500 ml-0.5">*</span>}
    </label>
    {children}
    {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
  </div>
);

const inputCls = (err) =>
  `w-full px-4 py-2.5 border ${err ? 'border-red-400' : 'border-gray-200'} rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-gray-50 transition`;

// ── Main ──────────────────────────────────────────────────
const SupplierRefundForm = () => {
  const { lang }  = useContext(LanguageContext);
  const navigate  = useNavigate();

  const [suppliers,      setSuppliers]      = useState([]);
  const [loading,        setLoading]        = useState(true);
  const [submitting,     setSubmitting]     = useState(false);
  const [balanceLoading, setBalanceLoading] = useState(false);
  const [balance,        setBalance]        = useState(0);
  const [errors,         setErrors]         = useState({});

  const [formData, setFormData] = useState({
    supplierId: '',
    amount:     '',
    method:     'CASH',
    refundDate: new Date().toISOString().split('T')[0],
    notes:      '',
  });

  const set = (key, val) => setFormData(p => ({ ...p, [key]: val }));

  useEffect(() => { fetchSuppliers(); }, []);

  const fetchSuppliers = async () => {
    try {
      setLoading(true);
      const res = await axiosInstance.get('/suppliers');
      setSuppliers(res.data.result || []);
    } catch {
      toast.error(lang === 'ar' ? 'فشل تحميل الموردين' : 'Failed to load suppliers');
    } finally {
      setLoading(false);
    }
  };

  const handleSupplierChange = async (supplierId) => {
    setFormData(p => ({ ...p, supplierId, amount: '' }));
    setBalance(0);
    setErrors({});
    if (!supplierId) return;
    try {
      setBalanceLoading(true);
      const res = await axiosInstance.get(`/ledger/supplier/${supplierId}/balance`);
      setBalance(Number(res.data.result?.amountDue ?? 0));
    } catch {
      toast.error(lang === 'ar' ? 'فشل تحميل رصيد المورد' : 'Failed to load supplier balance');
    } finally {
      setBalanceLoading(false);
    }
  };

  const validate = () => {
    const e = {};
    if (!formData.supplierId) e.supplierId = lang === 'ar' ? 'اختر مورد' : 'Please select a supplier';
    if (!formData.amount || parseFloat(formData.amount) <= 0)
      e.amount = lang === 'ar' ? 'المبلغ يجب أن يكون أكبر من صفر' : 'Amount must be greater than 0';
    if (balance >= 0)
      e.balance = lang === 'ar' ? 'لا يوجد مرتجع مستحق. رصيد المورد يجب أن يكون سالباً' : 'No refund due. Supplier balance must be negative';
    if (parseFloat(formData.amount) > Math.abs(balance))
      e.amount = lang === 'ar'
        ? `المبلغ لا يمكن أن يتجاوز ${Math.abs(balance).toFixed(2)} EGP`
        : `Amount cannot exceed ${Math.abs(balance).toFixed(2)} EGP`;
    if (!formData.refundDate) e.refundDate = lang === 'ar' ? 'حدد التاريخ' : 'Select a date';
    setErrors(e);
    return !Object.keys(e).length;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) { toast.error(lang === 'ar' ? 'يرجى إصلاح الأخطاء' : 'Please fix errors'); return; }
    try {
      setSubmitting(true);
      const res = await axiosInstance.post('/supplier/payments/refund', {
        supplierId: formData.supplierId,
        amount:     parseFloat(formData.amount),
        method:     formData.method,
        refundDate: formData.refundDate,
        notes:      formData.notes || undefined,
      });
      toast.success(lang === 'ar'
        ? `تم إنشاء الاسترداد بنجاح! رقم الاسترداد #${res.data.refundNo}`
        : `Refund created! Refund #${res.data.refundNo}`);
      setTimeout(() => navigate('/finance/supplier-refunds'), 1500);
    } catch (err) {
      toast.error(err.response?.data?.message || (lang === 'ar' ? 'فشل إنشاء الاسترداد' : 'Failed to create refund'));
    } finally {
      setSubmitting(false);
    }
  };

  const selectedSupplier = suppliers.find(s => s._id === formData.supplierId);
  const numBalance        = Number(balance) || 0;
  const canRefund         = numBalance < 0;

  if (loading)    return <FullPageLoader text={lang === 'ar' ? 'جاري التحميل...' : 'Loading...'} />;
  if (submitting) return <FullPageLoader text={lang === 'ar' ? 'جاري المعالجة...' : 'Processing...'} />;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-3xl mx-auto">

        {/* ── Page Header ── */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {lang === 'ar' ? 'إنشاء مرتجع مورد' : 'Create Supplier Refund'}
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              {lang === 'ar' ? 'إرجاع الأموال للمورد' : 'Refund money back to supplier'}
            </p>
          </div>
          <button
            onClick={() => navigate('/finance/supplier-refunds')}
            className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition font-medium text-sm bg-white"
          >
            <ArrowLeft className="w-4 h-4" />
            {lang === 'ar' ? 'رجوع' : 'Back'}
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">

          {/* ── Supplier & Date ── */}
          <Section icon={Building2} title={lang === 'ar' ? 'بيانات المرتجع' : 'Refund Info'}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label={lang === 'ar' ? 'المورد' : 'Supplier'} required error={errors.supplierId}>
                <select
                  value={formData.supplierId}
                  onChange={e => handleSupplierChange(e.target.value)}
                  className={inputCls(errors.supplierId)}
                  disabled={submitting}
                >
                  <option value="">{lang === 'ar' ? 'اختر مورد...' : 'Select Supplier...'}</option>
                  {suppliers.map(s => (
                    <option key={s._id} value={s._id}>
                      {s.nameEn} - {s.nameAr}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label={lang === 'ar' ? 'تاريخ المرتجع' : 'Refund Date'} required error={errors.refundDate}>
                <input
                  type="date"
                  value={formData.refundDate}
                  onChange={e => set('refundDate', e.target.value)}
                  className={inputCls(errors.refundDate)}
                  disabled={submitting}
                />
              </Field>
            </div>

            {/* Supplier balance card */}
            {formData.supplierId && (
              <div className="mt-4">
                {balanceLoading ? (
                  <div className="flex items-center gap-2 text-sm text-gray-500 bg-gray-50 border border-gray-200 rounded-xl p-4">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {lang === 'ar' ? 'جاري تحميل الرصيد...' : 'Loading balance...'}
                  </div>
                ) : (
                  <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-2">
                    {selectedSupplier && (
                      <div className="flex items-center gap-3 mb-3 pb-3 border-b border-gray-200">
                        <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
                          <span className="text-indigo-600 font-semibold text-sm">
                            {selectedSupplier.nameEn?.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 text-sm">{selectedSupplier.nameEn}</p>
                          <p className="text-xs text-gray-400">{selectedSupplier.code}</p>
                        </div>
                      </div>
                    )}
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">{lang === 'ar' ? 'الرصيد الحالي' : 'Current Balance'}</span>
                      <span className={`font-bold ${numBalance < 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {numBalance.toFixed(2)} EGP
                      </span>
                    </div>
                    {canRefund ? (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">{lang === 'ar' ? 'الحد الأقصى للمرتجع' : 'Max Refund'}</span>
                        <span className="font-bold text-indigo-600">{Math.abs(numBalance).toFixed(2)} EGP</span>
                      </div>
                    ) : (
                      <p className="text-xs text-red-500 font-medium pt-1">
                        ⚠️ {lang === 'ar' ? 'لا يوجد مرتجع مستحق. يجب أن يكون رصيد المورد سالباً.' : 'No refund due. Supplier must have a negative balance.'}
                      </p>
                    )}
                    {errors.balance && <p className="text-xs text-red-500">{errors.balance}</p>}
                  </div>
                )}
              </div>
            )}
          </Section>

          {/* ── Amount & Method ── */}
          <Section icon={CreditCard} title={lang === 'ar' ? 'تفاصيل الدفع' : 'Payment Details'}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label={lang === 'ar' ? 'مبلغ المرتجع' : 'Refund Amount'} required error={errors.amount}>
                <input
                  type="number" step="0.01" placeholder="0.00"
                  value={formData.amount}
                  onChange={e => set('amount', e.target.value)}
                  className={inputCls(errors.amount)}
                  disabled={submitting || !formData.supplierId || !canRefund}
                />
              </Field>

              <Field label={lang === 'ar' ? 'طريقة الدفع' : 'Payment Method'} required>
                <select
                  value={formData.method}
                  onChange={e => set('method', e.target.value)}
                  className={inputCls(false)}
                  disabled={submitting}
                >
                  <option value="CASH">{lang === 'ar' ? 'نقدي' : 'Cash'}</option>
                  <option value="BANK">{lang === 'ar' ? 'تحويل بنكي' : 'Bank Transfer'}</option>
                  <option value="CHECK">{lang === 'ar' ? 'شيك' : 'Check'}</option>
                </select>
              </Field>
            </div>
          </Section>

          {/* ── Notes ── */}
          <Section>
            <Field label={lang === 'ar' ? 'ملاحظات (اختياري)' : 'Notes (Optional)'}>
              <textarea
                value={formData.notes}
                onChange={e => set('notes', e.target.value)}
                rows={3}
                placeholder={lang === 'ar' ? 'أضف أي ملاحظات إضافية...' : 'Add any additional notes...'}
                className={inputCls(false)}
                disabled={submitting}
              />
            </Field>
          </Section>

          {/* ── Actions ── */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => navigate('/finance/supplier-refunds')}
              className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition font-medium text-sm"
              disabled={submitting}
            >
              {lang === 'ar' ? 'إلغاء' : 'Cancel'}
            </button>
            <button
              type="submit"
              disabled={submitting || !formData.supplierId || !canRefund}
              className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-xl hover:bg-red-700 transition font-semibold text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <DollarSign className="w-4 h-4" />
              {lang === 'ar' ? 'إرسال المرتجع' : 'Submit Refund'}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};

export default SupplierRefundForm;