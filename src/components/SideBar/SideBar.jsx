import { 
  LayoutDashboard, 
  Users, 
  ShoppingCart, 
  CreditCard, 
  FileText, 
  Package, 
  Box,
  ChevronDown,
  ChevronUp,
  Building2,
  Briefcase,
  Receipt,
  DollarSign,
  UserCircle,
  FileSpreadsheet,
  Wrench,
  Menu,
  X,
  TrendingUp,
  ArrowLeftRight,
  Landmark,
  ClipboardList
} from "lucide-react";
import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";

export default function Sidebar({ lang, isOpen, setIsOpen }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [expandedSections, setExpandedSections] = useState({
    warehouse: true,
    operations: false,
    finance: false,
    projects: false,
    hr: false,
    reports: false
  });

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const isActivePath = (path) => {
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  const menuSections = [
    {
      id: "dashboard",
      label: lang === "ar" ? "لوحة التحكم" : "Dashboard",
      icon: LayoutDashboard,
      path: "/",
      exact: true
    },
    {
      id: "warehouse",
      label: lang === "ar" ? "المستودع" : "Warehouse",
      icon: Box,
      items: [
        { id: "units", icon: Wrench, label: lang === "ar" ? "الوحدات" : "Units", path: "/units" },
        { id: "materials", icon: Package, label: lang === "ar" ? "المواد" : "Materials", path: "/materials" },
        { id: "suppliers", icon: Users, label: lang === "ar" ? "الموردين" : "Suppliers", path: "/suppliers" },
        { id: "assets", icon: Landmark, label: lang === "ar" ? "الأصول" : "Assets", path: "/assets" },
        { id: "adjustments", icon: ArrowLeftRight, label: lang === "ar" ? "التسويات" : "Adjustments", path: "/adjustments" }
      ]
    },
    {
      id: "operations",
      label: lang === "ar" ? "العمليات" : "Operations",
      icon: ShoppingCart,
      items: [
        { id: "purchases", icon: ShoppingCart, label: lang === "ar" ? "أوامر الشراء" : "Purchase Orders", path: "/purchases" },
        { id: "purchase-returns", icon: TrendingUp, label: lang === "ar" ? "مرتجعات الشراء" : "Purchase Returns", path: "/purchases/returns" },
        { id: "material-issue", icon: ClipboardList, label: lang === "ar" ? "صرف المواد" : "Material Issue", path: "/material-issue/create" }
      ]
    },
    {
      id: "projects & clients",
      label: lang === "ar" ? "المشاريع و العملاء" : "Projects & Clients",
      icon: Briefcase,
      items: [
        { id: "projects", icon: Briefcase, label: lang === "ar" ? "المشاريع" : "Projects", path: "/projects" },
        { id: "clients", icon: Users, label: lang === "ar" ? "العملاء" : "Clients", path: "/clients" }
      ]
    },
    {
      id: "finance",
      label: lang === "ar" ? "المالية" : "Finance",
      icon: DollarSign,
      items: [
        { id: "supplier-payments", icon: CreditCard, label: lang === "ar" ? "مدفوعات الموردين" : "Supplier Payments", path: "/finance/supplier-payments" },
        { id: "supplier-refunds", icon: Receipt, label: lang === "ar" ? "مرتجعات الموردين" : "Supplier Refunds", path: "/finance/supplier-refunds" },
        { id: "client-payments", icon: CreditCard, label: lang === "ar" ? "مدفوعات العملاء" : "Client Payments", path: "/finance/client-payments" },
        { id: "general-expenses", icon: FileText, label: lang === "ar" ? "المصروفات العامة" : "General Expenses", path: "/finance/general-expenses" },
        { id: "supplier-ledger", icon: FileSpreadsheet, label: lang === "ar" ? "دفتر الموردين" : "Supplier Ledger", path: "/ledger/suppliers" },
        { id: "client-ledger", icon: FileSpreadsheet, label: lang === "ar" ? "دفتر العملاء" : "Client Ledger", path: "/ledger/clients" }
      ]
    },
    {
      id: "hr",
      label: lang === "ar" ? "الموارد البشرية" : "Human Resources",
      icon: UserCircle,
      items: [
        { id: "users", icon: Users, label: lang === "ar" ? "المستخدمين" : "Users", path: "/users" }
      ]
    },
    {
      id: "reports",
      label: lang === "ar" ? "التقارير" : "Reports",
      icon: FileText,
      items: [
        { id: "reports", icon: FileText, label: lang === "ar" ? "التقارير" : "Reports", path: "/reports" }
      ]
    }
  ];

  return (
    <>
      {/* Toggle button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`fixed top-1/2 -translate-y-1/2 ${
          lang === "ar" 
            ? isOpen ? "right-52" : "right-0"
            : isOpen ? "left-52" : "left-0"
        } z-50 bg-gradient-to-br from-blue-600 to-blue-700 text-white shadow-xl p-1 border-y border-blue-500 hover:from-blue-700 hover:to-blue-800 transition-all duration-300 hover:scale-105`}
        style={{
          borderTopLeftRadius: lang === "ar" ? "0.75rem" : "0",
          borderBottomLeftRadius: lang === "ar" ? "0.75rem" : "0",
          borderTopRightRadius: lang === "ar" ? "0" : "0.75rem",
          borderBottomRightRadius: lang === "ar" ? "0" : "0.75rem"
        }}
      >
        {isOpen ? <ChevronUp size={20} className="rotate-90" /> : <ChevronDown size={20} className="-rotate-90" />}
      </button>

      {/* Sidebar */}
      <aside
        className={`fixed top-16 ${
          lang === "ar" ? "right-0" : "left-0"
        } h-[calc(100vh-4rem)] bg-gradient-to-b from-slate-50 to-slate-100 shadow-2xl border-r border-slate-200 overflow-y-auto transition-all duration-300 ${
          isOpen ? "w-62" : "w-0"
        } custom-scrollbar ${lang === "ar" ? "border-l border-r-0" : ""}`}
      >
        <div className={`p-4 ${isOpen ? "block" : "hidden"}`}>
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
                    onClick={() => navigate(section.path)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 font-medium ${
                      isActive
                        ? "bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg shadow-blue-200"
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
                  {isExpanded ? (
                    <ChevronUp size={16} className="text-slate-400" />
                  ) : (
                    <ChevronDown size={16} className="text-slate-400" />
                  )}
                </button>

                {isExpanded && (
                  <ul className="mt-2 space-y-1">
                    {section.items.map((item) => {
                      const ItemIcon = item.icon;
                      const isActive = isActivePath(item.path);
                      
                      return (
                        <li key={item.id}>
                          <button
                            onClick={() => navigate(item.path)}
                            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all duration-200 text-sm ${
                              lang === "ar" ? "pr-12" : "pl-12"
                            } ${
                              isActive
                                ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-100"
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
        </div>
      </aside>

      {/* Overlay — mobile only */}
      {isOpen && (
        <div
          onClick={() => setIsOpen(false)}
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
        />
      )}

      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: linear-gradient(to bottom, #3b82f6, #2563eb);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(to bottom, #2563eb, #1d4ed8);
        }
      `}</style>
    </>
  );
}