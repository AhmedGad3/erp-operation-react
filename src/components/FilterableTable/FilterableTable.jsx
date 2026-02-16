import { useState, useMemo } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";
import { Input } from '../ui/input';
import { Button } from '../ui/button';

export default function FilterableTable({ 
  data, 
  columns, 
  lang,
  t,
  onAction,
  renderActions
}) {
  const [filters, setFilters] = useState(() => {
    const initialFilters = {};
    columns.forEach(col => {
      if (col.filterable !== false) {
        initialFilters[col.key] = '';
      }
    });
    return initialFilters;
  });

  const filteredData = useMemo(() => {
    return data.filter(row => {
      return columns.every(col => {
        if (col.filterable === false) return true;
        
        const filterValue = filters[col.key];
        if (!filterValue) return true;
        
        // Get the raw value from row first
        const rawValue = row[col.key];
        const cellValue = col.accessor ? col.accessor(row) : rawValue;
        
        if (col.filterType === 'select') {
          // For select, compare with the raw value or mapped value
          if (col.options) {
            const option = col.options.find(opt => opt.value === filterValue);
            if (option) {
              // Check if the raw value matches the filter value
              return rawValue === filterValue || cellValue === option.label || cellValue === option.labelAr;
            }
          }
          return rawValue === filterValue || cellValue === filterValue;
        }
        
        if (col.filterType === 'date') {
          if (!cellValue) return false;
          const cellDate = typeof cellValue === 'string' ? cellValue.split('T')[0] : cellValue;
          const filterDate = filterValue.split('T')[0];
          return cellDate.includes(filterDate);
        }
        
        if (col.filterType === 'number') {
          if (cellValue === null || cellValue === undefined) return false;
          return cellValue.toString().includes(filterValue);
        }
        
        // Default: text search
        if (!cellValue) return false;
        const searchValue = typeof cellValue === 'string' 
          ? cellValue.toLowerCase() 
          : cellValue?.toString().toLowerCase() || '';
        return searchValue.includes(filterValue.toLowerCase());
      });
    });
  }, [data, filters, columns]);

  const renderFilter = (column) => {
    if (column.filterable === false) {
      return <div className="text-xs font-medium text-gray-500">{column.header}</div>;
    }

    if (column.filterType === 'select' && column.options) {
      return (
        <div className="space-y-2">
          <div className="text-xs font-medium text-gray-500">{column.header}</div>
          <select
            value={filters[column.key] || ''}
            onChange={(e) => setFilters({ ...filters, [column.key]: e.target.value })}
            className="h-8 w-full rounded-md border border-input bg-background px-2 py-1 text-sm"
          >
            <option value="">{t.all || 'All'}</option>
            {column.options.map(opt => (
              <option key={opt.value} value={opt.value}>
                {lang === 'ar' && opt.labelAr ? opt.labelAr : opt.label}
              </option>
            ))}
          </select>
        </div>
      );
    }

    if (column.filterType === 'date') {
      return (
        <div className="space-y-2">
          <div className="text-xs font-medium text-gray-500">{column.header}</div>
          <Input
            type="date"
            value={filters[column.key] || ''}
            onChange={(e) => setFilters({ ...filters, [column.key]: e.target.value })}
            className="h-8 text-sm"
          />
        </div>
      );
    }

    // Default: text input
    return (
      <div className="space-y-2">
        <div className="text-xs font-medium text-gray-500">{column.header}</div>
        <Input
          placeholder={t.search || 'Search'}
          value={filters[column.key] || ''}
          onChange={(e) => setFilters({ ...filters, [column.key]: e.target.value })}
          className="h-8 text-sm"
        />
      </div>
    );
  };

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-gray-50 border-b">
            {columns.map((column) => (
              <TableHead 
                key={column.key}
                className={`${column.width ? `w-[${column.width}]` : ''} border-r last:border-r-0`}
              >
                {renderFilter(column)}
              </TableHead>
            ))}
            {renderActions && (
              <TableHead className="w-[120px] border-r">
                <div className="text-xs font-medium text-gray-500">{t.actions}</div>
              </TableHead>
            )}
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredData.length === 0 ? (
            <TableRow>
              <TableCell colSpan={columns.length + (renderActions ? 1 : 0)} className="text-center py-8 text-gray-500">
                {t.noData}
              </TableCell>
            </TableRow>
          ) : (
            filteredData.map((row, index) => (
              <TableRow key={row.id || index} className="hover:bg-gray-50 border-b">
                {columns.map((column) => {
                  const cellValue = column.accessor ? column.accessor(row) : row[column.key];
                  const displayValue = column.render ? column.render(cellValue, row) : cellValue;
                  
                  return (
                    <TableCell key={column.key} className={`${column.className || ''} border-r last:border-r-0`}>
                      {displayValue}
                    </TableCell>
                  );
                })}
                {renderActions && (
                  <TableCell className="border-r">
                    {renderActions(row)}
                  </TableCell>
                )}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}

