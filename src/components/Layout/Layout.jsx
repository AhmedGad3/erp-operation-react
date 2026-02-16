import { Outlet } from "react-router-dom";
import { useState } from "react";
import Navbar from "../Navbar/Navbar";
import Sidebar from "../SideBar/SideBar";
import { useContext } from "react";
import { LanguageContext } from "../../context/LanguageContext";

export default function Layout() {
  const [isOpen, setIsOpen] = useState(true);

  const { lang } = useContext(LanguageContext);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <Sidebar
        lang={lang}
        isOpen={isOpen}
        setIsOpen={setIsOpen}
      />

      <div
        className={`pt-16 transition-all duration-300 ${
          isOpen
            ? lang === "ar"
              ? "mr-64"
              : "ml-64"
            : "ml-0 mr-0"
        }`}
      >
        <Outlet />
      </div>
    </div>
  );
}
