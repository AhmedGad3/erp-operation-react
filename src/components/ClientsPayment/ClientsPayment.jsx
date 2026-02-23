import React, { useState, useEffect, useContext } from 'react';
import { CreditCard, Search, Plus, AlertCircle, Download } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import axiosInstance, { getErrorMessage } from '../../utils/axiosInstance';
import FullPageLoader from '../Loader/Loader';
import { LanguageContext } from '../../context/LanguageContext';
import { exportToExcel } from '../../utils/excelExport';
import { toast } from 'react-toastify';

const PaymentsList = () => {
  const { lang, t } = useContext(LanguageContext);
  const navigate = useNavigate();

  const [payments, setPayments] = useState([]);
  const [filteredPayments, setFilteredPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterMethod, setFilterMethod] = useState('ALL');

  useEffect(() => {
    fetchPayments();
  }, []);

  useEffect(() => {
    filterPayments();
  }, [payments, searchTerm, filterMethod]);

  const fetchPayments = async () => {
    try {
      setLoading(true);
      const response = await axiosInstance.get('/projects/payments');
      const paymentsData = Array.isArray(response.data) ? response.data : (response.data.result || []);
      setPayments(paymentsData);
    } catch (error) {
      toast.error(getErrorMessage(error, lang === 'ar' ? 'فشل تحميل الدفعات' : 'Failed to load payments'));
    } finally {
      setLoading(false);
    }
  };

  const filterPayments = () => {
    let filtered = [...payments];

    if (searchTerm) {
      filtered = filtered.filter(payment =>
        payment.clientId?.nameAr?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        payment.clientId?.nameEn?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        payment.projectId?.nameAr?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        payment.projectId?.nameEn?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        payment.projectId?.code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        payment.chequeNo?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (filterMethod !== 'ALL') {
      filtered = filtered.filter(payment => payment.method === filterMethod);
    }

    setFilteredPayments(filtered);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-US', {
      year: 'numeric',
      month: 'short',
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

  const getMethodBadgeColor = (method) => {
    const colorMap = {
      CASH: 'bg-green-100 text-green-800',
      CHEQUE: 'bg-blue-100 text-blue-800',
      TRANSFER: 'bg-purple-100 text-purple-800'
    };
    return colorMap[method] || 'bg-gray-100 text-gray-800';
  };

  const handleExportExcel = () => {
    try {
      if (filteredPayments.length === 0) {
        toast.error(lang === 'ar' ? 'لا توجد بيانات للتصدير' : 'No data to export');
        return;
      }

      const data = filteredPayments.map((payment) => ({
        [lang === 'ar' ? 'رقم الدفعة' : 'Payment No']: payment.paymentNo || '',
        [lang === 'ar' ? 'العميل' : 'Client']: lang === 'ar' ? payment.clientId?.nameAr : payment.clientId?.nameEn,
        [lang === 'ar' ? 'المشروع' : 'Project']: lang === 'ar' ? payment.projectId?.nameAr : payment.projectId?.nameEn,
        [lang === 'ar' ? 'الكود' : 'Code']: payment.projectId?.code || '',
        [lang === 'ar' ? 'الطريقة' : 'Method']: getMethodLabel(payment.method),
        [lang === 'ar' ? 'دفعة العقد' : 'Contract Payment']: payment.contractPayment || 0,
        [lang === 'ar' ? 'الدفعة الإضافية' : 'Additional Payment']: payment.additionalPayment || 0,
        [lang === 'ar' ? 'الإجمالي' : 'Total Amount']: payment.amount || 0,
        [lang === 'ar' ? 'التاريخ' : 'Date']: formatDate(payment.paymentDate),
        [lang === 'ar' ? 'الملاحظات' : 'Notes']: payment.notes || '',
      }));

      const headers = Object.keys(data[0]).map(key => ({ [key]: key }));
      exportToExcel(data, headers, lang === 'ar' ? 'قائمة_الدفعات' : 'Payments_List', lang);
      
      toast.success(lang === 'ar' ? 'تم التصدير بنجاح' : 'Exported successfully');
    } catch {
      toast.error(lang === 'ar' ? 'فشل التصدير' : 'Export failed');
    }
  };

  if (loading) {
    return <FullPageLoader text={lang === "ar" ? "جاري تحميل الدفعات..." : "Loading payments..."} />;
  }

  const totalAmount = filteredPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
  const cashPayments = filteredPayments.filter(p => p.method === 'CASH').length;
  const chequePayments = filteredPayments.filter(p => p.method === 'CHEQUE').length;
  const transferPayments = filteredPayments.filter(p => p.method === 'TRANSFER').length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden mb-6">
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-8 py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <CreditCard className="w-8 h-8 text-white" />
                <div>
                  <h1 className="text-2xl font-bold text-white">
                    {lang === 'ar' ? 'إدارة دفعات ' : 'Client Payment Management'}
                  </h1>
                  <p className="text-blue-100 mt-1">
                    {lang === 'ar' ? 'عرض وإدارة جميع دفعات العملاء' : 'View and manage all client payments'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={handleExportExcel}
                  className="flex items-center gap-2 px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition font-semibold shadow-md"
                >
                  <Download className="w-5 h-5" />
                  {lang === 'ar' ? 'تصدير' : 'Export'}
                </button>
                <button
                  onClick={() => navigate('/finance/client-payments/create')}
                  className="flex items-center gap-2 px-6 py-3 bg-white text-blue-600 rounded-lg hover:bg-blue-50 transition font-semibold shadow-md"
                >
                  <Plus className="w-5 h-5" />
                  {lang === 'ar' ? 'إضافة دفعة' : 'Add Payment'}
                </button>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-6 p-6 bg-gray-50">
            <div className="bg-white p-4 rounded-lg border-l-4 border-blue-500">
              <p className="text-sm text-gray-600 mb-1">
                {lang === 'ar' ? 'إجمالي الدفعات' : 'Total Payments'}
              </p>
              <p className="text-2xl font-bold text-gray-900">{filteredPayments.length}</p>
            </div>
            <div className="bg-white p-4 rounded-lg border-l-4 border-green-500">
              <p className="text-sm text-gray-600 mb-1">
                {lang === 'ar' ? 'نقد' : 'Cash'}
              </p>
              <p className="text-2xl font-bold text-gray-900">{cashPayments}</p>
            </div>
            <div className="bg-white p-4 rounded-lg border-l-4 border-blue-400">
              <p className="text-sm text-gray-600 mb-1">
                {lang === 'ar' ? 'شيكات' : 'Cheques'}
              </p>
              <p className="text-2xl font-bold text-gray-900">{chequePayments}</p>
            </div>
            <div className="bg-white p-4 rounded-lg border-l-4 border-purple-500">
              <p className="text-sm text-gray-600 mb-1">
                {lang === 'ar' ? 'تحويلات' : 'Transfers'}
              </p>
              <p className="text-2xl font-bold text-gray-900">{transferPayments}</p>
            </div>
            <div className="bg-white p-4 rounded-lg border-l-4 border-yellow-500">
              <p className="text-sm text-gray-600 mb-1">
                {lang === 'ar' ? 'الإجمالي' : 'Total Amount'}
              </p>
              <p className="text-lg font-bold text-gray-900">{formatCurrency(totalAmount)}</p>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3.5 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder={lang === 'ar' ? 'بحث بالعميل أو المشروع...' : 'Search by client or project...'}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
              />
            </div>

            <div>
              <select
                value={filterMethod}
                onChange={(e) => setFilterMethod(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
              >
                <option value="ALL">{lang === 'ar' ? 'جميع الطرق' : 'All Methods'}</option>
                <option value="CASH">{lang === 'ar' ? 'نقد' : 'Cash'}</option>
                <option value="CHEQUE">{lang === 'ar' ? 'شيك' : 'Cheque'}</option>
                <option value="TRANSFER">{lang === 'ar' ? 'تحويل بنكي' : 'Transfer'}</option>
              </select>
            </div>
          </div>

          {(searchTerm || filterMethod !== 'ALL') && (
            <button
              onClick={() => {
                setSearchTerm('');
                setFilterMethod('ALL');
              }}
              className="mt-4 text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              {lang === 'ar' ? 'مسح الفلاتر' : 'Clear Filters'}
            </button>
          )}
        </div>

        {/* Payments Table */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          {filteredPayments.length === 0 ? (
            <div className="p-12 text-center">
              <CreditCard className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                {lang === 'ar' ? 'لا توجد دفعات' : 'No Payments Found'}
              </h3>
              <p className="text-gray-600 mb-6">
                {lang === 'ar' ? 'لم يتم العثور على دفعات مطابقة للفلاتر' : 'No payments match your filters'}
              </p>
              <button
                onClick={() => navigate('/finance/client-payments/create')}
                className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-semibold"
              >
                <Plus className="w-5 h-5" />
                {lang === 'ar' ? 'إضافة أول دفعة' : 'Add First Payment'}
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                      {lang === 'ar' ? 'رقم الدفعة' : 'Payment No'}
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                      {lang === 'ar' ? 'العميل' : 'Client'}
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                      {lang === 'ar' ? 'المشروع' : 'Project'}
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                      {lang === 'ar' ? 'الطريقة' : 'Method'}
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                      {lang === 'ar' ? 'المبلغ' : 'Amount'}
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                      {lang === 'ar' ? 'التاريخ' : 'Date'}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredPayments.map((payment) => (
                    <tr 
                      key={payment._id} 
                      className="hover:bg-gray-50 transition cursor-pointer" 
                      onClick={() => navigate(`/finance/client-payments/${payment._id}`)}
                    >
                      <td className="px-6 py-4">
                        <span className="px-3 py-1 rounded-full text-sm font-semibold bg-indigo-100 text-indigo-800 hover:bg-indigo-200 transition">
                          #{payment.paymentNo}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-semibold text-gray-900">
                            {lang === 'ar' ? payment.clientId?.nameAr : payment.clientId?.nameEn}
                          </p>
                          <p className="text-sm text-gray-500">
                            {payment.clientId?.code}
                          </p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-semibold text-gray-900">
                            {lang === 'ar' ? payment.projectId?.nameAr : payment.projectId?.nameEn}
                          </p>
                          <p className="text-sm text-gray-500">
                            {payment.projectId?.code}
                          </p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getMethodBadgeColor(payment.method)}`}>
                          {getMethodLabel(payment.method)}
                          {payment.method === 'CHEQUE' && payment.chequeNo && (
                            <span className="ml-1 text-xs font-normal">({payment.chequeNo})</span>
                          )}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-gray-700 font-semibold">
                        {formatCurrency(payment.amount)}
                      </td>
                      <td className="px-6 py-4 text-gray-700">
                        {formatDate(payment.paymentDate)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PaymentsList;