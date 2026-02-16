import React, { useState, useEffect, useContext } from 'react';
import { Package, Plus, Trash2, ArrowLeft, AlertCircle, CheckCircle, DollarSign } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import axiosInstance from '../../utils/axiosInstance';
import FullPageLoader from '../Loader/Loader';
import { LanguageContext } from '../../context/LanguageContext';
import { toast } from 'react-toastify';

const CreateMaterialIssue = () => {
  const { lang, t } = useContext(LanguageContext);
  const navigate = useNavigate();

  const [projects, setProjects] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [units, setUnits] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    projectId: '',
    issueDate: new Date().toISOString().split('T')[0],
    items: [
      {
        materialId: '',
        unitId: '',
        quantity: '',
        unitPrice: ''
      }
    ],
    notes: ''
  });

  const [errors, setErrors] = useState({});

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [projectsRes, materialsRes, unitsRes] = await Promise.all([
        axiosInstance.get('/projects'),
        axiosInstance.get('/materials'),
        axiosInstance.get('/units')
      ]);

      const projectsData = Array.isArray(projectsRes.data) ? projectsRes.data : (projectsRes.data.result || []);
      const materialsData = Array.isArray(materialsRes.data) ? materialsRes.data : (materialsRes.data.result || []);
      const unitsData = Array.isArray(unitsRes.data) ? unitsRes.data : (unitsRes.data.result || []);

      setProjects(projectsData);
      setMaterials(materialsData);
      setUnits(unitsData);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error(lang === 'ar' ? 'فشل تحميل البيانات' : 'Failed to load data');
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.projectId) {
      newErrors.projectId = lang === 'ar' ? 'اختر مشروع' : 'Please select a project';
    }

    if (!formData.issueDate) {
      newErrors.issueDate = lang === 'ar' ? 'حدد التاريخ' : 'Please select a date';
    }

    if (!formData.items || formData.items.length === 0) {
      newErrors.items = lang === 'ar' ? 'أضف مادة واحدة على الأقل' : 'Add at least one material';
      return newErrors;
    }

    formData.items.forEach((item, idx) => {
      if (!item.materialId) {
        newErrors[`item_${idx}_material`] = lang === 'ar' ? 'اختر مادة' : 'Select a material';
      }
      if (!item.unitId) {
        newErrors[`item_${idx}_unit`] = lang === 'ar' ? 'اختر الوحدة' : 'Select a unit';
      }
      if (!item.quantity || parseFloat(item.quantity) <= 0) {
        newErrors[`item_${idx}_quantity`] = lang === 'ar' ? 'أدخل كمية صحيحة' : 'Enter a valid quantity';
      }
      if (!item.unitPrice || parseFloat(item.unitPrice) < 0) {
        newErrors[`item_${idx}_price`] = lang === 'ar' ? 'أدخل سعر صحيح' : 'Enter a valid price';
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      toast.error(lang === 'ar' ? 'يرجى إصلاح الأخطاء' : 'Please fix errors');
      return;
    }

    try {
      setSubmitting(true);

      const payload = {
        projectId: formData.projectId,
        issueDate: formData.issueDate,
        items: formData.items.map(item => ({
          materialId: item.materialId,
          unitId: item.unitId,
          quantity: parseFloat(item.quantity),
          unitPrice: parseFloat(item.unitPrice)
        })),
        notes: formData.notes.trim()
      };

      await axiosInstance.post('/projects/material-issue', payload);

      toast.success(lang === 'ar' ? 'تم إنشاء التحويل بنجاح!' : 'Material issue created successfully!');

      setTimeout(() => {
        navigate('/projects');
      }, 1500);
    } catch (error) {
      console.error('Error creating material issue:', error);
      const message = error.response?.data?.message || (lang === 'ar' ? 'فشل إنشاء التحويل' : 'Failed to create material issue');
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddItem = () => {
    setFormData({
      ...formData,
      items: [
        ...formData.items,
        {
          materialId: '',
          unitId: '',
          quantity: '',
          unitPrice: ''
        }
      ]
    });
  };

  const handleRemoveItem = (index) => {
    if (formData.items.length > 1) {
      setFormData({
        ...formData,
        items: formData.items.filter((_, i) => i !== index)
      });
    }
  };

  const handleItemChange = (index, field, value) => {
    const newItems = [...formData.items];
    newItems[index][field] = value;
    setFormData({ ...formData, items: newItems });
  };

  const showToast = (message, type) => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 5000);
  };

  const calculateItemTotal = (item) => {
    if (item.quantity && item.unitPrice) {
      return parseFloat(item.quantity) * parseFloat(item.unitPrice);
    }
    return 0;
  };

  const calculateGrandTotal = () => {
    return formData.items.reduce((sum, item) => sum + calculateItemTotal(item), 0);
  };

  const getMaterialName = (materialId) => {
    const material = materials.find(m => m._id === materialId);
    return material ? (lang === 'ar' ? material.nameAr : material.nameEn) : '';
  };

  const getUnitName = (unitId) => {
    const unit = units.find(u => u._id === unitId);
    return unit ? (lang === 'ar' ? unit.nameAr : unit.nameEn) : '';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-8 px-4">
      {/* Submitting Overlay */}
      {submitting && <FullPageLoader text={lang === "ar" ? "جاري المعالجة..." : "Processing..."} />}

      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-purple-600 to-purple-700 px-8 py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Package className="w-8 h-8 text-white" />
                <div>
                  <h1 className="text-2xl font-bold text-white">
                    {lang === 'ar' ? 'تحويل مواد' : 'Material Issue'}
                  </h1>
                  <p className="text-purple-100 mt-1">
                    {lang === 'ar' ? 'تحويل المواد من الستوك إلى المشروع' : 'Transfer materials to project'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => navigate('/projects')}
                className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg transition"
              >
                <ArrowLeft className="w-4 h-4" />
                {lang === 'ar' ? 'رجوع' : 'Back'}
              </button>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-8 space-y-6">
            
            {/* Basic Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  {lang === 'ar' ? 'المشروع' : 'Project'} <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.projectId}
                  onChange={(e) => setFormData({ ...formData, projectId: e.target.value })}
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition ${
                    errors.projectId ? 'border-red-500' : 'border-gray-300'
                  }`}
                  disabled={submitting}
                >
                  <option value="">{lang === 'ar' ? 'اختر مشروع' : 'Select a project'}</option>
                  {projects.map((project) => (
                    <option key={project._id} value={project._id}>
                      {lang === 'ar' ? project.nameAr : project.nameEn} ({project.code})
                    </option>
                  ))}
                </select>
                {errors.projectId && <p className="mt-1 text-sm text-red-500">{errors.projectId}</p>}
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  {lang === 'ar' ? 'تاريخ التحويل' : 'Issue Date'} <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={formData.issueDate}
                  onChange={(e) => setFormData({ ...formData, issueDate: e.target.value })}
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition ${
                    errors.issueDate ? 'border-red-500' : 'border-gray-300'
                  }`}
                  disabled={submitting}
                />
                {errors.issueDate && <p className="mt-1 text-sm text-red-500">{errors.issueDate}</p>}
              </div>
            </div>

            {/* Materials Section */}
            <div className="bg-gray-50 p-6 rounded-lg">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <Package className="w-5 h-5 text-purple-600" />
                  {lang === 'ar' ? 'المواد المنقولة' : 'Materials to Transfer'}
                </h3>
                <button
                  type="button"
                  onClick={handleAddItem}
                  className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition font-semibold"
                  disabled={submitting}
                >
                  <Plus className="w-4 h-4" />
                  {lang === 'ar' ? 'إضافة مادة' : 'Add Material'}
                </button>
              </div>

              {errors.items && (
                <p className="mb-4 text-sm text-red-500">{errors.items}</p>
              )}

              <div className="space-y-4">
                {formData.items.map((item, index) => (
                  <div key={index} className="bg-white p-4 rounded-lg border border-gray-200">
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-4">
                      {/* Material */}
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">
                          {lang === 'ar' ? 'المادة' : 'Material'} <span className="text-red-500">*</span>
                        </label>
                        <select
                          value={item.materialId}
                          onChange={(e) => handleItemChange(index, 'materialId', e.target.value)}
                          className={`w-full px-3 py-2 border rounded focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm ${
                            errors[`item_${index}_material`] ? 'border-red-500' : 'border-gray-300'
                          }`}
                          disabled={submitting}
                        >
                          <option value="">{lang === 'ar' ? 'اختر' : 'Select'}</option>
                          {materials.map((material) => (
                            <option key={material._id} value={material._id}>
                              {lang === 'ar' ? material.nameAr : material.nameEn}
                            </option>
                          ))}
                        </select>
                        {errors[`item_${index}_material`] && (
                          <p className="mt-0.5 text-xs text-red-500">{errors[`item_${index}_material`]}</p>
                        )}
                      </div>

                      {/* Unit */}
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">
                          {lang === 'ar' ? 'الوحدة' : 'Unit'} <span className="text-red-500">*</span>
                        </label>
                        <select
                          value={item.unitId}
                          onChange={(e) => handleItemChange(index, 'unitId', e.target.value)}
                          className={`w-full px-3 py-2 border rounded focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm ${
                            errors[`item_${index}_unit`] ? 'border-red-500' : 'border-gray-300'
                          }`}
                          disabled={submitting}
                        >
                          <option value="">{lang === 'ar' ? 'اختر' : 'Select'}</option>
                          {units.map((unit) => (
                            <option key={unit._id} value={unit._id}>
                              {lang === 'ar' ? unit.nameAr : unit.nameEn}
                            </option>
                          ))}
                        </select>
                        {errors[`item_${index}_unit`] && (
                          <p className="mt-0.5 text-xs text-red-500">{errors[`item_${index}_unit`]}</p>
                        )}
                      </div>

                      {/* Quantity */}
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">
                          {lang === 'ar' ? 'الكمية' : 'Quantity'} <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="number"
                          step="0.0001"
                          value={item.quantity}
                          onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                          className={`w-full px-3 py-2 border rounded focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm ${
                            errors[`item_${index}_quantity`] ? 'border-red-500' : 'border-gray-300'
                          }`}
                          placeholder="0.00"
                          disabled={submitting}
                        />
                        {errors[`item_${index}_quantity`] && (
                          <p className="mt-0.5 text-xs text-red-500">{errors[`item_${index}_quantity`]}</p>
                        )}
                      </div>

                      {/* Unit Price */}
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">
                          {lang === 'ar' ? 'السعر' : 'Unit Price'} <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          value={item.unitPrice}
                          onChange={(e) => handleItemChange(index, 'unitPrice', e.target.value)}
                          className={`w-full px-3 py-2 border rounded focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm ${
                            errors[`item_${index}_price`] ? 'border-red-500' : 'border-gray-300'
                          }`}
                          placeholder="0.00"
                          disabled={submitting}
                        />
                        {errors[`item_${index}_price`] && (
                          <p className="mt-0.5 text-xs text-red-500">{errors[`item_${index}_price`]}</p>
                        )}
                      </div>

                      {/* Total & Delete */}
                      <div className="flex flex-col justify-between">
                        <div>
                          <label className="block text-xs font-semibold text-gray-700 mb-1">
                            {lang === 'ar' ? 'الإجمالي' : 'Total'}
                          </label>
                          <div className="px-3 py-2 bg-purple-50 rounded border border-purple-200 text-sm font-semibold text-purple-900">
                            {calculateItemTotal(item).toLocaleString()}
                          </div>
                        </div>
                        {formData.items.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(index)}
                            className="flex items-center justify-center gap-1 px-2 py-1 bg-red-50 text-red-600 rounded hover:bg-red-100 transition text-xs font-medium mt-2"
                            disabled={submitting}
                          >
                            <Trash2 className="w-3 h-3" />
                            {lang === 'ar' ? 'حذف' : 'Delete'}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Total Row */}
              <div className="mt-6 p-4 bg-purple-50 rounded-lg border border-purple-200">
                <div className="flex justify-between items-center">
                  <h4 className="font-bold text-gray-900 text-lg flex items-center gap-2">
                    <DollarSign className="w-5 h-5 text-purple-600" />
                    {lang === 'ar' ? 'إجمالي التحويل' : 'Grand Total'}
                  </h4>
                  <p className="text-2xl font-bold text-purple-600">
                    {calculateGrandTotal().toLocaleString()}
                  </p>
                </div>
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                {lang === 'ar' ? 'ملاحظات' : 'Notes'}
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition"
                placeholder={lang === 'ar' ? 'أدخل ملاحظات' : 'Enter notes'}
                rows={4}
                disabled={submitting}
              />
            </div>

            {/* Submit Buttons */}
            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={() => navigate('/projects')}
                className="flex-1 px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition font-semibold"
                disabled={submitting}
              >
                {lang === 'ar' ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 bg-gradient-to-r from-purple-600 to-purple-700 text-white font-semibold py-3 rounded-lg hover:from-purple-700 hover:to-purple-800 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <Package className="w-5 h-5" />
                {lang === 'ar' ? 'إنشاء التحويل' : 'Create Material Issue'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CreateMaterialIssue;