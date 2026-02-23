import React, { useState, useEffect, useMemo } from 'react';
import { Loader2, TrendingDown, Package, Users, Receipt, Wrench, HardHat } from 'lucide-react';
import axiosInstance from '../../utils/axiosInstance';
import { exportToPDF } from '../../utils/pdfExport';
import { exportToExcel } from '../../utils/excelExport';
import { fmtDate, fmt, renderExpenseCell } from '../../utils/Reportutils';

import StatisticsCards from '../StatisicsCards/StatisicsCards';
import FiltersBar from '../FiltersBar/FiltersBar';
import ReportsTable from '../ReportsTable/ReportsTable';
import ColumnFiltersPanel from '../CloumnFiltersPanel/CloumnFiltersPanel';

export default function ExpensesReport({ isAr, refreshKey }) {
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
        resPayments,
        resRefunds,
        resMaterialIssues,
        resGeneralExpenses,
        resProjects,
        resMaterials,
      ] = await Promise.all([
        axiosInstance.get('/supplier/payments'),
        axiosInstance.get('/supplier/payments/refunds'),
        axiosInstance.get('/projects/material-issue'),
        axiosInstance.get('/general-expenses'),
        axiosInstance.get('/projects'),
        axiosInstance.get('/materials'),
      ]);

      setRawSupplierPayments(resPayments.data?.result || []);
      setRawRefunds(resRefunds.data?.result || []);
      setRawMaterialIssues(resMaterialIssues.data?.result || []);
      setRawGeneralExpenses(resGeneralExpenses.data?.result || resGeneralExpenses.data || []);
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
      CASH:     { ar: 'نقد',          en: 'Cash' },
      CHEQUE:   { ar: 'شيك',          en: 'Cheque' },
      CHECK:    { ar: 'شيك',          en: 'Check' },
      TRANSFER: { ar: 'تحويل بنكي',   en: 'Bank Transfer' },
    };
    return labels[raw]?.[isAr ? 'ar' : 'en'] ?? raw ?? '—';
  };

  // ترجمة mainCategory للمصاريف العامة
  const categoryLabel = (raw) => {
    const labels = {
      UTILITIES:   { ar: 'مرافق',        en: 'Utilities' },
      RENT:        { ar: 'إيجار',         en: 'Rent' },
      SALARIES:    { ar: 'رواتب',         en: 'Salaries' },
      MAINTENANCE: { ar: 'صيانة',         en: 'Maintenance' },
      TRANSPORT:   { ar: 'مواصلات',       en: 'Transport' },
      OTHER:       { ar: 'أخرى',          en: 'Other' },
    };
    return labels[raw]?.[isAr ? 'ar' : 'en'] ?? raw ?? '—';
  };

  const expenseRows = useMemo(() => {
    const expenses = [];

    // 1️⃣ دفعات الموردين
    rawSupplierPayments.forEach(p => {
      expenses.push({
        id: `EXP-SUPPAY-${p.paymentNo}`,
        date: fmtDate(p.paymentDate),
        expenseNo: `${isAr ? 'دفعة مورد' : 'SUPPAY'}-${p.paymentNo}`,
        type: isAr ? 'دفعات الموردين' : 'Supplier Payment',
        category: isAr ? 'مدفوعات' : 'Payments',
        description: isAr ? p.supplierId?.nameAr : p.supplierId?.nameEn,
        quantity: '—',
        unitPrice: p.discountAmount > 0 ? `${isAr ? 'خصم' : 'Disc.'}: ${fmt(p.discountAmount)}` : '—',
        reference: `${isAr ? 'دفعة' : 'Payment'} #${p.paymentNo}`,
        supplier: isAr ? p.supplierId?.nameAr : p.supplierId?.nameEn,
        amount: fmt(p.amount),
        amountRaw: p.amount,
        createdBy: p.createdBy?.name || p.createdBy?.username || '—',
        notes: `${isAr ? 'طريقة الدفع' : 'Method'}: ${methodLabel(p.method)}${p.notes ? ` | ${p.notes}` : ''}`,
      });
    });

    // 2️⃣ استردادات الموردين
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
        createdBy: r.createdBy?.name || r.createdBy?.username || '—',
        notes: `${isAr ? 'طريقة الدفع' : 'Method'}: ${methodLabel(r.method)}${r.notes ? ` | ${r.notes}` : ''}`,
      });
    });

    // 3️⃣ صرف مواد للمشاريع
    rawMaterialIssues.forEach(issue => {
      (issue.items || []).forEach(item => {
        const materialName = isAr ? item.materialId?.nameAr : item.materialId?.nameEn;
        const projectName  = isAr ? issue.projectId?.nameAr : issue.projectId?.nameEn;
        expenses.push({
          id: `EXP-ISSUE-${issue.issueNo}-${item._id}`,
          date: fmtDate(issue.issueDate),
          expenseNo: `${isAr ? 'صرف' : 'ISS'}-${issue.issueNo}`,
          type: isAr ? 'صرف مواد للمشروع' : 'Material Issue',
          category: isAr ? 'مواد مشاريع' : 'Project Materials',
          description: materialName || getMaterialName(item.materialId) || '—',
          quantity: item.quantity,
          unitPrice: fmt(item.unitPrice),
          reference: `${isAr ? 'صرف' : 'Issue'} #${issue.issueNo}${projectName ? ` - ${projectName}` : ''}`,
          supplier: projectName || '—',
          amount: fmt(item.totalPrice || 0),
          amountRaw: item.totalPrice || 0,
          createdBy: issue.createdBy?.name || issue.createdBy?.username || '—',
          notes: issue.notes || '—',
        });
      });
    });

    // 4️⃣ المصاريف العامة للشركة
    rawGeneralExpenses.forEach(exp => {
      expenses.push({
        id: `EXP-GEN-${exp._id}`,
        date: fmtDate(exp.expenseDate),
        expenseNo: `${isAr ? 'م.عام' : 'GEN'}-${exp.expenseNo || exp._id?.slice(-6)}`,
        type: isAr ? 'مصاريف عامة' : 'General Expense',
        category: categoryLabel(exp.mainCategory),
        description: exp.title || '—',
        quantity: '—',
        unitPrice: exp.subCategory || '—',
        reference: `${isAr ? 'مصروف' : 'Exp.'} #${exp.expenseNo || exp._id?.slice(-6)}`,
        supplier: exp.vendorName || '—',
        amount: fmt(exp.amount),
        amountRaw: exp.amount,
        createdBy: exp.createdBy?.name || exp.createdBy?.username || '—',
        notes: `${isAr ? 'طريقة الدفع' : 'Method'}: ${methodLabel(exp.paymentMethod)}${exp.notes ? ` | ${exp.notes}` : ''}`,
      });
    });

    // 5️⃣ تكاليف العمالة للمشاريع
    rawProjects.forEach(proj => {
      if (proj.laborCosts > 0) {
        const projName = isAr ? proj.nameAr : proj.nameEn;
        const workers       = proj.laborDetails?.numberOfWorkers || 0;
        const monthlyCost   = proj.laborDetails?.monthlyCost     || 0;
        const durationMonths= proj.laborDetails?.durationMonths  || 0;
        expenses.push({
          id: `EXP-LABOR-${proj._id}`,
          date: fmtDate(proj.startDate),
          expenseNo: `${isAr ? 'عمالة' : 'LABOR'}-${proj._id?.slice(-6)}`,
          type: isAr ? 'تكاليف عمالة' : 'Labor Costs',
          category: isAr ? 'عمالة' : 'Labor',
          description: projName,
          quantity: workers || '—',
          unitPrice: monthlyCost ? fmt(monthlyCost) : '—',
          reference: `${isAr ? 'مشروع' : 'Project'}: ${projName}`,
          supplier: proj.projectManager || '—',
          amount: fmt(proj.laborCosts),
          amountRaw: proj.laborCosts,
          createdBy: proj.createdBy?.name || proj.createdBy?.username || '—',
          notes: [
            workers       ? `${workers} ${isAr ? 'عامل' : 'workers'}` : null,
            durationMonths? `${durationMonths} ${isAr ? 'شهر' : 'months'}` : null,
            proj.laborDetails?.notes || null,
          ].filter(Boolean).join(' | ') || '—',
        });
      }
    });

    // 6️⃣ تكاليف المعدات للمشاريع
    rawProjects.forEach(proj => {
      if (proj.equipmentCosts > 0) {
        const projName = isAr ? proj.nameAr : proj.nameEn;
        expenses.push({
          id: `EXP-EQUIP-${proj._id}`,
          date: fmtDate(proj.startDate),
          expenseNo: `${isAr ? 'معدات' : 'EQUIP'}-${proj._id?.slice(-6)}`,
          type: isAr ? 'تكاليف معدات' : 'Equipment Costs',
          category: isAr ? 'معدات' : 'Equipment',
          description: projName,
          quantity: '—',
          unitPrice: '—',
          reference: `${isAr ? 'مشروع' : 'Project'}: ${projName}`,
          supplier: isAr ? 'تأجير معدات' : 'Equipment Rental',
          amount: fmt(proj.equipmentCosts),
          amountRaw: proj.equipmentCosts,
          createdBy: proj.createdBy?.name || proj.createdBy?.username || '—',
          notes: proj.equipmentDetails?.notes || proj.notes || '—',
        });
      }
    });

    // 7️⃣ تكاليف المقاولين الباطن
    rawProjects.forEach(proj => {
      if (proj.subcontractorCosts > 0) {
        const projName = isAr ? proj.nameAr : proj.nameEn;
        expenses.push({
          id: `EXP-SUB-${proj._id}`,
          date: fmtDate(proj.startDate),
          expenseNo: `${isAr ? 'مقاول باطن' : 'SUB'}-${proj._id?.slice(-6)}`,
          type: isAr ? 'مقاولو الباطن' : 'Subcontractor Costs',
          category: isAr ? 'مقاولو الباطن' : 'Subcontractors',
          description: projName,
          quantity: '—',
          unitPrice: '—',
          reference: `${isAr ? 'مشروع' : 'Project'}: ${projName}`,
          supplier: isAr ? 'مقاول باطن' : 'Subcontractor',
          amount: fmt(proj.subcontractorCosts),
          amountRaw: proj.subcontractorCosts,
          createdBy: proj.createdBy?.name || proj.createdBy?.username || '—',
          notes: proj.subcontractorDetails?.notes || proj.notes || '—',
        });
      }
    });

    // 8️⃣ تكاليف أخرى للمشاريع
    rawProjects.forEach(proj => {
      if (proj.otherCosts > 0) {
        const projName = isAr ? proj.nameAr : proj.nameEn;
        expenses.push({
          id: `EXP-OTHER-${proj._id}`,
          date: fmtDate(proj.startDate),
          expenseNo: `${isAr ? 'أخرى' : 'OTHER'}-${proj._id?.slice(-6)}`,
          type: isAr ? 'مصاريف أخرى للمشروع' : 'Other Project Costs',
          category: isAr ? 'متنوعة' : 'Miscellaneous',
          description: projName,
          quantity: '—',
          unitPrice: '—',
          reference: `${isAr ? 'مشروع' : 'Project'}: ${projName}`,
          supplier: isAr ? 'مصاريف متنوعة' : 'Miscellaneous',
          amount: fmt(proj.otherCosts),
          amountRaw: proj.otherCosts,
          createdBy: proj.createdBy?.name || proj.createdBy?.username || '—',
          notes: proj.otherCostsDetails?.notes || proj.notes || '—',
        });
      }
    });

    return expenses.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  }, [rawSupplierPayments, rawRefunds, rawMaterialIssues, rawGeneralExpenses, rawProjects, isAr, materials]);

  const columns = [
    { key: 'date',        labelAr: 'التاريخ',        labelEn: 'Date' },
    { key: 'expenseNo',   labelAr: 'رقم المصروف',    labelEn: 'Exp. #' },
    { key: 'type',        labelAr: 'النوع',           labelEn: 'Type' },
    { key: 'category',    labelAr: 'التصنيف',         labelEn: 'Category' },
    { key: 'description', labelAr: 'الوصف',           labelEn: 'Description' },
    { key: 'quantity',    labelAr: 'الكمية',           labelEn: 'Qty' },
    { key: 'unitPrice',   labelAr: 'السعر/التفاصيل',  labelEn: 'Price/Details' },
    { key: 'reference',   labelAr: 'المرجع',           labelEn: 'Reference' },
    { key: 'supplier',    labelAr: 'المورد/الجهة',     labelEn: 'Vendor' },
    { key: 'amount',      labelAr: 'المبلغ',           labelEn: 'Amount' },
    { key: 'createdBy',   labelAr: 'أنشئ بواسطة',     labelEn: 'Created By' },
    { key: 'notes',       labelAr: 'ملاحظات',          labelEn: 'Notes' },
  ];

  const statistics = useMemo(() => {
    const totalExpenses       = expenseRows.reduce((s, e) => s + (e.amountRaw || 0), 0);
    const supplierPayments    = expenseRows.filter(e => e.type === (isAr ? 'دفعات الموردين'         : 'Supplier Payment')).reduce((s, e) => s + (e.amountRaw || 0), 0);
    const generalExpenses     = expenseRows.filter(e => e.type === (isAr ? 'مصاريف عامة'            : 'General Expense')).reduce((s, e) => s + (e.amountRaw || 0), 0);
    const laborExpenses       = expenseRows.filter(e => e.type === (isAr ? 'تكاليف عمالة'           : 'Labor Costs')).reduce((s, e) => s + (e.amountRaw || 0), 0);
    const equipmentExpenses   = expenseRows.filter(e => e.type === (isAr ? 'تكاليف معدات'           : 'Equipment Costs')).reduce((s, e) => s + (e.amountRaw || 0), 0);
    const subcontractorCosts  = expenseRows.filter(e => e.type === (isAr ? 'مقاولو الباطن'          : 'Subcontractor Costs')).reduce((s, e) => s + (e.amountRaw || 0), 0);
    const materialIssues      = expenseRows.filter(e => e.type === (isAr ? 'صرف مواد للمشروع'       : 'Material Issue')).reduce((s, e) => s + (e.amountRaw || 0), 0);

    return [
      { label: isAr ? 'إجمالي المصاريف'      : 'Total Expenses',       value: fmt(totalExpenses),      color: 'red',    icon: TrendingDown },
      { label: isAr ? 'دفعات الموردين'        : 'Supplier Payments',    value: fmt(supplierPayments),   color: 'orange', icon: Users },
      { label: isAr ? 'المصاريف العامة'       : 'General Expenses',     value: fmt(generalExpenses),    color: 'blue',   icon: Receipt },
      { label: isAr ? 'تكاليف العمالة'        : 'Labor Costs',          value: fmt(laborExpenses),      color: 'green',  icon: HardHat },
      { label: isAr ? 'تكاليف المعدات'        : 'Equipment Costs',      value: fmt(equipmentExpenses),  color: 'purple', icon: Wrench },
      { label: isAr ? 'مقاولو الباطن'         : 'Subcontractors',       value: fmt(subcontractorCosts), color: 'yellow', icon: Users },
      { label: isAr ? 'مواد المشاريع'         : 'Project Materials',    value: fmt(materialIssues),     color: 'indigo', icon: Package },
    ];
  }, [expenseRows, isAr]);

  const filteredData = useMemo(() => {
    let data = expenseRows;
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
      <div
        className="flex-1 min-w-0"
        style={{
          ...(showColumnFilters ? (isAr ? { marginLeft: '320px' } : { marginRight: '320px' }) : {}),
          transition: 'margin 0.3s ease',
        }}
      >
        <StatisticsCards statistics={statistics} />
        <FiltersBar
          dateFrom={dateFrom} setDateFrom={setDateFrom}
          dateTo={dateTo}     setDateTo={setDateTo}
          searchTerm={searchTerm} setSearchTerm={setSearchTerm}
          showColumnFilters={showColumnFilters} setShowColumnFilters={setShowColumnFilters}
          activeFilterCount={activeFilterCount}
          columnFilters={columnFilters} setColumnFilters={setColumnFilters}
          columns={columns} isAr={isAr}
          onExportExcel={handleExportExcel} onExportPDF={handleExportPDF}
        />
        <ReportsTable
          columns={columns} filteredData={filteredData} allData={expenseRows}
          isAr={isAr} activeTab="expenses" renderCell={renderCell}
        />
      </div>
      <ColumnFiltersPanel
        showColumnFilters={showColumnFilters} setShowColumnFilters={setShowColumnFilters}
        columns={columns} columnFilters={columnFilters} setColumnFilters={setColumnFilters}
        activeFilterCount={activeFilterCount} isAr={isAr}
      />
    </div>
  );
}