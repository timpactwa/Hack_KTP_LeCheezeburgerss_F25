"""Utility stub for building GeoJSON risk zones consumed by routing services.

The future implementation will pull CSV/GeoJSON inputs from ``data/raw``, reuse
clustering/buffering helpers in ``backend/services/crime_data.py``, and emit the
avoid-polygons collection back into ``data/processed`` so ``/safe-route`` can
feed it to OpenRouteService."""
