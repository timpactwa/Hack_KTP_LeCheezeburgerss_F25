"""Application factory placeholder for wiring up Flask and connecting layers.

The eventual ``create_app`` function defined here will initialize extensions
from ``backend.database``/``backend.models``, register blueprints from
``backend.routes`` (auth, safe-route, panic, health), and enable cross-origin
calls from the React frontend located in ``frontend/src``."""
