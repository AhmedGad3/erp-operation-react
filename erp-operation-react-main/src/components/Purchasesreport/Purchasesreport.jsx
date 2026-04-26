import React, { useState, useEffect, useMemo } from 'react';
import { Loader2, ShoppingCart, TrendingDown, DollarSign, Users } from 'lucide-react';
import axiosInstance from '../../utils/axiosInstance';
import { exportToPDF } from '../../utils/pdfExport';
import { exportToExcel } from '../../utils/excelExport';
import { fmtDate, fmt, renderStatusCell } from '../../utils/Reportutils';

import StatisticsCards from '../StatisicsCards/StatisicsCards';
import FiltersBar from '../FiltersBar/FiltersBar';
import ReportsTable from '../ReportsTable/ReportsTable';
import ColumnFiltersPanel from '../CloumnFiltersPanel/CloumnFiltersPanel';

export default function PurchasesReport({ isAr, refreshKey }) {
  // ── State ────────────────────────────────────────────────
  const [rawPurchases, setRawPurchases] = useState([]);
  const [rawReturns, setRawReturns] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // ── Filters ──────────────────────────────────────────────
  const [dateFrom, setDateFrom] = useState('2024-01-01');
  const [dateTo, setDateTo] = useState('2026-12-31');
  const [searchTerm, setSearchTerm] = useState('');
  const [columnFilters, setColumnFilters] = useState({});
  const [showColumnFilters, setShowColumnFilters] = useState(false);

  // ── Fetch Data ───────────────────────────────────────────
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
      setRawReturns(resReturns.data?.result || []);
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

  // ── Helper: Get material name ────────────────────────────
  const getMaterialName = (id) => {
    const mat = materials.find(m => m._id === id);
    if (!mat) return id || '—';
    return isAr ? (mat.nameAr || mat.name) : (mat.name || mat.nameAr);
  };

  const statusLabel = (raw) => {
    const labels = {
      PAID: { ar: 'مكتمل', en: 'Paid' },
      PARTIAL: { ar: 'جزئي', en: 'Partial' },
      PENDING: { ar: 'قيد التنفيذ', en: 'Pending' },
      UNPAID: { ar: 'غير مدفوع', en: 'Unpaid' },
    };
    return labels[raw]?.[isAr ? 'ar' : 'en'] ?? raw ?? '—';
  };

  // ── Transform Data ───────────────────────────────────────
  const purchaseRows = useMemo(() => {
    const invoiceRows = rawPurchases.flatMap(inv =>
      (inv.items || []).map((item, idx) => ({
        id: `INV-${inv.invoiceNo}-${idx}`,
        date: fmtDate(inv.invoiceDate),
        invoiceNo: inv.invoiceNo,
        supplier: isAr ? inv.supplierId?.nameAr : inv.supplierId?.nameEn,
        supplierCode: inv.supplierId?.code,
        items: getMaterialName(item.materialId),
        quantity: item.quantity,
        unitPrice: fmt(item.unitPrice),
        total: fmt(item.total),
        status: statusLabel(inv.status, isAr),
        createdBy: inv.createdBy?.username || inv.createdBy?.name || '—',
        notes: inv.notes || '—',
      }))
    );

    const returnRows = rawReturns.flatMap(ret =>
      (ret.items || []).map((item, idx) => ({
        id: `RET-${ret.returnNo}-${idx}`,
        date: fmtDate(ret.returnDate),
        invoiceNo: `مرتجع #${ret.returnNo}`,
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

  // ── Columns ──────────────────────────────────────────────
  const columns = [
    { key: 'date', labelAr: 'التاريخ', labelEn: 'Date' },
    { key: 'invoiceNo', labelAr: 'رقم الفاتورة', labelEn: 'Invoice #' },
    { key: 'supplier', labelAr: 'المورد', labelEn: 'Supplier' },
    { key: 'supplierCode', labelAr: 'كود المورد', labelEn: 'Sup. Code' },
    { key: 'items', labelAr: 'المادة', labelEn: 'Material' },
    { key: 'quantity', labelAr: 'الكمية', labelEn: 'Qty' },
    { key: 'unitPrice', labelAr: 'السعر', labelEn: 'Unit Price' },
    { key: 'total', labelAr: 'الإجمالي', labelEn: 'Total' },
    { key: 'status', labelAr: 'الحالة', labelEn: 'Status' },
    { key: 'createdBy', labelAr: 'أنشئ بواسطة', labelEn: 'Created By' },
    { key: 'notes', labelAr: 'ملاحظات', labelEn: 'Notes' },
  ];

  // ── Statistics ───────────────────────────────────────────
  const statistics = useMemo(() => {
    const totalAmount = rawPurchases.reduce((s, i) => s + (i.totalAmount || 0), 0);
    const returnAmount = rawReturns.reduce((s, r) => s + (r.totalAmount || 0), 0);
    const suppliers = new Set(rawPurchases.map(i => i.supplierId?._id)).size;

    return [
      { label: isAr ? 'إجمالي المشتريات' : 'Total Purchases', value: fmt(totalAmount), color: 'blue', icon: ShoppingCart },
      { label: isAr ? 'إجمالي المرتجعات' : 'Total Returns', value: fmt(returnAmount), color: 'red', icon: TrendingDown },
      { label: isAr ? 'صافي المشتريات' : 'Net Purchases', value: fmt(totalAmount - returnAmount), color: 'green', icon: DollarSign },
      { label: isAr ? 'عدد الموردين' : 'Suppliers', value: suppliers, color: 'orange', icon: Users },
    ];
  }, [rawPurchases, rawReturns, isAr]);

  // ── Filtering ────────────────────────────────────────────
  const filteredData = useMemo(() => {
    let data = purchaseRows;

    if (dateFrom) data = data.filter(r => (r.date || '') >= dateFrom);
    if (dateTo) data = data.filter(r => (r.date || '') <= dateTo);

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
  }, [purchaseRows, dateFrom, dateTo, searchTerm, columnFilters]);

  // ── Export ───────────────────────────────────────────────
  const handleExportExcel = () => {
    const headers = columns.map(c => ({ [c.key]: isAr ? c.labelAr : c.labelEn }));
    const fileName = isAr ? 'المشتريات' : 'Purchases';
    exportToExcel(filteredData, headers, fileName, isAr ? 'ar' : 'en');
  };

  const handleExportPDF = () => {
    const headers = columns.map(c => ({ [c.key]: isAr ? c.labelAr : c.labelEn }));
    const title = isAr ? 'المشتريات' : 'Purchases';
    exportToPDF(filteredData, headers, title, isAr ? 'ar' : 'en', title);
  };

  // ── Render Cell ──────────────────────────────────────────
  const renderCell = (col, row) => {
    const val = row[col.key];
    if (col.key === 'status') return renderStatusCell(val);
    return val ?? '—';
  };

  const activeFilterCount = Object.keys(columnFilters).filter(k => columnFilters[k]).length;

  // ── Render ───────────────────────────────────────────────
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
        <button
          onClick={fetchData}
          className="mt-3 px-4 py-1.5 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 transition"
        >
          {isAr ? 'إعادة المحاولة' : 'Retry'}
        </button>
      </div>
    );
  }

  return (
    <div className="flex">
      <div
        className="flex-1 min-w-0"
        style={{
          ...(showColumnFilters
            ? isAr ? { marginLeft: '320px' } : { marginRight: '320px' }
            : {}),
          transition: 'margin 0.3s ease',
        }}
      >
        <StatisticsCards statistics={statistics} />

        <FiltersBar
          dateFrom={dateFrom}
          setDateFrom={setDateFrom}
          dateTo={dateTo}
          setDateTo={setDateTo}
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          showColumnFilters={showColumnFilters}
          setShowColumnFilters={setShowColumnFilters}
          activeFilterCount={activeFilterCount}
          columnFilters={columnFilters}
          setColumnFilters={setColumnFilters}
          columns={columns}
          isAr={isAr}
          onExportExcel={handleExportExcel}
          onExportPDF={handleExportPDF}
        />

        <ReportsTable
          columns={columns}
          filteredData={filteredData}
          allData={purchaseRows}
          isAr={isAr}
          activeTab="purchases"
          renderCell={renderCell}
        />
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