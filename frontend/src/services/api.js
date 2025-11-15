// Central Axios wrapper that will handle base URLs, auth headers, and
// serialization for every Flask endpoint (login/register, safe-route,
// crime-heatmap, panic-alert). Hooks such as useSafeRoute/useGeolocation consume
// these helpers to stay DRY.
