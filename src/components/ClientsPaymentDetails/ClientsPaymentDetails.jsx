import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  CreditCard,
  Download,
} from 'lucide-react';
import axiosInstance from '../../utils/axiosInstance';
import FullPageLoader from '../Loader/Loader';
import { LanguageContext } from '../../context/LanguageContext';
import { toast } from 'react-toastify';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

const PaymentDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { lang, t } = useContext(LanguageContext);

  const [payment, setPayment] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPayment();
  }, [id]);

  const fetchPayment = async () => {
    try {
      setLoading(true);
      const response = await axiosInstance.get(`/projects/payments/${id}`);
      setPayment(response.data.result);
    } catch (error) {
      console.error('Error fetching payment:', error);
      toast.error(lang === 'ar' ? 'حدث خطأ أثناء تحميل بيانات الدفعة' : 'Error loading payment data');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handlePDF = async () => {
    try {
      const element = document.getElementById('receipt-container');
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
      const imgWidth = pageWidth - 20; // 10mm margin on each side
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      let heightLeft = imgHeight;
      let position = 10; // 10mm top margin

      pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight);
      heightLeft -= pageHeight - 20;

      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      pdf.save(`payment-receipt-${payment.paymentNo}.pdf`);
      
      toast.success(lang === 'ar' ? 'تم تحميل PDF بنجاح' : 'PDF downloaded successfully');
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error(lang === 'ar' ? 'حدث خطأ أثناء إنشاء PDF' : 'Error generating PDF');
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

  const getMethodLabel = (method) => {
    const methodMap = {
      CASH: lang === 'ar' ? 'نقد' : 'Cash',
      CHEQUE: lang === 'ar' ? 'شيك' : 'Cheque',
      TRANSFER: lang === 'ar' ? 'تحويل بنكي' : 'Transfer'
    };
    return methodMap[method] || method;
  };

  if (loading) {
    return <FullPageLoader text={lang === 'ar' ? 'جاري تحميل الإيصال...' : 'Loading receipt...'} />;
  }

  if (!payment) {
    return (
      <div className="min-h-screen bg-gray-50 py-8 px-4">
        <div className="max-w-2xl mx-auto">
          <button
            onClick={() => navigate('/finance/client-payments')}
            className="flex items-center gap-2 text-blue-600 hover:text-blue-700 font-semibold mb-6"
          >
            <ArrowLeft className="w-5 h-5" />
            {lang === 'ar' ? 'رجوع' : 'Back'}
          </button>
          <div className="bg-white rounded-lg p-8 text-center shadow-sm">
            <p className="text-gray-500">
              {lang === 'ar' ? 'الدفعة غير موجودة' : 'Payment not found'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  const previousBalance = payment.amount + (payment.projectId?.totalPaid || payment.amount);
  const remainingBalance = (payment.projectId?.contractAmount || 0) - (payment.projectId?.totalPaid || 0);

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 print:bg-white print:p-0 print:py-0">
      {/* Top Action Buttons */}
      <div className="max-w-3xl mx-auto mb-6 print:hidden flex gap-3">
        <button
          onClick={() => navigate('/finance/client-payments')}
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
      <div className="max-w-3xl mx-auto bg-white shadow-lg print:shadow-none rounded-lg print:rounded-none overflow-hidden" id="receipt-container">
        {/* Header Section */}
        <div className="p-8 border-b print:border-b">
          <div className="flex items-start justify-between mb-8">
            {/* Company Info */}
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 bg-blue-100 rounded-lg flex items-center justify-center">
                <CreditCard className="w-8 h-8 text-blue-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {lang === 'ar' ? 'ميجا بيلد للأنشاءات' : 'Mega Build Construction'}
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
              <h2 className="text-2xl font-bold text-blue-600 mb-1">
                {lang === 'ar' ? 'إيصال الدفع' : 'Payment Receipt'}
              </h2>
              <p className="text-sm text-gray-600">
                {lang === 'ar' ? 'رقم الإيصال:' : 'Receipt #:'} RCP-{payment.paymentNo}
              </p>
              <p className="text-sm text-gray-600">
                {lang === 'ar' ? 'بواسطة :' : 'By : '} {payment.createdBy.email}
              </p>
            </div>
          </div>

          {/* Bill To & Details */}
          <div className="grid grid-cols-2 gap-8">
            <div>
              <p className="text-xs text-gray-500 uppercase font-semibold mb-2">
                {lang === 'ar' ? 'فاتورة إلى' : 'Bill To'}
              </p>
              <h3 className="text-lg font-bold text-gray-900 mb-2">
                {lang === 'ar' ? payment.clientId?.nameAr : payment.clientId?.nameEn}
              </h3>
              <div className="text-sm text-gray-600 space-y-1">
                <p>{lang === 'ar' ? 'الكود:' : 'Code:'} {payment.clientId?.code}</p>
                <p>{lang === 'ar' ? 'الهاتف:' : 'Phone:'} {payment.clientId?.phone}</p>
                <p>{lang === 'ar' ? 'البريد:' : 'Email:'} {payment.clientId?.email}</p>
              </div>
            </div>

            <div className="text-right">
              <div className="mb-4">
                <p className="text-xs text-gray-500 uppercase font-semibold mb-1">
                  {lang === 'ar' ? 'تاريخ الدفع' : 'Payment Date'}
                </p>
                <p className="text-lg font-semibold text-gray-900">
                  {formatDate(payment.paymentDate)}
                </p>
              </div>

              <div>
                <p className="text-xs text-gray-500 uppercase font-semibold mb-1">
                  {lang === 'ar' ? 'طريقة الدفع' : 'Payment Method'}
                </p>
                <p className="text-lg font-semibold text-gray-900">
                  {getMethodLabel(payment.method)}
                </p>
              </div>

              {payment.method === 'CHEQUE' && payment.chequeNo && (
                <div className="mt-4">
                  <p className="text-xs text-gray-500 uppercase font-semibold mb-1">
                    {lang === 'ar' ? 'رقم الشيك' : 'Cheque #'}
                  </p>
                  <p className="text-lg font-semibold text-gray-900">
                    {payment.chequeNo}
                  </p>
                </div>
              )}

              {payment.method === 'TRANSFER' && payment.transferRef && (
                <div className="mt-4">
                  <p className="text-xs text-gray-500 uppercase font-semibold mb-1">
                    {lang === 'ar' ? 'رقم التحويل' : 'Transfer #'}
                  </p>
                  <p className="text-lg font-semibold text-gray-900">
                    {payment.transferRef}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Project Info */}
        <div className="px-8 py-4 bg-gray-50 border-b">
          <p className="text-xs text-gray-500 uppercase font-semibold mb-2">
            {lang === 'ar' ? 'المشروع' : 'Project'}
          </p>
          <h3 className="text-lg font-bold text-gray-900">
            {lang === 'ar' ? payment.projectId?.nameAr : payment.projectId?.nameEn}
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            {lang === 'ar' ? 'الكود:' : 'Code:'} {payment.projectId?.code}
          </p>
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
              <tr className="border-b">
                <td className="px-8 py-4 text-gray-700">
                  {lang === 'ar' ? 'الرصيد السابق' : 'Previous Balance'}
                </td>
                <td className="px-8 py-4 text-right text-gray-700 font-semibold">
                  {formatCurrency(previousBalance)}
                </td>
              </tr>
              <tr className="border-b bg-green-50">
                <td className="px-8 py-4 text-gray-700 font-semibold">
                  {lang === 'ar' ? 'المبلغ المدفوع' : 'Amount Paid'}
                </td>
                <td className="px-8 py-4 text-right text-green-600 font-bold">
                  - {formatCurrency(payment.amount)}
                </td>
              </tr>
              <tr className="border-b bg-gray-50">
                <td className="px-8 py-4 text-gray-900 font-bold">
                  {lang === 'ar' ? 'المبلغ المتبقي' : 'remaining to be paid'}
                </td>
                <td className="px-8 py-4 text-right text-gray-900 font-bold text-lg">
                  {formatCurrency(remainingBalance)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Payment Confirmation */}
        <div className="px-8 py-6 bg-green-50 border-b">
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
              <span className="text-white text-sm font-bold">✓</span>
            </div>
            <p className="text-green-700 font-semibold">
              {lang === 'ar' ? 'تم استلام الدفعة:' : 'Payment Received:'} {formatCurrency(payment.amount)}
            </p>
          </div>
        </div>

        {/* Notes Section */}
        {payment.notes && (
          <div className="px-8 py-6 border-b">
            <p className="text-sm text-gray-600 mb-2 font-semibold">
              {lang === 'ar' ? 'ملاحظات:' : 'Notes:'}
            </p>
            <p className="text-gray-700">{payment.notes}</p>
          </div>
        )}

        {/* Signature Section */}
        <div className="px-8 py-8">
          <div className="grid grid-cols-2 gap-8">
            <div>
              <p className="text-sm text-gray-600 mb-12">
                {lang === 'ar' ? 'التوقيع المصرح' : 'Authorized Signature'}
              </p>
              <div className="border-t border-gray-300"></div>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600 mb-12">
                {lang === 'ar' ? 'توقيع العميل' : 'Client Signature'}
              </p>
              <div className="border-t border-gray-300"></div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-8 py-6 bg-gray-50 border-t text-center text-xs text-gray-600 print:text-gray-500">
          <p className="mb-1">
            {lang === 'ar' ? 'شكراً على دفعتك!' : 'Thank you for your payment!'}
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

export default PaymentDetails;