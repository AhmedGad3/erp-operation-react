import { useState, useEffect, useContext, useMemo } from "react";
import { X, User, Calendar, TrendingUp, TrendingDown, FileText, Download, Tag } from "lucide-react";
import { formatCurrency, formatDateShort } from "../../utils/dateFormat";
import axiosInstance from "../../utils/axiosInstance";
import { LanguageContext } from "../../context/LanguageContext";
import { toast } from "react-toastify";
import jsPDF from "jspdf";
import autoTable from 'jspdf-autotable';

export default function SupplierStatement({ data, onClose }) {
  const { lang, t } = useContext(LanguageContext);
  
  const [rowsWithUsers, setRowsWithUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  useEffect(() => {
    const fetchUserNames = async () => {
      try {
        const userIds = [...new Set(data.rows.map(r => r.createdBy).filter(Boolean))];
        const usersMap = {};
        
        if (userIds.length > 0) {
          const userPromises = userIds.map(id => 
            axiosInstance.get(`/user/${id}`)
              .then(res => ({ id, user: res.data }))
              .catch(err => {
                console.error(`Error fetching user ${id}:`, err);
                return { id, user: null };
              })
          );
          
          const usersResults = await Promise.all(userPromises);
          
          usersResults.forEach(({ id, user }) => {
            if (user) {
              usersMap[id] = user.name || user.email;
            }
          });
        }
        
        const updatedRows = data.rows.map(row => ({
          ...row,
          createdByName: usersMap[row.createdBy] || `#${row.createdBy?.slice(-6)}` || "-"
        }));
        
        updatedRows.sort((a, b) => {
          const dateA = new Date(a.transactionDate);
          const dateB = new Date(b.transactionDate);
          if (dateA.getTime() === dateB.getTime()) {
            return (a.transactionNo || 0) - (b.transactionNo || 0);
          }
          return dateA - dateB;
        });
        
        setRowsWithUsers(updatedRows);

        if (updatedRows.length > 0) {
          const dates = updatedRows.map(r => new Date(r.transactionDate));
          const minDate = new Date(Math.min(...dates));
          const maxDate = new Date(Math.max(...dates));
          setDateFrom(minDate.toISOString().split('T')[0]);
          setDateTo(maxDate.toISOString().split('T')[0]);
        }
      } catch (err) {
        console.error("Error fetching user names:", err);
        toast.error(lang === "ar" ? "حدث خطأ أثناء تحميل بيانات المستخدمين" : "Error loading user data");
        setRowsWithUsers(data.rows);
      } finally {
        setLoading(false);
      }
    };

    fetchUserNames();
  }, [data.rows]);

  const filteredRows = useMemo(() => {
    return rowsWithUsers.filter(row => {
      const transactionDate = new Date(row.transactionDate);
      const from = dateFrom ? new Date(dateFrom) : null;
      const to = dateTo ? new Date(dateTo + 'T23:59:59') : null;

      if (from && transactionDate < from) return false;
      if (to && transactionDate > to) return false;

      return true;
    });
  }, [rowsWithUsers, dateFrom, dateTo]);

  const totalDebit = filteredRows.reduce((sum, r) => sum + (r.debit || 0), 0);
  const totalCredit = filteredRows.reduce((sum, r) => sum + (r.credit || 0), 0);
  const totalDiscount = filteredRows.reduce((sum, r) => sum + (r.discountAmount || 0), 0);
  const currentBalance = filteredRows.length > 0 ? (filteredRows[filteredRows.length - 1]?.balanceAfter || 0) : 0;

  const handleExportPDF = () => {
    try {
      const doc = new jsPDF();
      
      doc.setFontSize(18);
      doc.text(lang === "ar" ? "كشف حساب مورد" : "Supplier Statement", 14, 20);
      
      doc.setFontSize(12);
      doc.text(
        `${lang === "ar" ? "المورد:" : "Supplier:"} ${lang === "ar" ? data.supplier.nameAr : data.supplier.nameEn}`,
        14, 30
      );
      doc.text(
        `${lang === "ar" ? "الكود:" : "Code:"} ${data.supplier.code || "-"}`,
        14, 37
      );
      doc.text(
        `${lang === "ar" ? "التاريخ:" : "Date:"} ${new Date().toLocaleDateString(lang === "ar" ? "ar-EG" : "en-US")}`,
        14, 44
      );

      const tableData = filteredRows.map(row => [
        formatDateShort(row.transactionDate, lang),
        row.transactionNo || "-",
        `${row.type || (lang === "ar" ? "معاملة" : "Transaction")}${row.description ? ` - ${row.description}` : ""}`,
        row.debit > 0 ? formatCurrency(row.debit, lang) : "-",
        row.credit > 0 ? formatCurrency(row.credit, lang) : "-",
        row.discountAmount > 0 ? formatCurrency(row.discountAmount, lang) : "-",
        formatCurrency(Math.abs(row.balanceAfter || 0), lang)
      ]);

      tableData.push([
        { content: lang === "ar" ? "الإجمالي" : "Total", colSpan: 3, styles: { fontStyle: 'bold', fillColor: [240, 240, 240] } },
        { content: formatCurrency(totalDebit, lang), styles: { fontStyle: 'bold', fillColor: [240, 240, 240] } },
        { content: formatCurrency(totalCredit, lang), styles: { fontStyle: 'bold', fillColor: [240, 240, 240] } },
        { content: formatCurrency(totalDiscount, lang), styles: { fontStyle: 'bold', fillColor: [240, 240, 240] } },
        { content: formatCurrency(Math.abs(currentBalance), lang), styles: { fontStyle: 'bold', fillColor: [240, 240, 240] } }
      ]);

      autoTable(doc, {
        startY: 52,
        head: [[
          lang === "ar" ? "التاريخ" : "Date",
          lang === "ar" ? "رقم المعاملة" : "Trans No",
          lang === "ar" ? "الوصف" : "Description",
          lang === "ar" ? "مدين" : "Debit",
          lang === "ar" ? "دائن" : "Credit",
          lang === "ar" ? "الخصم" : "Discount",
          lang === "ar" ? "الرصيد" : "Balance"
        ]],
        body: tableData,
        headStyles: {
          fillColor: [71, 85, 105],
          textColor: 255,
          fontStyle: 'bold'
        },
        styles: {
          fontSize: 9,
          cellPadding: 3
        },
        columnStyles: {
          3: { halign: 'right' },
          4: { halign: 'right' },
          5: { halign: 'right' },
          6: { halign: 'right' }
        }
      });

      const fileName = `supplier_statement_${data.supplier.code || 'unknown'}_${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(fileName);

      toast.success(lang === "ar" ? "تم تصدير PDF بنجاح" : "PDF exported successfully");

    } catch (error) {
      console.error("Error generating PDF:", error);
      toast.error(lang === "ar" ? "حدث خطأ أثناء تصدير PDF" : "Error exporting PDF");
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex justify-center items-center z-[9999] p-4">
      <div className="bg-white rounded-xl w-full max-w-[1200px] max-h-[95vh] shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-start p-6 border-b bg-gradient-to-br from-slate-50 to-slate-100 flex-shrink-0">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center text-white text-2xl font-bold shadow-lg">
              {(lang === "ar" ? data.supplier.nameAr : data.supplier.nameEn).charAt(0).toUpperCase()}
            </div>
            
            <div>
              <h3 className="text-2xl font-bold text-gray-900 mb-1">
                {lang === "ar" ? data.supplier.nameAr : data.supplier.nameEn}
              </h3>
              <p className="text-sm text-gray-500 mb-3">
                {lang === "ar" ? "كود المورد:" : "Supplier Code:"} {data.supplier.code || "-"}
              </p>
              
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-white border-2 border-gray-200 rounded-lg shadow-sm">
                <span className="text-xs font-medium text-gray-600">
                  {lang === "ar" ? "الرصيد الحالي" : "Current Balance"}
                </span>
                <span className={`text-xl font-bold ${
                  currentBalance > 0 ? 'text-red-600' : currentBalance < 0 ? 'text-green-600' : 'text-gray-600'
                }`}>
                  {formatCurrency(Math.abs(currentBalance), lang)}
                </span>
                <span className="text-xs text-gray-500">
                  {currentBalance > 0 
                    ? (lang === "ar" ? "مستحق للمورد" : "Amount Payable")
                    : currentBalance < 0 
                    ? (lang === "ar" ? "رصيد لصالحك" : "Credit Balance")
                    : ""
                  }
                </span>
              </div>
            </div>
          </div>
          
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors p-2 hover:bg-white rounded-lg"
          >
            <X size={24} />
          </button>
        </div>

        {/* Filters & Actions Bar */}
        <div className="flex items-center justify-between gap-4 p-4 bg-gray-50 border-b flex-shrink-0">
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

        {/* Table Content */}
        <div className="flex-1 overflow-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin inline-block size-8 border-4 border-current border-t-transparent text-blue-600 rounded-full" role="status" aria-label="loading">
                <span className="sr-only">Loading...</span>
              </div>
            </div>
          ) : filteredRows.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <FileText size={32} className="text-gray-400" />
              </div>
              <p className="text-gray-500 text-lg font-medium">
                {t?.noTransactions || (lang === "ar" ? "لا توجد معاملات" : "No transactions found")}
              </p>
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50 sticky top-0 z-10">
                <tr className="border-b border-gray-200">
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    {lang === "ar" ? "التاريخ" : "Date"}
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    {lang === "ar" ? "رقم المعاملة" : "Transaction No"}
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    {lang === "ar" ? "الوصف" : "Description"}
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    {lang === "ar" ? "مدين" : "Debit"}
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    {lang === "ar" ? "دائن" : "Credit"}
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-green-700 uppercase tracking-wider">
                    {lang === "ar" ? "الخصم" : "Discount"}
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    {lang === "ar" ? "الرصيد" : "Balance"}
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredRows.map((row, index) => {
                  const isDebit = (row.debit || 0) > 0;
                  const isCredit = (row.credit || 0) > 0;
                  const hasDiscount = (row.discountAmount || 0) > 0;
                  
                  return (
                    <tr key={index} className="hover:bg-gray-50 transition-colors">
                      {/* Date */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {formatDateShort(row.transactionDate, lang)}
                        </div>
                      </td>

                      {/* Transaction No */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          {isDebit && (
                            <div className="w-6 h-6 bg-red-100 rounded flex items-center justify-center">
                              <TrendingUp size={14} className="text-red-600" />
                            </div>
                          )}
                          {isCredit && (
                            <div className="w-6 h-6 bg-green-100 rounded flex items-center justify-center">
                              <TrendingDown size={14} className="text-green-600" />
                            </div>
                          )}
                          <span className="text-sm font-medium text-gray-700">
                            {row.transactionNo || "-"}
                          </span>
                        </div>
                      </td>

                      {/* Description */}
                      <td className="px-6 py-4">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {row.type || (lang === "ar" ? "معاملة" : "Transaction")}
                          </div>
                          {row.description && (
                            <div className="text-xs text-gray-500 mt-1">
                              {row.description}
                            </div>
                          )}
                          {hasDiscount && (
                            <div className="flex items-center gap-1 mt-1">
                              <Tag size={11} className="text-green-600" />
                              <span className="text-xs text-green-600 font-medium">
                                {lang === "ar" ? "فيه خصم من المورد" : "Includes supplier discount"}
                              </span>
                            </div>
                          )}
                          {row.createdByName && (
                            <div className="flex items-center gap-1 text-xs text-gray-400 mt-1">
                              <User size={12} />
                              {row.createdByName}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Debit */}
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        {row.debit > 0 ? (
                          <span className="text-sm font-semibold text-red-600">
                            {formatCurrency(row.debit, lang)}
                          </span>
                        ) : (
                          <span className="text-sm text-gray-400">—</span>
                        )}
                      </td>

                      {/* Credit */}
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        {row.credit > 0 ? (
                          <span className="text-sm font-semibold text-green-600">
                            {formatCurrency(row.credit, lang)}
                          </span>
                        ) : (
                          <span className="text-sm text-gray-400">—</span>
                        )}
                      </td>

                      {/* Discount */}
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        {hasDiscount ? (
                          <span className="text-sm font-semibold text-green-600 inline-flex items-center gap-1">
                            <Tag size={12} />
                            {formatCurrency(row.discountAmount, lang)}
                          </span>
                        ) : (
                          <span className="text-sm text-gray-400">—</span>
                        )}
                      </td>

                      {/* Balance */}
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <span className={`text-sm font-bold ${
                          row.balanceAfter > 0 
                            ? 'text-red-600' 
                            : row.balanceAfter < 0 
                            ? 'text-green-600' 
                            : 'text-gray-600'
                        }`}>
                          {formatCurrency(Math.abs(row.balanceAfter || 0), lang)}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer Summary */}
        <div className="border-t bg-gray-50 flex-shrink-0">
          <div className="px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-8">
                <div>
                  <p className="text-xs text-gray-500 mb-1">
                    {lang === "ar" ? "إجمالي المعاملات" : "Total Transactions"}
                  </p>
                  <p className="text-lg font-bold text-gray-900">
                    {filteredRows.length}
                  </p>
                </div>

                <div className="h-12 w-px bg-gray-300"></div>

                <div>
                  <p className="text-xs text-gray-500 mb-1">
                    {lang === "ar" ? "إجمالي المدين" : "Total Debit"}
                  </p>
                  <p className="text-lg font-bold text-red-600">
                    {formatCurrency(totalDebit, lang)}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-gray-500 mb-1">
                    {lang === "ar" ? "إجمالي الدائن" : "Total Credit"}
                  </p>
                  <p className="text-lg font-bold text-green-600">
                    {formatCurrency(totalCredit, lang)}
                  </p>
                </div>

                {totalDiscount > 0 && (
                  <>
                    <div className="h-12 w-px bg-gray-300"></div>
                    <div>
                      <p className="text-xs text-green-600 mb-1 flex items-center gap-1">
                        <Tag size={12} />
                        {lang === "ar" ? "إجمالي الخصم" : "Total Discount"}
                      </p>
                      <p className="text-lg font-bold text-green-600">
                        {formatCurrency(totalDiscount, lang)}
                      </p>
                    </div>
                  </>
                )}

                <div className="h-12 w-px bg-gray-300"></div>

                <div>
                  <p className="text-xs text-gray-500 mb-1">
                    {lang === "ar" ? "الرصيد النهائي" : "Final Balance"}
                  </p>
                  <p className={`text-lg font-bold ${
                    currentBalance > 0 ? 'text-red-600' : currentBalance < 0 ? 'text-green-600' : 'text-gray-600'
                  }`}>
                    {formatCurrency(Math.abs(currentBalance), lang)}
                  </p>
                </div>
              </div>

              <button
                onClick={onClose}
                className="px-6 py-2.5 border border-gray-300 rounded-lg bg-white hover:bg-gray-100 transition-colors font-medium text-sm"
              >
                {t?.close || (lang === "ar" ? "إغلاق" : "Close")}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}