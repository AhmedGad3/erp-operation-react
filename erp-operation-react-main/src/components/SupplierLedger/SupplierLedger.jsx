import { useState, useEffect, useContext } from "react";
import {
  BookOpen, Users, Search, Eye,
  TrendingUp, TrendingDown, Wallet, Phone, RefreshCw,
  ChevronUp, ChevronDown,
} from "lucide-react";
import { formatCurrency } from "../../utils/dateFormat";
import axiosInstance from "../../utils/axiosInstance";
import { toast } from "react-toastify";
import SupplierStatement from "../SupplierStatement/SupplierStatement";
import FullPageLoader from "../Loader/Loader";
import { LanguageContext } from "../../context/LanguageContext";

// ── Sortable column header ────────────────────────────────
const SortHeader = ({ label, field, sortField, sortDir, onSort }) => (
  <th
    className="px-4 py-3 text-left text-sm font-medium text-gray-500 cursor-pointer select-none"
    onClick={() => onSort(field)}
  >
    <span className="inline-flex items-center gap-1">
      {label}
      <span className="flex flex-col leading-none">
        <ChevronUp   className={`w-3 h-3 ${sortField === field && sortDir === 'asc'  ? 'text-gray-900' : 'text-gray-300'}`} />
        <ChevronDown className={`w-3 h-3 ${sortField === field && sortDir === 'desc' ? 'text-gray-900' : 'text-gray-300'}`} />
      </span>
    </span>
  </th>
);

// ── Balance badge ─────────────────────────────────────────
const BalanceBadge = ({ balance, lang }) => {
  if (balance > 0)
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
        <TrendingUp className="w-3 h-3" />
        {lang === "ar" ? "علينا" : "Due"}
      </span>
    );
  if (balance < 0)
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
        <TrendingDown className="w-3 h-3" />
        {lang === "ar" ? "لنا" : "Advance"}
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
      <Wallet className="w-3 h-3" />
      {lang === "ar" ? "متوازن" : "Balanced"}
    </span>
  );
};

// ── Stat card ─────────────────────────────────────────────
const StatCard = ({ label, value, color = "text-gray-900" }) => (
  <div className="bg-white border border-gray-200 rounded-2xl p-5">
    <p className="text-sm text-gray-500 mb-1">{label}</p>
    <p className={`text-2xl font-bold ${color}`}>{value}</p>
  </div>
);

