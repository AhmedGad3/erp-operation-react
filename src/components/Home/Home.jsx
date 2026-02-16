import { Outlet } from "react-router-dom";
import { useState, useContext } from "react";
import Sidebar from "../SideBar/SideBar";
import Navbar from "../Navbar/Navbar";
import { LanguageContext } from '../../context/LanguageContext';

export default function Home() {
  const { lang, setLang } = useContext(LanguageContext);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false); // ✅ يبدأ مقفول

  const dir = lang === "ar" ? "rtl" : "ltr";

  return (
    <div dir={dir} className="h-screen bg-gray-50 overflow-hidden">
      <Navbar 
        lang={lang} 
        setLang={setLang} 
        isSidebarOpen={isSidebarOpen}
      />

      <Sidebar
        lang={lang}
        isOpen={isSidebarOpen}
        setIsOpen={setIsSidebarOpen}
      />

      <main
        className={`pt-16 h-screen overflow-y-auto transition-all duration-300 ${
          lang === "ar" 
            ? isSidebarOpen ? "mr-64" : "mr-0"
            : isSidebarOpen ? "ml-64" : "ml-0"
        }`}
      >
        <div className="p-6 min-h-full">
          <Outlet />
        </div>
      </main>
    </div>
  );
}