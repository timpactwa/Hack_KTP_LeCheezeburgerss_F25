"""Geocoding service using Mapbox Geocoding API with caching."""

from __future__ import annotations

import hashlib
import json
import os
import time
import logging
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional
from pathlib import Path

import requests


class GeocodingError(RuntimeError):
    pass


LOGGER = logging.getLogger(__name__)


@dataclass
class GeocodingCache:
    """Simple in-memory cache with optional file persistence."""
    
    cache: Dict[str, Dict[str, Any]] = field(default_factory=dict)
    ttl_seconds: int = 86400  # 24 hours default TTL
    cache_file: Optional[Path] = None
    
    def __post_init__(self) -> None:
        """Load cache from file if it exists."""
        if self.cache_file and self.cache_file.exists():
            try:
                with self.cache_file.open() as f:
                    data = json.load(f)
                    # Only load entries that haven't expired
                    now = time.time()
                    for key, value in data.items():
                        if value.get("expires_at", 0) > now:
                            self.cache[key] = value
                LOGGER.debug("Loaded %d cached geocoding results", len(self.cache))
            except Exception as e:
                LOGGER.warning("Failed to load geocoding cache: %s", e)
    
    def _make_key(self, query: str) -> str:
        """Generate cache key from query."""
        return hashlib.md5(query.encode()).hexdigest()
    
    def get(self, query: str) -> Optional[Dict[str, Any]]:
        """Get cached result if not expired."""
        key = self._make_key(query)
        entry = self.cache.get(key)
        if entry and entry.get("expires_at", 0) > time.time():
            return entry.get("data")
        # Remove expired entry
        if entry:
            del self.cache[key]
        return None
    
    def set(self, query: str, data: Dict[str, Any]) -> None:
        """Cache result with TTL."""
        key = self._make_key(query)
        self.cache[key] = {
            "data": data,
            "expires_at": time.time() + self.ttl_seconds,
        }
        # Persist to file if configured
        if self.cache_file:
            try:
                with self.cache_file.open("w") as f:
                    json.dump(self.cache, f)
            except Exception as e:
                LOGGER.warning("Failed to persist geocoding cache: %s", e)


