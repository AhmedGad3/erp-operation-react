import React, { useState, useEffect, useContext } from 'react';
import { Package, Plus, Trash2, ArrowLeft, DollarSign, Tag, TrendingDown, TrendingUp, AlertTriangle, Lock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import axiosInstance from '../../utils/axiosInstance';
import FullPageLoader from '../Loader/Loader';
import { LanguageContext } from '../../context/LanguageContext';
import { toast } from 'react-toastify';

const LOCKED_STATUSES = ['ON_HOLD', 'COMPLETED', 'CANCELLED', 'CLOSED'];

const STATUS_LABELS = {
  PLANNED:     { ar: 'مخطط',  en: 'Planned' },
  IN_PROGRESS: { ar: 'جاري',  en: 'In Progress' },
  ON_HOLD:     { ar: 'موقوف', en: 'On Hold' },
  COMPLETED:   { ar: 'مكتمل', en: 'Completed' },
  CANCELLED:   { ar: 'ملغي',  en: 'Cancelled' },
  CLOSED:      { ar: 'مغلق',  en: 'Closed' },
};

const CreateMaterialIssue = () => {
  const { lang } = useContext(LanguageContext);
  const navigate  = useNavigate();

  const [projects,   setProjects]   = useState([]);
  const [materials,  setMaterials]  = useState([]);
  const [units,      setUnits]      = useState([]);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    projectId: '',
    issueDate: new Date().toISOString().split('T')[0],
    items: [{ materialId: '', unitId: '', quantity: '', unitPrice: '' }],
    notes: ''
  });

  const [errors, setErrors] = useState({});

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      const [pRes, mRes, uRes] = await Promise.all([
        axiosInstance.get('/projects'),
        axiosInstance.get('/materials'),
        axiosInstance.get('/units'),
      ]);
      setProjects (Array.isArray(pRes.data) ? pRes.data : (pRes.data.result || []));
      setMaterials(Array.isArray(mRes.data) ? mRes.data : (mRes.data.result || []));
      setUnits    (Array.isArray(uRes.data) ? uRes.data : (uRes.data.result || []));
    } catch {
      toast.error(lang === 'ar' ? 'فشل تحميل البيانات' : 'Failed to load data');
    }
  };

  const selectedProject = projects.find(p => p._id === formData.projectId);
  const projectStatus   = selectedProject?.status ?? null;
  const isProjectLocked = projectStatus ? LOCKED_STATUSES.includes(projectStatus) : false;

  const getStatusLabel = (status) => {
    if (!status) return '';
    return lang === 'ar' ? (STATUS_LABELS[status]?.ar ?? status) : (STATUS_LABELS[status]?.en ?? status);
  };

  const getMaterial          = (id) => materials.find(m => m._id === id);
  const getLastPurchasePrice = (id) => getMaterial(id)?.lastPurchasePrice ?? null;

  const calcDiscount = (materialId, unitPrice) => {
    const lpp = getLastPurchasePrice(materialId);
    if (lpp == null || unitPrice === '' || unitPrice == null) return null;
    const price = parseFloat(unitPrice);
    if (isNaN(price)) return null;
    const discountAmt = lpp - price;
    const discountPct = lpp > 0 ? (discountAmt / lpp) * 100 : 0;
    return { lpp, discountAmt, discountPct };
  };

  const calcItemTotal  = (item) => item.quantity && item.unitPrice ? parseFloat(item.quantity) * parseFloat(item.unitPrice) : 0;
  const calcItemCost   = (item) => { const lpp = getLastPurchasePrice(item.materialId); return lpp != null && item.quantity ? parseFloat(item.quantity) * lpp : null; };
  const calcGrandTotal = ()     => formData.items.reduce((s, i) => s + calcItemTotal(i), 0);

  const validateForm = () => {
    const errs = {};
    if (!formData.projectId) errs.projectId = lang === 'ar' ? 'اختر مشروع' : 'Select a project';
    if (!formData.issueDate) errs.issueDate  = lang === 'ar' ? 'حدد التاريخ' : 'Select a date';
    if (isProjectLocked) {
      errs.projectId = lang === 'ar'
        ? `المشروع ${getStatusLabel(projectStatus)} ولا يمكن إضافة مواد إليه`
        : `Project is ${getStatusLabel(projectStatus)} and cannot receive materials`;
    }
    formData.items.forEach((item, idx) => {
      if (!item.materialId)                                   errs[`item_${idx}_material`]  = lang === 'ar' ? 'اختر مادة'         : 'Select material';
      if (!item.unitId)                                       errs[`item_${idx}_unit`]      = lang === 'ar' ? 'اختر الوحدة'       : 'Select unit';
      if (!item.quantity  || parseFloat(item.quantity)  <= 0) errs[`item_${idx}_quantity`] = lang === 'ar' ? 'أدخل كمية صحيحة'   : 'Valid quantity required';
      if (!item.unitPrice || parseFloat(item.unitPrice) <= 0) errs[`item_${idx}_price`]    = lang === 'ar' ? 'أدخل سعر صحيح'     : 'Valid price required';
    });
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) { toast.error(lang === 'ar' ? 'يرجى إصلاح الأخطاء' : 'Fix errors'); return; }
    try {
      setSubmitting(true);
      await axiosInstance.post('/projects/material-issue', {
        projectId: formData.projectId,
        issueDate: formData.issueDate,
        items: formData.items.map(i => ({
          materialId: i.materialId,
          unitId:     i.unitId,
          quantity:   parseFloat(i.quantity),
          unitPrice:  parseFloat(i.unitPrice),
        })),
        notes: formData.notes.trim(),
      });
      toast.success(lang === 'ar' ? 'تم إنشاء التحويل بنجاح!' : 'Material issue created!');
      setTimeout(() => navigate('/projects'), 1500);
    } catch (err) {
      const backendMsg = err.response?.data?.message;
      const msg = lang === 'ar'
        ? (Array.isArray(backendMsg) ? backendMsg.join('، ') : null) || 'فشل إنشاء التحويل'
        : (Array.isArray(backendMsg) ? backendMsg.join(', ') : backendMsg) || 'Failed to create material issue';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddItem    = () =>
    setFormData(p => ({ ...p, items: [...p.items, { materialId: '', unitId: '', quantity: '', unitPrice: '' }] }));

  const handleRemoveItem = (idx) =>
    setFormData(p => ({ ...p, items: p.items.filter((_, i) => i !== idx) }));

  const handleItemChange = (idx, field, value) => {
    const items = [...formData.items];
    items[idx]  = { ...items[idx], [field]: value };
    if (field === 'materialId') {
      items[idx].unitPrice = '';
      const mat = materials.find(m => m._id === value);
      items[idx].unitId = mat?.baseUnit ? mat.baseUnit.toString() : '';
    }
    setFormData(p => ({ ...p, items }));
  };

  // ── shared input class ────────────────────────────────────
  const inputCls = (hasError) =>
    `w-full px-4 py-2.5 border rounded-xl text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent transition bg-gray-50 ${
      hasError ? 'border-red-400' : 'border-gray-200'
    }`;

  const smallInputCls = (hasError) =>
    `w-full px-3 py-2 border rounded-xl text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent transition bg-gray-50 ${
      hasError ? 'border-red-400' : 'border-gray-200'
    }`;

  if (submitting) return <FullPageLoader text={lang === 'ar' ? 'جاري المعالجة...' : 'Processing...'} />;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">

        {/* ── Page Header ── */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {lang === 'ar' ? 'تحويل مواد' : 'Material Issue'}
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              {lang === 'ar' ? 'تحويل المواد من الستوك إلى المشروع' : 'Transfer materials from stock to project'}
            </p>
          </div>
          <button
            onClick={() => navigate('/projects')}
            className="flex items-center gap-2 px-5 py-2.5 border border-gray-200 text-gray-700 bg-white rounded-xl hover:bg-gray-50 transition font-semibold text-sm shadow-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            {lang === 'ar' ? 'رجوع' : 'Back'}
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">

          {/* ── Project & Date ── */}
          <div className="bg-white border border-gray-200 rounded-2xl p-6">
            <h2 className="text-sm font-semibold text-gray-700 mb-4">
              {lang === 'ar' ? 'بيانات التحويل' : 'Issue Information'}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

              {/* Project */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {lang === 'ar' ? 'المشروع' : 'Project'} <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.projectId}
                  onChange={e => setFormData(p => ({ ...p, projectId: e.target.value }))}
                  className={inputCls(errors.projectId || isProjectLocked)}
                  disabled={submitting}
                >
                  <option value="">{lang === 'ar' ? 'اختر مشروع' : 'Select project'}</option>
                  {projects.map(p => (
                    <option key={p._id} value={p._id}>
                      {lang === 'ar' ? p.nameAr : p.nameEn} ({p.code})
                    </option>
                  ))}
                </select>

                {/* Status badge */}
                {projectStatus && (
                  <div className={`mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                    isProjectLocked ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                  }`}>
                    {isProjectLocked ? <Lock className="w-3 h-3" /> : <Package className="w-3 h-3" />}
                    {getStatusLabel(projectStatus)}
                  </div>
                )}

                {/* Locked warning */}
                {isProjectLocked && (
                  <div className="mt-2 flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl p-3">
                    <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-red-700">
                      {lang === 'ar'
                        ? `لا يمكن تحويل مواد لمشروع بحالة "${getStatusLabel(projectStatus)}"`
                        : `Cannot issue materials to a project with status "${getStatusLabel(projectStatus)}"`}
                    </p>
                  </div>
                )}

                {errors.projectId && !isProjectLocked && (
                  <p className="mt-1 text-xs text-red-500">{errors.projectId}</p>
                )}
              </div>

              {/* Issue Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {lang === 'ar' ? 'تاريخ التحويل' : 'Issue Date'} <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={formData.issueDate}
                  onChange={e => setFormData(p => ({ ...p, issueDate: e.target.value }))}
                  className={inputCls(errors.issueDate)}
                  disabled={submitting}
                />
                {errors.issueDate && <p className="mt-1 text-xs text-red-500">{errors.issueDate}</p>}
              </div>

            </div>
          </div>

          {/* ── Materials ── */}
          <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">

            {/* Section header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-sm font-semibold text-gray-700">
                {lang === 'ar' ? 'المواد المنقولة' : 'Materials to Transfer'}
              </h2>
              <button
                type="button"
                onClick={handleAddItem}
                disabled={submitting || isProjectLocked}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition font-semibold text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Plus className="w-4 h-4" />
                {lang === 'ar' ? 'إضافة مادة' : 'Add Material'}
              </button>
            </div>

            {/* Items */}
            <div className="divide-y divide-gray-50 p-4 space-y-3">
              {formData.items.map((item, idx) => {
                const lpp      = getLastPurchasePrice(item.materialId);
                const discount = calcDiscount(item.materialId, item.unitPrice);
                const itemCost = calcItemCost(item);
                const isDiscount = discount && discount.discountAmt > 0;
                const isMargin   = discount && discount.discountAmt < 0;

                const selectedMaterial = getMaterial(item.materialId);
                const availableUnitIds = selectedMaterial
                  ? [
                      selectedMaterial.baseUnit?.toString(),
                      ...(selectedMaterial.alternativeUnits?.map(u => u.unitId?.toString()) ?? [])
                    ].filter(Boolean)
                  : null;
                const filteredUnits = availableUnitIds
                  ? units.filter(u => availableUnitIds.includes(u._id?.toString()))
                  : units;

                return (
                  <div key={idx} className="bg-gray-50/60 border border-gray-100 rounded-2xl p-4 space-y-3">

                    {/* Inputs row */}
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-3 items-start">

                      {/* Material */}
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          {lang === 'ar' ? 'المادة' : 'Material'} <span className="text-red-400">*</span>
                        </label>
                        <select
                          value={item.materialId}
                          onChange={e => handleItemChange(idx, 'materialId', e.target.value)}
                          className={smallInputCls(errors[`item_${idx}_material`])}
                          disabled={submitting || isProjectLocked}
                        >
                          <option value="">{lang === 'ar' ? 'اختر' : 'Select'}</option>
                          {materials.map(m => (
                            <option key={m._id} value={m._id}>
                              {lang === 'ar' ? m.nameAr : m.nameEn}
                            </option>
                          ))}
                        </select>
                        {errors[`item_${idx}_material`] && (
                          <p className="mt-0.5 text-xs text-red-500">{errors[`item_${idx}_material`]}</p>
                        )}
                      </div>

                      {/* Unit */}
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          {lang === 'ar' ? 'الوحدة' : 'Unit'} <span className="text-red-400">*</span>
                        </label>
                        <select
                          value={item.unitId}
                          onChange={e => handleItemChange(idx, 'unitId', e.target.value)}
                          className={smallInputCls(errors[`item_${idx}_unit`])}
                          disabled={submitting || isProjectLocked || !item.materialId}
                        >
                          <option value="">{lang === 'ar' ? 'اختر' : 'Select'}</option>
                          {filteredUnits.map(u => (
                            <option key={u._id} value={u._id}>
                              {lang === 'ar' ? u.nameAr : u.nameEn}
                              {selectedMaterial && u._id?.toString() === selectedMaterial.baseUnit?.toString()
                                ? (lang === 'ar' ? ' (أساسية)' : ' (base)') : ''}
                            </option>
                          ))}
                        </select>
                        {errors[`item_${idx}_unit`] && (
                          <p className="mt-0.5 text-xs text-red-500">{errors[`item_${idx}_unit`]}</p>
                        )}
                      </div>

                      {/* Quantity */}
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          {lang === 'ar' ? 'الكمية' : 'Quantity'} <span className="text-red-400">*</span>
                        </label>
                        <input
                          type="number" step="0.0001" value={item.quantity} placeholder="0.00"
                          onChange={e => handleItemChange(idx, 'quantity', e.target.value)}
                          className={smallInputCls(errors[`item_${idx}_quantity`])}
                          disabled={submitting || isProjectLocked}
                        />
                        {selectedMaterial && (
                          <p className="mt-0.5 text-xs text-gray-400">
                            {lang === 'ar'
                              ? `متاح: ${(selectedMaterial.currentStock ?? 0).toLocaleString()}`
                              : `Available: ${(selectedMaterial.currentStock ?? 0).toLocaleString()}`}
                          </p>
                        )}
                        {errors[`item_${idx}_quantity`] && (
                          <p className="mt-0.5 text-xs text-red-500">{errors[`item_${idx}_quantity`]}</p>
                        )}
                      </div>

                      {/* Unit Price */}
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          {lang === 'ar' ? 'سعر الصرف' : 'Issue Price'} <span className="text-red-400">*</span>
                        </label>
                        <input
                          type="number" step="0.01" value={item.unitPrice} placeholder="0.00"
                          onChange={e => handleItemChange(idx, 'unitPrice', e.target.value)}
                          className={smallInputCls(errors[`item_${idx}_price`])}
                          disabled={submitting || isProjectLocked}
                        />
                        {lpp != null && (
                          <p className="mt-0.5 text-xs text-gray-400 flex items-center gap-1">
                            <Tag className="w-3 h-3" />
                            {lang === 'ar' ? `آخر سعر شراء: ${lpp.toLocaleString()}` : `Last purchase: ${lpp.toLocaleString()}`}
                          </p>
                        )}
                        {errors[`item_${idx}_price`] && (
                          <p className="mt-0.5 text-xs text-red-500">{errors[`item_${idx}_price`]}</p>
                        )}
                      </div>

                      {/* Total + Delete */}
                      <div className="flex flex-col justify-between gap-2">
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">
                            {lang === 'ar' ? 'الإجمالي' : 'Total'}
                          </label>
                          <div className="px-3 py-2 bg-purple-50 border border-purple-100 rounded-xl text-sm font-semibold text-purple-900">
                            {calcItemTotal(item).toLocaleString()}
                          </div>
                        </div>
                        {formData.items.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(idx)}
                            disabled={submitting || isProjectLocked}
                            className="p-1.5 rounded-xl text-gray-400 hover:text-red-500 hover:bg-red-50 transition disabled:opacity-30 disabled:cursor-not-allowed self-start"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Discount / Margin info row */}
                    {discount && (
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-3 border-t border-gray-100">
                        <div className="bg-white border border-gray-100 rounded-xl px-3 py-2">
                          <p className="text-xs text-gray-400 mb-0.5">{lang === 'ar' ? 'آخر سعر شراء' : 'Last Purchase'}</p>
                          <p className="text-sm font-semibold text-gray-700">{discount.lpp.toLocaleString()}</p>
                        </div>

                        <div className={`rounded-xl px-3 py-2 ${isDiscount ? 'bg-orange-50 border border-orange-100' : 'bg-green-50 border border-green-100'}`}>
                          <p className="text-xs text-gray-400 mb-0.5 flex items-center gap-1">
                            {isDiscount ? <TrendingDown className="w-3 h-3 text-orange-500" /> : <TrendingUp className="w-3 h-3 text-green-500" />}
                            {isDiscount ? (lang === 'ar' ? 'نسبة الخصم' : 'Discount %') : (lang === 'ar' ? 'هامش الربح' : 'Margin %')}
                          </p>
                          <p className={`text-sm font-semibold ${isDiscount ? 'text-orange-600' : 'text-green-600'}`}>
                            {Math.abs(discount.discountPct).toFixed(2)}%
                          </p>
                        </div>

                        <div className={`rounded-xl px-3 py-2 ${isDiscount ? 'bg-orange-50 border border-orange-100' : 'bg-green-50 border border-green-100'}`}>
                          <p className="text-xs text-gray-400 mb-0.5">
                            {isDiscount ? (lang === 'ar' ? 'خصم / وحدة' : 'Discount / Unit') : (lang === 'ar' ? 'هامش / وحدة' : 'Margin / Unit')}
                          </p>
                          <p className={`text-sm font-semibold ${isDiscount ? 'text-orange-600' : 'text-green-600'}`}>
                            {Math.abs(discount.discountAmt).toLocaleString()}
                          </p>
                        </div>

                        {itemCost != null && (
                          <div className="bg-blue-50 border border-blue-100 rounded-xl px-3 py-2">
                            <p className="text-xs text-blue-400 mb-0.5">{lang === 'ar' ? 'تكلفة الستوك' : 'Stock Cost'}</p>
                            <p className="text-sm font-semibold text-blue-700">{itemCost.toLocaleString()}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Grand Total */}
            <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 bg-gray-50/60">
              <span className="text-sm font-semibold text-gray-700">
                {lang === 'ar' ? 'إجمالي التحويل' : 'Grand Total'}
              </span>
              <span className="text-xl font-bold text-purple-600">
                {calcGrandTotal().toLocaleString()}
              </span>
            </div>
          </div>

          {/* ── Notes ── */}
          <div className="bg-white border border-gray-200 rounded-2xl p-6">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {lang === 'ar' ? 'ملاحظات' : 'Notes'}
              <span className="text-gray-400 font-normal ml-1">({lang === 'ar' ? 'اختياري' : 'Optional'})</span>
            </label>
            <textarea
              value={formData.notes}
              rows={3}
              onChange={e => setFormData(p => ({ ...p, notes: e.target.value }))}
              placeholder={lang === 'ar' ? 'أدخل ملاحظات' : 'Enter notes'}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent transition bg-gray-50 resize-none"
              disabled={submitting || isProjectLocked}
            />
          </div>

          {/* ── Actions ── */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => navigate('/projects')}
              disabled={submitting}
              className="flex-1 px-4 py-3 border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition font-semibold text-sm"
            >
              {lang === 'ar' ? 'إلغاء' : 'Cancel'}
            </button>
            <button
              type="submit"
              disabled={submitting || isProjectLocked}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition font-semibold text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isProjectLocked ? <Lock className="w-4 h-4" /> : <Package className="w-4 h-4" />}
              {isProjectLocked
                ? (lang === 'ar' ? 'المشروع مقفول' : 'Project Locked')
                : (lang === 'ar' ? 'إنشاء التحويل' : 'Create Material Issue')}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};

export default CreateMaterialIssue;