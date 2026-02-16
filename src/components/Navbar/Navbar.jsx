import { useState, useContext } from "react";
import { AuthContext } from "../../context/AuthContext";
import { LanguageContext } from "../../context/LanguageContext";
import { Globe, ChevronDown, LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function Navbar({ isSidebarOpen }) {
  const { lang, setLang, t } = useContext(LanguageContext);
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();

  const [showUserMenu, setShowUserMenu] = useState(false);

  const getInitials = (name = "") => {
    return name
      .split(" ")
      .slice(0, 2)
      .map((w) => w[0])
      .join("")
      .toUpperCase();
  };

  return (
    <>
      {/* Custom Scrollbar Styles */}
      <style data-global-scrollbar>{`
        ::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }
        ::-webkit-scrollbar-track {
          background: #f1f5f9;
          border-radius: 10px;
        }
        ::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 10px;
          transition: background 0.3s ease;
        }
        ::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }
        * {
          scrollbar-width: thin;
          scrollbar-color: #cbd5e1 #f1f5f9;
        }
      `}</style>

      <header
        className={`bg-white shadow-sm border-b border-gray-200 fixed top-0 right-0 z-30 transition-all duration-300 ${
          lang === "ar"
            ? isSidebarOpen
              ? "left-0 right-64"
              : "left-0 right-0"
            : isSidebarOpen
            ? "left-64 right-0"
            : "left-0 right-0"
        }`}
        style={{ height: "4rem" }}
      >
        <div className="h-full px-6 flex justify-between items-center">
          {/* Logo & Title clickable */}
          <div
            onClick={() => navigate("/")}
            className="flex items-center gap-3 cursor-pointer select-none group"
          >
            <svg
              className="size-10 transition-transform group-hover:scale-105"
              width="26"
              height="26"
              viewBox="0 0 26 26"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              {/* Building Base */}
              <rect x="4" y="8" width="6" height="14" rx="1" fill="currentColor" className="fill-blue-600" />
              <rect x="11" y="4" width="6" height="18" rx="1" fill="currentColor" className="fill-blue-500" />
              <rect x="18" y="10" width="4" height="12" rx="1" fill="currentColor" className="fill-blue-400" />
              {/* Windows */}
              <rect x="6" y="10" width="2" height="2" fill="white" />
              <rect x="6" y="14" width="2" height="2" fill="white" />
              <rect x="13" y="7" width="2" height="2" fill="white" />
              <rect x="13" y="11" width="2" height="2" fill="white" />
              <rect x="13" y="15" width="2" height="2" fill="white" />
            </svg>

            <h1 className="text-xl font-bold text-gray-800 group-hover:text-blue-600 transition-colors">
              {lang === "ar" ? "نظام إدارة الشركات" : "ERP Mega Build"}
            </h1>
          </div>

          <div className="flex items-center gap-4">
            {/* USER AREA */}
            {!user ? (
              <button
                onClick={() => navigate("/login")}
                className="px-4 py-2 rounded-lg bg-blue-500 text-white hover:bg-blue-600 transition-colors shadow-sm"
              >
                {lang === "ar" ? "تسجيل الدخول" : "Login"}
              </button>
            ) : (
              <div className="relative">
                <button
                  onClick={() => setShowUserMenu((s) => !s)}
                  className="flex items-center gap-3 px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors"
                >
                  <div className="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center text-sm font-semibold shadow-sm">
                    {getInitials(user.name)}
                  </div>

                  <div className={`${lang === "ar" ? "text-right" : "text-left"}`}>
                    <p className="text-sm font-medium text-gray-800">{user.name}</p>
                    <p className="text-xs text-gray-500 capitalize">{user.role}</p>
                  </div>

                  <ChevronDown
                    size={16}
                    className={`text-gray-500 transition-transform duration-200 ${
                      showUserMenu ? "rotate-180" : ""
                    }`}
                  />
                </button>

                {showUserMenu && (
                  <div
                    className={`absolute ${lang === "ar" ? "left-0" : "right-0"} mt-2 w-64 bg-white rounded-lg shadow-xl border border-gray-200 z-50`}
                  >
                    <div className="p-4 border-b border-gray-200">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 text-white flex items-center justify-center text-lg font-semibold shadow-md">
                          {getInitials(user.name)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-gray-800 truncate">{user.name}</p>
                          <p className="text-sm text-gray-500 truncate">{user.email}</p>
                          <p className="text-xs text-gray-400 mt-1 capitalize">{user.role}</p>
                        </div>
                      </div>
                    </div>

                    <div className="p-2">
                      <button
                        onClick={() => {
                          logout();
                          setShowUserMenu(false);
                          navigate("/login");
                        }}
                        className={`w-full px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors flex items-center gap-2 ${
                          lang === "ar" ? "flex-row-reverse" : ""
                        }`}
                      >
                        <LogOut size={16} />
                        <span className="font-medium">{lang === "ar" ? "تسجيل الخروج" : "Logout"}</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* LANGUAGE TOGGLE */}
            <button
              onClick={() => setLang(lang === "en" ? "ar" : "en")}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-500 text-white hover:bg-blue-600 transition-colors shadow-sm"
            >
              <Globe size={20} />
              <span className="font-medium">{lang === "en" ? "AR" : "EN"}</span>
            </button>
          </div>
        </div>

        {/* Click outside to close menu */}
        {showUserMenu && <div className="fixed inset-0 z-20" onClick={() => setShowUserMenu(false)} />}
      </header>
    </>
  );
}
