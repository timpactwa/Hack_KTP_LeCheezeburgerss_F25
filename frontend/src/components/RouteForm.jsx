/**
 * RouteForm orchestrates address search, map clicks, and location usage to
 * call the /safe-route API via dashboard-context.
 */
import { useEffect, useMemo, useState } from "react";

import { useDashboard } from "./dashboard-context";
import { useGeolocation } from "../hooks/useGeolocation";
import { useGeocoder } from "../hooks/useGeocoder";
import { reverseGeocode } from "../services/mapbox";

const DEFAULT_START = { lat: 40.73061, lng: -74.0007 };
const DEFAULT_END = { lat: 40.7152, lng: -73.983 };


function RouteForm() {
  const {
    requestRoute,
    isRouteLoading,
    beginMapSelection,
    registerMapSelectionHandler,
    mapSelectionTarget,
    updateSelectedCoords,
  } = useDashboard();
  const [startCoords, setStartCoords] = useState(DEFAULT_START);
  const [endCoords, setEndCoords] = useState(DEFAULT_END);
  const [startLabel, setStartLabel] = useState(formatCoords(DEFAULT_START));
  const [endLabel, setEndLabel] = useState(formatCoords(DEFAULT_END));
  const [startQuery, setStartQuery] = useState("");
  const [endQuery, setEndQuery] = useState("");
  const [error, setError] = useState(null);

  const { results: startSuggestions, isLoading: startLoading } = useGeocoder(startQuery);
  const { results: endSuggestions, isLoading: endLoading } = useGeocoder(endQuery);
  const { coords: currentLocation, error: geolocationError } = useGeolocation();

  useEffect(() => {
    const cleanupStart = registerMapSelectionHandler("start", (coords) => {
      applyCoords("start", coords);
    });
    const cleanupEnd = registerMapSelectionHandler("end", (coords) => {
      applyCoords("end", coords);
    });
    return () => {
      cleanupStart();
      cleanupEnd();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [registerMapSelectionHandler]);

  const applyCoords = async (field, coords, labelHint) => {
    const label = labelHint || formatCoords(coords);
    if (field === "start") {
      setStartCoords(coords);
      setStartLabel(label);
      setStartQuery("");
      updateSelectedCoords("start", coords);
    } else {
      setEndCoords(coords);
      setEndLabel(label);
      setEndQuery("");
      updateSelectedCoords("end", coords);
    }
    try {
      const feature = await reverseGeocode(coords.lng, coords.lat);
      if (feature) {
        if (field === "start") {
          setStartLabel(feature.place_name);
        } else {
          setEndLabel(feature.place_name);
        }
      }
    } catch (reverseErr) {
      console.warn("reverse geocode failed", reverseErr);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!startCoords || !endCoords) {
      setError("Select both start and end locations");
      return;
    }
    try {
      await requestRoute({ start: startCoords, end: endCoords });
      setError(null);
    } catch (err) {
      setError("Unable to fetch routes right now");
      console.error(err);
    }
  };

  const handleSelectSuggestion = (field, feature) => {
    const coords = { lat: feature.center[1], lng: feature.center[0] };
    applyCoords(field, coords, feature.place_name);
  };

  const handleUseCurrentLocation = (field) => {
    if (!currentLocation) {
      setError("Geolocation unavailable");
      return;
    }
    applyCoords(field, currentLocation, "Current location");
  };


  return (
    <section>
      <h2>Plan a Route</h2>
      <form className="route-form" onSubmit={handleSubmit}>
        <AddressField
          label="Start"
          query={startQuery}
          setQuery={setStartQuery}
          suggestions={startSuggestions}
          loading={startLoading}
          onSelect={(feature) => handleSelectSuggestion("start", feature)}
          selectedLabel={startLabel}
          onUseCurrentLocation={() => handleUseCurrentLocation("start")}
          onPickOnMap={() => beginMapSelection("start")}
          picking={mapSelectionTarget === "start"}
        />
        <AddressField
          label="End"
          query={endQuery}
          setQuery={setEndQuery}
          suggestions={endSuggestions}
          loading={endLoading}
          onSelect={(feature) => handleSelectSuggestion("end", feature)}
          selectedLabel={endLabel}
          onUseCurrentLocation={() => handleUseCurrentLocation("end")}
          onPickOnMap={() => beginMapSelection("end")}
          picking={mapSelectionTarget === "end"}
        />
        <button type="submit" disabled={isRouteLoading || !startCoords || !endCoords}>
          {isRouteLoading ? "Loading routes..." : "Generate routes"}
        </button>
        {error && <p className="error-text">{error}</p>}
        {geolocationError && <p className="error-text">{geolocationError}</p>}
      </form>
    </section>
  );
}

function AddressField({
  label,
  query,
  setQuery,
  suggestions,
  loading = false,
  onSelect,
  selectedLabel,
  onUseCurrentLocation,
  onPickOnMap,
  picking,
}) {
  const showSuggestions = suggestions.length > 0 && query.length >= 3;
  return (
    <div className="address-field">
      <label>
        {label}
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search address or landmark"
        />
      </label>
      <div className="address-field__actions">
        <button type="button" onClick={onUseCurrentLocation}>
          Use my location
        </button>
        <button type="button" onClick={onPickOnMap}>
          {picking ? "Click on map..." : "Pick on map"}
        </button>
      </div>
      <p className="selected-address">Selected: {selectedLabel}</p>
      {loading && <p className="muted-text">Searching…</p>}
      {showSuggestions && (
        <ul className="suggestion-list">
          {suggestions.map((feature) => (
            <li key={feature.id}>
              <button type="button" onClick={() => onSelect(feature)}>
                {feature.place_name}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function formatCoords(coords) {
  return `${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}`;
}

export default RouteForm;
