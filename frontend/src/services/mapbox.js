import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

const token = import.meta.env.VITE_MAPBOX_TOKEN || "";
mapboxgl.accessToken = token;

export const DEFAULT_CENTER = [-73.995, 40.72];

export function createBaseMap(container) {
  return new mapboxgl.Map({
    container,
    style: "mapbox://styles/mapbox/dark-v11",
    center: DEFAULT_CENTER,
    zoom: 12.5,
  });
}

export function ensureGeoJSONSource(map, id, data) {
  if (map.getSource(id)) {
    map.getSource(id).setData(data);
  } else {
    map.addSource(id, { type: "geojson", data });
  }
}

export function ensureLineLayer(map, options) {
  const { id, sourceId, color, width = 4, dasharray } = options;
  if (map.getLayer(id)) {
    map.setPaintProperty(id, "line-color", color);
    map.setPaintProperty(id, "line-width", width);
    if (dasharray) {
      map.setPaintProperty(id, "line-dasharray", dasharray);
    }
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
  const { id, sourceId, color = "#f87171", opacity = 0.2 } = options;
  if (map.getLayer(id)) {
    map.setPaintProperty(id, "fill-color", color);
    map.setPaintProperty(id, "fill-opacity", opacity);
    return;
  }
  map.addLayer({
    id,
    type: "fill",
    source: sourceId,
    paint: {
      "fill-color": color,
      "fill-opacity": opacity,
    },
  });
}

export { mapboxgl };
