import { useState, useEffect, useContext, useMemo, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  X,
  Download,
  Plus,
  Edit2,
  Trash2,
  ArrowLeft,
  AlertCircle,
  HardHat,
  Layers,
  Calendar,
} from "lucide-react";
import { formatCurrency, formatDateShort } from "../../utils/dateFormat";
import axiosInstance from "../../utils/axiosInstance";
import { LanguageContext } from "../../context/LanguageContext";
import FullPageLoader from "../Loader/Loader";
import { exportToPDF } from "../../utils/pdfExport";
import { toast } from "react-toastify";

const todayISO = () => new Date().toISOString().split("T")[0];

// ─────────────────────────────────────────────
// Field Component (خارج المودال لمنع إعادة الـ mount)
// ─────────────────────────────────────────────
function Field({ label, required, optional, lang, error, children }) {
  return (
    <div>
      <label className="block text-sm font-semibold text-gray-700 mb-1">
        {label}{" "}
        {required && <span className="text-red-500">*</span>}
        {optional && (
          <span className="text-gray-400 text-xs font-normal">
            ({lang === "ar" ? "اختياري" : "optional"})
          </span>
        )}
      </label>
      {children}
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
}

// ─────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────
export default function ProjectSubcontractorWork() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { lang } = useContext(LanguageContext);

  const [project, setProject] = useState(null);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);

  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Date filter
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  // ─── Fetch ───────────────────────────────────
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [projectRes, recordsRes] = await Promise.all([
        axiosInstance.get(`/projects/${id}`),
        axiosInstance.get(`/projects/${id}/subcontractor-work`),
      ]);
      setProject(projectRes.data.result);
      const data = recordsRes.data.result || [];
      setRecords(data);

      // Set date range from data
      if (data.length > 0) {
        const dates = data.map((r) => new Date(r.workDate));
        setDateFrom(new Date(Math.min(...dates)).toISOString().split("T")[0]);
        setDateTo(new Date(Math.max(...dates)).toISOString().split("T")[0]);
      }
    } catch {
      toast.error(lang === "ar" ? "فشل تحميل البيانات" : "Failed to load data");
    } finally {
      setLoading(false);
    }
  }, [id, lang]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ─── Project Locked ──────────────────────────
  const isLocked = project?.status === "COMPLETED";

  // ─── Filtered Records by Date ─────────────────
  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      const recordDate = new Date(r.workDate);
      const from = dateFrom ? new Date(dateFrom) : null;
      const to = dateTo ? new Date(dateTo + "T23:59:59") : null;
      if (from && recordDate < from) return false;
      if (to && recordDate > to) return false;
      return true;
    });
  }, [records, dateFrom, dateTo]);

  // ─── Aggregates ──────────────────────────────
  const totalAmount = useMemo(
    () => filteredRecords.reduce((sum, r) => sum + (r.totalAmount || 0), 0),
    [filteredRecords]
  );
  const totalQuantity = useMemo(
    () => filteredRecords.reduce((sum, r) => sum + (r.quantity || 0), 0),
    [filteredRecords]
  );

  // ─── Delete ──────────────────────────────────
  const handleDelete = async (recordId) => {
    setDeleting(true);
    try {
      await axiosInstance.delete(`/projects/${id}/subcontractor-work/${recordId}`);
      toast.success(lang === "ar" ? "تم الحذف بنجاح" : "Deleted successfully");
      await fetchData();
      setShowDeleteModal(false);
      setSelectedRecord(null);
    } catch (error) {
      const msg = error?.response?.data?.message;
      toast.error(msg || (lang === "ar" ? "فشل الحذف" : "Failed to delete"));
    } finally {
      setDeleting(false);
    }
  };

  // ─── Export PDF ──────────────────────────────
  const handleExportPDF = async () => {
    try {
      const data = filteredRecords.map((record) => ({
        workDate: record.workDate ? formatDateShort(record.workDate, lang) : "—",
        contractorName: record.contractorName,
        itemDescription: record.itemDescription,
        unit: record.unit || "—",
        quantity: record.quantity,
        unitPrice: formatCurrency(record.unitPrice, lang),
        totalAmount: formatCurrency(record.totalAmount, lang),
      }));

      data.push({
        workDate: "",
        contractorName: lang === "ar" ? "الإجمالي" : "Total",
        itemDescription: "",
        unit: "",
        quantity: totalQuantity,
        unitPrice: "",
        totalAmount: formatCurrency(totalAmount, lang),
      });

      const headers = [
        { workDate: lang === "ar" ? "التاريخ" : "Date" },
        { contractorName: lang === "ar" ? "اسم المقاول" : "Contractor Name" },
        { itemDescription: lang === "ar" ? "وصف البند" : "Item Description" },
        { unit: lang === "ar" ? "الوحدة" : "Unit" },
        { quantity: lang === "ar" ? "الكمية" : "Quantity" },
        { unitPrice: lang === "ar" ? "سعر الوحدة" : "Unit Price" },
        { totalAmount: lang === "ar" ? "الإجمالي" : "Total Amount" },
      ];

      await exportToPDF(
        data, headers,
        `subcontractor_work_${project.code}`,
        lang,
        lang === "ar" ? "أعمال المقاولين" : "Subcontractor Work",
        { name: lang === "ar" ? project.nameAr : project.nameEn, code: project.code }
      );
      toast.success(lang === "ar" ? "تم تصدير PDF بنجاح" : "PDF exported successfully");
    } catch {
      toast.error(lang === "ar" ? "حدث خطأ أثناء تصدير PDF" : "Error exporting PDF");
    }
  };

  // ─── Guards ──────────────────────────────────
  if (loading)
    return <FullPageLoader text={lang === "ar" ? "جاري التحميل..." : "Loading..."} />;

  if (!project)
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-8 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <AlertCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900">
            {lang === "ar" ? "المشروع غير موجود" : "Project Not Found"}
          </h3>
        </div>
      </div>
    );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-8 px-4">
      <div className="max-w-[1400px] mx-auto">
        {/* Back */}
        <button
          onClick={() => navigate(`/projects/${id}`)}
          className="flex items-center gap-2 text-green-600 hover:text-green-700 font-semibold mb-6"
        >
          <ArrowLeft className="w-5 h-5" />
          {lang === "ar" ? "رجوع لتفاصيل المشروع" : "Back to Project Details"}
        </button>

        <div className="bg-white rounded-xl shadow-2xl overflow-hidden">
          {/* ── Header ── */}
          <div className="flex justify-between items-start p-6 border-b bg-gradient-to-br from-slate-50 to-slate-100">
            <div className="flex items-start gap-4">
              <div className="w-16 h-16 bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl flex items-center justify-center text-white shadow-lg">
                <HardHat className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-gray-900 mb-1">
                  {lang === "ar" ? "أعمال المقاولين" : "Subcontractor Work"}
                </h3>
                <p className="text-sm text-gray-500 mb-3">
                  {lang === "ar" ? "المشروع:" : "Project:"}{" "}
                  {lang === "ar" ? project.nameAr : project.nameEn}
                </p>
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-white border-2 border-gray-200 rounded-lg shadow-sm">
                  <span className="text-xs font-medium text-gray-600">
                    {lang === "ar" ? "إجمالي التكاليف" : "Total Amount"}
                  </span>
                  <span className="text-xl font-bold text-amber-600">
                    {formatCurrency(totalAmount, lang)}
                  </span>
                </div>
              </div>
            </div>
            <button
              onClick={() => !isLocked && setShowAddModal(true)}
              disabled={isLocked}
              title={isLocked ? (lang === "ar" ? "المشروع مكتمل — لا يمكن الإضافة" : "Project completed — cannot add") : undefined}
              className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg transition font-semibold disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Plus size={20} />
              {lang === "ar" ? "إضافة بند" : "Add Item"}
            </button>
          </div>

          {/* ── Locked Banner ── */}
          {isLocked && (
            <div className="flex items-center gap-2 px-6 py-3 bg-yellow-50 border-b border-yellow-200 text-yellow-800 text-sm font-medium">
              <AlertCircle size={16} className="shrink-0" />
              {lang === "ar"
                ? "هذا المشروع مكتمل — لا يمكن إضافة أو تعديل أو حذف البنود"
                : "This project is completed — adding, editing, or deleting items is not allowed"}
            </div>
          )}

          {/* ── Filters & Actions Bar ── */}
          <div className="flex items-center justify-between gap-4 p-4 bg-gray-50 border-b flex-wrap">
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
              disabled={filteredRecords.length === 0}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium text-sm disabled:opacity-40"
            >
              <Download size={18} />
              {lang === "ar" ? "تصدير PDF" : "Export PDF"}
            </button>
          </div>

          {/* ── Table ── */}
          <div className="overflow-auto max-h-[600px]">
            {filteredRecords.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <HardHat size={32} className="text-gray-400" />
                </div>
                <p className="text-gray-500 text-lg font-medium">
                  {lang === "ar" ? "لا توجد أعمال مقاولين" : "No subcontractor work found"}
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
                      {lang === "ar" ? "اسم المقاول" : "Contractor Name"}
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      {lang === "ar" ? "وصف البند" : "Item Description"}
                    </th>
                    <th className="px-6 py-4 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      {lang === "ar" ? "الوحدة" : "Unit"}
                    </th>
                    <th className="px-6 py-4 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      {lang === "ar" ? "الكمية" : "Quantity"}
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      {lang === "ar" ? "سعر الوحدة" : "Unit Price"}
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      {lang === "ar" ? "الإجمالي" : "Total Amount"}
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

                      {/* Date */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-700">
                          {formatDateShort(record.workDate, lang)}
                        </div>
                      </td>

                      {/* Contractor Name */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <HardHat size={14} className="text-gray-400" />
                          <span className="text-sm font-medium text-gray-900">{record.contractorName}</span>
                        </div>
                      </td>

                      {/* Item Description */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2" title={record.itemDescription}>
                          <Layers size={14} className="text-gray-400 shrink-0" />
                          <span className="text-sm text-gray-700 max-w-xs truncate">{record.itemDescription}</span>
                        </div>
                      </td>

                      {/* Unit */}
                      <td className="px-6 py-4 text-center">
                        <span className="px-2 py-1 bg-slate-100 text-slate-700 rounded text-sm font-medium">
                          {record.unit || "—"}
                        </span>
                      </td>

                      {/* Quantity */}
                      <td className="px-6 py-4 text-center">
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm font-semibold">
                          {record.quantity?.toLocaleString()}
                        </span>
                      </td>

                      {/* Unit Price */}
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <span className="text-sm font-medium text-gray-900">
                          {formatCurrency(record.unitPrice, lang)}
                        </span>
                      </td>

                      {/* Total Amount */}
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <span className="text-sm font-bold text-amber-600">
                          {formatCurrency(record.totalAmount, lang)}
                        </span>
                      </td>

                      {/* Notes */}
                      <td className="px-6 py-4 max-w-[160px]">
                        <span className="text-xs text-gray-500 truncate block" title={record.notes}>
                          {record.notes || "—"}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => { if (!isLocked) { setSelectedRecord(record); setShowEditModal(true); } }}
                            disabled={isLocked}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition disabled:opacity-30 disabled:cursor-not-allowed"
                            title={isLocked ? (lang === "ar" ? "المشروع مكتمل" : "Project completed") : (lang === "ar" ? "تعديل" : "Edit")}
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            onClick={() => { if (!isLocked) { setSelectedRecord(record); setShowDeleteModal(true); } }}
                            disabled={isLocked}
                            className="p-1.5 text-red-600 hover:bg-red-50 rounded transition disabled:opacity-30 disabled:cursor-not-allowed"
                            title={isLocked ? (lang === "ar" ? "المشروع مكتمل" : "Project completed") : (lang === "ar" ? "حذف" : "Delete")}
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

          {/* ── Footer Summary ── */}
          <div className="border-t bg-gray-50">
            <div className="px-6 py-4">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-8 flex-wrap">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">{lang === "ar" ? "عدد البنود" : "Total Items"}</p>
                    <p className="text-lg font-bold text-gray-900">{filteredRecords.length}</p>
                  </div>
                  <div className="h-12 w-px bg-gray-300" />
                  <div>
                    <p className="text-xs text-gray-500 mb-1">{lang === "ar" ? "إجمالي الكميات" : "Total Quantity"}</p>
                    <p className="text-lg font-bold text-blue-600">{totalQuantity.toLocaleString()}</p>
                  </div>
                  <div className="h-12 w-px bg-gray-300" />
                  <div>
                    <p className="text-xs text-gray-500 mb-1">{lang === "ar" ? "الإجمالي الكلي" : "Grand Total"}</p>
                    <p className="text-lg font-bold text-amber-600">{formatCurrency(totalAmount, lang)}</p>
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

      {/* ── Delete Modal ── */}
      {showDeleteModal && selectedRecord && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                <Trash2 className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">{lang === "ar" ? "تأكيد الحذف" : "Confirm Delete"}</h3>
                <p className="text-sm text-gray-500">{lang === "ar" ? "هل أنت متأكد من حذف هذا البند؟" : "Are you sure you want to delete this item?"}</p>
              </div>
            </div>
            <div className="bg-gray-50 rounded-lg p-4 mb-4">
              <p className="text-sm text-gray-600 mb-1">{lang === "ar" ? "المقاول:" : "Contractor:"}</p>
              <p className="font-semibold text-gray-900">{selectedRecord.contractorName}</p>
              <p className="text-sm text-gray-500 mt-1">{selectedRecord.itemDescription}</p>
              {selectedRecord.workDate && (
                <p className="text-sm text-gray-400 mt-1 flex items-center gap-1">
                  <Calendar size={12} />
                  {formatDateShort(selectedRecord.workDate, lang)}
                </p>
              )}
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => { setShowDeleteModal(false); setSelectedRecord(null); }}
                disabled={deleting}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition font-semibold disabled:opacity-50"
              >
                {lang === "ar" ? "إلغاء" : "Cancel"}
              </button>
              <button
                onClick={() => handleDelete(selectedRecord._id)}
                disabled={deleting}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition font-semibold disabled:opacity-50"
              >
                {deleting ? (lang === "ar" ? "جاري الحذف..." : "Deleting...") : (lang === "ar" ? "حذف" : "Delete")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Add Modal ── */}
      {showAddModal && (
        <SubcontractorWorkModal
          projectId={id}
          onClose={() => setShowAddModal(false)}
          onSuccess={() => { fetchData(); setShowAddModal(false); }}
        />
      )}

      {/* ── Edit Modal ── */}
      {showEditModal && selectedRecord && (
        <SubcontractorWorkModal
          projectId={id}
          record={selectedRecord}
          onClose={() => { setShowEditModal(false); setSelectedRecord(null); }}
          onSuccess={() => { fetchData(); setShowEditModal(false); setSelectedRecord(null); }}
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// Shared Add / Edit Modal
// ─────────────────────────────────────────────
function SubcontractorWorkModal({ projectId, record, onClose, onSuccess }) {
  const { lang } = useContext(LanguageContext);
  const isEdit = Boolean(record);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    contractorName: record?.contractorName || "",
    itemDescription: record?.itemDescription || "",
    unit: record?.unit || "",
    quantity: record?.quantity ?? "",
    unitPrice: record?.unitPrice ?? "",
    notes: record?.notes || "",
    workDate: record?.workDate
      ? new Date(record.workDate).toISOString().split("T")[0]
      : todayISO(),
  });

  const [errors, setErrors] = useState({});

  const computedTotal = useMemo(() => {
    const q = parseFloat(formData.quantity);
    const p = parseFloat(formData.unitPrice);
    return !isNaN(q) && !isNaN(p) && q >= 0 && p >= 0 ? q * p : null;
  }, [formData.quantity, formData.unitPrice]);

  const handleChange = (field) => (e) => {
    setFormData((prev) => ({ ...prev, [field]: e.target.value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: null }));
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.contractorName.trim())
      newErrors.contractorName = lang === "ar" ? "اسم المقاول مطلوب" : "Contractor name is required";
    if (!formData.itemDescription.trim())
      newErrors.itemDescription = lang === "ar" ? "وصف البند مطلوب" : "Item description is required";
    if (!formData.workDate)
      newErrors.workDate = lang === "ar" ? "التاريخ مطلوب" : "Date is required";
    const q = parseFloat(formData.quantity);
    const p = parseFloat(formData.unitPrice);
    if (isNaN(q) || q < 0)
      newErrors.quantity = lang === "ar" ? "كمية غير صالحة" : "Invalid quantity";
    if (isNaN(p) || p < 0)
      newErrors.unitPrice = lang === "ar" ? "سعر غير صالح" : "Invalid unit price";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    try {
      const payload = {
        contractorName: formData.contractorName.trim(),
        itemDescription: formData.itemDescription.trim(),
        quantity: parseFloat(formData.quantity),
        unitPrice: parseFloat(formData.unitPrice),
        workDate: formData.workDate,
        ...(formData.unit.trim() && { unit: formData.unit.trim() }),
        ...(formData.notes.trim() && { notes: formData.notes.trim() }),
      };

      if (isEdit) {
        await axiosInstance.put(`/projects/${projectId}/subcontractor-work/${record._id}`, payload);
        toast.success(lang === "ar" ? "تم التحديث بنجاح" : "Updated successfully");
      } else {
        await axiosInstance.post(`/projects/${projectId}/subcontractor-work`, payload);
        toast.success(lang === "ar" ? "تمت الإضافة بنجاح" : "Added successfully");
      }
      onSuccess();
    } catch (error) {
      const msg = error?.response?.data?.message;
      toast.error(Array.isArray(msg) ? msg.join(", ") : msg || (lang === "ar" ? "فشل الحفظ" : "Failed to save"));
    } finally {
      setSaving(false);
    }
  };

  const accentClass = isEdit ? "from-blue-600 to-blue-700" : "from-amber-500 to-amber-600";
  const ringClass = isEdit ? "focus:ring-blue-500" : "focus:ring-amber-400";
  const submitClass = isEdit ? "bg-blue-600 hover:bg-blue-700" : "bg-amber-500 hover:bg-amber-600";

  const inputClass = (fieldName) =>
    `w-full px-3 py-2 border rounded focus:ring-2 focus:border-transparent ${ringClass} ${errors[fieldName] ? "border-red-400 bg-red-50" : "border-gray-300"}`;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className={`sticky top-0 bg-gradient-to-r ${accentClass} px-6 py-4 flex justify-between items-center`}>
          <h3 className="text-xl font-bold text-white">
            {isEdit ? (lang === "ar" ? "تعديل البند" : "Edit Work Item") : (lang === "ar" ? "إضافة بند جديد" : "Add New Work Item")}
          </h3>
          <button onClick={onClose} className="text-white/70 hover:text-white"><X size={24} /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4" noValidate>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label={lang === "ar" ? "اسم المقاول" : "Contractor Name"} required lang={lang} error={errors.contractorName}>
              <input type="text" value={formData.contractorName} onChange={handleChange("contractorName")} className={inputClass("contractorName")} dir={lang === "ar" ? "rtl" : "ltr"} />
            </Field>

            <Field label={lang === "ar" ? "تاريخ العمل" : "Work Date"} required lang={lang} error={errors.workDate}>
              <input type="date" value={formData.workDate} onChange={handleChange("workDate")} className={inputClass("workDate")} max={todayISO()} />
            </Field>
          </div>

          <Field label={lang === "ar" ? "وصف البند" : "Item Description"} required lang={lang} error={errors.itemDescription}>
            <textarea value={formData.itemDescription} onChange={handleChange("itemDescription")} className={inputClass("itemDescription")} rows={2} dir={lang === "ar" ? "rtl" : "ltr"} />
          </Field>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Field label={lang === "ar" ? "الوحدة" : "Unit"} optional lang={lang}>
              <input type="text" value={formData.unit} onChange={handleChange("unit")} className={inputClass("unit")} placeholder={lang === "ar" ? "م / ط" : "m / t"} />
            </Field>

            <Field label={lang === "ar" ? "الكمية" : "Quantity"} required lang={lang} error={errors.quantity}>
              <input type="number" value={formData.quantity} onChange={handleChange("quantity")} className={inputClass("quantity")} min="0" step="0.01" />
            </Field>

            <Field label={lang === "ar" ? "سعر الوحدة" : "Unit Price"} required lang={lang} error={errors.unitPrice}>
              <input type="number" value={formData.unitPrice} onChange={handleChange("unitPrice")} className={inputClass("unitPrice")} min="0" step="0.01" />
            </Field>
          </div>

          <Field label={lang === "ar" ? "ملاحظات" : "Notes"} optional lang={lang}>
            <input type="text" value={formData.notes} onChange={handleChange("notes")} className={inputClass("notes")} placeholder={lang === "ar" ? "أي ملاحظات..." : "Any notes..."} />
          </Field>

          {/* Live Total */}
          {computedTotal !== null && (
            <div className="bg-amber-50 rounded-lg p-4 flex items-center justify-between border border-amber-200">
              <span className="text-sm font-medium text-gray-600">
                {lang === "ar" ? "الإجمالي المتوقع" : "Expected Total"}
              </span>
              <span className="text-xl font-bold text-amber-600">
                {computedTotal.toLocaleString(lang === "ar" ? "ar-EG" : "en-US", { style: "currency", currency: "EGP", minimumFractionDigits: 2 })}
              </span>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4">
            <button type="button" onClick={onClose} disabled={saving} className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition font-semibold disabled:opacity-50">
              {lang === "ar" ? "إلغاء" : "Cancel"}
            </button>
            <button type="submit" disabled={saving} className={`px-4 py-2 ${submitClass} text-white rounded-lg transition font-semibold disabled:opacity-50`}>
              {saving ? (lang === "ar" ? "جاري الحفظ..." : "Saving...") : isEdit ? (lang === "ar" ? "حفظ التعديلات" : "Save Changes") : (lang === "ar" ? "حفظ" : "Save")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}