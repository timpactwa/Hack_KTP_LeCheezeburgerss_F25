import { useEffect, useRef, useCallback } from "react";

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
  const selectionStartMarkerRef = useRef(null);
  const selectionEndMarkerRef = useRef(null);
  const popupRef = useRef(new mapboxgl.Popup({ closeButton: false, closeOnClick: false }));
  const { routeData, heatmapData, activeRouteKey, heatmapVisible, mapSelectionTarget, completeMapSelection, selectedStartCoords, selectedEndCoords } = useDashboard();
  
  // Helper function to update selection markers
  const updateSelectionMarkers = useCallback((map) => {
    if (!map) return;
    
    try {
      // Update start selection marker
      if (selectedStartCoords) {
        if (selectionStartMarkerRef.current) {
          selectionStartMarkerRef.current.setLngLat([selectedStartCoords.lng, selectedStartCoords.lat]);
        } else {
          const marker = new mapboxgl.Marker({
            element: createMarkerElement({ color: "#22d3ee", label: "S" }),
            draggable: false,
          })
            .setLngLat([selectedStartCoords.lng, selectedStartCoords.lat])
            .addTo(map);
          selectionStartMarkerRef.current = marker;
        }
      } else {
        if (selectionStartMarkerRef.current) {
          selectionStartMarkerRef.current.remove();
          selectionStartMarkerRef.current = null;
        }
      }
      
      // Update end selection marker
      if (selectedEndCoords) {
        if (selectionEndMarkerRef.current) {
          selectionEndMarkerRef.current.setLngLat([selectedEndCoords.lng, selectedEndCoords.lat]);
        } else {
          const marker = new mapboxgl.Marker({
            element: createMarkerElement({ color: "#ef4444", label: "E" }),
            draggable: false,
          })
            .setLngLat([selectedEndCoords.lng, selectedEndCoords.lat])
            .addTo(map);
          selectionEndMarkerRef.current = marker;
        }
      } else {
        if (selectionEndMarkerRef.current) {
          selectionEndMarkerRef.current.remove();
          selectionEndMarkerRef.current = null;
        }
      }
    } catch (error) {
      console.error("Error updating selection markers:", error);
    }
  }, [selectedStartCoords, selectedEndCoords]);

  useEffect(() => {
    // Prevent multiple initializations
    if (mapRef.current) {
      return;
    }
    
    if (!mapNodeRef.current) {
      console.warn("Map container ref is not available yet");
      return;
    }
    
    if (!mapboxgl.accessToken) {
      console.error("Mapbox access token is missing. Add VITE_MAPBOX_TOKEN to your frontend/.env file");
      return;
    }
    
    try {
      console.log("Initializing map with container:", mapNodeRef.current);
      mapRef.current = createBaseMap(mapNodeRef.current);
      
      // Wait for style to load before adding controls
      mapRef.current.once("style.load", () => {
        console.log("Map style loaded, adding controls");
        mapRef.current.addControl(new mapboxgl.NavigationControl(), "top-left");
      });
      
      mapRef.current.on("load", () => {
        console.log("Map fully loaded and ready");
      });
      
      mapRef.current.on("error", (e) => {
        console.error("Map error:", e.error?.message || e);
      });
      
      console.log("Map initialization started");
    } catch (error) {
      console.error("Failed to initialize map:", error);
      console.error("Error details:", error.message, error.stack);
    }
    
    return () => {
      if (mapRef.current) {
        console.log("Cleaning up map");
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []); // Empty deps - only run once on mount

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    
    // Change cursor when in selection mode
    const canvas = map.getCanvas();
    if (canvas) {
      if (mapSelectionTarget) {
        canvas.style.cursor = "crosshair";
      } else {
        canvas.style.cursor = "";
      }
    }
    
    const handleClick = (event) => {
      if (!mapSelectionTarget) return;
      completeMapSelection({ lat: event.lngLat.lat, lng: event.lngLat.lng });
    };
    map.on("click", handleClick);
    return () => {
      if (map) {
        map.off("click", handleClick);
        const canvas = map.getCanvas();
        if (canvas) {
          canvas.style.cursor = "";
        }
      }
    };
  }, [mapSelectionTarget, completeMapSelection]);
  
  // Update selection markers when coordinates change
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    
    if (!map.isStyleLoaded()) {
      // Wait for map to be ready
      const handleStyleLoad = () => {
        setTimeout(() => {
          const currentMap = mapRef.current;
          if (currentMap && currentMap.isStyleLoaded()) {
            updateSelectionMarkers(currentMap);
          }
        }, 100);
      };
      map.once("style.load", handleStyleLoad);
      return () => {
        map.off("style.load", handleStyleLoad);
      };
    }
    
    updateSelectionMarkers(map);
  }, [selectedStartCoords, selectedEndCoords, updateSelectionMarkers]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    
    // Wait for map style to be loaded before adding heatmap
    const addHeatmap = () => {
      if (!heatmapData || !heatmapData.features || heatmapData.features.length === 0) {
        console.warn("No heatmap data available");
        return;
      }
      
      try {
        ensureGeoJSONSource(map, "crime", heatmapData);
        ensureHeatmapLayer(map, "crime");
        map.setLayoutProperty(
          "crime-heatmap",
          "visibility",
          heatmapVisible ? "visible" : "none"
        );
        console.log(`Heatmap layer added with ${heatmapData.features.length} points`);
      } catch (error) {
        console.error("Failed to add heatmap layer:", error);
      }
    };
    
    if (!map.isStyleLoaded()) {
      map.once("style.load", addHeatmap);
      return;
    }
    
    addHeatmap();
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
    // Note: Don't clear selection markers - they should persist
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
        <h2>Mapbox Token Missing</h2>
        <p>Add <code>VITE_MAPBOX_TOKEN</code> to your <code>frontend/.env</code> file</p>
        <p style={{ fontSize: "0.9rem", marginTop: "1rem", opacity: 0.8 }}>
          Get your token from: <a href="https://account.mapbox.com/access-tokens/" target="_blank" rel="noopener noreferrer" style={{ color: "#34d399" }}>https://account.mapbox.com/access-tokens/</a>
        </p>
        <p style={{ fontSize: "0.85rem", marginTop: "0.5rem", opacity: 0.7 }}>
          After adding the token, restart the dev server (Ctrl+C then npm run dev)
        </p>
        <p style={{ fontSize: "0.8rem", marginTop: "0.5rem", opacity: 0.6 }}>
          Debug: Token is {mapboxgl.accessToken ? "present" : "missing"}
        </p>
      </div>
    );
  }

  return (
    <div className="mapbox-container" ref={mapNodeRef} style={{ width: "100%", height: "100%" }} />
  );
}

export default MapDashboard;
