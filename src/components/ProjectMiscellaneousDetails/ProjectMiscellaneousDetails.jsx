import { useState, useEffect, useContext, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { 
  X, 
  Calendar, 
  Download, 
  Plus, 
  Edit2, 
  Trash2,
  ArrowLeft,
  Receipt,
  DollarSign,
  Tag,
  CheckCircle,
  AlertCircle,
  FileText
} from "lucide-react";
import { formatCurrency, formatDateShort } from "../../utils/dateFormat";
import axiosInstance from "../../utils/axiosInstance";
import { LanguageContext } from "../../context/LanguageContext";
import FullPageLoader from "../Loader/Loader";
import jsPDF from "jspdf";
import autoTable from 'jspdf-autotable';
import { toast } from "react-toastify";
import { exportToPDF } from "../../utils/pdfExport";

export default function ProjectMiscellaneousDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { lang, t } = useContext(LanguageContext);
  
  const [project, setProject] = useState(null);
  const [miscellaneousRecords, setMiscellaneousRecords] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedMiscellaneous, setSelectedMiscellaneous] = useState(null);

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      const projectRes = await axiosInstance.get(`/projects/${id}`);
      setProject(projectRes.data.result);
      
      const miscRes = await axiosInstance.get(`/projects/${id}/miscellaneous`);
      const records = miscRes.data.result || [];
      setMiscellaneousRecords(records);
      
      const categoriesRes = await axiosInstance.get(`/projects/${id}/miscellaneous/categories`);
      setCategories(categoriesRes.data.result || []);
      
      if (records.length > 0) {
        const dates = records.map(r => new Date(r.date));
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

  const handleDelete = async (miscId) => {
    try {
      await axiosInstance.delete(`/projects/${id}/miscellaneous/${miscId}`);
      toast.success(lang === 'ar' ? 'تم الحذف بنجاح' : 'Deleted successfully');
      fetchData();
      setShowDeleteModal(false);
    } catch (error) {
      console.error('Error deleting miscellaneous:', error);
      toast.error(lang === 'ar' ? 'فشل الحذف' : 'Failed to delete');
    }
  };

  const filteredRecords = useMemo(() => {
    return miscellaneousRecords.filter(record => {
      const recordDate = new Date(record.date);
      const from = dateFrom ? new Date(dateFrom) : null;
      const to = dateTo ? new Date(dateTo + 'T23:59:59') : null;
      if (from && recordDate < from) return false;
      if (to && recordDate > to) return false;
      if (selectedCategory && record.category !== selectedCategory) return false;
      return true;
    });
  }, [miscellaneousRecords, dateFrom, dateTo, selectedCategory]);

  const totalRecords = filteredRecords.length;
  const totalAmount = filteredRecords.reduce((sum, r) => sum + (r.amount || 0), 0);

  const categoryTotals = useMemo(() => {
    const totals = {};
    filteredRecords.forEach(record => {
      const cat = record.category || (lang === 'ar' ? 'غير مصنف' : 'Uncategorized');
      if (!totals[cat]) totals[cat] = 0;
      totals[cat] += record.amount;
    });
    return totals;
  }, [filteredRecords, lang]);

  const handleExportPDF = async () => {
    try {
      const data = filteredRecords.map(record => ({
        date: formatDateShort(record.date, lang),
        category: record.category || (lang === 'ar' ? 'غير مصنف' : 'Uncategorized'),
        description: record.description,
        amount: formatCurrency(record.amount, lang),
        notes: record.notes || '-'
      }));

      data.push({
        date: lang === 'ar' ? 'الإجمالي' : 'Total',
        category: '',
        description: '',
        amount: formatCurrency(totalAmount, lang),
        notes: ''
      });

      const headers = [
        { date: lang === "ar" ? "التاريخ" : "Date" },
        { category: lang === "ar" ? "الفئة" : "Category" },
        { description: lang === "ar" ? "الوصف" : "Description" },
        { amount: lang === "ar" ? "المبلغ" : "Amount" },
        { notes: lang === "ar" ? "ملاحظات" : "Notes" }
      ];

      const title = lang === 'ar' ? 'النثريات والمصروفات الأخرى - المشروع' : 'Miscellaneous Expenses - Project';
      const fileName = `miscellaneous_details_${project.code}`;
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
              <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center text-white text-2xl font-bold shadow-lg">
                <Receipt className="w-8 h-8" />
              </div>
              
              <div>
                <h3 className="text-2xl font-bold text-gray-900 mb-1">
                  {lang === "ar" ? "النثريات والمصروفات الأخرى" : "Miscellaneous Expenses"}
                </h3>
                <p className="text-sm text-gray-500 mb-3">
                  {lang === "ar" ? "المشروع:" : "Project:"} {lang === "ar" ? project.nameAr : project.nameEn}
                </p>
                
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-white border-2 border-gray-200 rounded-lg shadow-sm">
                  <span className="text-xs font-medium text-gray-600">
                    {lang === "ar" ? "إجمالي المصروفات" : "Total Expenses"}
                  </span>
                  <span className="text-xl font-bold text-purple-600">
                    {formatCurrency(totalAmount, lang)}
                  </span>
                </div>
              </div>
            </div>
            
            <button
              onClick={() => !isLocked && setShowAddModal(true)}
              disabled={isLocked}
              title={isLocked ? (lang === "ar" ? "المشروع مكتمل — لا يمكن الإضافة" : "Project completed — cannot add") : undefined}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition font-semibold disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Plus size={20} />
              {lang === 'ar' ? 'إضافة مصروف' : 'Add Expense'}
            </button>
          </div>

          {/* ── Locked Banner ── */}
          {isLocked && (
            <div className="flex items-center gap-2 px-6 py-3 bg-yellow-50 border-b border-yellow-200 text-yellow-800 text-sm font-medium">
              <AlertCircle size={16} className="shrink-0" />
              {lang === "ar"
                ? "هذا المشروع مكتمل — لا يمكن إضافة أو تعديل أو حذف المصروفات"
                : "This project is completed — adding, editing, or deleting expenses is not allowed"}
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

              <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-lg border border-gray-300">
                <Tag size={18} className="text-gray-400" />
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="text-sm outline-none border-none bg-transparent"
                >
                  <option value="">{lang === 'ar' ? 'كل الفئات' : 'All Categories'}</option>
                  {categories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
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

          {/* Category Summary */}
          {Object.keys(categoryTotals).length > 0 && (
            <div className="p-4 bg-gradient-to-br from-purple-50 to-purple-100 border-b">
              <h4 className="text-sm font-semibold text-gray-700 mb-3">
                {lang === 'ar' ? 'ملخص حسب الفئة' : 'Summary by Category'}
              </h4>
              <div className="flex flex-wrap gap-3">
                {Object.entries(categoryTotals).map(([category, total]) => (
                  <div 
                    key={category}
                    className="flex items-center gap-2 px-3 py-2 bg-white rounded-lg border border-purple-200 shadow-sm"
                  >
                    <Tag size={14} className="text-purple-600" />
                    <span className="text-sm font-medium text-gray-700">{category}:</span>
                    <span className="text-sm font-bold text-purple-600">
                      {formatCurrency(total, lang)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Table */}
          <div className="overflow-auto max-h-[600px]">
            {filteredRecords.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Receipt size={32} className="text-gray-400" />
                </div>
                <p className="text-gray-500 text-lg font-medium">
                  {lang === "ar" ? "لا توجد سجلات مصروفات" : "No expense records found"}
                </p>
              </div>
            ) : (
              <table className="w-full">
                <thead className="bg-gray-50 sticky top-0 z-10">
                  <tr className="border-b border-gray-200">
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      {lang === "ar" ? "التاريخ" : "Date"}
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      {lang === "ar" ? "الفئة" : "Category"}
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      {lang === "ar" ? "الوصف" : "Description"}
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      {lang === "ar" ? "المبلغ" : "Amount"}
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      {lang === "ar" ? "ملاحظات" : "Notes"}
                    </th>
                    <th className="px-6 py-4 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      {lang === "ar" ? "إجراءات" : "Actions"}
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredRecords.map((record) => (
                    <tr key={record._id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <Calendar size={16} className="text-gray-400" />
                          <span className="text-sm font-medium text-gray-900">
                            {formatDateShort(record.date, lang)}
                          </span>
                        </div>
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap">
                        {record.category ? (
                          <span className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-xs font-semibold flex items-center gap-1 w-fit">
                            <Tag size={12} />
                            {record.category}
                          </span>
                        ) : (
                          <span className="text-sm text-gray-400">
                            {lang === 'ar' ? 'غير مصنف' : 'Uncategorized'}
                          </span>
                        )}
                      </td>

                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900">
                          {record.description}
                        </div>
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <span className="text-sm font-bold text-purple-600">
                          {formatCurrency(record.amount, lang)}
                        </span>
                      </td>

                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-600 max-w-xs">
                          {record.notes || <span className="text-gray-400">—</span>}
                        </div>
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => { if (!isLocked) { setSelectedMiscellaneous(record); setShowEditModal(true); } }}
                            disabled={isLocked}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition disabled:opacity-30 disabled:cursor-not-allowed"
                            title={isLocked ? (lang === "ar" ? "المشروع مكتمل" : "Project completed") : (lang === 'ar' ? 'تعديل' : 'Edit')}
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            onClick={() => { if (!isLocked) { setSelectedMiscellaneous(record); setShowDeleteModal(true); } }}
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

          {/* Footer */}
          <div className="border-t bg-gray-50">
            <div className="px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-8">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">
                      {lang === "ar" ? "عدد المصروفات" : "Total Records"}
                    </p>
                    <p className="text-lg font-bold text-gray-900">{totalRecords}</p>
                  </div>

                  <div className="h-12 w-px bg-gray-300"></div>

                  <div>
                    <p className="text-xs text-gray-500 mb-1">
                      {lang === "ar" ? "عدد الفئات" : "Categories"}
                    </p>
                    <p className="text-lg font-bold text-gray-900">
                      {Object.keys(categoryTotals).length}
                    </p>
                  </div>

                  <div className="h-12 w-px bg-gray-300"></div>

                  <div>
                    <p className="text-xs text-gray-500 mb-1">
                      {lang === "ar" ? "الإجمالي الكلي" : "Grand Total"}
                    </p>
                    <p className="text-lg font-bold text-purple-600">
                      {formatCurrency(totalAmount, lang)}
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

      {/* Delete Modal */}
      {showDeleteModal && selectedMiscellaneous && (
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
                  {lang === 'ar' ? 'هل أنت متأكد من حذف هذا المصروف؟' : 'Are you sure you want to delete this expense?'}
                </p>
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-4 mb-4">
              <p className="text-sm text-gray-600 mb-1">{lang === 'ar' ? 'الوصف:' : 'Description:'}</p>
              <p className="font-semibold text-gray-900">{selectedMiscellaneous.description}</p>
              <p className="text-sm text-purple-600 mt-2 font-bold">
                {formatCurrency(selectedMiscellaneous.amount, lang)}
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => { setShowDeleteModal(false); setSelectedMiscellaneous(null); }}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition font-semibold"
              >
                {lang === 'ar' ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                onClick={() => handleDelete(selectedMiscellaneous._id)}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition font-semibold"
              >
                {lang === 'ar' ? 'حذف' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showAddModal && (
        <AddMiscellaneousModal
          projectId={id}
          onClose={() => setShowAddModal(false)}
          onSuccess={() => { fetchData(); setShowAddModal(false); }}
        />
      )}
      {showEditModal && selectedMiscellaneous && (
        <EditMiscellaneousModal 
          projectId={id} 
          miscellaneous={selectedMiscellaneous}
          onClose={() => { setShowEditModal(false); setSelectedMiscellaneous(null); }} 
          onSuccess={() => { fetchData(); setShowEditModal(false); setSelectedMiscellaneous(null); }} 
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// Add Miscellaneous Modal
// ─────────────────────────────────────────────
function AddMiscellaneousModal({ projectId, onClose, onSuccess }) {
  const { lang } = useContext(LanguageContext);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    description: "",
    category: "",
    amount: "",
    notes: ""
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await axiosInstance.post(`/projects/${projectId}/miscellaneous`, {
        ...formData,
        amount: parseFloat(formData.amount)
      });
      toast.success(lang === 'ar' ? 'تمت الإضافة بنجاح' : 'Added successfully');
      onSuccess();
    } catch (error) {
      console.error('Error adding miscellaneous:', error);
      toast.error(lang === 'ar' ? 'فشل الإضافة' : 'Failed to add');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-gradient-to-r from-purple-600 to-purple-700 px-6 py-4 flex justify-between items-center">
          <h3 className="text-xl font-bold text-white">
            {lang === 'ar' ? 'إضافة مصروف جديد' : 'Add New Expense'}
          </h3>
          <button onClick={onClose} className="text-white/70 hover:text-white">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                {lang === 'ar' ? 'التاريخ' : 'Date'} <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={formData.date}
                onChange={e => setFormData({...formData, date: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                {lang === 'ar' ? 'المبلغ' : 'Amount'} <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                value={formData.amount}
                onChange={e => setFormData({...formData, amount: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                required
                min="0"
                step="0.01"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              {lang === 'ar' ? 'الوصف' : 'Description'} <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.description}
              onChange={e => setFormData({...formData, description: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              required
              dir={lang === 'ar' ? 'rtl' : 'ltr'}
              placeholder={lang === 'ar' ? 'مثال: شاي وقهوة للعمال' : 'e.g., Tea and coffee for workers'}
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              {lang === 'ar' ? 'الفئة' : 'Category'}
            </label>
            <input
              type="text"
              value={formData.category}
              onChange={e => setFormData({...formData, category: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              dir={lang === 'ar' ? 'rtl' : 'ltr'}
              placeholder={lang === 'ar' ? 'مثال: ضيافة' : 'e.g., Hospitality'}
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              {lang === 'ar' ? 'ملاحظات' : 'Notes'}
            </label>
            <textarea
              value={formData.notes}
              onChange={e => setFormData({...formData, notes: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              rows={3}
              dir={lang === 'ar' ? 'rtl' : 'ltr'}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button type="button" onClick={onClose} disabled={saving}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition font-semibold">
              {lang === 'ar' ? 'إلغاء' : 'Cancel'}
            </button>
            <button type="submit" disabled={saving}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition font-semibold disabled:opacity-50">
              {saving ? (lang === 'ar' ? 'جاري الحفظ...' : 'Saving...') : (lang === 'ar' ? 'حفظ' : 'Save')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Edit Miscellaneous Modal
// ─────────────────────────────────────────────
function EditMiscellaneousModal({ projectId, miscellaneous, onClose, onSuccess }) {
  const { lang } = useContext(LanguageContext);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    date: miscellaneous.date ? miscellaneous.date.split('T')[0] : "",
    description: miscellaneous.description || "",
    category: miscellaneous.category || "",
    amount: miscellaneous.amount || "",
    notes: miscellaneous.notes || ""
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await axiosInstance.put(`/projects/${projectId}/miscellaneous/${miscellaneous._id}`, {
        ...formData,
        amount: parseFloat(formData.amount)
      });
      toast.success(lang === 'ar' ? 'تم التحديث بنجاح' : 'Updated successfully');
      onSuccess();
    } catch (error) {
      console.error('Error updating miscellaneous:', error);
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
            {lang === 'ar' ? 'تعديل المصروف' : 'Edit Expense'}
          </h3>
          <button onClick={onClose} className="text-white/70 hover:text-white">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                {lang === 'ar' ? 'التاريخ' : 'Date'} <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={formData.date}
                onChange={e => setFormData({...formData, date: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                {lang === 'ar' ? 'المبلغ' : 'Amount'} <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                value={formData.amount}
                onChange={e => setFormData({...formData, amount: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
                min="0"
                step="0.01"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              {lang === 'ar' ? 'الوصف' : 'Description'} <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.description}
              onChange={e => setFormData({...formData, description: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
              dir={lang === 'ar' ? 'rtl' : 'ltr'}
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              {lang === 'ar' ? 'الفئة' : 'Category'}
            </label>
            <input
              type="text"
              value={formData.category}
              onChange={e => setFormData({...formData, category: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              dir={lang === 'ar' ? 'rtl' : 'ltr'}
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              {lang === 'ar' ? 'ملاحظات' : 'Notes'}
            </label>
            <textarea
              value={formData.notes}
              onChange={e => setFormData({...formData, notes: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={3}
              dir={lang === 'ar' ? 'rtl' : 'ltr'}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button type="button" onClick={onClose} disabled={saving}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition font-semibold">
              {lang === 'ar' ? 'إلغاء' : 'Cancel'}
            </button>
            <button type="submit" disabled={saving}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-semibold disabled:opacity-50">
              {saving ? (lang === 'ar' ? 'جاري الحفظ...' : 'Saving...') : (lang === 'ar' ? 'حفظ التعديلات' : 'Save Changes')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}