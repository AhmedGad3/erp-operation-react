import React, { useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, FileText, Save, Wrench } from 'lucide-react';
import { toast } from 'react-toastify';
import axiosInstance from '../../utils/axiosInstance';
import { LanguageContext } from '../../context/LanguageContext';
import { createAutoCode } from '../../utils/autoCode';
import QuickSupplierModal from '../quick-create/QuickSupplierModal';

const ASSET_STATUS = [
  { value: 'AVAILABLE', labelAr: 'Ù…ØªØ§Ø­', labelEn: 'Available' },
  { value: 'IN_USE', labelAr: 'Ù‚ÙŠØ¯ Ø§Ù„Ø§Ø³ØªØ®Ø¯Ø§Ù…', labelEn: 'In Use' },
  { value: 'MAINTENANCE', labelAr: 'ÙÙŠ Ø§Ù„ØµÙŠØ§Ù†Ø©', labelEn: 'Maintenance' },
  { value: 'RETIRED', labelAr: 'Ù…ØªÙ‚Ø§Ø¹Ø¯', labelEn: 'Retired' },
];

const PAYMENT_METHODS = [
  { value: 'CASH', labelAr: 'Ù†Ù‚Ø¯ÙŠ', labelEn: 'Cash' },
  { value: 'TRANSFER', labelAr: 'ØªØ­ÙˆÙŠÙ„ Ø¨Ù†ÙƒÙŠ', labelEn: 'Bank Transfer' },
  { value: 'CHEQUE', labelAr: 'Ø´ÙŠÙƒ', labelEn: 'Cheque' },
];

