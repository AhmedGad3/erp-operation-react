import  { useState, useEffect, useContext } from 'react';
import { AlertCircle, CheckCircle, Loader2, Package, Calendar, Plus, Trash2, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import axiosInstance from '../../utils/axiosInstance';
import FullPageLoader from '../Loader/Loader';
import { LanguageContext } from '../../context/LanguageContext';

const CreatePurchaseReturn = () => {
  const { lang, t } = useContext(LanguageContext);
  const navigate = useNavigate();
  
  const [suppliers, setSuppliers] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [units, setUnits] = useState([]);
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    supplierId: '',
    returnDate: new Date().toISOString().split('T')[0],
    notes: '',
    items: [
      {
        materialId: '',
        unitId: '',
        quantity: '',
        unitPrice: ''
      }
    ]
  });
  
  const [errors, setErrors] = useState({});

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async (lang) => {
    try {
      setLoading(true);
      const [suppliersRes, materialsRes, unitsRes] = await Promise.all([
        axiosInstance.get('/suppliers'),
        axiosInstance.get('/materials'),
        axiosInstance.get('/units')
      ]);

      setSuppliers(suppliersRes.data.result || suppliersRes.data || []);
      setMaterials(materialsRes.data.result || materialsRes.data || []);
      setUnits(unitsRes.data.result || unitsRes.data || []);
    } catch (error) {
      console.error('Fetch error:', error);
      toast.error(lang === 'ar' ? 'فشل تحميل البيانات' : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const addItem = () => {
    setFormData({
      ...formData,
      items: [
        ...formData.items,
        { materialId: '', unitId: '', quantity: '', unitPrice: '' }
      ]
    });
  };

  const removeItem = (index) => {
    if (formData.items.length === 1) {
      toast.error(lang === 'ar' ? 'يجب أن يكون هناك عنصر واحد على الأقل' : 'Must have at least one item');
      return;
    }
    const newItems = formData.items.filter((_, i) => i !== index);
    setFormData({ ...formData, items: newItems });
  };

  const updateItem = (index, field, value) => {
    const newItems = [...formData.items];
    newItems[index][field] = value;
    setFormData({ ...formData, items: newItems });
  };

  const calculateItemTotal = (item) => {
    const qty = parseFloat(item.quantity) || 0;
    const price = parseFloat(item.unitPrice) || 0;
    return qty * price;
  };

  const calculateTotalAmount = () => {
    return formData.items.reduce((sum, item) => sum + calculateItemTotal(item), 0);
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.supplierId) {
      newErrors.supplierId = 'Please select a supplier';
    }

    if (!formData.returnDate) {
      newErrors.returnDate = 'Return date is required';
    }

    formData.items.forEach((item, index) => {
      if (!item.materialId) {
        newErrors[`item_${index}_material`] = 'Material is required';
      }
      if (!item.unitId) {
        newErrors[`item_${index}_unit`] = 'Unit is required';
      }
      if (!item.quantity || parseFloat(item.quantity) <= 0) {
        newErrors[`item_${index}_quantity`] = 'Valid quantity required';
      }
      if (!item.unitPrice || parseFloat(item.unitPrice) <= 0) {
        newErrors[`item_${index}_price`] = 'Valid price required';
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      toast.error(lang === 'ar' ? 'يرجى إصلاح الأخطاء قبل الإرسال' : 'Please fix the errors before submitting');
      return;
    }

    try {
      setSubmitting(true);
      
      const payload = {
        supplierId: formData.supplierId,
        returnDate: formData.returnDate,
        items: formData.items.map(item => ({
          materialId: item.materialId,
          unitId: item.unitId,
          quantity: parseFloat(item.quantity),
          unitPrice: parseFloat(item.unitPrice)
        })),
        notes: formData.notes || undefined
      };

      const response = await axiosInstance.post('/purchases/return', payload);

      toast.success(
        lang === 'ar' 
          ? `تم إنشاء مرتجع الشراء بنجاح! رقم المرتجع #${response.data.result.returnNo}`
          : `Purchase return created successfully! Return #${response.data.result.returnNo}`
      );

      setTimeout(() => {
        navigate('/purchases/returns');
      }, 2000);
    } catch (error) {
      console.error('Submit error:', error);
      const message = error.response?.data?.message || (lang === 'ar' ? 'فشل إنشاء مرتجع الشراء' : 'Failed to create purchase return');
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-8 px-4">
       {loading && <FullPageLoader
              text={lang === 'ar' ? "جاري التحميل..." : "Loading..."}
            />}
      {submitting && <FullPageLoader
                   text={lang === "ar" ? "جاري المعالجة..." : "Processing..."}
                 />}

      <div className="max-w-5xl mx-auto">
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-red-600 to-red-700 px-8 py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Package className="w-8 h-8 text-white" />
                <div>
                  <h1 className="text-2xl font-bold text-white">Create Purchase Return</h1>
                  <p className="text-blue-100 mt-1">Return items to supplier</p>
                </div>
              </div>
              <button
                onClick={() => navigate('/purchases/returns')}
                className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg transition"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </button>
            </div>
          </div>

          {/* Form */}
          <div className="p-8 space-y-6">
            {/* Supplier & Date */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Supplier <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.supplierId}
                  onChange={(e) => setFormData({ ...formData, supplierId: e.target.value })}
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent transition ${
                    errors.supplierId ? 'border-red-500' : 'border-gray-300'
                  }`}
                  disabled={submitting}
                >
                  <option value="">Select Supplier...</option>
                  {suppliers.map((supplier) => (
                    <option key={supplier._id} value={supplier._id}>
                      {supplier.nameEn} - {supplier.nameAr}
                    </option>
                  ))}
                </select>
                {errors.supplierId && <p className="mt-1 text-sm text-red-500">{errors.supplierId}</p>}
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Return Date <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="date"
                    value={formData.returnDate}
                    onChange={(e) => setFormData({ ...formData, returnDate: e.target.value })}
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition ${
                      errors.returnDate ? 'border-red-500' : 'border-gray-300'
                    }`}
                    disabled={submitting}
                  />
                  <Calendar className="absolute right-3 top-3.5 w-5 h-5 text-gray-400 pointer-events-none" />
                </div>
                {errors.returnDate && <p className="mt-1 text-sm text-red-500">{errors.returnDate}</p>}
              </div>
            </div>

            {/* Items */}
            <div className="border rounded-lg p-4 bg-gray-50">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-700">Items to Return</h3>
                <button
                  onClick={addItem}
                  className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition"
                  disabled={submitting}
                >
                  <Plus className="w-4 h-4" />
                  Add Item
                </button>
              </div>

              <div className="space-y-4">
                {formData.items.map((item, index) => (
                  <div key={index} className="bg-white p-4 rounded-lg border border-gray-200">
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                      <div className="md:col-span-2">
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          Material <span className="text-red-500">*</span>
                        </label>
                        <select
                          value={item.materialId}
                          onChange={(e) => updateItem(index, 'materialId', e.target.value)}
                          className={`w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent ${
                            errors[`item_${index}_material`] ? 'border-red-500' : 'border-gray-300'
                          }`}
                          disabled={submitting}
                        >
                          <option value="">Select Material...</option>
                          {materials.map((material) => (
                            <option key={material._id} value={material._id}>
                              {material.nameEn || material.name}
                            </option>
                          ))}
                        </select>
                        {errors[`item_${index}_material`] && (
                          <p className="mt-1 text-xs text-red-500">{errors[`item_${index}_material`]}</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          Unit <span className="text-red-500">*</span>
                        </label>
                        <select
                          value={item.unitId}
                          onChange={(e) => updateItem(index, 'unitId', e.target.value)}
                          className={`w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent ${
                            errors[`item_${index}_unit`] ? 'border-red-500' : 'border-gray-300'
                          }`}
                          disabled={submitting}
                        >
                          <option value="">Unit...</option>
                          {units.map((unit) => (
                            <option key={unit._id} value={unit._id}>
                              {unit.nameEn || unit.name}
                            </option>
                          ))}
                        </select>
                        {errors[`item_${index}_unit`] && (
                          <p className="mt-1 text-xs text-red-500">{errors[`item_${index}_unit`]}</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          Quantity <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          value={item.quantity}
                          onChange={(e) => updateItem(index, 'quantity', e.target.value)}
                          className={`w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent ${
                            errors[`item_${index}_quantity`] ? 'border-red-500' : 'border-gray-300'
                          }`}
                          placeholder="0"
                          disabled={submitting}
                        />
                        {errors[`item_${index}_quantity`] && (
                          <p className="mt-1 text-xs text-red-500">{errors[`item_${index}_quantity`]}</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          Unit Price <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          value={item.unitPrice}
                          onChange={(e) => updateItem(index, 'unitPrice', e.target.value)}
                          className={`w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent ${
                            errors[`item_${index}_price`] ? 'border-red-500' : 'border-gray-300'
                          }`}
                          placeholder="0.00"
                          disabled={submitting}
                        />
                        {errors[`item_${index}_price`] && (
                          <p className="mt-1 text-xs text-red-500">{errors[`item_${index}_price`]}</p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between mt-3 pt-3 border-t">
                      <div className="text-sm font-semibold text-gray-700">
                        Total: <span className="text-red-600">{calculateItemTotal(item).toFixed(2)} EGP</span>
                      </div>
                      <button
                        onClick={() => removeItem(index)}
                        disabled={formData.items.length === 1 || submitting}
                        className="flex items-center gap-1 px-3 py-1 text-red-600 hover:bg-red-50 rounded transition disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Trash2 className="w-4 h-4" />
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Total Amount */}
              <div className="mt-4 pt-4 border-t border-gray-300">
                <div className="flex items-center justify-between">
                  <span className="text-lg font-bold text-gray-700">Total Amount:</span>
                  <span className="text-2xl font-bold text-red-600">
                    {calculateTotalAmount().toFixed(2)} EGP
                  </span>
                </div>
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Notes (Optional)
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows="3"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent transition resize-none"
                placeholder="Add any additional notes..."
                disabled={submitting}
              />
            </div>

            {/* Submit Button */}
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="w-full bg-gradient-to-r from-red-600 to-red-700 text-white font-semibold py-4 rounded-lg hover:from-blue-700 hover:to-blue-800 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Package className="w-5 h-5" />
                  Submit Purchase Return
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreatePurchaseReturn;