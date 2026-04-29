import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Wrench, FileText } from 'lucide-react';
import { toast } from 'react-toastify';
import axiosInstance from '../../utils/axiosInstance';
import { LanguageContext } from '../../context/LanguageContext';
import { createAutoCode } from '../../utils/autoCode';
import QuickSupplierModal from '../quick-create/QuickSupplierModal';

const ASSET_STATUS = [
  { value: 'AVAILABLE', labelAr: 'متاح', labelEn: 'Available' },
  { value: 'IN_USE', labelAr: 'قيد الاستخدام', labelEn: 'In Use' },
  { value: 'MAINTENANCE', labelAr: 'في الصيانة', labelEn: 'Maintenance' },
  { value: 'RETIRED', labelAr: 'متقاعد', labelEn: 'Retired' },
];

const PAYMENT_METHODS = [
  { value: 'CASH', labelAr: 'نقدي', labelEn: 'Cash' },
  { value: 'TRANSFER', labelAr: 'تحويل بنكي', labelEn: 'Bank Transfer' },
  { value: 'CHEQUE', labelAr: 'شيك', labelEn: 'Cheque' },
];

const inputCls = 'w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-gray-50 transition';

const Field = ({ label, required, children }) => (
  <div>
    <label className="block text-sm font-medium text-gray-700 mb-1.5">
      {label}
      {required && <span className="text-red-500 ml-0.5">*</span>}
    </label>
    {children}
  </div>
);

