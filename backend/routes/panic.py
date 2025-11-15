"""Blueprint that will back the PanicButton CTA in the React UI.

The ``/panic-alert`` endpoint will pull the authenticated user, fetch trusted
contacts from ``backend.models``, and invoke ``backend.services.notifications``
to send SMS messages containing the coordinates passed from the frontend."""
