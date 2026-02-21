import {
  LayoutDashboard, Users, ShoppingCart, CreditCard, FileText, Package, Box,
  ChevronDown, ChevronUp, Briefcase, Receipt, DollarSign, UserCircle,
  FileSpreadsheet, Wrench, TrendingUp, ArrowLeftRight, Landmark, ClipboardList, X
} from "lucide-react";
import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";

export default function Sidebar({ lang, isOpen, setIsOpen }) {
  const navigate = useNavigate();
  const location = useLocation();
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
    { id: "dashboard", label: lang === "ar" ? "لوحة التحكم" : "Dashboard", icon: LayoutDashboard, path: "/", exact: true },
    {
      id: "warehouse", label: lang === "ar" ? "المستودع" : "Warehouse", icon: Box,
      items: [
        { id: "units",       icon: Wrench,         label: lang === "ar" ? "الوحدات"   : "Units",        path: "/units" },
        { id: "materials",   icon: Package,        label: lang === "ar" ? "المواد"    : "Materials",    path: "/materials" },
        { id: "suppliers",   icon: Users,          label: lang === "ar" ? "الموردين"  : "Suppliers",    path: "/suppliers" },
        { id: "assets",      icon: Landmark,       label: lang === "ar" ? "الأصول"    : "Assets",       path: "/assets" },
        { id: "adjustments", icon: ArrowLeftRight, label: lang === "ar" ? "التسويات" : "Adjustments",  path: "/adjustments" },
      ],
    },
    {
      id: "operations", label: lang === "ar" ? "العمليات" : "Operations", icon: ShoppingCart,
      items: [
        { id: "purchases",        icon: ShoppingCart,  label: lang === "ar" ? "أوامر الشراء"   : "Purchase Orders",  path: "/purchases" },
        { id: "purchase-returns", icon: TrendingUp,    label: lang === "ar" ? "مرتجعات الشراء" : "Purchase Returns", path: "/purchases/returns" },
        { id: "material-issue",   icon: ClipboardList, label: lang === "ar" ? "صرف المواد"     : "Material Issue",   path: "/material-issue/create" },
      ],
    },
    {
      id: "projects & clients", label: lang === "ar" ? "المشاريع و العملاء" : "Projects & Clients", icon: Briefcase,
      items: [
        { id: "projects", icon: Briefcase, label: lang === "ar" ? "المشاريع" : "Projects", path: "/projects" },
        { id: "clients",  icon: Users,     label: lang === "ar" ? "العملاء"  : "Clients",  path: "/clients" },
      ],
    },
    {
      id: "finance", label: lang === "ar" ? "المالية" : "Finance", icon: DollarSign,
      items: [
        { id: "supplier-payments", icon: CreditCard,      label: lang === "ar" ? "مدفوعات الموردين" : "Supplier Payments", path: "/finance/supplier-payments" },
        { id: "supplier-refunds",  icon: Receipt,         label: lang === "ar" ? "مرتجعات الموردين" : "Supplier Refunds",  path: "/finance/supplier-refunds" },
        { id: "client-payments",   icon: CreditCard,      label: lang === "ar" ? "مدفوعات العملاء"  : "Client Payments",   path: "/finance/client-payments" },
        { id: "general-expenses",  icon: FileText,        label: lang === "ar" ? "المصروفات العامة" : "General Expenses",  path: "/finance/general-expenses" },
        { id: "supplier-ledger",   icon: FileSpreadsheet, label: lang === "ar" ? "دفتر الموردين"    : "Supplier Ledger",   path: "/ledger/suppliers" },
        { id: "client-ledger",     icon: FileSpreadsheet, label: lang === "ar" ? "دفتر العملاء"     : "Client Ledger",     path: "/ledger/clients" },
      ],
    },
    {
      id: "hr", label: lang === "ar" ? "الموارد البشرية" : "Human Resources", icon: UserCircle,
      items: [{ id: "users", icon: Users, label: lang === "ar" ? "المستخدمين" : "Users", path: "/users" }],
    },
    {
      id: "reports", label: lang === "ar" ? "التقارير" : "Reports", icon: FileText,
      items: [{ id: "reports", icon: FileText, label: lang === "ar" ? "التقارير" : "Reports", path: "/reports" }],
    },
  ];

  const NavItems = () => (
    <nav className="space-y-1">
      {menuSections.map((section, idx) => {
        const SectionIcon = section.icon;
        const isExpanded = expandedSections[section.id];

        /* ── standalone item (Dashboard) ── */
        if (!section.items) {
          const isActive = section.exact
            ? location.pathname === section.path
            : isActivePath(section.path);
          return (
            <div key={section.id}>
              <button
                onClick={() => handleNavigate(section.path)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 ${
                  isActive
                    ? "bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-md"
                    : "text-slate-800 hover:bg-white hover:shadow-sm"
                }`}
              >
                <SectionIcon size={19} className={isActive ? "text-white" : "text-blue-600"} />
                <span className="text-sm font-semibold">{section.label}</span>
              </button>

              {/* divider after dashboard */}
              <div className="my-2 border-t border-slate-200" />
            </div>
          );
        }

        /* ── collapsible section ── */
        const hasActiveChild = section.items.some((i) => isActivePath(i.path));

        return (
          <div key={section.id}>
            {/* Section header */}
            <button
              onClick={() => toggleSection(section.id)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-all duration-200 ${
                hasActiveChild && !isExpanded
                  ? "bg-blue-50 text-blue-700"
                  : "text-slate-800 hover:bg-white hover:shadow-sm"
              }`}
            >
              <div className="flex items-center gap-3">
                {/* colored accent bar */}
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
                className={`mt-1 mb-1 space-y-0.5 border-l-2 border-slate-200 ${
                  lang === "ar" ? "mr-5 pr-2" : "ml-5 pl-2"
                }`}
              >
                {section.items.map((item) => {
                  const ItemIcon = item.icon;
                  const isActive = isActivePath(item.path);
                  return (
                    <li key={item.id}>
                      <button
                        onClick={() => handleNavigate(item.path)}
                        className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg transition-all duration-150 text-sm ${
                          isActive
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

            {/* thin divider between sections */}
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
      {/* ══════════════════════════════════════════
          MOBILE: full-screen overlay drawer
      ══════════════════════════════════════════ */}
      {isOpen && (
        <div className="fixed inset-0 z-[100] lg:hidden flex flex-col bg-gradient-to-b from-slate-50 to-slate-100">
          {/* Header bar */}
          <div className="flex items-center justify-between px-5 py-4 bg-white border-b border-slate-200 flex-shrink-0">
            <div className="flex items-center gap-3">
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
              <span className="font-bold text-gray-800">
                {lang === "ar" ? "القائمة" : "Menu"}
              </span>
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

      {/* ══════════════════════════════════════════
          DESKTOP: fixed side panel (lg+)
      ══════════════════════════════════════════ */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`fixed top-1/2 -translate-y-1/2 hidden lg:flex z-50 bg-gradient-to-br from-blue-600 to-blue-700 text-white shadow-xl p-1 border-y border-blue-500 hover:from-blue-700 hover:to-blue-800 transition-all duration-300 ${
          lang === "ar"
            ? isOpen ? "right-64" : "right-0"
            : isOpen ? "left-64" : "left-0"
        }`}
        style={{
          borderTopLeftRadius:     lang === "ar" ? "0.75rem" : "0",
          borderBottomLeftRadius:  lang === "ar" ? "0.75rem" : "0",
          borderTopRightRadius:    lang === "ar" ? "0" : "0.75rem",
          borderBottomRightRadius: lang === "ar" ? "0" : "0.75rem",
        }}
      >
        {isOpen
          ? <ChevronUp   size={20} className="rotate-90" />
          : <ChevronDown size={20} className="-rotate-90" />}
      </button>

      <aside
        className={`
          fixed top-16 hidden lg:block h-[calc(100vh-4rem)] z-40
          bg-gradient-to-b from-slate-50 to-slate-100 shadow-2xl overflow-y-auto
          transition-all duration-300 custom-scrollbar
          ${lang === "ar"
            ? `right-0 border-l border-slate-200 ${isOpen ? "w-64" : "w-0"}`
            : `left-0 border-r border-slate-200 ${isOpen ? "w-64" : "w-0"}`
          }
        `}
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