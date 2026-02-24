import { useState, useEffect, useContext } from "react";
import {
  DollarSign, Users, Search, X, Plus, AlertCircle,
  TrendingUp, TrendingDown, Wallet, Phone, Download,
  ChevronUp, ChevronDown,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { formatCurrency } from "../../utils/dateFormat";
import axiosInstance from "../../utils/axiosInstance";
import { exportToExcel } from "../../utils/excelExport";
import FullPageLoader from "../Loader/Loader";
import { LanguageContext } from "../../context/LanguageContext";

// ── Sortable column header ─────────────────────────────────
const SortHeader = ({ label, field, sortField, sortDir, onSort }) => (
  <th
    className="px-4 py-3 text-left text-sm font-medium text-gray-500 cursor-pointer select-none"
    onClick={() => onSort(field)}
  >
    <span className="inline-flex items-center gap-1">
      {label}
      <span className="flex flex-col leading-none">
        <ChevronUp   className={`w-3 h-3 ${sortField === field && sortDir === "asc"  ? "text-gray-900" : "text-gray-300"}`} />
        <ChevronDown className={`w-3 h-3 ${sortField === field && sortDir === "desc" ? "text-gray-900" : "text-gray-300"}`} />
      </span>
    </span>
  </th>
);

// ── Balance badge ──────────────────────────────────────────
const BalanceBadge = ({ balance, lang }) => {
  if (balance > 0)
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
        <TrendingUp className="w-3 h-3" />
        {lang === "ar" ? "مستحق" : "Due"}
      </span>
    );
  if (balance < 0)
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
        <TrendingDown className="w-3 h-3" />
        {lang === "ar" ? "سلفة" : "Advance"}
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
      <Wallet className="w-3 h-3" />
      {lang === "ar" ? "متوازن" : "Balanced"}
    </span>
  );
};

// ── Stat card ──────────────────────────────────────────────
const StatCard = ({ label, value, color }) => (
  <div className="bg-white border border-gray-200 rounded-2xl p-5">
    <p className="text-sm text-gray-500 mb-1">{label}</p>
    <p className={`text-2xl font-bold ${color}`}>{value}</p>
  </div>
);

