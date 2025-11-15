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
    avoid_geojson = {"type": "FeatureCollection", "features": risk_polygons} if risk_polygons else None
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
        "risk_polygons": avoid_geojson,
        "warnings": warnings,
    }
    return jsonify(response)


@bp.get("/crime-heatmap")
def crime_heatmap():
    """Return GeoJSON features powering the Mapbox heatmap layer."""

    return jsonify(crime_data_service.get_heatmap())
