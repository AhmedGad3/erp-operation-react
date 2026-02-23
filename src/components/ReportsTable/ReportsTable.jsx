
import React from 'react';
import { FileText } from 'lucide-react';

const ReportsTable = ({ columns, filteredData, allData, isAr, activeTab, renderCell }) => {
  return (
    <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className="px-4 py-3 text-left text-sm font-medium text-gray-500 whitespace-nowrap"
                >
                  {isAr ? col.labelAr : col.labelEn}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filteredData.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-16 text-center">
                  <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="font-medium text-gray-600">
                    {isAr ? 'لا توجد بيانات' : 'No data found'}
                  </p>
                  <p className="text-sm text-gray-400 mt-1">
                    {isAr ? 'جرب تغيير الفلاتر' : 'Try adjusting your filters'}
                  </p>
                </td>
              </tr>
            ) : (
              filteredData.map((row) => (
                <tr key={row.id} className="hover:bg-gray-50/60 transition">
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className="px-4 py-3.5 text-sm text-gray-900 whitespace-nowrap"
                    >
                      {renderCell(col, row)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {filteredData.length > 0 && (
        <div className="px-4 py-3 border-t border-gray-100">
          <p className="text-sm text-gray-500">
            {isAr
              ? `عرض ${filteredData.length} من ${allData.length} سجل`
              : `Showing ${filteredData.length} of ${allData.length} records`}
          </p>
        </div>
      )}
    </div>
  );
};

export default ReportsTable;