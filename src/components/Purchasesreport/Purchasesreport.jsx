import React, { useState, useMemo } from 'react';
import { Loader2, ShoppingCart, TrendingDown, DollarSign, Users } from 'lucide-react';
import axiosInstance from '../../utils/axiosInstance';
import { exportToPDF } from '../../utils/pdfExport';
import { exportToExcel } from '../../utils/excelExport';
import { fmtDate, fmt, renderStatusCell } from '../../utils/Reportutils';

import StatisticsCards from '../StatisicsCards/StatisicsCards';
import FiltersBar from '../FiltersBar/FiltersBar';
import ReportsTable from '../ReportsTable/ReportsTable';
import ColumnFiltersPanel from '../CloumnFiltersPanel/CloumnFiltersPanel';

export default function PurchasesReport({ isAr }) {
  // ── State ─────────────────────────────────────────────────
  const [rawPurchases, setRawPurchases] = useState([]);
  const [rawReturns,   setRawReturns]   = useState([]);
  const [materials,    setMaterials]    = useState([]);
  const [loading,      setLoading]      = useState(false);
  const [error,        setError]        = useState(null);
  const [hasLoaded,    setHasLoaded]    = useState(false);

  // ── Filters ───────────────────────────────────────────────
  const [dateFrom,          setDateFrom]          = useState('2024-01-01');
  const [dateTo,            setDateTo]            = useState('2026-12-31');
  const [searchTerm,        setSearchTerm]        = useState('');
  const [columnFilters,     setColumnFilters]     = useState({});
  const [showColumnFilters, setShowColumnFilters] = useState(false);

  // ── Fetch on Apply ────────────────────────────────────────
  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [resPurchases, resReturns, resMaterials] = await Promise.all([
        axiosInstance.get('/purchases'),
        axiosInstance.get('/purchases/return'),
        axiosInstance.get('/materials'),
      ]);
      setRawPurchases(resPurchases.data?.result || []);
      setRawReturns(  resReturns.data?.result   || []);
      setMaterials(   resMaterials.data?.result || []);
      setHasLoaded(true);
    } catch (e) {
      setError(e.message || 'خطأ في جلب البيانات');
    } finally {
      setLoading(false);
    }
  };

  // ── Helpers ───────────────────────────────────────────────
  const getMaterialName = (id) => {
    const mat = materials.find(m => m._id === id);
    if (!mat) return id || '—';
    return isAr ? (mat.nameAr || mat.name) : (mat.name || mat.nameAr);
  };

  const statusLabel = (raw) => {
    const labels = {
      PAID:    { ar: 'مكتمل',        en: 'Paid'     },
      PARTIAL: { ar: 'جزئي',         en: 'Partial'  },
      PENDING: { ar: 'قيد التنفيذ',  en: 'Pending'  },
      UNPAID:  { ar: 'غير مدفوع',    en: 'Unpaid'   },
    };
    return labels[raw]?.[isAr ? 'ar' : 'en'] ?? raw ?? '—';
  };

  // ── Transform ─────────────────────────────────────────────
  const purchaseRows = useMemo(() => {
    const invoiceRows = rawPurchases.flatMap((inv, idx) =>
      (inv.items || []).map((item, i) => ({
        id: `INV-${inv.invoiceNo}-${i}`,
        date: fmtDate(inv.invoiceDate),
        invoiceNo: inv.invoiceNo,
        supplier: isAr ? inv.supplierId?.nameAr : inv.supplierId?.nameEn,
        supplierCode: inv.supplierId?.code,
        items: getMaterialName(item.materialId),
        quantity: item.quantity,
        unitPrice: fmt(item.unitPrice),
        total: fmt(item.total),
        status: statusLabel(inv.status),
        createdBy: inv.createdBy?.username || inv.createdBy?.name || '—',
        notes: inv.notes || '—',
      }))
    );

    const returnRows = rawReturns.flatMap(ret =>
      (ret.items || []).map((item, i) => ({
        id: `RET-${ret.returnNo}-${i}`,
        date: fmtDate(ret.returnDate),
        invoiceNo: `${isAr ? 'مرتجع' : 'Return'} #${ret.returnNo}`,
        supplier: isAr ? ret.supplierId?.nameAr : ret.supplierId?.nameEn,
        supplierCode: ret.supplierId?.code,
        items: item.materialId?._id
          ? isAr ? item.materialId.nameAr : item.materialId.nameEn
          : getMaterialName(item.materialId),
        quantity: item.quantity,
        unitPrice: fmt(item.unitPrice),
        total: fmt(item.total),
        status: isAr ? 'مرتجع' : 'Return',
        createdBy: ret.createdBy?.username || ret.createdBy?.name || '—',
        notes: ret.notes || '—',
      }))
    );

    return [...invoiceRows, ...returnRows];
  }, [rawPurchases, rawReturns, isAr, materials]);

  // ── Columns ───────────────────────────────────────────────
  const columns = [
    { key: 'date',         labelAr: 'التاريخ',        labelEn: 'Date'        },
    { key: 'invoiceNo',    labelAr: 'رقم الفاتورة',   labelEn: 'Invoice #'   },
    { key: 'supplier',     labelAr: 'المورد',          labelEn: 'Supplier'    },
    { key: 'supplierCode', labelAr: 'كود المورد',      labelEn: 'Sup. Code'   },
    { key: 'items',        labelAr: 'المادة',          labelEn: 'Material'    },
    { key: 'quantity',     labelAr: 'الكمية',          labelEn: 'Qty'         },
    { key: 'unitPrice',    labelAr: 'السعر',           labelEn: 'Unit Price'  },
    { key: 'total',        labelAr: 'الإجمالي',        labelEn: 'Total'       },
    { key: 'status',       labelAr: 'الحالة',          labelEn: 'Status'      },
    { key: 'createdBy',    labelAr: 'أنشئ بواسطة',    labelEn: 'Created By'  },
    { key: 'notes',        labelAr: 'ملاحظات',         labelEn: 'Notes'       },
  ];

  // ── Statistics ────────────────────────────────────────────
  const statistics = useMemo(() => {
    const totalAmount  = rawPurchases.reduce((s, i) => s + (i.totalAmount || 0), 0);
    const returnAmount = rawReturns.reduce((s, r)   => s + (r.totalAmount || 0), 0);
    const suppliers    = new Set(rawPurchases.map(i => i.supplierId?._id)).size;
    return [
      { label: isAr ? 'إجمالي المشتريات' : 'Total Purchases', value: fmt(totalAmount),               color: 'blue',   icon: ShoppingCart },
      { label: isAr ? 'إجمالي المرتجعات' : 'Total Returns',   value: fmt(returnAmount),              color: 'red',    icon: TrendingDown },
      { label: isAr ? 'صافي المشتريات'   : 'Net Purchases',   value: fmt(totalAmount - returnAmount),color: 'green',  icon: DollarSign   },
      { label: isAr ? 'عدد الموردين'     : 'Suppliers',       value: suppliers,                      color: 'orange', icon: Users        },
    ];
  }, [rawPurchases, rawReturns, isAr]);

  // ── Filtering ─────────────────────────────────────────────
  const filteredData = useMemo(() => {
    let data = purchaseRows;
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
  }, [purchaseRows, dateFrom, dateTo, searchTerm, columnFilters]);

  // ── Export ────────────────────────────────────────────────
  const handleExportExcel = () => {
    const headers  = columns.map(c => ({ [c.key]: isAr ? c.labelAr : c.labelEn }));
    exportToExcel(filteredData, headers, isAr ? 'المشتريات' : 'Purchases', isAr ? 'ar' : 'en');
  };
  const handleExportPDF = () => {
    const headers = columns.map(c => ({ [c.key]: isAr ? c.labelAr : c.labelEn }));
    const title   = isAr ? 'المشتريات' : 'Purchases';
    exportToPDF(filteredData, headers, title, isAr ? 'ar' : 'en', title);
  };

  const renderCell = (col, row) => {
    const val = row[col.key];
    if (col.key === 'status') return renderStatusCell(val);
    return val ?? '—';
  };

  const activeFilterCount = Object.keys(columnFilters).filter(k => columnFilters[k]).length;

  // ── Render ────────────────────────────────────────────────
  return (
    <div className="flex">
      <div
        className="flex-1 min-w-0"
        style={{
          ...(showColumnFilters ? (isAr ? { marginLeft: '320px' } : { marginRight: '320px' }) : {}),
          transition: 'margin 0.3s ease',
        }}
      >
        {/* ── TOP BAR (filters + apply) ── */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 mb-4">
          <div className="flex flex-wrap gap-3 items-end">

            {/* Date From */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-gray-500">{isAr ? 'من تاريخ' : 'From'}</label>
              <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
            </div>

            {/* Date To */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-gray-500">{isAr ? 'إلى تاريخ' : 'To'}</label>
              <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
            </div>

            {/* Apply */}
            <button onClick={fetchData}
              className="px-5 py-2 rounded-lg text-sm font-bold bg-indigo-600 hover:bg-indigo-700 text-white transition">
              {loading
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : (isAr ? 'تطبيق' : 'Apply')}
            </button>

            <div className="flex-1" />

            {/* Search */}
            {hasLoaded && (
              <div className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-2 bg-gray-50" style={{ minWidth: 180 }}>
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z"/>
                </svg>
                <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                  placeholder={isAr ? 'بحث...' : 'Search...'}
                  className="bg-transparent text-sm outline-none w-full" />
              </div>
            )}

            {/* Column Filters toggle */}
            {hasLoaded && (
              <button onClick={() => setShowColumnFilters(v => !v)}
                className={`px-3 py-2 rounded-lg text-sm font-semibold border transition flex items-center gap-1
                  ${showColumnFilters || activeFilterCount > 0
                    ? 'bg-indigo-50 border-indigo-300 text-indigo-700'
                    : 'bg-white border-gray-200 text-gray-600 hover:border-indigo-200'}`}>
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h18M7 8h10M11 12h2M9 16h6"/>
                </svg>
                {isAr ? 'فلاتر الأعمدة' : 'Col. Filters'}
                {activeFilterCount > 0 && (
                  <span className="bg-indigo-600 text-white text-xs rounded-full px-1.5 py-0.5 font-bold">{activeFilterCount}</span>
                )}
              </button>
            )}

            {/* Export Excel */}
            {hasLoaded && (
              <button onClick={handleExportExcel}
                className="px-3 py-2 rounded-lg text-sm font-semibold border border-green-200 bg-green-50 text-green-700 hover:bg-green-100 transition flex items-center gap-1">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3M3 17V7a2 2 0 012-2h6l2 2h7a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
                </svg>
                Excel
              </button>
            )}

            {/* Export PDF */}
            {hasLoaded && (
              <button onClick={handleExportPDF}
                className="px-3 py-2 rounded-lg text-sm font-semibold border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 transition flex items-center gap-1">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"/>
                </svg>
                PDF
              </button>
            )}
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
          </div>
        )}

        {/* Error */}
        {error && !loading && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
            <p className="text-red-700 font-semibold">{isAr ? 'حدث خطأ' : 'Error'}</p>
            <p className="text-red-500 text-sm mt-1">{error}</p>
            <button onClick={fetchData} className="mt-3 px-4 py-1.5 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 transition">
              {isAr ? 'إعادة المحاولة' : 'Retry'}
            </button>
          </div>
        )}

        {/* Empty state */}
        {!loading && !error && !hasLoaded && (
          <div className="flex flex-col items-center justify-center py-24 text-gray-400">
            <ShoppingCart className="w-14 h-14 mb-4 opacity-30" />
            <p className="text-base font-semibold text-gray-500">
              {isAr ? 'اختر الفترة واضغط تطبيق' : 'Select date range and press Apply'}
            </p>
          </div>
        )}

        {/* Data */}
        {hasLoaded && !loading && (
          <>
            <StatisticsCards statistics={statistics} />
            <ReportsTable
              columns={columns}
              filteredData={filteredData}
              allData={purchaseRows}
              isAr={isAr}
              activeTab="purchases"
              renderCell={renderCell}
            />
          </>
        )}
      </div>

      <ColumnFiltersPanel
        showColumnFilters={showColumnFilters}
        setShowColumnFilters={setShowColumnFilters}
        columns={columns}
        columnFilters={columnFilters}
        setColumnFilters={setColumnFilters}
        activeFilterCount={activeFilterCount}
        isAr={isAr}
      />
    </div>
  );
}