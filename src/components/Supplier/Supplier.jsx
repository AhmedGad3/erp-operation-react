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

// â”€â”€ Sortable column header â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

// â”€â”€ Status badge â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const StatusBadge = ({ isActive, lang }) => {
  if (isActive === false)
    return <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">{lang === "ar" ? "ØºÙŠØ± Ù†Ø´Ø·" : "Inactive"}</span>;
  return <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">{lang === "ar" ? "Ù†Ø´Ø·" : "Active"}</span>;
};

// â”€â”€ Three-dots menu â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
      const menuHeight = 80; // Ø²Ø±Ø§Ø±ÙŠÙ†
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
            {lang === "ar" ? "ØªØ¹Ø¯ÙŠÙ„" : "Edit"}
          </button>

          {isActive ? (
            <button
              onClick={() => { setOpen(false); onToggle(supplier); }}
              className="flex items-center gap-2 w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition"
            >
              <Trash2 className="w-4 h-4" />
              {lang === "ar" ? "Ø¥Ù„ØºØ§Ø¡ Ø§Ù„ØªÙØ¹ÙŠÙ„" : "Deactivate"}
            </button>
          ) : (
            <button
              onClick={() => { setOpen(false); onToggle(supplier); }}
              className="flex items-center gap-2 w-full px-4 py-2 text-sm text-green-600 hover:bg-green-50 transition"
            >
              <CheckCircle className="w-4 h-4" />
              {lang === "ar" ? "ØªÙØ¹ÙŠÙ„" : "Activate"}
            </button>
          )}
        </div>
      )}
    </div>
  );
};

// â”€â”€ Add/Edit Modal â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
      toast.error(lang === "ar" ? "Ø§Ø³Ù… Ø§Ù„Ù…ÙˆØ±Ø¯ Ù…Ø·Ù„ÙˆØ¨" : "Supplier name is required"); return;
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

      toast.success(lang === "ar" ? "ØªÙ… Ø§Ù„Ø­ÙØ¸ Ø¨Ù†Ø¬Ø§Ø­" : "Saved successfully");
      onSaved();
      onClose();
    } catch (err) {
      toast.error(getErrorMessage(err, lang === "ar" ? "ÙØ´Ù„ Ø­ÙØ¸ Ø§Ù„Ù…ÙˆØ±Ø¯" : "Failed to save supplier"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-gray-900">
            {mode === "add" ? (lang === "ar" ? "Ø¥Ø¶Ø§ÙØ© Ù…ÙˆØ±Ø¯ Ø¬Ø¯ÙŠØ¯" : "Add New Supplier") : (lang === "ar" ? "ØªØ¹Ø¯ÙŠÙ„ Ø§Ù„Ù…ÙˆØ±Ø¯" : "Edit Supplier")}
          </h2>
          <button onClick={onClose} className="p-1 rounded-md hover:bg-gray-100 text-gray-400">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{lang === "ar" ? "Ø§Ù„Ø§Ø³Ù… Ø¨Ø§Ù„Ø¹Ø±Ø¨ÙŠØ©" : "Name (Arabic)"} <span className="text-red-500">*</span></label>
              <input type="text" dir="rtl" value={form.nameAr} onChange={e => setForm(f => ({ ...f, nameAr: e.target.value }))} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition text-sm bg-gray-50" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{lang === "ar" ? "Ø§Ù„Ø§Ø³Ù… Ø¨Ø§Ù„Ø¥Ù†Ø¬Ù„ÙŠØ²ÙŠØ©" : "Name (English)"}</label>
              <input type="text" dir="ltr" value={form.nameEn} onChange={e => setForm(f => ({ ...f, nameEn: e.target.value }))} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition text-sm bg-gray-50" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{lang === "ar" ? "Ø§Ù„ÙƒÙˆØ¯" : "Code"}</label>
              <input type="text" value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value }))} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition text-sm bg-gray-50" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{lang === "ar" ? "Ø§Ù„Ù‡Ø§ØªÙ" : "Phone"}</label>
              <input type="text" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition text-sm bg-gray-50" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{lang === "ar" ? "Ø§Ù„Ø¨Ø±ÙŠØ¯ Ø§Ù„Ø¥Ù„ÙƒØªØ±ÙˆÙ†ÙŠ" : "Email"}</label>
            <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition text-sm bg-gray-50" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{lang === "ar" ? "Ø§Ù„Ø¹Ù†ÙˆØ§Ù†" : "Address"}</label>
            <input type="text" dir={lang === "ar" ? "rtl" : "ltr"} value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition text-sm bg-gray-50" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{lang === "ar" ? "Ù…Ù„Ø§Ø­Ø¸Ø§Øª" : "Notes"}</label>
            <textarea rows="2" dir={lang === "ar" ? "rtl" : "ltr"} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder={lang === "ar" ? "Ø£Ø¶Ù Ù…Ù„Ø§Ø­Ø¸Ø§Øª..." : "Add notes..."} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition text-sm bg-gray-50 resize-none" />
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition font-medium text-sm">
            {lang === "ar" ? "Ø¥Ù„ØºØ§Ø¡" : "Cancel"}
          </button>
          <button onClick={handleSubmit} disabled={submitting} className="flex-1 px-4 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition font-medium text-sm disabled:opacity-50">
            {submitting ? (lang === "ar" ? "Ø¬Ø§Ø±ÙŠ Ø§Ù„Ø­ÙØ¸..." : "Saving...") : (lang === "ar" ? "Ø­ÙØ¸" : "Save")}
          </button>
        </div>
      </div>
    </div>
  );
};

