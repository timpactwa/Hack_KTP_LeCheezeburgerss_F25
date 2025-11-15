"""Mock payloads shared between Flask stubs and frontend dev mocks."""

from __future__ import annotations

MOCK_ROUTE_RESPONSE = {
    "shortest": {
        "distance_m": 3200,
        "duration_s": 2400,
        "geometry": {
            "type": "LineString",
            "coordinates": [
                [-74.0007, 40.7306],
                [-73.997, 40.724],
                [-73.989, 40.7187],
                [-73.983, 40.7152],
            ],
        },
    },
    "safest": {
        "distance_m": 3600,
        "duration_s": 2600,
        "risk_areas_avoided": 7,
        "geometry": {
            "type": "LineString",
            "coordinates": [
                [-74.0007, 40.7306],
                [-74.002, 40.725],
                [-73.996, 40.7195],
                [-73.989, 40.7172],
                [-73.983, 40.7152],
            ],
        },
    },
    "start": {"lat": 40.7306, "lng": -74.0007},
    "end": {"lat": 40.7152, "lng": -73.983},
}

MOCK_HEATMAP = {
    "type": "FeatureCollection",
    "features": [
        {
            "type": "Feature",
            "geometry": {"type": "Point", "coordinates": [-73.995, 40.7201]},
            "properties": {"weight": 0.8},
        },
        {
            "type": "Feature",
            "geometry": {"type": "Point", "coordinates": [-73.989, 40.717]},
            "properties": {"weight": 0.6},
        },
        {
            "type": "Feature",
            "geometry": {"type": "Point", "coordinates": [-74.001, 40.727]},
            "properties": {"weight": 0.9},
        },
    ],
}


def get_mock_route_response(start: dict | None = None, end: dict | None = None):
    """Return a shallow copy of the mock route payload with optional overrides."""

    payload = {**MOCK_ROUTE_RESPONSE}
    if start:
        payload["start"] = start
    if end:
        payload["end"] = end
    return payload


def get_mock_heatmap():
    """Return the mock crime heatmap feature collection."""

    return MOCK_HEATMAP
