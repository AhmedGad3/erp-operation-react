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

//  Type badge 
const TypeBadge = ({ isBase, lang }) => (
  <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${isBase ? "bg-indigo-100 text-indigo-700" : "bg-gray-100 text-gray-700"}`}>
    {isBase ? "Base" : "Derived"}
  </span>
);

//  Category badge 
const CategoryBadge = ({ category, lang }) => {
  const labels = {
    weight: { ar: "وزن",   en: lang === 'ar' ? 'وزن'    : 'Weight' },
    volume: { ar: "حجم",   en: lang === 'ar' ? 'حجم'    : 'Volume' },
    length: { ar: "طول",   en: lang === 'ar' ? 'طول'    : 'Length' },
    area:   { ar: "مساحة", en: lang === 'ar' ? 'مساحة'  : 'Area'   },
    count:  { ar: "عدد",   en: lang === 'ar' ? 'عدد'    : 'Count'  },
  };
  const label = labels[category]?.["en"] || category;
  return (
    <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
      {label}
    </span>
  );
};

//  Three-dots menu 
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
      const menuHeight = 80;
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
            {lang === 'ar' ? 'تعديل' : 'Edit'}
          </button>

          {unit.isActive === false && (
            <button onClick={() => { setOpen(false); onActivate(unit); }} className="flex items-center gap-2 w-full px-4 py-2 text-sm text-green-600 hover:bg-green-50 transition">
              <CheckCircle className="w-4 h-4" />
              {lang === 'ar' ? 'تفعيل' : 'Activate'}
            </button>
          )}

          {unit.isActive !== false && (
            <button onClick={() => { setOpen(false); onDelete(unit); }} className="flex items-center gap-2 w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition">
              <Trash2 className="w-4 h-4" />
              {lang === 'ar' ? 'حذف' : 'Delete'}
            </button>
          )}
        </div>
      )}
    </div>
  );
};

//  Add/Edit Modal 
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
    const labels = {
      weight: { ar: "وزن",   en: lang === 'ar' ? 'وزن'   : 'Weight' },
      volume: { ar: "حجم",   en: lang === 'ar' ? 'حجم'   : 'Volume' },
      length: { ar: "طول",   en: lang === 'ar' ? 'طول'   : 'Length' },
      area:   { ar: "مساحة", en: lang === 'ar' ? 'مساحة' : 'Area'   },
      count:  { ar: "عدد",   en: lang === 'ar' ? 'عدد'   : 'Count'  },
    };
    return labels[cat]?.["en"] || cat;
  };

  const handleSubmit = async () => {
    if (!form.nameAr.trim() || !form.nameEn.trim() || !form.code.trim() || !form.symbol.trim() || !form.category) {
      toast.error(lang === 'ar' ? 'يرجى ملء جميع الحقول المطلوبة' : 'Please fill all required fields');
      return;
    }
    const isDuplicateCode = units.some(u => u.code.toLowerCase() === form.code.toLowerCase() && (mode === "add" || u._id !== editUnit._id));
    if (isDuplicateCode) { toast.error(lang === 'ar' ? 'الكود موجود مسبقًا' : 'Code already exists'); return; }

    const isDuplicateSymbol = units.some(u => u.symbol.toLowerCase() === form.symbol.toLowerCase() && (mode === "add" || u._id !== editUnit._id));
    if (isDuplicateSymbol) { toast.error(lang === 'ar' ? 'الرمز موجود مسبقًا' : 'Symbol already exists'); return; }

    if (form.isBase) {
      const existingBase = units.find(u => u.category === form.category && u.isBase && (mode === "add" || u._id !== editUnit._id));
      if (existingBase) { toast.error(lang === 'ar' ? 'هذه الفئة تحتوي بالفعل على وحدة أساسية' : 'This category already has a base unit'); return; }
    }
    if (!form.isBase && !form.baseUnitId) { toast.error(lang === 'ar' ? 'يرجى اختيار وحدة أساسية' : 'Please select a base unit'); return; }
    if (!form.isBase && form.conversionFactor <= 0) { toast.error(lang === 'ar' ? 'معامل التحويل يجب أن يكون أكبر من صفر' : 'Conversion factor must be greater than zero'); return; }

    try {
      setSubmitting(true);
      const payload = { nameAr: form.nameAr, nameEn: form.nameEn, code: form.code, symbol: form.symbol, category: form.category, isBase: form.isBase, description: form.description };
      if (!form.isBase) { payload.baseUnitId = form.baseUnitId; payload.conversionFactor = Number(form.conversionFactor) || 1; }

      if (mode === "add") await axiosInstance.post(`/units`, payload);
      else await axiosInstance.put(`/units/${editUnit._id}`, payload);

      toast.success(lang === 'ar' ? 'تم الحفظ بنجاح' : 'Saved successfully');
      onSaved();
      onClose();
    } catch (err) {
      toast.error(getErrorMessage(err, lang === 'ar' ? 'فشلت العملية' : 'Operation failed'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-gray-900">
            {mode === "add" ? (lang === 'ar' ? 'إضافة وحدة جديدة' : 'Add New Unit') : (lang === 'ar' ? 'تعديل الوحدة' : 'Edit Unit')}
          </h2>
          <button onClick={onClose} className="p-1 rounded-md hover:bg-gray-100 text-gray-400"><X className="w-5 h-5" /></button>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{lang === 'ar' ? 'الاسم بالعربية' : 'Name (Arabic)'} <span className="text-red-500">*</span></label>
              <input type="text" value={form.nameAr} onChange={e => setForm(f => ({ ...f, nameAr: e.target.value }))} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition text-sm bg-gray-50" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{lang === 'ar' ? 'الاسم بالإنجليزية' : 'Name (English)'} <span className="text-red-500">*</span></label>
              <input type="text" value={form.nameEn} onChange={e => setForm(f => ({ ...f, nameEn: e.target.value }))} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition text-sm bg-gray-50" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{lang === 'ar' ? 'الكود' : 'Code'} <span className="text-red-500">*</span></label>
              <input type="text" value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value }))} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition text-sm bg-gray-50" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{lang === 'ar' ? 'الرمز' : 'Symbol'} <span className="text-red-500">*</span></label>
              <input type="text" value={form.symbol} onChange={e => setForm(f => ({ ...f, symbol: e.target.value }))} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition text-sm bg-gray-50" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{lang === 'ar' ? 'الفئة' : 'Category'} <span className="text-red-500">*</span></label>
              <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition text-sm bg-gray-50">
                <option value="">{lang === 'ar' ? 'اختر الفئة' : 'Select Category'}</option>
                {Object.values(UnitCategory).map(cat => <option key={cat} value={cat}>{getCategoryLabel(cat)}</option>)}
              </select>
            </div>
            <div className="flex items-center pt-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.isBase} onChange={e => setForm(f => ({ ...f, isBase: e.target.checked, baseUnitId: "", conversionFactor: 1 }))} className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500" />
                <span className="text-sm font-medium text-gray-700">{lang === 'ar' ? 'وحدة أساسية' : 'Base Unit'}</span>
              </label>
            </div>
          </div>

          {!form.isBase && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{lang === 'ar' ? 'وحدة أساسية' : 'Base Unit'} <span className="text-red-500">*</span></label>
                <select value={form.baseUnitId} onChange={e => setForm(f => ({ ...f, baseUnitId: e.target.value }))} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition text-sm bg-gray-50">
                  <option value="">{lang === 'ar' ? 'اختر الوحدة الأساسية' : 'Select Base Unit'}</option>
                  {baseUnits.map(u => <option key={u._id} value={u._id}>{lang === "ar" ? u.nameAr : u.nameEn} ({u.symbol})</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{lang === 'ar' ? 'معامل التحويل' : 'Conversion Factor'} <span className="text-red-500">*</span></label>
                <input type="number" step="0.0001" value={form.conversionFactor} onChange={e => setForm(f => ({ ...f, conversionFactor: parseFloat(e.target.value) || 0 }))} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition text-sm bg-gray-50" />
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{lang === 'ar' ? 'الوصف' : 'Description'}</label>
            <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows="2" placeholder={lang === 'ar' ? 'أضف وصفًا للوحدة...' : 'Add unit description...'} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition text-sm bg-gray-50 resize-none" />
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

//  Convert Units Modal 
const ConvertModal = ({ lang, units, onClose }) => {
  const [form, setForm] = useState({ quantity: 1, fromUnitId: "", toUnitId: "" });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const activeUnits = units.filter(u => u.isActive !== false);
  const fromUnit = activeUnits.find(u => u._id === form.fromUnitId);

  const compatibleToUnits = form.fromUnitId
    ? activeUnits.filter(u => fromUnit && u.category === fromUnit.category && u._id !== form.fromUnitId)
    : activeUnits;

  const handleSwap = () => {
    setForm(f => ({ ...f, fromUnitId: f.toUnitId, toUnitId: f.fromUnitId }));
    setResult(null);
  };

  const handleConvert = async () => {
    if (!form.fromUnitId || !form.toUnitId) {
      toast.error(lang === 'ar' ? 'يرجى اختيار الوحدتين' : 'Please select both units');
      return;
    }
    if (!form.quantity || Number(form.quantity) <= 0) {
      toast.error(lang === 'ar' ? 'الكمية يجب أن تكون أكبر من صفر' : 'Quantity must be greater than zero');
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
      toast.error(getErrorMessage(err, lang === 'ar' ? 'فشل التحويل' : 'Conversion failed'));
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
              {lang === 'ar' ? 'تحويل الوحدات' : 'Convert Units'}
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
              {lang === 'ar' ? 'الكمية' : 'Quantity'} <span className="text-red-500">*</span>
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

          {/* From + Swap + To */}
          <div className="flex items-end gap-2">
            <div className="flex-1 min-w-0">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {lang === 'ar' ? 'من' : 'From'} <span className="text-red-500">*</span>
              </label>
              <select
                value={form.fromUnitId}
                onChange={e => { setForm(f => ({ ...f, fromUnitId: e.target.value, toUnitId: "" })); setResult(null); }}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition text-sm bg-gray-50"
              >
                <option value="">{lang === 'ar' ? 'اختر' : 'Select'}</option>
                {activeUnits.map(u => (
                  <option key={u._id} value={u._id}>
                    {lang === "ar" ? u.nameAr : u.nameEn} ({u.symbol})
                  </option>
                ))}
              </select>
            </div>

            {/* Swap button */}
            <button
              type="button"
              onClick={handleSwap}
              disabled={!form.fromUnitId || !form.toUnitId}
              title={lang === 'ar' ? 'عكس الوحدتين' : 'Swap units'}
              className="flex-shrink-0 mb-0.5 p-2.5 rounded-xl border border-gray-200 bg-white hover:bg-indigo-50 hover:border-indigo-300 transition text-gray-400 hover:text-indigo-600 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ArrowLeftRight className="w-4 h-4" />
            </button>

            <div className="flex-1 min-w-0">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {lang === 'ar' ? 'إلى' : 'To'} <span className="text-red-500">*</span>
              </label>
              <select
                value={form.toUnitId}
                onChange={e => { setForm(f => ({ ...f, toUnitId: e.target.value })); setResult(null); }}
                disabled={!form.fromUnitId}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition text-sm bg-gray-50 disabled:opacity-50"
              >
                <option value="">{lang === 'ar' ? 'اختر' : 'Select'}</option>
                {compatibleToUnits.map(u => (
                  <option key={u._id} value={u._id}>
                    {lang === "ar" ? u.nameAr : u.nameEn} ({u.symbol})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {form.fromUnitId && compatibleToUnits.length === 0 && (
            <p className="text-xs text-amber-600">
              {lang === 'ar' ? 'لا توجد وحدات متوافقة في نفس الفئة' : 'No compatible units in the same category'}
            </p>
          )}

          {/* Result */}
          {result && (
            <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4">
              <p className="text-xs font-medium text-indigo-400 mb-3">
                {lang === 'ar' ? 'نتيجة التحويل' : 'Conversion Result'}
              </p>

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

              <p className="text-xs text-gray-400 mt-2">
                {result.originalUnit?.nameAr}
                <span className="mx-1.5"> </span>
                {result.convertedUnit?.nameAr}
              </p>
            </div>
          )}
        </div>

        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition font-medium text-sm">
            {lang === 'ar' ? 'إغلاق' : 'Close'}
          </button>
          <button
            onClick={handleConvert}
            disabled={loading || !form.fromUnitId || !form.toUnitId}
            className="flex-1 px-4 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition font-medium text-sm disabled:opacity-50"
          >
            {loading
              ? (lang === 'ar' ? 'جاري التحويل...' : 'Converting...')
              : (lang === 'ar' ? 'تحويل' : 'Convert')}
          </button>
        </div>
      </div>
    </div>
  );
};

//  Main Component 
export default function Units() {
  const { lang } = useContext(LanguageContext);

  const [units,          setUnits]          = useState([]);
  const [baseUnits,      setBaseUnits]      = useState([]);
  const [loading,        setLoading]        = useState(true);
  const [searchTerm,     setSearchTerm]     = useState("");
  const [searchResults,  setSearchResults]  = useState(null);
  const [searching,      setSearching]      = useState(false);
  const [filterCat,      setFilterCat]      = useState("all");
  const [filterStatus,   setFilterStatus]   = useState("ALL");
  const [sortField,      setSortField]      = useState("nameEn");
  const [sortDir,        setSortDir]        = useState("asc");
  const [addModal,       setAddModal]       = useState(false);
  const [editTarget,     setEditTarget]     = useState(null);
  const [convertModal,   setConvertModal]   = useState(false);
  const [deleteModal,    setDeleteModal]    = useState({ show: false, unit: null });
  const [activateModal,  setActivateModal]  = useState({ show: false, unit: null });

  useEffect(() => { fetchUnits(); fetchBaseUnits(); }, [filterCat]);

  // Debounced server-side search
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
        toast.error(lang === 'ar' ? 'فشل البحث' : 'Search failed');
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
      const url = filterCat === "all" ? `/units` : `/units?category=${filterCat}`;
      const res = await axiosInstance.get(url);
      setUnits(res.data.result || []);
    } catch {
      toast.error(lang === 'ar' ? 'فشل تحميل الوحدات' : 'Failed to load units');
    } finally {
      setLoading(false);
    }
  };

  const fetchBaseUnits = async () => {
    try {
      const res = await axiosInstance.get("/units/base");
      setBaseUnits(res.data.result || []);
    } catch {}
  };

  const handleDelete = async () => {
    try {
      await axiosInstance.delete(`/units/${deleteModal.unit._id}`);
      toast.success(lang === 'ar' ? 'تم حذف الوحدة' : 'Unit deleted');
      setDeleteModal({ show: false, unit: null });
      fetchUnits(); fetchBaseUnits();
    } catch (err) {
      toast.error(getErrorMessage(err, lang === 'ar' ? 'فشل الحذف' : 'Delete failed'));
    }
  };

  const handleActivate = async () => {
    try {
      await axiosInstance.patch(`/units/${activateModal.unit._id}/activate`);
      toast.success(lang === 'ar' ? 'تم تفعيل الوحدة' : 'Unit activated');
      setActivateModal({ show: false, unit: null });
      fetchUnits();
    } catch (err) {
      toast.error(getErrorMessage(err, lang === 'ar' ? 'فشل التفعيل' : 'Activation failed'));
    }
  };

  const handleSort = (field) => {
    if (sortField === field) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortField(field); setSortDir("asc"); }
  };

  const getCategoryLabel = (cat) => {
    const labels = {
      weight: { ar: "وزن",   en: lang === 'ar' ? 'وزن'   : 'Weight' },
      volume: { ar: "حجم",   en: lang === 'ar' ? 'حجم'   : 'Volume' },
      length: { ar: "طول",   en: lang === 'ar' ? 'طول'   : 'Length' },
      area:   { ar: "مساحة", en: lang === 'ar' ? 'مساحة' : 'Area'   },
      count:  { ar: "عدد",   en: lang === 'ar' ? 'عدد'   : 'Count'  },
    };
    return labels[cat]?.["en"] || cat;
  };

  const handleExport = () => {
    try {
      const data = displayed.map(u => ({
        [lang === 'ar' ? 'الاسم بالعربية'   : 'Name (Arabic)']:     u.nameAr,
        [lang === 'ar' ? 'الاسم بالإنجليزية': 'Name (English)']:    u.nameEn,
        [lang === 'ar' ? 'الكود'            : 'Code']:              u.code,
        [lang === 'ar' ? 'الرمز'            : 'Symbol']:            u.symbol,
        [lang === 'ar' ? 'الفئة'            : 'Category']:          getCategoryLabel(u.category),
        [lang === 'ar' ? 'النوع'            : 'Type']:              u.isBase ? "Base" : "Derived",
        [lang === 'ar' ? 'معامل التحويل'    : 'Conversion Factor']: u.conversionFactor || 1,
        [lang === 'ar' ? 'الحالة'           : 'Status']:            u.isActive !== false ? (lang === 'ar' ? 'نشط' : 'Active') : (lang === 'ar' ? 'غير نشط' : 'Inactive'),
      }));
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Units");
      XLSX.writeFile(wb, `Units_${new Date().toISOString().slice(0, 10)}.xlsx`);
      toast.success(lang === 'ar' ? 'تم التصدير بنجاح' : 'Exported successfully');
    } catch {
      toast.error(lang === 'ar' ? 'فشل التصدير' : 'Export failed');
    }
  };

  // Filter + Sort
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
    return <FullPageLoader text={"Loading units..."} />;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">

        {/*  Page Header  */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {lang === 'ar' ? 'إدارة الوحدات' : 'Units Management'}
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              {lang === 'ar' ? 'عرض وإدارة وحدات القياس المستخدمة في النظام.' : 'View and manage measurement units used in the system.'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setConvertModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 text-gray-700 bg-white rounded-xl hover:bg-gray-50 transition font-semibold text-sm shadow-sm"
            >
              <ArrowLeftRight className="w-4 h-4" />
              {lang === 'ar' ? 'تحويل' : 'Convert'}
            </button>
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
              {lang === 'ar' ? 'إضافة وحدة' : 'Add Unit'}
            </button>
          </div>
        </div>

        {/*  Filters  */}
        <div className="flex flex-wrap items-center gap-3 mb-4">
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
              placeholder={lang === 'ar' ? 'بحث في الوحدات...' : 'Search units...'}
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
            <option value="all">{lang === 'ar' ? 'كل الفئات' : 'All Categories'}</option>
            {Object.values(UnitCategory).map(cat => <option key={cat} value={cat}>{getCategoryLabel(cat)}</option>)}
          </select>

          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
          >
            <option value="ALL">{lang === 'ar' ? 'كل الحالات' : 'All Status'}</option>
            <option value="ACTIVE">{lang === 'ar' ? 'نشط' : 'Active'}</option>
            <option value="INACTIVE">{lang === 'ar' ? 'غير نشط' : 'Inactive'}</option>
          </select>

          {isFiltering && (
            <button onClick={handleClearFilters} className="text-sm text-indigo-600 hover:underline">
              {lang === 'ar' ? 'مسح' : 'Clear'}
            </button>
          )}
        </div>

        {/*  Table  */}
        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
          {displayed.length === 0 ? (
            <div className="p-16 text-center">
              <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="font-medium text-gray-600">
                {lang === 'ar' ? 'لا توجد وحدات' : 'No units found'}
              </p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <SortHeader label={lang === 'ar' ? 'الوحدة'  : 'Unit'}     field="nameEn"   sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                  <SortHeader label={lang === 'ar' ? 'الكود'   : 'Code'}     field="code"     sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                  <SortHeader label={lang === 'ar' ? 'الرمز'   : 'Symbol'}   field="symbol"   sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                  <SortHeader label={lang === 'ar' ? 'الفئة'   : 'Category'} field="category" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                  <SortHeader label={lang === 'ar' ? 'النوع'   : 'Type'}     field="isBase"   sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                  <SortHeader label={lang === 'ar' ? 'الحالة'  : 'Status'}   field="isActive" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
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

      {/*  Modals  */}
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
      {convertModal && (
        <ConvertModal lang={lang} units={units} onClose={() => setConvertModal(false)} />
      )}
      {deleteModal.show && (
        <AdminActionModal
          type="delete"
          lang={lang}
          entityLabelEn="unit"
          entityLabelAr="وحدة"
          itemName={lang === "ar" ? deleteModal.unit?.nameAr : deleteModal.unit?.nameEn}
          itemSubtitle={`${lang === 'ar' ? 'الكود' : 'Code'}: ${deleteModal.unit?.code || "-"}${deleteModal.unit?.symbol ? ` | ${lang === 'ar' ? 'الرمز' : 'Symbol'}: ${deleteModal.unit.symbol}` : ""}`}
          onConfirm={handleDelete}
          onClose={() => setDeleteModal({ show: false, unit: null })}
        />
      )}
      {activateModal.show && (
        <AdminActionModal
          type="activate"
          lang={lang}
          entityLabelEn="unit"
          entityLabelAr="وحدة"
          itemName={lang === "ar" ? activateModal.unit?.nameAr : activateModal.unit?.nameEn}
          itemSubtitle={`${lang === 'ar' ? 'الكود' : 'Code'}: ${activateModal.unit?.code || "-"}${activateModal.unit?.symbol ? ` | ${lang === 'ar' ? 'الرمز' : 'Symbol'}: ${activateModal.unit.symbol}` : ""}`}
          onConfirm={handleActivate}
          onClose={() => setActivateModal({ show: false, unit: null })}
        />
      )}
    </div>
  );
}