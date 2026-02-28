import { useState, useEffect, useContext, useRef } from "react";
import {
  Package, Search, Plus, Edit, Trash2, CheckCircle,
  ChevronUp, ChevronDown, MoreHorizontal, X, Download,
  ArrowLeftRight
} from "lucide-react";
import axiosInstance from "../../utils/axiosInstance";
import { getErrorMessage } from "../../utils/errorHandler";
import FullPageLoader from "../Loader/Loader";
import { LanguageContext } from "../../context/LanguageContext";
import * as XLSX from "xlsx";
import { toast } from "react-toastify";
import AdminActionModal from "../modals/AdminActionModal";

const UnitCategory = {
  WEIGHT: "weight",
  VOLUME: "volume",
  LENGTH: "length",
  AREA:   "area",
  COUNT:  "count",
};

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
    return <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">{lang === "ar" ? "Ù…Ø­Ø°ÙˆÙ" : "Inactive"}</span>;
  return <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">{lang === "ar" ? "Ù†Ø´Ø·" : "Active"}</span>;
};

// â”€â”€ Type badge â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const TypeBadge = ({ isBase, lang }) => (
  <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${isBase ? "bg-indigo-100 text-indigo-700" : "bg-gray-100 text-gray-700"}`}>
    {isBase ? (lang === "ar" ? "Ø£Ø³Ø§Ø³ÙŠØ©" : "Base") : (lang === "ar" ? "Ù…Ø´ØªÙ‚Ø©" : "Derived")}
  </span>
);

// â”€â”€ Category badge â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const CategoryBadge = ({ category, lang }) => {
  const labels = {
    weight: { ar: "ÙˆØ²Ù†",   en: "Weight" },
    volume: { ar: "Ø­Ø¬Ù…",   en: "Volume" },
    length: { ar: "Ø·ÙˆÙ„",   en: "Length" },
    area:   { ar: "Ù…Ø³Ø§Ø­Ø©", en: "Area"   },
    count:  { ar: "Ø¹Ø¯Ø¯",   en: "Count"  },
  };
  const label = labels[category]?.[lang === "ar" ? "ar" : "en"] || category;
  return (
    <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
      {label}
    </span>
  );
};

// â”€â”€ Three-dots menu â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const ActionsMenu = ({ unit, lang, onEdit, onDelete, onActivate }) => {
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
      const menuHeight = unit.isActive === false ? 80 : 80;
      const spaceBelow = window.innerHeight - rect.bottom;
      const top = spaceBelow < menuHeight ? rect.top - menuHeight - 4 : rect.bottom + 4;
      setMenuPos({ top, left: rect.right - 160 });
    }
    setOpen(o => !o);
  };

  return (
    <div className="relative" ref={ref}>
      <button ref={btnRef} onClick={handleOpen} className="p-1.5 rounded-md hover:bg-gray-100 transition text-gray-500">
        <MoreHorizontal className="w-5 h-5" />
      </button>

      {open && (
        <div style={{ position: "fixed", top: menuPos.top, left: menuPos.left }} className="w-40 bg-white border border-gray-200 rounded-xl shadow-lg z-50 py-1">
          <button onClick={() => { setOpen(false); onEdit(unit); }} className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition">
            <Edit className="w-4 h-4" />
            {lang === "ar" ? "ØªØ¹Ø¯ÙŠÙ„" : "Edit"}
          </button>

          {unit.isActive === false && (
            <button onClick={() => { setOpen(false); onActivate(unit); }} className="flex items-center gap-2 w-full px-4 py-2 text-sm text-green-600 hover:bg-green-50 transition">
              <CheckCircle className="w-4 h-4" />
              {lang === "ar" ? "ØªÙØ¹ÙŠÙ„" : "Activate"}
            </button>
          )}

          {unit.isActive !== false && (
            <button onClick={() => { setOpen(false); onDelete(unit); }} className="flex items-center gap-2 w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition">
              <Trash2 className="w-4 h-4" />
              {lang === "ar" ? "Ø­Ø°Ù" : "Delete"}
            </button>
          )}
        </div>
      )}
    </div>
  );
};

// â”€â”€ Add/Edit Modal â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const UnitModal = ({ lang, mode, unit: editUnit, baseUnits, units, onClose, onSaved }) => {
  const [form, setForm] = useState({
    nameAr:           editUnit?.nameAr || "",
    nameEn:           editUnit?.nameEn || "",
    code:             editUnit?.code || "",
    symbol:           editUnit?.symbol || "",
    category:         editUnit?.category || "",
    isBase:           editUnit?.isBase || false,
    baseUnitId:       editUnit?.baseUnitId?._id || editUnit?.baseUnitId || "",
    conversionFactor: editUnit?.conversionFactor || 1,
    description:      editUnit?.description || "",
  });
  const [submitting, setSubmitting] = useState(false);

  const getCategoryLabel = (cat) => {
    const labels = { weight: { ar: "ÙˆØ²Ù†", en: "Weight" }, volume: { ar: "Ø­Ø¬Ù…", en: "Volume" }, length: { ar: "Ø·ÙˆÙ„", en: "Length" }, area: { ar: "Ù…Ø³Ø§Ø­Ø©", en: "Area" }, count: { ar: "Ø¹Ø¯Ø¯", en: "Count" } };
    return labels[cat]?.[lang === "ar" ? "ar" : "en"] || cat;
  };

  const handleSubmit = async () => {
    if (!form.nameAr.trim() || !form.nameEn.trim() || !form.code.trim() || !form.symbol.trim() || !form.category) {
      toast.error(lang === "ar" ? "ÙŠØ±Ø¬Ù‰ Ù…Ù„Ø¡ Ø¬Ù…ÙŠØ¹ Ø§Ù„Ø­Ù‚ÙˆÙ„ Ø§Ù„Ù…Ø·Ù„ÙˆØ¨Ø©" : "Please fill all required fields");
      return;
    }
    const isDuplicateCode = units.some(u => u.code.toLowerCase() === form.code.toLowerCase() && (mode === "add" || u._id !== editUnit._id));
    if (isDuplicateCode) { toast.error(lang === "ar" ? "Ø§Ù„ÙƒÙˆØ¯ Ù…ÙˆØ¬ÙˆØ¯ Ù…Ø³Ø¨Ù‚Ø§Ù‹" : "Code already exists"); return; }

    const isDuplicateSymbol = units.some(u => u.symbol.toLowerCase() === form.symbol.toLowerCase() && (mode === "add" || u._id !== editUnit._id));
    if (isDuplicateSymbol) { toast.error(lang === "ar" ? "Ø§Ù„Ø±Ù…Ø² Ù…ÙˆØ¬ÙˆØ¯ Ù…Ø³Ø¨Ù‚Ø§Ù‹" : "Symbol already exists"); return; }

    if (form.isBase) {
      const existingBase = units.find(u => u.category === form.category && u.isBase && (mode === "add" || u._id !== editUnit._id));
      if (existingBase) { toast.error(lang === "ar" ? "Ù‡Ø°Ù‡ Ø§Ù„ÙØ¦Ø© Ù„Ø¯ÙŠÙ‡Ø§ ÙˆØ­Ø¯Ø© Ø£Ø³Ø§Ø³ÙŠØ© Ø¨Ø§Ù„ÙØ¹Ù„" : "This category already has a base unit"); return; }
    }
    if (!form.isBase && !form.baseUnitId) { toast.error(lang === "ar" ? "ÙŠØ±Ø¬Ù‰ Ø§Ø®ØªÙŠØ§Ø± Ø§Ù„ÙˆØ­Ø¯Ø© Ø§Ù„Ø£Ø³Ø§Ø³ÙŠØ©" : "Please select a base unit"); return; }
    if (!form.isBase && form.conversionFactor <= 0) { toast.error(lang === "ar" ? "Ù…Ø¹Ø§Ù…Ù„ Ø§Ù„ØªØ­ÙˆÙŠÙ„ ÙŠØ¬Ø¨ Ø£Ù† ÙŠÙƒÙˆÙ† Ø£ÙƒØ¨Ø± Ù…Ù† ØµÙØ±" : "Conversion factor must be greater than zero"); return; }

    try {
      setSubmitting(true);
      const payload = { nameAr: form.nameAr, nameEn: form.nameEn, code: form.code, symbol: form.symbol, category: form.category, isBase: form.isBase, description: form.description };
      if (!form.isBase) { payload.baseUnitId = form.baseUnitId; payload.conversionFactor = Number(form.conversionFactor) || 1; }

      if (mode === "add") await axiosInstance.post(`/units`, payload);
      else await axiosInstance.put(`/units/${editUnit._id}`, payload);

      toast.success(lang === "ar" ? "ØªÙ… Ø§Ù„Ø­ÙØ¸ Ø¨Ù†Ø¬Ø§Ø­" : "Saved successfully");
      onSaved();
      onClose();
    } catch (err) {
      toast.error(getErrorMessage(err, lang === "ar" ? "ÙØ´Ù„Øª Ø§Ù„Ø¹Ù…Ù„ÙŠØ©" : "Operation failed"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-gray-900">
            {mode === "add" ? (lang === "ar" ? "Ø¥Ø¶Ø§ÙØ© ÙˆØ­Ø¯Ø© Ø¬Ø¯ÙŠØ¯Ø©" : "Add New Unit") : (lang === "ar" ? "ØªØ¹Ø¯ÙŠÙ„ Ø§Ù„ÙˆØ­Ø¯Ø©" : "Edit Unit")}
          </h2>
          <button onClick={onClose} className="p-1 rounded-md hover:bg-gray-100 text-gray-400"><X className="w-5 h-5" /></button>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{lang === "ar" ? "Ø§Ù„Ø§Ø³Ù… Ø¨Ø§Ù„Ø¹Ø±Ø¨ÙŠØ©" : "Name (Arabic)"} <span className="text-red-500">*</span></label>
              <input type="text" value={form.nameAr} onChange={e => setForm(f => ({ ...f, nameAr: e.target.value }))} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition text-sm bg-gray-50" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{lang === "ar" ? "Ø§Ù„Ø§Ø³Ù… Ø¨Ø§Ù„Ø¥Ù†Ø¬Ù„ÙŠØ²ÙŠØ©" : "Name (English)"} <span className="text-red-500">*</span></label>
              <input type="text" value={form.nameEn} onChange={e => setForm(f => ({ ...f, nameEn: e.target.value }))} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition text-sm bg-gray-50" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{lang === "ar" ? "Ø§Ù„ÙƒÙˆØ¯" : "Code"} <span className="text-red-500">*</span></label>
              <input type="text" value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value }))} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition text-sm bg-gray-50" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{lang === "ar" ? "Ø§Ù„Ø±Ù…Ø²" : "Symbol"} <span className="text-red-500">*</span></label>
              <input type="text" value={form.symbol} onChange={e => setForm(f => ({ ...f, symbol: e.target.value }))} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition text-sm bg-gray-50" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{lang === "ar" ? "Ø§Ù„ÙØ¦Ø©" : "Category"} <span className="text-red-500">*</span></label>
              <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition text-sm bg-gray-50">
                <option value="">{lang === "ar" ? "Ø§Ø®ØªØ± Ø§Ù„ÙØ¦Ø©" : "Select Category"}</option>
                {Object.values(UnitCategory).map(cat => <option key={cat} value={cat}>{getCategoryLabel(cat)}</option>)}
              </select>
            </div>
            <div className="flex items-center pt-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.isBase} onChange={e => setForm(f => ({ ...f, isBase: e.target.checked, baseUnitId: "", conversionFactor: 1 }))} className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500" />
                <span className="text-sm font-medium text-gray-700">{lang === "ar" ? "ÙˆØ­Ø¯Ø© Ø£Ø³Ø§Ø³ÙŠØ©" : "Base Unit"}</span>
              </label>
            </div>
          </div>

          {!form.isBase && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{lang === "ar" ? "Ø§Ù„ÙˆØ­Ø¯Ø© Ø§Ù„Ø£Ø³Ø§Ø³ÙŠØ©" : "Base Unit"} <span className="text-red-500">*</span></label>
                <select value={form.baseUnitId} onChange={e => setForm(f => ({ ...f, baseUnitId: e.target.value }))} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition text-sm bg-gray-50">
                  <option value="">{lang === "ar" ? "Ø§Ø®ØªØ± Ø§Ù„ÙˆØ­Ø¯Ø© Ø§Ù„Ø£Ø³Ø§Ø³ÙŠØ©" : "Select Base Unit"}</option>
                  {baseUnits.map(u => <option key={u._id} value={u._id}>{lang === "ar" ? u.nameAr : u.nameEn} ({u.symbol})</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{lang === "ar" ? "Ù…Ø¹Ø§Ù…Ù„ Ø§Ù„ØªØ­ÙˆÙŠÙ„" : "Conversion Factor"} <span className="text-red-500">*</span></label>
                <input type="number" step="0.0001" value={form.conversionFactor} onChange={e => setForm(f => ({ ...f, conversionFactor: parseFloat(e.target.value) || 0 }))} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition text-sm bg-gray-50" />
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{lang === "ar" ? "Ø§Ù„ÙˆØµÙ" : "Description"}</label>
            <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows="2" placeholder={lang === "ar" ? "Ø£Ø¶Ù ÙˆØµÙØ§Ù‹ Ù„Ù„ÙˆØ­Ø¯Ø©..." : "Add unit description..."} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition text-sm bg-gray-50 resize-none" />
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

// â”€â”€ Convert Units Modal âœ… Ø¬Ø¯ÙŠØ¯ â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const ConvertModal = ({ lang, units, onClose }) => {
  const [form, setForm] = useState({ quantity: 1, fromUnitId: "", toUnitId: "" });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const activeUnits = units.filter(u => u.isActive !== false);
  const fromUnit = activeUnits.find(u => u._id === form.fromUnitId);

  const compatibleToUnits = form.fromUnitId
    ? activeUnits.filter(u => fromUnit && u.category === fromUnit.category && u._id !== form.fromUnitId)
    : activeUnits;

  // Ø¹ÙƒØ³ Ø§Ù„ÙˆØ­Ø¯ØªÙŠÙ†
  const handleSwap = () => {
    setForm(f => ({ ...f, fromUnitId: f.toUnitId, toUnitId: f.fromUnitId }));
    setResult(null);
  };

  const handleConvert = async () => {
    if (!form.fromUnitId || !form.toUnitId) {
      toast.error(lang === "ar" ? "ÙŠØ±Ø¬Ù‰ Ø§Ø®ØªÙŠØ§Ø± Ø§Ù„ÙˆØ­Ø¯ØªÙŠÙ†" : "Please select both units");
      return;
    }
    if (!form.quantity || Number(form.quantity) <= 0) {
      toast.error(lang === "ar" ? "Ø§Ù„ÙƒÙ…ÙŠØ© ÙŠØ¬Ø¨ Ø£Ù† ØªÙƒÙˆÙ† Ø£ÙƒØ¨Ø± Ù…Ù† ØµÙØ±" : "Quantity must be greater than zero");
      return;
    }
    try {
      setLoading(true);
      setResult(null);
      const { data } = await axiosInstance.post("/units/convert", {
        quantity:   Number(form.quantity),
        fromUnitId: form.fromUnitId,
        toUnitId:   form.toUnitId,
      });
      setResult(data.result || data);
    } catch (err) {
      toast.error(getErrorMessage(err, lang === "ar" ? "ÙØ´Ù„ Ø§Ù„ØªØ­ÙˆÙŠÙ„" : "Conversion failed"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center">
              <ArrowLeftRight className="w-4 h-4 text-indigo-600" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900">
              {lang === "ar" ? "ØªØ­ÙˆÙŠÙ„ Ø§Ù„ÙˆØ­Ø¯Ø§Øª" : "Convert Units"}
            </h2>
          </div>
          <button onClick={onClose} className="p-1 rounded-md hover:bg-gray-100 text-gray-400">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          {/* Quantity */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {lang === "ar" ? "Ø§Ù„ÙƒÙ…ÙŠØ©" : "Quantity"} <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              step="0.0001"
              min="0.0001"
              value={form.quantity}
              onChange={e => { setForm(f => ({ ...f, quantity: e.target.value })); setResult(null); }}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition text-sm bg-gray-50"
            />
          </div>

          {/* From + Swap + To ÙÙŠ ØµÙ ÙˆØ§Ø­Ø¯ */}
          <div className="flex items-end gap-2">

            {/* Ù…Ù† ÙˆØ­Ø¯Ø© */}
            <div className="flex-1 min-w-0">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {lang === "ar" ? "Ù…Ù†" : "From"} <span className="text-red-500">*</span>
              </label>
              <select
                value={form.fromUnitId}
                onChange={e => { setForm(f => ({ ...f, fromUnitId: e.target.value, toUnitId: "" })); setResult(null); }}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition text-sm bg-gray-50"
              >
                <option value="">{lang === "ar" ? "Ø§Ø®ØªØ±" : "Select"}</option>
                {activeUnits.map(u => (
                  <option key={u._id} value={u._id}>
                    {lang === "ar" ? u.nameAr : u.nameEn} ({u.symbol})
                  </option>
                ))}
              </select>
            </div>

            {/* Ø²Ø±Ø§Ø± Ø§Ù„Ø¹ÙƒØ³ */}
            <button
              type="button"
              onClick={handleSwap}
              disabled={!form.fromUnitId || !form.toUnitId}
              title={lang === "ar" ? "Ø¹ÙƒØ³ Ø§Ù„ÙˆØ­Ø¯ØªÙŠÙ†" : "Swap units"}
              className="flex-shrink-0 mb-0.5 p-2.5 rounded-xl border border-gray-200 bg-white hover:bg-indigo-50 hover:border-indigo-300 transition text-gray-400 hover:text-indigo-600 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ArrowLeftRight className="w-4 h-4" />
            </button>

            {/* Ø¥Ù„Ù‰ ÙˆØ­Ø¯Ø© */}
            <div className="flex-1 min-w-0">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {lang === "ar" ? "Ø¥Ù„Ù‰" : "To"} <span className="text-red-500">*</span>
              </label>
              <select
                value={form.toUnitId}
                onChange={e => { setForm(f => ({ ...f, toUnitId: e.target.value })); setResult(null); }}
                disabled={!form.fromUnitId}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition text-sm bg-gray-50 disabled:opacity-50"
              >
                <option value="">{lang === "ar" ? "Ø§Ø®ØªØ±" : "Select"}</option>
                {compatibleToUnits.map(u => (
                  <option key={u._id} value={u._id}>
                    {lang === "ar" ? u.nameAr : u.nameEn} ({u.symbol})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* ØªÙ†Ø¨ÙŠÙ‡ Ù„Ùˆ Ù…ÙÙŠØ´ ÙˆØ­Ø¯Ø§Øª Ù…ØªÙˆØ§ÙÙ‚Ø© */}
          {form.fromUnitId && compatibleToUnits.length === 0 && (
            <p className="text-xs text-amber-600">
              {lang === "ar" ? "Ù„Ø§ ØªÙˆØ¬Ø¯ ÙˆØ­Ø¯Ø§Øª Ù…ØªÙˆØ§ÙÙ‚Ø© ÙÙŠ Ù†ÙØ³ Ø§Ù„ÙØ¦Ø©" : "No compatible units in the same category"}
            </p>
          )}

          {/* Ù†ØªÙŠØ¬Ø© Ø§Ù„ØªØ­ÙˆÙŠÙ„ */}
          {result && (
            <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4">
              <p className="text-xs font-medium text-indigo-400 mb-3">
                {lang === "ar" ? "Ù†ØªÙŠØ¬Ø© Ø§Ù„ØªØ­ÙˆÙŠÙ„" : "Conversion Result"}
              </p>

              {/* Ø§Ù„Ø³Ø·Ø± Ø§Ù„Ø±Ø¦ÙŠØ³ÙŠ: Ø§Ù„ÙƒÙ…ÙŠØ© = Ø§Ù„Ù†Ø§ØªØ¬ */}
              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex items-baseline gap-1.5">
                  <span className="text-2xl font-bold text-gray-800">{result.originalQuantity}</span>
                  <span className="text-sm font-semibold text-indigo-500">{result.originalUnit?.symbol}</span>
                </div>
                <span className="text-gray-300 text-xl">=</span>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-2xl font-bold text-indigo-700">{result.convertedQuantity}</span>
                  <span className="text-sm font-semibold text-indigo-500">{result.convertedUnit?.symbol}</span>
                </div>
              </div>

              {/* Ø§Ù„Ø£Ø³Ù…Ø§Ø¡ Ø§Ù„ÙƒØ§Ù…Ù„Ø© Ø¨Ø§Ù„Ø¹Ø±Ø¨ÙŠ */}
              <p className="text-xs text-gray-400 mt-2">
                {result.originalUnit?.nameAr}
                <span className="mx-1.5">â†</span>
                {result.convertedUnit?.nameAr}
              </p>
            </div>
          )}
        </div>

        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition font-medium text-sm">
            {lang === "ar" ? "Ø¥ØºÙ„Ø§Ù‚" : "Close"}
          </button>
          <button
            onClick={handleConvert}
            disabled={loading || !form.fromUnitId || !form.toUnitId}
            className="flex-1 px-4 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition font-medium text-sm disabled:opacity-50"
          >
            {loading
              ? (lang === "ar" ? "Ø¬Ø§Ø±ÙŠ Ø§Ù„ØªØ­ÙˆÙŠÙ„..." : "Converting...")
              : (lang === "ar" ? "ØªØ­ÙˆÙŠÙ„" : "Convert")}
          </button>
        </div>
      </div>
    </div>
  );
};

// â”€â”€ Confirm Modal â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export default function Units() {
  const { lang } = useContext(LanguageContext);

  const [units,          setUnits]          = useState([]);
  const [baseUnits,      setBaseUnits]      = useState([]);
  const [loading,        setLoading]        = useState(true);

  // âœ… Server-side search state
  const [searchTerm,     setSearchTerm]     = useState("");
  const [searchResults,  setSearchResults]  = useState(null); // null = Ù…Ø´ Ø¨ÙŠØ³ÙŠØ±Ø´
  const [searching,      setSearching]      = useState(false);

  const [filterCat,      setFilterCat]      = useState("all");
  const [filterStatus,   setFilterStatus]   = useState("ALL");
  const [sortField,      setSortField]      = useState("nameEn");
  const [sortDir,        setSortDir]        = useState("asc");
  const [addModal,       setAddModal]       = useState(false);
  const [editTarget,     setEditTarget]     = useState(null);
  const [convertModal,   setConvertModal]   = useState(false); // âœ… Ø¬Ø¯ÙŠØ¯
  const [deleteModal,    setDeleteModal]    = useState({ show: false, unit: null });
  const [activateModal,  setActivateModal]  = useState({ show: false, unit: null });

  useEffect(() => { fetchUnits(); fetchBaseUnits(); }, [filterCat]);

  // âœ… Debounced server-side search
  useEffect(() => {
    if (!searchTerm.trim()) {
      setSearchResults(null);
      return;
    }

    setSearching(true);
    const timer = setTimeout(async () => {
      try {
        const { data } = await axiosInstance.get(`/units/search?q=${encodeURIComponent(searchTerm.trim())}`);
        setSearchResults(data.result || data || []);
      } catch {
        toast.error(lang === "ar" ? "ÙØ´Ù„ Ø§Ù„Ø¨Ø­Ø«" : "Search failed");
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, 400);

    return () => { clearTimeout(timer); setSearching(false); };
  }, [searchTerm]);

  const fetchUnits = async () => {
    try {
      setLoading(true);
      // âœ… Ø§Ø³ØªØ®Ø¯Ù… Ø§Ù„Ù€ category query parameter Ø§Ù„Ù…ÙˆØ¬ÙˆØ¯ ÙÙŠ Ø§Ù„Ø¨Ø§Ùƒ
      const url = filterCat === "all" ? `/units` : `/units?category=${filterCat}`;
      const res = await axiosInstance.get(url);
      setUnits(res.data.result || []);
    } catch {
      toast.error(lang === "ar" ? "ÙØ´Ù„ ØªØ­Ù…ÙŠÙ„ Ø§Ù„ÙˆØ­Ø¯Ø§Øª" : "Failed to load units");
    } finally {
      setLoading(false);
    }
  };

  const fetchBaseUnits = async () => {
    try {
      // âœ… GET /units/base
      const res = await axiosInstance.get("/units/base");
      setBaseUnits(res.data.result || []);
    } catch {}
  };

  const handleDelete = async () => {
    try {
      await axiosInstance.delete(`/units/${deleteModal.unit._id}`);
      toast.success(lang === "ar" ? "ØªÙ… Ø­Ø°Ù Ø§Ù„ÙˆØ­Ø¯Ø© Ø¨Ù†Ø¬Ø§Ø­" : "Unit deleted");
      setDeleteModal({ show: false, unit: null });
      fetchUnits(); fetchBaseUnits();
    } catch (err) {
      toast.error(getErrorMessage(err, lang === "ar" ? "ÙØ´Ù„ Ø§Ù„Ø­Ø°Ù" : "Delete failed"));
    }
  };

  const handleActivate = async () => {
    try {
      // âœ… PATCH /units/:id/activate
      await axiosInstance.patch(`/units/${activateModal.unit._id}/activate`);
      toast.success(lang === "ar" ? "ØªÙ… ØªÙØ¹ÙŠÙ„ Ø§Ù„ÙˆØ­Ø¯Ø© Ø¨Ù†Ø¬Ø§Ø­" : "Unit activated");
      setActivateModal({ show: false, unit: null });
      fetchUnits();
    } catch (err) {
      toast.error(getErrorMessage(err, lang === "ar" ? "ÙØ´Ù„ Ø§Ù„ØªÙØ¹ÙŠÙ„" : "Activation failed"));
    }
  };

  const handleSort = (field) => {
    if (sortField === field) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortField(field); setSortDir("asc"); }
  };

  const getCategoryLabel = (cat) => {
    const labels = { weight: { ar: "ÙˆØ²Ù†", en: "Weight" }, volume: { ar: "Ø­Ø¬Ù…", en: "Volume" }, length: { ar: "Ø·ÙˆÙ„", en: "Length" }, area: { ar: "Ù…Ø³Ø§Ø­Ø©", en: "Area" }, count: { ar: "Ø¹Ø¯Ø¯", en: "Count" } };
    return labels[cat]?.[lang === "ar" ? "ar" : "en"] || cat;
  };

  const handleExport = () => {
    try {
      const data = displayed.map(u => ({
        [lang === "ar" ? "Ø§Ù„Ø§Ø³Ù… Ø¨Ø§Ù„Ø¹Ø±Ø¨ÙŠØ©" : "Name (Arabic)"]: u.nameAr,
        [lang === "ar" ? "Ø§Ù„Ø§Ø³Ù… Ø¨Ø§Ù„Ø¥Ù†Ø¬Ù„ÙŠØ²ÙŠØ©" : "Name (English)"]: u.nameEn,
        [lang === "ar" ? "Ø§Ù„ÙƒÙˆØ¯" : "Code"]: u.code,
        [lang === "ar" ? "Ø§Ù„Ø±Ù…Ø²" : "Symbol"]: u.symbol,
        [lang === "ar" ? "Ø§Ù„ÙØ¦Ø©" : "Category"]: getCategoryLabel(u.category),
        [lang === "ar" ? "Ø§Ù„Ù†ÙˆØ¹" : "Type"]: u.isBase ? (lang === "ar" ? "Ø£Ø³Ø§Ø³ÙŠØ©" : "Base") : (lang === "ar" ? "Ù…Ø´ØªÙ‚Ø©" : "Derived"),
        [lang === "ar" ? "Ù…Ø¹Ø§Ù…Ù„ Ø§Ù„ØªØ­ÙˆÙŠÙ„" : "Conversion Factor"]: u.conversionFactor || 1,
        [lang === "ar" ? "Ø§Ù„Ø­Ø§Ù„Ø©" : "Status"]: u.isActive !== false ? (lang === "ar" ? "Ù†Ø´Ø·" : "Active") : (lang === "ar" ? "Ù…Ø­Ø°ÙˆÙ" : "Inactive"),
      }));
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, lang === "ar" ? "Ø§Ù„ÙˆØ­Ø¯Ø§Øª" : "Units");
      XLSX.writeFile(wb, `Units_${new Date().toISOString().slice(0, 10)}.xlsx`);
      toast.success(lang === "ar" ? "ØªÙ… Ø§Ù„ØªØµØ¯ÙŠØ± Ø¨Ù†Ø¬Ø§Ø­" : "Exported successfully");
    } catch {
      toast.error(lang === "ar" ? "ÙØ´Ù„ Ø§Ù„ØªØµØ¯ÙŠØ±" : "Export failed");
    }
  };

  // âœ… Filter + Sort - Ø¨ÙŠØ´ØªØºÙ„ Ø¹Ù„Ù‰ server search results Ø£Ùˆ ÙƒÙ„ Ø§Ù„ÙˆØ­Ø¯Ø§Øª
  const displayed = (searchResults !== null ? searchResults : units)
    .filter(u => {
      const matchStatus = filterStatus === "ALL"
        || (filterStatus === "ACTIVE"   && u.isActive !== false)
        || (filterStatus === "INACTIVE" && u.isActive === false);
      return matchStatus;
    })
    .sort((a, b) => {
      let va = a[sortField] ?? "";
      let vb = b[sortField] ?? "";
      if (typeof va === "string") va = va.toLowerCase();
      if (typeof vb === "string") vb = vb.toLowerCase();
      return sortDir === "asc" ? (va > vb ? 1 : -1) : (va < vb ? 1 : -1);
    });

  const handleClearFilters = () => {
    setSearchTerm("");
    setSearchResults(null);
    setFilterCat("all");
    setFilterStatus("ALL");
  };

  const isFiltering = searchTerm || filterCat !== "all" || filterStatus !== "ALL";

  if (loading && units.length === 0)
    return <FullPageLoader text={lang === "ar" ? "Ø¬Ø§Ø±ÙŠ ØªØ­Ù…ÙŠÙ„ Ø§Ù„ÙˆØ­Ø¯Ø§Øª..." : "Loading units..."} />;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">

        {/* â”€â”€ Page Header â”€â”€ */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {lang === "ar" ? "Ø¥Ø¯Ø§Ø±Ø© Ø§Ù„ÙˆØ­Ø¯Ø§Øª" : "Units Management"}
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              {lang === "ar" ? "Ø¹Ø±Ø¶ ÙˆØ¥Ø¯Ø§Ø±Ø© ÙˆØ­Ø¯Ø§Øª Ø§Ù„Ù‚ÙŠØ§Ø³ Ø§Ù„Ù…Ø³ØªØ®Ø¯Ù…Ø© ÙÙŠ Ø§Ù„Ù†Ø¸Ø§Ù…" : "View and manage measurement units used in the system."}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {/* âœ… Ø²Ø±Ø§Ø± Convert Units Ø¬Ø¯ÙŠØ¯ */}
            <button
              onClick={() => setConvertModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 text-gray-700 bg-white rounded-xl hover:bg-gray-50 transition font-semibold text-sm shadow-sm"
            >
              <ArrowLeftRight className="w-4 h-4" />
              {lang === "ar" ? "ØªØ­ÙˆÙŠÙ„" : "Convert"}
            </button>
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
              {lang === "ar" ? "Ø¥Ø¶Ø§ÙØ© ÙˆØ­Ø¯Ø©" : "Add Unit"}
            </button>
          </div>
        </div>

        {/* â”€â”€ Filters â”€â”€ */}
        <div className="flex flex-wrap items-center gap-3 mb-4">
          {/* âœ… Server-side search Ù…Ø¹ spinner */}
          <div className="relative flex-1 min-w-[220px]">
            {searching ? (
              <div className="absolute left-3 top-1/2 -translate-y-1/2">
                <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            )}
            <input
              type="text"
              placeholder={lang === "ar" ? "Ø¨Ø­Ø« ÙÙŠ Ø§Ù„ÙˆØ­Ø¯Ø§Øª..." : "Search units..."}
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
            />
          </div>

          <select
            value={filterCat}
            onChange={e => setFilterCat(e.target.value)}
            className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
          >
            <option value="all">{lang === "ar" ? "ÙƒÙ„ Ø§Ù„ÙØ¦Ø§Øª" : "All Categories"}</option>
            {Object.values(UnitCategory).map(cat => <option key={cat} value={cat}>{getCategoryLabel(cat)}</option>)}
          </select>

          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
          >
            <option value="ALL">{lang === "ar" ? "ÙƒÙ„ Ø§Ù„Ø­Ø§Ù„Ø§Øª" : "All Status"}</option>
            <option value="ACTIVE">{lang === "ar" ? "Ù†Ø´Ø·" : "Active"}</option>
            <option value="INACTIVE">{lang === "ar" ? "Ù…Ø­Ø°ÙˆÙ" : "Inactive"}</option>
          </select>

          {isFiltering && (
            <button onClick={handleClearFilters} className="text-sm text-indigo-600 hover:underline">
              {lang === "ar" ? "Ù…Ø³Ø­ Ø§Ù„ÙÙ„Ø§ØªØ±" : "Clear"}
            </button>
          )}
        </div>

        {/* â”€â”€ Table â”€â”€ */}
        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
          {displayed.length === 0 ? (
            <div className="p-16 text-center">
              <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="font-medium text-gray-600">
                {lang === "ar" ? "Ù„Ø§ ØªÙˆØ¬Ø¯ ÙˆØ­Ø¯Ø§Øª" : "No units found"}
              </p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <SortHeader label={lang === "ar" ? "Ø§Ù„ÙˆØ­Ø¯Ø©" : "Unit"}   field={lang === "ar" ? "nameAr" : "nameEn"} sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                  <SortHeader label={lang === "ar" ? "Ø§Ù„ÙƒÙˆØ¯" : "Code"}     field="code"     sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                  <SortHeader label={lang === "ar" ? "Ø§Ù„Ø±Ù…Ø²" : "Symbol"}   field="symbol"   sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                  <SortHeader label={lang === "ar" ? "Ø§Ù„ÙØ¦Ø©" : "Category"} field="category" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                  <SortHeader label={lang === "ar" ? "Ø§Ù„Ù†ÙˆØ¹" : "Type"}     field="isBase"   sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                  <SortHeader label={lang === "ar" ? "Ø§Ù„Ø­Ø§Ù„Ø©" : "Status"}  field="isActive" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {displayed.map(unit => (
                  <tr key={unit._id} className="hover:bg-gray-50/60 transition">
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
                          <span className="text-indigo-600 font-semibold text-sm">{unit.symbol?.charAt(0).toUpperCase()}</span>
                        </div>
                        <div>
                          <span className="font-medium text-gray-900 text-sm block">{lang === "ar" ? unit.nameAr : unit.nameEn}</span>
                          {unit.description && <span className="text-xs text-gray-400 truncate max-w-[180px] block">{unit.description}</span>}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5"><span className="px-2.5 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-700">{unit.code}</span></td>
                    <td className="px-4 py-3.5 text-sm text-gray-500 font-medium">{unit.symbol}</td>
                    <td className="px-4 py-3.5"><CategoryBadge category={unit.category} lang={lang} /></td>
                    <td className="px-4 py-3.5"><TypeBadge isBase={unit.isBase} lang={lang} /></td>
                    <td className="px-4 py-3.5"><StatusBadge isActive={unit.isActive} lang={lang} /></td>
                    <td className="px-4 py-3.5 text-right">
                      <ActionsMenu
                        unit={unit}
                        lang={lang}
                        onEdit={u => setEditTarget(u)}
                        onDelete={u => setDeleteModal({ show: true, unit: u })}
                        onActivate={u => setActivateModal({ show: true, unit: u })}
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
        <UnitModal lang={lang} mode="add" baseUnits={baseUnits} units={units}
          onClose={() => setAddModal(false)}
          onSaved={() => { fetchUnits(); fetchBaseUnits(); }} />
      )}
      {editTarget && (
        <UnitModal lang={lang} mode="edit" unit={editTarget} baseUnits={baseUnits} units={units}
          onClose={() => setEditTarget(null)}
          onSaved={() => { fetchUnits(); fetchBaseUnits(); }} />
      )}
      {/* âœ… Convert Modal Ø¬Ø¯ÙŠØ¯ */}
      {convertModal && (
        <ConvertModal lang={lang} units={units} onClose={() => setConvertModal(false)} />
      )}
      {deleteModal.show && (
        <AdminActionModal
          type="delete"
          lang={lang}
          entityLabelEn="unit"
          entityLabelAr="\u0648\u062d\u062f\u0629"
          itemName={lang === "ar" ? deleteModal.unit?.nameAr : deleteModal.unit?.nameEn}
          itemSubtitle={`${lang === "ar" ? "\u0627\u0644\u0643\u0648\u062f" : "Code"}: ${deleteModal.unit?.code || "-"}${deleteModal.unit?.symbol ? ` | ${lang === "ar" ? "\u0627\u0644\u0631\u0645\u0632" : "Symbol"}: ${deleteModal.unit.symbol}` : ""}`}
          onConfirm={handleDelete}
          onClose={() => setDeleteModal({ show: false, unit: null })}
        />
      )}
      {activateModal.show && (
        <AdminActionModal
          type="activate"
          lang={lang}
          entityLabelEn="unit"
          entityLabelAr="\u0648\u062d\u062f\u0629"
          itemName={lang === "ar" ? activateModal.unit?.nameAr : activateModal.unit?.nameEn}
          itemSubtitle={`${lang === "ar" ? "\u0627\u0644\u0643\u0648\u062f" : "Code"}: ${activateModal.unit?.code || "-"}${activateModal.unit?.symbol ? ` | ${lang === "ar" ? "\u0627\u0644\u0631\u0645\u0632" : "Symbol"}: ${activateModal.unit.symbol}` : ""}`}
          onConfirm={handleActivate}
          onClose={() => setActivateModal({ show: false, unit: null })}
        />
      )}
    </div>
  );
}

