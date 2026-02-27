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

// Fallback hardcoded categories (used if API fails)
const FALLBACK_CATEGORIES = [
  { value: 'Construction-Materials', labelEn: 'Construction Materials', labelAr: 'مواد البناء'  },
  { value: 'Tools-Equipment',        labelEn: 'Tools & Equipment',       labelAr: 'أدوات ومعدات' },
  { value: 'Electrical',             labelEn: 'Electrical',              labelAr: 'كهرباء'       },
  { value: 'Plumbing',               labelEn: 'Plumbing',                labelAr: 'سباكة'        },
  { value: 'Finishing',              labelEn: 'Finishing',               labelAr: 'تشطيبات'      },
  { value: 'Other',                  labelEn: 'Other',                   labelAr: 'أخرى'         },
];

// ── Sortable column header ─────────────────────────────────
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

// ── Status badge ───────────────────────────────────────────
const StatusBadge = ({ isActive, lang }) => {
  if (isActive === false)
    return <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">{lang === 'ar' ? 'غير نشط' : 'Inactive'}</span>;
  return <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">{lang === 'ar' ? 'نشط' : 'Active'}</span>;
};

// ── Three-dots menu ────────────────────────────────────────
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
            {lang === 'ar' ? 'تعديل' : 'Edit'}
          </button>

          {material.isActive === false && (
            <button onClick={() => { setOpen(false); onActivate(material); }} className="flex items-center gap-2 w-full px-4 py-2 text-sm text-green-600 hover:bg-green-50 transition">
              <CheckCircle className="w-4 h-4" />
              {lang === 'ar' ? 'تفعيل' : 'Activate'}
            </button>
          )}

          <button onClick={() => { setOpen(false); onDelete(material); }} className="flex items-center gap-2 w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition">
            <Trash2 className="w-4 h-4" />
            {lang === 'ar' ? 'حذف' : 'Delete'}
          </button>
        </div>
      )}
    </div>
  );
};

