import React, { useState, useEffect, useContext } from 'react';
import { Plus, Trash2, RefreshCw, Package, Download, FileText, File, CheckCircle } from 'lucide-react';
import { getErrorMessage } from '../../utils/errorHandler';
import axiosInstance from '../../utils/axiosInstance';
import { LanguageContext } from '../../context/LanguageContext';
import { toast } from 'react-toastify';
import * as XLSX from 'xlsx';
import { exportToPDF } from '../../utils/pdfExport';

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
    } catch { }
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
    } catch {
      toast.error(lang === 'ar' ? 'Ø®Ø·Ø£ ÙÙŠ ØªØ­Ù…ÙŠÙ„ Ø§Ù„Ø¨ÙŠØ§Ù†Ø§Øª' : 'Error loading data');
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
      { id: Date.now(), materialId: '', unitId: '', actualQuantity: '', notes: '', currentQuantity: 0, difference: 0 }
    ]);
  };

  const updateAdjustment = (id, field, value) => {
    const updatedAdjustments = adjustments.map(adj => {
      if (adj.id === id) {
        const updated = { ...adj, [field]: value };
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
    toast.info(lang === 'ar' ? 'ØªÙ…Øª Ø¥Ø²Ø§Ù„Ø© Ø§Ù„ØªØ³ÙˆÙŠØ©' : 'Adjustment removed');
  };

  const generatePDF = async () => {
    const isAr = lang === 'ar';
    const headers = [
      { material: isAr ? 'Ø§Ù„Ù…Ø§Ø¯Ø©' : 'Material' },
      { code: isAr ? 'Ø§Ù„ÙƒÙˆØ¯' : 'Code' },
      { current: isAr ? 'Ø§Ù„Ø­Ø§Ù„ÙŠ' : 'Current' },
      { actual: isAr ? 'Ø§Ù„ÙØ¹Ù„ÙŠ' : 'Actual' },
      { diff: isAr ? 'Ø§Ù„ÙØ±Ù‚' : 'Diff' },
      { notes: isAr ? 'Ù…Ù„Ø§Ø­Ø¸Ø§Øª' : 'Notes' },
    ];

    const rows = adjustments.map(adj => {
      const material = materials.find(m => m._id === adj.materialId);
      return {
        material: material ? (isAr ? material.nameAr : material.nameEn) : '-',
        code: material?.code || '-',
        current: adj.currentQuantity ?? 0,
        actual: adj.actualQuantity ?? '-',
        diff: adj.difference ?? 0,
        notes: adj.reason || '-',
      };
    });

    await exportToPDF(
      rows,
      headers,
      'stock-adjustment',
      lang,
      isAr ? 'ØªÙ‚Ø±ÙŠØ± ØªØ³ÙˆÙŠØ© Ø§Ù„Ù…Ø®Ø²ÙˆÙ†' : 'STOCK ADJUSTMENT REPORT'
    );
  };

  const generateExcel = () => {
    try {
      const excelData = adjustments.map(adj => {
        const material = materials.find(m => m._id === adj.materialId);
        return {
          [lang === 'ar' ? 'Ø§Ù„Ù…Ø§Ø¯Ø©' : 'Material']: material ? (lang === 'ar' ? material.nameAr : material.nameEn) : '-',
          [lang === 'ar' ? 'Ø§Ù„ÙƒÙˆØ¯' : 'Code']: material?.code || '-',
          [lang === 'ar' ? 'Ø§Ù„ÙƒÙ…ÙŠØ© Ø§Ù„Ø­Ø§Ù„ÙŠØ©' : 'Current Qty']: adj.currentQuantity,
          [lang === 'ar' ? 'Ø§Ù„ÙƒÙ…ÙŠØ© Ø§Ù„ÙØ¹Ù„ÙŠØ©' : 'Actual Qty']: adj.actualQuantity,
          [lang === 'ar' ? 'Ø§Ù„ÙØ±Ù‚' : 'Difference']: adj.difference,
          [lang === 'ar' ? 'Ù…Ù„Ø§Ø­Ø¸Ø§Øª' : 'Notes']: adj.reason,
          [lang === 'ar' ? 'Ù…Ù† Ù‚Ø¨Ù„' : 'Created By']: currentUser?.name || 'N/A',
          [lang === 'ar' ? 'Ø§Ù„Ø¨Ø±ÙŠØ¯' : 'Email']: currentUser?.email || 'N/A',
          [lang === 'ar' ? 'Ø§Ù„ØªØ§Ø±ÙŠØ®' : 'Date']: new Date().toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-US')
        };
      });
      const worksheet = XLSX.utils.json_to_sheet(excelData);
      const workbook  = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Adjustments');
      XLSX.writeFile(workbook, `stock-adjustment-${new Date().toISOString().split('T')[0]}.xlsx`);
      toast.success(lang === 'ar' ? 'ØªÙ… ØªØ­Ù…ÙŠÙ„ Ø§Ù„Ù€ Excel' : 'Excel downloaded successfully');
    } catch (error) {
      console.error('Error generating Excel:', error);
      toast.error(lang === 'ar' ? 'Ø®Ø·Ø£ ÙÙŠ Ø¥Ù†Ø´Ø§Ø¡ Ø§Ù„Ù€ Excel' : 'Error generating Excel');
    }
  };

  const submitAdjustments = async () => {
    if (adjustments.length === 0) {
      toast.warning(lang === 'ar' ? 'Ù„Ø§ ØªÙˆØ¬Ø¯ ØªØ³ÙˆÙŠØ§Øª Ù„Ù„Ø¥Ø±Ø³Ø§Ù„' : 'No adjustments to submit');
      return;
    }
    const isValid = adjustments.every(adj => adj.materialId && adj.actualQuantity && adj.reason);
    if (!isValid) {
      toast.warning(lang === 'ar' ? 'ÙŠØ±Ø¬Ù‰ Ù…Ù„Ø¡ Ø¬Ù…ÙŠØ¹ Ø§Ù„Ø­Ù‚ÙˆÙ„' : 'Please fill all required fields');
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
      await axiosInstance.post('/stock-movement/adjustment', { adjustments: adjustmentsData });
      toast.success(lang === 'ar' ? 'ØªÙ…Øª Ø¬Ù…ÙŠØ¹ Ø§Ù„ØªØ³ÙˆÙŠØ§Øª Ø¨Ù†Ø¬Ø§Ø­' : 'All adjustments submitted successfully');
      setAdjustments([]);
      setShowConfirmModal(false);
      fetchData();
    } catch (error) {
      console.error('Error submitting adjustments:', error);
      const errorMessage = error.response?.data?.message || error.message;
      toast.error(lang === 'ar' ? `Ø®Ø·Ø£: ${errorMessage}` : `Error: ${errorMessage}`);
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
          <p className="text-gray-600 mt-4">{lang === 'ar' ? 'Ø¬Ø§Ø±ÙŠ Ø§Ù„ØªØ­Ù…ÙŠÙ„...' : 'Loading...'}</p>
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
          {lang === 'ar' ? 'Ø¬Ø±Ø¯ ÙˆØªØ³ÙˆÙŠØ© Ø§Ù„Ù…Ø®Ø²ÙˆÙ†' : 'Stock Adjustment & Inventory Check'}
        </h1>
        <p className="text-gray-600">
          {lang === 'ar' ? 'ØªØ³ÙˆÙŠØ© ÙƒÙ…ÙŠØ§Øª Ø§Ù„Ù…Ø®Ø²ÙˆÙ† Ø§Ù„ÙØ¹Ù„ÙŠØ© Ù…Ø¹ Ø§Ù„Ø³Ø¬Ù„Ø§Øª' : 'Reconcile actual inventory quantities with records'}
        </p>
      </div>

      {/* Main Content */}
      <div className="bg-white rounded-xl shadow-sm p-6 mb-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-semibold text-gray-900">
            {lang === 'ar' ? 'Ø§Ù„ØªØ³ÙˆÙŠØ§Øª' : 'Adjustments'}
          </h2>
          <button onClick={addAdjustment} className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition">
            <Plus className="w-5 h-5" />
            {lang === 'ar' ? 'Ø¥Ø¶Ø§ÙØ© Ù…Ø§Ø¯Ø©' : 'Add Material'}
          </button>
        </div>

        {adjustments.length === 0 ? (
          <div className="text-center py-12">
            <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 mb-6">{lang === 'ar' ? 'Ù„Ù… ØªØ¶Ù Ø£ÙŠ Ù…ÙˆØ§Ø¯ Ù„Ù„ØªØ³ÙˆÙŠØ© Ø¨Ø¹Ø¯' : 'No materials added yet'}</p>
            <button onClick={addAdjustment} className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition">
              <Plus className="w-5 h-5" />
              {lang === 'ar' ? 'Ø¥Ø¶Ø§ÙØ© Ø£ÙˆÙ„ Ù…Ø§Ø¯Ø©' : 'Add First Material'}
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">{lang === 'ar' ? 'Ø§Ù„Ù…Ø§Ø¯Ø©' : 'Material'} <span className="text-red-500">*</span></th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">{lang === 'ar' ? 'Ø§Ù„ÙƒÙ…ÙŠØ© Ø§Ù„Ø­Ø§Ù„ÙŠØ©' : 'Current Qty'}</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">{lang === 'ar' ? 'Ø§Ù„ÙƒÙ…ÙŠØ© Ø§Ù„ÙØ¹Ù„ÙŠØ©' : 'Actual Qty'} <span className="text-red-500">*</span></th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">{lang === 'ar' ? 'Ø§Ù„ÙØ±Ù‚' : 'Difference'}</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">{lang === 'ar' ? 'السبب' : 'Reason'} <span className="text-red-500">*</span></th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">{lang === 'ar' ? 'Ø¥Ø¬Ø±Ø§Ø¡Ø§Øª' : 'Actions'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {adjustments.map((adj) => (
                  <tr key={adj.id} className="hover:bg-gray-50 transition">
                    <td className="px-6 py-4">
                      <select value={adj.materialId} onChange={(e) => updateAdjustment(adj.id, 'materialId', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                        <option value="">{lang === 'ar' ? 'Ø§Ø®ØªØ± Ø§Ù„Ù…Ø§Ø¯Ø©' : 'Select material'}</option>
                        {materials.map(m => (
                          <option key={m._id} value={m._id}>{lang === 'ar' ? m.nameAr : m.nameEn}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-6 py-4 font-semibold text-gray-900">{adj.currentQuantity}</td>
                    <td className="px-6 py-4">
                      <input type="number" value={adj.actualQuantity} onChange={(e) => updateAdjustment(adj.id, 'actualQuantity', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="0" />
                    </td>
                    <td className="px-6 py-4">
                      <span className={`font-bold ${adj.difference > 0 ? 'text-green-600' : adj.difference < 0 ? 'text-red-600' : 'text-gray-600'}`}>
                        {adj.difference > 0 ? '+' : ''}{adj.difference}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <input type="text" value={adj.reason} onChange={(e) => updateAdjustment(adj.id, 'reason', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" placeholder={lang === 'ar' ? 'Ø§Ù„Ø³Ø¨Ø¨' : 'Reason'} />
                    </td>
                    <td className="px-6 py-4">
                      <button onClick={() => removeAdjustment(adj.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition">
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {adjustments.length > 0 && (
          <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-gray-600">{lang === 'ar' ? 'Ø¹Ø¯Ø¯ Ø§Ù„ØªØ³ÙˆÙŠØ§Øª' : 'Total Items'}</p>
                <p className="text-2xl font-bold text-blue-600">{adjustments.length}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">{lang === 'ar' ? 'Ø¥Ø¬Ù…Ø§Ù„ÙŠ Ø§Ù„ÙØ±Ù‚' : 'Total Difference'}</p>
                <p className={`text-2xl font-bold ${totalDifference > 0 ? 'text-green-600' : totalDifference < 0 ? 'text-red-600' : 'text-gray-600'}`}>
                  {totalDifference > 0 ? '+' : ''}{totalDifference}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">{lang === 'ar' ? 'Ù…Ù† Ù‚Ø¨Ù„' : 'Created By'}</p>
                <p className="text-lg font-bold text-gray-900">{currentUser?.name || 'N/A'}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      {adjustments.length > 0 && (
        <div className="flex gap-4 justify-end">
          <button onClick={generatePDF} className="flex items-center gap-2 px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition">
            <FileText className="w-5 h-5" />
            {lang === 'ar' ? 'ØªØ­Ù…ÙŠÙ„ PDF' : 'Download PDF'}
          </button>
          <button onClick={generateExcel} className="flex items-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition">
            <File className="w-5 h-5" />
            {lang === 'ar' ? 'ØªØ­Ù…ÙŠÙ„ Excel' : 'Download Excel'}
          </button>
          <button onClick={() => setShowConfirmModal(true)} className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition">
            <CheckCircle className="w-5 h-5" />
            {lang === 'ar' ? 'ØªØ£ÙƒÙŠØ¯ Ø§Ù„ØªØ³ÙˆÙŠØ§Øª' : 'Confirm Adjustments'}
          </button>
        </div>
      )}

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              {lang === 'ar' ? 'ØªØ£ÙƒÙŠØ¯ Ø§Ù„ØªØ³ÙˆÙŠØ§Øª' : 'Confirm Adjustments'}
            </h2>
            <div className="bg-blue-50 rounded-lg p-4 mb-6 border border-blue-200">
              <p className="text-sm text-gray-700 mb-2"><span className="font-semibold">{lang === 'ar' ? 'Ù…Ù† Ù‚Ø¨Ù„' : 'Created By'}:</span> {currentUser?.name}</p>
              <p className="text-sm text-gray-700 mb-2"><span className="font-semibold">{lang === 'ar' ? 'Ø§Ù„Ø¨Ø±ÙŠØ¯' : 'Email'}:</span> {currentUser?.email}</p>
              <p className="text-sm text-gray-700"><span className="font-semibold">{lang === 'ar' ? 'Ø¹Ø¯Ø¯ Ø§Ù„ØªØ³ÙˆÙŠØ§Øª' : 'Total Adjustments'}:</span> {adjustments.length}</p>
            </div>
            <p className="text-gray-600 mb-6">
              {lang === 'ar' ? 'Ù‡Ù„ Ø£Ù†Øª Ù…ØªØ£ÙƒØ¯ Ù…Ù† ØªØ£ÙƒÙŠØ¯ Ø¬Ù…ÙŠØ¹ Ø§Ù„ØªØ³ÙˆÙŠØ§ØªØŸ Ø³ÙŠØªÙ… ØªØ­Ø¯ÙŠØ« Ø§Ù„Ù…Ø®Ø²ÙˆÙ† ÙˆÙÙ‚Ø§Ù‹ Ù„Ù„Ø¨ÙŠØ§Ù†Ø§Øª Ø§Ù„Ù…Ø¯Ø®Ù„Ø©.' : 'Are you sure you want to confirm all adjustments? The inventory will be updated accordingly.'}
            </p>
            <div className="flex gap-3">
              <button onClick={() => setShowConfirmModal(false)} className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-900 font-semibold py-2 px-4 rounded-lg transition">
                {lang === 'ar' ? 'Ø¥Ù„ØºØ§Ø¡' : 'Cancel'}
              </button>
              <button onClick={submitAdjustments} disabled={submitting} className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-2 px-4 rounded-lg transition flex items-center justify-center gap-2">
                {submitting ? (
                  <><RefreshCw className="w-5 h-5 animate-spin" />{lang === 'ar' ? 'Ø¬Ø§Ø±ÙŠ...' : 'Processing...'}</>
                ) : (
                  <><CheckCircle className="w-5 h-5" />{lang === 'ar' ? 'ØªØ£ÙƒÙŠØ¯' : 'Confirm'}</>
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