// ── Main ──────────────────────────────────────────────────
export default function SupplierLedger() {
  const { lang, t } = useContext(LanguageContext);

  const [suppliers,        setSuppliers]        = useState([]);
  const [balances,         setBalances]         = useState({});
  const [loading,          setLoading]          = useState(false);
  const [loadingStatement, setLoadingStatement] = useState(null);
  const [searchTerm,       setSearchTerm]       = useState("");
  const [showStatement,    setShowStatement]    = useState(null);
  const [sortField,        setSortField]        = useState("nameEn");
  const [sortDir,          setSortDir]          = useState("asc");

  useEffect(() => { fetchSuppliers(); }, []);
  useEffect(() => { if (suppliers.length) loadBalances(suppliers); }, [suppliers]);

  const fetchSuppliers = async () => {
    try {
      setLoading(true);
      const { data } = await axiosInstance.get("/suppliers");
      setSuppliers((data.result || []).filter(s => s.isActive !== false));
    } catch { toast.error(lang === "ar" ? "فشل تحميل الموردين" : "Error loading suppliers"); }
    finally   { setLoading(false); }
  };

  const loadBalances = async (list) => {
    const map = {};
    for (let s of list) {
      try {
        const { data } = await axiosInstance.get(`/ledger/supplier/${s._id}/balance`);
        map[s._id] = Number(data.result?.amountDue || 0);
      } catch { map[s._id] = 0; }
    }
    setBalances(map);
  };

  const handleOpenStatement = async (supplier) => {
    try {
      setLoadingStatement(supplier._id);
      const { data } = await axiosInstance.get(`/ledger/supplier/${supplier._id}`);
      const rows = data.result || [];
      if (!rows.length) {
        toast.error(t?.noTransactions || "No transactions found for this supplier");
        return;
      }
      setShowStatement({ supplier: { ...supplier, balance: supplier.balance || 0 }, rows });
    } catch { toast.error(t?.errorLoadingStatement || "Error loading statement"); }
    finally   { setLoadingStatement(null); }
  };

  const handleSort = (field) => {
    if (sortField === field) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortField(field); setSortDir("asc"); }
  };

  // ── Derived ───────────────────────────────────────────
  const withBalance = suppliers.map(s => ({ ...s, balance: Number(balances[s._id] || 0) }));

  const filtered = (searchTerm
    ? withBalance.filter(s => {
        const q = searchTerm.toLowerCase();
        return s.nameEn?.toLowerCase().includes(q) ||
               s.nameAr?.includes(searchTerm) ||
               s.code?.toLowerCase().includes(q) ||
               s.phone?.includes(q);
      })
    : withBalance
  ).sort((a, b) => {
    let va = a[sortField] ?? "";
    let vb = b[sortField] ?? "";
    if (sortField === "balance") { va = Number(va); vb = Number(vb); }
    if (typeof va === "string") va = va.toLowerCase();
    if (typeof vb === "string") vb = vb.toLowerCase();
    return sortDir === "asc" ? (va > vb ? 1 : -1) : (va < vb ? 1 : -1);
  });

  const totalDue     = filtered.reduce((s, x) => s + (x.balance > 0 ? x.balance : 0), 0);
  const totalAdvance = filtered.reduce((s, x) => s + (x.balance < 0 ? Math.abs(x.balance) : 0), 0);
  const withDue      = filtered.filter(x => x.balance > 0).length;

  if (loading) return <FullPageLoader text={lang === "ar" ? "جاري التحميل..." : "Loading..."} />;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">

        {/* ── Header ── */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {lang === "ar" ? "كشف حساب الموردين" : "Supplier Ledger"}
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              {lang === "ar" ? "عرض وإدارة حسابات الموردين" : "View and manage supplier accounts"}
            </p>
          </div>
          <button
            onClick={fetchSuppliers} disabled={loading}
            className="p-2.5 border border-gray-200 text-gray-600 rounded-xl hover:bg-gray-50 transition bg-white disabled:opacity-50"
            title={lang === "ar" ? "تحديث" : "Refresh"}
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>

        {/* ── Stats ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <StatCard label={lang === "ar" ? "إجمالي الموردين"    : "Total Suppliers"}    value={filtered.length} />
          <StatCard label={lang === "ar" ? "علينا (مستحق)"      : "Due (We Owe)"}       value={formatCurrency(totalDue, lang)}     color="text-red-600" />
          <StatCard label={lang === "ar" ? "لنا (سلف)"          : "Advance (Owed to Us)"} value={formatCurrency(totalAdvance, lang)} color="text-blue-600" />
          <StatCard label={lang === "ar" ? "موردون بمستحقات"    : "Suppliers With Due"} value={withDue} />
        </div>

        {/* ── Search ── */}
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder={lang === "ar" ? "بحث عن مورد بالاسم، الكود أو الهاتف..." : "Search by name, code or phone..."}
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              dir={lang === "ar" ? "rtl" : "ltr"}
              className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
            />
          </div>
          {searchTerm && (
            <button onClick={() => setSearchTerm("")} className="text-sm text-indigo-600 hover:underline">
              {lang === "ar" ? "مسح البحث" : "Clear"}
            </button>
          )}
        </div>

        {/* ── Table ── */}
        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
          {filtered.length === 0 ? (
            <div className="p-16 text-center">
              <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="font-medium text-gray-600">
                {searchTerm
                  ? (lang === "ar" ? "لم يتم العثور على موردين" : "No suppliers found")
                  : (lang === "ar" ? "لا يوجد موردون نشطون" : "No active suppliers")}
              </p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <SortHeader label={lang === "ar" ? "المورد"  : "Supplier"} field={lang === "ar" ? "nameAr" : "nameEn"} sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                  <SortHeader label={lang === "ar" ? "الكود"   : "Code"}     field="code"    sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                  <SortHeader label={lang === "ar" ? "الهاتف"  : "Phone"}    field="phone"   sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                  <SortHeader label={lang === "ar" ? "الرصيد"  : "Balance"}  field="balance" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">{lang === "ar" ? "الحالة" : "Status"}</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map(supplier => (
                  <tr key={supplier._id} className="hover:bg-gray-50/60 transition">

                    {/* Supplier */}
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
                          <span className="text-indigo-600 font-semibold text-sm">
                            {(lang === "ar" ? supplier.nameAr : supplier.nameEn)?.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 text-sm">
                            {lang === "ar" ? supplier.nameAr : supplier.nameEn}
                          </p>
                          {supplier.email && <p className="text-xs text-gray-400">{supplier.email}</p>}
                        </div>
                      </div>
                    </td>

                    {/* Code */}
                    <td className="px-4 py-3.5">
                      <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                        {supplier.code || "-"}
                      </span>
                    </td>

                    {/* Phone */}
                    <td className="px-4 py-3.5 text-sm text-gray-500">
                      <div className="flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-gray-400" />
                        {supplier.phone || "-"}
                      </div>
                    </td>

                    {/* Balance */}
                    <td className="px-4 py-3.5">
                      <span className={`font-semibold text-sm ${
                        supplier.balance > 0 ? "text-red-600"
                        : supplier.balance < 0 ? "text-blue-600"
                        : "text-gray-600"
                      }`}>
                        {formatCurrency(supplier.balance, lang)}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3.5">
                      <BalanceBadge balance={supplier.balance} lang={lang} />
                    </td>

                    {/* Action */}
                    <td className="px-4 py-3.5 text-right">
                      <button
                        onClick={() => handleOpenStatement(supplier)}
                        disabled={loadingStatement === supplier._id}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition font-medium text-sm disabled:opacity-50"
                      >
                        {loadingStatement === supplier._id ? (
                          <div className="w-3.5 h-3.5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <Eye className="w-3.5 h-3.5" />
                        )}
                        {lang === "ar" ? "عرض الكشف" : "View Statement"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {showStatement && (
        <SupplierStatement
          data={{ supplier: { ...showStatement.supplier, balance: showStatement.supplier.balance || 0 }, rows: showStatement.rows }}
          t={t} lang={lang}
          onClose={() => setShowStatement(null)}
        />
      )}
    </div>
  );
}