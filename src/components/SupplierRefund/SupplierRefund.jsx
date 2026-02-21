import React, { useState, useEffect, useContext } from 'react';
import { Search, DollarSign, Plus, Download, Filter, Eye } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import axiosInstance from '../../utils/axiosInstance';
import FullPageLoader from '../Loader/Loader';
import { LanguageContext } from '../../context/LanguageContext';
import { exportToExcel } from '../../utils/excelExport';
import { toast } from 'react-toastify';

const SupplierRefundsList = () => {
  const { lang } = useContext(LanguageContext);
  const navigate  = useNavigate();

  const [refunds,         setRefunds]         = useState([]);
  const [filteredRefunds, setFilteredRefunds] = useState([]);
  const [loading,         setLoading]         = useState(true);
  const [searchTerm,      setSearchTerm]      = useState('');
  const [filterMethod,    setFilterMethod]    = useState('ALL');
  const [startDate,       setStartDate]       = useState('');
  const [endDate,         setEndDate]         = useState('');

  useEffect(() => { fetchRefunds(); }, []);
  useEffect(() => { filterRefunds(); }, [refunds, searchTerm, filterMethod, startDate, endDate]);

  const fetchRefunds = async () => {
    try {
      setLoading(true);
      const response    = await axiosInstance.get('/supplier/payments/refunds');
      const refundsData = response.data.result || [];
      setRefunds(refundsData.map(r => ({ ...r, supplier: r.supplierId, creator: r.createdBy })));
    } catch (error) {
      console.error('Fetch refunds error:', error);
      toast.error(lang === 'ar' ? 'فشل تحميل المرتجعات' : 'Failed to load refunds');
    } finally {
      setLoading(false);
    }
  };

  const filterRefunds = () => {
    let filtered = [...refunds];
    if (searchTerm) {
      filtered = filtered.filter(r =>
        r.refundNo?.toString().includes(searchTerm) ||
        r.supplier?.nameEn?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.supplier?.nameAr?.includes(searchTerm) ||
        r.supplier?.code?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    if (filterMethod !== 'ALL') filtered = filtered.filter(r => r.method === filterMethod);
    if (startDate) filtered = filtered.filter(r => new Date(r.refundDate) >= new Date(startDate));
    if (endDate)   filtered = filtered.filter(r => new Date(r.refundDate) <= new Date(endDate + 'T23:59:59'));
    setFilteredRefunds(filtered);
  };

  const formatDate = (date) =>
    new Date(date).toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-US', {
      year: 'numeric', month: 'short', day: 'numeric'
    });

  const formatCurrency = (amount) =>
    new Intl.NumberFormat(lang === 'ar' ? 'ar-EG' : 'en-US', {
      style: 'currency', currency: 'EGP', minimumFractionDigits: 0
    }).format(amount ?? 0);

  const getMethodLabel = (method) => ({
    CASH:  lang === 'ar' ? 'نقد'         : 'Cash',
    BANK:  lang === 'ar' ? 'تحويل بنكي' : 'Bank Transfer',
    CHECK: lang === 'ar' ? 'شيك'         : 'Check',
  }[method] || method);

  const getMethodBadgeColor = (method) => ({
    CASH:  'bg-green-100 text-green-800',
    BANK:  'bg-blue-100 text-blue-800',
    CHECK: 'bg-purple-100 text-purple-800',
  }[method] || 'bg-gray-100 text-gray-800');

  const handleExportExcel = () => {
    try {
      if (filteredRefunds.length === 0) {
        toast.error(lang === 'ar' ? 'لا توجد بيانات للتصدير' : 'No data to export');
        return;
      }
      const data = filteredRefunds.map(r => ({
        [lang === 'ar' ? 'رقم المرتجع' : 'Refund No']:  r.refundNo || '',
        [lang === 'ar' ? 'المورد'       : 'Supplier']:   lang === 'ar' ? r.supplier?.nameAr : r.supplier?.nameEn,
        [lang === 'ar' ? 'الكود'        : 'Code']:       r.supplier?.code || '',
        [lang === 'ar' ? 'الطريقة'      : 'Method']:     getMethodLabel(r.method),
        [lang === 'ar' ? 'المبلغ'       : 'Amount']:     r.amount || 0,
        [lang === 'ar' ? 'التاريخ'      : 'Date']:       formatDate(r.refundDate),
        [lang === 'ar' ? 'أنشئ بواسطة' : 'Created By']: r.creator?.name || '',
        [lang === 'ar' ? 'ملاحظات'      : 'Notes']:      r.notes || '',
      }));
      exportToExcel(data, Object.keys(data[0]).map(k => ({ [k]: k })),
        lang === 'ar' ? 'مرتجعات_الموردين' : 'Supplier_Refunds', lang);
      toast.success(lang === 'ar' ? 'تم التصدير بنجاح' : 'Exported successfully');
    } catch {
      toast.error(lang === 'ar' ? 'فشل التصدير' : 'Export failed');
    }
  };

  const totalAmount = filteredRefunds.reduce((s, r) => s + (r.amount || 0), 0);
  const cashCount   = filteredRefunds.filter(r => r.method === 'CASH').length;
  const bankCount   = filteredRefunds.filter(r => r.method === 'BANK').length;
  const checkCount  = filteredRefunds.filter(r => r.method === 'CHECK').length;

  if (loading) return <FullPageLoader text={lang === 'ar' ? 'جاري تحميل المرتجعات...' : 'Loading refunds...'} />;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-8 px-4">
      <div className="max-w-7xl mx-auto">

        {/* ── Header ── */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden mb-6">
          <div className="bg-gradient-to-r from-red-600 to-red-700 px-8 py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <DollarSign className="w-8 h-8 text-white" />
                <div>
                  <h1 className="text-2xl font-bold text-white">
                    {lang === 'ar' ? 'مرتجعات الموردين' : 'Supplier Refunds'}
                  </h1>
                  <p className="text-red-100 mt-1">
                    {lang === 'ar' ? 'عرض وإدارة جميع المرتجعات' : 'View and manage all refunds'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button onClick={handleExportExcel}
                  className="flex items-center gap-2 px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition font-semibold shadow-md">
                  <Download className="w-5 h-5" />
                  {lang === 'ar' ? 'تصدير' : 'Export'}
                </button>
                <button onClick={() => navigate('/finance/supplier-refunds/create')}
                  className="flex items-center gap-2 px-6 py-3 bg-white text-red-600 rounded-lg hover:bg-red-50 transition font-semibold shadow-md">
                  <Plus className="w-5 h-5" />
                  {lang === 'ar' ? 'إنشاء مرتجع' : 'Create Refund'}
                </button>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-6 p-6 bg-gray-50">
            <div className="bg-white p-4 rounded-lg border-l-4 border-red-500">
              <p className="text-sm text-gray-600 mb-1">{lang === 'ar' ? 'إجمالي المرتجعات' : 'Total Refunds'}</p>
              <p className="text-2xl font-bold text-gray-900">{filteredRefunds.length}</p>
            </div>
            <div className="bg-white p-4 rounded-lg border-l-4 border-green-500">
              <p className="text-sm text-gray-600 mb-1">{lang === 'ar' ? 'نقد' : 'Cash'}</p>
              <p className="text-2xl font-bold text-gray-900">{cashCount}</p>
            </div>
            <div className="bg-white p-4 rounded-lg border-l-4 border-blue-500">
              <p className="text-sm text-gray-600 mb-1">{lang === 'ar' ? 'تحويل بنكي' : 'Bank'}</p>
              <p className="text-2xl font-bold text-gray-900">{bankCount}</p>
            </div>
            <div className="bg-white p-4 rounded-lg border-l-4 border-purple-500">
              <p className="text-sm text-gray-600 mb-1">{lang === 'ar' ? 'شيكات' : 'Checks'}</p>
              <p className="text-2xl font-bold text-gray-900">{checkCount}</p>
            </div>
            <div className="bg-white p-4 rounded-lg border-l-4 border-yellow-500">
              <p className="text-sm text-gray-600 mb-1">{lang === 'ar' ? 'إجمالي المبلغ' : 'Total Amount'}</p>
              <p className="text-lg font-bold text-gray-900">{formatCurrency(totalAmount)}</p>
            </div>
          </div>
        </div>

        {/* ── Filters ── */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Filter className="w-5 h-5 text-gray-600" />
            <h2 className="text-lg font-semibold text-gray-900">
              {lang === 'ar' ? 'الفلاتر' : 'Filters'}
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3.5 w-5 h-5 text-gray-400" />
              <input type="text"
                placeholder={lang === 'ar' ? 'بحث برقم المرتجع أو المورد...' : 'Search by refund # or supplier...'}
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent transition" />
            </div>
            <select value={filterMethod} onChange={e => setFilterMethod(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent transition">
              <option value="ALL">{lang === 'ar' ? 'كل الطرق' : 'All Methods'}</option>
              <option value="CASH">{lang === 'ar' ? 'نقدي' : 'Cash'}</option>
              <option value="BANK">{lang === 'ar' ? 'تحويل بنكي' : 'Bank Transfer'}</option>
              <option value="CHECK">{lang === 'ar' ? 'شيك' : 'Check'}</option>
            </select>
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent transition" />
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent transition" />
          </div>
          {(searchTerm || filterMethod !== 'ALL' || startDate || endDate) && (
            <button onClick={() => { setSearchTerm(''); setFilterMethod('ALL'); setStartDate(''); setEndDate(''); }}
              className="mt-4 text-sm text-red-600 hover:text-red-700 font-medium">
              {lang === 'ar' ? 'مسح الفلاتر' : 'Clear Filters'}
            </button>
          )}
        </div>

        {/* ── Table ── */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          {filteredRefunds.length === 0 ? (
            <div className="p-12 text-center">
              <DollarSign className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                {lang === 'ar' ? 'لا توجد مرتجعات' : 'No Refunds Found'}
              </h3>
              <button onClick={() => navigate('/finance/supplier-refunds/create')}
                className="inline-flex items-center gap-2 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition font-semibold mt-4">
                <Plus className="w-5 h-5" />
                {lang === 'ar' ? 'إنشاء مرتجع جديد' : 'Create First Refund'}
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    {[
                      lang === 'ar' ? 'رقم المرتجع' : 'Refund #',
                      lang === 'ar' ? 'المورد'       : 'Supplier',
                      lang === 'ar' ? 'الطريقة'      : 'Method',
                      lang === 'ar' ? 'المبلغ'        : 'Amount',
                      lang === 'ar' ? 'التاريخ'       : 'Date',
                      lang === 'ar' ? 'أنشئ بواسطة'  : 'Created By',
                      lang === 'ar' ? 'إجراءات'       : 'Actions',
                    ].map((h, i) => (
                      <th key={i} className="px-6 py-4 text-left text-sm font-semibold text-gray-900">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredRefunds.map((refund) => (
                    <tr key={refund._id} className="hover:bg-gray-50 transition">
                      <td className="px-6 py-4">
                        <span className="px-3 py-1 rounded-full text-sm font-semibold bg-red-100 text-red-800">
                          #{refund.refundNo}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-semibold text-gray-900">
                          {lang === 'ar' ? refund.supplier?.nameAr : refund.supplier?.nameEn}
                        </p>
                        <p className="text-sm text-gray-500">{refund.supplier?.code}</p>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getMethodBadgeColor(refund.method)}`}>
                          {getMethodLabel(refund.method)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-bold text-red-600 text-lg">
                          {formatCurrency(refund.amount)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-gray-700">{formatDate(refund.refundDate)}</td>
                      <td className="px-6 py-4 text-gray-700">{refund.creator?.name || '—'}</td>
                      <td className="px-6 py-4">
                        <button
                          // ✅ بنبعت الـ refund object كاملاً في الـ state
                          onClick={() => navigate(`/finance/supplier-refunds/${refund._id}`, { state: { refund } })}
                          className="flex items-center gap-2 px-3 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition font-medium">
                          <Eye className="w-4 h-4" />
                          {lang === 'ar' ? 'تفاصيل' : 'Details'}
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
    </div>
  );
};

export default SupplierRefundsList;