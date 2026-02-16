import { useState, useEffect, useMemo, useContext } from "react";
import {
  Plus,
  Search,
  Eye,
  Download,
  ShoppingCart,
  Calendar,
  DollarSign,
  FileText,
  Printer,
  Package,
  X,
  Trash2,
  AlertCircle,
  TrendingUp,
  Clock,
  CheckCircle
} from "lucide-react";

import { toast } from "react-toastify";
import { formatCurrency, formatDateShort } from "../../utils/dateFormat";
import { exportToExcel } from "../../utils/excelExport";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import axiosInstance from "../../utils/axiosInstance";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";
import { LanguageContext } from "../../context/LanguageContext";

export default function PurchaseOrders() {
  const { lang, t } = useContext(LanguageContext);
  const [purchases, setPurchases] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [units, setUnits] = useState([]);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  
  const [showModal, setShowModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(null);
  const [editingPurchase, setEditingPurchase] = useState(null);
  
  const [searchTerm, setSearchTerm] = useState("");
  const [filterSupplier, setFilterSupplier] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [toastMessage, setToastMessage] = useState(null);

  const [formData, setFormData] = useState({
    supplierId: "",
    invoiceDate: new Date().toISOString().split("T")[0],
    supplierInvoiceNo: "",
    creditDays: 30,
    items: [{ materialId: "", quantity: 1, unitPrice: 0 }],
    notes: ""
  });

  // ================= FETCH DATA =================
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
    } catch (err) {
      console.error("Failed to load units", err);
    }
  };

  const fetchSuppliers = async () => {
    try {
      const { data } = await axiosInstance.get("/suppliers");
      setSuppliers(data.result || []);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchMaterials = async () => {
    try {
      const { data } = await axiosInstance.get("/materials?lang=" + lang);
      setMaterials(data.result || []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchPurchases();
    fetchSuppliers();
    fetchMaterials();
    fetchUnits();
  }, [lang]);

  // ================= TOAST =================
  const showToast = (message, type) => {
    setToastMessage({ message, type });
    setTimeout(() => setToastMessage(null), 5000);
  };

  // ================= CALCULATIONS =================
  const calculateTotal = (items) => {
    return items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
  };

  const calculateDueDate = (invoiceDate, creditDays) => {
    const date = new Date(invoiceDate);
    date.setDate(date.getDate() + creditDays);
    return date.toISOString().split("T")[0];
  };

  // ================= FILTER =================
  const filteredPurchases = useMemo(() => {
    let filtered = purchases;

    // Filter by supplier
    if (filterSupplier !== "all") {
      filtered = filtered.filter(p => (p.supplierId?._id || p.supplier?._id) === filterSupplier);
    }

    // Filter by search term
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

  // ================= STATS =================
  const totalPurchases = filteredPurchases.length;
  const totalAmount = filteredPurchases.reduce((sum, p) => sum + calculateTotal(p.items || []), 0);
  const totalItems = filteredPurchases.reduce((sum, p) => sum + (p.items?.length || 0), 0);

  // ================= SUBMIT =================
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.supplierId) {
      showToast(t?.selectSupplier || "Please select a supplier", "error");
      return;
    }

    if (formData.items.length === 0 || !formData.items.some(item => item.materialId)) {
      showToast(t?.addAtLeastOneItem || "Please add at least one item", "error");
      return;
    }

    setSaving(true);

    try {
      const payload = {
        supplierId: formData.supplierId,
        invoiceDate: formData.invoiceDate,
        supplierInvoiceNo: formData.supplierInvoiceNo,
        creditDays: parseInt(formData.creditDays),
        items: formData.items
          .filter(item => item.materialId && item.quantity > 0)
          .map(item => ({
            materialId: item.materialId,
            quantity: parseFloat(item.quantity),
            unitPrice: parseFloat(item.unitPrice),
            unitId: item.unitId
          })),
        notes: formData.notes || ""
      };

      if (editingPurchase) {
        await axiosInstance.put(`/purchases/${editingPurchase._id}`, payload);
        showToast(t?.purchaseUpdated || "Purchase order updated successfully", "success");
      } else {
        await axiosInstance.post("/purchases", payload);
        showToast(t?.purchaseCreated || "Purchase order created successfully", "success");
      }

      setShowModal(false);
      setEditingPurchase(null);
      resetForm();
      fetchPurchases();

    } catch (err) {
      console.error("Error saving purchase:", err);
      
      let errorMsg = "Error saving purchase order";
      if (err.response?.data?.message) {
        errorMsg = Array.isArray(err.response.data.message) 
          ? err.response.data.message.join(", ")
          : err.response.data.message;
      }
      
      showToast(errorMsg, "error");
    } finally {
      setSaving(false);
    }
  };

  // ================= HELPERS =================
  const resetForm = () => {
    setFormData({
      supplierId: "",
      invoiceDate: new Date().toISOString().split("T")[0],
      supplierInvoiceNo: "",
      creditDays: 30,
      items: [{ materialId: "", unitId: "", quantity: 1, unitPrice: 0 }],
      notes: ""
    });
  };

  const openAddModal = () => {
    setEditingPurchase(null);
    resetForm();
    setShowModal(true);
  };

  const openDetailsModal = async (purchase) => {
    setShowDetailsModal(purchase);
  };

  // ================= EXPORT =================
  const handleExportExcel = () => {
    try {
      if (filteredPurchases.length === 0) {
        showToast(t?.noDataToExport || "No data to export", "error");
        return;
      }

      const data = filteredPurchases.map((p) => ({
        [t?.invoiceNo || "Invoice No"]: p.supplierInvoiceNo,
        [t?.supplier || "Supplier"]: lang === "ar" ? (p.supplierId?.nameAr || p.supplier?.nameAr) : (p.supplierId?.nameEn || p.supplier?.nameEn),
        [t?.date || "Date"]: formatDateShort(p.invoiceDate, lang),
        [t?.itemsCount || "Items"]: p.items?.length || 0,
        [t?.total || "Total"]: calculateTotal(p.items || []),
        [t?.creditDays || "Credit Days"]: p.creditDays,
        [t?.dueDate || "Due Date"]: formatDateShort(calculateDueDate(p.invoiceDate, p.creditDays), lang),
      }));

      const headers = Object.keys(data[0]).map(key => ({ [key]: key }));
      
      exportToExcel(data, headers, "Purchase_Orders", lang);
      
      showToast(t?.exportedSuccessfully || "Exported successfully", "success");
    } catch (err) {
      console.error(err);
      showToast(t?.exportError || "Error exporting data", "error");
    }
  };

  // ================= UI =================
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-8 px-4">
      {/* Toast */}
      {toastMessage && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-3 px-6 py-4 rounded-lg shadow-lg ${
          toastMessage.type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
        }`}>
          <AlertCircle className="w-5 h-5" />
          <span className="font-medium">{toastMessage.message}</span>
        </div>
      )}

      {/* Loading Overlay */}
      {loading && (
        <div className="fixed inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="text-center">
            <div className="animate-spin inline-block size-12 border-4 border-current border-t-transparent text-blue-600 rounded-full" role="status" aria-label="loading">
              <span className="sr-only">Loading...</span>
            </div>
            <p className="mt-4 text-gray-600 font-medium">
              {lang === "ar" ? "جاري تحميل البيانات..." : "Loading data..."}
            </p>
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
                  <h1 className="text-2xl font-bold text-white">
                    {lang === "ar" ? "أوامر الشراء" : "Purchase Orders"}
                  </h1>
                  <p className="text-blue-100 mt-1">
                    {lang === "ar" ? "عرض وإدارة جميع أوامر الشراء" : "View and manage all purchase orders"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={handleExportExcel}
                  className="flex items-center gap-2 px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition font-semibold shadow-md"
                >
                  <Download className="w-5 h-5" />
                  {lang === "ar" ? "تصدير" : "Export"}
                </button>
                <button
                  onClick={fetchPurchases}
                  disabled={loading}
                  className="p-3 bg-white text-blue-600 rounded-lg hover:bg-blue-50 transition shadow-md disabled:opacity-50"
                  title={lang === "ar" ? "تحديث" : "Refresh"}
                >
                  <div className={loading ? "animate-spin" : ""}>
                    <i className="fa-solid fa-arrows-rotate"></i>
                  </div>
                </button>
                <button
                  onClick={openAddModal}
                  className="flex items-center gap-2 px-6 py-3 bg-white text-blue-600 rounded-lg hover:bg-blue-50 transition font-semibold shadow-md"
                >
                  <Plus className="w-5 h-5" />
                  {lang === "ar" ? "إضافة أمر شراء" : "Add Purchase Order"}
                </button>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-6 bg-gray-50">
            <div className="bg-white p-4 rounded-lg border-l-4 border-blue-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">
                    {lang === "ar" ? "إجمالي أوامر الشراء" : "Total Orders"}
                  </p>
                  <p className="text-2xl font-bold text-gray-900">{totalPurchases}</p>
                </div>
                <ShoppingCart className="w-10 h-10 text-blue-500 opacity-20" />
              </div>
            </div>
            <div className="bg-white p-4 rounded-lg border-l-4 border-green-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">
                    {lang === "ar" ? "إجمالي المبلغ" : "Total Amount"}
                  </p>
                  <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalAmount, lang)}</p>
                </div>
                <TrendingUp className="w-10 h-10 text-green-500 opacity-20" />
              </div>
            </div>
            <div className="bg-white p-4 rounded-lg border-l-4 border-purple-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">
                    {lang === "ar" ? "إجمالي المواد" : "Total Items"}
                  </p>
                  <p className="text-2xl font-bold text-gray-900">{totalItems}</p>
                </div>
                <Package className="w-10 h-10 text-purple-500 opacity-20" />
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-3.5 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder={lang === "ar" ? "بحث برقم الفاتورة أو المورد..." : "Search by invoice or supplier..."}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                dir={lang === "ar" ? "rtl" : "ltr"}
              />
            </div>

            {/* Supplier Filter */}
            <select
              value={filterSupplier}
              onChange={(e) => setFilterSupplier(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
            >
              <option value="all">{lang === "ar" ? "كل الموردين" : "All Suppliers"}</option>
              {suppliers.map((supplier) => (
                <option key={supplier._id} value={supplier._id}>
                  {lang === "ar" ? supplier.nameAr : supplier.nameEn}
                </option>
              ))}
            </select>
          </div>

          {/* Clear Filters */}
          {(searchTerm || filterSupplier !== 'all') && (
            <button
              onClick={() => {
                setSearchTerm('');
                setFilterSupplier('all');
              }}
              className="mt-4 text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              {lang === "ar" ? "مسح الفلاتر" : "Clear Filters"}
            </button>
          )}
        </div>

        {/* Purchase Orders Table */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          {!loading && filteredPurchases.length === 0 ? (
            <div className="p-12 text-center">
              <ShoppingCart className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                {lang === "ar" ? "لا توجد أوامر شراء" : "No Purchase Orders Found"}
              </h3>
              <p className="text-gray-600 mb-6">
                {lang === "ar" ? "لم يتم العثور على أوامر شراء مطابقة للفلاتر المحددة" : "No purchase orders match your current filters"}
              </p>
              <button
                onClick={openAddModal}
                className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-semibold"
              >
                <Plus className="w-5 h-5" />
                {lang === "ar" ? "إضافة أول أمر شراء" : "Add First Purchase Order"}
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                      {lang === "ar" ? "رقم الفاتورة" : "Invoice No"}
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                      {lang === "ar" ? "المورد" : "Supplier"}
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                      {lang === "ar" ? "التاريخ" : "Date"}
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                      {lang === "ar" ? "المواد" : "Items"}
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                      {lang === "ar" ? "الإجمالي" : "Total"}
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                      {lang === "ar" ? "الائتمان" : "Credit"}
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                      {lang === "ar" ? "الاستحقاق" : "Due Date"}
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                      {lang === "ar" ? "إجراءات" : "Actions"}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredPurchases.map((purchase) => (
                    <tr key={purchase._id} className="hover:bg-gray-50 transition">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-blue-500" />
                          <span className="font-medium text-gray-900">
                            {purchase.invoiceNo || purchase.supplierInvoiceNo}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                            <span className="text-purple-600 font-semibold text-lg">
                              {(lang === "ar" ? (purchase.supplierId?.nameAr || purchase.supplier?.nameAr) : (purchase.supplierId?.nameEn || purchase.supplier?.nameEn))?.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <span className="font-medium text-gray-900">
                            {lang === "ar" ? (purchase.supplierId?.nameAr || purchase.supplier?.nameAr) : (purchase.supplierId?.nameEn || purchase.supplier?.nameEn)}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 text-gray-700">
                          <Calendar className="w-4 h-4 text-gray-400" />
                          {formatDateShort(purchase.invoiceDate, lang)}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-200">
                          {purchase.items?.length || 0} {lang === "ar" ? "مادة" : "items"}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-semibold text-gray-900">
                          {formatCurrency(calculateTotal(purchase.items || []), lang)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 text-gray-700">
                          <Clock className="w-4 h-4 text-gray-400" />
                          {purchase.creditDays} {lang === "ar" ? "يوم" : "days"}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-gray-700">
                        {formatDateShort(calculateDueDate(purchase.invoiceDate, purchase.creditDays), lang)}
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => openDetailsModal(purchase)}
                          className="flex items-center gap-1 px-3 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition font-medium"
                        >
                          <Eye className="w-4 h-4" />
                          {lang === "ar" ? "عرض" : "View"}
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

      {/* Modals */}
      {showModal && (
        <PurchaseModal
          formData={formData}
          setFormData={setFormData}
          suppliers={suppliers}
          materials={materials}
          units={units}
          onClose={() => {
            setShowModal(false);
            setEditingPurchase(null);
            resetForm();
          }}
          onSubmit={handleSubmit}
          saving={saving}
          editing={!!editingPurchase}
          t={t}
          lang={lang}
        />
      )}

      {showDetailsModal && (
        <PurchaseDetailsModal
          purchase={showDetailsModal}
          onClose={() => setShowDetailsModal(null)}
          t={t}
          lang={lang}
          calculateTotal={calculateTotal}
        />
      )}
    </div>
  );
}

// ================= PURCHASE MODAL (Add/Edit) =================
function PurchaseModal({
  formData,
  setFormData,
  suppliers,
  materials,
  units,
  onClose,
  onSubmit,
  saving,
  editing,
  t,
  lang
}) {

  const handleAddItem = () => {
    setFormData({
      ...formData,
      items: [...formData.items, { materialId: "", unitId: "", quantity: 1, unitPrice: 0 }]
    });
  };

  const handleRemoveItem = (index) => {
    const newItems = formData.items.filter((_, i) => i !== index);
    setFormData({ ...formData, items: newItems });
  };

  const handleItemChange = (index, field, value) => {
    const newItems = [...formData.items];
    newItems[index][field] = value;
    setFormData({ ...formData, items: newItems });
  };

  const calculateTotal = () => {
    return formData.items.reduce((sum, item) => {
      return sum + (parseFloat(item.quantity || 0) * parseFloat(item.unitPrice || 0));
    }, 0);
  };

  const getMaterialName = (materialId) => {
    const material = materials.find(m => m._id === materialId);
    return material ? (lang === "ar" ? material.nameAr : material.nameEn) : "";
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    onSubmit(e);
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Package size={28} />
            <h3 className="text-2xl font-bold">
              {editing
                ? (lang === "ar" ? "تعديل أمر الشراء" : "Edit Purchase Order")
                : (lang === "ar" ? "إضافة أمر شراء جديد" : "New Purchase Order")}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-lg transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(90vh-140px)]">
          <div className="p-6 space-y-6">
            {/* Basic Information */}
            <div className="bg-gray-50 rounded-lg p-4 space-y-4">
              <h4 className="font-semibold text-gray-700 flex items-center gap-2">
                <FileText size={20} />
                {lang === "ar" ? "المعلومات الأساسية" : "Basic Information"}
              </h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Supplier */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {lang === "ar" ? "المورد" : "Supplier"} <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.supplierId}
                    onChange={(e) => setFormData({ ...formData, supplierId: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                    dir={lang === "ar" ? "rtl" : "ltr"}
                  >
                    <option value="">
                      {lang === "ar" ? "اختر المورد" : "Select Supplier"}
                    </option>
                    {suppliers.map((supplier) => (
                      <option key={supplier._id} value={supplier._id}>
                        {lang === "ar" ? supplier.nameAr : supplier.nameEn}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Invoice Number */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {lang === "ar" ? "رقم فاتورة المورد" : "Supplier Invoice No"}
                  </label>
                  <Input
                    type="text"
                    value={formData.supplierInvoiceNo}
                    onChange={(e) => setFormData({ ...formData, supplierInvoiceNo: e.target.value })}
                    placeholder={lang === "ar" ? "أدخل رقم الفاتورة" : "Enter invoice number"}
                    dir={lang === "ar" ? "rtl" : "ltr"}
                  />
                </div>

                {/* Invoice Date */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Calendar size={16} className="inline mr-1" />
                    {lang === "ar" ? "تاريخ الفاتورة" : "Invoice Date"} <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="date"
                    value={formData.invoiceDate}
                    onChange={(e) => setFormData({ ...formData, invoiceDate: e.target.value })}
                    required
                  />
                </div>

                {/* Credit Days */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {lang === "ar" ? "أيام الائتمان" : "Credit Days"}
                  </label>
                  <Input
                    type="number"
                    value={formData.creditDays}
                    onChange={(e) => setFormData({ ...formData, creditDays: e.target.value })}
                    min="0"
                    dir={lang === "ar" ? "rtl" : "ltr"}
                  />
                </div>
              </div>
            </div>

            {/* Items Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold text-gray-700 flex items-center gap-2">
                  <Package size={20} />
                  {lang === "ar" ? "المواد" : "Items"} <span className="text-red-500">*</span>
                </h4>
                <Button
                  type="button"
                  onClick={handleAddItem}
                  className="bg-green-500 hover:bg-green-600 text-white"
                  size="sm"
                >
                  <Plus size={16} className="mr-1" />
                  {lang === "ar" ? "إضافة مادة" : "Add Item"}
                </Button>
              </div>

              <div className="space-y-3">
                {formData.items.map((item, index) => (
                  <div
                    key={index}
                    className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                      {/* Material */}
                      <div className="md:col-span-5">
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          {lang === "ar" ? "المادة" : "Material"}
                        </label>
                        <select
                          value={item.materialId}
                          onChange={(e) => {
                            const materialId = e.target.value;
                            const material = materials.find(m => m._id === materialId);
                            const defaultUnitId = material?.baseUnit || "";
                            const newItems = [...formData.items];
                            newItems[index] = {
                              ...newItems[index],
                              materialId,
                              unitId: defaultUnitId
                            };
                            setFormData({ ...formData, items: newItems });
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                          required
                          dir={lang === "ar" ? "rtl" : "ltr"}
                        >
                          <option value="">
                            {lang === "ar" ? "اختر المادة" : "Select Material"}
                          </option>
                          {materials.map((material) => (
                            <option key={material._id} value={material._id}>
                              {lang === "ar" ? material.nameAr : material.nameEn}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Unit */}
                      <div className="md:col-span-2">
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          {lang === "ar" ? "الوحدة" : "Unit"}
                        </label>
                        <select
                          value={item.unitId}
                          onChange={(e) => handleItemChange(index, "unitId", e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                          required
                          disabled={!item.materialId}
                        >
                          <option value="">
                            {lang === "ar" ? "اختر الوحدة" : "Select Unit"}
                          </option>
                          {item.materialId && (() => {
                            const material = materials.find(m => m._id === item.materialId);
                            if (!material) return null;
                            
                            const availableUnits = [];
                            if (material.baseUnit) {
                              const baseUnitData = units.find(u => u._id === material.baseUnit);
                              if (baseUnitData) availableUnits.push(baseUnitData);
                            }
                            if (material.alternativeUnits && material.alternativeUnits.length > 0) {
                              material.alternativeUnits.forEach(altUnitId => {
                                const altUnitData = units.find(u => u._id === altUnitId);
                                if (altUnitData) availableUnits.push(altUnitData);
                              });
                            }
                            
                            return availableUnits.map((unit) => (
                              <option key={unit._id} value={unit._id}>
                                {lang === "ar" ? unit.nameAr : unit.nameEn}
                              </option>
                            ));
                          })()}
                        </select>
                      </div>

                      {/* Quantity */}
                      <div className="md:col-span-2">
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          {lang === "ar" ? "الكمية" : "Quantity"}
                        </label>
                        <Input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => handleItemChange(index, "quantity", e.target.value)}
                          min="0.01"
                          step="0.01"
                          required
                          className="text-sm"
                          dir={lang === "ar" ? "rtl" : "ltr"}
                        />
                      </div>

                      {/* Unit Price */}
                      <div className="md:col-span-2">
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          <DollarSign size={14} className="inline" />
                          {lang === "ar" ? "سعر الوحدة" : "Unit Price"}
                        </label>
                        <Input
                          type="number"
                          value={item.unitPrice}
                          onChange={(e) => handleItemChange(index, "unitPrice", e.target.value)}
                          min="0"
                          step="0.01"
                          required
                          className="text-sm"
                          dir={lang === "ar" ? "rtl" : "ltr"}
                        />
                      </div>

                      {/* Remove Button */}
                      <div className="md:col-span-1 flex justify-end">
                        {formData.items.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(index)}
                            className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                            title={lang === "ar" ? "حذف" : "Remove"}
                          >
                            <Trash2 size={18} />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Item Total */}
                    {item.materialId && (
                      <div className="mt-3 pt-3 border-t border-gray-200 flex justify-between items-center text-sm">
                        <span className="text-gray-600">
                          {getMaterialName(item.materialId)}
                        </span>
                        <span className="font-semibold text-gray-900">
                          {lang === "ar" ? "المجموع:" : "Subtotal:"}{" "}
                          {formatCurrency((item.quantity || 0) * (item.unitPrice || 0), lang)}
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Grand Total */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-semibold text-gray-700">
                    {lang === "ar" ? "الإجمالي الكلي:" : "Grand Total:"}
                  </span>
                  <span className="text-xl font-semibold text-blue-600">
                    {formatCurrency(calculateTotal(), lang)}
                  </span>
                </div>
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {lang === "ar" ? "ملاحظات" : "Notes"}
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                placeholder={lang === "ar" ? "أضف ملاحظات إضافية..." : "Add additional notes..."}
                dir={lang === "ar" ? "rtl" : "ltr"}
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-4 flex items-center justify-end gap-3 border-t border-gray-200">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition font-semibold"
          >
            {lang === "ar" ? "إلغاء" : "Cancel"}
          </button>
          <button
            type="button"
            onClick={handleFormSubmit}
            disabled={saving}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition font-semibold min-w-[120px]"
          >
            {saving ? (
              <div className="flex items-center justify-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                {lang === "ar" ? "جاري الحفظ..." : "Saving..."}
              </div>
            ) : (
              <>{lang === "ar" ? "حفظ" : "Save"}</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ================= PURCHASE DETAILS MODAL =================
function PurchaseDetailsModal({
  purchase,
  onClose,
  calculateTotal
}) {
  const { lang, t } = useContext(LanguageContext);
  const [isPrinting, setIsPrinting] = useState(false);
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMaterials = async () => {
      try {
        const { data } = await axiosInstance.get("/materials?lang=" + lang);
        setMaterials(data.result || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchMaterials();
  }, [lang]);

  const getMaterialName = (item) => {
    if (item.material) {
      return lang === "ar" ? item.material?.nameAr : item.material?.nameEn;
    }
    const material = materials.find(m => m._id === item.materialId);
    return material ? (lang === "ar" ? material.nameAr : material.nameEn) : (lang === "ar" ? "غير معروف" : "Unknown");
  };

  const getMaterialUnit = (item) => {
    if (item.material) {
      return lang === "ar" ? item.material?.unitAr : item.material?.unitEn;
    }
    const material = materials.find(m => m._id === item.materialId);
    return material ? (lang === "ar" ? material.unitAr : material.unitEn) : "";
  };

  const calculateDueDate = (invoiceDate, creditDays) => {
    const date = new Date(invoiceDate);
    date.setDate(date.getDate() + creditDays);
    return date;
  };

  const handlePrint = () => {
    setIsPrinting(true);
    setTimeout(() => {
      window.print();
      setIsPrinting(false);
    }, 100);
  };

  const dueDate = calculateDueDate(purchase.invoiceDate, purchase.creditDays);
  const total = calculateTotal(purchase.items || []);

  return (
    <>
      {/* Print Styles */}
      <style>
        {`
          @media print {
            body * {
              visibility: hidden;
            }
            #printable-invoice, #printable-invoice * {
              visibility: visible;
            }
            #printable-invoice {
              position: absolute;
              left: 0;
              top: 0;
              width: 100%;
            }
            .no-print {
              display: none !important;
            }
          }
        `}
      </style>

      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6 no-print">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <FileText size={28} />
                <h3 className="text-2xl font-bold">
                  {lang === "ar" ? "تفاصيل أمر الشراء" : "Purchase Order Details"}
                </h3>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors"
              >
                <X size={24} />
              </button>
            </div>
          </div>

          {/* Content - Printable */}
          <div id="printable-invoice" className="overflow-y-auto max-h-[calc(90vh-200px)]">
            <div className="p-4 sm:p-10 bg-white">
              {/* Invoice Header */}
              <div className="flex justify-between mb-8">
                <div>
                  <svg
                    className="size-10"
                    width="26"
                    height="26"
                    viewBox="0 0 26 26"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <rect x="4" y="8" width="6" height="14" rx="1" fill="currentColor" className="fill-blue-600" />
                    <rect x="11" y="4" width="6" height="18" rx="1" fill="currentColor" className="fill-blue-500" />
                    <rect x="18" y="10" width="4" height="12" rx="1" fill="currentColor" className="fill-blue-400" />
                    <rect x="6" y="10" width="2" height="2" fill="white" />
                    <rect x="6" y="14" width="2" height="2" fill="white" />
                    <rect x="13" y="7" width="2" height="2" fill="white" />
                    <rect x="13" y="11" width="2" height="2" fill="white" />
                    <rect x="13" y="15" width="2" height="2" fill="white" />
                  </svg>

                  <h1 className="mt-2 text-lg md:text-xl font-semibold text-blue-600">
                    {lang === "ar" ? "ميجا بيلد للانشاءات" : "Mega Build Construction"}
                  </h1>
                </div>

                <div className={lang === "ar" ? "text-start" : "text-end"}>
                  <h2 className="text-2xl md:text-3xl font-semibold text-gray-800">
                    {lang === "ar" ? "أمر شراء #" : "Purchase Order #"}
                  </h2>
                  <span className="mt-1 block text-gray-500">
                    {purchase.invoiceNo || purchase.supplierInvoiceNo || (lang === "ar" ? "غير محدد" : "N/A")}
                  </span>
                </div>
              </div>

              {/* Supplier & Date Info */}
              <div className="mt-8 grid sm:grid-cols-2 gap-3">
                <div>
                  <h3 className="text-lg font-semibold text-gray-800">
                    {lang === "ar" ? "المورد:" : "Supplier:"}
                  </h3>
                  <h3 className="text-lg font-semibold text-gray-800">
                    {lang === "ar" ? purchase.supplierId?.nameAr || purchase.supplier?.nameAr : purchase.supplierId?.nameEn || purchase.supplier?.nameEn}
                  </h3>
                </div>

                <div className={`${lang === "ar" ? "sm:text-start" : "sm:text-end"} space-y-2`}>
                  <div className="grid grid-cols-2 sm:grid-cols-1 gap-3 sm:gap-2">
                    <dl className="grid sm:grid-cols-5 gap-x-3">
                      <dt className="col-span-3 font-semibold text-gray-800">
                        {lang === "ar" ? "فاتورة المورد:" : "Supplier Invoice:"}
                      </dt>
                      <dd className="col-span-2 text-gray-500">
                        {purchase.supplierInvoiceNo}
                      </dd>
                    </dl>
                    <dl className="grid sm:grid-cols-5 gap-x-3">
                      <dt className="col-span-3 font-semibold text-gray-800">
                        {lang === "ar" ? "تاريخ الفاتورة:" : "Invoice date:"}
                      </dt>
                      <dd className="col-span-2 text-gray-500">
                        {formatDateShort(purchase.invoiceDate, lang)}
                      </dd>
                    </dl>
                    <dl className="grid sm:grid-cols-5 gap-x-3">
                      <dt className="col-span-3 font-semibold text-gray-800">
                        {lang === "ar" ? "تاريخ الاستحقاق:" : "Due date:"}
                      </dt>
                      <dd className="col-span-2 text-gray-500">
                        {formatDateShort(dueDate, lang)}
                      </dd>
                    </dl>
                    <dl className="grid sm:grid-cols-5 gap-x-3">
                      <dt className="col-span-3 font-semibold text-gray-800">
                        {lang === "ar" ? "أيام الائتمان:" : "Credit Days:"}
                      </dt>
                      <dd className="col-span-2 text-gray-500">
                        {purchase.creditDays} {lang === "ar" ? "يوم" : "days"}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>

              {/* Items Table */}
              <div className="mt-6">
                <div className="border border-gray-200 p-4 rounded-lg space-y-4">
                  <div className="hidden sm:grid sm:grid-cols-5">
                    <div className="sm:col-span-2 text-xs font-medium text-gray-500 uppercase">
                      {lang === "ar" ? "المادة" : "Item"}
                    </div>
                    <div className="text-start text-xs font-medium text-gray-500 uppercase">
                      {lang === "ar" ? "الكمية" : "Qty"}
                    </div>
                    <div className="text-start text-xs font-medium text-gray-500 uppercase">
                      {lang === "ar" ? "السعر" : "Rate"}
                    </div>
                    <div className="text-end text-xs font-medium text-gray-500 uppercase">
                      {lang === "ar" ? "المبلغ" : "Amount"}
                    </div>
                  </div>

                  <div className="hidden sm:block border-b border-gray-200"></div>

                  {purchase.items?.map((item, index) => (
                    <div key={index}>
                      <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                        <div className="col-span-full sm:col-span-2">
                          <h5 className="sm:hidden text-xs font-medium text-gray-500 uppercase">
                            {lang === "ar" ? "المادة" : "Item"}
                          </h5>
                          <p className="font-medium text-gray-800">{getMaterialName(item)}</p>
                          <p className="text-xs text-gray-500">{getMaterialUnit(item)}</p>
                        </div>
                        <div>
                          <h5 className="sm:hidden text-xs font-medium text-gray-500 uppercase">
                            {lang === "ar" ? "الكمية" : "Qty"}
                          </h5>
                          <p className="text-gray-800">
                            {item.quantity?.toLocaleString(lang === "ar" ? "ar-EG" : "en-US")}
                          </p>
                        </div>
                        <div>
                          <h5 className="sm:hidden text-xs font-medium text-gray-500 uppercase">
                            {lang === "ar" ? "السعر" : "Rate"}
                          </h5>
                          <p className="text-gray-800">
                            {formatCurrency(item.unitPrice, lang)}
                          </p>
                        </div>
                        <div>
                          <h5 className="sm:hidden text-xs font-medium text-gray-500 uppercase">
                            {lang === "ar" ? "المبلغ" : "Amount"}
                          </h5>
                          <p className="sm:text-end text-gray-800">
                            {formatCurrency(item.quantity * item.unitPrice, lang)}
                          </p>
                        </div>
                      </div>
                      {index < purchase.items.length - 1 && (
                        <div className="sm:hidden border-b border-gray-200 mt-2"></div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Total */}
              <div className={`mt-8 flex ${lang === "ar" ? "sm:justify-start" : "sm:justify-end"}`}>
                <div className="w-full max-w-2xl sm:text-end space-y-2">
                  <div className="grid grid-cols-2 sm:grid-cols-1 gap-3 sm:gap-2">
                    <dl className="grid sm:grid-cols-5 gap-x-3">
                      <dt className="col-span-3 font-semibold text-gray-800">
                        {lang === "ar" ? "المجموع الفرعي:" : "Subtotal:"}
                      </dt>
                      <dd className="col-span-2 text-gray-500">
                        {formatCurrency(total, lang)}
                      </dd>
                    </dl>
                    <dl className="grid sm:grid-cols-5 gap-x-3">
                      <dt className="col-span-3 text-lg font-semibold text-gray-800">
                        {lang === "ar" ? "الإجمالي:" : "Total:"}
                      </dt>
                      <dd className="col-span-2 text-lg font-semibold text-gray-800">
                        {formatCurrency(total, lang)}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>

              {/* Notes */}
              {purchase.notes && (
                <div className="mt-8 sm:mt-12">
                  <h4 className="text-lg font-semibold text-gray-800">
                    {lang === "ar" ? "ملاحظات:" : "Notes:"}
                  </h4>
                  <p className="text-gray-500" dir={lang === "ar" ? "rtl" : "ltr"}>
                    {purchase.notes}
                  </p>
                </div>
              )}

              {/* Footer */}
              <p className="mt-5 text-sm text-gray-500">
                © 2025 {lang === "ar" ? "ميجا بيلد للانشاءات" : "Mega Build Construction"}
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="bg-gray-50 px-6 py-4 flex items-center justify-end gap-3 border-t border-gray-200 no-print">
            <button
              onClick={handlePrint}
              disabled={isPrinting}
              className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-semibold"
            >
              <Printer size={18} />
              {lang === "ar" ? "طباعة" : "Print"}
            </button>
            <button
              onClick={onClose}
              className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition font-semibold"
            >
              {lang === "ar" ? "إغلاق" : "Close"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}