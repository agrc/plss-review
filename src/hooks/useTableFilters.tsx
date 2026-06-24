import type { ColumnFiltersState } from '@tanstack/react-table';
import { useState } from 'react';
import { DateRangePicker } from '../components/DateRangePicker';
import { mrrcCellText } from '../sortingFns';

const TEXT_FILTER_INPUT_CLASS =
  'w-full h-9 appearance-none rounded border border-gray-300 bg-white px-2 py-1 text-sm text-gray-800 placeholder-gray-500 focus:border-blue-500 focus:outline-none dark:bg-gray-700 dark:text-white dark:placeholder-gray-400';

// Filter functions
export const caseInsensitiveIncludesFilter = (
  row: { getValue: <TValue>(columnId: string) => TValue },
  columnId: string,
  filterValue: string,
) => {
  const cellValue = row.getValue<string | undefined>(columnId) ?? '';
  return cellValue.toLowerCase().includes(filterValue.toLowerCase());
};

export const mrrcFilter = (
  row: { getValue: <TValue>(columnId: string) => TValue },
  columnId: string,
  filterValue: string,
) => {
  if (!filterValue) {
    return true;
  }

  return mrrcCellText(row.getValue<boolean | undefined>(columnId)).toLowerCase() === filterValue.toLowerCase();
};

export const dateRangeFilter = (
  row: { getValue: <TValue>(columnId: string) => TValue },
  columnId: string,
  filterValue: string,
) => {
  if (!filterValue || !filterValue.includes('|')) {
    return true;
  }

  const [startStr, endStr] = filterValue.split('|');
  const cellValue = row.getValue<string>(columnId);

  if (!cellValue) {
    return true;
  }

  const cellDate = new Date(cellValue);
  const startDate = startStr ? new Date(startStr) : null;
  const endDate = endStr ? new Date(endStr) : null;

  if (startDate && cellDate < startDate) {
    return false;
  }

  if (endDate && cellDate > endDate) {
    return false;
  }

  return true;
};

// Hook
export const useTableFilters = () => {
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);

  const getFilterValue = (columnId: string) => (columnFilters.find((f) => f.id === columnId)?.value as string) || '';

  const setColumnFilter = (columnId: string, value: string) => {
    setColumnFilters((prev) => {
      const withoutColumn = prev.filter((f) => f.id !== columnId);

      if (!value) {
        return withoutColumn;
      }

      return [...withoutColumn, { id: columnId, value }];
    });
  };

  const renderTextFilterControl = (columnId: string, placeholder = 'Filter...') => {
    const value = getFilterValue(columnId);

    return (
      <div className="flex gap-2">
        <input
          type="text"
          placeholder={placeholder}
          value={value}
          onChange={(e) => setColumnFilter(columnId, e.target.value)}
          className={TEXT_FILTER_INPUT_CLASS}
        />
        {value && (
          <button
            type="button"
            onClick={() => setColumnFilter(columnId, '')}
            className="rounded bg-gray-200 px-2 py-1 text-sm hover:bg-gray-300 dark:bg-gray-600 dark:hover:bg-gray-500"
            aria-label={`Clear ${columnId} filter`}
          >
            ✕
          </button>
      </div>
    );
  };

  const renderSelectFilterControl = (
    columnId: string,
    options: { label: string; value: string }[],
    ariaLabel: string,
  ) => {
    const value = getFilterValue(columnId);

    return (
      <select
        value={value}
        onChange={(e) => setColumnFilter(columnId, e.target.value)}
        className={TEXT_FILTER_INPUT_CLASS}
        aria-label={ariaLabel}
      >
        {options.map((option) => (
          <option key={option.value || 'all'} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    );
  };

  const renderDateRangeFilterControl = (
    columnId: string = 'date',
    widthClass: string = 'max-w-64',
    compact: boolean = false,
  ) => {
    const filterValue = getFilterValue(columnId);

    return (
      <div className="flex gap-2">
        <div className={`w-full min-w-0 ${widthClass}`}>
          <DateRangePicker
            label={`${columnId} date range`}
            value={filterValue}
            onChange={(newValue) => setColumnFilter(columnId, newValue)}
            compact={compact}
          />
        </div>
        {filterValue && filterValue !== '|' && (
          <button
            onClick={() => setColumnFilter(columnId, '')}
            className="rounded bg-gray-200 px-2 py-1 text-sm hover:bg-gray-300 dark:bg-gray-600 dark:hover:bg-gray-500"
            aria-label={`Clear ${columnId} filter`}
          >
            ✕
          </button>
        )}
      </div>
    );
  };

  return {
    columnFilters,
    setColumnFilters,
    getFilterValue,
    setColumnFilter,
    renderTextFilterControl,
    renderSelectFilterControl,
    renderDateRangeFilterControl,
  };
};
