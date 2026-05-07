import { useState, useEffect, useMemo, useContext, useRef, useCallback } from 'react';
import {
  Package, Search, Plus, Edit, Trash2, CheckCircle,
  ChevronUp, ChevronDown, MoreHorizontal, X, Download, AlertTriangle
} from 'lucide-react';
import { toast } from 'react-toastify';
import { formatCurrency } from '../../utils/dateFormat';
import axiosInstance from '../../utils/axiosInstance';
import { getErrorMessage } from '../../utils/errorHandler';
import { LanguageContext } from '../../context/LanguageContext';
import * as XLSX from 'xlsx';
import { createAutoCode } from '../../utils/autoCode';

// Fallback hardcoded categories (used if API fails)
const FALLBACK_CATEGORIES = [
  { value: 'Construction-Materials', labelEn: 'Construction Materials', labelAr: 'Ù…ÙˆØ§Ø¯ Ø§Ù„Ø¨Ù†Ø§Ø¡'  },
  { value: 'Tools-Equipment',        labelEn: 'Tools & Equipment',       labelAr: 'Ø£Ø¯ÙˆØ§Øª ÙˆÙ…Ø¹Ø¯Ø§Øª' },
  { value: 'Electrical',             labelEn: 'Electrical',              labelAr: 'ÙƒÙ‡Ø±Ø¨Ø§Ø¡'       },
  { value: 'Plumbing',               labelEn: 'Plumbing',                labelAr: 'Ø³Ø¨Ø§ÙƒØ©'        },
  { value: 'Finishing',              labelEn: 'Finishing',               labelAr: 'ØªØ´Ø·ÙŠØ¨Ø§Øª'      },
  { value: 'Other',                  labelEn: 'Other',                   labelAr: 'Ø£Ø®Ø±Ù‰'         },
];

const UnitCategory = {
  WEIGHT: 'weight',
  VOLUME: 'volume',
  LENGTH: 'length',
  AREA: 'area',
  COUNT: 'count',
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
        <ChevronUp   className={`w-3 h-3 ${sortField === field && sortDir === 'asc'  ? 'text-gray-900' : 'text-gray-300'}`} />
        <ChevronDown className={`w-3 h-3 ${sortField === field && sortDir === 'desc' ? 'text-gray-900' : 'text-gray-300'}`} />
      </span>
    </span>
  </th>
);

// â”€â”€ Status badge â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const StatusBadge = ({ isActive, lang }) => {
  if (isActive === false)
    return <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">{lang === 'ar' ? 'ØºÙŠØ± Ù†Ø´Ø·' : 'Inactive'}</span>;
  return <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">{lang === 'ar' ? 'Ù†Ø´Ø·' : 'Active'}</span>;
};

// â”€â”€ Three-dots menu â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const ActionsMenu = ({ material, lang, onEdit, onDelete, onActivate }) => {
  const [open, setOpen] = useState(false);
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0 });
  const ref = useRef();
  const btnRef = useRef();

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleOpen = () => {
    if (!open && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      const menuHeight = material.isActive === false ? 120 : 80;
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
        <div style={{ position: 'fixed', top: menuPos.top, left: menuPos.left }} className="w-40 bg-white border border-gray-200 rounded-xl shadow-lg z-50 py-1">
          <button onClick={() => { setOpen(false); onEdit(material); }} className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition">
            <Edit className="w-4 h-4" />
            {lang === 'ar' ? 'ØªØ¹Ø¯ÙŠÙ„' : 'Edit'}
          </button>

          {material.isActive === false && (
            <button onClick={() => { setOpen(false); onActivate(material); }} className="flex items-center gap-2 w-full px-4 py-2 text-sm text-green-600 hover:bg-green-50 transition">
              <CheckCircle className="w-4 h-4" />
              {lang === 'ar' ? 'ØªÙØ¹ÙŠÙ„' : 'Activate'}
            </button>
          )}

          <button onClick={() => { setOpen(false); onDelete(material); }} className="flex items-center gap-2 w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition">
            <Trash2 className="w-4 h-4" />
            {lang === 'ar' ? 'Ø­Ø°Ù' : 'Delete'}
          </button>
        </div>
      )}
    </div>
  );
};

