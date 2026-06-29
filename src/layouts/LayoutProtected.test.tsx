import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ProtectedLayout from './LayoutProtected';

const mocks = vi.hoisted(() => ({
  navigateMock: vi.fn(),
  tabsProps: null as { onSelectionChange?: (key: string) => void } | null,
  location: {
    pathname: '/secure/received',
  },
}));

type WindowStub = {
  location: {
    pathname: string;
    search: string;
    hash: string;
  };
  sessionStorage: {
    getItem: (key: string) => string | null;
    setItem: (key: string, value: string) => void;
  };
};

const installWindowStub = (initialSearch: string, initialStoredQueries: Record<string, string> = {}): WindowStub => {
  const storage: Record<string, string> = {
    'plss-review:tab-query-by-route': JSON.stringify(initialStoredQueries),
  };

  const windowStub: WindowStub = {
    location: {
      pathname: '/secure/received',
      search: initialSearch,
      hash: '',
    },
    sessionStorage: {
      getItem: (key: string) => (key in storage ? (storage[key] ?? null) : null),
      setItem: (key: string, value: string) => {
        storage[key] = value;
      },
    },
  };

  (globalThis as { window?: WindowStub }).window = windowStub;

  return windowStub;
};

vi.mock('@ugrc/utah-design-system', () => ({
  useFirebaseAuth: () => ({ currentUser: { uid: 'test-user' } }),
  Tabs: (props: { onSelectionChange?: (key: string) => void }) => {
    mocks.tabsProps = props;
    return null;
  },
  TabList: () => null,
  Tab: () => null,
  TabPanel: () => null,
}));

vi.mock('react-router', () => ({
  useNavigate: () => mocks.navigateMock,
  useLocation: () => mocks.location,
  Outlet: () => null,
}));

vi.mock('../components/SubmissionAnalytics', () => ({
  default: () => null,
}));

describe('LayoutProtected tab query persistence', () => {
  beforeEach(() => {
    mocks.navigateMock.mockReset();
    mocks.tabsProps = null;
    mocks.location.pathname = '/secure/received';
  });

  it('restores destination tab query and stores current tab query on tab switch', () => {
    const windowStub = installWindowStub('?filter_county=Beaver', {
      '/secure/county': '?filter_submitter=Raccoon',
    });

    renderToStaticMarkup(<ProtectedLayout />);

    expect(mocks.tabsProps?.onSelectionChange).toBeDefined();
    mocks.tabsProps?.onSelectionChange?.('county');

    expect(mocks.navigateMock).toHaveBeenCalledWith('/secure/county?filter_submitter=Raccoon');

    const stored = windowStub.sessionStorage.getItem('plss-review:tab-query-by-route');
    const parsed = stored ? (JSON.parse(stored) as Record<string, string>) : {};

    expect(parsed['/secure/received']).toBe('?filter_county=Beaver');
  });

  it('navigates to plain route when destination tab has no stored query', () => {
    installWindowStub('?filter_county=Beaver');

    renderToStaticMarkup(<ProtectedLayout />);

    expect(mocks.tabsProps?.onSelectionChange).toBeDefined();
    mocks.tabsProps?.onSelectionChange?.('approved');

    expect(mocks.navigateMock).toHaveBeenCalledWith('/secure/approved');
  });
});
