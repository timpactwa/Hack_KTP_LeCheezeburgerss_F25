import { createContext, useContext, useEffect, useMemo, useState } from "react";
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

  const {
    data: heatmapData,
    isLoading: isHeatmapLoading,
    error: heatmapError,
  } = useQuery({ queryKey: ["crime-heatmap"], queryFn: fetchCrimeHeatmap });
  const [heatmapVisible, setHeatmapVisible] = useState(true);

  useEffect(() => {
    requestRoute(DEFAULT_COORDS).catch((err) => console.error("route init", err));
  }, [requestRoute]);

  const value = useMemo(
    () => ({
      activeRouteKey,
      setActiveRouteKey,
      routeData,
      isRouteLoading,
      routeError,
      requestRoute,
      heatmapVisible,
      setHeatmapVisible,
      heatmapData,
      isHeatmapLoading,
      heatmapError,
    }),
    [
      activeRouteKey,
      routeData,
      isRouteLoading,
      routeError,
      requestRoute,
      heatmapVisible,
      setHeatmapVisible,
      heatmapData,
      isHeatmapLoading,
      heatmapError,
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
