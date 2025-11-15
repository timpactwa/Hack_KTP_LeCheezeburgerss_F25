"""Simple health/uptime endpoint consumed by platform monitors.

Cloud hosting (Render, Railway, etc.) and the frontend can hit this route to
verify the Flask app + database connections are alive before making heavier
requests."""
