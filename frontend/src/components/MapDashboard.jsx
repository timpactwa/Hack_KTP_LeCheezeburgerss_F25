import { useEffect, useRef } from "react";

import {
  createBaseMap,
  ensureGeoJSONSource,
  ensureHeatmapLayer,
  ensureLineLayer,
  ensurePolygonLayer,
  mapboxgl,
  createMarkerElement,
  animateLineOpacity,
} from "../services/mapbox";
import { useDashboard } from "./dashboard-context";

function MapDashboard() {
  const mapNodeRef = useRef(null);
  const mapRef = useRef(null);
  const startMarkerRef = useRef(null);
  const endMarkerRef = useRef(null);
  const waypointMarkersRef = useRef([]);
  const popupRef = useRef(new mapboxgl.Popup({ closeButton: false, closeOnClick: false }));
  const { routeData, heatmapData, activeRouteKey, heatmapVisible, mapSelectionTarget, completeMapSelection } = useDashboard();

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
    if (!map) return;
    const handleClick = (event) => {
      if (!mapSelectionTarget) return;
      completeMapSelection({ lat: event.lngLat.lat, lng: event.lngLat.lng });
    };
    map.on("click", handleClick);
    return () => {
      map.off("click", handleClick);
    };
  }, [mapSelectionTarget, completeMapSelection]);

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
      clearMarkers();
      if (shortest) {
        ensureGeoJSONSource(map, "shortest-route", {
          type: "Feature",
          geometry: shortest.geometry,
        });
        ensureLineLayer(map, {
          id: "shortest-route-line",
          sourceId: "shortest-route",
          color: activeRouteKey === "shortest" ? "#94a3b8" : "#475569",
          width: activeRouteKey === "shortest" ? 6 : 3,
          dasharray: [2, 2],
          opacity: activeRouteKey === "shortest" ? 0.9 : 0.4,
        });
        animateLineOpacity(map, "shortest-route-line");
        addWaypoints(shortest.geometry);
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
          width: activeRouteKey === "safest" ? 7 : 4,
          opacity: 0.95,
        });
        animateLineOpacity(map, "safest-route-line");
      }

      if (routeData?.risk_polygons) {
        ensureGeoJSONSource(map, "risk-polygons", routeData.risk_polygons);
        ensurePolygonLayer(map, {
          id: "risk-polygons-fill",
          sourceId: "risk-polygons",
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

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const registerHandlers = () => {
      const layers = [
        { id: "safest-route-line", label: "Safest route" },
        { id: "shortest-route-line", label: "Shortest route" },
      ];
      const handlers = layers.map(({ id, label }) => {
        const enter = (e) => {
          if (!map.getLayer(id)) return;
          map.getCanvas().style.cursor = "pointer";
          popupRef.current.setLngLat(e.lngLat).setText(label).addTo(map);
        };
        const leave = () => {
          map.getCanvas().style.cursor = "";
          popupRef.current.remove();
        };
        map.on("mouseenter", id, enter);
        map.on("mouseleave", id, leave);
        return { id, enter, leave };
      });

      return () => {
        handlers.forEach(({ id, enter, leave }) => {
          if (!map.getLayer(id)) return;
          map.off("mouseenter", id, enter);
          map.off("mouseleave", id, leave);
        });
        popupRef.current.remove();
      };
    };

    if (!map.isStyleLoaded()) {
      let cleanup = () => {};
      const once = () => {
        cleanup = registerHandlers();
      };
      map.once("styledata", once);
      return () => {
        map.off("styledata", once);
        cleanup();
      };
    }

    return registerHandlers();
  }, []);

  const clearMarkers = () => {
    if (startMarkerRef.current) {
      startMarkerRef.current.remove();
      startMarkerRef.current = null;
    }
    if (endMarkerRef.current) {
      endMarkerRef.current.remove();
      endMarkerRef.current = null;
    }
    waypointMarkersRef.current.forEach((marker) => marker.remove());
    waypointMarkersRef.current = [];
  };

  const addWaypoints = (geometry) => {
    const map = mapRef.current;
    if (!map || !geometry?.coordinates) return;
    const coords = geometry.coordinates;
    if (coords.length < 2) return;
    const sampleInterval = Math.max(1, Math.floor(coords.length / 10));
    for (let i = sampleInterval; i < coords.length - sampleInterval; i += sampleInterval) {
      const [lng, lat] = coords[i];
      const marker = new mapboxgl.Marker({ color: "#fbbf24", scale: 0.7 })
        .setLngLat([lng, lat])
        .addTo(map);
      waypointMarkersRef.current.push(marker);
    }
    const [startLng, startLat] = coords[0];
    startMarkerRef.current = new mapboxgl.Marker({ element: createMarkerElement({ color: "#22d3ee", label: "S" }) })
      .setLngLat([startLng, startLat])
      .addTo(map);
    const [endLng, endLat] = coords[coords.length - 1];
    endMarkerRef.current = new mapboxgl.Marker({ element: createMarkerElement({ color: "#ef4444", label: "E" }) })
      .setLngLat([endLng, endLat])
      .addTo(map);
  };

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
