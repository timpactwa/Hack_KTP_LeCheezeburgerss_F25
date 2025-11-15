"""Blueprint for geocoding endpoints (address search and reverse geocoding).

Frontend hooks such as ``useGeocoder`` call these REST routes which in turn
talk to :mod:`backend.services.geocoding`/Mapbox to provide autocomplete data.
"""

from __future__ import annotations

from flask import Blueprint, jsonify, request

from ..services.geocoding import GeocodingError, get_geocoding_client

bp = Blueprint("geocoding", __name__)
geocoding_client = get_geocoding_client()


@bp.get("/geocode/search")
def search_address():
    """
    Forward geocoding: Convert address/place name to coordinates.
    
    Query parameters:
        q: Address or place name to search (required, min 3 chars)
        limit: Maximum number of results (default: 5)
        proximity: Optional "lng,lat" to bias results toward location
    
    Returns:
        JSON array of GeoJSON features with coordinates and place names
    """
    query = request.args.get("q", "").strip()
    
    if not query or len(query) < 3:
        return jsonify({"error": "Query parameter 'q' required (minimum 3 characters)"}), 400
    
    try:
        limit = int(request.args.get("limit", 5))
        limit = max(1, min(limit, 10))  # Clamp between 1 and 10
    except (ValueError, TypeError):
        limit = 5
    
    proximity = None
    proximity_str = request.args.get("proximity")
    if proximity_str:
        try:
            parts = proximity_str.split(",")
            if len(parts) == 2:
                proximity = (float(parts[0]), float(parts[1]))
        except (ValueError, TypeError):
            pass  # Invalid proximity, ignore it
    
    try:
        features = geocoding_client.forward_geocode(query, limit=limit, proximity=proximity)
        return jsonify(features)
    except GeocodingError as exc:
        return jsonify({"error": str(exc)}), 500
    except Exception as exc:
        return jsonify({"error": f"Geocoding failed: {str(exc)}"}), 500


@bp.get("/geocode/reverse")
def reverse_geocode():
    """
    Reverse geocoding: Convert coordinates to address.
    
    Query parameters:
        lng: Longitude (required)
        lat: Latitude (required)
    
    Returns:
        JSON object with GeoJSON feature containing address information
    """
    try:
        lng = float(request.args.get("lng", 0))
        lat = float(request.args.get("lat", 0))
    except (ValueError, TypeError):
        return jsonify({"error": "Valid 'lng' and 'lat' query parameters required"}), 400
    
    if not (-180 <= lng <= 180) or not (-90 <= lat <= 90):
        return jsonify({"error": "Coordinates out of valid range"}), 400
    
    try:
        feature = geocoding_client.reverse_geocode(lng, lat)
        if feature:
            return jsonify(feature)
        else:
            return jsonify({"error": "No address found for these coordinates"}), 404
    except GeocodingError as exc:
        return jsonify({"error": str(exc)}), 500
    except Exception as exc:
        return jsonify({"error": f"Reverse geocoding failed: {str(exc)}"}), 500
