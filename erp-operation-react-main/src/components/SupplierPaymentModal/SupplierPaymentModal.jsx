import { useContext, useState } from "react";
import { X } from "lucide-react";
import { toast } from "react-toastify";
import { formatCurrency } from "../../utils/dateFormat";
import { Button } from "../ui/button";
import axiosInstance from "../../utils/axiosInstance";
import { LanguageContext } from "../../context/LanguageContext";

export default function SupplierPaymentModal({ supplier, onClose, fetchSuppliers }) {
  const { lang, t } = useContext(LanguageContext);

  const [formData, setFormData] = useState({
    amount: "",
    discountAmount: "",                                          // ✅ الجديد
    paymentDate: new Date().toISOString().split("T")[0],
    paymentMethod: "cash",
    referenceNumber: "",
    notes: "",
  });
  const [loading, setLoading] = useState(false);
  const balance = supplier.balance || 0;

  // ✅ الجديد: حساب الـ totals
  const amount = Number(formData.amount) || 0;
  const discountAmount = Number(formData.discountAmount) || 0;
  const totalAmount = amount + discountAmount;

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.amount || amount <= 0) {
      toast.error(t?.invalidAmount || "Please enter a valid amount", {
        position: "top-right",
        autoClose: 3000,
      });
      return;
    }

    // ✅ الجديد: الخصم لازم يكون أقل من الرصيد
    if (discountAmount >= balance) {
      toast.error(
        lang === "ar"
          ? "الخصم لازم يكون أقل من الرصيد"
          : "Discount must be less than current balance",
        { position: "top-right", autoClose: 3000 }
      );
      return;
    }

    // ✅ الجديد: الـ totalAmount لازم يكون <= الرصيد
    if (totalAmount > balance) {
      toast.error(
        lang === "ar"
          ? "المبلغ الإجمالي يتجاوز الرصيد الحالي"
          : "Total amount exceeds current balance",
        { position: "top-right", autoClose: 3000 }
      );
      return;
    }

    try {
      setLoading(true);
      await axiosInstance.post("/supplier/payments", {
        supplierId: supplier._id,
        amount,
        discountAmount: discountAmount || 0,                     // ✅ الجديد
        method: formData.paymentMethod.toUpperCase(),
        paymentDate: formData.paymentDate,
        referenceNumber: formData.referenceNumber || undefined,
        notes: formData.notes || undefined,
      });

      toast.success(t?.paymentRecorded || "Payment recorded successfully", {
        position: "top-right",
        autoClose: 2000,
      });

      fetchSuppliers();
      onClose();
    } catch (err) {
      console.error(err);
      const errorMsg =
        err.response?.data?.message || err.message || "Error recording payment";
      toast.error(errorMsg, {
        position: "top-right",
        autoClose: 4000,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999] p-4">
      <div className="bg-white rounded-lg w-full max-w-md max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b bg-gradient-to-r from-green-50 to-emerald-50 flex-shrink-0">
          <div>
            <h3 className="text-xl font-bold text-gray-800">
              {t?.addPayment || "Add Payment"}
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              {lang === "ar" ? supplier.nameAr : supplier.nameEn}
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

        {/* Current Balance */}
        <div className="px-6 py-4 bg-blue-50 border-b flex-shrink-0">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">
              {t?.currentBalance || "Current Due"}:
            </span>
            <span className={`text-lg font-bold ${balance > 0 ? "text-red-600" : "text-green-600"}`}>
              {formatCurrency(balance, lang)}
            </span>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-4">
            {/* Payment Amount */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t?.paymentAmount || "Payment Amount"}{" "}
                <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                required
                step="0.01"
                min="0.01"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="0.00"
                disabled={loading}
                dir={lang === "ar" ? "rtl" : "ltr"}
              />
            </div>

            {/* ✅ الجديد: Discount Amount */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {lang === "ar" ? "الخصم من المورد" : "Supplier Discount"}
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formData.discountAmount}
                onChange={(e) => setFormData({ ...formData, discountAmount: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="0.00"
                disabled={loading}
                dir={lang === "ar" ? "rtl" : "ltr"}
              />
            </div>

            {/* ✅ الجديد: Summary — بيظهر بس لو في amount أو discount */}
            {(amount > 0 || discountAmount > 0) && (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-2">
                <div className="flex justify-between text-sm text-gray-600">
                  <span>{lang === "ar" ? "الدفعة الفعلية" : "Payment Amount"}</span>
                  <span>{formatCurrency(amount, lang)}</span>
                </div>
                {discountAmount > 0 && (
                  <div className="flex justify-between text-sm text-green-600">
                    <span>{lang === "ar" ? "الخصم من المورد" : "Supplier Discount"}</span>
                    <span>+ {formatCurrency(discountAmount, lang)}</span>
                  </div>
                )}
                <div className="border-t pt-2 flex justify-between text-sm font-bold text-gray-800">
                  <span>{lang === "ar" ? "الإجمالي" : "Total"}</span>
                  <span>{formatCurrency(totalAmount, lang)}</span>
                </div>
                {/* الرصيد بعد الدفعة */}
                <div className="flex justify-between text-xs text-gray-500">
                  <span>{lang === "ar" ? "الرصيد بعد الدفعة" : "Balance After"}</span>
                  <span className={totalAmount > balance ? "text-red-500" : "text-green-600"}>
                    {formatCurrency(balance - totalAmount, lang)}
                  </span>
                </div>
              </div>
            )}

            {/* Payment Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t?.paymentDate || "Payment Date"}{" "}
                <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                required
                value={formData.paymentDate}
                onChange={(e) => setFormData({ ...formData, paymentDate: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={loading}
              />
            </div>

            {/* Payment Method */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t?.paymentMethod || "Payment Method"}{" "}
                <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.paymentMethod}
                onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={loading}
                dir={lang === "ar" ? "rtl" : "ltr"}
              >
                <option value="cash">{t?.cash || "Cash"}</option>
                <option value="check">{t?.check || "Check"}</option>
                <option value="bank_transfer">{t?.bankTransfer || "Bank Transfer"}</option>
              </select>
            </div>

            {/* Reference Number (conditional) */}
            {(formData.paymentMethod === "check" || formData.paymentMethod === "bank_transfer") && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t?.referenceNumber || "Reference Number"}
                </label>
                <input
                  type="text"
                  value={formData.referenceNumber}
                  onChange={(e) => setFormData({ ...formData, referenceNumber: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder={
                    formData.paymentMethod === "check"
                      ? lang === "ar"
                        ? "رقم الشيك"
                        : "Check number"
                      : lang === "ar"
                      ? "رقم التحويل"
                      : "Transfer reference"
                  }
                  disabled={loading}
                  dir={lang === "ar" ? "rtl" : "ltr"}
                />
              </div>
            )}

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t?.notes || "Notes"}
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                rows="3"
                placeholder={lang === "ar" ? "ملاحظات إضافية..." : "Additional notes..."}
                disabled={loading}
                dir={lang === "ar" ? "rtl" : "ltr"}
              />
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-6 border-t bg-gray-50 flex-shrink-0">
          <Button
            type="button"
            onClick={onClose}
            variant="outline"
            disabled={loading}
            className="px-4 py-2"
          >
            {t?.cancel || "Cancel"}
          </Button>
          <Button
            type="submit"
            onClick={handleSubmit}
            className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white min-w-[120px]"
            disabled={loading || totalAmount > balance}
          >
            {loading ? (
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                {lang === "ar" ? "جاري الحفظ..." : "Saving..."}
              </div>
            ) : (
              <>{t?.recordPayment || (lang === "ar" ? "تسجيل الدفعة" : "Record Payment")}</>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}