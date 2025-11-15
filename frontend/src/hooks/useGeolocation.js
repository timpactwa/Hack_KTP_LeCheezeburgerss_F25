/**
 * Hook that wraps the browser Geolocation API so the map + panic button know
 * the user's live coordinates.
 */
import { useEffect, useRef, useState } from "react";

export function useGeolocation(options = { enableHighAccuracy: true }) {
  const [coords, setCoords] = useState(null);
  const [error, setError] = useState(null);
  const optionsRef = useRef(options);

  useEffect(() => {
    if (!navigator.geolocation) {
      setError("Geolocation not supported");
      return undefined;
    }
    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        setCoords({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
        setError(null);
      },
      (err) => setError(err.message),
      optionsRef.current
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  return { coords, error };
}
