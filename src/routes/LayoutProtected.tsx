import { Tab, TabList, Tabs, useFirebaseAuth } from '@ugrc/utah-design-system';
import { Navigate, Outlet, useLocation, useNavigate } from 'react-router';
import type { Key } from 'react-stately';
import '../index.css';

const tabRoutes = [
  { id: 'received', path: '/received', label: 'Received' },
  { id: 'county', path: '/county', label: 'Under County Review' },
  { id: 'approved', path: '/approved', label: 'County Approved' },
  { id: 'rejected', path: '/rejected', label: 'Rejected' },
];

export default function ProtectedLayout() {
  const { currentUser } = useFirebaseAuth();

  const navigate = useNavigate();
  const location = useLocation();

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  // Determine which tab is active based on the current route
  const activeTab = tabRoutes.find((tab) => location.pathname.includes(tab.path))?.id || 'received';

  const handleTabChange = (selectedKey: Key) => {
    const route = tabRoutes.find((tab) => tab.id === selectedKey)?.path;
    if (route) {
      navigate(route);
    }
  };

  console.log('protected layout', currentUser);

  return (
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
  );
}
