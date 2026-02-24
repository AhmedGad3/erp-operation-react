import { useState, useEffect, useMemo, useContext } from 'react';
import {
  Plus, Edit, Trash2, Search, Download, Receipt,
  RefreshCw, X, ChevronUp, ChevronDown,
} from 'lucide-react';
import { toast } from 'react-toastify';
import { formatCurrency } from '../../utils/dateFormat';
import axiosInstance from '../../utils/axiosInstance';
import * as XLSX from 'xlsx';
import FullPageLoader from '../Loader/Loader';
import { LanguageContext } from '../../context/LanguageContext';
import { useNavigate } from 'react-router-dom';

const EXPENSE_CATEGORIES = [
  { value: 'RENT',             labelEn: 'Rent',             labelAr: 'إيجارات' },
  { value: 'UTILITIES',        labelEn: 'Utilities',        labelAr: 'مرافق' },
  { value: 'MAINTENANCE',      labelEn: 'Maintenance',      labelAr: 'صيانة' },
  { value: 'OFFICE_SUPPLIES',  labelEn: 'Office Supplies',  labelAr: 'أدوات مكتبية' },
  { value: 'HOSPITALITY',      labelEn: 'Hospitality',      labelAr: 'ضيافة' },
  { value: 'COMMUNICATION',    labelEn: 'Communication',    labelAr: 'اتصالات' },
  { value: 'TRANSPORTATION',   labelEn: 'Transportation',   labelAr: 'مواصلات' },
  { value: 'PROFESSIONAL_FEES',labelEn: 'Professional Fees',labelAr: 'رسوم مهنية' },
  { value: 'INSURANCE',        labelEn: 'Insurance',        labelAr: 'تأمينات' },
  { value: 'MARKETING',        labelEn: 'Marketing',        labelAr: 'تسويق' },
  { value: 'SALARIES',         labelEn: 'Salaries',         labelAr: 'رواتب' },
  { value: 'OTHERS',           labelEn: 'Others',           labelAr: 'أخرى' },
];

const PAYMENT_METHODS = [
  { value: 'CASH',     labelEn: 'Cash',          labelAr: 'نقدي' },
  { value: 'TRANSFER', labelEn: 'Bank Transfer',  labelAr: 'تحويل بنكي' },
  { value: 'CHEQUE',   labelEn: 'Cheque',         labelAr: 'شيك' },
];

// ── Sortable column header ────────────────────────────────
const SortHeader = ({ label, field, sortField, sortDir, onSort }) => (
  <th
    className="px-4 py-3 text-left text-sm font-medium text-gray-500 cursor-pointer select-none"
    onClick={() => onSort(field)}
  >
    <span className="inline-flex items-center gap-1">
      {label}
      <span className="flex flex-col leading-none">
        <ChevronUp   className={`w-3 h-3 ${sortField === field && sortDir === 'asc'  ? 'text-gray-900' : 'text-gray-300'}`} />
        <ChevronDown className={`w-3 h-3 ${sortField === field && sortDir === 'desc' ? 'text-gray-900' : 'text-gray-300'}`} />
      </span>
    </span>
  </th>
);

// ── Stat card ─────────────────────────────────────────────
const StatCard = ({ label, value, color = 'text-gray-900' }) => (
  <div className="bg-white border border-gray-200 rounded-2xl p-5">
    <p className="text-sm text-gray-500 mb-1">{label}</p>
    <p className={`text-2xl font-bold ${color}`}>{value}</p>
  </div>
);

// ── Field wrapper ─────────────────────────────────────────
const Field = ({ label, required, children, colSpan }) => (
  <div className={colSpan ? `md:col-span-${colSpan}` : ''}>
    <label className="block text-sm font-medium text-gray-700 mb-1.5">
      {label}{required && <span className="text-red-500 ml-0.5">*</span>}
    </label>
    {children}
  </div>
);

const inputCls = 'w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-gray-50 transition';

