import React, { useState, useMemo } from 'react';
import { Loader2, DollarSign, CreditCard, TrendingUp, Users } from 'lucide-react';
import axiosInstance from '../../utils/axiosInstance';
import { exportToPDF } from '../../utils/pdfExport';
import { exportToExcel } from '../../utils/excelExport';
import { fmtDate, fmt, renderLedgerTypeCell } from '../../utils/Reportutils';

import StatisticsCards from '../StatisicsCards/StatisicsCards';
import ReportsTable from '../ReportsTable/ReportsTable';
import ColumnFiltersPanel from '../CloumnFiltersPanel/CloumnFiltersPanel';

export default function ClientLedgerReport({ isAr }) {
  const [rawClientLedger, setRawClientLedger] = useState([]);
  const [clients,         setClients]         = useState([]);
  const [rawProjects,     setRawProjects]     = useState([]);
  const [loading,         setLoading]         = useState(false);
  const [error,           setError]           = useState(null);
  const [hasLoaded,       setHasLoaded]       = useState(false);

  const [dateFrom,          setDateFrom]          = useState('2024-01-01');
  const [dateTo,            setDateTo]            = useState('2026-12-31');
  const [searchTerm,        setSearchTerm]        = useState('');
  const [columnFilters,     setColumnFilters]     = useState({});
  const [showColumnFilters, setShowColumnFilters] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [resLedger, resClients, resProjects] = await Promise.all([
        axiosInstance.get('/ledger/clients'),
        axiosInstance.get('/clients'),
        axiosInstance.get('/projects'),
      ]);
      setRawClientLedger(resLedger.data?.result   || []);
      setClients(        resClients.data?.result   || []);
      setRawProjects(    resProjects.data?.result  || []);
      setHasLoaded(true);
    } catch (e) {
      setError(e.message || 'خطأ في جلب البيانات');
    } finally {
      setLoading(false);
    }
  };

  const getClientName  = (id) => { const c = clients.find(x => x._id === id); if (!c) return id || '—'; return isAr ? (c.nameAr || c.nameEn) : (c.nameEn || c.nameAr); };
  const getProjectName = (id) => { const p = rawProjects.find(x => x._id === id); if (!p) return id || '—'; return isAr ? (p.nameAr || p.nameEn) : (p.nameEn || p.nameAr); };

  const ledgerTypeLabelLocal = (raw) => {
    const labels = { purchase: { ar: 'فاتورة شراء', en: 'Purchase' }, payment: { ar: 'دفعة', en: 'Payment' }, return: { ar: 'مرتجع', en: 'Return' }, refund: { ar: 'استرداد', en: 'Refund' } };
    return labels[raw]?.[isAr ? 'ar' : 'en'] ?? raw ?? '—';
  };

  const clientLedgerRows = useMemo(() =>
    rawClientLedger.map(t => ({
      id: t._id,
      date: fmtDate(t.transactionDate),
      transactionNo: t.transactionNo,
      client: getClientName(t.clientId?._id || t.clientId),
      clientCode: t.clientId?.code || '—',
      project: getProjectName(t.projectId?._id || t.projectId),
      projectCode: t.projectId?.code || '—',
      type: ledgerTypeLabelLocal(t.type),
      debit: fmt(t.debit),
      credit: fmt(t.credit),
      balanceAfter: fmt(t.balanceAfter),
      referenceType: t.referenceType,
      referenceId: t.referenceId,
      createdBy: t.createdBy?.username || t.createdBy?.name || '—',
    })),
    [rawClientLedger, isAr, clients, rawProjects]
  );

  const columns = [
    { key: 'date',          labelAr: 'التاريخ',        labelEn: 'Date'         },
    { key: 'transactionNo', labelAr: 'رقم العملية',    labelEn: 'Txn #'        },
    { key: 'client',        labelAr: 'العميل',          labelEn: 'Client'       },
    { key: 'clientCode',    labelAr: 'كود العميل',      labelEn: 'Client Code'  },
    { key: 'project',       labelAr: 'المشروع',         labelEn: 'Project'      },
    { key: 'projectCode',   labelAr: 'كود المشروع',     labelEn: 'Project Code' },
    { key: 'type',          labelAr: 'النوع',           labelEn: 'Type'         },
    { key: 'debit',         labelAr: 'مدين',            labelEn: 'Debit'        },
    { key: 'credit',        labelAr: 'دائن',            labelEn: 'Credit'       },
    { key: 'balanceAfter',  labelAr: 'الرصيد',          labelEn: 'Balance'      },
    { key: 'referenceType', labelAr: 'نوع المرجع',      labelEn: 'Ref. Type'    },
    { key: 'createdBy',     labelAr: 'أنشئ بواسطة',    labelEn: 'Created By'   },
  ];

  const statistics = useMemo(() => {
    const totalDebit   = rawClientLedger.reduce((s, t) => s + (t.debit  || 0), 0);
    const totalCredit  = rawClientLedger.reduce((s, t) => s + (t.credit || 0), 0);
    const clientsCount = new Set(rawClientLedger.map(t => t.clientId?._id || t.clientId)).size;
    return [
      { label: isAr ? 'إجمالي المدين' : 'Total Debit',  value: fmt(totalDebit),               color: 'blue',   icon: DollarSign },
      { label: isAr ? 'إجمالي الدائن' : 'Total Credit', value: fmt(totalCredit),              color: 'green',  icon: CreditCard },
      { label: isAr ? 'الرصيد الصافي' : 'Net Balance',  value: fmt(totalDebit - totalCredit), color: 'red',    icon: TrendingUp },
      { label: isAr ? 'عدد العملاء'   : 'Clients',      value: clientsCount,                  color: 'orange', icon: Users      },
    ];
  }, [rawClientLedger, isAr]);

  const filteredData = useMemo(() => {
    let data = clientLedgerRows;
    if (dateFrom) data = data.filter(r => (r.date || '') >= dateFrom);
    if (dateTo)   data = data.filter(r => (r.date || '') <= dateTo);
    if (searchTerm) { const q = searchTerm.toLowerCase(); data = data.filter(row => Object.values(row).some(val => String(val).toLowerCase().includes(q))); }
    Object.keys(columnFilters).forEach(key => { if (columnFilters[key]) { const q = columnFilters[key].toLowerCase(); data = data.filter(row => String(row[key] ?? '').toLowerCase().includes(q)); } });
    return data;
  }, [clientLedgerRows, dateFrom, dateTo, searchTerm, columnFilters]);

  const handleExportExcel = () => { const h = columns.map(c => ({ [c.key]: isAr ? c.labelAr : c.labelEn })); exportToExcel(filteredData, h, isAr ? 'دفتر العملاء' : 'Client Ledger', isAr ? 'ar' : 'en'); };
  const handleExportPDF   = () => { const h = columns.map(c => ({ [c.key]: isAr ? c.labelAr : c.labelEn })); const t = isAr ? 'دفتر العملاء' : 'Client Ledger'; exportToPDF(filteredData, h, t, isAr ? 'ar' : 'en', t); };
  const renderCell        = (col, row) => { const val = row[col.key]; if (col.key === 'type') return renderLedgerTypeCell(val, isAr); return val ?? '—'; };
  const activeFilterCount = Object.keys(columnFilters).filter(k => columnFilters[k]).length;

  return (
    <div className="flex">
      <div className="flex-1 min-w-0" style={{ ...(showColumnFilters ? (isAr ? { marginLeft: '320px' } : { marginRight: '320px' }) : {}), transition: 'margin 0.3s ease' }}>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 mb-4">
          <div className="flex flex-wrap gap-3 items-end">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-gray-500">{isAr ? 'من تاريخ' : 'From'}</label>
              <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-gray-500">{isAr ? 'إلى تاريخ' : 'To'}</label>
              <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
            </div>
            <button onClick={fetchData} className="px-5 py-2 rounded-lg text-sm font-bold bg-indigo-600 hover:bg-indigo-700 text-white transition flex items-center gap-2">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : (isAr ? 'تطبيق' : 'Apply')}
            </button>
            <div className="flex-1" />
            {hasLoaded && (<>
              <div className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-2 bg-gray-50" style={{ minWidth: 180 }}>
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z"/></svg>
                <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder={isAr ? 'بحث...' : 'Search...'} className="bg-transparent text-sm outline-none w-full" />
              </div>
              <button onClick={() => setShowColumnFilters(v => !v)} className={`px-3 py-2 rounded-lg text-sm font-semibold border transition flex items-center gap-1 ${showColumnFilters || activeFilterCount > 0 ? 'bg-indigo-50 border-indigo-300 text-indigo-700' : 'bg-white border-gray-200 text-gray-600 hover:border-indigo-200'}`}>
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h18M7 8h10M11 12h2M9 16h6"/></svg>
                {isAr ? 'فلاتر الأعمدة' : 'Col. Filters'}
                {activeFilterCount > 0 && <span className="bg-indigo-600 text-white text-xs rounded-full px-1.5 py-0.5 font-bold">{activeFilterCount}</span>}
              </button>
              <button onClick={handleExportExcel} className="px-3 py-2 rounded-lg text-sm font-semibold border border-green-200 bg-green-50 text-green-700 hover:bg-green-100 transition flex items-center gap-1">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3M3 17V7a2 2 0 012-2h6l2 2h7a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z"/></svg>
                Excel
              </button>
              <button onClick={handleExportPDF} className="px-3 py-2 rounded-lg text-sm font-semibold border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 transition flex items-center gap-1">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"/></svg>
                PDF
              </button>
            </>)}
          </div>
        </div>

        {loading && <div className="flex items-center justify-center py-24"><Loader2 className="w-10 h-10 text-indigo-600 animate-spin" /></div>}
        {error && !loading && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
            <p className="text-red-700 font-semibold">{isAr ? 'حدث خطأ' : 'Error'}</p>
            <p className="text-red-500 text-sm mt-1">{error}</p>
            <button onClick={fetchData} className="mt-3 px-4 py-1.5 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 transition">{isAr ? 'إعادة المحاولة' : 'Retry'}</button>
          </div>
        )}
        {!loading && !error && !hasLoaded && (
          <div className="flex flex-col items-center justify-center py-24 text-gray-400">
            <Users className="w-14 h-14 mb-4 opacity-30" />
            <p className="text-base font-semibold text-gray-500">{isAr ? 'اختر الفترة واضغط تطبيق' : 'Select date range and press Apply'}</p>
          </div>
        )}
        {hasLoaded && !loading && (
          <>
            <StatisticsCards statistics={statistics} />
            <ReportsTable columns={columns} filteredData={filteredData} allData={clientLedgerRows} isAr={isAr} activeTab="clientLedger" renderCell={renderCell} />
          </>
        )}
      </div>
      <ColumnFiltersPanel showColumnFilters={showColumnFilters} setShowColumnFilters={setShowColumnFilters} columns={columns} columnFilters={columnFilters} setColumnFilters={setColumnFilters} activeFilterCount={activeFilterCount} isAr={isAr} />
    </div>
  );
}