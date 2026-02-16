
import React from 'react';
import { FileText } from 'lucide-react';

const ReportsTable = ({ columns, filteredData, allData, isAr, activeTab, renderCell }) => {
  return (
    <div className="bg-white rounded-xl shadow-lg overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className="px-6 py-4 text-left text-sm font-semibold text-gray-900 whitespace-nowrap"
                >
                  {isAr ? col.labelAr : col.labelEn}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {filteredData.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-6 py-12 text-center">
                  <div className="flex flex-col items-center text-gray-500">
                    <FileText className="w-12 h-12 mb-3 opacity-50" />
                    <p className="text-lg font-medium">
                      {isAr ? 'لا توجد بيانات' : 'No data found'}
                    </p>
                    <p className="text-sm">
                      {isAr ? 'جرب تغيير الفلاتر' : 'Try adjusting your filters'}
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              filteredData.map((row) => (
                <tr key={row.id} className="hover:bg-gray-50 transition">
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className="px-6 py-4 text-sm text-gray-900 whitespace-nowrap"
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
        <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
          <p className="text-sm text-gray-600">
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