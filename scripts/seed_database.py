"""Seed helper for quickly populating SQLite via backend.models.

This script will eventually import SQLAlchemy models from ``backend.models`` and
use the engine/session helpers in ``backend.database`` to insert demo users,
trusted contacts, and preset routes so the React frontend immediately has data
to render after authenticating."""
