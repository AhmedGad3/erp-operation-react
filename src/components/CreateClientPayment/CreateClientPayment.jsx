import React, { useState, useEffect, useContext, useMemo } from 'react';
import {
  DollarSign, ArrowLeft, CreditCard, Calendar, Users,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
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

const CreateClientPayment = () => {
  const { lang } = useContext(LanguageContext);
  const navigate = useNavigate();

  const [clients, setClients] = useState([]);
  const [projects, setProjects] = useState([]);
  const [summary, setSummary] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState({});

  const [formData, setFormData] = useState({
    clientId: '',
    projectId: '',
    totalAmount: '',
    method: 'CASH',
    chequeNo: '',
    transferRef: '',
    paymentDate: new Date().toISOString().split('T')[0],
    notes: '',
  });

  const set = (key, val) => setFormData((prev) => ({ ...prev, [key]: val }));
  const amount = Number(formData.totalAmount) || 0;

  useEffect(() => {
    fetchClients();
  }, []);

  useEffect(() => {
    if (formData.clientId) fetchProjectsByClient(formData.clientId);
    else {
      setProjects([]);
      set('projectId', '');
      setSummary(null);
    }
  }, [formData.clientId]);

  useEffect(() => {
    if (formData.projectId) fetchProjectSummary(formData.projectId);
    else setSummary(null);
  }, [formData.projectId]);

  const fetchClients = async () => {
    try {
      setLoading(true);
      const res = await axiosInstance.get('/clients');
      const data = Array.isArray(res.data) ? res.data : res.data.result || [];
      setClients(data.filter((c) => c.isActive !== false));
    } catch (err) {
      toast.error(getErrorMessage(err, lang === 'ar' ? 'فشل تحميل العملاء' : 'Failed to load clients'));
    } finally {
      setLoading(false);
    }
  };

  const fetchProjectsByClient = async (clientId) => {
    try {
      const res = await axiosInstance.get('/projects');
      const all = Array.isArray(res.data) ? res.data : res.data.result || [];
      setProjects(all.filter((p) => {
        const pid = typeof p.clientId === 'object' ? p.clientId._id || p.clientId.id : p.clientId;
        return pid === clientId && p.isActive !== false;
      }));
    } catch (err) {
      toast.error(getErrorMessage(err, lang === 'ar' ? 'فشل تحميل المشاريع' : 'Failed to load projects'));
    }
  };

  const fetchProjectSummary = async (projectId) => {
    try {
      const res = await axiosInstance.get(`/projects/payments/summary/${projectId}`);
      setSummary(res.data?.result || null);
    } catch (err) {
      setSummary(null);
      toast.error(getErrorMessage(err, lang === 'ar' ? 'فشل تحميل ملخص المشروع' : 'Failed to load project summary'));
    }
  };

  const fmt = (v) => new Intl.NumberFormat(lang === 'ar' ? 'ar-EG' : 'en-US', {
    style: 'currency',
    currency: 'EGP',
    minimumFractionDigits: 0,
  }).format(v || 0);

  const selectedProject = projects.find((p) => p._id === formData.projectId);

  const paymentPreview = useMemo(() => {
    if (!summary || amount <= 0) {
      return {
        contractPayment: 0,
        additionalPayment: 0,
        exceedsLimit: false,
      };
    }

    const contractRemaining = Math.max(summary.contractRemaining || 0, 0);
    const ledgerBalance = Math.max(summary.ledgerBalance || 0, 0);
    const contractPayment = Math.min(amount, contractRemaining);
    const additionalPayment = Math.max(amount - contractPayment, 0);
    const maxAllowed = contractRemaining + ledgerBalance;

    return {
      contractPayment,
      additionalPayment,
      exceedsLimit: amount > maxAllowed,
    };
  }, [summary, amount]);

  const validate = () => {
    const e = {};
    if (!formData.clientId) e.clientId = lang === 'ar' ? 'اختر عميل' : 'Please select a client';
    if (!formData.projectId) e.projectId = lang === 'ar' ? 'اختر مشروع' : 'Please select a project';
    if (!formData.totalAmount || amount <= 0) {
      e.totalAmount = lang === 'ar' ? 'أدخل مبلغًا صحيحًا' : 'Enter a valid amount';
    }
    if (paymentPreview.exceedsLimit) {
      e.totalAmount = lang === 'ar' ? 'المبلغ يتجاوز المستحق على المشروع' : 'Amount exceeds remaining due';
    }
    if (formData.method === 'CHEQUE' && !formData.chequeNo) {
      e.chequeNo = lang === 'ar' ? 'أدخل رقم الشيك' : 'Enter cheque number';
    }
    if (formData.method === 'TRANSFER' && !formData.transferRef) {
      e.transferRef = lang === 'ar' ? 'أدخل رقم التحويل' : 'Enter transfer reference';
    }
    if (!formData.paymentDate) e.paymentDate = lang === 'ar' ? 'حدد التاريخ' : 'Select a date';
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
        projectId: formData.projectId,
        totalAmount: amount,
        method: formData.method,
        paymentDate: formData.paymentDate,
        notes: formData.notes.trim(),
      };
      if (formData.method === 'CHEQUE') payload.chequeNo = formData.chequeNo.trim();
      if (formData.method === 'TRANSFER') payload.transferRef = formData.transferRef.trim();

      const res = await axiosInstance.post('/projects/payments', payload);
      const paymentId = res.data.result._id;
      toast.success(lang === 'ar' ? 'تم إنشاء الدفعة بنجاح!' : 'Payment created successfully!');
      setTimeout(() => navigate(`/finance/client-payments/${paymentId}`), 1500);
    } catch (err) {
      toast.error(getErrorMessage(err, lang === 'ar' ? 'فشل إنشاء الدفعة' : 'Failed to create payment'));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <FullPageLoader text={lang === 'ar' ? 'جاري التحميل...' : 'Loading...'} />;
  if (submitting) return <FullPageLoader text={lang === 'ar' ? 'جاري المعالجة...' : 'Processing...'} />;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {lang === 'ar' ? 'دفعة عميل' : 'Client Payment'}
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              {lang === 'ar' ? 'أدخل مبلغًا واحدًا وسنوزعه تلقائيًا على العقد ثم الإضافي' : 'Enter one amount and it will be allocated automatically'}
            </p>
          </div>
          <button
            onClick={() => navigate('/finance/client-payments')}
            className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition font-medium text-sm bg-white"
          >
            <ArrowLeft className="w-4 h-4" />
            {lang === 'ar' ? 'رجوع' : 'Back'}
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Section icon={Users} title={lang === 'ar' ? 'اختر العميل والمشروع' : 'Select Client & Project'}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label={lang === 'ar' ? 'العميل' : 'Client'} required error={errors.clientId}>
                <select
                  value={formData.clientId}
                  onChange={(e) => set('clientId', e.target.value)}
                  className={inputCls(errors.clientId)}
                  disabled={submitting}
                >
                  <option value="">{lang === 'ar' ? 'اختر عميل' : 'Select a client'}</option>
                  {clients.map((c) => (
                    <option key={c._id} value={c._id}>
                      {lang === 'ar' ? c.nameAr : c.nameEn} ({c.code})
                    </option>
                  ))}
                </select>
              </Field>

              <Field label={lang === 'ar' ? 'المشروع' : 'Project'} required error={errors.projectId}>
                <select
                  value={formData.projectId}
                  onChange={(e) => set('projectId', e.target.value)}
                  className={inputCls(errors.projectId)}
                  disabled={!formData.clientId || submitting}
                >
                  <option value="">
                    {!formData.clientId
                      ? (lang === 'ar' ? 'اختر عميل أولاً' : 'Select client first')
                      : (lang === 'ar' ? 'اختر مشروع' : 'Select a project')}
                  </option>
                  {projects.map((p) => (
                    <option key={p._id} value={p._id}>
                      {lang === 'ar' ? p.nameAr : p.nameEn} ({p.code})
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            {selectedProject && summary && (
              <div className="mt-4 bg-gray-50 border border-gray-200 rounded-xl p-4">
                <p className="font-semibold text-gray-900 text-sm mb-3">
                  {lang === 'ar' ? selectedProject.nameAr : selectedProject.nameEn}
                  <span className="ml-2 text-xs font-normal text-gray-400">{selectedProject.code}</span>
                </p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div>
                    <p className="text-xs text-gray-500 mb-0.5">{lang === 'ar' ? 'قيمة العقد' : 'Contract'}</p>
                    <p className="font-semibold text-sm text-gray-900">{fmt(summary.contractAmount)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-0.5">{lang === 'ar' ? 'المتبقي من العقد' : 'Contract Remaining'}</p>
                    <p className="font-semibold text-sm text-amber-600">{fmt(summary.contractRemaining)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-0.5">{lang === 'ar' ? 'رصيد إضافي' : 'Additional Balance'}</p>
                    <p className="font-semibold text-sm text-purple-600">{fmt(summary.ledgerBalance)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-0.5">{lang === 'ar' ? 'إجمالي المستحق' : 'Total Due'}</p>
                    <p className="font-semibold text-sm text-red-600">{fmt((Math.max(summary.contractRemaining || 0, 0)) + (Math.max(summary.ledgerBalance || 0, 0)))}</p>
                  </div>
                </div>
              </div>
            )}
          </Section>

          <Section icon={CreditCard} title={lang === 'ar' ? 'تفاصيل الدفعة' : 'Payment Details'}>
            <Field label={lang === 'ar' ? 'المبلغ' : 'Amount'} required error={errors.totalAmount}>
              <input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={formData.totalAmount}
                onChange={(e) => set('totalAmount', e.target.value)}
                className={inputCls(errors.totalAmount)}
                disabled={submitting}
              />
            </Field>

            {summary && (
              <div className="mt-4 bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-2">
                <div className="flex justify-between text-sm text-gray-600">
                  <span>{lang === 'ar' ? 'سيذهب للعقد' : 'Allocated to contract'}</span>
                  <span className="font-medium">{fmt(paymentPreview.contractPayment)}</span>
                </div>
                <div className="flex justify-between text-sm text-indigo-600">
                  <span>{lang === 'ar' ? 'سيذهب للإضافي' : 'Allocated to additional'}</span>
                  <span className="font-medium">{fmt(paymentPreview.additionalPayment)}</span>
                </div>
                <div className="flex justify-between text-sm font-bold text-gray-900 pt-2 border-t border-gray-200">
                  <span>{lang === 'ar' ? 'الإجمالي' : 'Total'}</span>
                  <span>{fmt(amount)}</span>
                </div>
              </div>
            )}

            {summary && (
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => set('totalAmount', String(Math.max(summary.contractRemaining || 0, 0)))}
                  className="px-3 py-1.5 bg-amber-50 text-amber-700 rounded-lg hover:bg-amber-100 transition text-xs font-semibold"
                >
                  {lang === 'ar' ? 'سداد باقي العقد' : 'Pay contract remaining'}
                </button>
                <button
                  type="button"
                  onClick={() => set('totalAmount', String((Math.max(summary.contractRemaining || 0, 0)) + (Math.max(summary.ledgerBalance || 0, 0))))}
                  className="px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded-lg hover:bg-indigo-100 transition text-xs font-semibold"
                >
                  {lang === 'ar' ? 'سداد كل المستحق' : 'Pay full due'}
                </button>
                <button
                  type="button"
                  onClick={() => set('totalAmount', String((((Math.max(summary.contractRemaining || 0, 0)) + (Math.max(summary.ledgerBalance || 0, 0))) / 2).toFixed(2)))}
                  className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition text-xs font-semibold"
                >
                  {lang === 'ar' ? 'سداد النصف' : 'Pay half'}
                </button>
              </div>
            )}
          </Section>

          <Section icon={CreditCard} title={lang === 'ar' ? 'طريقة الدفع' : 'Payment Method'}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label={lang === 'ar' ? 'الطريقة' : 'Method'} required>
                <select
                  value={formData.method}
                  onChange={(e) => setFormData((prev) => ({ ...prev, method: e.target.value, chequeNo: '', transferRef: '' }))}
                  className={inputCls(false)}
                  disabled={submitting}
                >
                  <option value="CASH">{lang === 'ar' ? 'نقد' : 'Cash'}</option>
                  <option value="CHEQUE">{lang === 'ar' ? 'شيك' : 'Cheque'}</option>
                  <option value="TRANSFER">{lang === 'ar' ? 'تحويل بنكي' : 'Transfer'}</option>
                </select>
              </Field>

              {formData.method === 'CHEQUE' && (
                <Field label={lang === 'ar' ? 'رقم الشيك' : 'Cheque Number'} required error={errors.chequeNo}>
                  <input
                    type="text"
                    placeholder={lang === 'ar' ? 'أدخل رقم الشيك' : 'Enter cheque number'}
                    value={formData.chequeNo}
                    onChange={(e) => set('chequeNo', e.target.value)}
                    className={inputCls(errors.chequeNo)}
                    disabled={submitting}
                  />
                </Field>
              )}

              {formData.method === 'TRANSFER' && (
                <Field label={lang === 'ar' ? 'رقم التحويل' : 'Transfer Reference'} required error={errors.transferRef}>
                  <input
                    type="text"
                    placeholder={lang === 'ar' ? 'أدخل رقم التحويل' : 'Enter transfer reference'}
                    value={formData.transferRef}
                    onChange={(e) => set('transferRef', e.target.value)}
                    className={inputCls(errors.transferRef)}
                    disabled={submitting}
                  />
                </Field>
              )}
            </div>
          </Section>

          <Section icon={Calendar} title={lang === 'ar' ? 'تاريخ الدفعة' : 'Payment Date'}>
            <Field label={lang === 'ar' ? 'التاريخ' : 'Date'} required error={errors.paymentDate}>
              <input
                type="date"
                value={formData.paymentDate}
                onChange={(e) => set('paymentDate', e.target.value)}
                className={inputCls(errors.paymentDate)}
                disabled={submitting}
              />
            </Field>
          </Section>

          <Section>
            <Field label={lang === 'ar' ? 'ملاحظات' : 'Notes'}>
              <textarea
                rows={3}
                placeholder={lang === 'ar' ? 'أدخل ملاحظات...' : 'Enter notes...'}
                value={formData.notes}
                onChange={(e) => set('notes', e.target.value)}
                className={inputCls(false)}
                disabled={submitting}
              />
            </Field>
          </Section>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => navigate('/finance/client-payments')}
              className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition font-medium text-sm"
              disabled={submitting}
            >
              {lang === 'ar' ? 'إلغاء' : 'Cancel'}
            </button>
            <button
              type="submit"
              disabled={submitting}
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

export default CreateClientPayment;
