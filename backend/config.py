"""Central place for loading env vars that the backend and scripts share.

Values such as ``DATABASE_URL`` (SQLite), ``ORS_API_KEY``, ``TWILIO_*`` creds,
and ``MAPBOX_TOKEN`` will be read here (often via ``python-dotenv``) so that
routes, services, and CLI scripts can pull consistent configuration."""

from __future__ import annotations

import os
import logging
from pathlib import Path
from typing import Optional

from dotenv import load_dotenv

LOGGER = logging.getLogger(__name__)


def _load_env_file() -> Optional[Path]:
    """Load .env file from common locations. Returns the path if found."""
    project_root = Path(__file__).parent.parent
    env_locations = [
        project_root / ".env",           # Project root (preferred)
        Path(__file__).parent / ".env",  # Backend directory
        project_root / "scripts" / ".env",  # Scripts directory (fallback)
    ]
    
    for location in env_locations:
        if location.exists():
            load_dotenv(location)
            LOGGER.debug(f"Loaded .env from: {location}")
            return location
    
    # Final fallback: try loading from current directory
    load_dotenv()
    return None


# Load environment variables
_env_path = _load_env_file()


class Config:
    """Centralized configuration class for all environment variables."""
    
    # Database Configuration
    DATABASE_URL: str = os.getenv("DATABASE_URL", "")
    INSTANCE_PATH: Optional[str] = os.getenv("INSTANCE_PATH")
    
    # Flask/JWT Configuration
    SECRET_KEY: str = os.getenv("SECRET_KEY", "dev-secret-change-in-production")
    JWT_SECRET_KEY: str = os.getenv("JWT_SECRET_KEY", SECRET_KEY)
    JWT_ACCESS_TOKEN_EXPIRES: int = int(os.getenv("JWT_ACCESS_TOKEN_EXPIRES", str(60 * 60 * 12)))  # 12 hours
    
    # API Keys - Routing
    ORS_API_KEY: Optional[str] = os.getenv("ORS_API_KEY")
    
    # API Keys - Geocoding
    MAPBOX_ACCESS_TOKEN: Optional[str] = os.getenv("MAPBOX_ACCESS_TOKEN") or os.getenv("MAPBOX_TOKEN")
    
    # API Keys - Notifications (Twilio)
    TWILIO_SID: Optional[str] = os.getenv("TWILIO_SID")
    TWILIO_AUTH_TOKEN: Optional[str] = os.getenv("TWILIO_AUTH_TOKEN")
    TWILIO_FROM_NUMBER: Optional[str] = os.getenv("TWILIO_FROM_NUMBER")
    
    # Flask App Configuration
    FLASK_ENV: str = os.getenv("FLASK_ENV", "development")
    FLASK_DEBUG: bool = os.getenv("FLASK_DEBUG", "False").lower() == "true"
    
    @classmethod
    def validate_required(cls, required_for: Optional[list[str]] = None) -> dict[str, list[str]]:
        """
        Validate that required configuration is present.
        
        Args:
            required_for: List of features to validate (e.g., ['routing', 'geocoding', 'notifications'])
                          If None, validates all features.
        
        Returns:
            Dictionary with 'missing' and 'warnings' keys containing lists of missing config items.
        """
        missing = []
        warnings = []
        
        # Always required
        if not cls.SECRET_KEY or cls.SECRET_KEY == "dev-secret-change-in-production":
            warnings.append("SECRET_KEY is using default value (not secure for production)")
        
        # Feature-specific requirements
        features = required_for or ['routing', 'geocoding', 'notifications']
        
        if 'routing' in features:
            if not cls.ORS_API_KEY:
                missing.append("ORS_API_KEY (required for route generation)")
        
        if 'geocoding' in features:
            if not cls.MAPBOX_ACCESS_TOKEN:
                missing.append("MAPBOX_ACCESS_TOKEN or MAPBOX_TOKEN (required for address geocoding)")
        
        if 'notifications' in features:
            if not cls.TWILIO_SID:
                missing.append("TWILIO_SID (required for SMS panic alerts)")
            if not cls.TWILIO_AUTH_TOKEN:
                missing.append("TWILIO_AUTH_TOKEN (required for SMS panic alerts)")
            if not cls.TWILIO_FROM_NUMBER:
                missing.append("TWILIO_FROM_NUMBER (required for SMS panic alerts)")
        
        return {
            "missing": missing,
            "warnings": warnings,
        }
    
    @classmethod
    def get_status(cls) -> dict:
        """Get configuration status for debugging."""
        return {
            "database": {
                "url_configured": bool(cls.DATABASE_URL),
                "instance_path": cls.INSTANCE_PATH,
            },
            "auth": {
                "secret_key_set": bool(cls.SECRET_KEY),
                "jwt_secret_set": bool(cls.JWT_SECRET_KEY),
                "token_expires_seconds": cls.JWT_ACCESS_TOKEN_EXPIRES,
            },
            "apis": {
                "ors_api_key": "***" if cls.ORS_API_KEY else None,
                "mapbox_token": "***" if cls.MAPBOX_ACCESS_TOKEN else None,
                "twilio_configured": bool(cls.TWILIO_SID and cls.TWILIO_AUTH_TOKEN and cls.TWILIO_FROM_NUMBER),
            },
            "env_file_loaded": _env_path is not None,
            "env_file_path": str(_env_path) if _env_path else None,
        }


# Global config instance
config = Config()