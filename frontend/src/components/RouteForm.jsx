import { useState } from "react";

import { useDashboard } from "./dashboard-context";

const DEFAULT_START = "40.73061,-74.00070";
const DEFAULT_END = "40.71520,-73.98300";

const PRESETS = [
  {
    label: "NYU ➜ Lower East Side",
    start: DEFAULT_START,
    end: DEFAULT_END,
  },
  {
    label: "Times Sq ➜ Brooklyn Bridge",
    start: "40.7580,-73.9855",
    end: "40.7061,-73.9969",
  },
];

function RouteForm() {
  const { requestRoute, isRouteLoading } = useDashboard();
  const [start, setStart] = useState(DEFAULT_START);
  const [end, setEnd] = useState(DEFAULT_END);
  const [error, setError] = useState(null);

  const handleSubmit = async (event) => {
    event.preventDefault();
    const parsedStart = parseCoord(start, DEFAULT_START);
    const parsedEnd = parseCoord(end, DEFAULT_END);
    try {
      await requestRoute({ start: parsedStart, end: parsedEnd });
      setError(null);
    } catch (err) {
      setError("Unable to fetch routes right now");
      console.error(err);
    }
  };

  const usePreset = (preset) => {
    setStart(preset.start);
    setEnd(preset.end);
    setError(null);
    requestRoute({ start: parseCoord(preset.start), end: parseCoord(preset.end) });
  };

  return (
    <section>
      <h2>Plan a Route</h2>
      <form className="route-form" onSubmit={handleSubmit}>
        <label>
          Start (lat,lng)
          <input value={start} onChange={(e) => setStart(e.target.value)} />
        </label>
        <label>
          End (lat,lng)
          <input value={end} onChange={(e) => setEnd(e.target.value)} />
        </label>
        <button type="submit" disabled={isRouteLoading}>
          {isRouteLoading ? "Loading routes..." : "Generate routes"}
        </button>
      </form>
      <div className="preset-list">
        {PRESETS.map((preset) => (
          <button key={preset.label} type="button" onClick={() => usePreset(preset)}>
            {preset.label}
          </button>
        ))}
        {error && <p className="error-text">{error}</p>}
      </div>
    </section>
  );
}

function parseCoord(value, fallbackString) {
  const [lat, lng] = (value || fallbackString).split(",").map((num) => Number(num.trim()));
  if (Number.isFinite(lat) && Number.isFinite(lng)) {
    return { lat, lng };
  }
  const [fLat, fLng] = fallbackString.split(",").map((num) => Number(num.trim()));
  return { lat: fLat, lng: fLng };
}

export default RouteForm;
