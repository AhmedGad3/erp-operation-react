import React, { useState } from 'react';
import { ChevronDown, ChevronUp, UserPlus, X } from 'lucide-react';
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
    email: '',
    address: '',
    notes: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [codeTouched, setCodeTouched] = useState(false);
  const [showMoreDetails, setShowMoreDetails] = useState(false);

  React.useEffect(() => {
    if (codeTouched) return;
    setForm((prev) => ({
      ...prev,
      code: createAutoCode(prev.nameEn || prev.nameAr, 'SUP'),
    }));
  }, [form.nameAr, form.nameEn, codeTouched]);

  const set = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));

  const handleCodeChange = (value) => {
    setCodeTouched(true);
    set('code', value.toUpperCase());
  };

  const inputCls = `w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-gray-50`;

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.nameAr.trim() && !form.nameEn.trim()) {
      toast.error(
        lang === 'ar' ? 'اسم المورد مطلوب' : 'Supplier name is required',
      );
      return;
    }

    try {
      setSubmitting(true);
      const { data } = await axiosInstance.post('/suppliers', {
        nameAr: form.nameAr.trim(),
        nameEn: form.nameEn.trim(),
        code: form.code.trim().toUpperCase(),
        phone: form.phone.trim(),
        email: form.email.trim(),
        address: form.address.trim(),
        notes: form.notes.trim(),
      });
      const created = data?.result || data;
      toast.success(
        lang === 'ar' ? 'تم إنشاء المورد' : 'Supplier created',
      );
      onCreated?.(created);
      onClose();
    } catch (error) {
      toast.error(
        getErrorMessage(
          error,
          lang === 'ar' ? 'فشل إنشاء المورد' : 'Failed to create supplier',
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
              {lang === 'ar' ? 'إضافة مورد جديد' : 'Add New Supplier'}
            </h3>
            <p className="text-sm text-gray-500 mt-1">
              {lang === 'ar'
                ? 'نفس فورم إنشاء المورد الكامل داخل نفس العملية'
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
              {lang === 'ar' ? 'البيانات الأساسية' : 'Core Details'}
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {lang === 'ar' ? 'الاسم بالعربية' : 'Name (Arabic)'}
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
                  {lang === 'ar' ? 'الاسم بالإنجليزية' : 'Name (English)'}
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
                  {lang === 'ar' ? 'الكود' : 'Code'}
                </label>
                <input
                  type="text"
                  value={form.code}
                  onChange={(e) => handleCodeChange(e.target.value)}
                  className={inputCls}
                  disabled={submitting}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {lang === 'ar' ? 'الهاتف' : 'Phone'}
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
            <button
              type="button"
              onClick={() => setShowMoreDetails((prev) => !prev)}
              className="w-full flex items-center justify-between text-sm font-medium text-indigo-700 hover:text-indigo-800"
            >
              <span>
                {showMoreDetails
                  ? lang === 'ar'
                    ? 'إخفاء التفاصيل الاختيارية'
                    : 'Hide optional details'
                  : lang === 'ar'
                    ? 'إضافة تفاصيل اختيارية'
                    : 'Add optional details'}
              </span>
              {showMoreDetails ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </button>

            {showMoreDetails && (
              <div className="mt-4 grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {lang === 'ar' ? 'البريد الإلكتروني' : 'Email'}
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
                    {lang === 'ar' ? 'العنوان' : 'Address'}
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
                    {lang === 'ar' ? 'ملاحظات' : 'Notes'}
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
              {lang === 'ar' ? 'إلغاء' : 'Cancel'}
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition font-semibold text-sm disabled:opacity-50"
            >
              <UserPlus className="w-4 h-4" />
              {submitting
                ? lang === 'ar'
                  ? 'جاري الحفظ...'
                  : 'Saving...'
                : lang === 'ar'
                  ? 'إنشاء المورد'
                  : 'Create Supplier'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
