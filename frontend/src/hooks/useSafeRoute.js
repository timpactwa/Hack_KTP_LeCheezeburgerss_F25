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
