"""Blueprint stub for authentication endpoints consumed by React auth pages."""

from __future__ import annotations

from flask import Blueprint, jsonify, request

bp = Blueprint("auth", __name__)


def _build_user_payload(email: str):
    return {"id": 1, "email": email, "trusted_contacts": ["+15555555555"]}


@bp.post("/register")
def register():
    """Return a dummy token + user profile until persistence is wired up."""

    body = request.get_json(silent=True) or {}
    email = body.get("email", "demo@example.com")
    return jsonify({"token": "demo-token", "user": _build_user_payload(email)})


@bp.post("/login")
def login():
    """Return the same dummy payload as /register for now."""

    body = request.get_json(silent=True) or {}
    email = body.get("email", "demo@example.com")
    return jsonify({"token": "demo-token", "user": _build_user_payload(email)})