const inputCls =
  'w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-gray-50 transition';

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
  const [showAssetDetails, setShowAssetDetails] = useState(true);
  const [showInvoiceDetails, setShowInvoiceDetails] = useState(true);
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

  useEffect(() => {
    if (codeTouched) return;
    setAssetForm((prev) => ({
      ...prev,
      code: createAutoCode(prev.nameEn || prev.nameAr, 'AST'),
    }));
  }, [assetForm.nameAr, assetForm.nameEn, codeTouched]);

  const setAssetField = (key, value) =>
    setAssetForm((prev) => ({ ...prev, [key]: value }));
  const setInvoiceField = (key, value) =>
    setInvoiceForm((prev) => ({ ...prev, [key]: value }));

  const setAssetCode = (value) => {
    setCodeTouched(true);
    setAssetField('code', value.toUpperCase());
  };

  const handleQuickSupplierCreated = (createdSupplier) => {
    const supplierName = isAr
      ? createdSupplier?.nameAr || createdSupplier?.nameEn
      : createdSupplier?.nameEn || createdSupplier?.nameAr;

    if (!supplierName) return;
    setInvoiceField('vendorName', supplierName);
  };

  const validate = () => {
    if (!assetForm.nameAr.trim() || !assetForm.nameEn.trim()) {
      toast.error(t('Ø§Ø³Ù… Ø§Ù„Ø£ØµÙ„ Ù…Ø·Ù„ÙˆØ¨', 'Asset name is required'));
      return false;
    }

    if (!assetForm.code.trim()) {
      toast.error(t('Ø§Ù„ÙƒÙˆØ¯ Ù…Ø·Ù„ÙˆØ¨', 'Code is required'));
      return false;
    }

    if (!assetForm.assetTypeAr.trim() || !assetForm.assetTypeEn.trim()) {
      toast.error(t('Ù†ÙˆØ¹ Ø§Ù„Ø£ØµÙ„ Ù…Ø·Ù„ÙˆØ¨', 'Asset type is required'));
      return false;
    }

    if (!invoiceForm.vendorName.trim()) {
      toast.error(t('Ø§Ø³Ù… Ø§Ù„Ù…ÙˆØ±Ø¯ Ù…Ø·Ù„ÙˆØ¨', 'Vendor name is required'));
      return false;
    }

    if (invoiceForm.amount === '' || Number(invoiceForm.amount) < 0) {
      toast.error(t('Ø§Ù„Ù…Ø¨Ù„Øº ÙŠØ¬Ø¨ Ø£Ù† ÙŠÙƒÙˆÙ† ØµÙØ± Ø£Ùˆ Ø£ÙƒØ¨Ø±', 'Amount must be zero or greater'));
      return false;
    }

    if (!invoiceForm.invoiceDate) {
      toast.error(t('ØªØ§Ø±ÙŠØ® Ø§Ù„ÙØ§ØªÙˆØ±Ø© Ù…Ø·Ù„ÙˆØ¨', 'Invoice date is required'));
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

      toast.success(
        t('ØªÙ… Ø¥Ù†Ø´Ø§Ø¡ Ø§Ù„Ø£ØµÙ„ ÙˆØ§Ù„ÙØ§ØªÙˆØ±Ø© Ø¨Ù†Ø¬Ø§Ø­', 'Asset and invoice created successfully')
      );
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
          <button
            onClick={() => navigate('/assets')}
            className="p-2 border border-gray-200 rounded-xl hover:bg-gray-100 transition bg-white"
          >
            <ArrowLeft className="w-4 h-4 text-gray-600" />
          </button>

          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {t('Ø´Ø±Ø§Ø¡ Ø£ØµÙ„ Ø¬Ø¯ÙŠØ¯', 'Buy New Asset')}
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {t(
                'Ø£Ø¯Ø®Ù„ Ø§Ù„Ø¨ÙŠØ§Ù†Ø§Øª Ø§Ù„Ø£Ø³Ø§Ø³ÙŠØ© Ø£ÙˆÙ„Ù‹Ø§ Ø«Ù… Ø£Ø¶Ù Ø§Ù„ØªÙØ§ØµÙŠÙ„ Ø§Ù„Ø¥Ø¶Ø§ÙÙŠØ© Ø¹Ù†Ø¯ Ø§Ù„Ø­Ø§Ø¬Ø©',
                'Start with the essentials and add extra details only when needed'
              )}
            </p>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white border border-gray-200 rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-4 pb-3 border-b border-gray-100">
              <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center">
                <Wrench className="w-4 h-4 text-indigo-600" />
              </div>
              <h2 className="text-base font-semibold text-gray-900">
                {t('Ø¨ÙŠØ§Ù†Ø§Øª Ø§Ù„Ø£ØµÙ„', 'Asset Details')}
              </h2>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Field label={t('Ø§Ù„Ø§Ø³Ù… Ø¨Ø§Ù„Ø¹Ø±Ø¨ÙŠØ©', 'Name (Arabic)')} required>
                  <input
                    type="text"
                    dir="rtl"
                    value={assetForm.nameAr}
                    onChange={(e) => setAssetField('nameAr', e.target.value)}
                    className={inputCls}
                  />
                </Field>

                <Field label={t('Ø§Ù„Ø§Ø³Ù… Ø¨Ø§Ù„Ø¥Ù†Ø¬Ù„ÙŠØ²ÙŠØ©', 'Name (English)')} required>
                  <input
                    type="text"
                    dir="ltr"
                    value={assetForm.nameEn}
                    onChange={(e) => setAssetField('nameEn', e.target.value)}
                    className={inputCls}
                  />
                </Field>
              </div>

              <Field label={t('Ø§Ù„ÙƒÙˆØ¯', 'Code')} required>
                <input
                  type="text"
                  placeholder="AST-EXCAVATOR"
                  value={assetForm.code}
                  onChange={(e) => setAssetCode(e.target.value)}
                  className={inputCls}
                />
              </Field>

              <div className="grid grid-cols-2 gap-4">
                <Field label={t('Ø§Ù„Ù†ÙˆØ¹ Ø¨Ø§Ù„Ø¹Ø±Ø¨ÙŠØ©', 'Type (Arabic)')} required>
                  <input
                    type="text"
                    dir="rtl"
                    placeholder="Ø­ÙØ§Ø±"
                    value={assetForm.assetTypeAr}
                    onChange={(e) => setAssetField('assetTypeAr', e.target.value)}
                    className={inputCls}
                  />
                </Field>

                <Field label={t('Ø§Ù„Ù†ÙˆØ¹ Ø¨Ø§Ù„Ø¥Ù†Ø¬Ù„ÙŠØ²ÙŠØ©', 'Type (English)')} required>
                  <input
                    type="text"
                    dir="ltr"
                    placeholder="Excavator"
                    value={assetForm.assetTypeEn}
                    onChange={(e) => setAssetField('assetTypeEn', e.target.value)}
                    className={inputCls}
                  />
                </Field>
              </div>

              {showAssetDetails && (
                <div className="space-y-4">
                  <Field label={t('Ø§Ù„Ø­Ø§Ù„Ø©', 'Status')}>
                    <select
                      value={assetForm.status}
                      onChange={(e) => setAssetField('status', e.target.value)}
                      className={inputCls}
                    >
                      {ASSET_STATUS.map((status) => (
                        <option key={status.value} value={status.value}>
                          {isAr ? status.labelAr : status.labelEn}
                        </option>
                      ))}
                    </select>
                  </Field>

                  <Field label={t('Ù…Ù„Ø§Ø­Ø¸Ø§Øª', 'Notes')}>
                    <textarea
                      rows={2}
                      value={assetForm.notes}
                      onChange={(e) => setAssetField('notes', e.target.value)}
                      dir={isAr ? 'rtl' : 'ltr'}
                      placeholder={t('Ø£Ø¶Ù Ù…Ù„Ø§Ø­Ø¸Ø§Øª...', 'Add notes...')}
                      className={`${inputCls} resize-none`}
                    />
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
              <h2 className="text-base font-semibold text-gray-900">
                {t('Ø¨ÙŠØ§Ù†Ø§Øª Ø§Ù„ÙØ§ØªÙˆØ±Ø©', 'Invoice Details')}
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <Field label={t('Ø§Ø³Ù… Ø§Ù„Ù…ÙˆØ±Ø¯', 'Vendor Name')} required>
                  <input
                    type="text"
                    value={invoiceForm.vendorName}
                    onChange={(e) => setInvoiceField('vendorName', e.target.value)}
                    placeholder={t('Ù…Ø«Ø§Ù„: Ø´Ø±ÙƒØ© Ø§Ù„Ù…Ø¹Ø¯Ø§Øª Ø§Ù„Ø­Ø¯ÙŠØ«Ø©', 'e.g., Modern Equipment Co.')}
                    className={inputCls}
                  />
                </Field>

                <button
                  type="button"
                  onClick={() => setShowQuickSupplierModal(true)}
                  className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-indigo-600 hover:text-indigo-700"
                >
                  {t('Ø¥Ø¶Ø§ÙØ© Ù…ÙˆØ±Ø¯ Ø³Ø±ÙŠØ¹Ù‹Ø§', 'Quick Add Supplier')}
                </button>
              </div>

              <Field label={t('Ø§Ù„Ù…Ø¨Ù„Øº', 'Amount')} required>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={invoiceForm.amount}
                  onChange={(e) => setInvoiceField('amount', e.target.value)}
                  className={inputCls}
                />
              </Field>

              <Field label={t('ØªØ§Ø±ÙŠØ® Ø§Ù„ÙØ§ØªÙˆØ±Ø©', 'Invoice Date')} required>
                <input
                  type="date"
                  value={invoiceForm.invoiceDate}
                  onChange={(e) => setInvoiceField('invoiceDate', e.target.value)}
                  className={inputCls}
                />
              </Field>

              <Field label={t('Ø·Ø±ÙŠÙ‚Ø© Ø§Ù„Ø¯ÙØ¹', 'Payment Method')} required>
                <select
                  value={invoiceForm.paymentMethod}
                  onChange={(e) => setInvoiceField('paymentMethod', e.target.value)}
                  className={inputCls}
                >
                  {PAYMENT_METHODS.map((method) => (
                    <option key={method.value} value={method.value}>
                      {isAr ? method.labelAr : method.labelEn}
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            {(invoiceForm.paymentMethod === 'TRANSFER' ||
              invoiceForm.paymentMethod === 'CHEQUE') && (
              <div className="mt-4">
                <Field label={t('Ø±Ù‚Ù… Ø§Ù„Ù…Ø±Ø¬Ø¹', 'Reference No')}>
                  <input
                    type="text"
                    value={invoiceForm.referenceNo}
                    onChange={(e) => setInvoiceField('referenceNo', e.target.value)}
                    placeholder={t('Ø±Ù‚Ù… Ø§Ù„ÙØ§ØªÙˆØ±Ø© Ø£Ùˆ Ø§Ù„Ø¥ÙŠØµØ§Ù„', 'Invoice or receipt number')}
                    className={inputCls}
                  />
                </Field>
              </div>
            )}

            <div className="mt-4">
            </div>

            {showInvoiceDetails && (
              <div className="mt-4">
                <Field label={t('Ù…Ù„Ø§Ø­Ø¸Ø§Øª', 'Notes')}>
                  <textarea
                    rows={3}
                    value={invoiceForm.notes}
                    onChange={(e) => setInvoiceField('notes', e.target.value)}
                    placeholder={t('Ø£Ø¶Ù Ù…Ù„Ø§Ø­Ø¸Ø§Øª...', 'Add notes...')}
                    className={`${inputCls} resize-none`}
                  />
                </Field>
              </div>
            )}
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => navigate('/assets')}
              className="flex-1 px-4 py-3 border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition font-medium text-sm bg-white"
            >
              {t('Ø¥Ù„ØºØ§Ø¡', 'Cancel')}
            </button>

            <button
              onClick={handleSubmit}
              disabled={saving}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition font-semibold text-sm disabled:opacity-50"
            >
              {saving ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              {saving
                ? t('Ø¬Ø§Ø±ÙŠ Ø§Ù„Ø­ÙØ¸...', 'Saving...')
                : t('Ø­ÙØ¸ Ø§Ù„Ø£ØµÙ„ ÙˆØ§Ù„ÙØ§ØªÙˆØ±Ø©', 'Save Asset & Invoice')}
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

