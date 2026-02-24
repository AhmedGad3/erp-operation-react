import React, { useState, useEffect, useContext } from 'react';
import {
  DollarSign, ArrowLeft, CreditCard, Building2, Calendar, Users
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import axiosInstance, { getErrorMessage } from '../../utils/axiosInstance';
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
const CreateClientPayment = () => {
  const { lang } = useContext(LanguageContext);
  const navigate  = useNavigate();

  const [clients,    setClients]    = useState([]);
  const [projects,   setProjects]   = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [loading,    setLoading]    = useState(true);
  const [errors,     setErrors]     = useState({});

  const [formData, setFormData] = useState({
    clientId:          '',
    projectId:         '',
    totalAmount:       '',
    contractPayment:   '',
    additionalPayment: '',
    method:            'CASH',
    chequeNo:          '',
    transferRef:       '',
    paymentDate:       new Date().toISOString().split('T')[0],
    notes:             '',
  });

  const set = (key, val) => setFormData(p => ({ ...p, [key]: val }));

  useEffect(() => { fetchClients(); }, []);

  useEffect(() => {
    if (formData.clientId) fetchProjectsByClient(formData.clientId);
    else { setProjects([]); set('projectId', ''); }
  }, [formData.clientId]);

  const fetchClients = async () => {
    try {
      setLoading(true);
      const res = await axiosInstance.get('/clients');
      const data = Array.isArray(res.data) ? res.data : (res.data.result || []);
      setClients(data.filter(c => c.isActive !== false));
    } catch (err) {
      toast.error(getErrorMessage(err, lang === 'ar' ? 'فشل تحميل العملاء' : 'Failed to load clients'));
    } finally {
      setLoading(false);
    }
  };

  const fetchProjectsByClient = async (clientId) => {
    try {
      const res = await axiosInstance.get('/projects');
      const all = Array.isArray(res.data) ? res.data : (res.data.result || []);
      setProjects(all.filter(p => {
        const pid = typeof p.clientId === 'object' ? p.clientId._id || p.clientId.id : p.clientId;
        return pid === clientId && p.isActive !== false && (p.contractRemaining > 0 || p.contractRemaining === undefined);
      }));
    } catch (err) {
      toast.error(getErrorMessage(err, lang === 'ar' ? 'فشل تحميل المشاريع' : 'Failed to load projects'));
    }
  };

  const validate = () => {
    const e = {};
    if (!formData.clientId)  e.clientId  = lang === 'ar' ? 'اختر عميل' : 'Please select a client';
    if (!formData.projectId) e.projectId = lang === 'ar' ? 'اختر مشروع' : 'Please select a project';
    if (!formData.totalAmount || parseFloat(formData.totalAmount) <= 0)
      e.totalAmount = lang === 'ar' ? 'أدخل المبلغ الكلي' : 'Enter a valid total amount';
    if (!formData.contractPayment || parseFloat(formData.contractPayment) < 0)
      e.contractPayment = lang === 'ar' ? 'أدخل دفعة العقد' : 'Enter valid contract payment';
    if (!formData.additionalPayment || parseFloat(formData.additionalPayment) < 0)
      e.additionalPayment = lang === 'ar' ? 'أدخل الدفعة الإضافية' : 'Enter valid additional payment';
    const total = parseFloat(formData.contractPayment || 0) + parseFloat(formData.additionalPayment || 0);
    if (total !== parseFloat(formData.totalAmount || 0))
      e.totalAmount = lang === 'ar' ? 'مجموع الدفعات غير متطابق' : 'Total payments do not match';
    if (formData.method === 'CHEQUE' && !formData.chequeNo)
      e.chequeNo = lang === 'ar' ? 'أدخل رقم الشيك' : 'Enter cheque number';
    if (formData.method === 'TRANSFER' && !formData.transferRef)
      e.transferRef = lang === 'ar' ? 'أدخل رقم التحويل' : 'Enter transfer reference';
    if (!formData.paymentDate) e.paymentDate = lang === 'ar' ? 'حدد التاريخ' : 'Select a date';
    setErrors(e);
    return !Object.keys(e).length;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) { toast.error(lang === 'ar' ? 'يرجى إصلاح الأخطاء' : 'Please fix errors'); return; }
    try {
      setSubmitting(true);
      const payload = {
        projectId:         formData.projectId,
        totalAmount:       parseFloat(formData.totalAmount),
        contractPayment:   parseFloat(formData.contractPayment),
        additionalPayment: parseFloat(formData.additionalPayment),
        method:            formData.method,
        paymentDate:       formData.paymentDate,
        notes:             formData.notes.trim(),
      };
      if (formData.method === 'CHEQUE')   payload.chequeNo    = formData.chequeNo.trim();
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

  const fmt = (v) => new Intl.NumberFormat(lang === 'ar' ? 'ar-EG' : 'en-US', {
    style: 'currency', currency: 'EGP', minimumFractionDigits: 0,
  }).format(v);

  const selectedProject    = projects.find(p => p._id === formData.projectId);
  const totalFromFields    = parseFloat(formData.contractPayment || 0) + parseFloat(formData.additionalPayment || 0);

  if (loading)    return <FullPageLoader text={lang === 'ar' ? 'جاري التحميل...' : 'Loading...'} />;
  if (submitting) return <FullPageLoader text={lang === 'ar' ? 'جاري المعالجة...' : 'Processing...'} />;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-3xl mx-auto">

        {/* ── Page Header ── */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {lang === 'ar' ? 'دفعة عميل' : 'Client Payment'}
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              {lang === 'ar' ? 'تسجيل دفعة جديدة' : 'Create a new client payment'}
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

          {/* ── Client & Project ── */}
          <Section icon={Users} title={lang === 'ar' ? 'اختر العميل والمشروع' : 'Select Client & Project'}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label={lang === 'ar' ? 'العميل' : 'Client'} required error={errors.clientId}>
                <select
                  value={formData.clientId}
                  onChange={e => set('clientId', e.target.value)}
                  className={inputCls(errors.clientId)}
                  disabled={submitting}
                >
                  <option value="">{lang === 'ar' ? 'اختر عميل' : 'Select a client'}</option>
                  {clients.map(c => (
                    <option key={c._id} value={c._id}>
                      {lang === 'ar' ? c.nameAr : c.nameEn} ({c.code})
                    </option>
                  ))}
                </select>
              </Field>

              <Field label={lang === 'ar' ? 'المشروع' : 'Project'} required error={errors.projectId}>
                <select
                  value={formData.projectId}
                  onChange={e => set('projectId', e.target.value)}
                  className={inputCls(errors.projectId)}
                  disabled={!formData.clientId || submitting}
                >
                  <option value="">
                    {!formData.clientId
                      ? (lang === 'ar' ? 'اختر عميل أولاً' : 'Select client first')
                      : (lang === 'ar' ? 'اختر مشروع' : 'Select a project')}
                  </option>
                  {projects.map(p => (
                    <option key={p._id} value={p._id}>
                      {lang === 'ar' ? p.nameAr : p.nameEn} ({p.code})
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            {/* Project info card */}
            {selectedProject && (
              <div className="mt-4 bg-gray-50 border border-gray-200 rounded-xl p-4">
                <p className="font-semibold text-gray-900 text-sm mb-3">
                  {lang === 'ar' ? selectedProject.nameAr : selectedProject.nameEn}
                  <span className="ml-2 text-xs font-normal text-gray-400">{selectedProject.code}</span>
                </p>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <p className="text-xs text-gray-500 mb-0.5">{lang === 'ar' ? 'قيمة العقد' : 'Contract'}</p>
                    <p className="font-semibold text-sm text-gray-900">{fmt(selectedProject.contractAmount)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-0.5">{lang === 'ar' ? 'المدفوع' : 'Paid'}</p>
                    <p className="font-semibold text-sm text-green-600">{fmt(selectedProject.totalPaid || 0)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-0.5">{lang === 'ar' ? 'المتبقي' : 'Remaining'}</p>
                    <p className="font-semibold text-sm text-red-600">{fmt(selectedProject.contractRemaining || 0)}</p>
                  </div>
                </div>
              </div>
            )}
          </Section>

          {/* ── Payment Details ── */}
          <Section icon={CreditCard} title={lang === 'ar' ? 'تفاصيل الدفعة' : 'Payment Details'}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Field label={lang === 'ar' ? 'دفعة العقد' : 'Contract Payment'} required error={errors.contractPayment}>
                <input type="number" step="0.01" placeholder="0.00"
                  value={formData.contractPayment}
                  onChange={e => set('contractPayment', e.target.value)}
                  className={inputCls(errors.contractPayment)} disabled={submitting} />
              </Field>

              <Field label={lang === 'ar' ? 'دفعة إضافية' : 'Additional Payment'} required error={errors.additionalPayment}>
                <input type="number" step="0.01" placeholder="0.00"
                  value={formData.additionalPayment}
                  onChange={e => set('additionalPayment', e.target.value)}
                  className={inputCls(errors.additionalPayment)} disabled={submitting} />
              </Field>

              <Field label={lang === 'ar' ? 'إجمالي الدفعة' : 'Total Amount'} required error={errors.totalAmount}>
                <input type="number" step="0.01" placeholder="0.00"
                  value={formData.totalAmount}
                  onChange={e => set('totalAmount', e.target.value)}
                  className={inputCls(errors.totalAmount)} disabled={submitting} />
              </Field>
            </div>

            {totalFromFields > 0 && (
              <div className="mt-3">
                <button
                  type="button"
                  onClick={() => set('totalAmount', totalFromFields.toString())}
                  className="px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition text-xs font-semibold"
                >
                  {lang === 'ar' ? `حساب المجموع: ${fmt(totalFromFields)}` : `Auto-fill Total: ${fmt(totalFromFields)}`}
                </button>
              </div>
            )}
          </Section>

          {/* ── Payment Method ── */}
          <Section icon={CreditCard} title={lang === 'ar' ? 'طريقة الدفع' : 'Payment Method'}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label={lang === 'ar' ? 'الطريقة' : 'Method'} required>
                <select
                  value={formData.method}
                  onChange={e => setFormData(p => ({ ...p, method: e.target.value, chequeNo: '', transferRef: '' }))}
                  className={inputCls(false)} disabled={submitting}
                >
                  <option value="CASH">{lang === 'ar' ? 'نقد' : 'Cash'}</option>
                  <option value="CHEQUE">{lang === 'ar' ? 'شيك' : 'Cheque'}</option>
                  <option value="TRANSFER">{lang === 'ar' ? 'تحويل بنكي' : 'Transfer'}</option>
                </select>
              </Field>

              {formData.method === 'CHEQUE' && (
                <Field label={lang === 'ar' ? 'رقم الشيك' : 'Cheque Number'} required error={errors.chequeNo}>
                  <input type="text" placeholder={lang === 'ar' ? 'أدخل رقم الشيك' : 'Enter cheque number'}
                    value={formData.chequeNo} onChange={e => set('chequeNo', e.target.value)}
                    className={inputCls(errors.chequeNo)} disabled={submitting} />
                </Field>
              )}

              {formData.method === 'TRANSFER' && (
                <Field label={lang === 'ar' ? 'رقم التحويل' : 'Transfer Reference'} required error={errors.transferRef}>
                  <input type="text" placeholder={lang === 'ar' ? 'أدخل رقم التحويل' : 'Enter transfer reference'}
                    value={formData.transferRef} onChange={e => set('transferRef', e.target.value)}
                    className={inputCls(errors.transferRef)} disabled={submitting} />
                </Field>
              )}
            </div>
          </Section>

          {/* ── Date ── */}
          <Section icon={Calendar} title={lang === 'ar' ? 'تاريخ الدفعة' : 'Payment Date'}>
            <Field label={lang === 'ar' ? 'التاريخ' : 'Date'} required error={errors.paymentDate}>
              <input type="date" value={formData.paymentDate}
                onChange={e => set('paymentDate', e.target.value)}
                className={inputCls(errors.paymentDate)} disabled={submitting} />
            </Field>
          </Section>

          {/* ── Notes ── */}
          <Section>
            <Field label={lang === 'ar' ? 'ملاحظات' : 'Notes'}>
              <textarea rows={3} placeholder={lang === 'ar' ? 'أدخل ملاحظات...' : 'Enter notes...'}
                value={formData.notes} onChange={e => set('notes', e.target.value)}
                className={inputCls(false)} disabled={submitting} />
            </Field>
          </Section>

          {/* ── Actions ── */}
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