// â”€â”€ Add/Edit Modal â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const QuickUnitModal = ({ lang, units, onClose, onSaved }) => {
  const [form, setForm] = useState({
    nameAr: '',
    nameEn: '',
    code: '',
    symbol: '',
    category: '',
    description: '',
  });
  const [submitting, setSubmitting] = useState(false);

  const getCategoryLabel = (cat) => {
    const labels = {
      weight: { ar: 'ÙˆØ²Ù†', en: 'Weight' },
      volume: { ar: 'Ø­Ø¬Ù…', en: 'Volume' },
      length: { ar: 'Ø·ÙˆÙ„', en: 'Length' },
      area: { ar: 'Ù…Ø³Ø§Ø­Ø©', en: 'Area' },
      count: { ar: 'Ø¹Ø¯Ø¯', en: 'Count' },
    };

    return labels[cat]?.[lang === 'ar' ? 'ar' : 'en'] || cat;
  };

  const handleSubmit = async () => {
    if (!form.nameAr.trim() || !form.nameEn.trim() || !form.code.trim() || !form.symbol.trim() || !form.category) {
      toast.error(lang === 'ar' ? 'ÙŠØ±Ø¬Ù‰ Ù…Ù„Ø¡ Ø¬Ù…ÙŠØ¹ Ø§Ù„Ø­Ù‚ÙˆÙ„ Ø§Ù„Ù…Ø·Ù„ÙˆØ¨Ø©' : 'Please fill all required fields');
      return;
    }

    const normalizedCode = form.code.trim().toUpperCase();
    const normalizedSymbol = form.symbol.trim();

    const isDuplicateCode = units.some(u => u.code?.toLowerCase() === normalizedCode.toLowerCase());
    if (isDuplicateCode) {
      toast.error(lang === 'ar' ? 'Ø§Ù„ÙƒÙˆØ¯ Ù…ÙˆØ¬ÙˆØ¯ Ù…Ø³Ø¨Ù‚Ø§Ù‹' : 'Code already exists');
      return;
    }

    const isDuplicateSymbol = units.some(u => u.symbol?.toLowerCase() === normalizedSymbol.toLowerCase());
    if (isDuplicateSymbol) {
      toast.error(lang === 'ar' ? 'Ø§Ù„Ø±Ù…Ø² Ù…ÙˆØ¬ÙˆØ¯ Ù…Ø³Ø¨Ù‚Ø§Ù‹' : 'Symbol already exists');
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        nameAr: form.nameAr.trim(),
        nameEn: form.nameEn.trim(),
        code: normalizedCode,
        symbol: normalizedSymbol,
        category: form.category,
        description: form.description.trim() || undefined,
        isBase: true,
      };

      const { data } = await axiosInstance.post('/units/quick-create', payload);
      toast.success(lang === 'ar' ? 'ØªÙ… Ø¥Ù†Ø´Ø§Ø¡ Ø§Ù„ÙˆØ­Ø¯Ø© Ø¨Ù†Ø¬Ø§Ø­' : 'Unit created successfully');
      onSaved(data?.result || data);
    } catch (err) {
      toast.error(getErrorMessage(err, lang === 'ar' ? 'ÙØ´Ù„ Ø¥Ù†Ø´Ø§Ø¡ Ø§Ù„ÙˆØ­Ø¯Ø©' : 'Failed to create unit'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60] p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              {lang === 'ar' ? 'Ø¥Ø¶Ø§ÙØ© ÙˆØ­Ø¯Ø© Ø£Ø³Ø§Ø³ÙŠØ© Ø¨Ø³Ø±Ø¹Ø©' : 'Quick Add Base Unit'}
            </h3>
            <p className="text-sm text-gray-500 mt-1">
              {lang === 'ar' ? 'Ø³Ù†Ù†Ø´Ø¦ ÙˆØ­Ø¯Ø© Ø£Ø³Ø§Ø³ÙŠØ© Ø¬Ø¯ÙŠØ¯Ø© Ø«Ù… Ù†Ø®ØªØ§Ø±Ù‡Ø§ Ù…Ø¨Ø§Ø´Ø±Ø© Ù„Ù„Ù…Ø§Ø¯Ø©.' : 'Create a new base unit and select it for this material immediately.'}
            </p>
          </div>
          <button onClick={onClose} className="p-1 rounded-md hover:bg-gray-100 text-gray-400"><X className="w-5 h-5" /></button>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{lang === 'ar' ? 'Ø§Ù„Ø§Ø³Ù… Ø¨Ø§Ù„Ø¹Ø±Ø¨ÙŠØ©' : 'Name (Arabic)'} <span className="text-red-500">*</span></label>
              <input type="text" value={form.nameAr} onChange={e => setForm(f => ({ ...f, nameAr: e.target.value }))} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition text-sm bg-gray-50" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{lang === 'ar' ? 'Ø§Ù„Ø§Ø³Ù… Ø¨Ø§Ù„Ø¥Ù†Ø¬Ù„ÙŠØ²ÙŠØ©' : 'Name (English)'} <span className="text-red-500">*</span></label>
              <input type="text" value={form.nameEn} onChange={e => setForm(f => ({ ...f, nameEn: e.target.value }))} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition text-sm bg-gray-50" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{lang === 'ar' ? 'Ø§Ù„ÙƒÙˆØ¯' : 'Code'} <span className="text-red-500">*</span></label>
              <input type="text" value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition text-sm bg-gray-50" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{lang === 'ar' ? 'Ø§Ù„Ø±Ù…Ø²' : 'Symbol'} <span className="text-red-500">*</span></label>
              <input type="text" value={form.symbol} onChange={e => setForm(f => ({ ...f, symbol: e.target.value }))} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition text-sm bg-gray-50" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{lang === 'ar' ? 'Ø§Ù„ÙØ¦Ø©' : 'Category'} <span className="text-red-500">*</span></label>
            <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition text-sm bg-gray-50">
              <option value="">{lang === 'ar' ? 'Ø§Ø®ØªØ± Ø§Ù„ÙØ¦Ø©' : 'Select Category'}</option>
              {Object.values(UnitCategory).map(cat => <option key={cat} value={cat}>{getCategoryLabel(cat)}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{lang === 'ar' ? 'Ø§Ù„ÙˆØµÙ' : 'Description'}</label>
            <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows="2" className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition text-sm bg-gray-50 resize-none" />
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition font-medium text-sm">
            {lang === 'ar' ? 'Ø¥Ù„ØºØ§Ø¡' : 'Cancel'}
          </button>
          <button onClick={handleSubmit} disabled={submitting} className="flex-1 px-4 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition font-medium text-sm disabled:opacity-50">
            {submitting ? (lang === 'ar' ? 'Ø¬Ø§Ø±ÙŠ Ø§Ù„Ø­ÙØ¸...' : 'Saving...') : (lang === 'ar' ? 'Ø­ÙØ¸' : 'Save')}
          </button>
        </div>
      </div>
    </div>
  );
};

const MaterialModal = ({ lang, mode, material: editMaterial, units, categories, refreshUnits, onClose, onSaved }) => {
  const [form, setForm] = useState({
    nameAr:             editMaterial?.nameAr             || '',
    nameEn:             editMaterial?.nameEn             || '',
    code:               editMaterial?.code               || '',
    mainCategory:       editMaterial?.mainCategory       || (categories[0]?.value || 'Construction-Materials'),
    subCategory:        editMaterial?.subCategory        || '',
    baseUnit:           editMaterial?.baseUnit?._id || editMaterial?.baseUnit || '',
    // âœ… Ø¸Ø¨Ø·Ù†Ø§ Ø§Ù„Ø§Ø³Ù… Ù„ÙŠØ·Ø§Ø¨Ù‚ Ø§Ù„Ù€ Schema
    minStockLevel:      editMaterial?.minStockLevel      || 0,
    lastPurchasedPrice: editMaterial?.lastPurchasePrice  || 0,
    lastPurchasedDate:  editMaterial?.lastPurchaseDate
      ? new Date(editMaterial.lastPurchaseDate).toISOString().split('T')[0] : '',
    description:        editMaterial?.description        || '',
    // âœ… Ø§Ù„Ù€ defaultPurchaseUnit Ùˆ defaultIssueUnit
    defaultPurchaseUnit: editMaterial?.defaultPurchaseUnit?._id || editMaterial?.defaultPurchaseUnit || '',
    defaultIssueUnit:    editMaterial?.defaultIssueUnit?._id    || editMaterial?.defaultIssueUnit    || '',
    // âœ… alternativeUnits
    alternativeUnits:   editMaterial?.alternativeUnits?.map(u => ({
      unitId:            u.unitId?._id || u.unitId || '',
      conversionFactor:  u.conversionFactor || 1,
      isDefaultPurchase: u.isDefaultPurchase || false,
      isDefaultIssue:    u.isDefaultIssue    || false,
      allowOverride:     u.allowOverride     || false,
    })) || [],
  });
  const [submitting, setSubmitting] = useState(false);
  const [showQuickUnitModal, setShowQuickUnitModal] = useState(false);
  const showAdvancedSettings = true;
  const setShowAdvancedSettings = () => {};
  const [codeTouched, setCodeTouched] = useState(Boolean(editMaterial?.code));

  const activeUnits = units.filter(u => u.isActive !== false);

  useEffect(() => {
    if (codeTouched) return;
    setForm((prev) => ({
      ...prev,
      code: createAutoCode(prev.nameEn || prev.nameAr, 'MAT'),
    }));
  }, [form.nameAr, form.nameEn, codeTouched]);

  // Ø§Ù„ÙˆØ­Ø¯Ø§Øª Ø§Ù„Ù…ØªØ§Ø­Ø© Ù„Ù€ alternativeUnits (ØºÙŠØ± Ø§Ù„Ù€ baseUnit)
  const altUnitOptions = activeUnits.filter(u => u._id !== form.baseUnit);

  const handleAddAltUnit = () => {
    setForm(f => ({
      ...f,
      alternativeUnits: [
        ...f.alternativeUnits,
        { unitId: '', conversionFactor: 1, isDefaultPurchase: false, isDefaultIssue: false, allowOverride: false }
      ]
    }));
  };

  const handleRemoveAltUnit = (idx) => {
    setForm(f => ({ ...f, alternativeUnits: f.alternativeUnits.filter((_, i) => i !== idx) }));
  };

  const handleAltUnitChange = (idx, field, value) => {
    const updated = [...form.alternativeUnits];
    updated[idx] = { ...updated[idx], [field]: value };

    // Ù„Ùˆ Ø´ÙŠÙ‘Ù„Ù†Ø§ isDefaultPurchase Ø¹Ù† ÙˆØ­Ø¯Ø©ØŒ Ù†Ø®Ù„ÙŠÙ‡ true Ø¹Ù„Ù‰ Ø§Ù„Ø£ÙˆÙ„Ù‰ Ø¨Ø³
    if (field === 'isDefaultPurchase' && value === true) {
      updated.forEach((u, i) => { if (i !== idx) u.isDefaultPurchase = false; });
    }
    if (field === 'isDefaultIssue' && value === true) {
      updated.forEach((u, i) => { if (i !== idx) u.isDefaultIssue = false; });
    }
    setForm(f => ({ ...f, alternativeUnits: updated }));
  };

  // ÙˆØ­Ø¯Ø§Øª Ù…Ø³Ù…ÙˆØ­ Ø¨ÙŠÙ‡Ø§ Ù„Ù„Ù€ defaultPurchaseUnit/defaultIssueUnit (base + alternatives)
  const allowedUnitIds = [
    form.baseUnit,
    ...form.alternativeUnits.map(u => u.unitId).filter(Boolean)
  ];
  const allowedUnits = activeUnits.filter(u => allowedUnitIds.includes(u._id));

  const handleQuickUnitSaved = async (createdUnit) => {
    await refreshUnits?.();
    const newBaseUnit = createdUnit?._id || createdUnit?.id || '';
    setForm(f => ({
      ...f,
      baseUnit: newBaseUnit,
      alternativeUnits: [],
      defaultPurchaseUnit: newBaseUnit,
      defaultIssueUnit: newBaseUnit,
    }));
    setShowQuickUnitModal(false);
  };

  const handleCodeChange = (value) => {
    setCodeTouched(true);
    setForm((prev) => ({ ...prev, code: value.toUpperCase() }));
  };

  const handleSubmit = async () => {
    if (!form.nameAr.trim() || !form.nameEn.trim()) { toast.error(lang === 'ar' ? 'Ø§Ø³Ù… Ø§Ù„Ù…Ø§Ø¯Ø© Ù…Ø·Ù„ÙˆØ¨' : 'Material name is required'); return; }
    if (!form.code.trim())   { toast.error(lang === 'ar' ? 'Ø§Ù„ÙƒÙˆØ¯ Ù…Ø·Ù„ÙˆØ¨' : 'Code is required'); return; }
    if (!form.baseUnit)      { toast.error(lang === 'ar' ? 'Ø§Ù„ÙˆØ­Ø¯Ø© Ø§Ù„Ø£Ø³Ø§Ø³ÙŠØ© Ù…Ø·Ù„ÙˆØ¨Ø©' : 'Base unit is required'); return; }

    if (!form.subCategory.trim()) { toast.error(lang === 'ar' ? 'Ø§Ù„ÙØ¦Ø© Ø§Ù„ÙØ±Ø¹ÙŠØ© Ù…Ø·Ù„ÙˆØ¨Ø©' : 'Sub category is required'); return; }
    // Validate alternativeUnits
    for (const [i, alt] of form.alternativeUnits.entries()) {
      if (!alt.unitId) { toast.error(lang === 'ar' ? `Ø§Ø®ØªØ± ÙˆØ­Ø¯Ø© ÙÙŠ Ø§Ù„Ø³Ø·Ø± ${i + 1}` : `Select unit in row ${i + 1}`); return; }
      if (!alt.conversionFactor || alt.conversionFactor <= 0) { toast.error(lang === 'ar' ? `Ù…Ø¹Ø§Ù…Ù„ Ø§Ù„ØªØ­ÙˆÙŠÙ„ ØºÙ„Ø· ÙÙŠ Ø§Ù„Ø³Ø·Ø± ${i + 1}` : `Invalid conversion factor in row ${i + 1}`); return; }
    }

    try {
      setSubmitting(true);
      const payload = {
     nameAr:             form.nameAr.trim(),
  nameEn:             form.nameEn.trim(),
  code:               form.code.trim().toUpperCase(),
  mainCategory:       form.mainCategory,
  subCategory:        form.subCategory.trim() || undefined,   // âœ… undefined Ù…Ø´ ''
  baseUnit:           form.baseUnit,
  minLevelStock:      Number(form.minStockLevel) || 0,        // âœ… ØµØ­ Ø§Ù„Ø§Ø³Ù…
  lastPurchasedPrice: Number(form.lastPurchasedPrice) || undefined,
  lastPurchasedDate:  form.lastPurchasedDate || undefined,
  description:        form.description.trim() || undefined,
  defaultPurchaseUnit: form.defaultPurchaseUnit || undefined,
  defaultIssueUnit:    form.defaultIssueUnit    || undefined,
  alternativeUnits:   form.alternativeUnits.map(u => ({
    unitId:            u.unitId,
    conversionFactor:  Number(u.conversionFactor),
    isDefaultPurchase: u.isDefaultPurchase,
    isDefaultIssue:    u.isDefaultIssue,
    allowOverride:     u.allowOverride,
        })),
      };
      Object.keys(payload).forEach(k => payload[k] === undefined && delete payload[k]);

      if (mode === 'add') await axiosInstance.post('/materials', payload);
      else await axiosInstance.put(`/materials/${editMaterial._id}`, payload);

      toast.success(lang === 'ar' ? 'ØªÙ… Ø§Ù„Ø­ÙØ¸ Ø¨Ù†Ø¬Ø§Ø­' : 'Saved successfully');
      onSaved();
      onClose();
    } catch (err) {
      toast.error(getErrorMessage(err, lang === 'ar' ? 'ÙØ´Ù„ Ø­ÙØ¸ Ø§Ù„Ù…Ø§Ø¯Ø©' : 'Failed to save material'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-gray-900">
            {mode === 'add' ? (lang === 'ar' ? 'Ø¥Ø¶Ø§ÙØ© Ù…Ø§Ø¯Ø© Ø¬Ø¯ÙŠØ¯Ø©' : 'Add New Material') : (lang === 'ar' ? 'ØªØ¹Ø¯ÙŠÙ„ Ø§Ù„Ù…Ø§Ø¯Ø©' : 'Edit Material')}
          </h2>
          <button onClick={onClose} className="p-1 rounded-md hover:bg-gray-100 text-gray-400"><X className="w-5 h-5" /></button>
        </div>

        <div className="space-y-4">
          {/* Names */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{lang === 'ar' ? 'Ø§Ù„Ø§Ø³Ù… Ø¨Ø§Ù„Ø¹Ø±Ø¨ÙŠØ©' : 'Name (Arabic)'} <span className="text-red-500">*</span></label>
              <input type="text" dir="rtl" value={form.nameAr} onChange={e => setForm(f => ({ ...f, nameAr: e.target.value }))} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition text-sm bg-gray-50" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{lang === 'ar' ? 'Ø§Ù„Ø§Ø³Ù… Ø¨Ø§Ù„Ø¥Ù†Ø¬Ù„ÙŠØ²ÙŠØ©' : 'Name (English)'} <span className="text-red-500">*</span></label>
              <input type="text" dir="ltr" value={form.nameEn} onChange={e => setForm(f => ({ ...f, nameEn: e.target.value }))} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition text-sm bg-gray-50" />
            </div>
          </div>

          {/* Code + Category */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{lang === 'ar' ? 'Ø§Ù„ÙƒÙˆØ¯' : 'Code'} <span className="text-red-500">*</span></label>
              <input type="text" placeholder="MAT-STEEL-14MM" value={form.code} onChange={e => handleCodeChange(e.target.value)} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition text-sm bg-gray-50" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{lang === 'ar' ? 'Ø§Ù„ÙØ¦Ø© Ø§Ù„Ø±Ø¦ÙŠØ³ÙŠØ©' : 'Main Category'} <span className="text-red-500">*</span></label>
              <select value={form.mainCategory} onChange={e => setForm(f => ({ ...f, mainCategory: e.target.value }))} disabled={mode === 'edit'} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition text-sm bg-gray-50 disabled:opacity-60">
                {categories.map(c => <option key={c.value} value={c.value}>{lang === 'ar' ? (c.labelAr || c.label) : (c.labelEn || c.label)}</option>)}
              </select>
            </div>
          </div>

          {/* Sub Category + Base Unit */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{lang === 'ar' ? 'Ø§Ù„ÙØ¦Ø© Ø§Ù„ÙØ±Ø¹ÙŠØ©' : 'Sub Category'}</label>
              <span className="text-red-500 text-sm">*</span>
              <input type="text" dir={lang === 'ar' ? 'rtl' : 'ltr'} value={form.subCategory} onChange={e => setForm(f => ({ ...f, subCategory: e.target.value }))} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition text-sm bg-gray-50" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{lang === 'ar' ? 'ÙˆØ­Ø¯Ø© Ø§Ù„ØªØ®Ø²ÙŠÙ† (Base)' : 'Storage Unit (Base)'} <span className="text-red-500">*</span></label>
              <select value={form.baseUnit} onChange={e => setForm(f => ({ ...f, baseUnit: e.target.value, alternativeUnits: [], defaultPurchaseUnit: e.target.value, defaultIssueUnit: e.target.value }))} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition text-sm bg-gray-50">
                <option value="">{lang === 'ar' ? 'Ø§Ø®ØªØ± Ø§Ù„ÙˆØ­Ø¯Ø©' : 'Select Unit'}</option>
                {activeUnits.map(u => <option key={u._id} value={u._id}>{lang === 'ar' ? u.nameAr : u.nameEn} ({u.symbol})</option>)}
              </select>
              <button type="button" onClick={() => setShowQuickUnitModal(true)} className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-indigo-600 hover:text-indigo-700">
                <Plus className="w-3.5 h-3.5" />
                {lang === 'ar' ? 'Ø¥Ø¶Ø§ÙØ© ÙˆØ­Ø¯Ø© Ø£Ø³Ø§Ø³ÙŠØ© Ø¨Ø³Ø±Ø¹Ø©' : 'Quick Add Base Unit'}
              </button>
            </div>
          </div>

          {showAdvancedSettings && (
            <>
          {/* âœ… Alternative Units Section */}
          <div className="border border-gray-200 rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-200">
              <div>
                <p className="text-sm font-medium text-gray-700">{lang === 'ar' ? 'ÙˆØ­Ø¯Ø§Øª Ø¨Ø¯ÙŠÙ„Ø©' : 'Alternative Units'}</p>
                <p className="text-xs text-gray-400 mt-0.5">{lang === 'ar' ? 'ÙˆØ­Ø¯Ø§Øª Ø§Ù„Ø´Ø±Ø§Ø¡ ÙˆØ§Ù„ØµØ±Ù Ø§Ù„Ù…Ø³Ù…ÙˆØ­Ø© Ø¨Ø®Ù„Ø§Ù Ø§Ù„Ù€ base' : 'Allowed purchase/issue units besides base'}</p>
              </div>
              <button
                type="button"
                onClick={handleAddAltUnit}
                disabled={!form.baseUnit}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-medium hover:bg-indigo-700 transition disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Plus className="w-3.5 h-3.5" />
                {lang === 'ar' ? 'Ø¥Ø¶Ø§ÙØ©' : 'Add'}
              </button>
            </div>

            {form.alternativeUnits.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-4">
                {lang === 'ar' ? 'Ù„Ø§ ØªÙˆØ¬Ø¯ ÙˆØ­Ø¯Ø§Øª Ø¨Ø¯ÙŠÙ„Ø© â€” Ø§Ù„Ø´Ø±Ø§Ø¡ ÙˆØ§Ù„ØµØ±Ù Ø³ÙŠÙƒÙˆÙ† Ø¨Ø§Ù„Ù€ base unit ÙÙ‚Ø·' : 'No alternative units â€” purchase & issue will use base unit only'}
              </p>
            ) : (
              <div className="divide-y divide-gray-100">
                {form.alternativeUnits.map((alt, idx) => (
                  <div key={idx} className="p-3 space-y-2">
                    <div className="grid grid-cols-3 gap-2 items-end">
                      {/* Unit Select */}
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">{lang === 'ar' ? 'Ø§Ù„ÙˆØ­Ø¯Ø©' : 'Unit'} <span className="text-red-400">*</span></label>
                        <select
                          value={alt.unitId}
                          onChange={e => handleAltUnitChange(idx, 'unitId', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        >
                          <option value="">{lang === 'ar' ? 'Ø§Ø®ØªØ±' : 'Select'}</option>
                          {altUnitOptions.map(u => <option key={u._id} value={u._id}>{lang === 'ar' ? u.nameAr : u.nameEn} ({u.symbol})</option>)}
                        </select>
                      </div>

                      {/* Conversion Factor */}
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          {lang === 'ar' ? 'Ù…Ø¹Ø§Ù…Ù„ Ø§Ù„ØªØ­ÙˆÙŠÙ„' : 'Conversion Factor'} <span className="text-red-400">*</span>
                        </label>
                        <input
                          type="number" step="0.000001" min="0.000001"
                          value={alt.conversionFactor}
                          onChange={e => handleAltUnitChange(idx, 'conversionFactor', parseFloat(e.target.value) || 0)}
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-indigo-500"
                        />
                        <p className="text-xs text-gray-400 mt-0.5">
                          {lang === 'ar' ? '1 ÙˆØ­Ø¯Ø© Ø¨Ø¯ÙŠÙ„Ø© = X ÙˆØ­Ø¯Ø© Ø£Ø³Ø§Ø³ÙŠØ©' : '1 alt unit = X base units'}
                        </p>
                      </div>

                      {/* Delete */}
                      <div className="flex justify-end pb-1">
                        <button type="button" onClick={() => handleRemoveAltUnit(idx)} className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Checkboxes */}
                    <div className="flex flex-wrap items-center gap-4">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={alt.isDefaultPurchase} onChange={e => handleAltUnitChange(idx, 'isDefaultPurchase', e.target.checked)} className="w-4 h-4 text-indigo-600 border-gray-300 rounded" />
                        <span className="text-xs text-gray-600">{lang === 'ar' ? 'Ø§ÙØªØ±Ø§Ø¶ÙŠ Ù„Ù„Ø´Ø±Ø§Ø¡' : 'Default Purchase'}</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={alt.isDefaultIssue} onChange={e => handleAltUnitChange(idx, 'isDefaultIssue', e.target.checked)} className="w-4 h-4 text-indigo-600 border-gray-300 rounded" />
                        <span className="text-xs text-gray-600">{lang === 'ar' ? 'Ø§ÙØªØ±Ø§Ø¶ÙŠ Ù„Ù„ØµØ±Ù' : 'Default Issue'}</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={alt.allowOverride} onChange={e => handleAltUnitChange(idx, 'allowOverride', e.target.checked)} className="w-4 h-4 text-amber-500 border-gray-300 rounded" />
                        <span className="text-xs text-gray-600">{lang === 'ar' ? 'Ø§Ù„Ø³Ù…Ø§Ø­ Ø¨ØªØ¹Ø¯ÙŠÙ„ Ù…Ø¹Ø§Ù…Ù„ Ø§Ù„ØªØ­ÙˆÙŠÙ„' : 'Allow override conversion'}</span>
                      </label>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* âœ… Default Units */}
          {allowedUnits.length > 0 && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{lang === 'ar' ? 'ÙˆØ­Ø¯Ø© Ø§Ù„Ø´Ø±Ø§Ø¡ Ø§Ù„Ø§ÙØªØ±Ø§Ø¶ÙŠØ©' : 'Default Purchase Unit'}</label>
                <select value={form.defaultPurchaseUnit} onChange={e => setForm(f => ({ ...f, defaultPurchaseUnit: e.target.value }))} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 text-sm bg-gray-50">
                  <option value="">{lang === 'ar' ? 'Ù†ÙØ³ Ø§Ù„Ù€ base' : 'Same as base'}</option>
                  {allowedUnits.map(u => <option key={u._id} value={u._id}>{lang === 'ar' ? u.nameAr : u.nameEn} ({u.symbol})</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{lang === 'ar' ? 'ÙˆØ­Ø¯Ø© Ø§Ù„ØµØ±Ù Ø§Ù„Ø§ÙØªØ±Ø§Ø¶ÙŠØ©' : 'Default Issue Unit'}</label>
                <select value={form.defaultIssueUnit} onChange={e => setForm(f => ({ ...f, defaultIssueUnit: e.target.value }))} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 text-sm bg-gray-50">
                  <option value="">{lang === 'ar' ? 'Ù†ÙØ³ Ø§Ù„Ù€ base' : 'Same as base'}</option>
                  {allowedUnits.map(u => <option key={u._id} value={u._id}>{lang === 'ar' ? u.nameAr : u.nameEn} ({u.symbol})</option>)}
                </select>
              </div>
            </div>
          )}

          {/* Stock + Price */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              {/* âœ… Ø¸Ø¨Ø·Ù†Ø§ Ø§Ù„Ø§Ø³Ù… */}
              <label className="block text-sm font-medium text-gray-700 mb-1">{lang === 'ar' ? 'Ø§Ù„Ø­Ø¯ Ø§Ù„Ø£Ø¯Ù†Ù‰ Ù„Ù„Ù…Ø®Ø²ÙˆÙ†' : 'Min Stock Level'}</label>
              <input type="number" min="0" value={form.minStockLevel} onChange={e => setForm(f => ({ ...f, minStockLevel: e.target.value }))} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition text-sm bg-gray-50" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{lang === 'ar' ? 'Ø¢Ø®Ø± Ø³Ø¹Ø± Ø´Ø±Ø§Ø¡' : 'Last Purchase Price'}</label>
              <input type="number" min="0" step="0.01" value={form.lastPurchasedPrice} onChange={e => setForm(f => ({ ...f, lastPurchasedPrice: e.target.value }))} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition text-sm bg-gray-50" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{lang === 'ar' ? 'ØªØ§Ø±ÙŠØ® Ø¢Ø®Ø± Ø´Ø±Ø§Ø¡' : 'Last Purchase Date'}</label>
            <input type="date" value={form.lastPurchasedDate} onChange={e => setForm(f => ({ ...f, lastPurchasedDate: e.target.value }))} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition text-sm bg-gray-50" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{lang === 'ar' ? 'Ø§Ù„ÙˆØµÙ' : 'Description'}</label>
            <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows="2" dir={lang === 'ar' ? 'rtl' : 'ltr'} placeholder={lang === 'ar' ? 'Ø£Ø¶Ù ÙˆØµÙØ§Ù‹ Ù„Ù„Ù…Ø§Ø¯Ø©...' : 'Add material description...'} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition text-sm bg-gray-50 resize-none" />
          </div>
            </>
          )}
        </div>

        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition font-medium text-sm">
            {lang === 'ar' ? 'Ø¥Ù„ØºØ§Ø¡' : 'Cancel'}
          </button>
          <button onClick={handleSubmit} disabled={submitting} className="flex-1 px-4 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition font-medium text-sm disabled:opacity-50">
            {submitting ? (lang === 'ar' ? 'Ø¬Ø§Ø±ÙŠ Ø§Ù„Ø­ÙØ¸...' : 'Saving...') : (lang === 'ar' ? 'Ø­ÙØ¸' : 'Save')}
          </button>
        </div>
      </div>

      {showQuickUnitModal && <QuickUnitModal lang={lang} units={units} onClose={() => setShowQuickUnitModal(false)} onSaved={handleQuickUnitSaved} />}
    </div>
  );
};

// â”€â”€ Confirm Modal â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const ConfirmModal = ({ material, lang, onConfirm, onClose }) => (
  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
    <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-11 h-11 rounded-full flex items-center justify-center bg-red-100">
          <Trash2 className="w-5 h-5 text-red-600" />
        </div>
        <div>
          <h3 className="text-base font-semibold text-gray-900">{lang === 'ar' ? 'ØªØ£ÙƒÙŠØ¯ Ø§Ù„Ø­Ø°Ù' : 'Confirm Delete'}</h3>
          <p className="text-sm text-gray-500">{lang === 'ar' ? 'Ù‡Ù„ Ø£Ù†Øª Ù…ØªØ£ÙƒØ¯ Ù…Ù† Ø­Ø°Ù Ù‡Ø°Ù‡ Ø§Ù„Ù…Ø§Ø¯Ø©ØŸ' : 'Are you sure you want to delete this material?'}</p>
        </div>
      </div>
      <div className="bg-gray-50 rounded-xl p-4 mb-4">
        <p className="font-medium text-gray-900 text-sm">{lang === 'ar' ? material?.nameAr : material?.nameEn}</p>
        <p className="text-xs text-gray-500">{lang === 'ar' ? 'Ø§Ù„ÙƒÙˆØ¯: ' : 'Code: '}{material?.code}</p>
      </div>
      <div className="flex gap-3">
        <button onClick={onClose} className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition font-medium text-sm">
          {lang === 'ar' ? 'Ø¥Ù„ØºØ§Ø¡' : 'Cancel'}
        </button>
        <button onClick={onConfirm} className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-xl hover:bg-red-700 transition font-medium text-sm">
          {lang === 'ar' ? 'Ø­Ø°Ù' : 'Delete'}
        </button>
      </div>
    </div>
  </div>
);

// â”€â”€ Main Component â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export default function Supplies() {
  const { lang } = useContext(LanguageContext);

  const [materials,     setMaterials]     = useState([]);
  const [units,         setUnits]         = useState([]);
  const [categories,    setCategories]    = useState(FALLBACK_CATEGORIES);
  const [loading,       setLoading]       = useState(false);

  const [searchTerm,    setSearchTerm]    = useState('');
  const [searchResults, setSearchResults] = useState(null);
  const [searching,     setSearching]     = useState(false);

  const [filterCat,     setFilterCat]     = useState('all');
  const [filterStatus,  setFilterStatus]  = useState('ALL');
  const [sortField,     setSortField]     = useState('nameEn');
  const [sortDir,       setSortDir]       = useState('asc');
  const [addModal,      setAddModal]      = useState(false);
  const [editTarget,    setEditTarget]    = useState(null);
  const [deleteModal,   setDeleteModal]   = useState({ show: false, material: null });

  useEffect(() => {
    fetchMaterials();
    fetchUnits();
    fetchCategories();
  }, []);

  useEffect(() => {
    if (!searchTerm.trim()) { setSearchResults(null); return; }
    setSearching(true);
    const timer = setTimeout(async () => {
      try {
        const { data } = await axiosInstance.get(`/materials/search?q=${encodeURIComponent(searchTerm.trim())}`);
        setSearchResults(data.result || data || []);
      } catch {
        toast.error(lang === 'ar' ? 'ÙØ´Ù„ Ø§Ù„Ø¨Ø­Ø«' : 'Search failed');
        setSearchResults([]);
      } finally { setSearching(false); }
    }, 400);
    return () => { clearTimeout(timer); setSearching(false); };
  }, [searchTerm]);

  const fetchMaterials = async () => {
    try {
      setLoading(true);
      const { data } = await axiosInstance.get('/materials');
      setMaterials(data.result || data || []);
    } catch {
      toast.error(lang === 'ar' ? 'ÙØ´Ù„ ØªØ­Ù…ÙŠÙ„ Ø§Ù„Ù…ÙˆØ§Ø¯' : 'Failed to load materials');
    } finally { setLoading(false); }
  };

  const fetchUnits = async () => {
    try {
      const { data } = await axiosInstance.get('/units');
      setUnits(data.result || data || []);
    } catch { setUnits([]); }
  };

  const fetchCategories = async () => {
    try {
      const { data } = await axiosInstance.get('/materials/main-categories');
      const result = data.result || data || [];
      if (result.length > 0) {
        setCategories(result.map(c => ({ value: c.value, label: c.label, labelEn: c.labelEn || c.label, labelAr: c.labelAr || c.label })));
      }
    } catch {}
  };

  const handleDelete = async () => {
    try {
      await axiosInstance.delete(`/materials/${deleteModal.material._id}`);
      toast.success(lang === 'ar' ? 'ØªÙ… Ø­Ø°Ù Ø§Ù„Ù…Ø§Ø¯Ø© Ø¨Ù†Ø¬Ø§Ø­' : 'Material deleted');
      setDeleteModal({ show: false, material: null });
      fetchMaterials();
    } catch (err) {
      toast.error(err.response?.data?.message || err.message);
    }
  };

  const handleActivate = async (material) => {
    try {
      await axiosInstance.patch(`/materials/${material._id}/activate`);
      toast.success(lang === 'ar' ? 'ØªÙ… ØªÙØ¹ÙŠÙ„ Ø§Ù„Ù…Ø§Ø¯Ø© Ø¨Ù†Ø¬Ø§Ø­' : 'Material activated successfully');
      fetchMaterials();
    } catch (err) {
      toast.error(getErrorMessage(err, lang === 'ar' ? 'ÙØ´Ù„ ØªÙØ¹ÙŠÙ„ Ø§Ù„Ù…Ø§Ø¯Ø©' : 'Failed to activate material'));
    }
  };

  const handleSort = (field) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('asc'); }
  };

  const getUnitName = (unitId) => {
    if (!unitId) return '-';
    const id = unitId?._id || unitId;
    const unit = units.find(u => u._id === id);
    return unit ? (lang === 'ar' ? unit.nameAr : unit.nameEn) : '-';
  };

  const getCategoryLabel = (val) => {
    const cat = categories.find(c => c.value === val);
    if (!cat) return val;
    return lang === 'ar' ? (cat.labelAr || cat.label) : (cat.labelEn || cat.label);
  };

  const handleExport = () => {
    try {
      const data = displayed.map(m => ({
        [lang === 'ar' ? 'Ø§Ù„ÙƒÙˆØ¯' : 'Code']: m.code,
        [lang === 'ar' ? 'Ø§Ù„Ø§Ø³Ù… Ø¨Ø§Ù„Ø¹Ø±Ø¨ÙŠØ©' : 'Name (Arabic)']: m.nameAr,
        [lang === 'ar' ? 'Ø§Ù„Ø§Ø³Ù… Ø¨Ø§Ù„Ø¥Ù†Ø¬Ù„ÙŠØ²ÙŠØ©' : 'Name (English)']: m.nameEn,
        [lang === 'ar' ? 'Ø§Ù„ÙØ¦Ø© Ø§Ù„Ø±Ø¦ÙŠØ³ÙŠØ©' : 'Main Category']: getCategoryLabel(m.mainCategory),
        [lang === 'ar' ? 'Ø§Ù„ÙØ¦Ø© Ø§Ù„ÙØ±Ø¹ÙŠØ©' : 'Sub Category']: m.subCategory || '-',
        [lang === 'ar' ? 'Ø§Ù„ÙˆØ­Ø¯Ø©' : 'Unit']: getUnitName(m.baseUnit?._id || m.baseUnit),
        [lang === 'ar' ? 'Ø§Ù„Ù…Ø®Ø²ÙˆÙ† Ø§Ù„Ø­Ø§Ù„ÙŠ' : 'Current Stock']: m.currentStock || 0,
        [lang === 'ar' ? 'Ø¢Ø®Ø± Ø³Ø¹Ø±' : 'Last Price']: m.lastPurchasePrice || 0,
        [lang === 'ar' ? 'Ø§Ù„Ø­Ø§Ù„Ø©' : 'Status']: m.isActive !== false ? (lang === 'ar' ? 'Ù†Ø´Ø·' : 'Active') : (lang === 'ar' ? 'ØºÙŠØ± Ù†Ø´Ø·' : 'Inactive'),
      }));
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, lang === 'ar' ? 'Ø§Ù„Ù…ÙˆØ§Ø¯' : 'Materials');
      XLSX.writeFile(wb, `Materials_${new Date().toISOString().slice(0, 10)}.xlsx`);
      toast.success(lang === 'ar' ? 'ØªÙ… Ø§Ù„ØªØµØ¯ÙŠØ± Ø¨Ù†Ø¬Ø§Ø­' : 'Exported successfully');
    } catch { toast.error(lang === 'ar' ? 'ÙØ´Ù„ Ø§Ù„ØªØµØ¯ÙŠØ±' : 'Export failed'); }
  };

  const displayed = useMemo(() => {
    const source = searchResults !== null ? searchResults : materials;
    return source
      .filter(m => {
        const matchCat    = filterCat === 'all' || m.mainCategory === filterCat;
        const matchStatus = filterStatus === 'ALL'
          || (filterStatus === 'ACTIVE'   && m.isActive !== false)
          || (filterStatus === 'INACTIVE' && m.isActive === false);
        return matchCat && matchStatus;
      })
      .sort((a, b) => {
        let va = a[sortField] ?? ''; let vb = b[sortField] ?? '';
        if (typeof va === 'string') va = va.toLowerCase();
        if (typeof vb === 'string') vb = vb.toLowerCase();
        return sortDir === 'asc' ? (va > vb ? 1 : -1) : (va < vb ? 1 : -1);
      });
  }, [materials, searchResults, filterCat, filterStatus, sortField, sortDir]);

  const handleClearFilters = () => { setSearchTerm(''); setSearchResults(null); setFilterCat('all'); setFilterStatus('ALL'); };
  const isFiltering = searchTerm || filterCat !== 'all' || filterStatus !== 'ALL';

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">

        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{lang === 'ar' ? 'Ø§Ù„Ù…Ø³ØªÙ„Ø²Ù…Ø§Øª ÙˆØ§Ù„Ù…ÙˆØ§Ø¯' : 'Supplies & Materials'}</h1>
            <p className="text-sm text-gray-500 mt-1">{lang === 'ar' ? 'Ø¹Ø±Ø¶ ÙˆØ¥Ø¯Ø§Ø±Ø© Ø§Ù„Ù…ÙˆØ§Ø¯ Ø§Ù„Ù…Ø³ØªØ®Ø¯Ù…Ø© ÙÙŠ Ø§Ù„Ù…Ø´Ø§Ø±ÙŠØ¹' : 'View and manage materials used in projects.'}</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handleExport} className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 text-gray-700 bg-white rounded-xl hover:bg-gray-50 transition font-semibold text-sm shadow-sm">
              <Download className="w-4 h-4" />{lang === 'ar' ? 'ØªØµØ¯ÙŠØ±' : 'Export'}
            </button>
            <button onClick={() => setAddModal(true)} className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition font-semibold text-sm shadow-sm">
              <Plus className="w-4 h-4" />{lang === 'ar' ? 'Ø¥Ø¶Ø§ÙØ© Ù…Ø§Ø¯Ø©' : 'Add Material'}
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 mb-4">
          <div className="relative flex-1 min-w-[220px]">
            {searching ? (
              <div className="absolute left-3 top-1/2 -translate-y-1/2"><div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" /></div>
            ) : (
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            )}
            <input type="text" placeholder={lang === 'ar' ? 'Ø¨Ø­Ø« Ø¹Ù† Ù…Ø§Ø¯Ø©...' : 'Search materials...'} value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white" />
          </div>

          <select value={filterCat} onChange={e => setFilterCat(e.target.value)} className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white">
            <option value="all">{lang === 'ar' ? 'ÙƒÙ„ Ø§Ù„ÙØ¦Ø§Øª' : 'All Categories'}</option>
            {categories.map(c => <option key={c.value} value={c.value}>{lang === 'ar' ? (c.labelAr || c.label) : (c.labelEn || c.label)}</option>)}
          </select>

          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white">
            <option value="ALL">{lang === 'ar' ? 'ÙƒÙ„ Ø§Ù„Ø­Ø§Ù„Ø§Øª' : 'All Status'}</option>
            <option value="ACTIVE">{lang === 'ar' ? 'Ù†Ø´Ø·' : 'Active'}</option>
            <option value="INACTIVE">{lang === 'ar' ? 'ØºÙŠØ± Ù†Ø´Ø·' : 'Inactive'}</option>
          </select>

          {isFiltering && <button onClick={handleClearFilters} className="text-sm text-indigo-600 hover:underline">{lang === 'ar' ? 'Ù…Ø³Ø­ Ø§Ù„ÙÙ„Ø§ØªØ±' : 'Clear'}</button>}
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
          {loading ? (
            <div className="p-16 text-center">
              <div className="animate-spin inline-block w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full mb-3" />
              <p className="text-sm text-gray-500">{lang === 'ar' ? 'Ø¬Ø§Ø±ÙŠ Ø§Ù„ØªØ­Ù…ÙŠÙ„...' : 'Loading...'}</p>
            </div>
          ) : displayed.length === 0 ? (
            <div className="p-16 text-center">
              <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="font-medium text-gray-600">{lang === 'ar' ? 'Ù„Ø§ ØªÙˆØ¬Ø¯ Ù…ÙˆØ§Ø¯' : 'No materials found'}</p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <SortHeader label={lang === 'ar' ? 'Ø§Ù„Ù…Ø§Ø¯Ø©'    : 'Material'}     field={lang === 'ar' ? 'nameAr' : 'nameEn'} sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                  <SortHeader label={lang === 'ar' ? 'Ø§Ù„ÙƒÙˆØ¯'     : 'Code'}         field="code"              sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                  <SortHeader label={lang === 'ar' ? 'Ø§Ù„ÙØ¦Ø©'     : 'Category'}     field="mainCategory"      sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                  <SortHeader label={lang === 'ar' ? 'Ø§Ù„ÙˆØ­Ø¯Ø©'    : 'Unit'}         field="baseUnit"          sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                  <SortHeader label={lang === 'ar' ? 'Ø§Ù„Ù…Ø®Ø²ÙˆÙ†'   : 'Stock'}        field="currentStock"      sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                  <SortHeader label={lang === 'ar' ? 'Ø¢Ø®Ø± Ø³Ø¹Ø±'   : 'Last Price'}   field="lastPurchasePrice"  sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                  <SortHeader label={lang === 'ar' ? 'Ø§Ù„Ø­Ø§Ù„Ø©'    : 'Status'}       field="isActive"          sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {displayed.map(material => {
                  const isLowStock = (material.currentStock || 0) < (material.minStockLevel || 0);
                  return (
                    <tr key={material._id} className="hover:bg-gray-50/60 transition">
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
                            <Package className="w-4 h-4 text-indigo-600" />
                          </div>
                          <div>
                            <span className="font-medium text-gray-900 text-sm block">{lang === 'ar' ? material.nameAr : material.nameEn}</span>
                            {material.subCategory && <span className="text-xs text-gray-400">{material.subCategory}</span>}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5"><span className="px-2.5 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-700">{material.code}</span></td>
                      <td className="px-4 py-3.5"><span className="px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">{getCategoryLabel(material.mainCategory)}</span></td>
                      <td className="px-4 py-3.5 text-sm text-gray-500">{getUnitName(material.baseUnit?._id || material.baseUnit)}</td>
                      <td className="px-4 py-3.5">
                        <span className={`inline-flex items-center gap-1 text-sm font-semibold ${isLowStock ? 'text-red-600' : 'text-gray-700'}`}>
                          {isLowStock && <AlertTriangle className="w-3.5 h-3.5" />}
                          {material.currentStock || 0}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-sm text-gray-700 font-medium">{material.lastPurchasePrice ? formatCurrency(material.lastPurchasePrice, lang) : '-'}</td>
                      <td className="px-4 py-3.5"><StatusBadge isActive={material.isActive} lang={lang} /></td>
                      <td className="px-4 py-3.5 text-right">
                        <ActionsMenu material={material} lang={lang} onEdit={m => setEditTarget(m)} onDelete={m => setDeleteModal({ show: true, material: m })} onActivate={handleActivate} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {addModal && <MaterialModal lang={lang} mode="add" units={units} categories={categories} refreshUnits={fetchUnits} onClose={() => setAddModal(false)} onSaved={fetchMaterials} />}
      {editTarget && <MaterialModal lang={lang} mode="edit" material={editTarget} units={units} categories={categories} refreshUnits={fetchUnits} onClose={() => setEditTarget(null)} onSaved={fetchMaterials} />}
      {deleteModal.show && <ConfirmModal material={deleteModal.material} lang={lang} onConfirm={handleDelete} onClose={() => setDeleteModal({ show: false, material: null })} />}
    </div>
  );
}