export default function AssetInvoiceForm() {
  const { lang } = useContext(LanguageContext);
  const navigate = useNavigate();
  const isAr = lang === 'ar';
  const t = (ar, en) => (isAr ? ar : en);

  const [saving, setSaving] = useState(false);
  const [showAssetDetails, setShowAssetDetails] = useState(false);
  const [showInvoiceDetails, setShowInvoiceDetails] = useState(false);
  const [codeTouched, setCodeTouched] = useState(false);
  const [showQuickSupplierModal, setShowQuickSupplierModal] = useState(false);

  const [assetForm, setAssetForm] = useState({
    nameAr: '',
    nameEn: '',
    code: '',
    assetTypeAr: '',
    assetTypeEn: '',
    status: 'AVAILABLE',
    notes: '',
  });

  const [invoiceForm, setInvoiceForm] = useState({
    vendorName: '',
    amount: '',
    invoiceDate: new Date().toISOString().split('T')[0],
    paymentMethod: 'CASH',
    referenceNo: '',
    notes: '',
  });

  React.useEffect(() => {
    if (codeTouched) return;
    setAssetForm((prev) => ({
      ...prev,
      code: createAutoCode(prev.nameEn || prev.nameAr, 'AST'),
    }));
  }, [assetForm.nameAr, assetForm.nameEn, codeTouched]);

  const setA = (key, val) => setAssetForm((prev) => ({ ...prev, [key]: val }));
  const setI = (key, val) => setInvoiceForm((prev) => ({ ...prev, [key]: val }));
  const setAssetCode = (value) => {
    setCodeTouched(true);
    setA('code', value.toUpperCase());
  };
  const handleQuickSupplierCreated = (createdSupplier) => {
    const supplierName = isAr ? createdSupplier?.nameAr || createdSupplier?.nameEn : createdSupplier?.nameEn || createdSupplier?.nameAr;
    if (!supplierName) return;
    setI('vendorName', supplierName);
  };

  const validate = () => {
    if (!assetForm.nameAr.trim() || !assetForm.nameEn.trim()) {
      toast.error(t('اسم الأصل مطلوب', 'Asset name is required'));
      return false;
    }
    if (!assetForm.code.trim()) {
      toast.error(t('الكود مطلوب', 'Code is required'));
      return false;
    }
    if (!assetForm.assetTypeAr.trim() || !assetForm.assetTypeEn.trim()) {
      toast.error(t('نوع الأصل مطلوب', 'Asset type is required'));
      return false;
    }
    if (!invoiceForm.vendorName.trim()) {
      toast.error(t('اسم المورد مطلوب', 'Vendor name is required'));
      return false;
    }
    if (!invoiceForm.amount || Number(invoiceForm.amount) <= 0) {
      toast.error(t('المبلغ يجب أن يكون أكبر من صفر', 'Amount must be greater than zero'));
      return false;
    }
    if (!invoiceForm.invoiceDate) {
      toast.error(t('تاريخ الفاتورة مطلوب', 'Invoice date is required'));
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    let createdAssetId = null;
    try {
      setSaving(true);

      const assetRes = await axiosInstance.post('/assets', {
        nameAr: assetForm.nameAr.trim(),
        nameEn: assetForm.nameEn.trim(),
        code: assetForm.code.trim().toUpperCase(),
        assetTypeAr: assetForm.assetTypeAr.trim(),
        assetTypeEn: assetForm.assetTypeEn.trim(),
        status: assetForm.status,
        notes: assetForm.notes.trim() || '',
      });

      createdAssetId = assetRes.data.result?._id || assetRes.data._id;

      await axiosInstance.post('/asset-invoices', {
        assetId: createdAssetId,
        vendorName: invoiceForm.vendorName.trim(),
        amount: Number(invoiceForm.amount),
        invoiceDate: invoiceForm.invoiceDate,
        paymentMethod: invoiceForm.paymentMethod,
        referenceNo: invoiceForm.referenceNo?.trim() || undefined,
        notes: invoiceForm.notes?.trim() || undefined,
      });

      toast.success(t('تم إنشاء الأصل والفاتورة بنجاح', 'Asset and invoice created successfully'));
      navigate(`/assets/${createdAssetId}`);
    } catch (err) {
      if (createdAssetId) {
        await axiosInstance.delete(`/assets/${createdAssetId}`).catch(() => {});
      }
      const msg = Array.isArray(err.response?.data?.message)
        ? err.response.data.message.join(', ')
        : err.response?.data?.message || err.message;
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <button onClick={() => navigate('/assets')} className="p-2 border border-gray-200 rounded-xl hover:bg-gray-100 transition bg-white">
            <ArrowLeft className="w-4 h-4 text-gray-600" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{t('شراء أصل جديد', 'Buy New Asset')}</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {t('أدخل البيانات الأساسية أولاً ثم أضف التفاصيل الإضافية عند الحاجة', 'Start with the essentials and add extra details only when needed')}
            </p>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white border border-gray-200 rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-4 pb-3 border-b border-gray-100">
              <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center">
                <Wrench className="w-4 h-4 text-indigo-600" />
              </div>
              <h2 className="text-base font-semibold text-gray-900">{t('بيانات الأصل', 'Asset Details')}</h2>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Field label={t('الاسم بالعربية', 'Name (Arabic)')} required>
                  <input type="text" dir="rtl" value={assetForm.nameAr} onChange={(e) => setA('nameAr', e.target.value)} className={inputCls} />
                </Field>
                <Field label={t('الاسم بالإنجليزية', 'Name (English)')} required>
                  <input type="text" dir="ltr" value={assetForm.nameEn} onChange={(e) => setA('nameEn', e.target.value)} className={inputCls} />
                </Field>
              </div>

              <Field label={t('الكود', 'Code')} required>
                <input type="text" placeholder="AST-EXCAVATOR" value={assetForm.code} onChange={(e) => setAssetCode(e.target.value)} className={inputCls} />
              </Field>

              <div className="grid grid-cols-2 gap-4">
                <Field label={t('النوع بالعربية', 'Type (Arabic)')} required>
                  <input type="text" dir="rtl" placeholder="حفار" value={assetForm.assetTypeAr} onChange={(e) => setA('assetTypeAr', e.target.value)} className={inputCls} />
                </Field>
                <Field label={t('النوع بالإنجليزية', 'Type (English)')} required>
                  <input type="text" dir="ltr" placeholder="Excavator" value={assetForm.assetTypeEn} onChange={(e) => setA('assetTypeEn', e.target.value)} className={inputCls} />
                </Field>
              </div>

              <button
                type="button"
                onClick={() => setShowAssetDetails((prev) => !prev)}
                className="text-sm font-medium text-indigo-700 hover:text-indigo-800"
              >
                {showAssetDetails
                  ? t('إخفاء تفاصيل الأصل الإضافية', 'Hide optional asset details')
                  : t('إضافة تفاصيل أصل اختيارية', 'Add optional asset details')}
              </button>

              {showAssetDetails && (
                <div className="space-y-4">
                  <Field label={t('الحالة', 'Status')}>
                    <select value={assetForm.status} onChange={(e) => setA('status', e.target.value)} className={inputCls}>
                      {ASSET_STATUS.map((s) => (
                        <option key={s.value} value={s.value}>
                          {isAr ? s.labelAr : s.labelEn}
                        </option>
                      ))}
                    </select>
                  </Field>

                  <Field label={t('ملاحظات', 'Notes')}>
                    <textarea rows={2} value={assetForm.notes} onChange={(e) => setA('notes', e.target.value)} dir={isAr ? 'rtl' : 'ltr'} placeholder={t('أضف ملاحظات...', 'Add notes...')} className={`${inputCls} resize-none`} />
                  </Field>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-4 pb-3 border-b border-gray-100">
              <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">
                <FileText className="w-4 h-4 text-emerald-600" />
              </div>
              <h2 className="text-base font-semibold text-gray-900">{t('بيانات الفاتورة', 'Invoice Details')}</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <Field label={t('اسم المورد', 'Vendor Name')} required>
                  <input type="text" value={invoiceForm.vendorName} onChange={(e) => setI('vendorName', e.target.value)} placeholder={t('مثال: شركة المعدات الحديثة', 'e.g., Modern Equipment Co.')} className={inputCls} />
                </Field>
                <button
                  type="button"
                  onClick={() => setShowQuickSupplierModal(true)}
                  className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-indigo-600 hover:text-indigo-700"
                >
                  {t('إضافة مورد سريعًا', 'Quick Add Supplier')}
                </button>
              </div>

              <Field label={t('المبلغ', 'Amount')} required>
                <input type="number" min="0" step="0.01" value={invoiceForm.amount} onChange={(e) => setI('amount', e.target.value)} className={inputCls} />
              </Field>

              <Field label={t('تاريخ الفاتورة', 'Invoice Date')} required>
                <input type="date" value={invoiceForm.invoiceDate} onChange={(e) => setI('invoiceDate', e.target.value)} className={inputCls} />
              </Field>

              <Field label={t('طريقة الدفع', 'Payment Method')} required>
                <select value={invoiceForm.paymentMethod} onChange={(e) => setI('paymentMethod', e.target.value)} className={inputCls}>
                  {PAYMENT_METHODS.map((m) => (
                    <option key={m.value} value={m.value}>
                      {isAr ? m.labelAr : m.labelEn}
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            {(invoiceForm.paymentMethod === 'TRANSFER' || invoiceForm.paymentMethod === 'CHEQUE') && (
              <div className="mt-4">
                <Field label={t('رقم المرجع', 'Reference No')}>
                  <input type="text" value={invoiceForm.referenceNo} onChange={(e) => setI('referenceNo', e.target.value)} placeholder={t('رقم الفاتورة أو الإيصال', 'Invoice or receipt number')} className={inputCls} />
                </Field>
              </div>
            )}

            <div className="mt-4">
              <button
                type="button"
                onClick={() => setShowInvoiceDetails((prev) => !prev)}
                className="text-sm font-medium text-emerald-700 hover:text-emerald-800"
              >
                {showInvoiceDetails
                  ? t('إخفاء ملاحظات الفاتورة', 'Hide invoice notes')
                  : t('إضافة ملاحظات اختيارية', 'Add optional notes')}
              </button>
            </div>

            {showInvoiceDetails && (
              <div className="mt-4">
                <Field label={t('ملاحظات', 'Notes')}>
                  <textarea rows={3} value={invoiceForm.notes} onChange={(e) => setI('notes', e.target.value)} placeholder={t('أضف ملاحظات...', 'Add notes...')} className={`${inputCls} resize-none`} />
                </Field>
              </div>
            )}
          </div>

          <div className="flex gap-3">
            <button onClick={() => navigate('/assets')} className="flex-1 px-4 py-3 border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition font-medium text-sm bg-white">
              {t('إلغاء', 'Cancel')}
            </button>
            <button onClick={handleSubmit} disabled={saving} className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition font-semibold text-sm disabled:opacity-50">
              {saving ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Save className="w-4 h-4" />}
              {saving ? t('جاري الحفظ...', 'Saving...') : t('حفظ الأصل والفاتورة', 'Save Asset & Invoice')}
            </button>
          </div>
        </div>
      </div>

      {showQuickSupplierModal && (
        <QuickSupplierModal
          lang={lang}
          onClose={() => setShowQuickSupplierModal(false)}
          onCreated={handleQuickSupplierCreated}
        />
      )}
    </div>
  );
}
