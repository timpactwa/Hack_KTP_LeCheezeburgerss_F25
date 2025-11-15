"""Namespacing for reusable business logic consumed by Flask routes.

Crime preprocessing, routing adapters, auth helpers, and notification senders
live here so both HTTP endpoints (``backend.routes``) and maintenance scripts
can share the same implementations."""
