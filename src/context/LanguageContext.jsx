import { createContext, useState, useMemo } from "react";
import { translations } from "../utils/translations";

export const LanguageContext = createContext(null);

export default function LanguageProvider({ children }) {
  const [lang, setLang] = useState(() => localStorage.getItem("lang") || "ar");

  const t = useMemo(() => {
    return translations[lang];
  }, [lang]);

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
