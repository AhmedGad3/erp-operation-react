import React, { useState, useContext } from 'react';
import { UserPlus, ArrowLeft, ChevronDown, ChevronUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import axiosInstance, { getErrorMessage } from '../../utils/axiosInstance';
import FullPageLoader from '../Loader/Loader';
import { LanguageContext } from '../../context/LanguageContext';
import { toast } from 'react-toastify';

const CreateClient = () => {
  const { lang } = useContext(LanguageContext);
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    nameAr: '',
    nameEn: '',
    phone: '',
    email: '',
    address: '',
    notes: '',
    taxNumber: '',
    commercialRegister: '',
    type: 'INDIVIDUAL',
  });

  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const showMoreDetails = true;
  const setShowMoreDetails = () => {};

  const set = (field, value) =>
    setFormData((prev) => ({ ...prev, [field]: value }));

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

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) {
      toast.error(
        lang === 'ar'
          ? 'ÙŠØ±Ø¬Ù‰ Ø¥ØµÙ„Ø§Ø­ Ø§Ù„Ø£Ø®Ø·Ø§Ø¡ Ù‚Ø¨Ù„ Ø§Ù„Ø¥Ø±Ø³Ø§Ù„'
          : 'Please fix errors before submitting',
      );
      return;
    }

    try {
      setSubmitting(true);
      await axiosInstance.post('/clients', {
        nameAr: formData.nameAr.trim(),
        nameEn: formData.nameEn.trim(),
        phone: formData.phone.trim(),
        email: formData.email.trim(),
        address: formData.address.trim(),
        notes: formData.notes.trim(),
        taxNumber: formData.taxNumber.trim(),
        commercialRegister: formData.commercialRegister.trim(),
        type: formData.type,
      });

      toast.success(
        lang === 'ar'
          ? 'ØªÙ… Ø¥Ù†Ø´Ø§Ø¡ Ø§Ù„Ø¹Ù…ÙŠÙ„ Ø¨Ù†Ø¬Ø§Ø­!'
          : 'Client created successfully!',
      );
      setTimeout(() => navigate('/clients'), 1500);
    } catch (error) {
      toast.error(
        getErrorMessage(
          error,
          lang === 'ar' ? 'ÙØ´Ù„ Ø¥Ù†Ø´Ø§Ø¡ Ø§Ù„Ø¹Ù…ÙŠÙ„' : 'Failed to create client',
        ),
      );
    } finally {
      setSubmitting(false);
    }
  };

  const inputCls = (hasError) =>
    `w-full px-4 py-2.5 border rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition bg-gray-50 ${
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
              {lang === 'ar' ? 'Ø¥Ø¶Ø§ÙØ© Ø¹Ù…ÙŠÙ„ Ø¬Ø¯ÙŠØ¯' : 'Add New Client'}
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              {lang === 'ar'
                ? 'Ø§Ù„Ø­Ù‚ÙˆÙ„ Ø§Ù„Ø£Ø³Ø§Ø³ÙŠØ© Ù…Ø·Ù„ÙˆØ¨Ø©ØŒ ÙˆØ§Ù„ØªÙØ§ØµÙŠÙ„ Ø§Ù„Ø¨Ø§Ù‚ÙŠØ© Ø§Ø®ØªÙŠØ§Ø±ÙŠØ© Ø­Ø³Ø¨ Ø¹Ù‚Ø¯ Ø§Ù„Ø¨Ø§Ùƒ'
                : 'Core fields are required, the rest is optional per the backend contract'}
            </p>
          </div>
          <button
            onClick={() => navigate('/clients')}
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
                  {lang === 'ar' ? 'Ø§Ù„Ø§Ø³Ù… (Ø¹Ø±Ø¨ÙŠ)' : 'Name (Arabic)'}{' '}
                  <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.nameAr}
                  onChange={(e) => set('nameAr', e.target.value)}
                  className={inputCls(errors.nameAr)}
                  placeholder={
                    lang === 'ar'
                      ? 'Ø£Ø¯Ø®Ù„ Ø§Ø³Ù… Ø§Ù„Ø¹Ù…ÙŠÙ„ Ø¨Ø§Ù„Ø¹Ø±Ø¨ÙŠØ©'
                      : 'Enter client name in Arabic'
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
                  {lang === 'ar' ? 'Ø§Ù„Ø§Ø³Ù… (Ø¥Ù†Ø¬Ù„ÙŠØ²ÙŠ)' : 'Name (English)'}{' '}
                  <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.nameEn}
                  onChange={(e) => set('nameEn', e.target.value)}
                  className={inputCls(errors.nameEn)}
                  placeholder={
                    lang === 'ar'
                      ? 'Ø£Ø¯Ø®Ù„ Ø§Ø³Ù… Ø§Ù„Ø¹Ù…ÙŠÙ„ Ø¨Ø§Ù„Ø¥Ù†Ø¬Ù„ÙŠØ²ÙŠØ©'
                      : 'Enter client name in English'
                  }
                  disabled={submitting}
                />
                {errors.nameEn && (
                  <p className="mt-1 text-xs text-red-500">{errors.nameEn}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {lang === 'ar' ? 'Ø§Ù„Ù‡Ø§ØªÙ' : 'Phone'}
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => set('phone', e.target.value)}
                  className={inputCls(false)}
                  placeholder={
                    lang === 'ar' ? 'Ø£Ø¯Ø®Ù„ Ø±Ù‚Ù… Ø§Ù„Ù‡Ø§ØªÙ' : 'Enter phone number'
                  }
                  disabled={submitting}
                />
              </div>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-2xl p-6">

            {showMoreDetails && (
              <div className="mt-4 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {lang === 'ar' ? 'Ø§Ù„Ø¨Ø±ÙŠØ¯ Ø§Ù„Ø¥Ù„ÙƒØªØ±ÙˆÙ†ÙŠ' : 'Email'}
                    </label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => set('email', e.target.value)}
                      className={inputCls(false)}
                      placeholder={
                        lang === 'ar'
                          ? 'Ø£Ø¯Ø®Ù„ Ø§Ù„Ø¨Ø±ÙŠØ¯ Ø§Ù„Ø¥Ù„ÙƒØªØ±ÙˆÙ†ÙŠ'
                          : 'Enter email address'
                      }
                      disabled={submitting}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {lang === 'ar' ? 'Ø§Ù„Ù†ÙˆØ¹' : 'Type'}
                    </label>
                    <select
                      value={formData.type}
                      onChange={(e) => set('type', e.target.value)}
                      className={inputCls(false)}
                      disabled={submitting}
                    >
                      <option value="INDIVIDUAL">
                        {lang === 'ar' ? 'ÙØ±Ø¯' : 'Individual'}
                      </option>
                      <option value="COMPANY">
                        {lang === 'ar' ? 'Ø´Ø±ÙƒØ©' : 'Company'}
                      </option>
                    </select>
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {lang === 'ar' ? 'Ø§Ù„Ø¹Ù†ÙˆØ§Ù†' : 'Address'}
                    </label>
                    <input
                      type="text"
                      value={formData.address}
                      onChange={(e) => set('address', e.target.value)}
                      className={inputCls(false)}
                      placeholder={
                        lang === 'ar' ? 'Ø£Ø¯Ø®Ù„ Ø§Ù„Ø¹Ù†ÙˆØ§Ù†' : 'Enter address'
                      }
                      dir={lang === 'ar' ? 'rtl' : 'ltr'}
                      disabled={submitting}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {lang === 'ar'
                        ? 'Ø±Ù‚Ù… Ø§Ù„ØªØ¹Ø±ÙŠÙ Ø§Ù„Ø¶Ø±ÙŠØ¨ÙŠ'
                        : 'Tax Number'}
                    </label>
                    <input
                      type="text"
                      value={formData.taxNumber}
                      onChange={(e) => set('taxNumber', e.target.value)}
                      className={inputCls(false)}
                      placeholder={
                        lang === 'ar'
                          ? 'Ø£Ø¯Ø®Ù„ Ø±Ù‚Ù… Ø§Ù„ØªØ¹Ø±ÙŠÙ Ø§Ù„Ø¶Ø±ÙŠØ¨ÙŠ'
                          : 'Enter tax number'
                      }
                      disabled={submitting}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {lang === 'ar'
                        ? 'Ø±Ù‚Ù… Ø§Ù„Ø³Ø¬Ù„ Ø§Ù„ØªØ¬Ø§Ø±ÙŠ'
                        : 'Commercial Register'}
                    </label>
                    <input
                      type="text"
                      value={formData.commercialRegister}
                      onChange={(e) =>
                        set('commercialRegister', e.target.value)
                      }
                      className={inputCls(false)}
                      placeholder={
                        lang === 'ar'
                          ? 'Ø£Ø¯Ø®Ù„ Ø±Ù‚Ù… Ø§Ù„Ø³Ø¬Ù„ Ø§Ù„ØªØ¬Ø§Ø±ÙŠ'
                          : 'Enter commercial register'
                      }
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
                    onChange={(e) => set('notes', e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition bg-gray-50 resize-none"
                    placeholder={
                      lang === 'ar'
                        ? 'Ø£Ø¯Ø®Ù„ Ø£ÙŠ Ù…Ù„Ø§Ø­Ø¸Ø§Øª Ø¥Ø¶Ø§ÙÙŠØ©'
                        : 'Enter any additional notes'
                    }
                    rows={3}
                    dir={lang === 'ar' ? 'rtl' : 'ltr'}
                    disabled={submitting}
                  />
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => navigate('/clients')}
              disabled={submitting}
              className="flex-1 px-4 py-3 border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition font-semibold text-sm"
            >
              {lang === 'ar' ? 'Ø¥Ù„ØºØ§Ø¡' : 'Cancel'}
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition font-semibold text-sm disabled:opacity-50"
            >
              <UserPlus className="w-4 h-4" />
              {lang === 'ar' ? 'Ø¥Ù†Ø´Ø§Ø¡ Ø§Ù„Ø¹Ù…ÙŠÙ„' : 'Create Client'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateClient;

