import { describe, expect, it } from 'vitest';
import {
  buildSearchWithFilters,
  caseInsensitiveIncludesFilter,
  dateRangeFilter,
  mrrcFilter,
  readFiltersFromSearch,
} from './useTableFilters';

describe('caseInsensitiveIncludesFilter', () => {
  const createRow = (value: string | undefined) =>
    ({
      getValue: () => value,
    }) as { getValue: <TValue>(_columnId: string) => TValue };

  it('should return some results when searching for Beaver (Utah county)', () => {
    const row = createRow('Beaver');
    const result = caseInsensitiveIncludesFilter(row, 'name', 'Beaver');
    expect(result).toBe(true);
  });

  it('should return nothing when searching for Idaho (not a Utah county)', () => {
    const row = createRow('Beaver');
    const result = caseInsensitiveIncludesFilter(row, 'name', 'Idaho');
    expect(result).toBe(false);
  });

  it('should be case insensitive when searching for Beaver', () => {
    const row = createRow('Beaver');
    expect(caseInsensitiveIncludesFilter(row, 'name', 'beaver')).toBe(true);
    expect(caseInsensitiveIncludesFilter(row, 'name', 'BEAVER')).toBe(true);
    expect(caseInsensitiveIncludesFilter(row, 'name', 'BeAvEr')).toBe(true);
  });

  it('should handle empty search term and return true', () => {
    const row = createRow('Beaver');
    const result = caseInsensitiveIncludesFilter(row, 'name', '');
    expect(result).toBe(true);
  });

  it('should handle undefined cell value', () => {
    const row = createRow(undefined);
    const result = caseInsensitiveIncludesFilter(row, 'name', 'Beaver');
    expect(result).toBe(false);
  });

  it('should find partial matches', () => {
    const row = createRow('Beaver');
    expect(caseInsensitiveIncludesFilter(row, 'name', 'Bea')).toBe(true);
    expect(caseInsensitiveIncludesFilter(row, 'name', 'ver')).toBe(true);
  });

  it('should work with other Utah county names', () => {
    const saltLakeRow = createRow('Salt Lake');
    expect(caseInsensitiveIncludesFilter(saltLakeRow, 'name', 'Salt Lake')).toBe(true);
    expect(caseInsensitiveIncludesFilter(saltLakeRow, 'name', 'Idaho')).toBe(false);

    const utahCountyRow = createRow('Utah');
    expect(caseInsensitiveIncludesFilter(utahCountyRow, 'name', 'Utah')).toBe(true);
    expect(caseInsensitiveIncludesFilter(utahCountyRow, 'name', 'Idaho')).toBe(false);
  });
});

describe('mrrcFilter', () => {
  const createRow = (value: boolean | undefined) =>
    ({
      getValue: () => value,
    }) as { getValue: <TValue>(_columnId: string) => TValue };

  it('should return true when filter value is empty', () => {
    const row = createRow(true);
    const result = mrrcFilter(row, 'mrrc', '');
    expect(result).toBe(true);
  });

  it('should match Yep/Nope/Unknown values (case-insensitive)', () => {
    expect(mrrcFilter(createRow(true), 'mrrc', 'yep')).toBe(true);
    expect(mrrcFilter(createRow(true), 'mrrc', 'nope')).toBe(false);
    expect(mrrcFilter(createRow(false), 'mrrc', 'nope')).toBe(true);
    expect(mrrcFilter(createRow(undefined), 'mrrc', 'unknown')).toBe(true);
    expect(mrrcFilter(createRow(undefined), 'mrrc', 'yep')).toBe(false);
  });
});

