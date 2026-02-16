import React, { useState, useEffect, useContext } from 'react';
import { Search, DollarSign, Calendar, User, FileText, Plus, Filter, Loader2, Eye, X, Phone, Mail, MapPin } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import axiosInstance from '../../utils/axiosInstance';
import FullPageLoader from '../Loader/Loader';
import { LanguageContext } from '../../context/LanguageContext';

const SupplierRefundsList = () => {
  const { lang, t } = useContext(LanguageContext);
  const navigate = useNavigate();

  const [refunds, setRefunds] = useState([]);
  const [filteredRefunds, setFilteredRefunds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterMethod, setFilterMethod] = useState('ALL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  
  // Modal state
  const [selectedRefund, setSelectedRefund] = useState(null);

  useEffect(() => {
    fetchRefunds();
  }, []);

  useEffect(() => {
    filterRefunds();
  }, [refunds, searchTerm, filterMethod, startDate, endDate]);

  const fetchRefunds = async () => {
    try {
      setLoading(true);
      const response = await axiosInstance.get('/supplier/payments/refunds');
      const refundsData = response.data.result || [];
      
      // Data is already populated from the API, just rename the properties
      const enrichedRefunds = refundsData.map((refund) => ({
        ...refund,
        supplier: refund.supplierId,
        creator: refund.createdBy
      }));
      
      setRefunds(enrichedRefunds);
    } catch (error) {
      console.error('Fetch refunds error:', error);
    } finally {
      setLoading(false);
    }
  };

  const openRefundDetails = (refund) => {
    setSelectedRefund(refund);
  };

  const closeModal = () => {
    setSelectedRefund(null);
  };

  const filterRefunds = () => {
    let filtered = [...refunds];

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(refund =>
        refund.refundNo.toString().includes(searchTerm) ||
        refund.supplier?.nameEn?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        refund.supplier?.nameAr?.includes(searchTerm) ||
        refund.supplier?.code?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Method filter
    if (filterMethod !== 'ALL') {
      filtered = filtered.filter(refund => refund.method === filterMethod);
    }

    // Date range filter
    if (startDate) {
      filtered = filtered.filter(refund => 
        new Date(refund.refundDate) >= new Date(startDate)
      );
    }
    if (endDate) {
      filtered = filtered.filter(refund => 
        new Date(refund.refundDate) <= new Date(endDate)
      );
    }

    setFilteredRefunds(filtered);
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatDateTime = (date) => {
    return new Date(date).toLocaleString(lang === 'ar' ? 'ar-EG' : 'en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getMethodBadgeColor = (method) => {
    switch (method) {
      case 'CASH':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'BANK':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'CHECK':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getMethodIcon = (method) => {
    switch (method) {
      case 'CASH':
        return '💵';
      case 'BANK':
        return '🏦';
      case 'CHECK':
        return '📝';
      default:
        return '💰';
    }
  };

  const totalRefundAmount = filteredRefunds.reduce((sum, refund) => sum + refund.amount, 0);

  if (loading) {
    return <FullPageLoader text={lang === "ar" ? "جاري تحميل المرتجعات..." : "Loading refunds..."} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden mb-6">
          <div className="bg-gradient-to-r from-red-600 to-red-700 px-8 py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <DollarSign className="w-8 h-8 text-white" />
                <div>
                  <h1 className="text-2xl font-bold text-white">
                    {lang === "ar" ? "مرتجعات الموردين" : "Supplier Refunds"}
                  </h1>
                  <p className="text-red-100 mt-1">
                    {lang === "ar" ? "عرض وإدارة جميع المرتجعات" : "View and manage all refunds"}
                  </p>
                </div>
              </div>
              <button
                onClick={() => navigate('/finance/supplier-refunds/create')}
                className="flex items-center gap-2 px-6 py-3 bg-white text-red-600 rounded-lg hover:bg-red-50 transition font-semibold shadow-md"
              >
                <Plus className="w-5 h-5" />
                {lang === "ar" ? "إنشاء مرتجع جديد" : "Create Refund"}
              </button>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-6 bg-gray-50">
            <div className="bg-white p-4 rounded-lg border-l-4 border-red-500">
              <p className="text-sm text-gray-600 mb-1">
                {lang === "ar" ? "إجمالي المرتجعات" : "Total Refunds"}
              </p>
              <p className="text-2xl font-bold text-gray-900">{filteredRefunds.length}</p>
            </div>
            <div className="bg-white p-4 rounded-lg border-l-4 border-green-500">
              <p className="text-sm text-gray-600 mb-1">
                {lang === "ar" ? "إجمالي المبلغ" : "Total Amount"}
              </p>
              <p className="text-2xl font-bold text-gray-900">{totalRefundAmount.toFixed(2)} EGP</p>
            </div>
            <div className="bg-white p-4 rounded-lg border-l-4 border-blue-500">
              <p className="text-sm text-gray-600 mb-1">
                {lang === "ar" ? "متوسط المرتجع" : "Average Refund"}
              </p>
              <p className="text-2xl font-bold text-gray-900">
                {filteredRefunds.length > 0 ? (totalRefundAmount / filteredRefunds.length).toFixed(2) : '0.00'} EGP
              </p>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Filter className="w-5 h-5 text-gray-600" />
            <h2 className="text-lg font-semibold text-gray-900">
              {lang === "ar" ? "الفلاتر" : "Filters"}
            </h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-3.5 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder={lang === "ar" ? "بحث برقم المرتجع أو المورد..." : "Search by refund # or supplier..."}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent transition"
              />
            </div>

            {/* Method Filter */}
            <div>
              <select
                value={filterMethod}
                onChange={(e) => setFilterMethod(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent transition"
              >
                <option value="ALL">{lang === "ar" ? "كل الطرق" : "All Methods"}</option>
                <option value="CASH">{lang === "ar" ? "نقدي" : "Cash"}</option>
                <option value="BANK">{lang === "ar" ? "تحويل بنكي" : "Bank Transfer"}</option>
                <option value="CHECK">{lang === "ar" ? "شيك" : "Check"}</option>
              </select>
            </div>

            {/* Start Date */}
            <div className="relative">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent transition"
                placeholder={lang === "ar" ? "من تاريخ" : "From Date"}
              />
            </div>

            {/* End Date */}
            <div className="relative">
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent transition"
                placeholder={lang === "ar" ? "إلى تاريخ" : "To Date"}
              />
            </div>
          </div>

          {/* Clear Filters */}
          {(searchTerm || filterMethod !== 'ALL' || startDate || endDate) && (
            <button
              onClick={() => {
                setSearchTerm('');
                setFilterMethod('ALL');
                setStartDate('');
                setEndDate('');
              }}
              className="mt-4 text-sm text-red-600 hover:text-red-700 font-medium"
            >
              {lang === "ar" ? "مسح الفلاتر" : "Clear Filters"}
            </button>
          )}
        </div>

        {/* Refunds List */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          {filteredRefunds.length === 0 ? (
            <div className="p-12 text-center">
              <DollarSign className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                {lang === "ar" ? "لا توجد مرتجعات" : "No Refunds Found"}
              </h3>
              <p className="text-gray-600 mb-6">
                {lang === "ar" 
                  ? "لم يتم العثور على أي مرتجعات مطابقة للفلاتر المحددة" 
                  : "No refunds match your current filters"}
              </p>
              <button
                onClick={() => navigate('/finance/supplier-refunds/create')}
                className="inline-flex items-center gap-2 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition font-semibold"
              >
                <Plus className="w-5 h-5" />
                {lang === "ar" ? "إنشاء مرتجع جديد" : "Create First Refund"}
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                      {lang === "ar" ? "رقم المرتجع" : "Refund #"}
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                      {lang === "ar" ? "المورد" : "Supplier"}
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                      {lang === "ar" ? "المبلغ" : "Amount"}
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                      {lang === "ar" ? "الطريقة" : "Method"}
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                      {lang === "ar" ? "التاريخ" : "Date"}
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                      {lang === "ar" ? "أنشئ بواسطة" : "Created By"}
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                      {lang === "ar" ? "إجراءات" : "Actions"}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredRefunds.map((refund) => (
                    <tr key={refund._id} className="hover:bg-gray-50 transition">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-gray-400" />
                          <span className="font-semibold text-gray-900">#{refund.refundNo}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-medium text-gray-900">
                            {lang === 'ar' ? refund.supplier?.nameAr : refund.supplier?.nameEn}
                          </p>
                          <p className="text-sm text-gray-500">{refund.supplier?.code}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-bold text-red-600 text-lg">
                          {refund.amount.toFixed(2)} EGP
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getMethodBadgeColor(refund.method)}`}>
                          {getMethodIcon(refund.method)} {refund.method}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 text-gray-700">
                          <Calendar className="w-4 h-4 text-gray-400" />
                          {formatDate(refund.refundDate)}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-gray-400" />
                          <span className="text-gray-700">{refund.creator?.name || 'N/A'}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => openRefundDetails(refund)}
                          className="flex items-center gap-2 px-3 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition font-medium"
                        >
                          <Eye className="w-4 h-4" />
                          {lang === "ar" ? "تفاصيل" : "Details"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Details Modal */}
      {selectedRefund && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-red-600 to-red-700 px-6 py-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-white">
                  {lang === 'ar' ? 'تفاصيل المرتجع' : 'Refund Details'} - #{selectedRefund.refundNo}
                </h2>
                <button
                  onClick={closeModal}
                  className="text-white hover:bg-white/20 rounded-lg p-2 transition"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
              {/* Refund Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <p className="text-sm text-gray-500 mb-1">
                    {lang === 'ar' ? 'المورد' : 'Supplier'}
                  </p>
                  <p className="font-semibold text-gray-800">
                    {lang === 'ar' ? selectedRefund.supplier?.nameAr : selectedRefund.supplier?.nameEn}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {lang === 'ar' ? 'الكود:' : 'Code:'} {selectedRefund.supplier?.code}
                  </p>
                </div>

                <div>
                  <p className="text-sm text-gray-500 mb-1">
                    {lang === 'ar' ? 'تاريخ المرتجع' : 'Refund Date'}
                  </p>
                  <p className="font-semibold text-gray-800">{formatDate(selectedRefund.refundDate)}</p>
                </div>

                <div>
                  <p className="text-sm text-gray-500 mb-1">
                    {lang === 'ar' ? 'المبلغ' : 'Amount'}
                  </p>
                  <p className="font-bold text-red-600 text-xl">{selectedRefund.amount.toFixed(2)} EGP</p>
                </div>

                <div>
                  <p className="text-sm text-gray-500 mb-1">
                    {lang === 'ar' ? 'طريقة الدفع' : 'Payment Method'}
                  </p>
                  <span className={`inline-block px-4 py-2 rounded-full text-sm font-semibold border ${getMethodBadgeColor(selectedRefund.method)}`}>
                    {getMethodIcon(selectedRefund.method)} {selectedRefund.method}
                  </span>
                </div>

                <div>
                  <p className="text-sm text-gray-500 mb-1">
                    {lang === 'ar' ? 'أنشئ بواسطة' : 'Created By'}
                  </p>
                  <p className="font-semibold text-gray-800">{selectedRefund.creator?.name || 'N/A'}</p>
                  <p className="text-xs text-gray-500 mt-1">{selectedRefund.creator?.email}</p>
                </div>

                <div>
                  <p className="text-sm text-gray-500 mb-1">
                    {lang === 'ar' ? 'تاريخ الإنشاء' : 'Created At'}
                  </p>
                  <p className="font-semibold text-gray-800">{formatDateTime(selectedRefund.createdAt)}</p>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="bg-gray-50 px-6 py-4 flex justify-end">
              <button
                onClick={closeModal}
                className="px-6 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition"
              >
                {lang === 'ar' ? 'إغلاق' : 'Close'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SupplierRefundsList;