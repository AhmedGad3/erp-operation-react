import React, { useState, useEffect, useContext } from 'react';
import {
  Search, DollarSign, Plus, Download, Eye,
  ChevronUp, ChevronDown,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import axiosInstance from '../../utils/axiosInstance';
import FullPageLoader from '../Loader/Loader';
import { LanguageContext } from '../../context/LanguageContext';
import { exportToExcel } from '../../utils/excelExport';
import { toast } from 'react-toastify';

// ── Sortable column header ────────────────────────────────
const SortHeader = ({ label, field, sortField, sortDir, onSort }) => (
  <th
    className="px-4 py-3 text-left text-sm font-medium text-gray-500 cursor-pointer select-none"
    onClick={() => onSort(field)}
  >
    <span className="inline-flex items-center gap-1">
      {label}
      <span className="flex flex-col leading-none">
        <ChevronUp   className={`w-3 h-3 ${sortField === field && sortDir === 'asc'  ? 'text-gray-900' : 'text-gray-300'}`} />
        <ChevronDown className={`w-3 h-3 ${sortField === field && sortDir === 'desc' ? 'text-gray-900' : 'text-gray-300'}`} />
      </span>
    </span>
  </th>
);

// ── Method badge ──────────────────────────────────────────
const MethodBadge = ({ method, lang }) => {
  const map = {
    CASH:  { label: { ar: 'نقد', en: 'Cash' },           cls: 'bg-green-100 text-green-700' },
    BANK:  { label: { ar: 'تحويل بنكي', en: 'Bank' },   cls: 'bg-blue-100 text-blue-700' },
    CHECK: { label: { ar: 'شيك', en: 'Check' },           cls: 'bg-purple-100 text-purple-700' },
  };
  const cfg = map[method] ?? { label: { ar: method, en: method }, cls: 'bg-gray-100 text-gray-700' };
  return (
    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${cfg.cls}`}>
      {lang === 'ar' ? cfg.label.ar : cfg.label.en}
    </span>
  );
};

// ── Stat card ─────────────────────────────────────────────
const StatCard = ({ label, value, color = 'text-gray-900' }) => (
  <div className="bg-white border border-gray-200 rounded-2xl p-5">
    <p className="text-sm text-gray-500 mb-1">{label}</p>
    <p className={`text-2xl font-bold ${color}`}>{value}</p>
  </div>
);

// ── Main ──────────────────────────────────────────────────
const SupplierRefundsList = () => {
  const { lang } = useContext(LanguageContext);
  const navigate  = useNavigate();

  const [refunds,      setRefunds]      = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [searchTerm,   setSearchTerm]   = useState('');
  const [filterMethod, setFilterMethod] = useState('ALL');
  const [startDate,    setStartDate]    = useState('');
  const [endDate,      setEndDate]      = useState('');
  const [sortField,    setSortField]    = useState('refundDate');
  const [sortDir,      setSortDir]      = useState('desc');

  useEffect(() => { fetchRefunds(); }, []);

  const fetchRefunds = async () => {
    try {
      setLoading(true);
      const res = await axiosInstance.get('/supplier/payments/refunds');
      const data = (res.data.result || []).map(r => ({ ...r, supplier: r.supplierId, creator: r.createdBy }));
      setRefunds(data);
    } catch {
      toast.error(lang === 'ar' ? 'فشل تحميل المرتجعات' : 'Failed to load refunds');
    } finally {
      setLoading(false);
    }
  };

  const handleSort = (field) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('asc'); }
  };

  // ── Derived ───────────────────────────────────────────
  const filtered = refunds
    .filter(r => {
      const q = searchTerm.toLowerCase();
      const matchSearch = !q ||
        r.refundNo?.toString().includes(q) ||
        r.supplier?.nameEn?.toLowerCase().includes(q) ||
        r.supplier?.nameAr?.includes(searchTerm) ||
        r.supplier?.code?.toLowerCase().includes(q);
      const matchMethod = filterMethod === 'ALL' || r.method === filterMethod;
      const matchStart  = !startDate || new Date(r.refundDate) >= new Date(startDate);
      const matchEnd    = !endDate   || new Date(r.refundDate) <= new Date(endDate + 'T23:59:59');
      return matchSearch && matchMethod && matchStart && matchEnd;
    })
    .sort((a, b) => {
      let va = a[sortField] ?? '';
      let vb = b[sortField] ?? '';
      if (sortField === 'refundDate' || sortField === 'amount') {
        va = sortField === 'amount' ? Number(va) : new Date(va);
        vb = sortField === 'amount' ? Number(vb) : new Date(vb);
      }
      if (typeof va === 'string') va = va.toLowerCase();
      if (typeof vb === 'string') vb = vb.toLowerCase();
      return sortDir === 'asc' ? (va > vb ? 1 : -1) : (va < vb ? 1 : -1);
    });

  const totalAmount = filtered.reduce((s, r) => s + (r.amount || 0), 0);
  const cashCount   = filtered.filter(r => r.method === 'CASH').length;
  const bankCount   = filtered.filter(r => r.method === 'BANK').length;
  const checkCount  = filtered.filter(r => r.method === 'CHECK').length;

  const fmt = (v) => new Intl.NumberFormat(lang === 'ar' ? 'ar-EG' : 'en-US', {
    style: 'currency', currency: 'EGP', minimumFractionDigits: 0,
  }).format(v ?? 0);

  const fmtDate = (d) => new Date(d).toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
  });

  const handleExport = () => {
    if (!filtered.length) { toast.error(lang === 'ar' ? 'لا توجد بيانات للتصدير' : 'No data to export'); return; }
    const rows = filtered.map(r => ({
      [lang === 'ar' ? 'رقم المرتجع' : 'Refund #']:  r.refundNo || '',
      [lang === 'ar' ? 'المورد' : 'Supplier']:        lang === 'ar' ? r.supplier?.nameAr : r.supplier?.nameEn,
      [lang === 'ar' ? 'الكود' : 'Code']:             r.supplier?.code || '',
      [lang === 'ar' ? 'الطريقة' : 'Method']:         r.method,
      [lang === 'ar' ? 'المبلغ' : 'Amount']:          r.amount || 0,
      [lang === 'ar' ? 'التاريخ' : 'Date']:           fmtDate(r.refundDate),
      [lang === 'ar' ? 'أنشئ بواسطة' : 'Created By']: r.creator?.name || '',
    }));
    exportToExcel(rows, Object.keys(rows[0]).map(k => ({ [k]: k })),
      lang === 'ar' ? 'مرتجعات_الموردين' : 'Supplier_Refunds', lang);
    toast.success(lang === 'ar' ? 'تم التصدير بنجاح' : 'Exported successfully');
  };

  if (loading) return <FullPageLoader text={lang === 'ar' ? 'جاري التحميل...' : 'Loading...'} />;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">

        {/* ── Header ── */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {lang === 'ar' ? 'مرتجعات الموردين' : 'Supplier Refunds'}
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              {lang === 'ar' ? 'عرض وإدارة جميع المرتجعات' : 'View and manage all refunds'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleExport}
              className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition font-medium text-sm bg-white"
            >
              <Download className="w-4 h-4" />
              {lang === 'ar' ? 'تصدير' : 'Export'}
            </button>
            <button
              onClick={() => navigate('/finance/supplier-refunds/create')}
              className="flex items-center gap-2 px-5 py-2.5 bg-red-600 text-white rounded-xl hover:bg-red-700 transition font-semibold text-sm shadow-sm"
            >
              <Plus className="w-4 h-4" />
              {lang === 'ar' ? 'إنشاء مرتجع' : 'Create Refund'}
            </button>
          </div>
        </div>

        {/* ── Stats ── */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <StatCard label={lang === 'ar' ? 'إجمالي المرتجعات' : 'Total Refunds'} value={filtered.length} />
          <StatCard label={lang === 'ar' ? 'نقد' : 'Cash'}           value={cashCount}  color="text-green-600" />
          <StatCard label={lang === 'ar' ? 'تحويل بنكي' : 'Bank'}   value={bankCount}  color="text-blue-600" />
          <StatCard label={lang === 'ar' ? 'شيكات' : 'Checks'}       value={checkCount} color="text-purple-600" />
          <StatCard label={lang === 'ar' ? 'إجمالي المبلغ' : 'Total Amount'} value={fmt(totalAmount)} color="text-gray-900" />
        </div>

        {/* ── Filters ── */}
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder={lang === 'ar' ? 'بحث برقم المرتجع أو المورد...' : 'Search by refund # or supplier...'}
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
            />
          </div>
          <select
            value={filterMethod}
            onChange={e => setFilterMethod(e.target.value)}
            className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
          >
            <option value="ALL">{lang === 'ar' ? 'كل الطرق' : 'All Methods'}</option>
            <option value="CASH">{lang === 'ar' ? 'نقدي' : 'Cash'}</option>
            <option value="BANK">{lang === 'ar' ? 'تحويل بنكي' : 'Bank Transfer'}</option>
            <option value="CHECK">{lang === 'ar' ? 'شيك' : 'Check'}</option>
          </select>
          <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
            className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white" />
          <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
            className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white" />

          {(searchTerm || filterMethod !== 'ALL' || startDate || endDate) && (
            <button
              onClick={() => { setSearchTerm(''); setFilterMethod('ALL'); setStartDate(''); setEndDate(''); }}
              className="text-sm text-indigo-600 hover:underline"
            >
              {lang === 'ar' ? 'مسح الفلاتر' : 'Clear'}
            </button>
          )}
        </div>

        {/* ── Table ── */}
        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
          {filtered.length === 0 ? (
            <div className="p-16 text-center">
              <DollarSign className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="font-medium text-gray-600 mb-4">
                {lang === 'ar' ? 'لا توجد مرتجعات' : 'No refunds found'}
              </p>
              <button
                onClick={() => navigate('/finance/supplier-refunds/create')}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition font-semibold text-sm"
              >
                <Plus className="w-4 h-4" />
                {lang === 'ar' ? 'إنشاء مرتجع جديد' : 'Create First Refund'}
              </button>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <SortHeader label={lang === 'ar' ? 'رقم المرتجع' : 'Refund #'} field="refundNo"   sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                  <SortHeader label={lang === 'ar' ? 'المورد'       : 'Supplier'} field="supplier"  sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                  <SortHeader label={lang === 'ar' ? 'الطريقة'      : 'Method'}   field="method"    sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                  <SortHeader label={lang === 'ar' ? 'المبلغ'        : 'Amount'}  field="amount"    sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                  <SortHeader label={lang === 'ar' ? 'التاريخ'       : 'Date'}    field="refundDate" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                  <SortHeader label={lang === 'ar' ? 'أنشئ بواسطة'  : 'Created By'} field="creator" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map(refund => (
                  <tr key={refund._id} className="hover:bg-gray-50/60 transition">

                    {/* Refund # */}
                    <td className="px-4 py-3.5">
                      <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                        #{refund.refundNo}
                      </span>
                    </td>

                    {/* Supplier */}
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
                          <span className="text-indigo-600 font-semibold text-sm">
                            {(lang === 'ar' ? refund.supplier?.nameAr : refund.supplier?.nameEn)?.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 text-sm">
                            {lang === 'ar' ? refund.supplier?.nameAr : refund.supplier?.nameEn}
                          </p>
                          <p className="text-xs text-gray-400">{refund.supplier?.code}</p>
                        </div>
                      </div>
                    </td>

                    {/* Method */}
                    <td className="px-4 py-3.5">
                      <MethodBadge method={refund.method} lang={lang} />
                    </td>

                    {/* Amount */}
                    <td className="px-4 py-3.5">
                      <span className="font-semibold text-sm text-red-600">
                        {fmt(refund.amount)}
                      </span>
                    </td>

                    {/* Date */}
                    <td className="px-4 py-3.5 text-sm text-gray-500">
                      {fmtDate(refund.refundDate)}
                    </td>

                    {/* Creator */}
                    <td className="px-4 py-3.5 text-sm text-gray-500">
                      {refund.creator?.name || '—'}
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3.5 text-right">
                      <button
                        onClick={() => navigate(`/finance/supplier-refunds/${refund._id}`, { state: { refund } })}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition font-medium text-sm"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        {lang === 'ar' ? 'تفاصيل' : 'Details'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

export default SupplierRefundsList;