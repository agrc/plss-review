import type { Row } from '@tanstack/react-table';

const parseDate = (value: string): number | null => {
  const ms = Date.parse(value);
  return Number.isNaN(ms) ? null : ms;
};

export const dateStringSortingFn = <TData>(rowA: Row<TData>, rowB: Row<TData>, columnId: string): number => {
  const timeA = parseDate(rowA.getValue<string>(columnId));
  const timeB = parseDate(rowB.getValue<string>(columnId));

  if (timeA === null && timeB === null) return 0;
  if (timeA === null) return -1;
  if (timeB === null) return 1;
  return timeA - timeB;
};

const rankNullableBoolean = (value: boolean | undefined): number => {
  if (value === undefined) {
    return 0;
  }

  return value ? 2 : 1;
};

export const nullableBooleanSortingFn = <TData>(rowA: Row<TData>, rowB: Row<TData>, columnId: string): number => {
  return (
    rankNullableBoolean(rowA.getValue<boolean | undefined>(columnId)) -
    rankNullableBoolean(rowB.getValue<boolean | undefined>(columnId))
  );
};

export const mrrcCellText = (value: boolean | undefined): string => {
  if (value === undefined) {
    return 'Unknown';
  }

  return value ? 'Yep' : 'Nope';
};

export const localeStringSortingFn = <TData>(rowA: Row<TData>, rowB: Row<TData>, columnId: string): number => {
  const valueA = rowA.getValue<string>(columnId);
  const valueB = rowB.getValue<string>(columnId);
  return valueA.localeCompare(valueB);
};
