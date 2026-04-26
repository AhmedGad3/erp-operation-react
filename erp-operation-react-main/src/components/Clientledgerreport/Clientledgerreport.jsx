import React, { useState, useEffect, useMemo } from 'react';
import { Loader2, DollarSign, CreditCard, TrendingUp, Users } from 'lucide-react';
import axiosInstance from '../../utils/axiosInstance';
import { exportToPDF } from '../../utils/pdfExport';
import { exportToExcel } from '../../utils/excelExport';
import { fmtDate, fmt, renderLedgerTypeCell } from '../../utils/Reportutils';

import StatisticsCards from '../StatisicsCards/StatisicsCards';
import FiltersBar from '../FiltersBar/FiltersBar';
import ReportsTable from '../ReportsTable/ReportsTable';
import ColumnFiltersPanel from '../CloumnFiltersPanel/CloumnFiltersPanel';

export default function ClientLedgerReport({ isAr, refreshKey }) {
  const [rawClientLedger, setRawClientLedger] = useState([]);
  const [clients, setClients] = useState([]);
  const [rawProjects, setRawProjects] = useState([]);
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
      const [resLedger, resClients, resProjects] = await Promise.all([
        axiosInstance.get('/ledger/clients'),
        axiosInstance.get('/clients'),
        axiosInstance.get('/projects'),
      ]);

      setRawClientLedger(resLedger.data?.result || []);
      setClients(resClients.data?.result || []);
      setRawProjects(resProjects.data?.result || []);
    } catch (e) {
      setError(e.message || 'خطأ في جلب البيانات');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [refreshKey]);

  const getClientName = (id) => {
    const client = clients.find(c => c._id === id);
    if (!client) return id || '—';
    return isAr ? (client.nameAr || client.nameEn) : (client.nameEn || client.nameAr);
  };

  const getProjectName = (id) => {
    const proj = rawProjects.find(p => p._id === id);
    if (!proj) return id || '—';
    return isAr ? (proj.nameAr || proj.nameEn) : (proj.nameEn || proj.nameAr);
  };

  const ledgerTypeLabelLocal = (raw) => {
    const labels = {
      purchase: { ar: 'فاتورة شراء', en: 'Purchase' },
      payment: { ar: 'دفعة', en: 'Payment' },
      return: { ar: 'مرتجع', en: 'Return' },
      refund: { ar: 'استرداد', en: 'Refund' },
    };
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
    { key: 'date', labelAr: 'التاريخ', labelEn: 'Date' },
    { key: 'transactionNo', labelAr: 'رقم العملية', labelEn: 'Txn #' },
    { key: 'client', labelAr: 'العميل', labelEn: 'Client' },
    { key: 'clientCode', labelAr: 'كود العميل', labelEn: 'Client Code' },
    { key: 'project', labelAr: 'المشروع', labelEn: 'Project' },
    { key: 'projectCode', labelAr: 'كود المشروع', labelEn: 'Project Code' },
    { key: 'type', labelAr: 'النوع', labelEn: 'Type' },
    { key: 'debit', labelAr: 'مدين', labelEn: 'Debit' },
    { key: 'credit', labelAr: 'دائن', labelEn: 'Credit' },
    { key: 'balanceAfter', labelAr: 'الرصيد', labelEn: 'Balance' },
    { key: 'referenceType', labelAr: 'نوع المرجع', labelEn: 'Ref. Type' },
    { key: 'createdBy', labelAr: 'أنشئ بواسطة', labelEn: 'Created By' },
  ];

  const statistics = useMemo(() => {
    const totalDebit = rawClientLedger.reduce((s, t) => s + (t.debit || 0), 0);
    const totalCredit = rawClientLedger.reduce((s, t) => s + (t.credit || 0), 0);
    const clientsCount = new Set(rawClientLedger.map(t => t.clientId?._id || t.clientId)).size;

    return [
      { label: isAr ? 'إجمالي المدين' : 'Total Debit', value: fmt(totalDebit), color: 'blue', icon: DollarSign },
      { label: isAr ? 'إجمالي الدائن' : 'Total Credit', value: fmt(totalCredit), color: 'green', icon: CreditCard },
      { label: isAr ? 'الرصيد الصافي' : 'Net Balance', value: fmt(totalDebit - totalCredit), color: 'red', icon: TrendingUp },
      { label: isAr ? 'عدد العملاء' : 'Clients', value: clientsCount, color: 'orange', icon: Users },
    ];
  }, [rawClientLedger, isAr]);

  const filteredData = useMemo(() => {
    let data = clientLedgerRows;
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
  }, [clientLedgerRows, dateFrom, dateTo, searchTerm, columnFilters]);

  const handleExportExcel = () => {
    const headers = columns.map(c => ({ [c.key]: isAr ? c.labelAr : c.labelEn }));
    exportToExcel(filteredData, headers, isAr ? 'دفتر العملاء' : 'Client Ledger', isAr ? 'ar' : 'en');
  };

  const handleExportPDF = () => {
    const headers = columns.map(c => ({ [c.key]: isAr ? c.labelAr : c.labelEn }));
    const title = isAr ? 'دفتر العملاء' : 'Client Ledger';
    exportToPDF(filteredData, headers, title, isAr ? 'ar' : 'en', title);
  };

  const renderCell = (col, row) => {
    const val = row[col.key];
    if (col.key === 'type') return renderLedgerTypeCell(val, isAr);
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
        <ReportsTable columns={columns} filteredData={filteredData} allData={clientLedgerRows} isAr={isAr} activeTab="clientLedger" renderCell={renderCell} />
      </div>
      <ColumnFiltersPanel showColumnFilters={showColumnFilters} setShowColumnFilters={setShowColumnFilters} columns={columns} columnFilters={columnFilters} setColumnFilters={setColumnFilters} activeFilterCount={activeFilterCount} isAr={isAr} />
    </div>
  );
}