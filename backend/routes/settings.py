"""Blueprint for user settings and trusted contacts management."""

from __future__ import annotations

from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt_identity, jwt_required

from ..database import db_session
from ..models import TrustedContact, User

bp = Blueprint("settings", __name__)


def _get_current_user(session):
    """Get current user from JWT token."""
    user_id = get_jwt_identity()
    try:
        user_id = int(user_id)
    except (TypeError, ValueError):
        return None
    return session.get(User, user_id)


def _serialize_contact(contact: TrustedContact) -> dict:
    """Serialize TrustedContact to JSON."""
    return {
        "id": contact.id,
        "name": contact.name,
        "phone_number": contact.phone_number,
    }


def _serialize_user(user: User) -> dict:
    """Serialize User to JSON with contacts."""
    return {
        "id": user.id,
        "email": user.email,
        "default_phone": user.default_phone,
        "trusted_contacts": [_serialize_contact(c) for c in user.contacts],
    }


@bp.get("/settings/contacts")
@jwt_required()
def get_trusted_contacts():
    """Get all trusted contacts for the current user."""
    with db_session() as session:
        user = _get_current_user(session)
        if not user:
            return jsonify({"error": "user not found"}), 404
        
        contacts = [_serialize_contact(c) for c in user.contacts]
        return jsonify({"contacts": contacts})


@bp.post("/settings/contacts")
@jwt_required()
def create_trusted_contact():
    """Create a new trusted contact for the current user."""
    body = request.get_json(silent=True) or {}
    phone_number = body.get("phone_number", "").strip()
    name = body.get("name", "Trusted Contact").strip()
    
    if not phone_number:
        return jsonify({"error": "phone_number is required"}), 400
    
    with db_session() as session:
        user = _get_current_user(session)
        if not user:
            return jsonify({"error": "user not found"}), 404
        
        # Check if contact already exists
        existing = session.query(TrustedContact).filter(
            TrustedContact.user_id == user.id,
            TrustedContact.phone_number == phone_number
        ).first()
        
        if existing:
            return jsonify({"error": "contact with this phone number already exists"}), 409
        
        contact = TrustedContact(
            user_id=user.id,
            phone_number=phone_number,
            name=name or "Trusted Contact"
        )
        session.add(contact)
        session.flush()
        session.refresh(contact)
        
        return jsonify(_serialize_contact(contact)), 201


@bp.delete("/settings/contacts/<int:contact_id>")
@jwt_required()
def delete_trusted_contact(contact_id: int):
    """Delete a trusted contact by ID."""
    with db_session() as session:
        user = _get_current_user(session)
        if not user:
            return jsonify({"error": "user not found"}), 404
        
        contact = session.query(TrustedContact).filter(
            TrustedContact.id == contact_id,
            TrustedContact.user_id == user.id
        ).first()
        
        if not contact:
            return jsonify({"error": "contact not found"}), 404
        
        session.delete(contact)
        return jsonify({"message": "contact deleted"}), 200


@bp.put("/settings/profile")
@jwt_required()
def update_user_profile():
    """Update user profile information (phone, etc.)."""
    body = request.get_json(silent=True) or {}
    default_phone = body.get("default_phone")
    
    # Allow None/empty string to clear the phone
    if default_phone is not None:
        default_phone = default_phone.strip() if default_phone else None
    
    with db_session() as session:
        user = _get_current_user(session)
        if not user:
            return jsonify({"error": "user not found"}), 404
        
        if default_phone is not None:
            user.default_phone = default_phone
        
        session.flush()
        session.refresh(user)
        
        return jsonify(_serialize_user(user)), 200

