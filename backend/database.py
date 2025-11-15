"""Future home of SQLAlchemy engine + session helpers shared project-wide.

``backend.app`` will import this module during app creation to bind the Flask
app to SQLite, while services, routes, and seeding scripts share the same
``SessionLocal`` helpers for consistent DB access."""
