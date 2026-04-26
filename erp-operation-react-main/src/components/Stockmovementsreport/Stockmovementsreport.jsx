import React, { useState, useEffect, useMemo } from 'react';
import { Loader2, TrendingDown, TrendingUp, Package, Warehouse } from 'lucide-react';
import axiosInstance from '../../utils/axiosInstance';
import { exportToPDF } from '../../utils/pdfExport';
import { exportToExcel } from '../../utils/excelExport';
import { fmtDate, fmt, renderMovementTypeCell } from '../../utils/Reportutils';

import StatisticsCards from '../StatisicsCards/StatisicsCards';
import FiltersBar from '../FiltersBar/FiltersBar';
import ReportsTable from '../ReportsTable/ReportsTable';
import ColumnFiltersPanel from '../CloumnFiltersPanel/CloumnFiltersPanel';

export default function StockMovementsReport({ isAr, refreshKey }) {
  const [rawMovements, setRawMovements] = useState([]);
  const [rawPurchases, setRawPurchases] = useState([]);
  const [rawReturns, setRawReturns] = useState([]);
  const [rawMaterialIssues, setRawMaterialIssues] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [dateFrom, setDateFrom] = useState('2024-01-01');
  const [dateTo, setDateTo] = useState('2026-12-31');
  const [searchTerm, setSearchTerm] = useState('');
  const [columnFilters, setColumnFilters] = useState({});
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

      setRawMovements(resMovements.data?.result || []);
      setRawPurchases(resPurchases.data?.result || []);
      setRawReturns(resReturns.data?.result || []);
      setRawMaterialIssues(resMaterialIssues.data?.result || []);
      setMaterials(resMaterials.data?.result || []);
    } catch (e) {
      setError(e.message || 'خطأ في جلب البيانات');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [refreshKey]);

  const getMaterialName = (id) => {
    const mat = materials.find(m => m._id === id);
    if (!mat) return id || '—';
    return isAr ? (mat.nameAr || mat.name) : (mat.name || mat.nameAr);
  };

  const movementLabelLocal = (raw) => {
    const labels = {
      IN: { ar: 'استلام', en: 'Receipt' },
      PROJECT_ISSUE: { ar: 'صرف للمشروع', en: 'Project Issue' },
      RETURN_OUT: { ar: 'مرتجع', en: 'Return' },
      ADJUSTMENT_IN: { ar: 'تعديل زيادة', en: 'Adj. In' },
      ADJUSTMENT_OUT: { ar: 'تعديل نقص', en: 'Adj. Out' },
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
          case 'PurchaseInvoice':
            const purchase = rawPurchases.find(p => p._id === m.referenceId);
            if (purchase?.createdBy) {
              createdBy = purchase.createdBy.username || purchase.createdBy.name || '—';
            }
            break;

          case 'PurchaseReturn':
            const returnDoc = rawReturns.find(r => r._id === m.referenceId);
            if (returnDoc?.createdBy) {
              createdBy = returnDoc.createdBy.username || returnDoc.createdBy.name || '—';
            }
            break;

          case 'MaterialIssue':
          case 'ProjectIssue':
            const issue = rawMaterialIssues.find(i => i._id === m.referenceId);
            if (issue?.createdBy) {
              createdBy = issue.createdBy.username || issue.createdBy.name || '—';
            }
            break;

          default:
            createdBy = '—';
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
        createdBy: createdBy,
        notes: m.notes || '—',
      };
    }),
    [rawMovements, isAr, materials, rawPurchases, rawReturns, rawMaterialIssues]
  );

  const columns = [
    { key: 'date', labelAr: 'التاريخ', labelEn: 'Date' },
    { key: 'movementNo', labelAr: 'رقم الحركة', labelEn: 'Mov. #' },
    { key: 'type', labelAr: 'النوع', labelEn: 'Type' },
    { key: 'materialId', labelAr: 'المادة', labelEn: 'Material' },
    { key: 'quantity', labelAr: 'الكمية', labelEn: 'Qty' },
    { key: 'balanceAfter', labelAr: 'الرصيد بعد', labelEn: 'Bal. After' },
    { key: 'unitPrice', labelAr: 'السعر', labelEn: 'Unit Price' },
    { key: 'referenceType', labelAr: 'نوع المرجع', labelEn: 'Ref. Type' },
    { key: 'createdBy', labelAr: 'أنشئ بواسطة', labelEn: 'Created By' },
    { key: 'notes', labelAr: 'ملاحظات', labelEn: 'Notes' },
  ];

  const statistics = useMemo(() => {
    const totalIn = rawMovements.filter(m => m.type === 'IN' || m.type === 'ADJUSTMENT_IN').reduce((s, m) => s + m.quantity, 0);
    const totalOut = rawMovements.filter(m => m.type === 'PROJECT_ISSUE' || m.type === 'RETURN_OUT' || m.type === 'ADJUSTMENT_OUT').reduce((s, m) => s + m.quantity, 0);

    return [
      { label: isAr ? 'إجمالي الوارد' : 'Total In', value: fmt(totalIn), color: 'green', icon: TrendingDown },
      { label: isAr ? 'إجمالي الصادر' : 'Total Out', value: fmt(totalOut), color: 'red', icon: TrendingUp },
      { label: isAr ? 'الفرق' : 'Net', value: fmt(totalIn - totalOut), color: 'blue', icon: Package },
      { label: isAr ? 'عدد الحركات' : 'Movement Count', value: rawMovements.length, color: 'purple', icon: Warehouse },
    ];
  }, [rawMovements, isAr]);

  const filteredData = useMemo(() => {
    let data = stockMovementRows;
    if (dateFrom) data = data.filter(r => (r.date || '') >= dateFrom);
    if (dateTo) data = data.filter(r => (r.date || '') <= dateTo);
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
    const title = isAr ? 'حركات المخزون' : 'Stock Movements';
    exportToPDF(filteredData, headers, title, isAr ? 'ar' : 'en', title);
  };

  const renderCell = (col, row) => {
    const val = row[col.key];
    if (col.key === 'type') return renderMovementTypeCell(val, row.typeRaw);
    return val ?? '—';
  };

  const activeFilterCount = Object.keys(columnFilters).filter(k => columnFilters[k]).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
        <p className="text-red-700 font-semibold">{isAr ? 'حدث خطأ' : 'Error'}</p>
        <p className="text-red-500 text-sm mt-1">{error}</p>
        <button onClick={fetchData} className="mt-3 px-4 py-1.5 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 transition">
          {isAr ? 'إعادة المحاولة' : 'Retry'}
        </button>
      </div>
    );
  }

  return (
    <div className="flex">
      <div className="flex-1 min-w-0" style={{ ...(showColumnFilters ? (isAr ? { marginLeft: '320px' } : { marginRight: '320px' }) : {}), transition: 'margin 0.3s ease' }}>
        <StatisticsCards statistics={statistics} />
        <FiltersBar dateFrom={dateFrom} setDateFrom={setDateFrom} dateTo={dateTo} setDateTo={setDateTo} searchTerm={searchTerm} setSearchTerm={setSearchTerm} showColumnFilters={showColumnFilters} setShowColumnFilters={setShowColumnFilters} activeFilterCount={activeFilterCount} columnFilters={columnFilters} setColumnFilters={setColumnFilters} columns={columns} isAr={isAr} onExportExcel={handleExportExcel} onExportPDF={handleExportPDF} />
        <ReportsTable columns={columns} filteredData={filteredData} allData={stockMovementRows} isAr={isAr} activeTab="stockMovements" renderCell={renderCell} />
      </div>
      <ColumnFiltersPanel showColumnFilters={showColumnFilters} setShowColumnFilters={setShowColumnFilters} columns={columns} columnFilters={columnFilters} setColumnFilters={setColumnFilters} activeFilterCount={activeFilterCount} isAr={isAr} />
    </div>
  );
}