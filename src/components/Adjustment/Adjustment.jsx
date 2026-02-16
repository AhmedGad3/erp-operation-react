import React, { useState, useEffect, useContext } from 'react';
import { Plus, Trash2, AlertCircle, CheckCircle, RefreshCw, TrendingDown, TrendingUp, Package, Download, FileText, File } from 'lucide-react';
import axiosInstance from '../../utils/axiosInstance';
import { LanguageContext } from '../../context/LanguageContext';
import { toast } from 'react-toastify';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import * as XLSX from 'xlsx';

const StockAdjustment = () => {
  const { lang, t } = useContext(LanguageContext);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [materials, setMaterials] = useState([]);
  const [units, setUnits] = useState([]);
  const [adjustments, setAdjustments] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  useEffect(() => {
    fetchData();
    getCurrentUser();
  }, []);

  const getCurrentUser = async () => {
    try {
      const response = await axiosInstance.get('/me');
      setCurrentUser(response.data);
    } catch (error) {
      console.error('Error getting current user:', error);
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const [materialsRes, unitsRes] = await Promise.all([
        axiosInstance.get('/materials'),
        axiosInstance.get('/units')
      ]);

      setMaterials(materialsRes.data.result || []);
      setUnits(unitsRes.data.result || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error(lang === 'ar' ? 'خطأ في تحميل البيانات' : 'Error loading data');
    } finally {
      setLoading(false);
    }
  };

  const getCurrentStock = (material) => {
    if (!material) return 0;
    return material.currentStock || 0;
  };

  const calculateDifference = (actualQuantity, currentStock) => {
    if (!actualQuantity) return 0;
    return parseInt(actualQuantity) - currentStock;
  };

  const addAdjustment = () => {
    setAdjustments([
      ...adjustments,
      {
        id: Date.now(),
        materialId: '',
        unitId: '',
        actualQuantity: '',
        notes: '',
        currentQuantity: 0,
        difference: 0
      }
    ]);
  };

  const updateAdjustment = (id, field, value) => {
    const updatedAdjustments = adjustments.map(adj => {
      if (adj.id === id) {
        const updated = { ...adj, [field]: value };

        // Auto-calculate difference when material or actualQuantity changes
        if (field === 'materialId' || field === 'actualQuantity') {
          const material = materials.find(m => m._id === updated.materialId);
          if (material) {
            updated.currentQuantity = getCurrentStock(material);
            updated.unitId = material.baseUnit;
            updated.difference = calculateDifference(updated.actualQuantity, updated.currentQuantity);
          }
        }

        return updated;
      }
      return adj;
    });
    setAdjustments(updatedAdjustments);
  };

  const removeAdjustment = (id) => {
    setAdjustments(adjustments.filter(adj => adj.id !== id));
    toast.info(lang === 'ar' ? 'تمت إزالة التسوية' : 'Adjustment removed');
  };

  const generatePDF = async () => {
    try {
      const tempDiv = document.createElement('div');
      tempDiv.style.position = 'absolute';
      tempDiv.style.left = '-10000px';
      tempDiv.style.width = '800px';
      tempDiv.style.padding = '40px';
      tempDiv.style.backgroundColor = 'white';
      tempDiv.style.fontFamily = 'Arial, sans-serif';
      tempDiv.style.direction = lang === 'ar' ? 'rtl' : 'ltr';

      let html = `
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="margin: 0; font-size: 24px; color: #1f2937;">${lang === 'ar' ? 'تقرير جرد وتسوية المخزون' : 'Stock Adjustment Report'}</h1>
        </div>

        <div style="margin-bottom: 20px; border-bottom: 2px solid #e5e7eb; padding-bottom: 20px;">
          <p style="margin: 5px 0; font-size: 12px;"><strong>${lang === 'ar' ? 'من قبل' : 'Created By'}:</strong> ${currentUser?.name || 'N/A'}</p>
          <p style="margin: 5px 0; font-size: 12px;"><strong>${lang === 'ar' ? 'البريد الإلكتروني' : 'Email'}:</strong> ${currentUser?.email || 'N/A'}</p>
          <p style="margin: 5px 0; font-size: 12px;"><strong>${lang === 'ar' ? 'التاريخ' : 'Date'}:</strong> ${new Date().toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-US')}</p>
        </div>

        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
          <thead>
            <tr style="background-color: #f3f4f6;">
              <th style="border: 1px solid #d1d5db; padding: 10px; font-size: 12px; font-weight: bold; text-align: ${lang === 'ar' ? 'right' : 'left'};">${lang === 'ar' ? 'المادة' : 'Material'}</th>
              <th style="border: 1px solid #d1d5db; padding: 10px; font-size: 12px; font-weight: bold; text-align: ${lang === 'ar' ? 'right' : 'left'};">${lang === 'ar' ? 'الكود' : 'Code'}</th>
              <th style="border: 1px solid #d1d5db; padding: 10px; font-size: 12px; font-weight: bold; text-align: center;">${lang === 'ar' ? 'الحالي' : 'Current'}</th>
              <th style="border: 1px solid #d1d5db; padding: 10px; font-size: 12px; font-weight: bold; text-align: center;">${lang === 'ar' ? 'الفعلي' : 'Actual'}</th>
              <th style="border: 1px solid #d1d5db; padding: 10px; font-size: 12px; font-weight: bold; text-align: center;">${lang === 'ar' ? 'الفرق' : 'Diff'}</th>
              <th style="border: 1px solid #d1d5db; padding: 10px; font-size: 12px; font-weight: bold; text-align: ${lang === 'ar' ? 'right' : 'left'};">${lang === 'ar' ? 'ملاحظات' : 'Notes'}</th>
            </tr>
          </thead>
          <tbody>
      `;

      adjustments.forEach((adj, index) => {
        const material = materials.find(m => m._id === adj.materialId);
        const bgColor = index % 2 === 0 ? '#ffffff' : '#f9fafb';
        html += `
          <tr style="background-color: ${bgColor};">
            <td style="border: 1px solid #d1d5db; padding: 10px; font-size: 11px; text-align: ${lang === 'ar' ? 'right' : 'left'};">${material ? (lang === 'ar' ? material.nameAr : material.nameEn) : '-'}</td>
            <td style="border: 1px solid #d1d5db; padding: 10px; font-size: 11px; text-align: ${lang === 'ar' ? 'right' : 'left'};">${material?.code || '-'}</td>
            <td style="border: 1px solid #d1d5db; padding: 10px; font-size: 11px; text-align: center;">${adj.currentQuantity}</td>
            <td style="border: 1px solid #d1d5db; padding: 10px; font-size: 11px; text-align: center;">${adj.actualQuantity || '-'}</td>
            <td style="border: 1px solid #d1d5db; padding: 10px; font-size: 11px; text-align: center; color: ${adj.difference > 0 ? '#16a34a' : adj.difference < 0 ? '#dc2626' : '#6b7280'}; font-weight: bold;">${adj.difference > 0 ? '+' : ''}${adj.difference}</td>
            <td style="border: 1px solid #d1d5db; padding: 10px; font-size: 11px; text-align: ${lang === 'ar' ? 'right' : 'left'};">${adj.reason || '-'}</td>
          </tr>
        `;
      });

      const totalDifference = adjustments.reduce((sum, adj) => sum + adj.difference, 0);

      html += `
          </tbody>
        </table>

        <div style="border-top: 2px solid #e5e7eb; padding-top: 15px;">
          <p style="margin: 10px 0; font-size: 12px; font-weight: bold;">
            ${lang === 'ar' ? 'إجمالي الفرق' : 'Total Difference'}: 
            <span style="color: ${totalDifference > 0 ? '#16a34a' : totalDifference < 0 ? '#dc2626' : '#6b7280'};">
              ${totalDifference > 0 ? '+' : ''}${totalDifference}
            </span>
          </p>
          <p style="margin: 10px 0; font-size: 12px; font-weight: bold;">
            ${lang === 'ar' ? 'عدد التسويات' : 'Total Adjustments'}: ${adjustments.length}
          </p>
        </div>
      `;

      tempDiv.innerHTML = html;
      document.body.appendChild(tempDiv);

      const canvas = await html2canvas(tempDiv, {
        scale: 2,
        backgroundColor: '#ffffff',
        logging: false
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = pageWidth - 20;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      let heightLeft = imgHeight;
      let position = 10;

      pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight);
      heightLeft -= pageHeight - 20;

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      document.body.removeChild(tempDiv);

      const fileName = `stock-adjustment-${new Date().toISOString().split('T')[0]}.pdf`;
      pdf.save(fileName);

      toast.success(lang === 'ar' ? 'تم تحميل الـ PDF' : 'PDF downloaded successfully');
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error(lang === 'ar' ? 'خطأ في إنشاء الـ PDF' : 'Error generating PDF');
    }
  };

  const generateExcel = () => {
    try {
      const excelData = adjustments.map(adj => {
        const material = materials.find(m => m._id === adj.materialId);
        return {
          [lang === 'ar' ? 'المادة' : 'Material']: material ? (lang === 'ar' ? material.nameAr : material.nameEn) : '-',
          [lang === 'ar' ? 'الكود' : 'Code']: material?.code || '-',
          [lang === 'ar' ? 'الكمية الحالية' : 'Current Qty']: adj.currentQuantity,
          [lang === 'ar' ? 'الكمية الفعلية' : 'Actual Qty']: adj.actualQuantity,
          [lang === 'ar' ? 'الفرق' : 'Difference']: adj.difference,
          [lang === 'ar' ? 'ملاحظات' : 'Notes']: adj.reason,
          [lang === 'ar' ? 'من قبل' : 'Created By']: currentUser?.name || 'N/A',
          [lang === 'ar' ? 'البريد' : 'Email']: currentUser?.email || 'N/A',
          [lang === 'ar' ? 'التاريخ' : 'Date']: new Date().toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-US')
        };
      });

      const worksheet = XLSX.utils.json_to_sheet(excelData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Adjustments');

      const fileName = `stock-adjustment-${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(workbook, fileName);

      toast.success(lang === 'ar' ? 'تم تحميل الـ Excel' : 'Excel downloaded successfully');
    } catch (error) {
      console.error('Error generating Excel:', error);
      toast.error(lang === 'ar' ? 'خطأ في إنشاء الـ Excel' : 'Error generating Excel');
    }
  };

  const submitAdjustments = async () => {
    if (adjustments.length === 0) {
      toast.warning(lang === 'ar' ? 'لا توجد تسويات للإرسال' : 'No adjustments to submit');
      return;
    }

    // Validate all adjustments
    const isValid = adjustments.every(adj => adj.materialId && adj.actualQuantity && adj.reason);
    if (!isValid) {
      toast.warning(lang === 'ar' ? 'يرجى ملء جميع الحقول' : 'Please fill all required fields');
      return;
    }

    try {
      setSubmitting(true);

      const adjustmentsData = adjustments.map(adj => ({
        materialId: adj.materialId,
        unitId: adj.unitId,
        actualQuantity: parseInt(adj.actualQuantity),
        reason: adj.reason
      }));

      const response = await axiosInstance.post('/stock-movement/adjustment', {
        adjustments: adjustmentsData
      });

     

      toast.success(lang === 'ar' ? 'تمت جميع التسويات بنجاح' : 'All adjustments submitted successfully');
      setAdjustments([]);
      setShowConfirmModal(false);
      fetchData();
    } catch (error) {
      console.error('Error submitting adjustments:', error);
      const errorMessage = error.response?.data?.message || error.message;
      toast.error(lang === 'ar' ? `خطأ: ${errorMessage}` : `Error: ${errorMessage}`);
    } finally {
      setSubmitting(false);
    }
  };

  const totalDifference = adjustments.reduce((sum, adj) => sum + adj.difference, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin inline-block w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full"></div>
          <p className="text-gray-600 mt-4">{lang === 'ar' ? 'جاري التحميل...' : 'Loading...'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-2 flex items-center gap-3">
          <Package className="w-8 h-8 text-blue-600" />
          {lang === 'ar' ? 'جرد وتسوية المخزون' : 'Stock Adjustment & Inventory Check'}
        </h1>
        <p className="text-gray-600">
          {lang === 'ar' ? 'تسوية كميات المخزون الفعلية مع السجلات' : 'Reconcile actual inventory quantities with records'}
        </p>
      </div>

      {/* Main Content */}
      <div className="bg-white rounded-xl shadow-sm p-6 mb-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-semibold text-gray-900">
            {lang === 'ar' ? 'التسويات' : 'Adjustments'}
          </h2>
          <button
            onClick={addAdjustment}
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition"
          >
            <Plus className="w-5 h-5" />
            {lang === 'ar' ? 'إضافة مادة' : 'Add Material'}
          </button>
        </div>

        {/* Adjustments Table */}
        {adjustments.length === 0 ? (
          <div className="text-center py-12">
            <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 mb-6">
              {lang === 'ar' ? 'لم تضف أي مواد للتسوية بعد' : 'No materials added yet'}
            </p>
            <button
              onClick={addAdjustment}
              className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition"
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
                    {lang === 'ar' ? 'المادة' : 'Material'}
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                    {lang === 'ar' ? 'الكمية الحالية' : 'Current Qty'}
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                    {lang === 'ar' ? 'الكمية الفعلية' : 'Actual Qty'}
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                    {lang === 'ar' ? 'الفرق' : 'Difference'}
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                    {lang === 'ar' ? 'ملاحظات' : 'Notes'}
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                    {lang === 'ar' ? 'إجراءات' : 'Actions'}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {adjustments.map((adj, index) => {
                  const material = materials.find(m => m._id === adj.materialId);
                  return (
                    <tr key={adj.id} className="hover:bg-gray-50 transition">
                      <td className="px-6 py-4">
                        <select
                          value={adj.materialId}
                          onChange={(e) => updateAdjustment(adj.id, 'materialId', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="">
                            {lang === 'ar' ? 'اختر المادة' : 'Select material'}
                          </option>
                          {materials.map(m => (
                            <option key={m._id} value={m._id}>
                              {lang === 'ar' ? m.nameAr : m.nameEn}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-6 py-4 font-semibold text-gray-900">
                        {adj.currentQuantity}
                      </td>
                      <td className="px-6 py-4">
                        <input
                          type="number"
                          value={adj.actualQuantity}
                          onChange={(e) => updateAdjustment(adj.id, 'actualQuantity', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                          placeholder="0"
                        />
                      </td>
                      <td className="px-6 py-4">
                        <span className={`font-bold ${adj.difference > 0 ? 'text-green-600' : adj.difference < 0 ? 'text-red-600' : 'text-gray-600'}`}>
                          {adj.difference > 0 ? '+' : ''}{adj.difference}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <input
                          type="text"
                          value={adj.reason}
                          onChange={(e) => updateAdjustment(adj.id, 'reason', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                          placeholder={lang === 'ar' ? 'السبب' : 'Reason'}
                        />
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => removeAdjustment(adj.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Summary */}
        {adjustments.length > 0 && (
          <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-gray-600">{lang === 'ar' ? 'عدد التسويات' : 'Total Items'}</p>
                <p className="text-2xl font-bold text-blue-600">{adjustments.length}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">{lang === 'ar' ? 'إجمالي الفرق' : 'Total Difference'}</p>
                <p className={`text-2xl font-bold ${totalDifference > 0 ? 'text-green-600' : totalDifference < 0 ? 'text-red-600' : 'text-gray-600'}`}>
                  {totalDifference > 0 ? '+' : ''}{totalDifference}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">{lang === 'ar' ? 'من قبل' : 'Created By'}</p>
                <p className="text-lg font-bold text-gray-900">{currentUser?.name || 'N/A'}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      {adjustments.length > 0 && (
        <div className="flex gap-4 justify-end">
          <button
            onClick={generatePDF}
            className="flex items-center gap-2 px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition"
          >
            <FileText className="w-5 h-5" />
            {lang === 'ar' ? 'تحميل PDF' : 'Download PDF'}
          </button>
          <button
            onClick={generateExcel}
            className="flex items-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition"
          >
            <File className="w-5 h-5" />
            {lang === 'ar' ? 'تحميل Excel' : 'Download Excel'}
          </button>
          <button
            onClick={() => setShowConfirmModal(true)}
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition"
          >
            <CheckCircle className="w-5 h-5" />
            {lang === 'ar' ? 'تأكيد التسويات' : 'Confirm Adjustments'}
          </button>
        </div>
      )}

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              {lang === 'ar' ? 'تأكيد التسويات' : 'Confirm Adjustments'}
            </h2>

            <div className="bg-blue-50 rounded-lg p-4 mb-6 border border-blue-200">
              <p className="text-sm text-gray-700 mb-2">
                <span className="font-semibold">{lang === 'ar' ? 'من قبل' : 'Created By'}:</span> {currentUser?.name}
              </p>
              <p className="text-sm text-gray-700 mb-2">
                <span className="font-semibold">{lang === 'ar' ? 'البريد' : 'Email'}:</span> {currentUser?.email}
              </p>
              <p className="text-sm text-gray-700">
                <span className="font-semibold">{lang === 'ar' ? 'عدد التسويات' : 'Total Adjustments'}:</span> {adjustments.length}
              </p>
            </div>

            <p className="text-gray-600 mb-6">
              {lang === 'ar'
                ? 'هل أنت متأكد من تأكيد جميع التسويات؟ سيتم تحديث المخزون وفقاً للبيانات المدخلة.'
                : 'Are you sure you want to confirm all adjustments? The inventory will be updated accordingly.'}
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-900 font-semibold py-2 px-4 rounded-lg transition"
              >
                {lang === 'ar' ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                onClick={submitAdjustments}
                disabled={submitting}
                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-2 px-4 rounded-lg transition flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    {lang === 'ar' ? 'جاري...' : 'Processing...'}
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-5 h-5" />
                    {lang === 'ar' ? 'تأكيد' : 'Confirm'}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StockAdjustment;