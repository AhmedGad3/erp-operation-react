import { useState, useEffect, useMemo, useContext } from "react";
import { Plus, Edit, Trash2, Download, X, Users, CheckCircle } from "lucide-react";
import { toast } from "react-toastify";
import { formatCurrency } from "../../utils/dateFormat";
import axiosInstance from "../../utils/axiosInstance";
import { LanguageContext } from "../../context/LanguageContext";
import * as XLSX from 'xlsx';

export default function Suppliers() {
  const { lang, t } = useContext(LanguageContext);
  
  const [suppliers, setSuppliers] = useState([]);
  const [balances, setBalances] = useState({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [showModal, setShowModal] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("ALL");

  const [formData, setFormData] = useState({
    nameAr: "",
    nameEn: "",
    code: "",
    phone: "",
    email: "",
    address: "",
    notes: "",
    isActive: true,
  });

  // ================= FETCH =================
  const fetchSuppliers = async () => {
    try {
      setLoading(true);
      const { data } = await axiosInstance.get("/suppliers");
      setSuppliers(data.result || []);
    } catch (err) {
      console.error(err);
      toast.error(t?.errorLoadingSuppliers || "Error loading suppliers");
    } finally {
      setLoading(false);
    }
  };

  const loadBalances = async (list) => {
    const map = {};
    for (let s of list) {
      try {
        const { data } = await axiosInstance.get(`/ledger/supplier/${s._id}/balance`);
        map[s._id] = Number(data.result || 0);
      } catch {
        map[s._id] = 0;
      }
    }
    setBalances(map);
  };

  useEffect(() => { fetchSuppliers(); }, []);
  useEffect(() => { if (suppliers.length) loadBalances(suppliers); }, [suppliers]);

  // ================= DATA =================
  const suppliersWithBalance = useMemo(() => {
    return suppliers.map((s) => ({
      ...s,
      balance: Number(balances[s._id] || 0),
    }));
  }, [suppliers, balances]);

  const filteredSuppliers = useMemo(() => {
    let filtered = [...suppliersWithBalance];

    if (searchQuery) {
      const term = searchQuery.toLowerCase();
      filtered = filtered.filter(supplier =>
        supplier.nameAr?.toLowerCase().includes(term) ||
        supplier.nameEn?.toLowerCase().includes(term) ||
        supplier.code?.toLowerCase().includes(term) ||
        supplier.phone?.includes(term) ||
        supplier.email?.toLowerCase().includes(term)
      );
    }

    if (filterStatus !== 'ALL') {
      filtered = filtered.filter(supplier => 
        filterStatus === 'ACTIVE' ? supplier.isActive !== false : supplier.isActive === false
      );
    }

    return filtered;
  }, [suppliersWithBalance, searchQuery, filterStatus]);

  // ================= EXPORT =================
  const handleExportExcel = () => {
    try {
      if (filteredSuppliers.length === 0) {
        toast.warning(t?.noDataToExport || "No data to export");
        return;
      }

      const exportData = filteredSuppliers.map((s) => ({
        [t?.supplierName || "Supplier Name"]: lang === "ar" ? s.nameAr : s.nameEn,
        [t?.code || "Code"]: s.code || "",
        [t?.phone || "Phone"]: s.phone || "",
        [t?.email || "Email"]: s.email || "",
        [t?.address || "Address"]: s.address || "",
        [t?.currentBalance || "Current Balance"]: s.balance,
        [t?.status || "Status"]: s.isActive ? (t?.active || "Active") : (t?.inactive || "Inactive"),
      }));

      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, lang === "ar" ? "الموردين" : "Suppliers");
      
      const fileName = `Suppliers_${new Date().toISOString().slice(0, 10)}.xlsx`;
      XLSX.writeFile(wb, fileName);
      
      toast.success(t?.exportedSuccessfully || "Exported successfully");
    } catch (err) {
      console.error(err);
      toast.error(t?.exportError || "Error exporting data");
    }
  };

  // ================= SAVE =================
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.nameAr?.trim() && !formData.nameEn?.trim()) {
      toast.error(t?.supplierNameRequired || "Supplier name is required");
      return;
    }

    setSaving(true);

    try {
      const payload = {
        nameAr: formData.nameAr?.trim() || "",
        nameEn: formData.nameEn?.trim() || "",
        code: formData.code?.trim() || "",
        phone: formData.phone?.trim() || "",
        email: formData.email?.trim() || "",
        address: formData.address?.trim() || "",
        notes: formData.notes?.trim() || "",
      };
  
      if (editingSupplier) {
        await axiosInstance.put(`/suppliers/${editingSupplier._id}`, payload);
        toast.success(t?.supplierUpdated || "Supplier updated successfully");
      } else {
        await axiosInstance.post("/suppliers", payload);
        toast.success(t?.supplierAdded || "Supplier added successfully");
      }
      
      setShowModal(false);
      setEditingSupplier(null);
      setFormData({
        nameAr: "",
        nameEn: "",
        code: "",
        phone: "",
        email: "",
        address: "",
        notes: "",
        isActive: true,
      });
      
      await fetchSuppliers();
      
    } catch (err) {
      console.error("Error saving supplier:", err);
      
      let errorMsg = "Error saving supplier";
      
      if (err.response?.data?.message && Array.isArray(err.response.data.message)) {
        errorMsg = err.response.data.message.join(", ");
      } else if (err.response?.data?.message) {
        errorMsg = err.response.data.message;
      } else if (err.response?.data?.error) {
        errorMsg = err.response.data.error;
      } else if (err.message) {
        errorMsg = err.message;
      }
      
      toast.error(errorMsg);
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (supplier) => {
    setEditingSupplier(supplier);
    setFormData({
      nameAr: supplier.nameAr || "",
      nameEn: supplier.nameEn || "",
      code: supplier.code || "",
      phone: supplier.phone || "",
      email: supplier.email || "",
      address: supplier.address || "",
      notes: supplier.notes || "",
      isActive: supplier.isActive,
    });
    setShowModal(true);
  };

  const confirmDeleteAction = async () => {
    if (!confirmDelete) return;
    
    try {
      await axiosInstance.delete(`/suppliers/${confirmDelete._id}`);
      
      const successMsg = confirmDelete.isActive 
        ? (t?.supplierDeactivated || "Supplier deactivated successfully")
        : (t?.supplierActivated || "Supplier activated successfully");
      
      toast.success(successMsg);
      setConfirmDelete(null);
      fetchSuppliers();
    } catch (err) {
      console.error(err);
      const errorMsg = err.response?.data?.message || err.message || (t?.errorUpdatingSupplier || "Error updating supplier status");
      toast.error(errorMsg);
    }
  };

  const activeSuppliers = filteredSuppliers.filter(s => s.isActive !== false).length;
  const inactiveSuppliers = filteredSuppliers.filter(s => s.isActive === false).length;
  const totalDebt = filteredSuppliers.reduce((sum, s) => sum + (s.balance > 0 ? s.balance : 0), 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden mb-6">
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-8 py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Users className="w-8 h-8 text-white" />
                <div>
                  <h1 className="text-2xl font-bold text-white">
                    {t?.allSuppliers || "All Suppliers"}
                  </h1>
                  <p className="text-blue-100 mt-1">
                    {lang === "ar" 
                      ? "عرض وإدارة الموردين وحساباتهم" 
                      : "View and manage suppliers and their accounts"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={handleExportExcel}
                  className="flex items-center gap-2 px-6 py-3 bg-green-500 hover:bg-green-600 text-white rounded-lg transition font-semibold shadow-md"
                >
                  <Download className="w-5 h-5" />
                  <span>{lang === "ar" ? "تصدير" : "Export"}</span>
                </button>
                <button
                  onClick={() => {
                    setEditingSupplier(null);
                    setFormData({ 
                      nameAr: "", 
                      nameEn: "", 
                      code: "", 
                      phone: "", 
                      email: "", 
                      address: "", 
                      notes: "", 
                      isActive: true 
                    });
                    setShowModal(true);
                  }}
                  className="flex items-center gap-2 px-6 py-3 bg-white text-blue-600 rounded-lg hover:bg-blue-50 transition font-semibold shadow-md"
                >
                  <Plus className="w-5 h-5" />
                  <span>{t?.addSupplier || "Add Supplier"}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 p-6 bg-gray-50">
            <div className="bg-white p-4 rounded-lg border-l-4 border-blue-500">
              <p className="text-sm text-gray-600 mb-1">
                {lang === "ar" ? "إجمالي الموردين" : "Total Suppliers"}
              </p>
              <p className="text-2xl font-bold text-gray-900">{filteredSuppliers.length}</p>
            </div>
            <div className="bg-white p-4 rounded-lg border-l-4 border-green-500">
              <p className="text-sm text-gray-600 mb-1">
                {lang === "ar" ? "موردين نشطين" : "Active Suppliers"}
              </p>
              <p className="text-2xl font-bold text-gray-900">{activeSuppliers}</p>
            </div>
            <div className="bg-white p-4 rounded-lg border-l-4 border-red-500">
              <p className="text-sm text-gray-600 mb-1">
                {lang === "ar" ? "إجمالي المديونية" : "Total Debt"}
              </p>
              <p className="text-2xl font-bold text-red-600">{formatCurrency(totalDebt, lang)}</p>
            </div>
            <div className="bg-white p-4 rounded-lg border-l-4 border-gray-500">
              <p className="text-sm text-gray-600 mb-1">
                {lang === "ar" ? "موردين غير نشطين" : "Inactive Suppliers"}
              </p>
              <p className="text-2xl font-bold text-gray-900">{inactiveSuppliers}</p>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Search */}
            <div className="relative">
              <Users className="absolute left-3 top-3.5 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder={lang === "ar" ? "البحث في الموردين..." : "Search suppliers..."}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
              />
            </div>

            {/* Status Filter */}
            <div>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
              >
                <option value="ALL">{lang === "ar" ? "كل الحالات" : "All Status"}</option>
                <option value="ACTIVE">{lang === "ar" ? "نشط" : "Active"}</option>
                <option value="INACTIVE">{lang === "ar" ? "غير نشط" : "Inactive"}</option>
              </select>
            </div>
          </div>

          {/* Clear Filters */}
          {(searchQuery || filterStatus !== 'ALL') && (
            <button
              onClick={() => {
                setSearchQuery('');
                setFilterStatus('ALL');
              }}
              className="mt-4 text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              {lang === "ar" ? "مسح الفلاتر" : "Clear Filters"}
            </button>
          )}
        </div>

        {/* Suppliers Table */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          {loading ? (
            <div className="p-12 text-center">
              <div className="animate-spin inline-block w-12 h-12 border-4 border-current border-t-transparent text-blue-600 rounded-full" role="status">
                <span className="sr-only">Loading...</span>
              </div>
              <p className="mt-4 text-gray-600">{lang === 'ar' ? 'جاري التحميل...' : 'Loading...'}</p>
            </div>
          ) : filteredSuppliers.length === 0 ? (
            <div className="p-12 text-center">
              <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                {lang === "ar" ? "لا يوجد موردين" : "No Suppliers Found"}
              </h3>
              <p className="text-gray-600 mb-6">
                {lang === "ar" ? "لم يتم العثور على موردين مطابقين للفلاتر المحددة" : "No suppliers match your current filters"}
              </p>
              <button
                onClick={() => {
                  setEditingSupplier(null);
                  setFormData({ 
                    nameAr: "", 
                    nameEn: "", 
                    code: "", 
                    phone: "", 
                    email: "", 
                    address: "", 
                    notes: "", 
                    isActive: true 
                  });
                  setShowModal(true);
                }}
                className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-semibold"
              >
                <Plus className="w-5 h-5" />
                {lang === "ar" ? "إضافة أول مورد" : "Add First Supplier"}
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                      {t?.supplierName || "Supplier Name"}
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                      {t?.phone || "Phone"}
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                      {t?.currentBalance || "Current Balance"}
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                      {t?.status || "Status"}
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                      {lang === "ar" ? "الإجراءات" : "Actions"}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredSuppliers.map((supplier) => (
                    <tr key={supplier._id} className="hover:bg-gray-50 transition">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                            <Users className="w-5 h-5 text-blue-600" />
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900">
                              {lang === "ar" ? supplier.nameAr : supplier.nameEn}
                            </p>
                            {supplier.code && (
                              <p className="text-sm text-gray-500">{supplier.code}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-gray-700">
                        {supplier.phone || "-"}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`font-semibold ${supplier.balance > 0 ? "text-red-600" : supplier.balance < 0 ? "text-green-600" : "text-gray-600"}`}>
                          {formatCurrency(supplier.balance, lang)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {supplier.isActive !== false ? (
                          <span className="flex items-center gap-2 text-green-600 font-semibold">
                            <CheckCircle className="w-4 h-4" />
                            {t?.active || "Active"}
                          </span>
                        ) : (
                          <span className="flex items-center gap-2 text-red-600 font-semibold">
                            <X className="w-4 h-4" />
                            {t?.inactive || "Inactive"}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleEdit(supplier)}
                            className="flex items-center gap-1 px-3 py-2 bg-yellow-50 text-yellow-600 rounded-lg hover:bg-yellow-100 transition font-medium"
                            title={t?.edit || "Edit"}
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setConfirmDelete(supplier)}
                            className={`flex items-center gap-1 px-3 py-2 rounded-lg transition font-medium ${
                              supplier.isActive 
                                ? "bg-red-50 text-red-600 hover:bg-red-100" 
                                : "bg-green-50 text-green-600 hover:bg-green-100"
                            }`}
                            title={supplier.isActive ? (t?.deactivate || "Deactivate") : (t?.activate || "Activate")}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
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
        <SupplierModal 
          t={t} 
          lang={lang}
          formData={formData} 
          setFormData={setFormData} 
          onClose={() => {
            setShowModal(false);
            setEditingSupplier(null);
          }} 
          onSubmit={handleSubmit} 
          editing={!!editingSupplier}
          saving={saving}
        />
      )}

      {confirmDelete && (
        <ConfirmModal
          supplier={confirmDelete}
          onClose={() => setConfirmDelete(null)}
          onConfirm={confirmDeleteAction}
          t={t}
          lang={lang}
        />
      )}
    </div>
  );
}

// ================= MODALS =================

function SupplierModal({ t, lang, formData, setFormData, onClose, onSubmit, editing, saving }) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-blue-700 px-8 py-6 border-b border-blue-500">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-white">
              {editing ? (t?.editSupplier || "Edit Supplier") : (t?.addSupplier || "Add Supplier")}
            </h2>
            <button
              onClick={onClose}
              disabled={saving}
              className="text-white hover:text-gray-200 transition-colors disabled:opacity-50"
            >
              <X size={24} />
            </button>
          </div>
        </div>

        <form onSubmit={onSubmit} className="p-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                {t?.nameAr || "Name (Arabic)"} <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                placeholder={t?.nameAr || "Name (Arabic)"}
                value={formData.nameAr}
                onChange={e => setFormData({ ...formData, nameAr: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                dir="rtl"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                {t?.nameEn || "Name (English)"}
              </label>
              <input
                type="text"
                placeholder={t?.nameEn || "Name (English)"}
                value={formData.nameEn}
                onChange={e => setFormData({ ...formData, nameEn: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                dir="ltr"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                {t?.code || "Code"}
              </label>
              <input
                type="text"
                placeholder={t?.code || "Code"}
                value={formData.code}
                onChange={e => setFormData({ ...formData, code: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                {t?.phone || "Phone"}
              </label>
              <input
                type="text"
                placeholder={t?.phone || "Phone"}
                value={formData.phone}
                onChange={e => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                {t?.email || "Email"}
              </label>
              <input
                type="email"
                placeholder={t?.email || "Email"}
                value={formData.email}
                onChange={e => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                {t?.address || "Address"}
              </label>
              <input
                type="text"
                placeholder={t?.address || "Address"}
                value={formData.address}
                onChange={e => setFormData({ ...formData, address: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                dir={lang === "ar" ? "rtl" : "ltr"}
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                {t?.notes || "Notes"}
              </label>
              <textarea
                placeholder={t?.notes || "Notes"}
                value={formData.notes}
                onChange={e => setFormData({ ...formData, notes: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                rows={3}
                dir={lang === "ar" ? "rtl" : "ltr"}
              />
            </div>

            <div className="md:col-span-2 flex items-center gap-2">
              <input
                type="checkbox"
                id="isActive"
                checked={formData.isActive === true}
                onChange={e => setFormData({ ...formData, isActive: e.target.checked })}
                className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
              />
              <label htmlFor="isActive" className="text-sm font-semibold text-gray-700 cursor-pointer">
                {t?.active || "Active"}
              </label>
            </div>
          </div>

          <div className="flex gap-4 mt-8">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-semibold disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {saving && (
                <div className="animate-spin inline-block w-5 h-5 border-2 border-current border-t-transparent text-white rounded-full" role="status">
                  <span className="sr-only">Loading...</span>
                </div>
              )}
              {saving ? (t?.saving || "Saving...") : (t?.save || "Save")}
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="flex-1 px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition font-semibold disabled:opacity-50"
            >
              {t?.cancel || "Cancel"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ConfirmModal({ supplier, onClose, onConfirm, t, lang }) {
  const isActive = supplier.isActive;
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
            isActive ? "bg-red-100" : "bg-green-100"
          }`}>
            {isActive ? (
              <Trash2 className="w-6 h-6 text-red-600" />
            ) : (
              <CheckCircle className="w-6 h-6 text-green-600" />
            )}
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900">
              {isActive 
                ? (t?.deactivateSupplier || "Deactivate Supplier") 
                : (t?.activateSupplier || "Activate Supplier")}
            </h3>
            <p className="text-sm text-gray-500">
              {isActive 
                ? (t?.confirmDeactivate || "Are you sure you want to deactivate this supplier?")
                : (t?.confirmActivate || "Are you sure you want to activate this supplier?")}
            </p>
          </div>
        </div>
        
        <div className="bg-gray-50 rounded-lg p-4 mb-4">
          <p className="text-sm text-gray-600 mb-1">{lang === "ar" ? "المورد:" : "Supplier:"}</p>
          <p className="font-semibold text-gray-900">
            {lang === "ar" ? supplier.nameAr : supplier.nameEn}
          </p>
          {supplier.code && (
            <p className="text-sm text-gray-500 mt-1">
              {t?.code || "Code"}: {supplier.code}
            </p>
          )}
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition font-semibold"
          >
            {t?.cancel || "Cancel"}
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 px-4 py-2 text-white rounded-lg transition font-semibold ${
              isActive 
                ? "bg-red-600 hover:bg-red-700" 
                : "bg-green-600 hover:bg-green-700"
            }`}
          >
            {isActive ? (t?.deactivate || "Deactivate") : (t?.activate || "Activate")}
          </button>
        </div>
      </div>
    </div>
  );
}