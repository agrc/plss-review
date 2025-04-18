import { useFirebaseApp, useFirebaseAuth } from '@ugrc/utah-design-system';
import { lazy, useEffect } from 'react';
import { Route, Routes } from 'react-router';

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
      <Route Component={lazy(() => import('./layouts/Layout'))}>
        {/* Public routes */}
        <Route index Component={lazy(() => import('./routes/login'))} />

        {/* Protected routes group */}
        <Route path="secure" Component={lazy(() => import('./layouts/LayoutProtected'))}>
          <Route path="received" Component={lazy(() => import('./routes/received'))} />
          <Route path="county" Component={lazy(() => import('./routes/county'))} />
          <Route path="approved" Component={lazy(() => import('./routes/approved'))} />
          <Route path="rejected" Component={lazy(() => import('./routes/rejected'))} />
        </Route>
        <Route path="secure" Component={lazy(() => import('./layouts/LayoutProtectedEmpty'))}>
          <Route path="received/:blm/:id" Component={lazy(() => import('./routes/review'))} />
        </Route>

        <Route path="*" Component={lazy(() => import('./components/PageNotFound'))} />
      </Route>
    </Routes>
  );
}
