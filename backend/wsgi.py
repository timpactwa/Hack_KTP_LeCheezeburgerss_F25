"""Production WSGI entry point used by servers like Gunicorn."""

from __future__ import annotations

from .app import create_app

app = create_app()
