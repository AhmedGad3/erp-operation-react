import { useState, useEffect, useContext } from 'react';
import { Package, Calendar, Plus, Trash2, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { getErrorMessage } from '../../utils/errorHandler';
import axiosInstance from '../../utils/axiosInstance';
import FullPageLoader from '../Loader/Loader';
import { LanguageContext } from '../../context/LanguageContext';

const CreatePurchaseReturn = () => {
  const { lang } = useContext(LanguageContext);
  const navigate = useNavigate();

  const [suppliers, setSuppliers] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [units, setUnits]         = useState([]);
  const [loading, setLoading]     = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    supplierId: '',
    returnDate: new Date().toISOString().split('T')[0],
    notes: '',
    items: [{ materialId: '', unitId: '', quantity: '', unitPrice: '' }]
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

  const addItem = () => setFormData(f => ({
    ...f, items: [...f.items, { materialId: '', unitId: '', quantity: '', unitPrice: '' }]
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
    newItems[index][field] = value;
    setFormData(f => ({ ...f, items: newItems }));
  };

  const calcItemTotal    = (item) => (parseFloat(item.quantity) || 0) * (parseFloat(item.unitPrice) || 0);
  const calcTotalAmount  = ()     => formData.items.reduce((s, i) => s + calcItemTotal(i), 0);

  const validateForm = () => {
    const newErrors = {};
    if (!formData.supplierId) newErrors.supplierId = t('يرجى اختيار المورد', 'Please select a supplier');
    if (!formData.returnDate)  newErrors.returnDate  = t('التاريخ مطلوب', 'Return date is required');
    formData.items.forEach((item, i) => {
      if (!item.materialId)                           newErrors[`item_${i}_material`]  = t('المادة مطلوبة',    'Material is required');
      if (!item.unitId)                               newErrors[`item_${i}_unit`]      = t('الوحدة مطلوبة',    'Unit is required');
      if (!item.quantity  || parseFloat(item.quantity)  <= 0) newErrors[`item_${i}_quantity`] = t('كمية صحيحة مطلوبة', 'Valid quantity required');
      if (!item.unitPrice || parseFloat(item.unitPrice) <= 0) newErrors[`item_${i}_price`]    = t('سعر صحيح مطلوب',   'Valid price required');
    });
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

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
        items: formData.items.map(item => ({
          materialId: item.materialId,
          unitId:     item.unitId,
          quantity:   parseFloat(item.quantity),
          unitPrice:  parseFloat(item.unitPrice)
        })),
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

              {/* Supplier */}
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

              {/* Return Date */}
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
            {/* Items header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-sm font-semibold text-gray-700">
                {t('الأصناف', 'Items')}
              </h2>
              <button
                onClick={addItem}
                className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-xl hover:bg-orange-700 transition font-semibold text-sm"
              >
                <Plus className="w-4 h-4" />
                {t('إضافة صنف', 'Add Item')}
              </button>
            </div>

            {/* Items table header */}
            <div className="grid grid-cols-12 gap-3 px-6 py-3 bg-gray-50 border-b border-gray-100 text-xs font-medium text-gray-500">
              <div className="col-span-4">{t('المادة', 'Material')} <span className="text-red-400">*</span></div>
              <div className="col-span-2">{t('الوحدة', 'Unit')} <span className="text-red-400">*</span></div>
              <div className="col-span-2">{t('الكمية', 'Quantity')} <span className="text-red-400">*</span></div>
              <div className="col-span-2">{t('سعر الوحدة', 'Unit Price')} <span className="text-red-400">*</span></div>
              <div className="col-span-1 text-center">{t('الإجمالي', 'Total')}</div>
              <div className="col-span-1" />
            </div>

            {/* Items rows */}
            <div className="divide-y divide-gray-50">
              {formData.items.map((item, index) => (
                <div key={index} className="grid grid-cols-12 gap-3 px-6 py-4 items-start hover:bg-gray-50/40 transition">

                  {/* Material */}
                  <div className="col-span-4">
                    <select
                      value={item.materialId}
                      onChange={e => updateItem(index, 'materialId', e.target.value)}
                      className={inputCls(errors[`item_${index}_material`])}
                    >
                      <option value="">{t('اختر المادة...', 'Select Material...')}</option>
                      {materials.map(m => (
                        <option key={m._id} value={m._id}>
                          {lang === 'ar' ? (m.nameAr || m.nameEn) : (m.nameEn || m.name)}
                        </option>
                      ))}
                    </select>
                    {errors[`item_${index}_material`] && (
                      <p className="mt-1 text-xs text-red-500">{errors[`item_${index}_material`]}</p>
                    )}
                  </div>

                  {/* Unit */}
                  <div className="col-span-2">
                    <select
                      value={item.unitId}
                      onChange={e => updateItem(index, 'unitId', e.target.value)}
                      className={inputCls(errors[`item_${index}_unit`])}
                    >
                      <option value="">{t('وحدة...', 'Unit...')}</option>
                      {units.map(u => (
                        <option key={u._id} value={u._id}>
                          {lang === 'ar' ? (u.nameAr || u.nameEn) : (u.nameEn || u.name)}
                        </option>
                      ))}
                    </select>
                    {errors[`item_${index}_unit`] && (
                      <p className="mt-1 text-xs text-red-500">{errors[`item_${index}_unit`]}</p>
                    )}
                  </div>

                  {/* Quantity */}
                  <div className="col-span-2">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={item.quantity}
                      onChange={e => updateItem(index, 'quantity', e.target.value)}
                      placeholder="0"
                      className={inputCls(errors[`item_${index}_quantity`])}
                    />
                    {errors[`item_${index}_quantity`] && (
                      <p className="mt-1 text-xs text-red-500">{errors[`item_${index}_quantity`]}</p>
                    )}
                  </div>

                  {/* Unit Price */}
                  <div className="col-span-2">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={item.unitPrice}
                      onChange={e => updateItem(index, 'unitPrice', e.target.value)}
                      placeholder="0.00"
                      className={inputCls(errors[`item_${index}_price`])}
                    />
                    {errors[`item_${index}_price`] && (
                      <p className="mt-1 text-xs text-red-500">{errors[`item_${index}_price`]}</p>
                    )}
                  </div>

                  {/* Row Total */}
                  <div className="col-span-1 flex items-center justify-center pt-1.5">
                    <span className="text-sm font-semibold text-gray-900">
                      {calcItemTotal(item).toFixed(2)}
                    </span>
                  </div>

                  {/* Remove */}
                  <div className="col-span-1 flex items-center justify-center pt-1">
                    <button
                      onClick={() => removeItem(index)}
                      disabled={formData.items.length === 1}
                      className="p-1.5 rounded-md text-gray-400 hover:text-red-500 hover:bg-red-50 transition disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                </div>
              ))}
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

          {/* ── Submit ── */}
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