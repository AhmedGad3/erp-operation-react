import { useState, useEffect, useContext } from 'react';
import { Package, Search, Calendar, User, FileText, Plus, Eye, Loader2, AlertCircle, X, Filter, Clock, CreditCard, Download, FileDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import axiosInstance from '../../utils/axiosInstance';
import { LanguageContext } from '../../context/LanguageContext';
import FullPageLoader from '../Loader/Loader';
import { exportToExcel } from '../../utils/excelExport';
import { exportToPDF } from '../../utils/pdfExport';
import { toast } from 'react-toastify';

const PurchaseReturns = () => {
  const { lang, t } = useContext(LanguageContext);
  const navigate = useNavigate();
  
  const [returns, setReturns] = useState([]);
  const [filteredReturns, setFilteredReturns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  
  // Modal states
  const [selectedReturn, setSelectedReturn] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [enrichedReturn, setEnrichedReturn] = useState(null);

  useEffect(() => {
    fetchReturns();
  }, []);

  useEffect(() => {
    filterReturns();
  }, [searchTerm, startDate, endDate, returns]);

  const fetchReturns = async () => {
    try {
      setLoading(true);
      const response = await axiosInstance.get('/purchases/return');
      const data = response.data.result || [];
      
      const enrichedData = data.map((ret) => ({
        ...ret,
        items: ret.items.map((item) => ({
          ...item,
          material: item.materialId,
          unit: item.unitId
        }))
      }));
      
      setReturns(enrichedData);
      setFilteredReturns(enrichedData);
      
      if (enrichedData.length === 0) {
        toast.info(lang === 'ar' ? 'لا توجد مرتجعات في النظام' : 'No returns found in the system');
      }
    } catch (error) {
      toast.error(lang === 'ar' ? 'فشل تحميل مرتجعات الشراء' : 'Failed to load purchase returns');
      setReturns([]);
      setFilteredReturns([]);
    } finally {
      setLoading(false);
    }
  };

  const filterReturns = () => {
    let filtered = [...returns];

    if (searchTerm) {
      filtered = filtered.filter(ret => 
        ret.returnNo?.toString().includes(searchTerm) ||
        ret.supplierId?.nameEn?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ret.supplierId?.nameAr?.includes(searchTerm) ||
        ret.supplierId?.code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ret.notes?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ret.items?.some(item => 
          item.material?.nameEn?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.material?.nameAr?.includes(searchTerm) ||
          item.material?.code?.toLowerCase().includes(searchTerm.toLowerCase())
        )
      );
    }

    if (startDate) {
      filtered = filtered.filter(ret => 
        new Date(ret.returnDate) >= new Date(startDate)
      );
    }
    if (endDate) {
      filtered = filtered.filter(ret => 
        new Date(ret.returnDate) <= new Date(endDate)
      );
    }

    setFilteredReturns(filtered);
  };

  const handleViewDetails = (returnItem) => {
    setSelectedReturn(returnItem);
    setShowDetailsModal(true);
    setEnrichedReturn(returnItem);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatDateTime = (dateString) => {
    return new Date(dateString).toLocaleString(lang === 'ar' ? 'ar-EG' : 'en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleExportExcel = () => {
    try {
      if (filteredReturns.length === 0) {
        toast.error(lang === 'ar' ? 'لا توجد بيانات للتصدير' : 'No data to export');
        return;
      }

      const data = filteredReturns.map((ret) => ({
        [lang === 'ar' ? 'رقم المرتجع' : 'Return #']: ret.returnNo,
        [lang === 'ar' ? 'المورد' : 'Supplier']: lang === 'ar' ? ret.supplierId?.nameAr : ret.supplierId?.nameEn,
        [lang === 'ar' ? 'كود المورد' : 'Supplier Code']: ret.supplierId?.code || '',
        [lang === 'ar' ? 'تاريخ المرتجع' : 'Return Date']: formatDate(ret.returnDate),
        [lang === 'ar' ? 'عدد الأصناف' : 'Items Count']: ret.items?.length || 0,
        [lang === 'ar' ? 'المبلغ الإجمالي' : 'Total Amount']: ret.totalAmount?.toFixed(2) || '0.00',
        [lang === 'ar' ? 'أنشئ بواسطة' : 'Created By']: ret.createdBy?.name || 'N/A',
        [lang === 'ar' ? 'البريد الإلكتروني' : 'Email']: ret.createdBy?.email || 'N/A',
        [lang === 'ar' ? 'تاريخ الإنشاء' : 'Created At']: formatDate(ret.createdAt),
        [lang === 'ar' ? 'ملاحظات' : 'Notes']: ret.notes || '',
      }));

      const headers = Object.keys(data[0]).map(key => ({ [key]: key }));
      
      exportToExcel(data, headers, lang === 'ar' ? 'مرتجعات_المشتريات' : 'Purchase_Returns', lang);
      
      toast.success(lang === 'ar' ? 'تم التصدير بنجاح' : 'Exported successfully');
    } catch (err) {
      console.error('Export error:', err);
      toast.error(lang === 'ar' ? 'فشل التصدير' : 'Export failed');
    }
  };

  const handleExportSingleReturnExcel = () => {
    try {
      if (!enrichedReturn) return;

      const data = [];
      
      // First item with all header info
      if (enrichedReturn.items && enrichedReturn.items.length > 0) {
        const firstItem = enrichedReturn.items[0];
        data.push({
          [lang === 'ar' ? 'رقم المرتجع' : 'Return #']: enrichedReturn.returnNo,
          [lang === 'ar' ? 'المورد' : 'Supplier']: lang === 'ar' ? enrichedReturn.supplierId?.nameAr : enrichedReturn.supplierId?.nameEn,
          [lang === 'ar' ? 'كود المورد' : 'Supplier Code']: enrichedReturn.supplierId?.code || '',
          [lang === 'ar' ? 'تاريخ المرتجع' : 'Return Date']: formatDate(enrichedReturn.returnDate),
          [lang === 'ar' ? 'أنشئ بواسطة' : 'Created By']: enrichedReturn.createdBy?.name || 'N/A',
          [lang === 'ar' ? 'البريد الإلكتروني' : 'Email']: enrichedReturn.createdBy?.email || 'N/A',
          [lang === 'ar' ? 'تاريخ الإنشاء' : 'Created At']: formatDate(enrichedReturn.createdAt),
          [lang === 'ar' ? 'ملاحظات' : 'Notes']: enrichedReturn.notes || '',
          [lang === 'ar' ? '#' : '#']: 1,
          [lang === 'ar' ? 'اسم المادة' : 'Material Name']: lang === 'ar' ? firstItem.material?.nameAr : firstItem.material?.nameEn,
          [lang === 'ar' ? 'كود المادة' : 'Material Code']: firstItem.material?.code,
          [lang === 'ar' ? 'الكمية' : 'Quantity']: firstItem.quantity,
          [lang === 'ar' ? 'الوحدة' : 'Unit']: lang === 'ar' ? firstItem.unit?.nameAr : firstItem.unit?.nameEn,
          [lang === 'ar' ? 'سعر الوحدة' : 'Unit Price']: firstItem.unitPrice.toFixed(2),
          [lang === 'ar' ? 'الإجمالي' : 'Total']: firstItem.total.toFixed(2),
        });

        // Remaining items (starting from index 1)
        for (let i = 1; i < enrichedReturn.items.length; i++) {
          const item = enrichedReturn.items[i];
          data.push({
            [lang === 'ar' ? 'رقم المرتجع' : 'Return #']: '',
            [lang === 'ar' ? 'المورد' : 'Supplier']: '',
            [lang === 'ar' ? 'كود المورد' : 'Supplier Code']: '',
            [lang === 'ar' ? 'تاريخ المرتجع' : 'Return Date']: '',
            [lang === 'ar' ? 'أنشئ بواسطة' : 'Created By']: '',
            [lang === 'ar' ? 'البريد الإلكتروني' : 'Email']: '',
            [lang === 'ar' ? 'تاريخ الإنشاء' : 'Created At']: '',
            [lang === 'ar' ? 'ملاحظات' : 'Notes']: '',
            [lang === 'ar' ? '#' : '#']: i + 1,
            [lang === 'ar' ? 'اسم المادة' : 'Material Name']: lang === 'ar' ? item.material?.nameAr : item.material?.nameEn,
            [lang === 'ar' ? 'كود المادة' : 'Material Code']: item.material?.code,
            [lang === 'ar' ? 'الكمية' : 'Quantity']: item.quantity,
            [lang === 'ar' ? 'الوحدة' : 'Unit']: lang === 'ar' ? item.unit?.nameAr : item.unit?.nameEn,
            [lang === 'ar' ? 'سعر الوحدة' : 'Unit Price']: item.unitPrice.toFixed(2),
            [lang === 'ar' ? 'الإجمالي' : 'Total']: item.total.toFixed(2),
          });
        }
      }

      // Total row
      data.push({
        [lang === 'ar' ? 'رقم المرتجع' : 'Return #']: '',
        [lang === 'ar' ? 'المورد' : 'Supplier']: '',
        [lang === 'ar' ? 'كود المورد' : 'Supplier Code']: '',
        [lang === 'ar' ? 'تاريخ المرتجع' : 'Return Date']: '',
        [lang === 'ar' ? 'أنشئ بواسطة' : 'Created By']: '',
        [lang === 'ar' ? 'البريد الإلكتروني' : 'Email']: '',
        [lang === 'ar' ? 'تاريخ الإنشاء' : 'Created At']: '',
        [lang === 'ar' ? 'ملاحظات' : 'Notes']: '',
        [lang === 'ar' ? '#' : '#']: '',
        [lang === 'ar' ? 'اسم المادة' : 'Material Name']: '',
        [lang === 'ar' ? 'كود المادة' : 'Material Code']: '',
        [lang === 'ar' ? 'الكمية' : 'Quantity']: '',
        [lang === 'ar' ? 'الوحدة' : 'Unit']: '',
        [lang === 'ar' ? 'سعر الوحدة' : 'Unit Price']: lang === 'ar' ? 'المجموع الكلي:' : 'Total Amount:',
        [lang === 'ar' ? 'الإجمالي' : 'Total']: enrichedReturn.totalAmount?.toFixed(2),
      });

      const headers = Object.keys(data[0]).map(key => ({ [key]: key }));
      
      exportToExcel(data, headers, `${lang === 'ar' ? 'مرتجع' : 'Return'}_${enrichedReturn.returnNo}`, lang);
      
      toast.success(lang === 'ar' ? 'تم التصدير بنجاح' : 'Exported successfully');
    } catch (err) {
      console.error('Export error:', err);
      toast.error(lang === 'ar' ? 'فشل التصدير' : 'Export failed');
    }
  };

  const handleExportSingleReturnPDF = async () => {
    try {
      if (!enrichedReturn) return;

      // Prepare header information
      const supplierName = lang === 'ar' ? enrichedReturn.supplierId?.nameAr : enrichedReturn.supplierId?.nameEn;
      const supplierCode = enrichedReturn.supplierId?.code || '';
      const returnDate = formatDate(enrichedReturn.returnDate);
      const createdBy = enrichedReturn.createdBy?.name || 'N/A';
      const createdByEmail = enrichedReturn.createdBy?.email || 'N/A';
      const createdAt = formatDate(enrichedReturn.createdAt);
      const notes = enrichedReturn.notes || '';

      // Build comprehensive title
      let title = '';
      if (lang === 'ar') {
        title = `مرتجع مشتريات رقم: ${enrichedReturn.returnNo}\n`;
        title += `المورد: ${supplierName} (${supplierCode})\n`;
        title += `تاريخ المرتجع: ${returnDate}\n`;
        title += `أنشئ بواسطة: ${createdBy}\n`;
        title += `البريد الإلكتروني: ${createdByEmail}\n`;
        title += `تاريخ الإنشاء: ${createdAt}`;
        if (notes) {
          title += `\nملاحظات: ${notes}`;
        }
      } else {
        title = `Purchase Return #${enrichedReturn.returnNo}\n`;
        title += `Supplier: ${supplierName} (${supplierCode})\n`;
        title += `Return Date: ${returnDate}\n`;
        title += `Created By: ${createdBy}\n`;
        title += `Email: ${createdByEmail}\n`;
        title += `Created At: ${createdAt}`;
        if (notes) {
          title += `\nNotes: ${notes}`;
        }
      }

      // Prepare items data for table
      const data = enrichedReturn.items?.map((item, index) => ({
        [lang === 'ar' ? '#' : '#']: index + 1,
        [lang === 'ar' ? 'المادة' : 'Material']: `${lang === 'ar' ? item.material?.nameAr : item.material?.nameEn} (${item.material?.code})`,
        [lang === 'ar' ? 'الكمية' : 'Quantity']: `${item.quantity} ${lang === 'ar' ? item.unit?.nameAr : item.unit?.nameEn}`,
        [lang === 'ar' ? 'سعر الوحدة' : 'Unit Price']: `${item.unitPrice.toFixed(2)} EGP`,
        [lang === 'ar' ? 'الإجمالي' : 'Total']: `${item.total.toFixed(2)} EGP`,
      })) || [];

      // Add total row
      data.push({
        [lang === 'ar' ? '#' : '#']: '',
        [lang === 'ar' ? 'المادة' : 'Material']: '',
        [lang === 'ar' ? 'الكمية' : 'Quantity']: '',
        [lang === 'ar' ? 'سعر الوحدة' : 'Unit Price']: lang === 'ar' ? 'المجموع الكلي:' : 'Total Amount:',
        [lang === 'ar' ? 'الإجمالي' : 'Total']: `${enrichedReturn.totalAmount?.toFixed(2)} EGP`,
      });

      const headers = Object.keys(data[0]).map(key => ({ [key]: key }));
      
      const fileName = `${lang === 'ar' ? 'مرتجع' : 'Return'}_${enrichedReturn.returnNo}`;

      const success = await exportToPDF(data, headers, fileName, lang, title);
      
      if (success) {
        toast.success(lang === 'ar' ? 'تم التصدير بنجاح' : 'Exported successfully');
      }
    } catch (err) {
      console.error('PDF Export error:', err);
      toast.error(lang === 'ar' ? 'فشل التصدير' : 'Export failed');
    }
  };

  const totalAmount = filteredReturns.reduce((sum, ret) => sum + (ret.totalAmount || 0), 0);
  const totalItems = filteredReturns.reduce((sum, ret) => sum + (ret.items?.length || 0), 0);

  if (loading) {
    return <FullPageLoader text={lang === "ar" ? "جاري تحميل مرتجعات الشراء..." : "Loading purchase returns..."} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-xl shadow-lg overflow-hidden mb-6">
          <div className="bg-gradient-to-r from-orange-600 to-orange-700 px-8 py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Package className="w-8 h-8 text-white" />
                <div>
                  <h1 className="text-2xl font-bold text-white">
                    {lang === 'ar' ? 'مرتجعات المشتريات' : 'Purchase Returns'}
                  </h1>
                  <p className="text-orange-100 mt-1">
                    {lang === 'ar' ? 'عرض وإدارة جميع مرتجعات المشتريات' : 'View and manage all purchase returns'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={handleExportExcel}
                  className="flex items-center gap-2 px-6 py-3 bg-white text-green-600 rounded-lg hover:bg-gray-50 transition font-semibold shadow-md"
                >
                  <Download className="w-5 h-5" />
                  {lang === 'ar' ? 'تصدير' : 'Export'}
                </button>
                <button
                  onClick={() => navigate('/purchases/returns/create')}
                  className="flex items-center gap-2 px-6 py-3 bg-white text-orange-600 hover:bg-orange-50 rounded-lg transition font-semibold shadow-md"
                >
                  <Plus className="w-5 h-5" />
                  {lang === 'ar' ? 'مرتجع جديد' : 'New Return'}
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-6 bg-gray-50">
            <div className="bg-white p-4 rounded-lg border-l-4 border-orange-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">
                    {lang === 'ar' ? 'إجمالي المرتجعات' : 'Total Returns'}
                  </p>
                  <p className="text-2xl font-bold text-gray-900">{filteredReturns.length}</p>
                </div>
                <Package className="w-10 h-10 text-orange-500 opacity-20" />
              </div>
            </div>
            <div className="bg-white p-4 rounded-lg border-l-4 border-green-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">
                    {lang === 'ar' ? 'إجمالي المبلغ' : 'Total Amount'}
                  </p>
                  <p className="text-2xl font-bold text-gray-900">{totalAmount.toFixed(2)} EGP</p>
                </div>
                <CreditCard className="w-10 h-10 text-green-500 opacity-20" />
              </div>
            </div>
            <div className="bg-white p-4 rounded-lg border-l-4 border-blue-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">
                    {lang === 'ar' ? 'إجمالي الأصناف' : 'Total Items'}
                  </p>
                  <p className="text-2xl font-bold text-gray-900">{totalItems}</p>
                </div>
                <FileText className="w-10 h-10 text-blue-500 opacity-20" />
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Filter className="w-5 h-5 text-gray-600" />
            <h2 className="text-lg font-semibold text-gray-900">
              {lang === 'ar' ? 'الفلاتر' : 'Filters'}
            </h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3.5 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder={lang === 'ar' ? 'بحث برقم المرتجع، المورد، أو المادة...' : 'Search by return #, supplier, or material...'}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition"
              />
            </div>

            <div className="relative">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition"
                placeholder={lang === 'ar' ? 'من تاريخ' : 'From Date'}
              />
            </div>

            <div className="relative">
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition"
                placeholder={lang === 'ar' ? 'إلى تاريخ' : 'To Date'}
              />
            </div>
          </div>

          {(searchTerm || startDate || endDate) && (
            <button
              onClick={() => {
                setSearchTerm('');
                setStartDate('');
                setEndDate('');
              }}
              className="mt-4 text-sm text-orange-600 hover:text-orange-700 font-medium"
            >
              {lang === 'ar' ? 'مسح الفلاتر' : 'Clear Filters'}
            </button>
          )}
        </div>

        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          {filteredReturns.length === 0 ? (
            <div className="p-12 text-center">
              <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                {lang === 'ar' ? 'لا توجد مرتجعات' : 'No Returns Found'}
              </h3>
              <p className="text-gray-600 mb-6">
                {lang === 'ar' 
                  ? searchTerm ? 'حاول تعديل معايير البحث' : 'ابدأ بإنشاء مرتجع جديد'
                  : searchTerm ? 'Try adjusting your search criteria' : 'Start by creating a new purchase return'}
              </p>
              <button
                onClick={() => navigate('/purchases/returns/create')}
                className="inline-flex items-center gap-2 px-6 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition font-semibold"
              >
                <Plus className="w-5 h-5" />
                {lang === 'ar' ? 'إنشاء مرتجع جديد' : 'Create First Return'}
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                      {lang === 'ar' ? 'رقم المرتجع' : 'Return #'}
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                      {lang === 'ar' ? 'المورد' : 'Supplier'}
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                      {lang === 'ar' ? 'التاريخ' : 'Date'}
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                      {lang === 'ar' ? 'عدد الأصناف' : 'Items'}
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                      {lang === 'ar' ? 'المبلغ الإجمالي' : 'Total Amount'}
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                      {lang === 'ar' ? 'أنشئ بواسطة' : 'Created By'}
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                      {lang === 'ar' ? 'إجراءات' : 'Actions'}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredReturns.map((returnItem) => (
                    <tr key={returnItem._id} className="hover:bg-gray-50 transition">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-orange-500" />
                          <span className="font-semibold text-gray-900">#{returnItem.returnNo}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                            <span className="text-orange-600 font-semibold text-lg">
                              {(lang === 'ar' ? returnItem.supplierId?.nameAr : returnItem.supplierId?.nameEn)?.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">
                              {lang === 'ar' ? returnItem.supplierId?.nameAr : returnItem.supplierId?.nameEn}
                            </p>
                            <p className="text-sm text-gray-500">{returnItem.supplierId?.code}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 text-gray-700">
                          <Calendar className="w-4 h-4 text-gray-400" />
                          {formatDate(returnItem.returnDate)}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-200">
                          {returnItem.items?.length || 0} {lang === 'ar' ? 'صنف' : 'items'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-semibold text-gray-900">
                          {returnItem.totalAmount?.toFixed(2)} EGP
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-gray-400" />
                          <span className="text-gray-700">{returnItem.createdBy?.name || 'N/A'}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => handleViewDetails(returnItem)}
                          className="flex items-center gap-1 px-3 py-2 bg-orange-50 text-orange-600 rounded-lg hover:bg-orange-100 transition font-medium"
                        >
                          <Eye className="w-4 h-4" />
                          {lang === 'ar' ? 'تفاصيل' : 'Details'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {showDetailsModal && selectedReturn && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="bg-gradient-to-r from-orange-600 to-orange-700 px-6 py-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-white">
                  {lang === 'ar' ? 'تفاصيل المرتجع' : 'Return Details'} - #{selectedReturn.returnNo}
                </h2>
                <button
                  onClick={() => setShowDetailsModal(false)}
                  className="text-white hover:bg-white/20 rounded-lg p-2 transition"
                >
                  <X size={24} />
                </button>
              </div>
            </div>

            {enrichedReturn && (
              <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div>
                    <p className="text-sm text-gray-500 mb-1">
                      {lang === 'ar' ? 'المورد' : 'Supplier'}
                    </p>
                    <p className="font-semibold text-gray-800">
                      {lang === 'ar' ? enrichedReturn.supplierId?.nameAr : enrichedReturn.supplierId?.nameEn}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {lang === 'ar' ? 'الكود:' : 'Code:'} {enrichedReturn.supplierId?.code}
                    </p>
                  </div>

                  <div>
                    <p className="text-sm text-gray-500 mb-1">
                      {lang === 'ar' ? 'تاريخ المرتجع' : 'Return Date'}
                    </p>
                    <p className="font-semibold text-gray-800">{formatDate(enrichedReturn.returnDate)}</p>
                  </div>

                  <div>
                    <p className="text-sm text-gray-500 mb-1">
                      {lang === 'ar' ? 'أنشئ بواسطة' : 'Created By'}
                    </p>
                    <p className="font-semibold text-gray-800">{enrichedReturn.createdBy?.name || 'N/A'}</p>
                    <p className="text-sm text-gray-600">{enrichedReturn.createdBy?.email || 'N/A'}</p>
                  </div>

                  <div>
                    <p className="text-sm text-gray-500 mb-1">
                      {lang === 'ar' ? 'تاريخ الإنشاء' : 'Created At'}
                    </p>
                    <p className="font-semibold text-gray-800">{formatDate(enrichedReturn.createdAt)}</p>
                  </div>
                </div>

                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">
                    {lang === 'ar' ? 'أصناف المرتجع' : 'Return Items'}
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="bg-gray-100 border-b-2 border-gray-300">
                          <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 border">#</th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 border">
                            {lang === 'ar' ? 'المادة' : 'Material'}
                          </th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 border">
                            {lang === 'ar' ? 'الكمية' : 'Quantity'}
                          </th>
                          <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700 border">
                            {lang === 'ar' ? 'سعر الوحدة' : 'Unit Price'}
                          </th>
                          <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700 border">
                            {lang === 'ar' ? 'الإجمالي' : 'Total'}
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {enrichedReturn.items?.map((item, index) => (
                          <tr key={item._id} className="border-b hover:bg-gray-50">
                            <td className="px-4 py-3 text-sm text-gray-700 border">{index + 1}</td>
                            <td className="px-4 py-3 border">
                              <p className="text-sm font-semibold text-gray-800">
                                {lang === 'ar' ? item.material?.nameAr : item.material?.nameEn}
                              </p>
                              <p className="text-xs text-gray-500">{item.material?.code}</p>
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-700 border">
                              {item.quantity} {lang === 'ar' ? item.unit?.nameAr : item.unit?.nameEn}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-700 text-right border">
                              {item.unitPrice.toFixed(2)} EGP
                            </td>
                            <td className="px-4 py-3 text-sm font-semibold text-orange-600 text-right border">
                              {item.total.toFixed(2)} EGP
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="bg-orange-50 font-bold border-t-2 border-orange-300">
                          <td colSpan="4" className="px-4 py-3 text-right text-gray-800 border">
                            {lang === 'ar' ? 'المبلغ الإجمالي:' : 'Total Amount:'}
                          </td>
                          <td className="px-4 py-3 text-right text-orange-600 text-lg border">
                            {enrichedReturn.totalAmount?.toFixed(2)} EGP
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>

                {enrichedReturn.notes && (
                  <div className="bg-blue-50 p-4 rounded-lg border-l-4 border-blue-500">
                    <p className="text-sm font-semibold text-gray-700 mb-2">
                      {lang === 'ar' ? 'ملاحظات:' : 'Notes:'}
                    </p>
                    <p className="text-sm text-gray-700">{enrichedReturn.notes}</p>
                  </div>
                )}
              </div>
            )}

            <div className="bg-gray-50 px-6 py-4 flex justify-between items-center border-t">
              <div className="flex gap-3">
                <button
                  onClick={handleExportSingleReturnExcel}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition font-semibold"
                >
                  <Download className="w-4 h-4" />
                  {lang === 'ar' ? 'تصدير Excel' : 'Export Excel'}
                </button>
                
                <button
                  onClick={handleExportSingleReturnPDF}
                  className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition font-semibold"
                >
                  <FileDown className="w-4 h-4" />
                  {lang === 'ar' ? 'تحميل PDF' : 'Download PDF'}
                </button>
              </div>
              
              <button
                onClick={() => setShowDetailsModal(false)}
                className="px-6 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition font-semibold"
              >
                {lang === 'ar' ? 'إغلاق' : 'Close'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PurchaseReturns;