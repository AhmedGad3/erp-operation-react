import React, { useState, useEffect, useContext, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { 
  X, 
  Calendar, 
  Download, 
  ArrowLeft,
  Package,
  CheckCircle,
  AlertCircle,
  FileText,
  Layers
} from "lucide-react";
import { formatCurrency, formatDateShort } from "../../utils/dateFormat";
import axiosInstance from "../../utils/axiosInstance";
import { LanguageContext } from "../../context/LanguageContext";
import FullPageLoader from "../Loader/Loader";
import { exportToPDF } from "../../utils/pdfExport";
import { toast } from "react-toastify";


export default function ProjectMaterialDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { lang, t } = useContext(LanguageContext);
  
  const [project, setProject] = useState(null);
  const [materialIssues, setMaterialIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
     const projectRes = await axiosInstance.get(`/projects/${id}`);

if (!projectRes.data?.result) {
  throw new Error("Project not found");
}

setProject(projectRes.data.result);

const projectId = projectRes.data.result._id;

      // Fetch material issues for this project
      const issuesRes = await axiosInstance.get(`/projects/material-issue/project/${projectId}`);
      const allIssues = issuesRes.data.result || [];
      
      // Filter by project ID
     const projectIssues = allIssues.filter(issue => {
  // Handle both cases: projectId as string or object
  const projectIdValue = typeof issue.projectId === 'string' 
    ? issue.projectId 
    : issue.projectId?._id;
  
  return projectIdValue === id;
});
      
      setMaterialIssues(projectIssues);
      
      if (projectIssues.length > 0) {
        const dates = projectIssues.map(r => new Date(r.issueDate));
        const minDate = new Date(Math.min(...dates));
        const maxDate = new Date(Math.max(...dates));
        setDateFrom(minDate.toISOString().split('T')[0]);
        setDateTo(maxDate.toISOString().split('T')[0]);
      }
      
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error(lang === 'ar' ? 'فشل تحميل البيانات' : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const filteredIssues = useMemo(() => {
    return materialIssues.filter(issue => {
      const issueDate = new Date(issue.issueDate);
      const from = dateFrom ? new Date(dateFrom) : null;
      const to = dateTo ? new Date(dateTo + 'T23:59:59') : null;

      if (from && issueDate < from) return false;
      if (to && issueDate > to) return false;

      return true;
    });
  }, [materialIssues, dateFrom, dateTo]);

  // Calculate totals
  const totalIssues = filteredIssues.length;
  const totalMaterials = filteredIssues.reduce((sum, issue) => sum + (issue.items?.length || 0), 0);
  const totalCost = filteredIssues.reduce((sum, issue) => sum + (issue.totalPrice || 0), 0);

  // Group items by material
  const materialSummary = useMemo(() => {
    const summary = {};
    
    filteredIssues.forEach(issue => {
      issue.items?.forEach(item => {
        const materialKey = item.materialId?._id || 'unknown';
        const materialName = lang === 'ar' 
          ? (item.materialId?.nameAr || 'غير معروف')
          : (item.materialId?.nameEn || 'Unknown');
        
        if (!summary[materialKey]) {
          summary[materialKey] = {
            name: materialName,
            code: item.materialId?.code || '-',
            totalQuantity: 0,
            totalCost: 0,
            unit: lang === 'ar' ? (item.unitId?.nameAr || '-') : (item.unitId?.nameEn || '-')
          };
        }
        
        summary[materialKey].totalQuantity += item.quantity || 0;
        summary[materialKey].totalCost += item.totalPrice || 0;
      });
    });
    
    return Object.values(summary);
  }, [filteredIssues, lang]);

 const handleExportPDF = async () => {
  try {
    const data = [];
    
    filteredIssues.forEach(issue => {
      issue.items?.forEach((item, idx) => {
        data.push({
          issueNo: idx === 0 ? issue.issueNumber : '',
          date: idx === 0 ? formatDateShort(issue.issueDate, lang) : '',
          material: lang === 'ar' ? (item.materialId?.nameAr || '-') : (item.materialId?.nameEn || '-'),
          code: item.materialId?.code || '-',
          quantity: item.quantity,
          unit: lang === 'ar' ? (item.unitId?.nameAr || '-') : (item.unitId?.nameEn || '-'),
          unitPrice: formatCurrency(item.unitPrice, lang),
          total: formatCurrency(item.totalPrice, lang)
        });
      });
    });

    // إضافة صف الإجمالي
    data.push({
      issueNo: lang === 'ar' ? 'الإجمالي' : 'Total',
      date: '',
      material: '',
      code: '',
      quantity: '',
      unit: '',
      unitPrice: '',
      total: formatCurrency(totalCost, lang)
    });

    const headers = [
      { issueNo: lang === "ar" ? "رقم الإذن" : "Issue No" },
      { date: lang === "ar" ? "التاريخ" : "Date" },
      { material: lang === "ar" ? "المادة" : "Material" },
      { code: lang === "ar" ? "الكود" : "Code" },
      { quantity: lang === "ar" ? "الكمية" : "Quantity" },
      { unit: lang === "ar" ? "الوحدة" : "Unit" },
      { unitPrice: lang === "ar" ? "السعر" : "Price" },
      { total: lang === "ar" ? "الإجمالي" : "Total" }
    ];

    const title = lang === 'ar' ? 'تفاصيل المواد - المشروع' : 'Material Details - Project';
    const fileName = `material_details_${project.code}`;
    const projectInfo = {
      name: lang === 'ar' ? project.nameAr : project.nameEn,
      code: project.code
    };

    await exportToPDF(data, headers, fileName, lang, title, projectInfo);
    toast.success(lang === "ar" ? "تم تصدير PDF بنجاح" : "PDF exported successfully");

  } catch (error) {
    console.error("Error generating PDF:", error);
    toast.error(lang === "ar" ? "حدث خطأ أثناء تصدير PDF" : "Error exporting PDF");
  }
};

  if (loading) {
    return <FullPageLoader text={lang === 'ar' ? 'جاري التحميل...' : 'Loading...'} />;
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-8 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <AlertCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900">
            {lang === 'ar' ? 'المشروع غير موجود' : 'Project Not Found'}
          </h3>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-8 px-4">
      <div className="max-w-[1400px] mx-auto">
        <button
          onClick={() => navigate(`/projects/${id}`)}
          className="flex items-center gap-2 text-green-600 hover:text-green-700 font-semibold mb-6"
        >
          <ArrowLeft className="w-5 h-5" />
          {lang === 'ar' ? 'رجوع لتفاصيل المشروع' : 'Back to Project Details'}
        </button>

        <div className="bg-white rounded-xl shadow-2xl overflow-hidden">
          <div className="flex justify-between items-start p-6 border-b bg-gradient-to-br from-slate-50 to-slate-100">
            <div className="flex items-start gap-4">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center text-white text-2xl font-bold shadow-lg">
                <Package className="w-8 h-8" />
              </div>
              
              <div>
                <h3 className="text-2xl font-bold text-gray-900 mb-1">
                  {lang === "ar" ? "تفاصيل المواد" : "Material Details"}
                </h3>
                <p className="text-sm text-gray-500 mb-3">
                  {lang === "ar" ? "المشروع:" : "Project:"} {lang === "ar" ? project.nameAr : project.nameEn}
                </p>
                
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-white border-2 border-gray-200 rounded-lg shadow-sm">
                  <span className="text-xs font-medium text-gray-600">
                    {lang === "ar" ? "إجمالي التكاليف" : "Total Cost"}
                  </span>
                  <span className="text-xl font-bold text-blue-600">
                    {formatCurrency(totalCost, lang)}
                  </span>
                </div>
              </div>
            </div>
            
            <div className="text-right">
              <p className="text-sm text-gray-500 mb-1">
                {lang === 'ar' ? 'إجمالي أذون الصرف' : 'Total Material Issues'}
              </p>
              <p className="text-3xl font-bold text-gray-900">{totalIssues}</p>
            </div>
          </div>

          <div className="flex items-center justify-between gap-4 p-4 bg-gray-50 border-b">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-lg border border-gray-300">
                <Calendar size={18} className="text-gray-400" />
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="text-sm outline-none border-none bg-transparent"
                />
              </div>
              
              <span className="text-gray-400">—</span>
              
              <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-lg border border-gray-300">
                <Calendar size={18} className="text-gray-400" />
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="text-sm outline-none border-none bg-transparent"
                />
              </div>
            </div>

            <button
              onClick={handleExportPDF}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium text-sm"
            >
              <Download size={18} />
              {lang === "ar" ? "تصدير PDF" : "Export PDF"}
            </button>
          </div>

          {/* Material Summary */}
          {materialSummary.length > 0 && (
            <div className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 border-b">
              <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <Layers size={16} />
                {lang === 'ar' ? 'ملخص المواد' : 'Material Summary'}
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {materialSummary.map((material, idx) => (
                  <div 
                    key={idx}
                    className="flex items-center justify-between px-4 py-3 bg-white rounded-lg border border-blue-200 shadow-sm"
                  >
                    <div className="flex-1">
                      <div className="text-sm font-semibold text-gray-900">{material.name}</div>
                      <div className="text-xs text-gray-500 mt-0.5">
                        {lang === 'ar' ? 'كود:' : 'Code:'} {material.code}
                      </div>
                      <div className="text-xs text-blue-600 mt-1 font-medium">
                        {material.totalQuantity} {material.unit}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold text-blue-600">
                        {formatCurrency(material.totalCost, lang)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="overflow-auto max-h-[600px]">
            {filteredIssues.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Package size={32} className="text-gray-400" />
                </div>
                <p className="text-gray-500 text-lg font-medium">
                  {lang === "ar" ? "لا توجد سجلات مواد" : "No material records found"}
                </p>
              </div>
            ) : (
              <table className="w-full">
                <thead className="bg-gray-50 sticky top-0 z-10">
                  <tr className="border-b border-gray-200">
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      {lang === "ar" ? "رقم الإذن" : "Issue No"}
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      {lang === "ar" ? "التاريخ" : "Date"}
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      {lang === "ar" ? "المادة" : "Material"}
                    </th>
                    <th className="px-6 py-4 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      {lang === "ar" ? "الكمية" : "Quantity"}
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      {lang === "ar" ? "سعر الوحدة" : "Unit Price"}
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      {lang === "ar" ? "الإجمالي" : "Total"}
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      {lang === "ar" ? "المستلم" : "Received By"}
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredIssues.map((issue) => (
                    <React.Fragment key={issue._id}>
                      {issue.items?.map((item, itemIdx) => (
                        <tr 
                          key={`${issue._id}-${itemIdx}`}
                          className={`hover:bg-gray-50 transition-colors ${
                            itemIdx === 0 ? 'border-t-2 border-blue-200' : ''
                          }`}
                        >
                          {/* Issue Number */}
                          {itemIdx === 0 && (
                            <td 
                              className="px-6 py-4 whitespace-nowrap" 
                              rowSpan={issue.items.length}
                            >
                              <div className="flex items-center gap-2">
                                <FileText size={16} className="text-blue-600" />
                                <span className="text-sm font-semibold text-blue-600">
                                  {issue.issueNumber}
                                </span>
                              </div>
                            </td>
                          )}

                          {/* Date */}
                          {itemIdx === 0 && (
                            <td 
                              className="px-6 py-4 whitespace-nowrap" 
                              rowSpan={issue.items.length}
                            >
                              <div className="text-sm text-gray-700">
                                {formatDateShort(issue.issueDate, lang)}
                              </div>
                            </td>
                          )}

                          {/* Material */}
                          <td className="px-6 py-4">
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {lang === 'ar' 
                                  ? item.materialId?.nameAr 
                                  : item.materialId?.nameEn
                                }
                              </div>
                              <div className="text-xs text-gray-500 mt-0.5">
                                {lang === 'ar' ? 'كود:' : 'Code:'} {item.materialId?.code || '-'}
                              </div>
                            </div>
                          </td>

                          {/* Quantity */}
                          <td className="px-6 py-4 text-center">
                            <div>
                              <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-semibold">
                                {item.quantity}
                              </span>
                              <div className="text-xs text-gray-500 mt-1">
                                {lang === 'ar' ? item.unitId?.nameAr : item.unitId?.nameEn}
                              </div>
                            </div>
                          </td>

                          {/* Unit Price */}
                          <td className="px-6 py-4 whitespace-nowrap text-right">
                            <span className="text-sm font-medium text-gray-900">
                              {formatCurrency(item.unitPrice, lang)}
                            </span>
                          </td>

                          {/* Total Price */}
                          <td className="px-6 py-4 whitespace-nowrap text-right">
                            <span className="text-sm font-bold text-blue-600">
                              {formatCurrency(item.totalPrice, lang)}
                            </span>
                          </td>

                          {/* Received By */}
                          {itemIdx === 0 && (
                            <td 
                              className="px-6 py-4" 
                              rowSpan={issue.items.length}
                            >
                              <div className="text-sm text-gray-700">
                                {issue.receivedBy || '-'}
                              </div>
                              {issue.notes && (
                                <div className="text-xs text-gray-400 mt-1">
                                  {issue.notes}
                                </div>
                              )}
                            </td>
                          )}
                        </tr>
                      ))}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div className="border-t bg-gray-50">
            <div className="px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-8">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">
                      {lang === "ar" ? "عدد الأذون" : "Total Issues"}
                    </p>
                    <p className="text-lg font-bold text-gray-900">
                      {totalIssues}
                    </p>
                  </div>

                  <div className="h-12 w-px bg-gray-300"></div>

                  <div>
                    <p className="text-xs text-gray-500 mb-1">
                      {lang === "ar" ? "عدد الأصناف" : "Total Items"}
                    </p>
                    <p className="text-lg font-bold text-gray-900">
                      {totalMaterials}
                    </p>
                  </div>

                  <div className="h-12 w-px bg-gray-300"></div>

                  <div>
                    <p className="text-xs text-gray-500 mb-1">
                      {lang === "ar" ? "أنواع المواد" : "Material Types"}
                    </p>
                    <p className="text-lg font-bold text-gray-900">
                      {materialSummary.length}
                    </p>
                  </div>

                  <div className="h-12 w-px bg-gray-300"></div>

                  <div>
                    <p className="text-xs text-gray-500 mb-1">
                      {lang === "ar" ? "الإجمالي الكلي" : "Grand Total"}
                    </p>
                    <p className="text-lg font-bold text-blue-600">
                      {formatCurrency(totalCost, lang)}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => navigate(`/projects/${id}`)}
                  className="px-6 py-2.5 border border-gray-300 rounded-lg bg-white hover:bg-gray-100 transition-colors font-medium text-sm"
                >
                  {lang === "ar" ? "رجوع" : "Back"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}