"""Blueprint powering routing + heatmap APIs for the dashboard."""

from __future__ import annotations

from flask import Blueprint, jsonify, request

from ..services.crime_data import crime_data_service
from ..services.routing import OpenRouteServiceClient, RoutingError, summarize_route

bp = Blueprint("routes", __name__)
ors_client = OpenRouteServiceClient()


@bp.post("/safe-route")
def safe_route():
    """Fetch shortest + safest routes leveraging risk polygons."""

    payload = request.get_json(silent=True) or {}
    start = payload.get("start")
    end = payload.get("end")
    if not (start and end):
        return jsonify({"error": "start and end payloads required"}), 400

    risk_polygons = crime_data_service.get_risk_polygons({"start": start, "end": end})
<<<<<<< HEAD
    
    # Log for debugging
    import logging
    logger = logging.getLogger(__name__)
    logger.info(f"Found {len(risk_polygons)} risk polygons for route")
    
    # Convert FeatureCollection to MultiPolygon format for ORS API
    # ORS expects avoid_polygons as a MultiPolygon geometry, not FeatureCollection
    avoid_polygons_geometry = None
    if risk_polygons:
        from shapely.geometry import shape, MultiPolygon
        try:
            # Extract geometries from features and combine into MultiPolygon
            geometries = []
            for feature in risk_polygons:
                geom = shape(feature["geometry"])
                if geom.is_valid:
                    geometries.append(geom)
            
            if geometries:
                # Filter out very large polygons (ORS has a 200,000 km² limit)
                # Also simplify complex polygons to reduce API payload size
                filtered_geoms = []
                for geom in geometries:
                    # Check area (rough estimate: 1 degree² ≈ 12,000 km² at NYC latitude)
                    # So 0.1 degree² ≈ 1,200 km² - reasonable limit
                    if geom.area < 0.1:
                        # Simplify polygon if it has too many points (reduce to ~100 points max)
                        if hasattr(geom, 'exterior') and len(geom.exterior.coords) > 100:
                            geom = geom.simplify(0.0001, preserve_topology=True)
                        filtered_geoms.append(geom)
                    else:
                        logger.warning(f"Skipping large polygon (area: {geom.area:.4f})")
                
                if not filtered_geoms:
                    logger.warning("All polygons filtered out due to size, using first polygon")
                    filtered_geoms = geometries[:1] if geometries else []
                
                if filtered_geoms:
                    # Combine all polygons into a MultiPolygon
                    multipoly = MultiPolygon(filtered_geoms)
                    if multipoly.is_valid:
                        from shapely.geometry import mapping
                        avoid_polygons_geometry = mapping(multipoly)
                        logger.info(f"Created MultiPolygon with {len(filtered_geoms)} polygons for avoid_polygons")
                    else:
                        logger.warning("MultiPolygon is invalid, using first polygon")
                        # Fallback: use first polygon if MultiPolygon fails
                        avoid_polygons_geometry = mapping(filtered_geoms[0])
        except Exception as e:
            logger.error(f"Failed to create MultiPolygon: {e}")
            avoid_polygons_geometry = None
    
=======
    avoid_geojson = build_avoid_polygons(risk_polygons)
>>>>>>> 898efa855e993300bc280a851cf36391a6ec7369
    warnings: list[str] = []
    try:
        shortest = ors_client.build_route(start, end)
    except RoutingError as exc:
        warnings.append(str(exc))
        shortest = ors_client._fallback_route(start, end)

    if avoid_polygons_geometry and len(risk_polygons) > 0:
        try:
            logger.info(f"Building safest route with avoid_polygons MultiPolygon")
            safest = ors_client.build_route(start, end, avoid_polygons_geometry)
            # Check if routes are actually different
            if safest.get("geometry") == shortest.get("geometry"):
                logger.warning("Safest route is identical to shortest route - ORS may not be avoiding polygons")
                warnings.append("Safest route matches shortest (no risk zones to avoid or ORS limitation)")
        except RoutingError as exc:
            warnings.append(f"Safest route fallback: {exc}")
            logger.error(f"Failed to build safest route: {exc}")
            safest = shortest
    else:
        logger.info("No risk polygons found, using shortest route for both")
        safest = shortest

    response = {
        "start": start,
        "end": end,
        "shortest": summarize_route(shortest, avoided=0),
        "safest": summarize_route(safest, avoided=len(risk_polygons)),
        "risk_polygons": {"type": "FeatureCollection", "features": risk_polygons} if risk_polygons else None,
        "warnings": warnings,
    }
    return jsonify(response)


def build_avoid_polygons(features):
    """Convert risk polygon features into ORS-compatible Polygon/MultiPolygon."""

    if not features:
        return None

    polygons = []
    for feature in features:
        geometry = feature.get("geometry") or {}
        gtype = geometry.get("type")
        coords = geometry.get("coordinates")
        if not coords:
            continue
        if gtype == "Polygon":
            if len(coords[0]) >= 4:
                polygons.append(coords)
        elif gtype == "MultiPolygon":
            for poly in coords:
                if poly and len(poly[0]) >= 4:
                    polygons.append(poly)

    if not polygons:
        return None

    if len(polygons) == 1:
        return {"type": "Polygon", "coordinates": polygons[0]}
    return {"type": "MultiPolygon", "coordinates": polygons}


@bp.get("/crime-heatmap")
def crime_heatmap():
    """Return GeoJSON features powering the Mapbox heatmap layer."""

    return jsonify(crime_data_service.get_heatmap())
