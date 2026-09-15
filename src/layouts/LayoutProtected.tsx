import { useQuery } from '@tanstack/react-query';
import { Tab, TabList, TabPanel, Tabs, useFirebaseAuth, useFirestore } from '@ugrc/utah-design-system';
import { getCountFromServer } from 'firebase/firestore';
import { useEffect } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router';
import type { Key } from 'react-stately';
import SubmissionAnalytics from '../components/SubmissionAnalytics';
import '../index.css';
import { forApprovedSubmissions, forCountySubmissions, forNewSubmissions, forRejectedSubmissions } from '../queries';

const TAB_QUERY_STORAGE_KEY = 'plss-review:tab-query-by-route';
const TAB_COUNT_STALE_TIME_MS = 60_000;
const TAB_COUNT_CACHE_TIME_MS = 5 * TAB_COUNT_STALE_TIME_MS;
const TAB_COUNT_REFRESH_INTERVAL_MS = 60_000;

export const buildTabRoutes = (counts: Record<string, number> = {}) => [
  { id: 'received', path: '/secure/received', label: `Received (${counts.received ?? 0})` },
  { id: 'county', path: '/secure/county', label: `Under County Review (${counts.county ?? 0})` },
  { id: 'approved', path: '/secure/approved', label: `County Approved (${counts.approved ?? 0})` },
  { id: 'rejected', path: '/secure/rejected', label: `Rejected (${counts.rejected ?? 0})` },
];

const readStoredTabQueries = (): Record<string, string> => {
  if (typeof window === 'undefined') {
    return {};
  }

  try {
    const stored = window.sessionStorage.getItem(TAB_QUERY_STORAGE_KEY);
    return stored ? (JSON.parse(stored) as Record<string, string>) : {};
  } catch {
    return {};
  }
};

const writeStoredTabQueries = (value: Record<string, string>) => {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.sessionStorage.setItem(TAB_QUERY_STORAGE_KEY, JSON.stringify(value));
  } catch {
    // Ignore storage failures and continue with plain navigation.
  }
};

export default function ProtectedLayout() {
  const { currentUser } = useFirebaseAuth();
  const { firestore } = useFirestore();

  const navigate = useNavigate();
  const location = useLocation();

  const { data: tabCounts = {} } = useQuery({
    queryKey: ['tabCounts', firestore],
    queryFn: async () => {
      const [received, county, approved, rejected] = await Promise.all([
        getCountFromServer(forNewSubmissions(firestore)),
        getCountFromServer(forCountySubmissions(firestore)),
        getCountFromServer(forApprovedSubmissions(firestore)),
        getCountFromServer(forRejectedSubmissions(firestore)),
      ]);

      return {
        received: received.data().count,
        county: county.data().count,
        approved: approved.data().count,
        rejected: rejected.data().count,
      };
    },
    enabled: !!firestore,
    staleTime: TAB_COUNT_STALE_TIME_MS,
    gcTime: TAB_COUNT_CACHE_TIME_MS,
    refetchInterval: TAB_COUNT_REFRESH_INTERVAL_MS,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
  });

  const tabRoutes = buildTabRoutes(tabCounts);

  useEffect(() => {
    if (!currentUser) {
      navigate('/');
    }
  }, [currentUser, navigate]);

  // Determine which tab is active based on the current route
  const activeTab = tabRoutes.find((tab) => location.pathname.includes(tab.path))?.id || 'received';

  const handleTabChange = (selectedKey: Key) => {
    const currentRoute = tabRoutes.find((tab) => location.pathname.includes(tab.path))?.path;
    const storedQueries = readStoredTabQueries();

    if (currentRoute) {
      storedQueries[currentRoute] = typeof window === 'undefined' ? '' : window.location.search;
      writeStoredTabQueries(storedQueries);
    }

    const route = tabRoutes.find((tab) => tab.id === selectedKey)?.path;
    if (route) {
      navigate(`${route}${storedQueries[route] ?? ''}`);
    }
  };

  return (
    <>
      <SubmissionAnalytics />
      <Tabs
        orientation="vertical"
        className="h-full flex-1 whitespace-nowrap"
        selectedKey={activeTab}
        onSelectionChange={handleTabChange}
      >
        <TabList aria-label="PLSS review stage">
          {tabRoutes.map((tab) => (
            <Tab key={tab.id} id={tab.id}>
              {tab.label}
            </Tab>
          ))}
        </TabList>
        <TabPanel id={activeTab} className="w-full overflow-y-auto p-0">
          <Outlet />
        </TabPanel>
      </Tabs>
    </>
  );
}
