"""Central place for loading env vars that the backend and scripts share.

Values such as ``DATABASE_URL`` (SQLite), ``ORS_API_KEY``, ``TWILIO_*`` creds,
and ``MAPBOX_TOKEN`` will be read here (often via ``python-dotenv``) so that
routes, services, and CLI scripts can pull consistent configuration."""
