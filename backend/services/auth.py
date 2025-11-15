"""Authentication utilities shared between HTTP routes and possibly CLIs.

Functions here will wrap ``passlib`` hashing, JWT encoding/decoding, and user
lookup logic so ``backend.routes.auth`` can keep handlers slim while the React
``LoginPage``/``RegisterPage`` benefit from consistent error handling."""
