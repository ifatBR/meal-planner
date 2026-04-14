import { createBrowserRouter, Navigate } from 'react-router-dom';
import { ROUTES } from '../utils/constants';
import { ProtectedRoute } from './ProtectedRoute';
import { AppLayout } from '../components/AppLayout';
import { useAuth } from '../hooks/useAuth';
import { LoginPage } from '../pages/login/LoginPage';
import { LibraryPage } from '../pages/library/LibraryPage';

const Placeholder = ({ name }: { name: string }) => (
  <div style={{ padding: '2rem', fontFamily: 'sans-serif' }}>{name}</div>
);

function LoginGuard() {
  const { user, isLoading } = useAuth();
  if (isLoading) return null;
  if (user) return <Navigate to={ROUTES.SCHEDULES} replace />;
  return <LoginPage />;
}

export const routeConfig = [
  { path: ROUTES.LOGIN, element: <LoginGuard /> },
  {
    path: '/',
    element: (
      <ProtectedRoute>
        <AppLayout />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <Navigate to={ROUTES.SCHEDULES} replace /> },
      { path: ROUTES.LIBRARY, element: <LibraryPage /> },
      { path: ROUTES.SCHEDULES, element: <Placeholder name="Schedules" /> },
      { path: ROUTES.SCHEDULE_SETTINGS_PATTERN, element: <Placeholder name="Settings" /> },
      { path: ROUTES.SCHEDULE_CALENDAR_PATTERN, element: <Placeholder name="Calendar" /> },
    ],
  },
];

export const router = createBrowserRouter(routeConfig);
