# Data Processing Checklist

1. **Ingest** – download NYC Open Data crime CSV/GeoJSON for the target timeframe (nighttime violent incidents) and drop into `data/raw/`.
2. **Normalize** – convert to GeoJSON points (EPSG:4326), keep `hour`, `offense`, and weight each record using severity heuristics.
3. **Cluster + buffer** – use tools in `backend/services/crime_data.py` or `scripts/generate_risk_polygons.py` to cluster points (DBSCAN/grid cells) and buffer them 75–150m via Shapely to form risk polygons.
4. **Export processed** – save cleaned point heatmap + polygon FeatureCollections into `data/processed/` for quick loading.
5. **Wire to backend** – ensure `/crime-heatmap` serves the processed points while `/safe-route` loads polygons overlapping the start/end bounding box to build ORS avoid-polygons payloads.
6. **Cache invalidation** – document when to regenerate risk polygons (e.g., new dataset ingest) and keep scripts idempotent so hackathon teammates can repeat the pipeline quickly.
