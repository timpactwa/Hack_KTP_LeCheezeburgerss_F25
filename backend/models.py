"""SQLAlchemy models defining SafeRoute entities.

These tables back the auth/contacts logic (``backend.routes.auth`` &
``backend.routes.settings``) and panic-alert auditing. ORM relationships let
the services fetch trusted contacts alongside users when raising SMS alerts.
"""

from __future__ import annotations

from datetime import datetime

from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Float
from sqlalchemy.orm import relationship

from .database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    default_phone = Column(String(32))
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    contacts = relationship("TrustedContact", cascade="all, delete-orphan", back_populates="user")
    panic_alerts = relationship("PanicAlert", cascade="all, delete-orphan", back_populates="user")


class TrustedContact(Base):
    __tablename__ = "trusted_contacts"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(120), default="Trusted Contact")
    phone_number = Column(String(32), nullable=False)

    user = relationship("User", back_populates="contacts")


class PanicAlert(Base):
    __tablename__ = "panic_alerts"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    latitude = Column(Float)
    longitude = Column(Float)
    sent_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    status = Column(String(32), default="queued")

    user = relationship("User", back_populates="panic_alerts")
