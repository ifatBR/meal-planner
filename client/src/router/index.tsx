import { createBrowserRouter, Navigate } from "react-router-dom";
import { ROUTES } from "../utils/constants";
import { ProtectedRoute } from "./ProtectedRoute";
import { useAuth } from "../hooks/useAuth";
import { LoginPage } from "../pages/login/LoginPage";

const Placeholder = ({ name }: { name: string }) => (
  <div style={{ padding: "2rem", fontFamily: "sans-serif" }}>{name}</div>
);

function LoginGuard() {
  const { user, isLoading } = useAuth();
  if (isLoading) return null;
  if (user) return <Navigate to={ROUTES.SCHEDULES} replace />;
  return <LoginPage />;
}

export const router = createBrowserRouter([
  { path: ROUTES.LOGIN, element: <LoginGuard /> },
  {
    path: ROUTES.LIBRARY,
    element: (
      <ProtectedRoute>
        <Placeholder name="Library" />
      </ProtectedRoute>
    ),
  },
  {
    path: ROUTES.SCHEDULES,
    element: (
      <ProtectedRoute>
        <Placeholder name="Schedules" />
      </ProtectedRoute>
    ),
  },
  {
    path: ROUTES.SCHEDULE_SETTINGS_PATTERN,
    element: (
      <ProtectedRoute>
        <Placeholder name="Settings" />
      </ProtectedRoute>
    ),
  },
  {
    path: ROUTES.SCHEDULE_CALENDAR_PATTERN,
    element: (
      <ProtectedRoute>
        <Placeholder name="Calendar" />
      </ProtectedRoute>
    ),
  },
  {
    path: "/",
    element: (
      <ProtectedRoute>
        <Navigate to={ROUTES.SCHEDULES} replace />
      </ProtectedRoute>
    ),
  },
]);
