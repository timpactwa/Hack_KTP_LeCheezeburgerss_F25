"""Crime ingestion + transformation routines shared across the stack."""

from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable, List

from shapely.geometry import Point, Polygon, mapping, shape


def _default_dataset() -> dict:
    return {
        "type": "FeatureCollection",
        "features": [
            {
                "type": "Feature",
                "geometry": {"type": "Point", "coordinates": [-73.996, 40.719]},
                "properties": {"weight": 0.9, "category": "robbery"},
            },
            {
                "type": "Feature",
                "geometry": {"type": "Point", "coordinates": [-73.989, 40.717]},
                "properties": {"weight": 0.7, "category": "assault"},
            },
            {
                "type": "Feature",
                "geometry": {"type": "Point", "coordinates": [-74.002, 40.725]},
                "properties": {"weight": 0.8, "category": "robbery"},
            },
        ],
    }


@dataclass
class CrimeDataService:
    dataset_path: Path
    polygons_path: Path | None = None
    
    def __post_init__(self) -> None:
        self.features = self._load_features()
        self.risk_polygons_cache = self._load_polygons() if self.polygons_path else None
    
    def _load_features(self) -> List[dict]:
        """Load crime point features from dataset."""
        if self.dataset_path.exists():
            with self.dataset_path.open() as fh:
                data = json.load(fh)
        else:
            data = _default_dataset()
        return data.get("features", [])
    
    def _load_polygons(self) -> List[dict] | None:
        """Load pre-processed risk polygons."""
        if not self.polygons_path or not self.polygons_path.exists():
            return None
        with self.polygons_path.open() as fh:
            data = json.load(fh)
        return data.get("features", [])
    
    def get_risk_polygons(self, bbox: dict | None = None) -> List[dict]:
        """Get risk polygons, optionally filtered by bounding box."""
        if self.risk_polygons_cache:
            # Use pre-processed polygons
            polygons = self.risk_polygons_cache
        else:
            # Fallback to old method (buffering individual points)
            filtered = self._filter_by_bbox(self.features, bbox)
            polygons = self._create_polygons_from_points(filtered)
        
        # Filter by bounding box if provided
        if bbox:
            polygons = self._filter_polygons_by_bbox(polygons, bbox)
        
        return polygons
    
    def _filter_polygons_by_bbox(self, polygons: List[dict], bbox: dict) -> List[dict]:
        """Filter polygons that intersect with bounding box."""
        from shapely.geometry import shape, box
        
        min_lat = min(bbox["start"]["lat"], bbox["end"]["lat"]) - 0.01
        max_lat = max(bbox["start"]["lat"], bbox["end"]["lat"]) + 0.01
        min_lng = min(bbox["start"]["lng"], bbox["end"]["lng"]) - 0.01
        max_lng = max(bbox["start"]["lng"], bbox["end"]["lng"]) + 0.01
        
        bbox_shape = box(min_lng, min_lat, max_lng, max_lat)
        filtered = []
        
        for poly_feature in polygons:
            poly_shape = shape(poly_feature["geometry"])
            if bbox_shape.intersects(poly_shape):
                filtered.append(poly_feature)
        
        return filtered
    
    def _create_polygons_from_points(self, features: List[dict]) -> List[dict]:
        """Create simple buffered polygons around crime points (fallback method)."""
        polygons: List[Polygon] = []
        for feature in features:
            geom = shape(feature["geometry"])
            weight = float(feature.get("properties", {}).get("weight", 0.5))
            # Roughly 75-150m buffers
            buffer_distance = 0.001 + (0.001 * weight)
            if isinstance(geom, Point):
                polygons.append(geom.buffer(buffer_distance))
        return [
            {
                "type": "Feature",
                "properties": {"risk_score": round(poly.area * 100000, 2)},
                "geometry": mapping(poly),
            }
            for poly in polygons
        ]
    
    def get_heatmap(self) -> dict:
        """Get heatmap data (crime points)."""
        return {"type": "FeatureCollection", "features": self.features}
    
    @staticmethod
    def _filter_by_bbox(features: Iterable[dict], bbox: dict | None) -> List[dict]:
        """Filter features by bounding box."""
        if not bbox:
            return list(features)
        min_lat = min(bbox["start"]["lat"], bbox["end"]["lat"]) - 0.01
        max_lat = max(bbox["start"]["lat"], bbox["end"]["lat"]) + 0.01
        min_lng = min(bbox["start"]["lng"], bbox["end"]["lng"]) - 0.01
        max_lng = max(bbox["start"]["lng"], bbox["end"]["lng"]) + 0.01
        filtered = []
        for feature in features:
            lng, lat = feature["geometry"]["coordinates"]
            if min_lat <= lat <= max_lat and min_lng <= lng <= max_lng:
                filtered.append(feature)
        return filtered


DATASET_PATH = Path(__file__).resolve().parents[2] / "data" / "raw" / "nyc_crime_sample.geojson"
POLYGONS_PATH = Path(__file__).resolve().parents[2] / "data" / "processed" / "risk_polygons.geojson"
crime_data_service = CrimeDataService(
    dataset_path=DATASET_PATH,
    polygons_path=POLYGONS_PATH
)