describe('dateRangeFilter', () => {
  const createRow = (value: string | undefined) =>
    ({
      getValue: () => value,
    }) as { getValue: <TValue>(_columnId: string) => TValue };

  it('should return true when filter value is empty', () => {
    const row = createRow('2024-01-15');
    const result = dateRangeFilter(row, 'date', '');
    expect(result).toBe(true);
  });

  it('should return true when filter value has no pipe separator', () => {
    const row = createRow('2024-01-15');
    const result = dateRangeFilter(row, 'date', '2024-01-01');
    expect(result).toBe(true);
  });

  it('should filter dates within range', () => {
    const row = createRow('2024-01-15');
    const result = dateRangeFilter(row, 'date', '2024-01-01|2024-01-31');
    expect(result).toBe(true);
  });

  it('should exclude dates before start date', () => {
    const row = createRow('2024-01-01');
    const result = dateRangeFilter(row, 'date', '2024-01-15|2024-01-31');
    expect(result).toBe(false);
  });

  it('should exclude dates after end date', () => {
    const row = createRow('2024-02-01');
    const result = dateRangeFilter(row, 'date', '2024-01-01|2024-01-31');
    expect(result).toBe(false);
  });

  it('should exclude rows with missing values when a range is active', () => {
    const row = createRow(undefined);
    const result = dateRangeFilter(row, 'date', '2024-01-01|2024-01-31');
    expect(result).toBe(false);
  });

  it('should exclude rows with invalid date strings when a range is active', () => {
    const row = createRow('Unknown');
    const result = dateRangeFilter(row, 'date', '2024-01-01|2024-01-31');
    expect(result).toBe(false);
  });

  it('should include timestamps later on the selected end date', () => {
    const row = createRow('2024-01-31T15:30:00');
    const result = dateRangeFilter(row, 'date', '2024-01-01|2024-01-31');
    expect(result).toBe(true);
  });
});

describe('combined filters', () => {
  type TestRow = {
    county: string;
    date: string;
    submitter: string;
    blmPointId: string;
  };

  const createRow = (row: TestRow) =>
    ({
      getValue<TValue>(columnId: string) {
        return row[columnId as keyof TestRow] as TValue;
      },
    }) as { getValue: <TValue>(columnId: string) => TValue };

  const applyCombinedFilters = (
    rows: TestRow[],
    filters: Array<(row: { getValue: <TValue>(columnId: string) => TValue }) => boolean>,
  ) => rows.filter((row) => filters.every((filterFn) => filterFn(createRow(row))));

  it('should combine County and Date filters', () => {
    const rows: TestRow[] = [
      {
        county: 'Beaver',
        date: '2024-01-10',
        submitter: 'Raccoon Peach',
        blmPointId: 'UT260030S0060W0_160340',
      },
      {
        county: 'Beaver',
        date: '2024-02-20',
        submitter: 'Jackal Apple',
        blmPointId: 'UT260030S0060W0_160341',
      },
      {
        county: 'Utah',
        date: '2024-01-15',
        submitter: 'Coyote Plum',
        blmPointId: 'UT260030S0060W0_160342',
      },
    ];

    const filtered = applyCombinedFilters(rows, [
      (row) => caseInsensitiveIncludesFilter(row, 'county', 'Beaver'),
      (row) => dateRangeFilter(row, 'date', '2024-01-01|2024-01-31'),
    ]);

    expect(filtered).toHaveLength(1);
    expect(filtered[0]?.county).toBe('Beaver');
    expect(filtered[0]?.date).toBe('2024-01-10');
  });

  it('should combine Submitter and BlmPointId filters', () => {
    const rows: TestRow[] = [
      {
        county: 'Beaver',
        date: '2024-01-10',
        submitter: 'Raccoon Peach',
        blmPointId: 'UT260030S0060W0_160340',
      },
      {
        county: 'Beaver',
        date: '2024-02-20',
        submitter: 'Raccoon Apple',
        blmPointId: 'UT260030S0060W0_160341',
      },
      {
        county: 'Utah',
        date: '2024-01-15',
        submitter: 'Jackal Apple',
        blmPointId: 'UT260030S0060W0_160340',
      },
    ];

    const filtered = applyCombinedFilters(rows, [
      (row) => caseInsensitiveIncludesFilter(row, 'submitter', 'Raccoon'),
      (row) => caseInsensitiveIncludesFilter(row, 'blmPointId', '160340'),
    ]);

    expect(filtered).toHaveLength(1);
    expect(filtered[0]?.submitter).toBe('Raccoon Peach');
    expect(filtered[0]?.blmPointId).toBe('UT260030S0060W0_160340');
  });
});

