import React, { useState, useEffect, useMemo } from 'react';
import {
  Loader2, TrendingUp, TrendingDown, DollarSign,
  BarChart3, Building2, Users, Wrench, Package, HardHat,
} from 'lucide-react';
import axiosInstance from '../../utils/axiosInstance';
import { exportToPDF } from '../../utils/pdfExport';
import { exportToExcel } from '../../utils/excelExport';
import { fmt, fmtDate } from '../../utils/Reportutils';

import StatisticsCards from '../StatisicsCards/StatisicsCards';
import ReportsTable from '../ReportsTable/ReportsTable';
import ColumnFiltersPanel from '../CloumnFiltersPanel/CloumnFiltersPanel';

/* ─── category helpers ─── */
const CATEGORY_LABELS = {
  labor:         { ar: 'عمالة',       en: 'Labor'         },
  equipment:     { ar: 'معدة',        en: 'Equipment'     },
  material:      { ar: 'مواد',        en: 'Materials'     },
  subcontractor: { ar: 'مقاول باطن',  en: 'Subcontractor' },
  miscellaneous: { ar: 'مصاريف أخرى', en: 'Miscellaneous' },
};
const ALL_CATEGORIES = ['labor', 'equipment', 'material', 'subcontractor', 'miscellaneous'];

const CAT_COLORS = {
  labor:         { bg: '#fffbeb', color: '#d97706', border: '#fde68a' },
  equipment:     { bg: '#eff6ff', color: '#2563eb', border: '#bfdbfe' },
  material:      { bg: '#f5f3ff', color: '#7c3aed', border: '#ddd6fe' },
  subcontractor: { bg: '#f0fdf4', color: '#16a34a', border: '#bbf7d0' },
  miscellaneous: { bg: '#fdf4ff', color: '#9333ea', border: '#e9d5ff' },
};

const catLabel = (cat, isAr) =>
  CATEGORY_LABELS[cat]?.[isAr ? 'ar' : 'en'] ?? cat ?? '—';

const renderCategoryCell = (label, raw) => {
  const c = CAT_COLORS[raw] || { bg: '#f3f4f6', color: '#6b7280', border: '#e5e7eb' };
  return (
    <span style={{
      background: c.bg, color: c.color, border: `1px solid ${c.border}`,
      borderRadius: 999, padding: '2px 10px', fontSize: 12, fontWeight: 600,
      whiteSpace: 'nowrap',
    }}>
      {label}
    </span>
  );
};

