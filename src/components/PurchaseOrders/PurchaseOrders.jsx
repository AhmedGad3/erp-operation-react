import { useState, useEffect, useMemo, useContext, useRef } from "react";
import {
  ShoppingCart, Search, Plus, Eye, Download,
  ChevronUp, ChevronDown, FileText, Calendar,
  Clock, Package, X, Trash2, DollarSign,
  TrendingUp, Printer, Info
} from "lucide-react";
import { toast } from "react-toastify";
import { getErrorMessage } from "../../utils/errorHandler";
import { formatCurrency, formatDateShort } from "../../utils/dateFormat";
import { exportToExcel } from "../../utils/excelExport";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import axiosInstance from "../../utils/axiosInstance";
import { LanguageContext } from "../../context/LanguageContext";
import megabuildLogo from "../../assets/megabuild1.svg";
import QuickSupplierModal from "../quick-create/QuickSupplierModal";

/* ─── brand colors ─── */
const RED  = "#C41E3A";
const BLUE = "#003764";

// ── Sortable column header ─────────────────────────────────
const SortHeader = ({ label, field, sortField, sortDir, onSort }) => (
  <th
    className="px-4 py-3 text-left text-sm font-medium text-gray-500 cursor-pointer select-none"
    onClick={() => onSort(field)}
  >
    <span className="inline-flex items-center gap-1">
      {label}
      <span className="flex flex-col leading-none">
        <ChevronUp   className={`w-3 h-3 ${sortField === field && sortDir === "asc"  ? "text-gray-900" : "text-gray-300"}`} />
        <ChevronDown className={`w-3 h-3 ${sortField === field && sortDir === "desc" ? "text-gray-900" : "text-gray-300"}`} />
      </span>
    </span>
  </th>
);

// ── Helper: الوحدات المتاحة لمادة محددة ───────────────────
function getAvailableUnits(material, units) {
  if (!material) return [];
  const baseId = material.baseUnit?._id?.toString() || material.baseUnit?.toString();
  const altIds  = (material.alternativeUnits || []).map(u =>
    u.unitId?._id?.toString() || u.unitId?.toString()
  );
  const allIds  = [baseId, ...altIds].filter(Boolean);
  return units.filter(u => allIds.includes(u._id?.toString()));
}

// ── Helper: معامل التحويل الافتراضي لوحدة في مادة ─────────
function getDefaultCF(material, unitId) {
  if (!material || !unitId) return 1;
  const baseId = material.baseUnit?._id?.toString() || material.baseUnit?.toString();
  if (unitId === baseId) return 1;
  const alt = (material.alternativeUnits || []).find(u => {
    const id = u.unitId?._id?.toString() || u.unitId?.toString();
    return id === unitId;
  });
  return alt?.conversionFactor ?? 1;
}

// ── Helper: هل الوحدة تسمح بـ override؟ ───────────────────
function isOverrideAllowed(material, unitId) {
  if (!material || !unitId) return false;
  const baseId = material.baseUnit?._id?.toString() || material.baseUnit?.toString();
  if (unitId === baseId) return false;
  const alt = (material.alternativeUnits || []).find(u => {
    const id = u.unitId?._id?.toString() || u.unitId?.toString();
    return id === unitId;
  });
  return alt?.allowOverride === true;
}

