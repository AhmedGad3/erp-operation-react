import React, { useContext } from "react";
import { LanguageContext } from "../../context/LanguageContext";

const InvoiceTable = ({ columns, rows }) => {
  const { lang } = useContext(LanguageContext);
  const isAr = lang === "ar";

  const cols = isAr ? [...columns].reverse() : columns;

  return (
    <table className="w-full border-collapse mb-6">
      <thead>
        <tr className="bg-blue-900 text-white">
          {cols.map((col) => (
            <th
              key={col.key}
              className={`px-3 py-2 text-sm font-bold ${
                col.align || (isAr ? "text-right" : "text-left")
              }`}
            >
              {col.label}
            </th>
          ))}
        </tr>
      </thead>

      <tbody>
        {rows.map((row, i) => (
          <tr
            key={i}
            className={`border-b ${
              i % 2 === 0 ? "bg-white" : "bg-gray-50"
            }`}
          >
            {cols.map((col) => (
              <td
                key={col.key}
                className={`px-3 py-2 text-sm ${
                  col.align || (isAr ? "text-right" : "text-left")
                }`}
              >
                {row[col.key] ?? "-"}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
};

export default InvoiceTable;