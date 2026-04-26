import React, { useState, useEffect, useContext } from 'react';
import {
  CreditCard, Search, Plus, Download,
  ChevronUp, ChevronDown,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import axiosInstance, { getErrorMessage } from '../../utils/axiosInstance';
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
const MethodBadge = ({ method, chequeNo, lang }) => {
  const map = {
    CASH:     { label: { ar: 'نقد', en: 'Cash' },           cls: 'bg-green-100 text-green-700' },
    CHEQUE:   { label: { ar: 'شيك', en: 'Cheque' },         cls: 'bg-blue-100 text-blue-700' },
    TRANSFER: { label: { ar: 'تحويل بنكي', en: 'Transfer'}, cls: 'bg-purple-100 text-purple-700' },
  };
  const cfg = map[method] ?? { label: { ar: method, en: method }, cls: 'bg-gray-100 text-gray-700' };
  return (
    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${cfg.cls}`}>
      {lang === 'ar' ? cfg.label.ar : cfg.label.en}
      {method === 'CHEQUE' && chequeNo && (
        <span className="ml-1 font-normal opacity-70">({chequeNo})</span>
      )}
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
const PaymentsList = () => {
  const { lang } = useContext(LanguageContext);
  const navigate  = useNavigate();

  const [payments,     setPayments]     = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [searchTerm,   setSearchTerm]   = useState('');
  const [filterMethod, setFilterMethod] = useState('ALL');
  const [sortField,    setSortField]    = useState('paymentDate');
  const [sortDir,      setSortDir]      = useState('desc');

  useEffect(() => { fetchPayments(); }, []);

  const fetchPayments = async () => {
    try {
      setLoading(true);
      const res = await axiosInstance.get('/projects/payments');
      setPayments(Array.isArray(res.data) ? res.data : (res.data.result || []));
    } catch (err) {
      toast.error(getErrorMessage(err, lang === 'ar' ? 'فشل تحميل الدفعات' : 'Failed to load payments'));
    } finally {
      setLoading(false);
    }
  };

  const handleSort = (field) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('asc'); }
  };

  // ── Derived ───────────────────────────────────────────
  const filtered = payments
    .filter(p => {
      const q = searchTerm.toLowerCase();
      const matchSearch = !q ||
        p.clientId?.nameAr?.toLowerCase().includes(q) ||
        p.clientId?.nameEn?.toLowerCase().includes(q) ||
        p.projectId?.nameAr?.toLowerCase().includes(q) ||
        p.projectId?.nameEn?.toLowerCase().includes(q) ||
        p.projectId?.code?.toLowerCase().includes(q) ||
        p.chequeNo?.toLowerCase().includes(q);
      const matchMethod = filterMethod === 'ALL' || p.method === filterMethod;
      return matchSearch && matchMethod;
    })
    .sort((a, b) => {
      let va = a[sortField] ?? '';
      let vb = b[sortField] ?? '';
      if (sortField === 'paymentDate') { va = new Date(va); vb = new Date(vb); }
      if (sortField === 'amount')      { va = Number(va);   vb = Number(vb); }
      if (typeof va === 'string') va = va.toLowerCase();
      if (typeof vb === 'string') vb = vb.toLowerCase();
      return sortDir === 'asc' ? (va > vb ? 1 : -1) : (va < vb ? 1 : -1);
    });

  const totalAmount      = filtered.reduce((s, p) => s + (p.amount || 0), 0);
  const cashCount        = filtered.filter(p => p.method === 'CASH').length;
  const chequeCount      = filtered.filter(p => p.method === 'CHEQUE').length;
  const transferCount    = filtered.filter(p => p.method === 'TRANSFER').length;

  const fmt = (v) => new Intl.NumberFormat(lang === 'ar' ? 'ar-EG' : 'en-US', {
    style: 'currency', currency: 'EGP', minimumFractionDigits: 0,
  }).format(v);

  const fmtDate = (d) => new Date(d).toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
  });

  const handleExport = () => {
    if (!filtered.length) { toast.error(lang === 'ar' ? 'لا توجد بيانات للتصدير' : 'No data to export'); return; }
    const rows = filtered.map(p => ({
      [lang === 'ar' ? 'رقم الدفعة'      : 'Payment No']:         p.paymentNo || '',
      [lang === 'ar' ? 'العميل'           : 'Client']:             lang === 'ar' ? p.clientId?.nameAr  : p.clientId?.nameEn,
      [lang === 'ar' ? 'المشروع'          : 'Project']:            lang === 'ar' ? p.projectId?.nameAr : p.projectId?.nameEn,
      [lang === 'ar' ? 'الكود'            : 'Code']:               p.projectId?.code || '',
      [lang === 'ar' ? 'الطريقة'          : 'Method']:             p.method,
      [lang === 'ar' ? 'دفعة العقد'       : 'Contract Payment']:   p.contractPayment || 0,
      [lang === 'ar' ? 'الدفعة الإضافية'  : 'Additional Payment']: p.additionalPayment || 0,
      [lang === 'ar' ? 'الإجمالي'         : 'Total']:              p.amount || 0,
      [lang === 'ar' ? 'التاريخ'           : 'Date']:              fmtDate(p.paymentDate),
      [lang === 'ar' ? 'الملاحظات'        : 'Notes']:              p.notes || '',
    }));
    exportToExcel(rows, Object.keys(rows[0]).map(k => ({ [k]: k })),
      lang === 'ar' ? 'قائمة_الدفعات' : 'Payments_List', lang);
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
              {lang === 'ar' ? 'دفعات العملاء' : 'Client Payments'}
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              {lang === 'ar' ? 'عرض وإدارة جميع دفعات العملاء' : 'View and manage all client payments'}
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
              onClick={() => navigate('/finance/client-payments/create')}
              className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition font-semibold text-sm shadow-sm"
            >
              <Plus className="w-4 h-4" />
              {lang === 'ar' ? 'إضافة دفعة' : 'Add Payment'}
            </button>
          </div>
        </div>

        {/* ── Stats ── */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <StatCard label={lang === 'ar' ? 'إجمالي الدفعات' : 'Total Payments'} value={filtered.length} />
          <StatCard label={lang === 'ar' ? 'نقد' : 'Cash'}       value={cashCount}     color="text-green-600" />
          <StatCard label={lang === 'ar' ? 'شيكات' : 'Cheques'}  value={chequeCount}   color="text-blue-600" />
          <StatCard label={lang === 'ar' ? 'تحويلات' : 'Transfers'} value={transferCount} color="text-purple-600" />
          <StatCard label={lang === 'ar' ? 'الإجمالي' : 'Total Amount'} value={fmt(totalAmount)} />
        </div>

        {/* ── Filters ── */}
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder={lang === 'ar' ? 'بحث بالعميل أو المشروع...' : 'Search by client or project...'}
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
            <option value="ALL">{lang === 'ar' ? 'جميع الطرق' : 'All Methods'}</option>
            <option value="CASH">{lang === 'ar' ? 'نقد' : 'Cash'}</option>
            <option value="CHEQUE">{lang === 'ar' ? 'شيك' : 'Cheque'}</option>
            <option value="TRANSFER">{lang === 'ar' ? 'تحويل بنكي' : 'Transfer'}</option>
          </select>
          {(searchTerm || filterMethod !== 'ALL') && (
            <button
              onClick={() => { setSearchTerm(''); setFilterMethod('ALL'); }}
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
              <CreditCard className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="font-medium text-gray-600 mb-4">
                {lang === 'ar' ? 'لا توجد دفعات' : 'No payments found'}
              </p>
              <button
                onClick={() => navigate('/finance/client-payments/create')}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition font-semibold text-sm"
              >
                <Plus className="w-4 h-4" />
                {lang === 'ar' ? 'إضافة أول دفعة' : 'Add First Payment'}
              </button>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <SortHeader label={lang === 'ar' ? 'رقم الدفعة' : 'Payment #'} field="paymentNo"   sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                  <SortHeader label={lang === 'ar' ? 'العميل'      : 'Client'}    field="clientId"   sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                  <SortHeader label={lang === 'ar' ? 'المشروع'     : 'Project'}   field="projectId"  sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                  <SortHeader label={lang === 'ar' ? 'الطريقة'     : 'Method'}    field="method"     sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                  <SortHeader label={lang === 'ar' ? 'المبلغ'      : 'Amount'}    field="amount"     sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                  <SortHeader label={lang === 'ar' ? 'التاريخ'     : 'Date'}      field="paymentDate" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map(payment => (
                  <tr
                    key={payment._id}
                    className="hover:bg-gray-50/60 transition cursor-pointer"
                    onClick={() => navigate(`/finance/client-payments/${payment._id}`)}
                  >
                    {/* Payment # */}
                    <td className="px-4 py-3.5">
                      <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                        #{payment.paymentNo}
                      </span>
                    </td>

                    {/* Client */}
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
                          <span className="text-indigo-600 font-semibold text-sm">
                            {(lang === 'ar' ? payment.clientId?.nameAr : payment.clientId?.nameEn)?.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 text-sm">
                            {lang === 'ar' ? payment.clientId?.nameAr : payment.clientId?.nameEn}
                          </p>
                          <p className="text-xs text-gray-400">{payment.clientId?.code}</p>
                        </div>
                      </div>
                    </td>

                    {/* Project */}
                    <td className="px-4 py-3.5">
                      <p className="font-medium text-gray-900 text-sm">
                        {lang === 'ar' ? payment.projectId?.nameAr : payment.projectId?.nameEn}
                      </p>
                      <p className="text-xs text-gray-400">{payment.projectId?.code}</p>
                    </td>

                    {/* Method */}
                    <td className="px-4 py-3.5">
                      <MethodBadge method={payment.method} chequeNo={payment.chequeNo} lang={lang} />
                    </td>

                    {/* Amount */}
                    <td className="px-4 py-3.5">
                      <span className="font-semibold text-sm text-gray-900">{fmt(payment.amount)}</span>
                    </td>

                    {/* Date */}
                    <td className="px-4 py-3.5 text-sm text-gray-500">
                      {fmtDate(payment.paymentDate)}
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

export default PaymentsList;