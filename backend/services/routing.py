"""Routing adapter for OpenRouteService (ORS) with graceful fallbacks."""

from __future__ import annotations

import os
from dataclasses import dataclass
from typing import Any, Dict, List, Optional

import requests


class RoutingError(RuntimeError):
    pass


@dataclass
class OpenRouteServiceClient:
    api_key: Optional[str] = None
    base_url: str = "https://api.openrouteservice.org/v2/directions/foot-walking/geojson"

    def __post_init__(self) -> None:
        if not self.api_key:
            self.api_key = os.getenv("ORS_API_KEY")

    def build_route(
        self,
        start: Dict[str, float],
        end: Dict[str, float],
        avoid_polygons: Optional[dict] = None,
    ) -> dict:
        if not self.api_key:
            return self._fallback_route(start, end)

        body: Dict[str, Any] = {
            "coordinates": [[start["lng"], start["lat"]], [end["lng"], end["lat"]]],
        }
        if avoid_polygons:
            body["options"] = {"avoid_polygons": avoid_polygons}

        headers = {"Authorization": self.api_key, "Content-Type": "application/json"}
        response = requests.post(self.base_url, json=body, headers=headers, timeout=15)
        if response.status_code >= 400:
            raise RoutingError(f"ORS error {response.status_code}: {response.text[:200]}")
        data = response.json()
        features = data.get("features") or []
        if not features:
            raise RoutingError("No route returned by ORS")
        properties = features[0].get("properties", {}).get("summary", {})
        return {
            "distance_m": properties.get("distance"),
            "duration_s": properties.get("duration"),
            "geometry": features[0].get("geometry"),
        }

    @staticmethod
    def _fallback_route(start: Dict[str, float], end: Dict[str, float]) -> dict:
        return {
            "distance_m": 1000,
            "duration_s": 900,
            "geometry": {
                "type": "LineString",
                "coordinates": [
                    [start["lng"], start["lat"]],
                    [end["lng"], end["lat"]],
                ],
            },
        }


def summarize_route(route: dict, avoided: int = 0) -> dict:
    return {
        "distance_m": route.get("distance_m"),
        "duration_s": route.get("duration_s"),
        "geometry": route.get("geometry"),
        "risk_areas_avoided": avoided,
    }
