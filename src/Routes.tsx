import { useFirebaseApp, useFirebaseAuth } from '@ugrc/utah-design-system';
import { lazy, useEffect } from 'react';
import { Route, Routes } from 'react-router';
import PageNotFound from './components/PageNotFound';

const Layout = lazy(() => import('./layouts/Layout'));
const ProtectedRouteLayout = lazy(() => import('./layouts/LayoutProtected'));
const ProtectedRouteLayoutEmpty = lazy(() => import('./layouts/LayoutProtectedEmpty'));
const Approved = lazy(() => import('./routes/approved'));
const County = lazy(() => import('./routes/county'));
const Login = lazy(() => import('./routes/login'));
const Rejected = lazy(() => import('./routes/rejected'));
const Review = lazy(() => import('./routes/review'));
const Received = lazy(() => import('./routes/received'));

export default function AppRoutes() {
  const { auth, ready } = useFirebaseAuth();
  const app = useFirebaseApp();

  auth.tenantId = import.meta.env.VITE_FIREBASE_TENANT;

  // initialize firebase performance metrics
  useEffect(() => {
    async function initPerformance() {
      const { getPerformance } = await import('firebase/performance');

      return getPerformance(app);
    }
    initPerformance();
  }, [app]);

  if (!ready) {
    return null;
  }

  return (
    <Routes>
      <Route element={<Layout />}>
        {/* Public routes */}
        <Route index Component={Login} />

        {/* Protected routes group */}
        <Route path="secure" Component={ProtectedRouteLayout}>
          <Route path="received" Component={Received} />
          <Route path="county" Component={County} />
          <Route path="approved" Component={Approved} />
          <Route path="rejected" Component={Rejected} />
        </Route>
        <Route path="secure" Component={ProtectedRouteLayoutEmpty}>
          <Route path="received/:blm/:id" Component={Review} />
        </Route>

        <Route path="*" Component={PageNotFound} />
      </Route>
    </Routes>
  );
}
