"""Production WSGI entry point used by servers like Gunicorn.

This module simply exposes ``app`` from :mod:`backend.app` so hosts such as
Gunicorn or uWSGI can import it and boot the same application factory the CLI
uses. It therefore connects infra tooling directly to our Flask stack.
"""

from __future__ import annotations

from .app import create_app

app = create_app()
