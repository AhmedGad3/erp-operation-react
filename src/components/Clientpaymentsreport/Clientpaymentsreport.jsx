import React, { useState, useMemo } from 'react';
import { Loader2, DollarSign, TrendingUp, CreditCard, Users } from 'lucide-react';
import axiosInstance from '../../utils/axiosInstance';
import { exportToPDF } from '../../utils/pdfExport';
import { exportToExcel } from '../../utils/excelExport';
import { fmtDate, fmt } from '../../utils/Reportutils';

import StatisticsCards from '../StatisicsCards/StatisicsCards';
import ReportsTable from '../ReportsTable/ReportsTable';
import ColumnFiltersPanel from '../CloumnFiltersPanel/CloumnFiltersPanel';

export default function ClientPaymentsReport({ isAr }) {
  const [rawClientPayments, setRawClientPayments] = useState([]);
  const [loading,           setLoading]           = useState(false);
  const [error,             setError]             = useState(null);
  const [hasLoaded,         setHasLoaded]         = useState(false);

  const [dateFrom,          setDateFrom]          = useState('2024-01-01');
  const [dateTo,            setDateTo]            = useState('2026-12-31');
  const [searchTerm,        setSearchTerm]        = useState('');
  const [columnFilters,     setColumnFilters]     = useState({});
  const [showColumnFilters, setShowColumnFilters] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await axiosInstance.get('/projects/payments');
      setRawClientPayments(res.data?.result || []);
      setHasLoaded(true);
    } catch (e) {
      setError(e.message || 'خطأ في جلب البيانات');
    } finally {
      setLoading(false);
    }
  };

  const methodLabelLocal = (raw) => {
    const labels = {
      CASH:     { ar: 'نقد',        en: 'Cash'          },
      CHEQUE:   { ar: 'شيك',        en: 'Cheque'        },
      CHECK:    { ar: 'شيك',        en: 'Check'         },
      TRANSFER: { ar: 'تحويل بنكي', en: 'Bank Transfer' },
    };
    return labels[raw]?.[isAr ? 'ar' : 'en'] ?? raw ?? '—';
  };

  const clientPaymentRows = useMemo(() =>
    rawClientPayments.map(p => ({
      id: p._id,
      date: fmtDate(p.paymentDate),
      paymentNo: p.paymentNo,
      client: isAr ? p.clientId?.nameAr : p.clientId?.nameEn,
      clientCode: p.clientId?.code,
      project: isAr ? p.projectId?.nameAr : p.projectId?.nameEn,
      projectCode: p.projectId?.code,
      contractPayment:   fmt(p.contractPayment),
      additionalPayment: fmt(p.additionalPayment),
      totalAmount:       fmt(p.amount),
      method:   methodLabelLocal(p.method),
      chequeNo: p.chequeNo || '—',
      createdBy: p.createdBy?.username || p.createdBy?.name || '—',
      notes: p.notes || '—',
    })),
    [rawClientPayments, isAr]
  );

  const columns = [
    { key: 'date',              labelAr: 'التاريخ',          labelEn: 'Date'              },
    { key: 'paymentNo',         labelAr: 'رقم الدفعة',       labelEn: 'Payment #'         },
    { key: 'client',            labelAr: 'العميل',            labelEn: 'Client'            },
    { key: 'clientCode',        labelAr: 'كود العميل',        labelEn: 'Client Code'       },
    { key: 'project',           labelAr: 'المشروع',           labelEn: 'Project'           },
    { key: 'projectCode',       labelAr: 'كود المشروع',       labelEn: 'Proj. Code'        },
    { key: 'contractPayment',   labelAr: 'دفعة العقد',        labelEn: 'Contract Pay.'     },
    { key: 'additionalPayment', labelAr: 'دفعة إضافية',       labelEn: 'Additional Pay.'   },
    { key: 'totalAmount',       labelAr: 'الإجمالي',          labelEn: 'Total'             },
    { key: 'method',            labelAr: 'الطريقة',           labelEn: 'Method'            },
    { key: 'chequeNo',          labelAr: 'رقم الشيك',         labelEn: 'Cheque #'          },
    { key: 'createdBy',         labelAr: 'أنشئ بواسطة',      labelEn: 'Created By'        },
    { key: 'notes',             labelAr: 'ملاحظات',           labelEn: 'Notes'             },
  ];

  const statistics = useMemo(() => {
    const totalContract   = rawClientPayments.reduce((s, p) => s + (p.contractPayment   || 0), 0);
    const totalAdditional = rawClientPayments.reduce((s, p) => s + (p.additionalPayment || 0), 0);
    const totalAmount     = rawClientPayments.reduce((s, p) => s + (p.amount            || 0), 0);
    const projects        = new Set(rawClientPayments.map(p => p.projectId?._id)).size;
    return [
      { label: isAr ? 'إجمالي دفعات العقد'      : 'Total Contract Payments',    value: fmt(totalContract),   color: 'green',  icon: DollarSign },
      { label: isAr ? 'إجمالي الدفعات الإضافية' : 'Total Additional Payments',  value: fmt(totalAdditional), color: 'blue',   icon: TrendingUp },
      { label: isAr ? 'الإجمالي الكلي'           : 'Grand Total',                value: fmt(totalAmount),     color: 'purple', icon: CreditCard },
      { label: isAr ? 'عدد المشاريع'             : 'Projects',                   value: projects,             color: 'orange', icon: Users      },
    ];
  }, [rawClientPayments, isAr]);

  const filteredData = useMemo(() => {
    let data = clientPaymentRows;
    if (dateFrom) data = data.filter(r => (r.date || '') >= dateFrom);
    if (dateTo)   data = data.filter(r => (r.date || '') <= dateTo);
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      data = data.filter(row => Object.values(row).some(val => String(val).toLowerCase().includes(q)));
    }
    Object.keys(columnFilters).forEach(key => {
      if (columnFilters[key]) {
        const q = columnFilters[key].toLowerCase();
        data = data.filter(row => String(row[key] ?? '').toLowerCase().includes(q));
      }
    });
    return data;
  }, [clientPaymentRows, dateFrom, dateTo, searchTerm, columnFilters]);

  const handleExportExcel = () => {
    const headers = columns.map(c => ({ [c.key]: isAr ? c.labelAr : c.labelEn }));
    exportToExcel(filteredData, headers, isAr ? 'دفعات العملاء' : 'Client Payments', isAr ? 'ar' : 'en');
  };
  const handleExportPDF = () => {
    const headers = columns.map(c => ({ [c.key]: isAr ? c.labelAr : c.labelEn }));
    const title   = isAr ? 'دفعات العملاء' : 'Client Payments';
    exportToPDF(filteredData, headers, title, isAr ? 'ar' : 'en', title);
  };

  const renderCell        = (col, row) => row[col.key] ?? '—';
  const activeFilterCount = Object.keys(columnFilters).filter(k => columnFilters[k]).length;

  return (
    <div className="flex">
      <div className="flex-1 min-w-0"
        style={{ ...(showColumnFilters ? (isAr ? { marginLeft: '320px' } : { marginRight: '320px' }) : {}), transition: 'margin 0.3s ease' }}>

        {/* ── TOP BAR ── */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 mb-4">
          <div className="flex flex-wrap gap-3 items-end">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-gray-500">{isAr ? 'من تاريخ' : 'From'}</label>
              <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-gray-500">{isAr ? 'إلى تاريخ' : 'To'}</label>
              <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
            </div>
            <button onClick={fetchData}
              className="px-5 py-2 rounded-lg text-sm font-bold bg-indigo-600 hover:bg-indigo-700 text-white transition flex items-center gap-2">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : (isAr ? 'تطبيق' : 'Apply')}
            </button>
            <div className="flex-1" />
            {hasLoaded && (<>
              <div className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-2 bg-gray-50" style={{ minWidth: 180 }}>
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z"/></svg>
                <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder={isAr ? 'بحث...' : 'Search...'} className="bg-transparent text-sm outline-none w-full" />
              </div>
              <button onClick={() => setShowColumnFilters(v => !v)}
                className={`px-3 py-2 rounded-lg text-sm font-semibold border transition flex items-center gap-1 ${showColumnFilters || activeFilterCount > 0 ? 'bg-indigo-50 border-indigo-300 text-indigo-700' : 'bg-white border-gray-200 text-gray-600 hover:border-indigo-200'}`}>
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
            <ReportsTable columns={columns} filteredData={filteredData} allData={clientPaymentRows} isAr={isAr} activeTab="clientPayments" renderCell={renderCell} />
          </>
        )}
      </div>
      <ColumnFiltersPanel showColumnFilters={showColumnFilters} setShowColumnFilters={setShowColumnFilters} columns={columns} columnFilters={columnFilters} setColumnFilters={setColumnFilters} activeFilterCount={activeFilterCount} isAr={isAr} />
    </div>
  );
}