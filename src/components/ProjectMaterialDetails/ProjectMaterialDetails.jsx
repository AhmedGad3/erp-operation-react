import React, { useState, useEffect, useContext, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Calendar,
  Download,
  ArrowLeft,
  Package,
  AlertCircle,
  FileText,
  Layers,
  TrendingDown,
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
  const { lang } = useContext(LanguageContext);

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
      if (!projectRes.data?.result) throw new Error("Project not found");
      setProject(projectRes.data.result);

      const projectId = projectRes.data.result._id;
      const issuesRes = await axiosInstance.get(`/projects/material-issue/project/${projectId}`);
      const allIssues = issuesRes.data.result || [];

      const projectIssues = allIssues.filter((issue) => {
        const projectIdValue =
          typeof issue.projectId === "string"
            ? issue.projectId
            : issue.projectId?._id;
        return projectIdValue === id;
      });

      setMaterialIssues(projectIssues);

      if (projectIssues.length > 0) {
        const dates = projectIssues.map((r) => new Date(r.issueDate));
        setDateFrom(new Date(Math.min(...dates)).toISOString().split("T")[0]);
        setDateTo(new Date(Math.max(...dates)).toISOString().split("T")[0]);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error(lang === "ar" ? "فشل تحميل البيانات" : "Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const filteredIssues = useMemo(() => {
    return materialIssues.filter((issue) => {
      const issueDate = new Date(issue.issueDate);
      const from = dateFrom ? new Date(dateFrom) : null;
      const to = dateTo ? new Date(dateTo + "T23:59:59") : null;
      if (from && issueDate < from) return false;
      if (to && issueDate > to) return false;
      return true;
    });
  }, [materialIssues, dateFrom, dateTo]);

  // ── Totals ──────────────────────────────────────────────
  const totalIssues    = filteredIssues.length;
  const totalMaterials = filteredIssues.reduce((sum, i) => sum + (i.items?.length || 0), 0);
  const totalCost      = filteredIssues.reduce((sum, i) => sum + (i.totalPrice    || 0), 0);
  const totalDiscount  = filteredIssues.reduce((sum, i) => sum + (i.totalDiscount || 0), 0);

  // ── Material Summary ────────────────────────────────────
  const materialSummary = useMemo(() => {
    const summary = {};
    filteredIssues.forEach((issue) => {
      issue.items?.forEach((item) => {
        const key  = item.materialId?._id || "unknown";
        const name = lang === "ar"
          ? (item.materialId?.nameAr || "غير معروف")
          : (item.materialId?.nameEn || "Unknown");

        if (!summary[key]) {
          summary[key] = {
            name,
            code:          item.materialId?.code || "-",
            unit:          lang === "ar" ? (item.unitId?.nameAr || "-") : (item.unitId?.nameEn || "-"),
            totalQuantity: 0,
            totalCost:     0,
            totalDiscount: 0,
          };
        }

        summary[key].totalQuantity += item.quantity    || 0;
        summary[key].totalCost     += item.totalPrice  || 0;
        summary[key].totalDiscount += (item.discountAmount || 0) * (item.quantity || 0);
      });
    });
    return Object.values(summary);
  }, [filteredIssues, lang]);

  // ── PDF Export ──────────────────────────────────────────
  const handleExportPDF = async () => {
    try {
      const data = [];
      filteredIssues.forEach((issue) => {
        issue.items?.forEach((item, idx) => {
          data.push({
            issueNo:   idx === 0 ? issue.issueNumber : "",
            date:      idx === 0 ? formatDateShort(issue.issueDate, lang) : "",
            material:  lang === "ar" ? (item.materialId?.nameAr || "-") : (item.materialId?.nameEn || "-"),
            code:      item.materialId?.code || "-",
            quantity:  item.quantity,
            unit:      lang === "ar" ? (item.unitId?.nameAr || "-") : (item.unitId?.nameEn || "-"),
            unitPrice: formatCurrency(item.unitPrice, lang),
            discount:  item.discountAmount > 0
              ? `${item.discountPercent?.toFixed(1)}% (${formatCurrency(item.discountAmount, lang)})`
              : "-",
            total: formatCurrency(item.totalPrice, lang),
          });
        });
      });

      data.push({
        issueNo:   lang === "ar" ? "الإجمالي" : "Total",
        date: "", material: "", code: "", quantity: "", unit: "", unitPrice: "",
        discount:  totalDiscount > 0 ? formatCurrency(totalDiscount, lang) : "-",
        total:     formatCurrency(totalCost, lang),
      });

      const headers = [
        { issueNo:   lang === "ar" ? "رقم الإذن"  : "Issue No"   },
        { date:      lang === "ar" ? "التاريخ"    : "Date"        },
        { material:  lang === "ar" ? "المادة"     : "Material"    },
        { code:      lang === "ar" ? "الكود"      : "Code"        },
        { quantity:  lang === "ar" ? "الكمية"     : "Quantity"    },
        { unit:      lang === "ar" ? "الوحدة"     : "Unit"        },
        { unitPrice: lang === "ar" ? "السعر"      : "Price"       },
        { discount:  lang === "ar" ? "الخصم"      : "Discount"    },
        { total:     lang === "ar" ? "الإجمالي"   : "Total"       },
      ];

      await exportToPDF(
        data, headers,
        `material_details_${project.code}`,
        lang,
        lang === "ar" ? "تفاصيل المواد - المشروع" : "Material Details - Project",
        { name: lang === "ar" ? project.nameAr : project.nameEn, code: project.code }
      );
      toast.success(lang === "ar" ? "تم تصدير PDF بنجاح" : "PDF exported successfully");
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast.error(lang === "ar" ? "حدث خطأ أثناء تصدير PDF" : "Error exporting PDF");
    }
  };

  // ── Guards ──────────────────────────────────────────────
  if (loading) return <FullPageLoader text={lang === "ar" ? "جاري التحميل..." : "Loading..."} />;

  if (!project) return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-8 px-4">
      <div className="max-w-4xl mx-auto text-center">
        <AlertCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-gray-900">
          {lang === "ar" ? "المشروع غير موجود" : "Project Not Found"}
        </h3>
      </div>
    </div>
  );

  // ── Render ──────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-8 px-4">
      <div className="max-w-[1400px] mx-auto">
        <button
          onClick={() => navigate(`/projects/${id}`)}
          className="flex items-center gap-2 text-green-600 hover:text-green-700 font-semibold mb-6"
        >
          <ArrowLeft className="w-5 h-5" />
          {lang === "ar" ? "رجوع لتفاصيل المشروع" : "Back to Project Details"}
        </button>

        <div className="bg-white rounded-xl shadow-2xl overflow-hidden">

          {/* ── Header ── */}
          <div className="flex justify-between items-start p-6 border-b bg-gradient-to-br from-slate-50 to-slate-100">
            <div className="flex items-start gap-4">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg">
                <Package className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-gray-900 mb-1">
                  {lang === "ar" ? "تفاصيل المواد" : "Material Details"}
                </h3>
                <p className="text-sm text-gray-500 mb-3">
                  {lang === "ar" ? "المشروع:" : "Project:"}{" "}
                  {lang === "ar" ? project.nameAr : project.nameEn}
                </p>
                <div className="flex items-center gap-3">
                  <div className="inline-flex items-center gap-2 px-4 py-2 bg-white border-2 border-gray-200 rounded-lg shadow-sm">
                    <span className="text-xs font-medium text-gray-600">
                      {lang === "ar" ? "إجمالي التكاليف" : "Total Cost"}
                    </span>
                    <span className="text-xl font-bold text-blue-600">
                      {formatCurrency(totalCost, lang)}
                    </span>
                  </div>
                  {/* إجمالي الخصومات في الهيدر لو موجود */}
                  {totalDiscount > 0 && (
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-orange-50 border-2 border-orange-200 rounded-lg shadow-sm">
                      <TrendingDown className="w-4 h-4 text-orange-500" />
                      <span className="text-xs font-medium text-orange-600">
                        {lang === "ar" ? "إجمالي الخصومات" : "Total Discounts"}
                      </span>
                      <span className="text-xl font-bold text-orange-500">
                        {formatCurrency(totalDiscount, lang)}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500 mb-1">
                {lang === "ar" ? "إجمالي أذون الصرف" : "Total Material Issues"}
              </p>
              <p className="text-3xl font-bold text-gray-900">{totalIssues}</p>
            </div>
          </div>

          {/* ── Filters ── */}
          <div className="flex items-center justify-between gap-4 p-4 bg-gray-50 border-b">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-lg border border-gray-300">
                <Calendar size={18} className="text-gray-400" />
                <input type="date" value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="text-sm outline-none border-none bg-transparent" />
              </div>
              <span className="text-gray-400">—</span>
              <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-lg border border-gray-300">
                <Calendar size={18} className="text-gray-400" />
                <input type="date" value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="text-sm outline-none border-none bg-transparent" />
              </div>
            </div>
            <button onClick={handleExportPDF}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium text-sm">
              <Download size={18} />
              {lang === "ar" ? "تصدير PDF" : "Export PDF"}
            </button>
          </div>

          {/* ── Material Summary ── */}
          {materialSummary.length > 0 && (
            <div className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 border-b">
              <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <Layers size={16} />
                {lang === "ar" ? "ملخص المواد" : "Material Summary"}
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {materialSummary.map((material, idx) => (
                  <div key={idx}
                    className="flex items-center justify-between px-4 py-3 bg-white rounded-lg border border-blue-200 shadow-sm">
                    <div className="flex-1">
                      <div className="text-sm font-semibold text-gray-900">{material.name}</div>
                      <div className="text-xs text-gray-500 mt-0.5">
                        {lang === "ar" ? "كود:" : "Code:"} {material.code}
                      </div>
                      <div className="text-xs text-blue-600 mt-1 font-medium">
                        {material.totalQuantity} {material.unit}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold text-blue-600">
                        {formatCurrency(material.totalCost, lang)}
                      </div>
                      {/* خصم المادة لو موجود */}
                      {material.totalDiscount > 0 && (
                        <div className="flex items-center gap-1 justify-end mt-1">
                          <TrendingDown className="w-3 h-3 text-orange-500" />
                          <span className="text-xs text-orange-500 font-medium">
                            {formatCurrency(material.totalDiscount, lang)}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Table ── */}
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
                    {/* عمود الخصم */}
                    <th className="px-6 py-4 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      {lang === "ar" ? "الخصم" : "Discount"}
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      {lang === "ar" ? "الإجمالي" : "Total"}
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      {lang === "ar" ? "ملاحظات" : "Notes"}
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
                            itemIdx === 0 ? "border-t-2 border-blue-200" : ""
                          }`}
                        >
                          {/* Issue Number */}
                          {itemIdx === 0 && (
                            <td className="px-6 py-4 whitespace-nowrap" rowSpan={issue.items.length}>
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
                            <td className="px-6 py-4 whitespace-nowrap" rowSpan={issue.items.length}>
                              <div className="text-sm text-gray-700">
                                {formatDateShort(issue.issueDate, lang)}
                              </div>
                            </td>
                          )}

                          {/* Material */}
                          <td className="px-6 py-4">
                            <div className="text-sm font-medium text-gray-900">
                              {lang === "ar" ? item.materialId?.nameAr : item.materialId?.nameEn}
                            </div>
                            <div className="text-xs text-gray-500 mt-0.5">
                              {lang === "ar" ? "كود:" : "Code:"} {item.materialId?.code || "-"}
                            </div>
                          </td>

                          {/* Quantity */}
                          <td className="px-6 py-4 text-center">
                            <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-semibold">
                              {item.quantity}
                            </span>
                            <div className="text-xs text-gray-500 mt-1">
                              {lang === "ar" ? item.unitId?.nameAr : item.unitId?.nameEn}
                            </div>
                          </td>

                          {/* Unit Price */}
                          <td className="px-6 py-4 whitespace-nowrap text-right">
                            <span className="text-sm font-medium text-gray-900">
                              {formatCurrency(item.unitPrice, lang)}
                            </span>
                          </td>

                          {/* Discount */}
                          <td className="px-6 py-4 whitespace-nowrap text-right">
                            {item.discountAmount > 0 ? (
                              <div className="flex flex-col items-end gap-1">
                                <span className="px-2 py-0.5 bg-orange-100 text-orange-600 rounded-full text-xs font-semibold flex items-center gap-1">
                                  <TrendingDown className="w-3 h-3" />
                                  {item.discountPercent?.toFixed(1)}%
                                </span>
                                <span className="text-xs text-orange-500">
                                  {formatCurrency(item.discountAmount, lang)}
                                  {lang === "ar" ? "/وحدة" : "/unit"}
                                </span>
                              </div>
                            ) : (
                              <span className="text-gray-300 text-xs">—</span>
                            )}
                          </td>

                          {/* Total Price */}
                          <td className="px-6 py-4 whitespace-nowrap text-right">
                            <span className="text-sm font-bold text-blue-600">
                              {formatCurrency(item.totalPrice, lang)}
                            </span>
                          </td>

                          {/* Notes */}
                          {itemIdx === 0 && (
                            <td className="px-6 py-4" rowSpan={issue.items.length}>
                              {issue.notes && (
                                <div className="text-xs text-gray-400">{issue.notes}</div>
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

          {/* ── Footer ── */}
          <div className="border-t bg-gray-50">
            <div className="px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-8 flex-wrap">

                  <div>
                    <p className="text-xs text-gray-500 mb-1">
                      {lang === "ar" ? "عدد الأذون" : "Total Issues"}
                    </p>
                    <p className="text-lg font-bold text-gray-900">{totalIssues}</p>
                  </div>

                  <div className="h-12 w-px bg-gray-300" />

                  <div>
                    <p className="text-xs text-gray-500 mb-1">
                      {lang === "ar" ? "عدد الأصناف" : "Total Items"}
                    </p>
                    <p className="text-lg font-bold text-gray-900">{totalMaterials}</p>
                  </div>

                  <div className="h-12 w-px bg-gray-300" />

                  <div>
                    <p className="text-xs text-gray-500 mb-1">
                      {lang === "ar" ? "أنواع المواد" : "Material Types"}
                    </p>
                    <p className="text-lg font-bold text-gray-900">{materialSummary.length}</p>
                  </div>

                  <div className="h-12 w-px bg-gray-300" />

                  {/* إجمالي الخصومات — يظهر بس لو موجود */}
                  {totalDiscount > 0 && (
                    <>
                      <div>
                        <p className="text-xs text-gray-500 mb-1 flex items-center gap-1">
                          <TrendingDown className="w-3 h-3 text-orange-500" />
                          {lang === "ar" ? "إجمالي الخصومات" : "Total Discounts"}
                        </p>
                        <p className="text-lg font-bold text-orange-500">
                          {formatCurrency(totalDiscount, lang)}
                        </p>
                      </div>
                      <div className="h-12 w-px bg-gray-300" />
                    </>
                  )}

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