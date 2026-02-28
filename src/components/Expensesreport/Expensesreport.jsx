import React, { useState, useMemo } from 'react';
import { Loader2, TrendingDown, Package, Users, Receipt, Wrench, HardHat } from 'lucide-react';
import axiosInstance from '../../utils/axiosInstance';
import { exportToPDF } from '../../utils/pdfExport';
import { exportToExcel } from '../../utils/excelExport';
import { fmtDate, fmt, renderExpenseCell } from '../../utils/Reportutils';

import StatisticsCards from '../StatisicsCards/StatisicsCards';
import ReportsTable from '../ReportsTable/ReportsTable';
import ColumnFiltersPanel from '../CloumnFiltersPanel/CloumnFiltersPanel';

export default function ExpensesReport({ isAr }) {
  const [rawSupplierPayments, setRawSupplierPayments] = useState([]);
  const [rawRefunds,          setRawRefunds]          = useState([]);
  const [rawMaterialIssues,   setRawMaterialIssues]   = useState([]);
  const [rawGeneralExpenses,  setRawGeneralExpenses]  = useState([]);
  const [rawProjects,         setRawProjects]         = useState([]);
  const [rawAssetInvoices,    setRawAssetInvoices]    = useState([]);
  const [materials,           setMaterials]           = useState([]);
  const [loading,             setLoading]             = useState(false);
  const [error,               setError]               = useState(null);
  const [hasLoaded,           setHasLoaded]           = useState(false);

  const [dateFrom,          setDateFrom]          = useState('2024-01-01');
  const [dateTo,            setDateTo]            = useState('2026-12-31');
  const [searchTerm,        setSearchTerm]        = useState('');
  const [columnFilters,     setColumnFilters]     = useState({});
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
        resAssetInvoices,
      ] = await Promise.all([
        axiosInstance.get('/supplier/payments'),
        axiosInstance.get('/supplier/payments/refunds'),
        axiosInstance.get('/projects/material-issue'),
        axiosInstance.get('/general-expenses'),
        axiosInstance.get('/projects'),
        axiosInstance.get('/materials'),
        axiosInstance.get('/asset-invoices'),
      ]);

      setRawSupplierPayments(resPayments.data?.result        || []);
      setRawRefunds(         resRefunds.data?.result         || []);
      setRawMaterialIssues(  resMaterialIssues.data?.result  || []);
      setRawGeneralExpenses( resGeneralExpenses.data?.result || resGeneralExpenses.data || []);
      setRawProjects(        resProjects.data?.result        || []);
      setMaterials(          resMaterials.data?.result       || []);
      setRawAssetInvoices(   resAssetInvoices.data?.result   || resAssetInvoices.data || []);
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

  const methodLabel = (raw) => {
    const labels = {
      CASH:     { ar: 'نقد',         en: 'Cash'          },
      CHEQUE:   { ar: 'شيك',         en: 'Cheque'        },
      CHECK:    { ar: 'شيك',         en: 'Check'         },
      TRANSFER: { ar: 'تحويل بنكي',  en: 'Bank Transfer' },
    };
    return labels[raw]?.[isAr ? 'ar' : 'en'] ?? raw ?? '—';
  };

  const categoryLabel = (raw) => {
    const labels = {
      UTILITIES:   { ar: 'مرافق',   en: 'Utilities'   },
      RENT:        { ar: 'إيجار',   en: 'Rent'        },
      SALARIES:    { ar: 'رواتب',   en: 'Salaries'    },
      MAINTENANCE: { ar: 'صيانة',   en: 'Maintenance' },
      TRANSPORT:   { ar: 'مواصلات', en: 'Transport'   },
      OTHER:       { ar: 'أخرى',    en: 'Other'       },
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
        const projName       = isAr ? proj.nameAr : proj.nameEn;
        const workers        = proj.laborDetails?.numberOfWorkers || 0;
        const monthlyCost    = proj.laborDetails?.monthlyCost     || 0;
        const durationMonths = proj.laborDetails?.durationMonths  || 0;
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
            workers        ? `${workers} ${isAr ? 'عامل' : 'workers'}` : null,
            durationMonths ? `${durationMonths} ${isAr ? 'شهر' : 'months'}` : null,
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

    // 9️⃣ فواتير شراء الأصول
    rawAssetInvoices.forEach(inv => {
      const assetName = isAr ? inv.asset?.nameAr : inv.asset?.nameEn;
      const assetType = isAr ? inv.asset?.assetTypeAr : inv.asset?.assetTypeEn;
      expenses.push({
        id: `EXP-ASSET-${inv._id}`,
        date: fmtDate(inv.invoiceDate),
        expenseNo: `${isAr ? 'أصل' : 'AST'}-${inv.invoiceNo}`,
        type: isAr ? 'شراء أصول' : 'Asset Purchase',
        category: isAr ? 'أصول وممتلكات' : 'Assets & Equipment',
        description: assetName || inv.asset?.code || '—',
        quantity: '—',
        unitPrice: assetType || '—',
        reference: `${isAr ? 'فاتورة أصل' : 'Asset Inv.'} #${inv.invoiceNo} | ${inv.asset?.code || '—'}`,
        supplier: inv.vendorName || '—',
        amount: fmt(inv.amount),
        amountRaw: inv.amount,
        createdBy: inv.createdBy?.name || inv.createdBy?.username || '—',
        notes: `${isAr ? 'طريقة الدفع' : 'Method'}: ${methodLabel(inv.paymentMethod)}${inv.referenceNo ? ` | ${isAr ? 'مرجع' : 'Ref'}: ${inv.referenceNo}` : ''}${inv.notes ? ` | ${inv.notes}` : ''}`,
      });
    });

    return expenses.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  }, [rawSupplierPayments, rawRefunds, rawMaterialIssues, rawGeneralExpenses, rawProjects, rawAssetInvoices, isAr, materials]);

  const columns = [
    { key: 'date',        labelAr: 'التاريخ',        labelEn: 'Date'          },
    { key: 'expenseNo',   labelAr: 'رقم المصروف',    labelEn: 'Exp. #'        },
    { key: 'type',        labelAr: 'النوع',           labelEn: 'Type'          },
    { key: 'category',    labelAr: 'التصنيف',         labelEn: 'Category'      },
    { key: 'description', labelAr: 'الوصف',           labelEn: 'Description'   },
    { key: 'quantity',    labelAr: 'الكمية',           labelEn: 'Qty'           },
    { key: 'unitPrice',   labelAr: 'السعر/التفاصيل',  labelEn: 'Price/Details' },
    { key: 'reference',   labelAr: 'المرجع',           labelEn: 'Reference'     },
    { key: 'supplier',    labelAr: 'المورد/الجهة',     labelEn: 'Vendor'        },
    { key: 'amount',      labelAr: 'المبلغ',           labelEn: 'Amount'        },
    { key: 'createdBy',   labelAr: 'أنشئ بواسطة',     labelEn: 'Created By'    },
    { key: 'notes',       labelAr: 'ملاحظات',          labelEn: 'Notes'         },
  ];

  const statistics = useMemo(() => {
    const totalExpenses      = expenseRows.reduce((s, e) => s + (e.amountRaw || 0), 0);
    const supplierPayments   = expenseRows.filter(e => e.type === (isAr ? 'دفعات الموردين'      : 'Supplier Payment'   )).reduce((s, e) => s + (e.amountRaw || 0), 0);
    const generalExpenses    = expenseRows.filter(e => e.type === (isAr ? 'مصاريف عامة'         : 'General Expense'    )).reduce((s, e) => s + (e.amountRaw || 0), 0);
    const laborExpenses      = expenseRows.filter(e => e.type === (isAr ? 'تكاليف عمالة'        : 'Labor Costs'        )).reduce((s, e) => s + (e.amountRaw || 0), 0);
    const equipmentExpenses  = expenseRows.filter(e => e.type === (isAr ? 'تكاليف معدات'        : 'Equipment Costs'    )).reduce((s, e) => s + (e.amountRaw || 0), 0);
    const subcontractorCosts = expenseRows.filter(e => e.type === (isAr ? 'مقاولو الباطن'       : 'Subcontractor Costs')).reduce((s, e) => s + (e.amountRaw || 0), 0);
    const materialIssues     = expenseRows.filter(e => e.type === (isAr ? 'صرف مواد للمشروع'    : 'Material Issue'     )).reduce((s, e) => s + (e.amountRaw || 0), 0);
    const assetPurchases     = expenseRows.filter(e => e.type === (isAr ? 'شراء أصول'           : 'Asset Purchase'     )).reduce((s, e) => s + (e.amountRaw || 0), 0);

    return [
      { label: isAr ? 'إجمالي المصاريف'  : 'Total Expenses',    value: fmt(totalExpenses),      color: 'red',    icon: TrendingDown },
      { label: isAr ? 'دفعات الموردين'   : 'Supplier Payments', value: fmt(supplierPayments),   color: 'orange', icon: Users        },
      { label: isAr ? 'المصاريف العامة'  : 'General Expenses',  value: fmt(generalExpenses),    color: 'blue',   icon: Receipt      },
      { label: isAr ? 'تكاليف العمالة'   : 'Labor Costs',       value: fmt(laborExpenses),      color: 'green',  icon: HardHat      },
      { label: isAr ? 'تكاليف المعدات'   : 'Equipment Costs',   value: fmt(equipmentExpenses),  color: 'purple', icon: Wrench       },
      { label: isAr ? 'مقاولو الباطن'    : 'Subcontractors',    value: fmt(subcontractorCosts), color: 'yellow', icon: Users        },
      { label: isAr ? 'مواد المشاريع'    : 'Project Materials', value: fmt(materialIssues),     color: 'indigo', icon: Package      },
      { label: isAr ? 'شراء الأصول'      : 'Asset Purchases',   value: fmt(assetPurchases),     color: 'teal',   icon: Wrench       },
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

  return (
    <div className="flex">
      <div
        className="flex-1 min-w-0"
        style={{
          ...(showColumnFilters ? (isAr ? { marginLeft: '320px' } : { marginRight: '320px' }) : {}),
          transition: 'margin 0.3s ease',
        }}
      >
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

        {/* ── LOADING ── */}
        {loading && (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
          </div>
        )}

        {/* ── ERROR ── */}
        {error && !loading && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
            <p className="text-red-700 font-semibold">{isAr ? 'حدث خطأ' : 'Error'}</p>
            <p className="text-red-500 text-sm mt-1">{error}</p>
            <button onClick={fetchData} className="mt-3 px-4 py-1.5 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 transition">
              {isAr ? 'إعادة المحاولة' : 'Retry'}
            </button>
          </div>
        )}

        {/* ── EMPTY STATE ── */}
        {!loading && !error && !hasLoaded && (
          <div className="flex flex-col items-center justify-center py-24 text-gray-400">
            <TrendingDown className="w-14 h-14 mb-4 opacity-30" />
            <p className="text-base font-semibold text-gray-500">
              {isAr ? 'اختر الفترة واضغط تطبيق' : 'Select date range and press Apply'}
            </p>
          </div>
        )}

        {/* ── DATA ── */}
        {hasLoaded && !loading && (
          <>
            <StatisticsCards statistics={statistics} />
            <ReportsTable
              columns={columns} filteredData={filteredData} allData={expenseRows}
              isAr={isAr} activeTab="expenses" renderCell={renderCell}
            />
          </>
        )}
      </div>

      <ColumnFiltersPanel
        showColumnFilters={showColumnFilters} setShowColumnFilters={setShowColumnFilters}
        columns={columns} columnFilters={columnFilters} setColumnFilters={setColumnFilters}
        activeFilterCount={activeFilterCount} isAr={isAr}
      />
    </div>
  );
}