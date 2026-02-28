import { useNavigate } from "react-router-dom";
import { useContext } from "react";
import { LanguageContext } from "../../context/LanguageContext";

export default function UnauthorizedPage() {
  const navigate = useNavigate();
  const { lang } = useContext(LanguageContext);
  const isAr = lang === "ar";

  const t = {
    code:  "403",
    title: isAr ? "الوصول مقيّد"       : "Access Restricted",
    body:  isAr
      ? "ليس لديك صلاحية للوصول إلى هذه الصفحة. يرجى التواصل مع المسؤول لطلب صلاحيات الوصول اللازمة."
      : "You don't have permission to access this page. Please contact your administrator to request the necessary access privileges.",
    hint:  isAr
      ? "إذا كنت تعتقد أن هذا خطأ، تواصل مع مدير المشروع أو مسؤول النظام."
      : "If you believe this is an error, reach out to your project manager or system admin.",
    btn:   isAr ? "العودة إلى لوحة التحكم" : "Back to Dashboard",
  };

  return (
    <div
      dir={isAr ? "rtl" : "ltr"}
      className="min-h-screen flex flex-col items-center justify-center px-4 text-center"
      style={{ background: "#F0EFED" }}
    >
      {/* Shield icon */}
      <div className="relative mb-8">
        <div
          className="absolute rounded-full"
          style={{
            width: "110px", height: "110px",
            top: "50%", left: "50%",
            transform: "translate(-50%, -50%)",
            background: "radial-gradient(circle, rgba(245,166,35,0.18) 0%, rgba(245,166,35,0.06) 60%, transparent 80%)",
          }}
        />
        <div
          className="relative w-16 h-16 rounded-2xl flex items-center justify-center"
          style={{ background: "#2D3142", boxShadow: "0 4px 20px rgba(0,0,0,0.18)" }}
        >
          <svg viewBox="0 0 24 24" className="w-9 h-9" fill="none">
            <path
              d="M12 3L4 7v5c0 5.25 3.67 10.15 8 11.35C16.33 22.15 20 17.25 20 12V7l-8-4z"
              stroke="#F5A623" strokeWidth="1.8" fill="none"
            />
            <line x1="3" y1="3" x2="21" y2="21" stroke="#F5A623" strokeWidth="1.8" strokeLinecap="round"/>
          </svg>
        </div>
      </div>

      {/* 403 */}
      <p
        className="font-black leading-none mb-5 select-none"
        style={{ fontSize: "clamp(90px, 14vw, 140px)", color: "#DDDBD7", letterSpacing: "-3px", lineHeight: 1 }}
      >
        {t.code}
      </p>

      {/* Title */}
      <h1 className="font-bold text-gray-900 mb-3" style={{ fontSize: "clamp(22px, 3vw, 30px)" }}>
        {t.title}
      </h1>

      {/* Body */}
      <p className="text-gray-500 max-w-sm leading-relaxed mb-8" style={{ fontSize: "15px" }}>
        {t.body}
      </p>

      {/* Hint box — الأيقونة على اليمين في RTL تلقائياً بسبب flex + dir */}
      <div
        className="flex items-center gap-3 rounded-xl px-5 py-4 mb-8 max-w-sm w-full"
        style={{ background: "#FDF6E9", border: "1px solid #F5DFA0" }}
      >
        <svg viewBox="0 0 24 24" className="w-5 h-5 shrink-0" fill="none" stroke="#F5A623" strokeWidth="2">
          <rect x="3" y="11" width="18" height="11" rx="2"/>
          <path d="M7 11V7a5 5 0 0 1 10 0v4" strokeLinecap="round"/>
        </svg>
        <p className="text-sm leading-relaxed text-start" style={{ color: "#B07D1A" }}>{t.hint}</p>
      </div>

      {/* Button — السهم يتعكس مع dir تلقائياً ← تبقى → في RTL */}
      <button
        onClick={() => navigate("/")}
        className="flex items-center gap-2 px-8 py-3.5 rounded-xl font-bold text-white text-base transition-all hover:opacity-90 active:scale-95"
        style={{ background: "#F5A623", boxShadow: "0 4px 16px rgba(245,166,35,0.35)" }}
      >
        <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
          <path d="M19 12H5M12 5l-7 7 7 7"/>
        </svg>
        <span>{t.btn}</span>
      </button>
    </div>
  );
}