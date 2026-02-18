import { Outlet } from "react-router-dom";
import { useState, useContext } from "react";
import Sidebar from "../SideBar/SideBar";
import Navbar from "../Navbar/Navbar";
import { LanguageContext } from "../../context/LanguageContext";

export default function Home() {
  const { lang, setLang } = useContext(LanguageContext);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const dir = lang === "ar" ? "rtl" : "ltr";

  return (
    <div dir={dir} className="h-screen bg-gray-50 overflow-hidden">
      <Navbar
        lang={lang}
        setLang={setLang}
        isSidebarOpen={isSidebarOpen}
        onToggleSidebar={() => setIsSidebarOpen((o) => !o)}
      />

      <Sidebar
        lang={lang}
        isOpen={isSidebarOpen}
        setIsOpen={setIsSidebarOpen}
      />

      <main
        className={`pt-16 h-screen overflow-y-auto transition-all duration-300 ${
          isSidebarOpen
            ? lang === "ar" ? "lg:mr-64" : "lg:ml-64"
            : ""
        }`}
      >
        <div className="p-3 sm:p-6 min-h-full">
          <Outlet />
        </div>
      </main>
    </div>
  );
}