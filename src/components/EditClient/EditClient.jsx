import { useContext, useState } from "react";
import { X } from "lucide-react";
import { toast } from "react-toastify";
import axiosInstance from "../../utils/axiosInstance";
import { getErrorMessage } from "../../utils/errorHandler";
import { LanguageContext } from "../../context/LanguageContext";
import FullPageLoader from "../Loader/Loader";

export default function EditClientModal({
  client = {},
  onClose,
  fetchClients,
}) {
  const { lang } = useContext(LanguageContext);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    nameAr:             client.nameAr             || "",
    nameEn:             client.nameEn             || "",
    phone:              client.phone              || "",
    email:              client.email              || "",
    address:            client.address            || "",
    notes:              client.notes              || "",
    taxNumber:          client.taxNumber          || "",
    commercialRegister: client.commercialRegister || "",
    type:               client.type               || "INDIVIDUAL",
  });

  const [errors, setErrors] = useState({});

  const set = (field, value) => setFormData(f => ({ ...f, [field]: value }));

  const validateForm = () => {
    const newErrors = {};
    if (!formData.nameAr?.trim() || formData.nameAr.length < 2)
      newErrors.nameAr = lang === 'ar' ? 'الاسم بالعربية يجب أن يكون حرفين على الأقل' : 'Arabic name must be at least 2 characters';
    if (!formData.nameEn?.trim() || formData.nameEn.length < 2)
      newErrors.nameEn = lang === 'ar' ? 'الاسم بالإنجليزية يجب أن يكون حرفين على الأقل' : 'English name must be at least 2 characters';
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (formData.email && !emailRegex.test(formData.email))
      newErrors.email = lang === 'ar' ? 'البريد الإلكتروني غير صحيح' : 'Invalid email format';
    if (formData.phone && formData.phone.length < 7)
      newErrors.phone = lang === 'ar' ? 'رقم الهاتف يجب أن يكون 7 أرقام على الأقل' : 'Phone must be at least 7 digits';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) {
      toast.error(lang === 'ar' ? 'يرجى إصلاح الأخطاء قبل الإرسال' : 'Please fix errors before submitting');
      return;
    }
    setSaving(true);
    try {
      await axiosInstance.put(`/clients/${client._id}`, {
        nameAr:             formData.nameAr?.trim()             || "",
        nameEn:             formData.nameEn?.trim()             || "",
        phone:              formData.phone?.trim()              || "",
        email:              formData.email?.trim()              || "",
        address:            formData.address?.trim()            || "",
        notes:              formData.notes?.trim()              || "",
        taxNumber:          formData.taxNumber?.trim()          || "",
        commercialRegister: formData.commercialRegister?.trim() || "",
        type:               formData.type || "INDIVIDUAL",
      });
      toast.success(lang === 'ar' ? 'تم تحديث العميل بنجاح!' : 'Client updated successfully!');
      setTimeout(() => { onClose(); fetchClients(); }, 1500);
    } catch (err) {
      toast.error(getErrorMessage(err, lang === 'ar' ? 'فشل حفظ العميل' : 'Failed to save client'));
    } finally {
      setSaving(false);
    }
  };

  const inputCls = (hasError) =>
    `w-full px-4 py-2.5 border rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition bg-gray-50 ${
      hasError ? 'border-red-400' : 'border-gray-200'
    }`;

  if (saving) return <FullPageLoader text={lang === 'ar' ? 'جاري المعالجة...' : 'Processing...'} />;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999] p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">

        {/* ── Header ── */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center">
              <span className="text-blue-600 font-semibold text-sm">
                {(lang === 'ar' ? client.nameAr : client.nameEn)?.charAt(0).toUpperCase()}
              </span>
            </div>
            <div>
              <h3 className="text-base font-semibold text-gray-900">
                {lang === 'ar' ? 'تعديل العميل' : 'Edit Client'}
              </h3>
              <p className="text-xs text-gray-400">{client.code}</p>
            </div>
          </div>
          <button onClick={onClose} disabled={saving} className="p-1 rounded-md hover:bg-gray-100 text-gray-400">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ── Form ── */}
        <form onSubmit={handleSubmit} className="overflow-y-auto flex-1 p-5 space-y-4">

          {/* Names */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {lang === 'ar' ? 'الاسم (عربي)' : 'Name (Arabic)'} <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.nameAr}
                onChange={e => set('nameAr', e.target.value)}
                className={inputCls(errors.nameAr)}
                dir="rtl"
                disabled={saving}
              />
              {errors.nameAr && <p className="mt-1 text-xs text-red-500">{errors.nameAr}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {lang === 'ar' ? 'الاسم (إنجليزي)' : 'Name (English)'} <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.nameEn}
                onChange={e => set('nameEn', e.target.value)}
                className={inputCls(errors.nameEn)}
                disabled={saving}
              />
              {errors.nameEn && <p className="mt-1 text-xs text-red-500">{errors.nameEn}</p>}
            </div>
          </div>

          {/* Phone + Email */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {lang === 'ar' ? 'الهاتف' : 'Phone'}
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={e => set('phone', e.target.value)}
                className={inputCls(errors.phone)}
                disabled={saving}
              />
              {errors.phone && <p className="mt-1 text-xs text-red-500">{errors.phone}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {lang === 'ar' ? 'البريد الإلكتروني' : 'Email'}
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={e => set('email', e.target.value)}
                className={inputCls(errors.email)}
                disabled={saving}
              />
              {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email}</p>}
            </div>
          </div>

          {/* Tax + Commercial Register */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {lang === 'ar' ? 'رقم التعريف الضريبي' : 'Tax Number'}
              </label>
              <input
                type="text"
                value={formData.taxNumber}
                onChange={e => set('taxNumber', e.target.value)}
                className={inputCls(false)}
                disabled={saving}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {lang === 'ar' ? 'رقم السجل التجاري' : 'Commercial Register'}
              </label>
              <input
                type="text"
                value={formData.commercialRegister}
                onChange={e => set('commercialRegister', e.target.value)}
                className={inputCls(false)}
                disabled={saving}
              />
            </div>
          </div>

          {/* Address */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {lang === 'ar' ? 'العنوان' : 'Address'}
            </label>
            <input
              type="text"
              value={formData.address}
              onChange={e => set('address', e.target.value)}
              className={inputCls(false)}
              dir={lang === 'ar' ? 'rtl' : 'ltr'}
              disabled={saving}
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {lang === 'ar' ? 'ملاحظات' : 'Notes'}
            </label>
            <textarea
              value={formData.notes}
              onChange={e => set('notes', e.target.value)}
              rows={2}
              dir={lang === 'ar' ? 'rtl' : 'ltr'}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition bg-gray-50 resize-none"
              disabled={saving}
            />
          </div>
        </form>

        {/* ── Footer ── */}
        <div className="flex gap-3 p-5 border-t border-gray-100">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition font-medium text-sm"
          >
            {lang === 'ar' ? 'إلغاء' : 'Cancel'}
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition font-medium text-sm disabled:opacity-50"
          >
            {lang === 'ar' ? 'حفظ التعديلات' : 'Save Changes'}
          </button>
        </div>

      </div>
    </div>
  );
}