/* ══════════════════════════════════════════════════════════════ */
export default function ProjectSummaryReport({ isAr, refreshKey }) {

  const [projectsList, setProjectsList]   = useState([]);
  const [projectsLoading, setProjectsLoading] = useState(true);
  const [reportData, setReportData]       = useState(null);
  const [loading, setLoading]             = useState(false);
  const [error, setError]                 = useState(null);

  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [dateFrom, setDateFrom]                   = useState('');
  const [dateTo, setDateTo]                       = useState('');
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [searchTerm, setSearchTerm]               = useState('');
  const [columnFilters, setColumnFilters]         = useState({});
  const [showColumnFilters, setShowColumnFilters] = useState(false);

  const toggleCategory = (cat) =>
    setSelectedCategories(prev =>
      prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
    );

  /* ── load projects list ── */
  useEffect(() => {
    axiosInstance.get('/projects')
      .then(r => setProjectsList(r.data?.result || []))
      .catch(() => setProjectsList([]))
      .finally(() => setProjectsLoading(false));
  }, [refreshKey]);

  /* ── fetch report on Apply ── */
  const fetchReport = () => {
    if (!selectedProjectId) return;
    setLoading(true);
    setError(null);
    setReportData(null);
    const params = { projectId: selectedProjectId };
    if (dateFrom) params.dateFrom = dateFrom;
    if (dateTo)   params.dateTo   = dateTo;
    axiosInstance.get('/reports/projects/summary', { params, skipLang: true })
      .then(r  => setReportData(r.data))
      .catch(e => setError(e.message || (isAr ? 'خطأ في جلب البيانات' : 'Fetch error')))
      .finally(() => setLoading(false));
  };

  /* ── flatten rows ── */
  const rows = useMemo(() => {
    if (!reportData) return [];
    const result = [];

    (reportData.labor?.items || []).forEach(item => result.push({
      id: item._id, category: catLabel('labor', isAr), categoryRaw: 'labor',
      date: item.startDate ? fmtDate(item.startDate) : '—',
      description: item.workerName || '—', detail: item.specialty || '—',
      quantity: item.numberOfDays ?? '—', unit: isAr ? 'يوم' : 'Day',
      unitPrice: item.dailyRate != null ? fmt(item.dailyRate) : '—',
      totalCost: item.totalCost != null ? fmt(item.totalCost) : '—',
      supplier: '—', notes: item.notes || '—',
    }));

    (reportData.equipment?.items || []).forEach(item => result.push({
      id: item._id, category: catLabel('equipment', isAr), categoryRaw: 'equipment',
      date: item.startDate ? fmtDate(item.startDate) : '—',
      description: item.equipmentName || '—',
      detail: item.equipmentSource === 'EXTERNAL_RENTAL'
        ? (isAr ? 'إيجار خارجي' : 'External Rental') : (item.equipmentSource || '—'),
      quantity: item.numberOfDays ?? '—', unit: isAr ? 'يوم' : 'Day',
      unitPrice: item.dailyRentalRate != null ? fmt(item.dailyRentalRate) : '—',
      totalCost: item.totalCost       != null ? fmt(item.totalCost)       : '—',
      supplier: item.supplierName || '—', notes: item.notes || '—',
    }));

    (reportData.materialIssues?.items || []).forEach(issue =>
      (issue.items || []).forEach(mi => result.push({
        id: mi._id, category: catLabel('material', isAr), categoryRaw: 'material',
        date: issue.issueDate ? fmtDate(issue.issueDate) : '—',
        description: isAr ? (mi.materialId?.nameAr || mi.materialId?.nameEn || '—')
                           : (mi.materialId?.nameEn || mi.materialId?.nameAr || '—'),
        detail: `${isAr ? 'أمر صرف' : 'Issue'} #${issue.issueNo}`,
        quantity: mi.quantity ?? '—', unit: mi.unitId?.symbol || '—',
        unitPrice: mi.unitPrice  != null ? fmt(mi.unitPrice)  : '—',
        totalCost: mi.totalPrice != null ? fmt(mi.totalPrice) : '—',
        supplier: '—', notes: issue.notes || '—',
      }))
    );

    (reportData.subcontractors?.items || []).forEach(item => result.push({
      id: item._id, category: catLabel('subcontractor', isAr), categoryRaw: 'subcontractor',
      date: item.workDate ? fmtDate(item.workDate) : '—',
      description: item.contractorName  || '—', detail: item.itemDescription || '—',
      quantity: item.quantity  ?? '—', unit: item.unit || '—',
      unitPrice: item.unitPrice   != null ? fmt(item.unitPrice)    : '—',
      totalCost: item.totalAmount != null ? fmt(item.totalAmount)  : '—',
      supplier: '—', notes: '—',
    }));

    (reportData.miscellaneous?.items || []).forEach(item => result.push({
      id: item._id, category: catLabel('miscellaneous', isAr), categoryRaw: 'miscellaneous',
      date: item.date ? fmtDate(item.date) : '—',
      description: item.description || '—', detail: item.category || '—',
      quantity: 1, unit: '—',
      unitPrice: item.amount != null ? fmt(item.amount) : '—',
      totalCost: item.amount != null ? fmt(item.amount) : '—',
      supplier: '—', notes: item.notes || '—',
    }));

    return result;
  }, [reportData, isAr]);

  /* ── columns ── */
  const columns = [
    { key: 'category',    labelAr: 'التصنيف',        labelEn: 'Category'    },
    { key: 'date',        labelAr: 'التاريخ',         labelEn: 'Date'        },
    { key: 'description', labelAr: 'البيان',          labelEn: 'Description' },
    { key: 'detail',      labelAr: 'التفاصيل',        labelEn: 'Detail'      },
    { key: 'quantity',    labelAr: 'الكمية',          labelEn: 'Qty'         },
    { key: 'unit',        labelAr: 'الوحدة',          labelEn: 'Unit'        },
    { key: 'unitPrice',   labelAr: 'سعر الوحدة',      labelEn: 'Unit Price'  },
    { key: 'totalCost',   labelAr: 'الإجمالي',        labelEn: 'Total'       },
    { key: 'supplier',    labelAr: 'المورد / المنفذ',  labelEn: 'Supplier'    },
    { key: 'notes',       labelAr: 'ملاحظات',         labelEn: 'Notes'       },
  ];

  /* ── statistics ── */
  const statistics = useMemo(() => {
    if (!reportData) return [];
    const fi = reportData.financialSummary || {};
    const cb = reportData.costBreakdown    || {};
    return [
      { label: isAr ? 'قيمة العقد'      : 'Contract Amount', value: fmt(fi.contractAmount),   color: 'blue',   icon: DollarSign   },
      { label: isAr ? 'إجمالي التكاليف' : 'Total Costs',     value: fmt(fi.totalCosts),        color: 'red',    icon: TrendingDown },
      { label: isAr ? 'الربح المتوقع'   : 'Expected Profit', value: fmt(fi.expectedProfit),    color: 'green',  icon: TrendingUp   },
      { label: isAr ? 'هامش الربح'      : 'Profit Margin',   value: fi.profitMargin != null ? `${Number(fi.profitMargin).toFixed(1)}%` : '—', color: 'teal', icon: BarChart3 },
      { label: isAr ? 'نسبة الإنجاز'    : 'Completion',      value: fi.completionPercentage != null ? `${Number(fi.completionPercentage).toFixed(0)}%` : '—', color: 'purple', icon: Building2 },
      { label: isAr ? 'تكلفة المواد'    : 'Material Costs',  value: fmt(cb.materialCosts),     color: 'amber',  icon: Package      },
      { label: isAr ? 'تكلفة العمالة'   : 'Labor Costs',     value: fmt(cb.laborCosts),        color: 'indigo', icon: Users        },
      { label: isAr ? 'تكلفة المعدات'   : 'Equipment Costs', value: fmt(cb.equipmentCosts),    color: 'sky',    icon: Wrench       },
      { label: isAr ? 'مقاولو الباطن'   : 'Subcontractors',  value: fmt(cb.subcontractorCosts),color: 'lime',   icon: HardHat      },
    ];
  }, [reportData, isAr]);

  /* ── filtered rows ── */
  const filteredData = useMemo(() => {
    let data = rows;
    if (selectedCategories.length > 0)
      data = data.filter(r => selectedCategories.includes(r.categoryRaw));
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      data = data.filter(row =>
        Object.values(row).some(val => String(val).toLowerCase().includes(q))
      );
    }
    Object.keys(columnFilters).forEach(key => {
      if (columnFilters[key]) {
        const q = columnFilters[key].toLowerCase();
        data = data.filter(row => String(row[key] ?? '').toLowerCase().includes(q));
      }
    });
    return data;
  }, [rows, selectedCategories, searchTerm, columnFilters]);

  /* ── export ── */
  const exportHeaders = columns.map(c => ({ [c.key]: isAr ? c.labelAr : c.labelEn }));
  const handleExportExcel = () => exportToExcel(filteredData, exportHeaders, isAr ? 'تفاصيل تكاليف المشروع' : 'Project Cost Details', isAr ? 'ar' : 'en');
  const handleExportPDF   = () => { const t = isAr ? 'تفاصيل تكاليف المشروع' : 'Project Cost Details'; exportToPDF(filteredData, exportHeaders, t, isAr ? 'ar' : 'en', t); };

  const renderCell = (col, row) => {
    if (col.key === 'category') return renderCategoryCell(row[col.key], row.categoryRaw);
    return row[col.key] ?? '—';
  };

  const activeFilterCount = Object.keys(columnFilters).filter(k => columnFilters[k]).length;
  const selectedProject   = projectsList.find(p => p._id === selectedProjectId);

  /* ══════════════ RENDER ══════════════ */
  return (
    <div className="flex">
      <div
        className="flex-1 min-w-0"
        style={{
          ...(showColumnFilters ? (isAr ? { marginLeft: '320px' } : { marginRight: '320px' }) : {}),
          transition: 'margin 0.3s ease',
        }}
      >

        {/* ══ SINGLE TOP BAR ══ */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 mb-4">

          {/* ROW 1 — project + date + apply + export */}
          <div className="flex flex-wrap gap-3 items-end">

            {/* project select */}
            <div className="flex flex-col gap-1" style={{ minWidth: 220 }}>
              <label className="text-xs font-semibold text-gray-500">
                {isAr ? 'المشروع' : 'Project'}
              </label>
              <select
                value={selectedProjectId}
                onChange={e => setSelectedProjectId(e.target.value)}
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
              >
                <option value="">{isAr ? '-- اختر مشروع --' : '-- Select Project --'}</option>
                {projectsLoading
                  ? <option disabled>{isAr ? 'جاري التحميل...' : 'Loading...'}</option>
                  : projectsList.map(p => (
                      <option key={p._id} value={p._id}>
                        {isAr ? p.nameAr : (p.nameEn || p.nameAr)} — {p.code}
                      </option>
                    ))
                }
              </select>
            </div>

            {/* date from */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-gray-500">
                {isAr ? 'من تاريخ' : 'From'}
              </label>
              <input
                type="date" value={dateFrom}
                onChange={e => setDateFrom(e.target.value)}
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
              />
            </div>

            {/* date to */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-gray-500">
                {isAr ? 'إلى تاريخ' : 'To'}
              </label>
              <input
                type="date" value={dateTo}
                onChange={e => setDateTo(e.target.value)}
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
              />
            </div>

            {/* apply */}
            <button
              onClick={fetchReport}
              disabled={!selectedProjectId}
              className={`px-5 py-2 rounded-lg text-sm font-bold transition
                ${selectedProjectId
                  ? 'bg-indigo-600 hover:bg-indigo-700 text-white'
                  : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}
            >
              {isAr ? 'تطبيق' : 'Apply'}
            </button>

            {/* spacer */}
            <div className="flex-1" />

            {/* search */}
            {reportData && (
              <div className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-2 bg-gray-50" style={{ minWidth: 180 }}>
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z"/></svg>
                <input
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  placeholder={isAr ? 'بحث...' : 'Search...'}
                  className="bg-transparent text-sm outline-none w-full"
                />
              </div>
            )}

            {/* column filters toggle */}
            {reportData && (
              <button
                onClick={() => setShowColumnFilters(v => !v)}
                className={`px-3 py-2 rounded-lg text-sm font-semibold border transition flex items-center gap-1
                  ${showColumnFilters || activeFilterCount > 0
                    ? 'bg-indigo-50 border-indigo-300 text-indigo-700'
                    : 'bg-white border-gray-200 text-gray-600 hover:border-indigo-200'}`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h18M7 8h10M11 12h2M9 16h6"/></svg>
                {isAr ? 'فلاتر الأعمدة' : 'Col. Filters'}
                {activeFilterCount > 0 && (
                  <span className="bg-indigo-600 text-white text-xs rounded-full px-1.5 py-0.5 font-bold">{activeFilterCount}</span>
                )}
              </button>
            )}

            {/* export excel */}
            {reportData && (
              <button onClick={handleExportExcel}
                className="px-3 py-2 rounded-lg text-sm font-semibold border border-green-200 bg-green-50 text-green-700 hover:bg-green-100 transition flex items-center gap-1">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3M3 17V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z"/></svg>
                Excel
              </button>
            )}

            {/* export pdf */}
            {reportData && (
              <button onClick={handleExportPDF}
                className="px-3 py-2 rounded-lg text-sm font-semibold border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 transition flex items-center gap-1">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"/></svg>
                PDF
              </button>
            )}
          </div>

          {/* ROW 2 — category chips (only after data loads) */}
          {reportData && !loading && (
            <div className="flex flex-wrap gap-2 items-center mt-3 pt-3 border-t border-gray-100">
              <span className="text-xs font-semibold text-gray-400">
                {isAr ? 'التصنيف:' : 'Category:'}
              </span>
              {ALL_CATEGORIES.map(cat => {
                const c       = CAT_COLORS[cat];
                const isActive = selectedCategories.includes(cat);
                return (
                  <button
                    key={cat}
                    onClick={() => toggleCategory(cat)}
                    style={{
                      background:   isActive ? c.color : c.bg,
                      color:        isActive ? '#fff'  : c.color,
                      border:       `1.5px solid ${isActive ? c.color : c.border}`,
                      borderRadius: 999,
                      padding:      '3px 14px',
                      fontSize:     12,
                      fontWeight:   600,
                      cursor:       'pointer',
                      transition:   'all .15s',
                    }}
                  >
                    {catLabel(cat, isAr)}
                  </button>
                );
              })}
              {selectedCategories.length > 0 && (
                <button
                  onClick={() => setSelectedCategories([])}
                  className="text-xs text-gray-500 bg-gray-100 border border-gray-200 rounded-full px-3 py-1 font-semibold hover:bg-gray-200 transition"
                >
                  {isAr ? 'الكل ✕' : 'All ✕'}
                </button>
              )}
              {/* project name badge */}
              {selectedProject && (
                <span className="me-auto text-xs font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-full px-3 py-1">
                  {isAr ? selectedProject.nameAr : (selectedProject.nameEn || selectedProject.nameAr)}
                </span>
              )}
            </div>
          )}
        </div>

        {/* loading */}
        {loading && (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
          </div>
        )}

        {/* error */}
        {error && !loading && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
            <p className="text-red-700 font-semibold">{isAr ? 'حدث خطأ' : 'Error'}</p>
            <p className="text-red-500 text-sm mt-1">{error}</p>
            <button onClick={fetchReport} className="mt-3 px-4 py-1.5 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 transition">
              {isAr ? 'إعادة المحاولة' : 'Retry'}
            </button>
          </div>
        )}

        {/* empty state */}
        {!loading && !error && !reportData && (
          <div className="flex flex-col items-center justify-center py-24 text-gray-400">
            <Building2 className="w-14 h-14 mb-4 opacity-30" />
            <p className="text-base font-semibold text-gray-500">
              {isAr ? 'اختر مشروعاً واضغط تطبيق' : 'Select a project and press Apply'}
            </p>
          </div>
        )}

        {/* report */}
        {reportData && !loading && (
          <>
            <StatisticsCards statistics={statistics} />
            <ReportsTable
              columns={columns}
              filteredData={filteredData}
              allData={rows}
              isAr={isAr}
              activeTab="projectsSummary"
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