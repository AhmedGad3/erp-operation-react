import { useContext, useEffect, useMemo, useState } from 'react';
import { ChevronDown, ChevronUp, X } from 'lucide-react';
import { toast } from 'react-toastify';
import { Button } from '../ui/button';
import axiosInstance, { getErrorMessage } from '../../utils/axiosInstance';
import { LanguageContext } from '../../context/LanguageContext';
import { createAutoCode } from '../../utils/autoCode';

export default function SupplierModal({
  formData,
  setFormData,
  onClose,
  fetchSuppliers,
  editing,
}) {
  const { lang, t } = useContext(LanguageContext);
  const [saving, setSaving] = useState(false);
  const [codeTouched, setCodeTouched] = useState(Boolean(formData.code));
  const [showMoreDetails, setShowMoreDetails] = useState(
    Boolean(formData.email || formData.address || formData.notes),
  );

  useEffect(() => {
    if (codeTouched) return;
    setFormData((prev) => ({
      ...prev,
      code: createAutoCode(prev.nameEn || prev.nameAr, 'SUP'),
    }));
  }, [codeTouched, formData.nameAr, formData.nameEn, setFormData]);

  const title = useMemo(
    () =>
      editing
        ? t?.editSupplier || 'Edit Supplier'
        : t?.addSupplier || 'Add Supplier',
    [editing, t],
  );

  const handleChange = (key, value) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const handleCodeChange = (value) => {
    setCodeTouched(true);
    handleChange('code', value.toUpperCase());
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.nameAr?.trim() && !formData.nameEn?.trim()) {
      toast.error(t?.supplierNameRequired || 'Supplier name is required', {
        position: 'top-right',
        autoClose: 3000,
      });
      return;
    }

    setSaving(true);

    try {
      const payload = {
        nameAr: formData.nameAr?.trim() || '',
        nameEn: formData.nameEn?.trim() || '',
        code: formData.code?.trim() || '',
        phone: formData.phone?.trim() || '',
        email: formData.email?.trim() || '',
        address: formData.address?.trim() || '',
        notes: formData.notes?.trim() || '',
      };

      if (editing) {
        const supplierId = formData._id || formData.id;
        await axiosInstance.put(`/suppliers/${supplierId}`, payload);
        toast.success(t?.supplierUpdated || 'Supplier updated successfully', {
          position: 'top-right',
          autoClose: 2000,
        });
      } else {
        await axiosInstance.post('/suppliers', payload);
        toast.success(t?.supplierAdded || 'Supplier added successfully', {
          position: 'top-right',
          autoClose: 2000,
        });
      }

      onClose();
      await fetchSuppliers();
    } catch (err) {
      toast.error(
        getErrorMessage(
          err,
          lang === 'ar' ? 'فشل حفظ المورد' : 'Error saving supplier',
        ),
        {
          position: 'top-right',
          autoClose: 4000,
        },
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999] p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl w-full max-w-[560px] shadow-2xl my-8 max-h-[90vh] flex flex-col">
        <form onSubmit={handleSubmit} className="flex flex-col max-h-[90vh]">
          <div className="flex justify-between items-center p-5 border-b flex-shrink-0">
            <div>
              <h3 className="text-xl font-bold text-gray-900">{title}</h3>
              <p className="text-sm text-gray-500 mt-1">
                {lang === 'ar'
                  ? 'ابدأ بالبيانات الأساسية والباقي اختياري'
                  : 'Start with the basics, optional details can be added later'}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 transition-colors"
              disabled={saving}
            >
              <X size={24} />
            </button>
          </div>

          <div className="px-6 py-5 space-y-4 overflow-y-auto flex-1">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1.5 text-gray-700">
                  {t?.nameAr || 'Name (Arabic)'}{' '}
                  <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder={t?.nameAr || 'Name (Arabic)'}
                  value={formData.nameAr || ''}
                  onChange={(e) => handleChange('nameAr', e.target.value)}
                  className="w-full border border-gray-300 px-4 py-2.5 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-gray-50"
                  dir="rtl"
                  disabled={saving}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5 text-gray-700">
                  {t?.nameEn || 'Name (English)'}
                </label>
                <input
                  type="text"
                  placeholder={t?.nameEn || 'Name (English)'}
                  value={formData.nameEn || ''}
                  onChange={(e) => handleChange('nameEn', e.target.value)}
                  className="w-full border border-gray-300 px-4 py-2.5 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-gray-50"
                  disabled={saving}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5 text-gray-700">
                  {t?.code || 'Code'}
                </label>
                <input
                  type="text"
                  placeholder={t?.code || 'Code'}
                  value={formData.code || ''}
                  onChange={(e) => handleCodeChange(e.target.value)}
                  className="w-full border border-gray-300 px-4 py-2.5 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-gray-50"
                  disabled={saving}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5 text-gray-700">
                  {t?.phone || 'Phone'}
                </label>
                <input
                  type="text"
                  placeholder={t?.phone || 'Phone'}
                  value={formData.phone || ''}
                  onChange={(e) => handleChange('phone', e.target.value)}
                  className="w-full border border-gray-300 px-4 py-2.5 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-gray-50"
                  disabled={saving}
                />
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowMoreDetails((prev) => !prev)}
              className="w-full flex items-center justify-between px-4 py-3 rounded-xl border border-dashed border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
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
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1.5 text-gray-700">
                    {t?.email || 'Email'}
                  </label>
                  <input
                    type="email"
                    placeholder={t?.email || 'Email'}
                    value={formData.email || ''}
                    onChange={(e) => handleChange('email', e.target.value)}
                    className="w-full border border-gray-300 px-4 py-2.5 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-gray-50"
                    disabled={saving}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1.5 text-gray-700">
                    {t?.address || 'Address'}
                  </label>
                  <input
                    type="text"
                    placeholder={t?.address || 'Address'}
                    value={formData.address || ''}
                    onChange={(e) => handleChange('address', e.target.value)}
                    className="w-full border border-gray-300 px-4 py-2.5 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-gray-50"
                    dir={lang === 'ar' ? 'rtl' : 'ltr'}
                    disabled={saving}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1.5 text-gray-700">
                    {t?.notes || 'Notes'}
                  </label>
                  <textarea
                    placeholder={t?.notes || 'Notes'}
                    value={formData.notes || ''}
                    onChange={(e) => handleChange('notes', e.target.value)}
                    className="w-full border border-gray-300 px-4 py-2.5 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-gray-50"
                    rows={3}
                    dir={lang === 'ar' ? 'rtl' : 'ltr'}
                    disabled={saving}
                  />
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 p-4 border-t bg-gray-50 flex-shrink-0">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="px-4 py-2"
              disabled={saving}
            >
              {t?.cancel || 'Cancel'}
            </Button>
            <Button
              type="submit"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white min-w-[100px]"
              disabled={saving}
            >
              {saving ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                  {lang === 'ar' ? 'جاري الحفظ...' : 'Saving...'}
                </div>
              ) : (
                <>{t?.save || 'Save'}</>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
