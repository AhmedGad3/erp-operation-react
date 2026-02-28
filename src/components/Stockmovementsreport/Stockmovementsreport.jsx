import React, { useState, useMemo } from 'react';
import { Loader2, TrendingDown, TrendingUp, Package, Warehouse } from 'lucide-react';
import axiosInstance from '../../utils/axiosInstance';
import { exportToPDF } from '../../utils/pdfExport';
import { exportToExcel } from '../../utils/excelExport';
import { fmtDate, fmt, renderMovementTypeCell } from '../../utils/Reportutils';

import StatisticsCards from '../StatisicsCards/StatisicsCards';
import ReportsTable from '../ReportsTable/ReportsTable';
import ColumnFiltersPanel from '../CloumnFiltersPanel/CloumnFiltersPanel';

export default function StockMovementsReport({ isAr }) {
  const [rawMovements,      setRawMovements]      = useState([]);
  const [rawPurchases,      setRawPurchases]      = useState([]);
  const [rawReturns,        setRawReturns]        = useState([]);
  const [rawMaterialIssues, setRawMaterialIssues] = useState([]);
  const [materials,         setMaterials]         = useState([]);
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
      const [resMovements, resPurchases, resReturns, resMaterialIssues, resMaterials] = await Promise.all([
        axiosInstance.get('/stock-movement/movements'),
        axiosInstance.get('/purchases'),
        axiosInstance.get('/purchases/return'),
        axiosInstance.get('/projects/material-issue'),
        axiosInstance.get('/materials'),
      ]);
      setRawMovements(     resMovements.data?.result      || []);
      setRawPurchases(     resPurchases.data?.result      || []);
      setRawReturns(       resReturns.data?.result        || []);
      setRawMaterialIssues(resMaterialIssues.data?.result || []);
      setMaterials(        resMaterials.data?.result      || []);
      setHasLoaded(true);
    } catch (e) {
      setError(e.message || 'خطأ في جلب البيانات');
    } finally {
      setLoading(false);
    }
  };

  const getMaterialName = (id) => {
    const mat = materials.find(m => m._id === id);
    if (!mat) return id || '—';
    return isAr ? (mat.nameAr || mat.name) : (mat.name || mat.nameAr);
  };

  const movementLabelLocal = (raw) => {
    const labels = {
      IN:             { ar: 'استلام',        en: 'Receipt'      },
      PROJECT_ISSUE:  { ar: 'صرف للمشروع',  en: 'Project Issue'},
      RETURN_OUT:     { ar: 'مرتجع',         en: 'Return'       },
      ADJUSTMENT_IN:  { ar: 'تعديل زيادة',  en: 'Adj. In'      },
      ADJUSTMENT_OUT: { ar: 'تعديل نقص',    en: 'Adj. Out'     },
    };
    return labels[raw]?.[isAr ? 'ar' : 'en'] ?? raw ?? '—';
  };

  const stockMovementRows = useMemo(() =>
    rawMovements.map(m => {
      let createdBy = '—';
      if (m.createdBy) {
        createdBy = m.createdBy.username || m.createdBy.name || '—';
      } else if (m.referenceId && m.referenceType) {
        switch (m.referenceType) {
          case 'Purchase':
          case 'PurchaseInvoice': {
            const purchase = rawPurchases.find(p => p._id === m.referenceId);
            if (purchase?.createdBy) createdBy = purchase.createdBy.username || purchase.createdBy.name || '—';
            break;
          }
          case 'PurchaseReturn': {
            const returnDoc = rawReturns.find(r => r._id === m.referenceId);
            if (returnDoc?.createdBy) createdBy = returnDoc.createdBy.username || returnDoc.createdBy.name || '—';
            break;
          }
          case 'MaterialIssue':
          case 'ProjectIssue': {
            const issue = rawMaterialIssues.find(i => i._id === m.referenceId);
            if (issue?.createdBy) createdBy = issue.createdBy.username || issue.createdBy.name || '—';
            break;
          }
        }
      }
      return {
        id: m._id,
        date: fmtDate(m.movementDate),
        movementNo: m.movementNo,
        type: movementLabelLocal(m.type),
        typeRaw: m.type,
        materialId: getMaterialName(m.materialId),
        quantity: m.quantity,
        balanceAfter: m.balanceAfter,
        unitPrice: m.unitPrice != null ? fmt(m.unitPrice) : '—',
        referenceType: m.referenceType,
        reference: m.referenceId,
        createdBy,
        notes: m.notes || '—',
      };
    }),
    [rawMovements, isAr, materials, rawPurchases, rawReturns, rawMaterialIssues]
  );

  const columns = [
    { key: 'date',          labelAr: 'التاريخ',        labelEn: 'Date'         },
    { key: 'movementNo',    labelAr: 'رقم الحركة',     labelEn: 'Mov. #'       },
    { key: 'type',          labelAr: 'النوع',           labelEn: 'Type'         },
    { key: 'materialId',    labelAr: 'المادة',          labelEn: 'Material'     },
    { key: 'quantity',      labelAr: 'الكمية',          labelEn: 'Qty'          },
    { key: 'balanceAfter',  labelAr: 'الرصيد بعد',     labelEn: 'Bal. After'   },
    { key: 'unitPrice',     labelAr: 'السعر',           labelEn: 'Unit Price'   },
    { key: 'referenceType', labelAr: 'نوع المرجع',     labelEn: 'Ref. Type'    },
    { key: 'createdBy',     labelAr: 'أنشئ بواسطة',   labelEn: 'Created By'   },
    { key: 'notes',         labelAr: 'ملاحظات',         labelEn: 'Notes'        },
  ];

  const statistics = useMemo(() => {
    const totalIn  = rawMovements.filter(m => m.type === 'IN'           || m.type === 'ADJUSTMENT_IN' ).reduce((s, m) => s + m.quantity, 0);
    const totalOut = rawMovements.filter(m => m.type === 'PROJECT_ISSUE'|| m.type === 'RETURN_OUT' || m.type === 'ADJUSTMENT_OUT').reduce((s, m) => s + m.quantity, 0);
    return [
      { label: isAr ? 'إجمالي الوارد'  : 'Total In',        value: fmt(totalIn),              color: 'green',  icon: TrendingDown },
      { label: isAr ? 'إجمالي الصادر'  : 'Total Out',       value: fmt(totalOut),             color: 'red',    icon: TrendingUp   },
      { label: isAr ? 'الفرق'           : 'Net',             value: fmt(totalIn - totalOut),   color: 'blue',   icon: Package      },
      { label: isAr ? 'عدد الحركات'    : 'Movement Count',  value: rawMovements.length,       color: 'purple', icon: Warehouse    },
    ];
  }, [rawMovements, isAr]);

  const filteredData = useMemo(() => {
    let data = stockMovementRows;
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
  }, [stockMovementRows, dateFrom, dateTo, searchTerm, columnFilters]);

  const handleExportExcel = () => {
    const headers = columns.map(c => ({ [c.key]: isAr ? c.labelAr : c.labelEn }));
    exportToExcel(filteredData, headers, isAr ? 'حركات المخزون' : 'Stock Movements', isAr ? 'ar' : 'en');
  };
  const handleExportPDF = () => {
    const headers = columns.map(c => ({ [c.key]: isAr ? c.labelAr : c.labelEn }));
    const title   = isAr ? 'حركات المخزون' : 'Stock Movements';
    exportToPDF(filteredData, headers, title, isAr ? 'ar' : 'en', title);
  };

  const renderCell = (col, row) => {
    const val = row[col.key];
    if (col.key === 'type') return renderMovementTypeCell(val, row.typeRaw);
    return val ?? '—';
  };

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
                <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                  placeholder={isAr ? 'بحث...' : 'Search...'}
                  className="bg-transparent text-sm outline-none w-full" />
              </div>

              <button onClick={() => setShowColumnFilters(v => !v)}
                className={`px-3 py-2 rounded-lg text-sm font-semibold border transition flex items-center gap-1 ${showColumnFilters || activeFilterCount > 0 ? 'bg-indigo-50 border-indigo-300 text-indigo-700' : 'bg-white border-gray-200 text-gray-600 hover:border-indigo-200'}`}>
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h18M7 8h10M11 12h2M9 16h6"/></svg>
                {isAr ? 'فلاتر الأعمدة' : 'Col. Filters'}
                {activeFilterCount > 0 && <span className="bg-indigo-600 text-white text-xs rounded-full px-1.5 py-0.5 font-bold">{activeFilterCount}</span>}
              </button>

              <button onClick={handleExportExcel}
                className="px-3 py-2 rounded-lg text-sm font-semibold border border-green-200 bg-green-50 text-green-700 hover:bg-green-100 transition flex items-center gap-1">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3M3 17V7a2 2 0 012-2h6l2 2h7a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z"/></svg>
                Excel
              </button>

              <button onClick={handleExportPDF}
                className="px-3 py-2 rounded-lg text-sm font-semibold border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 transition flex items-center gap-1">
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
            <button onClick={fetchData} className="mt-3 px-4 py-1.5 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 transition">
              {isAr ? 'إعادة المحاولة' : 'Retry'}
            </button>
          </div>
        )}

        {!loading && !error && !hasLoaded && (
          <div className="flex flex-col items-center justify-center py-24 text-gray-400">
            <Warehouse className="w-14 h-14 mb-4 opacity-30" />
            <p className="text-base font-semibold text-gray-500">
              {isAr ? 'اختر الفترة واضغط تطبيق' : 'Select date range and press Apply'}
            </p>
          </div>
        )}

        {hasLoaded && !loading && (
          <>
            <StatisticsCards statistics={statistics} />
            <ReportsTable columns={columns} filteredData={filteredData} allData={stockMovementRows}
              isAr={isAr} activeTab="stockMovements" renderCell={renderCell} />
          </>
        )}
      </div>

      <ColumnFiltersPanel showColumnFilters={showColumnFilters} setShowColumnFilters={setShowColumnFilters}
        columns={columns} columnFilters={columnFilters} setColumnFilters={setColumnFilters}
        activeFilterCount={activeFilterCount} isAr={isAr} />
    </div>
  );
}