import { useContext } from "react";
import { LanguageContext } from "../../context/LanguageContext";

export default function FullPageLoader({ text, overlay = true }) {
  const { lang, t } = useContext(LanguageContext);
  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center ${
        overlay ? "bg-white/80 backdrop-blur-sm" : ""
      }`}
    >
      <div className="text-center">
        <div
          className="animate-spin inline-block size-12 border-4 border-current border-t-transparent text-blue-600 rounded-full"
          role="status"
          aria-label="loading"
        >
          <span className="sr-only">Loading...</span>
        </div>

        <p className="mt-4 text-gray-600 font-medium">
          {text || "Loading..."}
        </p>
      </div>
    </div>
  );
}
