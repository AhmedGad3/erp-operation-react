import React, { useState, useEffect, useMemo } from 'react';
import { Loader2, DollarSign, TrendingDown, TrendingUp, CreditCard } from 'lucide-react';
import axiosInstance from '../../utils/axiosInstance';
import { exportToPDF } from '../../utils/pdfExport';
import { exportToExcel } from '../../utils/excelExport';
import { fmtDate, fmt, renderPaymentTypeCell } from '../../utils/Reportutils';

import StatisticsCards from '../StatisicsCards/StatisicsCards';
import FiltersBar from '../FiltersBar/FiltersBar';
import ReportsTable from '../ReportsTable/ReportsTable';
import ColumnFiltersPanel from '../CloumnFiltersPanel/CloumnFiltersPanel';

export default function SupplierPaymentsReport({ isAr, refreshKey }) {
  const [rawSupplierPayments, setRawSupplierPayments] = useState([]);
  const [rawRefunds, setRawRefunds] = useState([]);
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
      const [resPayments, resRefunds] = await Promise.all([
        axiosInstance.get('/supplier/payments'),
        axiosInstance.get('/supplier/payments/refunds'),
      ]);

      setRawSupplierPayments(resPayments.data?.result || []);
      setRawRefunds(resRefunds.data?.result || []);
    } catch (e) {
      setError(e.message || 'خطأ في جلب البيانات');
    } finally {
      setLoading(false);
    }
  };

  const methodLabelLocal = (raw) => {
    const labels = {
      CASH: { ar: 'نقد', en: 'Cash' },
      CHEQUE: { ar: 'شيك', en: 'Cheque' },
      CHECK: { ar: 'شيك', en: 'Check' },
      TRANSFER: { ar: 'تحويل بنكي', en: 'Bank Transfer' },
    };
    return labels[raw]?.[isAr ? 'ar' : 'en'] ?? raw ?? '—';
  };

  useEffect(() => {
    fetchData();
  }, [refreshKey]);

  const supplierPaymentRows = useMemo(() => {
    const payRows = rawSupplierPayments.map(p => ({
      id: `PAY-${p.paymentNo}`,
      date: fmtDate(p.paymentDate),
      paymentNo: p.paymentNo,
      supplier: isAr ? p.supplierId?.nameAr : p.supplierId?.nameEn,
      supplierCode: p.supplierId?.code,
      amount: fmt(p.amount),
      discount: fmt(p.discountAmount || 0),
      total: fmt((p.amount || 0) + (p.discountAmount || 0)),
      method: methodLabelLocal(p.method),
      createdBy: p.createdBy?.username || p.createdBy?.name || '—',
      notes: p.notes || '—',
      type: isAr ? 'دفعة' : 'Payment',
    }));

    const refRows = rawRefunds.map(r => ({
      id: `REF-${r.refundNo}`,
      date: fmtDate(r.refundDate),
      paymentNo: `استرداد #${r.refundNo}`,
      supplier: isAr ? r.supplierId?.nameAr : r.supplierId?.nameEn,
      supplierCode: r.supplierId?.code,
      amount: fmt(r.amount),
      discount: '0',
      total: fmt(r.amount),
      method: methodLabelLocal(r.method),
      createdBy: r.createdBy?.username || r.createdBy?.name || '—',
      notes: r.notes || '—',
      type: isAr ? 'استرداد' : 'Refund',
    }));

    return [...payRows, ...refRows];
  }, [rawSupplierPayments, rawRefunds, isAr]);

  const columns = [
    { key: 'date', labelAr: 'التاريخ', labelEn: 'Date' },
    { key: 'paymentNo', labelAr: 'رقم الدفعة', labelEn: 'Payment #' },
    { key: 'type', labelAr: 'النوع', labelEn: 'Type' },
    { key: 'supplier', labelAr: 'المورد', labelEn: 'Supplier' },
    { key: 'supplierCode', labelAr: 'كود المورد', labelEn: 'Sup. Code' },
    { key: 'amount', labelAr: 'المبلغ', labelEn: 'Amount' },
    { key: 'discount', labelAr: 'الخصم', labelEn: 'Discount' },
    { key: 'total', labelAr: 'الإجمالي', labelEn: 'Total' },
    { key: 'method', labelAr: 'الطريقة', labelEn: 'Method' },
    { key: 'createdBy', labelAr: 'أنشئ بواسطة', labelEn: 'Created By' },
    { key: 'notes', labelAr: 'ملاحظات', labelEn: 'Notes' },
  ];

  const statistics = useMemo(() => {
    const totalPaid = rawSupplierPayments.reduce((s, p) => s + (p.amount || 0), 0);
    const totalDiscount = rawSupplierPayments.reduce((s, p) => s + (p.discountAmount || 0), 0);
    const totalRefunded = rawRefunds.reduce((s, r) => s + (r.amount || 0), 0);

    return [
      { label: isAr ? 'إجمالي المدفوع' : 'Total Paid', value: fmt(totalPaid), color: 'green', icon: DollarSign },
      { label: isAr ? 'إجمالي الخصومات' : 'Total Discounts', value: fmt(totalDiscount), color: 'blue', icon: TrendingDown },
      { label: isAr ? 'إجمالي الاسترداد' : 'Total Refunds', value: fmt(totalRefunded), color: 'red', icon: TrendingUp },
      { label: isAr ? 'عدد الدفعات' : 'Payment Count', value: rawSupplierPayments.length, color: 'purple', icon: CreditCard },
    ];
  }, [rawSupplierPayments, rawRefunds, isAr]);

  const filteredData = useMemo(() => {
    let data = supplierPaymentRows;
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
  }, [supplierPaymentRows, dateFrom, dateTo, searchTerm, columnFilters]);

  const handleExportExcel = () => {
    const headers = columns.map(c => ({ [c.key]: isAr ? c.labelAr : c.labelEn }));
    exportToExcel(filteredData, headers, isAr ? 'دفعات الموردين' : 'Supplier Payments', isAr ? 'ar' : 'en');
  };

  const handleExportPDF = () => {
    const headers = columns.map(c => ({ [c.key]: isAr ? c.labelAr : c.labelEn }));
    const title = isAr ? 'دفعات الموردين' : 'Supplier Payments';
    exportToPDF(filteredData, headers, title, isAr ? 'ar' : 'en', title);
  };

  const renderCell = (col, row) => {
    const val = row[col.key];
    if (col.key === 'type') return renderPaymentTypeCell(val);
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
      <div
        className="flex-1 min-w-0"
        style={{
          ...(showColumnFilters ? (isAr ? { marginLeft: '320px' } : { marginRight: '320px' }) : {}),
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
          allData={supplierPaymentRows}
          isAr={isAr}
          activeTab="supplierPayments"
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