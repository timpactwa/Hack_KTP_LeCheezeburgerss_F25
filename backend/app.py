"""Flask application factory with blueprint + extension setup."""

from __future__ import annotations

import os

from flask import Flask
from flask_cors import CORS


def create_app() -> Flask:
    """Create and configure the Flask app instance."""

    app = Flask(__name__)
    app.config.setdefault("API_NAME", "SafeRoute NYC")
    app.config["SECRET_KEY"] = os.getenv("SECRET_KEY", "dev-secret")
    CORS(app)

    from .routes import auth, health, panic, routes

    app.register_blueprint(health.bp)
    app.register_blueprint(auth.bp)
    app.register_blueprint(routes.bp)
    app.register_blueprint(panic.bp)

    @app.get("/")
    def index():  # pragma: no cover - trivial helper
        return {"message": "SafeRoute NYC API"}

    return app


app = create_app()
