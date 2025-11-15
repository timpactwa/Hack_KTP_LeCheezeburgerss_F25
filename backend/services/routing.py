"""Routing adapter for OpenRouteService (ORS) with graceful fallbacks."""

from __future__ import annotations

import os
import time
import logging
from dataclasses import dataclass
from typing import Any, Dict, List, Optional

import requests


class RoutingError(RuntimeError):
    pass


LOGGER = logging.getLogger(__name__)


@dataclass
class OpenRouteServiceClient:
    api_key: Optional[str] = None
    base_url: str = "https://api.openrouteservice.org/v2/directions/foot-walking/geojson"
    max_retries: int = 3
    backoff_factor: float = 0.75

    def __post_init__(self) -> None:
        if not self.api_key:
            from .. import config
            self.api_key = config.config.ORS_API_KEY

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
            # ORS expects avoid_polygons as a MultiPolygon geometry object
            body["options"] = {"avoid_polygons": avoid_polygons}
            # Log polygon count if it's a MultiPolygon
            if isinstance(avoid_polygons, dict) and avoid_polygons.get("type") == "MultiPolygon":
                coord_count = len(avoid_polygons.get("coordinates", []))
                LOGGER.info(f"Using avoid_polygons MultiPolygon with {coord_count} polygon(s)")
            else:
                LOGGER.info(f"Using avoid_polygons geometry: {avoid_polygons.get('type', 'unknown')}")

        # ORS API key format - use key directly (no Bearer prefix needed)
        headers = {"Authorization": self.api_key, "Content-Type": "application/json"}
        last_error: Optional[Exception] = None

        for attempt in range(1, self.max_retries + 1):
            try:
                response = requests.post(self.base_url, json=body, headers=headers, timeout=15)
                self._log_rate_limits(response.headers)
                if response.status_code == 429:
                    last_error = RoutingError("ORS rate limit hit")
                    self._sleep_with_backoff(attempt)
                    continue
                if response.status_code >= 400:
                    error_msg = response.text[:500] if response.text else "No error message"
                    LOGGER.error(f"ORS API error {response.status_code}: {error_msg}")
                    if avoid_polygons:
                        LOGGER.error(f"Request body had avoid_polygons with {len(avoid_polygons.get('features', []))} features")
                    raise RoutingError(f"ORS error {response.status_code}: {error_msg}")

                data = response.json()
                features = data.get("features") or []
                if not features:
                    raise RoutingError("No route returned by ORS")
                geometry = features[0].get("geometry")
                if not geometry or geometry.get("type") != "LineString" or not geometry.get("coordinates"):
                    raise RoutingError("Invalid geometry returned by ORS")
                properties = features[0].get("properties", {}).get("summary", {})
                return {
                    "distance_m": properties.get("distance"),
                    "duration_s": properties.get("duration"),
                    "geometry": geometry,
                }
            except (requests.RequestException, RoutingError) as exc:
                last_error = exc
                LOGGER.warning("ORS request failed (attempt %s/%s): %s", attempt, self.max_retries, exc)
                if attempt < self.max_retries:
                    self._sleep_with_backoff(attempt)
                else:
                    break

        raise RoutingError(str(last_error) if last_error else "ORS request failed")

    def _sleep_with_backoff(self, attempt: int) -> None:
        delay = self.backoff_factor * attempt
        time.sleep(delay)

    @staticmethod
    def _log_rate_limits(headers: Dict[str, str]) -> None:
        remaining = headers.get("x-ratelimit-remaining")
        limit = headers.get("x-ratelimit-limit")
        reset = headers.get("x-ratelimit-reset")
        if remaining:
            LOGGER.debug("ORS rate limit: %s/%s remaining; reset %s", remaining, limit, reset)

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
