import { useEffect, useRef } from "react";

import {
  createBaseMap,
  ensureGeoJSONSource,
  ensureHeatmapLayer,
  ensureLineLayer,
  mapboxgl,
} from "../services/mapbox";
import { useDashboard } from "./dashboard-context";

function MapDashboard() {
  const mapNodeRef = useRef(null);
  const mapRef = useRef(null);
  const { routeData, heatmapData, activeRouteKey, heatmapVisible } = useDashboard();

  useEffect(() => {
    if (!mapNodeRef.current || mapRef.current) {
      return;
    }
    if (!mapboxgl.accessToken) {
      return;
    }
    mapRef.current = createBaseMap(mapNodeRef.current);
    mapRef.current.addControl(new mapboxgl.NavigationControl(), "top-left");
    return () => mapRef.current?.remove();
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !heatmapData) return;
    if (!map.isStyleLoaded()) {
      map.once("styledata", () => {
        ensureGeoJSONSource(map, "crime", heatmapData);
        ensureHeatmapLayer(map, "crime");
      });
      return;
    }
    ensureGeoJSONSource(map, "crime", heatmapData);
    ensureHeatmapLayer(map, "crime");
    map.setLayoutProperty(
      "crime-heatmap",
      "visibility",
      heatmapVisible ? "visible" : "none"
    );
  }, [heatmapData, heatmapVisible]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !routeData) return;

    const drawRoutes = () => {
      const shortest = routeData.shortest;
      const safest = routeData.safest;
      if (shortest) {
        ensureGeoJSONSource(map, "shortest-route", {
          type: "Feature",
          geometry: shortest.geometry,
        });
        ensureLineLayer(map, {
          id: "shortest-route-line",
          sourceId: "shortest-route",
          color: activeRouteKey === "shortest" ? "#9ca3af" : "#4b5563",
          width: activeRouteKey === "shortest" ? 6 : 3,
          dasharray: [1, 0],
        });
      }
      if (safest) {
        ensureGeoJSONSource(map, "safest-route", {
          type: "Feature",
          geometry: safest.geometry,
        });
        ensureLineLayer(map, {
          id: "safest-route-line",
          sourceId: "safest-route",
          color: activeRouteKey === "safest" ? "#34d399" : "#065f46",
          width: activeRouteKey === "safest" ? 6 : 3,
          dasharray: [1, 0],
        });
      }

      const coords = [...(shortest?.geometry.coordinates || []), ...(safest?.geometry.coordinates || [])];
      if (coords.length > 1) {
        const bounds = coords.reduce(
          (b, coord) => b.extend(coord),
          new mapboxgl.LngLatBounds(coords[0], coords[0])
        );
        map.fitBounds(bounds, { padding: 60, duration: 1000 });
      }
    };

    if (!map.isStyleLoaded()) {
      map.once("styledata", drawRoutes);
      return;
    }
    drawRoutes();
  }, [routeData, activeRouteKey]);

  if (!mapboxgl.accessToken) {
    return (
      <div className="map-empty-state">
        Add VITE_MAPBOX_TOKEN to your environment to load the NYC basemap.
      </div>
    );
  }

  return <div className="mapbox-container" ref={mapNodeRef} />;
}

export default MapDashboard;
