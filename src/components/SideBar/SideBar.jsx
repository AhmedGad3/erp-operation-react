import {
  LayoutDashboard, Users, ShoppingCart, CreditCard, FileText, Package, Box,
  ChevronDown, ChevronUp, Briefcase, Receipt, DollarSign, UserCircle,
  FileSpreadsheet, Wrench, TrendingUp, ArrowLeftRight, Landmark, ClipboardList, X
} from "lucide-react";
import { useContext, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { AuthContext } from "../../context/AuthContext";

export default function Sidebar({ lang, isOpen, setIsOpen }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useContext(AuthContext);
  const isAr = lang === "ar";
  const t = (ar, en) => (isAr ? ar : en);
  const isAdmin = String(user?.role || "").toLowerCase() === "admin";
  const adminOnlyPaths = new Set(["/users", "/material-issue/create", "/adjustments"]);
  const canSeePath = (path) => isAdmin || !adminOnlyPaths.has(path);

  const [expandedSections, setExpandedSections] = useState({
    warehouse: true, operations: false, finance: false,
    projects: false, hr: false, reports: false
  });

  const toggleSection = (section) =>
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }));

  const isActivePath = (path) =>
    location.pathname === path || location.pathname.startsWith(path + "/");

  const handleNavigate = (path) => {
    navigate(path);
    if (window.innerWidth < 1024) setIsOpen(false);
  };

  const menuSections = [
    {
      id: "dashboard",
      label: t("لوحة التحكم", "Dashboard"),
      icon: LayoutDashboard,
      path: "/",
      exact: true,
    },
    {
      id: "warehouse",
      label: t("المستودع", "Warehouse"),
      icon: Box,
      items: [
        { id: "units",       icon: Wrench,         label: t("الوحدات", "Units"),        path: "/units" },
        { id: "materials",   icon: Package,        label: t("المواد", "Materials"),     path: "/materials" },
        { id: "suppliers",   icon: Users,          label: t("الموردون", "Suppliers"),   path: "/suppliers" },
        { id: "assets",      icon: Landmark,       label: t("الأصول", "Assets"),        path: "/assets" },
        { id: "adjustments", icon: ArrowLeftRight, label: t("التسويات", "Adjustments"), path: "/adjustments" },
      ],
    },
    {
      id: "operations",
      label: t("العمليات", "Operations"),
      icon: ShoppingCart,
      items: [
        { id: "purchases",        icon: ShoppingCart,  label: t("أوامر الشراء", "Purchase Orders"),   path: "/purchases" },
        { id: "purchase-returns", icon: TrendingUp,    label: t("مرتجعات الشراء", "Purchase Returns"), path: "/purchases/returns" },
        { id: "material-issue",   icon: ClipboardList, label: t("صرف المواد", "Material Issue"),       path: "/material-issue/create" },
      ],
    },
    {
      id: "projects & clients",
      label: t("المشاريع والعملاء", "Projects & Clients"),
      icon: Briefcase,
      items: [
        { id: "projects", icon: Briefcase, label: t("المشاريع", "Projects"), path: "/projects" },
        { id: "clients",  icon: Users,     label: t("العملاء", "Clients"),   path: "/clients" },
      ],
    },
    {
      id: "finance",
      label: t("المالية", "Finance"),
      icon: DollarSign,
      items: [
        { id: "supplier-payments", icon: CreditCard,      label: t("مدفوعات الموردين", "Supplier Payments"), path: "/finance/supplier-payments" },
        { id: "supplier-refunds",  icon: Receipt,         label: t("مرتجعات الموردين", "Supplier Refunds"),  path: "/finance/supplier-refunds" },
        { id: "client-payments",   icon: CreditCard,      label: t("مدفوعات العملاء", "Client Payments"),    path: "/finance/client-payments" },
        { id: "general-expenses",  icon: FileText,        label: t("المصروفات العامة", "General Expenses"),  path: "/finance/general-expenses" },
        { id: "supplier-ledger",   icon: FileSpreadsheet, label: t("دفتر الموردين", "Supplier Ledger"),      path: "/ledger/suppliers" },
        { id: "client-ledger",     icon: FileSpreadsheet, label: t("دفتر العملاء", "Client Ledger"),        path: "/ledger/clients" },
      ],
    },
    {
      id: "hr",
      label: t("الموارد البشرية", "Human Resources"),
      icon: UserCircle,
      items: [
        { id: "users", icon: Users, label: t("المستخدمون", "Users"), path: "/users" },
      ],
    },
    {
      id: "reports",
      label: t("التقارير", "Reports"),
      icon: FileText,
      items: [
        { id: "reports", icon: FileText, label: t("التقارير", "Reports"), path: "/reports" },
      ],
    },
  ];

  const NavItems = () => (
    <nav className="space-y-1" dir={isAr ? "rtl" : "ltr"}>
      {menuSections.map((section, idx) => {
        const SectionIcon = section.icon;
        const isExpanded = expandedSections[section.id];
        const visibleItems = section.items
          ? section.items.filter((item) => canSeePath(item.path))
          : null;

        /* ── standalone item (Dashboard) ── */
        if (!visibleItems) {
          const isActive = section.exact
            ? location.pathname === section.path
            : isActivePath(section.path);
          return (
            <div key={section.id}>
              <button
                onClick={() => handleNavigate(section.path)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200
                  ${isAr ? "flex-row-reverse text-right justify-end" : ""}
                  ${isActive
                    ? "bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-md"
                    : "text-slate-800 hover:bg-white hover:shadow-sm"
                  }`}
              >
                <SectionIcon size={19} className={isActive ? "text-white" : "text-blue-600"} />
                <span className="text-sm font-semibold">{section.label}</span>
              </button>
              <div className="my-2 border-t border-slate-200" />
            </div>
          );
        }

        /* ── collapsible section ── */
        if (visibleItems.length === 0) return null;
        const hasActiveChild = visibleItems.some((i) => isActivePath(i.path));

        return (
          <div key={section.id}>
            {/* Section header */}
            <button
              onClick={() => toggleSection(section.id)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-all duration-200
                ${isAr ? "flex-row-reverse text-right" : ""}
                ${hasActiveChild && !isExpanded
                  ? "bg-blue-50 text-blue-700"
                  : "text-slate-800 hover:bg-white hover:shadow-sm"
                }`}
            >
              <div className={`flex items-center gap-3 ${isAr ? "flex-row-reverse" : ""}`}>
                <span className={`w-1 h-5 rounded-full ${hasActiveChild ? "bg-blue-500" : "bg-slate-300"}`} />
                <SectionIcon size={19} className={hasActiveChild ? "text-blue-600" : "text-slate-500"} />
                <span className="text-sm font-bold tracking-wide">{section.label}</span>
              </div>
              {isExpanded
                ? <ChevronUp   size={15} className="text-slate-400 flex-shrink-0" />
                : <ChevronDown size={15} className="text-slate-400 flex-shrink-0" />}
            </button>

            {/* Sub-items */}
            {isExpanded && (
              <ul
                className={`mt-1 mb-1 space-y-0.5 border-slate-200
                  ${isAr ? "border-r-2 mr-5 pr-2" : "border-l-2 ml-5 pl-2"}`}
              >
                {visibleItems.map((item) => {
                  const ItemIcon = item.icon;
                  const isActive = isActivePath(item.path);
                  return (
                    <li key={item.id}>
                      <button
                        onClick={() => handleNavigate(item.path)}
                        className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg transition-all duration-150 text-sm
                          ${isAr ? "flex-row-reverse text-right justify-end" : ""}
                          ${isActive
                            ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-md font-semibold"
                            : "text-slate-500 hover:bg-white hover:text-blue-600 hover:shadow-sm font-medium"
                          }`}
                      >
                        <ItemIcon size={15} className={isActive ? "text-white" : "text-slate-400"} />
                        <span>{item.label}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}

            {/* divider */}
            {idx < menuSections.length - 1 && (
              <div className="my-2 border-t border-dashed border-slate-200" />
            )}
          </div>
        );
      })}
    </nav>
  );

  return (
    <>
      {/* ── MOBILE: full-screen overlay drawer ── */}
      {isOpen && (
        <div
          className="fixed inset-0 z-[100] lg:hidden flex flex-col bg-gradient-to-b from-slate-50 to-slate-100"
          dir={isAr ? "rtl" : "ltr"}
        >
          {/* Header */}
          <div
            className={`flex items-center justify-between px-5 py-4 bg-white border-b border-slate-200 flex-shrink-0
              ${isAr ? "flex-row-reverse" : ""}`}
          >
            <div className={`flex items-center gap-3 ${isAr ? "flex-row-reverse" : ""}`}>
              <svg width="28" height="28" viewBox="0 0 26 26" fill="none">
                <rect x="4"  y="8"  width="6" height="14" rx="1" className="fill-blue-600" />
                <rect x="11" y="4"  width="6" height="18" rx="1" className="fill-blue-500" />
                <rect x="18" y="10" width="4" height="12" rx="1" className="fill-blue-400" />
                <rect x="6"  y="10" width="2" height="2"  fill="white" />
                <rect x="6"  y="14" width="2" height="2"  fill="white" />
                <rect x="13" y="7"  width="2" height="2"  fill="white" />
                <rect x="13" y="11" width="2" height="2"  fill="white" />
                <rect x="13" y="15" width="2" height="2"  fill="white" />
              </svg>
              <span className="font-bold text-gray-800">{t("القائمة", "Menu")}</span>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="w-9 h-9 flex items-center justify-center rounded-xl bg-gray-100 hover:bg-gray-200 transition-colors"
            >
              <X size={20} className="text-gray-700" />
            </button>
          </div>

          {/* Scrollable nav */}
          <div className="flex-1 overflow-y-auto p-4">
            <NavItems />
          </div>
        </div>
      )}

      {/* ── DESKTOP: fixed side panel ── */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`fixed top-1/2 -translate-y-1/2 hidden lg:flex z-50
          bg-gradient-to-br from-blue-600 to-blue-700 text-white shadow-xl p-1
          border-y border-blue-500 hover:from-blue-700 hover:to-blue-800 transition-all duration-300
          ${isAr
            ? isOpen ? "right-64" : "right-0"
            : isOpen ? "left-64"  : "left-0"
          }`}
        style={isAr ? {
          borderTopLeftRadius:    "0.75rem",
          borderBottomLeftRadius: "0.75rem",
          borderTopRightRadius:    0,
          borderBottomRightRadius: 0,
        } : {
          borderTopLeftRadius:    0,
          borderBottomLeftRadius: 0,
          borderTopRightRadius:    "0.75rem",
          borderBottomRightRadius: "0.75rem",
        }}
      >
        {isOpen
          ? <ChevronUp   size={20} className="rotate-90" />
          : <ChevronDown size={20} className="-rotate-90" />}
      </button>

      <aside
        dir={isAr ? "rtl" : "ltr"}
        className={`fixed top-16 hidden lg:block h-[calc(100vh-4rem)] z-40
          bg-gradient-to-b from-slate-50 to-slate-100 shadow-2xl overflow-y-auto
          transition-all duration-300 custom-scrollbar
          ${isAr ? "right-0 border-l" : "left-0 border-r"} border-slate-200
          ${isOpen ? "w-64" : "w-0"}`}
      >
        <div className={`p-4 ${isOpen ? "block" : "hidden"} min-w-[16rem]`}>
          <NavItems />
        </div>
      </aside>

      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: linear-gradient(to bottom, #3b82f6, #2563eb);
          border-radius: 10px;
        }
      `}</style>
    </>
  );
}