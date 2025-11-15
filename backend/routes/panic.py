"""Blueprint backing the PanicButton CTA in the React UI.

The PanicButton component posts here; we then fetch trusted contacts from the
database and call :func:`backend.services.notifications.send_panic_alert` to
fire Twilio (or log-only) SMS messages.
"""

from __future__ import annotations

from datetime import datetime, timezone

from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt_identity, jwt_required

from ..database import db_session
from ..models import PanicAlert, User
from ..services.notifications import send_panic_alert

bp = Blueprint("panic", __name__)


@bp.post("/panic-alert")
@jwt_required()
def panic_alert():
    """Send SMS alerts to trusted contacts and log the event."""

    user_id = get_jwt_identity()
    try:
        user_id = int(user_id)
    except (TypeError, ValueError):
        return jsonify({"error": "invalid token"}), 401
    body = request.get_json(silent=True) or {}
    lat = body.get("lat")
    lng = body.get("lng")

    with db_session() as session:
        user: User | None = session.get(User, user_id)
        if not user:
            return jsonify({"error": "user not found"}), 404
        contacts = [contact.phone_number for contact in user.contacts]
        result = send_panic_alert(contacts, lat, lng)

        alert = PanicAlert(user_id=user.id, latitude=lat, longitude=lng, status=result.get("status"))
        session.add(alert)
        session.flush()

    return jsonify(
        {
            "status": result.get("status"),
            "timestamp": datetime.now(tz=timezone.utc).isoformat(),
            "coords": {"lat": lat, "lng": lng},
        }
    )
