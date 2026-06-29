import type { ColumnFiltersState } from '@tanstack/react-table';
import { mrrcCellText } from '../sortingFns';

const DATE_ONLY_VALUE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const FILTER_QUERY_PARAM_PREFIX = 'filter_';

export const readFiltersFromSearch = (search: string): ColumnFiltersState => {
  const params = new URLSearchParams(search);

  return Array.from(params.entries())
    .filter(([key, value]) => key.startsWith(FILTER_QUERY_PARAM_PREFIX) && value)
    .map(([key, value]) => ({ id: key.replace(FILTER_QUERY_PARAM_PREFIX, ''), value }));
};

export const buildSearchWithFilters = (baseSearch: string, filters: ColumnFiltersState): string => {
  const params = new URLSearchParams(baseSearch);

  for (const key of Array.from(params.keys())) {
    if (key.startsWith(FILTER_QUERY_PARAM_PREFIX)) {
      params.delete(key);
    }
  }

  for (const filter of filters) {
    const value = String(filter.value ?? '').trim();

    if (value) {
      params.set(`${FILTER_QUERY_PARAM_PREFIX}${filter.id}`, value);
    }
  }

  const nextSearch = params.toString();
  return nextSearch ? `?${nextSearch}` : '';
};

const parseRowDate = (value: string): Date => {
  if (DATE_ONLY_VALUE_REGEX.test(value)) {
    return new Date(`${value}T00:00:00`);
  }

  return new Date(value);
};

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
    return false;
  }

  const cellDate = parseRowDate(cellValue);
  if (Number.isNaN(cellDate.getTime())) {
    return false;
  }

  const startDate = startStr ? new Date(`${startStr}T00:00:00`) : null;
  const endDate = endStr ? new Date(`${endStr}T23:59:59.999`) : null;

  const validStartDate = startDate && !Number.isNaN(startDate.getTime()) ? startDate : null;
  const validEndDate = endDate && !Number.isNaN(endDate.getTime()) ? endDate : null;

  if (validStartDate && cellDate < validStartDate) {
    return false;
  }

  if (validEndDate && cellDate > validEndDate) {
    return false;
  }

  return true;
};
