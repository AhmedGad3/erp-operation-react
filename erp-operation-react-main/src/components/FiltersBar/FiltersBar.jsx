import React, { useState } from 'react';
import { Calendar, Search, Download, Filter, X, FileText, ChevronDown } from 'lucide-react';

const FiltersBar = ({
  dateFrom,
  setDateFrom,
  dateTo,
  setDateTo,
  searchTerm,
  setSearchTerm,
  showColumnFilters,
  setShowColumnFilters,
  activeFilterCount,
  columnFilters,
  setColumnFilters,
  columns,
  isAr,
  onExportExcel,
  onExportPDF,
}) => {
  const [showExportMenu, setShowExportMenu] = useState(false);

  const handleExportExcel = () => {
    onExportExcel();
    setShowExportMenu(false);
  };

  const handleExportPDF = () => {
    onExportPDF();
    setShowExportMenu(false);
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Date From */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            <Calendar className="w-4 h-4 inline mr-1" />
            {isAr ? 'من تاريخ' : 'From Date'}
          </label>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
        </div>

        {/* Date To */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            <Calendar className="w-4 h-4 inline mr-1" />
            {isAr ? 'إلى تاريخ' : 'To Date'}
          </label>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
        </div>

        {/* Search */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            <Search className="w-4 h-4 inline mr-1" />
            {isAr ? 'بحث' : 'Search'}
          </label>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={isAr ? 'بحث في كل الأعمدة...' : 'Search all columns...'}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
        </div>

        {/* Filter Icon + Export Dropdown */}
        <div className="flex gap-2">
          {/* Filter Button */}
          <button
            onClick={() => setShowColumnFilters(!showColumnFilters)}
            className={`p-2 rounded-lg transition border font-semibold text-sm relative ${
              showColumnFilters || activeFilterCount > 0
                ? 'bg-indigo-50 border-indigo-400 text-indigo-700'
                : 'bg-gray-100 border-gray-200 text-gray-700 hover:bg-gray-200'
            }`}
            title={isAr ? 'فلتر' : 'Filter'}
          >
            <Filter className="w-5 h-5" />
            {activeFilterCount > 0 && (
              <span className="absolute -top-1 -right-1 inline-flex items-center justify-center w-5 h-5 bg-indigo-600 text-white text-xs rounded-full">
                {activeFilterCount}
              </span>
            )}
          </button>

          {/* Export Dropdown */}
          <div className="relative flex-1">
            <button
              onClick={() => setShowExportMenu(!showExportMenu)}
              className="w-full px-4 py-5 bg-gray-50 text-black rounded-lg hover:border-2 border-gray-700 focus:ring-2 ring-gray-500 transition font-semibold text-sm flex items-center justify-center gap-2"
            >
              <Download className="w-4 h-4" />
              {isAr ? 'تصدير' : 'Export'}
              <ChevronDown className="w-4 h-4" />
            </button>
            {showExportMenu && (
              <>
                {/* Backdrop */}
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowExportMenu(false)}
                />
                {/* Dropdown Menu */}
                <div className="absolute top-full mt-1 right-0 bg-white rounded-lg shadow-xl border border-gray-200 py-1 z-20 min-w-[140px]">
                  <button
                    onClick={handleExportExcel}
                    className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-green-50 hover:text-green-700 transition flex items-center gap-2"
                  >
                    <FileText className="w-4 h-4" />
                    Excel
                  </button>
                  <button
                    onClick={handleExportPDF}
                    className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-red-50 hover:text-red-700 transition flex items-center gap-2"
                  >
                    <FileText className="w-4 h-4" />
                    PDF
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Active filter pills */}
      {(searchTerm || activeFilterCount > 0) && (
        <div className="mt-4 pt-4 border-t border-gray-200 flex flex-wrap gap-2">
          {searchTerm && (
            <div className="flex items-center gap-2 px-3 py-1 bg-indigo-100 text-indigo-800 rounded-full text-sm">
              <Search className="w-3 h-3" />
              <span>{searchTerm}</span>
              <button onClick={() => setSearchTerm('')}>
                <X className="w-3 h-3" />
              </button>
            </div>
          )}
          {Object.keys(columnFilters).map((key) =>
            columnFilters[key] ? (
              <div
                key={key}
                className="flex items-center gap-2 px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm"
              >
                <span>
                  {columns.find((c) => c.key === key)?.[isAr ? 'labelAr' : 'labelEn']}:{' '}
                  {columnFilters[key]}
                </span>
                <button
                  onClick={() =>
                    setColumnFilters({ ...columnFilters, [key]: '' })
                  }
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ) : null
          )}
        </div>
      )}
    </div>
  );
};

export default FiltersBar;