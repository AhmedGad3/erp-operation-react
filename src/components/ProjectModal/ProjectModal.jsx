import { useContext, useState } from "react";
import { X } from "lucide-react";
import axiosInstance from "../../utils/axiosInstance";
import { LanguageContext } from "../../context/LanguageContext";
import FullPageLoader from "../Loader/Loader";

export default function EditProjectModal({
  project = {},
  onClose,
  fetchProjects,
}) {
  const { lang } = useContext(LanguageContext);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    nameAr:         project.nameAr         || "",
    nameEn:         project.nameEn         || "",
    projectManager: project.projectManager || "",
    siteEngineer:   project.siteEngineer   || "",
    status:         project.status         || "PLANNED",
    notes:          project.notes          || "",
  });

  const [errors, setErrors] = useState({});

  const validateForm = () => {
    const newErrors = {};
    if (!formData.nameAr?.trim() || formData.nameAr.length < 2)
      newErrors.nameAr = lang === 'ar' ? 'الاسم بالعربية مطلوب' : 'Arabic name is required';
    if (!formData.nameEn?.trim() || formData.nameEn.length < 2)
      newErrors.nameEn = lang === 'ar' ? 'الاسم بالإنجليزية مطلوب' : 'English name is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    setSaving(true);
    try {
      await axiosInstance.put(`/admin/projects/${project._id}`, {
        nameAr:         formData.nameAr?.trim()         || "",
        nameEn:         formData.nameEn?.trim()         || "",
        projectManager: formData.projectManager?.trim() || "",
        siteEngineer:   formData.siteEngineer?.trim()   || "",
        status:         formData.status,
        notes:          formData.notes?.trim()          || "",
      });
      onClose();
      fetchProjects();
    } catch (err) {
      console.error("Error updating project:", err);
    } finally {
      setSaving(false);
    }
  };

  const inputCls = (hasError) =>
    `w-full px-4 py-2.5 border rounded-xl text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent transition bg-gray-50 ${
      hasError ? 'border-red-400' : 'border-gray-200'
    }`;

  if (saving) return <FullPageLoader text={lang === 'ar' ? 'جاري المعالجة...' : 'Processing...'} />;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999] p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">

        {/* ── Header ── */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-green-100 flex items-center justify-center">
              <span className="text-green-600 font-semibold text-sm">
                {(lang === 'ar' ? project.nameAr : project.nameEn)?.charAt(0).toUpperCase()}
              </span>
            </div>
            <div>
              <h3 className="text-base font-semibold text-gray-900">
                {lang === 'ar' ? 'تعديل المشروع' : 'Edit Project'}
              </h3>
              <p className="text-xs text-gray-400">{project.code}</p>
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
                onChange={e => setFormData({ ...formData, nameAr: e.target.value })}
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
                onChange={e => setFormData({ ...formData, nameEn: e.target.value })}
                className={inputCls(errors.nameEn)}
                disabled={saving}
              />
              {errors.nameEn && <p className="mt-1 text-xs text-red-500">{errors.nameEn}</p>}
            </div>
          </div>

          {/* Manager + Engineer */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {lang === 'ar' ? 'مدير المشروع' : 'Project Manager'}
              </label>
              <input
                type="text"
                value={formData.projectManager}
                onChange={e => setFormData({ ...formData, projectManager: e.target.value })}
                className={inputCls(false)}
                disabled={saving}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {lang === 'ar' ? 'مهندس الموقع' : 'Site Engineer'}
              </label>
              <input
                type="text"
                value={formData.siteEngineer}
                onChange={e => setFormData({ ...formData, siteEngineer: e.target.value })}
                className={inputCls(false)}
                disabled={saving}
              />
            </div>
          </div>

          {/* Status */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {lang === 'ar' ? 'الحالة' : 'Status'}
            </label>
            <select
              value={formData.status}
              onChange={e => setFormData({ ...formData, status: e.target.value })}
              className={inputCls(false)}
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

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {lang === 'ar' ? 'ملاحظات' : 'Notes'}
            </label>
            <textarea
              value={formData.notes}
              onChange={e => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
              dir={lang === 'ar' ? 'rtl' : 'ltr'}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent transition bg-gray-50 resize-none"
              disabled={saving}
            />
          </div>

          {/* Info note */}
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-3">
            <p className="text-xs text-blue-700">
              <strong>{lang === 'ar' ? 'ملاحظة: ' : 'Note: '}</strong>
              {lang === 'ar'
                ? 'لإضافة تكاليف المعدات والعمالة والنثريات، يرجى الذهاب إلى صفحة تفاصيل المشروع.'
                : 'To add equipment, labor, and miscellaneous costs, please go to the project details page.'}
            </p>
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
            className="flex-1 px-4 py-2.5 bg-green-600 text-white rounded-xl hover:bg-green-700 transition font-medium text-sm disabled:opacity-50"
          >
            {lang === 'ar' ? 'حفظ التعديلات' : 'Save Changes'}
          </button>
        </div>

      </div>
    </div>
  );
}