import React, { useState, useEffect, useMemo } from 'react';
import { Loader2, DollarSign, TrendingUp, BarChart3, PiggyBank } from 'lucide-react';
import axiosInstance from '../../utils/axiosInstance';
import { exportToPDF } from '../../utils/pdfExport';
import { exportToExcel } from '../../utils/excelExport';
import { fmtDate, fmt } from '../../utils/Reportutils';

import StatisticsCards from '../StatisicsCards/StatisicsCards';
import FiltersBar from '../FiltersBar/FiltersBar';
import ReportsTable from '../ReportsTable/ReportsTable';
import ColumnFiltersPanel from '../CloumnFiltersPanel/CloumnFiltersPanel';

export default function ProfitsReport({ isAr, refreshKey }) {
  const [rawClientPayments, setRawClientPayments] = useState([]);
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
      const res = await axiosInstance.get('/projects/payments');
      setRawClientPayments(res.data?.result || []);
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

  const profitRows = useMemo(() =>
    rawClientPayments.map(p => ({
      id: p._id,
      date: fmtDate(p.paymentDate),
      paymentNo: p.paymentNo,
      client: isAr ? p.clientId?.nameAr : p.clientId?.nameEn,
      clientCode: p.clientId?.code,
      project: isAr ? p.projectId?.nameAr : p.projectId?.nameEn,
      projectCode: p.projectId?.code,
      contractPayment: fmt(p.contractPayment),
      additionalPayment: fmt(p.additionalPayment),
      totalAmount: fmt(p.amount),
      method: methodLabelLocal(p.method),
      chequeNo: p.chequeNo || '—',
      createdBy: p.createdBy?.username || p.createdBy?.name || '—',
      notes: p.notes || '—',
    })),
    [rawClientPayments, isAr]
  );

  const columns = [
    { key: 'date', labelAr: 'التاريخ', labelEn: 'Date' },
    { key: 'paymentNo', labelAr: 'رقم الدفعة', labelEn: 'Payment #' },
    { key: 'client', labelAr: 'العميل', labelEn: 'Client' },
    { key: 'clientCode', labelAr: 'كود العميل', labelEn: 'Client Code' },
    { key: 'project', labelAr: 'المشروع', labelEn: 'Project' },
    { key: 'projectCode', labelAr: 'كود المشروع', labelEn: 'Project Code' },
    { key: 'contractPayment', labelAr: 'دفعة العقد', labelEn: 'Contract Payment' },
    { key: 'additionalPayment', labelAr: 'دفعة إضافية', labelEn: 'Additional Payment' },
    { key: 'totalAmount', labelAr: 'الإجمالي', labelEn: 'Total Amount' },
    { key: 'method', labelAr: 'الطريقة', labelEn: 'Method' },
    { key: 'chequeNo', labelAr: 'رقم الشيك', labelEn: 'Cheque #' },
    { key: 'createdBy', labelAr: 'أنشئ بواسطة', labelEn: 'Created By' },
    { key: 'notes', labelAr: 'ملاحظات', labelEn: 'Notes' },
  ];

  const statistics = useMemo(() => {
    const totalRevenue = rawClientPayments.reduce((s, p) => s + (p.amount || 0), 0);
    const contractRevenue = rawClientPayments.reduce((s, p) => s + (p.contractPayment || 0), 0);
    const additionalRevenue = rawClientPayments.reduce((s, p) => s + (p.additionalPayment || 0), 0);
    const paymentCount = rawClientPayments.length;

    return [
      { label: isAr ? 'إجمالي الإيرادات' : 'Total Revenue', value: fmt(totalRevenue), color: 'green', icon: DollarSign },
      { label: isAr ? 'إيرادات العقود' : 'Contract Revenue', value: fmt(contractRevenue), color: 'blue', icon: TrendingUp },
      { label: isAr ? 'إيرادات إضافية' : 'Additional Revenue', value: fmt(additionalRevenue), color: 'purple', icon: BarChart3 },
      { label: isAr ? 'عدد الدفعات' : 'Payment Count', value: paymentCount, color: 'orange', icon: PiggyBank },
    ];
  }, [rawClientPayments, isAr]);

  const filteredData = useMemo(() => {
    let data = profitRows;
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
  }, [profitRows, dateFrom, dateTo, searchTerm, columnFilters]);

  const handleExportExcel = () => {
    const headers = columns.map(c => ({ [c.key]: isAr ? c.labelAr : c.labelEn }));
    exportToExcel(filteredData, headers, isAr ? 'الأرباح' : 'Profits', isAr ? 'ar' : 'en');
  };

  const handleExportPDF = () => {
    const headers = columns.map(c => ({ [c.key]: isAr ? c.labelAr : c.labelEn }));
    const title = isAr ? 'الأرباح' : 'Profits';
    exportToPDF(filteredData, headers, title, isAr ? 'ar' : 'en', title);
  };

  const renderCell = (col, row) => row[col.key] ?? '—';
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
        <ReportsTable columns={columns} filteredData={filteredData} allData={profitRows} isAr={isAr} activeTab="profits" renderCell={renderCell} />
      </div>
      <ColumnFiltersPanel showColumnFilters={showColumnFilters} setShowColumnFilters={setShowColumnFilters} columns={columns} columnFilters={columnFilters} setColumnFilters={setColumnFilters} activeFilterCount={activeFilterCount} isAr={isAr} />
    </div>
  );
}