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

    def __post_init__(self) -> None:
        self.features = self._load_features()

    def _load_features(self) -> List[dict]:
        if self.dataset_path.exists():
            with self.dataset_path.open() as fh:
                data = json.load(fh)
        else:
            data = _default_dataset()
        return data.get("features", [])

    def get_heatmap(self) -> dict:
        return {"type": "FeatureCollection", "features": self.features}

    def get_risk_polygons(self, bbox: dict | None = None) -> List[dict]:
        """Create simple buffered polygons around the densest crime points."""

        filtered = self._filter_by_bbox(self.features, bbox)
        polygons: List[Polygon] = []
        for feature in filtered:
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

    @staticmethod
    def _filter_by_bbox(features: Iterable[dict], bbox: dict | None) -> List[dict]:
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


DATASET_PATH = Path(__file__).resolve().parents[1] / "data" / "raw" / "nyc_crime_sample.geojson"
crime_data_service = CrimeDataService(dataset_path=DATASET_PATH)
