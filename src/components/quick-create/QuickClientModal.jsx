import React, { useState } from 'react';
import { ChevronDown, ChevronUp, UserPlus, X } from 'lucide-react';
import { toast } from 'react-toastify';
import axiosInstance from '../../utils/axiosInstance';
import { getErrorMessage } from '../../utils/errorHandler';

export default function QuickClientModal({ lang, onClose, onCreated }) {
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

  const inputCls = (hasError) =>
    `w-full px-4 py-2.5 border rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition bg-gray-50 ${
      hasError ? 'border-red-400' : 'border-gray-200'
    }`;

  const validateForm = () => {
    const newErrors = {};

    if (!formData.nameAr.trim()) {
      newErrors.nameAr = lang === 'ar' ? 'الاسم بالعربية مطلوب' : 'Arabic name is required';
    }

    if (!formData.nameEn.trim()) {
      newErrors.nameEn = lang === 'ar' ? 'الاسم بالإنجليزية مطلوب' : 'English name is required';
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
      const { data } = await axiosInstance.post('/clients', {
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
      const created = data?.result || data;
      toast.success(
        lang === 'ar' ? 'ØªÙ… Ø¥Ù†Ø´Ø§Ø¡ Ø§Ù„Ø¹Ù…ÙŠÙ„ Ø¨Ù†Ø¬Ø§Ø­!' : 'Client created successfully!',
      );
      onCreated?.(created);
      onClose();
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

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[70] p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl p-6 my-8 max-h-[90vh] overflow-y-auto">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h3 className="text-2xl font-bold text-gray-900">
              {lang === 'ar' ? 'Ø¥Ø¶Ø§ÙØ© Ø¹Ù…ÙŠÙ„ Ø¬Ø¯ÙŠØ¯' : 'Add New Client'}
            </h3>
            <p className="text-sm text-gray-500 mt-1">
              {lang === 'ar'
                ? 'Ù†ÙØ³ ÙÙˆØ±Ù… Ø¥Ù†Ø´Ø§Ø¡ Ø§Ù„Ø¹Ù…ÙŠÙ„ Ø§Ù„ÙƒØ§Ù…Ù„ Ø¯Ø§Ø®Ù„ Ù†ÙØ³ Ø§Ù„Ø¹Ù…Ù„ÙŠØ©'
                : 'The full client creation form inside the current flow'}
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={submitting}
            className="p-2 rounded-xl hover:bg-gray-100 text-gray-400"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="bg-white border border-gray-200 rounded-2xl p-6">
            <h4 className="text-sm font-semibold text-gray-700 mb-4">
              {lang === 'ar' ? 'Ø§Ù„Ø¨ÙŠØ§Ù†Ø§Øª Ø§Ù„Ø£Ø³Ø§Ø³ÙŠØ©' : 'Core Details'}
            </h4>
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
                  className={inputCls(errors.phone)}
                  placeholder={
                    lang === 'ar' ? 'Ø£Ø¯Ø®Ù„ Ø±Ù‚Ù… Ø§Ù„Ù‡Ø§ØªÙ' : 'Enter phone number'
                  }
                  disabled={submitting}
                />
                {errors.phone && (
                  <p className="mt-1 text-xs text-red-500">{errors.phone}</p>
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
                      {lang === 'ar' ? 'Ø§Ù„Ø¨Ø±ÙŠØ¯ Ø§Ù„Ø¥Ù„ÙƒØªØ±ÙˆÙ†ÙŠ' : 'Email'}
                    </label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => set('email', e.target.value)}
                      className={inputCls(errors.email)}
                      placeholder={
                        lang === 'ar'
                          ? 'Ø£Ø¯Ø®Ù„ Ø§Ù„Ø¨Ø±ÙŠØ¯ Ø§Ù„Ø¥Ù„ÙƒØªØ±ÙˆÙ†ÙŠ'
                          : 'Enter email address'
                      }
                      disabled={submitting}
                    />
                    {errors.email && (
                      <p className="mt-1 text-xs text-red-500">{errors.email}</p>
                    )}
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
                      onChange={(e) => set('commercialRegister', e.target.value)}
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
              onClick={onClose}
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
              {submitting
                ? lang === 'ar'
                  ? 'Ø¬Ø§Ø±ÙŠ Ø§Ù„Ø­ÙØ¸...'
                  : 'Saving...'
                : lang === 'ar'
                  ? 'Ø¥Ù†Ø´Ø§Ø¡ Ø§Ù„Ø¹Ù…ÙŠÙ„'
                  : 'Create Client'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}


