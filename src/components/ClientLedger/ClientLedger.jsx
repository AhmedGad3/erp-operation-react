import { useState, useEffect, useContext } from "react";
import {
  BookOpen, Users, Search, Eye,
  TrendingUp, TrendingDown, Wallet, Phone, RefreshCw,
  ChevronUp, ChevronDown,
} from "lucide-react";
import { formatCurrency } from "../../utils/dateFormat";
import axiosInstance from "../../utils/axiosInstance";
import { toast } from "react-toastify";
import FullPageLoader from "../Loader/Loader";
import { LanguageContext } from "../../context/LanguageContext";
import ClientStatement from "../ClientStatement/ClientStatement";

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
        {lang === "ar" ? "لنا" : "Owed to Us"}
      </span>
    );
  if (balance < 0)
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
        <TrendingDown className="w-3 h-3" />
        {lang === "ar" ? "مدفوع" : "Paid"}
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
export default function ClientLedger() {
  const { lang, t } = useContext(LanguageContext);

  const [clients,          setClients]          = useState([]);
  const [balances,         setBalances]         = useState({});
  const [loading,          setLoading]          = useState(false);
  const [loadingStatement, setLoadingStatement] = useState(null);
  const [searchTerm,       setSearchTerm]       = useState("");
  const [showStatement,    setShowStatement]    = useState(null);
  const [sortField,        setSortField]        = useState("nameEn");
  const [sortDir,          setSortDir]          = useState("asc");

  useEffect(() => { fetchClients(); }, []);
  useEffect(() => { if (clients.length) loadBalances(clients); }, [clients]);

  const fetchClients = async () => {
    try {
      setLoading(true);
      const { data } = await axiosInstance.get("/clients");
      setClients((data.result || []).filter(c => c.isActive !== false));
    } catch { toast.error(lang === "ar" ? "فشل تحميل العملاء" : "Error loading clients"); }
    finally   { setLoading(false); }
  };

  const loadBalances = async (list) => {
    const map = {};
    for (let c of list) {
      try {
        const { data } = await axiosInstance.get(`/ledger/clients/${c._id}/total-balance`);
        map[c._id] = Number(data.result?.totalBalance || 0);
      } catch { map[c._id] = 0; }
    }
    setBalances(map);
  };

  const handleOpenStatement = async (client) => {
    try {
      setLoadingStatement(client._id);
      const { data } = await axiosInstance.get(`/ledger/clients/${client._id}`);
      const rows = data.result || [];
      if (!rows.length) {
        toast.error(lang === "ar"
          ? `لا توجد معاملات للعميل ${client.nameAr || client.nameEn}`
          : `No transactions found for ${client.nameEn}`);
        return;
      }
      setShowStatement({ client, rows });
    } catch { toast.error(lang === "ar" ? "فشل تحميل الكشف" : "Error loading statement"); }
    finally   { setLoadingStatement(null); }
  };

  const handleSort = (field) => {
    if (sortField === field) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortField(field); setSortDir("asc"); }
  };

  // ── Derived ───────────────────────────────────────────
  const withBalance = clients.map(c => ({ ...c, balance: Number(balances[c._id] || 0) }));

  const filtered = (searchTerm
    ? withBalance.filter(c => {
        const q = searchTerm.toLowerCase();
        return c.nameEn?.toLowerCase().includes(q) ||
               c.nameAr?.includes(searchTerm) ||
               c.code?.toLowerCase().includes(q) ||
               c.phone?.includes(q);
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

  const totalDebit   = filtered.reduce((s, c) => s + (c.balance > 0 ? c.balance : 0), 0);
  const totalCredit  = filtered.reduce((s, c) => s + (c.balance < 0 ? Math.abs(c.balance) : 0), 0);
  const withDebt     = filtered.filter(c => c.balance > 0).length;

  if (loading) return <FullPageLoader text={lang === "ar" ? "جاري التحميل..." : "Loading..."} />;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">

        {/* ── Header ── */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {lang === "ar" ? "كشف حساب العملاء" : "Client Ledger"}
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              {lang === "ar" ? "عرض وإدارة حسابات العملاء" : "View and manage client accounts"}
            </p>
          </div>
          <button
            onClick={fetchClients} disabled={loading}
            className="p-2.5 border border-gray-200 text-gray-600 rounded-xl hover:bg-gray-50 transition bg-white disabled:opacity-50"
            title={lang === "ar" ? "تحديث" : "Refresh"}
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>

        {/* ── Stats ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <StatCard label={lang === "ar" ? "إجمالي العملاء"   : "Total Clients"}      value={filtered.length} />
          <StatCard label={lang === "ar" ? "لنا (مدين)"        : "Owed to Us"}         value={formatCurrency(totalDebit, lang)}  color="text-red-600" />
          <StatCard label={lang === "ar" ? "مدفوع"             : "Paid"}               value={formatCurrency(totalCredit, lang)} color="text-green-600" />
          <StatCard label={lang === "ar" ? "عملاء بمديونية"    : "Clients With Debt"}  value={withDebt} />
        </div>

        {/* ── Search ── */}
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder={lang === "ar" ? "بحث عن عميل بالاسم، الكود أو الهاتف..." : "Search by name, code or phone..."}
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
                  ? (lang === "ar" ? "لم يتم العثور على عملاء" : "No clients found")
                  : (lang === "ar" ? "لا يوجد عملاء نشطون" : "No active clients")}
              </p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <SortHeader label={lang === "ar" ? "العميل"  : "Client"}  field={lang === "ar" ? "nameAr" : "nameEn"} sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                  <SortHeader label={lang === "ar" ? "الكود"   : "Code"}    field="code"    sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                  <SortHeader label={lang === "ar" ? "الهاتف"  : "Phone"}   field="phone"   sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                  <SortHeader label={lang === "ar" ? "الرصيد"  : "Balance"} field="balance" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">{lang === "ar" ? "الحالة" : "Status"}</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map(client => (
                  <tr key={client._id} className="hover:bg-gray-50/60 transition">

                    {/* Client */}
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
                          <span className="text-indigo-600 font-semibold text-sm">
                            {(lang === "ar" ? client.nameAr : client.nameEn)?.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 text-sm">
                            {lang === "ar" ? client.nameAr : client.nameEn}
                          </p>
                          {client.email && <p className="text-xs text-gray-400">{client.email}</p>}
                        </div>
                      </div>
                    </td>

                    {/* Code */}
                    <td className="px-4 py-3.5">
                      <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                        {client.code || "-"}
                      </span>
                    </td>

                    {/* Phone */}
                    <td className="px-4 py-3.5 text-sm text-gray-500">
                      <div className="flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-gray-400" />
                        {client.phone || "-"}
                      </div>
                    </td>

                    {/* Balance */}
                    <td className="px-4 py-3.5">
                      <span className={`font-semibold text-sm ${
                        client.balance > 0 ? "text-red-600"
                        : client.balance < 0 ? "text-green-600"
                        : "text-gray-600"
                      }`}>
                        {formatCurrency(Math.abs(client.balance), lang)}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3.5">
                      <BalanceBadge balance={client.balance} lang={lang} />
                    </td>

                    {/* Action */}
                    <td className="px-4 py-3.5 text-right">
                      <button
                        onClick={() => handleOpenStatement(client)}
                        disabled={loadingStatement === client._id}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition font-medium text-sm disabled:opacity-50"
                      >
                        {loadingStatement === client._id ? (
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
        <ClientStatement data={showStatement} t={t} lang={lang} onClose={() => setShowStatement(null)} />
      )}
    </div>
  );
}