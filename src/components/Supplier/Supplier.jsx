import { useState, useEffect, useMemo, useContext, useRef } from "react";
import {
  Users, Search, Plus, Edit, Trash2, CheckCircle,
  ChevronUp, ChevronDown, MoreHorizontal, X, Download
} from "lucide-react";
import { toast } from "react-toastify";
import { formatCurrency } from "../../utils/dateFormat";
import axiosInstance from "../../utils/axiosInstance";
import { getErrorMessage } from "../../utils/errorHandler";
import { LanguageContext } from "../../context/LanguageContext";
import * as XLSX from "xlsx";
import AdminActionModal from "../modals/AdminActionModal";

//  Sortable column header 
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

//  Status badge 
const StatusBadge = ({ isActive, lang }) => {
  if (isActive === false)
    return <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">{lang === 'ar' ? 'غير نشط' : 'Inactive'}</span>;
  return <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">{lang === 'ar' ? 'نشط' : 'Active'}</span>;
};

//  Three-dots menu 
const ActionsMenu = ({ supplier, lang, onEdit, onToggle }) => {
  const [open, setOpen] = useState(false);
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0 });
  const ref = useRef();
  const btnRef = useRef();

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleOpen = () => {
    if (!open && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      const menuHeight = 80;
      const spaceBelow = window.innerHeight - rect.bottom;

      const top = spaceBelow < menuHeight
        ? rect.top - menuHeight - 4
        : rect.bottom + 4;

      setMenuPos({ top, left: rect.right - 160 });
    }
    setOpen(o => !o);
  };

  const isActive = supplier.isActive !== false;

  return (
    <div className="relative" ref={ref}>
      <button
        ref={btnRef}
        onClick={handleOpen}
        className="p-1.5 rounded-md hover:bg-gray-100 transition text-gray-500"
      >
        <MoreHorizontal className="w-5 h-5" />
      </button>

      {open && (
        <div
          style={{ position: 'fixed', top: menuPos.top, left: menuPos.left }}
          className="w-44 bg-white border border-gray-200 rounded-xl shadow-lg z-50 py-1"
        >
          <button
            onClick={() => { setOpen(false); onEdit(supplier); }}
            className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition"
          >
            <Edit className="w-4 h-4" />
            {lang === 'ar' ? 'تعديل' : 'Edit'}
          </button>

          {isActive ? (
            <button
              onClick={() => { setOpen(false); onToggle(supplier); }}
              className="flex items-center gap-2 w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition"
            >
              <Trash2 className="w-4 h-4" />
              {lang === 'ar' ? 'إلغاء التفعيل' : 'Deactivate'}
            </button>
          ) : (
            <button
              onClick={() => { setOpen(false); onToggle(supplier); }}
              className="flex items-center gap-2 w-full px-4 py-2 text-sm text-green-600 hover:bg-green-50 transition"
            >
              <CheckCircle className="w-4 h-4" />
              {lang === 'ar' ? 'تفعيل' : 'Activate'}
            </button>
          )}
        </div>
      )}
    </div>
  );
};

