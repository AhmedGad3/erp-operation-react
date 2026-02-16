import React, { useState, useEffect, useMemo } from 'react';
import { Loader2, TrendingDown, Package, Users, Receipt } from 'lucide-react';
import axiosInstance from '../../utils/axiosInstance';
import { exportToPDF } from '../../utils/pdfExport';
import { exportToExcel } from '../../utils/excelExport';
import { fmtDate, fmt, renderExpenseCell } from '../../utils/Reportutils';

import StatisticsCards from '../StatisicsCards/StatisicsCards';
import FiltersBar from '../FiltersBar/FiltersBar';
import ReportsTable from '../ReportsTable/ReportsTable';
import ColumnFiltersPanel from '../CloumnFiltersPanel/CloumnFiltersPanel';

export default function ExpensesReport({ isAr, refreshKey }) {
  const [rawPurchases, setRawPurchases] = useState([]);
  const [rawReturns, setRawReturns] = useState([]);
  const [rawSupplierPayments, setRawSupplierPayments] = useState([]);
  const [rawRefunds, setRawRefunds] = useState([]);
  const [rawMaterialIssues, setRawMaterialIssues] = useState([]);
  const [rawGeneralExpenses, setRawGeneralExpenses] = useState([]);
  const [rawProjects, setRawProjects] = useState([]);
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
      const [
        resPurchases,
        resReturns,
        resPayments,
        resRefunds,
        resMaterialIssues,
        resGeneralExpenses,
        resProjects,
        resMaterials,
      ] = await Promise.all([
        axiosInstance.get('/purchases'),
        axiosInstance.get('/purchases/return'),
        axiosInstance.get('/supplier/payments'),
        axiosInstance.get('/supplier/payments/refunds'),
        axiosInstance.get('/projects/material-issue'),
        axiosInstance.get('/general-expenses'),
        axiosInstance.get('/projects'),
        axiosInstance.get('/materials'),
      ]);

      setRawPurchases(resPurchases.data?.result || []);
      setRawReturns(resReturns.data?.result || []);
      setRawSupplierPayments(resPayments.data?.result || []);
      setRawRefunds(resRefunds.data?.result || []);
      setRawMaterialIssues(resMaterialIssues.data?.result || []);
      setRawGeneralExpenses(resGeneralExpenses.data?.result || []);
      setRawProjects(resProjects.data?.result || []);
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

  const methodLabel = (raw) => {
    const labels = {
      CASH: { ar: 'نقد', en: 'Cash' },
      CHEQUE: { ar: 'شيك', en: 'Cheque' },
      CHECK: { ar: 'شيك', en: 'Check' },
      TRANSFER: { ar: 'تحويل بنكي', en: 'Bank Transfer' },
    };
    return labels[raw]?.[isAr ? 'ar' : 'en'] ?? raw ?? '—';
  };

  const expenseRows = useMemo(() => {
    const expenses = [];

    // 1️⃣ مشتريات المواد
    rawPurchases.forEach(inv => {
      (inv.items || []).forEach(item => {
        expenses.push({
          id: `EXP-INV-${inv.invoiceNo}-${item._id}`,
          date: fmtDate(inv.invoiceDate),
          expenseNo: `${isAr ? 'فاتورة' : 'INV'}-${inv.invoiceNo}`,
          type: isAr ? 'مشتريات مواد' : 'Material Purchase',
          category: isAr ? 'مواد' : 'Materials',
          description: getMaterialName(item.materialId),
          quantity: item.quantity,
          unitPrice: fmt(item.unitPrice),
          reference: `${isAr ? 'فاتورة' : 'Invoice'} #${inv.invoiceNo}`,
          supplier: isAr ? inv.supplierId?.nameAr : inv.supplierId?.nameEn,
          amount: fmt(item.total),
          amountRaw: item.total,
          createdBy: inv.createdBy?.username || inv.createdBy?.name || '—',
          notes: inv.notes || '—',
        });
      });
    });

    // 2️⃣ مرتجعات المواد
    rawReturns.forEach(ret => {
      (ret.items || []).forEach(item => {
        expenses.push({
          id: `EXP-RET-${ret.returnNo}-${item._id}`,
          date: fmtDate(ret.returnDate),
          expenseNo: `${isAr ? 'مرتجع' : 'RET'}-${ret.returnNo}`,
          type: isAr ? 'مرتجعات مواد' : 'Material Return',
          category: isAr ? 'مواد' : 'Materials',
          description: item.materialId?._id ? (isAr ? item.materialId.nameAr : item.materialId.nameEn) : getMaterialName(item.materialId),
          quantity: item.quantity,
          unitPrice: fmt(item.unitPrice),
          reference: `${isAr ? 'مرتجع' : 'Return'} #${ret.returnNo}`,
          supplier: isAr ? ret.supplierId?.nameAr : ret.supplierId?.nameEn,
          amount: fmt(item.total),
          amountRaw: item.total,
          createdBy: ret.createdBy?.username || ret.createdBy?.name || '—',
          notes: ret.notes || '—',
        });
      });
    });

    // 3️⃣ دفعات الموردين
    rawSupplierPayments.forEach(p => {
      expenses.push({
        id: `EXP-SUPPAY-${p.paymentNo}`,
        date: fmtDate(p.paymentDate),
        expenseNo: `${isAr ? 'دفعة مورد' : 'SUPPAY'}-${p.paymentNo}`,
        type: isAr ? 'دفعات الموردين' : 'Supplier Payment',
        category: isAr ? 'مدفوعات' : 'Payments',
        description: isAr ? p.supplierId?.nameAr : p.supplierId?.nameEn,
        quantity: '—',
        unitPrice: '—',
        reference: `${isAr ? 'دفعة' : 'Payment'} #${p.paymentNo}`,
        supplier: isAr ? p.supplierId?.nameAr : p.supplierId?.nameEn,
        amount: fmt(p.amount),
        amountRaw: p.amount,
        createdBy: p.createdBy?.username || p.createdBy?.name || '—',
        notes: `${isAr ? 'طريقة الدفع' : 'Method'}: ${methodLabel(p.method)}${p.notes ? ` | ${p.notes}` : ''}`,
      });
    });

    // 4️⃣ استردادات الموردين
    rawRefunds.forEach(r => {
      expenses.push({
        id: `EXP-REFUND-${r.refundNo}`,
        date: fmtDate(r.refundDate),
        expenseNo: `${isAr ? 'استرداد' : 'REF'}-${r.refundNo}`,
        type: isAr ? 'استردادات من الموردين' : 'Supplier Refund',
        category: isAr ? 'استردادات' : 'Refunds',
        description: isAr ? r.supplierId?.nameAr : r.supplierId?.nameEn,
        quantity: '—',
        unitPrice: '—',
        reference: `${isAr ? 'استرداد' : 'Refund'} #${r.refundNo}`,
        supplier: isAr ? r.supplierId?.nameAr : r.supplierId?.nameEn,
        amount: fmt(r.amount),
        amountRaw: r.amount,
        createdBy: r.createdBy?.username || r.createdBy?.name || '—',
        notes: `${isAr ? 'طريقة الدفع' : 'Method'}: ${methodLabel(r.method)}${r.notes ? ` | ${r.notes}` : ''}`,
      });
    });

    // 5️⃣ صرف مواد للمشاريع
    rawMaterialIssues.forEach(issue => {
      (issue.items || []).forEach(item => {
        const materialName = isAr ? item.materialId?.nameAr : item.materialId?.nameEn;
        const projectName = isAr ? issue.projectId?.nameAr : issue.projectId?.nameEn;
        expenses.push({
          id: `EXP-ISSUE-${issue.issueNo}-${item._id}`,
          date: fmtDate(issue.issueDate),
          expenseNo: `${isAr ? 'صرف' : 'ISS'}-${issue.issueNo}`,
          type: isAr ? 'صرف مواد للمشروع' : 'Material Issue',
          category: isAr ? 'مواد' : 'Materials',
          description: materialName || '—',
          quantity: item.quantity,
          unitPrice: fmt(item.unitPrice),
          reference: `${isAr ? 'صرف' : 'Issue'} #${issue.issueNo} - ${projectName}`,
          supplier: projectName,
          amount: fmt(item.totalPrice || 0),
          amountRaw: item.totalPrice || 0,
          createdBy: issue.createdBy?.username || issue.createdBy?.name || '—',
          notes: issue.notes || '—',
        });
      });
    });

    // 6️⃣ المصاريف العامة
    rawGeneralExpenses.forEach(exp => {
      expenses.push({
        id: `EXP-GEN-${exp._id}`,
        date: fmtDate(exp.date),
        expenseNo: exp.expenseNo || `GEN-${exp._id?.slice(-6)}`,
        type: isAr ? exp.typeAr : exp.type,
        category: isAr ? exp.categoryAr : exp.category,
        description: isAr ? exp.descriptionAr : exp.description,
        quantity: '—',
        unitPrice: '—',
        reference: `${isAr ? 'مصروف عام' : 'General Expense'} #${exp.expenseNo || exp._id?.slice(-6)}`,
        supplier: isAr ? exp.vendorAr : exp.vendor,
        amount: fmt(exp.amount),
        amountRaw: exp.amount,
        createdBy: exp.createdBy?.username || exp.createdBy?.name || '—',
        notes: exp.notes || '—',
      });
    });

    // 7️⃣ تكاليف العمالة
    rawProjects.forEach(proj => {
      if (proj.laborCosts && proj.laborCosts > 0) {
        const workers = proj.laborDetails?.numberOfWorkers || 0;
        const monthlyCost = proj.laborDetails?.monthlyCost || 0;
        const durationMonths = proj.laborDetails?.durationMonths || 0;

        expenses.push({
          id: `EXP-LABOR-${proj._id}`,
          date: fmtDate(proj.startDate),
          expenseNo: `${isAr ? 'عمالة' : 'LABOR'}-${proj._id?.slice(-6)}`,
          type: isAr ? 'تكاليف عمالة' : 'Labor Costs',
          category: isAr ? 'عمالة' : 'Labor',
          description: isAr ? proj.nameAr : proj.nameEn,
          quantity: workers,
          unitPrice: fmt(monthlyCost),
          reference: `${isAr ? 'مشروع' : 'Project'}: ${isAr ? proj.nameAr : proj.nameEn}`,
          supplier: isAr ? 'مشروع' : 'Project',
          amount: fmt(proj.laborCosts),
          amountRaw: proj.laborCosts,
          createdBy: proj.createdBy?.username || proj.createdBy?.name || '—',
          notes: `${workers} ${isAr ? 'عامل' : 'workers'} - ${durationMonths} ${isAr ? 'شهر' : 'months'} - ${isAr ? 'ملاحظات' : 'Notes'}: ${proj.laborDetails?.notes || '—'}`,
        });
      }
    });

    // 8️⃣ تكاليف المعدات
    rawProjects.forEach(proj => {
      if (proj.equipmentCosts && proj.equipmentCosts > 0) {
        expenses.push({
          id: `EXP-EQUIP-${proj._id}`,
          date: fmtDate(proj.startDate),
          expenseNo: `${isAr ? 'معدات' : 'EQUIP'}-${proj._id?.slice(-6)}`,
          type: isAr ? 'تكاليف معدات' : 'Equipment Costs',
          category: isAr ? 'معدات' : 'Equipment',
          description: isAr ? proj.nameAr : proj.nameEn,
          quantity: '—',
          unitPrice: '—',
          reference: `${isAr ? 'مشروع' : 'Project'}: ${isAr ? proj.nameAr : proj.nameEn}`,
          supplier: isAr ? 'تأجير معدات' : 'Equipment Rental',
          amount: fmt(proj.equipmentCosts),
          amountRaw: proj.equipmentCosts,
          createdBy: proj.createdBy?.username || proj.createdBy?.name || '—',
          notes: proj.equipmentDetails?.notes || proj.notes || '—',
        });
      }
    });

    // 9️⃣ تكاليف أخرى
    rawProjects.forEach(proj => {
      if (proj.otherCosts && proj.otherCosts > 0) {
        expenses.push({
          id: `EXP-OTHER-${proj._id}`,
          date: fmtDate(proj.startDate),
          expenseNo: `${isAr ? 'أخرى' : 'OTHER'}-${proj._id?.slice(-6)}`,
          type: isAr ? 'مصاريف أخرى للمشروع' : 'Other Project Costs',
          category: isAr ? 'متنوعة' : 'Miscellaneous',
          description: isAr ? proj.nameAr : proj.nameEn,
          quantity: '—',
          unitPrice: '—',
          reference: `${isAr ? 'مشروع' : 'Project'}: ${isAr ? proj.nameAr : proj.nameEn}`,
          supplier: isAr ? 'مصاريف متنوعة' : 'Miscellaneous Expenses',
          amount: fmt(proj.otherCosts),
          amountRaw: proj.otherCosts,
          createdBy: proj.createdBy?.username || proj.createdBy?.name || '—',
          notes: proj.otherCostsDetails?.notes || proj.notes || '—',
        });
      }
    });

    return expenses.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  }, [rawPurchases, rawReturns, rawSupplierPayments, rawRefunds, rawMaterialIssues, rawGeneralExpenses, rawProjects, isAr, materials]);

  const columns = [
    { key: 'date', labelAr: 'التاريخ', labelEn: 'Date' },
    { key: 'expenseNo', labelAr: 'رقم المصروف', labelEn: 'Exp. #' },
    { key: 'type', labelAr: 'النوع', labelEn: 'Type' },
    { key: 'category', labelAr: 'التصنيف', labelEn: 'Category' },
    { key: 'description', labelAr: 'الوصف', labelEn: 'Description' },
    { key: 'quantity', labelAr: 'الكمية', labelEn: 'Qty' },
    { key: 'unitPrice', labelAr: 'السعر', labelEn: 'Unit Price' },
    { key: 'reference', labelAr: 'المرجع', labelEn: 'Reference' },
    { key: 'supplier', labelAr: 'المورد/الجهة', labelEn: 'Vendor' },
    { key: 'amount', labelAr: 'المبلغ', labelEn: 'Amount' },
    { key: 'createdBy', labelAr: 'أنشئ بواسطة', labelEn: 'Created By' },
    { key: 'notes', labelAr: 'ملاحظات', labelEn: 'Notes' },
  ];

  const statistics = useMemo(() => {
    const totalExpenses = expenseRows.reduce((s, e) => s + (e.amountRaw || 0), 0);
    const materialExpenses = expenseRows.filter(e => e.category === (isAr ? 'مواد' : 'Materials')).reduce((s, e) => s + (e.amountRaw || 0), 0);
    const paymentExpenses = expenseRows.filter(e => e.category === (isAr ? 'مدفوعات' : 'Payments')).reduce((s, e) => s + (e.amountRaw || 0), 0);
    const refundExpenses = expenseRows.filter(e => e.category === (isAr ? 'استردادات' : 'Refunds')).reduce((s, e) => s + (e.amountRaw || 0), 0);
    const laborExpenses = expenseRows.filter(e => e.category === (isAr ? 'عمالة' : 'Labor')).reduce((s, e) => s + (e.amountRaw || 0), 0);
    const equipmentExpenses = expenseRows.filter(e => e.category === (isAr ? 'معدات' : 'Equipment')).reduce((s, e) => s + (e.amountRaw || 0), 0);

    return [
      { label: isAr ? 'إجمالي المصاريف' : 'Total Expenses', value: fmt(totalExpenses), color: 'red', icon: TrendingDown },
      { label: isAr ? 'مصاريف المواد' : 'Material Expenses', value: fmt(materialExpenses), color: 'blue', icon: Package },
      { label: isAr ? 'مدفوعات الموردين' : 'Supplier Payments', value: fmt(paymentExpenses), color: 'orange', icon: Users },
      { label: isAr ? 'تكاليف العمالة' : 'Labor Costs', value: fmt(laborExpenses), color: 'green', icon: Users },
      { label: isAr ? 'تكاليف المعدات' : 'Equipment Costs', value: fmt(equipmentExpenses), color: 'purple', icon: Receipt },
      { label: isAr ? 'استردادات الموردين' : 'Supplier Refunds', value: fmt(refundExpenses), color: 'rose', icon: TrendingDown },
    ];
  }, [expenseRows, isAr]);

  const filteredData = useMemo(() => {
    let data = expenseRows;
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
  }, [expenseRows, dateFrom, dateTo, searchTerm, columnFilters]);

  const handleExportExcel = () => {
    const headers = columns.map(c => ({ [c.key]: isAr ? c.labelAr : c.labelEn }));
    
    exportToExcel(filteredData, headers, isAr ? 'المصاريف' : 'Expenses', isAr ? 'ar' : 'en');
  };

  const handleExportPDF = () => {
    const headers = columns.map(c => ({ [c.key]: isAr ? c.labelAr : c.labelEn }));
    const title = isAr ? 'المصاريف' : 'Expenses';
    exportToPDF(filteredData, headers, title, isAr ? 'ar' : 'en', title);
  };

  const renderCell = (col, row) => {
    const val = row[col.key];
    if (col.key === 'type' || col.key === 'category') return renderExpenseCell(val, isAr);
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
        <ReportsTable columns={columns} filteredData={filteredData} allData={expenseRows} isAr={isAr} activeTab="expenses" renderCell={renderCell} />
      </div>
      <ColumnFiltersPanel showColumnFilters={showColumnFilters} setShowColumnFilters={setShowColumnFilters} columns={columns} columnFilters={columnFilters} setColumnFilters={setColumnFilters} activeFilterCount={activeFilterCount} isAr={isAr} />
    </div>
  );
}