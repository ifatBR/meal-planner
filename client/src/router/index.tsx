import { createBrowserRouter } from "react-router-dom";
import { ROUTES } from "../utils/constants";

const Placeholder = ({ name }: { name: string }) => (
  <div style={{ padding: "2rem", fontFamily: "sans-serif" }}>{name}</div>
);

export const router = createBrowserRouter([
  { path: ROUTES.LOGIN, element: <Placeholder name="Login" /> },
  { path: ROUTES.LIBRARY, element: <Placeholder name="Library" /> },
  { path: ROUTES.SCHEDULES, element: <Placeholder name="Schedules" /> },
  {
    path: ROUTES.SCHEDULE_SETTINGS_PATTERN,
    element: <Placeholder name="Settings" />,
  },
  {
    path: ROUTES.SCHEDULE_CALENDAR_PATTERN,
    element: <Placeholder name="Calendar" />,
  },
  { path: "/", element: <Placeholder name="Root" /> },
]);
