import type { ColumnFiltersState } from '@tanstack/react-table';
import { Button, TextField } from '@ugrc/utah-design-system';
import { useEffect, useState } from 'react';
import { DateRangePicker } from '../components/DateRangePicker';
import { buildSearchWithFilters, readFiltersFromSearch } from './tableFilters';

const TEXT_FILTER_INPUT_CLASS =
  'w-full h-9 appearance-none rounded border border-gray-300 bg-white px-2 py-1 text-sm text-gray-800 placeholder-gray-500 focus:border-blue-500 focus:outline-none dark:bg-gray-700 dark:text-white dark:placeholder-gray-400';

export {
  buildSearchWithFilters,
  caseInsensitiveIncludesFilter,
  dateRangeFilter,
  mrrcFilter,
  readFiltersFromSearch,
} from './tableFilters';

const readFiltersFromLocation = (): ColumnFiltersState => {
  if (typeof window === 'undefined') {
    return [];
  }

  return readFiltersFromSearch(window.location.search);
};

const areFiltersEqual = (a: ColumnFiltersState, b: ColumnFiltersState): boolean => {
  if (a.length !== b.length) {
    return false;
  }

  return a.every((filter, index) => filter.id === b[index]?.id && String(filter.value) === String(b[index]?.value));
};

// Hook
export const useTableFilters = () => {
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>(() => readFiltersFromLocation());

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const syncFromLocation = () => {
      const locationFilters = readFiltersFromLocation();

      setColumnFilters((previousFilters) =>
        areFiltersEqual(previousFilters, locationFilters) ? previousFilters : locationFilters,
      );
    };

    window.addEventListener('popstate', syncFromLocation);

    return () => {
      window.removeEventListener('popstate', syncFromLocation);
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const nextSearch = buildSearchWithFilters(window.location.search, columnFilters);

    if (nextSearch === window.location.search) {
      return;
    }

    const nextUrl = `${window.location.pathname}${nextSearch}${window.location.hash}`;
    window.history.replaceState(window.history.state, '', nextUrl);
  }, [columnFilters]);

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
        <div className="min-w-0 flex-1">
          <TextField
            label=""
            aria-label={placeholder}
            value={value}
            onChange={(newValue) => setColumnFilter(columnId, newValue)}
            inputProps={{
              placeholder,
              className: TEXT_FILTER_INPUT_CLASS,
            }}
          />
        </div>
        {value && (
          <Button
            variant="icon"
            size="small"
            onPress={() => setColumnFilter(columnId, '')}
            aria-label={`Clear ${columnId} filter`}
          >
            ✕
          </Button>
        )}
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
          <Button
            variant="icon"
            size="small"
            onPress={() => setColumnFilter(columnId, '')}
            aria-label={`Clear ${columnId} filter`}
          >
            ✕
          </Button>
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
