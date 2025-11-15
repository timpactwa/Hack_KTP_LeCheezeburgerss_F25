"""Notification adapter that keeps SMS provider logic isolated.

Functions here will be invoked by ``backend.routes.panic`` (and possibly other
alerting workflows) to send Twilio texts containing Mapbox/Google Maps links to
the trusted contacts stored in ``backend.models``."""
