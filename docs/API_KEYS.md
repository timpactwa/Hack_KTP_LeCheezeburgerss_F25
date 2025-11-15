# API Keys Configuration Guide

This document describes all required and optional API keys for SafeRoute NYC.

## Required API Keys

### 1. OpenRouteService (ORS) API Key

**Purpose:** Generate safe walking routes that avoid high-risk crime areas.

**Where to get it:**
1. Visit https://openrouteservice.org/dev/#/signup
2. Sign up for a free account
3. Navigate to your account dashboard
4. Create a new API key
5. Enable the "Directions API" for your key

**Format:** 
- Long alphanumeric string (e.g., `5b3ce3597851110001cf6248`)
- Or JWT-style token (e.g., `eyJvcmciOiI1YjNjZTM1OTc4NTExMTAwMDFjZjYyNDgi...`)

**Environment Variable:** `ORS_API_KEY`

**Usage:** Backend routing service uses this to calculate routes with `avoid_polygons` parameter.

---

### 2. Mapbox Access Token

**Purpose:** 
- Backend: Address geocoding (convert addresses to coordinates and vice versa)
- Frontend: Display interactive maps

**Where to get it:**
1. Visit https://account.mapbox.com/access-tokens/
2. Sign in or create a free account
3. Create a new access token
4. For backend: Use a **Secret token** (starts with `sk.`)
5. For frontend: Use a **Public token** (starts with `pk.`)

**Format:**
- Public token: `pk.eyJ1Ijoi...` (for frontend maps)
- Secret token: `sk.eyJ1Ijoi...` (for backend geocoding API)

**Environment Variables:**
- Backend: `MAPBOX_ACCESS_TOKEN` or `MAPBOX_TOKEN`
- Frontend: `VITE_MAPBOX_TOKEN` (in `.env` file in frontend directory)

**Usage:**
- Backend geocoding service uses this for address search and reverse geocoding
- Frontend uses this for Mapbox GL JS map rendering

---

## Optional API Keys

### 3. Twilio Credentials (SMS Panic Alerts)

**Purpose:** Send SMS alerts to trusted contacts when panic button is pressed.

**Where to get it:**
1. Visit https://console.twilio.com/
2. Sign up for a free trial account
3. Get your Account SID and Auth Token from the dashboard
4. Purchase a phone number or use a trial number

**Environment Variables:**
- `TWILIO_SID` - Your Twilio Account SID
- `TWILIO_AUTH_TOKEN` - Your Twilio Auth Token
- `TWILIO_FROM_NUMBER` - The phone number to send from (e.g., `+1234567890`)

**Format:**
- SID: Alphanumeric string (e.g., `AC1234567890abcdef1234567890abcdef`)
- Auth Token: Alphanumeric string (e.g., `your_auth_token_here`)
- From Number: E.164 format (e.g., `+15555551234`)

**Usage:** If not configured, panic alerts will be logged to console instead of sent via SMS.

---

## Configuration Files

### Backend Configuration

Place your API keys in one of these locations (checked in order):
1. `.env` in project root (preferred)
2. `.env` in `backend/` directory
3. `.env` in `scripts/` directory

Example `.env` file:
```bash
ORS_API_KEY=your-ors-key-here
MAPBOX_ACCESS_TOKEN=your-mapbox-token-here
TWILIO_SID=your-twilio-sid
TWILIO_AUTH_TOKEN=your-twilio-token
TWILIO_FROM_NUMBER=+1234567890
```

### Frontend Configuration

Create a `.env` file in the `frontend/` directory:

```bash
VITE_MAPBOX_TOKEN=pk.your-public-token-here
VITE_API_BASE_URL=http://127.0.0.1:5000
VITE_USE_MOCK_API=false
```

---

## Security Best Practices

1. **Never commit `.env` files** to version control
2. **Use different tokens** for development and production
3. **Rotate API keys** periodically
4. **Use Secret tokens** for backend services (not Public tokens)
5. **Limit API key permissions** to only what's needed
6. **Monitor API usage** to detect unauthorized access

---

## Validation

The backend will validate required configuration on startup. Missing required keys will be reported in the logs.

To check configuration status, the backend provides a validation endpoint or you can use:

```python
from backend.config import config
status = config.validate_required()
print(status)
```

---

## Free Tier Limits

### OpenRouteService
- Free tier: 2,000 requests/day
- Suitable for development and small deployments

### Mapbox
- Free tier: 50,000 map loads/month
- Free tier: 100,000 geocoding requests/month
- Suitable for development and small deployments

### Twilio
- Free trial: $15.50 credit
- Pay-as-you-go pricing after trial
- SMS: ~$0.0075 per message

---

## Troubleshooting

### "ORS error 403: Access denied"
- Check that your API key is activated in ORS dashboard
- Verify Directions API is enabled for your key
- Ensure key format is correct (no extra spaces/quotes)

### "Mapbox geocoding error 401"
- Verify token is correct and not expired
- Check that you're using a Secret token for backend
- Ensure token has Geocoding API permissions

### "Twilio authentication failed"
- Verify Account SID and Auth Token are correct
- Check that phone number is in E.164 format
- Ensure Twilio account is active (not suspended)