// ── Main Component ─────────────────────────────────────────
export default function PurchaseOrders() {
  const { lang, t } = useContext(LanguageContext);

  const [purchases,       setPurchases]       = useState([]);
  const [suppliers,       setSuppliers]       = useState([]);
  const [materials,       setMaterials]       = useState([]);
  const [units,           setUnits]           = useState([]);
  const [loading,         setLoading]         = useState(false);
  const [saving,          setSaving]          = useState(false);
  const [showModal,       setShowModal]       = useState(false);
  const [detailsTarget,   setDetailsTarget]   = useState(null);
  const [editingPurchase, setEditingPurchase] = useState(null);
  const [searchTerm,      setSearchTerm]      = useState("");
  const [filterSupplier,  setFilterSupplier]  = useState("all");
  const [sortField,       setSortField]       = useState("invoiceDate");
  const [sortDir,         setSortDir]         = useState("desc");

  const [formData, setFormData] = useState({
    supplierId: "",
    invoiceDate: new Date().toISOString().split("T")[0],
    supplierInvoiceNo: "",
    creditDays: 30,
    // ✅ ضفنا conversionFactor في كل item
    items: [{ materialId: "", unitId: "", quantity: 1, unitPrice: 0, conversionFactor: "" }],
    notes: ""
  });

  useEffect(() => {
    fetchPurchases(); fetchSuppliers(); fetchMaterials(); fetchUnits();
  }, [lang]);

  const fetchPurchases = async () => {
    try {
      setLoading(true);
      const { data } = await axiosInstance.get("/purchases?lang=" + lang);
      setPurchases(data.result || []);
    } catch {
      toast.error(t?.errorLoadingPurchases || "Error loading purchases");
    } finally {
      setLoading(false);
    }
  };

  const fetchUnits     = async () => { try { const res = await axiosInstance.get("/units"); setUnits(res.data.result || res.data); } catch {} };
  const fetchSuppliers = async () => { try { const { data } = await axiosInstance.get("/suppliers"); setSuppliers(data.result || []); } catch {} };
  const fetchMaterials = async () => { try { const { data } = await axiosInstance.get("/materials?lang=" + lang); setMaterials(data.result || []); } catch {} };

  const calculateTotal   = (items) => items.reduce((sum, i) => sum + (i.quantity * i.unitPrice), 0);
  const calculateDueDate = (invoiceDate, creditDays) => {
    const d = new Date(invoiceDate);
    d.setDate(d.getDate() + creditDays);
    return d.toISOString().split("T")[0];
  };

  const resetForm = () => setFormData({
    supplierId: "", invoiceDate: new Date().toISOString().split("T")[0],
    supplierInvoiceNo: "", creditDays: 30,
    items: [{ materialId: "", unitId: "", quantity: 1, unitPrice: 0, conversionFactor: "" }], notes: ""
  });
  const handleQuickSupplierCreated = (createdSupplier) => {
    if (!createdSupplier?._id) return;
    setSuppliers((prev) => [...prev, createdSupplier]);
    setFormData((prev) => ({ ...prev, supplierId: createdSupplier._id }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.supplierId) { toast.error(t?.selectSupplier || "Please select a supplier"); return; }
    if (!formData.items.some(i => i.materialId)) { toast.error(t?.addAtLeastOneItem || "Please add at least one item"); return; }
    setSaving(true);
    try {
      const payload = {
        supplierId: formData.supplierId,
        invoiceDate: formData.invoiceDate,
        supplierInvoiceNo: formData.supplierInvoiceNo,
        creditDays: parseInt(formData.creditDays),
        items: formData.items.filter(i => i.materialId && i.quantity > 0)
          .map(i => {
            const item = {
              materialId: i.materialId,
              quantity:   parseFloat(i.quantity),
              unitPrice:  parseFloat(i.unitPrice),
              unitId:     i.unitId
            };
            // ✅ بنبعت conversionFactor بس لو allowOverride وفيه قيمة
            const mat = materials.find(m => m._id === i.materialId);
            if (isOverrideAllowed(mat, i.unitId) && i.conversionFactor !== "") {
              item.conversionFactor = parseFloat(i.conversionFactor);
            }
            return item;
          }),
        notes: formData.notes || ""
      };
      if (editingPurchase) {
        await axiosInstance.put(`/purchases/${editingPurchase._id}`, payload);
        toast.success(t?.purchaseUpdated || "Purchase order updated successfully");
      } else {
        await axiosInstance.post("/purchases", payload);
        toast.success(t?.purchaseCreated || "Purchase order created successfully");
      }
      setShowModal(false); setEditingPurchase(null); resetForm(); fetchPurchases();
    } catch (err) {
      toast.error(getErrorMessage(err, "Error saving purchase order"));
    } finally {
      setSaving(false);
    }
  };

  const handleSort = (field) => {
    if (sortField === field) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortField(field); setSortDir("asc"); }
  };

  const handleExport = () => {
    try {
      if (displayed.length === 0) { toast.error(t?.noDataToExport || "No data to export"); return; }
      const data = displayed.map(p => ({
        [t?.invoiceNo   || "Invoice No"]:  p.supplierInvoiceNo,
        [t?.supplier    || "Supplier"]:    lang === "ar" ? (p.supplierId?.nameAr || p.supplier?.nameAr) : (p.supplierId?.nameEn || p.supplier?.nameEn),
        [t?.date        || "Date"]:        formatDateShort(p.invoiceDate, lang),
        [t?.itemsCount  || "Items"]:       p.items?.length || 0,
        [t?.total       || "Total"]:       calculateTotal(p.items || []),
        [t?.creditDays  || "Credit Days"]: p.creditDays,
        [t?.dueDate     || "Due Date"]:    formatDateShort(calculateDueDate(p.invoiceDate, p.creditDays), lang),
      }));
      exportToExcel(data, Object.keys(data[0]).map(k => ({ [k]: k })), "Purchase_Orders", lang);
      toast.success(t?.exportedSuccessfully || "Exported successfully");
    } catch {
      toast.error(t?.exportError || "Error exporting data");
    }
  };

  const getSupplierName = (p) =>
    lang === "ar"
      ? (p.supplierId?.nameAr || p.supplier?.nameAr || "")
      : (p.supplierId?.nameEn || p.supplier?.nameEn || "");

  const displayed = useMemo(() => {
    return purchases
      .filter(p => {
        const q = searchTerm.toLowerCase();
        const matchSearch = !q
          || p.supplierInvoiceNo?.toLowerCase().includes(q)
          || p.supplierId?.nameEn?.toLowerCase().includes(q)
          || p.supplierId?.nameAr?.includes(q)
          || p.supplier?.nameEn?.toLowerCase().includes(q)
          || p.supplier?.nameAr?.includes(q);
        const matchSupplier = filterSupplier === "all" || (p.supplierId?._id || p.supplier?._id) === filterSupplier;
        return matchSearch && matchSupplier;
      })
      .sort((a, b) => {
        let va, vb;
        if (sortField === "total") { va = calculateTotal(a.items || []); vb = calculateTotal(b.items || []); }
        else if (sortField === "invoiceDate") { va = new Date(a.invoiceDate); vb = new Date(b.invoiceDate); }
        else { va = (a[sortField] ?? "").toString().toLowerCase(); vb = (b[sortField] ?? "").toString().toLowerCase(); }
        return sortDir === "asc" ? (va > vb ? 1 : -1) : (va < vb ? 1 : -1);
      });
  }, [purchases, searchTerm, filterSupplier, sortField, sortDir]);

  const totalAmount = displayed.reduce((sum, p) => sum + calculateTotal(p.items || []), 0);
  const totalItems  = displayed.reduce((sum, p) => sum + (p.items?.length || 0), 0);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">

        {/* ── Page Header ── */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {t?.purchaseOrders || (lang === "ar" ? "أوامر الشراء" : "Purchase Orders")}
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              {lang === "ar" ? "عرض وإدارة جميع أوامر الشراء" : "View and manage all purchase orders."}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handleExport} className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 text-gray-700 bg-white rounded-xl hover:bg-gray-50 transition font-semibold text-sm shadow-sm">
              <Download className="w-4 h-4" />
              {t?.export || (lang === "ar" ? "تصدير" : "Export")}
            </button>
            <button onClick={() => { setEditingPurchase(null); resetForm(); setShowModal(true); }} className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition font-semibold text-sm shadow-sm">
              <Plus className="w-4 h-4" />
              {t?.addPurchaseOrder || (lang === "ar" ? "إضافة أمر شراء" : "Add Purchase Order")}
            </button>
          </div>
        </div>

        {/* ── Stats ── */}
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="bg-white border border-gray-200 rounded-2xl p-4">
            <p className="text-xs text-gray-500 mb-1">{t?.totalOrders || (lang === "ar" ? "إجمالي الأوامر" : "Total Orders")}</p>
            <p className="text-2xl font-bold text-gray-900">{displayed.length}</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-2xl p-4">
            <p className="text-xs text-gray-500 mb-1">{t?.totalAmount || (lang === "ar" ? "إجمالي المبلغ" : "Total Amount")}</p>
            <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalAmount, lang)}</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-2xl p-4">
            <p className="text-xs text-gray-500 mb-1">{t?.totalItems || (lang === "ar" ? "إجمالي المواد" : "Total Items")}</p>
            <p className="text-2xl font-bold text-gray-900">{totalItems}</p>
          </div>
        </div>

        {/* ── Filters ── */}
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input type="text" placeholder={lang === "ar" ? "بحث برقم الفاتورة أو المورد..." : "Search by invoice or supplier..."} value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white" />
          </div>
          <select value={filterSupplier} onChange={e => setFilterSupplier(e.target.value)} className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white">
            <option value="all">{t?.allSuppliers || (lang === "ar" ? "كل الموردين" : "All Suppliers")}</option>
            {suppliers.map(s => <option key={s._id} value={s._id}>{lang === "ar" ? s.nameAr : s.nameEn}</option>)}
          </select>
          {(searchTerm || filterSupplier !== "all") && (
            <button onClick={() => { setSearchTerm(""); setFilterSupplier("all"); }} className="text-sm text-indigo-600 hover:underline">
              {t?.clearFilters || (lang === "ar" ? "مسح الفلاتر" : "Clear")}
            </button>
          )}
        </div>

        {/* ── Table ── */}
        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
          {loading ? (
            <div className="p-16 text-center">
              <div className="animate-spin inline-block w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full mb-3" />
              <p className="text-sm text-gray-500">{lang === "ar" ? "جاري التحميل..." : "Loading..."}</p>
            </div>
          ) : displayed.length === 0 ? (
            <div className="p-16 text-center">
              <ShoppingCart className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="font-medium text-gray-600">{lang === "ar" ? "لا توجد أوامر شراء" : "No purchase orders found"}</p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <SortHeader label={t?.invoiceNo  || (lang === "ar" ? "رقم الفاتورة" : "Invoice No")} field="supplierInvoiceNo" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                  <SortHeader label={t?.supplier   || (lang === "ar" ? "المورد"       : "Supplier")}   field="supplierId"        sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                  <SortHeader label={t?.date       || (lang === "ar" ? "التاريخ"      : "Date")}       field="invoiceDate"       sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                  <SortHeader label={t?.itemsCount || (lang === "ar" ? "المواد"       : "Items")}      field="items"             sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                  <SortHeader label={t?.total      || (lang === "ar" ? "الإجمالي"     : "Total")}      field="total"             sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                  <SortHeader label={t?.creditDays || (lang === "ar" ? "الائتمان"     : "Credit")}     field="creditDays"        sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                  <SortHeader label={t?.dueDate    || (lang === "ar" ? "الاستحقاق"    : "Due Date")}   field="dueDate"           sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {displayed.map(purchase => {
                  const supplierName = getSupplierName(purchase);
                  const total = calculateTotal(purchase.items || []);
                  return (
                    <tr key={purchase._id} className="hover:bg-gray-50/60 transition">
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2">
                          <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
                            <FileText className="w-4 h-4 text-indigo-600" />
                          </div>
                          <span className="font-medium text-gray-900 text-sm">{purchase.invoiceNo || purchase.supplierInvoiceNo || "—"}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                            <span className="text-purple-600 font-semibold text-xs">{supplierName?.charAt(0)?.toUpperCase()}</span>
                          </div>
                          <span className="text-sm text-gray-700 font-medium">{supplierName}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-sm text-gray-500">{formatDateShort(purchase.invoiceDate, lang)}</td>
                      <td className="px-4 py-3.5">
                        <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                          {purchase.items?.length || 0} {lang === "ar" ? "مادة" : "items"}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-sm font-semibold text-gray-900">{formatCurrency(total, lang)}</td>
                      <td className="px-4 py-3.5 text-sm text-gray-500">{purchase.creditDays} {lang === "ar" ? "يوم" : "d"}</td>
                      <td className="px-4 py-3.5 text-sm text-gray-500">{formatDateShort(calculateDueDate(purchase.invoiceDate, purchase.creditDays), lang)}</td>
                      <td className="px-4 py-3.5 text-right">
                        <button onClick={() => setDetailsTarget(purchase)} className="p-1.5 rounded-md hover:bg-indigo-50 transition text-indigo-600" title={lang === "ar" ? "عرض" : "View"}>
                          <Eye className="w-5 h-5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* ── Modals ── */}
      {showModal && (
        <PurchaseModal
          formData={formData} setFormData={setFormData}
          suppliers={suppliers} materials={materials} units={units}
          onSupplierCreated={handleQuickSupplierCreated}
          onClose={() => { setShowModal(false); setEditingPurchase(null); resetForm(); }}
          onSubmit={handleSubmit} saving={saving} editing={!!editingPurchase}
          t={t} lang={lang}
        />
      )}
      {detailsTarget && (
        <PurchaseDetailsModal
          purchase={detailsTarget}
          onClose={() => setDetailsTarget(null)}
          t={t} lang={lang}
          calculateTotal={calculateTotal}
          units={units}
        />
      )}
    </div>
  );
}

// ═══════════════════════════════════════════
// PURCHASE MODAL
// ═══════════════════════════════════════════
function PurchaseModal({ formData, setFormData, suppliers, materials, units, onSupplierCreated, onClose, onSubmit, saving, editing, t, lang }) {
  const [showQuickSupplierModal, setShowQuickSupplierModal] = useState(false);
  const handleAddItem    = () => setFormData({ ...formData, items: [...formData.items, { materialId: "", unitId: "", quantity: 1, unitPrice: 0, conversionFactor: "" }] });
  const handleRemoveItem = (i) => setFormData({ ...formData, items: formData.items.filter((_, idx) => idx !== i) });
  const calculateTotal   = () => formData.items.reduce((s, i) => s + (parseFloat(i.quantity || 0) * parseFloat(i.unitPrice || 0)), 0);
  const getMaterialName  = (id) => { const m = materials.find(m => m._id === id); return m ? (lang === "ar" ? m.nameAr : m.nameEn) : ""; };
  const handleQuickSupplierCreated = (createdSupplier) => {
    onSupplierCreated?.(createdSupplier);
    if (!createdSupplier?._id) return;
    setFormData((prev) => ({ ...prev, supplierId: createdSupplier._id }));
  };

  const handleItemChange = (idx, field, value) => {
    const items = [...formData.items];

    if (field === "materialId") {
      const mat = materials.find(m => m._id === value);
      // ✅ لو فيه defaultPurchaseUnit استخدمه، غير كده الـ base
      const defaultUnitId = mat?.defaultPurchaseUnit?._id?.toString()
        || mat?.defaultPurchaseUnit?.toString()
        || mat?.baseUnit?._id?.toString()
        || mat?.baseUnit?.toString()
        || "";
      items[idx] = { ...items[idx], materialId: value, unitId: defaultUnitId, conversionFactor: "" };
    } else if (field === "unitId") {
      // ✅ لما يغير الوحدة نمسح الـ conversionFactor عشان يبدأ بالافتراضي
      items[idx] = { ...items[idx], unitId: value, conversionFactor: "" };
    } else {
      items[idx] = { ...items[idx], [field]: value };
    }
    setFormData({ ...formData, items });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Package size={20} className="text-indigo-500" />
            {editing ? (lang === "ar" ? "تعديل أمر الشراء" : "Edit Purchase Order") : (lang === "ar" ? "إضافة أمر شراء جديد" : "New Purchase Order")}
          </h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition"><X size={20} /></button>
        </div>

        <div className="overflow-y-auto max-h-[calc(90vh-140px)]">
          <div className="p-6 space-y-5">

            {/* Basic Info */}
            <div className="bg-gray-50 rounded-2xl p-5 space-y-4">
              <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <FileText size={16} className="text-indigo-500" />
                {lang === "ar" ? "المعلومات الأساسية" : "Basic Information"}
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{lang === "ar" ? "المورد" : "Supplier"} <span className="text-red-500">*</span></label>
                  <select value={formData.supplierId} onChange={e => setFormData({ ...formData, supplierId: e.target.value })} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white" dir={lang === "ar" ? "rtl" : "ltr"}>
                    <option value="">{lang === "ar" ? "اختر المورد" : "Select Supplier"}</option>
                    {suppliers.map(s => <option key={s._id} value={s._id}>{lang === "ar" ? s.nameAr : s.nameEn}</option>)}
                  </select>
                  <button
                    type="button"
                    onClick={() => setShowQuickSupplierModal(true)}
                    className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-indigo-600 hover:text-indigo-700"
                  >
                    <Plus size={12} />
                    {lang === "ar" ? "إضافة مورد سريعًا" : "Quick Add Supplier"}
                  </button>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{lang === "ar" ? "رقم فاتورة المورد" : "Supplier Invoice No"}</label>
                  <Input type="text" value={formData.supplierInvoiceNo} onChange={e => setFormData({ ...formData, supplierInvoiceNo: e.target.value })} placeholder={lang === "ar" ? "أدخل رقم الفاتورة" : "Enter invoice number"} dir={lang === "ar" ? "rtl" : "ltr"} className="rounded-xl border-gray-200" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{lang === "ar" ? "تاريخ الفاتورة" : "Invoice Date"} <span className="text-red-500">*</span></label>
                  <Input type="date" value={formData.invoiceDate} onChange={e => setFormData({ ...formData, invoiceDate: e.target.value })} className="rounded-xl border-gray-200" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{lang === "ar" ? "أيام الائتمان" : "Credit Days"}</label>
                  <Input type="number" value={formData.creditDays} onChange={e => setFormData({ ...formData, creditDays: e.target.value })} min="0" dir={lang === "ar" ? "rtl" : "ltr"} className="rounded-xl border-gray-200" />
                </div>
              </div>
            </div>

            {/* Items */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <Package size={16} className="text-indigo-500" />
                  {lang === "ar" ? "المواد" : "Items"} <span className="text-red-500">*</span>
                </h4>
                <button type="button" onClick={handleAddItem} className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 transition">
                  <Plus size={14} />{lang === "ar" ? "إضافة مادة" : "Add Item"}
                </button>
              </div>

              {formData.items.map((item, index) => {
                const selectedMaterial  = materials.find(m => m._id === item.materialId);
                const availableUnits    = getAvailableUnits(selectedMaterial, units);
                const baseUnitId        = selectedMaterial?.baseUnit?._id?.toString() || selectedMaterial?.baseUnit?.toString();
                const canOverride       = isOverrideAllowed(selectedMaterial, item.unitId);
                const defaultCF         = getDefaultCF(selectedMaterial, item.unitId);
                const isAltUnit         = item.unitId && baseUnitId && item.unitId !== baseUnitId;

                // حساب الكمية بالـ base unit للعرض
                const qty = parseFloat(item.quantity) || 0;
                const cf  = item.conversionFactor !== "" ? parseFloat(item.conversionFactor) : defaultCF;
                const qtyInBase = isAltUnit && qty > 0 ? qty * cf : null;

                return (
                  <div key={index} className="bg-white border border-gray-200 rounded-2xl p-4 hover:border-indigo-200 transition space-y-3">
                    {/* Main row */}
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                      {/* Material */}
                      <div className="md:col-span-4">
                        <label className="block text-xs font-medium text-gray-500 mb-1">{lang === "ar" ? "المادة" : "Material"}</label>
                        <select
                          value={item.materialId}
                          onChange={e => handleItemChange(index, "materialId", e.target.value)}
                          className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-gray-50"
                          dir={lang === "ar" ? "rtl" : "ltr"}
                        >
                          <option value="">{lang === "ar" ? "اختر المادة" : "Select Material"}</option>
                          {materials.map(m => <option key={m._id} value={m._id}>{lang === "ar" ? m.nameAr : m.nameEn}</option>)}
                        </select>
                      </div>

                      {/* Unit — ✅ مفلترة على الوحدات المتاحة للمادة */}
                      <div className="md:col-span-2">
                        <label className="block text-xs font-medium text-gray-500 mb-1">{lang === "ar" ? "الوحدة" : "Unit"}</label>
                        <select
                          value={item.unitId}
                          onChange={e => handleItemChange(index, "unitId", e.target.value)}
                          className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-gray-50 disabled:opacity-50"
                          disabled={!item.materialId}
                        >
                          <option value="">{lang === "ar" ? "اختر الوحدة" : "Select Unit"}</option>
                          {availableUnits.map(u => (
                            <option key={u._id} value={u._id}>
                              {lang === "ar" ? u.nameAr : u.nameEn}
                              {u._id?.toString() === baseUnitId ? (lang === "ar" ? " (أساسية)" : " (base)") : ""}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Quantity */}
                      <div className="md:col-span-2">
                        <label className="block text-xs font-medium text-gray-500 mb-1">{lang === "ar" ? "الكمية" : "Quantity"}</label>
                        <Input type="number" value={item.quantity} onChange={e => handleItemChange(index, "quantity", e.target.value)} min="0.01" step="0.01" className="text-sm rounded-xl border-gray-200" dir={lang === "ar" ? "rtl" : "ltr"} />
                      </div>

                      {/* Unit Price */}
                      <div className="md:col-span-2">
                        <label className="block text-xs font-medium text-gray-500 mb-1">{lang === "ar" ? "سعر الوحدة" : "Unit Price"}</label>
                        <Input type="number" value={item.unitPrice} onChange={e => handleItemChange(index, "unitPrice", e.target.value)} min="0" step="0.01" className="text-sm rounded-xl border-gray-200" dir={lang === "ar" ? "rtl" : "ltr"} />
                      </div>

                      {/* Delete */}
                      <div className="md:col-span-2 flex justify-end items-end gap-2">
                        {qtyInBase != null && (
                          <div className="flex-1 bg-blue-50 border border-blue-100 rounded-xl px-2 py-1.5 text-center">
                            <p className="text-xs text-blue-400">{lang === "ar" ? "بالأساسية" : "In base"}</p>
                            <p className="text-xs font-bold text-blue-700">{qtyInBase.toLocaleString(undefined, { maximumFractionDigits: 4 })}</p>
                          </div>
                        )}
                        {formData.items.length > 1 && (
                          <button type="button" onClick={() => handleRemoveItem(index)} className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg transition flex-shrink-0"><Trash2 size={16} /></button>
                        )}
                      </div>
                    </div>

                    {/* ✅ Conversion Factor row — يظهر بس لو وحدة بديلة */}
                    {isAltUnit && (
                      <div className="pt-2 border-t border-gray-100 flex items-center gap-3 flex-wrap">
                        <div className="flex items-center gap-2">
                          <label className="text-xs font-medium text-gray-600">
                            {lang === "ar" ? "معامل التحويل:" : "Conv. Factor:"}
                            {canOverride && <span className="ml-1 text-amber-500">({lang === "ar" ? "قابل للتعديل" : "editable"})</span>}
                          </label>
                          <input
                            type="number"
                            step="0.000001"
                            min="0.000001"
                            value={item.conversionFactor !== "" ? item.conversionFactor : defaultCF}
                            onChange={e => { if (canOverride) handleItemChange(index, "conversionFactor", e.target.value); }}
                            readOnly={!canOverride}
                            className={`w-32 px-3 py-1.5 border rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 ${
                              canOverride
                                ? "border-amber-300 bg-amber-50 cursor-text"
                                : "border-gray-200 bg-gray-100 cursor-not-allowed text-gray-500"
                            }`}
                          />
                          <span className="text-xs text-gray-400">
                            {lang === "ar" ? "= 1 وحدة مختارة → base" : "= 1 selected unit → base"}
                          </span>
                        </div>
                        {!canOverride && (
                          <span className="flex items-center gap-1 text-xs text-gray-400">
                            <Info size={12} />
                            {lang === "ar" ? "معامل ثابت" : "Fixed factor"}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Subtotal */}
                    {item.materialId && (
                      <div className="pt-2 border-t border-gray-100 flex justify-between items-center text-sm">
                        <span className="text-gray-500">{getMaterialName(item.materialId)}</span>
                        <span className="font-semibold text-gray-900">{lang === "ar" ? "المجموع:" : "Subtotal:"} {formatCurrency((item.quantity || 0) * (item.unitPrice || 0), lang)}</span>
                      </div>
                    )}
                  </div>
                );
              })}

              <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-semibold text-gray-700">{lang === "ar" ? "الإجمالي الكلي:" : "Grand Total:"}</span>
                  <span className="text-lg font-bold text-indigo-600">{formatCurrency(calculateTotal(), lang)}</span>
                </div>
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{lang === "ar" ? "ملاحظات" : "Notes"}</label>
              <textarea value={formData.notes} onChange={e => setFormData({ ...formData, notes: e.target.value })} rows={3} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-gray-50 resize-none" placeholder={lang === "ar" ? "أضف ملاحظات إضافية..." : "Add additional notes..."} dir={lang === "ar" ? "rtl" : "ltr"} />
            </div>
          </div>
        </div>

        <div className="px-6 py-4 flex items-center justify-end gap-3 border-t border-gray-100">
          <button type="button" onClick={onClose} disabled={saving} className="px-4 py-2.5 border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition font-medium text-sm">
            {lang === "ar" ? "إلغاء" : "Cancel"}
          </button>
          <button type="button" onClick={e => onSubmit(e)} disabled={saving} className="flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition font-semibold text-sm min-w-[100px]">
            {saving ? <><div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />{lang === "ar" ? "جاري الحفظ..." : "Saving..."}</> : <>{lang === "ar" ? "حفظ" : "Save"}</>}
          </button>
        </div>

        {showQuickSupplierModal && (
          <QuickSupplierModal
            lang={lang}
            onClose={() => setShowQuickSupplierModal(false)}
            onCreated={handleQuickSupplierCreated}
          />
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════
// PURCHASE DETAILS MODAL — unchanged
// ═══════════════════════════════════════════
function PurchaseDetailsModal({ purchase, onClose, calculateTotal, units = [] }) {
  const { lang } = useContext(LanguageContext);
  const isAr = lang === "ar";
  const tr   = (ar, en) => isAr ? ar : en;

  const [isPrinting, setIsPrinting] = useState(false);
  const [materials,  setMaterials]  = useState([]);

  useEffect(() => {
    (async () => {
      try { const { data } = await axiosInstance.get("/materials?lang=" + lang); setMaterials(data.result || []); } catch {}
    })();
  }, [lang]);

  const getMaterialName = (item) => {
    if (item.material) return isAr ? item.material?.nameAr : item.material?.nameEn;
    const m = materials.find(m => m._id === item.materialId);
    return m ? (isAr ? m.nameAr : m.nameEn) : tr("غير معروف", "Unknown");
  };

  const getMaterialUnit = (item) => {
    if (item.unitId && typeof item.unitId === "object") {
      return isAr ? item.unitId.nameAr : item.unitId.nameEn;
    }
    const unitId = typeof item.unitId === "string" ? item.unitId : null;
    if (unitId) {
      const unit = units.find(u => u._id === unitId);
      if (unit) return isAr ? unit.nameAr : unit.nameEn;
    }
    const materialId = typeof item.materialId === "string" ? item.materialId : item.materialId?._id;
    const material = materials.find(m => m._id === materialId);
    if (material?.baseUnit) {
      const unit = units.find(u => u._id === material.baseUnit);
      if (unit) return isAr ? unit.nameAr : unit.nameEn;
    }
    return "—";
  };

  const dueDate = (() => {
    const d = new Date(purchase.invoiceDate);
    d.setDate(d.getDate() + purchase.creditDays);
    return d;
  })();

  const total        = calculateTotal(purchase.items || []);
  const supplierName = isAr
    ? (purchase.supplierId?.nameAr || purchase.supplier?.nameAr)
    : (purchase.supplierId?.nameEn || purchase.supplier?.nameEn);

  const handlePrint = () => { setIsPrinting(true); setTimeout(() => { window.print(); setIsPrinting(false); }, 100); };

  return (
    <>
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #printable-invoice, #printable-invoice * { visibility: visible; }
          #printable-invoice { position: absolute; left: 0; top: 0; width: 100%; }
          .no-print { display: none !important; }
        }
      `}</style>

      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden">

          <div className="bg-gradient-to-r from-red-700 to-blue-900 text-white p-2 no-print flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FileText size={24} />
              <h3 className="text-xl font-bold">{tr("تفاصيل أمر الشراء", "Purchase Order Details")}</h3>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-lg transition-colors"><X size={22} /></button>
          </div>

          <div id="printable-invoice" className="overflow-y-auto max-h-[calc(90vh-130px)]">
            <div style={{ background: "#fff", fontFamily: isAr ? "Tahoma,Arial,sans-serif" : "Segoe UI,Arial,sans-serif", direction: isAr ? "rtl" : "ltr" }}>

              <div style={{ padding: "24px 36px 18px", borderBottom: "1px solid #eee", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
                  <img src={megabuildLogo} alt="Mega Build" style={{ width: 70, height: 70, objectFit: "contain" }} />
                  <p style={{ fontSize: 8, color: "#aaa", marginTop: 3, letterSpacing: 0.8 }}>{tr("نبني القيمة", "We Build Value")}</p>
                </div>
                <div style={{ display: "flex", flexDirection: "column", alignItems: isAr ? "flex-start" : "flex-end", gap: 4 }}>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 7 }}>
                    <span style={{ fontSize: 26, fontWeight: 900, color: RED,  letterSpacing: 2, lineHeight: 1 }}>MEGA</span>
                    <span style={{ fontSize: 26, fontWeight: 900, color: BLUE, letterSpacing: 2, lineHeight: 1 }}>BUILD</span>
                  </div>
                  <p style={{ fontSize: 10, color: "#999", fontStyle: "italic", margin: 0 }}>We Build Value</p>
                  <div style={{ display: "flex", flexDirection: "column", gap: 2, alignItems: isAr ? "flex-start" : "flex-end", marginTop: 4 }}>
                    {["23 RD Of July St, Suez – Suez P.O. Box: 43511","C.R: 59034    T.C: 454-990-006","Tel: 062 3456452    Mob: 01111696211","Meegabuild@gmail.com","www.Megbuild.com"].map((line, i) => (
                      <p key={i} style={{ fontSize: 10.5, color: "#444", margin: 0 }}>{line}</p>
                    ))}
                  </div>
                  <div style={{ marginTop: 8, background: BLUE, color: "#fff", padding: "5px 16px", borderRadius: 5 }}>
                    <span style={{ fontSize: 13, fontWeight: 800, letterSpacing: 1 }}>{tr("أمر شراء", "PURCHASE ORDER")}</span>
                  </div>
                  <p style={{ fontSize: 12, color: "#555", margin: 0 }}>
                    <strong style={{ color: BLUE }}>{tr("رقم:", "No:")}</strong>{" "}
                    {purchase.invoiceNo || purchase.supplierInvoiceNo || tr("غير محدد", "N/A")}
                  </p>
                </div>
              </div>

              <div style={{ height: 3, background: RED }} />
              <div style={{ height: 1, background: "#eee" }} />

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr" }}>
                <div style={{ padding: "20px 36px", borderBottom: "1px solid #eee", borderInlineEnd: "1px solid #eee" }}>
                  <p style={{ fontSize: 10, fontWeight: 700, color: "#888", textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>{tr("المورد", "Supplier")}</p>
                  <p style={{ fontSize: 16, fontWeight: 800, color: "#1a1a2e", margin: 0 }}>{supplierName}</p>
                </div>
                <div style={{ padding: "20px 36px", borderBottom: "1px solid #eee", display: "flex", flexDirection: "column", gap: 10 }}>
                  {[
                    [tr("فاتورة المورد",   "Supplier Invoice"), purchase.supplierInvoiceNo],
                    [tr("تاريخ الفاتورة", "Invoice Date"),     formatDateShort(purchase.invoiceDate, lang)],
                    [tr("تاريخ الاستحقاق","Due Date"),         formatDateShort(dueDate, lang)],
                    [tr("أيام الائتمان",  "Credit Days"),      `${purchase.creditDays} ${tr("يوم", "days")}`],
                  ].map(([label, value], i) => (
                    <div key={i} style={{ textAlign: isAr ? "left" : "right" }}>
                      <p style={{ fontSize: 10, fontWeight: 700, color: "#888", textTransform: "uppercase", letterSpacing: 1, marginBottom: 3 }}>{label}</p>
                      <p style={{ fontSize: 13, fontWeight: 700, color: "#1a1a2e", margin: 0 }}>{value}</p>
                    </div>
                  ))}
                </div>
              </div>

              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: BLUE }}>
                    {[tr("المادة","Item"), tr("الوحدة","Unit"), tr("الكمية","Qty"), tr("سعر الوحدة","Unit Price"), tr("الإجمالي","Amount")].map((h, i) => (
                      <th key={i} style={{ padding: "11px 20px", fontSize: 11, fontWeight: 700, color: "#fff", textTransform: "uppercase", letterSpacing: 0.8, textAlign: i === 0 ? (isAr ? "right" : "left") : "center", borderLeft: i > 0 ? "1px solid rgba(255,255,255,0.15)" : "none" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {purchase.items?.map((item, i) => (
                    <tr key={i} style={{ background: i % 2 === 0 ? "#fff" : "#f9fafb", borderBottom: "1px solid #e8e8e8" }}>
                      <td style={{ padding: "12px 20px", fontSize: 13, color: "#222", fontWeight: 600, textAlign: isAr ? "right" : "left" }}>{getMaterialName(item)}</td>
                      <td style={{ padding: "12px 20px", fontSize: 12, color: "#777", textAlign: "center" }}>{getMaterialUnit(item)}</td>
                      <td style={{ padding: "12px 20px", fontSize: 13, color: "#555", textAlign: "center" }}>{item.quantity?.toLocaleString(isAr ? "ar-EG" : "en-US")}</td>
                      <td style={{ padding: "12px 20px", fontSize: 13, color: "#555", textAlign: "center" }}>{formatCurrency(item.unitPrice, lang)}</td>
                      <td style={{ padding: "12px 20px", fontSize: 14, fontWeight: 700, color: BLUE, textAlign: "center" }}>{formatCurrency(item.quantity * item.unitPrice, lang)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div style={{ padding: "16px 36px", display: "flex", justifyContent: isAr ? "flex-start" : "flex-end" }}>
                <div style={{ display: "flex" }}>
                  <div style={{ background: BLUE, color: "#fff", padding: "9px 22px", fontWeight: 800, fontSize: 13, borderRadius: "4px 0 0 4px", letterSpacing: 1 }}>{tr("الإجمالي الكلي", "GRAND TOTAL")}</div>
                  <div style={{ border: `2px solid ${BLUE}`, padding: "7px 22px", fontWeight: 900, fontSize: 16, minWidth: 160, textAlign: "center", color: BLUE, borderRadius: "0 4px 4px 0" }}>{formatCurrency(total, lang)}</div>
                </div>
              </div>

              {purchase.notes && (
                <div style={{ padding: "16px 36px", borderTop: "1px solid #eee", background: "#fafafa" }}>
                  <p style={{ fontSize: 11, fontWeight: 700, color: BLUE, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>{tr("ملاحظات", "Notes")}</p>
                  <p style={{ fontSize: 13, color: "#444", lineHeight: 1.6, margin: 0 }}>{purchase.notes}</p>
                </div>
              )}

              <div style={{ padding: "12px 36px", borderTop: "1px solid #eee", textAlign: "center", background: "#fafafa" }}>
                <p style={{ fontSize: 11, color: "#888", margin: 0 }}>
                  {tr("هذا مستند من إنتاج الكمبيوتر", "This is a computer-generated document")} — {new Date().toLocaleDateString(isAr ? "ar-EG" : "en-US")}
                </p>
              </div>

              <div style={{ display: "flex", height: 24 }}>
                <div style={{ width: "38%", background: BLUE }} />
                <div style={{ width: "2%",  background: "#fff" }} />
                <div style={{ flex: 1,      background: RED }} />
              </div>
            </div>
          </div>

          <div className="bg-gray-50 px-6 py-4 flex items-center justify-end gap-3 border-t border-gray-200 no-print">
            <button onClick={handlePrint} disabled={isPrinting} className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-semibold">
              <Printer size={18} />{tr("طباعة", "Print")}
            </button>
            <button onClick={onClose} className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition font-semibold">
              {tr("إغلاق", "Close")}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
