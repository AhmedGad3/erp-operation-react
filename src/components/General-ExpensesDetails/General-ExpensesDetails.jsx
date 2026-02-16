import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Receipt,
  Download,
} from 'lucide-react';
import axiosInstance from '../../utils/axiosInstance';
import FullPageLoader from '../Loader/Loader';
import { LanguageContext } from '../../context/LanguageContext';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { toast } from 'react-toastify';

const EXPENSE_CATEGORIES = {
  RENT: { labelAr: 'إيجارات', labelEn: 'Rent' },
  UTILITIES: { labelAr: 'مرافق', labelEn: 'Utilities' },
  MAINTENANCE: { labelAr: 'صيانة', labelEn: 'Maintenance' },
  OFFICE_SUPPLIES: { labelAr: 'أدوات مكتبية', labelEn: 'Office Supplies' },
  HOSPITALITY: { labelAr: 'ضيافة', labelEn: 'Hospitality' },
  COMMUNICATION: { labelAr: 'اتصالات', labelEn: 'Communication' },
  TRANSPORTATION: { labelAr: 'مواصلات', labelEn: 'Transportation' },
  PROFESSIONAL_FEES: { labelAr: 'رسوم مهنية', labelEn: 'Professional Fees' },
  INSURANCE: { labelAr: 'تأمينات', labelEn: 'Insurance' },
  MARKETING: { labelAr: 'تسويق', labelEn: 'Marketing' },
  SALARIES: { labelAr: 'رواتب', labelEn: 'Salaries' },
  OTHERS: { labelAr: 'أخرى', labelEn: 'Others' },
};

const PAYMENT_METHODS = {
  CASH: { labelAr: 'نقد', labelEn: 'Cash' },
  TRANSFER: { labelAr: 'تحويل بنكي', labelEn: 'Bank Transfer' },
  CHEQUE: { labelAr: 'شيك', labelEn: 'Cheque' },
};

const ExpenseDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { lang } = useContext(LanguageContext);

  const [expense, setExpense] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchExpense();
  }, [id]);

  const fetchExpense = async () => {
    try {
      setLoading(true);
      const response = await axiosInstance.get(`/general-expenses/${id}`);
      setExpense(response.data);
    } catch (error) {
      console.error('Error fetching expense:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePDF = async () => {
    try {
      const element = document.getElementById('expense-receipt-container');
      const canvas = await html2canvas(element, {
        scale: 2,
        backgroundColor: '#ffffff',
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = pageWidth - 20;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      let heightLeft = imgHeight;
      let position = 10;

      pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight);
      heightLeft -= pageHeight - 20;

      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }
      toast.success(lang === 'ar' ? 'تم تحميل PDF بنجاح' : 'PDF downloaded successfully');
      pdf.save(`expense-receipt-${expense.expenseNo}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error(lang === 'ar' ? 'خطأ في إنشاء PDF' : 'Error generating PDF');
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat(lang === 'ar' ? 'ar-EG' : 'en-US', {
      style: 'currency',
      currency: 'EGP',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const getCategoryLabel = (category) => {
    return EXPENSE_CATEGORIES[category]?.[lang === 'ar' ? 'labelAr' : 'labelEn'] || category;
  };

  const getMethodLabel = (method) => {
    return PAYMENT_METHODS[method]?.[lang === 'ar' ? 'labelAr' : 'labelEn'] || method;
  };

  if (loading) {
    return <FullPageLoader text={lang === 'ar' ? 'جاري تحميل الإيصال...' : 'Loading receipt...'} />;
  }

  if (!expense) {
    return (
      <div className="min-h-screen bg-gray-50 py-8 px-4">
        <div className="max-w-2xl mx-auto">
          <button
            onClick={() => navigate('/general-expenses')}
            className="flex items-center gap-2 text-blue-600 hover:text-blue-700 font-semibold mb-6"
          >
            <ArrowLeft className="w-5 h-5" />
            {lang === 'ar' ? 'رجوع' : 'Back'}
          </button>
          <div className="bg-white rounded-lg p-8 text-center shadow-sm">
            <p className="text-gray-500">
              {lang === 'ar' ? 'المصروف غير موجود' : 'Expense not found'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 print:bg-white print:p-0 print:py-0">
      {/* Top Action Buttons */}
      <div className="max-w-3xl mx-auto mb-6 print:hidden flex gap-3">
        <button
          onClick={() => navigate('/finance/general-expenses')}
          className="flex items-center gap-2 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition font-semibold"
        >
          <ArrowLeft className="w-4 h-4" />
          {lang === 'ar' ? 'رجوع' : 'Back'}
        </button>
        <button
          onClick={handlePDF}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition font-semibold"
        >
          <Download className="w-4 h-4" />
          {lang === 'ar' ? 'تحميل PDF' : 'Download PDF'}
        </button>
      </div>

      {/* Receipt Container */}
      <div className="max-w-3xl mx-auto bg-white shadow-lg print:shadow-none rounded-lg print:rounded-none overflow-hidden" id="expense-receipt-container">
        {/* Header Section */}
        <div className="p-8 border-b print:border-b">
          <div className="flex items-start justify-between mb-8">
            {/* Company Info */}
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 bg-emerald-100 rounded-lg flex items-center justify-center">
                <Receipt className="w-8 h-8 text-emerald-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {lang === 'ar' ? 'ميجا بيلد للإنشاءات' : 'Mega Build Construction'}
                </h1>
                <p className="text-sm text-gray-600 mt-1">
                  {lang === 'ar' ? '123 شارع الأعمال، المدينة' : '123 Business Street, City State 12345'}
                </p>
                <p className="text-sm text-gray-600">
                  contact@MegaBuild.com | +1 (555) 123-4567
                </p>
              </div>
            </div>

            {/* Receipt Title */}
            <div className="text-right">
              <h2 className="text-2xl font-bold text-emerald-600 mb-1">
                {lang === 'ar' ? 'إيصال مصروف' : 'Expense Receipt'}
              </h2>
              <p className="text-sm text-gray-600">
                {lang === 'ar' ? 'رقم الإيصال:' : 'Receipt #:'} EXP-{expense.expenseNo}
              </p>
              <p className="text-sm text-gray-600">
                {lang === 'ar' ? 'بواسطة:' : 'By:'} {expense.createdBy?.email}
              </p>
            </div>
          </div>

          {/* Expense Details */}
          <div className="grid grid-cols-2 gap-8">
            <div>
              <p className="text-xs text-gray-500 uppercase font-semibold mb-2">
                {lang === 'ar' ? 'المستفيد' : 'Paid To'}
              </p>
              {expense.vendorName ? (
                <>
                  <h3 className="text-lg font-bold text-gray-900 mb-2">
                    {expense.vendorName}
                  </h3>
                  <p className="text-sm text-gray-600">
                    {lang === 'ar' ? 'مورد/جهة خارجية' : 'Vendor/External Party'}
                  </p>
                </>
              ) : (
                <p className="text-gray-600">
                  {lang === 'ar' ? 'غير محدد' : 'Not specified'}
                </p>
              )}
            </div>

            <div className="text-right">
              <div className="mb-4">
                <p className="text-xs text-gray-500 uppercase font-semibold mb-1">
                  {lang === 'ar' ? 'تاريخ المصروف' : 'Expense Date'}
                </p>
                <p className="text-lg font-semibold text-gray-900">
                  {formatDate(expense.expenseDate)}
                </p>
              </div>

              <div>
                <p className="text-xs text-gray-500 uppercase font-semibold mb-1">
                  {lang === 'ar' ? 'طريقة الدفع' : 'Payment Method'}
                </p>
                <p className="text-lg font-semibold text-gray-900">
                  {getMethodLabel(expense.paymentMethod)}
                </p>
              </div>

              {expense.referenceNo && (
                <div className="mt-4">
                  <p className="text-xs text-gray-500 uppercase font-semibold mb-1">
                    {lang === 'ar' ? 'رقم المرجع' : 'Reference #'}
                  </p>
                  <p className="text-lg font-semibold text-gray-900">
                    {expense.referenceNo}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Expense Category Info */}
        <div className="px-8 py-4 bg-gray-50 border-b">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500 uppercase font-semibold mb-1">
                {lang === 'ar' ? 'الفئة' : 'Category'}
              </p>
              <h3 className="text-lg font-bold text-gray-900">
                {getCategoryLabel(expense.mainCategory)}
              </h3>
              {expense.subCategory && (
                <p className="text-sm text-gray-600 mt-1">
                  {expense.subCategory}
                </p>
              )}
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-500 uppercase font-semibold mb-1">
                {lang === 'ar' ? 'العنوان' : 'Title'}
              </p>
              <h3 className="text-lg font-bold text-gray-900">
                {expense.title}
              </h3>
            </div>
          </div>
        </div>

        {/* Payment Details Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-100 border-b">
                <th className="px-8 py-4 text-left text-xs font-semibold text-gray-700 uppercase">
                  {lang === 'ar' ? 'الوصف' : 'Description'}
                </th>
                <th className="px-8 py-4 text-right text-xs font-semibold text-gray-700 uppercase">
                  {lang === 'ar' ? 'المبلغ' : 'Amount'}
                </th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b bg-red-50">
                <td className="px-8 py-4 text-gray-700 font-semibold">
                  {expense.title}
                </td>
                <td className="px-8 py-4 text-right text-red-600 font-bold text-xl">
                  {formatCurrency(expense.amount)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Payment Confirmation */}
        <div className="px-8 py-6 bg-red-50 border-b">
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 bg-red-500 rounded-full flex items-center justify-center">
              <span className="text-white text-sm font-bold">-</span>
            </div>
            <p className="text-red-700 font-semibold">
              {lang === 'ar' ? 'تم صرف المبلغ:' : 'Amount Paid:'} {formatCurrency(expense.amount)}
            </p>
          </div>
        </div>

        {/* Notes Section */}
        {expense.notes && (
          <div className="px-8 py-6 border-b">
            <p className="text-sm text-gray-600 mb-2 font-semibold">
              {lang === 'ar' ? 'ملاحظات:' : 'Notes:'}
            </p>
            <p className="text-gray-700">{expense.notes}</p>
          </div>
        )}

        {/* Metadata Section */}
        <div className="px-8 py-6 border-b bg-gray-50">
          <div className="grid grid-cols-2 gap-6 text-sm">
            <div>
              <p className="text-gray-600 mb-1">
                {lang === 'ar' ? 'تاريخ الإنشاء:' : 'Created At:'}
              </p>
              <p className="font-semibold text-gray-900">
                {formatDate(expense.createdAt)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-gray-600 mb-1">
                {lang === 'ar' ? 'آخر تحديث:' : 'Last Updated:'}
              </p>
              <p className="font-semibold text-gray-900">
                {formatDate(expense.updatedAt)}
              </p>
            </div>
            {expense.updatedBy && (
              <>
                <div className="col-span-2">
                  <p className="text-gray-600 mb-1">
                    {lang === 'ar' ? 'تم التحديث بواسطة:' : 'Updated By:'}
                  </p>
                  <p className="font-semibold text-gray-900">
                    {expense.updatedBy.name} ({expense.updatedBy.email})
                  </p>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Signature Section */}
        <div className="px-8 py-8">
          <div className="grid grid-cols-2 gap-8">
            <div>
              <p className="text-sm text-gray-600 mb-12">
                {lang === 'ar' ? 'التوقيع المصرح' : 'Authorized Signature'}
              </p>
              <div className="border-t border-gray-300"></div>
              <p className="text-xs text-gray-500 mt-2">
                {expense.createdBy?.name}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600 mb-12">
                {lang === 'ar' ? 'توقيع المستلم' : 'Receiver Signature'}
              </p>
              <div className="border-t border-gray-300"></div>
              <p className="text-xs text-gray-500 mt-2">
                {expense.vendorName || (lang === 'ar' ? 'غير محدد' : 'Not specified')}
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-8 py-6 bg-gray-50 border-t text-center text-xs text-gray-600 print:text-gray-500">
          <p className="mb-1">
            {lang === 'ar' ? 'شكراً لكم!' : 'Thank you!'}
          </p>
          <p>
            {lang === 'ar' 
              ? 'هذا إيصال من إنتاج الكمبيوتر ولا يتطلب توقيعاً فعلياً'
              : 'This is a computer-generated receipt and does not require a physical signature.'}
          </p>
        </div>
      </div>
    </div>
  );
};

export default ExpenseDetails;