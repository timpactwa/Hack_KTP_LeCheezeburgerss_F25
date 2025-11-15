"""Flask application factory with blueprint + extension setup."""

from __future__ import annotations

import os
from pathlib import Path

from dotenv import load_dotenv
from flask import Flask
from flask_cors import CORS
from flask_jwt_extended import JWTManager

# Load environment variables from .env file
# Check in order: project root, backend directory, scripts directory
project_root = Path(__file__).parent.parent
env_locations = [
    project_root / ".env",           # Project root (preferred)
    Path(__file__).parent / ".env",  # Backend directory
    project_root / "scripts" / ".env",  # Scripts directory (fallback)
]

env_path = None
for location in env_locations:
    if location.exists():
        env_path = location
        load_dotenv(location)
        break

if not env_path:
    # Final fallback: try loading from current directory
    load_dotenv()


def create_app() -> Flask:
    """Create and configure the Flask app instance."""

    app = Flask(__name__)
    app.config.setdefault("API_NAME", "SafeRoute NYC")
    app.config["SECRET_KEY"] = os.getenv("SECRET_KEY", "dev-secret")
    app.config["JWT_SECRET_KEY"] = os.getenv("JWT_SECRET_KEY", app.config["SECRET_KEY"])
    app.config["JWT_ACCESS_TOKEN_EXPIRES"] = int(os.getenv("JWT_ACCESS_TOKEN_EXPIRES", 60 * 60 * 12))
    CORS(app)

    from . import database
    from .routes import auth, health, panic, routes

    database.init_db()
    JWTManager(app)

    app.register_blueprint(health.bp)
    app.register_blueprint(auth.bp)
    app.register_blueprint(routes.bp)
    app.register_blueprint(panic.bp)

    from .routes import auth, health, panic, routes

    @app.get("/")
    def index():  # pragma: no cover - trivial helper
        return {"message": "SafeRoute NYC API"}

    return app


app = create_app()


if __name__ == "__main__":
    # Run the Flask development server
    app.run(host="127.0.0.1", port=5000, debug=True)