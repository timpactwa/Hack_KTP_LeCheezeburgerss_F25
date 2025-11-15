"""SQLAlchemy engine + session helpers shared project-wide."""

from __future__ import annotations

import os
from contextlib import contextmanager

from sqlalchemy import create_engine
from sqlalchemy.orm import scoped_session, sessionmaker, declarative_base


def _build_database_url() -> str:
    url = os.getenv("DATABASE_URL")
    if url:
        return url
    instance_path = os.getenv("INSTANCE_PATH") or os.path.join(
        os.path.dirname(__file__), "..", "instance"
    )
    os.makedirs(instance_path, exist_ok=True)
    return f"sqlite:///{os.path.abspath(os.path.join(instance_path, 'saferoute.db'))}"


DATABASE_URL = _build_database_url()

connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}
engine = create_engine(DATABASE_URL, future=True, connect_args=connect_args)
SessionLocal = scoped_session(
    sessionmaker(autocommit=False, autoflush=False, bind=engine, future=True)
)
Base = declarative_base()


def init_db() -> None:
    """Create all tables (invoked during app factory)."""

    from . import models  # noqa: F401 - ensure models are registered

    Base.metadata.create_all(bind=engine)


@contextmanager
def db_session():
    """Provide a transactional scope for database operations."""

    session = SessionLocal()
    try:
        yield session
        session.commit()
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()
