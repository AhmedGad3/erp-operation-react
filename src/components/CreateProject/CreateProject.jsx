import React, { useState, useContext } from 'react';
import { Building2, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import axiosInstance from '../../utils/axiosInstance';
import { getErrorMessage } from '../../utils/errorHandler';
import FullPageLoader from '../Loader/Loader';
import { LanguageContext } from '../../context/LanguageContext';
import { toast } from 'react-toastify';

const CreateProject = () => {
  const { lang } = useContext(LanguageContext);
  const navigate  = useNavigate();

  const [formData, setFormData] = useState({
    nameAr: '', nameEn: '', code: '', clientId: '',
    projectManager: '', siteEngineer: '', location: '',
    startDate: '', expectedEndDate: '', contractAmount: '',
    notes: '', status: 'PLANNED'
  });

  const [clients,    setClients]    = useState([]);
  const [errors,     setErrors]     = useState({});
  const [submitting, setSubmitting] = useState(false);

  React.useEffect(() => { fetchClients(); }, []);

  const fetchClients = async () => {
    try {
      const response = await axiosInstance.get('/clients');
      setClients(Array.isArray(response.data) ? response.data : (response.data.result || []));
    } catch (error) {
      toast.error(getErrorMessage(error, lang === 'ar' ? 'فشل تحميل العملاء' : 'Failed to load clients'));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.nameAr || formData.nameAr.length < 2)
      newErrors.nameAr = lang === 'ar' ? 'الاسم بالعربية مطلوب (حرفين على الأقل)' : 'Arabic name is required (min 2 characters)';
    if (!formData.nameEn || formData.nameEn.length < 2)
      newErrors.nameEn = lang === 'ar' ? 'الاسم بالإنجليزية مطلوب (حرفين على الأقل)' : 'English name is required (min 2 characters)';
    if (!formData.code || formData.code.length < 3)
      newErrors.code = lang === 'ar' ? 'الكود مطلوب (3 أحرف على الأقل)' : 'Code is required (min 3 characters)';
    if (!formData.clientId)
      newErrors.clientId = lang === 'ar' ? 'اختر عميل' : 'Please select a client';
    if (!formData.startDate)
      newErrors.startDate = lang === 'ar' ? 'تاريخ البداية مطلوب' : 'Start date is required';
    if (!formData.contractAmount || parseFloat(formData.contractAmount) <= 0)
      newErrors.contractAmount = lang === 'ar' ? 'قيمة العقد مطلوبة وأكبر من صفر' : 'Contract amount is required and must be greater than 0';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) { toast.error(lang === 'ar' ? 'يرجى إصلاح الأخطاء' : 'Please fix errors'); return; }
    try {
      setSubmitting(true);
      await axiosInstance.post('/projects', {
        nameAr:          formData.nameAr.trim(),
        nameEn:          formData.nameEn.trim(),
        code:            formData.code.trim().toUpperCase(),
        clientId:        formData.clientId,
        projectManager:  formData.projectManager.trim(),
        siteEngineer:    formData.siteEngineer.trim(),
        location:        formData.location.trim(),
        startDate:       formData.startDate,
        expectedEndDate: formData.expectedEndDate,
        contractAmount:  parseFloat(formData.contractAmount),
        notes:           formData.notes.trim(),
        status:          formData.status,
      });
      toast.success(lang === 'ar' ? 'تم إنشاء المشروع بنجاح!' : 'Project created successfully!');
      setTimeout(() => navigate('/projects'), 1500);
    } catch (error) {
      toast.error(getErrorMessage(error, lang === 'ar' ? 'فشل إنشاء المشروع' : 'Failed to create project'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleChange = (field, value) => setFormData({ ...formData, [field]: value });

  const inputCls = (hasError) =>
    `w-full px-4 py-2.5 border rounded-xl text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent transition bg-gray-50 ${
      hasError ? 'border-red-400' : 'border-gray-200'
    }`;

  if (submitting) return <FullPageLoader text={lang === 'ar' ? 'جاري المعالجة...' : 'Processing...'} />;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">

        {/* ── Page Header ── */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {lang === 'ar' ? 'إضافة مشروع جديد' : 'Add New Project'}
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              {lang === 'ar' ? 'إنشاء مشروع جديد في النظام' : 'Create a new project in the system'}
            </p>
          </div>
          <button
            onClick={() => navigate('/projects')}
            className="flex items-center gap-2 px-5 py-2.5 border border-gray-200 text-gray-700 bg-white rounded-xl hover:bg-gray-50 transition font-semibold text-sm shadow-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            {lang === 'ar' ? 'رجوع' : 'Back'}
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">

          {/* ── Names ── */}
          <div className="bg-white border border-gray-200 rounded-2xl p-6">
            <h2 className="text-sm font-semibold text-gray-700 mb-4">
              {lang === 'ar' ? 'اسم المشروع' : 'Project Name'}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {lang === 'ar' ? 'اسم المشروع (عربي)' : 'Project Name (Arabic)'} <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.nameAr}
                  onChange={e => handleChange('nameAr', e.target.value)}
                  className={inputCls(errors.nameAr)}
                  placeholder={lang === 'ar' ? 'أدخل اسم المشروع' : 'Enter project name'}
                  dir="rtl"
                  disabled={submitting}
                />
                {errors.nameAr && <p className="mt-1 text-xs text-red-500">{errors.nameAr}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {lang === 'ar' ? 'اسم المشروع (إنجليزي)' : 'Project Name (English)'} <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.nameEn}
                  onChange={e => handleChange('nameEn', e.target.value)}
                  className={inputCls(errors.nameEn)}
                  placeholder={lang === 'ar' ? 'أدخل اسم المشروع بالإنجليزية' : 'Enter project name in English'}
                  disabled={submitting}
                />
                {errors.nameEn && <p className="mt-1 text-xs text-red-500">{errors.nameEn}</p>}
              </div>
            </div>
          </div>

          {/* ── Code + Client ── */}
          <div className="bg-white border border-gray-200 rounded-2xl p-6">
            <h2 className="text-sm font-semibold text-gray-700 mb-4">
              {lang === 'ar' ? 'بيانات المشروع' : 'Project Details'}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {lang === 'ar' ? 'الكود' : 'Code'} <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.code}
                  onChange={e => handleChange('code', e.target.value)}
                  className={inputCls(errors.code)}
                  placeholder="PRJ001"
                  disabled={submitting}
                />
                {errors.code && <p className="mt-1 text-xs text-red-500">{errors.code}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {lang === 'ar' ? 'العميل' : 'Client'} <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.clientId}
                  onChange={e => handleChange('clientId', e.target.value)}
                  className={inputCls(errors.clientId)}
                  disabled={submitting}
                >
                  <option value="">{lang === 'ar' ? 'اختر عميل' : 'Select a client'}</option>
                  {clients.map(client => (
                    <option key={client._id} value={client._id}>
                      {lang === 'ar' ? client.nameAr : client.nameEn}
                    </option>
                  ))}
                </select>
                {errors.clientId && <p className="mt-1 text-xs text-red-500">{errors.clientId}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {lang === 'ar' ? 'مدير المشروع' : 'Project Manager'}
                </label>
                <input
                  type="text"
                  value={formData.projectManager}
                  onChange={e => handleChange('projectManager', e.target.value)}
                  className={inputCls(false)}
                  placeholder={lang === 'ar' ? 'أدخل اسم المدير' : 'Enter manager name'}
                  disabled={submitting}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {lang === 'ar' ? 'مهندس الموقع' : 'Site Engineer'}
                </label>
                <input
                  type="text"
                  value={formData.siteEngineer}
                  onChange={e => handleChange('siteEngineer', e.target.value)}
                  className={inputCls(false)}
                  placeholder={lang === 'ar' ? 'أدخل اسم المهندس' : 'Enter engineer name'}
                  disabled={submitting}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {lang === 'ar' ? 'الموقع' : 'Location'}
                </label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={e => handleChange('location', e.target.value)}
                  className={inputCls(false)}
                  placeholder={lang === 'ar' ? 'أدخل موقع المشروع' : 'Enter location'}
                  disabled={submitting}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {lang === 'ar' ? 'قيمة العقد' : 'Contract Amount'} <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  value={formData.contractAmount}
                  onChange={e => handleChange('contractAmount', e.target.value)}
                  className={inputCls(errors.contractAmount)}
                  placeholder="5000000"
                  disabled={submitting}
                />
                {errors.contractAmount && <p className="mt-1 text-xs text-red-500">{errors.contractAmount}</p>}
              </div>
            </div>
          </div>

          {/* ── Dates ── */}
          <div className="bg-white border border-gray-200 rounded-2xl p-6">
            <h2 className="text-sm font-semibold text-gray-700 mb-4">
              {lang === 'ar' ? 'التواريخ' : 'Dates'}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {lang === 'ar' ? 'تاريخ البداية' : 'Start Date'} <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={formData.startDate}
                  onChange={e => handleChange('startDate', e.target.value)}
                  className={inputCls(errors.startDate)}
                  disabled={submitting}
                />
                {errors.startDate && <p className="mt-1 text-xs text-red-500">{errors.startDate}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {lang === 'ar' ? 'تاريخ النهاية المتوقع' : 'Expected End Date'}
                </label>
                <input
                  type="date"
                  value={formData.expectedEndDate}
                  onChange={e => handleChange('expectedEndDate', e.target.value)}
                  className={inputCls(false)}
                  disabled={submitting}
                />
              </div>
            </div>
          </div>

          {/* ── Notes ── */}
          <div className="bg-white border border-gray-200 rounded-2xl p-6">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {lang === 'ar' ? 'ملاحظات' : 'Notes'}
              <span className="text-gray-400 font-normal ml-1">({lang === 'ar' ? 'اختياري' : 'Optional'})</span>
            </label>
            <textarea
              value={formData.notes}
              onChange={e => handleChange('notes', e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent transition bg-gray-50 resize-none"
              placeholder={lang === 'ar' ? 'أدخل ملاحظات' : 'Enter notes'}
              rows={3}
              disabled={submitting}
            />
          </div>

          {/* ── Actions ── */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => navigate('/projects')}
              disabled={submitting}
              className="flex-1 px-4 py-3 border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition font-semibold text-sm"
            >
              {lang === 'ar' ? 'إلغاء' : 'Cancel'}
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 transition font-semibold text-sm disabled:opacity-50"
            >
              <Building2 className="w-4 h-4" />
              {lang === 'ar' ? 'إنشاء المشروع' : 'Create Project'}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};

export default CreateProject;