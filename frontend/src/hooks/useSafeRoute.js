/**
 * React Query mutation hook that calls the Flask /safe-route endpoint via api.js.
 * Used by RouteForm/dashboard-context to request new shortest/safest routes.
 */
import { useMutation } from "@tanstack/react-query";

import { fetchSafeRoute } from "../services/api";

export function useSafeRoute() {
  const { mutateAsync, data, error, isPending } = useMutation({
    mutationFn: fetchSafeRoute,
  });

  return {
    requestRoute: mutateAsync,
    data,
    isLoading: isPending,
    error,
  };
}
