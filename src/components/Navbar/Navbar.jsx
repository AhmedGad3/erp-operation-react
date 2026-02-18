import { useState, useContext } from "react";
import { AuthContext } from "../../context/AuthContext";
import { LanguageContext } from "../../context/LanguageContext";
import { Globe, ChevronDown, LogOut, Menu } from "lucide-react";
import { useNavigate } from "react-router-dom";

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
        className="bg-white shadow-sm border-b border-gray-200 fixed top-0 left-0 right-0 z-50"
        style={{ height: "4rem" }}
      >
        <div className="h-full px-3 sm:px-6 flex items-center justify-between gap-2">

          {/* ── LEFT: Hamburger + Logo ── */}
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            {/* Hamburger button — visible only on mobile */}
            <button
              onClick={onToggleSidebar}
              className="lg:hidden flex items-center justify-center w-9 h-9 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors flex-shrink-0"
              aria-label="Toggle sidebar"
            >
              <Menu size={20} className="text-gray-700" />
            </button>

            {/* Logo */}
            <div
              onClick={() => navigate("/")}
              className="flex items-center gap-2 sm:gap-3 cursor-pointer select-none group"
            >
              <svg
                className="w-8 h-8 sm:w-10 sm:h-10 transition-transform group-hover:scale-105 flex-shrink-0"
                viewBox="0 0 26 26"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <rect x="4"  y="8"  width="6" height="14" rx="1" className="fill-blue-600" />
                <rect x="11" y="4"  width="6" height="18" rx="1" className="fill-blue-500" />
                <rect x="18" y="10" width="4" height="12" rx="1" className="fill-blue-400" />
                <rect x="6"  y="10" width="2" height="2"  fill="white" />
                <rect x="6"  y="14" width="2" height="2"  fill="white" />
                <rect x="13" y="7"  width="2" height="2"  fill="white" />
                <rect x="13" y="11" width="2" height="2"  fill="white" />
                <rect x="13" y="15" width="2" height="2"  fill="white" />
              </svg>
              <h1 className="text-base sm:text-xl font-bold text-gray-800 group-hover:text-blue-600 transition-colors">
                <span className="hidden sm:inline">
                  {lang === "ar" ? "نظام إدارة الشركات" : "ERP Mega Build"}
                </span>
                <span className="sm:hidden">ERP</span>
              </h1>
            </div>
          </div>

          {/* ── RIGHT: User menu + Language ── */}
          <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
            {!user ? (
              <button
                onClick={() => navigate("/login")}
                className="px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg bg-blue-500 text-white hover:bg-blue-600 transition-colors text-sm"
              >
                {lang === "ar" ? "دخول" : "Login"}
              </button>
            ) : (
              <div className="relative">
                <button
                  onClick={() => setShowUserMenu((s) => !s)}
                  className="flex items-center gap-1.5 sm:gap-3 px-2 sm:px-4 py-1.5 sm:py-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors"
                >
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-blue-500 text-white flex items-center justify-center text-xs sm:text-sm font-semibold flex-shrink-0">
                    {getInitials(user.name)}
                  </div>
                  <div className={`hidden sm:block ${lang === "ar" ? "text-right" : "text-left"}`}>
                    <p className="text-sm font-medium text-gray-800">{user.name}</p>
                    <p className="text-xs text-gray-500 capitalize">{user.role}</p>
                  </div>
                  <ChevronDown
                    size={14}
                    className={`text-gray-500 transition-transform duration-200 ${showUserMenu ? "rotate-180" : ""}`}
                  />
                </button>

                {showUserMenu && (
                  <div className={`absolute ${lang === "ar" ? "left-0" : "right-0"} mt-2 w-60 sm:w-64 bg-white rounded-lg shadow-xl border border-gray-200 z-50`}>
                    <div className="p-4 border-b border-gray-200">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 text-white flex items-center justify-center text-base font-semibold flex-shrink-0">
                          {getInitials(user.name)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-gray-800 truncate text-sm">{user.name}</p>
                          <p className="text-xs text-gray-500 truncate">{user.email}</p>
                          <p className="text-xs text-gray-400 mt-0.5 capitalize">{user.role}</p>
                        </div>
                      </div>
                    </div>
                    <div className="p-2">
                      <button
                        onClick={() => { logout(); setShowUserMenu(false); navigate("/login"); }}
                        className={`w-full px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors flex items-center gap-2 ${lang === "ar" ? "flex-row-reverse" : ""}`}
                      >
                        <LogOut size={16} />
                        <span className="font-medium">{lang === "ar" ? "تسجيل الخروج" : "Logout"}</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            <button
              onClick={() => setLang(lang === "en" ? "ar" : "en")}
              className="flex items-center gap-1 sm:gap-2 px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-lg bg-blue-500 text-white hover:bg-blue-600 transition-colors text-sm"
            >
              <Globe size={16} />
              <span className="font-medium">{lang === "en" ? "AR" : "EN"}</span>
            </button>
          </div>
        </div>

        {showUserMenu && <div className="fixed inset-0 z-20" onClick={() => setShowUserMenu(false)} />}
      </header>
    </>
  );
}