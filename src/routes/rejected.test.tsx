import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Rejected from './rejected';

const mocks = vi.hoisted(() => ({
  navigateMock: vi.fn(),
  useQueryMock: vi.fn(),
  tableProps: null as {
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
  default: (props: { onClick?: (row: { original: { blmPointId: string; id: string } }) => void }) => {
    mocks.tableProps = props;

    return null;
  },
}));

describe('rejected.tsx', () => {
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
    renderToStaticMarkup(<Rejected />);

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
