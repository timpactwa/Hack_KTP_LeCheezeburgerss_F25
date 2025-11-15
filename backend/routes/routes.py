"""Blueprint placeholder powering routing + heatmap APIs for the dashboard.

``/safe-route`` will orchestrate ``backend.services.crime_data`` to grab risk
polygons before passing control to ``backend.services.routing`` (OpenRouteService
bridge) while ``/crime-heatmap`` fans crime density data to the Mapbox layers on
the React ``MapDashboard`` component."""
