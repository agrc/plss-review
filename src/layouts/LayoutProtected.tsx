import { Tab, TabList, Tabs, useFirebaseAuth } from '@ugrc/utah-design-system';
import { useEffect } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router';
import type { Key } from 'react-stately';
import SubmissionAnalytics from '../components/SubmissionAnalytics';
import '../index.css';

const tabRoutes = [
  { id: 'received', path: '/secure/received', label: 'Received' },
  { id: 'county', path: '/secure/county', label: 'Under County Review' },
  { id: 'approved', path: '/secure/approved', label: 'County Approved' },
  { id: 'rejected', path: '/secure/rejected', label: 'Rejected' },
];

export default function ProtectedLayout() {
  const { currentUser } = useFirebaseAuth();

  const navigate = useNavigate();
  const location = useLocation();

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
