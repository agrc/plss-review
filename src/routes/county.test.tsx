import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import County from './county';

const mocks = vi.hoisted(() => ({
  navigateMock: vi.fn(),
  useQueryMock: vi.fn(),
  useMutationMock: vi.fn(),
  useQueryClientMock: vi.fn(),
  tableProps: null as {
    onClick?: (row: { original: { blmPointId: string; id: string } }) => void;
  } | null,
}));

vi.mock('react-router', () => ({
  useNavigate: () => mocks.navigateMock,
}));

vi.mock('@tanstack/react-query', () => ({
  useQuery: mocks.useQueryMock,
  useMutation: mocks.useMutationMock,
  useQueryClient: mocks.useQueryClientMock,
}));

vi.mock('@ugrc/utah-design-system', () => ({
  useFirestore: () => ({ firestore: {} }),
  Spinner: { minDelay: vi.fn() },
  Banner: () => null,
  AlertDialog: () => null,
  Button: () => null,
  Modal: () => null,
}));

vi.mock('react-hook-form', () => ({
  useForm: () => ({
    control: {},
    handleSubmit: () => () => undefined,
  }),
}));

vi.mock('react-aria-components', () => ({
  DialogTrigger: () => null,
}));

vi.mock('../components/RejectionReasons', () => ({
  RejectionReasons: () => null,
}));

vi.mock('../components/TableLoader', () => ({
  TableLoader: () => null,
}));

vi.mock('../components/Table', () => ({
  default: (props: { onClick?: (row: { original: { blmPointId: string; id: string } }) => void }) => {
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

describe('county.tsx', () => {
  beforeEach(() => {
    mocks.navigateMock.mockReset();
    mocks.tableProps = null;

    mocks.useQueryMock.mockReturnValue({
      status: 'success',
      data: [],
      error: null,
    });

    mocks.useMutationMock.mockReturnValue({
      mutate: vi.fn(),
      status: 'idle',
    });

    mocks.useQueryClientMock.mockReturnValue({
      invalidateQueries: vi.fn(),
      prefetchQuery: vi.fn(),
    });
  });

  it('uses a row click handler that navigates with blmPointId and id', () => {
    renderToStaticMarkup(<County />);

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
});