// â”€â”€ Confirm Modal â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
      toast.error(lang === "ar" ? "ÙØ´Ù„ ØªØ­Ù…ÙŠÙ„ Ø§Ù„Ù…ÙˆØ±Ø¯ÙŠÙ†" : "Failed to load suppliers");
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
        ? (lang === "ar" ? "ØªÙ… Ø¥Ù„ØºØ§Ø¡ ØªÙØ¹ÙŠÙ„ Ø§Ù„Ù…ÙˆØ±Ø¯" : "Supplier deactivated")
        : (lang === "ar" ? "ØªÙ… ØªÙØ¹ÙŠÙ„ Ø§Ù„Ù…ÙˆØ±Ø¯" : "Supplier activated"));
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
      if (displayed.length === 0) { toast.warning(lang === "ar" ? "Ù„Ø§ ØªÙˆØ¬Ø¯ Ø¨ÙŠØ§Ù†Ø§Øª Ù„Ù„ØªØµØ¯ÙŠØ±" : "No data to export"); return; }
      const data = displayed.map(s => ({
        [lang === "ar" ? "Ø§Ø³Ù… Ø§Ù„Ù…ÙˆØ±Ø¯" : "Supplier Name"]: lang === "ar" ? s.nameAr : s.nameEn,
        [lang === "ar" ? "Ø§Ù„ÙƒÙˆØ¯" : "Code"]: s.code || "",
        [lang === "ar" ? "Ø§Ù„Ù‡Ø§ØªÙ" : "Phone"]: s.phone || "",
        [lang === "ar" ? "Ø§Ù„Ø¨Ø±ÙŠØ¯ Ø§Ù„Ø¥Ù„ÙƒØªØ±ÙˆÙ†ÙŠ" : "Email"]: s.email || "",
        [lang === "ar" ? "Ø§Ù„Ø¹Ù†ÙˆØ§Ù†" : "Address"]: s.address || "",
        [lang === "ar" ? "Ø§Ù„Ø±ØµÙŠØ¯ Ø§Ù„Ø­Ø§Ù„ÙŠ" : "Current Balance"]: s.balance || 0,
        [lang === "ar" ? "Ø§Ù„Ø­Ø§Ù„Ø©" : "Status"]: s.isActive !== false ? (lang === "ar" ? "Ù†Ø´Ø·" : "Active") : (lang === "ar" ? "ØºÙŠØ± Ù†Ø´Ø·" : "Inactive"),
      }));
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, lang === "ar" ? "Ø§Ù„Ù…ÙˆØ±Ø¯ÙŠÙ†" : "Suppliers");
      XLSX.writeFile(wb, `Suppliers_${new Date().toISOString().slice(0, 10)}.xlsx`);
      toast.success(lang === "ar" ? "ØªÙ… Ø§Ù„ØªØµØ¯ÙŠØ± Ø¨Ù†Ø¬Ø§Ø­" : "Exported successfully");
    } catch { toast.error(lang === "ar" ? "ÙØ´Ù„ Ø§Ù„ØªØµØ¯ÙŠØ±" : "Export failed"); }
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

        {/* â”€â”€ Page Header â”€â”€ */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {lang === "ar" ? "Ø§Ù„Ù…ÙˆØ±Ø¯ÙŠÙ†" : "Suppliers"}
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              {lang === "ar" ? "Ø¹Ø±Ø¶ ÙˆØ¥Ø¯Ø§Ø±Ø© Ø§Ù„Ù…ÙˆØ±Ø¯ÙŠÙ† ÙˆØ­Ø³Ø§Ø¨Ø§ØªÙ‡Ù…" : "View and manage suppliers and their accounts."}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleExport}
              className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 text-gray-700 bg-white rounded-xl hover:bg-gray-50 transition font-semibold text-sm shadow-sm"
            >
              <Download className="w-4 h-4" />
              {lang === "ar" ? "ØªØµØ¯ÙŠØ±" : "Export"}
            </button>
            <button
              onClick={() => setAddModal(true)}
              className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition font-semibold text-sm shadow-sm"
            >
              <Plus className="w-4 h-4" />
              {lang === "ar" ? "Ø¥Ø¶Ø§ÙØ© Ù…ÙˆØ±Ø¯" : "Add Supplier"}
            </button>
          </div>
        </div>

        {/* â”€â”€ Filters â”€â”€ */}
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder={lang === "ar" ? "Ø¨Ø­Ø« ÙÙŠ Ø§Ù„Ù…ÙˆØ±Ø¯ÙŠÙ†..." : "Search suppliers..."}
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
            <option value="ALL">{lang === "ar" ? "ÙƒÙ„ Ø§Ù„Ø­Ø§Ù„Ø§Øª" : "All Status"}</option>
            <option value="ACTIVE">{lang === "ar" ? "Ù†Ø´Ø·" : "Active"}</option>
            <option value="INACTIVE">{lang === "ar" ? "ØºÙŠØ± Ù†Ø´Ø·" : "Inactive"}</option>
          </select>

          {(searchTerm || filterStatus !== "ALL") && (
            <button
              onClick={() => { setSearchTerm(""); setFilterStatus("ALL"); }}
              className="text-sm text-indigo-600 hover:underline"
            >
              {lang === "ar" ? "Ù…Ø³Ø­ Ø§Ù„ÙÙ„Ø§ØªØ±" : "Clear"}
            </button>
          )}
        </div>

        {/* â”€â”€ Table â”€â”€ */}
        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
          {displayed.length === 0 ? (
            <div className="p-16 text-center">
              <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="font-medium text-gray-600">
                {lang === "ar" ? "Ù„Ø§ ÙŠÙˆØ¬Ø¯ Ù…ÙˆØ±Ø¯ÙŠÙ†" : "No suppliers found"}
              </p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <SortHeader label={lang === "ar" ? "Ø§Ù„Ù…ÙˆØ±Ø¯"         : "Supplier"}         field={lang === "ar" ? "nameAr" : "nameEn"} sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                  <SortHeader label={lang === "ar" ? "Ø§Ù„ÙƒÙˆØ¯"           : "Code"}             field="code"      sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                  <SortHeader label={lang === "ar" ? "Ø§Ù„Ù‡Ø§ØªÙ"          : "Phone"}            field="phone"     sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                  <SortHeader label={lang === "ar" ? "Ø§Ù„Ø±ØµÙŠØ¯ Ø§Ù„Ø­Ø§Ù„ÙŠ"   : "Balance"}          field="balance"   sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                  <SortHeader label={lang === "ar" ? "Ø§Ù„Ø­Ø§Ù„Ø©"          : "Status"}           field="isActive"  sortField={sortField} sortDir={sortDir} onSort={handleSort} />
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
                        : <span className="text-gray-400 text-sm">â€”</span>}
                    </td>

                    {/* Phone */}
                    <td className="px-4 py-3.5 text-sm text-gray-500">{supplier.phone || "â€”"}</td>

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

      {/* â”€â”€ Modals â”€â”€ */}
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
          entityLabelAr="\u0645\u0648\u0631\u062f"
          itemName={lang === "ar" ? toggleModal.supplier?.nameAr : toggleModal.supplier?.nameEn}
          itemSubtitle={toggleModal.supplier?.code ? `${lang === "ar" ? "\u0627\u0644\u0643\u0648\u062f" : "Code"}: ${toggleModal.supplier.code}` : ""}
          onConfirm={handleToggle}
          onClose={() => setToggleModal({ show: false, supplier: null })}
        />
      )}
    </div>
  );
}

