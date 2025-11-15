"""Simple health/uptime endpoint consumed by platform monitors."""

from __future__ import annotations

from flask import Blueprint, jsonify

bp = Blueprint("health", __name__)


@bp.get("/health")
def healthcheck():
    """Return a static payload confirming the API is running."""

    return jsonify({"status": "ok"})
