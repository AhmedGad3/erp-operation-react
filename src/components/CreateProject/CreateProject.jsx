import React, { useState, useContext } from 'react';
import { Building2, Code, Users, Calendar, DollarSign, ArrowLeft, AlertCircle, CheckCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import axiosInstance from '../../utils/axiosInstance';
import FullPageLoader from '../Loader/Loader';
import { LanguageContext } from '../../context/LanguageContext';
import { toast } from 'react-toastify';

const CreateProject = () => {
  const { lang, t } = useContext(LanguageContext);
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    nameAr: '',
    nameEn: '',
    code: '',
    clientId: '',
    projectManager: '',
    siteEngineer: '',
    location: '',
    startDate: '',
    expectedEndDate: '',
    contractAmount: '',
    notes: '',
    status: 'PLANNED'
  });

  const [clients, setClients] = useState([]);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  React.useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    try {
      const response = await axiosInstance.get('/clients');
      const clientsData = Array.isArray(response.data) ? response.data : (response.data.result || []);
      setClients(clientsData);
    } catch (error) {
      console.error('Error fetching clients:', error);
      toast.error(lang === 'ar' ? 'فشل تحميل العملاء' : 'Failed to load clients');
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.nameAr || formData.nameAr.length < 2) {
      newErrors.nameAr = lang === 'ar' ? 'الاسم بالعربية مطلوب (حرفين على الأقل)' : 'Arabic name is required (min 2 characters)';
    }

    if (!formData.nameEn || formData.nameEn.length < 2) {
      newErrors.nameEn = lang === 'ar' ? 'الاسم بالإنجليزية مطلوب (حرفين على الأقل)' : 'English name is required (min 2 characters)';
    }

    if (!formData.code || formData.code.length < 3) {
      newErrors.code = lang === 'ar' ? 'الكود مطلوب (3 أحرف على الأقل)' : 'Code is required (min 3 characters)';
    }

    if (!formData.clientId) {
      newErrors.clientId = lang === 'ar' ? 'اختر عميل' : 'Please select a client';
    }

    if (!formData.startDate) {
      newErrors.startDate = lang === 'ar' ? 'تاريخ البداية مطلوب' : 'Start date is required';
    }

    if (!formData.contractAmount || parseFloat(formData.contractAmount) <= 0) {
      newErrors.contractAmount = lang === 'ar' ? 'قيمة العقد مطلوبة وأكبر من صفر' : 'Contract amount is required and must be greater than 0';
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
        nameAr: formData.nameAr.trim(),
        nameEn: formData.nameEn.trim(),
        code: formData.code.trim().toUpperCase(),
        clientId: formData.clientId,
        projectManager: formData.projectManager.trim(),
        siteEngineer: formData.siteEngineer.trim(),
        location: formData.location.trim(),
        startDate: formData.startDate,
        expectedEndDate: formData.expectedEndDate,
        contractAmount: parseFloat(formData.contractAmount),
        notes: formData.notes.trim(),
        status: formData.status
      };

      await axiosInstance.post('/projects', payload);
      
      toast.success(lang === 'ar' ? 'تم إنشاء المشروع بنجاح!' : 'Project created successfully!');
      
      setTimeout(() => {
        navigate('/projects');
      }, 1500);
    } catch (error) {
      console.error('Error creating project:', error);
      const message = error.response?.data?.message || (lang === 'ar' ? 'فشل إنشاء المشروع' : 'Failed to create project');
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleChange = (field, value) => {
    setFormData({ ...formData, [field]: value });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-8 px-4">
      {/* Submitting Overlay */}
      {submitting && <FullPageLoader text={lang === "ar" ? "جاري المعالجة..." : "Processing..."} />}

      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-green-600 to-green-700 px-8 py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Building2 className="w-8 h-8 text-white" />
                <div>
                  <h1 className="text-2xl font-bold text-white">
                    {lang === 'ar' ? 'إضافة مشروع جديد' : 'Add New Project'}
                  </h1>
                  <p className="text-green-100 mt-1">
                    {lang === 'ar' ? 'إنشاء مشروع جديد' : 'Create a new project'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => navigate('/projects')}
                className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg transition"
              >
                <ArrowLeft className="w-4 h-4" />
                {lang === 'ar' ? 'رجوع' : 'Back'}
              </button>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-8 space-y-6">
            
            {/* Names Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  {lang === 'ar' ? 'اسم المشروع (عربي)' : 'Project Name (Arabic)'} <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.nameAr}
                  onChange={(e) => handleChange('nameAr', e.target.value)}
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition ${
                    errors.nameAr ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder={lang === 'ar' ? 'أدخل اسم المشروع' : 'Enter project name'}
                  dir="rtl"
                  disabled={submitting}
                />
                {errors.nameAr && <p className="mt-1 text-sm text-red-500">{errors.nameAr}</p>}
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  {lang === 'ar' ? 'اسم المشروع (إنجليزي)' : 'Project Name (English)'} <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.nameEn}
                  onChange={(e) => handleChange('nameEn', e.target.value)}
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition ${
                    errors.nameEn ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder={lang === 'ar' ? 'أدخل اسم المشروع بالإنجليزية' : 'Enter project name in English'}
                  disabled={submitting}
                />
                {errors.nameEn && <p className="mt-1 text-sm text-red-500">{errors.nameEn}</p>}
              </div>
            </div>

            {/* Code and Client */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  {lang === 'ar' ? 'الكود' : 'Code'} <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={formData.code}
                    onChange={(e) => handleChange('code', e.target.value)}
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition ${
                      errors.code ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="PRJ001"
                    disabled={submitting}
                  />
                  <Code className="absolute right-3 top-3.5 w-5 h-5 text-gray-400 pointer-events-none" />
                </div>
                {errors.code && <p className="mt-1 text-sm text-red-500">{errors.code}</p>}
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  {lang === 'ar' ? 'العميل' : 'Client'} <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.clientId}
                  onChange={(e) => handleChange('clientId', e.target.value)}
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition ${
                    errors.clientId ? 'border-red-500' : 'border-gray-300'
                  }`}
                  disabled={submitting}
                >
                  <option value="">{lang === 'ar' ? 'اختر عميل' : 'Select a client'}</option>
                  {clients.map((client) => (
                    <option key={client._id} value={client._id}>
                      {lang === 'ar' ? client.nameAr : client.nameEn}
                    </option>
                  ))}
                </select>
                {errors.clientId && <p className="mt-1 text-sm text-red-500">{errors.clientId}</p>}
              </div>
            </div>

            {/* Team */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  {lang === 'ar' ? 'مدير المشروع' : 'Project Manager'}
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={formData.projectManager}
                    onChange={(e) => handleChange('projectManager', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition"
                    placeholder={lang === 'ar' ? 'أدخل اسم المدير' : 'Enter manager name'}
                    disabled={submitting}
                  />
                  <Users className="absolute right-3 top-3.5 w-5 h-5 text-gray-400 pointer-events-none" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  {lang === 'ar' ? 'مهندس الموقع' : 'Site Engineer'}
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={formData.siteEngineer}
                    onChange={(e) => handleChange('siteEngineer', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition"
                    placeholder={lang === 'ar' ? 'أدخل اسم المهندس' : 'Enter engineer name'}
                    disabled={submitting}
                  />
                  <Users className="absolute right-3 top-3.5 w-5 h-5 text-gray-400 pointer-events-none" />
                </div>
              </div>
            </div>

            {/* Location and Dates */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  {lang === 'ar' ? 'الموقع' : 'Location'}
                </label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => handleChange('location', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition"
                  placeholder={lang === 'ar' ? 'أدخل موقع المشروع' : 'Enter location'}
                  disabled={submitting}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  {lang === 'ar' ? 'تاريخ البداية' : 'Start Date'} <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => handleChange('startDate', e.target.value)}
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition ${
                      errors.startDate ? 'border-red-500' : 'border-gray-300'
                    }`}
                    disabled={submitting}
                  />
                  <Calendar className="absolute right-3 top-3.5 w-5 h-5 text-gray-400 pointer-events-none" />
                </div>
                {errors.startDate && <p className="mt-1 text-sm text-red-500">{errors.startDate}</p>}
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  {lang === 'ar' ? 'تاريخ النهاية المتوقع' : 'Expected End Date'}
                </label>
                <div className="relative">
                  <input
                    type="date"
                    value={formData.expectedEndDate}
                    onChange={(e) => handleChange('expectedEndDate', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition"
                    disabled={submitting}
                  />
                  <Calendar className="absolute right-3 top-3.5 w-5 h-5 text-gray-400 pointer-events-none" />
                </div>
              </div>
            </div>

            {/* Contract Amount */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                {lang === 'ar' ? 'قيمة العقد' : 'Contract Amount'} <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={formData.contractAmount}
                  onChange={(e) => handleChange('contractAmount', e.target.value)}
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition ${
                    errors.contractAmount ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="5000000"
                  disabled={submitting}
                />
                <DollarSign className="absolute right-3 top-3.5 w-5 h-5 text-gray-400 pointer-events-none" />
              </div>
              {errors.contractAmount && <p className="mt-1 text-sm text-red-500">{errors.contractAmount}</p>}
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                {lang === 'ar' ? 'ملاحظات' : 'Notes'}
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => handleChange('notes', e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition"
                placeholder={lang === 'ar' ? 'أدخل ملاحظات' : 'Enter notes'}
                rows={4}
                disabled={submitting}
              />
            </div>

            {/* Submit Buttons */}
            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={() => navigate('/projects')}
                className="flex-1 px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition font-semibold"
                disabled={submitting}
              >
                {lang === 'ar' ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 bg-gradient-to-r from-green-600 to-green-700 text-white font-semibold py-3 rounded-lg hover:from-green-700 hover:to-green-800 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <Building2 className="w-5 h-5" />
                {lang === 'ar' ? 'إنشاء المشروع' : 'Create Project'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CreateProject;