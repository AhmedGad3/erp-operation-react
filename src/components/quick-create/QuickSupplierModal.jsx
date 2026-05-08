import React, { useState } from 'react';
import { ChevronDown, ChevronUp, UserPlus, X } from 'lucide-react';
import { toast } from 'react-toastify';
import axiosInstance from '../../utils/axiosInstance';
import { getErrorMessage } from '../../utils/errorHandler';

export default function QuickSupplierModal({ lang, onClose, onCreated }) {
  const [form, setForm] = useState({
    nameAr: '',
    nameEn: '',
    phone: '',
    email: '',
    address: '',
    notes: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const showMoreDetails = true;
  const setShowMoreDetails = () => {};

  const set = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));

  const inputCls =
    'w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-gray-50';

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.nameAr.trim()) {
      toast.error(lang === 'ar' ? 'Ø§Ù„Ø§Ø³Ù… Ø¨Ø§Ù„Ø¹Ø±Ø¨ÙŠØ© Ù…Ø·Ù„ÙˆØ¨' : 'Arabic name is required');
      return;
    }

    if (!form.nameEn.trim()) {
      toast.error(lang === 'ar' ? 'Ø§Ù„Ø§Ø³Ù… Ø¨Ø§Ù„Ø¥Ù†Ø¬Ù„ÙŠØ²ÙŠØ© Ù…Ø·Ù„ÙˆØ¨' : 'English name is required');
      return;
    }

    try {
      setSubmitting(true);
      const { data } = await axiosInstance.post('/suppliers', {
        nameAr: form.nameAr.trim(),
        nameEn: form.nameEn.trim(),
        phone: form.phone.trim(),
        email: form.email.trim(),
        address: form.address.trim(),
        notes: form.notes.trim(),
      });
      const created = data?.result || data;
      toast.success(lang === 'ar' ? 'ØªÙ… Ø¥Ù†Ø´Ø§Ø¡ Ø§Ù„Ù…ÙˆØ±Ø¯' : 'Supplier created');
      onCreated?.(created);
      onClose();
    } catch (error) {
      toast.error(
        getErrorMessage(
          error,
          lang === 'ar' ? 'ÙØ´Ù„ Ø¥Ù†Ø´Ø§Ø¡ Ø§Ù„Ù…ÙˆØ±Ø¯' : 'Failed to create supplier',
        ),
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[70] p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl p-6 my-8 max-h-[90vh] overflow-y-auto">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h3 className="text-2xl font-bold text-gray-900">
              {lang === 'ar' ? 'Ø¥Ø¶Ø§ÙØ© Ù…ÙˆØ±Ø¯ Ø¬Ø¯ÙŠØ¯' : 'Add New Supplier'}
            </h3>
            <p className="text-sm text-gray-500 mt-1">
              {lang === 'ar'
                ? 'Ù†ÙØ³ ÙÙˆØ±Ù… Ø¥Ù†Ø´Ø§Ø¡ Ø§Ù„Ù…ÙˆØ±Ø¯ Ø§Ù„ÙƒØ§Ù…Ù„ Ø¯Ø§Ø®Ù„ Ù†ÙØ³ Ø§Ù„Ø¹Ù…Ù„ÙŠØ©'
                : 'The full supplier creation form inside the current flow'}
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
                  {lang === 'ar' ? 'Ø§Ù„Ø§Ø³Ù… Ø¨Ø§Ù„Ø¹Ø±Ø¨ÙŠØ©' : 'Name (Arabic)'}{' '}
                  <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  dir="rtl"
                  value={form.nameAr}
                  onChange={(e) => set('nameAr', e.target.value)}
                  className={inputCls}
                  disabled={submitting}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {lang === 'ar' ? 'Ø§Ù„Ø§Ø³Ù… Ø¨Ø§Ù„Ø¥Ù†Ø¬Ù„ÙŠØ²ÙŠØ©' : 'Name (English)'}{' '}
                  <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.nameEn}
                  onChange={(e) => set('nameEn', e.target.value)}
                  className={inputCls}
                  disabled={submitting}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {lang === 'ar' ? 'Ø§Ù„Ù‡Ø§ØªÙ' : 'Phone'}
                </label>
                <input
                  type="text"
                  value={form.phone}
                  onChange={(e) => set('phone', e.target.value)}
                  className={inputCls}
                  disabled={submitting}
                />
              </div>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-2xl p-6">

            {showMoreDetails && (
              <div className="mt-4 grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {lang === 'ar' ? 'Ø§Ù„Ø¨Ø±ÙŠØ¯ Ø§Ù„Ø¥Ù„ÙƒØªØ±ÙˆÙ†ÙŠ' : 'Email'}
                  </label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => set('email', e.target.value)}
                    className={inputCls}
                    disabled={submitting}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {lang === 'ar' ? 'Ø§Ù„Ø¹Ù†ÙˆØ§Ù†' : 'Address'}
                  </label>
                  <input
                    type="text"
                    value={form.address}
                    onChange={(e) => set('address', e.target.value)}
                    className={inputCls}
                    dir={lang === 'ar' ? 'rtl' : 'ltr'}
                    disabled={submitting}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {lang === 'ar' ? 'Ù…Ù„Ø§Ø­Ø¸Ø§Øª' : 'Notes'}
                  </label>
                  <textarea
                    value={form.notes}
                    onChange={(e) => set('notes', e.target.value)}
                    className={`${inputCls} resize-none`}
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
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition font-semibold text-sm disabled:opacity-50"
            >
              <UserPlus className="w-4 h-4" />
              {submitting
                ? lang === 'ar'
                  ? 'Ø¬Ø§Ø±ÙŠ Ø§Ù„Ø­ÙØ¸...'
                  : 'Saving...'
                : lang === 'ar'
                  ? 'Ø¥Ù†Ø´Ø§Ø¡ Ø§Ù„Ù…ÙˆØ±Ø¯'
                  : 'Create Supplier'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

