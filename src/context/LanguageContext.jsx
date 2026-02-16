import { createContext, useState, useMemo } from "react";
import { translations } from "../utils/translations";

export const LanguageContext = createContext(null);

export default function LanguageProvider({ children }) {
  const [lang, setLang] = useState("en");

  const t = useMemo(() => {
    return translations[lang];
  }, [lang]);

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
}