//  Add/Edit Modal 
const SupplierModal = ({ lang, t, mode, supplier: editSupplier, onClose, onSaved }) => {
  const [form, setForm] = useState({
    nameAr:  editSupplier?.nameAr  || "",
    nameEn:  editSupplier?.nameEn  || "",
    code:    editSupplier?.code    || "",
    phone:   editSupplier?.phone   || "",
    email:   editSupplier?.email   || "",
    address: editSupplier?.address || "",
    notes:   editSupplier?.notes   || "",
  });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!form.nameAr.trim() && !form.nameEn.trim()) {
      toast.error("Supplier name is required"); return;
    }
    try {
      setSubmitting(true);
      const payload = {
        nameAr:  form.nameAr.trim()  || "",
        nameEn:  form.nameEn.trim()  || "",
        code:    form.code.trim()    || "",
        phone:   form.phone.trim()   || "",
        email:   form.email.trim()   || "",
        address: form.address.trim() || "",
        notes:   form.notes.trim()   || "",
      };

      if (mode === "add") await axiosInstance.post("/suppliers", payload);
      else await axiosInstance.put(`/suppliers/${editSupplier._id}`, payload);

      toast.success(lang === 'ar' ? 'تم الحفظ بنجاح' : 'Saved successfully');
      onSaved();
      onClose();
    } catch (err) {
      toast.error(getErrorMessage(err, "Failed to save supplier"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-gray-900">
            {mode === "add" ? "Add New Supplier" : "Edit Supplier"}
          </h2>
          <button onClick={onClose} className="p-1 rounded-md hover:bg-gray-100 text-gray-400">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {lang === 'ar' ? 'الاسم بالعربية' : 'Name (Arabic)'} <span className="text-red-500">*</span>
              </label>
              <input type="text" dir="rtl" value={form.nameAr} onChange={e => setForm(f => ({ ...f, nameAr: e.target.value }))} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition text-sm bg-gray-50" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {lang === 'ar' ? 'الاسم بالإنجليزية' : 'Name (English)'}
              </label>
              <input type="text" dir="ltr" value={form.nameEn} onChange={e => setForm(f => ({ ...f, nameEn: e.target.value }))} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition text-sm bg-gray-50" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {lang === 'ar' ? 'الكود' : 'Code'}
              </label>
              <input type="text" value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value }))} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition text-sm bg-gray-50" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {lang === 'ar' ? 'الهاتف' : 'Phone'}
              </label>
              <input type="text" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition text-sm bg-gray-50" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {lang === 'ar' ? 'البريد الإلكتروني' : 'Email'}
            </label>
            <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition text-sm bg-gray-50" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {lang === 'ar' ? 'العنوان' : 'Address'}
            </label>
            <input type="text" dir="ltr" value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition text-sm bg-gray-50" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {lang === 'ar' ? 'ملاحظات' : 'Notes'}
            </label>
            <textarea
              rows="2"
              dir="ltr"
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              placeholder={lang === 'ar' ? 'أضف ملاحظات...' : 'Add notes...'}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition text-sm bg-gray-50 resize-none"
            />
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition font-medium text-sm">
            {lang === 'ar' ? 'إلغاء' : 'Cancel'}
          </button>
          <button onClick={handleSubmit} disabled={submitting} className="flex-1 px-4 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition font-medium text-sm disabled:opacity-50">
            {submitting ? (lang === 'ar' ? 'جاري الحفظ...' : 'Saving...') : (lang === 'ar' ? 'حفظ' : 'Save')}
          </button>
        </div>
      </div>
    </div>
  );
};

