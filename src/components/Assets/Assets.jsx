import { useState, useEffect, useMemo, useContext } from 'react';
import { Plus, Edit, Trash2, Wrench, Search, X, RefreshCw, Download } from 'lucide-react';
import { toast } from 'react-toastify';
import axiosInstance from '../../utils/axiosInstance';
import * as XLSX from 'xlsx';
import FullPageLoader from '../Loader/Loader';
import { LanguageContext } from '../../context/LanguageContext';

const ASSET_STATUS = [
  { value: 'AVAILABLE', labelAr: 'متاح', labelEn: 'Available' },
  { value: 'IN_USE', labelAr: 'قيد الاستخدام', labelEn: 'In Use' },
  { value: 'MAINTENANCE', labelAr: 'في الصيانة', labelEn: 'Maintenance' },
  { value: 'RETIRED', labelAr: 'متقاعد', labelEn: 'Retired' },
];

export default function Assets() {
  const { lang, t } = useContext(LanguageContext);
  
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  
  const [showModal, setShowModal] = useState(false);
  const [editingAsset, setEditingAsset] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL');
  
  const [formData, setFormData] = useState({
    nameAr: '',
    nameEn: '',
    code: '',
    assetTypeAr: '',
    assetTypeEn: '',
    purchaseDate: '',
    purchasePrice: '',
    status: 'AVAILABLE',
    notes: '',
  });

  // ================= FETCH =================
  const fetchAssets = async () => {
    try {
      setLoading(true);
      const { data } = await axiosInstance.get('/assets');
      setAssets(data.result || data || []);
    } catch (err) {
      console.error(err);
      toast.error(
        lang === "ar" ? "خطأ في تحميل الأصول" : "Error loading assets",
        { position: "top-right", autoClose: 3000 }
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssets();
  }, []);

  // ================= FILTER =================
  const filteredAssets = useMemo(() => {
    let filtered = assets;

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(asset => 
        asset.nameEn?.toLowerCase().includes(term) ||
        asset.nameAr?.includes(term) ||
        asset.code?.toLowerCase().includes(term) ||
        asset.assetTypeEn?.toLowerCase().includes(term) ||
        asset.assetTypeAr?.includes(term)
      );
    }

    if (filterStatus !== 'ALL') {
      if (filterStatus === 'ACTIVE') {
        filtered = filtered.filter(asset => asset.isActive !== false);
      } else if (filterStatus === 'INACTIVE') {
        filtered = filtered.filter(asset => asset.isActive === false);
      } else {
        filtered = filtered.filter(asset => asset.status === filterStatus);
      }
    }

    return filtered;
  }, [assets, searchTerm, filterStatus]);

  // ================= EXPORT TO EXCEL =================
  const handleExportToExcel = () => {
    try {
      const exportData = filteredAssets.map(asset => ({
        [lang === "ar" ? "الكود" : "Code"]: asset.code,
        [lang === "ar" ? "الاسم بالعربية" : "Name (Arabic)"]: asset.nameAr,
        [lang === "ar" ? "الاسم بالإنجليزية" : "Name (English)"]: asset.nameEn,
        [lang === "ar" ? "النوع بالعربية" : "Type (Arabic)"]: asset.assetTypeAr,
        [lang === "ar" ? "النوع بالإنجليزية" : "Type (English)"]: asset.assetTypeEn,
        [lang === "ar" ? "تاريخ الشراء" : "Purchase Date"]: asset.purchaseDate 
          ? new Date(asset.purchaseDate).toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-US') 
          : '-',
        [lang === "ar" ? "سعر الشراء" : "Purchase Price"]: asset.purchasePrice || '-',
        [lang === "ar" ? "الحالة" : "Status"]: ASSET_STATUS.find(s => s.value === asset.status)?.[lang === 'ar' ? 'labelAr' : 'labelEn'] || asset.status,
        [lang === "ar" ? "نشط/غير نشط" : "Active Status"]: asset.isActive !== false 
          ? (lang === 'ar' ? 'نشط' : 'Active') 
          : (lang === 'ar' ? 'غير نشط' : 'Inactive'),
        [lang === "ar" ? "ملاحظات" : "Notes"]: asset.notes || '-'
      }));

      const ws = XLSX.utils.json_to_sheet(exportData);
      
      const columnWidths = [
        { wch: 12 }, { wch: 18 }, { wch: 18 }, { wch: 18 }, 
        { wch: 18 }, { wch: 16 }, { wch: 14 }, { wch: 14 }, 
        { wch: 12 }, { wch: 25 }
      ];
      ws['!cols'] = columnWidths;

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, lang === "ar" ? "الأصول" : "Assets");
      
      const fileName = `Assets_${new Date().toISOString().slice(0, 10)}.xlsx`;
      XLSX.writeFile(wb, fileName);
      
      toast.success(
        lang === "ar" ? "تم تصدير البيانات بنجاح" : "Data exported successfully",
        { position: "top-right", autoClose: 2000 }
      );
    } catch (error) {
      toast.error(
        lang === "ar" ? "فشل التصدير" : "Export failed", 
        { position: "top-right", autoClose: 3000 }
      );
      console.error("Export error:", error);
    }
  };

  // ================= SAVE =================
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.nameAr?.trim() || !formData.nameEn?.trim()) {
      toast.error(
        lang === "ar" ? "اسم الأصل مطلوب" : "Asset name is required",
        { position: "top-right", autoClose: 3000 }
      );
      return;
    }

    if (!formData.code?.trim()) {
      toast.error(
        lang === "ar" ? "الكود مطلوب" : "Code is required",
        { position: "top-right", autoClose: 3000 }
      );
      return;
    }

    if (!formData.assetTypeAr?.trim() || !formData.assetTypeEn?.trim()) {
      toast.error(
        lang === "ar" ? "نوع الأصل مطلوب" : "Asset type is required",
        { position: "top-right", autoClose: 3000 }
      );
      return;
    }

    setSaving(true);

    try {
      const payload = {
        nameAr: formData.nameAr.trim(),
        nameEn: formData.nameEn.trim(),
        code: formData.code.trim().toUpperCase(),
        assetTypeAr: formData.assetTypeAr.trim(),
        assetTypeEn: formData.assetTypeEn.trim(),
        status: formData.status,
        purchaseDate: formData.purchaseDate || undefined,
        purchasePrice: formData.purchasePrice ? Number(formData.purchasePrice) : undefined,
        notes: formData.notes?.trim() || '',
      };

      Object.keys(payload).forEach(key => payload[key] === undefined && delete payload[key]);

      if (editingAsset) {
        await axiosInstance.put(`/assets/${editingAsset._id}`, payload);
        toast.success(
          lang === "ar" ? "تم تحديث الأصل بنجاح" : "Asset updated successfully",
          { position: "top-right", autoClose: 2000 }
        );
      } else {
        await axiosInstance.post("/assets", payload);
        toast.success(
          lang === "ar" ? "تم إضافة الأصل بنجاح" : "Asset added successfully",
          { position: "top-right", autoClose: 2000 }
        );
      }
      
      setShowModal(false);
      setEditingAsset(null);
      resetForm();
      await fetchAssets();
      
    } catch (err) {
      console.error("Error saving asset:", err);
      
      let errorMsg = lang === "ar" ? "خطأ في حفظ الأصل" : "Error saving asset";
      
      if (err.response?.data?.message && Array.isArray(err.response.data.message)) {
        errorMsg = err.response.data.message.join(", ");
      } else if (err.response?.data?.message) {
        errorMsg = err.response.data.message;
      } else if (err.response?.data?.error) {
        errorMsg = err.response.data.error;
      }
      
      toast.error(errorMsg, {
        position: "top-right",
        autoClose: 4000,
      });
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (asset) => {
    setEditingAsset(asset);
    setFormData({
      nameAr: asset.nameAr || '',
      nameEn: asset.nameEn || '',
      code: asset.code || '',
      assetTypeAr: asset.assetTypeAr || '',
      assetTypeEn: asset.assetTypeEn || '',
    
      status: asset.status || 'AVAILABLE',
      notes: asset.notes || '',
    });
    setShowModal(true);
  };

  // ================= DELETE/ACTIVATE HANDLERS =================
  const handleDeleteClick = (asset) => {
    setConfirmDelete({ asset, action: 'delete' });
  };

  const handleActivateClick = (asset) => {
    setConfirmDelete({ asset, action: 'activate' });
  };

  const confirmDeleteAction = async () => {
    if (!confirmDelete || !confirmDelete.asset) {
      console.error('No asset to delete/activate');
      return;
    }

    const { asset, action } = confirmDelete;

    if (!asset._id) {
      toast.error(
        lang === "ar" ? "معرف الأصل غير موجود" : "Asset ID is missing",
        { position: "top-right", autoClose: 3000 }
      );
      return;
    }

    try {
      if (asset.isActive !== false) {
        await axiosInstance.delete(`/assets/${asset._id}`);
      } else {
        await axiosInstance.patch(`/assets/${asset._id}/activate`);
      }

      const message = action === 'delete'
        ? (lang === "ar" ? "تم حذف الأصل بنجاح" : "Asset deleted successfully")
        : (lang === "ar" ? "تم تفعيل الأصل بنجاح" : "Asset activated successfully");

      toast.success(message, { position: "top-right", autoClose: 2000 });

      setConfirmDelete(null);
      fetchAssets();
    } catch (err) {
      console.error('Error:', err);
      
      let errorMsg = lang === "ar" ? "خطأ في تحديث الأصل" : "Error updating asset";
      
      if (err.response?.status === 404) {
        errorMsg = lang === "ar" 
          ? "الأصل غير موجود أو تم حذفه بالفعل" 
          : "Asset not found or already deleted";
      } else if (err.response?.data?.message) {
        errorMsg = err.response.data.message;
      } else if (err.message) {
        errorMsg = err.message;
      }
      
      toast.error(errorMsg, { position: "top-right", autoClose: 3000 });
    }
  };

  const resetForm = () => {
    setFormData({
      nameAr: '',
      nameEn: '',
      code: '',
      assetTypeAr: '',
      assetTypeEn: '',
      purchaseDate: '',
      purchasePrice: '',
      status: 'AVAILABLE',
      notes: '',
    });
  };

  const getStatusLabel = (status) => {
    return ASSET_STATUS.find(s => s.value === status)?.[lang === 'ar' ? 'labelAr' : 'labelEn'] || status;
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'AVAILABLE':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'IN_USE':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'MAINTENANCE':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'RETIRED':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  if (loading && assets.length === 0) {
    return <FullPageLoader text={lang === "ar" ? "جاري تحميل الأصول..." : "Loading assets..."} />;
  }

  const activeAssets = filteredAssets.filter(a => a.isActive !== false).length;
  const inactiveAssets = filteredAssets.filter(a => a.isActive === false).length;
  const availableAssets = filteredAssets.filter(a => a.status === 'AVAILABLE' && a.isActive !== false).length;
  const inUseAssets = filteredAssets.filter(a => a.status === 'IN_USE' && a.isActive !== false).length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden mb-6">
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-8 py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Wrench className="w-8 h-8 text-white" />
                <div>
                  <h1 className="text-2xl font-bold text-white">
                    {lang === "ar" ? "الأصول والمعدات" : "Assets & Equipment"}
                  </h1>
                  <p className="text-blue-100 mt-1">
                    {lang === "ar" 
                      ? "عرض وإدارة الأصول والمعدات الخاصة بالشركة" 
                      : "View and manage company assets and equipment"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={fetchAssets}
                  disabled={loading}
                  className="flex items-center gap-2 px-4 py-3 bg-white/20 hover:bg-white/30 text-white rounded-lg transition font-semibold"
                  title={lang === "ar" ? "تحديث" : "Refresh"}
                >
                  <div className={loading ? "animate-spin" : ""}>
                    <RefreshCw className="w-5 h-5" />
                  </div>
                </button>
                <button
                  onClick={handleExportToExcel}
                  className="flex items-center gap-2 px-6 py-3 bg-green-500 hover:bg-green-600 text-white rounded-lg transition font-semibold shadow-md"
                >
                  <Download className="w-5 h-5" />
                  <span>{lang === "ar" ? "تصدير" : "Export"}</span>
                </button>
                <button
                  onClick={() => {
                    setEditingAsset(null);
                    resetForm();
                    setShowModal(true);
                  }}
                  className="flex items-center gap-2 px-6 py-3 bg-white text-blue-600 rounded-lg hover:bg-blue-50 transition font-semibold shadow-md"
                >
                  <Plus className="w-5 h-5" />
                  <span>{lang === "ar" ? "إضافة أصل جديد" : "Add New Asset"}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 p-6 bg-gray-50">
            <div className="bg-white p-4 rounded-lg border-l-4 border-blue-500">
              <p className="text-sm text-gray-600 mb-1">
                {lang === "ar" ? "إجمالي الأصول" : "Total Assets"}
              </p>
              <p className="text-2xl font-bold text-gray-900">{filteredAssets.length}</p>
            </div>
            <div className="bg-white p-4 rounded-lg border-l-4 border-green-500">
              <p className="text-sm text-gray-600 mb-1">
                {lang === "ar" ? "متاح" : "Available"}
              </p>
              <p className="text-2xl font-bold text-gray-900">{availableAssets}</p>
            </div>
            <div className="bg-white p-4 rounded-lg border-l-4 border-purple-500">
              <p className="text-sm text-gray-600 mb-1">
                {lang === "ar" ? "قيد الاستخدام" : "In Use"}
              </p>
              <p className="text-2xl font-bold text-gray-900">{inUseAssets}</p>
            </div>
            <div className="bg-white p-4 rounded-lg border-l-4 border-red-500">
              <p className="text-sm text-gray-600 mb-1">
                {lang === "ar" ? "غير نشط" : "Inactive"}
              </p>
              <p className="text-2xl font-bold text-gray-900">{inactiveAssets}</p>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-3.5 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder={lang === "ar" ? "البحث في الأصول..." : "Search assets..."}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
              />
            </div>

            {/* Status Filter */}
            <div>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
              >
                <option value="ALL">{lang === "ar" ? "كل الحالات" : "All Status"}</option>
                <option value="ACTIVE">{lang === "ar" ? "نشط" : "Active"}</option>
                <option value="INACTIVE">{lang === "ar" ? "غير نشط" : "Inactive"}</option>
                {ASSET_STATUS.map((status) => (
                  <option key={status.value} value={status.value}>
                    {lang === "ar" ? status.labelAr : status.labelEn}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Clear Filters */}
          {(searchTerm || filterStatus !== 'ALL') && (
            <button
              onClick={() => {
                setSearchTerm('');
                setFilterStatus('ALL');
              }}
              className="mt-4 text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              {lang === "ar" ? "مسح الفلاتر" : "Clear Filters"}
            </button>
          )}
        </div>

        {/* Assets Table */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          {filteredAssets.length === 0 ? (
            <div className="p-12 text-center">
              <Wrench className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                {lang === "ar" ? "لا توجد أصول" : "No Assets Found"}
              </h3>
              <p className="text-gray-600 mb-6">
                {lang === "ar" ? "لم يتم العثور على أصول مطابقة للفلاتر المحددة" : "No assets match your current filters"}
              </p>
              <button
                onClick={() => {
                  setEditingAsset(null);
                  resetForm();
                  setShowModal(true);
                }}
                className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-semibold"
              >
                <Plus className="w-5 h-5" />
                {lang === "ar" ? "إضافة أول أصل" : "Add First Asset"}
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                      {lang === "ar" ? "الكود" : "Code"}
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                      {lang === "ar" ? "اسم الأصل" : "Asset Name"}
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                      {lang === "ar" ? "النوع" : "Type"}
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                      {lang === "ar" ? "تاريخ الشراء" : "Purchase Date"}
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                      {lang === "ar" ? "سعر الشراء" : "Purchase Price"}
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                      {lang === "ar" ? "الحالة" : "Status"}
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                      {lang === "ar" ? "نشط/غير نشط" : "Active"}
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                      {lang === "ar" ? "الإجراءات" : "Actions"}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredAssets.map((asset) => (
                    <tr key={asset._id} className="hover:bg-gray-50 transition">
                      <td className="px-6 py-4">
                        <span className="px-3 py-1 rounded-full text-xs font-semibold bg-purple-100 text-purple-800 border border-purple-200">
                          {asset.code}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                            <Wrench className="w-5 h-5 text-blue-600" />
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900">
                              {lang === "ar" ? asset.nameAr : asset.nameEn}
                            </p>
                            {asset.notes && (
                              <p className="text-sm text-gray-500 truncate max-w-xs">
                                {asset.notes}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-semibold">
                          {lang === "ar" ? asset.assetTypeAr : asset.assetTypeEn}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm">
                        {asset.purchaseDate 
                          ? new Date(asset.purchaseDate).toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-US')
                          : '-'
                        }
                      </td>
                      <td className="px-6 py-4 text-right font-semibold">
                        {asset.purchasePrice ? `${asset.purchasePrice.toLocaleString()} ${lang === 'ar' ? 'ج.م' : 'EGP'}` : '-'}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getStatusColor(asset.status)}`}>
                          {getStatusLabel(asset.status)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          asset.isActive !== false
                            ? 'bg-green-100 text-green-800 border border-green-200'
                            : 'bg-gray-100 text-gray-800 border border-gray-200'
                        }`}>
                          {asset.isActive !== false 
                            ? (lang === 'ar' ? 'نشط' : 'Active')
                            : (lang === 'ar' ? 'غير نشط' : 'Inactive')
                          }
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleEdit(asset)}
                            className="flex items-center gap-1 px-3 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition font-medium"
                          >
                            <Edit className="w-4 h-4" />
                            {lang === "ar" ? "تعديل" : "Edit"}
                          </button>
                          
                          {asset.isActive !== false ? (
                            <button
                              onClick={() => handleDeleteClick(asset)}
                              className="flex items-center gap-1 px-3 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition font-medium"
                            >
                              <Trash2 className="w-4 h-4" />
                              {lang === "ar" ? "حذف" : "Delete"}
                            </button>
                          ) : (
                            <button
                              onClick={() => handleActivateClick(asset)}
                              className="flex items-center gap-1 px-3 py-2 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition font-medium"
                            >
                              <RefreshCw className="w-4 h-4" />
                              {lang === "ar" ? "تفعيل" : "Activate"}
                            </button>
                          )}
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
            <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-blue-700 px-8 py-6 border-b border-blue-500">
              <h2 className="text-2xl font-bold text-white">
                {editingAsset 
                  ? (lang === "ar" ? "تعديل الأصل" : "Edit Asset")
                  : (lang === "ar" ? "إضافة أصل جديد" : "Add New Asset")
                }
              </h2>
            </div>

            <form onSubmit={handleSubmit} className="p-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Name Arabic */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    {lang === "ar" ? "الاسم بالعربية" : "Name (Arabic)"} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.nameAr}
                    onChange={(e) => setFormData({ ...formData, nameAr: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                    required
                    dir="rtl"
                  />
                </div>

                {/* Name English */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    {lang === "ar" ? "الاسم بالإنجليزية" : "Name (English)"} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.nameEn}
                    onChange={(e) => setFormData({ ...formData, nameEn: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                    required
                    dir="ltr"
                  />
                </div>

                {/* Code */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    {lang === "ar" ? "الكود" : "Code"} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                    placeholder="EXCAVATOR-001"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                    required
                  />
                </div>

                {/* Asset Type Arabic */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    {lang === "ar" ? "النوع بالعربية" : "Type (Arabic)"} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.assetTypeAr}
                    onChange={(e) => setFormData({ ...formData, assetTypeAr: e.target.value })}
                    placeholder="حفار"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                    required
                    dir="rtl"
                  />
                </div>

                {/* Asset Type English */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    {lang === "ar" ? "النوع بالإنجليزية" : "Type (English)"} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.assetTypeEn}
                    onChange={(e) => setFormData({ ...formData, assetTypeEn: e.target.value })}
                    placeholder="Excavator"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                    required
                    dir="ltr"
                  />
                </div>

                {/* Status */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    {lang === "ar" ? "الحالة" : "Status"}
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                  >
                    {ASSET_STATUS.map(status => (
                      <option key={status.value} value={status.value}>
                        {lang === "ar" ? status.labelAr : status.labelEn}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Purchase Date */}
                

                {/* Notes */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    {lang === "ar" ? "ملاحظات" : "Notes"}
                  </label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    rows="3"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                    placeholder={lang === "ar" ? "أضف ملاحظات..." : "Add notes..."}
                    dir={lang === "ar" ? "rtl" : "ltr"}
                  />
                </div>
              </div>

              {/* Buttons */}
              <div className="flex gap-4 mt-8">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-semibold disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {saving && (
                    <div className="animate-spin inline-block w-5 h-5 border-2 border-current border-t-transparent text-white rounded-full"></div>
                  )}
                  {saving 
                    ? (lang === "ar" ? "جاري الحفظ..." : "Saving...") 
                    : (lang === "ar" ? "حفظ" : "Save")}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setEditingAsset(null);
                    resetForm();
                  }}
                  disabled={saving}
                  className="flex-1 px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition font-semibold disabled:opacity-50"
                >
                  {lang === "ar" ? "إلغاء" : "Cancel"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete/Activate Confirmation Modal */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                confirmDelete?.action === 'delete'
                  ? 'bg-red-100' 
                  : 'bg-green-100'
              }`}>
                {confirmDelete?.action === 'delete' ? (
                  <Trash2 className="w-6 h-6 text-red-600" />
                ) : (
                  <RefreshCw className="w-6 h-6 text-green-600" />
                )}
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">
                  {confirmDelete?.action === 'delete'
                    ? (lang === "ar" ? "تأكيد الحذف" : "Confirm Delete")
                    : (lang === "ar" ? "تأكيد التفعيل" : "Confirm Activation")
                  }
                </h3>
                <p className="text-sm text-gray-500">
                  {confirmDelete?.action === 'delete'
                    ? (lang === "ar" ? "هل أنت متأكد من حذف هذا الأصل؟" : "Are you sure you want to delete this asset?")
                    : (lang === "ar" ? "هل أنت متأكد من تفعيل هذا الأصل؟" : "Are you sure you want to activate this asset?")
                  }
                </p>
              </div>
            </div>
            
            <div className="bg-gray-50 rounded-lg p-4 mb-4">
              <p className="text-sm text-gray-600 mb-1">{lang === "ar" ? "الأصل:" : "Asset:"}</p>
              <p className="font-semibold text-gray-900">
                {lang === "ar" ? confirmDelete?.asset?.nameAr : confirmDelete?.asset?.nameEn}
              </p>
              <p className="text-sm text-gray-500">
                {lang === "ar" ? "الكود: " : "Code: "}{confirmDelete?.asset?.code}
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDelete(null)}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition font-semibold"
              >
                {lang === "ar" ? "إلغاء" : "Cancel"}
              </button>
              <button
                onClick={confirmDeleteAction}
                className={`flex-1 px-4 py-2 text-white rounded-lg transition font-semibold ${
                  confirmDelete?.action === 'delete'
                    ? 'bg-red-600 hover:bg-red-700'
                    : 'bg-green-600 hover:bg-green-700'
                }`}
              >
                {confirmDelete?.action === 'delete'
                  ? (lang === "ar" ? "حذف" : "Delete")
                  : (lang === "ar" ? "تفعيل" : "Activate")
                }
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}