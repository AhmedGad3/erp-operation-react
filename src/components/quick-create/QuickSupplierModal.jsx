import React, { useState } from 'react';
import { X } from 'lucide-react';
import { toast } from 'react-toastify';
import axiosInstance from '../../utils/axiosInstance';
import { getErrorMessage } from '../../utils/errorHandler';
import { createAutoCode } from '../../utils/autoCode';

export default function QuickSupplierModal({ lang, onClose, onCreated }) {
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
      code: createAutoCode(prev.nameEn || prev.nameAr, 'SUP'),
    }));
  }, [form.nameAr, form.nameEn, codeTouched]);

  const handleCodeChange = (value) => {
    setCodeTouched(true);
    setForm((prev) => ({ ...prev, code: value.toUpperCase() }));
  };

  const handleSubmit = async () => {
    if (!form.nameAr.trim() && !form.nameEn.trim()) {
      toast.error(lang === 'ar' ? 'اسم المورد مطلوب' : 'Supplier name is required');
      return;
    }

    try {
      setSubmitting(true);
      const { data } = await axiosInstance.post('/suppliers', {
        nameAr: form.nameAr.trim(),
        nameEn: form.nameEn.trim(),
        code: form.code.trim().toUpperCase(),
        phone: form.phone.trim(),
      });
      const created = data?.result || data;
      toast.success(lang === 'ar' ? 'تم إنشاء المورد' : 'Supplier created');
      onCreated?.(created);
      onClose();
    } catch (error) {
      toast.error(getErrorMessage(error, lang === 'ar' ? 'فشل إنشاء المورد' : 'Failed to create supplier'));
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
              {lang === 'ar' ? 'إضافة مورد سريعًا' : 'Quick Add Supplier'}
            </h3>
            <p className="text-sm text-gray-500 mt-1">
              {lang === 'ar' ? 'سننشئ المورد ونختاره مباشرة في نفس العملية' : 'Create a supplier and use it immediately in this flow'}
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
                {lang === 'ar' ? 'الاسم بالعربية' : 'Name (Arabic)'}
              </label>
              <input type="text" dir="rtl" value={form.nameAr} onChange={(e) => setForm((prev) => ({ ...prev, nameAr: e.target.value }))} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 bg-gray-50" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {lang === 'ar' ? 'الاسم بالإنجليزية' : 'Name (English)'}
              </label>
              <input type="text" value={form.nameEn} onChange={(e) => setForm((prev) => ({ ...prev, nameEn: e.target.value }))} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 bg-gray-50" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {lang === 'ar' ? 'الكود' : 'Code'}
              </label>
              <input type="text" value={form.code} onChange={(e) => handleCodeChange(e.target.value)} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 bg-gray-50" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {lang === 'ar' ? 'الهاتف' : 'Phone'}
              </label>
              <input type="text" value={form.phone} onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 bg-gray-50" />
            </div>
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition font-medium text-sm">
            {lang === 'ar' ? 'إلغاء' : 'Cancel'}
          </button>
          <button onClick={handleSubmit} disabled={submitting} className="flex-1 px-4 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition font-medium text-sm disabled:opacity-50">
            {submitting ? (lang === 'ar' ? 'جاري الحفظ...' : 'Saving...') : (lang === 'ar' ? 'حفظ المورد' : 'Save Supplier')}
          </button>
        </div>
      </div>
    </div>
  );
}
