import React, { useState, useEffect, useContext } from 'react';
import { Plus, Trash2, AlertCircle, CheckCircle, RefreshCw, TrendingDown, TrendingUp, Package, Download, FileText, File } from 'lucide-react';
import axiosInstance from '../../utils/axiosInstance';
import { LanguageContext } from '../../context/LanguageContext';
import { toast } from 'react-toastify';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import * as XLSX from 'xlsx';
import megabuildLogo from '../../assets/megabuild1.svg';

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
    toast.info(lang === 'ar' ? 'تمت إزالة التسوية' : 'Adjustment removed');
  };

  /* ══════════════════════════════════════
     generatePDF — branded Mega Build style
  ══════════════════════════════════════ */
  const generatePDF = async () => {
    try {
      const isAr = lang === 'ar';
      const textAlign = isAr ? 'right' : 'left';
      const totalDiff = adjustments.reduce((sum, adj) => sum + adj.difference, 0);

      /* ── load logo as base64 ── */
      let logoBase64 = '';
      try {
        const resp = await fetch(megabuildLogo);
        const blob = await resp.blob();
        logoBase64 = await new Promise(res => {
          const r = new FileReader();
          r.onloadend = () => res(r.result);
          r.readAsDataURL(blob);
        });
      } catch (_) {}

      const logoTag = logoBase64
        ? `<img src="${logoBase64}" style="width:70px;height:70px;object-fit:contain;" />`
        : `<div style="width:70px;height:70px;background:#003764;border-radius:8px;"></div>`;

      const rowsHtml = adjustments.map((adj, i) => {
        const material = materials.find(m => m._id === adj.materialId);
        const bg = i % 2 === 0 ? '#ffffff' : '#f9fafb';
        const diffColor = adj.difference > 0 ? '#16a34a' : adj.difference < 0 ? '#dc2626' : '#6b7280';
        return `
          <tr style="background:${bg};border-bottom:1px solid #e8e8e8;">
            <td style="padding:10px 12px;font-size:12px;color:#222;text-align:${textAlign};">${material ? (isAr ? material.nameAr : material.nameEn) : '-'}</td>
            <td style="padding:10px 12px;font-size:12px;color:#555;text-align:${textAlign};">${material?.code || '-'}</td>
            <td style="padding:10px 12px;font-size:12px;color:#555;text-align:center;">${adj.currentQuantity}</td>
            <td style="padding:10px 12px;font-size:12px;font-weight:600;color:#222;text-align:center;">${adj.actualQuantity || '-'}</td>
            <td style="padding:10px 12px;font-size:14px;font-weight:800;color:${diffColor};text-align:center;">${adj.difference > 0 ? '+' : ''}${adj.difference}</td>
            <td style="padding:10px 12px;font-size:12px;color:#555;text-align:${textAlign};">${adj.reason || '-'}</td>
          </tr>`;
      }).join('');

      const html = `
        <!-- HEADER -->
        <div style="padding:24px 36px 18px;border-bottom:1px solid #eee;display:flex;justify-content:space-between;align-items:flex-start;">
          <!-- يسار: اللوجو -->
          <div style="display:flex;flex-direction:column;align-items:flex-start;">
            ${logoTag}
            <p style="font-size:8px;color:#aaa;margin:3px 0 0;letter-spacing:0.8px;">${isAr ? 'نبني القيمة' : 'We Build Value'}</p>
          </div>
          <!-- يمين: MEGA BUILD + بيانات + badge -->
          <div style="display:flex;flex-direction:column;align-items:${isAr ? 'flex-start' : 'flex-end'};gap:4px;">
            <div style="display:flex;align-items:baseline;gap:7px;">
              <span style="font-size:26px;font-weight:900;color:#C41E3A;letter-spacing:2px;line-height:1;">MEGA</span>
              <span style="font-size:26px;font-weight:900;color:#003764;letter-spacing:2px;line-height:1;">BUILD</span>
            </div>
            <p style="font-size:10px;color:#999;font-style:italic;margin:0;">We Build Value</p>
            <div style="display:flex;flex-direction:column;gap:2px;align-items:${isAr ? 'flex-start' : 'flex-end'};margin-top:6px;">
              <p style="font-size:10.5px;color:#444;margin:0;">23 RD Of July St, Suez – Suez P.O. Box: 43511</p>
              <p style="font-size:10.5px;color:#444;margin:0;">C.R: 59034    T.C: 454-990-006</p>
              <p style="font-size:10.5px;color:#444;margin:0;">Tel: 062 3456452    Mob: 01111696211</p>
              <p style="font-size:10.5px;color:#444;margin:0;">Meegabuild@gmail.com</p>
              <p style="font-size:10.5px;color:#444;margin:0;">www.Megbuild.com</p>
            </div>
            <div style="margin-top:8px;background:#003764;color:#fff;padding:5px 16px;border-radius:5px;display:inline-block;">
              <span style="font-size:13px;font-weight:800;letter-spacing:1px;">
                ${isAr ? 'تقرير تسوية المخزون' : 'STOCK ADJUSTMENT REPORT'}
              </span>
            </div>
            <p style="font-size:11px;color:#555;margin:0;">
              <strong style="color:#003764;">${isAr ? 'التاريخ:' : 'Date:'}</strong>
              ${new Date().toLocaleDateString(isAr ? 'ar-EG' : 'en-US', { year:'numeric', month:'long', day:'numeric' })}
            </p>
          </div>
        </div>

        <!-- Red divider -->
        <div style="height:3px;background:#C41E3A;"></div>
        <div style="height:1px;background:#eee;"></div>

        <!-- Prepared by bar -->
        <div style="padding:14px 36px;background:#F0F4FA;border-bottom:1px solid #dde4f0;display:flex;justify-content:space-between;align-items:center;">
          <div>
            <p style="font-size:10px;font-weight:700;color:#003764;text-transform:uppercase;letter-spacing:1px;margin:0 0 3px;">
              ${isAr ? 'من قبل' : 'Prepared By'}
            </p>
            <p style="font-size:14px;font-weight:800;color:#1a1a2e;margin:0;">${currentUser?.name || 'N/A'}</p>
            <p style="font-size:11px;color:#666;margin:2px 0 0;">${currentUser?.email || ''}</p>
          </div>
          <div style="text-align:${isAr ? 'left' : 'right'};">
            <p style="font-size:10px;font-weight:700;color:#003764;text-transform:uppercase;letter-spacing:1px;margin:0 0 3px;">
              ${isAr ? 'عدد التسويات' : 'Total Items'}
            </p>
            <p style="font-size:22px;font-weight:900;color:#003764;margin:0;">${adjustments.length}</p>
          </div>
        </div>

        <!-- Table -->
        <div style="padding:20px 36px;">
          <table style="width:100%;border-collapse:collapse;margin-bottom:16px;">
            <thead>
              <tr style="background:#003764;">
                <th style="padding:10px 12px;font-size:11px;font-weight:700;color:#fff;text-align:${textAlign};letter-spacing:0.8px;">${isAr ? 'المادة' : 'Material'}</th>
                <th style="padding:10px 12px;font-size:11px;font-weight:700;color:#fff;text-align:${textAlign};letter-spacing:0.8px;">${isAr ? 'الكود' : 'Code'}</th>
                <th style="padding:10px 12px;font-size:11px;font-weight:700;color:#fff;text-align:center;letter-spacing:0.8px;">${isAr ? 'الحالي' : 'Current'}</th>
                <th style="padding:10px 12px;font-size:11px;font-weight:700;color:#fff;text-align:center;letter-spacing:0.8px;">${isAr ? 'الفعلي' : 'Actual'}</th>
                <th style="padding:10px 12px;font-size:11px;font-weight:700;color:#fff;text-align:center;letter-spacing:0.8px;">${isAr ? 'الفرق' : 'Diff'}</th>
                <th style="padding:10px 12px;font-size:11px;font-weight:700;color:#fff;text-align:${textAlign};letter-spacing:0.8px;">${isAr ? 'ملاحظات' : 'Notes'}</th>
              </tr>
            </thead>
            <tbody>${rowsHtml}</tbody>
          </table>

          <!-- Total -->
          <div style="display:flex;justify-content:${isAr ? 'flex-start' : 'flex-end'};margin-bottom:24px;">
            <div style="background:#003764;color:#fff;padding:9px 22px;font-weight:800;font-size:13px;border-radius:4px 0 0 4px;letter-spacing:1px;">
              ${isAr ? 'إجمالي الفرق' : 'TOTAL DIFF'}
            </div>
            <div style="border:2px solid #003764;padding:7px 22px;font-weight:900;font-size:18px;min-width:80px;text-align:center;color:${totalDiff > 0 ? '#16a34a' : totalDiff < 0 ? '#dc2626' : '#003764'};border-radius:0 4px 4px 0;">
              ${totalDiff > 0 ? '+' : ''}${totalDiff}
            </div>
          </div>
        </div>

        <!-- Footer text -->
        <div style="padding:12px 36px;border-top:1px solid #eee;text-align:center;background:#fafafa;">
          <p style="font-size:11px;color:#888;margin:0;">
            ${isAr ? 'هذا تقرير من إنتاج الكمبيوتر' : 'This is a computer-generated report'} — ${new Date().toLocaleString(isAr ? 'ar-EG' : 'en-US')}
          </p>
        </div>

        <!-- Footer bar -->
        <div style="display:flex;height:24px;">
          <div style="width:38%;background:#003764;"></div>
          <div style="width:2%;background:#fff;"></div>
          <div style="flex:1;background:#C41E3A;"></div>
        </div>
      `;

      const tempDiv = document.createElement('div');
      tempDiv.style.cssText = 'position:absolute;left:-10000px;width:800px;background:white;font-family:Arial,sans-serif;direction:' + (isAr ? 'rtl' : 'ltr') + ';overflow:hidden;';
      tempDiv.innerHTML = html;
      document.body.appendChild(tempDiv);

      const canvas = await html2canvas(tempDiv, { scale: 2, backgroundColor: '#ffffff', logging: false });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pageWidth  = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const imgWidth   = pageWidth - 20;
      const imgHeight  = (canvas.height * imgWidth) / canvas.width;
      let heightLeft   = imgHeight;
      let position     = 10;
      pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight);
      heightLeft -= pageHeight - 20;
      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }
      document.body.removeChild(tempDiv);
      pdf.save(`stock-adjustment-${new Date().toISOString().split('T')[0]}.pdf`);
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
      const workbook  = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Adjustments');
      XLSX.writeFile(workbook, `stock-adjustment-${new Date().toISOString().split('T')[0]}.xlsx`);
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
      await axiosInstance.post('/stock-movement/adjustment', { adjustments: adjustmentsData });
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
          <button onClick={addAdjustment} className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition">
            <Plus className="w-5 h-5" />
            {lang === 'ar' ? 'إضافة مادة' : 'Add Material'}
          </button>
        </div>

        {adjustments.length === 0 ? (
          <div className="text-center py-12">
            <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 mb-6">{lang === 'ar' ? 'لم تضف أي مواد للتسوية بعد' : 'No materials added yet'}</p>
            <button onClick={addAdjustment} className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition">
              <Plus className="w-5 h-5" />
              {lang === 'ar' ? 'إضافة أول مادة' : 'Add First Material'}
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">{lang === 'ar' ? 'المادة' : 'Material'}</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">{lang === 'ar' ? 'الكمية الحالية' : 'Current Qty'}</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">{lang === 'ar' ? 'الكمية الفعلية' : 'Actual Qty'}</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">{lang === 'ar' ? 'الفرق' : 'Difference'}</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">{lang === 'ar' ? 'ملاحظات' : 'Notes'}</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">{lang === 'ar' ? 'إجراءات' : 'Actions'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {adjustments.map((adj) => (
                  <tr key={adj.id} className="hover:bg-gray-50 transition">
                    <td className="px-6 py-4">
                      <select value={adj.materialId} onChange={(e) => updateAdjustment(adj.id, 'materialId', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                        <option value="">{lang === 'ar' ? 'اختر المادة' : 'Select material'}</option>
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
                      <input type="text" value={adj.reason} onChange={(e) => updateAdjustment(adj.id, 'reason', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" placeholder={lang === 'ar' ? 'السبب' : 'Reason'} />
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
          <button onClick={generatePDF} className="flex items-center gap-2 px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition">
            <FileText className="w-5 h-5" />
            {lang === 'ar' ? 'تحميل PDF' : 'Download PDF'}
          </button>
          <button onClick={generateExcel} className="flex items-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition">
            <File className="w-5 h-5" />
            {lang === 'ar' ? 'تحميل Excel' : 'Download Excel'}
          </button>
          <button onClick={() => setShowConfirmModal(true)} className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition">
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
              <p className="text-sm text-gray-700 mb-2"><span className="font-semibold">{lang === 'ar' ? 'من قبل' : 'Created By'}:</span> {currentUser?.name}</p>
              <p className="text-sm text-gray-700 mb-2"><span className="font-semibold">{lang === 'ar' ? 'البريد' : 'Email'}:</span> {currentUser?.email}</p>
              <p className="text-sm text-gray-700"><span className="font-semibold">{lang === 'ar' ? 'عدد التسويات' : 'Total Adjustments'}:</span> {adjustments.length}</p>
            </div>
            <p className="text-gray-600 mb-6">
              {lang === 'ar' ? 'هل أنت متأكد من تأكيد جميع التسويات؟ سيتم تحديث المخزون وفقاً للبيانات المدخلة.' : 'Are you sure you want to confirm all adjustments? The inventory will be updated accordingly.'}
            </p>
            <div className="flex gap-3">
              <button onClick={() => setShowConfirmModal(false)} className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-900 font-semibold py-2 px-4 rounded-lg transition">
                {lang === 'ar' ? 'إلغاء' : 'Cancel'}
              </button>
              <button onClick={submitAdjustments} disabled={submitting} className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-2 px-4 rounded-lg transition flex items-center justify-center gap-2">
                {submitting ? (
                  <><RefreshCw className="w-5 h-5 animate-spin" />{lang === 'ar' ? 'جاري...' : 'Processing...'}</>
                ) : (
                  <><CheckCircle className="w-5 h-5" />{lang === 'ar' ? 'تأكيد' : 'Confirm'}</>
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