describe('filtering and sorting together', () => {
  type TestRow = {
    county: string;
    date: string;
    submitter: string;
    blmPointId: string;
  };

  const createRow = (row: TestRow) =>
    ({
      getValue<TValue>(columnId: string) {
        return row[columnId as keyof TestRow] as TValue;
      },
    }) as { getValue: <TValue>(columnId: string) => TValue };

  it('should apply filter and then sort by date', () => {
    const rows: TestRow[] = [
      {
        county: 'Beaver',
        date: '2024-03-15',
        submitter: 'Raccoon Peach',
        blmPointId: 'UT260030S0060W0_160340',
      },
      {
        county: 'Utah',
        date: '2024-01-10',
        submitter: 'Jackal Apple',
        blmPointId: 'UT260030S0060W0_160341',
      },
      {
        county: 'Beaver',
        date: '2024-01-05',
        submitter: 'Coyote Plum',
        blmPointId: 'UT260030S0060W0_160342',
      },
      {
        county: 'Beaver',
        date: '2024-02-20',
        submitter: 'Raccoon Apple',
        blmPointId: 'UT260030S0060W0_160343',
      },
    ];

    // Apply filter: only Beaver county
    const filtered = rows.filter((row) => caseInsensitiveIncludesFilter(createRow(row), 'county', 'Beaver'));

    // Then sort by date (ascending)
    const sorted = filtered.sort((a, b) => a.date.localeCompare(b.date));

    // Verify filter worked (only Beaver rows)
    expect(sorted).toHaveLength(3);
    expect(sorted.every((row) => row.county === 'Beaver')).toBe(true);

    // Verify sort worked (dates in order)
    expect(sorted[0]?.date).toBe('2024-01-05');
    expect(sorted[1]?.date).toBe('2024-02-20');
    expect(sorted[2]?.date).toBe('2024-03-15');
  });

  it('should apply sort and then filter by submitter name', () => {
    const rows: TestRow[] = [
      {
        county: 'Beaver',
        date: '2024-03-15',
        submitter: 'Zebra Fox',
        blmPointId: 'UT260030S0060W0_160340',
      },
      {
        county: 'Utah',
        date: '2024-01-10',
        submitter: 'Raccoon Peach',
        blmPointId: 'UT260030S0060W0_160341',
      },
      {
        county: 'Beaver',
        date: '2024-01-05',
        submitter: 'Raccoon Apple',
        blmPointId: 'UT260030S0060W0_160342',
      },
    ];

    // Sort by submitter (ascending)
    const sorted = rows.sort((a, b) => a.submitter.localeCompare(b.submitter));

    // Then apply filter: submitters starting with Raccoon
    const filtered = sorted.filter((row) => caseInsensitiveIncludesFilter(createRow(row), 'submitter', 'Raccoon'));

    // Verify sort worked (alphabetically ordered before filter)
    expect(sorted[0]?.submitter).toBe('Raccoon Apple');

    // Verify filter worked (only Raccoon submitters)
    expect(filtered).toHaveLength(2);
    expect(filtered.every((row) => row.submitter.includes('Raccoon'))).toBe(true);

    // Verify both worked: filtered results are sorted
    expect(filtered[0]?.submitter).toBe('Raccoon Apple');
    expect(filtered[1]?.submitter).toBe('Raccoon Peach');
  });
});

describe('URL filter persistence helpers', () => {
  it('reads filter params from query string', () => {
    const filters = readFiltersFromSearch('?filter_county=Beaver&foo=bar&filter_mrrc=yep');

    expect(filters).toEqual([
      { id: 'county', value: 'Beaver' },
      { id: 'mrrc', value: 'yep' },
    ]);
  });

  it('writes filter params while preserving unrelated query params', () => {
    const nextSearch = buildSearchWithFilters('?foo=bar&filter_old=remove-me', [
      { id: 'county', value: 'Utah' },
      { id: 'submitter', value: 'Raccoon' },
    ]);

    const params = new URLSearchParams(nextSearch);
    expect(params.get('foo')).toBe('bar');
    expect(params.get('filter_county')).toBe('Utah');
    expect(params.get('filter_submitter')).toBe('Raccoon');
    expect(params.has('filter_old')).toBe(false);
  });

  it('omits empty filter values from search params', () => {
    const nextSearch = buildSearchWithFilters('?foo=bar', [
      { id: 'county', value: '' },
      { id: 'submitter', value: '  ' },
    ]);

    expect(nextSearch).toBe('?foo=bar');
  });
});
