import { useContext, useState } from "react";
import { X, Mail, Phone, MapPin, FileText, Building2, AlertCircle, CheckCircle } from "lucide-react";
import { toast } from "react-toastify";
import { Button } from "../ui/button";
import axiosInstance from "../../utils/axiosInstance";
import { LanguageContext } from "../../context/LanguageContext";
import FullPageLoader from "../Loader/Loader";

export default function EditClientModal({ 
  client = {},
  onClose, 
  fetchClients,
}) {
  const { lang, t } = useContext(LanguageContext);
  const [saving, setSaving] = useState(false);
  const [toast_, setToast_] = useState(null);

  const [formData, setFormData] = useState({
    nameAr: client.nameAr || "",
    nameEn: client.nameEn || "",
    phone: client.phone || "",
    email: client.email || "",
    address: client.address || "",
    notes: client.notes || "",
    taxNumber: client.taxNumber || "",
    commercialRegister: client.commercialRegister || "",
    type: client.type || "INDIVIDUAL",
  });

  const [errors, setErrors] = useState({});

  const validateForm = () => {
    const newErrors = {};

    if (!formData.nameAr?.trim() || formData.nameAr.length < 2) {
      newErrors.nameAr = lang === 'ar' ? 'الاسم بالعربية يجب أن يكون حرفين على الأقل' : 'Arabic name must be at least 2 characters';
    }

    if (!formData.nameEn?.trim() || formData.nameEn.length < 2) {
      newErrors.nameEn = lang === 'ar' ? 'الاسم بالإنجليزية يجب أن يكون حرفين على الأقل' : 'English name must be at least 2 characters';
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (formData.email && !emailRegex.test(formData.email)) {
      newErrors.email = lang === 'ar' ? 'البريد الإلكتروني غير صحيح' : 'Invalid email format';
    }

    if (formData.phone && formData.phone.length < 7) {
      newErrors.phone = lang === 'ar' ? 'رقم الهاتف يجب أن يكون 7 أرقام على الأقل' : 'Phone must be at least 7 digits';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const showToast = (message, type) => {
    setToast_({ message, type });
    setTimeout(() => setToast_(null), 5000);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      showToast(lang === 'ar' ? 'يرجى إصلاح الأخطاء قبل الإرسال' : 'Please fix errors before submitting', 'error');
      return;
    }

    setSaving(true);

    try {
      const payload = {
        nameAr: formData.nameAr?.trim() || "",
        nameEn: formData.nameEn?.trim() || "",
        phone: formData.phone?.trim() || "",
        email: formData.email?.trim() || "",
        address: formData.address?.trim() || "",
        notes: formData.notes?.trim() || "",
        taxNumber: formData.taxNumber?.trim() || "",
        commercialRegister: formData.commercialRegister?.trim() || "",
        type: formData.type || "INDIVIDUAL",
      };

      await axiosInstance.put(`/clients/${client._id}`, payload);
      
      showToast(lang === 'ar' ? 'تم تحديث العميل بنجاح!' : 'Client updated successfully!', 'success');
      
      setTimeout(() => {
        onClose();
        fetchClients();
      }, 1500);
      
    } catch (err) {
      console.error("Error saving client:", err);
      
      let errorMsg = lang === 'ar' ? 'فشل حفظ العميل' : 'Failed to save client';
      
      if (err.response?.data?.message && Array.isArray(err.response.data.message)) {
        errorMsg = err.response.data.message.join(", ");
      } else if (err.response?.data?.message) {
        errorMsg = err.response.data.message;
      } else if (err.response?.data?.error) {
        errorMsg = err.response.data.error;
      }
      
      showToast(errorMsg, 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999] p-4 overflow-y-auto">
      {/* Toast */}
      {toast_ && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-3 px-6 py-4 rounded-lg shadow-lg ${
          toast_.type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
        }`}>
          {toast_.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
          <span className="font-medium">{toast_.message}</span>
        </div>
      )}

      {/* Submitting Overlay */}
      {saving && <FullPageLoader text={lang === "ar" ? "جاري المعالجة..." : "Processing..."} />}

      <div className="bg-white rounded-lg w-full max-w-[700px] shadow-2xl my-8 max-h-[90vh] flex flex-col">
        <form onSubmit={handleSubmit} className="flex flex-col max-h-[90vh]">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4 flex justify-between items-center flex-shrink-0">
            <h3 className="text-xl font-bold text-white">
              {t?.editClient || "Edit Client"}
            </h3>
            <button
              type="button"
              onClick={onClose}
              className="text-white/70 hover:text-white transition"
              disabled={saving}
            >
              <X size={24} />
            </button>
          </div>

          {/* Form Fields */}
          <div className="px-6 py-4 space-y-4 overflow-y-auto flex-1">
            
            {/* Names Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Name (Arabic) */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  {lang === 'ar' ? 'الاسم (عربي)' : 'Name (Arabic)'} <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.nameAr}
                  onChange={e => setFormData({ ...formData, nameAr: e.target.value })}
                  className={`w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm ${
                    errors.nameAr ? 'border-red-500' : 'border-gray-300'
                  }`}
                  dir="rtl"
                  disabled={saving}
                />
                {errors.nameAr && <p className="mt-0.5 text-xs text-red-500">{errors.nameAr}</p>}
              </div>

              {/* Name (English) */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  {lang === 'ar' ? 'الاسم (إنجليزي)' : 'Name (English)'} <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.nameEn}
                  onChange={e => setFormData({ ...formData, nameEn: e.target.value })}
                  className={`w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm ${
                    errors.nameEn ? 'border-red-500' : 'border-gray-300'
                  }`}
                  disabled={saving}
                />
                {errors.nameEn && <p className="mt-0.5 text-xs text-red-500">{errors.nameEn}</p>}
              </div>
            </div>

            {/* Contact Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Phone */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  {lang === 'ar' ? 'الهاتف' : 'Phone'}
                </label>
                <div className="relative">
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                    className={`w-full px-3 py-2 pl-9 border rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm ${
                      errors.phone ? 'border-red-500' : 'border-gray-300'
                    }`}
                    disabled={saving}
                  />
                  <Phone className="absolute right-2 top-2.5 w-4 h-4 text-gray-400 pointer-events-none" />
                </div>
                {errors.phone && <p className="mt-0.5 text-xs text-red-500">{errors.phone}</p>}
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  {lang === 'ar' ? 'البريد الإلكتروني' : 'Email'}
                </label>
                <div className="relative">
                  <input
                    type="email"
                    value={formData.email}
                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                    className={`w-full px-3 py-2 pl-9 border rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm ${
                      errors.email ? 'border-red-500' : 'border-gray-300'
                    }`}
                    disabled={saving}
                  />
                  <Mail className="absolute right-2 top-2.5 w-4 h-4 text-gray-400 pointer-events-none" />
                </div>
                {errors.email && <p className="mt-0.5 text-xs text-red-500">{errors.email}</p>}
              </div>
            </div>

            {/* Business Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Tax Number */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  {lang === 'ar' ? 'رقم التعريف الضريبي' : 'Tax Number'}
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={formData.taxNumber}
                    onChange={e => setFormData({ ...formData, taxNumber: e.target.value })}
                    className="w-full px-3 py-2 pl-9 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    disabled={saving}
                  />
                  <FileText className="absolute right-2 top-2.5 w-4 h-4 text-gray-400 pointer-events-none" />
                </div>
              </div>

              {/* Commercial Register */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  {lang === 'ar' ? 'رقم السجل التجاري' : 'Commercial Register'}
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={formData.commercialRegister}
                    onChange={e => setFormData({ ...formData, commercialRegister: e.target.value })}
                    className="w-full px-3 py-2 pl-9 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    disabled={saving}
                  />
                  <Building2 className="absolute right-2 top-2.5 w-4 h-4 text-gray-400 pointer-events-none" />
                </div>
              </div>
            </div>

            {/* Address */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                {lang === 'ar' ? 'العنوان' : 'Address'}
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={formData.address}
                  onChange={e => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-3 py-2 pl-9 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  dir={lang === "ar" ? "rtl" : "ltr"}
                  disabled={saving}
                />
                <MapPin className="absolute right-2 top-2.5 w-4 h-4 text-gray-400 pointer-events-none" />
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                {lang === 'ar' ? 'ملاحظات' : 'Notes'}
              </label>
              <textarea
                value={formData.notes}
                onChange={e => setFormData({ ...formData, notes: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                rows={2}
                dir={lang === "ar" ? "rtl" : "ltr"}
                disabled={saving}
              />
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-2 p-4 border-t bg-gray-50 flex-shrink-0">
            <Button 
              type="button" 
              variant="outline" 
              onClick={onClose}
              className="px-4 py-2"
              disabled={saving}
            >
              {t?.cancel || "Cancel"}
            </Button>
            <Button 
              type="submit"
              className="px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white min-w-[100px]"
              disabled={saving}
            >
              {saving ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-3 w-3 border-2 border-white border-t-transparent"></div>
                  {lang === "ar" ? "جاري الحفظ..." : "Saving..."}
                </div>
              ) : (
                <>{t?.save || "Save"}</>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}