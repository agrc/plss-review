import { useQuery } from '@tanstack/react-query';
import { Tab, TabList, Tabs, useFirebaseAuth, useFirestore } from '@ugrc/utah-design-system';
import { getCountFromServer } from 'firebase/firestore';
import { useEffect } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router';
import type { Key } from 'react-stately';
import SubmissionAnalytics from '../components/SubmissionAnalytics';
import '../index.css';
import { forNewSubmissionsCount } from '../queries';
import { getTabRoutes } from './tabRoutes';

export default function ProtectedLayout() {
  const { currentUser } = useFirebaseAuth();
  const { firestore } = useFirestore();

  const navigate = useNavigate();
  const location = useLocation();
  const { data: receivedCount } = useQuery({
    queryKey: ['monuments', { type: 'received-count' }, firestore],
    queryFn: async () => {
      const snapshot = await getCountFromServer(forNewSubmissionsCount(firestore));

      return snapshot.data().count;
    },
    retry: 0,
    enabled: true,
    staleTime: Infinity,
    gcTime: Infinity,
  });
  const tabRoutes = getTabRoutes(receivedCount);

  useEffect(() => {
    if (!currentUser) {
      navigate('/');
    }
  }, [currentUser, navigate]);

  // Determine which tab is active based on the current route
  const activeTab = tabRoutes.find((tab) => location.pathname.includes(tab.path))?.id || 'received';

  const handleTabChange = (selectedKey: Key) => {
    const route = tabRoutes.find((tab) => tab.id === selectedKey)?.path;
    if (route) {
      navigate(route);
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
        <div className="w-full overflow-y-auto">
          <Outlet />
        </div>
      </Tabs>
    </>
  );
}
