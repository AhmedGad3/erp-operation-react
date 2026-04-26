import { useState, useEffect, useContext } from "react";
import { X, DollarSign, User, Calendar, TrendingUp, TrendingDown, FileText, Download, AlertCircle } from "lucide-react";
import { toast } from "react-toastify";
import { formatCurrency, formatDateShort } from "../../utils/dateFormat";
import axiosInstance from "../../utils/axiosInstance";
import { LanguageContext } from "../../context/LanguageContext";
import jsPDF from "jspdf";
import autoTable from 'jspdf-autotable';

export default function ClientStatement({ data, onClose }) {
  const { lang, t } = useContext(LanguageContext);
  
  const [rowsWithUsers, setRowsWithUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [totalBalance, setTotalBalance] = useState(0);
  
  // Filter rows by date range
  const filteredRows = rowsWithUsers.filter(row => {
    if (!dateFrom && !dateTo) return true;
    
    const rowDate = new Date(row.transactionDate);
    const fromDate = dateFrom ? new Date(dateFrom) : null;
    const toDate = dateTo ? new Date(dateTo) : null;
    
    if (fromDate && rowDate < fromDate) return false;
    if (toDate && rowDate > toDate) return false;
    
    return true;
  });

  // Calculate balances based on filtered rows
  const totalDebit = filteredRows.reduce((sum, r) => sum + (r.debit || 0), 0);
  const totalCredit = filteredRows.reduce((sum, r) => sum + (r.credit || 0), 0);
  const currentBalance = filteredRows.length > 0 ? (filteredRows[filteredRows.length - 1]?.balanceAfter || 0) : 0;

  

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch total balance
        const balanceRes = await axiosInstance.get(`/ledger/clients/${data.client._id}/total-balance`);
        setTotalBalance(balanceRes.data.result?.totalBalance || 0);

        // Check if rows exist and have data
        if (!data.rows || data.rows.length === 0) {
          setLoading(false);
          toast.warning(
            lang === "ar" 
              ? `لا توجد معاملات للعميل ${data.client.nameAr || data.client.nameEn}` 
              : `No transactions found for client ${data.client.nameEn}`,
            {
              position: "top-right",
              autoClose: 4000,
              icon: <AlertCircle className="text-yellow-500" size={20} />
            }
          );
          return;
        }

        // Fetch user names for created by
        const userIds = [...new Set(data.rows.map(r => r.createdBy?._id || r.createdBy).filter(Boolean))];
        const usersMap = {};
        
        if (userIds.length > 0) {
          const userPromises = userIds.map(id => 
            axiosInstance.get(`/user/${id}`)
              .then(res => ({ id, user: res.data.result || res.data }))
              .catch(err => {
                console.error(`Error fetching user ${id}:`, err);
                return { id, user: null };
              })
          );
          
          const usersResults = await Promise.all(userPromises);
          
          usersResults.forEach(({ id, user }) => {
            if (user) {
              usersMap[id] = user.name || user.email || `#${id?.slice(-6)}`;
            }
          });
        }
        
        const updatedRows = data.rows.map(row => ({
          ...row,
          createdByName: usersMap[row.createdBy?._id || row.createdBy] || `#${(row.createdBy?._id || row.createdBy)?.slice(-6)}` || "-"
        }));
        
        // Sort by transaction date (oldest first) and transaction number
        updatedRows.sort((a, b) => {
          const dateA = new Date(a.transactionDate);
          const dateB = new Date(b.transactionDate);
          if (dateA.getTime() === dateB.getTime()) {
            return (a.transactionNo || 0) - (b.transactionNo || 0);
          }
          return dateA - dateB;
        });
        
        setRowsWithUsers(updatedRows);

        // Set default dates
        if (updatedRows.length > 0) {
          const dates = updatedRows.map(r => new Date(r.transactionDate));
          const minDate = new Date(Math.min(...dates));
          const maxDate = new Date(Math.max(...dates));
          setDateFrom(minDate.toISOString().split('T')[0]);
          setDateTo(maxDate.toISOString().split('T')[0]);
        }
      } catch (err) {
        console.error("Error fetching data:", err);
        setRowsWithUsers(data.rows || []);
        toast.error(
          lang === "ar" 
            ? "حدث خطأ أثناء تحميل البيانات" 
            : "Error loading data",
          {
            position: "top-right",
            autoClose: 3000,
          }
        );
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [data.rows, data.client._id, lang]);

  const handleExportPDF = () => {
    try {
      const doc = new jsPDF();
      
      // Add title
      doc.setFontSize(18);
      doc.text(lang === "ar" ? "كشف حساب عميل" : "Client Statement", 14, 20);
      
      // Add client info
      doc.setFontSize(12);
      doc.text(
        `${lang === "ar" ? "العميل:" : "Client:"} ${lang === "ar" ? data.client.nameAr : data.client.nameEn}`,
        14,
        30
      );
      doc.text(
        `${lang === "ar" ? "الكود:" : "Code:"} ${data.client.code || "-"}`,
        14,
        37
      );
      doc.text(
        `${lang === "ar" ? "التاريخ:" : "Date:"} ${new Date().toLocaleDateString(lang === "ar" ? "ar-EG" : "en-US")}`,
        14,
        44
      );

      // Prepare table data - use filtered rows
      const tableData = filteredRows.map(row => [
        formatDateShort(row.transactionDate, lang),
        row.transactionNo || "-",
        `${row.type || (lang === "ar" ? "معاملة" : "Transaction")}${row.description ? ` - ${row.description}` : ""}`,
        row.debit > 0 ? formatCurrency(row.debit, lang) : "-",
        row.credit > 0 ? formatCurrency(row.credit, lang) : "-",
        formatCurrency(Math.abs(row.balanceAfter || 0), lang)
      ]);

      // Add summary row
      tableData.push([
        { content: lang === "ar" ? "الإجمالي" : "Total", colSpan: 3, styles: { fontStyle: 'bold', fillColor: [240, 240, 240] } },
        { content: formatCurrency(totalDebit, lang), styles: { fontStyle: 'bold', fillColor: [240, 240, 240] } },
        { content: formatCurrency(totalCredit, lang), styles: { fontStyle: 'bold', fillColor: [240, 240, 240] } },
        { content: formatCurrency(Math.abs(currentBalance), lang), styles: { fontStyle: 'bold', fillColor: [240, 240, 240] } }
      ]);

      // Add table using autoTable
      autoTable(doc, {
        startY: 52,
        head: [[
          lang === "ar" ? "التاريخ" : "Date",
          lang === "ar" ? "رقم المعاملة" : "Trans No",
          lang === "ar" ? "الوصف" : "Description",
          lang === "ar" ? "مدين" : "Debit",
          lang === "ar" ? "دائن" : "Credit",
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
          5: { halign: 'right' }
        }
      });

      // Save PDF
      const fileName = `client_statement_${data.client.code || 'unknown'}_${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(fileName);

      toast.success(
        lang === "ar" ? "تم تصدير الملف بنجاح" : "PDF exported successfully",
        {
          position: "top-right",
          autoClose: 3000,
        }
      );

    } catch (error) {
      console.error("Error generating PDF:", error);
      toast.error(
        lang === "ar" ? "حدث خطأ أثناء تصدير PDF" : "Error exporting PDF",
        {
          position: "top-right",
          autoClose: 3000,
        }
      );
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex justify-center items-center z-[9999] p-4">
      <div className="bg-white rounded-xl w-full max-w-[1100px] max-h-[95vh] shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-start p-6 border-b bg-gradient-to-br from-slate-50 to-slate-100 flex-shrink-0">
          <div className="flex items-start gap-4">
            {/* Client Avatar */}
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center text-white text-2xl font-bold shadow-lg">
              {(lang === "ar" ? data.client.nameAr : data.client.nameEn).charAt(0).toUpperCase()}
            </div>
            
            <div>
              <h3 className="text-2xl font-bold text-gray-900 mb-1">
                {lang === "ar" ? data.client.nameAr : data.client.nameEn}
              </h3>
              <p className="text-sm text-gray-500 mb-3">
                {lang === "ar" ? "كود العميل:" : "Client Code:"} {data.client.code || "-"}
              </p>
              
              {/* Current Balance Badge */}
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-white border-2 border-gray-200 rounded-lg shadow-sm">
                <span className="text-xs font-medium text-gray-600">
                  {lang === "ar" ? "الرصيد الحالي" : "Current Balance"}
                </span>
                <span className={`text-xl font-bold ${
                  totalBalance > 0 ? 'text-red-600' : totalBalance < 0 ? 'text-green-600' : 'text-gray-600'
                }`}>
                  {formatCurrency(Math.abs(totalBalance), lang)}
                </span>
                <span className="text-xs text-gray-500">
                  {totalBalance > 0 
                    ? (lang === "ar" ? "مستحق من العميل" : "Amount Due from Client")
                    : totalBalance < 0 
                    ? (lang === "ar" ? "رصيد مدين" : "Credit Balance")
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
            {/* Date From */}
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
            
            {/* Date To */}
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

          {/* Export PDF Button */}
          <button
            onClick={handleExportPDF}
            disabled={filteredRows.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
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
                {lang === "ar" ? "لا توجد معاملات في هذه الفترة" : "No transactions found in this period"}
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
                  <th className="px-6 py-4 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    {lang === "ar" ? "الرصيد" : "Balance"}
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredRows.map((row, index) => {
                  const isDebit = (row.debit || 0) > 0;
                  const isCredit = (row.credit || 0) > 0;
                  
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
                          {row.projectId && (
                            <div className="text-xs text-gray-400 mt-1">
                              {lang === "ar" ? row.projectId.nameAr : row.projectId.nameEn}
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
                {lang === "ar" ? "إغلاق" : "Close"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}