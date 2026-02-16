import { useContext, useState } from "react";
import { X, AlertCircle, CheckCircle } from "lucide-react";
import axiosInstance from "../../utils/axiosInstance";
import { LanguageContext } from "../../context/LanguageContext";
import FullPageLoader from "../Loader/Loader";

export default function EditProjectModal({ 
  project = {},
  onClose, 
  fetchProjects,
}) {
  const { lang, t } = useContext(LanguageContext);
  const [saving, setSaving] = useState(false);
  const [toast_, setToast_] = useState(null);

  const [formData, setFormData] = useState({
    nameAr: project.nameAr || "",
    nameEn: project.nameEn || "",
    projectManager: project.projectManager || "",
    siteEngineer: project.siteEngineer || "",
    status: project.status || "PLANNED",
    notes: project.notes || "",
  });

  const [errors, setErrors] = useState({});

  const validateForm = () => {
    const newErrors = {};

    if (!formData.nameAr?.trim() || formData.nameAr.length < 2) {
      newErrors.nameAr = lang === 'ar' ? 'الاسم بالعربية مطلوب' : 'Arabic name is required';
    }

    if (!formData.nameEn?.trim() || formData.nameEn.length < 2) {
      newErrors.nameEn = lang === 'ar' ? 'الاسم بالإنجليزية مطلوب' : 'English name is required';
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
      showToast(lang === 'ar' ? 'يرجى إصلاح الأخطاء' : 'Please fix errors', 'error');
      return;
    }

    setSaving(true);

    try {
      const payload = {
        nameAr: formData.nameAr?.trim() || "",
        nameEn: formData.nameEn?.trim() || "",
        projectManager: formData.projectManager?.trim() || "",
        siteEngineer: formData.siteEngineer?.trim() || "",
        status: formData.status,
        notes: formData.notes?.trim() || "",
      };

      await axiosInstance.put(`/admin/projects/${project._id}`, payload);
      
      showToast(lang === 'ar' ? 'تم التحديث بنجاح!' : 'Updated successfully!', 'success');
      
      setTimeout(() => {
        onClose();
        fetchProjects();
      }, 1500);
      
    } catch (err) {
      console.error("Error updating project:", err);
      let errorMsg = lang === 'ar' ? 'فشل التحديث' : 'Failed to update';
      if (err.response?.data?.message) {
        errorMsg = err.response.data.message;
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

      {saving && <FullPageLoader text={lang === "ar" ? "جاري المعالجة..." : "Processing..."} />}

      <div className="bg-white rounded-lg w-full max-w-2xl shadow-2xl my-8 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-green-600 to-green-700 px-6 py-4 flex justify-between items-center flex-shrink-0">
          <h3 className="text-xl font-bold text-white">
            {lang === 'ar' ? 'تعديل المشروع' : 'Edit Project'}
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

        {/* Content */}
        <div className="px-6 py-4 space-y-6 overflow-y-auto flex-1">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  {lang === 'ar' ? 'الاسم (عربي)' : 'Name (Arabic)'}
                  <span className="text-red-500 ml-1">*</span>
                </label>
                <input
                  type="text"
                  value={formData.nameAr}
                  onChange={e => setFormData({ ...formData, nameAr: e.target.value })}
                  className={`w-full px-3 py-2 border rounded focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm ${
                    errors.nameAr ? 'border-red-500' : 'border-gray-300'
                  }`}
                  dir="rtl"
                  disabled={saving}
                />
                {errors.nameAr && <p className="mt-0.5 text-xs text-red-500">{errors.nameAr}</p>}
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  {lang === 'ar' ? 'الاسم (إنجليزي)' : 'Name (English)'}
                  <span className="text-red-500 ml-1">*</span>
                </label>
                <input
                  type="text"
                  value={formData.nameEn}
                  onChange={e => setFormData({ ...formData, nameEn: e.target.value })}
                  className={`w-full px-3 py-2 border rounded focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm ${
                    errors.nameEn ? 'border-red-500' : 'border-gray-300'
                  }`}
                  disabled={saving}
                />
                {errors.nameEn && <p className="mt-0.5 text-xs text-red-500">{errors.nameEn}</p>}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  {lang === 'ar' ? 'مدير المشروع' : 'Project Manager'}
                </label>
                <input
                  type="text"
                  value={formData.projectManager}
                  onChange={e => setFormData({ ...formData, projectManager: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm"
                  disabled={saving}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  {lang === 'ar' ? 'مهندس الموقع' : 'Site Engineer'}
                </label>
                <input
                  type="text"
                  value={formData.siteEngineer}
                  onChange={e => setFormData({ ...formData, siteEngineer: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm"
                  disabled={saving}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                {lang === 'ar' ? 'الحالة' : 'Status'}
              </label>
              <select
                value={formData.status}
                onChange={e => setFormData({ ...formData, status: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm"
                disabled={saving}
              >
                <option value="PLANNED">{lang === 'ar' ? 'مخطط' : 'Planned'}</option>
                <option value="IN_PROGRESS">{lang === 'ar' ? 'جاري' : 'In Progress'}</option>
                <option value="ON_HOLD">{lang === 'ar' ? 'معلق' : 'On Hold'}</option>
                <option value="COMPLETED">{lang === 'ar' ? 'مكتمل' : 'Completed'}</option>
                <option value="CANCELLED">{lang === 'ar' ? 'ملغي' : 'Cancelled'}</option>
                <option value="CLOSED">{lang === 'ar' ? 'مغلق' : 'Closed'}</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                {lang === 'ar' ? 'ملاحظات' : 'Notes'}
              </label>
              <textarea
                value={formData.notes}
                onChange={e => setFormData({ ...formData, notes: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm"
                rows={3}
                disabled={saving}
                dir={lang === 'ar' ? 'rtl' : 'ltr'}
              />
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full px-4 py-3 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white rounded-lg font-semibold disabled:opacity-50 transition shadow-md"
            >
              {saving 
                ? (lang === 'ar' ? 'جاري الحفظ...' : 'Saving...') 
                : (lang === 'ar' ? 'حفظ التعديلات' : 'Save Changes')
              }
            </button>
          </form>

          {/* Info Box */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              <strong>{lang === 'ar' ? 'ملاحظة:' : 'Note:'}</strong>
              {' '}
              {lang === 'ar' 
                ? 'لإضافة تكاليف المعدات والعمالة والنثريات، يرجى الذهاب إلى صفحة تفاصيل المشروع.'
                : 'To add equipment, labor, and miscellaneous costs, please go to the project details page.'
              }
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 p-4 border-t bg-gray-50 flex-shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition font-semibold"
            disabled={saving}
          >
            {lang === 'ar' ? 'إغلاق' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
}