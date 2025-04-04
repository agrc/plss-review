import { useFirebaseApp, useFirebaseAuth } from '@ugrc/utah-design-system';
import { useEffect } from 'react';
import { Navigate, Route, Routes } from 'react-router';
import { ErrorBoundary } from './App';
import './index.css';
import Dashboard from './routes/dashboard';
import Layout from './routes/Layout';
import ProtectedRouteLayout from './routes/LayoutProtected';
import Login from './routes/login';
import Received from './routes/received';

export default function AppRoutes() {
  const { currentUser } = useFirebaseAuth();
  const app = useFirebaseApp();
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
          <Route path="county" element={isAuthenticated ? <Dashboard /> : <Navigate to="/" replace />} />
          <Route path="approved" element={isAuthenticated ? <Dashboard /> : <Navigate to="/" replace />} />
          <Route path="rejected" element={isAuthenticated ? <Dashboard /> : <Navigate to="/" replace />} />
        <Route path="secure" element={<ProtectedRouteLayout />}>
          <Route path="received" element={isAuthenticated ? <Received /> : <Navigate to="/" replace />} />
        </Route>

        <Route path="secure">
          <Route path="received/:id" element={isAuthenticated ? <Review /> : <Navigate to="/" replace />} />
        </Route>
        <Route path="*" element={<ErrorBoundary />} />
      </Route>
    </Routes>
  );
}
