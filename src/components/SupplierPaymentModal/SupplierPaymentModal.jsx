import { useContext, useState } from 'react';
import { X } from 'lucide-react';
import { toast } from 'react-toastify';
import { formatCurrency } from '../../utils/dateFormat';
import { Button } from '../ui/button';
import axiosInstance, { getErrorMessage } from '../../utils/axiosInstance';
import { LanguageContext } from '../../context/LanguageContext';

export default function SupplierPaymentModal({
  supplier,
  onClose,
  fetchSuppliers,
}) {
  const { lang, t } = useContext(LanguageContext);

  const [formData, setFormData] = useState({
    amount: '',
    discountAmount: '',
    paymentDate: new Date().toISOString().split('T')[0],
    method: 'CASH',
    chequeNo: '',
    transferRef: '',
    notes: '',
  });
  const [loading, setLoading] = useState(false);

  const balance = supplier.balance || 0;
  const amount = Number(formData.amount) || 0;
  const discountAmount = Number(formData.discountAmount) || 0;
  const totalAmount = amount + discountAmount;
  const balanceAfter = balance - totalAmount;
  const payableAfterDiscount = Math.max(balance - discountAmount, 0);

  const handleChange = (key, value) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.amount || amount <= 0) {
      toast.error(t?.invalidAmount || 'Please enter a valid amount', {
        position: 'top-right',
        autoClose: 3000,
      });
      return;
    }

    if (discountAmount > 0 && discountAmount >= balance) {
      toast.error(
        lang === 'ar'
          ? 'الخصم لازم يكون أقل من الرصيد'
          : 'Discount must be less than current balance',
        { position: 'top-right', autoClose: 3000 },
      );
      return;
    }

    if (totalAmount > balance) {
      toast.error(
        lang === 'ar'
          ? 'المبلغ الإجمالي يتجاوز الرصيد الحالي'
          : 'Total amount exceeds current balance',
        { position: 'top-right', autoClose: 3000 },
      );
      return;
    }

    if (formData.method === 'CHEQUE' && !formData.chequeNo.trim()) {
      toast.error(
        lang === 'ar' ? 'أدخل رقم الشيك' : 'Enter cheque number',
        { position: 'top-right', autoClose: 3000 },
      );
      return;
    }

    if (formData.method === 'TRANSFER' && !formData.transferRef.trim()) {
      toast.error(
        lang === 'ar' ? 'أدخل رقم التحويل' : 'Enter transfer reference',
        { position: 'top-right', autoClose: 3000 },
      );
      return;
    }

    try {
      setLoading(true);
      const payload = {
        supplierId: supplier._id,
        amount,
        discountAmount: discountAmount || 0,
        method: formData.method,
        paymentDate: formData.paymentDate,
        notes: formData.notes.trim() || undefined,
      };

      if (formData.method === 'CHEQUE') {
        payload.chequeNo = formData.chequeNo.trim();
      }

      if (formData.method === 'TRANSFER') {
        payload.transferRef = formData.transferRef.trim();
      }

      await axiosInstance.post('/supplier/payments', payload);

      toast.success(t?.paymentRecorded || 'Payment recorded successfully', {
        position: 'top-right',
        autoClose: 2000,
      });

      fetchSuppliers();
      onClose();
    } catch (err) {
      toast.error(
        getErrorMessage(
          err,
          lang === 'ar' ? 'فشل تسجيل الدفعة' : 'Error recording payment',
        ),
        {
          position: 'top-right',
          autoClose: 4000,
        },
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999] p-4">
      <div className="bg-white rounded-lg w-full max-w-md max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex justify-between items-center p-6 border-b bg-gradient-to-r from-green-50 to-emerald-50 flex-shrink-0">
          <div>
            <h3 className="text-xl font-bold text-gray-800">
              {t?.addPayment || 'Add Payment'}
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              {lang === 'ar' ? supplier.nameAr : supplier.nameEn}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 transition-colors"
            disabled={loading}
          >
            <X size={24} />
          </button>
        </div>

        <div className="px-6 py-4 bg-blue-50 border-b flex-shrink-0">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">
              {t?.currentBalance || 'Current Due'}:
            </span>
            <span
              className={`text-lg font-bold ${
                balance > 0 ? 'text-red-600' : 'text-green-600'
              }`}
            >
              {formatCurrency(balance, lang)}
            </span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t?.paymentAmount || 'Payment Amount'}{' '}
                <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                required
                step="0.01"
                min="0.01"
                value={formData.amount}
                onChange={(e) => handleChange('amount', e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="0.00"
                disabled={loading}
                dir={lang === 'ar' ? 'rtl' : 'ltr'}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {lang === 'ar' ? 'الخصم من المورد' : 'Supplier Discount'}
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formData.discountAmount}
                onChange={(e) => handleChange('discountAmount', e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="0.00"
                disabled={loading}
                dir={lang === 'ar' ? 'rtl' : 'ltr'}
              />
            </div>

            {(amount > 0 || discountAmount > 0) && (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-2">
                <div className="flex justify-between text-sm text-gray-600">
                  <span>{lang === 'ar' ? 'الدفعة الفعلية' : 'Payment Amount'}</span>
                  <span>{formatCurrency(amount, lang)}</span>
                </div>
                {discountAmount > 0 && (
                  <div className="flex justify-between text-sm text-green-600">
                    <span>{lang === 'ar' ? 'الخصم' : 'Discount'}</span>
                    <span>+ {formatCurrency(discountAmount, lang)}</span>
                  </div>
                )}
                <div className="border-t pt-2 flex justify-between text-sm font-bold text-gray-800">
                  <span>{lang === 'ar' ? 'الإجمالي' : 'Total'}</span>
                  <span>{formatCurrency(totalAmount, lang)}</span>
                </div>
                <div className="flex justify-between text-xs text-gray-500">
                  <span>{lang === 'ar' ? 'الرصيد بعد الدفعة' : 'Balance After'}</span>
                  <span className={totalAmount > balance ? 'text-red-500' : 'text-green-600'}>
                    {formatCurrency(balanceAfter, lang)}
                  </span>
                </div>
              </div>
            )}

            {balance > 0 && (
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setFormData((prev) => ({
                      ...prev,
                      amount: balance.toString(),
                      discountAmount: '',
                    }))
                  }
                  className="px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition text-xs font-semibold"
                >
                  {lang === 'ar' ? 'دفع المبلغ الكامل' : 'Pay Full Amount'}
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setFormData((prev) => ({
                      ...prev,
                      amount: (balance / 2).toFixed(2),
                      discountAmount: '',
                    }))
                  }
                  className="px-3 py-1.5 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition text-xs font-semibold"
                >
                  {lang === 'ar' ? 'دفع النصف' : 'Pay Half'}
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setFormData((prev) => ({
                      ...prev,
                      amount: payableAfterDiscount.toFixed(2),
                    }))
                  }
                  className="px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-lg hover:bg-emerald-100 transition text-xs font-semibold"
                >
                  {lang === 'ar'
                    ? 'سدد الباقي بعد الخصم'
                    : 'Settle after discount'}
                </button>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t?.paymentDate || 'Payment Date'}{' '}
                <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                required
                value={formData.paymentDate}
                onChange={(e) => handleChange('paymentDate', e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={loading}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t?.paymentMethod || 'Payment Method'}{' '}
                <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.method}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    method: e.target.value,
                    chequeNo: '',
                    transferRef: '',
                  }))
                }
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={loading}
                dir={lang === 'ar' ? 'rtl' : 'ltr'}
              >
                <option value="CASH">{t?.cash || 'Cash'}</option>
                <option value="CHEQUE">{t?.check || 'Cheque'}</option>
                <option value="TRANSFER">
                  {t?.bankTransfer || 'Bank Transfer'}
                </option>
              </select>
            </div>

            {formData.method === 'CHEQUE' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {lang === 'ar' ? 'رقم الشيك' : 'Cheque Number'}
                </label>
                <input
                  type="text"
                  value={formData.chequeNo}
                  onChange={(e) => handleChange('chequeNo', e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder={lang === 'ar' ? 'أدخل رقم الشيك' : 'Enter cheque number'}
                  disabled={loading}
                  dir={lang === 'ar' ? 'rtl' : 'ltr'}
                />
              </div>
            )}

            {formData.method === 'TRANSFER' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {lang === 'ar' ? 'رقم التحويل' : 'Transfer Reference'}
                </label>
                <input
                  type="text"
                  value={formData.transferRef}
                  onChange={(e) => handleChange('transferRef', e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder={
                    lang === 'ar' ? 'أدخل رقم التحويل' : 'Enter transfer reference'
                  }
                  disabled={loading}
                  dir={lang === 'ar' ? 'rtl' : 'ltr'}
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t?.notes || 'Notes'}
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => handleChange('notes', e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                rows="3"
                placeholder={lang === 'ar' ? 'ملاحظات إضافية...' : 'Additional notes...'}
                disabled={loading}
                dir={lang === 'ar' ? 'rtl' : 'ltr'}
              />
            </div>
          </div>
        </form>

        <div className="flex justify-end gap-3 p-6 border-t bg-gray-50 flex-shrink-0">
          <Button
            type="button"
            onClick={onClose}
            variant="outline"
            disabled={loading}
            className="px-4 py-2"
          >
            {t?.cancel || 'Cancel'}
          </Button>
          <Button
            type="submit"
            onClick={handleSubmit}
            className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white min-w-[120px]"
            disabled={loading || totalAmount > balance}
          >
            {loading ? (
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                {lang === 'ar' ? 'جاري الحفظ...' : 'Saving...'}
              </div>
            ) : (
              <>
                {t?.recordPayment ||
                  (lang === 'ar' ? 'تسجيل الدفعة' : 'Record Payment')}
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
