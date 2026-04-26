import { createContext, useState, useMemo, useEffect } from "react";
import { translations } from "../utils/translations";

export const LanguageContext = createContext(null);

export default function LanguageProvider({ children }) {
  const [lang, setLang] = useState(() => localStorage.getItem("lang") || "ar");

  /* ── sync dir + lang attribute on <html> whenever lang changes ── */
  useEffect(() => {
    document.documentElement.dir  = lang === "ar" ? "rtl" : "ltr";
    document.documentElement.lang = lang;
  }, [lang]);

  const t = useMemo(() => translations[lang], [lang]);

  const handleSetLang = (newLang) => {
    localStorage.setItem("lang", newLang);
    setLang(newLang);
  };

  return (
    <LanguageContext.Provider value={{ lang, setLang: handleSetLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
}