// ── Main Component ─────────────────────────────────────────
export default function SupplierPayments() {
  const { lang, t } = useContext(LanguageContext);
  const navigate    = useNavigate();

  const [suppliers,  setSuppliers]  = useState([]);
  const [balances,   setBalances]   = useState({});
  const [loading,    setLoading]    = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortField,  setSortField]  = useState("nameEn");
  const [sortDir,    setSortDir]    = useState("asc");

  // ── Fetch ──────────────────────────────────────────────
  const fetchSuppliers = async () => {
    try {
      setLoading(true);
      const { data } = await axiosInstance.get("/suppliers");
      const active = (data.result || []).filter(s => s.isActive !== false);
      setSuppliers(active);
    } catch (err) {
      console.error(err);
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
      } catch {
        map[s._id] = 0;
      }
    }
    setBalances(map);
  };

  useEffect(() => { fetchSuppliers(); }, []);
  useEffect(() => { if (suppliers.length) loadBalances(suppliers); }, [suppliers]);

  // ── Sort ───────────────────────────────────────────────
  const handleSort = (field) => {
    if (sortField === field) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortField(field); setSortDir("asc"); }
  };

  // ── Derived data ───────────────────────────────────────
  const withBalance = suppliers.map(s => ({ ...s, balance: Number(balances[s._id] || 0) }));

  const filtered = (searchTerm
    ? withBalance.filter(s => {
        const q = searchTerm.toLowerCase();
        return (
          s.nameEn?.toLowerCase().includes(q) ||
          s.nameAr?.includes(q) ||
          s.code?.toLowerCase().includes(q) ||
          s.phone?.includes(q)
        );
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

  const totalDue      = filtered.reduce((s, x) => s + (x.balance > 0 ? x.balance : 0), 0);
  const totalAdvance  = filtered.reduce((s, x) => s + (x.balance < 0 ? Math.abs(x.balance) : 0), 0);
  const suppliersWithDue = filtered.filter(x => x.balance > 0).length;

  // ── Export ─────────────────────────────────────────────
  const handleExport = () => {
    if (!filtered.length) return;
    const rows = filtered.map(s => ({
      [lang === "ar" ? "اسم المورد" : "Supplier"]:
        lang === "ar" ? s.nameAr : s.nameEn,
      [lang === "ar" ? "الكود" : "Code"]: s.code || "",
      [lang === "ar" ? "الهاتف" : "Phone"]: s.phone || "-",
      [lang === "ar" ? "البريد" : "Email"]: s.email || "-",
      [lang === "ar" ? "الرصيد" : "Balance"]: s.balance?.toFixed(2) || "0.00",
    }));
    exportToExcel(rows, Object.keys(rows[0]).map(k => ({ [k]: k })),
      lang === "ar" ? "أرصدة_الموردين" : "Supplier_Balances", lang);
  };

  if (loading)
    return <FullPageLoader text={lang === "ar" ? "جاري التحميل..." : "Loading..."} />;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">

        {/* ── Page Header ── */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {lang === "ar" ? "مدفوعات الموردين" : "Supplier Payments"}
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              {lang === "ar"
                ? "إدارة وتسديد مدفوعات الموردين"
                : "Manage and process supplier payments"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleExport}
              className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition font-medium text-sm bg-white"
            >
              <Download className="w-4 h-4" />
              {lang === "ar" ? "تصدير" : "Export"}
            </button>
            <button
              onClick={fetchSuppliers}
              disabled={loading}
              className="px-4 py-2.5 border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition font-medium text-sm bg-white disabled:opacity-50"
              title={lang === "ar" ? "تحديث" : "Refresh"}
            >
              <i className={`fa-solid fa-arrows-rotate ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>

        {/* ── Stats ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <StatCard
            label={lang === "ar" ? "إجمالي الموردين" : "Total Suppliers"}
            value={filtered.length}
            color="text-gray-900"
          />
          <StatCard
            label={lang === "ar" ? "إجمالي المستحقات" : "Total Due"}
            value={formatCurrency(totalDue, lang)}
            color="text-red-600"
          />
          <StatCard
            label={lang === "ar" ? "إجمالي السلف" : "Total Advance"}
            value={formatCurrency(totalAdvance, lang)}
            color="text-green-600"
          />
          <StatCard
            label={lang === "ar" ? "موردون بمستحقات" : "Suppliers With Due"}
            value={suppliersWithDue}
            color="text-gray-900"
          />
        </div>

        {/* ── Filters ── */}
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder={lang === "ar"
                ? "بحث بالاسم، الكود أو الهاتف..."
                : "Search by name, code or phone..."}
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              dir={lang === "ar" ? "rtl" : "ltr"}
              className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
            />
          </div>

          {searchTerm && (
            <button
              onClick={() => setSearchTerm("")}
              className="text-sm text-indigo-600 hover:underline"
            >
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
                  <SortHeader
                    label={lang === "ar" ? "المورد" : "Supplier"}
                    field={lang === "ar" ? "nameAr" : "nameEn"}
                    sortField={sortField} sortDir={sortDir} onSort={handleSort}
                  />
                  <SortHeader
                    label={lang === "ar" ? "الكود" : "Code"}
                    field="code"
                    sortField={sortField} sortDir={sortDir} onSort={handleSort}
                  />
                  <SortHeader
                    label={lang === "ar" ? "الهاتف" : "Phone"}
                    field="phone"
                    sortField={sortField} sortDir={sortDir} onSort={handleSort}
                  />
                  <SortHeader
                    label={lang === "ar" ? "المبلغ المستحق" : "Amount Due"}
                    field="balance"
                    sortField={sortField} sortDir={sortDir} onSort={handleSort}
                  />
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">
                    {lang === "ar" ? "الحالة" : "Status"}
                  </th>
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
                            {(lang === "ar" ? supplier.nameAr : supplier.nameEn)
                              ?.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 text-sm">
                            {lang === "ar" ? supplier.nameAr : supplier.nameEn}
                          </p>
                          {supplier.email && (
                            <p className="text-xs text-gray-400">{supplier.email}</p>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Code */}
                    <td className="px-4 py-3.5">
                      <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                        {supplier.code}
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
                        : supplier.balance < 0 ? "text-green-600"
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
                        onClick={() =>
                          navigate(`/finance/supplier-payments/create?supplierId=${supplier._id}`)
                        }
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition font-medium text-sm"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        {lang === "ar" ? "إضافة دفعة" : "Add Payment"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}