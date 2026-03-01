import React, { forwardRef, useContext } from "react";
import megabuildLogo from "../../assets/megabuild1.svg";
import { LanguageContext } from "../../context/LanguageContext";

const InvoiceLayout = forwardRef(
  (
    {
      title,
      preparedBy,
      badgeRight,
      children,
    },
    ref
  ) => {
    const { lang } = useContext(LanguageContext);
    const isAr = lang === "ar";

    return (
      <div
        ref={ref}
        dir={isAr ? "rtl" : "ltr"}
        className="bg-white w-[800px] mx-auto font-sans text-gray-800"
      >
        {/* HEADER */}
        <div className="flex justify-between items-start px-8 pt-6 pb-4 border-b">
          <div>
            <img src={megabuildLogo} className="w-16 mb-2" />
            <p className="text-xs text-gray-400">
              {isAr ? "نبني القيمة" : "We Build Value"}
            </p>
          </div>

          <div className="text-right space-y-1">
            <div className="flex items-baseline gap-2 justify-end">
              <span className="text-2xl font-black text-red-700">
                MEGA
              </span>
              <span className="text-2xl font-black text-blue-900">
                BUILD
              </span>
            </div>

            <div className="bg-blue-900 text-white px-4 py-1 rounded text-sm font-bold inline-block mt-2">
              {title}
            </div>

            <p className="text-sm text-gray-600">
              {new Date().toLocaleDateString(
                isAr ? "ar-EG" : "en-US",
                { year: "numeric", month: "long", day: "numeric" }
              )}
            </p>
          </div>
        </div>

        {/* INFO BAR */}
        <div className="flex justify-between items-center px-8 py-4 bg-blue-50 border-b">
          <div>
            <p className="text-xs font-bold text-blue-900 uppercase">
              {isAr ? "من قبل" : "Prepared By"}
            </p>
            <p className="font-bold">
              {preparedBy?.name || "N/A"}
            </p>
            <p className="text-sm text-gray-600">
              {preparedBy?.email}
            </p>
          </div>

          {badgeRight && (
            <div className="text-right">
              <p className="text-xs font-bold text-blue-900 uppercase">
                {badgeRight.label}
              </p>
              <p className="text-xl font-black text-blue-900">
                {badgeRight.value}
              </p>
            </div>
          )}
        </div>

        {/* BODY */}
        <div className="px-8 py-6">
          {children}
        </div>

        {/* FOOTER */}
        <div className="border-t px-8 py-4 text-center text-xs text-gray-500 bg-gray-50">
          {isAr
            ? "هذا تقرير من إنتاج الكمبيوتر"
            : "This is a computer-generated report"}{" "}
          —{" "}
          {new Date().toLocaleString(
            isAr ? "ar-EG" : "en-US"
          )}
        </div>

        <div className="flex h-6">
          <div className="w-[38%] bg-blue-900" />
          <div className="w-[2%]" />
          <div className="flex-1 bg-red-700" />
        </div>
      </div>
    );
  }
);

export default InvoiceLayout;