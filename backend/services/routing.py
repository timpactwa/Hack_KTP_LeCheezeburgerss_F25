"""Routing adapter that will wrap OpenRouteService (ORS) HTTP calls.

``backend.routes.routes`` will rely on helper functions here to request the
baseline shortest path plus the avoid-polygon safest alternative and then send
that data to the React ``RouteComparisonPanel`` for visualization."""
