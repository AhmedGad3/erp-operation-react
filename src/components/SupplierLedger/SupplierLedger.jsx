import { useState, useEffect, useContext } from "react";
import { BookOpen, Users, Search, Eye, AlertCircle, TrendingUp, TrendingDown, Wallet, Phone } from "lucide-react";
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

// Import SupplierStatement Modal
import SupplierStatement from "../SupplierStatement/SupplierStatement";
import FullPageLoader from "../Loader/Loader";
import { LanguageContext } from "../../context/LanguageContext";

export default function SupplierLedger() {
  const { lang, t } = useContext(LanguageContext);
  const [suppliers, setSuppliers] = useState([]);
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
  const fetchSuppliers = async () => {
    try {
      setLoading(true);
      const { data } = await axiosInstance.get("/suppliers");
      const activeSuppliers = (data.result || []).filter(s => s.isActive !== false);
      setSuppliers(activeSuppliers);
    } catch (err) {
      console.error(err);
      showToast(t?.errorLoadingSuppliers || "Error loading suppliers", "error");
    } finally {
      setLoading(false);
    }
  };

  const loadBalances = async (list) => {
    const map = {};
    for (let s of list) {
      try {
        const { data } = await axiosInstance.get(`/ledger/supplier/${s._id}/balance`);
        map[s._id] = Number(data.result?.amountDue || 0);
      } catch (err) {
        console.error("Balance error for supplier", s._id, err);
        map[s._id] = 0;
      }
    }
    setBalances(map);
  };

  useEffect(() => { fetchSuppliers(); }, []);
  useEffect(() => { if (suppliers.length) loadBalances(suppliers); }, [suppliers]);

  // ================= HANDLERS =================
  const handleOpenStatement = async (supplier) => {
    try {
      setLoadingStatement(supplier._id);
      
      const { data } = await axiosInstance.get(`/ledger/supplier/${supplier._id}`);
      const rows = data.result || [];
      
      if (rows.length === 0) {
        showToast(t?.noTransactions || "No transactions found for this supplier", "error");
        setLoadingStatement(null);
        return;
      }
      
      // Pass supplier with balance included
      setShowStatement({ 
        supplier: {
          ...supplier,
          balance: supplier.balance || 0
        }, 
        rows 
      });
    } catch (err) {
      console.error(err);
      showToast(t?.errorLoadingStatement || "Error loading statement", "error");
    } finally {
      setLoadingStatement(null);
    }
  };

  // ================= FILTER =================
  const suppliersWithBalance = suppliers.map((s) => ({
    ...s,
    balance: Number(balances[s._id] || 0),
  }));

  const filteredSuppliers = searchTerm
    ? suppliersWithBalance.filter(supplier => {
        const term = searchTerm.toLowerCase();
        return (
          (supplier.nameEn?.toLowerCase().includes(term) || '') ||
          (supplier.nameAr?.includes(term) || '') ||
          (supplier.code?.toLowerCase().includes(term) || '') ||
          (supplier.phone?.includes(term) || '')
        );
      })
    : suppliersWithBalance;

  // ================= STATS =================
  const totalSuppliers = filteredSuppliers.length;
  const totalDue = filteredSuppliers.reduce((sum, s) => sum + (s.balance > 0 ? s.balance : 0), 0);
  const totalAdvance = filteredSuppliers.reduce((sum, s) => sum + (s.balance < 0 ? Math.abs(s.balance) : 0), 0);
  const suppliersWithDue = filteredSuppliers.filter(s => s.balance > 0).length;

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
          <div className="bg-gradient-to-r from-green-600 to-green-700 px-8 py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <BookOpen className="w-8 h-8 text-white" />
                <div>
                  <h1 className="text-2xl font-bold text-white">
                    {lang === "ar" ? "كشف حساب الموردين" : "Supplier Ledger"}
                  </h1>
                  <p className="text-green-100 mt-1">
                    {lang === "ar" ? "عرض وإدارة حسابات الموردين" : "View and manage supplier accounts"}
                  </p>
                </div>
              </div>
              <button
                onClick={fetchSuppliers}
                disabled={loading}
                className="p-3 bg-white text-green-600 rounded-lg hover:bg-green-50 transition shadow-md disabled:opacity-50"
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
            <div className="bg-white p-4 rounded-lg border-l-4 border-green-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">
                    {lang === "ar" ? "إجمالي الموردين" : "Total Suppliers"}
                  </p>
                  <p className="text-2xl font-bold text-gray-900">{totalSuppliers}</p>
                </div>
                <Users className="w-10 h-10 text-green-500 opacity-20" />
              </div>
            </div>
            <div className="bg-white p-4 rounded-lg border-l-4 border-red-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">
                    {lang === "ar" ? "علينا (مستحق)" : "Due (We Owe)"}
                  </p>
                  <p className="text-2xl font-bold text-red-600">{formatCurrency(totalDue, lang)}</p>
                </div>
                <TrendingUp className="w-10 h-10 text-red-500 opacity-20" />
              </div>
            </div>
            <div className="bg-white p-4 rounded-lg border-l-4 border-blue-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">
                    {lang === "ar" ? "لنا (سلف)" : "Advance (Owed to Us)"}
                  </p>
                  <p className="text-2xl font-bold text-blue-600">{formatCurrency(totalAdvance, lang)}</p>
                </div>
                <TrendingDown className="w-10 h-10 text-blue-500 opacity-20" />
              </div>
            </div>
            <div className="bg-white p-4 rounded-lg border-l-4 border-orange-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">
                    {lang === "ar" ? "موردون بمستحقات" : "Suppliers With Due"}
                  </p>
                  <p className="text-2xl font-bold text-gray-900">{suppliersWithDue}</p>
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
              placeholder={lang === "ar" ? "بحث عن مورد بالاسم، الكود أو الهاتف..." : "Search by name, code or phone..."}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition"
              dir={lang === "ar" ? "rtl" : "ltr"}
            />
          </div>

          {/* Clear Filter */}
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="mt-4 text-sm text-green-600 hover:text-green-700 font-medium"
            >
              {lang === "ar" ? "مسح البحث" : "Clear Search"}
            </button>
          )}
        </div>

        {/* Suppliers Table */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          {filteredSuppliers.length === 0 ? (
            <div className="p-12 text-center">
              <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                {searchTerm 
                  ? (lang === "ar" ? "لم يتم العثور على موردين" : "No Suppliers Found")
                  : (lang === "ar" ? "لا يوجد موردون نشطون" : "No Active Suppliers")
                }
              </h3>
              <p className="text-gray-600">
                {searchTerm 
                  ? (lang === "ar" ? "حاول تعديل معايير البحث" : "Try adjusting your search criteria")
                  : (lang === "ar" ? "لا يوجد موردون نشطون في النظام" : "There are no active suppliers in the system")
                }
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                      {lang === "ar" ? "المورد" : "Supplier"}
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
                  {filteredSuppliers.map((supplier) => (
                    <tr key={supplier._id} className="hover:bg-gray-50 transition">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                            <span className="text-green-600 font-semibold text-lg">
                              {(lang === "ar" ? supplier.nameAr : supplier.nameEn)?.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900">
                              {lang === "ar" ? supplier.nameAr : supplier.nameEn}
                            </p>
                            {supplier.email && (
                              <p className="text-sm text-gray-500">{supplier.email}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-3 py-1 rounded-full text-xs font-semibold bg-purple-100 text-purple-800 border border-purple-200">
                          {supplier.code || "-"}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 text-gray-700">
                          <Phone className="w-4 h-4 text-gray-400" />
                          {supplier.phone || "-"}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`text-lg font-bold ${
                          supplier.balance > 0 
                            ? "text-red-600" 
                            : supplier.balance < 0 
                            ? "text-blue-600" 
                            : "text-gray-600"
                        }`}>
                          {formatCurrency(supplier.balance, lang)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {supplier.balance > 0 ? (
                          <span className="flex items-center gap-2 text-red-600 font-semibold">
                            <TrendingUp className="w-4 h-4" />
                            {lang === "ar" ? "علينا" : "Due"}
                          </span>
                        ) : supplier.balance < 0 ? (
                          <span className="flex items-center gap-2 text-blue-600 font-semibold">
                            <TrendingDown className="w-4 h-4" />
                            {lang === "ar" ? "لنا" : "Advance"}
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
                          onClick={() => handleOpenStatement(supplier)}
                          disabled={loadingStatement === supplier._id}
                          className="flex items-center gap-1 px-3 py-2 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition font-medium disabled:opacity-50"
                        >
                          {loadingStatement === supplier._id ? (
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
        <SupplierStatement 
          data={{
            supplier: {
              ...showStatement.supplier,
              balance: showStatement.supplier.balance || 0
            },
            rows: showStatement.rows
          }}
          t={t} 
          lang={lang} 
          onClose={() => setShowStatement(null)} 
        />
      )}
    </div>
  );
}