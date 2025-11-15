"""Authentication utilities shared between HTTP routes and scripts."""

from __future__ import annotations

from passlib.context import CryptContext
from sqlalchemy.orm import Session

from .. import models

pwd_context = CryptContext(schemes=["pbkdf2_sha256"], deprecated="auto")


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


def create_user(db: Session, *, email: str, password: str, phone: str | None = None) -> models.User:
    user = models.User(email=email.lower(), password_hash=hash_password(password), default_phone=phone)
    db.add(user)
    db.flush()
    if phone:
        db.add(models.TrustedContact(user_id=user.id, phone_number=phone, name="Primary"))
    return user


def get_user_by_email(db: Session, email: str) -> models.User | None:
    return db.query(models.User).filter(models.User.email == email.lower()).one_or_none()