//  Main Component 
export default function Suppliers() {
  const { lang, t } = useContext(LanguageContext);

  const [suppliers,     setSuppliers]     = useState([]);
  const [balances,      setBalances]      = useState({});
  const [loading,       setLoading]       = useState(false);
  const [searchTerm,    setSearchTerm]    = useState("");
  const [filterStatus,  setFilterStatus]  = useState("ALL");
  const [sortField,     setSortField]     = useState("nameEn");
  const [sortDir,       setSortDir]       = useState("asc");
  const [addModal,      setAddModal]      = useState(false);
  const [editTarget,    setEditTarget]    = useState(null);
  const [toggleModal,   setToggleModal]   = useState({ show: false, supplier: null });

  useEffect(() => { fetchSuppliers(); }, []);

  const fetchSuppliers = async () => {
    try {
      setLoading(true);
      const { data } = await axiosInstance.get("/suppliers");
      const list = data.result || [];
      setSuppliers(list);
      loadBalances(list);
    } catch {
      toast.error("Failed to load suppliers");
    } finally {
      setLoading(false);
    }
  };

  const loadBalances = async (list) => {
    const map = {};
    for (const s of list) {
      try {
        const { data } = await axiosInstance.get(`/ledger/supplier/${s._id}/balance`);
        map[s._id] = Number(data.result || 0);
      } catch { map[s._id] = 0; }
    }
    setBalances(map);
  };

  const handleToggle = async () => {
    const supplier = toggleModal.supplier;
    if (!supplier) return;
    try {
      await axiosInstance.delete(`/suppliers/${supplier._id}`);
      toast.success(supplier.isActive !== false
        ? "Supplier deactivated"
        : "Supplier activated");
      setToggleModal({ show: false, supplier: null });
      fetchSuppliers();
    } catch (err) {
      toast.error(err.response?.data?.message || err.message);
    }
  };

  const handleSort = (field) => {
    if (sortField === field) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortField(field); setSortDir("asc"); }
  };

  const handleExport = () => {
    try {
      if (displayed.length === 0) { toast.warning("No data to export"); return; }
      const data = displayed.map(s => ({
        "Supplier Name": lang === "ar" ? s.nameAr : s.nameEn,
        [lang === 'ar' ? 'الكود' : 'Code']: s.code || "",
        [lang === 'ar' ? 'الهاتف' : 'Phone']: s.phone || "",
        [lang === 'ar' ? 'البريد الإلكتروني' : 'Email']: s.email || "",
        [lang === 'ar' ? 'العنوان' : 'Address']: s.address || "",
        "Current Balance": s.balance || 0,
        [lang === 'ar' ? 'الحالة' : 'Status']: s.isActive !== false
          ? (lang === 'ar' ? 'نشط' : 'Active')
          : (lang === 'ar' ? 'غير نشط' : 'Inactive'),
      }));
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, lang === 'ar' ? 'الموردون' : 'Suppliers');
      XLSX.writeFile(wb, `Suppliers_${new Date().toISOString().slice(0, 10)}.xlsx`);
      toast.success(lang === 'ar' ? 'تم التصدير بنجاح' : 'Exported successfully');
    } catch {
      toast.error(lang === 'ar' ? 'فشل التصدير' : 'Export failed');
    }
  };

  // Merge balances + filter + sort
  const displayed = useMemo(() => {
    return suppliers
      .map(s => ({ ...s, balance: Number(balances[s._id] || 0) }))
      .filter(s => {
        const q = searchTerm.toLowerCase();
        const matchSearch = !q || s.nameAr?.toLowerCase().includes(q) || s.nameEn?.toLowerCase().includes(q) || s.code?.toLowerCase().includes(q) || s.phone?.includes(q) || s.email?.toLowerCase().includes(q);
        const matchStatus = filterStatus === "ALL" || (filterStatus === "ACTIVE" && s.isActive !== false) || (filterStatus === "INACTIVE" && s.isActive === false);
        return matchSearch && matchStatus;
      })
      .sort((a, b) => {
        let va = a[sortField] ?? "";
        let vb = b[sortField] ?? "";
        if (typeof va === "string") va = va.toLowerCase();
        if (typeof vb === "string") vb = vb.toLowerCase();
        return sortDir === "asc" ? (va > vb ? 1 : -1) : (va < vb ? 1 : -1);
      });
  }, [suppliers, balances, searchTerm, filterStatus, sortField, sortDir]);

  if (loading && suppliers.length === 0)
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full" />
      </div>
    );

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">

        {/*  Page Header  */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {lang === 'ar' ? 'الموردون' : 'Suppliers'}
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              View and manage suppliers and their accounts.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleExport}
              className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 text-gray-700 bg-white rounded-xl hover:bg-gray-50 transition font-semibold text-sm shadow-sm"
            >
              <Download className="w-4 h-4" />
              {lang === 'ar' ? 'تصدير' : 'Export'}
            </button>
            <button
              onClick={() => setAddModal(true)}
              className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition font-semibold text-sm shadow-sm"
            >
              <Plus className="w-4 h-4" />
              {lang === 'ar' ? 'إضافة مورد' : 'Add Supplier'}
            </button>
          </div>
        </div>

        {/*  Filters  */}
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder={lang === 'ar' ? 'بحث في الموردين...' : 'Search suppliers...'}
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
            />
          </div>

          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
          >
            <option value="ALL">{lang === 'ar' ? 'كل الحالات' : 'All Status'}</option>
            <option value="ACTIVE">{lang === 'ar' ? 'نشط' : 'Active'}</option>
            <option value="INACTIVE">{lang === 'ar' ? 'غير نشط' : 'Inactive'}</option>
          </select>

          {(searchTerm || filterStatus !== "ALL") && (
            <button
              onClick={() => { setSearchTerm(""); setFilterStatus("ALL"); }}
              className="text-sm text-indigo-600 hover:underline"
            >
              {lang === 'ar' ? 'مسح' : 'Clear'}
            </button>
          )}
        </div>

        {/*  Table  */}
        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
          {displayed.length === 0 ? (
            <div className="p-16 text-center">
              <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="font-medium text-gray-600">
                {lang === 'ar' ? 'لا يوجد موردون' : 'No suppliers found'}
              </p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <SortHeader label={lang === 'ar' ? 'المورد' : 'Supplier'}   field="nameEn"   sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                  <SortHeader label={lang === 'ar' ? 'الكود' : 'Code'}        field="code"     sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                  <SortHeader label={lang === 'ar' ? 'الهاتف' : 'Phone'}      field="phone"    sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                  <SortHeader label={lang === 'ar' ? 'الرصيد' : 'Balance'}    field="balance"  sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                  <SortHeader label={lang === 'ar' ? 'الحالة' : 'Status'}     field="isActive" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {displayed.map(supplier => (
                  <tr key={supplier._id} className="hover:bg-gray-50/60 transition">
                    {/* Avatar + Name */}
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
                          <span className="text-indigo-600 font-semibold text-sm">
                            {(lang === "ar" ? supplier.nameAr : supplier.nameEn)?.charAt(0)?.toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <span className="font-medium text-gray-900 text-sm block">
                            {lang === "ar" ? supplier.nameAr : supplier.nameEn}
                          </span>
                          {supplier.email && (
                            <span className="text-xs text-gray-400">{supplier.email}</span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Code */}
                    <td className="px-4 py-3.5">
                      {supplier.code
                        ? <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-700">{supplier.code}</span>
                        : <span className="text-gray-400 text-sm"></span>}
                    </td>

                    {/* Phone */}
                    <td className="px-4 py-3.5 text-sm text-gray-500">{supplier.phone || ""}</td>

                    {/* Balance */}
                    <td className="px-4 py-3.5">
                      <span className={`text-sm font-semibold ${supplier.balance > 0 ? "text-red-600" : supplier.balance < 0 ? "text-green-600" : "text-gray-500"}`}>
                        {formatCurrency(supplier.balance, lang)}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3.5">
                      <StatusBadge isActive={supplier.isActive} lang={lang} />
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3.5 text-right">
                      <ActionsMenu
                        supplier={supplier}
                        lang={lang}
                        onEdit={s => setEditTarget(s)}
                        onToggle={s => setToggleModal({ show: true, supplier: s })}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/*  Modals  */}
      {addModal && (
        <SupplierModal lang={lang} t={t} mode="add"
          onClose={() => setAddModal(false)}
          onSaved={fetchSuppliers} />
      )}
      {editTarget && (
        <SupplierModal lang={lang} t={t} mode="edit" supplier={editTarget}
          onClose={() => setEditTarget(null)}
          onSaved={fetchSuppliers} />
      )}
      {toggleModal.show && (
        <AdminActionModal
          type={toggleModal.supplier?.isActive !== false ? "deactivate" : "activate"}
          lang={lang}
          entityLabelEn="supplier"
          entityLabelAr="مورد"
          itemName={lang === "ar" ? toggleModal.supplier?.nameAr : toggleModal.supplier?.nameEn}
          itemSubtitle={toggleModal.supplier?.code ? `${lang === 'ar' ? 'الكود' : 'Code'}: ${toggleModal.supplier.code}` : ""}
          onConfirm={handleToggle}
          onClose={() => setToggleModal({ show: false, supplier: null })}
        />
      )}
    </div>
  );
}