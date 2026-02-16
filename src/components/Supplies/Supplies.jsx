import { useState, useEffect, useMemo, useContext } from 'react';
import { Plus, Edit, Trash2, Package, Search, X, Download, CheckCircle } from 'lucide-react';
import { toast } from 'react-toastify';
import { formatCurrency } from '../../utils/dateFormat';
import axiosInstance from '../../utils/axiosInstance';
import { LanguageContext } from '../../context/LanguageContext';
import * as XLSX from 'xlsx';

const MAIN_CATEGORIES = [
  { value: 'Construction-Materials', labelEn: 'Construction Materials', labelAr: 'مواد البناء' },
  { value: 'Tools-Equipment', labelEn: 'Tools & Equipment', labelAr: 'أدوات ومعدات' },
  { value: 'Electrical', labelEn: 'Electrical', labelAr: 'كهرباء' },
  { value: 'Plumbing', labelEn: 'Plumbing', labelAr: 'سباكة' },
  { value: 'Finishing', labelEn: 'Finishing', labelAr: 'تشطيبات' },
  { value: 'Other', labelEn: 'Other', labelAr: 'أخرى' },
];

export default function Supplies() {
  const { lang, t } = useContext(LanguageContext);
  
  const [materials, setMaterials] = useState([]);
  const [units, setUnits] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  
  const [showModal, setShowModal] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterStatus, setFilterStatus] = useState('ALL');
  
  const [formData, setFormData] = useState({
    nameAr: '',
    nameEn: '',
    code: '',
    mainCategory: 'Construction-Materials',
    subCategory: '',
    baseUnit: '',
    alternativeUnits: [],
    minLevelStock: 0,
    lastPurchasedPrice: 0,
    lastPurchasedDate: '',
    description: '',
  });

  // ================= FETCH =================
  const fetchMaterials = async () => {
    try {
      setLoading(true);
      const { data } = await axiosInstance.get('/materials');
      setMaterials(data.result || data || []);
    } catch (err) {
      console.error(err);
      toast.error(t?.errorLoadingMaterials || "Error loading materials");
    } finally {
      setLoading(false);
    }
  };

  const fetchUnits = async () => {
    try {
      const { data } = await axiosInstance.get('/units');
      setUnits(data.result || data || []);
    } catch (err) {
      console.error(err);
      setUnits([
        { _id: 'default-1', nameAr: 'متر', nameEn: 'Meter' },
        { _id: 'default-2', nameAr: 'كيلو', nameEn: 'Kilogram' },
        { _id: 'default-3', nameAr: 'طن', nameEn: 'Ton' },
        { _id: 'default-4', nameAr: 'قطعة', nameEn: 'Piece' },
      ]);
    }
  };

  useEffect(() => {
    fetchMaterials();
    fetchUnits();
  }, []);

  // ================= FILTER =================
  const filteredMaterials = useMemo(() => {
    let filtered = [...materials];
    
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(material => 
        material.nameEn?.toLowerCase().includes(term) ||
        material.nameAr?.includes(term) ||
        material.code?.toLowerCase().includes(term) ||
        material.subCategory?.toLowerCase().includes(term)
      );
    }

    if (filterCategory !== 'all') {
      filtered = filtered.filter(m => m.mainCategory === filterCategory);
    }

    if (filterStatus !== 'ALL') {
      filtered = filtered.filter(m => 
        filterStatus === 'ACTIVE' ? m.isActive !== false : m.isActive === false
      );
    }

    return filtered;
  }, [materials, searchTerm, filterCategory, filterStatus]);

  // ================= EXPORT =================
  const handleExportToExcel = () => {
    try {
      const exportData = filteredMaterials.map(material => ({
        [lang === "ar" ? "الكود" : "Code"]: material.code,
        [lang === "ar" ? "الاسم بالعربية" : "Name (Arabic)"]: material.nameAr,
        [lang === "ar" ? "الاسم بالإنجليزية" : "Name (English)"]: material.nameEn,
        [lang === "ar" ? "الفئة الرئيسية" : "Main Category"]: MAIN_CATEGORIES.find(c => c.value === material.mainCategory)?.[lang === 'ar' ? 'labelAr' : 'labelEn'] || material.mainCategory,
        [lang === "ar" ? "الفئة الفرعية" : "Sub Category"]: material.subCategory || '-',
        [lang === "ar" ? "الوحدة" : "Unit"]: getUnitName(material.baseUnit?._id || material.baseUnit),
        [lang === "ar" ? "المخزون الحالي" : "Current Stock"]: material.currentStock || 0,
        [lang === "ar" ? "آخر سعر" : "Last Price"]: material.lastPurchasePrice || 0,
        [lang === "ar" ? "الحالة" : "Status"]: material.isActive !== false ? (lang === "ar" ? "نشط" : "Active") : (lang === "ar" ? "غير نشط" : "Inactive"),
      }));

      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, lang === "ar" ? "المواد" : "Materials");
      
      const fileName = `Materials_${new Date().toISOString().slice(0, 10)}.xlsx`;
      XLSX.writeFile(wb, fileName);
      
      toast.success(lang === "ar" ? "تم تصدير البيانات بنجاح" : "Data exported successfully");
    } catch (error) {
      toast.error(lang === "ar" ? "فشل التصدير" : "Export failed");
      console.error("Export error:", error);
    }
  };

  // ================= SAVE =================
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.nameAr?.trim() || !formData.nameEn?.trim()) {
      toast.error(t?.materialNameRequired || "Material name is required");
      return;
    }

    if (!formData.code?.trim()) {
      toast.error(t?.codeRequired || "Code is required");
      return;
    }

    setSaving(true);

    try {
      const payload = {
        nameAr: formData.nameAr.trim(),
        nameEn: formData.nameEn.trim(),
        code: formData.code.trim().toUpperCase(),
        mainCategory: formData.mainCategory,
        subCategory: formData.subCategory.trim() || '',
        baseUnit: formData.baseUnit,
        alternativeUnits: formData.alternativeUnits || [],
        minLevelStock: Number(formData.minLevelStock) || 0,
        lastPurchasedPrice: Number(formData.lastPurchasedPrice) || undefined,
        lastPurchasedDate: formData.lastPurchasedDate || undefined,
        description: formData.description?.trim() || '',
      };

      Object.keys(payload).forEach(key => 
        payload[key] === undefined && delete payload[key]
      );
      
      if (editingMaterial) {
        await axiosInstance.put(`/materials/${editingMaterial._id}`, payload);
        toast.success(t?.materialUpdated || "Material updated successfully");
      } else {
        await axiosInstance.post("/materials", payload);
        toast.success(t?.materialAdded || "Material added successfully");
      }
      
      setShowModal(false);
      setEditingMaterial(null);
      resetForm();
      await fetchMaterials();
      
    } catch (err) {
      console.error("Error saving material:", err);
      
      let errorMsg = "Error saving material";
      
      if (err.response?.data?.message && Array.isArray(err.response.data.message)) {
        errorMsg = err.response.data.message.join(", ");
      } else if (err.response?.data?.message) {
        errorMsg = err.response.data.message;
      } else if (err.response?.data?.error) {
        errorMsg = err.response.data.error;
      }
      
      toast.error(errorMsg);
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (material) => {
    setEditingMaterial(material);
    setFormData({
      nameAr: material.nameAr || '',
      nameEn: material.nameEn || '',
      code: material.code || '',
      mainCategory: material.mainCategory || 'Construction-Materials',
      subCategory: material.subCategory || '',
      baseUnit: material.baseUnit?._id || material.baseUnit || '',
      alternativeUnits: material.alternativeUnits || [],
      minLevelStock: material.minStockLevel || 0,
      lastPurchasedPrice: material.lastPurchasePrice || 0,
      lastPurchasedDate: material.lastPurchaseDate ? new Date(material.lastPurchaseDate).toISOString().split('T')[0] : '',
      description: material.description || '',
    });
    setShowModal(true);
  };

  const confirmDeleteAction = async () => {
    if (!confirmDelete) return;
    
    try {
      await axiosInstance.delete(`/materials/${confirmDelete._id}`);
      toast.success(t?.materialDeleted || "Material deleted successfully");
      setConfirmDelete(null);
      fetchMaterials();
    } catch (err) {
      console.error(err);
      const errorMsg = err.response?.data?.message || err.message || "Error deleting material";
      toast.error(errorMsg);
    }
  };

  const resetForm = () => {
    setFormData({
      nameAr: '',
      nameEn: '',
      code: '',
      mainCategory: 'Construction-Materials',
      subCategory: '',
      baseUnit: '',
      alternativeUnits: [],
      minLevelStock: 0,
      lastPurchasedPrice: 0,
      lastPurchasedDate: '',
      description: '',
    });
  };

  const getUnitName = (unitId) => {
    if (!unitId) return '-';
    const unit = units.find(u => u._id === unitId);
    return unit ? (lang === 'ar' ? unit.nameAr : unit.nameEn) : '-';
  };

  const activeMaterials = filteredMaterials.filter(m => m.isActive !== false).length;
  const inactiveMaterials = filteredMaterials.filter(m => m.isActive === false).length;
  const lowStockMaterials = filteredMaterials.filter(m => m.currentStock < m.minStockLevel).length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden mb-6">
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-8 py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Package className="w-8 h-8 text-white" />
                <div>
                  <h1 className="text-2xl font-bold text-white">
                    {lang === 'ar' ? 'المستلزمات والمواد' : 'Supplies & Materials'}
                  </h1>
                  <p className="text-blue-100 mt-1">
                    {lang === 'ar' 
                      ? 'عرض وإدارة المواد المستخدمة في المشاريع' 
                      : 'View and manage materials used in projects'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={handleExportToExcel}
                  className="flex items-center gap-2 px-6 py-3 bg-green-500 hover:bg-green-600 text-white rounded-lg transition font-semibold shadow-md"
                >
                  <Download className="w-5 h-5" />
                  <span>{lang === "ar" ? "تصدير" : "Export"}</span>
                </button>
                <button
                  onClick={() => {
                    setEditingMaterial(null);
                    resetForm();
                    setShowModal(true);
                  }}
                  className="flex items-center gap-2 px-6 py-3 bg-white text-blue-600 rounded-lg hover:bg-blue-50 transition font-semibold shadow-md"
                >
                  <Plus className="w-5 h-5" />
                  <span>{lang === 'ar' ? 'إضافة مادة جديدة' : 'Add New Material'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 p-6 bg-gray-50">
            <div className="bg-white p-4 rounded-lg border-l-4 border-blue-500">
              <p className="text-sm text-gray-600 mb-1">
                {lang === "ar" ? "إجمالي المواد" : "Total Materials"}
              </p>
              <p className="text-2xl font-bold text-gray-900">{filteredMaterials.length}</p>
            </div>
            <div className="bg-white p-4 rounded-lg border-l-4 border-green-500">
              <p className="text-sm text-gray-600 mb-1">
                {lang === "ar" ? "مواد نشطة" : "Active Materials"}
              </p>
              <p className="text-2xl font-bold text-gray-900">{activeMaterials}</p>
            </div>
            <div className="bg-white p-4 rounded-lg border-l-4 border-orange-500">
              <p className="text-sm text-gray-600 mb-1">
                {lang === "ar" ? "مخزون منخفض" : "Low Stock"}
              </p>
              <p className="text-2xl font-bold text-gray-900">{lowStockMaterials}</p>
            </div>
            <div className="bg-white p-4 rounded-lg border-l-4 border-red-500">
              <p className="text-sm text-gray-600 mb-1">
                {lang === "ar" ? "مواد غير نشطة" : "Inactive Materials"}
              </p>
              <p className="text-2xl font-bold text-gray-900">{inactiveMaterials}</p>
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
                placeholder={lang === 'ar' ? 'بحث عن مادة...' : 'Search materials...'}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                dir={lang === 'ar' ? 'rtl' : 'ltr'}
              />
            </div>

            {/* Category Filter */}
            <div>
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
              >
                <option value="all">{lang === 'ar' ? 'كل الفئات' : 'All Categories'}</option>
                {MAIN_CATEGORIES.map(cat => (
                  <option key={cat.value} value={cat.value}>
                    {lang === 'ar' ? cat.labelAr : cat.labelEn}
                  </option>
                ))}
              </select>
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
              </select>
            </div>
          </div>

          {/* Clear Filters */}
          {(searchTerm || filterCategory !== 'all' || filterStatus !== 'ALL') && (
            <button
              onClick={() => {
                setSearchTerm('');
                setFilterCategory('all');
                setFilterStatus('ALL');
              }}
              className="mt-4 text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              {lang === "ar" ? "مسح الفلاتر" : "Clear Filters"}
            </button>
          )}
        </div>

        {/* Materials Table */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          {loading ? (
            <div className="p-12 text-center">
              <div className="animate-spin inline-block w-12 h-12 border-4 border-current border-t-transparent text-blue-600 rounded-full" role="status">
                <span className="sr-only">Loading...</span>
              </div>
              <p className="mt-4 text-gray-600">{lang === 'ar' ? 'جاري التحميل...' : 'Loading...'}</p>
            </div>
          ) : filteredMaterials.length === 0 ? (
            <div className="p-12 text-center">
              <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                {lang === 'ar' ? 'لا توجد مواد' : 'No Materials Found'}
              </h3>
              <p className="text-gray-600 mb-6">
                {lang === 'ar' ? 'لم يتم العثور على مواد مطابقة للفلاتر المحددة' : 'No materials match your current filters'}
              </p>
              <button
                onClick={() => {
                  setEditingMaterial(null);
                  resetForm();
                  setShowModal(true);
                }}
                className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-semibold"
              >
                <Plus className="w-5 h-5" />
                {lang === 'ar' ? 'إضافة أول مادة' : 'Add First Material'}
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                      {lang === 'ar' ? 'الكود' : 'Code'}
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                      {lang === 'ar' ? 'اسم المادة' : 'Material Name'}
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                      {lang === 'ar' ? 'الفئة' : 'Category'}
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                      {lang === 'ar' ? 'الوحدة' : 'Unit'}
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                      {lang === 'ar' ? 'المخزون' : 'Stock'}
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                      {lang === 'ar' ? 'آخر سعر' : 'Last Price'}
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                      {lang === 'ar' ? 'الحالة' : 'Status'}
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                      {lang === 'ar' ? 'الإجراءات' : 'Actions'}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredMaterials.map((material) => (
                    <tr key={material._id} className="hover:bg-gray-50 transition">
                      <td className="px-6 py-4">
                        <span className="px-3 py-1 rounded-full text-xs font-semibold bg-purple-100 text-purple-800 border border-purple-200">
                          {material.code}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                            <Package className="w-5 h-5 text-blue-600" />
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900">
                              {lang === 'ar' ? material.nameAr : material.nameEn}
                            </p>
                            {material.subCategory && (
                              <p className="text-sm text-gray-500">{material.subCategory}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-semibold">
                          {MAIN_CATEGORIES.find(c => c.value === material.mainCategory)?.[lang === 'ar' ? 'labelAr' : 'labelEn'] || material.mainCategory}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-gray-700">{getUnitName(material.baseUnit?._id || material.baseUnit)}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`font-semibold ${
                          material.currentStock < material.minStockLevel 
                            ? 'text-red-600' 
                            : 'text-green-600'
                        }`}>
                          {material.currentStock || 0}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-semibold text-gray-900">
                        {material.lastPurchasePrice ? formatCurrency(material.lastPurchasePrice, lang) : '-'}
                      </td>
                      <td className="px-6 py-4">
                        {material.isActive !== false ? (
                          <span className="flex items-center gap-2 text-green-600 font-semibold">
                            <CheckCircle className="w-4 h-4" />
                            {lang === 'ar' ? 'نشط' : 'Active'}
                          </span>
                        ) : (
                          <span className="flex items-center gap-2 text-red-600 font-semibold">
                            <X className="w-4 h-4" />
                            {lang === 'ar' ? 'غير نشط' : 'Inactive'}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleEdit(material)}
                            className="flex items-center gap-1 px-3 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition font-medium"
                          >
                            <Edit className="w-4 h-4" />
                            {lang === 'ar' ? 'تعديل' : 'Edit'}
                          </button>
                          <button
                            onClick={() => setConfirmDelete(material)}
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
        <MaterialModal
          material={editingMaterial}
          formData={formData}
          setFormData={setFormData}
          units={units}
          categories={MAIN_CATEGORIES}
          onClose={() => {
            setShowModal(false);
            setEditingMaterial(null);
            resetForm();
          }}
          onSubmit={handleSubmit}
          saving={saving}
          t={t}
          lang={lang}
        />
      )}

      {/* Delete Confirmation Modal */}
      {confirmDelete && (
        <ConfirmModal
          material={confirmDelete}
          onClose={() => setConfirmDelete(null)}
          onConfirm={confirmDeleteAction}
          t={t}
          lang={lang}
        />
      )}
    </div>
  );
}

// ================= MODALS =================

function MaterialModal({ material, formData, setFormData, units, categories, onClose, onSubmit, saving, t, lang }) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-blue-700 px-8 py-6 border-b border-blue-500">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-white">
              {material 
                ? (lang === 'ar' ? 'تعديل المادة' : 'Edit Material')
                : (lang === 'ar' ? 'إضافة مادة جديدة' : 'Add New Material')
              }
            </h2>
            <button
              onClick={onClose}
              disabled={saving}
              className="text-white hover:text-gray-200 transition-colors disabled:opacity-50"
            >
              <X size={24} />
            </button>
          </div>
        </div>

        <form onSubmit={onSubmit} className="p-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Names */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                {lang === 'ar' ? 'الاسم بالعربي' : 'Name (Arabic)'} <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.nameAr}
                onChange={(e) => setFormData({ ...formData, nameAr: e.target.value })}
                disabled={saving}
                dir="rtl"
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                {lang === 'ar' ? 'الاسم بالإنجليزي' : 'Name (English)'} <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.nameEn}
                onChange={(e) => setFormData({ ...formData, nameEn: e.target.value })}
                disabled={saving}
                dir="ltr"
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
              />
            </div>

            {/* Code & Category */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                {lang === 'ar' ? 'الكود' : 'Code'} <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                disabled={saving}
                placeholder="STEEL-14MM"
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                {lang === 'ar' ? 'الفئة الرئيسية' : 'Main Category'} <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.mainCategory}
                onChange={(e) => setFormData({ ...formData, mainCategory: e.target.value })}
                disabled={saving || !!material}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                required
              >
                {categories.map(cat => (
                  <option key={cat.value} value={cat.value}>
                    {lang === 'ar' ? cat.labelAr : cat.labelEn}
                  </option>
                ))}
              </select>
            </div>

            {/* Sub Category & Unit */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                {lang === 'ar' ? 'الفئة الفرعية' : 'Sub Category'}
              </label>
              <input
                type="text"
                value={formData.subCategory}
                onChange={(e) => setFormData({ ...formData, subCategory: e.target.value })}
                disabled={saving}
                dir={lang === 'ar' ? 'rtl' : 'ltr'}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                {lang === 'ar' ? 'الوحدة الأساسية' : 'Base Unit'} <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.baseUnit}
                onChange={(e) => setFormData({ ...formData, baseUnit: e.target.value })}
                disabled={saving}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                required
              >
                <option value="">{lang === 'ar' ? 'اختر الوحدة' : 'Select Unit'}</option>
                {units.map(unit => (
                  <option key={unit._id} value={unit._id}>
                    {lang === 'ar' ? unit.nameAr : unit.nameEn}
                  </option>
                ))}
              </select>
            </div>

            {/* Stock & Price */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                {lang === 'ar' ? 'الحد الأدنى للمخزون' : 'Min Stock Level'}
              </label>
              <input
                type="number"
                value={formData.minLevelStock}
                onChange={(e) => setFormData({ ...formData, minLevelStock: e.target.value })}
                disabled={saving}
                min="0"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                {lang === 'ar' ? 'آخر سعر شراء' : 'Last Purchase Price'}
              </label>
              <input
                type="number"
                value={formData.lastPurchasedPrice}
                onChange={(e) => setFormData({ ...formData, lastPurchasedPrice: e.target.value })}
                disabled={saving}
                min="0"
                step="0.01"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
              />
            </div>

            {/* Last Purchase Date */}
            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                {lang === 'ar' ? 'تاريخ آخر شراء' : 'Last Purchase Date'}
              </label>
              <input
                type="date"
                value={formData.lastPurchasedDate}
                onChange={(e) => setFormData({ ...formData, lastPurchasedDate: e.target.value })}
                disabled={saving}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
              />
            </div>

            {/* Description */}
            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                {lang === 'ar' ? 'الوصف' : 'Description'}
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                disabled={saving}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                rows={3}
                dir={lang === 'ar' ? 'rtl' : 'ltr'}
                placeholder={lang === 'ar' ? 'أضف وصفاً للمادة...' : 'Add material description...'}
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
                <div className="animate-spin inline-block w-5 h-5 border-2 border-current border-t-transparent text-white rounded-full" role="status">
                  <span className="sr-only">Loading...</span>
                </div>
              )}
              {saving 
                ? (lang === 'ar' ? 'جاري الحفظ...' : 'Saving...') 
                : (lang === 'ar' ? 'حفظ' : 'Save')}
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="flex-1 px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition font-semibold disabled:opacity-50"
            >
              {lang === 'ar' ? 'إلغاء' : 'Cancel'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ConfirmModal({ material, onClose, onConfirm, t, lang }) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
            <Trash2 className="w-6 h-6 text-red-600" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900">
              {t?.deleteMaterial || (lang === 'ar' ? 'حذف المادة' : 'Delete Material')}
            </h3>
            <p className="text-sm text-gray-500">
              {lang === 'ar' 
                ? 'هل أنت متأكد من حذف هذه المادة؟' 
                : 'Are you sure you want to delete this material?'}
            </p>
          </div>
        </div>
        
        <div className="bg-gray-50 rounded-lg p-4 mb-4">
          <p className="text-sm text-gray-600 mb-1">{lang === 'ar' ? 'المادة:' : 'Material:'}</p>
          <p className="font-semibold text-gray-900">
            {lang === 'ar' ? material.nameAr : material.nameEn}
          </p>
          <p className="text-sm text-gray-500 mt-1">
            {t?.code || 'Code'}: {material.code}
          </p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition font-semibold"
          >
            {t?.cancel || 'Cancel'}
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition font-semibold"
          >
            {t?.delete || 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
}