// ── Add/Edit Modal ─────────────────────────────────────────
const MaterialModal = ({ lang, mode, material: editMaterial, units, categories, onClose, onSaved }) => {
  const [form, setForm] = useState({
    nameAr:             editMaterial?.nameAr             || '',
    nameEn:             editMaterial?.nameEn             || '',
    code:               editMaterial?.code               || '',
    mainCategory:       editMaterial?.mainCategory       || (categories[0]?.value || 'Construction-Materials'),
    subCategory:        editMaterial?.subCategory        || '',
    baseUnit:           editMaterial?.baseUnit?._id || editMaterial?.baseUnit || '',
    // ✅ ظبطنا الاسم ليطابق الـ Schema
    minStockLevel:      editMaterial?.minStockLevel      || 0,
    lastPurchasedPrice: editMaterial?.lastPurchasePrice  || 0,
    lastPurchasedDate:  editMaterial?.lastPurchaseDate
      ? new Date(editMaterial.lastPurchaseDate).toISOString().split('T')[0] : '',
    description:        editMaterial?.description        || '',
    // ✅ الـ defaultPurchaseUnit و defaultIssueUnit
    defaultPurchaseUnit: editMaterial?.defaultPurchaseUnit?._id || editMaterial?.defaultPurchaseUnit || '',
    defaultIssueUnit:    editMaterial?.defaultIssueUnit?._id    || editMaterial?.defaultIssueUnit    || '',
    // ✅ alternativeUnits
    alternativeUnits:   editMaterial?.alternativeUnits?.map(u => ({
      unitId:            u.unitId?._id || u.unitId || '',
      conversionFactor:  u.conversionFactor || 1,
      isDefaultPurchase: u.isDefaultPurchase || false,
      isDefaultIssue:    u.isDefaultIssue    || false,
      allowOverride:     u.allowOverride     || false,
    })) || [],
  });
  const [submitting, setSubmitting] = useState(false);

  // الوحدات المتاحة لـ alternativeUnits (غير الـ baseUnit)
  const altUnitOptions = units.filter(u => u._id !== form.baseUnit && u.isActive !== false);

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

    // لو شيّلنا isDefaultPurchase عن وحدة، نخليه true على الأولى بس
    if (field === 'isDefaultPurchase' && value === true) {
      updated.forEach((u, i) => { if (i !== idx) u.isDefaultPurchase = false; });
    }
    if (field === 'isDefaultIssue' && value === true) {
      updated.forEach((u, i) => { if (i !== idx) u.isDefaultIssue = false; });
    }
    setForm(f => ({ ...f, alternativeUnits: updated }));
  };

  // وحدات مسموح بيها للـ defaultPurchaseUnit/defaultIssueUnit (base + alternatives)
  const allowedUnitIds = [
    form.baseUnit,
    ...form.alternativeUnits.map(u => u.unitId).filter(Boolean)
  ];
  const allowedUnits = units.filter(u => allowedUnitIds.includes(u._id));

  const handleSubmit = async () => {
    if (!form.nameAr.trim() || !form.nameEn.trim()) { toast.error(lang === 'ar' ? 'اسم المادة مطلوب' : 'Material name is required'); return; }
    if (!form.code.trim())   { toast.error(lang === 'ar' ? 'الكود مطلوب' : 'Code is required'); return; }
    if (!form.baseUnit)      { toast.error(lang === 'ar' ? 'الوحدة الأساسية مطلوبة' : 'Base unit is required'); return; }

    // Validate alternativeUnits
    for (const [i, alt] of form.alternativeUnits.entries()) {
      if (!alt.unitId) { toast.error(lang === 'ar' ? `اختر وحدة في السطر ${i + 1}` : `Select unit in row ${i + 1}`); return; }
      if (!alt.conversionFactor || alt.conversionFactor <= 0) { toast.error(lang === 'ar' ? `معامل التحويل غلط في السطر ${i + 1}` : `Invalid conversion factor in row ${i + 1}`); return; }
    }

    try {
      setSubmitting(true);
      const payload = {
     nameAr:             form.nameAr.trim(),
  nameEn:             form.nameEn.trim(),
  code:               form.code.trim().toUpperCase(),
  mainCategory:       form.mainCategory,
  subCategory:        form.subCategory.trim() || undefined,   // ✅ undefined مش ''
  baseUnit:           form.baseUnit,
  minLevelStock:      Number(form.minStockLevel) || 0,        // ✅ صح الاسم
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

      toast.success(lang === 'ar' ? 'تم الحفظ بنجاح' : 'Saved successfully');
      onSaved();
      onClose();
    } catch (err) {
      toast.error(getErrorMessage(err, lang === 'ar' ? 'فشل حفظ المادة' : 'Failed to save material'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-gray-900">
            {mode === 'add' ? (lang === 'ar' ? 'إضافة مادة جديدة' : 'Add New Material') : (lang === 'ar' ? 'تعديل المادة' : 'Edit Material')}
          </h2>
          <button onClick={onClose} className="p-1 rounded-md hover:bg-gray-100 text-gray-400"><X className="w-5 h-5" /></button>
        </div>

        <div className="space-y-4">
          {/* Names */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{lang === 'ar' ? 'الاسم بالعربية' : 'Name (Arabic)'} <span className="text-red-500">*</span></label>
              <input type="text" dir="rtl" value={form.nameAr} onChange={e => setForm(f => ({ ...f, nameAr: e.target.value }))} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition text-sm bg-gray-50" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{lang === 'ar' ? 'الاسم بالإنجليزية' : 'Name (English)'} <span className="text-red-500">*</span></label>
              <input type="text" dir="ltr" value={form.nameEn} onChange={e => setForm(f => ({ ...f, nameEn: e.target.value }))} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition text-sm bg-gray-50" />
            </div>
          </div>

          {/* Code + Category */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{lang === 'ar' ? 'الكود' : 'Code'} <span className="text-red-500">*</span></label>
              <input type="text" placeholder="STEEL-14MM" value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition text-sm bg-gray-50" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{lang === 'ar' ? 'الفئة الرئيسية' : 'Main Category'} <span className="text-red-500">*</span></label>
              <select value={form.mainCategory} onChange={e => setForm(f => ({ ...f, mainCategory: e.target.value }))} disabled={mode === 'edit'} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition text-sm bg-gray-50 disabled:opacity-60">
                {categories.map(c => <option key={c.value} value={c.value}>{lang === 'ar' ? (c.labelAr || c.label) : (c.labelEn || c.label)}</option>)}
              </select>
            </div>
          </div>

          {/* Sub Category + Base Unit */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{lang === 'ar' ? 'الفئة الفرعية' : 'Sub Category'}</label>
              <input type="text" dir={lang === 'ar' ? 'rtl' : 'ltr'} value={form.subCategory} onChange={e => setForm(f => ({ ...f, subCategory: e.target.value }))} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition text-sm bg-gray-50" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{lang === 'ar' ? 'وحدة التخزين (Base)' : 'Storage Unit (Base)'} <span className="text-red-500">*</span></label>
              <select value={form.baseUnit} onChange={e => setForm(f => ({ ...f, baseUnit: e.target.value, alternativeUnits: [], defaultPurchaseUnit: '', defaultIssueUnit: '' }))} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition text-sm bg-gray-50">
                <option value="">{lang === 'ar' ? 'اختر الوحدة' : 'Select Unit'}</option>
                {units.filter(u => u.isActive !== false).map(u => <option key={u._id} value={u._id}>{lang === 'ar' ? u.nameAr : u.nameEn} ({u.symbol})</option>)}
              </select>
            </div>
          </div>

          {/* ✅ Alternative Units Section */}
          <div className="border border-gray-200 rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-200">
              <div>
                <p className="text-sm font-medium text-gray-700">{lang === 'ar' ? 'وحدات بديلة' : 'Alternative Units'}</p>
                <p className="text-xs text-gray-400 mt-0.5">{lang === 'ar' ? 'وحدات الشراء والصرف المسموحة بخلاف الـ base' : 'Allowed purchase/issue units besides base'}</p>
              </div>
              <button
                type="button"
                onClick={handleAddAltUnit}
                disabled={!form.baseUnit}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-medium hover:bg-indigo-700 transition disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Plus className="w-3.5 h-3.5" />
                {lang === 'ar' ? 'إضافة' : 'Add'}
              </button>
            </div>

            {form.alternativeUnits.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-4">
                {lang === 'ar' ? 'لا توجد وحدات بديلة — الشراء والصرف سيكون بالـ base unit فقط' : 'No alternative units — purchase & issue will use base unit only'}
              </p>
            ) : (
              <div className="divide-y divide-gray-100">
                {form.alternativeUnits.map((alt, idx) => (
                  <div key={idx} className="p-3 space-y-2">
                    <div className="grid grid-cols-3 gap-2 items-end">
                      {/* Unit Select */}
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">{lang === 'ar' ? 'الوحدة' : 'Unit'} <span className="text-red-400">*</span></label>
                        <select
                          value={alt.unitId}
                          onChange={e => handleAltUnitChange(idx, 'unitId', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        >
                          <option value="">{lang === 'ar' ? 'اختر' : 'Select'}</option>
                          {altUnitOptions.map(u => <option key={u._id} value={u._id}>{lang === 'ar' ? u.nameAr : u.nameEn} ({u.symbol})</option>)}
                        </select>
                      </div>

                      {/* Conversion Factor */}
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          {lang === 'ar' ? 'معامل التحويل' : 'Conversion Factor'} <span className="text-red-400">*</span>
                        </label>
                        <input
                          type="number" step="0.000001" min="0.000001"
                          value={alt.conversionFactor}
                          onChange={e => handleAltUnitChange(idx, 'conversionFactor', parseFloat(e.target.value) || 0)}
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-indigo-500"
                        />
                        <p className="text-xs text-gray-400 mt-0.5">
                          {lang === 'ar' ? '1 وحدة بديلة = X وحدة أساسية' : '1 alt unit = X base units'}
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
                        <span className="text-xs text-gray-600">{lang === 'ar' ? 'افتراضي للشراء' : 'Default Purchase'}</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={alt.isDefaultIssue} onChange={e => handleAltUnitChange(idx, 'isDefaultIssue', e.target.checked)} className="w-4 h-4 text-indigo-600 border-gray-300 rounded" />
                        <span className="text-xs text-gray-600">{lang === 'ar' ? 'افتراضي للصرف' : 'Default Issue'}</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={alt.allowOverride} onChange={e => handleAltUnitChange(idx, 'allowOverride', e.target.checked)} className="w-4 h-4 text-amber-500 border-gray-300 rounded" />
                        <span className="text-xs text-gray-600">{lang === 'ar' ? 'السماح بتعديل معامل التحويل' : 'Allow override conversion'}</span>
                      </label>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ✅ Default Units */}
          {allowedUnits.length > 0 && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{lang === 'ar' ? 'وحدة الشراء الافتراضية' : 'Default Purchase Unit'}</label>
                <select value={form.defaultPurchaseUnit} onChange={e => setForm(f => ({ ...f, defaultPurchaseUnit: e.target.value }))} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 text-sm bg-gray-50">
                  <option value="">{lang === 'ar' ? 'نفس الـ base' : 'Same as base'}</option>
                  {allowedUnits.map(u => <option key={u._id} value={u._id}>{lang === 'ar' ? u.nameAr : u.nameEn} ({u.symbol})</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{lang === 'ar' ? 'وحدة الصرف الافتراضية' : 'Default Issue Unit'}</label>
                <select value={form.defaultIssueUnit} onChange={e => setForm(f => ({ ...f, defaultIssueUnit: e.target.value }))} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 text-sm bg-gray-50">
                  <option value="">{lang === 'ar' ? 'نفس الـ base' : 'Same as base'}</option>
                  {allowedUnits.map(u => <option key={u._id} value={u._id}>{lang === 'ar' ? u.nameAr : u.nameEn} ({u.symbol})</option>)}
                </select>
              </div>
            </div>
          )}

          {/* Stock + Price */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              {/* ✅ ظبطنا الاسم */}
              <label className="block text-sm font-medium text-gray-700 mb-1">{lang === 'ar' ? 'الحد الأدنى للمخزون' : 'Min Stock Level'}</label>
              <input type="number" min="0" value={form.minStockLevel} onChange={e => setForm(f => ({ ...f, minStockLevel: e.target.value }))} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition text-sm bg-gray-50" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{lang === 'ar' ? 'آخر سعر شراء' : 'Last Purchase Price'}</label>
              <input type="number" min="0" step="0.01" value={form.lastPurchasedPrice} onChange={e => setForm(f => ({ ...f, lastPurchasedPrice: e.target.value }))} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition text-sm bg-gray-50" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{lang === 'ar' ? 'تاريخ آخر شراء' : 'Last Purchase Date'}</label>
            <input type="date" value={form.lastPurchasedDate} onChange={e => setForm(f => ({ ...f, lastPurchasedDate: e.target.value }))} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition text-sm bg-gray-50" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{lang === 'ar' ? 'الوصف' : 'Description'}</label>
            <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows="2" dir={lang === 'ar' ? 'rtl' : 'ltr'} placeholder={lang === 'ar' ? 'أضف وصفاً للمادة...' : 'Add material description...'} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition text-sm bg-gray-50 resize-none" />
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

// ── Confirm Modal ──────────────────────────────────────────
const ConfirmModal = ({ material, lang, onConfirm, onClose }) => (
  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
    <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-11 h-11 rounded-full flex items-center justify-center bg-red-100">
          <Trash2 className="w-5 h-5 text-red-600" />
        </div>
        <div>
          <h3 className="text-base font-semibold text-gray-900">{lang === 'ar' ? 'تأكيد الحذف' : 'Confirm Delete'}</h3>
          <p className="text-sm text-gray-500">{lang === 'ar' ? 'هل أنت متأكد من حذف هذه المادة؟' : 'Are you sure you want to delete this material?'}</p>
        </div>
      </div>
      <div className="bg-gray-50 rounded-xl p-4 mb-4">
        <p className="font-medium text-gray-900 text-sm">{lang === 'ar' ? material?.nameAr : material?.nameEn}</p>
        <p className="text-xs text-gray-500">{lang === 'ar' ? 'الكود: ' : 'Code: '}{material?.code}</p>
      </div>
      <div className="flex gap-3">
        <button onClick={onClose} className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition font-medium text-sm">
          {lang === 'ar' ? 'إلغاء' : 'Cancel'}
        </button>
        <button onClick={onConfirm} className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-xl hover:bg-red-700 transition font-medium text-sm">
          {lang === 'ar' ? 'حذف' : 'Delete'}
        </button>
      </div>
    </div>
  </div>
);

// ── Main Component ─────────────────────────────────────────
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
        toast.error(lang === 'ar' ? 'فشل البحث' : 'Search failed');
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
      toast.error(lang === 'ar' ? 'فشل تحميل المواد' : 'Failed to load materials');
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
      toast.success(lang === 'ar' ? 'تم حذف المادة بنجاح' : 'Material deleted');
      setDeleteModal({ show: false, material: null });
      fetchMaterials();
    } catch (err) {
      toast.error(err.response?.data?.message || err.message);
    }
  };

  const handleActivate = async (material) => {
    try {
      await axiosInstance.patch(`/materials/${material._id}/activate`);
      toast.success(lang === 'ar' ? 'تم تفعيل المادة بنجاح' : 'Material activated successfully');
      fetchMaterials();
    } catch (err) {
      toast.error(getErrorMessage(err, lang === 'ar' ? 'فشل تفعيل المادة' : 'Failed to activate material'));
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
        [lang === 'ar' ? 'الكود' : 'Code']: m.code,
        [lang === 'ar' ? 'الاسم بالعربية' : 'Name (Arabic)']: m.nameAr,
        [lang === 'ar' ? 'الاسم بالإنجليزية' : 'Name (English)']: m.nameEn,
        [lang === 'ar' ? 'الفئة الرئيسية' : 'Main Category']: getCategoryLabel(m.mainCategory),
        [lang === 'ar' ? 'الفئة الفرعية' : 'Sub Category']: m.subCategory || '-',
        [lang === 'ar' ? 'الوحدة' : 'Unit']: getUnitName(m.baseUnit?._id || m.baseUnit),
        [lang === 'ar' ? 'المخزون الحالي' : 'Current Stock']: m.currentStock || 0,
        [lang === 'ar' ? 'آخر سعر' : 'Last Price']: m.lastPurchasePrice || 0,
        [lang === 'ar' ? 'الحالة' : 'Status']: m.isActive !== false ? (lang === 'ar' ? 'نشط' : 'Active') : (lang === 'ar' ? 'غير نشط' : 'Inactive'),
      }));
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, lang === 'ar' ? 'المواد' : 'Materials');
      XLSX.writeFile(wb, `Materials_${new Date().toISOString().slice(0, 10)}.xlsx`);
      toast.success(lang === 'ar' ? 'تم التصدير بنجاح' : 'Exported successfully');
    } catch { toast.error(lang === 'ar' ? 'فشل التصدير' : 'Export failed'); }
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
            <h1 className="text-2xl font-bold text-gray-900">{lang === 'ar' ? 'المستلزمات والمواد' : 'Supplies & Materials'}</h1>
            <p className="text-sm text-gray-500 mt-1">{lang === 'ar' ? 'عرض وإدارة المواد المستخدمة في المشاريع' : 'View and manage materials used in projects.'}</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handleExport} className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 text-gray-700 bg-white rounded-xl hover:bg-gray-50 transition font-semibold text-sm shadow-sm">
              <Download className="w-4 h-4" />{lang === 'ar' ? 'تصدير' : 'Export'}
            </button>
            <button onClick={() => setAddModal(true)} className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition font-semibold text-sm shadow-sm">
              <Plus className="w-4 h-4" />{lang === 'ar' ? 'إضافة مادة' : 'Add Material'}
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
            <input type="text" placeholder={lang === 'ar' ? 'بحث عن مادة...' : 'Search materials...'} value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white" />
          </div>

          <select value={filterCat} onChange={e => setFilterCat(e.target.value)} className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white">
            <option value="all">{lang === 'ar' ? 'كل الفئات' : 'All Categories'}</option>
            {categories.map(c => <option key={c.value} value={c.value}>{lang === 'ar' ? (c.labelAr || c.label) : (c.labelEn || c.label)}</option>)}
          </select>

          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white">
            <option value="ALL">{lang === 'ar' ? 'كل الحالات' : 'All Status'}</option>
            <option value="ACTIVE">{lang === 'ar' ? 'نشط' : 'Active'}</option>
            <option value="INACTIVE">{lang === 'ar' ? 'غير نشط' : 'Inactive'}</option>
          </select>

          {isFiltering && <button onClick={handleClearFilters} className="text-sm text-indigo-600 hover:underline">{lang === 'ar' ? 'مسح الفلاتر' : 'Clear'}</button>}
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
          {loading ? (
            <div className="p-16 text-center">
              <div className="animate-spin inline-block w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full mb-3" />
              <p className="text-sm text-gray-500">{lang === 'ar' ? 'جاري التحميل...' : 'Loading...'}</p>
            </div>
          ) : displayed.length === 0 ? (
            <div className="p-16 text-center">
              <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="font-medium text-gray-600">{lang === 'ar' ? 'لا توجد مواد' : 'No materials found'}</p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <SortHeader label={lang === 'ar' ? 'المادة'    : 'Material'}     field={lang === 'ar' ? 'nameAr' : 'nameEn'} sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                  <SortHeader label={lang === 'ar' ? 'الكود'     : 'Code'}         field="code"              sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                  <SortHeader label={lang === 'ar' ? 'الفئة'     : 'Category'}     field="mainCategory"      sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                  <SortHeader label={lang === 'ar' ? 'الوحدة'    : 'Unit'}         field="baseUnit"          sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                  <SortHeader label={lang === 'ar' ? 'المخزون'   : 'Stock'}        field="currentStock"      sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                  <SortHeader label={lang === 'ar' ? 'آخر سعر'   : 'Last Price'}   field="lastPurchasePrice"  sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                  <SortHeader label={lang === 'ar' ? 'الحالة'    : 'Status'}       field="isActive"          sortField={sortField} sortDir={sortDir} onSort={handleSort} />
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

      {addModal && <MaterialModal lang={lang} mode="add" units={units} categories={categories} onClose={() => setAddModal(false)} onSaved={fetchMaterials} />}
      {editTarget && <MaterialModal lang={lang} mode="edit" material={editTarget} units={units} categories={categories} onClose={() => setEditTarget(null)} onSaved={fetchMaterials} />}
      {deleteModal.show && <ConfirmModal material={deleteModal.material} lang={lang} onConfirm={handleDelete} onClose={() => setDeleteModal({ show: false, material: null })} />}
    </div>
  );
}