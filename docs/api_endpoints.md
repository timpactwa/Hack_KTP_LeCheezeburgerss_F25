# API Endpoint Contract

## POST /register

Registers a new user, stores hashed password + default panic contact, and returns a JWT.

Request:

```json
{
  "email": "user@example.com",
  "password": "StrongPassword123",
  "phone": "+15555555555"
}
```

Response:

```json
{
  "token": "jwt_token",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "default_phone": "+15555555555",
    "trusted_contacts": ["+15555555555"]
  }
}
```

## POST /login

Authenticates existing users and returns a fresh JWT; payload mirrors `/register` minus the phone.

## POST /safe-route

Fetches the standard walking route and a "safe" alternative that avoids high-risk polygons derived from the crime dataset. Requires `start`/`end` latitude-longitude pairs.

```json
{
  "start": {"lat": 40.73061, "lng": -74.0007},
  "end": {"lat": 40.7152, "lng": -73.983}
}
```

Response includes both polylines and the GeoJSON polygons used for avoidance:

```json
{
  "start": {"lat": 40.73061, "lng": -74.0007},
  "end": {"lat": 40.7152, "lng": -73.983},
  "shortest": {"distance_m": 3200, "duration_s": 2400, "geometry": {"type": "LineString", "coordinates": [[-74.0, 40.73], ...]}},
  "safest": {"distance_m": 3600, "duration_s": 2600, "risk_areas_avoided": 3, "geometry": {...}},
  "risk_polygons": {"type": "FeatureCollection", "features": [...]}
}
```

When no OpenRouteService key is configured the service falls back to a straight-line placeholder geometry (useful for local development/tests).

## GET /crime-heatmap

Returns the FeatureCollection used by Mapbox GL JS to render crime intensity. Features include `{ "weight": 0..1 }` properties.

## POST /panic-alert (JWT required)

Sends SMS alerts (Twilio or simulated) to the authenticated user's trusted contacts and logs the alert. Requires a bearer token from the auth endpoints.

```json
{
  "lat": 40.73,
  "lng": -74.0
}
```

Successful response:

```json
{
  "status": "sent",
  "timestamp": "2025-11-15T12:34:00.000Z",
  "coords": {"lat": 40.73, "lng": -74.0}
}
```