@dataclass
class MapboxGeocodingClient:
    """Client for Mapbox Geocoding API."""
    
    api_key: Optional[str] = None
    base_url: str = "https://api.mapbox.com/geocoding/v5/mapbox.places"
    cache: Optional[GeocodingCache] = None
    max_retries: int = 3
    timeout: int = 10
    
    def __post_init__(self) -> None:
        """Initialize API key and cache."""
        if not self.api_key:
            # Try MAPBOX_ACCESS_TOKEN first, then fallback to MAPBOX_TOKEN
            self.api_key = os.getenv("MAPBOX_ACCESS_TOKEN") or os.getenv("MAPBOX_TOKEN")
        
        if not self.cache:
            # Use file-based cache in project root
            project_root = Path(__file__).resolve().parents[2]
            cache_file = project_root / "data" / "cache" / "geocoding_cache.json"
            cache_file.parent.mkdir(parents=True, exist_ok=True)
            self.cache = GeocodingCache(cache_file=cache_file)
    
    def forward_geocode(
        self,
        query: str,
        limit: int = 5,
        proximity: Optional[tuple[float, float]] = None,
    ) -> List[Dict[str, Any]]:
        """
        Convert address/place name to coordinates.
        
        Args:
            query: Address or place name to search
            limit: Maximum number of results (default: 5)
            proximity: Optional (lng, lat) tuple to bias results
        
        Returns:
            List of GeoJSON features with coordinates and place names
        """
        if not query or len(query.strip()) < 3:
            return []
        
        query = query.strip()
        
        # Check cache first
        cache_key = f"forward:{query}:{limit}:{proximity}"
        cached = self.cache.get(cache_key) if self.cache else None
        if cached:
            LOGGER.debug("Cache hit for forward geocode: %s", query)
            return cached
        
        if not self.api_key:
            raise GeocodingError("Mapbox access token not configured")
        
        # Build URL
        encoded_query = requests.utils.quote(query)
        url = f"{self.base_url}/{encoded_query}.json"
        
        params = {
            "access_token": self.api_key,
            "autocomplete": "true",
            "limit": str(limit),
            "language": "en",
        }
        
        if proximity:
            params["proximity"] = f"{proximity[0]},{proximity[1]}"
        
        last_error: Optional[Exception] = None
        
        for attempt in range(1, self.max_retries + 1):
            try:
                response = requests.get(url, params=params, timeout=self.timeout)
                
                if response.status_code == 401:
                    raise GeocodingError("Invalid Mapbox access token")
                if response.status_code == 429:
                    LOGGER.warning("Mapbox rate limit hit, retrying...")
                    time.sleep(0.5 * attempt)
                    continue
                if response.status_code >= 400:
                    raise GeocodingError(
                        f"Mapbox geocoding error {response.status_code}: {response.text[:200]}"
                    )
                
                data = response.json()
                features = data.get("features", [])
                
                # Cache the result
                if self.cache:
                    self.cache.set(cache_key, features)
                
                return features
                
            except requests.RequestException as exc:
                last_error = exc
                LOGGER.warning(
                    "Mapbox geocoding request failed (attempt %s/%s): %s",
                    attempt,
                    self.max_retries,
                    exc,
                )
                if attempt < self.max_retries:
                    time.sleep(0.5 * attempt)
                else:
                    break
        
        raise GeocodingError(
            f"Failed to geocode address after {self.max_retries} attempts: {last_error}"
        )
    
    def reverse_geocode(
        self,
        lng: float,
        lat: float,
        limit: int = 1,
    ) -> Optional[Dict[str, Any]]:
        """
        Convert coordinates to address.
        
        Args:
            lng: Longitude
            lat: Latitude
            limit: Maximum number of results (default: 1)
        
        Returns:
            GeoJSON feature with address information, or None if not found
        """
        if not isinstance(lng, (int, float)) or not isinstance(lat, (int, float)):
            return None
        
        # Round coordinates to ~10m precision for caching
        lng_rounded = round(lng, 4)
        lat_rounded = round(lat, 4)
        
        # Check cache first
        cache_key = f"reverse:{lng_rounded}:{lat_rounded}:{limit}"
        cached = self.cache.get(cache_key) if self.cache else None
        if cached:
            LOGGER.debug("Cache hit for reverse geocode: %s,%s", lng, lat)
            return cached
        
        if not self.api_key:
            raise GeocodingError("Mapbox access token not configured")
        
        # Build URL
        url = f"{self.base_url}/{lng},{lat}.json"
        
        params = {
            "access_token": self.api_key,
            "limit": str(limit),
            "language": "en",
        }
        
        last_error: Optional[Exception] = None
        
        for attempt in range(1, self.max_retries + 1):
            try:
                response = requests.get(url, params=params, timeout=self.timeout)
                
                if response.status_code == 401:
                    raise GeocodingError("Invalid Mapbox access token")
                if response.status_code == 429:
                    LOGGER.warning("Mapbox rate limit hit, retrying...")
                    time.sleep(0.5 * attempt)
                    continue
                if response.status_code >= 400:
                    raise GeocodingError(
                        f"Mapbox reverse geocoding error {response.status_code}: {response.text[:200]}"
                    )
                
                data = response.json()
                features = data.get("features", [])
                result = features[0] if features else None
                
                # Cache the result (even if None)
                if self.cache:
                    self.cache.set(cache_key, result)
                
                return result
                
            except requests.RequestException as exc:
                last_error = exc
                LOGGER.warning(
                    "Mapbox reverse geocoding request failed (attempt %s/%s): %s",
                    attempt,
                    self.max_retries,
                    exc,
                )
                if attempt < self.max_retries:
                    time.sleep(0.5 * attempt)
                else:
                    break
        
        raise GeocodingError(
            f"Failed to reverse geocode coordinates after {self.max_retries} attempts: {last_error}"
        )


# Global instance
_geocoding_client: Optional[MapboxGeocodingClient] = None


def get_geocoding_client() -> MapboxGeocodingClient:
    """Get or create the global geocoding client instance."""
    global _geocoding_client
    if _geocoding_client is None:
        _geocoding_client = MapboxGeocodingClient()
    return _geocoding_client

