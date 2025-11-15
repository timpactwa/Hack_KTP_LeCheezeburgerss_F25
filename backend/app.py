"""Flask application factory with blueprint + extension setup."""

from __future__ import annotations

import logging

from flask import Flask
from flask_cors import CORS
from flask_jwt_extended import JWTManager

from . import config

LOGGER = logging.getLogger(__name__)


def create_app() -> Flask:
    """Create and configure the Flask app instance."""

    app = Flask(__name__)
    app.config.setdefault("API_NAME", "SafeRoute NYC")
    app.config["SECRET_KEY"] = config.config.SECRET_KEY
    app.config["JWT_SECRET_KEY"] = config.config.JWT_SECRET_KEY
    app.config["JWT_ACCESS_TOKEN_EXPIRES"] = config.config.JWT_ACCESS_TOKEN_EXPIRES
    CORS(app)
    
    # Validate configuration on startup
    validation = config.config.validate_required()
    if validation["missing"]:
        LOGGER.warning("Missing required configuration:")
        for item in validation["missing"]:
            LOGGER.warning(f"  - {item}")
        LOGGER.warning("Some features may not work correctly.")
    if validation["warnings"]:
        for warning in validation["warnings"]:
            LOGGER.warning(warning)

    from . import database
    from .routes import auth, geocoding, health, panic, routes, settings

    database.init_db()
    JWTManager(app)

    # Wire up every blueprint so the React frontend and any future clients can
    # hit the REST APIs via a single Flask application object.
    app.register_blueprint(health.bp)
    app.register_blueprint(auth.bp)
    app.register_blueprint(routes.bp)
    app.register_blueprint(panic.bp)
    app.register_blueprint(geocoding.bp)
    app.register_blueprint(settings.bp)

    @app.get("/")
    def index():  # pragma: no cover - trivial helper
        return {"message": "SafeRoute NYC API"}

    return app


app = create_app()


if __name__ == "__main__":
    # Run the Flask development server
    app.run(host="127.0.0.1", port=5000, debug=True)
