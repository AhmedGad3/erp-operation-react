import { Outlet } from "react-router-dom";
import { useState, useContext } from "react";
import Navbar from "../Navbar/Navbar";
import Sidebar from "../SideBar/SideBar";
import { LanguageContext } from "../../context/LanguageContext";

export default function Layout() {
  const [isOpen, setIsOpen] = useState(typeof window !== "undefined" ? window.innerWidth >= 1024 : true);
  const { lang } = useContext(LanguageContext);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar
        isSidebarOpen={isOpen}
        onToggleSidebar={() => setIsOpen((o) => !o)}
      />

      <Sidebar lang={lang} isOpen={isOpen} setIsOpen={setIsOpen} />

      {/* Page content — offset only on desktop when sidebar is open */}
      <div
        className={`pt-16 transition-all duration-300 ${
          isOpen
            ? lang === "ar" ? "lg:mr-64" : "lg:ml-64"
            : ""
        }`}
      >
        <Outlet />
      </div>
    </div>
  );
}