import { useState, useEffect, useContext, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { 
  X, 
  User, 
  Calendar, 
  Download, 
  Plus, 
  Edit2, 
  Trash2,
  ArrowLeft,
  Users,
  DollarSign,
  Briefcase,
  CheckCircle,
  AlertCircle
} from "lucide-react";
import { formatCurrency, formatDateShort } from "../../utils/dateFormat";
import axiosInstance from "../../utils/axiosInstance";
import { LanguageContext } from "../../context/LanguageContext";
import FullPageLoader from "../Loader/Loader";
import { exportToPDF } from "../../utils/pdfExport";
import { toast } from "react-toastify";


export default function ProjectLaborDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { lang, t } = useContext(LanguageContext);
  
  const [project, setProject] = useState(null);
  const [laborRecords, setLaborRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedLabor, setSelectedLabor] = useState(null);

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      const projectRes = await axiosInstance.get(`/projects/${id}`);
      setProject(projectRes.data.result);
      
      const laborRes = await axiosInstance.get(`/projects/${id}/labor`);
      const records = laborRes.data.result || [];
      
      setLaborRecords(records);
      
      if (records.length > 0) {
        const dates = records.map(r => new Date(r.startDate));
        const minDate = new Date(Math.min(...dates));
        const maxDate = new Date(Math.max(...dates));
        setDateFrom(minDate.toISOString().split('T')[0]);
        setDateTo(maxDate.toISOString().split('T')[0]);
      }
      
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error(lang === 'ar' ? 'فشل تحميل البيانات' : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  // ─── Project Locked ──────────────────────────
  const isLocked = project?.status === "COMPLETED";

  const handleDelete = async (laborId) => {
    try {
      await axiosInstance.delete(`/projects/${id}/labor/${laborId}`);
      toast.success(lang === 'ar' ? 'تم الحذف بنجاح' : 'Deleted successfully');
      fetchData();
      setShowDeleteModal(false);
    } catch (error) {
      console.error('Error deleting labor:', error);
      toast.error(lang === 'ar' ? 'فشل الحذف' : 'Failed to delete');
    }
  };

  const filteredRecords = useMemo(() => {
    return laborRecords.filter(record => {
      const recordDate = new Date(record.startDate);
      const from = dateFrom ? new Date(dateFrom) : null;
      const to = dateTo ? new Date(dateTo + 'T23:59:59') : null;
      if (from && recordDate < from) return false;
      if (to && recordDate > to) return false;
      return true;
    });
  }, [laborRecords, dateFrom, dateTo]);

  const totalWorkers = filteredRecords.length;
  const totalLaborCost = filteredRecords.reduce((sum, r) => sum + (r.laborCost || 0), 0);
  const totalMaterialCost = filteredRecords.reduce((sum, r) => sum + (r.materialCost || 0), 0);
  const totalCost = filteredRecords.reduce((sum, r) => sum + (r.totalCost || 0), 0);

  const handleExportPDF = async () => {
    try {
      const data = filteredRecords.map(record => ({
        workerName: record.workerName,
        specialty: record.specialty,
        task: record.taskDescription || "-",
        days: record.numberOfDays,
        dailyRate: formatCurrency(record.dailyRate, lang),
        laborCost: formatCurrency(record.laborCost, lang),
        materialCost: record.materialCost > 0 ? formatCurrency(record.materialCost, lang) : "-",
        total: formatCurrency(record.totalCost, lang),
        date: formatDateShort(record.startDate, lang)
      }));

      data.push({
        workerName: lang === 'ar' ? 'الإجمالي' : 'Total',
        specialty: '',
        task: '',
        days: '',
        dailyRate: '',
        laborCost: formatCurrency(totalLaborCost, lang),
        materialCost: formatCurrency(totalMaterialCost, lang),
        total: formatCurrency(totalCost, lang),
        date: ''
      });

      const headers = [
        { workerName: lang === "ar" ? "اسم العامل" : "Worker Name" },
        { specialty: lang === "ar" ? "التخصص" : "Specialty" },
        { task: lang === "ar" ? "الوصف" : "Description" },
        { days: lang === "ar" ? "الأيام" : "Days" },
        { dailyRate: lang === "ar" ? "الأجر اليومي" : "Daily Rate" },
        { laborCost: lang === "ar" ? "تكلفة العمل" : "Labor Cost" },
        { materialCost: lang === "ar" ? "تكلفة المواد" : "Material Cost" },
        { total: lang === "ar" ? "الإجمالي" : "Total" },
        { date: lang === "ar" ? "التاريخ" : "Date" }
      ];

      const title = lang === 'ar' ? 'تفاصيل العمالة - المشروع' : 'Labor Details - Project';
      const fileName = `labor_details_${project.code}`;
      const projectInfo = {
        name: lang === 'ar' ? project.nameAr : project.nameEn,
        code: project.code
      };

      await exportToPDF(data, headers, fileName, lang, title, projectInfo);
      toast.success(lang === "ar" ? "تم تصدير PDF بنجاح" : "PDF exported successfully");

    } catch (error) {
      console.error("Error generating PDF:", error);
      toast.error(lang === "ar" ? "حدث خطأ أثناء تصدير PDF" : "Error exporting PDF");
    }
  };

  if (loading) {
    return <FullPageLoader text={lang === 'ar' ? 'جاري التحميل...' : 'Loading...'} />;
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-8 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <AlertCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900">
            {lang === 'ar' ? 'المشروع غير موجود' : 'Project Not Found'}
          </h3>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-8 px-4">
      <div className="max-w-[1400px] mx-auto">
        {/* Back Button */}
        <button
          onClick={() => navigate(`/projects/${id}`)}
          className="flex items-center gap-2 text-green-600 hover:text-green-700 font-semibold mb-6"
        >
          <ArrowLeft className="w-5 h-5" />
          {lang === 'ar' ? 'رجوع لتفاصيل المشروع' : 'Back to Project Details'}
        </button>

        <div className="bg-white rounded-xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="flex justify-between items-start p-6 border-b bg-gradient-to-br from-slate-50 to-slate-100">
            <div className="flex items-start gap-4">
              <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center text-white text-2xl font-bold shadow-lg">
                <Users className="w-8 h-8" />
              </div>
              
              <div>
                <h3 className="text-2xl font-bold text-gray-900 mb-1">
                  {lang === "ar" ? "تفاصيل العمالة" : "Labor Details"}
                </h3>
                <p className="text-sm text-gray-500 mb-3">
                  {lang === "ar" ? "المشروع:" : "Project:"} {lang === "ar" ? project.nameAr : project.nameEn}
                </p>
                
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-white border-2 border-gray-200 rounded-lg shadow-sm">
                  <span className="text-xs font-medium text-gray-600">
                    {lang === "ar" ? "إجمالي التكاليف" : "Total Cost"}
                  </span>
                  <span className="text-xl font-bold text-green-600">
                    {formatCurrency(totalCost, lang)}
                  </span>
                </div>
              </div>
            </div>
            
            <button
              onClick={() => !isLocked && setShowAddModal(true)}
              disabled={isLocked}
              title={isLocked ? (lang === "ar" ? "المشروع مكتمل — لا يمكن الإضافة" : "Project completed — cannot add") : undefined}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition font-semibold disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Plus size={20} />
              {lang === 'ar' ? 'إضافة عامل' : 'Add Worker'}
            </button>
          </div>

          {/* ── Locked Banner ── */}
          {isLocked && (
            <div className="flex items-center gap-2 px-6 py-3 bg-yellow-50 border-b border-yellow-200 text-yellow-800 text-sm font-medium">
              <AlertCircle size={16} className="shrink-0" />
              {lang === "ar"
                ? "هذا المشروع مكتمل — لا يمكن إضافة أو تعديل أو حذف السجلات"
                : "This project is completed — adding, editing, or deleting records is not allowed"}
            </div>
          )}

          {/* Filters & Actions Bar */}
          <div className="flex items-center justify-between gap-4 p-4 bg-gray-50 border-b">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-lg border border-gray-300">
                <Calendar size={18} className="text-gray-400" />
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="text-sm outline-none border-none bg-transparent"
                />
              </div>
              
              <span className="text-gray-400">—</span>
              
              <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-lg border border-gray-300">
                <Calendar size={18} className="text-gray-400" />
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="text-sm outline-none border-none bg-transparent"
                />
              </div>
            </div>

            <button
              onClick={handleExportPDF}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium text-sm"
            >
              <Download size={18} />
              {lang === "ar" ? "تصدير PDF" : "Export PDF"}
            </button>
          </div>

          {/* Table Content */}
          <div className="overflow-auto max-h-[600px]">
            {filteredRecords.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Users size={32} className="text-gray-400" />
                </div>
                <p className="text-gray-500 text-lg font-medium">
                  {lang === "ar" ? "لا توجد سجلات عمالة" : "No labor records found"}
                </p>
              </div>
            ) : (
              <table className="w-full">
                <thead className="bg-gray-50 sticky top-0 z-10">
                  <tr className="border-b border-gray-200">
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      {lang === "ar" ? "اسم العامل" : "Worker Name"}
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      {lang === "ar" ? "التخصص" : "Specialty"}
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      {lang === "ar" ? "الوصف" : "Task"}
                    </th>
                    <th className="px-6 py-4 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      {lang === "ar" ? "الأيام" : "Days"}
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      {lang === "ar" ? "الأجر اليومي" : "Daily Rate"}
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      {lang === "ar" ? "تكلفة العمل" : "Labor Cost"}
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      {lang === "ar" ? "تكلفة المواد" : "Material Cost"}
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      {lang === "ar" ? "الإجمالي" : "Total"}
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      {lang === "ar" ? "التاريخ" : "Date"}
                    </th>
                    <th className="px-6 py-4 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      {lang === "ar" ? "إجراءات" : "Actions"}
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredRecords.map((record) => (
                    <tr key={record._id} className="hover:bg-gray-50 transition-colors">
                      {/* Worker Name */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                            <User size={16} className="text-green-600" />
                          </div>
                          <span className="text-sm font-medium text-gray-900">
                            {record.workerName}
                          </span>
                        </div>
                      </td>

                      {/* Specialty */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <Briefcase size={14} className="text-gray-400" />
                          <span className="text-sm text-gray-700">
                            {record.specialty}
                          </span>
                        </div>
                      </td>

                      {/* Task Description */}
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-600 max-w-xs truncate">
                          {record.taskDescription || "-"}
                        </div>
                        {record.notes && (
                          <div className="text-xs text-gray-400 mt-1">
                            {record.notes}
                          </div>
                        )}
                      </td>

                      {/* Days */}
                      <td className="px-6 py-4 text-center">
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm font-semibold">
                          {record.numberOfDays}
                        </span>
                      </td>

                      {/* Daily Rate */}
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <span className="text-sm font-medium text-gray-900">
                          {formatCurrency(record.dailyRate, lang)}
                        </span>
                      </td>

                      {/* Labor Cost */}
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <span className="text-sm font-semibold text-green-600">
                          {formatCurrency(record.laborCost, lang)}
                        </span>
                      </td>

                      {/* Material Cost */}
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        {record.materialCost > 0 ? (
                          <span className="text-sm font-semibold text-orange-600">
                            {formatCurrency(record.materialCost, lang)}
                          </span>
                        ) : (
                          <span className="text-sm text-gray-400">—</span>
                        )}
                      </td>

                      {/* Total Cost */}
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <span className="text-sm font-bold text-gray-900">
                          {formatCurrency(record.totalCost, lang)}
                        </span>
                      </td>

                      {/* Date */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-700">
                          {formatDateShort(record.startDate, lang)}
                        </div>
                        {record.endDate && (
                          <div className="text-xs text-gray-400">
                            {lang === 'ar' ? 'إلى' : 'to'} {formatDateShort(record.endDate, lang)}
                          </div>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => { if (!isLocked) { setSelectedLabor(record); setShowEditModal(true); } }}
                            disabled={isLocked}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition disabled:opacity-30 disabled:cursor-not-allowed"
                            title={isLocked ? (lang === "ar" ? "المشروع مكتمل" : "Project completed") : (lang === 'ar' ? 'تعديل' : 'Edit')}
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            onClick={() => { if (!isLocked) { setSelectedLabor(record); setShowDeleteModal(true); } }}
                            disabled={isLocked}
                            className="p-1.5 text-red-600 hover:bg-red-50 rounded transition disabled:opacity-30 disabled:cursor-not-allowed"
                            title={isLocked ? (lang === "ar" ? "المشروع مكتمل" : "Project completed") : (lang === 'ar' ? 'حذف' : 'Delete')}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Footer Summary */}
          <div className="border-t bg-gray-50">
            <div className="px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-8">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">
                      {lang === "ar" ? "عدد العمال" : "Total Workers"}
                    </p>
                    <p className="text-lg font-bold text-gray-900">
                      {totalWorkers}
                    </p>
                  </div>

                  <div className="h-12 w-px bg-gray-300"></div>

                  <div>
                    <p className="text-xs text-gray-500 mb-1">
                      {lang === "ar" ? "تكلفة العمل" : "Labor Cost"}
                    </p>
                    <p className="text-lg font-bold text-green-600">
                      {formatCurrency(totalLaborCost, lang)}
                    </p>
                  </div>

                  {totalMaterialCost > 0 && (
                    <>
                      <div className="h-12 w-px bg-gray-300"></div>
                      <div>
                        <p className="text-xs text-gray-500 mb-1">
                          {lang === "ar" ? "تكلفة المواد" : "Material Cost"}
                        </p>
                        <p className="text-lg font-bold text-orange-600">
                          {formatCurrency(totalMaterialCost, lang)}
                        </p>
                      </div>
                    </>
                  )}

                  <div className="h-12 w-px bg-gray-300"></div>

                  <div>
                    <p className="text-xs text-gray-500 mb-1">
                      {lang === "ar" ? "الإجمالي الكلي" : "Grand Total"}
                    </p>
                    <p className="text-lg font-bold text-gray-900">
                      {formatCurrency(totalCost, lang)}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => navigate(`/projects/${id}`)}
                  className="px-6 py-2.5 border border-gray-300 rounded-lg bg-white hover:bg-gray-100 transition-colors font-medium text-sm"
                >
                  {lang === "ar" ? "رجوع" : "Back"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && selectedLabor && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                <Trash2 className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">
                  {lang === 'ar' ? 'تأكيد الحذف' : 'Confirm Delete'}
                </h3>
                <p className="text-sm text-gray-500">
                  {lang === 'ar' ? 'هل أنت متأكد من حذف هذا السجل؟' : 'Are you sure you want to delete this record?'}
                </p>
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-4 mb-4">
              <p className="text-sm text-gray-600 mb-1">{lang === 'ar' ? 'العامل:' : 'Worker:'}</p>
              <p className="font-semibold text-gray-900">{selectedLabor.workerName}</p>
              <p className="text-sm text-gray-500 mt-1">{selectedLabor.specialty}</p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setSelectedLabor(null);
                }}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition font-semibold"
              >
                {lang === 'ar' ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                onClick={() => handleDelete(selectedLabor._id)}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition font-semibold"
              >
                {lang === 'ar' ? 'حذف' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Modal */}
      {showAddModal && (
        <AddLaborModal
          projectId={id}
          onClose={() => setShowAddModal(false)}
          onSuccess={() => {
            fetchData();
            setShowAddModal(false);
          }}
        />
      )}

      {/* Edit Modal */}
      {showEditModal && selectedLabor && (
        <EditLaborModal
          projectId={id}
          labor={selectedLabor}
          onClose={() => {
            setShowEditModal(false);
            setSelectedLabor(null);
          }}
          onSuccess={() => {
            fetchData();
            setShowEditModal(false);
            setSelectedLabor(null);
          }}
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// Add Labor Modal
// ─────────────────────────────────────────────
function AddLaborModal({ projectId, onClose, onSuccess }) {
  const { lang } = useContext(LanguageContext);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    workerName: "",
    specialty: "",
    taskDescription: "",
    numberOfDays: "",
    dailyRate: "",
    materialCost: "",
    startDate: "",
    endDate: "",
    notes: ""
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      await axiosInstance.post(`/projects/${projectId}/labor`, {
        ...formData,
        numberOfDays: parseInt(formData.numberOfDays),
        dailyRate: parseFloat(formData.dailyRate),
        materialCost: formData.materialCost ? parseFloat(formData.materialCost) : 0
      });
      toast.success(lang === 'ar' ? 'تمت الإضافة بنجاح' : 'Added successfully');
      onSuccess();
    } catch (error) {
      console.error('Error adding labor:', error);
      toast.error(lang === 'ar' ? 'فشل الإضافة' : 'Failed to add');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-gradient-to-r from-green-600 to-green-700 px-6 py-4 flex justify-between items-center">
          <h3 className="text-xl font-bold text-white">
            {lang === 'ar' ? 'إضافة عامل جديد' : 'Add New Worker'}
          </h3>
          <button onClick={onClose} className="text-white/70 hover:text-white">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                {lang === 'ar' ? 'اسم العامل' : 'Worker Name'} <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.workerName}
                onChange={e => setFormData({...formData, workerName: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-green-500 focus:border-transparent"
                required
                dir={lang === 'ar' ? 'rtl' : 'ltr'}
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                {lang === 'ar' ? 'التخصص' : 'Specialty'} <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.specialty}
                onChange={e => setFormData({...formData, specialty: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-green-500 focus:border-transparent"
                required
                dir={lang === 'ar' ? 'rtl' : 'ltr'}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              {lang === 'ar' ? 'وصف المهمة' : 'Task Description'}
            </label>
            <textarea
              value={formData.taskDescription}
              onChange={e => setFormData({...formData, taskDescription: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-green-500 focus:border-transparent"
              rows={2}
              dir={lang === 'ar' ? 'rtl' : 'ltr'}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                {lang === 'ar' ? 'عدد الأيام' : 'Number of Days'} <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                value={formData.numberOfDays}
                onChange={e => setFormData({...formData, numberOfDays: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-green-500 focus:border-transparent"
                required
                min="1"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                {lang === 'ar' ? 'الأجر اليومي' : 'Daily Rate'} <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                value={formData.dailyRate}
                onChange={e => setFormData({...formData, dailyRate: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-green-500 focus:border-transparent"
                required
                min="0"
                step="0.01"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                {lang === 'ar' ? 'تكلفة المواد' : 'Material Cost'}
              </label>
              <input
                type="number"
                value={formData.materialCost}
                onChange={e => setFormData({...formData, materialCost: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-green-500 focus:border-transparent"
                min="0"
                step="0.01"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                {lang === 'ar' ? 'تاريخ البداية' : 'Start Date'} <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={formData.startDate}
                onChange={e => setFormData({...formData, startDate: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-green-500 focus:border-transparent"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                {lang === 'ar' ? 'تاريخ النهاية' : 'End Date'}
              </label>
              <input
                type="date"
                value={formData.endDate}
                onChange={e => setFormData({...formData, endDate: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              {lang === 'ar' ? 'ملاحظات' : 'Notes'}
            </label>
            <textarea
              value={formData.notes}
              onChange={e => setFormData({...formData, notes: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-green-500 focus:border-transparent"
              rows={2}
              dir={lang === 'ar' ? 'rtl' : 'ltr'}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition font-semibold"
              disabled={saving}
            >
              {lang === 'ar' ? 'إلغاء' : 'Cancel'}
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-semibold disabled:opacity-50"
              disabled={saving}
            >
              {saving ? (lang === 'ar' ? 'جاري الحفظ...' : 'Saving...') : (lang === 'ar' ? 'حفظ' : 'Save')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Edit Labor Modal
// ─────────────────────────────────────────────
function EditLaborModal({ projectId, labor, onClose, onSuccess }) {
  const { lang } = useContext(LanguageContext);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    workerName: labor.workerName || "",
    specialty: labor.specialty || "",
    taskDescription: labor.taskDescription || "",
    numberOfDays: labor.numberOfDays || "",
    dailyRate: labor.dailyRate || "",
    materialCost: labor.materialCost || "",
    startDate: labor.startDate ? labor.startDate.split('T')[0] : "",
    endDate: labor.endDate ? labor.endDate.split('T')[0] : "",
    notes: labor.notes || ""
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      await axiosInstance.put(`/projects/${projectId}/labor/${labor._id}`, {
        ...formData,
        numberOfDays: parseInt(formData.numberOfDays),
        dailyRate: parseFloat(formData.dailyRate),
        materialCost: formData.materialCost ? parseFloat(formData.materialCost) : 0
      });
      toast.success(lang === 'ar' ? 'تم التحديث بنجاح' : 'Updated successfully');
      onSuccess();
    } catch (error) {
      console.error('Error updating labor:', error);
      toast.error(lang === 'ar' ? 'فشل التحديث' : 'Failed to update');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4 flex justify-between items-center">
          <h3 className="text-xl font-bold text-white">
            {lang === 'ar' ? 'تعديل بيانات العامل' : 'Edit Worker Details'}
          </h3>
          <button onClick={onClose} className="text-white/70 hover:text-white">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                {lang === 'ar' ? 'اسم العامل' : 'Worker Name'} <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.workerName}
                onChange={e => setFormData({...formData, workerName: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
                dir={lang === 'ar' ? 'rtl' : 'ltr'}
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                {lang === 'ar' ? 'التخصص' : 'Specialty'} <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.specialty}
                onChange={e => setFormData({...formData, specialty: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
                dir={lang === 'ar' ? 'rtl' : 'ltr'}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              {lang === 'ar' ? 'وصف المهمة' : 'Task Description'}
            </label>
            <textarea
              value={formData.taskDescription}
              onChange={e => setFormData({...formData, taskDescription: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={2}
              dir={lang === 'ar' ? 'rtl' : 'ltr'}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                {lang === 'ar' ? 'عدد الأيام' : 'Number of Days'} <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                value={formData.numberOfDays}
                onChange={e => setFormData({...formData, numberOfDays: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
                min="1"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                {lang === 'ar' ? 'الأجر اليومي' : 'Daily Rate'} <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                value={formData.dailyRate}
                onChange={e => setFormData({...formData, dailyRate: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
                min="0"
                step="0.01"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                {lang === 'ar' ? 'تكلفة المواد' : 'Material Cost'}
              </label>
              <input
                type="number"
                value={formData.materialCost}
                onChange={e => setFormData({...formData, materialCost: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                min="0"
                step="0.01"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                {lang === 'ar' ? 'تاريخ البداية' : 'Start Date'} <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={formData.startDate}
                onChange={e => setFormData({...formData, startDate: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                {lang === 'ar' ? 'تاريخ النهاية' : 'End Date'}
              </label>
              <input
                type="date"
                value={formData.endDate}
                onChange={e => setFormData({...formData, endDate: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              {lang === 'ar' ? 'ملاحظات' : 'Notes'}
            </label>
            <textarea
              value={formData.notes}
              onChange={e => setFormData({...formData, notes: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={2}
              dir={lang === 'ar' ? 'rtl' : 'ltr'}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition font-semibold"
              disabled={saving}
            >
              {lang === 'ar' ? 'إلغاء' : 'Cancel'}
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-semibold disabled:opacity-50"
              disabled={saving}
            >
              {saving ? (lang === 'ar' ? 'جاري الحفظ...' : 'Saving...') : (lang === 'ar' ? 'حفظ التعديلات' : 'Save Changes')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}