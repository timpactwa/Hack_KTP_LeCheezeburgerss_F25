"""Collects Flask blueprints powering client-visible REST APIs.

``backend.app`` imports this package to attach the ``auth``, ``routes`` (safe
route + heatmap), ``panic``, and ``health`` blueprints so the React frontend and
mobile clients can call them consistently."""
