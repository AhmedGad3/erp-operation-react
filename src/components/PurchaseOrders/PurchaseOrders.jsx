import { useState, useEffect, useMemo, useContext } from "react";
import {
  Plus, Search, Eye, Download, ShoppingCart, Calendar,
  DollarSign, FileText, Printer, Package, X, Trash2,
  AlertCircle, TrendingUp, Clock, CheckCircle
} from "lucide-react";
import { toast } from "react-toastify";
import { formatCurrency, formatDateShort } from "../../utils/dateFormat";
import { exportToExcel } from "../../utils/excelExport";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import axiosInstance from "../../utils/axiosInstance";
import { LanguageContext } from "../../context/LanguageContext";
import megabuildLogo from "../../assets/megabuild1.svg";

/* ─── brand colors ─── */
const RED  = "#C41E3A";
const BLUE = "#003764";

export default function PurchaseOrders() {
  const { lang, t } = useContext(LanguageContext);
  const [purchases, setPurchases]               = useState([]);
  const [suppliers, setSuppliers]               = useState([]);
  const [materials, setMaterials]               = useState([]);
  const [units, setUnits]                       = useState([]);
  const [loading, setLoading]                   = useState(false);
  const [saving, setSaving]                     = useState(false);
  const [showModal, setShowModal]               = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(null);
  const [editingPurchase, setEditingPurchase]   = useState(null);
  const [searchTerm, setSearchTerm]             = useState("");
  const [filterSupplier, setFilterSupplier]     = useState("all");
  const [filterStatus, setFilterStatus]         = useState("all");
  const [toastMessage, setToastMessage]         = useState(null);

  const [formData, setFormData] = useState({
    supplierId: "",
    invoiceDate: new Date().toISOString().split("T")[0],
    supplierInvoiceNo: "",
    creditDays: 30,
    items: [{ materialId: "", quantity: 1, unitPrice: 0 }],
    notes: ""
  });

  const fetchPurchases = async () => {
    try {
      setLoading(true);
      const { data } = await axiosInstance.get("/purchases?lang=" + lang);
      setPurchases(data.result || []);
    } catch (err) {
      console.error(err);
      showToast(t?.errorLoadingPurchases || "Error loading purchases", "error");
    } finally {
      setLoading(false);
    }
  };

  const fetchUnits = async () => {
    try {
      const res = await axiosInstance.get("/units");
      setUnits(res.data.result || res.data);
    } catch (err) { console.error("Failed to load units", err); }
  };

  const fetchSuppliers = async () => {
    try {
      const { data } = await axiosInstance.get("/suppliers");
      setSuppliers(data.result || []);
    } catch (err) { console.error(err); }
  };

  const fetchMaterials = async () => {
    try {
      const { data } = await axiosInstance.get("/materials?lang=" + lang);
      setMaterials(data.result || []);
    } catch (err) { console.error(err); }
  };

  useEffect(() => {
    fetchPurchases(); fetchSuppliers(); fetchMaterials(); fetchUnits();
  }, [lang]);

  const showToast = (message, type) => {
    setToastMessage({ message, type });
    setTimeout(() => setToastMessage(null), 5000);
  };

  const calculateTotal   = (items) => items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
  const calculateDueDate = (invoiceDate, creditDays) => {
    const date = new Date(invoiceDate);
    date.setDate(date.getDate() + creditDays);
    return date.toISOString().split("T")[0];
  };

  const filteredPurchases = useMemo(() => {
    let filtered = purchases;
    if (filterSupplier !== "all")
      filtered = filtered.filter(p => (p.supplierId?._id || p.supplier?._id) === filterSupplier);
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(p =>
        p.supplierInvoiceNo?.toLowerCase().includes(term) ||
        p.supplierId?.nameEn?.toLowerCase().includes(term) ||
        p.supplierId?.nameAr?.includes(term) ||
        p.supplier?.nameEn?.toLowerCase().includes(term) ||
        p.supplier?.nameAr?.includes(term)
      );
    }
    return filtered;
  }, [purchases, filterSupplier, searchTerm]);

  const totalPurchases = filteredPurchases.length;
  const totalAmount    = filteredPurchases.reduce((sum, p) => sum + calculateTotal(p.items || []), 0);
  const totalItems     = filteredPurchases.reduce((sum, p) => sum + (p.items?.length || 0), 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.supplierId) { showToast(t?.selectSupplier || "Please select a supplier", "error"); return; }
    if (formData.items.length === 0 || !formData.items.some(i => i.materialId)) {
      showToast(t?.addAtLeastOneItem || "Please add at least one item", "error"); return;
    }
    setSaving(true);
    try {
      const payload = {
        supplierId: formData.supplierId,
        invoiceDate: formData.invoiceDate,
        supplierInvoiceNo: formData.supplierInvoiceNo,
        creditDays: parseInt(formData.creditDays),
        items: formData.items.filter(i => i.materialId && i.quantity > 0)
          .map(i => ({ materialId: i.materialId, quantity: parseFloat(i.quantity), unitPrice: parseFloat(i.unitPrice), unitId: i.unitId })),
        notes: formData.notes || ""
      };
      if (editingPurchase) {
        await axiosInstance.put(`/purchases/${editingPurchase._id}`, payload);
        showToast(t?.purchaseUpdated || "Purchase order updated successfully", "success");
      } else {
        await axiosInstance.post("/purchases", payload);
        showToast(t?.purchaseCreated || "Purchase order created successfully", "success");
      }
      setShowModal(false); setEditingPurchase(null); resetForm(); fetchPurchases();
    } catch (err) {
      console.error("Error saving purchase:", err);
      let errorMsg = "Error saving purchase order";
      if (err.response?.data?.message)
        errorMsg = Array.isArray(err.response.data.message) ? err.response.data.message.join(", ") : err.response.data.message;
      showToast(errorMsg, "error");
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => setFormData({
    supplierId: "", invoiceDate: new Date().toISOString().split("T")[0],
    supplierInvoiceNo: "", creditDays: 30,
    items: [{ materialId: "", unitId: "", quantity: 1, unitPrice: 0 }], notes: ""
  });

  const openAddModal     = () => { setEditingPurchase(null); resetForm(); setShowModal(true); };
  const openDetailsModal = (purchase) => setShowDetailsModal(purchase);

  const handleExportExcel = () => {
    try {
      if (filteredPurchases.length === 0) { showToast(t?.noDataToExport || "No data to export", "error"); return; }
      const data = filteredPurchases.map(p => ({
        [t?.invoiceNo  || "Invoice No"]:  p.supplierInvoiceNo,
        [t?.supplier   || "Supplier"]:    lang === "ar" ? (p.supplierId?.nameAr || p.supplier?.nameAr) : (p.supplierId?.nameEn || p.supplier?.nameEn),
        [t?.date       || "Date"]:        formatDateShort(p.invoiceDate, lang),
        [t?.itemsCount || "Items"]:       p.items?.length || 0,
        [t?.total      || "Total"]:       calculateTotal(p.items || []),
        [t?.creditDays || "Credit Days"]: p.creditDays,
        [t?.dueDate    || "Due Date"]:    formatDateShort(calculateDueDate(p.invoiceDate, p.creditDays), lang),
      }));
      exportToExcel(data, Object.keys(data[0]).map(k => ({ [k]: k })), "Purchase_Orders", lang);
      showToast(t?.exportedSuccessfully || "Exported successfully", "success");
    } catch (err) {
      console.error(err);
      showToast(t?.exportError || "Error exporting data", "error");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-8 px-4">
      {toastMessage && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-3 px-6 py-4 rounded-lg shadow-lg ${toastMessage.type === "success" ? "bg-green-500 text-white" : "bg-red-500 text-white"}`}>
          <AlertCircle className="w-5 h-5" /><span className="font-medium">{toastMessage.message}</span>
        </div>
      )}
      {loading && (
        <div className="fixed inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="text-center">
            <div className="animate-spin inline-block size-12 border-4 border-current border-t-transparent text-blue-600 rounded-full" />
            <p className="mt-4 text-gray-600 font-medium">{lang === "ar" ? "جاري تحميل البيانات..." : "Loading data..."}</p>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden mb-6">
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-8 py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <ShoppingCart className="w-8 h-8 text-white" />
                <div>
                  <h1 className="text-2xl font-bold text-white">{lang === "ar" ? "أوامر الشراء" : "Purchase Orders"}</h1>
                  <p className="text-blue-100 mt-1">{lang === "ar" ? "عرض وإدارة جميع أوامر الشراء" : "View and manage all purchase orders"}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button onClick={handleExportExcel} className="flex items-center gap-2 px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition font-semibold shadow-md">
                  <Download className="w-5 h-5" />{lang === "ar" ? "تصدير" : "Export"}
                </button>
                <button onClick={fetchPurchases} disabled={loading} className="p-3 bg-white text-blue-600 rounded-lg hover:bg-blue-50 transition shadow-md disabled:opacity-50">
                  <div className={loading ? "animate-spin" : ""}><i className="fa-solid fa-arrows-rotate" /></div>
                </button>
                <button onClick={openAddModal} className="flex items-center gap-2 px-6 py-3 bg-white text-blue-600 rounded-lg hover:bg-blue-50 transition font-semibold shadow-md">
                  <Plus className="w-5 h-5" />{lang === "ar" ? "إضافة أمر شراء" : "Add Purchase Order"}
                </button>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-6 bg-gray-50">
            <div className="bg-white p-4 rounded-lg border-l-4 border-blue-500">
              <div className="flex items-center justify-between"><div><p className="text-sm text-gray-600 mb-1">{lang === "ar" ? "إجمالي أوامر الشراء" : "Total Orders"}</p><p className="text-2xl font-bold text-gray-900">{totalPurchases}</p></div><ShoppingCart className="w-10 h-10 text-blue-500 opacity-20" /></div>
            </div>
            <div className="bg-white p-4 rounded-lg border-l-4 border-green-500">
              <div className="flex items-center justify-between"><div><p className="text-sm text-gray-600 mb-1">{lang === "ar" ? "إجمالي المبلغ" : "Total Amount"}</p><p className="text-2xl font-bold text-gray-900">{formatCurrency(totalAmount, lang)}</p></div><TrendingUp className="w-10 h-10 text-green-500 opacity-20" /></div>
            </div>
            <div className="bg-white p-4 rounded-lg border-l-4 border-purple-500">
              <div className="flex items-center justify-between"><div><p className="text-sm text-gray-600 mb-1">{lang === "ar" ? "إجمالي المواد" : "Total Items"}</p><p className="text-2xl font-bold text-gray-900">{totalItems}</p></div><Package className="w-10 h-10 text-purple-500 opacity-20" /></div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3.5 w-5 h-5 text-gray-400" />
              <input type="text" placeholder={lang === "ar" ? "بحث برقم الفاتورة أو المورد..." : "Search by invoice or supplier..."} value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition" dir={lang === "ar" ? "rtl" : "ltr"} />
            </div>
            <select value={filterSupplier} onChange={e => setFilterSupplier(e.target.value)} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition">
              <option value="all">{lang === "ar" ? "كل الموردين" : "All Suppliers"}</option>
              {suppliers.map(s => <option key={s._id} value={s._id}>{lang === "ar" ? s.nameAr : s.nameEn}</option>)}
            </select>
          </div>
          {(searchTerm || filterSupplier !== "all") && (
            <button onClick={() => { setSearchTerm(""); setFilterSupplier("all"); }} className="mt-4 text-sm text-blue-600 hover:text-blue-700 font-medium">
              {lang === "ar" ? "مسح الفلاتر" : "Clear Filters"}
            </button>
          )}
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          {!loading && filteredPurchases.length === 0 ? (
            <div className="p-12 text-center">
              <ShoppingCart className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">{lang === "ar" ? "لا توجد أوامر شراء" : "No Purchase Orders Found"}</h3>
              <p className="text-gray-600 mb-6">{lang === "ar" ? "لم يتم العثور على أوامر شراء مطابقة للفلاتر المحددة" : "No purchase orders match your current filters"}</p>
              <button onClick={openAddModal} className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-semibold">
                <Plus className="w-5 h-5" />{lang === "ar" ? "إضافة أول أمر شراء" : "Add First Purchase Order"}
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    {[lang === "ar" ? "رقم الفاتورة" : "Invoice No", lang === "ar" ? "المورد" : "Supplier", lang === "ar" ? "التاريخ" : "Date", lang === "ar" ? "المواد" : "Items", lang === "ar" ? "الإجمالي" : "Total", lang === "ar" ? "الائتمان" : "Credit", lang === "ar" ? "الاستحقاق" : "Due Date", lang === "ar" ? "إجراءات" : "Actions"].map((h, i) => (
                      <th key={i} className="px-6 py-4 text-left text-sm font-semibold text-gray-900">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredPurchases.map(purchase => (
                    <tr key={purchase._id} className="hover:bg-gray-50 transition">
                      <td className="px-6 py-4"><div className="flex items-center gap-2"><FileText className="w-4 h-4 text-blue-500" /><span className="font-medium text-gray-900">{purchase.invoiceNo || purchase.supplierInvoiceNo}</span></div></td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                            <span className="text-purple-600 font-semibold text-lg">{(lang === "ar" ? (purchase.supplierId?.nameAr || purchase.supplier?.nameAr) : (purchase.supplierId?.nameEn || purchase.supplier?.nameEn))?.charAt(0).toUpperCase()}</span>
                          </div>
                          <span className="font-medium text-gray-900">{lang === "ar" ? (purchase.supplierId?.nameAr || purchase.supplier?.nameAr) : (purchase.supplierId?.nameEn || purchase.supplier?.nameEn)}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4"><div className="flex items-center gap-2 text-gray-700"><Calendar className="w-4 h-4 text-gray-400" />{formatDateShort(purchase.invoiceDate, lang)}</div></td>
                      <td className="px-6 py-4"><span className="px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-200">{purchase.items?.length || 0} {lang === "ar" ? "مادة" : "items"}</span></td>
                      <td className="px-6 py-4"><span className="font-semibold text-gray-900">{formatCurrency(calculateTotal(purchase.items || []), lang)}</span></td>
                      <td className="px-6 py-4"><div className="flex items-center gap-2 text-gray-700"><Clock className="w-4 h-4 text-gray-400" />{purchase.creditDays} {lang === "ar" ? "يوم" : "days"}</div></td>
                      <td className="px-6 py-4 text-gray-700">{formatDateShort(calculateDueDate(purchase.invoiceDate, purchase.creditDays), lang)}</td>
                      <td className="px-6 py-4">
                        <button onClick={() => openDetailsModal(purchase)} className="flex items-center gap-1 px-3 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition font-medium">
                          <Eye className="w-4 h-4" />{lang === "ar" ? "عرض" : "View"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {showModal && (
        <PurchaseModal formData={formData} setFormData={setFormData} suppliers={suppliers} materials={materials} units={units}
          onClose={() => { setShowModal(false); setEditingPurchase(null); resetForm(); }}
          onSubmit={handleSubmit} saving={saving} editing={!!editingPurchase} t={t} lang={lang} />
      )}
      {showDetailsModal && (
        <PurchaseDetailsModal purchase={showDetailsModal} onClose={() => setShowDetailsModal(null)}
          t={t} lang={lang} calculateTotal={calculateTotal} />
      )}
    </div>
  );
}

// ═══════════════════════════════════════════
// PURCHASE MODAL (unchanged from original)
// ═══════════════════════════════════════════
function PurchaseModal({ formData, setFormData, suppliers, materials, units, onClose, onSubmit, saving, editing, t, lang }) {
  const handleAddItem    = () => setFormData({ ...formData, items: [...formData.items, { materialId: "", unitId: "", quantity: 1, unitPrice: 0 }] });
  const handleRemoveItem = (i) => setFormData({ ...formData, items: formData.items.filter((_, idx) => idx !== i) });
  const handleItemChange = (i, field, value) => { const items = [...formData.items]; items[i][field] = value; setFormData({ ...formData, items }); };
  const calculateTotal   = () => formData.items.reduce((s, i) => s + (parseFloat(i.quantity || 0) * parseFloat(i.unitPrice || 0)), 0);
  const getMaterialName  = (id) => { const m = materials.find(m => m._id === id); return m ? (lang === "ar" ? m.nameAr : m.nameEn) : ""; };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6 flex items-center justify-between">
          <div className="flex items-center gap-3"><Package size={28} /><h3 className="text-2xl font-bold">{editing ? (lang === "ar" ? "تعديل أمر الشراء" : "Edit Purchase Order") : (lang === "ar" ? "إضافة أمر شراء جديد" : "New Purchase Order")}</h3></div>
          <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-lg transition-colors"><X size={24} /></button>
        </div>
        <div className="overflow-y-auto max-h-[calc(90vh-140px)]">
          <div className="p-6 space-y-6">
            <div className="bg-gray-50 rounded-lg p-4 space-y-4">
              <h4 className="font-semibold text-gray-700 flex items-center gap-2"><FileText size={20} />{lang === "ar" ? "المعلومات الأساسية" : "Basic Information"}</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">{lang === "ar" ? "المورد" : "Supplier"} <span className="text-red-500">*</span></label>
                  <select value={formData.supplierId} onChange={e => setFormData({ ...formData, supplierId: e.target.value })} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" required dir={lang === "ar" ? "rtl" : "ltr"}>
                    <option value="">{lang === "ar" ? "اختر المورد" : "Select Supplier"}</option>
                    {suppliers.map(s => <option key={s._id} value={s._id}>{lang === "ar" ? s.nameAr : s.nameEn}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">{lang === "ar" ? "رقم فاتورة المورد" : "Supplier Invoice No"}</label>
                  <Input type="text" value={formData.supplierInvoiceNo} onChange={e => setFormData({ ...formData, supplierInvoiceNo: e.target.value })} placeholder={lang === "ar" ? "أدخل رقم الفاتورة" : "Enter invoice number"} dir={lang === "ar" ? "rtl" : "ltr"} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2"><Calendar size={16} className="inline mr-1" />{lang === "ar" ? "تاريخ الفاتورة" : "Invoice Date"} <span className="text-red-500">*</span></label>
                  <Input type="date" value={formData.invoiceDate} onChange={e => setFormData({ ...formData, invoiceDate: e.target.value })} required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">{lang === "ar" ? "أيام الائتمان" : "Credit Days"}</label>
                  <Input type="number" value={formData.creditDays} onChange={e => setFormData({ ...formData, creditDays: e.target.value })} min="0" dir={lang === "ar" ? "rtl" : "ltr"} />
                </div>
              </div>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold text-gray-700 flex items-center gap-2"><Package size={20} />{lang === "ar" ? "المواد" : "Items"} <span className="text-red-500">*</span></h4>
                <Button type="button" onClick={handleAddItem} className="bg-green-500 hover:bg-green-600 text-white" size="sm"><Plus size={16} className="mr-1" />{lang === "ar" ? "إضافة مادة" : "Add Item"}</Button>
              </div>
              <div className="space-y-3">
                {formData.items.map((item, index) => (
                  <div key={index} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                      <div className="md:col-span-5">
                        <label className="block text-xs font-medium text-gray-600 mb-1">{lang === "ar" ? "المادة" : "Material"}</label>
                        <select value={item.materialId} onChange={e => { const materialId = e.target.value; const material = materials.find(m => m._id === materialId); const newItems = [...formData.items]; newItems[index] = { ...newItems[index], materialId, unitId: material?.baseUnit || "" }; setFormData({ ...formData, items: newItems }); }} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm" dir={lang === "ar" ? "rtl" : "ltr"}>
                          <option value="">{lang === "ar" ? "اختر المادة" : "Select Material"}</option>
                          {materials.map(m => <option key={m._id} value={m._id}>{lang === "ar" ? m.nameAr : m.nameEn}</option>)}
                        </select>
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-xs font-medium text-gray-600 mb-1">{lang === "ar" ? "الوحدة" : "Unit"}</label>
                        <select value={item.unitId} onChange={e => handleItemChange(index, "unitId", e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" disabled={!item.materialId}>
                          <option value="">{lang === "ar" ? "اختر الوحدة" : "Select Unit"}</option>
                          {item.materialId && (() => { const material = materials.find(m => m._id === item.materialId); if (!material) return null; const avail = []; if (material.baseUnit) { const u = units.find(u => u._id === material.baseUnit); if (u) avail.push(u); } (material.alternativeUnits || []).forEach(id => { const u = units.find(u => u._id === id); if (u) avail.push(u); }); return avail.map(u => <option key={u._id} value={u._id}>{lang === "ar" ? u.nameAr : u.nameEn}</option>); })()}
                        </select>
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-xs font-medium text-gray-600 mb-1">{lang === "ar" ? "الكمية" : "Quantity"}</label>
                        <Input type="number" value={item.quantity} onChange={e => handleItemChange(index, "quantity", e.target.value)} min="0.01" step="0.01" required className="text-sm" dir={lang === "ar" ? "rtl" : "ltr"} />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-xs font-medium text-gray-600 mb-1"><DollarSign size={14} className="inline" />{lang === "ar" ? "سعر الوحدة" : "Unit Price"}</label>
                        <Input type="number" value={item.unitPrice} onChange={e => handleItemChange(index, "unitPrice", e.target.value)} min="0" step="0.01" required className="text-sm" dir={lang === "ar" ? "rtl" : "ltr"} />
                      </div>
                      <div className="md:col-span-1 flex justify-end">
                        {formData.items.length > 1 && <button type="button" onClick={() => handleRemoveItem(index)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={18} /></button>}
                      </div>
                    </div>
                    {item.materialId && (
                      <div className="mt-3 pt-3 border-t border-gray-200 flex justify-between items-center text-sm">
                        <span className="text-gray-600">{getMaterialName(item.materialId)}</span>
                        <span className="font-semibold text-gray-900">{lang === "ar" ? "المجموع:" : "Subtotal:"} {formatCurrency((item.quantity || 0) * (item.unitPrice || 0), lang)}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-semibold text-gray-700">{lang === "ar" ? "الإجمالي الكلي:" : "Grand Total:"}</span>
                  <span className="text-xl font-semibold text-blue-600">{formatCurrency(calculateTotal(), lang)}</span>
                </div>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">{lang === "ar" ? "ملاحظات" : "Notes"}</label>
              <textarea value={formData.notes} onChange={e => setFormData({ ...formData, notes: e.target.value })} rows={3} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 resize-none" placeholder={lang === "ar" ? "أضف ملاحظات إضافية..." : "Add additional notes..."} dir={lang === "ar" ? "rtl" : "ltr"} />
            </div>
          </div>
        </div>
        <div className="bg-gray-50 px-6 py-4 flex items-center justify-end gap-3 border-t border-gray-200">
          <button type="button" onClick={onClose} disabled={saving} className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition font-semibold">{lang === "ar" ? "إلغاء" : "Cancel"}</button>
          <button type="button" onClick={e => onSubmit(e)} disabled={saving} className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition font-semibold min-w-[120px]">
            {saving ? <div className="flex items-center justify-center gap-2"><div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />{lang === "ar" ? "جاري الحفظ..." : "Saving..."}</div> : <>{lang === "ar" ? "حفظ" : "Save"}</>}
          </button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════
// PURCHASE DETAILS MODAL — Mega Build branded
// ═══════════════════════════════════════════
function PurchaseDetailsModal({ purchase, onClose, calculateTotal }) {
  const { lang } = useContext(LanguageContext);
  const isAr = lang === "ar";
  const t    = (ar, en) => isAr ? ar : en;

  const [isPrinting, setIsPrinting] = useState(false);
  const [materials, setMaterials]   = useState([]);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await axiosInstance.get("/materials?lang=" + lang);
        setMaterials(data.result || []);
      } catch (err) { console.error(err); }
    })();
  }, [lang]);

  const getMaterialName = (item) => {
    if (item.material) return isAr ? item.material?.nameAr : item.material?.nameEn;
    const m = materials.find(m => m._id === item.materialId);
    return m ? (isAr ? m.nameAr : m.nameEn) : t("غير معروف", "Unknown");
  };

  const getMaterialUnit = (item) => {
    if (item.material) return isAr ? item.material?.unitAr : item.material?.unitEn;
    const m = materials.find(m => m._id === item.materialId);
    return m ? (isAr ? m.unitAr : m.unitEn) : "";
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

  const handlePrint = () => {
    setIsPrinting(true);
    setTimeout(() => { window.print(); setIsPrinting(false); }, 100);
  };

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
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden">

          {/* modal title bar (no-print) */}
          <div className="bg-gradient-to-r from-red-700 to-blue-900 text-white p-2 no-print flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FileText size={24} />
              <h3 className="text-xl font-bold">{t("تفاصيل أمر الشراء", "Purchase Order Details")}</h3>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-lg transition-colors"><X size={22} /></button>
          </div>

          {/* ══ PRINTABLE CONTENT ══ */}
          <div id="printable-invoice" className="overflow-y-auto max-h-[calc(90vh-130px)]">
            <div style={{ background: "#fff", fontFamily: isAr ? "Tahoma,Arial,sans-serif" : "Segoe UI,Arial,sans-serif", direction: isAr ? "rtl" : "ltr" }}>

              {/* ── HEADER: لوجو يسار — MEGA BUILD + بيانات يمين ── */}
              <div style={{ padding: "24px 36px 18px", borderBottom: "1px solid #eee", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>

                {/* يسار: اللوجو */}
                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
                  <img src={megabuildLogo} alt="Mega Build" style={{ width: 70, height: 70, objectFit: "contain" }} />
                  <p style={{ fontSize: 8, color: "#aaa", marginTop: 3, letterSpacing: 0.8 }}>{t("نبني القيمة", "We Build Value")}</p>
                </div>

                {/* يمين: MEGA BUILD + بيانات + badge */}
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
                    <span style={{ fontSize: 13, fontWeight: 800, letterSpacing: 1 }}>{t("أمر شراء", "PURCHASE ORDER")}</span>
                  </div>
                  <p style={{ fontSize: 12, color: "#555", margin: 0 }}>
                    <strong style={{ color: BLUE }}>{t("رقم:", "No:")}</strong>{" "}
                    {purchase.invoiceNo || purchase.supplierInvoiceNo || t("غير محدد", "N/A")}
                  </p>
                </div>
              </div>

              {/* ── Red divider ── */}
              <div style={{ height: 3, background: RED }} />
              <div style={{ height: 1, background: "#eee" }} />

              {/* ── SUPPLIER / DATES ── */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr" }}>
                <div style={{ padding: "20px 36px", borderBottom: "1px solid #eee", borderInlineEnd: "1px solid #eee" }}>
                  <p style={{ fontSize: 10, fontWeight: 700, color: "#888", textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>{t("المورد", "Supplier")}</p>
                  <p style={{ fontSize: 16, fontWeight: 800, color: "#1a1a2e", margin: 0 }}>{supplierName}</p>
                </div>
                <div style={{ padding: "20px 36px", borderBottom: "1px solid #eee", display: "flex", flexDirection: "column", gap: 10 }}>
                  {[
                    [t("فاتورة المورد",   "Supplier Invoice"), purchase.supplierInvoiceNo],
                    [t("تاريخ الفاتورة", "Invoice Date"),     formatDateShort(purchase.invoiceDate, lang)],
                    [t("تاريخ الاستحقاق","Due Date"),         formatDateShort(dueDate, lang)],
                    [t("أيام الائتمان",  "Credit Days"),      `${purchase.creditDays} ${t("يوم", "days")}`],
                  ].map(([label, value], i) => (
                    <div key={i} style={{ textAlign: isAr ? "left" : "right" }}>
                      <p style={{ fontSize: 10, fontWeight: 700, color: "#888", textTransform: "uppercase", letterSpacing: 1, marginBottom: 3 }}>{label}</p>
                      <p style={{ fontSize: 13, fontWeight: 700, color: "#1a1a2e", margin: 0 }}>{value}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* ── ITEMS TABLE ── */}
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: BLUE }}>
                    {[t("المادة","Item"), t("الوحدة","Unit"), t("الكمية","Qty"), t("سعر الوحدة","Unit Price"), t("الإجمالي","Amount")].map((h, i) => (
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

              {/* ── TOTAL ── */}
              <div style={{ padding: "16px 36px", display: "flex", justifyContent: isAr ? "flex-start" : "flex-end" }}>
                <div style={{ display: "flex" }}>
                  <div style={{ background: BLUE, color: "#fff", padding: "9px 22px", fontWeight: 800, fontSize: 13, borderRadius: "4px 0 0 4px", letterSpacing: 1 }}>{t("الإجمالي الكلي", "GRAND TOTAL")}</div>
                  <div style={{ border: `2px solid ${BLUE}`, padding: "7px 22px", fontWeight: 900, fontSize: 16, minWidth: 160, textAlign: "center", color: BLUE, borderRadius: "0 4px 4px 0" }}>{formatCurrency(total, lang)}</div>
                </div>
              </div>

              {/* ── NOTES (dynamic) ── */}
              {purchase.notes && (
                <div style={{ padding: "16px 36px", borderTop: "1px solid #eee", background: "#fafafa" }}>
                  <p style={{ fontSize: 11, fontWeight: 700, color: BLUE, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>{t("ملاحظات", "Notes")}</p>
                  <p style={{ fontSize: 13, color: "#444", lineHeight: 1.6, margin: 0 }}>{purchase.notes}</p>
                </div>
              )}

              {/* ── FOOTER TEXT ── */}
              <div style={{ padding: "12px 36px", borderTop: "1px solid #eee", textAlign: "center", background: "#fafafa" }}>
                <p style={{ fontSize: 11, color: "#888", margin: 0 }}>
                  {t("هذا مستند من إنتاج الكمبيوتر", "This is a computer-generated document")} — {new Date().toLocaleDateString(isAr ? "ar-EG" : "en-US")}
                </p>
              </div>

              {/* ── FOOTER BAR ── */}
              <div style={{ display: "flex", height: 24 }}>
                <div style={{ width: "38%", background: BLUE }} />
                <div style={{ width: "2%",  background: "#fff" }} />
                <div style={{ flex: 1,      background: RED }} />
              </div>

            </div>
          </div>

          {/* action buttons (no-print) */}
          <div className="bg-gray-50 px-6 py-4 flex items-center justify-end gap-3 border-t border-gray-200 no-print">
            <button onClick={handlePrint} disabled={isPrinting} className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-semibold">
              <Printer size={18} />{t("طباعة", "Print")}
            </button>
            <button onClick={onClose} className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition font-semibold">
              {t("إغلاق", "Close")}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}