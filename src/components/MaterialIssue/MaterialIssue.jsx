import React, { useState, useEffect, useContext } from 'react';
import { Package, Plus, Trash2, ArrowLeft, DollarSign, Tag, TrendingDown, TrendingUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import axiosInstance from '../../utils/axiosInstance';
import FullPageLoader from '../Loader/Loader';
import { LanguageContext } from '../../context/LanguageContext';
import { toast } from 'react-toastify';

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

  // ── Helpers ──────────────────────────────────────────────
  const getMaterial        = (id)  => materials.find(m => m._id === id);
  const getLastPurchasePrice = (id) => getMaterial(id)?.lastPurchasePrice ?? null;

  const calcDiscount = (materialId, unitPrice) => {
    const lpp = getLastPurchasePrice(materialId);
    if (lpp == null || unitPrice === '' || unitPrice == null) return null;
    const price       = parseFloat(unitPrice);
    if (isNaN(price)) return null;
    const discountAmt = lpp - price;                              // موجب = خصم ، سالب = هامش
    const discountPct = lpp > 0 ? (discountAmt / lpp) * 100 : 0;
    return { lpp, discountAmt, discountPct };
  };

  const calcItemTotal = (item) =>
    item.quantity && item.unitPrice
      ? parseFloat(item.quantity) * parseFloat(item.unitPrice)
      : 0;

  const calcItemCost = (item) => {
    const lpp = getLastPurchasePrice(item.materialId);
    return lpp != null && item.quantity ? parseFloat(item.quantity) * lpp : null;
  };

  const calcGrandTotal = () => formData.items.reduce((s, i) => s + calcItemTotal(i), 0);

  // ── Validation ───────────────────────────────────────────
  const validateForm = () => {
    const errs = {};
    if (!formData.projectId) errs.projectId = lang === 'ar' ? 'اختر مشروع' : 'Select a project';
    if (!formData.issueDate) errs.issueDate  = lang === 'ar' ? 'حدد التاريخ' : 'Select a date';

    formData.items.forEach((item, idx) => {
      if (!item.materialId)
        errs[`item_${idx}_material`] = lang === 'ar' ? 'اختر مادة' : 'Select material';
      if (!item.unitId)
        errs[`item_${idx}_unit`] = lang === 'ar' ? 'اختر الوحدة' : 'Select unit';
      if (!item.quantity || parseFloat(item.quantity) <= 0)
        errs[`item_${idx}_quantity`] = lang === 'ar' ? 'أدخل كمية صحيحة' : 'Valid quantity required';
      if (!item.unitPrice || parseFloat(item.unitPrice) <= 0)
        errs[`item_${idx}_price`] = lang === 'ar' ? 'أدخل سعر صحيح' : 'Valid price required';
    });

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // ── Submit ───────────────────────────────────────────────
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
      const msg = err.response?.data?.message || (lang === 'ar' ? 'فشل إنشاء التحويل' : 'Failed');
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  // ── Item handlers ────────────────────────────────────────
  const handleAddItem    = () =>
    setFormData(p => ({ ...p, items: [...p.items, { materialId: '', unitId: '', quantity: '', unitPrice: '' }] }));

  const handleRemoveItem = (idx) =>
    setFormData(p => ({ ...p, items: p.items.filter((_, i) => i !== idx) }));

  const handleItemChange = (idx, field, value) => {
    const items   = [...formData.items];
    items[idx]    = { ...items[idx], [field]: value };
    if (field === 'materialId') items[idx].unitPrice = ''; // امسح السعر لو غيّر المادة
    setFormData(p => ({ ...p, items }));
  };

  // ── Render ───────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-8 px-4">
      {submitting && <FullPageLoader text={lang === 'ar' ? 'جاري المعالجة...' : 'Processing...'} />}

      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">

          {/* Header */}
          <div className="bg-gradient-to-r from-purple-600 to-purple-700 px-8 py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Package className="w-8 h-8 text-white" />
                <div>
                  <h1 className="text-2xl font-bold text-white">
                    {lang === 'ar' ? 'تحويل مواد' : 'Material Issue'}
                  </h1>
                  <p className="text-purple-100 mt-1">
                    {lang === 'ar' ? 'تحويل المواد من الستوك إلى المشروع' : 'Transfer materials to project'}
                  </p>
                </div>
              </div>
              <button onClick={() => navigate('/projects')}
                className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg transition">
                <ArrowLeft className="w-4 h-4" />
                {lang === 'ar' ? 'رجوع' : 'Back'}
              </button>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="p-8 space-y-6">

            {/* Project + Date */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  {lang === 'ar' ? 'المشروع' : 'Project'} <span className="text-red-500">*</span>
                </label>
                <select value={formData.projectId}
                  onChange={e => setFormData(p => ({ ...p, projectId: e.target.value }))}
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition ${errors.projectId ? 'border-red-500' : 'border-gray-300'}`}
                  disabled={submitting}>
                  <option value="">{lang === 'ar' ? 'اختر مشروع' : 'Select project'}</option>
                  {projects.map(p => (
                    <option key={p._id} value={p._id}>
                      {lang === 'ar' ? p.nameAr : p.nameEn} ({p.code})
                    </option>
                  ))}
                </select>
                {errors.projectId && <p className="mt-1 text-sm text-red-500">{errors.projectId}</p>}
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  {lang === 'ar' ? 'تاريخ التحويل' : 'Issue Date'} <span className="text-red-500">*</span>
                </label>
                <input type="date" value={formData.issueDate}
                  onChange={e => setFormData(p => ({ ...p, issueDate: e.target.value }))}
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition ${errors.issueDate ? 'border-red-500' : 'border-gray-300'}`}
                  disabled={submitting} />
                {errors.issueDate && <p className="mt-1 text-sm text-red-500">{errors.issueDate}</p>}
              </div>
            </div>

            {/* Materials */}
            <div className="bg-gray-50 p-6 rounded-lg">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <Package className="w-5 h-5 text-purple-600" />
                  {lang === 'ar' ? 'المواد المنقولة' : 'Materials to Transfer'}
                </h3>
                <button type="button" onClick={handleAddItem} disabled={submitting}
                  className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition font-semibold">
                  <Plus className="w-4 h-4" />
                  {lang === 'ar' ? 'إضافة مادة' : 'Add Material'}
                </button>
              </div>

              <div className="space-y-4">
                {formData.items.map((item, idx) => {
                  const lpp      = getLastPurchasePrice(item.materialId);
                  const discount = calcDiscount(item.materialId, item.unitPrice);
                  const itemCost = calcItemCost(item);

                  // خصم حقيقي = السعر أقل من سعر الشراء
                  const isDiscount = discount && discount.discountAmt > 0;
                  // هامش ربح = السعر أعلى من سعر الشراء
                  const isMargin   = discount && discount.discountAmt < 0;

                  return (
                    <div key={idx} className="bg-white p-4 rounded-lg border border-gray-200 space-y-3">

                      {/* Row 1: inputs */}
                      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">

                        {/* Material */}
                        <div>
                          <label className="block text-xs font-semibold text-gray-700 mb-1">
                            {lang === 'ar' ? 'المادة' : 'Material'} <span className="text-red-500">*</span>
                          </label>
                          <select value={item.materialId}
                            onChange={e => handleItemChange(idx, 'materialId', e.target.value)}
                            className={`w-full px-3 py-2 border rounded focus:ring-2 focus:ring-purple-500 text-sm ${errors[`item_${idx}_material`] ? 'border-red-500' : 'border-gray-300'}`}
                            disabled={submitting}>
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
                          <label className="block text-xs font-semibold text-gray-700 mb-1">
                            {lang === 'ar' ? 'الوحدة' : 'Unit'} <span className="text-red-500">*</span>
                          </label>
                          <select value={item.unitId}
                            onChange={e => handleItemChange(idx, 'unitId', e.target.value)}
                            className={`w-full px-3 py-2 border rounded focus:ring-2 focus:ring-purple-500 text-sm ${errors[`item_${idx}_unit`] ? 'border-red-500' : 'border-gray-300'}`}
                            disabled={submitting}>
                            <option value="">{lang === 'ar' ? 'اختر' : 'Select'}</option>
                            {units.map(u => (
                              <option key={u._id} value={u._id}>
                                {lang === 'ar' ? u.nameAr : u.nameEn}
                              </option>
                            ))}
                          </select>
                          {errors[`item_${idx}_unit`] && (
                            <p className="mt-0.5 text-xs text-red-500">{errors[`item_${idx}_unit`]}</p>
                          )}
                        </div>

                        {/* Quantity */}
                        <div>
                          <label className="block text-xs font-semibold text-gray-700 mb-1">
                            {lang === 'ar' ? 'الكمية' : 'Quantity'} <span className="text-red-500">*</span>
                          </label>
                          <input type="number" step="0.0001" value={item.quantity} placeholder="0.00"
                            onChange={e => handleItemChange(idx, 'quantity', e.target.value)}
                            className={`w-full px-3 py-2 border rounded focus:ring-2 focus:ring-purple-500 text-sm ${errors[`item_${idx}_quantity`] ? 'border-red-500' : 'border-gray-300'}`}
                            disabled={submitting} />
                          {errors[`item_${idx}_quantity`] && (
                            <p className="mt-0.5 text-xs text-red-500">{errors[`item_${idx}_quantity`]}</p>
                          )}
                        </div>

                        {/* Unit Price */}
                        <div>
                          <label className="block text-xs font-semibold text-gray-700 mb-1">
                            {lang === 'ar' ? 'سعر الصرف' : 'Issue Price'} <span className="text-red-500">*</span>
                          </label>
                          <input type="number" step="0.01" value={item.unitPrice} placeholder="0.00"
                            onChange={e => handleItemChange(idx, 'unitPrice', e.target.value)}
                            className={`w-full px-3 py-2 border rounded focus:ring-2 focus:ring-purple-500 text-sm ${errors[`item_${idx}_price`] ? 'border-red-500' : 'border-gray-300'}`}
                            disabled={submitting} />
                          {/* Last purchase price hint */}
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
                        <div className="flex flex-col justify-between">
                          <div>
                            <label className="block text-xs font-semibold text-gray-700 mb-1">
                              {lang === 'ar' ? 'الإجمالي' : 'Total'}
                            </label>
                            <div className="px-3 py-2 bg-purple-50 rounded border border-purple-200 text-sm font-semibold text-purple-900">
                              {calcItemTotal(item).toLocaleString()}
                            </div>
                          </div>
                          {formData.items.length > 1 && (
                            <button type="button" onClick={() => handleRemoveItem(idx)} disabled={submitting}
                              className="flex items-center justify-center gap-1 px-2 py-1 bg-red-50 text-red-600 rounded hover:bg-red-100 transition text-xs font-medium mt-2">
                              <Trash2 className="w-3 h-3" />
                              {lang === 'ar' ? 'حذف' : 'Delete'}
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Row 2: discount info */}
                      {discount && (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2 border-t border-gray-100">

                          {/* آخر سعر شراء */}
                          <div className="bg-gray-50 rounded-lg px-3 py-2">
                            <p className="text-xs text-gray-500 mb-0.5">
                              {lang === 'ar' ? 'آخر سعر شراء' : 'Last Purchase'}
                            </p>
                            <p className="text-sm font-semibold text-gray-700">
                              {discount.lpp.toLocaleString()}
                            </p>
                          </div>

                          {/* نسبة الخصم / الهامش */}
                          <div className={`rounded-lg px-3 py-2 ${isDiscount ? 'bg-orange-50' : isMargin ? 'bg-green-50' : 'bg-gray-50'}`}>
                            <p className="text-xs text-gray-500 mb-0.5 flex items-center gap-1">
                              {isDiscount
                                ? <TrendingDown className="w-3 h-3 text-orange-500" />
                                : <TrendingUp   className="w-3 h-3 text-green-500" />}
                              {isDiscount
                                ? (lang === 'ar' ? 'نسبة الخصم' : 'Discount %')
                                : (lang === 'ar' ? 'هامش الربح' : 'Margin %')}
                            </p>
                            <p className={`text-sm font-semibold ${isDiscount ? 'text-orange-600' : isMargin ? 'text-green-600' : 'text-gray-500'}`}>
                              {Math.abs(discount.discountPct).toFixed(2)}%
                            </p>
                          </div>

                          {/* مبلغ الخصم / الهامش */}
                          <div className={`rounded-lg px-3 py-2 ${isDiscount ? 'bg-orange-50' : isMargin ? 'bg-green-50' : 'bg-gray-50'}`}>
                            <p className="text-xs text-gray-500 mb-0.5">
                              {isDiscount
                                ? (lang === 'ar' ? 'خصم / وحدة' : 'Discount / Unit')
                                : (lang === 'ar' ? 'هامش / وحدة' : 'Margin / Unit')}
                            </p>
                            <p className={`text-sm font-semibold ${isDiscount ? 'text-orange-600' : isMargin ? 'text-green-600' : 'text-gray-500'}`}>
                              {Math.abs(discount.discountAmt).toLocaleString()}
                            </p>
                          </div>

                          {/* تكلفة الستوك */}
                          {itemCost != null && (
                            <div className="bg-blue-50 rounded-lg px-3 py-2">
                              <p className="text-xs text-blue-500 mb-0.5">
                                {lang === 'ar' ? 'تكلفة الستوك' : 'Stock Cost'}
                              </p>
                              <p className="text-sm font-semibold text-blue-700">
                                {itemCost.toLocaleString()}
                              </p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Grand Total */}
              <div className="mt-6 p-4 bg-purple-50 rounded-lg border border-purple-200">
                <div className="flex justify-between items-center">
                  <h4 className="font-bold text-gray-900 text-lg flex items-center gap-2">
                    <DollarSign className="w-5 h-5 text-purple-600" />
                    {lang === 'ar' ? 'إجمالي التحويل' : 'Grand Total'}
                  </h4>
                  <p className="text-2xl font-bold text-purple-600">
                    {calcGrandTotal().toLocaleString()}
                  </p>
                </div>
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                {lang === 'ar' ? 'ملاحظات' : 'Notes'}
              </label>
              <textarea value={formData.notes} rows={4}
                onChange={e => setFormData(p => ({ ...p, notes: e.target.value }))}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition"
                placeholder={lang === 'ar' ? 'أدخل ملاحظات' : 'Enter notes'}
                disabled={submitting} />
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-4">
              <button type="button" onClick={() => navigate('/projects')} disabled={submitting}
                className="flex-1 px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition font-semibold">
                {lang === 'ar' ? 'إلغاء' : 'Cancel'}
              </button>
              <button type="submit" disabled={submitting}
                className="flex-1 bg-gradient-to-r from-purple-600 to-purple-700 text-white font-semibold py-3 rounded-lg hover:from-purple-700 hover:to-purple-800 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                <Package className="w-5 h-5" />
                {lang === 'ar' ? 'إنشاء التحويل' : 'Create Material Issue'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CreateMaterialIssue;