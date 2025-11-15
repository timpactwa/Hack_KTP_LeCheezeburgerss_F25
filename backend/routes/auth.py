"""Blueprint implementing registration + login flows."""

from __future__ import annotations

from flask import Blueprint, jsonify, request
from flask_jwt_extended import create_access_token
from sqlalchemy.exc import IntegrityError

from ..database import db_session
from ..services import auth as auth_service

bp = Blueprint("auth", __name__)


def _serialize_user(user):
    return {
        "id": user.id,
        "email": user.email,
        "default_phone": user.default_phone,
        "trusted_contacts": [contact.phone_number for contact in user.contacts],
    }


@bp.post("/register")
def register():
    body = request.get_json(silent=True) or {}
    email = body.get("email", "").strip()
    password = body.get("password", "")
    phone = body.get("phone")
    if not email or not password:
        return jsonify({"error": "email and password required"}), 400

    with db_session() as session:
        if auth_service.get_user_by_email(session, email):
            return jsonify({"error": "email already registered"}), 409
        try:
            user = auth_service.create_user(session, email=email, password=password, phone=phone)
            session.refresh(user)
        except IntegrityError:
            session.rollback()
            return jsonify({"error": "could not create user"}), 400

        token = create_access_token(identity=str(user.id))
        user_payload = _serialize_user(user)
        return jsonify({"token": token, "user": user_payload})


@bp.post("/login")
def login():
    body = request.get_json(silent=True) or {}
    email = body.get("email", "").strip()
    password = body.get("password", "")
    if not email or not password:
        return jsonify({"error": "email and password required"}), 400

    with db_session() as session:
        user = auth_service.get_user_by_email(session, email)
        if not user or not auth_service.verify_password(password, user.password_hash):
            return jsonify({"error": "invalid credentials"}), 401
        token = create_access_token(identity=str(user.id))
        user_payload = _serialize_user(user)
        session.expunge(user)
        return jsonify({"token": token, "user": user_payload})
