import { useState, useContext } from "react";
import { AuthContext } from "../../context/AuthContext";
import { Globe, ChevronDown, LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function Header({ lang, setLang }) {
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
    <header
      className="bg-white shadow-sm border-b border-gray-200 fixed top-0 left-0 right-0 z-40"
      style={{ height: "4rem" }}
    >
      <div className="px-4 py-1  flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">
<i className="fa-solid fa-gears"></i>

          {lang === "ar" ? "نظام إدارة الشركات" : "ERP Mega Build "}
        </h1>

        <div className="flex items-center gap-4">
          {/* ===== USER AREA ===== */}
          {!user ? (
            // ===== NOT LOGGED IN =====
            <button
              onClick={() => navigate("/login")}
              className="px-4 py-2 rounded-lg bg-blue-500 text-white hover:bg-blue-600 transition-colors"
            >
              {lang === "ar" ? "تسجيل الدخول" : "Login"}
            </button>
          ) : (
            // ===== LOGGED IN =====
            <div className="relative">
              <button
                onClick={() => setShowUserMenu((s) => !s)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors"
              >
                <div className="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center text-sm font-semibold">
                  {getInitials(user.name)}
                </div>

                <div className={`${lang === "ar" ? "text-right" : "text-left"}`}>
                  <p className="text-sm font-medium text-gray-800">
                    {user.name}
                  </p>
                  <p className="text-xs text-gray-500">{user.role}</p>
                </div>

                <ChevronDown size={16} className="text-gray-500" />
              </button>

              {showUserMenu && (
                <div
                  className={`absolute ${
                    lang === "ar" ? "left-0" : "right-0"
                  } mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 z-50`}
                >
                  <div className="p-1 border-b border-gray-200">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-blue-500 text-white flex items-center justify-center text-lg font-semibold">
                        {getInitials(user.name)}
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-gray-800">
                          {user.name}
                        </p>
                        <p className="text-sm text-gray-500">{user.email}</p>
                        <p className="text-xs text-gray-400 mt-1">
                          {user.role}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="p-1">
                    <button
                      onClick={() => {
                        logout();
                        setShowUserMenu(false);
                        navigate("/login");
                      }}
                      className="w-full text-right px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors flex items-center gap-2"
                    >
                      <LogOut size={16} />
                      <span>
                        {lang === "ar" ? "تسجيل الخروج" : "Logout"}
                      </span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ===== LANGUAGE TOGGLE ===== */}
          <button
            onClick={() => setLang(lang === "en" ? "ar" : "en")}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-500 text-white hover:bg-blue-600 transition-colors"
          >
            <Globe size={20} />
            <span>{lang === "en" ? "AR" : "EN"}</span>
          </button>
        </div>
      </div>

      {/* Click outside */}
      {showUserMenu && (
        <div
          className="fixed inset-0 z-30"
          onClick={() => setShowUserMenu(false)}
        />
      )}
    </header>
  );
}
