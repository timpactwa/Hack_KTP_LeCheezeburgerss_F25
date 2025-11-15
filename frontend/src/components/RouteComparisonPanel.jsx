import Spinner from "./Spinner";
import { useDashboard } from "./dashboard-context";

function RouteComparisonPanel() {
  const { routeData, activeRouteKey, setActiveRouteKey, isRouteLoading, routeError, requestRoute, lastRouteParams } = useDashboard();

  if (isRouteLoading) {
    return (
      <section>
        <h2>Routes</h2>
        <Spinner label="Generating your SafeRoute…" />
      </section>
    );
  }

  if (routeError) {
    return (
      <section>
        <h2>Routes</h2>
        <p className="error-text">We couldn&apos;t fetch routes.</p>
        <button type="button" onClick={() => requestRoute(lastRouteParams)}>
          Retry
        </button>
      </section>
    );
  }

  if (!routeData?.shortest || !routeData?.safest) {
    return (
      <section>
        <h2>Routes</h2>
        <p>Enter start/end coordinates to compare the shortest vs. safest paths.</p>
      </section>
    );
  }

  return (
    <section>
      <h2>Route Comparison</h2>
      <div className="route-card-grid">
        <RouteCard
          label="Safest"
          description={`${(routeData.safest.distance_m / 1000).toFixed(1)} km · ${Math.round(
            routeData.safest.duration_s / 60
          )} min`}
          extra={`Avoids ${routeData.safest.risk_areas_avoided ?? "?"} hotspots`}
          isActive={activeRouteKey === "safest"}
          onSelect={() => setActiveRouteKey("safest")}
        />
        <RouteCard
          label="Shortest"
          description={`${(routeData.shortest.distance_m / 1000).toFixed(1)} km · ${Math.round(
            routeData.shortest.duration_s / 60
          )} min`}
          extra="Fastest arrival"
          isActive={activeRouteKey === "shortest"}
          onSelect={() => setActiveRouteKey("shortest")}
        />
      </div>
    </section>
  );
}

function RouteCard({ label, description, extra, isActive, onSelect }) {
  return (
    <button
      className={`route-card ${isActive ? "active" : ""}`}
      onClick={onSelect}
      type="button"
      title={`${label}: ${extra}`}
    >
      <h3>{label}</h3>
      <p>{description}</p>
      <small>{extra}</small>
    </button>
  );
}

export default RouteComparisonPanel;
