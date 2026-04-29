import React, { useState, useEffect, useContext } from 'react';
import {
  DollarSign,
  ArrowLeft,
  CreditCard,
  Building2,
  Calendar,
  Tag,
} from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import axiosInstance, { getErrorMessage } from '../../utils/axiosInstance';
import FullPageLoader from '../Loader/Loader';
import { LanguageContext } from '../../context/LanguageContext';
import { toast } from 'react-toastify';

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

const Field = ({ label, required, error, children }) => (
  <div>
    <label className="block text-sm font-medium text-gray-700 mb-1.5">
      {label}
      {required && <span className="text-red-500 ml-0.5">*</span>}
    </label>
    {children}
    {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
  </div>
);

const inputCls = (err) =>
  `w-full px-4 py-2.5 border ${err ? 'border-red-400' : 'border-gray-200'} rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-gray-50 transition`;

const CreateSupplierPayment = () => {
  const { lang } = useContext(LanguageContext);
  const navigate = useNavigate();
  const location = useLocation();

  const [suppliers, setSuppliers] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedSupplierBalance, setSelectedSupplierBalance] = useState(0);
  const [errors, setErrors] = useState({});

  const preSelectedSupplierId = new URLSearchParams(location.search).get(
    'supplierId',
  );

  const [formData, setFormData] = useState({
    supplierId: '',
    amount: '',
    discountAmount: '',
    method: 'CASH',
    chequeNo: '',
    transferRef: '',
    paymentDate: new Date().toISOString().split('T')[0],
    notes: '',
  });

  const amount = Number(formData.amount) || 0;
  const discountAmount = Number(formData.discountAmount) || 0;
  const totalAmount = amount + discountAmount;
  const balanceAfter = selectedSupplierBalance - totalAmount;
  const payableAfterDiscount = Math.max(
    selectedSupplierBalance - discountAmount,
    0,
  );

  const set = (key, val) => setFormData((p) => ({ ...p, [key]: val }));

  useEffect(() => {
    fetchSuppliers();
  }, []);

  useEffect(() => {
    if (preSelectedSupplierId && suppliers.length && !formData.supplierId) {
      if (suppliers.find((s) => s._id === preSelectedSupplierId)) {
        set('supplierId', preSelectedSupplierId);
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
      const res = await axiosInstance.get('/suppliers');
      const data = Array.isArray(res.data) ? res.data : res.data.result || [];
      setSuppliers(data.filter((s) => s.isActive !== false));
    } catch (err) {
      toast.error(
        getErrorMessage(
          err,
          lang === 'ar' ? 'فشل تحميل الموردين' : 'Failed to load suppliers',
        ),
      );
    } finally {
      setLoading(false);
    }
  };

  const fetchSupplierBalance = async (id) => {
    try {
      const { data } = await axiosInstance.get(`/ledger/supplier/${id}/balance`);
      setSelectedSupplierBalance(Number(data.result?.amountDue || 0));
    } catch {
      setSelectedSupplierBalance(0);
    }
  };

  const validate = () => {
    const e = {};
    if (!formData.supplierId) {
      e.supplierId = lang === 'ar' ? 'اختر مورد' : 'Please select a supplier';
    }
    if (!formData.amount || amount <= 0) {
      e.amount = lang === 'ar' ? 'أدخل المبلغ' : 'Enter a valid amount';
    }
    if (discountAmount > 0 && discountAmount >= selectedSupplierBalance) {
      e.discountAmount =
        lang === 'ar'
          ? 'الخصم لازم يكون أقل من الرصيد'
          : 'Discount must be less than balance';
    }
    if (totalAmount > selectedSupplierBalance) {
      e.amount =
        lang === 'ar'
          ? 'المبلغ الإجمالي يتجاوز الرصيد'
          : 'Total exceeds current balance';
    }
    if (formData.method === 'CHEQUE' && !formData.chequeNo) {
      e.chequeNo =
        lang === 'ar' ? 'أدخل رقم الشيك' : 'Enter cheque number';
    }
    if (formData.method === 'TRANSFER' && !formData.transferRef) {
      e.transferRef =
        lang === 'ar' ? 'أدخل رقم التحويل' : 'Enter transfer reference';
    }
    if (!formData.paymentDate) {
      e.paymentDate = lang === 'ar' ? 'حدد التاريخ' : 'Select a date';
    }
    setErrors(e);
    return !Object.keys(e).length;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) {
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
        notes: formData.notes.trim(),
      };
      if (formData.method === 'CHEQUE') {
        payload.chequeNo = formData.chequeNo.trim();
      }
      if (formData.method === 'TRANSFER') {
        payload.transferRef = formData.transferRef.trim();
      }
      await axiosInstance.post('/supplier/payments', payload);
      toast.success(
        lang === 'ar'
          ? 'تم إضافة الدفعة بنجاح!'
          : 'Payment added successfully!',
      );
      setTimeout(() => navigate('/finance/supplier-payments'), 1500);
    } catch (err) {
      toast.error(
        getErrorMessage(
          err,
          lang === 'ar' ? 'فشل إضافة الدفعة' : 'Failed to add payment',
        ),
      );
    } finally {
      setSubmitting(false);
    }
  };

  const fmt = (value) =>
    new Intl.NumberFormat(lang === 'ar' ? 'ar-EG' : 'en-US', {
      style: 'currency',
      currency: 'EGP',
      minimumFractionDigits: 0,
    }).format(value);

  const selectedSupplier = suppliers.find((s) => s._id === formData.supplierId);

  if (loading) {
    return <FullPageLoader text={lang === 'ar' ? 'جاري التحميل...' : 'Loading...'} />;
  }
  if (submitting) {
    return (
      <FullPageLoader
        text={lang === 'ar' ? 'جاري المعالجة...' : 'Processing...'}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {lang === 'ar' ? 'دفعة مورد' : 'Supplier Payment'}
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              {lang === 'ar'
                ? 'تسجيل دفعة جديدة للمورد'
                : 'Create a new supplier payment'}
            </p>
          </div>
          <button
            onClick={() => navigate('/finance/supplier-payments')}
            className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition font-medium text-sm bg-white"
          >
            <ArrowLeft className="w-4 h-4" />
            {lang === 'ar' ? 'رجوع' : 'Back'}
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Section
            icon={Building2}
            title={lang === 'ar' ? 'اختر المورد' : 'Select Supplier'}
          >
            <Field
              label={lang === 'ar' ? 'المورد' : 'Supplier'}
              required
              error={errors.supplierId}
            >
              <select
                value={formData.supplierId}
                onChange={(e) => set('supplierId', e.target.value)}
                className={inputCls(errors.supplierId)}
                disabled={submitting}
              >
                <option value="">
                  {lang === 'ar' ? 'اختر مورد' : 'Select a supplier'}
                </option>
                {suppliers.map((supplier) => (
                  <option key={supplier._id} value={supplier._id}>
                    {lang === 'ar' ? supplier.nameAr : supplier.nameEn} (
                    {supplier.code})
                  </option>
                ))}
              </select>
            </Field>

            {selectedSupplier && (
              <div className="mt-4 bg-gray-50 border border-gray-200 rounded-xl p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
                    <span className="text-indigo-600 font-semibold text-sm">
                      {(lang === 'ar'
                        ? selectedSupplier.nameAr
                        : selectedSupplier.nameEn)
                        ?.charAt(0)
                        .toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 text-sm">
                      {lang === 'ar'
                        ? selectedSupplier.nameAr
                        : selectedSupplier.nameEn}
                    </p>
                    <p className="text-xs text-gray-400">
                      {selectedSupplier.code}
                      {selectedSupplier.phone
                        ? ` · ${selectedSupplier.phone}`
                        : ''}
                    </p>
                  </div>
                </div>
                <div className="flex items-center justify-between pt-3 border-t border-gray-200">
                  <span className="text-xs text-gray-500">
                    {lang === 'ar' ? 'المبلغ المستحق' : 'Amount Due'}
                  </span>
                  <span
                    className={`font-bold text-sm ${
                      selectedSupplierBalance > 0
                        ? 'text-red-600'
                        : selectedSupplierBalance < 0
                          ? 'text-green-600'
                          : 'text-gray-600'
                    }`}
                  >
                    {fmt(selectedSupplierBalance)}
                  </span>
                </div>
              </div>
            )}
          </Section>

          <Section
            icon={CreditCard}
            title={lang === 'ar' ? 'تفاصيل الدفعة' : 'Payment Details'}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field
                label={lang === 'ar' ? 'المبلغ' : 'Amount'}
                required
                error={errors.amount}
              >
                <input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={formData.amount}
                  onChange={(e) => set('amount', e.target.value)}
                  className={inputCls(errors.amount)}
                  disabled={submitting}
                />
              </Field>

              <Field
                label={
                  <span className="flex items-center gap-1">
                    <Tag className="w-3.5 h-3.5 text-indigo-500" />
                    {lang === 'ar' ? 'الخصم من المورد' : 'Supplier Discount'}
                  </span>
                }
                error={errors.discountAmount}
              >
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={formData.discountAmount}
                  onChange={(e) => set('discountAmount', e.target.value)}
                  className={inputCls(errors.discountAmount)}
                  disabled={submitting}
                />
              </Field>
            </div>

            {(amount > 0 || discountAmount > 0) && (
              <div className="mt-4 bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-2">
                <div className="flex justify-between text-sm text-gray-600">
                  <span>{lang === 'ar' ? 'الدفعة الفعلية' : 'Payment Amount'}</span>
                  <span className="font-medium">{fmt(amount)}</span>
                </div>
                {discountAmount > 0 && (
                  <div className="flex justify-between text-sm text-indigo-600">
                    <span>{lang === 'ar' ? 'الخصم' : 'Discount'}</span>
                    <span className="font-medium">+ {fmt(discountAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm font-bold text-gray-900 pt-2 border-t border-gray-200">
                  <span>{lang === 'ar' ? 'الإجمالي' : 'Total'}</span>
                  <span>{fmt(totalAmount)}</span>
                </div>
                <div className="flex justify-between text-xs pt-1">
                  <span className="text-gray-500">
                    {lang === 'ar' ? 'الرصيد بعد الدفعة' : 'Balance After'}
                  </span>
                  <span
                    className={`font-semibold ${
                      balanceAfter < 0 ? 'text-red-500' : 'text-green-600'
                    }`}
                  >
                    {fmt(balanceAfter)}
                  </span>
                </div>
              </div>
            )}

            {selectedSupplierBalance > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setFormData((p) => ({
                      ...p,
                      amount: selectedSupplierBalance.toString(),
                      discountAmount: '',
                    }))
                  }
                  className="px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition text-xs font-semibold"
                >
                  {lang === 'ar' ? 'دفع المبلغ الكامل' : 'Pay Full Amount'}
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setFormData((p) => ({
                      ...p,
                      amount: (selectedSupplierBalance / 2).toFixed(2),
                      discountAmount: '',
                    }))
                  }
                  className="px-3 py-1.5 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition text-xs font-semibold"
                >
                  {lang === 'ar' ? 'دفع النصف' : 'Pay Half'}
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setFormData((p) => ({
                      ...p,
                      amount: payableAfterDiscount.toFixed(2),
                    }))
                  }
                  className="px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-lg hover:bg-emerald-100 transition text-xs font-semibold"
                >
                  {lang === 'ar'
                    ? 'سدد الباقي بعد الخصم'
                    : 'Settle after discount'}
                </button>
              </div>
            )}
          </Section>

          <Section
            icon={Calendar}
            title={lang === 'ar' ? 'تاريخ الدفعة' : 'Payment Date'}
          >
            <Field
              label={lang === 'ar' ? 'التاريخ' : 'Date'}
              required
              error={errors.paymentDate}
            >
              <input
                type="date"
                value={formData.paymentDate}
                onChange={(e) => set('paymentDate', e.target.value)}
                className={inputCls(errors.paymentDate)}
                disabled={submitting}
              />
            </Field>
          </Section>

          <Section
            icon={CreditCard}
            title={lang === 'ar' ? 'طريقة الدفع' : 'Payment Method'}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label={lang === 'ar' ? 'الطريقة' : 'Method'} required>
                <select
                  value={formData.method}
                  onChange={(e) =>
                    setFormData((p) => ({
                      ...p,
                      method: e.target.value,
                      chequeNo: '',
                      transferRef: '',
                    }))
                  }
                  className={inputCls(false)}
                  disabled={submitting}
                >
                  <option value="CASH">{lang === 'ar' ? 'نقد' : 'Cash'}</option>
                  <option value="CHEQUE">
                    {lang === 'ar' ? 'شيك' : 'Cheque'}
                  </option>
                  <option value="TRANSFER">
                    {lang === 'ar' ? 'تحويل بنكي' : 'Transfer'}
                  </option>
                </select>
              </Field>

              {formData.method === 'CHEQUE' && (
                <Field
                  label={lang === 'ar' ? 'رقم الشيك' : 'Cheque Number'}
                  required
                  error={errors.chequeNo}
                >
                  <input
                    type="text"
                    value={formData.chequeNo}
                    onChange={(e) => set('chequeNo', e.target.value)}
                    placeholder={
                      lang === 'ar' ? 'أدخل رقم الشيك' : 'Enter cheque number'
                    }
                    className={inputCls(errors.chequeNo)}
                    disabled={submitting}
                  />
                </Field>
              )}

              {formData.method === 'TRANSFER' && (
                <Field
                  label={lang === 'ar' ? 'رقم التحويل' : 'Transfer Reference'}
                  required
                  error={errors.transferRef}
                >
                  <input
                    type="text"
                    value={formData.transferRef}
                    onChange={(e) => set('transferRef', e.target.value)}
                    placeholder={
                      lang === 'ar'
                        ? 'أدخل رقم التحويل'
                        : 'Enter transfer reference'
                    }
                    className={inputCls(errors.transferRef)}
                    disabled={submitting}
                  />
                </Field>
              )}
            </div>
          </Section>

          <Section>
            <Field label={lang === 'ar' ? 'ملاحظات' : 'Notes'}>
              <textarea
                value={formData.notes}
                onChange={(e) => set('notes', e.target.value)}
                placeholder={
                  lang === 'ar'
                    ? 'أدخل ملاحظات إضافية...'
                    : 'Add any additional notes...'
                }
                rows={3}
                className={inputCls(false)}
                disabled={submitting}
              />
            </Field>
          </Section>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => navigate('/finance/supplier-payments')}
              className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition font-medium text-sm"
              disabled={submitting}
            >
              {lang === 'ar' ? 'إلغاء' : 'Cancel'}
            </button>
            <button
              type="submit"
              disabled={submitting || totalAmount > selectedSupplierBalance}
              className="flex-1 px-4 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition font-semibold text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <DollarSign className="w-4 h-4" />
              {lang === 'ar' ? 'تسجيل الدفعة' : 'Register Payment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateSupplierPayment;
