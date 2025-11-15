"""Blueprint powering routing + heatmap APIs for the dashboard."""

from __future__ import annotations

from flask import Blueprint, jsonify, request

from ..services import mock_data

bp = Blueprint("routes", __name__)


@bp.post("/safe-route")
def safe_route():
    """Return mock route data until OpenRouteService integration lands."""

    payload = request.get_json(silent=True) or {}
    start = payload.get("start")
    end = payload.get("end")
    return jsonify(mock_data.get_mock_route_response(start=start, end=end))


@bp.get("/crime-heatmap")
def crime_heatmap():
    """Return mock heatmap features used by the Mapbox layer."""

    return jsonify(mock_data.get_mock_heatmap())