// ── Main ──────────────────────────────────────────────────
export default function GeneralExpenses() {
  const navigate       = useNavigate();
  const { lang }       = useContext(LanguageContext);

  const [expenses,           setExpenses]           = useState([]);
  const [loading,            setLoading]            = useState(false);
  const [saving,             setSaving]             = useState(false);
  const [showModal,          setShowModal]          = useState(false);
  const [editingExpense,     setEditingExpense]     = useState(null);
  const [confirmDelete,      setConfirmDelete]      = useState(null);
  const [searchTerm,         setSearchTerm]         = useState('');
  const [filterCategory,     setFilterCategory]     = useState('all');
  const [filterPaymentMethod,setFilterPaymentMethod]= useState('all');
  const [sortField,          setSortField]          = useState('expenseDate');
  const [sortDir,            setSortDir]            = useState('desc');

  const emptyForm = {
    title: '', amount: 0, mainCategory: 'RENT', subCategory: '',
    paymentMethod: 'CASH', referenceNo: '',
    expenseDate: new Date().toISOString().split('T')[0],
    vendorName: '', notes: '',
  };
  const [formData, setFormData] = useState(emptyForm);
  const setF = (key, val) => setFormData(p => ({ ...p, [key]: val }));

  useEffect(() => { fetchExpenses(); }, []);

  const fetchExpenses = async () => {
    try {
      setLoading(true);
      const { data } = await axiosInstance.get('/general-expenses');
      setExpenses(data || []);
    } catch { toast.error(lang === 'ar' ? 'خطأ في تحميل المصاريف' : 'Error loading expenses'); }
    finally   { setLoading(false); }
  };

  const handleSort = (field) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('asc'); }
  };

  // ── Derived ───────────────────────────────────────────
  const filtered = useMemo(() => {
    let f = expenses;
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      f = f.filter(e =>
        e.title?.toLowerCase().includes(q) ||
        e.vendorName?.toLowerCase().includes(q) ||
        e.subCategory?.toLowerCase().includes(q) ||
        e.notes?.toLowerCase().includes(q) ||
        e.referenceNo?.toLowerCase().includes(q)
      );
    }
    if (filterCategory !== 'all')      f = f.filter(e => e.mainCategory  === filterCategory);
    if (filterPaymentMethod !== 'all') f = f.filter(e => e.paymentMethod === filterPaymentMethod);
    return [...f].sort((a, b) => {
      let va = a[sortField] ?? '';
      let vb = b[sortField] ?? '';
      if (sortField === 'expenseDate') { va = new Date(va); vb = new Date(vb); }
      if (sortField === 'amount')      { va = Number(va);   vb = Number(vb); }
      if (typeof va === 'string') va = va.toLowerCase();
      if (typeof vb === 'string') vb = vb.toLowerCase();
      return sortDir === 'asc' ? (va > vb ? 1 : -1) : (va < vb ? 1 : -1);
    });
  }, [expenses, searchTerm, filterCategory, filterPaymentMethod, sortField, sortDir]);

  const total   = filtered.reduce((s, e) => s + e.amount, 0);
  const catCount = Object.keys(
    filtered.reduce((m, e) => { m[e.mainCategory] = 1; return m; }, {})
  ).length;

  const getCategoryName    = (v) => EXPENSE_CATEGORIES.find(c => c.value === v)?.[lang === 'ar' ? 'labelAr' : 'labelEn'] || v;
  const getPaymentMethodName = (v) => PAYMENT_METHODS.find(m => m.value === v)?.[lang === 'ar' ? 'labelAr' : 'labelEn'] || v;

  // ── Export ────────────────────────────────────────────
  const handleExport = () => {
    try {
      const rows = filtered.map(e => ({
        [lang === 'ar' ? 'رقم المصروف' : 'Expense No']:  e.expenseNo,
        [lang === 'ar' ? 'العنوان'     : 'Title']:        e.title,
        [lang === 'ar' ? 'المبلغ'      : 'Amount']:       e.amount,
        [lang === 'ar' ? 'الفئة'       : 'Category']:     getCategoryName(e.mainCategory),
        [lang === 'ar' ? 'طريقة الدفع' : 'Method']:       getPaymentMethodName(e.paymentMethod),
        [lang === 'ar' ? 'المورد'      : 'Vendor']:       e.vendorName || '-',
        [lang === 'ar' ? 'التاريخ'     : 'Date']:         new Date(e.expenseDate).toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-US'),
        [lang === 'ar' ? 'الملاحظات'   : 'Notes']:        e.notes || '-',
      }));
      const ws = XLSX.utils.json_to_sheet(rows);
      ws['!cols'] = [12, 25, 12, 18, 15, 18, 12, 30].map(w => ({ wch: w }));
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, lang === 'ar' ? 'المصاريف' : 'Expenses');
      XLSX.writeFile(wb, `General_Expenses_${new Date().toISOString().slice(0, 10)}.xlsx`);
      toast.success(lang === 'ar' ? 'تم التصدير بنجاح' : 'Exported successfully');
    } catch { toast.error(lang === 'ar' ? 'فشل التصدير' : 'Export failed'); }
  };

  // ── Save ──────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title?.trim()) { toast.error(lang === 'ar' ? 'العنوان مطلوب' : 'Title is required'); return; }
    if (formData.amount <= 0)    { toast.error(lang === 'ar' ? 'المبلغ يجب أن يكون أكبر من صفر' : 'Amount must be greater than zero'); return; }
    setSaving(true);
    try {
      const payload = Object.fromEntries(
        Object.entries({
          title: formData.title.trim(), amount: Number(formData.amount),
          mainCategory: formData.mainCategory, subCategory: formData.subCategory?.trim() || undefined,
          paymentMethod: formData.paymentMethod, referenceNo: formData.referenceNo?.trim() || undefined,
          expenseDate: formData.expenseDate, vendorName: formData.vendorName?.trim() || undefined,
          notes: formData.notes?.trim() || undefined,
        }).filter(([, v]) => v !== undefined)
      );
      if (editingExpense) {
        await axiosInstance.patch(`/general-expenses/${editingExpense._id}`, payload);
        toast.success(lang === 'ar' ? 'تم تحديث المصروف بنجاح' : 'Expense updated successfully');
      } else {
        await axiosInstance.post('/general-expenses', payload);
        toast.success(lang === 'ar' ? 'تم إضافة المصروف بنجاح' : 'Expense added successfully');
      }
      setShowModal(false); setEditingExpense(null); setFormData(emptyForm);
      await fetchExpenses();
    } catch (err) {
      toast.error(err.response?.data?.message || (lang === 'ar' ? 'خطأ في حفظ المصروف' : 'Error saving expense'));
    } finally { setSaving(false); }
  };

  const handleEdit = (expense) => {
    setEditingExpense(expense);
    setFormData({
      title: expense.title || '', amount: expense.amount || 0,
      mainCategory: expense.mainCategory || 'RENT', subCategory: expense.subCategory || '',
      paymentMethod: expense.paymentMethod || 'CASH', referenceNo: expense.referenceNo || '',
      expenseDate: expense.expenseDate
        ? new Date(expense.expenseDate).toISOString().split('T')[0]
        : new Date().toISOString().split('T')[0],
      vendorName: expense.vendorName || '', notes: expense.notes || '',
    });
    setShowModal(true);
  };

  const confirmDeleteAction = async () => {
    if (!confirmDelete?._id) return;
    try {
      await axiosInstance.delete(`/general-expenses/${confirmDelete._id}`);
      toast.success(lang === 'ar' ? 'تم حذف المصروف بنجاح' : 'Expense deleted successfully');
      setConfirmDelete(null); fetchExpenses();
    } catch (err) {
      toast.error(err.response?.data?.message || (lang === 'ar' ? 'خطأ في حذف المصروف' : 'Error deleting expense'));
    }
  };

  if (loading && expenses.length === 0)
    return <FullPageLoader text={lang === 'ar' ? 'جاري تحميل المصاريف...' : 'Loading expenses...'} />;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">

        {/* ── Header ── */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {lang === 'ar' ? 'المصاريف العامة' : 'General Expenses'}
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              {lang === 'ar' ? 'عرض وإدارة المصاريف العامة للشركة' : 'View and manage company general expenses'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchExpenses} disabled={loading}
              className="p-2.5 border border-gray-200 text-gray-600 rounded-xl hover:bg-gray-50 transition bg-white disabled:opacity-50"
              title={lang === 'ar' ? 'تحديث' : 'Refresh'}
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={handleExport}
              className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition font-medium text-sm bg-white"
            >
              <Download className="w-4 h-4" />
              {lang === 'ar' ? 'تصدير' : 'Export'}
            </button>
            <button
              onClick={() => { setEditingExpense(null); setFormData(emptyForm); setShowModal(true); }}
              className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition font-semibold text-sm shadow-sm"
            >
              <Plus className="w-4 h-4" />
              {lang === 'ar' ? 'إضافة مصروف' : 'Add Expense'}
            </button>
          </div>
        </div>

        {/* ── Stats ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <StatCard label={lang === 'ar' ? 'إجمالي المصاريف' : 'Total Expenses'}   value={filtered.length} />
          <StatCard label={lang === 'ar' ? 'إجمالي المبلغ'  : 'Total Amount'}      value={formatCurrency(total, lang)} color="text-indigo-600" />
          <StatCard label={lang === 'ar' ? 'عدد الفئات'     : 'Categories'}        value={catCount} />
          <StatCard label={lang === 'ar' ? 'متوسط المصروف'  : 'Average Expense'}   value={formatCurrency(filtered.length > 0 ? total / filtered.length : 0, lang)} />
        </div>

        {/* ── Filters ── */}
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder={lang === 'ar' ? 'البحث في المصاريف...' : 'Search expenses...'}
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
            />
          </div>
          <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)}
            className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white">
            <option value="all">{lang === 'ar' ? 'كل الفئات' : 'All Categories'}</option>
            {EXPENSE_CATEGORIES.map(c => (
              <option key={c.value} value={c.value}>{lang === 'ar' ? c.labelAr : c.labelEn}</option>
            ))}
          </select>
          <select value={filterPaymentMethod} onChange={e => setFilterPaymentMethod(e.target.value)}
            className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white">
            <option value="all">{lang === 'ar' ? 'كل طرق الدفع' : 'All Methods'}</option>
            {PAYMENT_METHODS.map(m => (
              <option key={m.value} value={m.value}>{lang === 'ar' ? m.labelAr : m.labelEn}</option>
            ))}
          </select>
          {(searchTerm || filterCategory !== 'all' || filterPaymentMethod !== 'all') && (
            <button
              onClick={() => { setSearchTerm(''); setFilterCategory('all'); setFilterPaymentMethod('all'); }}
              className="text-sm text-indigo-600 hover:underline"
            >
              {lang === 'ar' ? 'مسح الفلاتر' : 'Clear'}
            </button>
          )}
        </div>

        {/* ── Table ── */}
        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
          {filtered.length === 0 ? (
            <div className="p-16 text-center">
              <Receipt className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="font-medium text-gray-600 mb-4">
                {lang === 'ar' ? 'لا توجد مصاريف' : 'No expenses found'}
              </p>
              <button
                onClick={() => { setEditingExpense(null); setFormData(emptyForm); setShowModal(true); }}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition font-semibold text-sm"
              >
                <Plus className="w-4 h-4" />
                {lang === 'ar' ? 'إضافة أول مصروف' : 'Add First Expense'}
              </button>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <SortHeader label="#"                                               field="expenseNo"    sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                  <SortHeader label={lang === 'ar' ? 'العنوان'      : 'Title'}       field="title"        sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                  <SortHeader label={lang === 'ar' ? 'المبلغ'       : 'Amount'}      field="amount"       sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                  <SortHeader label={lang === 'ar' ? 'الفئة'        : 'Category'}    field="mainCategory" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                  <SortHeader label={lang === 'ar' ? 'طريقة الدفع'  : 'Method'}      field="paymentMethod" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                  <SortHeader label={lang === 'ar' ? 'التاريخ'      : 'Date'}        field="expenseDate"  sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map(expense => (
                  <tr
                    key={expense._id}
                    className="hover:bg-gray-50/60 transition cursor-pointer"
                    onClick={() => navigate(`/finance/general-expenses/${expense._id}`)}
                  >
                    {/* # */}
                    <td className="px-4 py-3.5">
                      <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                        {expense.expenseNo}
                      </span>
                    </td>

                    {/* Title */}
                    <td className="px-4 py-3.5">
                      <p className="font-medium text-gray-900 text-sm">{expense.title}</p>
                      {expense.vendorName && (
                        <p className="text-xs text-gray-400">{expense.vendorName}</p>
                      )}
                    </td>

                    {/* Amount */}
                    <td className="px-4 py-3.5">
                      <span className="font-semibold text-sm text-indigo-600">
                        {formatCurrency(expense.amount, lang)}
                      </span>
                    </td>

                    {/* Category */}
                    <td className="px-4 py-3.5">
                      <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                        {getCategoryName(expense.mainCategory)}
                      </span>
                      {expense.subCategory && (
                        <p className="text-xs text-gray-400 mt-1">{expense.subCategory}</p>
                      )}
                    </td>

                    {/* Method */}
                    <td className="px-4 py-3.5">
                      <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                        {getPaymentMethodName(expense.paymentMethod)}
                      </span>
                    </td>

                    {/* Date */}
                    <td className="px-4 py-3.5 text-sm text-gray-500">
                      {new Date(expense.expenseDate).toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-US')}
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                        <button
                          onClick={() => handleEdit(expense)}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition font-medium text-sm"
                        >
                          <Edit className="w-3.5 h-3.5" />
                          {lang === 'ar' ? 'تعديل' : 'Edit'}
                        </button>
                        <button
                          onClick={() => setConfirmDelete(expense)}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition font-medium text-sm"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          {lang === 'ar' ? 'حذف' : 'Delete'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* ── Add/Edit Modal ── */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900">
                {editingExpense
                  ? (lang === 'ar' ? 'تعديل المصروف' : 'Edit Expense')
                  : (lang === 'ar' ? 'إضافة مصروف جديد' : 'Add New Expense')}
              </h2>
              <button
                onClick={() => { setShowModal(false); setEditingExpense(null); setFormData(emptyForm); }}
                className="p-1 rounded-md hover:bg-gray-100 text-gray-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Title */}
                <div className="md:col-span-2">
                  <Field label={lang === 'ar' ? 'العنوان' : 'Title'} required>
                    <input type="text" value={formData.title} onChange={e => setF('title', e.target.value)}
                      placeholder={lang === 'ar' ? 'مثال: فاتورة كهرباء يناير' : 'e.g., January Electricity Bill'}
                      className={inputCls} required />
                  </Field>
                </div>

                {/* Amount */}
                <Field label={lang === 'ar' ? 'المبلغ' : 'Amount'} required>
                  <input type="number" min="0" step="0.01" value={formData.amount}
                    onChange={e => setF('amount', e.target.value)} className={inputCls} required />
                </Field>

                {/* Date */}
                <Field label={lang === 'ar' ? 'تاريخ المصروف' : 'Expense Date'} required>
                  <input type="date" value={formData.expenseDate}
                    onChange={e => setF('expenseDate', e.target.value)} className={inputCls} required />
                </Field>

                {/* Category */}
                <Field label={lang === 'ar' ? 'الفئة' : 'Category'} required>
                  <select value={formData.mainCategory} onChange={e => setF('mainCategory', e.target.value)}
                    className={inputCls} required>
                    {EXPENSE_CATEGORIES.map(c => (
                      <option key={c.value} value={c.value}>{lang === 'ar' ? c.labelAr : c.labelEn}</option>
                    ))}
                  </select>
                </Field>

                {/* Sub Category */}
                <Field label={lang === 'ar' ? 'الفئة الفرعية' : 'Sub Category'}>
                  <input type="text" value={formData.subCategory}
                    onChange={e => setF('subCategory', e.target.value)}
                    placeholder={lang === 'ar' ? 'مثال: كهرباء' : 'e.g., Electricity'} className={inputCls} />
                </Field>

                {/* Payment Method */}
                <Field label={lang === 'ar' ? 'طريقة الدفع' : 'Payment Method'} required>
                  <select value={formData.paymentMethod} onChange={e => setF('paymentMethod', e.target.value)}
                    className={inputCls} required>
                    {PAYMENT_METHODS.map(m => (
                      <option key={m.value} value={m.value}>{lang === 'ar' ? m.labelAr : m.labelEn}</option>
                    ))}
                  </select>
                </Field>

                {/* Reference No */}
                <Field label={lang === 'ar' ? 'رقم المرجع' : 'Reference No'}>
                  <input type="text" value={formData.referenceNo}
                    onChange={e => setF('referenceNo', e.target.value)}
                    placeholder={lang === 'ar' ? 'رقم الفاتورة أو الإيصال' : 'Invoice or receipt number'}
                    className={inputCls} />
                </Field>

                {/* Vendor */}
                <div className="md:col-span-2">
                  <Field label={lang === 'ar' ? 'اسم المورد/الجهة' : 'Vendor Name'}>
                    <input type="text" value={formData.vendorName}
                      onChange={e => setF('vendorName', e.target.value)}
                      placeholder={lang === 'ar' ? 'مثال: شركة الكهرباء' : 'e.g., Electricity Company'}
                      className={inputCls} />
                  </Field>
                </div>

                {/* Notes */}
                <div className="md:col-span-2">
                  <Field label={lang === 'ar' ? 'ملاحظات' : 'Notes'}>
                    <textarea rows={3} value={formData.notes}
                      onChange={e => setF('notes', e.target.value)}
                      placeholder={lang === 'ar' ? 'أضف ملاحظات إضافية...' : 'Add additional notes...'}
                      className={inputCls} />
                  </Field>
                </div>
              </div>

              {/* Modal actions */}
              <div className="flex gap-3 mt-6">
                <button type="button"
                  onClick={() => { setShowModal(false); setEditingExpense(null); setFormData(emptyForm); }}
                  disabled={saving}
                  className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition font-medium text-sm"
                >
                  {lang === 'ar' ? 'إلغاء' : 'Cancel'}
                </button>
                <button type="submit" disabled={saving}
                  className="flex-1 px-4 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition font-semibold text-sm disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {saving && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                  {saving
                    ? (lang === 'ar' ? 'جاري الحفظ...' : 'Saving...')
                    : (lang === 'ar' ? 'حفظ' : 'Save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Delete Confirm Modal ── */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-11 h-11 rounded-full bg-red-100 flex items-center justify-center">
                <Trash2 className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-gray-900">
                  {lang === 'ar' ? 'تأكيد الحذف' : 'Confirm Delete'}
                </h3>
                <p className="text-sm text-gray-500">
                  {lang === 'ar' ? 'هل أنت متأكد من حذف هذا المصروف؟' : 'Are you sure you want to delete this expense?'}
                </p>
              </div>
            </div>
            <div className="bg-gray-50 rounded-xl p-4 mb-4">
              <p className="font-medium text-gray-900 text-sm">{confirmDelete.title}</p>
              <p className="text-indigo-600 font-bold text-sm mt-1">{formatCurrency(confirmDelete.amount, lang)}</p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDelete(null)}
                className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition font-medium text-sm">
                {lang === 'ar' ? 'إلغاء' : 'Cancel'}
              </button>
              <button onClick={confirmDeleteAction}
                className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-xl hover:bg-red-700 transition font-semibold text-sm">
                {lang === 'ar' ? 'حذف' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}