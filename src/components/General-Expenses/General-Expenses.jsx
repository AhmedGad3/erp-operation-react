import { useState, useEffect, useMemo, useContext } from 'react';
import { Plus, Edit, Trash2, DollarSign, Search, X, RefreshCw, Download, Receipt } from 'lucide-react';
import { toast } from 'react-toastify';
import { formatCurrency } from '../../utils/dateFormat';
import axiosInstance from '../../utils/axiosInstance';
import * as XLSX from 'xlsx';
import FullPageLoader from '../Loader/Loader';
import { LanguageContext } from '../../context/LanguageContext';
import { useNavigate } from 'react-router-dom';

const EXPENSE_CATEGORIES = [
  { value: 'RENT', labelEn: 'Rent', labelAr: 'إيجارات' },
  { value: 'UTILITIES', labelEn: 'Utilities', labelAr: 'مرافق' },
  { value: 'MAINTENANCE', labelEn: 'Maintenance', labelAr: 'صيانة' },
  { value: 'OFFICE_SUPPLIES', labelEn: 'Office Supplies', labelAr: 'أدوات مكتبية' },
  { value: 'HOSPITALITY', labelEn: 'Hospitality', labelAr: 'ضيافة' },
  { value: 'COMMUNICATION', labelEn: 'Communication', labelAr: 'اتصالات' },
  { value: 'TRANSPORTATION', labelEn: 'Transportation', labelAr: 'مواصلات' },
  { value: 'PROFESSIONAL_FEES', labelEn: 'Professional Fees', labelAr: 'رسوم مهنية' },
  { value: 'INSURANCE', labelEn: 'Insurance', labelAr: 'تأمينات' },
  { value: 'MARKETING', labelEn: 'Marketing', labelAr: 'تسويق' },
  { value: 'SALARIES', labelEn: 'Salaries', labelAr: 'رواتب' },
  { value: 'OTHERS', labelEn: 'Others', labelAr: 'أخرى' },
];

const PAYMENT_METHODS = [
  { value: 'CASH', labelEn: 'Cash', labelAr: 'نقدي' },
  { value: 'TRANSFER', labelEn: 'Bank Transfer', labelAr: 'تحويل بنكي' },
  { value: 'CHEQUE', labelEn: 'Cheque', labelAr: 'شيك' },
];

