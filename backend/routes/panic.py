"""Blueprint backing the PanicButton CTA in the React UI."""

from __future__ import annotations

from datetime import datetime, timezone

from flask import Blueprint, jsonify, request

bp = Blueprint("panic", __name__)


@bp.post("/panic-alert")
def panic_alert():
    """Pretend to send an SMS and return metadata for the UI."""

    body = request.get_json(silent=True) or {}
    coords = {"lat": body.get("lat"), "lng": body.get("lng")}
    return jsonify(
        {
            "status": "sent",
            "timestamp": datetime.now(tz=timezone.utc).isoformat(),
            "coords": coords,
        }
    )
