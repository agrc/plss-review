import { useFirebaseApp, useFirebaseAuth } from '@ugrc/utah-design-system';
import { useEffect } from 'react';
import { Navigate, Route, Routes } from 'react-router';
import { ErrorBoundary } from './components/ErrorBoundary';
import Layout from './layouts/Layout';
import ProtectedRouteLayout from './layouts/LayoutProtected';
import Approved from './routes/approved';
import County from './routes/county';
import Login from './routes/login';
import Received from './routes/received';
import Rejected from './routes/rejected';
import Review from './routes/review';

export default function AppRoutes() {
  const { currentUser, auth } = useFirebaseAuth();
  const app = useFirebaseApp();

  auth.tenantId = 'plss-review-keo70';
  const isAuthenticated = currentUser !== undefined;

  // initialize firebase performance metrics
  useEffect(() => {
    async function initPerformance() {
      const { getPerformance } = await import('firebase/performance');

      return getPerformance(app);
    }
    initPerformance();
  }, [app]);

  return (
    <Routes>
      <Route element={<Layout />}>
        {/* Public routes */}
        <Route index element={isAuthenticated ? <Navigate to="/secure/received" replace /> : <Login />} />

        {/* Protected routes group */}
        <Route path="secure" element={<ProtectedRouteLayout />}>
          <Route path="received" element={isAuthenticated ? <Received /> : <Navigate to="/" replace />} />
          <Route path="county" element={isAuthenticated ? <County /> : <Navigate to="/" replace />} />
          <Route path="approved" element={isAuthenticated ? <Approved /> : <Navigate to="/" replace />} />
          <Route path="rejected" element={isAuthenticated ? <Rejected /> : <Navigate to="/" replace />} />
        </Route>

        <Route path="secure">
          <Route path="received/:blm/:id" element={isAuthenticated ? <Review /> : <Navigate to="/" replace />} />
        </Route>
        <Route path="*" element={<ErrorBoundary />} />
      </Route>
    </Routes>
  );
}
