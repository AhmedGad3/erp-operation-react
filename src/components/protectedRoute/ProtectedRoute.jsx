import { Navigate, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import axiosInstance from "../../utils/axiosInstance";
import UnauthorizedPage from "../Unauthorizedpage/Unauthorizedpage";

export default function ProtectedRoute({ children, requiredRole }) {
  const location = useLocation();

  // ── 1. token check أولاً ──
  if (!localStorage.getItem("token")) {
    return <Navigate to="/login" replace />;
  }

  // ── 2. لو مفيش requiredRole → دخول حر (زي الداشبورد) ──
  if (!requiredRole) return children;

  // ── 3. لو فيه requiredRole → اعمل check من الباكند ──
  return <RoleCheck requiredRole={requiredRole}>{children}</RoleCheck>;
}

function RoleCheck({ children, requiredRole }) {
  const [status, setStatus] = useState("loading");
  const lang = localStorage.getItem("lang") || "ar";
  const isAr = lang !== "en";

  useEffect(() => {
    axiosInstance
      .get("/me", { skipLang: true })
      .then((res) => {
        const user = res.data?.result || res.data?.user || res.data;
        const roles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
        setStatus(roles.includes(user?.role) ? "ok" : "denied");
      })
      .catch(() => setStatus("denied"));
  }, [requiredRole]);

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
          <p className="text-sm text-gray-400">
            {isAr ? "جاري التحقق من الصلاحيات..." : "Checking permissions..."}
          </p>
        </div>
      </div>
    );
  }

  if (status === "denied") return <UnauthorizedPage />;

  return children;
}