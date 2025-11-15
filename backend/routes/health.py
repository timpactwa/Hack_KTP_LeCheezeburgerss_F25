"""Simple health/uptime endpoint consumed by platform monitors."""

from __future__ import annotations

from flask import Blueprint, jsonify

from .. import config

bp = Blueprint("health", __name__)


@bp.get("/health")
def healthcheck():
    """Return a static payload confirming the API is running."""

    return jsonify({"status": "ok"})


@bp.get("/health/config")
def config_status():
    """Return configuration status (for debugging, not exposed in production)."""
    
    validation = config.config.validate_required()
    status = config.config.get_status()
    
    return jsonify({
        "status": "ok" if not validation["missing"] else "incomplete",
        "validation": validation,
        "config": status,
    })
