import React, { useState } from 'react';
import { X } from 'lucide-react';
import { toast } from 'react-toastify';
import axiosInstance from '../../utils/axiosInstance';
import { getErrorMessage } from '../../utils/errorHandler';
import { createAutoCode } from '../../utils/autoCode';

export default function QuickClientModal({ lang, onClose, onCreated }) {
  const [form, setForm] = useState({
    nameAr: '',
    nameEn: '',
    code: '',
    phone: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [codeTouched, setCodeTouched] = useState(false);

  React.useEffect(() => {
    if (codeTouched) return;
    setForm((prev) => ({
      ...prev,
      code: createAutoCode(prev.nameEn || prev.nameAr, 'CLT'),
    }));
  }, [form.nameAr, form.nameEn, codeTouched]);

  const handleCodeChange = (value) => {
    setCodeTouched(true);
    setForm((prev) => ({ ...prev, code: value.toUpperCase() }));
  };

  const handleSubmit = async () => {
    if (!form.nameAr.trim() || !form.nameEn.trim() || !form.code.trim()) {
      toast.error(lang === 'ar' ? 'املأ الاسم والكود أولاً' : 'Please fill name and code first');
      return;
    }

    try {
      setSubmitting(true);
      const { data } = await axiosInstance.post('/clients', {
        nameAr: form.nameAr.trim(),
        nameEn: form.nameEn.trim(),
        code: form.code.trim().toUpperCase(),
        phone: form.phone.trim(),
        type: 'INDIVIDUAL',
      });
      const created = data?.result || data;
      toast.success(lang === 'ar' ? 'تم إنشاء العميل' : 'Client created');
      onCreated?.(created);
      onClose();
    } catch (error) {
      toast.error(getErrorMessage(error, lang === 'ar' ? 'فشل إنشاء العميل' : 'Failed to create client'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[70] p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              {lang === 'ar' ? 'إضافة عميل سريعًا' : 'Quick Add Client'}
            </h3>
            <p className="text-sm text-gray-500 mt-1">
              {lang === 'ar' ? 'سننشئ عميلًا جديدًا ونختاره مباشرة للمشروع' : 'Create a client and use it immediately in this project'}
            </p>
          </div>
          <button onClick={onClose} className="p-1 rounded-md hover:bg-gray-100 text-gray-400">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {lang === 'ar' ? 'الاسم بالعربية' : 'Name (Arabic)'} <span className="text-red-500">*</span>
              </label>
              <input type="text" dir="rtl" value={form.nameAr} onChange={(e) => setForm((prev) => ({ ...prev, nameAr: e.target.value }))} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 bg-gray-50" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {lang === 'ar' ? 'الاسم بالإنجليزية' : 'Name (English)'} <span className="text-red-500">*</span>
              </label>
              <input type="text" value={form.nameEn} onChange={(e) => setForm((prev) => ({ ...prev, nameEn: e.target.value }))} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 bg-gray-50" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {lang === 'ar' ? 'الكود' : 'Code'} <span className="text-red-500">*</span>
              </label>
              <input type="text" value={form.code} onChange={(e) => handleCodeChange(e.target.value)} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 bg-gray-50" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {lang === 'ar' ? 'الهاتف' : 'Phone'}
              </label>
              <input type="text" value={form.phone} onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 bg-gray-50" />
            </div>
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition font-medium text-sm">
            {lang === 'ar' ? 'إلغاء' : 'Cancel'}
          </button>
          <button onClick={handleSubmit} disabled={submitting} className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition font-medium text-sm disabled:opacity-50">
            {submitting ? (lang === 'ar' ? 'جاري الحفظ...' : 'Saving...') : (lang === 'ar' ? 'حفظ العميل' : 'Save Client')}
          </button>
        </div>
      </div>
    </div>
  );
}
