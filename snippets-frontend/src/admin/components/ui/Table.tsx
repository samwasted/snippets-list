// src/components/ui/Table.tsx
import React, { useState } from 'react';

interface Column<T> {
  key: keyof T | string;
  header: string;
  render?: (item: T) => React.ReactNode;
  sortable?: boolean;
  mobileLabel?: string; // For mobile card view
  hideOnMobile?: boolean; // Hide column on mobile
}

interface TableProps<T> {
  data: T[];
  columns: Column<T>[];
  loading?: boolean;
  onSort?: (key: string) => void;
  sortKey?: string;
  sortDirection?: 'asc' | 'desc';
  rowKey?: keyof T | ((item: T, index: number) => string | number);
}

function Table<T extends Record<string, any>>({
  data,
  columns,
  loading = false,
  onSort,
  sortKey,
  sortDirection,
  rowKey
}: TableProps<T>) {
  const [mobileView, setMobileView] = useState('table'); // 'table' or 'cards'

  // Generate unique row key
  const getRowKey = (item: T, index: number): string => {
    if (rowKey) {
      if (typeof rowKey === 'function') {
        return String(rowKey(item, index));
      } else {
        return String(item[rowKey]) || `row-${index}`;
      }
    }
    
    const idField = item.id || item._id || item.key;
    return idField ? String(idField) : `row-${index}`;
  };

  const getColumnKey = (column: Column<T>, columnIndex: number): string => {
    return `col-${columnIndex}-${column.key.toString()}`;
  };

  const getCellKey = (rowKey: string, column: Column<T>, columnIndex: number): string => {
    return `${rowKey}-${getColumnKey(column, columnIndex)}`;
  };

  // Filter columns for mobile view
  const visibleColumns = columns.filter(col => !col.hideOnMobile);
  const primaryColumns = columns.slice(0, 2); // Show first 2 columns on mobile table

  if (loading) {
    return (
      <div className="animate-pulse">
        {/* Desktop loading */}
        <div className="hidden md:block">
          <div className="h-8 bg-gray-200 rounded mb-4"></div>
          {[...Array(5)].map((_, i) => (
            <div key={`loading-row-${i}`} className="h-16 bg-gray-100 rounded mb-2"></div>
          ))}
        </div>
        
        {/* Mobile loading */}
        <div className="md:hidden space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={`mobile-loading-${i}`} className="bg-gray-100 rounded-lg p-4">
              <div className="h-4 bg-gray-200 rounded mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-3/4"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 text-sm">No data available</p>
      </div>
    );
  }

  return (
    <div>
      {/* Mobile view toggle - only show on small screens */}
      <div className="md:hidden mb-4 flex justify-end">
        <div className="inline-flex rounded-lg border border-gray-200 bg-gray-50 p-1">
          <button
            onClick={() => setMobileView('table')}
            className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
              mobileView === 'table'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Table
          </button>
          <button
            onClick={() => setMobileView('cards')}
            className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
              mobileView === 'cards'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Cards
          </button>
        </div>
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block overflow-hidden shadow ring-1 ring-black ring-opacity-5 rounded-lg">
        <table className="min-w-full divide-y divide-gray-300">
          <thead className="bg-gray-50">
            <tr>
              {columns.map((column, columnIndex) => (
                <th
                  key={getColumnKey(column, columnIndex)}
                  className={`px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider transition-colors ${
                    column.sortable ? 'cursor-pointer hover:bg-gray-100' : ''
                  }`}
                  onClick={() => column.sortable && onSort?.(column.key.toString())}
                >
                  <div className="flex items-center space-x-1">
                    <span>{column.header}</span>
                    {column.sortable && sortKey === column.key && (
                      <span className="text-indigo-600 font-bold">
                        {sortDirection === 'asc' ? '↑' : '↓'}
                      </span>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {data.map((item, rowIndex) => {
              const uniqueRowKey = getRowKey(item, rowIndex);
              return (
                <tr key={uniqueRowKey} className="hover:bg-gray-50 transition-colors">
                  {columns.map((column, columnIndex) => (
                    <td 
                      key={getCellKey(uniqueRowKey, column, columnIndex)}
                      className="px-6 py-4 whitespace-nowrap text-sm text-gray-900"
                    >
                      {column.render ? column.render(item) : item[column.key]}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile Views */}
      <div className="md:hidden">
        {mobileView === 'table' ? (
          // Mobile Table View (simplified)
          <div className="overflow-x-auto shadow ring-1 ring-black ring-opacity-5 rounded-lg">
            <table className="min-w-full divide-y divide-gray-300">
              <thead className="bg-gray-50">
                <tr>
                  {primaryColumns.map((column, columnIndex) => (
                    <th
                      key={getColumnKey(column, columnIndex)}
                      className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      {column.header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {data.map((item, rowIndex) => {
                  const uniqueRowKey = getRowKey(item, rowIndex);
                  return (
                    <tr key={uniqueRowKey} className="hover:bg-gray-50">
                      {primaryColumns.map((column, columnIndex) => (
                        <td 
                          key={getCellKey(uniqueRowKey, column, columnIndex)}
                          className="px-4 py-4 text-sm text-gray-900"
                        >
                          {column.render ? column.render(item) : item[column.key]}
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          // Mobile Card View
          <div className="space-y-4">
            {data.map((item, rowIndex) => {
              const uniqueRowKey = getRowKey(item, rowIndex);
              return (
                <div 
                  key={uniqueRowKey} 
                  className="bg-white shadow rounded-lg border border-gray-200 p-4"
                >
                  <div className="space-y-3">
                    {visibleColumns.map((column, columnIndex) => (
                      <div key={getCellKey(uniqueRowKey, column, columnIndex)} className="flex justify-between items-start">
                        <span className="text-sm font-medium text-gray-500 flex-shrink-0 w-1/3">
                          {column.mobileLabel || column.header}:
                        </span>
                        <span className="text-sm text-gray-900 flex-1 text-right">
                          {column.render ? column.render(item) : item[column.key]}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default Table;
