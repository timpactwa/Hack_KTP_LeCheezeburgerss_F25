import { Link, Navigate, Outlet, Route, Routes } from "react-router-dom";

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
  const { user, logout } = useAuth();
  return (
    <div className="app-shell">
      <aside className="side-panel">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
          <h1 style={{ margin: 0, fontSize: "1.5rem" }}>SafeRoute NYC</h1>
          <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
            <Link
              to="/settings"
              style={{
                padding: "0.5rem 1rem",
                background: "rgba(148, 163, 184, 0.2)",
                color: "#f8fafc",
                textDecoration: "none",
                borderRadius: "0.5rem",
                fontSize: "0.9rem",
                border: "1px solid rgba(148, 163, 184, 0.3)",
              }}
            >
              Settings
            </Link>
            {user && (
              <button
                onClick={logout}
                style={{
                  padding: "0.5rem 1rem",
                  background: "rgba(239, 68, 68, 0.2)",
                  color: "#f87171",
                  border: "1px solid rgba(239, 68, 68, 0.3)",
                  borderRadius: "0.5rem",
                  fontSize: "0.9rem",
                  cursor: "pointer",
                }}
              >
                Logout
              </button>
            )}
          </div>
        </div>
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
