import { createContext, useContext, useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";

import { fetchCrimeHeatmap } from "../services/api";
import { useSafeRoute } from "../hooks/useSafeRoute";

const DashboardContext = createContext(undefined);
const DEFAULT_COORDS = {
  start: { lat: 40.73061, lng: -74.0007 },
  end: { lat: 40.7152, lng: -73.983 },
};

export function DashboardProvider({ children }) {
  const [activeRouteKey, setActiveRouteKey] = useState("safest");
  const { data: routeData, isLoading: isRouteLoading, error: routeError, requestRoute } =
    useSafeRoute();
  const [lastRouteParams, setLastRouteParams] = useState(DEFAULT_COORDS);

  const {
    data: heatmapData,
    isLoading: isHeatmapLoading,
    error: heatmapError,
  } = useQuery({ 
    queryKey: ["crime-heatmap"], 
    queryFn: fetchCrimeHeatmap,
    retry: 2,
    retryDelay: 1000,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });
  
  // Log heatmap errors for debugging
  useEffect(() => {
    if (heatmapError) {
      console.error("Failed to load heatmap data:", heatmapError);
      if (heatmapError.message?.includes("CONNECTION_REFUSED") || heatmapError.code === "ECONNREFUSED") {
        console.error("⚠️ Backend server is not running. Start it with: py run_backend.py");
      }
    }
  }, [heatmapError]);
  const [heatmapVisible, setHeatmapVisible] = useState(true);
  const [mapSelectionTarget, setMapSelectionTarget] = useState(null);
  const mapSelectionCallbacks = useRef({});
  const [selectedStartCoords, setSelectedStartCoords] = useState(null);
  const [selectedEndCoords, setSelectedEndCoords] = useState(null);

  const registerMapSelectionHandler = useCallback((field, handler) => {
    mapSelectionCallbacks.current[field] = handler;
    return () => {
      delete mapSelectionCallbacks.current[field];
    };
  }, []);

  const beginMapSelection = useCallback((field) => {
    setMapSelectionTarget(field);
  }, []);

  const completeMapSelection = useCallback(
    (coords) => {
      if (mapSelectionTarget && mapSelectionCallbacks.current[mapSelectionTarget]) {
        mapSelectionCallbacks.current[mapSelectionTarget](coords);
        // Store coordinates for marker display
        if (mapSelectionTarget === "start") {
          setSelectedStartCoords(coords);
        } else if (mapSelectionTarget === "end") {
          setSelectedEndCoords(coords);
        }
      }
      setMapSelectionTarget(null);
    },
    [mapSelectionTarget]
  );
  
  const updateSelectedCoords = useCallback((field, coords) => {
    if (field === "start") {
      setSelectedStartCoords(coords);
    } else if (field === "end") {
      setSelectedEndCoords(coords);
    }
  }, []);

  useEffect(() => {
    requestRoute(DEFAULT_COORDS).catch((err) => console.error("route init", err));
    setLastRouteParams(DEFAULT_COORDS);
  }, [requestRoute]);

  const triggerRouteRequest = useCallback(
    (payload) => {
      const params = payload || lastRouteParams || DEFAULT_COORDS;
      setLastRouteParams(params);
      return requestRoute(params);
    },
    [lastRouteParams, requestRoute]
  );

  const value = useMemo(
    () => ({
      activeRouteKey,
      setActiveRouteKey,
      routeData,
      isRouteLoading,
      routeError,
      requestRoute: triggerRouteRequest,
      lastRouteParams,
      heatmapVisible,
      setHeatmapVisible,
      heatmapData,
      isHeatmapLoading,
      heatmapError,
      mapSelectionTarget,
      beginMapSelection,
      registerMapSelectionHandler,
      completeMapSelection,
      selectedStartCoords,
      selectedEndCoords,
      updateSelectedCoords,
    }),
    [
      activeRouteKey,
      routeData,
      isRouteLoading,
      routeError,
      triggerRouteRequest,
      lastRouteParams,
      heatmapVisible,
      setHeatmapVisible,
      heatmapData,
      isHeatmapLoading,
      heatmapError,
      mapSelectionTarget,
      beginMapSelection,
      registerMapSelectionHandler,
      completeMapSelection,
      selectedStartCoords,
      selectedEndCoords,
      updateSelectedCoords,
    ]
  );

  return <DashboardContext.Provider value={value}>{children}</DashboardContext.Provider>;
}

export function useDashboard() {
  const ctx = useContext(DashboardContext);
  if (!ctx) {
    throw new Error("useDashboard must be used inside DashboardProvider");
  }
  return ctx;
}
