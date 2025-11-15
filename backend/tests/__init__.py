"""Allows pytest to discover backend test modules that import app + services.

Fixtures defined here later will spin up the Flask app factory from
``backend.app`` and stub integrations (ORS, Twilio) so endpoints and services
can be tested in isolation."""
