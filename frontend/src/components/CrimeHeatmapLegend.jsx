/**
 * Legend/toggle for the Mapbox heatmap layer fed by /crime-heatmap endpoint.
 * Reads dashboard context so it can show current hotspot counts and visibility.
 */
import { useDashboard } from "./dashboard-context";

function CrimeHeatmapLegend() {
  const { heatmapData, heatmapVisible, setHeatmapVisible } = useDashboard();

  const hotspots = heatmapData?.features?.length ?? 0;

  return (
    <section>
      <div className="legend-header" title="Toggle visibility of crime density layer">
        <h2>Crime Heatmap</h2>
        <label>
          <input
            checked={heatmapVisible}
            type="checkbox"
            onChange={(event) => setHeatmapVisible(event.target.checked)}
          />
          Visible
        </label>
      </div>
      <div className={`legend-bar ${heatmapVisible ? "" : "legend-hidden"}`}>
        <span>low</span>
        <div className="gradient" />
        <span>high</span>
      </div>
      <p>{hotspots} hotspots in current view.</p>
    </section>
  );
}

export default CrimeHeatmapLegend;
