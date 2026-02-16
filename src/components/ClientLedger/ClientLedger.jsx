import { useState, useEffect, useContext } from "react";
import { BookOpen, Users, Search, Eye, AlertCircle, TrendingUp, TrendingDown, Wallet, FileText } from "lucide-react";
import { toast } from "react-toastify";
import { formatCurrency } from "../../utils/dateFormat";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import axiosInstance from "../../utils/axiosInstance";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";
import FullPageLoader from "../Loader/Loader";
import { LanguageContext } from "../../context/LanguageContext";
import ClientStatement from "../ClientStatement/ClientStatement";

export default function ClientLedger() {
  const { lang, t } = useContext(LanguageContext);
  const [clients, setClients] = useState([]);
  const [balances, setBalances] = useState({});
  const [loading, setLoading] = useState(false);
  const [loadingStatement, setLoadingStatement] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [showStatement, setShowStatement] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);

  // ================= TOAST =================
  const showToast = (message, type) => {
    setToastMessage({ message, type });
    setTimeout(() => setToastMessage(null), 5000);
  };

  // ================= FETCH =================
  const fetchClients = async () => {
    try {
      setLoading(true);
      const { data } = await axiosInstance.get("/clients");
      const activeClients = (data.result || []).filter(c => c.isActive !== false);
      setClients(activeClients);
    } catch (err) {
      console.error(err);
      showToast(
        lang === "ar" 
          ? "فشل تحميل العملاء" 
          : "Error loading clients",
        "error"
      );
    } finally {
      setLoading(false);
    }
  };

  const loadBalances = async (list) => {
    const map = {};
    for (let c of list) {
      try {
        const { data } = await axiosInstance.get(`/ledger/clients/${c._id}/total-balance`);
        map[c._id] = Number(data.result?.totalBalance || 0);
      } catch (err) {
        console.error("Balance error for client", c._id, err);
        map[c._id] = 0;
      }
    }
    setBalances(map);
  };

  useEffect(() => { fetchClients(); }, []);
  useEffect(() => { if (clients.length) loadBalances(clients); }, [clients]);

  // ================= HANDLERS =================
  const handleOpenStatement = async (client) => {
    try {
      setLoadingStatement(client._id);
      
      const { data } = await axiosInstance.get(`/ledger/clients/${client._id}`);
      const rows = data.result || [];
      
      if (rows.length === 0) {
        showToast(
          lang === "ar" 
            ? `لا توجد معاملات للعميل ${client.nameAr || client.nameEn}` 
            : `No transactions found for client ${client.nameEn}`,
          "error"
        );
        setLoadingStatement(null);
        return;
      }
      
      setShowStatement({ client, rows });
    } catch (err) {
      console.error("Full error:", err);
      showToast(
        lang === "ar" 
          ? "فشل تحميل الكشف" 
          : "Error loading statement",
        "error"
      );
    } finally {
      setLoadingStatement(null);
    }
  };

  // ================= FILTER =================
  const clientsWithBalance = clients.map((c) => ({
    ...c,
    balance: Number(balances[c._id] || 0),
  }));

  const filteredClients = searchTerm
    ? clientsWithBalance.filter(client => {
        const term = searchTerm.toLowerCase();
        return (
          (client.nameEn?.toLowerCase().includes(term) || '') ||
          (client.nameAr?.includes(term) || '') ||
          (client.code?.toLowerCase().includes(term) || '') ||
          (client.phone?.includes(term) || '')
        );
      })
    : clientsWithBalance;

  // ================= STATS =================
  const totalClients = filteredClients.length;
  const totalDebit = filteredClients.reduce((sum, c) => sum + (c.balance > 0 ? c.balance : 0), 0);
  const totalCredit = filteredClients.reduce((sum, c) => sum + (c.balance < 0 ? Math.abs(c.balance) : 0), 0);
  const clientsWithDebit = filteredClients.filter(c => c.balance > 0).length;

  // ================= UI =================
  if (loading) {
    return <FullPageLoader text={lang === "ar" ? "جاري التحميل..." : "Loading..."} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-8 px-4">
      {/* Toast */}
      {toastMessage && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-3 px-6 py-4 rounded-lg shadow-lg ${
          toastMessage.type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
        }`}>
          <AlertCircle className="w-5 h-5" />
          <span className="font-medium">{toastMessage.message}</span>
        </div>
      )}

      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden mb-6">
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-8 py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <BookOpen className="w-8 h-8 text-white" />
                <div>
                  <h1 className="text-2xl font-bold text-white">
                    {lang === "ar" ? "كشف حساب العملاء" : "Client Ledger"}
                  </h1>
                  <p className="text-blue-100 mt-1">
                    {lang === "ar" ? "عرض وإدارة حسابات العملاء" : "View and manage client accounts"}
                  </p>
                </div>
              </div>
              <button
                onClick={fetchClients}
                disabled={loading}
                className="p-3 bg-white text-blue-600 rounded-lg hover:bg-blue-50 transition shadow-md disabled:opacity-50"
                title={lang === "ar" ? "تحديث" : "Refresh"}
              >
                <div className={loading ? "animate-spin" : ""}>
                  <i className="fa-solid fa-arrows-rotate"></i>
                </div>
              </button>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 p-6 bg-gray-50">
            <div className="bg-white p-4 rounded-lg border-l-4 border-blue-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">
                    {lang === "ar" ? "إجمالي العملاء" : "Total Clients"}
                  </p>
                  <p className="text-2xl font-bold text-gray-900">{totalClients}</p>
                </div>
                <Users className="w-10 h-10 text-blue-500 opacity-20" />
              </div>
            </div>
            <div className="bg-white p-4 rounded-lg border-l-4 border-green-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">
                    {lang === "ar" ? "لنا (مدين)" : "Debit (Owed to Us)"}
                  </p>
                  <p className="text-2xl font-bold text-green-600">{formatCurrency(totalDebit, lang)}</p>
                </div>
                <TrendingUp className="w-10 h-10 text-green-500 opacity-20" />
              </div>
            </div>
            <div className="bg-white p-4 rounded-lg border-l-4 border-red-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">
                    {lang === "ar" ? "علينا (دائن)" : "Credit (We Owe)"}
                  </p>
                  <p className="text-2xl font-bold text-red-600">{formatCurrency(totalCredit, lang)}</p>
                </div>
                <TrendingDown className="w-10 h-10 text-red-500 opacity-20" />
              </div>
            </div>
            <div className="bg-white p-4 rounded-lg border-l-4 border-orange-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">
                    {lang === "ar" ? "عملاء بمديونية" : "Clients With Debit"}
                  </p>
                  <p className="text-2xl font-bold text-gray-900">{clientsWithDebit}</p>
                </div>
                <Wallet className="w-10 h-10 text-orange-500 opacity-20" />
              </div>
            </div>
          </div>
        </div>

        {/* Search Filter */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-3.5 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder={lang === "ar" ? "بحث عن عميل بالاسم، الكود أو الهاتف..." : "Search by name, code or phone..."}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
              dir={lang === "ar" ? "rtl" : "ltr"}
            />
          </div>

          {/* Clear Filter */}
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="mt-4 text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              {lang === "ar" ? "مسح البحث" : "Clear Search"}
            </button>
          )}
        </div>

        {/* Clients Table */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          {filteredClients.length === 0 ? (
            <div className="p-12 text-center">
              <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                {searchTerm 
                  ? (lang === "ar" ? "لم يتم العثور على عملاء" : "No Clients Found")
                  : (lang === "ar" ? "لا يوجد عملاء نشطون" : "No Active Clients")
                }
              </h3>
              <p className="text-gray-600">
                {searchTerm 
                  ? (lang === "ar" ? "حاول تعديل معايير البحث" : "Try adjusting your search criteria")
                  : (lang === "ar" ? "لا يوجد عملاء نشطون في النظام" : "There are no active clients in the system")
                }
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                      {lang === "ar" ? "العميل" : "Client"}
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                      {lang === "ar" ? "الكود" : "Code"}
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                      {lang === "ar" ? "الهاتف" : "Phone"}
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                      {lang === "ar" ? "الرصيد" : "Balance"}
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
                  {filteredClients.map((client) => (
                    <tr key={client._id} className="hover:bg-gray-50 transition">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                            <span className="text-blue-600 font-semibold text-lg">
                              {(lang === "ar" ? client.nameAr : client.nameEn)?.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900">
                              {lang === "ar" ? client.nameAr : client.nameEn}
                            </p>
                            {client.email && (
                              <p className="text-sm text-gray-500">{client.email}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-3 py-1 rounded-full text-xs font-semibold bg-purple-100 text-purple-800 border border-purple-200">
                          {client.code || "-"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-gray-700">
                        {client.phone || "-"}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`text-lg font-bold ${
                          client.balance > 0 
                            ? "text-green-600" 
                            : client.balance < 0 
                            ? "text-red-600" 
                            : "text-gray-600"
                        }`}>
                          {formatCurrency(client.balance, lang)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {client.balance > 0 ? (
                          <span className="flex items-center gap-2 text-green-600 font-semibold">
                            <TrendingUp className="w-4 h-4" />
                            {lang === "ar" ? "لنا" : "Debit"}
                          </span>
                        ) : client.balance < 0 ? (
                          <span className="flex items-center gap-2 text-red-600 font-semibold">
                            <TrendingDown className="w-4 h-4" />
                            {lang === "ar" ? "علينا" : "Credit"}
                          </span>
                        ) : (
                          <span className="flex items-center gap-2 text-gray-600 font-semibold">
                            <Wallet className="w-4 h-4" />
                            {lang === "ar" ? "متوازن" : "Balanced"}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => handleOpenStatement(client)}
                          disabled={loadingStatement === client._id}
                          className="flex items-center gap-1 px-3 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition font-medium disabled:opacity-50"
                        >
                          {loadingStatement === client._id ? (
                            <div className="animate-spin inline-block size-4 border-2 border-current border-t-transparent rounded-full" role="status">
                              <span className="sr-only">Loading...</span>
                            </div>
                          ) : (
                            <>
                              <Eye className="w-4 h-4" />
                              {lang === "ar" ? "عرض الكشف" : "View Statement"}
                            </>
                          )}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Statement Modal */}
      {showStatement && (
        <ClientStatement 
          data={showStatement} 
          t={t} 
          lang={lang} 
          onClose={() => setShowStatement(null)} 
        />
      )}
    </div>
  );
}