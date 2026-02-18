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
    <>
      {menuSections.map((section) => {
        const SectionIcon = section.icon;
        const isExpanded = expandedSections[section.id];

        if (!section.items) {
          const isActive = section.exact
            ? location.pathname === section.path
            : isActivePath(section.path);
          return (
            <div key={section.id} className="mb-2">
              <button
                onClick={() => handleNavigate(section.path)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 font-medium ${
                  isActive
                    ? "bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg"
                    : "text-slate-700 hover:bg-white hover:shadow-md"
                }`}
              >
                <SectionIcon size={20} className={isActive ? "text-white" : "text-slate-600"} />
                <span className="text-sm">{section.label}</span>
              </button>
            </div>
          );
        }

        return (
          <div key={section.id} className="mb-2">
            <button
              onClick={() => toggleSection(section.id)}
              className="w-full flex items-center justify-between px-4 py-3 rounded-xl text-slate-700 hover:bg-white hover:shadow-md transition-all duration-200 font-medium"
            >
              <div className="flex items-center gap-3">
                <SectionIcon size={20} className="text-slate-600" />
                <span className="text-sm">{section.label}</span>
              </div>
              {isExpanded
                ? <ChevronUp size={16} className="text-slate-400" />
                : <ChevronDown size={16} className="text-slate-400" />}
            </button>

            {isExpanded && (
              <ul className="mt-2 space-y-1">
                {section.items.map((item) => {
                  const ItemIcon = item.icon;
                  const isActive = isActivePath(item.path);
                  return (
                    <li key={item.id}>
                      <button
                        onClick={() => handleNavigate(item.path)}
                        className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all duration-200 text-sm ${
                          lang === "ar" ? "pr-12" : "pl-12"
                        } ${
                          isActive
                            ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg"
                            : "text-slate-600 hover:bg-white hover:text-blue-600 hover:shadow-sm"
                        }`}
                      >
                        <ItemIcon size={18} className={isActive ? "text-white" : ""} />
                        <span className="font-medium">{item.label}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        );
      })}
    </>
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
      {/* Desktop toggle button */}
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