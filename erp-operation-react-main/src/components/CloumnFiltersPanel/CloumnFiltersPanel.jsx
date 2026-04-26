import React from 'react';
import { Filter, X } from 'lucide-react';

const ColumnFiltersPanel = ({
  showColumnFilters,
  setShowColumnFilters,
  columns,
  columnFilters,
  setColumnFilters,
  activeFilterCount,
  isAr,
}) => {
  return (
    <div
      className="fixed bottom-0 z-40 bg-white shadow-2xl border-l border-gray-200 flex flex-col"
      style={{
        top: '80px',
        width: '320px',
        ...(isAr ? { left: 0 } : { right: 0 }),
        transform: showColumnFilters
          ? 'translateX(0)'
          : isAr
          ? 'translateX(-100%)'
          : 'translateX(100%)',
        transition: 'transform 0.3s ease',
      }}
    >
      {/* Panel Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 bg-gradient-to-r from-indigo-600 to-indigo-700 shrink-0">
        <h3 className="font-bold text-white text-sm flex items-center gap-2">
          <Filter className="w-4 h-4" />
          {isAr ? 'فلتر الأعمدة' : 'Column Filters'}
        </h3>
        <div className="flex items-center gap-3">
          {activeFilterCount > 0 && (
            <button
              onClick={() => setColumnFilters({})}
              className="text-xs text-indigo-200 hover:text-white font-semibold transition"
            >
              {isAr ? 'مسح الكل' : 'Clear All'}
            </button>
          )}
          <button
            onClick={() => setShowColumnFilters(false)}
            className="p-1 rounded hover:bg-white/20 text-indigo-200 hover:text-white transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Filter Inputs */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
        {columns.map((col) => {
          const hasValue = !!columnFilters[col.key];
          return (
            <div key={col.key}>
              <label className="block text-xs font-semibold text-gray-500 mb-1">
                {isAr ? col.labelAr : col.labelEn}
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={columnFilters[col.key] || ''}
                  onChange={(e) =>
                    setColumnFilters({ ...columnFilters, [col.key]: e.target.value })
                  }
                  placeholder={isAr ? 'فلتر...' : 'Filter...'}
                  className={`w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition ${
                    hasValue
                      ? 'border-indigo-400 bg-indigo-50 pr-8'
                      : 'border-gray-300 bg-white'
                  }`}
                />
                {hasValue && (
                  <button
                    onClick={() =>
                      setColumnFilters({ ...columnFilters, [col.key]: '' })
                    }
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-indigo-400 hover:text-indigo-600 transition"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Panel Footer */}
      {activeFilterCount > 0 && (
        <div className="shrink-0 px-5 py-3 border-t border-gray-200 bg-gray-50">
          <p className="text-xs text-gray-500 text-center">
            {isAr
              ? `فلتر فعال: ${activeFilterCount}`
              : `Active filters: ${activeFilterCount}`}
          </p>
        </div>
      )}
    </div>
  );
};

export default ColumnFiltersPanel;