import React, { useState, useContext } from 'react';
import { Building2, ArrowLeft, ChevronDown, ChevronUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import axiosInstance from '../../utils/axiosInstance';
import { getErrorMessage } from '../../utils/errorHandler';
import FullPageLoader from '../Loader/Loader';
import { LanguageContext } from '../../context/LanguageContext';
import { toast } from 'react-toastify';
import QuickClientModal from '../quick-create/QuickClientModal';

const CreateProject = () => {
  const { lang } = useContext(LanguageContext);
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    nameAr: '',
    nameEn: '',
    clientId: '',
    projectManager: '',
    siteEngineer: '',
    location: '',
    startDate: '',
    expectedEndDate: '',
    contractAmount: '',
    notes: '',
    status: 'PLANNED',
  });

  const [clients, setClients] = useState([]);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const showMoreDetails = true;
  const setShowMoreDetails = () => {};
  const [showQuickClientModal, setShowQuickClientModal] = useState(false);

  React.useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    try {
      const response = await axiosInstance.get('/clients');
      setClients(
        Array.isArray(response.data) ? response.data : response.data.result || [],
      );
    } catch (error) {
      toast.error(
        getErrorMessage(
          error,
          lang === 'ar' ? 'ÙØ´Ù„ ØªØ­Ù…ÙŠÙ„ Ø§Ù„Ø¹Ù…Ù„Ø§Ø¡' : 'Failed to load clients',
        ),
      );
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.nameAr.trim()) {
      newErrors.nameAr =
        lang === 'ar' ? 'Ø§Ù„Ø§Ø³Ù… Ø¨Ø§Ù„Ø¹Ø±Ø¨ÙŠØ© Ù…Ø·Ù„ÙˆØ¨' : 'Arabic name is required';
    }

    if (!formData.nameEn.trim()) {
      newErrors.nameEn =
        lang === 'ar' ? 'Ø§Ù„Ø§Ø³Ù… Ø¨Ø§Ù„Ø¥Ù†Ø¬Ù„ÙŠØ²ÙŠØ© Ù…Ø·Ù„ÙˆØ¨' : 'English name is required';
    }

    if (!formData.clientId) {
      newErrors.clientId =
        lang === 'ar' ? 'Ø§Ø®ØªØ± Ø¹Ù…ÙŠÙ„' : 'Please select a client';
    }

    if (!formData.startDate) {
      newErrors.startDate =
        lang === 'ar' ? 'ØªØ§Ø±ÙŠØ® Ø§Ù„Ø¨Ø¯Ø§ÙŠØ© Ù…Ø·Ù„ÙˆØ¨' : 'Start date is required';
    }

    if (
      formData.contractAmount === '' ||
      Number.isNaN(Number(formData.contractAmount)) ||
      Number(formData.contractAmount) < 0
    ) {
      newErrors.contractAmount =
        lang === 'ar'
          ? 'Ù‚ÙŠÙ…Ø© Ø§Ù„Ø¹Ù‚Ø¯ Ù…Ø·Ù„ÙˆØ¨Ø© ÙˆÙ„Ø§Ø²Ù… ØªÙƒÙˆÙ† 0 Ø£Ùˆ Ø£ÙƒØ«Ø±'
          : 'Contract amount is required and must be 0 or greater';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) {
      toast.error(lang === 'ar' ? 'ÙŠØ±Ø¬Ù‰ Ø¥ØµÙ„Ø§Ø­ Ø§Ù„Ø£Ø®Ø·Ø§Ø¡' : 'Please fix errors');
      return;
    }

    try {
      setSubmitting(true);
      await axiosInstance.post('/projects', {
        nameAr: formData.nameAr.trim(),
        nameEn: formData.nameEn.trim(),
        clientId: formData.clientId,
        projectManager: formData.projectManager.trim(),
        siteEngineer: formData.siteEngineer.trim(),
        location: formData.location.trim(),
        startDate: formData.startDate,
        expectedEndDate: formData.expectedEndDate,
        contractAmount: Number(formData.contractAmount),
        notes: formData.notes.trim(),
        status: formData.status,
      });
      toast.success(
        lang === 'ar'
          ? 'ØªÙ… Ø¥Ù†Ø´Ø§Ø¡ Ø§Ù„Ù…Ø´Ø±ÙˆØ¹ Ø¨Ù†Ø¬Ø§Ø­!'
          : 'Project created successfully!',
      );
      setTimeout(() => navigate('/projects'), 1500);
    } catch (error) {
      toast.error(
        getErrorMessage(
          error,
          lang === 'ar' ? 'ÙØ´Ù„ Ø¥Ù†Ø´Ø§Ø¡ Ø§Ù„Ù…Ø´Ø±ÙˆØ¹' : 'Failed to create project',
        ),
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleChange = (field, value) =>
    setFormData((prev) => ({ ...prev, [field]: value }));

  const handleQuickClientCreated = (createdClient) => {
    if (!createdClient?._id) return;
    setClients((prev) => [...prev, createdClient]);
    handleChange('clientId', createdClient._id);
  };

  const inputCls = (hasError) =>
    `w-full px-4 py-2.5 border rounded-xl text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent transition bg-gray-50 ${
      hasError ? 'border-red-400' : 'border-gray-200'
    }`;

  if (submitting) {
    return (
      <FullPageLoader text={lang === 'ar' ? 'Ø¬Ø§Ø±ÙŠ Ø§Ù„Ù…Ø¹Ø§Ù„Ø¬Ø©...' : 'Processing...'} />
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {lang === 'ar' ? 'Ø¥Ø¶Ø§ÙØ© Ù…Ø´Ø±ÙˆØ¹ Ø¬Ø¯ÙŠØ¯' : 'Add New Project'}
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              {lang === 'ar'
                ? 'Ø§Ù„Ø­Ù‚ÙˆÙ„ Ø§Ù„Ø£Ø³Ø§Ø³ÙŠØ© Ù…Ø·Ù„ÙˆØ¨Ø©ØŒ ÙˆØ§Ù„ØªÙØ§ØµÙŠÙ„ Ø§Ù„Ø¨Ø§Ù‚ÙŠØ© Ø§Ø®ØªÙŠØ§Ø±ÙŠØ© Ø­Ø³Ø¨ Ø¹Ù‚Ø¯ Ø§Ù„Ø¨Ø§Ùƒ'
                : 'Core fields are required, the rest is optional per the backend contract'}
            </p>
          </div>
          <button
            onClick={() => navigate('/projects')}
            className="flex items-center gap-2 px-5 py-2.5 border border-gray-200 text-gray-700 bg-white rounded-xl hover:bg-gray-50 transition font-semibold text-sm shadow-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            {lang === 'ar' ? 'Ø±Ø¬ÙˆØ¹' : 'Back'}
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="bg-white border border-gray-200 rounded-2xl p-6">
            <h2 className="text-sm font-semibold text-gray-700 mb-4">
              {lang === 'ar' ? 'Ø§Ù„Ø¨ÙŠØ§Ù†Ø§Øª Ø§Ù„Ø£Ø³Ø§Ø³ÙŠØ©' : 'Core Details'}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {lang === 'ar' ? 'Ø§Ø³Ù… Ø§Ù„Ù…Ø´Ø±ÙˆØ¹ (Ø¹Ø±Ø¨ÙŠ)' : 'Project Name (Arabic)'}{' '}
                  <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.nameAr}
                  onChange={(e) => handleChange('nameAr', e.target.value)}
                  className={inputCls(errors.nameAr)}
                  placeholder={
                    lang === 'ar' ? 'Ø£Ø¯Ø®Ù„ Ø§Ø³Ù… Ø§Ù„Ù…Ø´Ø±ÙˆØ¹' : 'Enter project name'
                  }
                  dir="rtl"
                  disabled={submitting}
                />
                {errors.nameAr && (
                  <p className="mt-1 text-xs text-red-500">{errors.nameAr}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {lang === 'ar'
                    ? 'Ø§Ø³Ù… Ø§Ù„Ù…Ø´Ø±ÙˆØ¹ (Ø¥Ù†Ø¬Ù„ÙŠØ²ÙŠ)'
                    : 'Project Name (English)'}{' '}
                  <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.nameEn}
                  onChange={(e) => handleChange('nameEn', e.target.value)}
                  className={inputCls(errors.nameEn)}
                  placeholder={
                    lang === 'ar'
                      ? 'Ø£Ø¯Ø®Ù„ Ø§Ø³Ù… Ø§Ù„Ù…Ø´Ø±ÙˆØ¹ Ø¨Ø§Ù„Ø¥Ù†Ø¬Ù„ÙŠØ²ÙŠØ©'
                      : 'Enter project name in English'
                  }
                  disabled={submitting}
                />
                {errors.nameEn && (
                  <p className="mt-1 text-xs text-red-500">{errors.nameEn}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {lang === 'ar' ? 'Ø§Ù„Ø¹Ù…ÙŠÙ„' : 'Client'}{' '}
                  <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.clientId}
                  onChange={(e) => handleChange('clientId', e.target.value)}
                  className={inputCls(errors.clientId)}
                  disabled={submitting}
                >
                  <option value="">
                    {lang === 'ar' ? 'Ø§Ø®ØªØ± Ø¹Ù…ÙŠÙ„' : 'Select a client'}
                  </option>
                  {clients.map((client) => (
                    <option key={client._id} value={client._id}>
                      {lang === 'ar' ? client.nameAr : client.nameEn}
                    </option>
                  ))}
                </select>
                {errors.clientId && (
                  <p className="mt-1 text-xs text-red-500">{errors.clientId}</p>
                )}
                <button
                  type="button"
                  onClick={() => setShowQuickClientModal(true)}
                  className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-blue-600 hover:text-blue-700"
                >
                  {lang === 'ar' ? 'Ø¥Ø¶Ø§ÙØ© Ø¹Ù…ÙŠÙ„ Ø³Ø±ÙŠØ¹Ù‹Ø§' : 'Quick Add Client'}
                </button>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {lang === 'ar' ? 'Ù‚ÙŠÙ…Ø© Ø§Ù„Ø¹Ù‚Ø¯' : 'Contract Amount'}{' '}
                  <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.contractAmount}
                  onChange={(e) => handleChange('contractAmount', e.target.value)}
                  className={inputCls(errors.contractAmount)}
                  placeholder="5000000"
                  disabled={submitting}
                />
                {errors.contractAmount && (
                  <p className="mt-1 text-xs text-red-500">
                    {errors.contractAmount}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {lang === 'ar' ? 'ØªØ§Ø±ÙŠØ® Ø§Ù„Ø¨Ø¯Ø§ÙŠØ©' : 'Start Date'}{' '}
                  <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => handleChange('startDate', e.target.value)}
                  className={inputCls(errors.startDate)}
                  disabled={submitting}
                />
                {errors.startDate && (
                  <p className="mt-1 text-xs text-red-500">{errors.startDate}</p>
                )}
              </div>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-2xl p-6">

            {showMoreDetails && (
              <div className="mt-4 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {lang === 'ar' ? 'Ù…Ø¯ÙŠØ± Ø§Ù„Ù…Ø´Ø±ÙˆØ¹' : 'Project Manager'}
                    </label>
                    <input
                      type="text"
                      value={formData.projectManager}
                      onChange={(e) =>
                        handleChange('projectManager', e.target.value)
                      }
                      className={inputCls(false)}
                      placeholder={
                        lang === 'ar'
                          ? 'Ø£Ø¯Ø®Ù„ Ø§Ø³Ù… Ø§Ù„Ù…Ø¯ÙŠØ±'
                          : 'Enter manager name'
                      }
                      disabled={submitting}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {lang === 'ar' ? 'Ù…Ù‡Ù†Ø¯Ø³ Ø§Ù„Ù…ÙˆÙ‚Ø¹' : 'Site Engineer'}
                    </label>
                    <input
                      type="text"
                      value={formData.siteEngineer}
                      onChange={(e) =>
                        handleChange('siteEngineer', e.target.value)
                      }
                      className={inputCls(false)}
                      placeholder={
                        lang === 'ar'
                          ? 'Ø£Ø¯Ø®Ù„ Ø§Ø³Ù… Ø§Ù„Ù…Ù‡Ù†Ø¯Ø³'
                          : 'Enter engineer name'
                      }
                      disabled={submitting}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {lang === 'ar' ? 'Ø§Ù„Ù…ÙˆÙ‚Ø¹' : 'Location'}
                    </label>
                    <input
                      type="text"
                      value={formData.location}
                      onChange={(e) => handleChange('location', e.target.value)}
                      className={inputCls(false)}
                      placeholder={
                        lang === 'ar'
                          ? 'Ø£Ø¯Ø®Ù„ Ù…ÙˆÙ‚Ø¹ Ø§Ù„Ù…Ø´Ø±ÙˆØ¹'
                          : 'Enter location'
                      }
                      disabled={submitting}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {lang === 'ar'
                        ? 'ØªØ§Ø±ÙŠØ® Ø§Ù„Ù†Ù‡Ø§ÙŠØ© Ø§Ù„Ù…ØªÙˆÙ‚Ø¹'
                        : 'Expected End Date'}
                    </label>
                    <input
                      type="date"
                      value={formData.expectedEndDate}
                      onChange={(e) =>
                        handleChange('expectedEndDate', e.target.value)
                      }
                      className={inputCls(false)}
                      disabled={submitting}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {lang === 'ar' ? 'Ù…Ù„Ø§Ø­Ø¸Ø§Øª' : 'Notes'}
                  </label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => handleChange('notes', e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent transition bg-gray-50 resize-none"
                    placeholder={
                      lang === 'ar' ? 'Ø£Ø¯Ø®Ù„ Ù…Ù„Ø§Ø­Ø¸Ø§Øª' : 'Enter notes'
                    }
                    rows={3}
                    disabled={submitting}
                  />
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => navigate('/projects')}
              disabled={submitting}
              className="flex-1 px-4 py-3 border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition font-semibold text-sm"
            >
              {lang === 'ar' ? 'Ø¥Ù„ØºØ§Ø¡' : 'Cancel'}
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 transition font-semibold text-sm disabled:opacity-50"
            >
              <Building2 className="w-4 h-4" />
              {lang === 'ar' ? 'Ø¥Ù†Ø´Ø§Ø¡ Ø§Ù„Ù…Ø´Ø±ÙˆØ¹' : 'Create Project'}
            </button>
          </div>
        </form>
      </div>

      {showQuickClientModal && (
        <QuickClientModal
          lang={lang}
          onClose={() => setShowQuickClientModal(false)}
          onCreated={handleQuickClientCreated}
        />
      )}
    </div>
  );
};

export default CreateProject;

