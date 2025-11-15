import { Navigate, Outlet, Route, Routes } from "react-router-dom";

import CrimeHeatmapLegend from "./components/CrimeHeatmapLegend";
import PanicButton from "./components/PanicButton";
import RouteComparisonPanel from "./components/RouteComparisonPanel";
import RouteForm from "./components/RouteForm";
import MapDashboard from "./components/MapDashboard";
import { DashboardProvider, useDashboard } from "./components/dashboard-context";
import { useAuth } from "./context/AuthContext";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import SettingsPage from "./pages/SettingsPage";

function App() {
  return (
    <DashboardProvider>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route element={<RequireAuth />}>
          <Route path="/" element={<DashboardView />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </DashboardProvider>
  );
}

function RequireAuth() {
  const { user } = useAuth();
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  return <Outlet />;
}

function DashboardView() {
  const { isRouteLoading } = useDashboard();
  return (
    <div className="app-shell">
      <aside className="side-panel">
        <RouteForm />
        <RouteComparisonPanel />
        <CrimeHeatmapLegend />
        <PanicButton disabled={isRouteLoading} />
      </aside>
      <main className="map-panel">
        <MapDashboard />
      </main>
    </div>
  );
}

export default App;