export default function GeneralExpenses() {
  const navigate = useNavigate();

  const { lang, t } = useContext(LanguageContext);
  
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  
  const [showModal, setShowModal] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterPaymentMethod, setFilterPaymentMethod] = useState('all');
  
  const [formData, setFormData] = useState({
    title: '',
    amount: 0,
    mainCategory: 'RENT',
    subCategory: '',
    paymentMethod: 'CASH',
    referenceNo: '',
    expenseDate: new Date().toISOString().split('T')[0],
    vendorName: '',
    notes: '',
  });

  // ================= FETCH =================
  const fetchExpenses = async () => {
    try {
      setLoading(true);
      const { data } = await axiosInstance.get('/general-expenses');
      setExpenses(data || []);
    } catch (err) {
      console.error(err);
      toast.error(
        lang === 'ar' ? 'خطأ في تحميل المصاريف' : 'Error loading expenses',
        { position: 'top-right', autoClose: 3000 }
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExpenses();
  }, []);

  // ================= FILTER =================
  const filteredExpenses = useMemo(() => {
    let filtered = expenses;

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(expense => 
        expense.title?.toLowerCase().includes(term) ||
        expense.vendorName?.toLowerCase().includes(term) ||
        expense.subCategory?.toLowerCase().includes(term) ||
        expense.notes?.toLowerCase().includes(term) ||
        expense.referenceNo?.toLowerCase().includes(term)
      );
    }

    if (filterCategory !== 'all') {
      filtered = filtered.filter(expense => expense.mainCategory === filterCategory);
    }

    if (filterPaymentMethod !== 'all') {
      filtered = filtered.filter(expense => expense.paymentMethod === filterPaymentMethod);
    }

    return filtered;
  }, [expenses, searchTerm, filterCategory, filterPaymentMethod]);

  // ================= STATS =================
  const stats = useMemo(() => {
    const total = filteredExpenses.reduce((sum, exp) => sum + exp.amount, 0);
    const byCategory = {};
    
    filteredExpenses.forEach(exp => {
      if (!byCategory[exp.mainCategory]) {
        byCategory[exp.mainCategory] = 0;
      }
      byCategory[exp.mainCategory] += exp.amount;
    });

    return { total, count: filteredExpenses.length, byCategory };
  }, [filteredExpenses]);

  // ================= EXPORT TO EXCEL =================
  const handleExportToExcel = () => {
    try {
      const exportData = filteredExpenses.map(expense => ({
        [lang === 'ar' ? 'رقم المصروف' : 'Expense No']: expense.expenseNo,
        [lang === 'ar' ? 'العنوان' : 'Title']: expense.title,
        [lang === 'ar' ? 'المبلغ' : 'Amount']: expense.amount,
        [lang === 'ar' ? 'الفئة' : 'Category']: getCategoryName(expense.mainCategory),
        [lang === 'ar' ? 'الفئة الفرعية' : 'Sub Category']: expense.subCategory || '-',
        [lang === 'ar' ? 'طريقة الدفع' : 'Payment Method']: getPaymentMethodName(expense.paymentMethod),
        [lang === 'ar' ? 'رقم المرجع' : 'Reference No']: expense.referenceNo || '-',
        [lang === 'ar' ? 'اسم المورد' : 'Vendor Name']: expense.vendorName || '-',
        [lang === 'ar' ? 'التاريخ' : 'Date']: new Date(expense.expenseDate).toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-US'),
        [lang === 'ar' ? 'الملاحظات' : 'Notes']: expense.notes || '-',
      }));

      const ws = XLSX.utils.json_to_sheet(exportData);
      
      const columnWidths = [
        { wch: 12 }, { wch: 25 }, { wch: 12 }, { wch: 18 },
        { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 18 },
        { wch: 12 }, { wch: 30 }
      ];
      ws['!cols'] = columnWidths;

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, lang === 'ar' ? 'المصاريف' : 'Expenses');
      
      const fileName = `General_Expenses_${new Date().toISOString().slice(0, 10)}.xlsx`;
      XLSX.writeFile(wb, fileName);
      
      toast.success(
        lang === 'ar' ? 'تم تصدير البيانات بنجاح' : 'Data exported successfully',
        { position: 'top-right', autoClose: 2000 }
      );
    } catch (error) {
      toast.error(
        lang === 'ar' ? 'فشل التصدير' : 'Export failed',
        { position: 'top-right', autoClose: 3000 }
      );
      console.error('Export error:', error);
    }
  };

  // ================= SAVE =================
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.title?.trim()) {
      toast.error(
        lang === 'ar' ? 'العنوان مطلوب' : 'Title is required',
        { position: 'top-right', autoClose: 3000 }
      );
      return;
    }

    if (formData.amount <= 0) {
      toast.error(
        lang === 'ar' ? 'المبلغ يجب أن يكون أكبر من صفر' : 'Amount must be greater than zero',
        { position: 'top-right', autoClose: 3000 }
      );
      return;
    }

    setSaving(true);

    try {
      const payload = {
        title: formData.title.trim(),
        amount: Number(formData.amount),
        mainCategory: formData.mainCategory,
        subCategory: formData.subCategory?.trim() || undefined,
        paymentMethod: formData.paymentMethod,
        referenceNo: formData.referenceNo?.trim() || undefined,
        expenseDate: formData.expenseDate,
        vendorName: formData.vendorName?.trim() || undefined,
        notes: formData.notes?.trim() || undefined,
      };

      Object.keys(payload).forEach(key => payload[key] === undefined && delete payload[key]);

      if (editingExpense) {
        await axiosInstance.patch(`/general-expenses/${editingExpense._id}`, payload);
        toast.success(
          lang === 'ar' ? 'تم تحديث المصروف بنجاح' : 'Expense updated successfully',
          { position: 'top-right', autoClose: 2000 }
        );
      } else {
        await axiosInstance.post('/general-expenses', payload);
        toast.success(
          lang === 'ar' ? 'تم إضافة المصروف بنجاح' : 'Expense added successfully',
          { position: 'top-right', autoClose: 2000 }
        );
      }
      
      setShowModal(false);
      setEditingExpense(null);
      resetForm();
      await fetchExpenses();
      
    } catch (err) {
      console.error('Error saving expense:', err);
      
      let errorMsg = lang === 'ar' ? 'خطأ في حفظ المصروف' : 'Error saving expense';
      
      if (err.response?.data?.message) {
        errorMsg = err.response.data.message;
      }
      
      toast.error(errorMsg, {
        position: 'top-right',
        autoClose: 4000,
      });
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (expense) => {
    setEditingExpense(expense);
    setFormData({
      title: expense.title || '',
      amount: expense.amount || 0,
      mainCategory: expense.mainCategory || 'RENT',
      subCategory: expense.subCategory || '',
      paymentMethod: expense.paymentMethod || 'CASH',
      referenceNo: expense.referenceNo || '',
      expenseDate: expense.expenseDate 
        ? new Date(expense.expenseDate).toISOString().split('T')[0] 
        : new Date().toISOString().split('T')[0],
      vendorName: expense.vendorName || '',
      notes: expense.notes || '',
    });
    setShowModal(true);
  };

  // ================= DELETE =================
  const handleDeleteClick = (expense) => {
    setConfirmDelete(expense);
  };

  const confirmDeleteAction = async () => {
    if (!confirmDelete || !confirmDelete._id) {
      console.error('No expense to delete');
      return;
    }

    try {
      await axiosInstance.delete(`/general-expenses/${confirmDelete._id}`);
      
      toast.success(
        lang === 'ar' ? 'تم حذف المصروف بنجاح' : 'Expense deleted successfully',
        { position: 'top-right', autoClose: 2000 }
      );

      setConfirmDelete(null);
      fetchExpenses();
    } catch (err) {
      console.error('Error:', err);
      
      let errorMsg = lang === 'ar' ? 'خطأ في حذف المصروف' : 'Error deleting expense';
      
      if (err.response?.data?.message) {
        errorMsg = err.response.data.message;
      }
      
      toast.error(errorMsg, { position: 'top-right', autoClose: 3000 });
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      amount: 0,
      mainCategory: 'RENT',
      subCategory: '',
      paymentMethod: 'CASH',
      referenceNo: '',
      expenseDate: new Date().toISOString().split('T')[0],
      vendorName: '',
      notes: '',
    });
  };

  const getCategoryName = (categoryValue) => {
    return EXPENSE_CATEGORIES.find(c => c.value === categoryValue)?.[lang === 'ar' ? 'labelAr' : 'labelEn'] || categoryValue;
  };

  const getPaymentMethodName = (methodValue) => {
    return PAYMENT_METHODS.find(m => m.value === methodValue)?.[lang === 'ar' ? 'labelAr' : 'labelEn'] || methodValue;
  };

  if (loading && expenses.length === 0) {
    return <FullPageLoader text={lang === 'ar' ? 'جاري تحميل المصاريف...' : 'Loading expenses...'} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden mb-6">
          <div className="bg-gradient-to-r from-emerald-600 to-emerald-700 px-8 py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Receipt className="w-8 h-8 text-white" />
                <div>
                  <h1 className="text-2xl font-bold text-white">
                    {lang === 'ar' ? 'المصاريف العامة' : 'General Expenses'}
                  </h1>
                  <p className="text-emerald-100 mt-1">
                    {lang === 'ar' 
                      ? 'عرض وإدارة المصاريف العامة للشركة' 
                      : 'View and manage company general expenses'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={fetchExpenses}
                  disabled={loading}
                  className="flex items-center gap-2 px-4 py-3 bg-white/20 hover:bg-white/30 text-white rounded-lg transition font-semibold"
                  title={lang === 'ar' ? 'تحديث' : 'Refresh'}
                >
                  <div className={loading ? 'animate-spin' : ''}>
                    <RefreshCw className="w-5 h-5" />
                  </div>
                </button>
                <button
                  onClick={handleExportToExcel}
                  className="flex items-center gap-2 px-6 py-3 bg-green-500 hover:bg-green-600 text-white rounded-lg transition font-semibold shadow-md"
                >
                  <Download className="w-5 h-5" />
                  <span>{lang === 'ar' ? 'تصدير' : 'Export'}</span>
                </button>
                <button
                  onClick={() => {
                    setEditingExpense(null);
                    resetForm();
                    setShowModal(true);
                  }}
                  className="flex items-center gap-2 px-6 py-3 bg-white text-emerald-600 rounded-lg hover:bg-emerald-50 transition font-semibold shadow-md"
                >
                  <Plus className="w-5 h-5" />
                  <span>{lang === 'ar' ? 'إضافة مصروف' : 'Add Expense'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 p-6 bg-gray-50">
            <div className="bg-white p-4 rounded-lg border-l-4 border-emerald-500">
              <p className="text-sm text-gray-600 mb-1">
                {lang === 'ar' ? 'إجمالي المصاريف' : 'Total Expenses'}
              </p>
              <p className="text-2xl font-bold text-gray-900">{stats.count}</p>
            </div>
            <div className="bg-white p-4 rounded-lg border-l-4 border-blue-500">
              <p className="text-sm text-gray-600 mb-1">
                {lang === 'ar' ? 'إجمالي المبلغ' : 'Total Amount'}
              </p>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(stats.total, lang)}
              </p>
            </div>
            <div className="bg-white p-4 rounded-lg border-l-4 border-purple-500">
              <p className="text-sm text-gray-600 mb-1">
                {lang === 'ar' ? 'عدد الفئات' : 'Categories'}
              </p>
              <p className="text-2xl font-bold text-gray-900">
                {Object.keys(stats.byCategory).length}
              </p>
            </div>
            <div className="bg-white p-4 rounded-lg border-l-4 border-orange-500">
              <p className="text-sm text-gray-600 mb-1">
                {lang === 'ar' ? 'متوسط المصروف' : 'Average Expense'}
              </p>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(stats.count > 0 ? stats.total / stats.count : 0, lang)}
              </p>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-3.5 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder={lang === 'ar' ? 'البحث في المصاريف...' : 'Search expenses...'}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
              />
            </div>

            {/* Category Filter */}
            <div>
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
              >
                <option value="all">{lang === 'ar' ? 'كل الفئات' : 'All Categories'}</option>
                {EXPENSE_CATEGORIES.map((cat) => (
                  <option key={cat.value} value={cat.value}>
                    {lang === 'ar' ? cat.labelAr : cat.labelEn}
                  </option>
                ))}
              </select>
            </div>

            {/* Payment Method Filter */}
            <div>
              <select
                value={filterPaymentMethod}
                onChange={(e) => setFilterPaymentMethod(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
              >
                <option value="all">{lang === 'ar' ? 'كل طرق الدفع' : 'All Payment Methods'}</option>
                {PAYMENT_METHODS.map((method) => (
                  <option key={method.value} value={method.value}>
                    {lang === 'ar' ? method.labelAr : method.labelEn}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Clear Filters */}
          {(searchTerm || filterCategory !== 'all' || filterPaymentMethod !== 'all') && (
            <button
              onClick={() => {
                setSearchTerm('');
                setFilterCategory('all');
                setFilterPaymentMethod('all');
              }}
              className="mt-4 text-sm text-emerald-600 hover:text-emerald-700 font-medium"
            >
              {lang === 'ar' ? 'مسح الفلاتر' : 'Clear Filters'}
            </button>
          )}
        </div>

        {/* Expenses Table */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          {filteredExpenses.length === 0 ? (
            <div className="p-12 text-center">
              <Receipt className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                {lang === 'ar' ? 'لا توجد مصاريف' : 'No Expenses Found'}
              </h3>
              <p className="text-gray-600 mb-6">
                {lang === 'ar' ? 'لم يتم العثور على مصاريف مطابقة للفلاتر المحددة' : 'No expenses match your current filters'}
              </p>
              <button
                onClick={() => {
                  setEditingExpense(null);
                  resetForm();
                  setShowModal(true);
                }}
                className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition font-semibold"
              >
                <Plus className="w-5 h-5" />
                {lang === 'ar' ? 'إضافة أول مصروف' : 'Add First Expense'}
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                      {lang === 'ar' ? '#' : '#'}
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                      {lang === 'ar' ? 'العنوان' : 'Title'}
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                      {lang === 'ar' ? 'المبلغ' : 'Amount'}
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                      {lang === 'ar' ? 'الفئة' : 'Category'}
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                      {lang === 'ar' ? 'طريقة الدفع' : 'Payment Method'}
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                      {lang === 'ar' ? 'التاريخ' : 'Date'}
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                      {lang === 'ar' ? 'الإجراءات' : 'Actions'}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredExpenses.map((expense) => (
                  <tr
  key={expense._id}
  className="hover:bg-gray-50 transition cursor-pointer"
  onClick={() => navigate(`/finance/general-expenses/${expense._id}`)}
>

                      <td className="px-6 py-4">
                        <span className="px-3 py-1 rounded-full text-xs font-semibold bg-purple-100 text-purple-800 border border-purple-200">
                          {expense.expenseNo}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-semibold text-gray-900">{expense.title}</p>
                          {expense.vendorName && (
                            <p className="text-sm text-gray-500">{expense.vendorName}</p>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-lg font-bold text-emerald-600">
                          {formatCurrency(expense.amount, lang)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-semibold">
                          {getCategoryName(expense.mainCategory)}
                        </span>
                        {expense.subCategory && (
                          <p className="text-xs text-gray-500 mt-1">{expense.subCategory}</p>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-3 py-1 bg-gray-100 text-gray-800 rounded-full text-xs font-semibold">
                          {getPaymentMethodName(expense.paymentMethod)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {new Date(expense.expenseDate).toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-US')}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleEdit(expense)}
                            className="flex items-center gap-1 px-3 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition font-medium"
                          >
                            <Edit className="w-4 h-4" />
                            {lang === 'ar' ? 'تعديل' : 'Edit'}
                          </button>
                          <button
                            onClick={() => handleDeleteClick(expense)}
                            className="flex items-center gap-1 px-3 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition font-medium"
                          >
                            <Trash2 className="w-4 h-4" />
                            {lang === 'ar' ? 'حذف' : 'Delete'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-gradient-to-r from-emerald-600 to-emerald-700 px-8 py-6 border-b border-emerald-500">
              <h2 className="text-2xl font-bold text-white">
                {editingExpense 
                  ? (lang === 'ar' ? 'تعديل المصروف' : 'Edit Expense')
                  : (lang === 'ar' ? 'إضافة مصروف جديد' : 'Add New Expense')
                }
              </h2>
            </div>

            <form onSubmit={handleSubmit} className="p-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Title */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    {lang === 'ar' ? 'العنوان' : 'Title'} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
                    required
                    placeholder={lang === 'ar' ? 'مثال: فاتورة كهرباء يناير' : 'e.g., January Electricity Bill'}
                  />
                </div>

                {/* Amount */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    {lang === 'ar' ? 'المبلغ' : 'Amount'} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
                    required
                    min="0"
                    step="0.01"
                  />
                </div>

                {/* Expense Date */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    {lang === 'ar' ? 'تاريخ المصروف' : 'Expense Date'} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={formData.expenseDate}
                    onChange={(e) => setFormData({ ...formData, expenseDate: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
                    required
                  />
                </div>

                {/* Main Category */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    {lang === 'ar' ? 'الفئة' : 'Category'} <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.mainCategory}
                    onChange={(e) => setFormData({ ...formData, mainCategory: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
                    required
                  >
                    {EXPENSE_CATEGORIES.map(cat => (
                      <option key={cat.value} value={cat.value}>
                        {lang === 'ar' ? cat.labelAr : cat.labelEn}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Sub Category */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    {lang === 'ar' ? 'الفئة الفرعية' : 'Sub Category'}
                  </label>
                  <input
                    type="text"
                    value={formData.subCategory}
                    onChange={(e) => setFormData({ ...formData, subCategory: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
                    placeholder={lang === 'ar' ? 'مثال: كهرباء' : 'e.g., Electricity'}
                  />
                </div>

                {/* Payment Method */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    {lang === 'ar' ? 'طريقة الدفع' : 'Payment Method'} <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.paymentMethod}
                    onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
                    required
                  >
                    {PAYMENT_METHODS.map(method => (
                      <option key={method.value} value={method.value}>
                        {lang === 'ar' ? method.labelAr : method.labelEn}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Reference No */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    {lang === 'ar' ? 'رقم المرجع' : 'Reference No'}
                  </label>
                  <input
                    type="text"
                    value={formData.referenceNo}
                    onChange={(e) => setFormData({ ...formData, referenceNo: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
                    placeholder={lang === 'ar' ? 'رقم الفاتورة أو الإيصال' : 'Invoice or receipt number'}
                  />
                </div>

                {/* Vendor Name */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    {lang === 'ar' ? 'اسم المورد/الجهة' : 'Vendor Name'}
                  </label>
                  <input
                    type="text"
                    value={formData.vendorName}
                    onChange={(e) => setFormData({ ...formData, vendorName: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
                    placeholder={lang === 'ar' ? 'مثال: شركة الكهرباء' : 'e.g., Electricity Company'}
                  />
                </div>

                {/* Notes */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    {lang === 'ar' ? 'ملاحظات' : 'Notes'}
                  </label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    rows="3"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
                    placeholder={lang === 'ar' ? 'أضف ملاحظات إضافية...' : 'Add additional notes...'}
                  />
                </div>
              </div>

              {/* Buttons */}
              <div className="flex gap-4 mt-8">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 px-6 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition font-semibold disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {saving && (
                    <div className="animate-spin inline-block w-5 h-5 border-2 border-current border-t-transparent text-white rounded-full"></div>
                  )}
                  {saving 
                    ? (lang === 'ar' ? 'جاري الحفظ...' : 'Saving...') 
                    : (lang === 'ar' ? 'حفظ' : 'Save')}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setEditingExpense(null);
                    resetForm();
                  }}
                  disabled={saving}
                  className="flex-1 px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition font-semibold disabled:opacity-50"
                >
                  {lang === 'ar' ? 'إلغاء' : 'Cancel'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full flex items-center justify-center bg-red-100">
                <Trash2 className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">
                  {lang === 'ar' ? 'تأكيد الحذف' : 'Confirm Delete'}
                </h3>
                <p className="text-sm text-gray-500">
                  {lang === 'ar' ? 'هل أنت متأكد من حذف هذا المصروف؟' : 'Are you sure you want to delete this expense?'}
                </p>
              </div>
            </div>
            
            <div className="bg-gray-50 rounded-lg p-4 mb-4">
              <p className="text-sm text-gray-600 mb-1">{lang === 'ar' ? 'المصروف:' : 'Expense:'}</p>
              <p className="font-semibold text-gray-900">{confirmDelete.title}</p>
              <p className="text-lg font-bold text-emerald-600 mt-1">
                {formatCurrency(confirmDelete.amount, lang)}
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDelete(null)}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition font-semibold"
              >
                {lang === 'ar' ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                onClick={confirmDeleteAction}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition font-semibold"
              >
                {lang === 'ar' ? 'حذف' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}