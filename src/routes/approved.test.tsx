import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { dateStringSortingFn, nullableBooleanSortingFn } from '../sortingFns';
import Approved from './approved';

const mocks = vi.hoisted(() => ({
  navigateMock: vi.fn(),
  useQueryMock: vi.fn(),
  tableProps: null as {
    columns: Array<{ id?: string; sortingFn?: unknown }>;
    onClick?: (row: { original: { blmPointId: string; id: string } }) => void;
  } | null,
}));

vi.mock('react-router', () => ({
  useNavigate: () => mocks.navigateMock,
}));

vi.mock('@tanstack/react-query', () => ({
  useQuery: mocks.useQueryMock,
}));

vi.mock('@ugrc/utah-design-system', () => ({
  useFirestore: () => ({ firestore: {} }),
  Spinner: { minDelay: vi.fn() },
  Banner: () => null,
}));

vi.mock('../components/TableLoader', () => ({
  TableLoader: () => null,
}));

vi.mock('../components/Table', () => ({
  default: (props: {
    columns: Array<{ id?: string; sortingFn?: unknown }>;
    onClick?: (row: { original: { blmPointId: string; id: string } }) => void;
  }) => {
    mocks.tableProps = props;

    return null;
  },
}));

vi.mock('../hooks/useTableFilters', () => ({
  useTableFilters: () => ({
    columnFilters: [],
    setColumnFilters: vi.fn(),
    renderTextFilterControl: () => null,
    renderSelectFilterControl: () => null,
    renderDateRangeFilterControl: () => null,
  }),
  caseInsensitiveIncludesFilter: vi.fn(),
  dateRangeFilter: vi.fn(),
  mrrcFilter: vi.fn(),
}));

describe('approved.tsx', () => {
  beforeEach(() => {
    mocks.navigateMock.mockReset();
    mocks.tableProps = null;

    mocks.useQueryMock.mockReturnValue({
      status: 'success',
      data: [],
      error: null,
    });
  });

  it('uses a row click handler that navigates with blmPointId and id', () => {
    renderToStaticMarkup(<Approved />);

    expect(mocks.tableProps).not.toBeNull();
    expect(mocks.tableProps?.onClick).toBeDefined();

    mocks.tableProps?.onClick?.({
      original: {
        id: 'test-id',
        blmPointId: 'BLM-123',
      },
    });

    expect(mocks.navigateMock).toHaveBeenCalledWith('/secure/received/BLM-123/test-id');
  });

  it('passes real approved columns with sorting functions to Table', () => {
    renderToStaticMarkup(<Approved />);

    expect(mocks.tableProps).not.toBeNull();
    const columns = mocks.tableProps?.columns ?? [];

    const sortableColumns = columns.filter((column) => column.id !== 'id');
    expect(sortableColumns).not.toHaveLength(0);
    sortableColumns.forEach((column) => {
      expect(column.sortingFn).toBeDefined();
    });

    const dateColumn = columns.find((column) => column.id === 'date');
    const mrrcColumn = columns.find((column) => column.id === 'mrrc');

    expect(dateColumn?.sortingFn).toBe(dateStringSortingFn);
    expect(mrrcColumn?.sortingFn).toBe(nullableBooleanSortingFn);
  });
});
