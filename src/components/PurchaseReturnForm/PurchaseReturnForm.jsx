import { useState, useEffect, useContext } from 'react';
import { Package, Plus, Trash2, ArrowLeft, Info } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { getErrorMessage } from '../../utils/errorHandler';
import axiosInstance from '../../utils/axiosInstance';
import FullPageLoader from '../Loader/Loader';
import { LanguageContext } from '../../context/LanguageContext';

const CreatePurchaseReturn = () => {
  const { lang } = useContext(LanguageContext);
  const navigate = useNavigate();

  const [suppliers,  setSuppliers]  = useState([]);
  const [materials,  setMaterials]  = useState([]);
  const [units,      setUnits]      = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    supplierId: '',
    returnDate: new Date().toISOString().split('T')[0],
    notes: '',
    // ✅ ضفنا conversionFactor في كل item
    items: [{ materialId: '', unitId: '', quantity: '', unitPrice: '', conversionFactor: '' }]
  });

  const [errors, setErrors] = useState({});

  const t = (ar, en) => lang === 'ar' ? ar : en;

  useEffect(() => { fetchInitialData(); }, []);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const [suppliersRes, materialsRes, unitsRes] = await Promise.all([
        axiosInstance.get('/suppliers'),
        axiosInstance.get('/materials'),
        axiosInstance.get('/units')
      ]);
      setSuppliers(suppliersRes.data.result || suppliersRes.data || []);
      setMaterials(materialsRes.data.result || materialsRes.data || []);
      setUnits(unitsRes.data.result     || unitsRes.data     || []);
    } catch {
      toast.error(t('فشل تحميل البيانات', 'Failed to load data'));
    } finally {
      setLoading(false);
    }
  };

  // ── Helpers ───────────────────────────────────────────────
  const getMaterial = (id) => materials.find(m => m._id === id);

  /** الوحدات المتاحة للمادة = base + alternativeUnits */
  const getAvailableUnits = (materialId) => {
    const mat = getMaterial(materialId);
    if (!mat) return [];
    const baseId = mat.baseUnit?._id?.toString() || mat.baseUnit?.toString();
    const altIds  = (mat.alternativeUnits || []).map(u =>
      u.unitId?._id?.toString() || u.unitId?.toString()
    );
    const allIds = [baseId, ...altIds].filter(Boolean);
    return units.filter(u => allIds.includes(u._id?.toString()));
  };

  /** معامل التحويل الافتراضي لوحدة في مادة */
  const getDefaultCF = (materialId, unitId) => {
    const mat = getMaterial(materialId);
    if (!mat || !unitId) return 1;
    const baseId = mat.baseUnit?._id?.toString() || mat.baseUnit?.toString();
    if (unitId === baseId) return 1;
    const alt = (mat.alternativeUnits || []).find(u => {
      const id = u.unitId?._id?.toString() || u.unitId?.toString();
      return id === unitId;
    });
    return alt?.conversionFactor ?? 1;
  };

  /** هل الوحدة تسمح بـ override؟ */
  const isOverrideAllowed = (materialId, unitId) => {
    const mat = getMaterial(materialId);
    if (!mat || !unitId) return false;
    const baseId = mat.baseUnit?._id?.toString() || mat.baseUnit?.toString();
    if (unitId === baseId) return false;
    const alt = (mat.alternativeUnits || []).find(u => {
      const id = u.unitId?._id?.toString() || u.unitId?.toString();
      return id === unitId;
    });
    return alt?.allowOverride === true;
  };

  /** هل الوحدة المختارة بديلة (مختلفة عن الـ base)؟ */
  const isAltUnit = (materialId, unitId) => {
    if (!materialId || !unitId) return false;
    const mat = getMaterial(materialId);
    if (!mat) return false;
    const baseId = mat.baseUnit?._id?.toString() || mat.baseUnit?.toString();
    return unitId !== baseId;
  };

  /** الكمية المكافئة بالـ base unit */
  const calcQuantityInBase = (item) => {
    if (!item.quantity || !item.materialId || !item.unitId) return null;
    const qty = parseFloat(item.quantity);
    if (isNaN(qty) || !isAltUnit(item.materialId, item.unitId)) return null;
    const cf = item.conversionFactor !== ''
      ? parseFloat(item.conversionFactor)
      : getDefaultCF(item.materialId, item.unitId);
    if (!cf || isNaN(cf)) return null;
    return qty * cf;
  };

  const getBaseUnitSymbol = (materialId) => {
    const mat = getMaterial(materialId);
    if (!mat) return '';
    const baseId = mat.baseUnit?._id?.toString() || mat.baseUnit?.toString();
    const u = units.find(u => u._id?.toString() === baseId);
    return u?.symbol || '';
  };

  // ── Item handlers ─────────────────────────────────────────
  const addItem = () => setFormData(f => ({
    ...f,
    items: [...f.items, { materialId: '', unitId: '', quantity: '', unitPrice: '', conversionFactor: '' }]
  }));

  const removeItem = (index) => {
    if (formData.items.length === 1) {
      toast.error(t('يجب أن يكون هناك عنصر واحد على الأقل', 'Must have at least one item'));
      return;
    }
    setFormData(f => ({ ...f, items: f.items.filter((_, i) => i !== index) }));
  };

  const updateItem = (index, field, value) => {
    const newItems = [...formData.items];

    if (field === 'materialId') {
      const mat = getMaterial(value);
      // ✅ لو فيه defaultPurchaseUnit استخدمه، غير كده الـ base
      const defaultUnitId = mat?.defaultPurchaseUnit?._id?.toString()
        || mat?.defaultPurchaseUnit?.toString()
        || mat?.baseUnit?._id?.toString()
        || mat?.baseUnit?.toString()
        || '';
      newItems[index] = { ...newItems[index], materialId: value, unitId: defaultUnitId, conversionFactor: '' };
    } else if (field === 'unitId') {
      // ✅ لما يغير الوحدة نمسح الـ CF عشان يبدأ بالافتراضي
      newItems[index] = { ...newItems[index], unitId: value, conversionFactor: '' };
    } else {
      newItems[index] = { ...newItems[index], [field]: value };
    }

    setFormData(f => ({ ...f, items: newItems }));
  };

  const calcItemTotal   = (item) => (parseFloat(item.quantity) || 0) * (parseFloat(item.unitPrice) || 0);
  const calcTotalAmount = ()     => formData.items.reduce((s, i) => s + calcItemTotal(i), 0);

  // ── Validation ────────────────────────────────────────────
  const validateForm = () => {
    const newErrors = {};
    if (!formData.supplierId) newErrors.supplierId = t('يرجى اختيار المورد',    'Please select a supplier');
    if (!formData.returnDate)  newErrors.returnDate  = t('التاريخ مطلوب',         'Return date is required');
    formData.items.forEach((item, i) => {
      if (!item.materialId)                                    newErrors[`item_${i}_material`]  = t('المادة مطلوبة',     'Material is required');
      if (!item.unitId)                                        newErrors[`item_${i}_unit`]      = t('الوحدة مطلوبة',     'Unit is required');
      if (!item.quantity  || parseFloat(item.quantity)  <= 0) newErrors[`item_${i}_quantity`]  = t('كمية صحيحة مطلوبة', 'Valid quantity required');
      if (!item.unitPrice || parseFloat(item.unitPrice) <= 0) newErrors[`item_${i}_price`]     = t('سعر صحيح مطلوب',    'Valid price required');
      // ✅ لو override مسموح والمستخدم دخل قيمة، تأكد إنها > 0
      if (isOverrideAllowed(item.materialId, item.unitId) && item.conversionFactor !== '' && parseFloat(item.conversionFactor) <= 0) {
        newErrors[`item_${i}_cf`] = t('معامل التحويل يجب أن يكون أكبر من صفر', 'Conversion factor must be > 0');
      }
    });
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // ── Submit ────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!validateForm()) {
      toast.error(t('يرجى إصلاح الأخطاء قبل الإرسال', 'Please fix the errors before submitting'));
      return;
    }
    try {
      setSubmitting(true);
      const payload = {
        supplierId: formData.supplierId,
        returnDate: formData.returnDate,
        items: formData.items.map(item => {
          const base = {
            materialId: item.materialId,
            unitId:     item.unitId,
            quantity:   parseFloat(item.quantity),
            unitPrice:  parseFloat(item.unitPrice),
          };
          // ✅ بنبعت conversionFactor بس لو allowOverride وفيه قيمة
          if (isOverrideAllowed(item.materialId, item.unitId) && item.conversionFactor !== '') {
            base.conversionFactor = parseFloat(item.conversionFactor);
          }
          return base;
        }),
        ...(formData.notes && { notes: formData.notes })
      };
      const response = await axiosInstance.post('/purchases/return', payload);
      toast.success(t(
        `تم إنشاء مرتجع الشراء بنجاح! رقم المرتجع #${response.data.result.returnNo}`,
        `Purchase return created successfully! Return #${response.data.result.returnNo}`
      ));
      setTimeout(() => navigate('/purchases/returns'), 2000);
    } catch (error) {
      toast.error(getErrorMessage(error, t('فشل إنشاء مرتجع الشراء', 'Failed to create purchase return')));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading)    return <FullPageLoader text={t('جاري التحميل...', 'Loading...')} />;
  if (submitting) return <FullPageLoader text={t('جاري المعالجة...', 'Processing...')} />;

  const inputCls = (hasError) =>
    `w-full px-4 py-2.5 border rounded-xl text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent transition bg-gray-50 ${
      hasError ? 'border-red-400' : 'border-gray-200'
    }`;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-5xl mx-auto">

        {/* ── Page Header ── */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {t('إنشاء مرتجع مشتريات', 'Create Purchase Return')}
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              {t('إرجاع أصناف إلى المورد', 'Return items to supplier')}
            </p>
          </div>
          <button
            onClick={() => navigate('/purchases/returns')}
            className="flex items-center gap-2 px-5 py-2.5 border border-gray-200 text-gray-700 bg-white rounded-xl hover:bg-gray-50 transition font-semibold text-sm shadow-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            {t('رجوع', 'Back')}
          </button>
        </div>

        <div className="space-y-5">

          {/* ── Supplier & Date ── */}
          <div className="bg-white border border-gray-200 rounded-2xl p-6">
            <h2 className="text-sm font-semibold text-gray-700 mb-4">
              {t('بيانات المرتجع', 'Return Information')}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('المورد', 'Supplier')} <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.supplierId}
                  onChange={e => setFormData(f => ({ ...f, supplierId: e.target.value }))}
                  className={inputCls(errors.supplierId)}
                >
                  <option value="">{t('اختر المورد...', 'Select Supplier...')}</option>
                  {suppliers.map(s => (
                    <option key={s._id} value={s._id}>
                      {lang === 'ar' ? s.nameAr : s.nameEn} {s.code ? `- ${s.code}` : ''}
                    </option>
                  ))}
                </select>
                {errors.supplierId && <p className="mt-1 text-xs text-red-500">{errors.supplierId}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('تاريخ المرتجع', 'Return Date')} <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={formData.returnDate}
                  onChange={e => setFormData(f => ({ ...f, returnDate: e.target.value }))}
                  className={inputCls(errors.returnDate)}
                />
                {errors.returnDate && <p className="mt-1 text-xs text-red-500">{errors.returnDate}</p>}
              </div>
            </div>
          </div>

          {/* ── Items ── */}
          <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-sm font-semibold text-gray-700">{t('الأصناف', 'Items')}</h2>
              <button
                onClick={addItem}
                className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-xl hover:bg-orange-700 transition font-semibold text-sm"
              >
                <Plus className="w-4 h-4" />
                {t('إضافة صنف', 'Add Item')}
              </button>
            </div>

            {/* Items rows */}
            <div className="divide-y divide-gray-50 p-4 space-y-3">
              {formData.items.map((item, index) => {
                const availableUnits  = getAvailableUnits(item.materialId);
                const canOverride     = isOverrideAllowed(item.materialId, item.unitId);
                const defaultCF       = getDefaultCF(item.materialId, item.unitId);
                const showCFRow       = isAltUnit(item.materialId, item.unitId);
                const qtyInBase       = calcQuantityInBase(item);
                const baseSymbol      = getBaseUnitSymbol(item.materialId);

                return (
                  <div key={index} className="bg-gray-50/60 border border-gray-100 rounded-2xl p-4 space-y-3">

                    {/* Main row */}
                    <div className="grid grid-cols-12 gap-3 items-start">

                      {/* Material */}
                      <div className="col-span-4">
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          {t('المادة', 'Material')} <span className="text-red-400">*</span>
                        </label>
                        <select
                          value={item.materialId}
                          onChange={e => updateItem(index, 'materialId', e.target.value)}
                          className={`w-full px-3 py-2 border rounded-xl text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent transition bg-white ${errors[`item_${index}_material`] ? 'border-red-400' : 'border-gray-200'}`}
                        >
                          <option value="">{t('اختر المادة...', 'Select Material...')}</option>
                          {materials.map(m => (
                            <option key={m._id} value={m._id}>
                              {lang === 'ar' ? (m.nameAr || m.nameEn) : (m.nameEn || m.name)}
                            </option>
                          ))}
                        </select>
                        {errors[`item_${index}_material`] && (
                          <p className="mt-0.5 text-xs text-red-500">{errors[`item_${index}_material`]}</p>
                        )}
                      </div>

                      {/* Unit — ✅ مفلترة على المادة المختارة */}
                      <div className="col-span-2">
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          {t('الوحدة', 'Unit')} <span className="text-red-400">*</span>
                        </label>
                        <select
                          value={item.unitId}
                          onChange={e => updateItem(index, 'unitId', e.target.value)}
                          disabled={!item.materialId}
                          className={`w-full px-3 py-2 border rounded-xl text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent transition bg-white disabled:opacity-50 disabled:cursor-not-allowed ${errors[`item_${index}_unit`] ? 'border-red-400' : 'border-gray-200'}`}
                        >
                          <option value="">{t('وحدة...', 'Unit...')}</option>
                          {availableUnits.map(u => {
                            const mat    = getMaterial(item.materialId);
                            const baseId = mat?.baseUnit?._id?.toString() || mat?.baseUnit?.toString();
                            return (
                              <option key={u._id} value={u._id}>
                                {lang === 'ar' ? u.nameAr : u.nameEn}
                                {u._id?.toString() === baseId ? t(' (أساسية)', ' (base)') : ''}
                              </option>
                            );
                          })}
                        </select>
                        {errors[`item_${index}_unit`] && (
                          <p className="mt-0.5 text-xs text-red-500">{errors[`item_${index}_unit`]}</p>
                        )}
                      </div>

                      {/* Quantity */}
                      <div className="col-span-2">
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          {t('الكمية', 'Quantity')} <span className="text-red-400">*</span>
                        </label>
                        <input
                          type="number" step="0.01" min="0"
                          value={item.quantity}
                          onChange={e => updateItem(index, 'quantity', e.target.value)}
                          placeholder="0"
                          className={`w-full px-3 py-2 border rounded-xl text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent transition bg-white ${errors[`item_${index}_quantity`] ? 'border-red-400' : 'border-gray-200'}`}
                        />
                        {errors[`item_${index}_quantity`] && (
                          <p className="mt-0.5 text-xs text-red-500">{errors[`item_${index}_quantity`]}</p>
                        )}
                      </div>

                      {/* Unit Price */}
                      <div className="col-span-2">
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          {t('سعر الوحدة', 'Unit Price')} <span className="text-red-400">*</span>
                        </label>
                        <input
                          type="number" step="0.01" min="0"
                          value={item.unitPrice}
                          onChange={e => updateItem(index, 'unitPrice', e.target.value)}
                          placeholder="0.00"
                          className={`w-full px-3 py-2 border rounded-xl text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent transition bg-white ${errors[`item_${index}_price`] ? 'border-red-400' : 'border-gray-200'}`}
                        />
                        {errors[`item_${index}_price`] && (
                          <p className="mt-0.5 text-xs text-red-500">{errors[`item_${index}_price`]}</p>
                        )}
                      </div>

                      {/* Total + Delete */}
                      <div className="col-span-2 flex flex-col gap-1">
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          {t('الإجمالي', 'Total')}
                        </label>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 px-3 py-2 bg-orange-50 border border-orange-100 rounded-xl text-sm font-semibold text-orange-800 text-center">
                            {calcItemTotal(item).toFixed(2)}
                          </div>
                          <button
                            onClick={() => removeItem(index)}
                            disabled={formData.items.length === 1}
                            className="p-1.5 rounded-md text-gray-400 hover:text-red-500 hover:bg-red-50 transition disabled:opacity-30 disabled:cursor-not-allowed flex-shrink-0"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* ✅ Conversion Factor row — يظهر بس لو وحدة بديلة */}
                    {showCFRow && (
                      <div className="pt-2 border-t border-gray-100 flex items-start gap-3 flex-wrap">
                        <div className="flex items-center gap-2">
                          <label className="text-xs font-medium text-gray-600 whitespace-nowrap">
                            {t('معامل التحويل:', 'Conv. Factor:')}
                            {canOverride && (
                              <span className="ml-1 text-amber-500">
                                ({t('قابل للتعديل', 'editable')})
                              </span>
                            )}
                          </label>
                          <input
                            type="number"
                            step="0.000001"
                            min="0.000001"
                            value={item.conversionFactor !== '' ? item.conversionFactor : defaultCF}
                            onChange={e => { if (canOverride) updateItem(index, 'conversionFactor', e.target.value); }}
                            readOnly={!canOverride}
                            className={`w-32 px-3 py-1.5 border rounded-xl text-sm focus:ring-2 focus:ring-orange-500 ${
                              canOverride
                                ? 'border-amber-300 bg-amber-50 cursor-text'
                                : 'border-gray-200 bg-gray-100 cursor-not-allowed text-gray-500'
                            }`}
                          />
                          <span className="text-xs text-gray-400">
                            {t('= 1 وحدة مختارة → وحدة أساسية', '= 1 selected unit → base unit')}
                          </span>
                        </div>

                        {/* ✅ كمية بالـ base unit */}
                        {qtyInBase != null && (
                          <div className="bg-blue-50 border border-blue-100 rounded-xl px-3 py-1.5 flex items-center gap-2">
                            <p className="text-xs text-blue-400">{t('سيُضاف للمخزون:', 'Stock credit:')}</p>
                            <p className="text-sm font-bold text-blue-700">
                              {qtyInBase.toLocaleString(undefined, { maximumFractionDigits: 4 })}
                              <span className="text-xs font-normal ml-1 text-blue-500">{baseSymbol}</span>
                            </p>
                          </div>
                        )}

                        {/* ✅ تنبيه لو ثابت */}
                        {!canOverride && (
                          <p className="flex items-center gap-1 text-xs text-gray-400">
                            <Info className="w-3 h-3" />
                            {t('معامل التحويل ثابت لهذه الوحدة', 'Fixed conversion factor for this unit')}
                          </p>
                        )}

                        {errors[`item_${index}_cf`] && (
                          <p className="text-xs text-red-500 w-full">{errors[`item_${index}_cf`]}</p>
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
                {t('المبلغ الإجمالي', 'Total Amount')}
              </span>
              <span className="text-xl font-bold text-orange-600">
                {calcTotalAmount().toFixed(2)} {t('ج.م', 'EGP')}
              </span>
            </div>
          </div>

          {/* ── Notes ── */}
          <div className="bg-white border border-gray-200 rounded-2xl p-6">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('ملاحظات', 'Notes')}
              <span className="text-gray-400 font-normal ml-1">({t('اختياري', 'Optional')})</span>
            </label>
            <textarea
              value={formData.notes}
              onChange={e => setFormData(f => ({ ...f, notes: e.target.value }))}
              rows="3"
              placeholder={t('أضف أي ملاحظات إضافية...', 'Add any additional notes...')}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent transition bg-gray-50 resize-none"
            />
          </div>

          {/* ── Actions ── */}
          <div className="flex gap-3">
            <button
              onClick={() => navigate('/purchases/returns')}
              className="flex-1 px-4 py-3 border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition font-semibold text-sm"
            >
              {t('إلغاء', 'Cancel')}
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-orange-600 text-white rounded-xl hover:bg-orange-700 transition font-semibold text-sm disabled:opacity-50"
            >
              <Package className="w-4 h-4" />
              {t('إرسال المرتجع', 'Submit Purchase Return')}
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};

export default CreatePurchaseReturn;