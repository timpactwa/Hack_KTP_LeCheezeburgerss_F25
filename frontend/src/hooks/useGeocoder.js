import { useEffect, useState } from "react";

import { forwardGeocode } from "../services/mapbox";

export function useGeocoder(query, { enabled = true } = {}) {
  const [results, setResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!enabled || !query || query.trim().length < 3) {
      setResults([]);
      return undefined;
    }
    const controller = new AbortController();
    const timeout = setTimeout(() => {
      setIsLoading(true);
      forwardGeocode(query.trim(), { signal: controller.signal })
        .then((features) => {
          setResults(features);
          setError(null);
        })
        .catch((err) => {
          if (err.name === "AbortError") return;
          console.error("geocoder error", err);
          setError("Unable to fetch suggestions");
        })
        .finally(() => setIsLoading(false));
    }, 250);

    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, [query, enabled]);

  return { results, isLoading, error };
}
