import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

const token = import.meta.env.VITE_MAPBOX_TOKEN || "";
mapboxgl.accessToken = token;

// Debug logging (only in development)
if (import.meta.env.DEV) {
  if (!token) {
    console.warn("⚠️ VITE_MAPBOX_TOKEN is not set in environment variables");
    console.warn("Create a .env file in the frontend/ directory with: VITE_MAPBOX_TOKEN=your_token_here");
  } else {
    console.log("✓ Mapbox token loaded:", token.substring(0, 10) + "...");
  }
}

export const DEFAULT_CENTER = [-73.995, 40.72];

export function createBaseMap(container) {
  if (!mapboxgl.accessToken) {
    throw new Error("Mapbox access token is required");
  }
  
  const map = new mapboxgl.Map({
    container,
    style: "mapbox://styles/mapbox/dark-v11",
    center: DEFAULT_CENTER,
    zoom: 12.5,
    antialias: true,
  });
  
  // Wait for style to load before considering map ready
  map.on("style.load", () => {
    console.log("Map style loaded successfully");
  });
  
  map.on("error", (e) => {
    console.error("Map error:", e.error?.message || e);
    if (e.error?.message?.includes("style")) {
      console.error("Style loading failed. Check your Mapbox token and network connection.");
    }
  });
  
  return map;
}

export function ensureGeoJSONSource(map, id, data) {
  if (map.getSource(id)) {
    map.getSource(id).setData(data);
  } else {
    map.addSource(id, { type: "geojson", data });
  }
}

export function ensureLineLayer(map, options) {
  const { id, sourceId, color, width = 4, dasharray, opacity = 0.85, blur = 0.15 } = options;
  if (map.getLayer(id)) {
    map.setPaintProperty(id, "line-color", color);
    map.setPaintProperty(id, "line-width", width);
    if (dasharray) {
      map.setPaintProperty(id, "line-dasharray", dasharray);
    }
    map.setPaintProperty(id, "line-opacity", opacity);
    map.setPaintProperty(id, "line-blur", blur);
    return;
  }
  map.addLayer({
    id,
    type: "line",
    source: sourceId,
    layout: {
      "line-cap": "round",
      "line-join": "round",
    },
    paint: {
      "line-color": color,
      "line-width": width,
      "line-opacity": opacity,
      "line-blur": blur,
      ...(dasharray ? { "line-dasharray": dasharray } : {}),
    },
  });
}

export function ensureHeatmapLayer(map, sourceId) {
  const layerId = "crime-heatmap";
  if (map.getLayer(layerId)) {
    return;
  }
  map.addLayer({
    id: layerId,
    type: "heatmap",
    source: sourceId,
    paint: {
      "heatmap-radius": 20,
      "heatmap-intensity": 0.8,
      "heatmap-color": [
        "interpolate",
        ["linear"],
        ["heatmap-density"],
        0,
        "rgba(0, 0, 0, 0)",
        0.5,
        "rgba(255, 165, 0, 0.4)",
        1,
        "rgba(255, 0, 0, 0.8)",
      ],
    },
  });
}

export function ensurePolygonLayer(map, options) {
  const { id, sourceId, opacity = 0.35 } = options;
  if (map.getLayer(id)) {
    map.setPaintProperty(id, "fill-opacity", opacity);
    return;
  }
  map.addLayer({
    id,
    type: "fill",
    source: sourceId,
    paint: {
      "fill-color": [
        "interpolate",
        ["linear"],
        ["get", "risk_score"],
        0,
        "rgba(248, 113, 113, 0.2)",
        5,
        "rgba(251, 191, 36, 0.3)",
        20,
        "rgba(239, 68, 68, 0.55)",
      ],
      "fill-opacity": opacity,
      "fill-outline-color": "rgba(239, 68, 68, 0.9)",
    },
  });
}

export { mapboxgl };

export function createMarkerElement({ color = "#34d399", label = "" }) {
  const el = document.createElement("div");
  el.className = "route-marker";
  el.style.backgroundColor = color;
  el.innerText = label;
  return el;
}

export function animateLineOpacity(map, layerId, duration = 600) {
  const start = performance.now();
  map.setPaintProperty(layerId, "line-opacity", 0);
  const tick = (now) => {
    const progress = Math.min((now - start) / duration, 1);
    map.setPaintProperty(layerId, "line-opacity", progress);
    if (progress < 1) {
      requestAnimationFrame(tick);
    }
  };
  requestAnimationFrame(tick);
}

async function fetchMapbox(url, options) {
  if (!token) {
    throw new Error("Missing Mapbox access token");
  }
  const response = await fetch(url, options);
  if (!response.ok) {
    throw new Error(`Mapbox request failed: ${response.status}`);
  }
  return response.json();
}

export async function forwardGeocode(query, { limit = 5, signal } = {}) {
  if (!query || query.length < 3) {
    return [];
  }
  const endpoint = new URL(
    `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json`
  );
  endpoint.searchParams.set("access_token", token);
  endpoint.searchParams.set("autocomplete", "true");
  endpoint.searchParams.set("limit", String(limit));
  endpoint.searchParams.set("language", "en");
  const data = await fetchMapbox(endpoint, { signal });
  return data.features || [];
}

export async function reverseGeocode(lng, lat, { signal } = {}) {
  if (typeof lng !== "number" || typeof lat !== "number") {
    return null;
  }
  const endpoint = new URL(
    `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json`
  );
  endpoint.searchParams.set("access_token", token);
  endpoint.searchParams.set("limit", "1");
  endpoint.searchParams.set("language", "en");
  const data = await fetchMapbox(endpoint, { signal });
  return data.features?.[0] || null;
}
