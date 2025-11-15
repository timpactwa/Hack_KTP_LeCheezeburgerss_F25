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
    avoid_geojson = build_avoid_polygons(risk_polygons)
    warnings: list[str] = []
    try:
        shortest = ors_client.build_route(start, end)
    except RoutingError as exc:
        warnings.append(str(exc))
        shortest = ors_client._fallback_route(start, end)

    if avoid_geojson:
        try:
            safest = ors_client.build_route(start, end, avoid_geojson)
        except RoutingError as exc:
            warnings.append(f"Safest route fallback: {exc}")
            safest = shortest
    else:
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
