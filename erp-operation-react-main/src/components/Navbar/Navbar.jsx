import { useState, useContext } from "react";
import { AuthContext } from "../../context/AuthContext";
import { LanguageContext } from "../../context/LanguageContext";
import { Globe, ChevronDown, LogOut, Menu } from "lucide-react";
import { useNavigate } from "react-router-dom";
import logo from "../../assets/megabuild1.svg";

export default function Navbar({ isSidebarOpen, onToggleSidebar }) {
  const { lang, setLang } = useContext(LanguageContext);
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const [showUserMenu, setShowUserMenu] = useState(false);

  const getInitials = (name = "") =>
    name.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase();

  return (
    <>
      <style data-global-scrollbar>{`
        ::-webkit-scrollbar { width: 8px; height: 8px; }
        ::-webkit-scrollbar-track { background: #f1f5f9; border-radius: 10px; }
        ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
        ::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
        * { scrollbar-width: thin; scrollbar-color: #cbd5e1 #f1f5f9; }
      `}</style>

      <header
        className="bg-white border-b border-gray-200 fixed top-0 left-0 right-0 z-50"
        style={{ height: "4rem" }}
      >
        <div className="h-full px-4 sm:px-6 flex items-center justify-between gap-2">

          {/* ── LEFT: Hamburger + Logo ── */}
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={onToggleSidebar}
              className="lg:hidden flex items-center justify-center w-9 h-9 rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors flex-shrink-0"
              aria-label="Toggle sidebar"
            >
              <Menu size={18} className="text-gray-600" />
            </button>

            <div
              onClick={() => navigate("/")}
              className="flex items-center gap-2.5 cursor-pointer select-none group"
            >
              <img
                src={logo}
                alt="MegaBuild Logo"
                className="w-8 h-8 sm:w-9 sm:h-9 transition-transform group-hover:scale-105 flex-shrink-0"
              />
              <h1 className="text-base sm:text-lg font-bold text-gray-900 group-hover:text-indigo-600 transition-colors">
                <span className="hidden sm:inline">
                  {lang === "ar" ? "نظام إدارة الشركات" : "ERP Mega Build"}
                </span>
                <span className="sm:hidden">ERP</span>
              </h1>
            </div>
          </div>

          {/* ── RIGHT: Lang toggle + User ── */}
          <div className="flex items-center gap-2 flex-shrink-0">

            {/* Language Toggle */}
            <button
              onClick={() => setLang(lang === "en" ? "ar" : "en")}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors text-sm font-medium text-gray-700"
            >
              <Globe size={15} className="text-indigo-500" />
              <span>{lang === "en" ? "العربية" : "English"}</span>
            </button>

            {/* User / Login */}
            {!user ? (
              <button
                onClick={() => navigate("/login")}
                className="px-4 py-2 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 transition-colors text-sm font-medium"
              >
                {lang === "ar" ? "دخول" : "Login"}
              </button>
            ) : (
              <div className="relative">
                <button
                  onClick={() => setShowUserMenu((s) => !s)}
                  className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors"
                >
                  {/* Avatar */}
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs font-bold flex-shrink-0">
                    {getInitials(user.name)}
                  </div>
                  {/* Name + Role */}
                  <div className={`hidden sm:block ${lang === "ar" ? "text-right" : "text-left"}`}>
                    <p className="text-sm font-medium text-gray-900 leading-tight">{user.name}</p>
                    <p className="text-xs text-gray-400 capitalize leading-tight">{user.role}</p>
                  </div>
                  <ChevronDown
                    size={14}
                    className={`text-gray-400 transition-transform duration-200 ${showUserMenu ? "rotate-180" : ""}`}
                  />
                </button>

                {/* Dropdown */}
                {showUserMenu && (
                  <div className={`absolute ${lang === "ar" ? "left-0" : "right-0"} mt-2 w-60 bg-white border border-gray-200 rounded-2xl shadow-lg z-50 overflow-hidden`}>
                    {/* User info */}
                    <div className="p-4 border-b border-gray-100">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-sm font-bold flex-shrink-0">
                          {getInitials(user.name)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-gray-900 truncate text-sm">{user.name}</p>
                          <p className="text-xs text-gray-400 truncate">{user.email}</p>
                          <p className="text-xs text-gray-400 capitalize mt-0.5">{user.role}</p>
                        </div>
                      </div>
                    </div>
                    {/* Logout */}
                    <div className="p-2">
                      <button
                        onClick={() => { logout(); setShowUserMenu(false); navigate("/login"); }}
                        className={`w-full px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 rounded-xl transition-colors flex items-center gap-2 font-medium ${lang === "ar" ? "flex-row-reverse" : ""}`}
                      >
                        <LogOut size={15} />
                        <span>{lang === "ar" ? "تسجيل الخروج" : "Logout"}</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Backdrop */}
        {showUserMenu && (
          <div className="fixed inset-0 z-20" onClick={() => setShowUserMenu(false)} />
        )}
      </header>
    </>
  );
}