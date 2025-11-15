"""Notification adapter that keeps SMS provider logic isolated.

This layer is consumed by :mod:`backend.routes.panic` so the API can trigger
alerts without knowing anything about Twilio. It loads credentials from
``backend.config`` and either calls the real Twilio REST API or logs a
simulated message for local development.
"""

from __future__ import annotations

import logging
import os
from datetime import datetime

try:
    from twilio.rest import Client
except ImportError:  # pragma: no cover - optional dependency
    Client = None  # type: ignore

LOGGER = logging.getLogger(__name__)


def send_panic_alert(phone_numbers: list[str], lat: float | None, lng: float | None) -> dict:
    """Send a panic SMS to every phone number, falling back to logging."""

    if not phone_numbers:
        return {"status": "no_contacts"}

    from .. import config
    sid = config.config.TWILIO_SID
    token = config.config.TWILIO_AUTH_TOKEN
    from_number = config.config.TWILIO_FROM_NUMBER
    map_link = f"https://www.google.com/maps/search/?api=1&query={lat},{lng}" if lat and lng else "Location unavailable"
    body = f"SafeRoute alert at {datetime.utcnow().isoformat()} UTC. View: {map_link}"

    # When running locally we often skip Twilio credentials, so short-circuit to
    # a log-only path that mirrors the payload a user would see.
    if not (sid and token and from_number and Client) or "replace-with" in (sid or ""):
        LOGGER.info("Simulated SMS to %s: %s", phone_numbers, body)
        return {"status": "simulated", "message": body}

    client = Client(sid, token)
    for recipient in phone_numbers:
        client.messages.create(to=recipient, from_=from_number, body=body)
    return {"status": "sent", "count": len(phone_numbers)}
