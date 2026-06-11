import type { Row } from '@tanstack/react-table';
import { describe, expect, it } from 'vitest';
import { dateStringSortingFn, localeStringSortingFn, mrrcCellText, nullableBooleanSortingFn } from './sortingFns';

const createRow = <TData>(values: Record<string, unknown>): Row<TData> => {
  return {
    getValue: <TValue>(columnId: string) => values[columnId] as TValue,
  } as unknown as Row<TData>;
};

describe('dateStringSortingFn', () => {
  it('sorts valid date strings in ascending order', () => {
    const rowA = createRow({ date: '2026-01-01T00:00:00.000Z' });
    const rowB = createRow({ date: '2026-01-02T00:00:00.000Z' });

    const result = dateStringSortingFn(rowA, rowB, 'date');

    expect(result).toBeLessThan(0);
  });

  it('puts invalid date strings before valid date strings', () => {
    const rowA = createRow({ date: 'not-a-date' });
    const rowB = createRow({ date: '2026-01-02T00:00:00.000Z' });

    const result = dateStringSortingFn(rowA, rowB, 'date');

    expect(result).toBe(-1);
  });

  it('considers two invalid date strings equal', () => {
    const rowA = createRow({ date: 'not-a-date' });
    const rowB = createRow({ date: 'also-not-a-date' });

    const result = dateStringSortingFn(rowA, rowB, 'date');

    expect(result).toBe(0);
  });
});

describe('nullableBooleanSortingFn', () => {
  it('orders undefined before false before true', () => {
    const undefinedRow = createRow({ value: undefined });
    const falseRow = createRow({ value: false });
    const trueRow = createRow({ value: true });

    expect(nullableBooleanSortingFn(undefinedRow, falseRow, 'value')).toBeLessThan(0);
    expect(nullableBooleanSortingFn(falseRow, trueRow, 'value')).toBeLessThan(0);
    expect(nullableBooleanSortingFn(undefinedRow, trueRow, 'value')).toBeLessThan(0);
  });

  it('returns 0 when values have same nullable-boolean rank', () => {
    const rowA = createRow({ value: false });
    const rowB = createRow({ value: false });

    const result = nullableBooleanSortingFn(rowA, rowB, 'value');

    expect(result).toBe(0);
  });
});

describe('mrrcCellText', () => {
  it('returns Yep for true', () => {
    expect(mrrcCellText(true)).toBe('Yep');
  });

  it('returns Nope for false', () => {
    expect(mrrcCellText(false)).toBe('Nope');
  });

  it('returns Unknown for undefined', () => {
    expect(mrrcCellText(undefined)).toBe('Unknown');
  });
});

describe('localeStringSortingFn', () => {
  it('sorts strings alphabetically using localeCompare', () => {
    const rowA = createRow({ name: 'Alpha' });
    const rowB = createRow({ name: 'Beta' });

    const result = localeStringSortingFn(rowA, rowB, 'name');

    expect(result).toBeLessThan(0);
  });

  it('returns 0 for equivalent strings', () => {
    const rowA = createRow({ name: 'Same' });
    const rowB = createRow({ name: 'Same' });

    const result = localeStringSortingFn(rowA, rowB, 'name');

    expect(result).toBe(0);
  });
});
