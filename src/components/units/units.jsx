import { useState, useEffect, useContext } from "react";
import { Plus, Search, Edit2, Trash2, Package, Calendar, AlertCircle, Check, X, CheckCircle, Download } from "lucide-react";
import axiosInstance from "../../utils/axiosInstance";
import FullPageLoader from "../Loader/Loader";
import { LanguageContext } from "../../context/LanguageContext";
import * as XLSX from 'xlsx';
import { toast } from "react-toastify";

const UnitCategory = {
  WEIGHT: 'weight',
  VOLUME: 'volume',
  LENGTH: 'length',
  AREA: 'area',
  COUNT: 'count',
};

export default function Units({ showToast, currentUser }) {
  const { lang, t } = useContext(LanguageContext);
  
  const [units, setUnits] = useState([]);
  const [baseUnits, setBaseUnits] = useState([]);
  const [filteredUnits, setFilteredUnits] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState("add");
  const [selectedUnit, setSelectedUnit] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [deleteModal, setDeleteModal] = useState({ show: false, unit: null });
  const [activateModal, setActivateModal] = useState({ show: false, unit: null });

  // Form State
  const [formData, setFormData] = useState({
    nameAr: "",
    nameEn: "",
    code: "",
    symbol: "",
    category: "",
    isBase: false,
    baseUnitId: "",
    conversionFactor: 1,
    description: ""
  });

  // Get Category Label in current language
  const getCategoryLabel = (category) => {
    const labels = {
      [UnitCategory.WEIGHT]: lang === "ar" ? "وزن" : "Weight",
      [UnitCategory.VOLUME]: lang === "ar" ? "حجم" : "Volume",
      [UnitCategory.LENGTH]: lang === "ar" ? "طول" : "Length",
      [UnitCategory.AREA]: lang === "ar" ? "مساحة" : "Area",
      [UnitCategory.COUNT]: lang === "ar" ? "عدد" : "Count",
    };
    return labels[category] || category;
  };

  // Fetch all units
  const fetchUnits = async () => {
    setLoading(true);
    try {
      const url = filterCategory === "all" 
        ? `/units?lang=${lang}`
        : `/units?category=${filterCategory}&lang=${lang}`;
      
      const response = await axiosInstance.get(url);
      setUnits(response.data.result || []);
    } catch (error) {
      toast.error(error.response?.data?.message || (lang === "ar" ? "فشل تحميل الوحدات" : "Failed to fetch units"));
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch base units for dropdown
  const fetchBaseUnits = async () => {
    try {
      const response = await axiosInstance.get(`/units/base`);
      setBaseUnits(response.data.result || []);
    } catch (error) {
      console.error("Error fetching base units:", error);
    }
  };

  // Filter units based on search and status
  const filterUnits = () => {
    let filtered = [...units];

    if (searchQuery) {
      filtered = filtered.filter(unit =>
        unit.nameAr?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        unit.nameEn?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        unit.code?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        unit.symbol?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        unit.category?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (filterStatus !== 'ALL') {
      filtered = filtered.filter(unit => 
        filterStatus === 'ACTIVE' ? unit.isActive !== false : unit.isActive === false
      );
    }

    setFilteredUnits(filtered);
  };

  useEffect(() => {
    fetchUnits();
    fetchBaseUnits();
  }, [filterCategory, lang]);

  useEffect(() => {
    filterUnits();
  }, [units, searchQuery, filterStatus]);

  // Export to Excel
  const handleExportToExcel = () => {
    try {
      const exportData = filteredUnits.map(unit => ({
        [lang === "ar" ? "الاسم بالعربية" : "Name (Arabic)"]: unit.nameAr,
        [lang === "ar" ? "الاسم بالإنجليزية" : "Name (English)"]: unit.nameEn,
        [lang === "ar" ? "الكود" : "Code"]: unit.code,
        [lang === "ar" ? "الرمز" : "Symbol"]: unit.symbol,
        [lang === "ar" ? "الفئة" : "Category"]: getCategoryLabel(unit.category),
        [lang === "ar" ? "النوع" : "Type"]: unit.isBase ? (lang === "ar" ? "أساسية" : "Base") : (lang === "ar" ? "مشتقة" : "Derived"),
        [lang === "ar" ? "معامل التحويل" : "Conversion Factor"]: unit.conversionFactor || 1,
        [lang === "ar" ? "الحالة" : "Status"]: unit.isActive !== false ? (lang === "ar" ? "نشط" : "Active") : (lang === "ar" ? "محذوف" : "Inactive"),
        [lang === "ar" ? "الوصف" : "Description"]: unit.description || ""
      }));

      const ws = XLSX.utils.json_to_sheet(exportData);
      
      // Set column widths
      const columnWidths = [
        { wch: 18 }, // Name Arabic
        { wch: 18 }, // Name English
        { wch: 12 }, // Code
        { wch: 10 }, // Symbol
        { wch: 15 }, // Category
        { wch: 12 }, // Type
        { wch: 15 }, // Conversion Factor
        { wch: 12 }, // Status
        { wch: 25 }  // Description
      ];
      ws['!cols'] = columnWidths;

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, lang === "ar" ? "الوحدات" : "Units");
      
      const fileName = `Units_${new Date().toISOString().slice(0, 10)}.xlsx`;
      XLSX.writeFile(wb, fileName);
      
      toast.success(
        lang === "ar" 
          ? "تم تصدير البيانات بنجاح" 
          : "Data exported successfully"
      );
    } catch (error) {
      toast.error(
        lang === "ar" 
          ? "فشل التصدير" 
          : "Export failed"
      );
      console.error("Export error:", error);
    }
  };

  // Create or Update Unit
// Create or Update Unit
const handleSubmit = async (e) => {
  e.preventDefault();
  
  // Validate form before submitting
  if (!validateForm()) {
    return;
  }
  
  setLoading(true);

  try {
    const payload = {
      nameAr: formData.nameAr,
      nameEn: formData.nameEn,
      code: formData.code,
      symbol: formData.symbol,
      category: formData.category,
      isBase: formData.isBase,
      description: formData.description || "",
    };

    if (!formData.isBase) {
      payload.baseUnitId = formData.baseUnitId;
      payload.conversionFactor = Number(formData.conversionFactor) || 1;
    }

    if (modalMode === "add") {
      await axiosInstance.post(`/units?lang=${lang}`, payload);
    } else {
      await axiosInstance.put(`/units/${selectedUnit._id}?lang=${lang}`, payload);
    }

    toast.success(
      lang === "ar" ? "تم الحفظ بنجاح" : "Saved successfully"
    );
    setShowModal(false);
    resetForm();
    fetchUnits();
    fetchBaseUnits();
  } catch (error) {
    console.error(error);
    
    let errorMessage = "Operation failed";
    
    if (error.response?.status === 409) {
      const message = error.response?.data?.message || "";
      
      // Check if error is about duplicate base unit for category
      if (message.includes("already has a base unit")) {
        errorMessage = lang === "ar" 
          ? `الفئة ${getCategoryLabel(formData.category)} لديها بالفعل وحدة أساسية. لا يمكن إضافة وحدة أساسية أخرى لنفس الفئة` 
          : `Category ${getCategoryLabel(formData.category)} already has a base unit. Cannot add another base unit for the same category`;
      } 
      // Check if error is about duplicate code or symbol
      else if (message.includes("code") || message.includes("Code")) {
        errorMessage = lang === "ar" 
          ? "الكود موجود مسبقاً. الرجاء استخدام كود مختلف" 
          : "Code already exists. Please use a different code";
      } 
      else if (message.includes("symbol") || message.includes("Symbol")) {
        errorMessage = lang === "ar" 
          ? "الرمز موجود مسبقاً. الرجاء استخدام رمز مختلف" 
          : "Symbol already exists. Please use a different symbol";
      }
      else {
        errorMessage = lang === "ar" 
          ? "حدث تعارض في البيانات. الرجاء التحقق من المدخلات" 
          : "Data conflict occurred. Please check your inputs";
      }
    } 
    else if (error.response?.data?.message) {
      errorMessage = error.response.data.message;
    } 
    else if (error.response?.status === 400) {
      errorMessage = lang === "ar"
        ? "البيانات المدخلة غير صحيحة"
        : "Invalid data provided";
    } 
    else if (error.response?.status === 500) {
      errorMessage = lang === "ar"
        ? "حدث خطأ في الخادم. الرجاء المحاولة لاحقاً"
        : "Server error. Please try again later";
    }
    
    toast.error(errorMessage);
  } finally {
    setLoading(false);
  }
};
// Form validation helper
const validateForm = () => {
  // Check if code is unique (excluding current unit in edit mode)
  const isDuplicateCode = units.some(unit => 
    unit.code.toLowerCase() === formData.code.toLowerCase() && 
    (modalMode === "add" || unit._id !== selectedUnit._id)
  );
  
  if (isDuplicateCode) {
    toast.error(
      lang === "ar" 
        ? "الكود موجود مسبقاً" 
        : "Code already exists"
    );
    return false;
  }

  // Check if symbol is unique
  const isDuplicateSymbol = units.some(unit => 
    unit.symbol.toLowerCase() === formData.symbol.toLowerCase() && 
    (modalMode === "add" || unit._id !== selectedUnit._id)
  );
  
  if (isDuplicateSymbol) {
    toast.error(
      lang === "ar" 
        ? "الرمز موجود مسبقاً" 
        : "Symbol already exists"
    );
    return false;
  }

  // Check if trying to add another base unit for the same category
  if (formData.isBase) {
    const existingBaseUnit = units.find(unit => 
      unit.category === formData.category && 
      unit.isBase && 
      (modalMode === "add" || unit._id !== selectedUnit._id)
    );
    
    if (existingBaseUnit) {
      toast.error(
        lang === "ar" 
          ? `الفئة ${getCategoryLabel(formData.category)} لديها بالفعل وحدة أساسية (${lang === "ar" ? existingBaseUnit.nameAr : existingBaseUnit.nameEn}). لا يمكن إضافة وحدة أساسية أخرى` 
          : `Category ${getCategoryLabel(formData.category)} already has a base unit (${existingBaseUnit.nameEn}). Cannot add another base unit`
      );
      return false;
    }
  }

  // If not base unit, check if base unit is selected
  if (!formData.isBase && !formData.baseUnitId) {
    toast.error(
      lang === "ar" 
        ? "الرجاء اختيار الوحدة الأساسية" 
        : "Please select a base unit"
    );
    return false;
  }

  // Check conversion factor for derived units
  if (!formData.isBase && formData.conversionFactor <= 0) {
    toast.error(
      lang === "ar" 
        ? "معامل التحويل يجب أن يكون أكبر من صفر" 
        : "Conversion factor must be greater than zero"
    );
    return false;
  }

  return true;
};
  // Delete Unit
  const handleDelete = async () => {
    if (!deleteModal.unit) return;

    setLoading(true);
    try {
      await axiosInstance.delete(`/units/${deleteModal.unit._id}?lang=${lang}`);
      toast.success(lang === "ar" ? "تم حذف الوحدة بنجاح" : "Unit deleted successfully");
      setDeleteModal({ show: false, unit: null });
      fetchUnits();
      fetchBaseUnits();
    } catch (error) {
      toast.error(error.response?.data?.message || (lang === "ar" ? "فشل الحذف" : "Delete failed"));
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // Toggle Unit Active Status
  const handleActivate = async () => {
    if (!activateModal.unit) return;

    setLoading(true);
    try {
      await axiosInstance.patch(`/units/${activateModal.unit._id}/activate?lang=${lang}`);
      toast.success(lang === "ar" ? "تم تفعيل الوحدة بنجاح" : "Unit activated successfully");
      setActivateModal({ show: false, unit: null });
      fetchUnits();
    } catch (error) {
      toast.error(error.response?.data?.message || (lang === "ar" ? "فشل التحديث" : "Update failed"));
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // Open Edit Modal
  const openEditModal = (unit) => {
    setModalMode("edit");
    setSelectedUnit(unit);
    setFormData({
      nameAr: unit.nameAr || "",
      nameEn: unit.nameEn || "",
      code: unit.code || "",
      symbol: unit.symbol || "",
      category: unit.category || "",
      isBase: unit.isBase || false,
      baseUnitId: unit.baseUnitId?._id || unit.baseUnitId || "",
      conversionFactor: unit.conversionFactor || 1,
      description: unit.description || ""
    });
    setShowModal(true);
  };

  // Open Add Modal
  const openAddModal = () => {
    setModalMode("add");
    resetForm();
    setShowModal(true);
  };

  // Reset Form
  const resetForm = () => {
    setFormData({
      nameAr: "",
      nameEn: "",
      code: "",
      symbol: "",
      category: "",
      isBase: false,
      baseUnitId: "",
      conversionFactor: 1,
      description: ""
    });
    setSelectedUnit(null);
  };

  // Get unique categories from units
  const getCategories = () => {
    const categories = [...new Set(units.map(unit => unit.category))];
    return categories.filter(Boolean);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading && units.length === 0) {
    return <FullPageLoader text={lang === "ar" ? "جاري تحميل الوحدات..." : "Loading units..."} />;
  }

  const activeUnits = filteredUnits.filter(u => u.isActive !== false).length;
  const inactiveUnits = filteredUnits.filter(u => u.isActive === false).length;
  const baseUnitsCount = filteredUnits.filter(u => u.isBase).length;

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
                    {lang === "ar" ? "إدارة الوحدات" : "Units Management"}
                  </h1>
                  <p className="text-blue-100 mt-1">
                    {lang === "ar" 
                      ? "عرض وإدارة وحدات القياس المستخدمة في النظام" 
                      : "View and manage measurement units used in the system"}
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
                  onClick={openAddModal}
                  className="flex items-center gap-2 px-6 py-3 bg-white text-blue-600 rounded-lg hover:bg-blue-50 transition font-semibold shadow-md"
                >
                  <Plus className="w-5 h-5" />
                  <span>{lang === "ar" ? "إضافة وحدة" : "Add Unit"}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 p-6 bg-gray-50">
            <div className="bg-white p-4 rounded-lg border-l-4 border-blue-500">
              <p className="text-sm text-gray-600 mb-1">
                {lang === "ar" ? "إجمالي الوحدات" : "Total Units"}
              </p>
              <p className="text-2xl font-bold text-gray-900">{filteredUnits.length}</p>
            </div>
            <div className="bg-white p-4 rounded-lg border-l-4 border-green-500">
              <p className="text-sm text-gray-600 mb-1">
                {lang === "ar" ? "وحدات نشطة" : "Active Units"}
              </p>
              <p className="text-2xl font-bold text-gray-900">{activeUnits}</p>
            </div>
            <div className="bg-white p-4 rounded-lg border-l-4 border-purple-500">
              <p className="text-sm text-gray-600 mb-1">
                {lang === "ar" ? "وحدات أساسية" : "Base Units"}
              </p>
              <p className="text-2xl font-bold text-gray-900">{baseUnitsCount}</p>
            </div>
            <div className="bg-white p-4 rounded-lg border-l-4 border-red-500">
              <p className="text-sm text-gray-600 mb-1">
                {lang === "ar" ? "وحدات محذوفة" : "Inactive Units"}
              </p>
              <p className="text-2xl font-bold text-gray-900">{inactiveUnits}</p>
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
                placeholder={lang === "ar" ? "البحث في الوحدات..." : "Search units..."}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
              />
            </div>

            {/* Category Filter */}
            <div>
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
              >
                <option value="all">{lang === "ar" ? "كل الفئات" : "All Categories"}</option>
                {Object.values(UnitCategory).map((cat) => (
                  <option key={cat} value={cat}>
                    {getCategoryLabel(cat)}
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
                <option value="INACTIVE">{lang === "ar" ? "محذوف" : "Inactive"}</option>
              </select>
            </div>
          </div>

          {/* Clear Filters */}
          {(searchQuery || filterCategory !== 'all' || filterStatus !== 'ALL') && (
            <button
              onClick={() => {
                setSearchQuery('');
                setFilterCategory('all');
                setFilterStatus('ALL');
              }}
              className="mt-4 text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              {lang === "ar" ? "مسح الفلاتر" : "Clear Filters"}
            </button>
          )}
        </div>

        {/* Units Table */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          {filteredUnits.length === 0 ? (
            <div className="p-12 text-center">
              <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                {lang === "ar" ? "لا توجد وحدات" : "No Units Found"}
              </h3>
              <p className="text-gray-600 mb-6">
                {lang === "ar" ? "لم يتم العثور على وحدات مطابقة للفلاتر المحددة" : "No units match your current filters"}
              </p>
              <button
                onClick={openAddModal}
                className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-semibold"
              >
                <Plus className="w-5 h-5" />
                {lang === "ar" ? "إضافة أول وحدة" : "Add First Unit"}
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                      {lang === "ar" ? "الوحدة" : "Unit"}
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                      {lang === "ar" ? "الكود" : "Code"}
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                      {lang === "ar" ? "الرمز" : "Symbol"}
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                      {lang === "ar" ? "الفئة" : "Category"}
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                      {lang === "ar" ? "النوع" : "Type"}
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                      {lang === "ar" ? "الحالة" : "Status"}
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                      {lang === "ar" ? "الإجراءات" : "Actions"}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredUnits.map((unit) => (
                    <tr key={unit._id} className="hover:bg-gray-50 transition">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                            <span className="text-blue-600 font-semibold text-lg">
                              {unit.symbol?.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900">
                              {lang === "ar" ? unit.nameAr : unit.nameEn}
                            </p>
                            {unit.description && (
                              <p className="text-sm text-gray-500 truncate max-w-xs">
                                {unit.description}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-3 py-1 rounded-full text-xs font-semibold bg-purple-100 text-purple-800 border border-purple-200">
                          {unit.code}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-3 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-800 border border-gray-200">
                          {unit.symbol}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-semibold">
                          {getCategoryLabel(unit.category)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          unit.isBase 
                            ? "bg-green-100 text-green-800 border border-green-200" 
                            : "bg-yellow-100 text-yellow-800 border border-yellow-200"
                        }`}>
                          {unit.isBase 
                            ? (lang === "ar" ? "أساسية" : "Base") 
                            : (lang === "ar" ? "مشتقة" : "Derived")}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {unit.isActive !== false ? (
                          <span className="flex items-center gap-2 text-green-600 font-semibold">
                            <Check className="w-4 h-4" />
                            {lang === "ar" ? "نشط" : "Active"}
                          </span>
                        ) : (
                          <span className="flex items-center gap-2 text-red-600 font-semibold">
                            <X className="w-4 h-4" />
                            {lang === "ar" ? "محذوف" : "Inactive"}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => openEditModal(unit)}
                            className="flex items-center gap-1 px-3 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition font-medium"
                          >
                            <Edit2 className="w-4 h-4" />
                            {lang === "ar" ? "تعديل" : "Edit"}
                          </button>
                          {unit.isActive !== false && (
                            <button
                              onClick={() => setDeleteModal({ show: true, unit })}
                              className="flex items-center gap-1 px-3 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition font-medium"
                            >
                              <Trash2 className="w-4 h-4" />
                              {lang === "ar" ? "حذف" : "Delete"}
                            </button>
                          )}
                          {unit.isActive === false && (
                            <button
                              onClick={() => setActivateModal({ show: true, unit })}
                              className="flex items-center gap-1 px-3 py-2 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition font-medium"
                            >
                              <CheckCircle className="w-4 h-4" />
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
                {modalMode === "add"
                  ? (lang === "ar" ? "إضافة وحدة جديدة" : "Add New Unit")
                  : (lang === "ar" ? "تعديل الوحدة" : "Edit Unit")}
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
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                    required
                  />
                </div>

                {/* Symbol */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    {lang === "ar" ? "الرمز" : "Symbol"} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.symbol}
                    onChange={(e) => setFormData({ ...formData, symbol: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                    required
                  />
                </div>

                {/* Category */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    {lang === "ar" ? "الفئة" : "Category"} <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                    required
                  >
                    <option value="">{lang === "ar" ? "اختر الفئة" : "Select Category"}</option>
                    {Object.values(UnitCategory).map((cat) => (
                      <option key={cat} value={cat}>
                        {getCategoryLabel(cat)}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Is Base Unit */}
                <div className="flex items-center">
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.isBase}
                      onChange={(e) => setFormData({ ...formData, isBase: e.target.checked, baseUnitId: "", conversionFactor: 1 })}
                      className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                    />
                    <span className="ml-3 text-sm font-semibold text-gray-700">
                      {lang === "ar" ? "وحدة أساسية" : "Base Unit"}
                    </span>
                  </label>
                </div>

                {/* Base Unit (if not base) */}
                {!formData.isBase && (
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      {lang === "ar" ? "الوحدة الأساسية" : "Base Unit"} <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={formData.baseUnitId}
                      onChange={(e) => setFormData({ ...formData, baseUnitId: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                      required
                    >
                      <option value="">{lang === "ar" ? "اختر الوحدة الأساسية" : "Select Base Unit"}</option>
                      {baseUnits.map((unit) => (
                        <option key={unit._id} value={unit._id}>
                          {lang === "ar" ? unit.nameAr : unit.nameEn} ({unit.symbol})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Conversion Factor (if not base) */}
                {!formData.isBase && (
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      {lang === "ar" ? "معامل التحويل" : "Conversion Factor"} <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      step="0.0001"
                      value={formData.conversionFactor}
                      onChange={(e) => setFormData({ ...formData, conversionFactor: parseFloat(e.target.value) || 0 })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                      required
                    />
                  </div>
                )}

                {/* Description */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    {lang === "ar" ? "الوصف" : "Description"}
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows="3"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                    placeholder={lang === "ar" ? "أضف وصفاً للوحدة..." : "Add unit description..."}
                  />
                </div>
              </div>

              {/* Buttons */}
              <div className="flex gap-4 mt-8">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-semibold disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loading && (
                    <div className="animate-spin inline-block w-5 h-5 border-2 border-current border-t-transparent text-white rounded-full" role="status" aria-label="loading">
                      <span className="sr-only">Loading...</span>
                    </div>
                  )}
                  {loading 
                    ? (lang === "ar" ? "جاري الحفظ..." : "Saving...") 
                    : (lang === "ar" ? "حفظ" : "Save")}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    resetForm();
                  }}
                  disabled={loading}
                  className="flex-1 px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition font-semibold disabled:opacity-50"
                >
                  {lang === "ar" ? "إلغاء" : "Cancel"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteModal.show && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                <Trash2 className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">
                  {lang === "ar" ? "تأكيد الحذف" : "Confirm Delete"}
                </h3>
                <p className="text-sm text-gray-500">
                  {lang === "ar" ? "هل أنت متأكد من حذف هذه الوحدة؟" : "Are you sure you want to delete this unit?"}
                </p>
              </div>
            </div>
            
            <div className="bg-gray-50 rounded-lg p-4 mb-4">
              <p className="text-sm text-gray-600 mb-1">{lang === "ar" ? "الوحدة:" : "Unit:"}</p>
              <p className="font-semibold text-gray-900">{lang === "ar" ? deleteModal.unit?.nameAr : deleteModal.unit?.nameEn}</p>
              <p className="text-sm text-gray-500">{lang === "ar" ? "الكود: " : "Code: "}{deleteModal.unit?.code}</p>
              <p className="text-sm text-gray-500">{lang === "ar" ? "الرمز: " : "Symbol: "}{deleteModal.unit?.symbol}</p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setDeleteModal({ show: false, unit: null })}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition font-semibold"
              >
                {lang === "ar" ? "إلغاء" : "Cancel"}
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition font-semibold"
              >
                {lang === "ar" ? "حذف" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Activate Confirmation Modal */}
      {activateModal.show && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">
                  {lang === "ar" ? "تأكيد التفعيل" : "Confirm Activation"}
                </h3>
                <p className="text-sm text-gray-500">
                  {lang === "ar" ? "هل أنت متأكد من تفعيل هذه الوحدة؟" : "Are you sure you want to activate this unit?"}
                </p>
              </div>
            </div>
            
            <div className="bg-gray-50 rounded-lg p-4 mb-4">
              <p className="text-sm text-gray-600 mb-1">{lang === "ar" ? "الوحدة:" : "Unit:"}</p>
              <p className="font-semibold text-gray-900">{lang === "ar" ? activateModal.unit?.nameAr : activateModal.unit?.nameEn}</p>
              <p className="text-sm text-gray-500">{lang === "ar" ? "الكود: " : "Code: "}{activateModal.unit?.code}</p>
              <p className="text-sm text-gray-500">{lang === "ar" ? "الرمز: " : "Symbol: "}{activateModal.unit?.symbol}</p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setActivateModal({ show: false, unit: null })}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition font-semibold"
              >
                {lang === "ar" ? "إلغاء" : "Cancel"}
              </button>
              <button
                onClick={handleActivate}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-semibold"
              >
                {lang === "ar" ? "تفعيل" : "Activate"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}